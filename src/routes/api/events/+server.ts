import { eventHub } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
    if (!locals.user) {
        return new Response('Unauthorized', { status: 401 });
    }

    let heartbeat: ReturnType<typeof setInterval>;
    let listener: () => void;
    let closed = false;

    const stream = new ReadableStream({
        start(controller) {
            listener = () => {
                if (!closed) {
                    controller.enqueue("data: update\n\n");
                }
            };

            eventHub.on('change', listener);

            // Keep connection alive with a heartbeat every 30s
            heartbeat = setInterval(() => {
                if (!closed) {
                    controller.enqueue(": heartbeat\n\n");
                }
            }, 30000);
        },
        cancel() {
            closed = true;
            eventHub.off('change', listener);
            clearInterval(heartbeat);
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
};