<script lang="ts">
	import './layout.css';
    import { onMount } from 'svelte';
    import { Toaster } from 'svelte-sonner';
    import { initI18n } from '$lib/i18n.svelte';
    import Navbar from '$lib/components/Navbar.svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

    onMount(() => {
        initI18n();
    });
</script>

<svelte:head>
    <link rel="icon" href={favicon} />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" rel="stylesheet">
</svelte:head>

<div class="min-h-screen bg-gray-50 flex flex-col font-sans">
    <Navbar />
    
    <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {@render children()}
    </main>

    <Toaster position="top-right" richColors />
</div>

<style>
    :global(body) {
        font-family: 'Inter', 'Noto Sans Bengali', sans-serif;
    }
</style>