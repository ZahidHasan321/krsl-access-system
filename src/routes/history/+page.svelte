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
	import PrintHeader from '$lib/components/PrintHeader.svelte';
	import { clsx } from 'clsx';
	import { cn, getCategoryBadgeClass, statusBadgeClasses } from '$lib/utils';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { fade, slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import { untrack, tick } from 'svelte';
	import { format, parseISO } from 'date-fns';

	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let startDate = $state('');
	let endDate = $state('');

	// Sync dates from server on every navigation (data.filters always has resolved defaults)
	$effect.pre(() => {
		const { startDate: s, endDate: e, query: q } = data.filters;
		untrack(() => {
			startDate = s;
			endDate = e;
			if (!searchQuery && q) searchQuery = q;
		});
	});
	let isPreparingPrint = $state(false);
	let previousLimit = $state(20);

	let isPrintConfirmOpen = $state(false);
	let showMobileFilters = $state(false);
	let isPrintMode = $derived(page.url.searchParams.has('print'));

	$effect(() => {
		if (isPrintMode) {
			isPreparingPrint = true;
			tick().then(() => {
				window.print();
				isPreparingPrint = false;
				if (window.opener === null) {
					const url = new URL(page.url);
					url.searchParams.delete('print');
					goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
				}
			});
		}
	});

	let debounceTimer: any;

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 400);
	}

	const selectedCategoryId = $derived(page.url.searchParams.get('category') || '');
	const selectedDepartment = $derived(page.url.searchParams.get('department') || '');

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
		// Always keep explicit dates in the URL so filtering is shareable.
		// If one date is cleared, mirror the other (single-day view).
		const effectiveStart = startDate || endDate || data.filters.startDate;
		const effectiveEnd = endDate || startDate || data.filters.endDate;
		url.searchParams.set('startDate', effectiveStart);
		url.searchParams.set('endDate', effectiveEnd);
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
		const url = new URL(page.url);
		url.searchParams.delete('q');
		// Remove dates so server re-applies its defaults (last 30 days)
		url.searchParams.delete('startDate');
		url.searchParams.delete('endDate');
		url.searchParams.delete('category');
		url.searchParams.delete('department');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function formatDuration(seconds: number) {
		if (!seconds) return '0m';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}

	const hasActiveFilters = $derived(!!searchQuery || !!startDate || !!endDate || !!selectedCategoryId || !!selectedDepartment);

	// --- Date Navigator ---
	function bdFmt(d: Date): string {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: 'Asia/Dhaka',
			year: 'numeric', month: '2-digit', day: '2-digit'
		}).format(d);
	}

	function bdTodayStr(): string { return bdFmt(new Date()); }

	// Parse YYYY-MM-DD safely as a local Date (avoids UTC midnight shift)
	function parseDate(s: string): Date {
		const [y, m, d] = s.split('-').map(Number);
		return new Date(y, m - 1, d);
	}

	// dateMode: 'day' shows single day nav, 'month' shows month nav
	let dateMode = $state<'day' | 'month'>('day');

	// The anchor date for navigation — derived from current startDate
	const navDate = $derived(startDate ? parseDate(startDate) : parseDate(bdTodayStr()));

	const navLabel = $derived.by(() => {
		if (dateMode === 'day') {
			return new Intl.DateTimeFormat('en-US', {
				month: 'long', day: 'numeric', year: 'numeric'
			}).format(navDate);
		}
		return new Intl.DateTimeFormat('en-US', {
			month: 'long', year: 'numeric'
		}).format(navDate);
	});

	function applyDateRange(start: string, end: string) {
		const url = new URL(page.url);
		url.searchParams.set('startDate', start);
		url.searchParams.set('endDate', end);
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function navigate(dir: -1 | 1) {
		const todayBD = bdTodayStr();
		if (dateMode === 'day') {
			const d = new Date(navDate);
			d.setDate(d.getDate() + dir);
			const s = bdFmt(d);
			if (s > todayBD) return; // can't go to future
			applyDateRange(s, s);
		} else {
			const y = navDate.getFullYear();
			const m = navDate.getMonth(); // 0-indexed
			const newDate = new Date(y, m + dir, 1);
			const ny = newDate.getFullYear();
			const nm = newDate.getMonth();
			const firstDay = `${ny}-${String(nm + 1).padStart(2, '0')}-01`;
			// Last day of that month
			const lastD = new Date(ny, nm + 1, 0);
			const lastDay = bdFmt(lastD);
			// Cap end at today for current/future months
			const cappedEnd = lastDay > todayBD ? todayBD : lastDay;
			if (firstDay > todayBD) return; // can't go to future month
			applyDateRange(firstDay, cappedEnd);
		}
	}

	function setDateMode(mode: 'day' | 'month') {
		dateMode = mode;
		const todayBD = bdTodayStr();
		if (mode === 'day') {
			// Jump to today as single day
			applyDateRange(todayBD, todayBD);
		} else {
			// Jump to current month
			const [yr, mo] = todayBD.split('-');
			applyDateRange(`${yr}-${mo}-01`, todayBD);
		}
	}

	const isToday = $derived(startDate === endDate && startDate === bdTodayStr());

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
		window.open(url.toString(), '_blank');
	}
