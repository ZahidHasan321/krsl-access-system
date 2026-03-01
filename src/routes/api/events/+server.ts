import { eventHub } from '$lib/server/event-hub';
import type { CheckInData, EnrollmentData, EnrollmentFailedData, VehicleEventData } from '$lib/server/events';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	let heartbeat: ReturnType<typeof setInterval>;
	let changeListener: () => void;
	let checkinListener: (data: CheckInData) => void;
	let checkoutListener: (data: CheckInData) => void;
	let vehicleCheckinListener: (data: VehicleEventData) => void;
	let vehicleCheckoutListener: (data: VehicleEventData) => void;
	let enrollmentListener: (data: EnrollmentData) => void;
	let enrollmentFailedListener: (data: EnrollmentFailedData) => void;
	let closed = false;

	const stream = new ReadableStream({
		start(controller) {
			changeListener = () => {
				if (!closed) {
					controller.enqueue('data: update\n\n');
				}
			};

			checkinListener = (data: CheckInData) => {
				if (!closed) {
					controller.enqueue(`event: checkin\ndata: ${JSON.stringify(data)}\n\n`);
				}
			};

			checkoutListener = (data: CheckInData) => {
				if (!closed) {
					controller.enqueue(`event: checkout\ndata: ${JSON.stringify(data)}\n\n`);
				}
			};

			vehicleCheckinListener = (data: VehicleEventData) => {
				if (!closed) {
					controller.enqueue(`event: vehicle-checkin\ndata: ${JSON.stringify(data)}\n\n`);
				}
			};

			vehicleCheckoutListener = (data: VehicleEventData) => {
				if (!closed) {
					controller.enqueue(`event: vehicle-checkout\ndata: ${JSON.stringify(data)}\n\n`);
				}
			};

			enrollmentListener = (data: EnrollmentData) => {
				if (!closed) {
					controller.enqueue(`event: enrollment\ndata: ${JSON.stringify(data)}\n\n`);
				}
			};

			enrollmentFailedListener = (data: EnrollmentFailedData) => {
				if (!closed) {
					controller.enqueue(`event: enrollment-failed\ndata: ${JSON.stringify(data)}\n\n`);
				}
			};

			eventHub.on('change', changeListener);
			eventHub.on('checkin', checkinListener);
			eventHub.on('checkout', checkoutListener);
			eventHub.on('vehicle-checkin', vehicleCheckinListener);
			eventHub.on('vehicle-checkout', vehicleCheckoutListener);
			eventHub.on('enrollment', enrollmentListener);
			eventHub.on('enrollment-failed', enrollmentFailedListener);

			heartbeat = setInterval(() => {
				if (!closed) {
					controller.enqueue(': heartbeat\n\n');
				}
			}, 30000);
		},
		cancel() {
			closed = true;
			eventHub.off('change', changeListener);
			eventHub.off('checkin', checkinListener);
			eventHub.off('checkout', checkoutListener);
			eventHub.off('vehicle-checkin', vehicleCheckinListener);
			eventHub.off('vehicle-checkout', vehicleCheckoutListener);
			eventHub.off('enrollment', enrollmentListener);
			eventHub.off('enrollment-failed', enrollmentFailedListener);
			clearInterval(heartbeat);
		}
	});


	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive'
		}
	});
};
