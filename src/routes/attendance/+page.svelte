<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Users,
		PlayCircle,
		PlusCircle,
		Clock,
		CheckCircle2,
		RotateCcw,
		X,
		Printer,
		Loader2,
		ScanFace,
		Fingerprint,
		IdCard,
		PenTool,
		MapPin,
		Filter,
		History,
		Ship,
		Warehouse
	} from 'lucide-svelte';
	import logo from '$lib/assets/kr_logo.svg';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { format } from 'date-fns';
	import { enhance } from '$app/forms';
	import { clsx } from 'clsx';
	import { slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import {
		cn,
		getCategoryBadgeClass,
		statusBadgeClasses
	} from '$lib/utils';
	import type { PageData, ActionData } from './$types';
	import CheckInDialog from '$lib/components/CheckInDialog.svelte';
	import RegisterDialog from '../people/RegisterDialog.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';
	import { onMount, untrack } from 'svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const getCategoryPath = (categoryId: string) => {
		const path: { id: string; name: string; slug: string }[] = [];
		let current = getCategoryById(categoryId);
		while (current) {
			path.unshift({ id: current.id, name: current.name, slug: current.slug });
			if (!current.parentId) break;
			const parentId = current.parentId;
			current = getCategoryById(parentId);
		}
		return path;
	};

	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let selectedCategoryId = $state('');
	let selectedLocation = $state('');
	let selectedSort = $state<'recent' | 'duration'>('recent');

	// Initialize state from data prop once
	$effect.pre(() => {
		untrack(() => {
			if (!searchQuery && data.filters.query) searchQuery = data.filters.query;
			if (!selectedCategoryId && data.filters.categoryId) selectedCategoryId = data.filters.categoryId;
			if (!selectedLocation && data.filters.location) selectedLocation = data.filters.location;
			if (data.filters.sortBy) selectedSort = data.filters.sortBy;
		});
	});

	$effect(() => {
		// Only sync from server if user is not currently focusing the input
		if (data.filters.query !== searchQuery && document.activeElement !== searchInputEl) {
			searchQuery = data.filters.query || '';
		}
	});

	let isCheckInOpen = $state(false);
	let isRegisterOpen = $state(false);
	let isPreparingPrint = $state(false);
	let confirmCheckOutOpen = $state(false);
	let checkOutFormElement = $state<HTMLFormElement | null>(null);
	let debounceTimer: any;
	let isPrintConfirmOpen = $state(false);
	let isPrintMode = $derived(page.url.searchParams.has('print'));

	$effect(() => {
		if (isPrintMode) {
			isPreparingPrint = true;
			const timer = setTimeout(() => {
				window.print();
				isPreparingPrint = false;
				// If this was a new tab, we don't need to go back, user will close it
				// But we'll remove the param just in case
				if (window.opener === null) {
					const url = new URL(page.url);
					url.searchParams.delete('print');
					goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
				}
			}, 1500);
			return () => clearTimeout(timer);
		}
	});

	// Infinite scroll state
	let logs = $state<any[]>([]);
	let pageNum = $state(1);
	let isLoadingMore = $state(false);
	let sentinel: HTMLDivElement | undefined = $state();
	let observer: IntersectionObserver | undefined;

	$effect(() => {
		logs = data.logs;
		pageNum = data.pagination.page;
	});

	$effect(() => {
		if (sentinel && !observer) {
			observer = new IntersectionObserver((entries) => {
				if (entries[0].isIntersecting) {
					loadMore();
				}
			}, { rootMargin: '200px' });
			observer.observe(sentinel);
		}
		return () => {
			if (observer) {
				observer.disconnect();
				observer = undefined;
			}
		};
	});

	async function loadMore() {
		if (isLoadingMore || logs.length >= data.pagination.totalCount) return;

		isLoadingMore = true;
		const nextPage = pageNum + 1;
		const url = new URL('/api/attendance', window.location.origin);
		url.searchParams.set('page', nextPage.toString());
		url.searchParams.set('limit', data.pagination.limit.toString());
		if (searchQuery) url.searchParams.set('q', searchQuery);
		if (selectedCategoryId) url.searchParams.set('category', selectedCategoryId);
		if (selectedLocation) url.searchParams.set('location', selectedLocation);
		if (selectedSort) url.searchParams.set('sort', selectedSort);

		try {
			const res = await fetch(url);
			if (res.ok) {
				const result = await res.json();
				// Convert date strings back to Date objects
				const newLogs = result.logs.map((l: any) => ({
					...l,
					entryTime: new Date(l.entryTime),
					exitTime: l.exitTime ? new Date(l.exitTime) : null
				}));
				logs = [...logs, ...newLogs];
				pageNum = nextPage;
			}
		} catch (e) {
			console.error('Failed to load more logs', e);
		} finally {
			isLoadingMore = false;
		}
	}

	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
		};
	});

	function triggerCheckOut(form: HTMLFormElement) {
		checkOutFormElement = form;
		confirmCheckOutOpen = true;
	}

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');

		if (selectedCategoryId) url.searchParams.set('category', selectedCategoryId);
		else url.searchParams.delete('category');

		if (selectedLocation) url.searchParams.set('location', selectedLocation);
		else url.searchParams.delete('location');

		if (selectedSort !== 'recent') url.searchParams.set('sort', selectedSort);
		else url.searchParams.delete('sort');

		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 400);
	}

	const activeRootCategoryId = $derived(() => {
		if (!selectedCategoryId) return '';
		if (ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId)) return selectedCategoryId;
		let current = getCategoryById(selectedCategoryId);
		if (!current) return '';
		while (current?.parentId) {
			const parentId = current.parentId;
			const parent = getCategoryById(parentId);
			if (!parent) break;
			current = parent;
		}
		return current?.id || '';
	});

	const activeCategoryName = $derived(() => {
		if (!selectedCategoryId) return '';
		const cat = getCategoryById(selectedCategoryId);
		return cat ? i18n.t(cat.slug as any) || cat.name : '';
	});

	const activeRootCategoryName = $derived(() => {
		const rootId = activeRootCategoryId();
		if (!rootId) return '';
		const cat = ROOT_CATEGORIES.find((c) => c.id === rootId);
		return cat ? i18n.t(cat.slug as any) || cat.name : '';
	});

	const availableSubCategories = $derived(() => {
		if (!selectedCategoryId) return [];
		if (ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId)) {
			return getSubCategories(selectedCategoryId);
		}
		const selected = getCategoryById(selectedCategoryId);
		if (!selected) return [];
		const children = getSubCategories(selectedCategoryId);
		if (children.length > 0) return children;
		if (selected.parentId) {
			return getSubCategories(selected.parentId);
		}
		return [];
	});

	const activeParentCategory = $derived(() => {
		if (!selectedCategoryId) return null;
		if (ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId)) return null;
		const selected = getCategoryById(selectedCategoryId);
		if (!selected?.parentId) return null;
		return getCategoryById(selected.parentId);
	});

	const isEmployeeView = $derived(activeRootCategoryName() === i18n.t('employee'));

	function changeCategory(catId: string | '') {
		selectedCategoryId = catId;
		applyFilters();
	}

	function changeLocation(loc: string) {
		selectedLocation = loc;
		applyFilters();
	}

	function changeSort(s: 'recent' | 'duration') {
		selectedSort = s;
		applyFilters();
	}

	const hasActiveFilters = $derived(!!searchQuery || !!selectedCategoryId || !!selectedLocation || selectedSort !== 'recent');

	function clearFilters() {
		searchQuery = '';
		selectedCategoryId = '';
		selectedLocation = '';
		selectedSort = 'recent';
		applyFilters();
	}

	function confirmPrint() {
		if (data.pagination.totalCount > 2000) {
			isPrintConfirmOpen = true;
		} else {
			printEntryLog();
		}
	}

	function printEntryLog() {
		const url = new URL(page.url);
		url.searchParams.set('limit', '5000');
		url.searchParams.set('page', '1');
		url.searchParams.set('print', '1');
		window.open(url.toString(), '_blank');
	}

	function formatDuration(seconds: number) {
		if (!seconds || seconds < 0) return '0m';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	let showMobileFilters = $state(false);
</script>

<svelte:head>
	<title>{i18n.t('entryLog')} | {i18n.t('appName')}</title>
</svelte:head>

<!-- Print-only section -->
<div class={cn('print-only', !isPrintMode && 'hidden')}>
	<div
		class="print-header"
		style="display: flex !important; justify-content: space-between; align-items: flex-end; padding-bottom: 1.5rem; border-bottom: 2px solid #000; margin-bottom: 2rem;"
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
				Entry Log Report
			</h2>
			<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
				{format(new Date(), 'PPPP')} | {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 0;">
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Current Status</span>
			<span style="font-size: 15px; font-weight: 900; color: #000;">ON PREMISES</span>
		</div>
		
		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 0 3rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Personnel Count</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.pagination.totalCount} Individuals</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Report Type</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">Live Premises Audit</span>
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
		<thead>
			<tr style="background: #f0f0f0;">
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">#</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Name</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Identity No.</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Category</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Company</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Entry Time</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Duration</th>
			</tr>
		</thead>
		<tbody>
			{#each logs as log, index (log.id)}
				<tr style={index % 2 === 0 ? '' : 'background: #fff;'}>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{index + 1}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{log.person.name}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.person.codeNo || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.category.name}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.person.company || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{format(log.entryTime, 'hh:mm a')}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 700; color: #000;">
						{formatDuration(Math.floor((new Date().getTime() - log.entryTime.getTime()) / 1000))}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div
		style="margin-top: 3rem; padding-top: 1rem; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em;"
	>
		<p>Generated by {i18n.t('appName')} Official Reporting System</p>
		<p>Page 1 of 1</p>
	</div>
</div>

<!-- Loading overlay for print preparation -->
{#if isPreparingPrint}
	<div class="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white">
		<Loader2 class="mb-4 animate-spin text-primary-600" size={48} />
		<h2 class="text-xl font-black text-slate-900">Preparing Entry Log Report...</h2>
		<p class="mt-2 font-bold text-slate-500">Fetching all entries currently inside</p>
	</div>
{/if}

<!-- Screen view -->
{#if !isPrintMode}
<div class="no-print pb-20">
	<!-- Sticky Top Bar for Filters -->
	<div class="sticky-filter-bar px-4 md:px-0">
		<div class="content-container">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<!-- Top Row: Search & Stats -->
				<div class="flex w-full items-center lg:flex-1">
					<div class="group relative flex-1 lg:max-w-md">
						<div
							class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
						>
							<Search size={18} />
						</div>
						<Input
							bind:ref={searchInputEl}
							bind:value={searchQuery}
							oninput={handleSearchInput}
							placeholder={i18n.t('searchPeoplePlaceholder')}
							class="h-11 w-full rounded-2xl border-2 border-slate-300 bg-white pr-10 pl-11 text-sm font-bold shadow-sm transition-all focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/30 lg:h-12 lg:text-base"
						/>
						{#if searchQuery}
							<button
								class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
								onclick={() => {
									searchQuery = '';
									applyFilters();
								}}
							>
								<X size={14} />
							</button>
						{/if}
					</div>
				</div>

				<!-- Actions Row: Buttons -->
				<div
					class="custom-scrollbar flex items-center justify-between gap-2 overflow-x-auto lg:justify-end lg:overflow-visible"
				>
					<!-- Left Side (Mobile View) -->
					<div class="flex items-center gap-2 lg:hidden">
						<Button
							variant="outline"
							size="sm"
							class={cn(
								'h-10 rounded-xl border-2 font-black transition-all',
								showMobileFilters
									? 'border-primary-500 bg-primary-50 text-primary-600'
									: 'border-slate-200'
							)}
							onclick={() => (showMobileFilters = !showMobileFilters)}
						>
							<Filter size={16} class="mr-1.5" />
							Filters
						</Button>

						<!-- Mobile Info Badge Moved Here -->
						<div class="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2">
							<span class="text-[9px] font-black tracking-widest text-slate-400 capitalize"
								>Inside</span
							>
							<span class="text-xs font-black text-primary-700">{data.pagination.totalCount}</span>
						</div>
					</div>

					<!-- Desktop/Standard Actions -->
					<div class="flex items-center gap-2">
						<!-- Desktop Only Stats -->
						<div
							class="mr-2 hidden h-8 items-center gap-2 border-r-2 border-slate-100 pr-4 lg:flex"
						>
							<span class="text-[10px] font-black tracking-widest text-slate-400 capitalize"
								>{i18n.t('entryLog')}</span
							>
							<Badge class="border-primary-200 bg-primary-100 text-xs font-black text-primary-700">
								{data.pagination.totalCount} inside
							</Badge>
						</div>

						<Button
							variant="outline"
							class="h-10 shrink-0 gap-2 rounded-xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 lg:h-12 lg:rounded-2xl lg:px-6"
							onclick={() => goto('/history')}
						>
							<History size={18} />
							<span class="hidden sm:inline">{i18n.t('history')}</span>
						</Button>

						<Button
							variant="outline"
							class="h-10 shrink-0 gap-2 rounded-xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 lg:h-12 lg:rounded-2xl lg:px-6"
							onclick={confirmPrint}
						>
							<Printer size={18} />
							<span class="hidden sm:inline">Print Log</span>
						</Button>

						{#if hasActiveFilters}
							<Button
								variant="ghost"
								class="h-10 shrink-0 gap-2 rounded-xl border-2 border-transparent px-4 font-black text-rose-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 lg:h-12 lg:rounded-2xl lg:px-6"
								onclick={clearFilters}
							>
								<RotateCcw size={18} />
								<span class="hidden sm:inline">Reset</span>
							</Button>
						{/if}
					</div>
				</div>
			</div>

			<!-- Mobile Horizontal Category Scroll -->
			{#if showMobileFilters}
				<div class="mt-4 lg:hidden" transition:slide>
					<div class="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
						<button
							class={cn(
								'shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all',
								selectedCategoryId === ''
									? 'bg-primary-600 text-white shadow-md'
									: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
							)}
							onclick={() => changeCategory('')}
						>
							{i18n.t('all')}
						</button>
						{#each ROOT_CATEGORIES as cat (cat.id)}
							<button
								class={cn(
									'shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all',
									activeRootCategoryId() === cat.id
										? 'bg-primary-600 text-white shadow-md'
										: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
								)}
								onclick={() => changeCategory(cat.id)}
							>
								{i18n.t(cat.slug as any) || cat.name}
							</button>
						{/each}
					</div>

					{#if activeRootCategoryId() && availableSubCategories().length > 0}
						<div class="mt-2 flex gap-2 overflow-x-auto pb-2 pl-2">
							<div class="size-2 shrink-0 self-center rounded-full bg-primary-200"></div>
							{#each availableSubCategories() as subCat (subCat.id)}
								<button
									class={cn(
										'shrink-0 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black transition-all',
										selectedCategoryId === subCat.id
											? 'border-primary-600 bg-primary-50 text-primary-700'
											: 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
									)}
									onclick={() => changeCategory(subCat.id)}
								>
									{i18n.t(subCat.slug as any) || subCat.name}
								</button>
							{/each}
						</div>
					{/if}

					<!-- Mobile Location Toggle -->
					<div class="mt-4 flex gap-4">
						<div class="flex-1 space-y-2">
							<p class="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
								{i18n.t('location')}
							</p>
							<div
								class="flex w-full items-center gap-1 rounded-2xl border-2 border-slate-100 bg-white p-1 shadow-sm"
							>
								<button
									class={cn(
										'flex-1 rounded-xl py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
										selectedLocation === ''
											? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
											: 'text-slate-500 hover:bg-slate-50'
									)}
									onclick={() => changeLocation('')}
								>
									{i18n.t('all')}
								</button>
								<button
									class={cn(
										'flex-1 rounded-xl py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
										selectedLocation === 'yard'
											? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
											: 'text-slate-500 hover:bg-slate-50'
									)}
									onclick={() => changeLocation('yard')}
								>
									Yard
								</button>
								<button
									class={cn(
										'flex-1 rounded-xl py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
										selectedLocation === 'ship'
											? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
											: 'text-slate-500 hover:bg-slate-50'
									)}
									onclick={() => changeLocation('ship')}
								>
									Ship
								</button>
							</div>
						</div>

						<div class="flex-1 space-y-2">
							<p class="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
								Sort By
							</p>
							<div
								class="flex w-full items-center gap-1 rounded-2xl border-2 border-slate-100 bg-white p-1 shadow-sm"
							>
								<button
									class={cn(
										'flex-1 rounded-xl py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
										selectedSort === 'recent'
											? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
											: 'text-slate-500 hover:bg-slate-50'
									)}
									onclick={() => changeSort('recent')}
								>
									Recent
								</button>
								<button
									class={cn(
										'flex-1 rounded-xl py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
										selectedSort === 'duration'
											? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
											: 'text-slate-500 hover:bg-slate-50'
									)}
									onclick={() => changeSort('duration')}
								>
									Inside
								</button>
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="content-container flex flex-col gap-8 px-4 md:px-0 lg:flex-row">
		<!-- Sidebar - Desktop Only -->
		<aside
			class="custom-scrollbar hidden max-h-[calc(100vh-12rem)] w-full shrink-0 self-start space-y-6 overflow-y-auto pr-2 pb-20 lg:sticky lg:top-36 lg:block lg:w-64"
		>
			<!-- Category Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 capitalize">
					{i18n.t('category')}
				</p>
				<div class="flex flex-col gap-1">
					<Button
						variant={selectedCategoryId === '' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							selectedCategoryId === ''
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeCategory('')}
					>
						<div class="flex items-center gap-2">
							{#if selectedCategoryId === ''}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							{i18n.t('all')}
						</div>
					</Button>
					{#each ROOT_CATEGORIES as cat (cat.id)}
						{@const isActive = activeRootCategoryId() === cat.id}
						<div>
							<Button
								variant={isActive ? 'secondary' : 'ghost'}
								class={cn(
									'h-10 w-full cursor-pointer justify-start px-3 font-bold transition-all',
									isActive
										? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
										: 'text-slate-600'
								)}
								onclick={() => changeCategory(cat.id)}
							>
								<div class="flex items-center gap-2">
									{#if isActive}
										<div class="size-1.5 rounded-full bg-primary-600"></div>
									{/if}
									{i18n.t(cat.slug as any) || cat.name}
								</div>
							</Button>

							{#if isActive && availableSubCategories().length > 0}
								<div
									class="mt-1 mb-2 ml-3 border-l-2 border-primary-100 pl-3"
									transition:slide={{ duration: 250, easing: sineInOut }}
								>
									<div class="flex flex-wrap gap-1.5 py-1">
										<button
											class={clsx(
												'touch-feedback cursor-pointer rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-95',
												activeRootCategoryId() === selectedCategoryId
													? 'border-primary-600 bg-primary-600 text-white shadow-sm'
													: 'border-slate-200 bg-white text-slate-600 hover:border-primary-300'
											)}
											onclick={() => changeCategory(activeRootCategoryId())}
										>
											All {activeRootCategoryName()}
										</button>

										{#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
											<button
												class="touch-feedback cursor-pointer rounded-full bg-slate-100 px-3 py-2 text-[11px] font-bold text-slate-600 transition-all active:scale-95 hover:bg-slate-200"
												onclick={() => changeCategory(activeParentCategory()?.id || '')}
											>
												<span class="mr-1 opacity-50">↑</span>
												{activeParentCategory()?.name}
											</button>
										{/if}

										{#each availableSubCategories() as subCat (subCat.id)}
											<button
												class={clsx(
													'touch-feedback cursor-pointer rounded-full border px-3 py-2 text-xs font-bold transition-all active:scale-95',
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

			<!-- Location Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 capitalize">
					{i18n.t('location')}
				</p>
				<div class="flex flex-col gap-1">
					<Button
						variant={selectedLocation === '' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							selectedLocation === ''
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeLocation('')}
					>
						<div class="flex items-center gap-2">
							{#if selectedLocation === ''}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							{i18n.t('all')}
						</div>
					</Button>
					<Button
						variant={selectedLocation === 'yard' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							selectedLocation === 'yard'
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeLocation('yard')}
					>
						<div class="flex items-center gap-2">
							{#if selectedLocation === 'yard'}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							Yard
						</div>
					</Button>
					<Button
						variant={selectedLocation === 'ship' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							selectedLocation === 'ship'
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeLocation('ship')}
					>
						<div class="flex items-center gap-2">
							{#if selectedLocation === 'ship'}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							Ship
						</div>
					</Button>
				</div>
			</div>

			<!-- Sort Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 capitalize">
					Sort By
				</p>
				<div class="flex flex-col gap-1">
					<Button
						variant={selectedSort === 'recent' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							selectedSort === 'recent'
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeSort('recent')}
					>
						<div class="flex items-center gap-2">
							{#if selectedSort === 'recent'}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							Recent (Default)
						</div>
					</Button>
					<Button
						variant={selectedSort === 'duration' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							selectedSort === 'duration'
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeSort('duration')}
					>
						<div class="flex items-center gap-2">
							{#if selectedSort === 'duration'}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							Inside For (Longest)
						</div>
					</Button>
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="space-y-3 rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Summary</p>
				<div class="grid grid-cols-2 gap-3">
					<div class="col-span-2 flex items-center justify-between rounded-lg bg-primary-50 p-2.5">
						<div class="flex items-center gap-2">
							<Users size={16} class="text-primary-600" />
							<span class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('total')}</span>
						</div>
						<span class="text-xl font-black text-primary-700">{data.summary.total}</span>
					</div>
					<div class="rounded-lg border border-blue-100 bg-white p-2">
						<div class="mb-1 flex items-center gap-1.5 text-blue-600">
							<Ship size={12} />
							<span class="text-[9px] font-bold uppercase">Ship</span>
						</div>
						<p class="text-lg font-black text-slate-900">{data.summary.ship}</p>
					</div>
					<div class="rounded-lg border border-amber-100 bg-white p-2">
						<div class="mb-1 flex items-center gap-1.5 text-amber-600">
							<Warehouse size={12} />
							<span class="text-[9px] font-bold uppercase">Yard</span>
						</div>
						<p class="text-lg font-black text-slate-900">{data.summary.yard}</p>
					</div>
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="w-full min-w-0 flex-1">
			<!-- List Area (Infinite Scroll) -->
			<div class="lg:rounded-3xl lg:border-2 lg:border-slate-100 lg:bg-slate-50/30 lg:shadow-inner">
				<div class="relative min-h-full">
					{#if logs.length > 0}
						<div class="flex flex-col gap-3 lg:p-4">
							{#each logs as log (log.id)}
								<Card.Root class="group overflow-hidden border-2 border-slate-100 bg-white transition-all hover:border-primary-200 active:bg-slate-50/50 hover:shadow-md">
									<Card.Content class="p-4 sm:p-5">
										<div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
											<div class="flex min-w-0 flex-1 items-center gap-4">
												<!-- Avatar -->
												<div class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-50 bg-white shadow-sm">
													{#if log.person.photoUrl}
														<img
															src={log.person.thumbUrl || log.person.photoUrl}
															alt={log.person.name}
															class="size-full object-cover"
															loading="lazy"
														/>
													{:else}
														<div class="flex size-full items-center justify-center bg-slate-100 text-sm font-black text-slate-400">
															{log.person.name.trim().split(/\s+/).slice(0, 2).map((n: string) => [...n][0]).join('')}
														</div>
													{/if}
												</div>

												<!-- Primary Info -->
												<div class="min-w-0 flex-1">
													<div class="flex items-center gap-2">
														<a href="/people/{log.person.id}" class="truncate text-lg font-black text-slate-900 transition-colors hover:text-primary-600">
															{log.person.name}
														</a>
														{#if log.verifyMethod}
															<div
																class={cn(
																	'flex size-7 shrink-0 items-center justify-center rounded-full border shadow-sm',
																	log.verifyMethod === 'face'
																		? 'border-indigo-100 bg-indigo-50 text-indigo-600'
																		: log.verifyMethod === 'finger'
																			? 'border-emerald-100 bg-emerald-50 text-emerald-600'
																			: log.verifyMethod === 'card'
																				? 'border-amber-100 bg-amber-50 text-amber-600'
																				: 'border-slate-100 bg-slate-50 text-slate-500'
																)}
																title={log.verifyMethod}
															>
																{#if log.verifyMethod === 'face'}
																	<ScanFace size={14} />
																{:else if log.verifyMethod === 'finger'}
																	<Fingerprint size={14} />
																{:else if log.verifyMethod === 'card'}
																	<IdCard size={14} />
																{:else}
																	<PenTool size={14} />
																{/if}
															</div>
														{/if}
													</div>
													<div class="mt-1.5 flex flex-wrap gap-1.5">
														{#each getCategoryPath(log.person.categoryId).slice(-2) as cat (cat.id)}
															<Badge
																variant="outline"
																class={cn(
																	'h-5 px-1.5 text-[10px] font-black tracking-wider uppercase',
																	getCategoryBadgeClass(cat.slug)
																)}
															>
																{i18n.t(cat.slug as any) || cat.name}
															</Badge>
														{/each}
													</div>
												</div>
											</div>

											<!-- Metrics & Actions -->
											<div class="flex flex-wrap items-center gap-6 border-t border-slate-50 pt-4 sm:border-none sm:pt-0 md:gap-8 lg:gap-12">
												<!-- Duration -->
												<div class="space-y-0.5">
													<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Inside For</p>
													<div class="flex items-center gap-1.5 text-sm font-black text-emerald-600">
														<Clock size={16} />
														<span>{formatDuration(log.durationSeconds)}</span>
													</div>
												</div>

												<!-- Location Toggle -->
												<div class="space-y-1">
													<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
														{i18n.t('location')}
													</p>
													<div class="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
														<form method="POST" action="?/updatePurpose" use:enhance>
															<input type="hidden" name="logId" value={log.id} />
															<input type="hidden" name="purpose" value={log.purpose || ''} />
															<input type="hidden" name="location" value="ship" />
															<button
																type="submit"
																class={cn(
																	'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black transition-all',
																	log.location === 'ship'
																		? 'bg-blue-600 text-white shadow-sm'
																		: 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
																)}
															>
																<Ship size={12} />
																SHIP
															</button>
														</form>
														<form method="POST" action="?/updatePurpose" use:enhance>
															<input type="hidden" name="logId" value={log.id} />
															<input type="hidden" name="purpose" value={log.purpose || ''} />
															<input type="hidden" name="location" value="yard" />
															<button
																type="submit"
																class={cn(
																	'flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-black transition-all',
																	log.location === 'yard'
																		? 'bg-amber-600 text-white shadow-sm'
																		: 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
																)}
															>
																<Warehouse size={12} />
																YARD
															</button>
														</form>
													</div>
												</div>

												<!-- Entry Time -->
												<div class="space-y-0.5">
													<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('entryTime')}</p>
													<div class="flex items-center gap-1.5 text-sm font-black text-slate-500">
														<Clock size={16} class="opacity-50" />
														<span>{format(log.entryTime, 'hh:mm a')}</span>
													</div>
												</div>

												<!-- Actions -->
												{#if data.user?.permissions.includes('people.create')}
													<form method="POST" action="?/checkOut" use:enhance class="ml-auto sm:ml-0">
														<input type="hidden" name="logId" value={log.id} />
														<Button
															type="button"
															variant="outline"
															class="h-12 min-w-[120px] gap-2 border-2 border-rose-100 px-6 font-black text-rose-600 transition-all active:scale-95 hover:bg-rose-50 hover:text-rose-700"
															onclick={(e) => triggerCheckOut((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
														>
															<CheckCircle2 size={20} />
															<span>{i18n.t('checkOut')}</span>
														</Button>
													</form>
												{/if}
											</div>
										</div>
									</Card.Content>
								</Card.Root>
							{/each}

							<!-- Sentinel for Infinite Scroll -->
							<div bind:this={sentinel} class="h-8 w-full">
								{#if isLoadingMore}
									<div class="flex justify-center p-2">
										<Loader2 class="animate-spin text-primary-600" size={24} />
									</div>
								{/if}
							</div>
						</div>
					{:else}
						<div
							class="flex h-full flex-col items-center justify-center space-y-6 rounded-3xl py-24 text-center"
						>
							<div
								class="flex size-16 items-center justify-center mx-auto rounded-full bg-slate-100 text-slate-300 md:size-24"
							>
								<Users size={48} />
							</div>
							<div class="space-y-2 px-6">
								<p class="text-lg font-black text-slate-600 md:text-xl">{i18n.t('noResults')}</p>
								<p
									class="text-[10px] font-bold tracking-widest text-slate-400 uppercase md:text-sm"
								>
									No one currently on premises matches your criteria
								</p>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</main>
	</div>

	<!-- Floating Action Buttons -->
	{#if data.user?.permissions.includes('people.create')}
		<div class="fixed right-5 bottom-6 z-40 flex flex-col items-end gap-3 sm:right-8 sm:bottom-8">
			<Button
				variant="outline"
				class="h-12 cursor-pointer gap-2.5 rounded-full border border-slate-200 bg-white/95 px-5 text-xs font-bold text-slate-600 shadow-lg backdrop-blur-sm transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-xl active:scale-[0.97] md:h-14 md:px-6 md:text-sm"
				onclick={() => (isRegisterOpen = true)}
			>
				<PlusCircle size={18} />
				{i18n.t('register')}
			</Button>

			<Button
				variant="default"
				class="h-12 cursor-pointer gap-2.5 rounded-full bg-primary-600 px-5 text-xs font-bold text-white shadow-lg shadow-primary-600/25 transition-all duration-200 hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-600/30 active:scale-[0.97] md:h-14 md:px-6 md:text-sm"
				onclick={() => (isCheckInOpen = true)}
			>
				<PlayCircle size={18} />
				{i18n.t('checkIn')}
			</Button>
		</div>
	{/if}
</div>
{/if}

<CheckInDialog bind:open={isCheckInOpen} />
<RegisterDialog bind:open={isRegisterOpen} />

<ConfirmModal
	bind:open={isPrintConfirmOpen}
	title="Large Report Warning"
	message="This report contains {data.pagination
		.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
	confirmText="Print Anyway"
	cancelText="Cancel"
	variant="warning"
	onconfirm={printEntryLog}
/>

<ConfirmModal
	bind:open={confirmCheckOutOpen}
	title="Confirm Check-Out"
	message="Are you sure you want to check out this person?"
	confirmText="Confirm"
	onconfirm={() => checkOutFormElement?.requestSubmit()}
/>
