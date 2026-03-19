<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { cn, getCategoryColorClass } from '$lib/utils';
	import { Layers, CornerDownRight, ChevronRight } from 'lucide-svelte';
	import { getCategoryById } from '$lib/constants/categories';
	import { slide } from 'svelte/transition';
	import { clsx } from 'clsx';
	import DashboardCategoryRow from './DashboardCategoryRow.svelte';

	let { category, level = 0 } = $props<{
		category: any;
		level?: number;
	}>();

	let isExpanded = $state(false);

	const catInfo = $derived(getCategoryById(category.id));
	const Icon = $derived(catInfo?.icon || Layers);
	const hasChildren = $derived(category.children && category.children.length > 0);

	function toggle() {
		if (hasChildren) {
			isExpanded = !isExpanded;
		}
	}
</script>

<div class={clsx('relative', level > 0 && 'ml-5 border-l-2 border-slate-100 pl-4')}>
	<!-- Horizontal connector line for subcategories -->
	{#if level > 0}
		<div class="absolute top-7 -left-[2px] h-0.5 w-3 bg-slate-100"></div>
	{/if}

	<button
		type="button"
		class={clsx(
			'touch-feedback group flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-all duration-150',
			hasChildren ? 'cursor-pointer hover:bg-slate-50 hover:shadow-md active:bg-slate-100/60 active:shadow-sm' : 'cursor-default',
			level === 0
				? 'mb-3 border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/50 hover:border-primary-200 hover:ring-primary-200/50'
				: 'mb-1 border-transparent hover:border-slate-100 hover:bg-slate-50/50 active:bg-slate-100/40'
		)}
		onclick={toggle}
	>
		<!-- Left: Icon & Name -->
		<div class="flex items-center gap-3">
			{#if level === 0}
				<div
					class={cn(
						'flex size-10 items-center justify-center rounded-lg border-2 shadow-sm transition-transform duration-200 group-hover:scale-105',
						getCategoryColorClass(category.color)
					)}
				>
					<Icon size={20} strokeWidth={2.5} />
				</div>
			{:else}
				<div
					class={cn(
						'flex size-8 items-center justify-center rounded-lg border shadow-sm transition-transform duration-200 group-hover:scale-105',
						getCategoryColorClass(category.color)
					)}
				>
					<Icon size={16} strokeWidth={2} />
				</div>
			{/if}

			<div>
				<div class="flex items-center gap-2">
					<span
						class={clsx(
							'text-slate-900',
							level === 0 ? 'text-base font-black capitalize' : 'text-sm font-bold',
							level === 0 && i18n.lang !== 'bn' && 'tracking-tighter'
						)}>{i18n.t(category.slug as any) || category.name}</span
					>
					{#if hasChildren}
						<ChevronRight
							size={14}
							class={cn(
								'text-slate-400 transition-transform duration-200',
								isExpanded && 'rotate-90'
							)}
						/>
					{/if}
				</div>
				{#if level === 0 && category.children.length > 0}
					<div class="text-[9px] font-black tracking-widest text-slate-400 uppercase">
						{category.children.length} Sub-categories
					</div>
				{/if}
			</div>
		</div>

		<!-- Right: Inside / Registered -->
		<div class="flex items-baseline gap-1">
			<span class={cn(
				'text-sm font-black tabular-nums',
				category.count > 0 ? 'text-slate-900' : 'text-slate-300'
			)}>{category.count}</span>
			<span class="text-[10px] font-bold tabular-nums text-slate-400">/ {category.registeredCount}</span>
		</div>
	</button>

	<!-- Render Children -->
	{#if hasChildren && isExpanded}
		<div class="mt-1" transition:slide={{ duration: 200 }}>
			{#each category.children as child}
				<DashboardCategoryRow category={child} level={level + 1} />
			{/each}
		</div>
	{/if}
</div>
