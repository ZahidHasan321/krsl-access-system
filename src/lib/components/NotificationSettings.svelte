<script lang="ts">
	import { onMount } from 'svelte';
	import { Bell, BellOff, Loader2 } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import { appToast } from '$lib/utils';
	import { env } from '$env/dynamic/public';

	let { variant = 'icon' } = $props<{ variant?: 'icon' | 'menu' }>();

	let isSupported = $state(false);
	let isSubscribed = $state(false);
	let isLoading = $state(true);
	let permissionState = $state<string>('prompt');

	const publicVapidKey = env.PUBLIC_VAPID_KEY;

	onMount(async () => {
		if ('serviceWorker' in navigator && 'PushManager' in window) {
			isSupported = true;
			permissionState = Notification.permission;
			await checkSubscription();
		}
		isLoading = false;
	});

	async function checkSubscription() {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();
		isSubscribed = !!subscription;
	}

	function urlBase64ToUint8Array(base64String: string) {
		const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
		const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
		const rawData = window.atob(base64);
		const outputArray = new Uint8Array(rawData.length);
		for (let i = 0; i < rawData.length; ++i) {
			outputArray[i] = rawData.charCodeAt(i);
		}
		return outputArray;
	}

	async function toggleNotifications() {
		if (isLoading) return;
		isLoading = true;

		try {
			if (isSubscribed) {
				await unsubscribe();
			} else {
				await subscribe();
			}
		} catch (err) {
			console.error('Push operation failed:', err);
			appToast.error('Failed to update notification settings');
		} finally {
			isLoading = false;
		}
	}

	async function subscribe() {
		const permission = await Notification.requestPermission();
		permissionState = permission;

		if (permission !== 'granted') {
			appToast.warning('Notification permission denied');
			return;
		}

		const registration = await navigator.serviceWorker.ready;

		const subscription = await registration.pushManager.subscribe({
			userVisibleOnly: true,
			applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
		});

		const res = await fetch('/api/push/subscribe', {
			method: 'POST',
			body: JSON.stringify(subscription.toJSON()),
			headers: { 'Content-Type': 'application/json' }
		});

		if (res.ok) {
			isSubscribed = true;
			appToast.success('Notifications enabled');
		} else {
			throw new Error('Server failed to save subscription');
		}
	}

	async function unsubscribe() {
		const registration = await navigator.serviceWorker.ready;
		const subscription = await registration.pushManager.getSubscription();

		if (subscription) {
			await fetch('/api/push/subscribe', {
				method: 'DELETE',
				body: JSON.stringify({ endpoint: subscription.endpoint }),
				headers: { 'Content-Type': 'application/json' }
			});
			await subscription.unsubscribe();
		}

		isSubscribed = false;
		appToast.success('Notifications disabled');
	}
</script>

{#if isSupported}
	{#if variant === 'icon'}
		<Button
			variant="ghost"
			size="icon"
			onclick={toggleNotifications}
			disabled={isLoading || permissionState === 'denied'}
			title={isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}
		>
			{#if isLoading}
				<Loader2 class="size-5 animate-spin" />
			{:else if isSubscribed}
				<Bell class="size-5 text-primary-600" />
			{:else}
				<BellOff class="size-5 text-muted-foreground" />
			{/if}
		</Button>
	{:else}
		<button
			type="button"
			class="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
			onclick={toggleNotifications}
			disabled={isLoading || permissionState === 'denied'}
		>
			<div
				class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-transform group-hover:scale-110 {isSubscribed
					? 'bg-primary-100 text-primary-600'
					: 'bg-slate-100 text-slate-500'}"
			>
				{#if isLoading}
					<Loader2 class="size-4 animate-spin" />
				{:else if isSubscribed}
					<Bell size={16} />
				{:else}
					<BellOff size={16} />
				{/if}
			</div>
			<div class="flex flex-1 flex-col items-start">
				<span>{isSubscribed ? 'Disable Notifications' : 'Enable Notifications'}</span>
				{#if permissionState === 'denied'}
					<span class="text-[9px] font-medium text-rose-500">Permission Denied in Browser</span>
				{/if}
			</div>
		</button>
	{/if}
{/if}
