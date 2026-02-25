<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { Check, ChevronsUpDown, Loader2, Search, PlusCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { onMount } from 'svelte';
	import VirtualList from 'svelte-virtual-list';

	let { name, value = $bindable(''), placeholder = 'Job title' } = $props<{
		name: string;
		value?: string;
		placeholder?: string;
	}>();

	let open = $state(false);
	let items = $state<any[]>([]);
	let loading = $state(false);
	let query = $state('');

	async function fetchItems(q: string) {
		loading = true;
		try {
			// Remove limit or increase it significantly for virtualization
			const res = await fetch(`/api/designations?q=${encodeURIComponent(q)}&limit=200`);
			if (res.ok) {
				items = await res.json();
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// Fetch initial items on mount
	onMount(() => {
		fetchItems('');
	});

	// Re-fetch when query changes
	$effect(() => {
		const timer = setTimeout(() => {
			fetchItems(query);
		}, 200);
		return () => clearTimeout(timer);
	});

	function handleSelect(currentValue: string) {
		value = currentValue;
		open = false;
	}

	function handleCustomInput(e: Event) {
		const target = e.target as HTMLInputElement;
		value = target.value;
		query = target.value;
	}
</script>

<div class="relative w-full">
	<input type="hidden" {name} {value} />
	
	<Popover.Root bind:open>
		<Popover.Trigger class="w-full">
			<div
				class="flex h-11 w-full items-center justify-between rounded-xl border-2 bg-white px-4 py-2 text-sm transition-all hover:border-primary-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<span class={cn("truncate", !value && "text-muted-foreground")}>
					{value || placeholder}
				</span>
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</div>
		</Popover.Trigger>
		<Popover.Content class="w-[--bits-popover-anchor-width] overflow-hidden p-0 shadow-2xl" align="start">
			<div class="flex items-center border-b bg-slate-50/50 px-3">
				<Search class="mr-2 h-4 w-4 text-slate-400" />
				<Input
					placeholder="Search or type new designation..."
					class="h-11 border-0 bg-transparent px-0 focus-visible:ring-0"
					bind:value
					oninput={handleCustomInput}
				/>
				{#if loading}
					<Loader2 class="ml-2 h-4 w-4 animate-spin text-primary-500" />
				{/if}
			</div>

			<div class="h-[280px] w-full bg-white">
				{#if items.length > 0}
					<VirtualList {items} let:item>
						<button
							class="flex w-full items-center px-4 py-2.5 text-sm transition-colors hover:bg-primary-50"
							onclick={() => handleSelect(item.name)}
						>
							<div class="flex flex-1 items-center gap-2 truncate">
								<Check
									class={cn(
										"h-4 w-4 text-primary-600 transition-opacity",
										value === item.name ? "opacity-100" : "opacity-0"
									)}
								/>
								<span class={cn("truncate", value === item.name ? "font-bold text-primary-700" : "text-slate-700")}>
									{item.name}
								</span>
							</div>
						</button>
					</VirtualList>
				{:else if !loading && value}
					<div class="flex h-full flex-col items-center justify-center p-6 text-center">
						<div class="mb-3 rounded-full bg-primary-50 p-3 text-primary-600">
							<PlusCircle size={24} />
						</div>
						<p class="text-sm font-bold text-slate-900">New Designation</p>
						<p class="mt-1 text-xs text-slate-500">
							"{value}" isn't in the list yet. It will be added automatically when you save.
						</p>
					</div>
				{:else if !loading}
					<div class="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
						<Search size={32} class="mb-2 opacity-20" />
						<p class="text-xs">Start typing to search or add...</p>
					</div>
				{/if}
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

<style>
	/* Fix for VirtualList height container */
	:global(svelte-virtual-list-viewport) {
		height: 280px !important;
	}
</style>
