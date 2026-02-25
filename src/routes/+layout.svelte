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

	onMount(() => {
		initI18n();
		connectSSE();
	});

	onDestroy(() => {
		eventSource?.close();
		unsubNav();
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
		});

		// Listen for local test events
		window.addEventListener('checkin', (e: any) => {
			handleCheckInEvent(e.detail.data);
		});

		eventSource.addEventListener('checkout', (e) => {
			try {
				const data = JSON.parse(e.data);
				const method = data.verifyMethod ? ` (${data.verifyMethod})` : '';
				appToast.checkOut(`${data.personName} checked out${method}`);
			} catch {}
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
	{#if !isLoginPage}
		<Navbar />
	{/if}

	<main class={isLoginPage ? 'w-full flex-1' : 'container w-full flex-1 py-8'}>
		<ErrorBoundary>
			{@render children()}
		</ErrorBoundary>
	</main>

	<SecurityCheckDialog bind:this={securityDialog} />
	<Toaster position="top-right" richColors />

	<!-- Scroll to Top Button -->
	{#if showScrollTop}
		<button
			onclick={scrollToTop}
			transition:fade={{ duration: 200 }}
			class="no-print fixed bottom-8 left-8 z-50 flex size-12 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white/90 text-primary-600 shadow-xl backdrop-blur-sm transition-all hover:scale-110 hover:bg-white active:scale-95 sm:right-8 sm:bottom-40 sm:left-auto"
			aria-label="Scroll to top"
		>
			<ArrowUp size={24} strokeWidth={2.5} />
		</button>
	{/if}
</div>
