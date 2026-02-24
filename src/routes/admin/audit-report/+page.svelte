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
	import logo from '$lib/assets/kr_logo.svg';
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
	let isClearConfirmOpen = $state(false);
	let debounceTimer: any;

	// Generation panel state
	let genCategoryId = $state('');
	let entryRangeStart = $state('07:45');
	let entryRangeEnd = $state('08:15');
	let exitRangeStart = $state('16:45');
	let exitRangeEnd = $state('17:15');
	let genLocation = $state('yard');
	let selectedPersonIds = $state<Set<string>>(new Set());
	let useRealEntry = $state(false);
	let isGenerating = $state(false);

	// Warning thresholds (BD time hours)
	let warnEntryBefore = $state('08:00');
	let warnExitAfter = $state('18:00');

	// People list search in generation panel
	let genPeopleSearch = $state('');

	// People filtered by generation category
	const genCategoryFiltered = $derived.by(() => {
		if (!genCategoryId) return data.allPeople;
		const descendantIds = getDescendantIds(genCategoryId);
		return data.allPeople.filter((p) => descendantIds.includes(p.categoryId));
	});

	const genFilteredPeople = $derived.by(() => {
		const q = genPeopleSearch.trim().toLowerCase();
		if (!q) return genCategoryFiltered;
		return genCategoryFiltered.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				(p.codeNo && p.codeNo.toLowerCase().includes(q)) ||
				(p.company && p.company.toLowerCase().includes(q))
		);
	});

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
	let editableEntries = $state<
		Map<
			string,
			{ entryTime: string; exitTime: string; purpose: string; isTrained: boolean; location: string }
		>
	>(new Map());

	$effect(() => {
		selectedDate = data.filters.date;
		searchQuery = data.filters.query;
	});

	// Active root for generation panel subcategory display
	const activeGenRoot = $derived.by(() => {
		if (!genCategoryId) return '';
		if (ROOT_CATEGORIES.some((c) => c.id === genCategoryId)) return genCategoryId;
		const parent = ROOT_CATEGORIES.find((c) =>
			getSubCategories(c.id).some((sc) => sc.id === genCategoryId)
		);
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
		const filtered = new Set(genFilteredPeople.map((p) => p.id));
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
		return genFilteredPeople.filter((p) => data.realLogMap[p.id]).length;
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

	function getLocation(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) return edited.location;
		return entry.location || 'yard';
	}

	function getIsTrained(entry: any): boolean {
		const edited = editableEntries.get(entry.id);
		if (edited) return edited.isTrained;
		return entry.isTrained;
	}

	async function updateEntryField(
		entryId: string,
		field: 'entryTime' | 'exitTime' | 'purpose' | 'isTrained' | 'location',
		value: any
	) {
		const entry = data.entries.find((e) => e.id === entryId);
		if (!entry) return;

		// Update local state for immediate UI feedback
		const existing = editableEntries.get(entryId);
		const current = existing || {
			entryTime: format(entry.entryTime, 'HH:mm'),
			exitTime: entry.exitTime ? format(entry.exitTime, 'HH:mm') : '',
			purpose: entry.purpose || '',
			isTrained: entry.isTrained,
			location: entry.location || 'yard'
		};

		const newMap = new Map(editableEntries);
		newMap.set(entryId, { ...current, [field]: value });
		editableEntries = newMap;

		// Save to database in background
		const formData = new FormData();
		formData.set('id', entryId);
		formData.set('field', field);
		formData.set('value', value.toString());
		formData.set('date', selectedDate);

		try {
			await fetch('?/update', {
				method: 'POST',
				body: formData
			});
			// No invalidateAll to keep it non-blocking and smooth
		} catch (e) {
			console.error('Failed to update entry', e);
		}
	}

	// Print
	function printReport() {
		window.print();
	}

	function getPrintEntryTime(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) {
			return format(new Date(`${selectedDate}T${edited.entryTime}:00`), 'hh:mm a');
		}
		return format(entry.entryTime, 'hh:mm a');
	}

	function getPrintExitTime(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) {
			if (!edited.exitTime) return '-';
			return format(new Date(`${selectedDate}T${edited.exitTime}:00`), 'hh:mm a');
		}
		return entry.exitTime ? format(entry.exitTime, 'hh:mm a') : '-';
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
		formData.set('location', genLocation);

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
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>{i18n.t('name')}</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>{i18n.t('category')}</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Location</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Safety Trained</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>{i18n.t('entryTime')}</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>{i18n.t('exitTime')}</th
				>
			</tr>
		</thead>
		<tbody>
			{#each data.entries as entry, index (entry.id)}
				{@const rootCat = getCategoryPath(entry.person.categoryId)[0]}
				<tr>
					<td style="border: 1px solid #ddd; padding: 8px;">{index + 1}</td>
					<td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;"
						>{entry.person.name}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{i18n.t(rootCat.slug as any) || rootCat.name}</td
					>
					<td
						style="border: 1px solid #ddd; padding: 8px; font-weight: 700; text-transform: uppercase;"
						>{getLocation(entry)}</td
					>
					<td
						style="border: 1px solid #ddd; padding: 8px; font-weight: 700; color: {getIsTrained(
							entry
						)
							? '#16a34a'
							: '#dc2626'};"
					>
						{getIsTrained(entry) ? 'TRAINED' : 'TO BE VERIFIED'}
					</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{getPrintEntryTime(entry)}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{getPrintExitTime(entry)}</td>
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

