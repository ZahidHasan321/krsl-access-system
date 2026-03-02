<script lang="ts">
	import './layout.css';
	import { onMount, onDestroy } from 'svelte';
	import { fade } from 'svelte/transition';
	import { Toaster, toast } from 'svelte-sonner';
	import { initI18n } from '$lib/i18n.svelte';
	import { appToast } from '$lib/utils';
	import Navbar from '$lib/components/Navbar.svelte';
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { navigating } from '$app/stores';
	import { ArrowUp } from 'lucide-svelte';
	import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
	import SecurityCheckDialog from '$lib/components/SecurityCheckDialog.svelte';

	let { children } = $props();

	let isLoginPage = $derived(page.url.pathname === '/login');
	let isPrintMode = $derived(page.url.searchParams.has('print'));
	let eventSource: EventSource | null = null;
	let refreshTimer: ReturnType<typeof setTimeout> | null = null;
	let isNavigating = false;
	let securityDialog = $state<any>(null);

	let scrollY = $state(0);
	const showScrollTop = $derived(scrollY > 400);

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}

	// Track navigation state to avoid invalidating during transitions
	const unsubNav = navigating.subscribe((nav) => {
		isNavigating = !!nav;
	});

	function handleLocalCheckIn(e: any) {
		handleCheckInEvent(e.detail.data);
	}

	onMount(() => {
		initI18n();
		connectSSE();
		window.addEventListener('checkin', handleLocalCheckIn);
	});

	onDestroy(() => {
		eventSource?.close();
		unsubNav();
		if (typeof window !== 'undefined') {
			window.removeEventListener('checkin', handleLocalCheckIn);
		}
	});

	function handleCheckInEvent(eventData: any) {
		try {
			const data = JSON.parse(eventData);
			const method = data.verifyMethod ? ` (${data.verifyMethod})` : '';

			if (data.isTrained === false) {
				appToast.warning(`SAFETY WARNING: ${data.personName} is UNTRAINED`);
			} else {
				appToast.checkIn(`${data.personName} checked in${method}`);
			}

			securityDialog?.handleCheckIn(data);
		} catch (err) {
			console.error('Error handling checkin event:', err);
		}
	}

	function connectSSE() {
		if (isLoginPage) return;

		eventSource = new EventSource('/api/events');

		// Auto-refresh page data when device sends new data (attendance, enrollment, etc.)
		// Only invalidate when the page is stable (not navigating) and visible
		eventSource.onmessage = () => {
			if (refreshTimer) clearTimeout(refreshTimer);
			refreshTimer = setTimeout(() => {
				if (!isNavigating && document.visibilityState === 'visible') {
					invalidateAll();
				}
			}, 1000);
		};

		eventSource.addEventListener('checkin', (e) => {
			handleCheckInEvent(e.data);
			window.dispatchEvent(new CustomEvent('checkin-sse', { detail: e.data }));
		});

		eventSource.addEventListener('checkout', (e) => {
			try {
				const data = JSON.parse(e.data);
				const method = data.verifyMethod ? ` (${data.verifyMethod})` : '';
				appToast.checkOut(`${data.personName} checked out${method}`);
				window.dispatchEvent(new CustomEvent('checkout-sse', { detail: e.data }));
			} catch {}
		});

		eventSource.addEventListener('vehicle-checkin', (e) => {
			try {
				const data = JSON.parse(e.data);
				appToast.vehicle(`Vehicle ${data.vehicleNumber} entered the premises`);
				window.dispatchEvent(new CustomEvent('vehicle-checkin-sse', { detail: e.data }));
			} catch {}
		});

		eventSource.addEventListener('vehicle-checkout', (e) => {
			try {
				const data = JSON.parse(e.data);
				appToast.vehicle(`Vehicle ${data.vehicleNumber} left the premises`);
				window.dispatchEvent(new CustomEvent('vehicle-checkout-sse', { detail: e.data }));
			} catch {}
		});

		eventSource.addEventListener('enrollment', (e) => {
			window.dispatchEvent(new CustomEvent('enrollment-sse', { detail: e.data }));
		});

		eventSource.onerror = () => {
			eventSource?.close();
			// Reconnect after 5s
			setTimeout(connectSSE, 5000);
		};
	}
</script>

<svelte:window bind:scrollY />

<div class="relative flex min-h-screen flex-col overflow-x-clip bg-background">
	{#if !isLoginPage && !isPrintMode}
		<Navbar />
	{/if}

	<main class={isLoginPage || isPrintMode ? 'w-full flex-1' : 'container w-full flex-1 py-8'}>
		<ErrorBoundary>
			{@render children()}
		</ErrorBoundary>
	</main>

	{#if !isPrintMode}
		<SecurityCheckDialog bind:this={securityDialog} />
	{/if}
	<Toaster position="top-right" richColors />

	<!-- Scroll to Top Button -->
	{#if showScrollTop && !isPrintMode}
		<button
			onclick={scrollToTop}
			transition:fade={{ duration: 200 }}
			class="no-print fixed bottom-8 left-8 z-50 flex size-12 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/95 text-primary-600 shadow-xl transition-all hover:scale-110 hover:bg-white active:scale-95 sm:right-8 sm:bottom-40 sm:left-auto"
			aria-label="Scroll to top"
		>
			<ArrowUp size={24} strokeWidth={2.5} />
		</button>
	{/if}
</div>
