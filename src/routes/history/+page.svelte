<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import {
		Search,
		Calendar,
		Filter,
		Clock,
		Users,
		TrendingUp,
		X,
		RotateCcw,
		ChevronRight,
		ChevronLeft,
		Printer,
		Loader2,
		UserCheck,
		ArrowLeft
	} from 'lucide-svelte';
	import logo from '$lib/assets/kr_logo.svg';
	import { clsx } from 'clsx';
	import { cn, getCategoryBadgeClass, statusBadgeClasses } from '$lib/utils';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade, slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import { untrack } from 'svelte';
	import { format, parseISO } from 'date-fns';

	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let startDate = $state('');
	let endDate = $state('');

	// Initialize state from data prop once
	$effect.pre(() => {
		untrack(() => {
			if (!searchQuery && data.filters.query) searchQuery = data.filters.query;
			if (!startDate && data.filters.startDate) startDate = data.filters.startDate;
			if (!endDate && data.filters.endDate) endDate = data.filters.endDate;
		});
	});
	let isPreparingPrint = $state(false);
	let previousLimit = $state(20);

	let isPrintConfirmOpen = $state(false);

	$effect(() => {
		if (page.url.searchParams.has('print')) {
			isPreparingPrint = true;
			// Wait for data to be fully rendered
			const timer = setTimeout(() => {
				window.print();
				isPreparingPrint = false;
				window.close();
			}, 1500);
			return () => clearTimeout(timer);
		}
	});

	let debounceTimer: any;

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 400);
	}

	const selectedCategoryId = $derived(page.url.searchParams.get('category') || '');

	const activeRootCategoryId = $derived(() => {
		if (!selectedCategoryId) return '';
		if (ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId)) return selectedCategoryId;
		let current = getCategoryById(selectedCategoryId);
		if (!current) return '';
		while (current?.parentId) {
			const parentId = current.parentId;
			const parent = getCategoryById(parentId);
			if (!parent) break;
			if (ROOT_CATEGORIES.some((r) => r.id === parent.id)) return parent.id;
			current = parent;
		}
		return current?.id || '';
	});

	const activeRootCategoryName = $derived(() => {
		const rootId = activeRootCategoryId();
		if (!rootId) return '';
		const cat = ROOT_CATEGORIES.find((c) => c.id === rootId);
		return cat ? i18n.t(cat.slug as any) || cat.name : '';
	});

	const activeParentCategory = $derived(() => {
		if (!selectedCategoryId) return null;
		if (ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId)) return null;
		const selected = getCategoryById(selectedCategoryId);
		if (!selected?.parentId) return null;
		return getCategoryById(selected.parentId);
	});

	const isEmployeeView = $derived(activeRootCategoryName() === i18n.t('employee'));

	const availableSubCategories = $derived(() => {
		if (!selectedCategoryId) return [];
		if (ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId)) {
			return getSubCategories(selectedCategoryId);
		}
		const selected = getCategoryById(selectedCategoryId);
		if (!selected) return [];
		const children = getSubCategories(selectedCategoryId);
		if (children.length > 0) return children;
		const parentId = selected.parentId;
		if (parentId) {
			return getSubCategories(parentId);
		}
		return [];
	});

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');
		if (startDate) url.searchParams.set('startDate', startDate);
		else url.searchParams.delete('startDate');
		if (endDate) url.searchParams.set('endDate', endDate);
		else url.searchParams.delete('endDate');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function changeView(view: string) {
		const url = new URL(page.url);
		url.searchParams.set('view', view);
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function changeCategory(catId: string | null) {
		const url = new URL(page.url);
		if (catId) url.searchParams.set('category', catId);
		else url.searchParams.delete('category');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function clearFilters() {
		searchQuery = '';
		startDate = '';
		endDate = '';
		applyFilters();
	}

	function formatDuration(seconds: number) {
		if (!seconds) return '0m';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const hasActiveFilters = $derived(!!searchQuery || !!startDate || !!endDate);

	const activeCategoryName = $derived(() => {
		if (!selectedCategoryId) return '';
		const cat = getCategoryById(selectedCategoryId);
		return cat ? i18n.t(cat.slug as any) || cat.name : '';
	});

	function confirmPrint() {
		if (data.pagination.totalCount > 2000) {
			isPrintConfirmOpen = true;
		} else {
			printHistory();
		}
	}

	function printHistory() {
		const url = new URL(page.url);
		url.searchParams.set('limit', '5000');
		url.searchParams.set('page', '1');
		url.searchParams.set('print', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	$effect(() => {
		if (page.url.searchParams.has('print')) {
			isPreparingPrint = true;
			const timer = setTimeout(() => {
				window.print();
				isPreparingPrint = false;
				const url = new URL(page.url);
				url.searchParams.delete('print');
				goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
			}, 1500);
			return () => clearTimeout(timer);
		}
	});
</script>

<svelte:head>
	<title>{i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<!-- Print-only section -->
<div class="print-only hidden">
	<div
		class="print-header"
		style="display: flex !important; justify-content: space-between; align-items: flex-end; padding-bottom: 1.5rem; border-bottom: 3px solid #1c55a4; margin-bottom: 2rem;"
	>
		<div style="display: flex; align-items: center; gap: 20px;">
			<img src={logo} alt="Logo" style="height: 70px; width: auto;" />
			<div style="border-left: 2px solid #e2e8f0; padding-left: 20px;">
				<h1 style="font-family: 'HandelGothic', sans-serif; font-size: 32px; color: #0f172a; margin: 0; line-height: 1;">
					<span style="color: #1c55a4;">KR</span> Steel Ltd.
				</h1>
				<p style="font-size: 11px; font-weight: 900; color: #64748b; margin: 6px 0 0 0; letter-spacing: 0.3em; text-transform: uppercase;">
					Access Management System
				</p>
			</div>
		</div>
		<div style="text-align: right;">
			<h2 style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
				{#if data.view === 'detailed'}
					People History Report
				{:else if data.view === 'daily'}
					Daily Summary Report
				{:else}
					Monthly Summary Report
				{/if}
			</h2>
			<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
				{format(new Date(), 'PPPP')} | {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px;">
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Total Entries</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.summary.totalEntries} Records</span>
		</div>
		
		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 0 3rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Unique People</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">{data.summary.uniquePeople}</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Activity Period</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">{data.summary.activeDays} Active Days</span>
		</div>
	</div>

	{#if data.view === 'detailed'}
		<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
			<thead>
				<tr style="background: #f1f5f9;">
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">#</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Name</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Identity No.</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Category</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Date</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Entry</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Exit</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Duration</th>
				</tr>
			</thead>
			<tbody>
				{#each data.data as log, index (log.id || index)}
					<tr style={index % 2 === 0 ? '' : 'background: #f8fafc;'}>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{index + 1}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{log.person.name}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.person.codeNo || '-'}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.category.name}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{format(parseISO(log.date), 'PP')}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{format(log.entryTime, 'hh:mm a')}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.exitTime ? format(log.exitTime, 'hh:mm a') : 'Inside'}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 700; color: #059669;">{formatDuration(log.durationSeconds)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if data.view === 'daily'}
		<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
			<thead>
				<tr style="background: #f1f5f9;">
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Date</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Total Entries</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Unique People</th>
				</tr>
			</thead>
			<tbody>
				{#each data.data as day, index (day.date)}
					<tr style={index % 2 === 0 ? '' : 'background: #f8fafc;'}>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{format(parseISO(day.date), 'PPPP')}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 700; color: #1c55a4;">{day.totalEntries}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{day.uniquePeople}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if data.view === 'monthly'}
		<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
			<thead>
				<tr style="background: #f1f5f9;">
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Month</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Total Entries</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Unique People</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Active Days</th>
				</tr>
			</thead>
			<tbody>
				{#each data.data as month, index (month.month)}
					<tr style={index % 2 === 0 ? '' : 'background: #f8fafc;'}>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{format(new Date(month.month + '-01'), 'MMMM yyyy')}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 700; color: #1c55a4;">{month.totalEntries}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{month.uniquePeople}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{month.activeDays}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}

	<div
		style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;"
	>
		<p>Generated by {i18n.t('appName')} Official Reporting System</p>
		<p>Page 1 of 1</p>
	</div>
</div>

<!-- Loading overlay for print preparation -->
{#if isPreparingPrint}
	<div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
		<Loader2 class="mb-4 animate-spin text-primary-600" size={48} />
		<h2 class="text-xl font-black text-slate-900">Preparing Print Report...</h2>
		<p class="mt-2 font-bold text-slate-500">Fetching {data.pagination.totalCount} records</p>
	</div>
{/if}

<!-- Screen view -->
<div class="no-print pb-20">
	<!-- Sticky Top Bar for Filters -->
	<div class="sticky-filter-bar">
		<div class="content-container flex flex-wrap items-center justify-between gap-4">
			<!-- Search Section - Left -->
			<div class="flex max-w-md flex-1 items-center gap-4">
				<Button
					variant="ghost"
					size="icon"
					class="shrink-0 rounded-xl hover:bg-slate-100"
					onclick={() => history.back()}
				>
					<ArrowLeft size={20} />
				</Button>
				<div class="group relative flex-1">
					<div
						class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
					>
						<Search size={20} />
					</div>
					<Input
						bind:value={searchQuery}
						oninput={handleSearchInput}
						placeholder={i18n.t('searchHistoryPlaceholder')}
						class="h-12 w-full rounded-2xl border-2 border-slate-300 bg-white pr-12 pl-12 text-base font-bold shadow-sm transition-all focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/30"
					/>
					{#if searchQuery}
						<button
							class="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
							onclick={() => {
								searchQuery = '';
								applyFilters();
							}}
						>
							<X size={16} />
						</button>
					{/if}
				</div>
			</div>

			<!-- Range and Actions - Right -->
			<div class="flex flex-wrap items-center gap-3">
				<div
					class="flex h-12 items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white px-4 shadow-sm"
				>
					<Calendar size={18} class="text-slate-400" />
					<div class="flex items-center gap-3">
						<input
							type="date"
							bind:value={startDate}
							onchange={applyFilters}
							max={new Date().toISOString().split('T')[0]}
							class="cursor-pointer bg-transparent text-sm font-black text-slate-700 focus:outline-none"
						/>
						<div class="h-0.5 w-4 rounded-full bg-slate-200"></div>
						<input
							type="date"
							bind:value={endDate}
							onchange={applyFilters}
							max={new Date().toISOString().split('T')[0]}
							class="cursor-pointer bg-transparent text-sm font-black text-slate-700 focus:outline-none"
						/>
					</div>
				</div>

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						class="h-12 cursor-pointer gap-2 rounded-2xl border-2 border-slate-200 px-6 font-black transition-all hover:border-primary-300 hover:bg-primary-50"
						onclick={confirmPrint}
					>
						<Printer size={18} />
						<span>Print Report</span>
					</Button>

					{#if hasActiveFilters}
						<Button
							variant="ghost"
							class="h-12 cursor-pointer gap-2 rounded-2xl border-2 border-transparent px-6 font-black text-rose-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600"
							onclick={clearFilters}
						>
							<RotateCcw size={18} />
							Reset
						</Button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="content-container flex flex-col items-start gap-8 md:flex-row">
		<!-- Sidebar - Sticky -->
		<aside
			class="custom-scrollbar max-h-[calc(100vh-10rem)] w-full shrink-0 space-y-6 overflow-y-auto pr-2 pb-10 md:w-64"
		>
			<!-- Category Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
					{i18n.t('category')}
				</p>
				<div class="flex flex-col gap-1">
					<Button
						variant={!selectedCategoryId ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							!selectedCategoryId
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeCategory(null)}
					>
						<div class="flex items-center gap-2">
							{#if !selectedCategoryId}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							{i18n.t('all')}
						</div>
					</Button>
					{#each ROOT_CATEGORIES as cat}
						{@const isCatActive = activeRootCategoryId() === cat.id}
						<div>
							<Button
								variant={isCatActive ? 'secondary' : 'ghost'}
								class={cn(
									'h-10 w-full cursor-pointer justify-start px-3 font-bold transition-all',
									isCatActive
										? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
										: 'text-slate-600'
								)}
								onclick={() => changeCategory(cat.id)}
							>
								<div class="flex items-center gap-2">
									{#if isCatActive}
										<div class="size-1.5 rounded-full bg-primary-600"></div>
									{/if}
									{i18n.t(cat.slug as any) || cat.name}
								</div>
							</Button>

							{#if isCatActive && availableSubCategories().length > 0}
								<div
									class="mt-1 mb-2 ml-3 border-l-2 border-primary-100 pl-3"
									transition:slide={{ duration: 250, easing: sineInOut }}
								>
									<div class="flex flex-wrap gap-1.5 py-1">
										<button
											class={clsx(
												'cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-all',
												activeRootCategoryId() === selectedCategoryId
													? 'border-primary-600 bg-primary-600 text-white shadow-sm'
													: 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'
											)}
											onclick={() => changeCategory(activeRootCategoryId())}
										>
											All
										</button>

										{#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
											<button
												class="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-200"
												onclick={() => changeCategory(activeParentCategory()?.id || null)}
											>
												<span class="mr-1 opacity-50">↑</span>
												{activeParentCategory()?.name}
											</button>
										{/if}

										{#each availableSubCategories() as subCat}
											<button
												class={clsx(
													'cursor-pointer rounded-full border px-3 py-1 text-[11px] font-bold transition-all',
													selectedCategoryId === subCat.id
														? 'border-primary-600 bg-primary-600 text-white shadow-sm'
														: 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'
												)}
												onclick={() => changeCategory(subCat.id)}
											>
												{i18n.t(subCat.slug as any) || subCat.name}
											</button>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<!-- View Selector -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Views</p>
				<div class="flex flex-col gap-1">
					<Button
						variant={data.view === 'detailed' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start gap-2 px-3 font-bold transition-all',
							data.view === 'detailed'
								? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeView('detailed')}
					>
						<div class="flex items-center gap-2">
							{#if data.view === 'detailed'}
								<div class="size-1.5 animate-pulse rounded-full bg-primary-600"></div>
							{/if}
							<Clock size={16} />
							{i18n.t('detailed')}
						</div>
					</Button>
					<Button
						variant={data.view === 'daily' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start gap-2 px-3 font-bold transition-all',
							data.view === 'daily'
								? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeView('daily')}
					>
						<div class="flex items-center gap-2">
							{#if data.view === 'daily'}
								<div class="size-1.5 animate-pulse rounded-full bg-primary-600"></div>
							{/if}
							<Calendar size={16} />
							{i18n.t('dailySummary')}
						</div>
					</Button>
					<Button
						variant={data.view === 'monthly' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start gap-2 px-3 font-bold transition-all',
							data.view === 'monthly'
								? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeView('monthly')}
					>
						<div class="flex items-center gap-2">
							{#if data.view === 'monthly'}
								<div class="size-1.5 animate-pulse rounded-full bg-primary-600"></div>
							{/if}
							<TrendingUp size={16} />
							{i18n.t('monthlySummary')}
						</div>
					</Button>
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="space-y-3 rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
					People History Summary
				</p>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-2xl font-black text-slate-900">{data.summary.totalEntries}</p>
						<p class="text-[10px] font-bold text-slate-500 capitalize">{i18n.t('entries')}</p>
					</div>
					<div>
						<p class="text-2xl font-black text-slate-900">{data.summary.uniquePeople}</p>
						<p class="text-[10px] font-bold text-slate-500 capitalize">{i18n.t('people')}</p>
					</div>
					<div>
						<p class="text-2xl font-black text-slate-900">{data.summary.activeDays}</p>
						<p class="text-[10px] font-bold text-slate-500 capitalize">Active Days</p>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main Scrolling Content Area -->
		<main class="min-w-0 flex-1 space-y-6">
			<!-- List Section -->
			<div class="space-y-4">
				<!-- Mobile Card View -->
				<div class="space-y-3 lg:hidden">
					{#if data.view === 'detailed'}
						{#each data.data as log (log.id)}
							<Card.Root
								class="cursor-pointer bg-white transition-shadow hover:shadow-lg"
								onclick={() => goto(`/people/${log.person.id}`)}
							>
								<Card.Content class="p-4">
									<div class="mb-3 flex items-start justify-between gap-3">
										<div>
											<div class="font-bold text-slate-900">{log.person.name}</div>
											<div class="mt-1 flex items-center gap-1.5">
												<Badge
													variant="outline"
													class={cn(
														'h-4 px-1.5 text-[9px] font-bold tracking-tight capitalize',
														getCategoryBadgeClass(log.category.slug)
													)}
												>
													{log.rootCategory.name}
													{log.category.name !== log.rootCategory.name
														? '• ' + log.category.name
														: ''}
												</Badge>
												<span class="text-[10px] font-bold text-slate-400"
													>#{log.person.codeNo || 'N/A'}</span
												>
											</div>
										</div>
										{#if !log.exitTime}
											<Badge
												class={cn(
													'shrink-0 text-[10px] font-bold capitalize',
													statusBadgeClasses.on_premises
												)}
											>
												{i18n.t('inside')}
											</Badge>
										{/if}
									</div>
									<div class="grid grid-cols-3 gap-2 text-xs">
										<div>
											<p class="font-medium text-slate-400">{i18n.t('date')}</p>
											<p class="font-bold text-slate-600">{format(parseISO(log.date), 'PP')}</p>
										</div>
										<div>
											<p class="font-medium text-slate-400">{i18n.t('entryTime')}</p>
											<p class="font-black text-slate-700">{format(log.entryTime, 'hh:mm a')}</p>
										</div>
										<div>
											<p class="font-medium text-slate-400">{i18n.t('exitTime')}</p>
											<p class="font-black text-slate-700">
												{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
											</p>
										</div>
									</div>
									<div class="mt-2 border-t border-slate-100 pt-2 text-xs">
										<span class="font-medium text-slate-400"
											>{log.exitTime ? i18n.t('duration') : 'Inside For'}:</span
										>
										<span class="ml-1 font-bold text-slate-500"
											>{formatDuration(log.durationSeconds)}</span
										>
									</div>
									{#if !isEmployeeView && log.purpose}
										<div class="mt-2 border-t border-slate-100 pt-2 text-xs">
											<span class="font-medium text-slate-400">{i18n.t('purpose')}:</span>
											<span class="ml-1 font-medium text-slate-600">{log.purpose}</span>
										</div>
									{/if}
								</Card.Content>
							</Card.Root>
						{:else}
							<div class="py-20 text-center space-y-4">
								<div
									class="size-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border-2 border-slate-100 shadow-sm"
								>
									<Users size={40} />
								</div>
								<p class="text-slate-500 font-bold">{i18n.t('noData')}</p>
							</div>
						{/each}
					{:else if data.view === 'daily'}
						{#each data.data as day}
							<Card.Root class="bg-white">
								<Card.Content class="p-4">
									<div class="mb-2 font-bold text-slate-900">
										{format(parseISO(day.date), 'PP')}
									</div>
									<div class="grid grid-cols-3 gap-2 text-center">
										<div class="rounded-lg bg-primary-50 p-2">
											<p class="text-xl font-black text-primary-600">{day.totalEntries}</p>
											<p class="text-[10px] font-bold text-primary-500 uppercase">
												{i18n.t('entries')}
											</p>
										</div>
										<div class="rounded-lg bg-emerald-50 p-2">
											<p class="text-xl font-black text-emerald-600">{day.uniquePeople}</p>
											<p class="text-[10px] font-bold text-emerald-500 uppercase">
												{i18n.t('people')}
											</p>
										</div>
										<div class="rounded-lg bg-slate-100 p-2">
											<p class="text-xl font-black text-slate-700">
												{formatDuration(day.totalDuration)}
											</p>
											<p class="text-[10px] font-bold text-slate-500 uppercase">Hours</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					{:else}
						{#each data.data as month}
							<Card.Root class="bg-white">
								<Card.Content class="p-4">
									<div class="mb-2 font-black text-slate-900 uppercase">
										{format(parseISO(month.month + '-01'), 'MMMM yyyy')}
									</div>
									<div class="grid grid-cols-3 gap-2 text-center">
										<div class="rounded-lg bg-primary-50 p-2">
											<p class="text-xl font-black text-primary-600">{month.totalEntries}</p>
											<p class="text-[10px] font-bold text-primary-500 uppercase">
												{i18n.t('entries')}
											</p>
										</div>
										<div class="rounded-lg bg-emerald-50 p-2">
											<p class="text-xl font-black text-emerald-600">{month.uniquePeople}</p>
											<p class="text-[10px] font-bold text-emerald-500 uppercase">
												{i18n.t('people')}
											</p>
										</div>
										<div class="rounded-lg bg-amber-50 p-2">
											<p class="text-xl font-black text-amber-600">{month.activeDays}</p>
											<p class="text-[10px] font-bold text-amber-500 uppercase">Days</p>
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						{/each}
					{/if}
				</div>

				<!-- Desktop Table View -->
				<div class="hidden lg:block">
					<Card.Root class="overflow-hidden rounded-3xl border-2 bg-white shadow-sm">
						<Table.Root>
							{#if data.view === 'detailed'}
								<Table.Header>
									<Table.Row class="bg-slate-50 hover:bg-transparent">
										<Table.Head class="font-black text-slate-900">{i18n.t('name')}</Table.Head>
										<Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
										<Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
										<Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
										{#if !isEmployeeView}
											<Table.Head class="font-black text-slate-900">{i18n.t('purpose')}</Table.Head>
										{/if}
										<Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.data as log (log.id)}
										<Table.Row
											class="group cursor-pointer"
											onclick={() => goto(`/people/${log.person.id}`)}
										>
											<Table.Cell class="py-4">
												<div
													class="font-bold text-slate-900 transition-colors group-hover:text-primary-600"
												>
													{log.person.name}
												</div>
												<div class="mt-1 flex items-center gap-1.5">
													<Badge
														variant="outline"
														class={cn(
															'h-4 px-1.5 text-[9px] font-bold tracking-tight capitalize',
															getCategoryBadgeClass(log.category.slug)
														)}
													>
														{log.rootCategory.name}
														{log.category.name !== log.rootCategory.name
															? '• ' + log.category.name
															: ''}
													</Badge>
													<span class="text-[10px] font-bold text-slate-400"
														>#{log.person.codeNo || 'N/A'}</span
													>
												</div>
											</Table.Cell>
											<Table.Cell class="py-4 font-medium text-slate-600"
												>{format(parseISO(log.date), 'PP')}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-slate-700"
												>{format(log.entryTime, 'hh:mm a')}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-slate-700">
												{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
											</Table.Cell>
											{#if !isEmployeeView}
												<Table.Cell class="py-4 font-medium text-slate-600">
													{log.purpose || '-'}
												</Table.Cell>
											{/if}
											<Table.Cell class="py-4 font-bold text-slate-500">
												<div class="flex flex-col gap-1">
													<span>{formatDuration(log.durationSeconds)}</span>
													{#if !log.exitTime}
														<Badge
															class={cn(
																'h-4 w-fit text-[9px] font-bold capitalize',
																statusBadgeClasses.on_premises
															)}
														>
															{i18n.t('inside')}
														</Badge>
													{/if}
												</div>
											</Table.Cell>
										</Table.Row>
									{:else}
										<Table.Row>
											<Table.Cell
												colspan={isEmployeeView ? 5 : 6}
												class="h-64 text-center text-slate-400 font-bold"
												>{i18n.t('noData')}</Table.Cell
											>
										</Table.Row>
									{/each}
								</Table.Body>
							{:else if data.view === 'daily'}
								<Table.Header>
									<Table.Row class="bg-slate-50 hover:bg-transparent">
										<Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
										<Table.Head class="font-black text-slate-900">{i18n.t('entries')}</Table.Head>
										<Table.Head class="font-black text-slate-900">Unique People</Table.Head>
										<Table.Head class="font-black text-slate-900">Total Hours</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.data as day}
										<Table.Row>
											<Table.Cell class="py-4 font-bold text-slate-900"
												>{format(parseISO(day.date), 'PP')}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-primary-600"
												>{day.totalEntries}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-emerald-600"
												>{day.uniquePeople}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-slate-700"
												>{formatDuration(day.totalDuration)}</Table.Cell
											>
										</Table.Row>
									{/each}
								</Table.Body>
							{:else if data.view === 'monthly'}
								<Table.Header>
									<Table.Row class="bg-slate-50 hover:bg-transparent">
										<Table.Head class="font-black text-slate-900">{i18n.t('month')}</Table.Head>
										<Table.Head class="font-black text-slate-900">{i18n.t('entries')}</Table.Head>
										<Table.Head class="font-black text-slate-900">Unique People</Table.Head>
										<Table.Head class="font-black text-slate-900">Active Days</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.data as month}
										<Table.Row>
											<Table.Cell class="py-4 font-black text-slate-900 uppercase">
												{format(parseISO(month.month + '-01'), 'MMMM yyyy')}
											</Table.Cell>
											<Table.Cell class="py-4 font-black text-primary-600"
												>{month.totalEntries}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-emerald-600"
												>{month.uniquePeople}</Table.Cell
											>
											<Table.Cell class="py-4 font-black text-amber-600"
												>{month.activeDays}</Table.Cell
											>
										</Table.Row>
									{/each}
								</Table.Body>
							{/if}
						</Table.Root>
					</Card.Root>
				</div>

				<!-- Pagination -->
				<Pagination {...data.pagination} />
			</div>
		</main>
	</div>
</div>

<ConfirmModal
	bind:open={isPrintConfirmOpen}
	title="Large Report Warning"
	message="This report contains {data.pagination
		.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
	confirmText="Print Anyway"
	cancelText="Cancel"
	variant="warning"
	onconfirm={printHistory}
/>
