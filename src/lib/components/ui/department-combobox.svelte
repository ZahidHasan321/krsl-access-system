<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import * as Popover from '$lib/components/ui/popover';
	import { Check, ChevronsUpDown, Loader2, Search, PlusCircle } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { untrack } from 'svelte';
	import VirtualList from 'svelte-virtual-list';

	let { name, value = $bindable(''), placeholder = 'Select department' } = $props<{
		name: string;
		value?: string;
		placeholder?: string;
	}>();

	let open = $state(false);
	let items = $state<any[]>([]);
	let loading = $state(false);
	let searchQuery = $state('');

	async function fetchItems(q: string) {
		loading = true;
		try {
			const res = await fetch(`/api/departments?q=${encodeURIComponent(q)}&limit=100`);
			if (res.ok) {
				items = await res.json();
			}
		} catch (err) {
			console.error(err);
		} finally {
			loading = false;
		}
	}

	// Fetch when opening or query changes
	$effect(() => {
		if (open) {
			// Access searchQuery here to ensure it's tracked by the effect
			const currentQuery = searchQuery;
			const timer = setTimeout(() => {
				fetchItems(currentQuery);
			}, 200);
			return () => clearTimeout(timer);
		}
	});

	// Initialize search query with current value when opening
	$effect(() => {
		if (open) {
			untrack(() => {
				searchQuery = value || '';
			});
		}
	});

	function handleSelect(currentValue: string) {
		value = currentValue;
		open = false;
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		// If typing, assume we might be creating a new one
		value = target.value;
	}
</script>

<div class="relative w-full">
	<input type="hidden" {name} {value} />
	
	<Popover.Root bind:open>
		<Popover.Trigger class="w-full text-left">
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
					placeholder="Search or add department..."
					class="h-11 border-0 bg-transparent px-0 focus-visible:ring-0 font-bold"
					value={searchQuery}
					oninput={handleInput}
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
							<div class="flex flex-1 items-center gap-2 truncate text-left">
								<Check
									class={cn(
										"h-4 w-4 text-primary-600 transition-opacity",
										value === item.name ? "opacity-100" : "opacity-0"
									)}
								/>
								<span class={cn("truncate", value === item.name ? "font-black text-primary-700" : "text-slate-700")}>
									{item.name}
								</span>
							</div>
						</button>
					</VirtualList>
				{:else if !loading && searchQuery}
					<div class="flex h-full flex-col items-center justify-center p-6 text-center">
						<div class="mb-3 rounded-full bg-primary-50 p-3 text-primary-600">
							<PlusCircle size={24} />
						</div>
						<p class="text-sm font-bold text-slate-900">Add Department</p>
						<p class="mt-1 text-[10px] text-slate-500 px-4 leading-tight uppercase font-black">
							"{searchQuery}" will be added to system
						</p>
					</div>
				{:else if !loading}
					<div class="flex h-full flex-col items-center justify-center p-6 text-center text-slate-400">
						<Search size={32} class="mb-2 opacity-20" />
						<p class="text-xs">Start typing to search...</p>
					</div>
				{/if}
			</div>
		</Popover.Content>
	</Popover.Root>
</div>

<style>
	:global(svelte-virtual-list-viewport) {
		height: 280px !important;
	}
</style>
