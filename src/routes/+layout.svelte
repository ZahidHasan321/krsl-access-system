<script lang="ts">
	import './layout.css';
    import { onMount, onDestroy } from 'svelte';
    import { Toaster, toast } from 'svelte-sonner';
    import { initI18n } from '$lib/i18n.svelte';
    import { appToast } from '$lib/utils';
    import Navbar from '$lib/components/Navbar.svelte';
	import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/state';
    import { goto, invalidateAll } from '$app/navigation';
    import { navigating } from '$app/stores';
    import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';

	let { children } = $props();

    let isLoginPage = $derived(page.url.pathname === '/login');
    let eventSource: EventSource | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let isNavigating = false;

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

<svelte:head>
    <link rel="icon" href={favicon} />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Anek+Bangla:wght@400;500;600;700;800&family=Galada&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-slate-50 flex flex-col">
    {#if !isLoginPage}
        <div class="no-print">
            <Navbar />
        </div>
    {/if}

    <main class={isLoginPage ? "flex-1 w-full" : "flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8"}>
        <ErrorBoundary>
            {@render children()}
        </ErrorBoundary>
    </main>

    <Toaster position="top-right" richColors />
</div>
