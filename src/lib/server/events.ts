import { eventHub, notifyChange } from './event-hub';
import { broadcastPushNotification } from './push';

export { eventHub, notifyChange };

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

export interface VehicleEventData {
	vehicleId: string;
	vehicleNumber: string;
	type: string;
	driverName?: string | null;
}

export function notifyVehicleCheckIn(data: VehicleEventData) {
	eventHub.emit('vehicle-checkin', data);
}

export function notifyVehicleCheckOut(data: VehicleEventData) {
	eventHub.emit('vehicle-checkout', data);
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

eventHub.on('vehicle-checkin', (data: VehicleEventData) => {
	broadcastPushNotification({
		title: 'Vehicle Check-In',
		body: `${data.vehicleNumber} (${data.type}) entered the premises.`,
		url: `/vehicles`
	}, 'vehicle').catch(console.error);
});

eventHub.on('vehicle-checkout', (data: VehicleEventData) => {
	broadcastPushNotification({
		title: 'Vehicle Check-Out',
		body: `${data.vehicleNumber} (${data.type}) left the premises.`,
		url: `/vehicles/history`
	}, 'vehicle').catch(console.error);
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

