<script lang="ts">
	import './layout.css';
    import { onMount, onDestroy } from 'svelte';
    import { Toaster, toast } from 'svelte-sonner';
    import { initI18n } from '$lib/i18n.svelte';
    import { appToast } from '$lib/utils';
    import Navbar from '$lib/components/Navbar.svelte';
    import { page } from '$app/state';
    import { goto, invalidateAll } from '$app/navigation';
    import { navigating } from '$app/stores';
    import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
    import SecurityCheckDialog from '$lib/components/SecurityCheckDialog.svelte';
    import BrandBackground from '$lib/components/BrandBackground.svelte';

	let { children } = $props();

    let isLoginPage = $derived(page.url.pathname === '/login');
    let eventSource: EventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let isNavigating = false;
    let securityDialog = $state<any>(null);

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
            try {
                const data = JSON.parse(e.data);
                const method = data.verifyMethod ? ` (${data.verifyMethod})` : '';
                appToast.checkIn(`${data.personName} checked in${method}`);
                securityDialog?.handleCheckIn(data);
            } catch {}
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

<div class="min-h-screen bg-background flex flex-col relative overflow-x-clip">
    <BrandBackground />
    {#if !isLoginPage}
        <Navbar />
    {/if}

    <main class={isLoginPage ? "flex-1 w-full" : "flex-1 w-full container py-8"}>
        <ErrorBoundary>
            {@render children()}
        </ErrorBoundary>
    </main>

    <SecurityCheckDialog bind:this={securityDialog} />
    <Toaster position="top-right" richColors />
</div>