</script>

<svelte:head>
	<title>{i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<!-- Print-only section -->
<div class={cn('print-only', !isPrintMode && 'hidden')}>
	<PrintHeader title={data.view === 'detailed' ? 'People History Report' : data.view === 'daily' ? 'Daily Summary Report' : 'Monthly Summary Report'} />

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 0;">
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
				<tr style="background: #f0f0f0;">
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">#</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Name</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Identity No.</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Category</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Dept.</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Training</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Joined</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Date</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Entry</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Exit</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Duration</th>
				</tr>
			</thead>
			<tbody>
				{#each data.data as log, index (log.id || index)}
					<tr style={index % 2 === 0 ? '' : 'background: #fff;'}>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{index + 1}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{log.person.name}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.person.codeNo || '-'}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.category.name}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.person.department || '-'}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: {log.person.isTrained ? '#059669' : '#e11d48'};">
							{log.person.isTrained ? 'TRAINED' : 'PENDING'}
						</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">
							{log.person.auditJoinDate ? format(log.person.auditJoinDate, 'dd-MM-yyyy') : '-'}
						</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{format(parseISO(log.date), 'dd-MM-yyyy')}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{format(log.entryTime, 'hh:mm a')}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{log.exitTime ? format(log.exitTime, 'hh:mm a') : 'Inside'}</td>
						<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 700; color: #000;">{formatDuration(log.durationSeconds)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{:else if data.view === 'daily'}
		<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
			<thead>
				<tr style="background: #f0f0f0;">
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Date</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Total Entries</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Unique People</th>
				</tr>
			</thead>
			<tbody>
				{#each data.data as day, index (day.date)}
					<tr style={index % 2 === 0 ? '' : 'background: #fff;'}>
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
				<tr style="background: #f0f0f0;">
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Month</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Total Entries</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Unique People</th>
					<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Active Days</th>
				</tr>
			</thead>
			<tbody>
				{#each data.data as month, index (month.month)}
					<tr style={index % 2 === 0 ? '' : 'background: #fff;'}>
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
		<h2 class="text-xl font-black text-slate-900">Preparing Print Report…</h2>
		<p class="mt-2 font-bold text-slate-500">Fetching {data.pagination.totalCount} records</p>
	</div>
{/if}

<!-- Screen view -->
{#if !isPrintMode}
<div class="no-print pb-20">
	<!-- Sticky Top Bar for Filters (mobile only) -->
	<div class="sticky-filter-bar px-4 md:px-0 lg:hidden">
		<div class="content-container space-y-3">
			<!-- Row 1: Search + Actions -->
			<div class="flex items-center gap-2">
				<div class="group relative min-w-0 flex-1">
					<div class="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500">
						<Search size={17} />
					</div>
					<Input
						bind:value={searchQuery}
						oninput={handleSearchInput}
						placeholder={i18n.t('searchHistoryPlaceholder')}
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
				<a href="/attendance" class="btn-pressable flex size-10 shrink-0 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-slate-500 transition-all" aria-label="Back to entry log">
					<ArrowLeft size={16} />
				</a>
			</div>

			<!-- Row 2: View Toggle (always visible) -->
			<div class="flex w-full items-center gap-0.5 rounded-xl border-2 border-slate-100 bg-white p-0.5">
				<button
					class={cn(
						'chip-pressable flex-1 rounded-lg py-2 text-[10px] font-black tracking-widest uppercase transition-all',
						data.view === 'detailed'
							? 'bg-primary-600 text-white shadow-sm'
							: 'text-slate-400'
					)}
					onclick={() => changeView('detailed')}
				>
					{i18n.t('detailed')}
				</button>
				<button
					class={cn(
						'chip-pressable flex-1 rounded-lg py-2 text-[10px] font-black tracking-widest uppercase transition-all',
						data.view === 'daily'
							? 'bg-primary-600 text-white shadow-sm'
							: 'text-slate-400'
					)}
					onclick={() => changeView('daily')}
				>
					{i18n.t('dailySummary')}
				</button>
				<button
					class={cn(
						'chip-pressable flex-1 rounded-lg py-2 text-[10px] font-black tracking-widest uppercase transition-all',
						data.view === 'monthly'
							? 'bg-primary-600 text-white shadow-sm'
							: 'text-slate-400'
					)}
					onclick={() => changeView('monthly')}
				>
					{i18n.t('monthlySummary')}
				</button>
			</div>

			<!-- Expandable: Date Range, Categories, Departments -->
			{#if showMobileFilters}
				<div class="lg:hidden" transition:slide={{ duration: 200, easing: sineInOut }}>
					<!-- Date Range -->
					<div class="space-y-2">
						<p class="ml-0.5 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
							Date Range
						</p>
						<!-- Mode toggle -->
						<div class="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
							<button
								class={cn('flex-1 rounded-md py-1.5 text-[11px] font-black transition-all',
									dateMode === 'day' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500')}
								onclick={() => { setDateMode('day'); showMobileFilters = false; }}
							>Day</button>
							<button
								class={cn('flex-1 rounded-md py-1.5 text-[11px] font-black transition-all',
									dateMode === 'month' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500')}
								onclick={() => { setDateMode('month'); showMobileFilters = false; }}
							>Month</button>
						</div>
						<!-- Arrow nav -->
						<div class="flex items-center gap-2">
							<button
								class="chip-pressable flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500"
								onclick={() => navigate(-1)} aria-label="Previous"
							><ChevronLeft size={18} /></button>
							<span class="flex-1 text-center text-[13px] font-black text-slate-700">{navLabel}</span>
							<button
								class={cn('chip-pressable flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500',
									(isToday && dateMode === 'day') && 'opacity-30 cursor-default')}
								onclick={() => navigate(1)}
								disabled={isToday && dateMode === 'day'}
								aria-label="Next"
							><ChevronRight size={18} /></button>
						</div>
						<div
							class="flex h-12 items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white px-4 shadow-sm"
						>
							<Calendar size={18} class="text-slate-400" />
							<div class="flex flex-1 items-center justify-between gap-2">
								<DatePicker
									bind:value={startDate}
									onchange={applyFilters}
									placeholder="Start"
									className="flex-1"
								/>
								<div class="h-0.5 w-4 shrink-0 rounded-full bg-slate-200"></div>
								<DatePicker
									bind:value={endDate}
									onchange={applyFilters}
									placeholder="End"
									className="flex-1"
								/>
							</div>
						</div>
					</div>

					<!-- Categories -->
					<div class="custom-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-2">
						<button
							class={cn(
								'chip-pressable shrink-0 rounded-lg px-3 py-1.5 text-[11px] font-black transition-all',
								!selectedCategoryId
									? 'bg-primary-600 text-white shadow-sm'
									: 'bg-slate-100 text-slate-500'
							)}
							onclick={() => changeCategory(null)}
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
									onclick={() => {
										const url = new URL(page.url);
										url.searchParams.delete('department');
										goto(url.toString());
									}}
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
										onclick={() => {
											const url = new URL(page.url);
											url.searchParams.set('department', dept);
											goto(url.toString());
										}}
									>
										{dept}
									</button>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="content-container flex flex-col gap-8 px-4 md:px-0 lg:flex-row">
		<!-- Sidebar - Desktop Only -->
		<aside
			class="custom-scrollbar hidden w-64 shrink-0 self-start overflow-y-auto lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-8rem)]"
		>
			<div class="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
				<!-- Summary Stats Header -->
				<div class="relative border-b border-slate-100 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 px-4 py-4">
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(28,85,164,0.3),transparent_60%)]"></div>
					<div class="relative">
						<div class="flex items-center gap-2">
							<div class="relative flex size-2">
								<span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
								<span class="relative inline-flex size-2 rounded-full bg-emerald-400"></span>
							</div>
							<span class="text-[9px] font-black tracking-[0.2em] text-emerald-300/90 uppercase">History Summary</span>
						</div>
						<div class="mt-2 flex items-end justify-between">
							<div>
								<p class="text-3xl font-black tabular-nums tracking-tight text-white">{data.summary.totalEntries}</p>
								<p class="text-[9px] font-bold tracking-wider text-slate-400 uppercase">{i18n.t('entries')}</p>
							</div>
							<div class="flex flex-col items-end gap-1">
								<div class="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 backdrop-blur-sm">
									<Users size={10} class="text-sky-300" />
									<span class="text-[10px] font-black tabular-nums text-sky-200">{data.summary.uniquePeople}</span>
								</div>
								<div class="flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-1 backdrop-blur-sm">
									<Calendar size={10} class="text-amber-300" />
									<span class="text-[10px] font-black tabular-nums text-amber-200">{data.summary.activeDays}d</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<div class="p-3">
					<!-- Date Navigator -->
					<div class="mb-4 space-y-2">
						<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">Date</p>
						<!-- Mode toggle -->
						<div class="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
							<button
								class={cn('flex-1 rounded-md py-1.5 text-[11px] font-black transition-all',
									dateMode === 'day' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
								onclick={() => setDateMode('day')}
							>Day</button>
							<button
								class={cn('flex-1 rounded-md py-1.5 text-[11px] font-black transition-all',
									dateMode === 'month' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
								onclick={() => setDateMode('month')}
							>Month</button>
						</div>
						<!-- Arrow navigation -->
						<div class="flex items-center gap-1">
							<button
								class="chip-pressable flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:text-primary-600"
								onclick={() => navigate(-1)}
								aria-label="Previous"
							><ChevronLeft size={16} /></button>
							<span class="flex-1 text-center text-[12px] font-black text-slate-700 leading-tight">{navLabel}</span>
							<button
								class={cn('chip-pressable flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-primary-300 hover:text-primary-600',
									isToday && dateMode === 'day' && 'opacity-30 cursor-default')}
								onclick={() => navigate(1)}
								disabled={isToday && dateMode === 'day'}
								aria-label="Next"
							><ChevronRight size={16} /></button>
						</div>
						<!-- Custom range (collapsed by default, shown only when range doesn't match nav) -->
						<div class="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-1.5 py-1">
							<DatePicker bind:value={startDate} onchange={applyFilters} placeholder="Start" className="flex-1 min-w-0" />
							<div class="h-0.5 w-2 shrink-0 rounded-full bg-slate-300"></div>
							<DatePicker bind:value={endDate} onchange={applyFilters} placeholder="End" className="flex-1 min-w-0" />
						</div>
					</div>

					<!-- Category Filter -->
					<div class="space-y-1.5 border-t border-slate-100 pt-3">
						<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">
							{i18n.t('category')}
						</p>
						<div class="flex flex-col gap-0.5">
							<Button
								variant={!selectedCategoryId ? 'secondary' : 'ghost'}
								class={cn(
									'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
									!selectedCategoryId
										? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
										: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
								)}
								onclick={() => changeCategory(null)}
							>
								{i18n.t('all')}
							</Button>
							{#each ROOT_CATEGORIES as cat}
								{@const isCatActive = activeRootCategoryId() === cat.id}
								<div>
									<Button
										variant={isCatActive ? 'secondary' : 'ghost'}
										class={cn(
											'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
											isCatActive
												? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
												: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
										)}
										onclick={() => changeCategory(cat.id)}
									>
										{i18n.t(cat.slug as any) || cat.name}
									</Button>

									{#if isCatActive && availableSubCategories().length > 0}
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
													All
												</button>

												{#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
													<button
														class="touch-feedback cursor-pointer rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500 transition-all active:scale-95 hover:bg-slate-200"
														onclick={() => changeCategory(activeParentCategory()?.id || null)}
													>
														<span class="mr-0.5 opacity-40">↑</span>
														{activeParentCategory()?.name}
													</button>
												{/if}

												{#each availableSubCategories() as subCat}
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
									onclick={() => {
										const url = new URL(page.url);
										url.searchParams.delete('department');
										goto(url.toString());
									}}
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
										onclick={() => {
											const url = new URL(page.url);
											url.searchParams.set('department', dept);
											goto(url.toString());
										}}
									>
										<span class="truncate">{dept}</span>
									</Button>
								{/each}
							</div>
						</div>
					{/if}

					<!-- View Selector -->
					<div class="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
						<p class="px-1 text-[9px] font-black tracking-[0.15em] text-slate-400 uppercase">Views</p>
						<div class="flex flex-col gap-0.5">
							<Button
								variant={data.view === 'detailed' ? 'secondary' : 'ghost'}
								class={cn(
									'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
									data.view === 'detailed'
										? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
										: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
								)}
								onclick={() => changeView('detailed')}
							>
								<div class="flex items-center gap-2">
									<Clock size={14} />
									{i18n.t('detailed')}
								</div>
							</Button>
							<Button
								variant={data.view === 'daily' ? 'secondary' : 'ghost'}
								class={cn(
									'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
									data.view === 'daily'
										? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
										: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
								)}
								onclick={() => changeView('daily')}
							>
								<div class="flex items-center gap-2">
									<Calendar size={14} />
									{i18n.t('dailySummary')}
								</div>
							</Button>
							<Button
								variant={data.view === 'monthly' ? 'secondary' : 'ghost'}
								class={cn(
									'h-8 w-full cursor-pointer justify-start rounded-lg px-2.5 text-[13px] font-bold transition-all',
									data.view === 'monthly'
										? 'border-l-[3px] border-primary-600 bg-primary-50 text-primary-800'
										: 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
								)}
								onclick={() => changeView('monthly')}
							>
								<div class="flex items-center gap-2">
									<TrendingUp size={14} />
									{i18n.t('monthlySummary')}
								</div>
							</Button>
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

		<!-- Main Scrolling Content Area -->
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
							placeholder={i18n.t('searchHistoryPlaceholder')}
							class="h-11 w-full rounded-xl border-2 border-slate-300 bg-white pr-9 pl-10 text-sm font-bold shadow-sm transition-all placeholder:truncate focus-visible:border-primary-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-primary-500/20"
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
					<!-- Date navigator (toolbar) -->
					<div class="flex items-center gap-1 rounded-xl border-2 border-slate-100 bg-white px-1.5 py-1 shadow-sm">
						<!-- Mode toggle -->
						<div class="flex gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
							<button
								class={cn('rounded-md px-2.5 py-1 text-[10px] font-black transition-all',
									dateMode === 'day' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
								onclick={() => setDateMode('day')}
							>Day</button>
							<button
								class={cn('rounded-md px-2.5 py-1 text-[10px] font-black transition-all',
									dateMode === 'month' ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700')}
								onclick={() => setDateMode('month')}
							>Month</button>
						</div>
						<!-- Arrow nav -->
						<button
							class="chip-pressable flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-600"
							onclick={() => navigate(-1)} aria-label="Previous"
						><ChevronLeft size={14} /></button>
						<span class="min-w-[140px] text-center text-[11px] font-black text-slate-700">{navLabel}</span>
						<button
							class={cn('chip-pressable flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-primary-600',
								(isToday && dateMode === 'day') && 'opacity-30 cursor-default')}
							onclick={() => navigate(1)}
							disabled={isToday && dateMode === 'day'}
							aria-label="Next"
						><ChevronRight size={14} /></button>
						<div class="mx-1 h-4 w-px shrink-0 bg-slate-200"></div>
						<DatePicker bind:value={startDate} onchange={applyFilters} placeholder="Start" className="w-[120px]" />
						<div class="h-0.5 w-2 shrink-0 rounded-full bg-slate-200"></div>
						<DatePicker bind:value={endDate} onchange={applyFilters} placeholder="End" className="w-[120px]" />
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
					<Button variant="ghost" size="icon" class="size-9 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Print report" onclick={confirmPrint}>
						<Printer size={15} />
					</Button>
				</div>

				<div class="relative min-h-full lg:bg-slate-100/50">
			<!-- List Section -->
			<div class="space-y-4 lg:p-3">
				<!-- Mobile Card View -->
				<div class="space-y-3 lg:hidden">
					{#if data.view === 'detailed'}
						{#each data.data as log (log.id)}
							<Card.Root
								class="card-pressable cursor-pointer border-2 border-slate-100 bg-white active:bg-slate-50/80"
								onclick={() => goto(`/people/${log.person.id}`)}
							>
								<Card.Content class="p-4">
									<div class="flex items-center justify-between">
										<div class="min-w-0 flex-1">
											<div class="flex items-center gap-2">
												<h3 class="truncate text-[15px] font-black text-slate-900">{log.person.name}</h3>
												{#if !log.exitTime}
													<Badge class={cn('shrink-0 text-[9px] font-bold capitalize', statusBadgeClasses.on_premises)}>
														{i18n.t('inside')}
													</Badge>
												{/if}
											</div>
											<div class="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
												<span class="font-bold">{log.category.name}</span>
												{#if log.person.codeNo}
													<span>#{log.person.codeNo}</span>
												{/if}
												{#if log.person.department}
													<span>{log.person.department}</span>
												{/if}
											</div>
										</div>
										<div class="shrink-0 text-right">
											<p class="text-sm font-black tabular-nums text-primary-700">{formatDuration(log.durationSeconds)}</p>
										</div>
									</div>
									<div class="mt-2 flex items-center gap-3 text-[11px] font-bold text-slate-400">
										<span class="tabular-nums">{format(parseISO(log.date), 'dd-MM-yyyy')}</span>
										<span class="tabular-nums">{format(log.entryTime, 'hh:mm a')} → {log.exitTime ? format(log.exitTime, 'hh:mm a') : 'now'}</span>
										{#if !isEmployeeView && log.purpose}
											<span class="truncate text-slate-500">{log.purpose}</span>
										{/if}
									</div>
								</Card.Content>
							</Card.Root>
						{:else}
							<div
								class="flex flex-col items-center justify-center space-y-6 rounded-3xl py-24 text-center"
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
										No history records found matching your criteria
									</p>
								</div>
							</div>
						{/each}
					{:else if data.view === 'daily'}
						{#each data.data as day}
							<Card.Root class="card-pressable border-2 border-slate-100 bg-white active:bg-slate-50/80">
								<Card.Content class="p-4">
									<div class="mb-2 font-bold text-slate-900">
										{format(parseISO(day.date), 'dd-MM-yyyy')}
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
							<Card.Root class="card-pressable border-2 border-slate-100 bg-white active:bg-slate-50/80">
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
					<Card.Root class="overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-sm">
						<Table.Root>
							{#if data.view === 'detailed'}
								<Table.Header>
									<Table.Row class="bg-slate-200 hover:bg-slate-200">
										<Table.Head class="font-black text-slate-800">{i18n.t('name')}</Table.Head>
										<Table.Head class="font-black text-slate-800">{i18n.t('category')}</Table.Head>
										<Table.Head class="font-black text-slate-800">{i18n.t('date')}</Table.Head>
										<Table.Head class="font-black text-slate-800">{i18n.t('entryTime')}</Table.Head>
										<Table.Head class="font-black text-slate-800">{i18n.t('exitTime')}</Table.Head>
										{#if !isEmployeeView}
											<Table.Head class="font-black text-slate-800">{i18n.t('purpose')}</Table.Head>
										{/if}
										<Table.Head class="font-black text-slate-800">{i18n.t('duration')}</Table.Head>
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
												<div class="flex items-center gap-2">
													<span class="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
														{#if log.person.codeNo}#{log.person.codeNo}{/if}
														{#if log.person.codeNo && log.person.company} • {/if}
														{#if log.person.company}{log.person.company}{/if}
														{#if !log.person.codeNo && !log.person.company}-{/if}
													</span>
												</div>
											</Table.Cell>
											<Table.Cell>
												<div class="flex flex-col gap-1.5">
													<Badge
														variant="outline"
														class={cn(
															'w-fit text-[10px] font-bold tracking-wider capitalize',
															getCategoryBadgeClass(log.category.slug)
														)}
													>
														{log.category.name}
													</Badge>
													{#if log.person.department}
														<Badge
															variant="outline"
															class="w-fit border-blue-200 bg-blue-50 text-[9px] font-black tracking-widest text-blue-700 uppercase"
														>
															{log.person.department}
														</Badge>
													{/if}
												</div>
											</Table.Cell>
											<Table.Cell class="py-4 font-medium text-slate-600"
												>{format(parseISO(log.date), 'dd-MM-yyyy')}</Table.Cell
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
											<Table.Cell class="py-4 font-bold tabular-nums text-slate-700">
												<div class="flex flex-col gap-0.5">
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
												colspan={isEmployeeView ? 6 : 7}
												class="h-64 text-center text-slate-400 font-bold"
												>{i18n.t('noData')}</Table.Cell
											>
										</Table.Row>
									{/each}
								</Table.Body>
							{:else if data.view === 'daily'}
								<Table.Header>
									<Table.Row class="bg-slate-200 hover:bg-slate-200">
										<Table.Head class="font-black text-slate-800">{i18n.t('date')}</Table.Head>
										<Table.Head class="font-black text-slate-800">{i18n.t('entries')}</Table.Head>
										<Table.Head class="font-black text-slate-800">Unique People</Table.Head>
										<Table.Head class="font-black text-slate-800">Total Hours</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.data as day}
										<Table.Row>
											<Table.Cell class="py-4 font-bold text-slate-900"
												>{format(parseISO(day.date), 'dd-MM-yyyy')}</Table.Cell
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
									<Table.Row class="bg-slate-200 hover:bg-slate-200">
										<Table.Head class="font-black text-slate-800">{i18n.t('month')}</Table.Head>
										<Table.Head class="font-black text-slate-800">{i18n.t('entries')}</Table.Head>
										<Table.Head class="font-black text-slate-800">Unique People</Table.Head>
										<Table.Head class="font-black text-slate-800">Active Days</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each data.data as month}
										<Table.Row>
											<Table.Cell class="py-4 font-bold text-slate-900 uppercase">
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
				</div>
			</div>
		</main>
	</div>
</div>
{/if}

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
