<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { Button } from '$lib/components/ui/button';
	import { AlertCircle, RotateCcw } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	function handleReset() {
		window.location.reload();
	}
</script>

<svelte:boundary>
	{@render children()}

	{#snippet failed(error, reset)}
		<div class="flex min-h-[400px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-rose-100 bg-rose-50/30 p-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
				<AlertCircle size={32} />
			</div>
			<h2 class="mb-2 text-xl font-black text-slate-900">Something went wrong</h2>
			<p class="mb-6 max-w-md text-sm font-medium text-slate-500">
				An unexpected error occurred in this section of the application.
				<code class="mt-2 block rounded bg-rose-100/50 px-2 py-1 text-xs text-rose-700 font-mono">
					{(error as any)?.message || 'Unknown Error'}
				</code>
			</p>
			<Button variant="outline" class="font-bold gap-2 border-2 border-rose-200 text-rose-700 hover:bg-rose-100" onclick={handleReset}>
				<RotateCcw size={18} />
				Reload Page
			</Button>
		</div>
	{/snippet}
</svelte:boundary>
