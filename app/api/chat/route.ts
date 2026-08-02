import { runAgent } from '@/lib/agent/run';
import type { StreamEvent, WireMessage } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Streams a procurement run as newline-delimited SSE. Each frame is one
 * `StreamEvent`, so the client renders tool cards, prose and the approval
 * request from a single connection.
 */
export async function POST(request: Request) {
  let body: { messages?: WireMessage[] };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const messages = (body.messages ?? []).filter(
    (m): m is WireMessage =>
      Boolean(m) && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
  );

  if (!messages.length) {
    return Response.json({ error: 'No messages provided' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const requestedBy = process.env.DEMO_USER_EMAIL || 'founder@acme.dev';
  const company = process.env.DEMO_COMPANY_NAME || 'Acme Inc.';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        for await (const event of runAgent({
          messages,
          requestedBy,
          company,
          signal: request.signal,
        })) {
          send(event);
        }
      } catch (error) {
        send({
          type: 'error',
          message: error instanceof Error ? error.message : 'The agent failed.',
        });
        send({ type: 'done' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Stops nginx/proxy buffering from batching the whole run into one flush.
      'X-Accel-Buffering': 'no',
    },
  });
}
