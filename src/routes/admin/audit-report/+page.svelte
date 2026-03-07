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
	import VirtualList from 'svelte-virtual-list';
	import { utils, writeFile } from 'xlsx';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	// Visibility toggles for report columns
	let showEntryTime = $state(true);
	let showExitTime = $state(true);
	let showJoinDate = $state(true);

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

	// Editable entries (local state for inline editing)
	let editableEntries = $state<
		Map<
			string,
			{
				entryTime: string;
				exitTime: string;
				purpose: string;
				isTrained: boolean;
				location: string;
				identityNo: string;
			}
		>
	>(new Map());

	$effect(() => {
		selectedDate = data.filters.date;
		searchQuery = data.filters.query;
	});

	const isEmployeeFilter = $derived.by(() => {
		// Show ID NO if there are any employees in the current list
		return data.entries.some((entry) =>
			getCategoryPath(entry.person.categoryId).some((c) => c.id === 'employee')
		);
	});

	// Grouping and Sorting for Print
	const groupedEntries = $derived.by(() => {
		const entriesWithState = data.entries.map((entry) => ({
			...entry,
			currentIdentityNo: getIdentityNo(entry)
		}));

		// Sort all entries first: Root -> Subcategory -> identityNo
		entriesWithState.sort((a, b) => {
			const pathA = getCategoryPath(a.person.categoryId);
			const pathB = getCategoryPath(b.person.categoryId);
			const rootA = pathA[0]?.id || '';
			const rootB = pathB[0]?.id || '';

			// 1. Root Category Priority (Employee first)
			const getRootOrder = (id: string) => {
				if (id === 'employee') return 1;
				if (id === 'customer') return 2;
				if (id === 'vendor') return 3;
				if (id === 'card') return 4;
				return 99;
			};
			const rootOrderA = getRootOrder(rootA);
			const rootOrderB = getRootOrder(rootB);
			if (rootOrderA !== rootOrderB) return rootOrderA - rootOrderB;

			// 2. Subcategory Priority (Management -> Frontliner -> Others)
			const getSubOrder = (id: string) => {
				if (id === 'management') return 1;
				if (id === 'frontliner') return 2;
				return 99;
			};
			const subOrderA = getSubOrder(a.person.categoryId);
			const subOrderB = getSubOrder(b.person.categoryId);
			if (subOrderA !== subOrderB) return subOrderA - subOrderB;

			// If subcategory is still different, sort by name
			if (a.person.categoryId !== b.person.categoryId) {
				const nameA = getCategoryById(a.person.categoryId)?.name || '';
				const nameB = getCategoryById(b.person.categoryId)?.name || '';
				return nameA.localeCompare(nameB);
			}

			// 3. Identity Number Sorting (Numeric)
			const idA = a.currentIdentityNo || '';
			const idB = b.currentIdentityNo || '';
			const numA = parseInt(idA.replace(/\D/g, ''));
			const numB = parseInt(idB.replace(/\D/g, ''));

			if (!isNaN(numA) && !isNaN(numB)) {
				if (numA !== numB) return numA - numB;
			}
			return idA.localeCompare(idB, undefined, { numeric: true });
		});

		// Group them for logic consistency (even if flattened in UI)
		const groups: {
			categoryId: string;
			categoryName: string;
			entries: typeof entriesWithState;
		}[] = [];
		for (const entry of entriesWithState) {
			let group = groups.find((g) => g.categoryId === entry.person.categoryId);
			if (!group) {
				const cat = getCategoryById(entry.person.categoryId);
				group = {
					categoryId: entry.person.categoryId,
					categoryName: cat ? cat.name : 'Other',
					entries: []
				};
				groups.push(group);
			}
			group.entries.push(entry);
		}
		return groups;
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
		url.searchParams.delete('category');
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
	function getIdentityNo(entry: any): string {
		const edited = editableEntries.get(entry.id);
		if (edited) return edited.identityNo;
		return entry.identityNo || entry.person.codeNo || '';
	}

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
		field: 'entryTime' | 'exitTime' | 'purpose' | 'isTrained' | 'location' | 'identityNo',
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
			location: entry.location || 'yard',
			identityNo: entry.identityNo || entry.person.codeNo || ''
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

	function exportToExcel() {
		const flatEntries = groupedEntries.flatMap((g) => g.entries);
		const dataRows = flatEntries.map((entry, index) => {
			const rootCat = getCategoryPath(entry.person.categoryId)[0];
			const isEmployeeEntry = getCategoryPath(entry.person.categoryId).some(
				(c) => c.id === 'employee'
			);
			const subCat = getCategoryById(entry.person.categoryId);
			const displayCategory = isEmployeeEntry
				? i18n.t(subCat?.slug as any) || subCat?.name
				: i18n.t(rootCat.slug as any) || rootCat.name;

			const row: any = {
				'#': index + 1,
				Name: entry.person.name
			};

			row['Category'] = displayCategory;
			row['Location'] = (entry.location || 'yard').toUpperCase();
			row['Training'] = entry.isTrained ? 'TRAINED' : 'PENDING';

			if (showEntryTime) {
				row['Entry Time'] = getPrintEntryTime(entry);
			}
			if (showExitTime) {
				row['Exit Time'] = getPrintExitTime(entry);
			}

			return row;
		});

		const worksheet = utils.json_to_sheet(dataRows);
		const workbook = utils.book_new();
		utils.book_append_sheet(workbook, worksheet, 'Audit Report');

		// Set column widths
		const wscols = [
			{ wch: 5 },
			{ wch: 25 },
			{ wch: 15 },
			{ wch: 20 },
			{ wch: 10 },
			{ wch: 10 },
			{ wch: 15 },
			{ wch: 15 }
		];
		worksheet['!cols'] = wscols;

		writeFile(workbook, `Audit_Report_${selectedDate}.xlsx`);
	}

	function getPrintEntryTime(entry: any): string {
		const timeStr = getEntryTime(entry);
		if (!selectedDate || !timeStr) return timeStr || '-';
		const d = new Date(`${selectedDate}T${timeStr}:00`);
		if (isNaN(d.getTime())) return timeStr;
		return format(d, 'hh:mm a');
	}

	function getPrintExitTime(entry: any): string {
		const timeStr = getExitTime(entry);
		if (!selectedDate || !timeStr) return timeStr || '-';
		const d = new Date(`${selectedDate}T${timeStr}:00`);
		if (isNaN(d.getTime())) return timeStr;
		return format(d, 'hh:mm a');
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
<div class="print-only">
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
				Audit Report
			</h2>
			<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
				{format(new Date(), 'PPPP')} | {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 0;">
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Log Date</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">{selectedDate}</span>
		</div>
		
		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 0 3rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Total Records</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.entries.length} Entries</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Report Type</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">Security Audit Log</span>
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: inherit; border: 1px solid #000;">
		<thead>
			<tr style="background: #f0f0f0; -webkit-print-color-adjust: exact;">
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">#</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">{i18n.t('name')}</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">{i18n.t('category')}</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Dept.</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Location</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Training</th>
				{#if showJoinDate}
					<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Joined</th>
				{/if}
				{#if showEntryTime}
					<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">{i18n.t('entryTime')}</th>
				{/if}
				{#if showExitTime}
					<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">{i18n.t('exitTime')}</th>
				{/if}
			</tr>
		</thead>
		<tbody>
			{#each groupedEntries.flatMap((g) => g.entries) as entry, index}
				{@const rootCat = getCategoryPath(entry.person.categoryId)[0]}
				{@const isEmployeeEntry = getCategoryPath(entry.person.categoryId).some(
					(c) => c.id === 'employee'
				)}
				{@const subCat = getCategoryById(entry.person.categoryId)}
				{@const displayCategory = isEmployeeEntry
					? i18n.t(subCat?.slug as any) || subCat?.name
					: i18n.t(rootCat.slug as any) || rootCat.name}
				<tr style="page-break-inside: avoid;">
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{index + 1}</td>
					<td style="border: 1px solid #000; padding: 6px; font-weight: 800; color: #000;"
						>{entry.person.name}</td
					>
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{displayCategory}</td>
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{entry.person.department || '-'}</td>
					<td
						style="border: 1px solid #000; padding: 6px; text-transform: uppercase; font-weight: 800; color: #000;"
						>{getLocation(entry)}</td
					>
					<td
						style="border: 1px solid #000; padding: 6px; font-weight: 800; color: #000;"
					>
						{getIsTrained(entry) ? 'TRAINED' : 'PENDING'}
					</td>
					{#if showJoinDate}
						<td style="border: 1px solid #000; padding: 6px; color: #000;">
							{entry.person.auditJoinDate ? format(entry.person.auditJoinDate, 'dd-MM-yyyy') : '-'}
						</td>
					{/if}
					{#if showEntryTime}
						<td style="border: 1px solid #000; padding: 6px; color: #000;"
							>{getPrintEntryTime(entry)}</td
						>
					{/if}
					{#if showExitTime}
						<td style="border: 1px solid #000; padding: 6px; color: #000;"
							>{getPrintExitTime(entry)}</td
						>
					{/if}
				</tr>
			{/each}
		</tbody>
	</table>

	<div
		style="margin-top: 3rem; padding-top: 1rem; border-top: 1px dashed #000; display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.1em;"
	>
		<p>System Generated: {new Date().toISOString()}</p>
		<p>{i18n.t('appName')} Official Report</p>
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

			<div class="flex flex-wrap items-center gap-3">
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
													genLocation === 'yard'
														? 'border-primary-600 bg-primary-600 text-white shadow-md shadow-primary-600/20'
														: 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
												)}
												onclick={() => (genLocation = 'yard')}
											>
												YARD
											</button>
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
									<div class="h-[20rem] overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-inner">
										{#if genFilteredPeople.length > 0}
											<VirtualList items={genFilteredPeople} height="20rem" let:item={person}>
												{@const isSelected = selectedPersonIds.has(person.id)}
												{@const isPresent = !!data.realLogMap[person.id]}
												<button
													class={clsx(
														'flex h-[40px] w-full cursor-pointer items-center gap-3 px-4 text-left text-xs transition-colors',
														isSelected
															? 'bg-primary-50/50 text-primary-700'
															: 'text-slate-600 hover:bg-slate-50'
													)}
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
											</VirtualList>
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
				<div class="flex flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-0">
					<div class="group relative max-w-md flex-1">
						<div
							class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
						>
							<Search size={18} />
						</div>
						<Input
							bind:value={searchQuery}
							oninput={handleSearchInput}
							placeholder="Search by name or identity number..."
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

					<div class="flex flex-wrap items-center gap-3">
						<div class="flex items-center gap-1 rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-1">
							<button
								onclick={() => (showJoinDate = !showJoinDate)}
								class={cn(
									'rounded-xl px-3 py-1.5 text-[10px] font-black uppercase transition-all',
									showJoinDate ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'
								)}
							>
								Joined Date
							</button>
							<button
								onclick={() => (showEntryTime = !showEntryTime)}
								class={cn(
									'rounded-xl px-3 py-1.5 text-[10px] font-black uppercase transition-all',
									showEntryTime ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'
								)}
							>
								Entry Time
							</button>
							<button
								onclick={() => (showExitTime = !showExitTime)}
								class={cn(
									'rounded-xl px-3 py-1.5 text-[10px] font-black uppercase transition-all',
									showExitTime ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-100'
								)}
							>
								Exit Time
							</button>
						</div>

						<Button
							variant="outline"
							class="h-11 shrink-0 gap-2 rounded-2xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 md:px-6"
							onclick={exportToExcel}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-file-spreadsheet"
								><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
									d="M14 2v4a2 2 0 0 0 2 2h4"
								/><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" /><path
									d="M10 10h4v10h-4z"
								/></svg
							>
							<span class="hidden sm:inline">Export Excel</span>
						</Button>

						<Button
							variant="outline"
							class="h-11 shrink-0 gap-2 rounded-2xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 md:px-6"
							onclick={printReport}
						>
							<Printer size={18} />
							<span class="hidden sm:inline">{i18n.t('printReport')}</span>
						</Button>
					</div>
				</div>

				{#if data.entries.length > 0}
					<div class="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
						<table class="w-full min-w-[1000px] text-sm">
							<thead>
								<tr class="border-b-2 border-slate-100 bg-slate-50">
									<th
										class="w-12 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>#</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('name')}</th
									>
									{#if isEmployeeFilter}
										<th
											class="w-32 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
											>ID NO</th
										>
									{/if}
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('category')}</th
									>
									<th
										class="w-32 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Location</th
									>
									<th
										class="w-40 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Training</th
									>
									{#if showEntryTime}
										<th
											class="w-36 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
											>{i18n.t('entryTime')}</th
										>
									{/if}
									{#if showExitTime}
										<th
											class="w-36 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
											>{i18n.t('exitTime')}</th
										>
									{/if}
									<th
										class="w-20 px-4 py-3 text-right text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>{i18n.t('actions')}</th
									>
								</tr>
							</thead>
							<tbody>
								{#each groupedEntries.flatMap((g) => g.entries) as entry, index (entry.id)}
									{@const rootCat = getCategoryPath(entry.person.categoryId)[0]}
									{@const isEmployeeEntry = getCategoryPath(entry.person.categoryId).some(
										(c) => c.id === 'employee'
									)}
									{@const subCat = getCategoryById(entry.person.categoryId)}
									{@const displayCategory = isEmployeeEntry
										? i18n.t(subCat?.slug as any) || subCat?.name
										: i18n.t(rootCat.slug as any) || rootCat.name}
									{@const entryWarning = hasEntryWarning(entry.entryTime)}
									{@const exitWarning = hasExitWarning(entry.exitTime)}
									{@const hasWarning =
										(showEntryTime && entryWarning) || (showExitTime && exitWarning)}
									<tr
										class={clsx(
											'border-b border-slate-50 transition-colors hover:bg-slate-50',
											hasWarning && 'bg-amber-50/50'
										)}
									>
										<td class="px-4 py-3 font-bold text-slate-500">{index + 1}</td>
										<td class="px-4 py-3">
											<span class="font-black text-slate-900 line-clamp-1">{entry.person.name}</span
											>
										</td>
										{#if isEmployeeFilter}
											<td class="px-4 py-3">
												<input
													type="text"
													value={getIdentityNo(entry)}
													onchange={(e) =>
														updateEntryField(
															entry.id,
															'identityNo',
															(e.target as HTMLInputElement).value
														)}
													class="w-full max-w-[100px] rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none"
												/>
											</td>
										{/if}
											<td class="px-4 py-3">
												<div class="flex flex-wrap gap-1">
													{#each getCategoryPath(entry.person.categoryId) as cat, i (cat.id)}
														<Badge
															variant="outline"
															class={cn(
																'h-5 px-1.5 text-[9px] font-black tracking-wider uppercase whitespace-nowrap',
																getCategoryLevelClass(i)
															)}
														>
															{i18n.t(cat.slug as any) || cat.name}
														</Badge>
													{/each}
												</div>
											</td>
										<td class="px-4 py-3">
											<div
												class="flex w-fit rounded-lg border border-slate-200 bg-slate-100 p-0.5"
											>
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
														'text-[10px] font-black uppercase transition-colors',
														getIsTrained(entry) ? 'text-emerald-600' : 'text-slate-400'
													)}
												>
													{getIsTrained(entry) ? 'Trained' : 'Pending'}
												</span>
											</label>
										</td>
										{#if showEntryTime}
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
															'w-full max-w-[100px] rounded-lg border px-2 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none',
															entryWarning
																? 'border-amber-300 bg-amber-50'
																: 'border-slate-200 bg-white'
														)}
													/>
												</div>
											</td>
										{/if}
										{#if showExitTime}
											<td class="px-4 py-3">
												<div class="flex items-center gap-1.5">
													{#if exitWarning}
														<span
															title="Exit after {warnExitAfter} BD time"
															class="text-amber-500"
														>
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
															'w-full max-w-[100px] rounded-lg border px-2 py-1 text-xs font-bold focus:border-primary-500 focus:outline-none',
															exitWarning
																? 'border-amber-300 bg-amber-50'
																: 'border-slate-200 bg-white'
														)}
													/>
												</div>
											</td>
										{/if}
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
