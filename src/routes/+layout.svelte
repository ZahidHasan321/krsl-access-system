<script lang="ts">
	import './layout.css';
    import { onMount } from 'svelte';
    import { Toaster } from 'svelte-sonner';
    import { initI18n } from '$lib/i18n.svelte';
    import Navbar from '$lib/components/Navbar.svelte';
	import favicon from '$lib/assets/favicon.svg';
    import { page } from '$app/state';

	let { children } = $props();

    let isLoginPage = $derived(page.url.pathname === '/login');

    onMount(() => {
        initI18n();
    });
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
        {@render children()}
    </main>

    <Toaster position="top-right" richColors />
</div>