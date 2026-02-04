import { EventEmitter } from 'events';

// A simple global emitter to broadcast changes across the server
export const eventHub = new EventEmitter();

// Helper to notify all connected clients that data has changed
export function notifyChange() {
    eventHub.emit('change');
}
