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
	import PrintHeader from '$lib/components/PrintHeader.svelte';
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
	import { onMount, untrack, tick } from 'svelte';

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
	let selectedDepartment = $state('');
	let selectedSort = $state<'recent' | 'duration'>('recent');

	// Initialize state from data prop once
	$effect.pre(() => {
		untrack(() => {
			if (!searchQuery && data.filters.query) searchQuery = data.filters.query;
			if (!selectedCategoryId && data.filters.categoryId) selectedCategoryId = data.filters.categoryId;
			if (!selectedLocation && data.filters.location) selectedLocation = data.filters.location;
			if (!selectedDepartment && data.filters.department) selectedDepartment = data.filters.department;
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
	const printTh = "border: 1px solid #cbd5e1; padding: 6px 4px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; font-size: 8px; vertical-align: bottom;";
	const printTd = "border: 1px solid #e2e8f0; padding: 5px 4px; color: #475569; vertical-align: top;";

	$effect(() => {
		if (isPrintMode) {
			isPreparingPrint = true;
			tick().then(() => {
				window.print();
				isPreparingPrint = false;
				const url = new URL(page.url);
				url.searchParams.delete('print');
				url.searchParams.delete('limit');
				goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
			});
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
				const existingIds = new Set(logs.map((l) => l.id));
			logs = [...logs, ...newLogs.filter((l: any) => !existingIds.has(l.id))];
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

		if (selectedDepartment) url.searchParams.set('department', selectedDepartment);
		else url.searchParams.delete('department');

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

	function changeDepartment(dept: string) {
		selectedDepartment = dept;
		applyFilters();
	}

	function changeSort(s: 'recent' | 'duration') {
		selectedSort = s;
		applyFilters();
	}

	const hasActiveFilters = $derived(!!searchQuery || !!selectedCategoryId || !!selectedLocation || !!selectedDepartment || selectedSort !== 'recent');

	function clearFilters() {
		searchQuery = '';
		selectedCategoryId = '';
		selectedLocation = '';
		selectedDepartment = '';
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
		goto(url.toString(), { noScroll: true });
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
	<PrintHeader title="Entry History Report" />

	<div style="display: flex !important; gap: 2rem; margin-bottom: 1rem; font-size: 11px; font-weight: 900; color: #334155;">
		<span>Status: <span style="color: #1c55a4;">On Premises</span></span>
		<span>Personnel Count: <span style="color: #1c55a4;">{data.pagination.totalCount}</span></span>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 9px; font-family: inherit; table-layout: fixed;">
		<colgroup>
			<col style="width: 3%" />   <!-- # -->
			<col style="width: 18%" />  <!-- Name -->
			<col style="width: 8%" />   <!-- ID -->
			<col style="width: 10%" />  <!-- Category -->
			<col style="width: 12%" />  <!-- Dept -->
			<col style="width: 14%" />  <!-- Designation -->
			<col style="width: 5%" />   <!-- Trained -->
			<col style="width: 10%" />  <!-- Entry -->
			<col style="width: 8%" />   <!-- Duration -->
		</colgroup>
		<thead>
			<tr style="background: #f0f0f0;">
				<th style={printTh}>#</th>
				<th style={printTh}>Name</th>
				<th style={printTh}>ID</th>
				<th style={printTh}>Cat.</th>
				<th style={printTh}>Dept.</th>
				<th style={printTh}>Designation</th>
				<th style={printTh}>Trnd</th>
				<th style={printTh}>Entry</th>
				<th style={printTh}>Dur.</th>
			</tr>
		</thead>
		<tbody>
			{#each logs as log, index (log.id)}
				<tr style={index % 2 === 0 ? 'background: #f8fafc;' : 'background: #fff;'}>
					<td style="{printTd} color: #94a3b8;">{index + 1}</td>
					<td style="{printTd} font-weight: 800; color: #0f172a;">{log.person.name}</td>
					<td style={printTd}>{log.person.codeNo || '-'}</td>
					<td style={printTd}>{log.category.name}</td>
					<td style={printTd}>{log.person.department || '-'}</td>
					<td style={printTd}>{log.person.designation || '-'}</td>
					<td style="{printTd} font-weight: 800; color: {log.person.isTrained ? '#059669' : '#e11d48'}; text-align: center;">{log.person.isTrained ? 'Yes' : 'No'}</td>
					<td style="{printTd} color: #64748b; white-space: nowrap;">{format(log.entryTime, 'hh:mm a')}</td>
					<td style="{printTd} font-weight: 700; color: #000; white-space: nowrap;">
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
		<h2 class="text-xl font-black text-slate-900">Preparing Entry History Report…</h2>
		<p class="mt-2 font-bold text-slate-500">Fetching all entries currently inside</p>
	</div>
{/if}

<!-- Screen view -->
{#if !isPrintMode}
<div class="no-print pb-20">
	<!-- Mobile Top Bar -->
	<div class="sticky-filter-bar px-4 md:px-0 lg:hidden">
		<div class="content-container space-y-3">
			<!-- Row 1: Search + Actions -->
			<div class="flex items-center gap-2">
				<div class="group relative min-w-0 flex-1">
					<div class="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500">
						<Search size={17} />
					</div>
					<Input
						bind:ref={searchInputEl}
						bind:value={searchQuery}
						oninput={handleSearchInput}
						placeholder={i18n.t('searchPeoplePlaceholder')}
						class="h-10 w-full rounded-xl border-2 border-slate-300 bg-white pr-9 pl-10 text-sm font-bold shadow-sm transition-all placeholder:truncate focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/20"
					/>
					{#if searchQuery}
						<button
							class="btn-pressable absolute top-1/2 right-2.5 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-600"
							onclick={() => { searchQuery = ''; applyFilters(); }}
						>
							<X size={14} />
						</button>
					{/if}
				</div>
				<button
					class={cn(
						'btn-pressable flex size-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
						showMobileFilters
							? 'border-primary-500 bg-primary-50 text-primary-600'
							: 'border-slate-200 bg-white text-slate-400'
					)}
					onclick={() => (showMobileFilters = !showMobileFilters)}
					aria-label="Toggle filters"
				>
					<Filter size={16} />
				</button>
				<button
					class={cn(
						'btn-pressable flex size-10 shrink-0 items-center justify-center rounded-xl border-2 transition-all',
						hasActiveFilters
							? 'border-rose-200 bg-rose-50 text-rose-500'
							: 'border-slate-100 bg-slate-50 text-slate-300'
					)}
					disabled={!hasActiveFilters}
					onclick={clearFilters}
					aria-label="Clear filters"
				>
					<RotateCcw size={14} />
				</button>
				<a href="/history" class="btn-pressable flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-primary-600 transition-all" aria-label="History">
					<History size={16} />
				</a>
			</div>

			<!-- Row 2: Location quick-toggle (always visible) -->
			<div class="flex items-center gap-2">
				<div class="flex flex-1 items-center gap-0.5 rounded-xl border-2 border-slate-100 bg-white p-0.5">
					<button
						class={cn(
							'chip-pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-black tracking-wider uppercase transition-all',
							selectedLocation === ''
								? 'bg-slate-800 text-white shadow-sm'
								: 'text-slate-400'
						)}
						onclick={() => changeLocation('')}
					>
						<MapPin size={11} />
						{i18n.t('all')}
						<span class={cn('tabular-nums', selectedLocation === '' ? 'text-white/70' : 'text-slate-300')}>{data.summary.total}</span>
					</button>
					<button
						class={cn(
							'chip-pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-black tracking-wider uppercase transition-all',
							selectedLocation === 'yard'
								? 'bg-amber-600 text-white shadow-sm'
								: 'text-slate-400'
						)}
						onclick={() => changeLocation('yard')}
					>
						<Warehouse size={11} />
						Yard
						<span class={cn('tabular-nums', selectedLocation === 'yard' ? 'text-white/70' : 'text-slate-300')}>{data.summary.yard}</span>
					</button>
					<button
						class={cn(
							'chip-pressable flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-black tracking-wider uppercase transition-all',
							selectedLocation === 'ship'
								? 'bg-blue-600 text-white shadow-sm'
								: 'text-slate-400'
						)}
						onclick={() => changeLocation('ship')}
					>
						<Ship size={11} />
						Ship
						<span class={cn('tabular-nums', selectedLocation === 'ship' ? 'text-white/70' : 'text-slate-300')}>{data.summary.ship}</span>
					</button>
				</div>
			</div>

			<!-- Expandable: Categories, Department, Sort -->
			{#if showMobileFilters}
				<div class="lg:hidden" transition:slide={{ duration: 200, easing: sineInOut }}>
					<!-- Categories -->
					<div class="custom-scrollbar flex gap-1.5 overflow-x-auto pb-2">
						<button
							class={cn(
								'chip-pressable shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition-all',
								selectedCategoryId === ''
									? 'bg-primary-600 text-white shadow-sm'
									: 'bg-slate-100 text-slate-500'
							)}
							onclick={() => changeCategory('')}
						>
							{i18n.t('all')}
						</button>
						{#each ROOT_CATEGORIES as cat (cat.id)}
							<button
								class={cn(
									'chip-pressable shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition-all',
									activeRootCategoryId() === cat.id
										? 'bg-primary-600 text-white shadow-sm'
										: 'bg-slate-100 text-slate-500'
								)}
								onclick={() => changeCategory(cat.id)}
							>
								{i18n.t(cat.slug as any) || cat.name}
							</button>
						{/each}
					</div>

					{#if activeRootCategoryId() && availableSubCategories().length > 0}
						<div class="custom-scrollbar mt-1.5 flex gap-1.5 overflow-x-auto pb-2 pl-2">
							<div class="size-1.5 shrink-0 self-center rounded-full bg-primary-300"></div>
							{#each availableSubCategories() as subCat (subCat.id)}
								<button
									class={cn(
										'chip-pressable shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-bold transition-all',
										selectedCategoryId === subCat.id
											? 'border-primary-500 bg-primary-50 text-primary-700'
											: 'border-slate-200 bg-white text-slate-500'
									)}
									onclick={() => changeCategory(subCat.id)}
								>
									{i18n.t(subCat.slug as any) || subCat.name}
								</button>
							{/each}
						</div>
					{/if}

					{#if activeRootCategoryId() === 'employee' && data.departments.length > 0}
						<div class="mt-3 space-y-1.5">
							<p class="ml-0.5 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
								Department
							</p>
							<div class="custom-scrollbar flex gap-1.5 overflow-x-auto pb-2">
								<button
									class={cn(
										'chip-pressable shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-bold transition-all',
										!selectedDepartment
											? 'border-primary-500 bg-primary-50 text-primary-700'
											: 'border-slate-200 bg-white text-slate-500'
									)}
									onclick={() => changeDepartment('')}
								>
									All Depts
								</button>
								{#each data.departments as dept}
									<button
										class={cn(
											'chip-pressable shrink-0 rounded-md border px-2.5 py-1 text-[10px] font-bold transition-all',
											selectedDepartment === dept
												? 'border-primary-500 bg-primary-50 text-primary-700'
												: 'border-slate-200 bg-white text-slate-500'
										)}
										onclick={() => changeDepartment(dept)}
									>
										{dept}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Sort -->
					<div class="mt-3 flex items-center gap-2 pb-1">
						<span class="text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">Sort</span>
						<div class="flex gap-0.5 rounded-lg border border-slate-100 bg-slate-50 p-0.5">
							<button
								class={cn(
									'chip-pressable rounded-md px-3 py-1 text-[10px] font-black uppercase transition-all',
									selectedSort === 'recent'
										? 'bg-white text-slate-700 shadow-sm'
										: 'text-slate-400'
								)}
								onclick={() => changeSort('recent')}
							>
								Recent
							</button>
							<button
								class={cn(
									'chip-pressable rounded-md px-3 py-1 text-[10px] font-black uppercase transition-all',
									selectedSort === 'duration'
										? 'bg-white text-slate-700 shadow-sm'
										: 'text-slate-400'
								)}
								onclick={() => changeSort('duration')}
							>
								Duration
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<div class="content-container flex flex-col gap-8 px-4 md:px-0 lg:flex-row">
		<!-- Sidebar - Desktop Only -->
		<aside
			class="custom-scrollbar hidden w-64 shrink-0 self-start overflow-y-auto lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)]"
		>
			<div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
				<!-- Live Status Header -->
				<div class="relative border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 px-4 py-4">
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(28,85,164,0.3),transparent_60%)]"></div>
					<div class="relative flex items-center justify-between">
						<div>
							<div class="flex items-center gap-2">
								<div class="relative flex size-2">
									<span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
									<span class="relative inline-flex size-2 rounded-full bg-emerald-400"></span>
								</div>
								<span class="text-[9px] font-black tracking-[0.2em] text-emerald-300/90 uppercase">On Premises</span>
							</div>
							<p class="mt-1.5 text-3xl font-black tabular-nums tracking-tight text-white">{data.summary.total}</p>
						</div>
						<div class="flex flex-col items-end gap-1">
							<div class="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 backdrop-blur-sm">
								<Warehouse size={10} class="text-amber-300" />
								<span class="text-[10px] font-black tabular-nums text-amber-200">{data.summary.yard}</span>
							</div>
							<div class="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 backdrop-blur-sm">
								<Ship size={10} class="text-sky-300" />
								<span class="text-[10px] font-black tabular-nums text-sky-200">{data.summary.ship}</span>
							</div>
						</div>
					</div>
				</div>

				<div class="p-3">
					<!-- Category Filter -->
					<div class="space-y-1.5">
						<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
							{i18n.t('category')}
						</p>
						<div class="flex flex-col gap-0.5">
							<Button
								variant={selectedCategoryId === '' ? 'secondary' : 'ghost'}
								class={cn(
									'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
									selectedCategoryId === ''
										? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
										: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
								)}
								onclick={() => changeCategory('')}
							>
								{i18n.t('all')}
							</Button>
							{#each ROOT_CATEGORIES as cat (cat.id)}
								{@const isActive = activeRootCategoryId() === cat.id}
								<div>
									<Button
										variant={isActive ? 'secondary' : 'ghost'}
										class={cn(
											'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
											isActive
												? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
												: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
										)}
										onclick={() => changeCategory(cat.id)}
									>
										{i18n.t(cat.slug as any) || cat.name}
									</Button>

									{#if isActive && availableSubCategories().length > 0}
										<div
											class="mt-1 mb-1.5 ml-3 border-l-2 border-primary-100 pl-2.5"
											transition:slide={{ duration: 250, easing: sineInOut }}
										>
											<div class="flex flex-wrap gap-1 py-0.5">
												<button
													class={clsx(
														'touch-feedback cursor-pointer rounded-md border px-2 py-1 text-[11px] font-bold transition-all active:scale-95',
														activeRootCategoryId() === selectedCategoryId
															? 'border-primary-500 bg-primary-600 text-white shadow-sm'
															: 'border-slate-200 bg-slate-50 text-slate-500 hover:border-primary-200 hover:text-primary-600'
													)}
													onclick={() => changeCategory(activeRootCategoryId())}
												>
													All {activeRootCategoryName()}
												</button>

												{#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
													<button
														class="touch-feedback cursor-pointer rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 transition-all active:scale-95 hover:bg-slate-200"
														onclick={() => changeCategory(activeParentCategory()?.id || '')}
													>
														<span class="mr-0.5 opacity-40">↑</span>
														{activeParentCategory()?.name}
													</button>
												{/if}

												{#each availableSubCategories() as subCat (subCat.id)}
													<button
														class={clsx(
															'touch-feedback cursor-pointer rounded-md border px-2 py-1 text-[11px] font-bold transition-all active:scale-95',
															selectedCategoryId === subCat.id
																? 'border-primary-500 bg-primary-600 text-white shadow-sm'
																: 'border-slate-200 bg-slate-50 text-slate-500 hover:border-primary-200 hover:text-primary-600'
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

					<!-- Department Filter (Only for Employees) -->
					{#if activeRootCategoryId() === 'employee'}
						<div class="mt-4 space-y-1.5 border-t border-slate-100 pt-3" transition:slide>
							<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
								Department
							</p>
							<div class="flex flex-col gap-0.5">
								<Button
									variant={!selectedDepartment ? 'secondary' : 'ghost'}
									class={cn(
										'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
										!selectedDepartment
											? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
											: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
									)}
									onclick={() => changeDepartment('')}
								>
									All Departments
								</Button>
								{#each data.departments as dept}
									<Button
										variant={selectedDepartment === dept ? 'secondary' : 'ghost'}
										class={cn(
											'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all text-left',
											selectedDepartment === dept
												? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
												: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
										)}
										onclick={() => changeDepartment(dept)}
									>
										<span class="truncate">{dept}</span>
									</Button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Location Filter -->
					<div class="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
						<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
							{i18n.t('location')}
						</p>
						<div class="flex gap-1.5">
							<button
								class={cn(
									'chip-pressable flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 transition-all',
									selectedLocation === ''
										? 'border-primary-500 bg-primary-50 shadow-sm'
										: 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
								)}
								onclick={() => changeLocation('')}
							>
								<MapPin size={14} class={selectedLocation === '' ? 'text-primary-600' : 'text-slate-400'} />
								<span class={cn('text-[10px] font-black tracking-wider uppercase', selectedLocation === '' ? 'text-primary-700' : 'text-slate-500')}>{i18n.t('all')}</span>
								<span class={cn('text-sm font-black tabular-nums', selectedLocation === '' ? 'text-primary-600' : 'text-slate-400')}>{data.summary.total}</span>
							</button>
							<button
								class={cn(
									'chip-pressable flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 transition-all',
									selectedLocation === 'yard'
										? 'border-amber-400 bg-amber-50 shadow-sm'
										: 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
								)}
								onclick={() => changeLocation('yard')}
							>
								<Warehouse size={14} class={selectedLocation === 'yard' ? 'text-amber-600' : 'text-slate-400'} />
								<span class={cn('text-[10px] font-black tracking-wider uppercase', selectedLocation === 'yard' ? 'text-amber-700' : 'text-slate-500')}>Yard</span>
								<span class={cn('text-sm font-black tabular-nums', selectedLocation === 'yard' ? 'text-amber-600' : 'text-slate-400')}>{data.summary.yard}</span>
							</button>
							<button
								class={cn(
									'chip-pressable flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 transition-all',
									selectedLocation === 'ship'
										? 'border-sky-400 bg-sky-50 shadow-sm'
										: 'border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-slate-50'
								)}
								onclick={() => changeLocation('ship')}
							>
								<Ship size={14} class={selectedLocation === 'ship' ? 'text-sky-600' : 'text-slate-400'} />
								<span class={cn('text-[10px] font-black tracking-wider uppercase', selectedLocation === 'ship' ? 'text-sky-700' : 'text-slate-500')}>Ship</span>
								<span class={cn('text-sm font-black tabular-nums', selectedLocation === 'ship' ? 'text-sky-600' : 'text-slate-400')}>{data.summary.ship}</span>
							</button>
						</div>
					</div>

					<!-- Sort Filter -->
					<div class="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
						<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
							Sort By
						</p>
						<div class="flex gap-1.5 rounded-xl border border-slate-100 bg-slate-50/50 p-1">
							<button
								class={cn(
									'chip-pressable flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-black tracking-wide uppercase transition-all',
									selectedSort === 'recent'
										? 'bg-white text-slate-800 shadow-sm'
										: 'text-slate-400 hover:text-slate-600'
								)}
								onclick={() => changeSort('recent')}
							>
								Recent
							</button>
							<button
								class={cn(
									'chip-pressable flex-1 cursor-pointer rounded-lg px-3 py-1.5 text-[11px] font-black tracking-wide uppercase transition-all',
									selectedSort === 'duration'
										? 'bg-white text-slate-800 shadow-sm'
										: 'text-slate-400 hover:text-slate-600'
								)}
								onclick={() => changeSort('duration')}
							>
								Duration
							</button>
						</div>
					</div>
				</div>

				<!-- Sidebar Branding -->
				<div
					class="flex items-center justify-center gap-1.5 border-t border-slate-100 px-4 py-2.5 opacity-30 transition-opacity hover:opacity-70"
				>
					<p class="text-[7px] font-black tracking-[0.2em] text-slate-400 uppercase">Built by</p>
					<a
						href="https://autolinium.com"
						target="_blank"
						rel="noopener noreferrer"
						class="text-[8px] font-black tracking-[0.15em] text-slate-500 transition-colors hover:text-primary-600 uppercase"
					>Autolinium</a>
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="w-full min-w-0 flex-1">
			<!-- List Area with integrated toolbar -->
			<div class="lg:overflow-hidden lg:rounded-2xl lg:border lg:border-slate-200/80 lg:bg-white lg:shadow-sm">
				<!-- Integrated Desktop Toolbar -->
				<div class="hidden items-center gap-2.5 border-b border-slate-200 bg-slate-50/80 px-4 py-3 lg:flex">
					<div class="group relative min-w-0 flex-1">
						<div class="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500">
							<Search size={17} />
						</div>
						<Input
							bind:value={searchQuery}
							oninput={handleSearchInput}
							placeholder={i18n.t('searchPeoplePlaceholder')}
							class="h-11 w-full rounded-xl border-2 border-slate-300 bg-white pr-9 pl-10 text-sm font-bold shadow-sm transition-all placeholder:truncate focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/20"
						/>
						{#if searchQuery}
							<button
								class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600"
								aria-label="Clear search"
								onclick={() => { searchQuery = ''; applyFilters(); }}
							>
								<X size={14} />
							</button>
						{/if}
					</div>
					<button
						class={cn(
							'flex shrink-0 items-center gap-1.5 rounded-xl border-2 px-3 py-2 text-[11px] font-black transition-all',
							hasActiveFilters
								? 'cursor-pointer border-rose-200 bg-rose-50 text-rose-500 hover:border-rose-300 hover:bg-rose-100 active:scale-95'
								: 'cursor-default border-slate-100 bg-slate-50 text-slate-300'
						)}
						aria-label="Reset filters"
						disabled={!hasActiveFilters}
						onclick={clearFilters}
					>
						<RotateCcw size={12} />
						Clear
					</button>
					<div class="mx-0.5 h-6 w-px bg-slate-200"></div>
					<Button variant="ghost" size="sm" class="h-9 gap-1.5 rounded-xl px-3 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700" href="/history">
						<History size={15} />
						{i18n.t('history')}
					</Button>
					<Button variant="ghost" size="icon" class="size-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Print log" onclick={confirmPrint}>
						<Printer size={15} />
					</Button>
				</div>

				<div class="relative min-h-full lg:bg-slate-100/50">
					{#if logs.length > 0}
						<div class="flex flex-col gap-2.5 lg:p-3">
							{#each logs as log (log.id)}
								<Card.Root class="card-pressable overflow-hidden border border-slate-200/80 bg-white shadow-sm">
									<Card.Content class="relative p-4">
										<!-- Mobile Checkout: top-right icon -->
										{#if data.user?.permissions.includes('people.create')}
											<form method="POST" action="?/checkOut" use:enhance class="absolute top-3 right-3 lg:hidden">
												<input type="hidden" name="logId" value={log.id} />
												<button
													type="button"
													class="btn-pressable flex size-8 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-500 transition-all hover:bg-rose-100"
													onclick={(e) => triggerCheckOut((e.currentTarget as HTMLButtonElement).closest('form') as HTMLFormElement)}
													aria-label={i18n.t('checkOut')}
												>
													<CheckCircle2 size={14} />
												</button>
											</form>
										{/if}

										<div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
											<div class="flex min-w-0 flex-1 items-center gap-3 pr-10 lg:pr-0">
												<!-- Avatar -->
												<div class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-100 bg-white shadow-sm">
													{#if log.person.photoUrl}
														<img
															src={log.person.thumbUrl || log.person.photoUrl}
															alt={log.person.name}
															class="size-full object-cover"
															loading="lazy"
														/>
													{:else}
														<div class="flex size-full items-center justify-center bg-slate-100 text-xs font-black text-slate-400">
															{log.person.name.trim().split(/\s+/).slice(0, 2).map((n: string) => [...n][0]).join('')}
														</div>
													{/if}
												</div>

												<!-- Primary Info -->
												<div class="min-w-0 flex-1">
													<div class="flex flex-wrap items-center gap-x-2 gap-y-1">
														<a href="/people/{log.person.id}" class="touch-feedback text-[15px] font-black text-slate-900 transition-colors hover:text-primary-600">
															{log.person.name}
														</a>
														{#if log.person.codeNo}
															<span class="text-[10px] font-bold text-slate-400">#{log.person.codeNo}</span>
														{/if}
														{#if log.verifyMethod}
															<div class={cn(
																'flex size-5 items-center justify-center rounded-full',
																log.verifyMethod === 'face' ? 'text-indigo-500'
																	: log.verifyMethod === 'finger' ? 'text-emerald-500'
																	: log.verifyMethod === 'card' ? 'text-amber-500'
																	: 'text-slate-400'
															)} title={log.verifyMethod}>
																{#if log.verifyMethod === 'face'}<ScanFace size={12} />
																{:else if log.verifyMethod === 'finger'}<Fingerprint size={12} />
																{:else if log.verifyMethod === 'card'}<IdCard size={12} />
																{:else}<PenTool size={12} />
																{/if}
															</div>
														{/if}
													</div>
													<div class="mt-1 flex flex-wrap items-center gap-1.5">
														{#if getCategoryPath(log.person.categoryId).at(-1)}
															{@const category = getCategoryPath(log.person.categoryId).at(-1)}
															<Badge variant="outline" class={cn('h-4 px-1 text-[9px] font-bold tracking-wider uppercase', getCategoryBadgeClass(category!.slug))}>
																{i18n.t(category!.slug as any) || category!.name}
															</Badge>
														{/if}
														{#if log.person.department}
															<Badge variant="outline" class="h-4 border-blue-200 bg-blue-50 px-1 text-[9px] font-black tracking-widest text-blue-700 uppercase">
																{log.person.department}
															</Badge>
														{/if}
													</div>
												</div>
											</div>

											<!-- Metrics & Checkout -->
											<div class="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-t border-slate-100 pt-3 lg:justify-start lg:border-none lg:pt-0">
												<!-- Duration -->
												<div class="flex items-center gap-1.5 text-sm font-black text-emerald-600">
													<Clock size={14} />
													<span>{formatDuration(log.durationSeconds)}</span>
												</div>

												<!-- Location Toggle -->
												<div class="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 w-fit">
													<form method="POST" action="?/updatePurpose" use:enhance>
														<input type="hidden" name="logId" value={log.id} />
														<input type="hidden" name="purpose" value={log.purpose || ''} />
														<input type="hidden" name="location" value="ship" />
														<button type="submit" class={cn(
															'btn-pressable flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition-all',
															log.location === 'ship' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
														)}>
															<Ship size={12} />
														</button>
													</form>
													<form method="POST" action="?/updatePurpose" use:enhance>
														<input type="hidden" name="logId" value={log.id} />
														<input type="hidden" name="purpose" value={log.purpose || ''} />
														<input type="hidden" name="location" value="yard" />
														<button type="submit" class={cn(
															'btn-pressable flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-black transition-all',
															log.location === 'yard' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
														)}>
															<Warehouse size={12} />
														</button>
													</form>
												</div>

												<!-- Entry Time -->
												<span class="text-sm font-bold tabular-nums text-slate-500">{format(log.entryTime, 'hh:mm a')}</span>

												<!-- Desktop Checkout -->
												{#if data.user?.permissions.includes('people.create')}
													<form method="POST" action="?/checkOut" use:enhance class="ml-auto hidden lg:block">
														<input type="hidden" name="logId" value={log.id} />
														<Button
															type="button"
															variant="outline"
															class="btn-pressable h-9 gap-1.5 border-2 border-rose-200 px-3 text-[11px] font-black text-rose-600 hover:bg-rose-50"
															onclick={(e) => triggerCheckOut((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
														>
															<CheckCircle2 size={14} />
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
		<div class="fixed right-5 bottom-6 z-40 flex flex-col items-end gap-3 pb-[env(safe-area-inset-bottom)] sm:right-8 sm:bottom-8">
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
