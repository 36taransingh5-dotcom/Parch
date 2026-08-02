import 'server-only';

// ─────────────────────────────────────────────────────────────
// Minimal client for the OpenAI Responses API.
//
// Called over plain fetch rather than through the SDK: the only surface we
// need is `POST /v1/responses` with streaming and function calling, and
// pinning that shape ourselves means an SDK major bump on the morning of a
// demo cannot break the agent loop.
// ─────────────────────────────────────────────────────────────

export interface FunctionCallItem {
  type: 'function_call';
  call_id: string;
  name: string;
  arguments: string;
}

export interface FunctionOutputItem {
  type: 'function_call_output';
  call_id: string;
  output: string;
}

export interface MessageItem {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type InputItem = MessageItem | FunctionCallItem | FunctionOutputItem;

export type ResponsesEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'function_call'; call: FunctionCallItem }
  | { type: 'completed' }
  | { type: 'error'; message: string };

export function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function openaiModel() {
  return process.env.OPENAI_MODEL || 'gpt-4.1';
}

/**
 * Streams one turn. Yields text deltas as they arrive and a `function_call`
 * event per completed tool call; the caller runs the tools and calls back in
 * with the outputs appended to `input`.
 */
export async function* streamTurn(
  input: InputItem[],
  tools: unknown[],
  signal?: AbortSignal,
): AsyncGenerator<ResponsesEvent> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    signal,
    body: JSON.stringify({
      model: openaiModel(),
      input,
      tools,
      parallel_tool_calls: true,
      stream: true,
      temperature: 0.3,
      max_output_tokens: 1200,
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '');
    yield {
      type: 'error',
      message: `OpenAI request failed (HTTP ${res.status}). ${body.slice(0, 300)}`,
    };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // SSE frames are separated by a blank line.
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';

    for (const frame of frames) {
      const dataLine = frame
        .split('\n')
        .find((line) => line.startsWith('data:'));
      if (!dataLine) continue;

      const payload = dataLine.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;

      let event: {
        type?: string;
        delta?: string;
        item?: { type?: string; call_id?: string; name?: string; arguments?: string };
        response?: { error?: { message?: string } };
        message?: string;
        error?: { message?: string };
      };
      try {
        event = JSON.parse(payload);
      } catch {
        continue;
      }

      switch (event.type) {
        case 'response.output_text.delta':
          if (event.delta) yield { type: 'text_delta', text: event.delta };
          break;

        case 'response.output_item.done':
          if (event.item?.type === 'function_call' && event.item.call_id && event.item.name) {
            yield {
              type: 'function_call',
              call: {
                type: 'function_call',
                call_id: event.item.call_id,
                name: event.item.name,
                arguments: event.item.arguments || '{}',
              },
            };
          }
          break;

        case 'response.completed':
          yield { type: 'completed' };
          break;

        case 'response.failed':
        case 'response.incomplete':
          yield {
            type: 'error',
            message: event.response?.error?.message || 'The model stopped early.',
          };
          break;

        case 'error':
          yield { type: 'error', message: event.error?.message || event.message || 'Stream error' };
          break;
      }
    }
  }
}
