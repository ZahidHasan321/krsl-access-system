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
}

export function notifyCheckOut(data: CheckInData) {
	eventHub.emit('checkout', data);
}

export interface EnrollmentData {
	personId: string;
	personName?: string;
	method: string;
	photoUrl?: string | null;
	thumbUrl?: string | null;
}

export function notifyEnrollment(data: EnrollmentData) {
	eventHub.emit('enrollment', data);
}

export interface EnrollmentFailedData {
	personId: string;
	personName?: string;
	returnCode: string;
}

export function notifyEnrollmentFailed(data: EnrollmentFailedData) {
	eventHub.emit('enrollment-failed', data);
}

// --- Global Event Listeners ---
// These listeners ensure that regardless of where the event was triggered
// (Web UI or internal API from device-service), we create a notification record
// and attempt to broadcast it.

eventHub.on('checkin', (data: CheckInData) => {
	broadcastPushNotification({
		title: 'Check-In Alert',
		body: `${data.personName} has checked in.`,
		url: `/people/${data.personId}`
	}, 'checkin').catch(console.error);
});

eventHub.on('checkout', (data: CheckInData) => {
	broadcastPushNotification({
		title: 'Check-Out Alert',
		body: `${data.personName} has checked out.`,
		url: `/people/${data.personId}`
	}, 'checkout').catch(console.error);
});

eventHub.on('enrollment', (data: EnrollmentData) => {
	broadcastPushNotification({
		title: 'New Registration',
		body: `${data.personName || 'A person'} successfully enrolled via ${data.method}.`,
		url: `/people/${data.personId}`
	}, 'enrollment').catch(console.error);
});

eventHub.on('enrollment-failed', (data: EnrollmentFailedData) => {
	broadcastPushNotification({
		title: 'Registration Failed',
		body: `${data.personName || 'A person'} enrollment failed (Code: ${data.returnCode}).`,
		url: `/people/${data.personId}`
	}, 'enrollment').catch(console.error);
});
