<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Users,
		X,
		Printer,
		Loader2,
		ChevronDown,
		ChevronUp,
		Trash2,
		AlertTriangle,
		CheckSquare,
		Square
	} from 'lucide-svelte';
	import logo from '$lib/assets/logo.png';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { format } from 'date-fns';
	import { clsx } from 'clsx';
	import { slide } from 'svelte/transition';
	import { sineInOut, cubicOut } from 'svelte/easing';
	import { cn, getCategoryLevelClass, appToast } from '$lib/utils';
	import type { PageData, ActionData } from './$types';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// State
	let selectedDate = $state('');
	let searchQuery = $state('');
	let isGenerationOpen = $state(false);
	let isPreparingPrint = $state(false);
	let isClearConfirmOpen = $state(false);
	let debounceTimer: any;

	// Generation panel state
	let genCategoryId = $state('');
	let entryRangeStart = $state('07:45');
	let entryRangeEnd = $state('08:15');
	let exitRangeStart = $state('16:45');
	let exitRangeEnd = $state('17:15');
	let selectedPersonIds = $state<Set<string>>(new Set());
	let useRealEntry = $state(false);
	let isGenerating = $state(false);

	// Warning thresholds (BD time hours)
	let warnEntryBefore = $state('08:00');
	let warnExitAfter = $state('18:00');

	// People list search in generation panel
	let genPeopleSearch = $state('');

	// Virtual scroll state for people list
	const ITEM_HEIGHT = 40; // px per row
	const CONTAINER_HEIGHT = 384; // max-h-[24rem] = 24 * 16 = 384px
	let scrollTop = $state(0);
	let peopleListEl = $state<HTMLDivElement | null>(null);

	const virtualSlice = $derived.by(() => {
		const total = genFilteredPeople.length;
		const buffer = 5;
		const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - buffer);
		const visibleCount = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + buffer * 2;
		const endIdx = Math.min(total, startIdx + visibleCount);
		return { startIdx, endIdx, totalHeight: total * ITEM_HEIGHT };
	});

	// Reset scroll when filter changes
	$effect(() => {
		// Track filter dependencies
		genFilteredPeople.length;
		if (peopleListEl) {
			peopleListEl.scrollTop = 0;
			scrollTop = 0;
		}
	});

	// Editable entries (local state for inline editing)
	let editableEntries = $state<Map<string, { entryTime: string; exitTime: string; purpose: string }>>(new Map());
	let isSaving = $state(false);

	$effect(() => {
		selectedDate = data.filters.date;
		searchQuery = data.filters.query;
	});

	// People filtered by generation category
	const genCategoryFiltered = $derived.by(() => {
		if (!genCategoryId) return data.allPeople;
		const descendantIds = getDescendantIds(genCategoryId);
		return data.allPeople.filter(p => descendantIds.includes(p.categoryId));
	});

	const genFilteredPeople = $derived.by(() => {
		const q = genPeopleSearch.trim().toLowerCase();
		if (!q) return genCategoryFiltered;
		return genCategoryFiltered.filter(p =>
			p.name.toLowerCase().includes(q) ||
			(p.codeNo && p.codeNo.toLowerCase().includes(q)) ||
			(p.company && p.company.toLowerCase().includes(q))
		);
	});

	// Active root for generation panel subcategory display
	const activeGenRoot = $derived.by(() => {
		if (!genCategoryId) return '';
		if (ROOT_CATEGORIES.some(c => c.id === genCategoryId)) return genCategoryId;
		const parent = ROOT_CATEGORIES.find(c => getSubCategories(c.id).some(sc => sc.id === genCategoryId));
		return parent?.id || '';
	});

	const activeGenSubs = $derived.by(() => {
		if (!activeGenRoot) return [];
		return getSubCategories(activeGenRoot);
	});

	function getDescendantIds(categoryId: string): string[] {
		const ids: string[] = [categoryId];
		const queue = [categoryId];
		while (queue.length > 0) {
			const parentId = queue.shift()!;
			for (const cat of CATEGORIES) {
				if (cat.parentId === parentId) {
					ids.push(cat.id);
					queue.push(cat.id);
				}
			}
		}
		return ids;
	}

	function selectAll() {
		const newSet = new Set(selectedPersonIds);
		for (const p of genFilteredPeople) {
			newSet.add(p.id);
		}
		selectedPersonIds = newSet;
	}

	function deselectAll() {
		const filtered = new Set(genFilteredPeople.map(p => p.id));
		const newSet = new Set(selectedPersonIds);
		for (const id of filtered) {
			newSet.delete(id);
		}
		selectedPersonIds = newSet;
	}

	function selectPresent() {
		const newSet = new Set(selectedPersonIds);
		for (const p of genFilteredPeople) {
			if (data.realLogMap[p.id]) {
				newSet.add(p.id);
			}
		}
		selectedPersonIds = newSet;
	}

	const presentCount = $derived.by(() => {
		return genFilteredPeople.filter(p => data.realLogMap[p.id]).length;
	});

	function togglePerson(id: string) {
		const newSet = new Set(selectedPersonIds);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedPersonIds = newSet;
	}

	const getCategoryPath = (categoryId: string) => {
		const path: { id: string; name: string; slug: string }[] = [];
		let current = getCategoryById(categoryId);
		while (current) {
			path.unshift({ id: current.id, name: current.name, slug: current.slug });
			if (!current.parentId) break;
			current = getCategoryById(current.parentId);
		}
		return path;
	};

	// Warning logic: BD time (UTC+6), using editable thresholds
	function parseBDMinutes(timeStr: string): number {
		const [h, m] = timeStr.split(':').map(Number);
		return h * 60 + m;
	}

	function getBDMinutes(date: Date): number {
		let bdHour = date.getUTCHours() + 6;
		if (bdHour >= 24) bdHour -= 24;
		return bdHour * 60 + date.getUTCMinutes();
	}

	function hasEntryWarning(entryTime: Date): boolean {
		return getBDMinutes(entryTime) < parseBDMinutes(warnEntryBefore);
	}

	function hasExitWarning(exitTime: Date | null): boolean {
		if (!exitTime) return false;
		return getBDMinutes(exitTime) > parseBDMinutes(warnExitAfter);
	}

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');
		if (selectedDate) url.searchParams.set('date', selectedDate);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 400);
	}

	function changeDate(e: Event) {
		selectedDate = (e.target as HTMLInputElement).value;
		applyFilters();
	}

	// Get editable value or original
	function getEntryTime(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) return edited.entryTime;
		return format(entry.entryTime, 'HH:mm');
	}

	function getExitTime(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) return edited.exitTime;
		return entry.exitTime ? format(entry.exitTime, 'HH:mm') : '';
	}

	function getPurpose(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) return edited.purpose;
		return entry.purpose || '';
	}

	function updateEntryField(entryId: string, field: 'entryTime' | 'exitTime' | 'purpose', value: string) {
		const existing = editableEntries.get(entryId);
		const entry = data.entries.find(e => e.id === entryId);
		if (!entry) return;

		const current = existing || {
			entryTime: format(entry.entryTime, 'HH:mm'),
			exitTime: entry.exitTime ? format(entry.exitTime, 'HH:mm') : '',
			purpose: entry.purpose || ''
		};

		const newMap = new Map(editableEntries);
		newMap.set(entryId, { ...current, [field]: value });
		editableEntries = newMap;
	}

	// Check if there are unsaved edits
	const hasEdits = $derived(editableEntries.size > 0);

	// Print
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

	function printReport() {
		const url = new URL(page.url);
		url.searchParams.set('print', '1');
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	// Generate handler
	async function handleGenerate() {
		isGenerating = true;
		const formData = new FormData();
		formData.set('date', selectedDate);
		formData.set('entryRangeStart', entryRangeStart);
		formData.set('entryRangeEnd', entryRangeEnd);
		formData.set('exitRangeStart', exitRangeStart);
		formData.set('exitRangeEnd', exitRangeEnd);
		formData.set('personIds', JSON.stringify([...selectedPersonIds]));
		formData.set('useRealEntry', useRealEntry.toString());
		formData.set('realLogMap', JSON.stringify(data.realLogMap));

		try {
			const res = await fetch('?/generate', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				appToast.success('Audit entries generated successfully');
				editableEntries = new Map();
				await invalidateAll();
			} else {
				appToast.error('Failed to generate entries');
			}
		} catch {
			appToast.error('Failed to generate entries');
		} finally {
			isGenerating = false;
		}
	}

	// Save edits handler
	async function handleSave() {
		isSaving = true;
		const entriesToSave = [...editableEntries.entries()].map(([id, edits]) => {
			return {
				id,
				entryTime: new Date(`${selectedDate}T${edits.entryTime}:00`).toISOString(),
				exitTime: edits.exitTime ? new Date(`${selectedDate}T${edits.exitTime}:00`).toISOString() : '',
				purpose: edits.purpose
			};
		});

		const formData = new FormData();
		formData.set('entries', JSON.stringify(entriesToSave));

		try {
			const res = await fetch('?/save', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				appToast.success('Changes saved successfully');
				editableEntries = new Map();
				await invalidateAll();
			} else {
				appToast.error('Failed to save changes');
			}
		} catch {
			appToast.error('Failed to save changes');
		} finally {
			isSaving = false;
		}
	}

	// Remove entry handler
	async function handleRemove(entryId: string) {
		const formData = new FormData();
		formData.set('entryId', entryId);

		try {
			const res = await fetch('?/remove', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				await invalidateAll();
			}
		} catch {
			appToast.error('Failed to remove entry');
		}
	}

	// Clear all handler
	async function handleClear() {
		const formData = new FormData();
		formData.set('date', selectedDate);

		try {
			const res = await fetch('?/clear', {
				method: 'POST',
				body: formData
			});
			if (res.ok) {
				editableEntries = new Map();
				appToast.success('All entries cleared');
				await invalidateAll();
			}
		} catch {
			appToast.error('Failed to clear entries');
		}
	}
</script>

<svelte:head>
	<title>{i18n.t('auditReport')} | {i18n.t('appName')}</title>
</svelte:head>

<!-- Print-only section -->
<div class="print-only hidden">
	<div
		class="print-header"
		style="display: flex !important; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 2px solid #333; margin-bottom: 1rem;"
	>
		<div style="display: flex; align-items: center; gap: 12px;">
			<img src={logo} alt="Logo" style="height: 48px; width: auto;" />
			<div>
				<h1 style="font-size: 24px; font-weight: 800; margin: 0;">{i18n.t('appName')}</h1>
				<p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">{i18n.t('auditReport')}</p>
			</div>
		</div>
		<div style="text-align: right;">
			<p style="font-size: 14px; font-weight: 600; margin: 0;">{selectedDate}</p>
			<p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">
				Printed at {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="margin-bottom: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">
		<p style="font-size: 14px; font-weight: 600; margin: 0;">
			{i18n.t('total')}: <strong>{data.entries.length}</strong> people
		</p>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
		<thead>
			<tr style="background: #f0f0f0;">
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">#</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('name')}</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('codeNo')}</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('category')}</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('company')}</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('entryTime')}</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('exitTime')}</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">{i18n.t('purpose')}</th>
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry, index (entry.id)}
				<tr>
					<td style="border: 1px solid #ddd; padding: 8px;">{index + 1}</td>
					<td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">{entry.person.name}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{entry.person.codeNo || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{entry.category.name}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{entry.person.company || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{format(entry.entryTime, 'hh:mm a')}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{entry.exitTime ? format(entry.exitTime, 'hh:mm a') : '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{entry.purpose || '-'}</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div
		style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; display: flex; justify-content: space-between; font-size: 10px; color: #666;"
	>
		<p>Generated by {i18n.t('appName')}</p>
	</div>
</div>

<!-- Loading overlay for print preparation -->
{#if isPreparingPrint}
	<div class="fixed inset-0 z-100 flex flex-col items-center justify-center bg-white">
		<Loader2 class="mb-4 animate-spin text-primary-600" size={48} />
		<h2 class="text-xl font-black text-slate-900">Preparing Audit Report...</h2>
		<p class="mt-2 font-bold text-slate-500">Loading all entries</p>
	</div>
{/if}

<!-- Screen view -->
<div class="no-print pb-20">
	<!-- Sticky Top Bar -->
	<div class="sticky-filter-bar">
		<div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
			<!-- Left: Date + Search -->
			<div class="flex items-center gap-3 flex-1 min-w-0">
				<input
					type="date"
					value={selectedDate}
					onchange={changeDate}
					class="h-12 rounded-2xl border-2 border-slate-100 bg-white px-4 text-sm font-bold shadow-sm focus:border-primary-500 focus:outline-none"
				/>
				<div class="group relative flex-1 max-w-md">
					<div class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500">
						<Search size={20} />
					</div>
					<Input
						bind:value={searchQuery}
						oninput={handleSearchInput}
						placeholder={i18n.t('searchPlaceholder')}
						class="h-12 w-full rounded-2xl border-2 border-slate-100 bg-white pr-12 pl-12 text-base font-bold shadow-sm focus-visible:border-primary-500 focus-visible:ring-0"
					/>
					{#if searchQuery}
						<button
							class="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
							onclick={() => { searchQuery = ''; applyFilters(); }}
						>
							<X size={16} />
						</button>
					{/if}
				</div>
			</div>

			<!-- Right: Actions -->
			<div class="flex items-center gap-2">
				<div class="flex h-8 items-center gap-2 border-r-2 border-slate-100 pr-4">
					<span class="text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('auditReport')}</span>
					<Badge class="border-primary-200 bg-primary-100 text-xs font-black text-primary-700">
						{data.entries.length} entries
					</Badge>
				</div>

				<Button
					variant="outline"
					class="h-12 cursor-pointer gap-2 rounded-2xl border-2 border-slate-200 px-6 font-black transition-all hover:border-primary-300 hover:bg-primary-50"
					onclick={printReport}
				>
					<Printer size={18} />
					<span>{i18n.t('printReport')}</span>
				</Button>
			</div>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="mx-auto max-w-[1600px]">
		<main class="space-y-6">
			<!-- Generation Panel (Collapsible) -->
			<Card.Root class="border-2 border-slate-100 bg-white">
				<button
					class="flex w-full cursor-pointer items-center justify-between p-5 text-left"
					onclick={() => isGenerationOpen = !isGenerationOpen}
				>
					<div class="flex items-center gap-3">
						<div class="rounded-xl bg-primary-100 p-2 text-primary-600">
							<Users size={20} />
						</div>
						<div>
							<h3 class="text-sm font-black text-slate-900">{i18n.t('generationPanel')}</h3>
							<p class="text-xs font-bold text-slate-400">Generate audit entries with randomized times</p>
						</div>
					</div>
					{#if isGenerationOpen}
						<ChevronUp size={20} class="text-slate-400" />
					{:else}
						<ChevronDown size={20} class="text-slate-400" />
					{/if}
				</button>

				{#if isGenerationOpen}
					<div class="border-t border-slate-100" transition:slide={{ duration: 150, easing: cubicOut }}>
						<!-- Two-column layout: Settings left, People right -->
						<div class="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
							<!-- Left Column: Settings -->
							<div class="p-4 flex flex-col gap-3">
								<!-- Category selector -->
								<div>
									<span
										class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block"
										>{i18n.t('category')}</span
									>
									<div class="flex flex-wrap gap-1">
										<button
											class={clsx(
												'cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-bold transition-all',
												genCategoryId === ''
													? 'bg-primary-600 text-white'
													: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
											)}
											onclick={() => genCategoryId = ''}
										>
											{i18n.t('all')} ({data.allPeople.length})
										</button>
										{#each ROOT_CATEGORIES as cat (cat.id)}
											{@const isActive = genCategoryId === cat.id || getSubCategories(cat.id).some(sc => sc.id === genCategoryId)}
											{@const catCount = data.allPeople.filter(p => getDescendantIds(cat.id).includes(p.categoryId)).length}
											<button
												class={clsx(
													'cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-bold transition-all',
													isActive
														? 'bg-primary-100 text-primary-700'
														: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
												)}
												onclick={() => genCategoryId = cat.id}
											>
												{i18n.t(cat.slug as any) || cat.name} ({catCount})
											</button>
										{/each}
									</div>
									{#if activeGenRoot && activeGenSubs.length > 0}
										<div class="flex flex-wrap gap-1 mt-1.5 pl-2 border-l-2 border-primary-200" transition:slide={{ duration: 200, easing: sineInOut }}>
											<button
												class={clsx(
													'cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold transition-all',
													genCategoryId === activeGenRoot
														? 'bg-primary-500 text-white'
														: 'bg-slate-100 text-slate-500 hover:bg-slate-200'
												)}
												onclick={() => genCategoryId = activeGenRoot}
											>All</button>
											{#each activeGenSubs as sub (sub.id)}
												{@const subCount = data.allPeople.filter(p => p.categoryId === sub.id).length}
												<button
													class={clsx(
														'cursor-pointer rounded-full px-2 py-0.5 text-[10px] font-bold transition-all',
														genCategoryId === sub.id
															? 'bg-primary-500 text-white'
															: 'bg-slate-100 text-slate-500 hover:bg-slate-200'
													)}
													onclick={() => genCategoryId = sub.id}
												>
													{i18n.t(sub.slug as any) || sub.name} ({subCount})
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Time Configuration -->
								<div class="max-w-xs space-y-2.5">
									<!-- Entry Time -->
									<div class="space-y-1">
										<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('entryTime')}</span>
										<div class="flex items-center gap-1.5">
											<input type="time" bind:value={entryRangeStart} class="w-24 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none" />
											<span class="text-slate-300 text-[10px]">to</span>
											<input type="time" bind:value={entryRangeEnd} class="w-24 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none" />
											<span class="text-[10px] text-amber-500 ml-1" title="Warn if before">
												<AlertTriangle size={10} class="inline" />
											</span>
											<input type="time" bind:value={warnEntryBefore} class="w-26 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[11px] font-bold text-amber-700 focus:border-amber-400 focus:outline-none" />
										</div>
									</div>
									<!-- Exit Time -->
									<div class="space-y-1">
										<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('exitTime')}</span>
										<div class="flex items-center gap-1.5">
											<input type="time" bind:value={exitRangeStart} class="w-24 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none" />
											<span class="text-slate-300 text-[10px]">to</span>
											<input type="time" bind:value={exitRangeEnd} class="w-24 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none" />
											<span class="text-[10px] text-amber-500 ml-1" title="Warn if after">
												<AlertTriangle size={10} class="inline" />
											</span>
											<input type="time" bind:value={warnExitAfter} class="w-26 rounded-md border border-amber-200 bg-amber-50 px-1.5 py-1 text-[11px] font-bold text-amber-700 focus:border-amber-400 focus:outline-none" />
										</div>
									</div>
								</div>

								<!-- Options + Actions -->
								<div class="flex items-center justify-between gap-2">
									<label class="flex items-center gap-1.5 cursor-pointer">
										<input type="checkbox" bind:checked={useRealEntry} class="size-3.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500" />
										<span class="text-[11px] font-bold text-slate-600">{i18n.t('useRealEntryTime')}</span>
									</label>
									<div class="flex items-center gap-1.5">
										{#if data.entries.length > 0}
											<Button
												variant="outline"
												size="sm"
												class="h-8 cursor-pointer gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600 hover:bg-rose-50"
												onclick={() => isClearConfirmOpen = true}
											>
												<Trash2 size={13} />
												{i18n.t('clearAll')}
											</Button>
										{/if}
										<Button
											size="sm"
											class="h-8 cursor-pointer gap-1.5 rounded-lg bg-primary-600 px-4 text-xs font-black text-white hover:bg-primary-700"
											onclick={handleGenerate}
											disabled={isGenerating || selectedPersonIds.size === 0}
										>
											{#if isGenerating}
												<Loader2 size={14} class="animate-spin" />
											{/if}
											{i18n.t('generate')} ({selectedPersonIds.size})
										</Button>
									</div>
								</div>
							</div>

							<!-- Right Column: People Selection -->
							<div class="p-4 space-y-2">
								<div class="flex items-center justify-between gap-2">
									<span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
										People
										<span class="text-primary-600">{selectedPersonIds.size}</span>
										<span class="text-slate-300">/</span>
										{genCategoryFiltered.length}
									</span>
									<div class="flex items-center gap-1.5">
										{#if presentCount > 0}
											<button
												class="flex items-center gap-1 text-[11px] font-bold text-emerald-600 cursor-pointer rounded-md px-2 py-0.5 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 transition-all"
												onclick={selectPresent}
											>
												<CheckSquare size={12} />
												Present ({presentCount})
											</button>
										{/if}
										<button
											class="flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 cursor-pointer px-1.5 py-0.5"
											onclick={selectAll}
										>
											<CheckSquare size={12} />
											All
										</button>
										<button
											class="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer px-1.5 py-0.5"
											onclick={deselectAll}
										>
											<Square size={12} />
											None
										</button>
									</div>
								</div>
								<!-- Search -->
								<div class="relative">
									<Search size={14} class="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
									<input
										type="text"
										bind:value={genPeopleSearch}
										placeholder="Search by name, code, company..."
										class="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs font-bold placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:outline-none"
									/>
									{#if genPeopleSearch}
										<button
											class="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer rounded p-0.5 text-slate-400 hover:text-slate-600"
											onclick={() => genPeopleSearch = ''}
										>
											<X size={12} />
										</button>
									{/if}
								</div>
								<!-- Virtual list -->
								<div
									bind:this={peopleListEl}
									onscroll={(e) => scrollTop = (e.target as HTMLDivElement).scrollTop}
									class="max-h-[24rem] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50"
								>
									{#if genFilteredPeople.length > 0}
										<div style="height: {virtualSlice.totalHeight}px; position: relative;">
											{#each genFilteredPeople.slice(virtualSlice.startIdx, virtualSlice.endIdx) as person, i (person.id)}
												{@const isSelected = selectedPersonIds.has(person.id)}
												{@const isPresent = !!data.realLogMap[person.id]}
												<button
													class={clsx(
														'flex w-full items-center gap-2 px-3 text-left text-xs transition-colors cursor-pointer absolute inset-x-0',
														isSelected ? 'bg-primary-50 text-primary-700 font-bold' : 'text-slate-600 hover:bg-white'
													)}
													style="height: {ITEM_HEIGHT}px; top: {(virtualSlice.startIdx + i) * ITEM_HEIGHT}px;"
													onclick={() => togglePerson(person.id)}
												>
													<div class={clsx(
														'size-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0',
														isSelected ? 'border-primary-600 bg-primary-600' : 'border-slate-300 bg-white'
													)}>
														{#if isSelected}
															<svg class="size-2.5 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.5">
																<path d="M2 6l3 3 5-5" />
															</svg>
														{/if}
													</div>
													<span class="truncate font-semibold">{person.name}</span>
													{#if isPresent}
														<span class="shrink-0 size-1.5 rounded-full bg-emerald-500"></span>
													{/if}
													{#if person.company}
														<span class="text-[10px] text-slate-400 truncate hidden sm:inline ml-auto">{person.company}</span>
													{/if}
													<span class="text-[10px] text-slate-400 shrink-0 {person.company ? '' : 'ml-auto'}">{person.codeNo || ''}</span>
												</button>
											{/each}
										</div>
									{:else}
										<p class="text-center text-xs text-slate-400 py-6">
											{genPeopleSearch ? 'No people matching your search' : 'No people in this category'}
										</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</Card.Root>

			<!-- Save bar (when edits exist) -->
			{#if hasEdits}
				<div class="sticky top-28 z-30 flex items-center justify-between rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-3 shadow-sm">
					<span class="text-sm font-bold text-amber-700">You have unsaved changes ({editableEntries.size} modified)</span>
					<div class="flex gap-2">
						<Button
							variant="ghost"
							class="font-bold text-slate-500 cursor-pointer"
							onclick={() => editableEntries = new Map()}
						>
							Discard
						</Button>
						<Button
							class="cursor-pointer gap-2 rounded-xl bg-primary-600 px-6 font-black text-white hover:bg-primary-700"
							onclick={handleSave}
							disabled={isSaving}
						>
							{#if isSaving}
								<Loader2 size={16} class="animate-spin" />
							{/if}
							{i18n.t('save')}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Results Table -->
			<div class="space-y-4">
				{#if data.entries.length > 0}
					<div class="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b-2 border-slate-100 bg-slate-50">
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">#</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('name')}</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('codeNo')}</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('category')}</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('company')}</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('entryTime')}</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('exitTime')}</th>
									<th class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('purpose')}</th>
									<th class="px-4 py-3 text-right text-[10px] font-black tracking-widest text-slate-400 uppercase">{i18n.t('actions')}</th>
								</tr>
							</thead>
							<tbody>
								{#each data.entries as entry, index (entry.id)}
									{@const entryWarning = hasEntryWarning(entry.entryTime)}
									{@const exitWarning = hasExitWarning(entry.exitTime)}
									{@const hasWarning = entryWarning || exitWarning}
									<tr class={clsx(
										'border-b border-slate-50 transition-colors hover:bg-slate-50',
										hasWarning && 'bg-amber-50/50'
									)}>
										<td class="px-4 py-3 text-slate-500 font-bold">{index + 1}</td>
										<td class="px-4 py-3">
											<span class="font-black text-slate-900">{entry.person.name}</span>
										</td>
										<td class="px-4 py-3 text-slate-600 font-bold">{entry.person.codeNo || '-'}</td>
										<td class="px-4 py-3">
											<div class="flex gap-1">
												{#each getCategoryPath(entry.person.categoryId) as cat, i (cat.id)}
													<Badge
														variant="outline"
														class={cn(
															'h-5 px-1.5 text-[9px] font-black tracking-wider uppercase',
															getCategoryLevelClass(i)
														)}
													>
														{i18n.t(cat.slug as any) || cat.name}
													</Badge>
												{/each}
											</div>
										</td>
										<td class="px-4 py-3 text-slate-600 font-bold">{entry.person.company || '-'}</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-1.5">
												{#if entryWarning}
													<span title="Entry before {warnEntryBefore} BD time" class="text-amber-500">
														<AlertTriangle size={14} />
													</span>
												{/if}
												<input
													type="time"
													value={getEntryTime(entry)}
													onchange={(e) => updateEntryField(entry.id, 'entryTime', (e.target as HTMLInputElement).value)}
													class={clsx(
														'rounded-lg border px-2 py-1 text-sm font-bold focus:border-primary-500 focus:outline-none w-28',
														entryWarning ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
													)}
												/>
											</div>
										</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-1.5">
												{#if exitWarning}
													<span title="Exit after {warnExitAfter} BD time" class="text-amber-500">
														<AlertTriangle size={14} />
													</span>
												{/if}
												<input
													type="time"
													value={getExitTime(entry)}
													onchange={(e) => updateEntryField(entry.id, 'exitTime', (e.target as HTMLInputElement).value)}
													class={clsx(
														'rounded-lg border px-2 py-1 text-sm font-bold focus:border-primary-500 focus:outline-none w-28',
														exitWarning ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
													)}
												/>
											</div>
										</td>
										<td class="px-4 py-3">
											<input
												type="text"
												value={getPurpose(entry)}
												onchange={(e) => updateEntryField(entry.id, 'purpose', (e.target as HTMLInputElement).value)}
												placeholder="—"
												class="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm font-bold focus:border-primary-500 focus:outline-none min-w-[100px]"
											/>
										</td>
										<td class="px-4 py-3 text-right">
											<button
												class="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 cursor-pointer"
												onclick={() => handleRemove(entry.id)}
												title={i18n.t('removeEntry')}
											>
												<X size={16} />
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<!-- Summary -->
					<div class="flex items-center justify-between rounded-2xl bg-slate-50 px-5 py-3">
						<span class="text-sm font-bold text-slate-500">
							{i18n.t('total')}: <span class="text-slate-900 font-black">{data.entries.length}</span> entries
						</span>
					</div>
				{:else}
					<div class="py-24 text-center space-y-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
						<div class="size-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
							<Users size={48} />
						</div>
						<div class="space-y-2">
							<p class="text-xl font-black text-slate-600">{i18n.t('noData')}</p>
							<p class="text-slate-400 text-sm font-bold uppercase tracking-widest">
								Open the generation panel above to create audit entries
							</p>
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>

<ConfirmModal
	bind:open={isClearConfirmOpen}
	title="Clear All Entries"
	message="Are you sure you want to delete all audit entries for {selectedDate}? This action cannot be undone."
	confirmText="Clear All"
	cancelText={i18n.t('cancel')}
	variant="warning"
	onconfirm={handleClear}
/>
