import { EventEmitter } from 'events';

// A simple global emitter to broadcast changes across the server
export const eventHub = new EventEmitter();

// Helper to notify all connected clients that data has changed
export function notifyChange() {
    eventHub.emit('change');
}

export interface CheckInData {
    personId: string;
    personName: string;
    verifyMethod: string | null;
    photoUrl: string | null;
}

export function notifyCheckIn(data: CheckInData) {
    eventHub.emit('checkin', data);
}

export function notifyCheckOut(data: CheckInData) {
    eventHub.emit('checkout', data);
}

export interface EnrollmentData {
    personId: string;
    method: string;
}

export function notifyEnrollment(data: EnrollmentData) {
    eventHub.emit('enrollment', data);
}

export interface EnrollmentFailedData {
    personId: string;
    returnCode: string;
}

export function notifyEnrollmentFailed(data: EnrollmentFailedData) {
    eventHub.emit('enrollment-failed', data);
}
