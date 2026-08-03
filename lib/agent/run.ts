import 'server-only';

import {
  executeTool,
  isToolName,
  newToolContext,
  TOOL_LABELS,
  TOOL_SCHEMAS,
  type ToolContext,
} from '@/lib/tools';
import type { StreamEvent, ToolCallRecord, WireMessage } from '@/lib/types';
import { id } from '@/lib/utils';
import {
  openaiConfigured,
  streamTurn,
  type FunctionCallItem,
  type InputItem,
} from './openai';
import { systemPrompt } from './prompts';
import { runScripted } from './scripted';

/**
 * Hard ceiling on model→tool→model round trips for a single user turn.
 *
 * A full procurement run is search, fetchPricing, checkMerchantTrust,
 * compareOptions, createRecommendation, requestApproval — six tool-bearing
 * turns even when same-stage calls batch in parallel — plus one further
 * turn where the model replies with no tool call at all (its closing
 * message). Six was one turn short: the loop hit the cap exactly when
 * requestApproval finished and the model never got to speak its summary.
 */
const MAX_TURNS = 10;

export interface RunOptions {
  messages: WireMessage[];
  requestedBy: string;
  company: string;
  signal?: AbortSignal;
}

export function agentMode(): 'llm' | 'scripted' {
  return openaiConfigured() ? 'llm' : 'scripted';
}

export async function* runAgent(options: RunOptions): AsyncGenerator<StreamEvent> {
  const latest = [...options.messages].reverse().find((m) => m.role === 'user');
  const userMessage = latest?.content ?? '';

  if (!openaiConfigured()) {
    yield* runScripted(userMessage, options.requestedBy);
    return;
  }

  let produced = false;

  try {
    for await (const event of runLLM(options)) {
      if (event.type === 'error' && !produced) {
        // The model failed before saying anything useful — rescue the turn
        // with the deterministic agent rather than showing an error.
        yield* runScripted(userMessage, options.requestedBy);
        return;
      }
      if (event.type !== 'done') produced = true;
      yield event;
    }
  } catch (error) {
    if (!produced) {
      yield* runScripted(userMessage, options.requestedBy);
      return;
    }
    yield {
      type: 'error',
      message: error instanceof Error ? error.message : 'The agent stopped unexpectedly.',
    };
    yield { type: 'done' };
  }
}

async function* runLLM(options: RunOptions): AsyncGenerator<StreamEvent> {
  const ctx: ToolContext = newToolContext(options.requestedBy);

  const input: InputItem[] = [
    { role: 'system', content: systemPrompt(options.company, options.requestedBy) },
    ...options.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const pendingCalls: FunctionCallItem[] = [];
    let sawError: string | null = null;

    for await (const event of streamTurn(input, TOOL_SCHEMAS, options.signal)) {
      if (event.type === 'text_delta') {
        yield { type: 'text_delta', text: event.text };
      } else if (event.type === 'function_call') {
        pendingCalls.push(event.call);
      } else if (event.type === 'error') {
        sawError = event.message;
      }
    }

    if (sawError && pendingCalls.length === 0) {
      yield { type: 'error', message: sawError };
      return;
    }

    // No tool calls left to make — the model has given its final answer.
    if (pendingCalls.length === 0) {
      yield { type: 'done' };
      return;
    }

    // Echo the calls back into the transcript before their outputs, which is
    // what the Responses API expects on the next turn.
    input.push(...pendingCalls);

    // Announce every call up front so parallel calls appear together, then
    // execute them concurrently.
    const records = pendingCalls.map<ToolCallRecord>((call) => ({
      id: id('call'),
      name: isToolName(call.name) ? call.name : 'searchVendors',
      label: isToolName(call.name) ? TOOL_LABELS[call.name] : call.name,
      args: safeParse(call.arguments),
      status: 'running',
      startedAt: Date.now(),
    }));

    for (const record of records) {
      yield { type: 'tool_start', call: record };
    }

    // `requestApproval` mutates shared context and must observe the results of
    // everything else, so tools run in declaration order within a turn rather
    // than truly in parallel. They are local lookups; the cost is negligible.
    for (let i = 0; i < pendingCalls.length; i++) {
      const call = pendingCalls[i];
      const record = records[i];

      if (!isToolName(call.name)) {
        const failed: ToolCallRecord = {
          ...record,
          status: 'error',
          error: `Unknown tool "${call.name}"`,
          endedAt: Date.now(),
        };
        yield { type: 'tool_end', call: failed };
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify({ error: 'unknown_tool' }),
        });
        continue;
      }

      try {
        const { result, display } = await executeTool(call.name, record.args, ctx);
        yield {
          type: 'tool_end',
          call: { ...record, status: 'done', result: display, endedAt: Date.now() },
        };
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(result),
        });

        if (call.name === 'requestApproval' && ctx.approval && ctx.recommendation) {
          yield { type: 'approval', approval: ctx.approval, recommendation: ctx.recommendation };
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Tool failed';
        yield {
          type: 'tool_end',
          call: { ...record, status: 'error', error: message, endedAt: Date.now() },
        };
        input.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify({ error: message }),
        });
      }
    }
  }

  yield {
    type: 'error',
    message: 'The agent hit its tool-call limit for this turn. Ask it to continue.',
  };
  yield { type: 'done' };
}

function safeParse(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
