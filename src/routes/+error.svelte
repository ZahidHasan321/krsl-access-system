<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, ArrowLeft, Home } from 'lucide-svelte';

	let status = $derived(page.status);
	let message = $derived(page.error?.message || 'Something went wrong');
</script>

<div class="flex min-h-[400px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-rose-100 bg-rose-50/30 p-12 text-center">
	<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
		<AlertCircle size={32} />
	</div>
	<p class="mb-1 text-5xl font-black text-rose-300">{status}</p>
	<h2 class="mb-2 text-xl font-black text-slate-900">
		{#if status === 404}
			Page not found
		{:else if status === 403}
			Access denied
		{:else}
			Something went wrong
		{/if}
	</h2>
	<p class="mb-6 max-w-md text-sm font-medium text-slate-500">
		{#if status === 404}
			The page you're looking for doesn't exist or has been moved.
		{:else if status === 403}
			You don't have permission to view this page.
		{:else}
			{message}
		{/if}
	</p>
	<div class="flex items-center gap-3">
		<Button variant="outline" class="font-bold gap-2 border-2 border-slate-200" onclick={() => history.back()}>
			<ArrowLeft size={18} />
			Go Back
		</Button>
		<Button class="font-bold gap-2" href="/">
			<Home size={18} />
			Dashboard
		</Button>
	</div>
</div>
