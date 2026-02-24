<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';

	interface Props {
		page: number;
		limit: number;
		totalPages: number;
		totalCount: number;
		onPageChange?: (p: number) => void;
		onLimitChange?: (l: number) => void;
	}

	let {
		page: currentPage,
		limit,
		totalPages,
		totalCount,
		onPageChange,
		onLimitChange
	}: Props = $props();

	function goToPage(p: number) {
		if (p < 1 || p > totalPages) return;
		if (onPageChange) {
			onPageChange(p);
		} else {
			const url = new URL(page.url);
			url.searchParams.set('page', p.toString());
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}
	}

	function handleLimitChange(e: Event) {
		const newLimit = parseInt((e.currentTarget as HTMLSelectElement).value);
		if (onLimitChange) {
			onLimitChange(newLimit);
		} else {
			const url = new URL(page.url);
			url.searchParams.set('limit', newLimit.toString());
			url.searchParams.set('page', '1');
			goto(url.toString(), { keepFocus: true, noScroll: true });
		}
	}

	function getPageRange(current: number, total: number) {
		const delta = 1;
		const range = [];
		const rangeWithDots: (number | string)[] = [];
		let l;
		for (let i = 1; i <= total; i++) {
			if (i == 1 || i == total || (i >= current - delta && i <= current + delta)) {
				range.push(i);
			}
		}
		for (let i of range) {
			if (l) {
				if (i - l === 2) {
					rangeWithDots.push(l + 1);
				} else if (i - l !== 1) {
					rangeWithDots.push('...');
				}
			}
			rangeWithDots.push(i);
			l = i;
		}
		return rangeWithDots;
	}
</script>

{#if totalCount > 0}
	<div
		class="mt-6 flex flex-col items-center justify-between gap-6 border-t border-slate-200 px-4 py-8 lg:flex-row"
	>
		<!-- Left: Info -->
		<div class="order-2 text-xs font-bold text-slate-400 md:text-sm lg:order-1">
			Showing <span class="text-slate-900">{(currentPage - 1) * limit + 1}</span>
			to
			<span class="text-slate-900">{Math.min(currentPage * limit, totalCount)}</span>
			of <span class="text-slate-900">{totalCount}</span> results
		</div>

		<!-- Center: Page Numbers -->
		{#if totalPages > 1}
			<div class="order-1 flex items-center gap-1 lg:order-2">
				<Button
					variant="ghost"
					size="sm"
					class="h-9 cursor-pointer gap-1 rounded-xl px-2 font-bold md:h-10 md:px-3"
					disabled={currentPage === 1}
					onclick={() => goToPage(currentPage - 1)}
				>
					<ChevronLeft size={16} />
					<span class="hidden sm:inline">Prev</span>
				</Button>

				<div class="mx-1 flex items-center gap-1 md:mx-2">
					{#each getPageRange(currentPage, totalPages) as p}
						{#if p === '...'}
							<span class="px-1 text-slate-300 md:px-2">...</span>
						{:else}
							<Button
								variant={currentPage === p ? 'default' : 'ghost'}
								size="sm"
								class={cn(
									'h-8 w-8 cursor-pointer rounded-xl text-[10px] font-black transition-all md:h-10 md:w-10 md:text-xs',
									currentPage === p ? 'scale-110 shadow-md' : 'text-slate-500 hover:bg-slate-100'
								)}
								onclick={() => goToPage(p as number)}
							>
								{p}
							</Button>
						{/if}
					{/each}
				</div>

				<Button
					variant="ghost"
					size="sm"
					class="h-9 cursor-pointer gap-1 rounded-xl px-2 font-bold md:h-10 md:px-3"
					disabled={currentPage === totalPages}
					onclick={() => goToPage(currentPage + 1)}
				>
					<span class="hidden sm:inline">Next</span>
					<ChevronRight size={16} />
				</Button>
			</div>
		{/if}

		<!-- Right: Row Count -->
		<div class="order-3 flex items-center gap-3 print:hidden">
			<span class="text-[9px] font-black tracking-widest text-slate-400 capitalize md:text-[10px]"
				>Per Page</span
			>
			<select
				class="cursor-pointer rounded-xl border-2 border-slate-100 bg-white px-2 py-1.5 text-[10px] font-black shadow-sm transition-colors hover:border-slate-200 focus:border-primary-500 focus:outline-none md:px-3 md:py-2 md:text-xs"
				value={limit}
				onchange={handleLimitChange}
			>
				{#each [10, 20, 50, 100] as l}
					<option value={l}>{l}</option>
				{/each}
			</select>
		</div>
	</div>
{/if}