<!-- Screen view -->
<div class="no-print pb-20">
	<!-- Main Content Area -->
	<div class="content-container space-y-6">
		<div class="flex flex-col justify-between gap-4 px-4 md:flex-row md:items-end md:px-0">
			<div class="space-y-1">
				<h1 class="text-3xl font-black tracking-tighter text-slate-900 capitalize">
					<span class="electric-text">{i18n.t('auditReport')}</span>
				</h1>
				<p class="text-sm font-bold text-slate-500">
					Manage and generate security audit logs for official reporting.
				</p>
			</div>

			<div
				class="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-2 shadow-sm"
			>
				<span class="pl-2 text-[10px] font-black tracking-widest text-slate-400 uppercase"
					>Reporting Date</span
				>
				<input
					type="date"
					value={selectedDate}
					onchange={changeDate}
					class="h-10 cursor-pointer rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-black transition-colors hover:bg-white focus:border-primary-500 focus:outline-none"
				/>
			</div>
		</div>

		<main class="space-y-6">
			<!-- Generation Panel (Collapsible) -->
			<Card.Root class="overflow-hidden border-2 border-slate-100 bg-white shadow-sm">
				<div class="flex w-full items-center justify-between p-5">
					<button
						class="flex flex-1 cursor-pointer items-center gap-3 text-left"
						onclick={() => (isGenerationOpen = !isGenerationOpen)}
					>
						<div class="rounded-xl bg-primary-100 p-2 text-primary-600">
							<Users size={20} />
						</div>
						<div>
							<h3 class="text-sm font-black text-slate-900">{i18n.t('generationPanel')}</h3>
							<p class="text-xs font-bold text-slate-400">
								Generate audit entries with randomized times
							</p>
						</div>
						{#if isGenerationOpen}
							<ChevronUp size={20} class="text-slate-400" />
						{:else}
							<ChevronDown size={20} class="text-slate-400" />
						{/if}
					</button>

					<div class="flex items-center gap-2 border-l-2 border-slate-50 pl-4">
						{#if data.entries.length > 0}
							<Button
								variant="ghost"
								size="sm"
								class="h-9 cursor-pointer gap-1.5 rounded-lg font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600"
								onclick={() => (isClearConfirmOpen = true)}
							>
								<Trash2 size={14} />
								{i18n.t('clearAll')}
							</Button>
						{/if}
					</div>
				</div>

				{#if isGenerationOpen}
					<div
						class="border-t border-slate-100"
						transition:slide={{ duration: 150, easing: cubicOut }}
					>
						<!-- Two-column layout: Settings left, People right -->
						<div
							class="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-[1fr_1.2fr] lg:divide-x lg:divide-y-0"
						>
							<!-- Left Column: Settings -->
							<div class="flex flex-col gap-8 p-6">
								<!-- Step 1: Category -->
								<div class="space-y-4">
									<div class="flex flex-wrap gap-1.5">
										<button
											class={clsx(
												'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
												genCategoryId === ''
													? 'bg-primary-600 text-white shadow-sm'
													: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
											)}
											onclick={() => (genCategoryId = '')}
										>
											{i18n.t('all')} ({data.allPeople.length})
										</button>
										{#each ROOT_CATEGORIES as cat (cat.id)}
											{@const isActive =
												genCategoryId === cat.id ||
												getSubCategories(cat.id).some((sc) => sc.id === genCategoryId)}
											{@const catCount = data.allPeople.filter((p) =>
												getDescendantIds(cat.id).includes(p.categoryId)
											).length}
											<button
												class={clsx(
													'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold transition-all',
													isActive
														? 'bg-primary-100 text-primary-700'
														: 'bg-slate-100 text-slate-600 hover:bg-slate-200'
												)}
												onclick={() => (genCategoryId = cat.id)}
											>
												{i18n.t(cat.slug as any) || cat.name} ({catCount})
											</button>
										{/each}
									</div>
									{#if activeGenRoot && activeGenSubs.length > 0}
										<div
											class="mt-2 flex flex-wrap gap-1.5 border-l-2 border-primary-200 pl-3"
											transition:slide={{ duration: 200, easing: sineInOut }}
										>
											<button
												class={clsx(
													'cursor-pointer rounded-full px-3 py-1 text-[10px] font-bold transition-all',
													genCategoryId === activeGenRoot
														? 'bg-primary-500 text-white shadow-sm'
														: 'bg-slate-50 text-slate-500 hover:bg-slate-100'
												)}
												onclick={() => (genCategoryId = activeGenRoot)}
												>All {i18n.t(getCategoryById(activeGenRoot)?.slug as any)}</button
											>
											{#each activeGenSubs as sub (sub.id)}
												{@const subCount = data.allPeople.filter(
													(p) => p.categoryId === sub.id
												).length}
												<button
													class={clsx(
														'cursor-pointer rounded-full px-3 py-1 text-[10px] font-bold transition-all',
														genCategoryId === sub.id
															? 'bg-primary-500 text-white shadow-sm'
															: 'bg-slate-50 text-slate-500 hover:bg-slate-100'
													)}
													onclick={() => (genCategoryId = sub.id)}
												>
													{i18n.t(sub.slug as any) || sub.name} ({subCount})
												</button>
											{/each}
										</div>
									{/if}
								</div>

								<!-- Step 2: Time Configuration -->
								<div class="space-y-4">
									<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
										<!-- Entry Block -->
										<div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
											<span class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
												>{i18n.t('entryTime')} Range</span
											>
											<div class="flex items-center gap-2">
												<input
													type="time"
													bind:value={entryRangeStart}
													class="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-black focus:border-primary-500 focus:outline-none"
												/>
												<span class="text-xs font-bold text-slate-300">to</span>
												<input
													type="time"
													bind:value={entryRangeEnd}
													class="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-black focus:border-primary-500 focus:outline-none"
												/>
											</div>
											<div class="flex items-center justify-between border-t border-slate-100 pt-2">
												<span
													class="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase"
												>
													<AlertTriangle size={10} />
													Warning Before
												</span>
												<input
													type="time"
													bind:value={warnEntryBefore}
													class="w-24 rounded-lg border-2 border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700 focus:border-amber-400 focus:outline-none"
												/>
											</div>
										</div>

										<!-- Exit Block -->
										<div class="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
											<span class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
												>{i18n.t('exitTime')} Range</span
											>
											<div class="flex items-center gap-2">
												<input
													type="time"
													bind:value={exitRangeStart}
													class="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-black focus:border-primary-500 focus:outline-none"
												/>
												<span class="text-xs font-bold text-slate-300">to</span>
												<input
													type="time"
													bind:value={exitRangeEnd}
													class="flex-1 rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-black focus:border-primary-500 focus:outline-none"
												/>
											</div>
											<div class="flex items-center justify-between border-t border-slate-100 pt-2">
												<span
													class="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase"
												>
													<AlertTriangle size={10} />
													Warning After
												</span>
												<input
													type="time"
													bind:value={warnExitAfter}
													class="w-24 rounded-lg border-2 border-amber-100 bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700 focus:border-amber-400 focus:outline-none"
												/>
											</div>
										</div>
									</div>

									<div class="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
										<span class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
											>Default Location</span
										>
										<div class="mt-2 flex gap-2">
											<button
												class={clsx(
													'flex-1 rounded-xl border-2 py-2 text-xs font-black transition-all',
													genLocation === 'ship'
														? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-600/20'
														: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
												)}
												onclick={() => (genLocation = 'ship')}
											>
												SHIP
											</button>
											<button
												class={clsx(
													'flex-1 rounded-xl border-2 py-2 text-xs font-black transition-all',
													genLocation === 'yard'
														? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-600/20'
														: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
												)}
												onclick={() => (genLocation = 'yard')}
											>
												YARD
											</button>
										</div>
										<p class="mt-2 text-[10px] font-bold text-slate-400">
											Used if real entry location is not available or "Use Real Entry Time" is off.
										</p>
									</div>
								</div>
							</div>

							<!-- Right Column: People Selection -->
							<div class="flex flex-col p-6">
								<div class="flex flex-1 flex-col gap-3">
									<div
										class="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3"
									>
										<span class="text-[10px] font-black tracking-widest text-slate-500 uppercase">
											Selected: <span class="ml-1 text-sm text-primary-600"
												>{selectedPersonIds.size}</span
											>
											<span class="mx-1 text-slate-300">/</span>
											{genCategoryFiltered.length}
										</span>
										<div class="flex items-center gap-1.5">
											{#if presentCount > 0}
												<button
													class="flex cursor-pointer items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-600 transition-all hover:bg-emerald-100"
													onclick={selectPresent}
												>
													<CheckSquare size={12} />
													Present ({presentCount})
												</button>
											{/if}
											<button
												class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
												onclick={selectAll}
											>
												<CheckSquare size={12} />
												All
											</button>
											<button
												class="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
												onclick={deselectAll}
											>
												<Square size={12} />
												None
											</button>
										</div>
									</div>

									<!-- Search -->
									<div class="relative">
										<Search
											size={16}
											class="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
										/>
										<input
											type="text"
											bind:value={genPeopleSearch}
											placeholder={i18n.t('searchPeoplePlaceholder')}
											class="w-full rounded-2xl border-2 border-slate-200 bg-white py-2.5 pr-9 pl-10 text-sm font-bold transition-all placeholder:text-slate-400 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 focus:outline-none"
										/>
										{#if genPeopleSearch}
											<button
												class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
												onclick={() => (genPeopleSearch = '')}
											>
												<X size={14} />
											</button>
										{/if}
									</div>

									<!-- Virtual list -->
									<div
										bind:this={peopleListEl}
										onscroll={(e) => (scrollTop = (e.target as HTMLDivElement).scrollTop)}
										class="max-h-[20rem] overflow-y-auto rounded-2xl border-2 border-slate-100 bg-white shadow-inner"
									>
										{#if genFilteredPeople.length > 0}
											<div style="height: {virtualSlice.totalHeight}px; position: relative;">
												{#each genFilteredPeople.slice(virtualSlice.startIdx, virtualSlice.endIdx) as person, i (person.id)}
													{@const isSelected = selectedPersonIds.has(person.id)}
													{@const isPresent = !!data.realLogMap[person.id]}
													<button
														class={clsx(
															'absolute inset-x-0 flex w-full cursor-pointer items-center gap-3 px-4 text-left text-xs transition-colors',
															isSelected
																? 'bg-primary-50/50 text-primary-700'
																: 'text-slate-600 hover:bg-slate-50'
														)}
														style="height: {ITEM_HEIGHT}px; top: {(virtualSlice.startIdx + i) *
															ITEM_HEIGHT}px;"
														onclick={() => togglePerson(person.id)}
													>
														<div
															class={clsx(
																'flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all',
																isSelected
																	? 'border-primary-600 bg-primary-600 shadow-sm'
																	: 'border-slate-200 bg-white'
															)}
														>
															{#if isSelected}
																<svg
																	class="size-3 text-white"
																	viewBox="0 0 12 12"
																	fill="none"
																	stroke="currentColor"
																	stroke-width="3"
																>
																	<path d="M2 6l3 3 5-5" />
																</svg>
															{/if}
														</div>
														<span class={cn('truncate', isSelected ? 'font-black' : 'font-bold')}
															>{person.name}</span
														>
														{#if isPresent}
															<Badge
																class="h-4 border-emerald-200 bg-emerald-100 px-1 text-[8px] font-black text-emerald-700"
																>PRESENT</Badge
															>
														{/if}
														<span class="ml-auto shrink-0 text-[10px] font-medium text-slate-400"
															>{person.codeNo || ''}</span
														>
													</button>
												{/each}
											</div>
										{:else}
											<div class="flex flex-col items-center justify-center py-12 text-center">
												<div
													class="mb-2 flex size-12 items-center justify-center rounded-full bg-slate-50 text-slate-300"
												>
													<Users size={24} />
												</div>
												<p class="text-xs font-bold text-slate-400">
													{genPeopleSearch ? 'No matches found' : 'Category is empty'}
												</p>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</div>

						<!-- New Sticky-ish Footer for Actions -->
						<div
							class="flex flex-col items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/80 p-5 sm:flex-row"
						>
							<div class="flex flex-wrap items-center gap-6">
								<label class="group flex cursor-pointer items-center gap-2">
									<div class="relative flex h-5 w-5 items-center justify-center">
										<input
											type="checkbox"
											bind:checked={useRealEntry}
											class="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 bg-white transition-all checked:border-primary-600 checked:bg-primary-600"
										/>
										<svg
											class="pointer-events-none absolute size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
											viewBox="0 0 12 12"
											fill="none"
											stroke="currentColor"
											stroke-width="3"
										>
											<path d="M2 6l3 3 5-5" />
										</svg>
									</div>
									<span
										class="text-sm font-black text-slate-600 transition-colors group-hover:text-slate-900"
										>{i18n.t('useRealEntryTime')}</span
									>
								</label>
							</div>

							<div class="flex w-full items-center gap-3 sm:w-auto">
								<Button
									class="h-12 flex-1 cursor-pointer gap-2 rounded-xl bg-primary-600 px-10 text-base font-black text-white shadow-lg shadow-primary-600/20 transition-all hover:bg-primary-700 active:scale-[0.98] disabled:opacity-50 sm:flex-initial"
									onclick={handleGenerate}
									disabled={isGenerating || selectedPersonIds.size === 0}
								>
									{#if isGenerating}
										<Loader2 size={20} class="animate-spin" />
										<span>Generating...</span>
									{:else}
										<CheckSquare size={20} />
										<span>{i18n.t('generate')} ({selectedPersonIds.size})</span>
									{/if}
								</Button>
							</div>
						</div>
					</div>
				{/if}
			</Card.Root>

			<!-- Results Table -->
			<div class="space-y-4">
				<div class="flex items-center justify-between gap-4 px-4 md:px-0">
					<div class="group relative max-w-md flex-1">
						<div
							class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
						>
							<Search size={18} />
						</div>
						<Input
							bind:value={searchQuery}
							oninput={handleSearchInput}
							placeholder={i18n.t('searchHistoryPlaceholder')}
							class="h-11 w-full rounded-2xl border-2 border-slate-200 bg-white pr-10 pl-11 text-sm font-bold shadow-sm transition-all focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10"
						/>
						{#if searchQuery}
							<button
								class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100"
								onclick={() => {
									searchQuery = '';
									applyFilters();
								}}
							>
								<X size={14} />
							</button>
						{/if}
					</div>

					<Button
						variant="outline"
						class="h-11 shrink-0 gap-2 rounded-2xl border-2 border-slate-200 px-6 font-black transition-all hover:border-primary-300 hover:bg-primary-50"
						onclick={printReport}
					>
						<Printer size={18} />
						<span>{i18n.t('printReport')}</span>
					</Button>
				</div>

				{#if data.entries.length > 0}
					<div class="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
						<table class="w-full text-sm">
							<thead>
								<tr class="border-b-2 border-slate-100 bg-slate-50">
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>#</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('name')}</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('codeNo')}</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('category')}</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Location</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Safety Trained</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('entryTime')}</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('exitTime')}</th
									>
									<th
										class="px-4 py-3 text-right text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('actions')}</th
									>
								</tr>
							</thead>
							<tbody>
								{#each data.entries as entry, index (entry.id)}
									{@const entryWarning = hasEntryWarning(entry.entryTime)}
									{@const exitWarning = hasExitWarning(entry.exitTime)}
									{@const hasWarning = entryWarning || exitWarning}
									<tr
										class={clsx(
											'border-b border-slate-50 transition-colors hover:bg-slate-50',
											hasWarning && 'bg-amber-50/50'
										)}
									>
										<td class="px-4 py-3 font-bold text-slate-500">{index + 1}</td>
										<td class="px-4 py-3">
											<span class="font-black text-slate-900">{entry.person.name}</span>
										</td>
										<td class="px-4 py-3 font-bold text-slate-600">{entry.person.codeNo || '-'}</td>
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
										<td class="px-4 py-3">
											<div class="flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-0.5">
												<button
													class={cn(
														'rounded-md px-2 py-0.5 text-[9px] font-black uppercase transition-all',
														getLocation(entry) === 'ship'
															? 'bg-white text-primary-600 shadow-sm'
															: 'text-slate-400 hover:text-slate-600'
													)}
													onclick={() => updateEntryField(entry.id, 'location', 'ship')}
												>
													SHIP
												</button>
												<button
													class={cn(
														'rounded-md px-2 py-0.5 text-[9px] font-black uppercase transition-all',
														getLocation(entry) === 'yard'
															? 'bg-white text-primary-600 shadow-sm'
															: 'text-slate-400 hover:text-slate-600'
													)}
													onclick={() => updateEntryField(entry.id, 'location', 'yard')}
												>
													YARD
												</button>
											</div>
										</td>
										<td class="px-4 py-3">
											<label class="group flex cursor-pointer items-center gap-2">
												<div class="relative flex h-5 w-5 items-center justify-center">
													<input
														type="checkbox"
														checked={getIsTrained(entry)}
														onchange={(e) =>
															updateEntryField(
																entry.id,
																'isTrained',
																(e.target as HTMLInputElement).checked
															)}
														class="peer h-5 w-5 cursor-pointer appearance-none rounded-lg border-2 border-slate-200 bg-white transition-all checked:border-primary-600 checked:bg-primary-600"
													/>
													<svg
														class="pointer-events-none absolute size-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
														viewBox="0 0 12 12"
														fill="none"
														stroke="currentColor"
														stroke-width="3"
													>
														<path d="M2 6l3 3 5-5" />
													</svg>
												</div>
												<span
													class={cn(
														'text-xs font-black transition-colors',
														getIsTrained(entry) ? 'text-emerald-600' : 'text-slate-400'
													)}
												>
													{getIsTrained(entry) ? 'TRAINED' : 'PENDING'}
												</span>
											</label>
										</td>
										<td class="px-4 py-3">
											<div class="flex items-center gap-1.5">
												{#if entryWarning}
													<span
														title="Entry before {warnEntryBefore} BD time"
														class="text-amber-500"
													>
														<AlertTriangle size={14} />
													</span>
												{/if}
												<input
													type="time"
													value={getEntryTime(entry)}
													onchange={(e) =>
														updateEntryField(
															entry.id,
															'entryTime',
															(e.target as HTMLInputElement).value
														)}
													class={clsx(
														'w-28 rounded-lg border px-2 py-1 text-sm font-bold focus:border-primary-500 focus:outline-none',
														entryWarning
															? 'border-amber-300 bg-amber-50'
															: 'border-slate-200 bg-white'
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
													onchange={(e) =>
														updateEntryField(
															entry.id,
															'exitTime',
															(e.target as HTMLInputElement).value
														)}
													class={clsx(
														'w-28 rounded-lg border px-2 py-1 text-sm font-bold focus:border-primary-500 focus:outline-none',
														exitWarning
															? 'border-amber-300 bg-amber-50'
															: 'border-slate-200 bg-white'
													)}
												/>
											</div>
										</td>
										<td class="px-4 py-3 text-right">
											<button
												class="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500"
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
							{i18n.t('total')}:
							<span class="font-black text-slate-900">{data.entries.length}</span> entries
						</span>
					</div>
				{:else}
					<div
						class="space-y-6 rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center"
					>
						<div
							class="mx-auto flex size-24 items-center justify-center rounded-full bg-slate-100 text-slate-300"
						>
							<Users size={48} />
						</div>
						<div class="space-y-2">
							<p class="text-xl font-black text-slate-600">{i18n.t('noData')}</p>
							<p class="text-sm font-bold tracking-widest text-slate-400 uppercase">
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
