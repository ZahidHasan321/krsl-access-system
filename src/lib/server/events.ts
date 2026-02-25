import { EventEmitter } from 'events';
import { broadcastPushNotification } from './push';

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
	thumbUrl?: string | null;
	logId: string;
	categoryId: string;
	isTrained?: boolean;
}

export function notifyCheckIn(data: CheckInData) {
	eventHub.emit('checkin', data);
	broadcastPushNotification({
		title: 'Check-In Alert',
		body: `${data.personName} has checked in.`,
		url: `/people/${data.personId}`
	}, 'checkin').catch(console.error);
}

export function notifyCheckOut(data: CheckInData) {
	eventHub.emit('checkout', data);
	broadcastPushNotification({
		title: 'Check-Out Alert',
		body: `${data.personName} has checked out.`,
		url: `/people/${data.personId}`
	}, 'checkout').catch(console.error);
}

export interface EnrollmentData {
	personId: string;
	method: string;
	photoUrl?: string | null;
	thumbUrl?: string | null;
}

export function notifyEnrollment(data: EnrollmentData) {
	eventHub.emit('enrollment', data);
	broadcastPushNotification({
		title: 'New Registration',
		body: `Person ID ${data.personId} successfully enrolled via ${data.method}.`,
		url: `/people/${data.personId}`
	}, 'enrollment').catch(console.error);
}

export interface EnrollmentFailedData {
	personId: string;
	returnCode: string;
}

export function notifyEnrollmentFailed(data: EnrollmentFailedData) {
	eventHub.emit('enrollment-failed', data);
	broadcastPushNotification({
		title: 'Registration Failed',
		body: `Person ID ${data.personId} enrollment failed (Code: ${data.returnCode}).`,
		url: `/people/${data.personId}`
	}, 'enrollment').catch(console.error);
}
