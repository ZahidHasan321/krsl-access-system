<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		Search,
		Users,
		PlusCircle,
		Edit2,
		Trash2,
		CheckCircle2,
		XCircle,
		Save,
		Eye,
		RotateCcw,
		ChevronRight,
		X,
		ChevronLeft,
		Printer,
		Loader2,
		Calendar,
		Fingerprint,
		ScanFace,
		CreditCard,
		Filter
	} from 'lucide-svelte';
	import { format } from 'date-fns';
	import { clsx } from 'clsx';
	import { cn, getCategoryBadgeClass, statusBadgeClasses, getPageRange } from '$lib/utils';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import RegisterDialog from './RegisterDialog.svelte';
	import ChangeCategoryDialog from './ChangeCategoryDialog.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import DesignationCombobox from '$lib/components/ui/designation-combobox.svelte';
	import DepartmentCombobox from '$lib/components/ui/department-combobox.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import logo from '$lib/assets/kr_logo.svg';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';

	import { onMount, untrack } from 'svelte';

	let { data }: { data: PageData } = $props();

	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let isRegisterOpen = $state(false);
	let debounceTimer: any;

	// Initialize state from data prop once
	$effect.pre(() => {
		untrack(() => {
			if (!searchQuery && data.filters.query) {
				searchQuery = data.filters.query;
			}
		});
	});

	$effect(() => {
		// Only sync from server if user is not currently focusing the input
		if (data.filters.query !== searchQuery && document.activeElement !== searchInputEl) {
			searchQuery = data.filters.query || '';
		}
	});

	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
		};
	});

	let isPreparingPrint = $state(false);
	let previousLimit = $state(20);
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

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(handleSearch, 400);
	}

	// Edit dialog state
	let isEditOpen = $state(false);
	// Change Category state
	let isChangeCategoryOpen = $state(false);
	let changeCategoryPerson = $state<any>(null);

	// Delete confirmation state
	let confirmDeleteOpen = $state(false);
	let personToDelete = $state<any>(null);
	let deleteFormElement = $state<HTMLFormElement | null>(null);

	function triggerDelete(person: any, form: HTMLFormElement, e: Event) {
		e.stopPropagation();
		personToDelete = person;
		deleteFormElement = form;
		confirmDeleteOpen = true;
	}

	// Category filter logic
	const selectedCategoryId = $derived(page.url.searchParams.get('category') || '');

	const isRootCategory = $derived(ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId));

	const availableSubCategories = $derived(() => {
		if (!selectedCategoryId) return [];
		if (isRootCategory) return getSubCategories(selectedCategoryId);
		const selected = getCategoryById(selectedCategoryId);
		if (!selected) return [];
		const children = getSubCategories(selectedCategoryId);
		if (children.length > 0) return children;
		const parentId = selected.parentId;
		if (parentId) return getSubCategories(parentId);
		return [];
	});

	let editPerson = $state<any>(null);
	let editName = $state('');
	let editCodeNo = $state('');
	let editCompany = $state('');
	let editContactNo = $state('');
	let editDesignation = $state('');
	let editDepartment = $state('');
	let editJoinDate = $state('');
	let editAuditJoinDate = $state('');
	let editBiometricId = $state('');
	let editIsTrained = $state(false);
	let editNotes = $state('');

	function getRootCategoryId(catId: string | null): string {
		if (!catId) return '';
		const catMap = new Map(CATEGORIES.map(c => [c.id, c]));
		let current = catMap.get(catId);
		while (current?.parentId) {
			current = catMap.get(current.parentId);
		}
		return current?.id || '';
	}

	const activeRootCategoryId = $derived(() => getRootCategoryId(selectedCategoryId));

	const isEmployeeEdit = $derived(() => {
		if (!editPerson) return false;
		return getRootCategoryId(editPerson.categoryId) === 'employee';
	});

	const activeParentCategory = $derived(() => {
		if (!selectedCategoryId || isRootCategory) return null;
		const selected = getCategoryById(selectedCategoryId);
		if (!selected?.parentId) return null;
		return getCategoryById(selected.parentId);
	});

	const activeRootCategoryName = $derived(() => {
		const rootId = activeRootCategoryId();
		if (!rootId) return '';
		const cat = ROOT_CATEGORIES.find((c) => c.id === rootId);
		return cat ? i18n.t(cat.slug as any) || cat.name : '';
	});

	const selectedTrained = $derived(page.url.searchParams.get('trained') || '');
	const selectedDepartment = $derived(page.url.searchParams.get('department') || '');

	const hasActiveFilters = $derived(!!searchQuery || !!selectedCategoryId || !!selectedTrained || !!selectedDepartment);

	function parseEnrolledMethods(raw: string | null): string[] {
		if (!raw) return [];
		try {
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed : [];
		} catch {
			return [];
		}
	}

	function setFilter(key: string, value: string) {
		const url = new URL(page.url);
		if (value) url.searchParams.set(key, value);
		else url.searchParams.delete(key);
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function handleSearch() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');
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
		const url = new URL(page.url);
		url.searchParams.delete('q');
		url.searchParams.delete('category');
		url.searchParams.delete('trained');
		url.searchParams.delete('department');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function openEdit(person: any, e: Event) {
		e.stopPropagation();
		editPerson = person;
		editName = person.name;
		editCodeNo = person.codeNo || '';
		editCompany = person.company || '';
		editContactNo = person.contactNo || '';
		editBiometricId = person.biometricId || '';
		editDesignation = person.designation || '';
		editDepartment = person.department || '';
		editJoinDate = person.joinDate ? format(new Date(person.joinDate), 'yyyy-MM-dd') : '';
		editAuditJoinDate = person.auditJoinDate ? format(new Date(person.auditJoinDate), 'yyyy-MM-dd') : '';
		editIsTrained = person.isTrained;
		editNotes = person.notes || '';
		isEditOpen = true;
	}

	function openChangeCategory(person: any, e: Event) {
		e.stopPropagation();
		changeCategoryPerson = person;
		isChangeCategoryOpen = true;
	}

	function confirmPrint() {
		if (data.pagination.totalCount > 2000) {
			isPrintConfirmOpen = true;
		} else {
			printPeople();
		}
	}

	function printPeople() {
		const url = new URL(page.url);
		url.searchParams.set('limit', '5000');
		url.searchParams.set('page', '1');
		url.searchParams.set('print', '1');
		window.open(url.toString(), '_blank');
	}

	let showMobileFilters = $state(false);
</script>

<svelte:head>
	<title>{i18n.t('people')} | {i18n.t('appName')}</title>
</svelte:head>

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
				People Directory Report
			</h2>
			<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
				{format(new Date(), 'PPPP')} | {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 0;">
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Scope</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">PEOPLE REGISTRY</span>
		</div>
		
		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 0 3rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Total Registered</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.pagination.totalCount} Individuals</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Report Type</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">Full Personnel Export</span>
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
		<thead>
			<tr style="background: #f0f0f0;">
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">#</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Name</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Identity No.</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Category</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Dept.</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Company</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Training</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Status</th>
			</tr>
		</thead>
		<tbody>
			{#each data.people as person, index (person.id)}
				<tr style={index % 2 === 0 ? '' : 'background: #fff;'}>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{index + 1}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{person.name}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{person.codeNo || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{person.category.name}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{person.department || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{person.company || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: {person.isTrained ? '#059669' : '#e11d48'};">
						{person.isTrained ? 'TRAINED' : 'PENDING'}
					</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 700; color: {person.status === 'on_premises' ? '#059669' : '#64748b'};">
						{person.status === 'on_premises' ? 'INSIDE' : 'CHECKED OUT'}
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

{#if isPreparingPrint}
	<div class="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white">
		<Loader2 class="mb-4 animate-spin text-primary-600" size={48} />
		<h2 class="text-xl font-black text-slate-900">Preparing Print Report...</h2>
		<p class="mt-2 font-bold text-slate-500">Fetching {data.pagination.totalCount} records</p>
	</div>
{/if}

{#if !isPrintMode}
	<div class="no-print pb-20">
	<!-- Sticky Top Bar for Search -->
	<div class="sticky-filter-bar px-4 md:px-0">
		<div class="content-container">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<!-- Search Section - Left -->
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
									handleSearch();
								}}
							>
								<X size={14} />
							</button>
						{/if}
					</div>
				</div>

				<!-- Actions - Right -->
				<div
					class="custom-scrollbar flex items-center justify-between gap-2 overflow-x-auto lg:justify-end lg:overflow-visible"
				>
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
							<span class="text-[9px] font-black tracking-widest text-slate-400 uppercase"
								>Registry</span
							>
							<span class="text-xs font-black text-primary-700">{data.pagination.totalCount}</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							class="h-10 shrink-0 cursor-pointer gap-2 rounded-xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 lg:h-12 lg:rounded-2xl lg:px-6"
							onclick={confirmPrint}
						>
							<Printer size={18} />
							<span class="hidden sm:inline">Print Report</span>
						</Button>

						{#if hasActiveFilters}
							<Button
								variant="ghost"
								class="h-10 shrink-0 cursor-pointer gap-2 rounded-xl border-2 border-transparent px-4 font-black text-rose-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 lg:h-12 lg:rounded-2xl lg:px-6"
								onclick={clearFilters}
							>
								<RotateCcw size={18} />
								<span class="hidden sm:inline">Reset</span>
							</Button>
						{/if}

						{#if data.user?.permissions.includes('people.create')}
							<Button
								class="h-10 shrink-0 gap-2 rounded-xl px-5 font-black shadow-lg lg:h-12 lg:rounded-2xl lg:px-8"
								onclick={() => (isRegisterOpen = true)}
							>
								<PlusCircle size={18} />
								<span class="hidden sm:inline">{i18n.t('register')}</span>
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
								'chip-pressable shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all',
								selectedCategoryId === ''
									? 'bg-primary-600 text-white shadow-md'
									: 'bg-slate-100 text-slate-600'
							)}
							onclick={() => changeCategory(null)}
						>
							{i18n.t('all')}
						</button>
						{#each ROOT_CATEGORIES as cat}
							<button
								class={cn(
									'chip-pressable shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all',
									activeRootCategoryId() === cat.id
										? 'bg-primary-600 text-white shadow-md'
										: 'bg-slate-100 text-slate-600'
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
							{#each availableSubCategories() as subCat}
								<button
									class={cn(
										'chip-pressable shrink-0 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black transition-all',
										selectedCategoryId === subCat.id
											? 'border-primary-600 bg-primary-50 text-primary-700'
											: 'border-slate-100 bg-white text-slate-500'
									)}
									onclick={() => changeCategory(subCat.id)}
								>
									{i18n.t(subCat.slug as any) || subCat.name}
								</button>
							{/each}
						</div>
					{/if}

					<div class="mt-2 flex gap-2 overflow-x-auto border-t border-slate-100 pt-2 pb-2">
						<span class="self-center px-2 text-[9px] font-black text-slate-400 uppercase"
							>Safety</span
						>
						{#each [{ label: 'All', value: '' }, { label: 'Trained', value: 'yes' }, { label: 'Untrained', value: 'no' }] as opt}
							<button
								class={cn(
									'chip-pressable shrink-0 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black transition-all',
									selectedTrained === opt.value
										? 'border-emerald-500 bg-emerald-50 text-emerald-700'
										: 'border-slate-100 bg-white text-slate-500'
								)}
								onclick={() => setFilter('trained', opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>

					{#if activeRootCategoryId() === 'employee' && data.departments.length > 0}
						<div class="mt-2 flex gap-2 overflow-x-auto border-t border-slate-100 pt-2 pb-2">
							<span class="self-center px-2 text-[9px] font-black text-slate-400 uppercase"
								>Dept.</span
							>
							<button
								class={cn(
									'chip-pressable shrink-0 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black transition-all',
									!selectedDepartment
										? 'border-primary-600 bg-primary-50 text-primary-700'
										: 'border-slate-100 bg-white text-slate-500'
								)}
								onclick={() => setFilter('department', '')}
							>
								All
							</button>
							{#each data.departments as dept}
								<button
									class={cn(
										'chip-pressable shrink-0 rounded-lg border-2 px-3 py-1.5 text-[10px] font-black transition-all',
										selectedDepartment === dept
											? 'border-primary-600 bg-primary-50 text-primary-700'
											: 'border-slate-100 bg-white text-slate-500'
									)}
									onclick={() => setFilter('department', dept)}
								>
									{dept}
								</button>
							{/each}
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
			class="hidden w-64 shrink-0 flex-col gap-6 lg:sticky lg:top-36 lg:flex lg:h-[calc(100vh-12rem)] print:hidden"
		>
			<div class="custom-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
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
								<div class="size-1.5 rounded-full bg-white"></div>
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

			<!-- Department Filter (Only for Employees) -->
			{#if activeRootCategoryId() === 'employee'}
				<div class="space-y-3" transition:slide>
					<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
						Department
					</p>
					<div class="flex flex-col gap-1">
						<Button
							variant={!selectedDepartment ? 'secondary' : 'ghost'}
							class={cn(
								'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
								!selectedDepartment
									? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
									: 'text-slate-600'
							)}
							onclick={() => setFilter('department', '')}
						>
							<div class="flex items-center gap-2">
								{#if !selectedDepartment}
									<div class="size-1.5 rounded-full bg-white"></div>
								{/if}
								All Departments
							</div>
						</Button>
						{#each data.departments as dept}
							<Button
								variant={selectedDepartment === dept ? 'secondary' : 'ghost'}
								class={cn(
									'h-10 cursor-pointer justify-start px-3 font-bold transition-all text-left',
									selectedDepartment === dept
										? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
										: 'text-slate-600'
								)}
								onclick={() => setFilter('department', dept)}
							>
								<div class="flex items-center gap-2 truncate">
									{#if selectedDepartment === dept}
										<div class="size-1.5 rounded-full bg-white"></div>
									{/if}
									<span class="truncate">{dept}</span>
								</div>
							</Button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Training Status Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
					{i18n.t('trainingStatus')}
				</p>
				<div class="flex flex-col gap-1">
					{#each [{ label: i18n.t('all'), value: '' }, { label: i18n.t('trained'), value: 'yes' }, { label: i18n.t('untrained'), value: 'no' }] as opt}
						<Button
							variant={selectedTrained === opt.value ? 'secondary' : 'ghost'}
							class={cn(
								'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
								selectedTrained === opt.value
									? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
									: 'text-slate-600'
							)}
							onclick={() => setFilter('trained', opt.value)}
						>
							<div class="flex items-center gap-2">
								{#if selectedTrained === opt.value}
									<div class="size-1.5 rounded-full bg-white"></div>
								{/if}
								{opt.label}
							</div>
						</Button>
					{/each}
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="space-y-3 rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Summary</p>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<p class="text-2xl font-black text-slate-900">{data.summary.total}</p>
						<p class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('total')}</p>
					</div>
					<div>
						<p class="text-2xl font-black text-emerald-600">{data.summary.inside}</p>
						<p class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('inside')}</p>
					</div>
					<div>
						<p class="text-2xl font-black text-primary-600">{data.summary.trained}</p>
						<p class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('trained')}</p>
					</div>
					<div>
						<p class="text-2xl font-black text-rose-500">{data.summary.untrained}</p>
						<p class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('untrained')}</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Sidebar Branding -->
			<div
				class="flex flex-col items-center gap-1 pt-4 opacity-40 transition-opacity hover:opacity-100"
			>
				<p class="text-[8px] font-black tracking-[0.3em] text-slate-400 uppercase">
					System Developed By
				</p>
				<a
					href="https://autolinium.com"
					target="_blank"
					rel="noopener noreferrer"
					class="group flex items-center gap-1.5"
				>
					<span
						class="text-[10px] font-black tracking-widest text-slate-500 transition-colors group-hover:text-primary-600 uppercase"
						>Autolinium</span
					>
				</a>
			</div>
		</aside>

		<!-- Main Scrolling Content Area -->
		<main class="min-w-0 flex-1 space-y-6">
			<!-- List Section -->
			<div class="space-y-4">
				<!-- Mobile Card View -->
				<div class="space-y-3 lg:hidden">
					{#each data.people as person (person.id)}
						<Card.Root
							class="card-pressable cursor-pointer border-2 border-slate-100 bg-white active:bg-slate-50/80"
							onclick={() => goto(`/people/${person.id}`)}
						>
							<Card.Content class="p-4">
								<div class="flex items-start gap-3">
									<div
										class="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-100 bg-white shadow-sm"
									>
										{#if person.photoUrl}
											<img
												src={person.thumbUrl || person.photoUrl}
												alt={person.name}
												class="size-full object-cover"
												loading="lazy"
											/>
										{:else}
											<div
												class="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-sm font-black text-white"
											>
												{person.name.trim().split(/\s+/).length > 1
													? person.name
															.trim()
															.split(/\s+/)
															.slice(0, 2)
															.map((n: string) => [...n][0])
															.join('')
													: ([...person.name.trim()][0] ?? '?')}
											</div>
										{/if}
									</div>

									<div class="min-w-0 flex-1">
										<div class="mb-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
											<h3 class="text-[15px] font-black leading-tight text-slate-900">
												{person.name}
											</h3>
											{#if person.codeNo}
												<span class="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-black tracking-tighter text-slate-500 uppercase">
													#{person.codeNo}
												</span>
											{/if}
											{#if person.status === 'on_premises'}
												<Badge
													class={cn(
														'shrink-0 text-[9px] font-bold capitalize',
														statusBadgeClasses.on_premises
													)}
												>
													{i18n.t('inside')}
												</Badge>
											{/if}
										</div>
										<div class="flex flex-wrap items-center gap-1.5">
											<button
												class="btn-pressable"
												onclick={(e) => openChangeCategory(person, e)}
											>
												<Badge
													variant="outline"
													class={cn(
														'text-[9px] font-bold tracking-wider capitalize',
														getCategoryBadgeClass(person.category.slug)
													)}
												>
													{person.category.name}
												</Badge>
											</button>
											{#if person.department}
												<Badge
													variant="outline"
													class="border-blue-100 bg-blue-50 text-[9px] font-black tracking-widest text-blue-600 uppercase"
												>
													{person.department}
												</Badge>
											{/if}
											{#if person.designation}
												<span class="text-[10px] font-bold text-slate-400">{person.designation}</span>
											{/if}
										</div>
									</div>

									{#if data.user?.permissions.includes('people.edit') || data.user?.permissions.includes('people.delete')}
										<div class="flex shrink-0 items-center">
											{#if data.user?.permissions.includes('people.edit')}
												<button
													class="btn-pressable flex size-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-primary-50 hover:text-primary-600 active:bg-primary-100"
													onclick={(e) => openEdit(person, e)}
												>
													<Edit2 size={15} />
												</button>
											{/if}
											{#if data.user?.permissions.includes('people.delete')}
												<form
													method="POST"
													action="?/delete"
													use:enhance={() => {
														return async ({ result, update }) => {
															if (result.type === 'success') await update();
														};
													}}
												>
													<input type="hidden" name="id" value={person.id} />
													<button
														type="button"
														class="btn-pressable flex size-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500 active:bg-rose-100"
														onclick={(e) =>
															triggerDelete(
																person,
																(e.currentTarget as HTMLButtonElement).form as HTMLFormElement,
																e
															)}
													>
														<Trash2 size={15} />
													</button>
												</form>
											{/if}
										</div>
									{/if}
								</div>

								<div class="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
									<div class="flex items-center gap-3">
										{#if person.company}
											<span class="text-[10px] font-bold text-slate-400">{person.company}</span>
										{/if}
										{#if person.isTrained}
											<div class="flex items-center gap-1 font-black text-emerald-600">
												<CheckCircle2 size={13} />
												<span class="text-[10px] uppercase">Trained</span>
											</div>
										{:else}
											<div class="flex items-center gap-1 font-black text-rose-500">
												<XCircle size={13} />
												<span class="text-[10px] uppercase">Pending</span>
											</div>
										{/if}
									</div>
									{#if parseEnrolledMethods(person.enrolledMethods).length > 0}
										<div class="flex items-center gap-1.5">
											{#if parseEnrolledMethods(person.enrolledMethods).includes('finger')}
												<div class="flex size-6 items-center justify-center rounded-md border border-sky-100 bg-sky-50 text-sky-600">
													<Fingerprint size={12} />
												</div>
											{/if}
											{#if parseEnrolledMethods(person.enrolledMethods).includes('face')}
												<div class="flex size-6 items-center justify-center rounded-md border border-violet-100 bg-violet-50 text-violet-600">
													<ScanFace size={12} />
												</div>
											{/if}
											{#if parseEnrolledMethods(person.enrolledMethods).includes('card')}
												<div class="flex size-6 items-center justify-center rounded-md border border-amber-100 bg-amber-50 text-amber-600">
													<CreditCard size={12} />
												</div>
											{/if}
										</div>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
					{:else}
						<div class="py-20 text-center space-y-4">
							<div
								class="size-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border-2 border-slate-100 shadow-sm"
							>
								<Users size={40} />
							</div>
							<p class="text-slate-500 font-bold">{i18n.t('noResults')}</p>
						</div>
					{/each}
				</div>

				<!-- Desktop Table View -->
				<div class="hidden lg:block">
					<Card.Root class="overflow-hidden rounded-3xl border-2 bg-white shadow-sm">
						<Table.Root>
							<Table.Header>
								<Table.Row class="bg-slate-50 hover:bg-transparent">
									<Table.Head class="font-black text-slate-900">{i18n.t('name')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('category')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('codeNo')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('company')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('isTrained')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('status')}</Table.Head>
									<Table.Head class="text-right font-black text-slate-900 print:hidden"
										>{i18n.t('actions')}</Table.Head
									>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.people as person (person.id)}
									<Table.Row
										class="group cursor-pointer"
										onclick={() => goto(`/people/${person.id}`)}
									>
										<Table.Cell class="py-4">
											<div
												class="font-bold text-slate-900 transition-colors group-hover:text-primary-600"
											>
												{person.name}
											</div>
											<div class="flex items-center gap-2">
												<span class="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
													{person.designation || '-'}
												</span>
												{#if person.department}
													<Badge
														variant="outline"
														class="h-4 border-blue-100 bg-blue-50 px-1 text-[8px] font-black tracking-widest text-blue-600 uppercase"
													>
														{person.department}
													</Badge>
												{/if}
												{#if parseEnrolledMethods(person.enrolledMethods).length > 0}
													<div class="flex items-center gap-1">
														{#if parseEnrolledMethods(person.enrolledMethods).includes('finger')}
															<Fingerprint size={12} class="text-sky-500" />
														{/if}
														{#if parseEnrolledMethods(person.enrolledMethods).includes('face')}
															<ScanFace size={12} class="text-violet-500" />
														{/if}
														{#if parseEnrolledMethods(person.enrolledMethods).includes('card')}
															<CreditCard size={12} class="text-amber-500" />
														{/if}
													</div>
												{/if}
											</div>
										</Table.Cell>
										<Table.Cell>
											<button
												class="transition-opacity hover:opacity-70"
												onclick={(e) => openChangeCategory(person, e)}
											>
												<Badge
													variant="outline"
													class={cn(
														'text-[10px] font-bold tracking-wider capitalize',
														getCategoryBadgeClass(person.category.slug)
													)}
												>
													{person.category.name}
												</Badge>
											</button>
										</Table.Cell>
										<Table.Cell class="font-medium text-slate-500"
											>{person.codeNo || '-'}</Table.Cell
										>
										<Table.Cell class="font-medium text-slate-500"
											>{person.company || '-'}</Table.Cell
										>
										<Table.Cell>
											{#if person.isTrained}
												<div class="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
													<CheckCircle2 size={14} />
													<span>Trained</span>
												</div>
											{:else}
												<div class="flex items-center gap-1.5 text-xs font-bold text-rose-500">
													<XCircle size={14} />
													<span>Pending</span>
												</div>
											{/if}
										</Table.Cell>
										<Table.Cell>
											{#if person.status === 'on_premises'}
												<Badge
													class={cn(
														'text-[10px] font-bold uppercase',
														statusBadgeClasses.on_premises
													)}
												>
													{i18n.t('inside')}
												</Badge>
											{:else}
												<Badge
													class={cn(
														'text-[10px] font-bold uppercase',
														statusBadgeClasses.checked_out
													)}
												>
													{i18n.t('checkedOut')}
												</Badge>
											{/if}
										</Table.Cell>
										<Table.Cell class="text-right print:hidden">
											<div class="flex items-center justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													class="size-8 text-slate-400 hover:bg-primary-50 hover:text-primary-600"
													onclick={(e: MouseEvent) => {
														e.stopPropagation();
														goto(`/people/${person.id}`);
													}}
												>
													<Eye size={15} />
												</Button>
												{#if data.user?.permissions.includes('people.edit')}
													<Button
														variant="ghost"
														size="icon"
														class="size-8 text-slate-400 hover:bg-primary-50 hover:text-primary-600"
														onclick={(e: MouseEvent) => openEdit(person, e)}
													>
														<Edit2 size={15} />
													</Button>
												{/if}
												{#if data.user?.permissions.includes('people.delete')}
													<form
														method="POST"
														action="?/delete"
														use:enhance={() => {
															return async ({ result, update }) => {
																if (result.type === 'success') await update();
															};
														}}
													>
														<input type="hidden" name="id" value={person.id} />
														<Button
															type="button"
															variant="ghost"
															size="icon"
															class="size-8 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
															onclick={(e: MouseEvent) =>
																triggerDelete(
																	person,
																	(e.currentTarget as HTMLButtonElement).form as HTMLFormElement,
																	e
																)}
														>
															<Trash2 size={15} />
														</Button>
													</form>
												{/if}
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={8} class="h-64 text-center text-slate-400 font-bold"
											>{i18n.t('noResults')}</Table.Cell
										>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Root>
				</div>

				<!-- Pagination -->
				<Pagination {...data.pagination} />
			</div>
		</main>
	</div>
</div>
{/if}

<RegisterDialog bind:open={isRegisterOpen} />

<ConfirmModal
	bind:open={isPrintConfirmOpen}
	title="Large Report Warning"
	message="This directory contains {data.pagination
		.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
	confirmText="Print Anyway"
	cancelText="Cancel"
	variant="warning"
	onconfirm={printPeople}
/>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Delete Person"
	message="Are you sure you want to delete '{personToDelete?.name}'? All history and records for this person will be permanently removed. This action cannot be undone."
	confirmText="Delete"
	variant="danger"
	onconfirm={() => deleteFormElement?.requestSubmit()}
/>

<!-- Edit Dialog -->
{#if editPerson}
	<Dialog.Root bind:open={isEditOpen}>
		<Dialog.Content class="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-[600px] sm:rounded-lg">
			<div class="shrink-0 border-b bg-slate-50 p-6">
				<Dialog.Title class="text-xl font-black">{i18n.t('edit')}: {editPerson.name}</Dialog.Title>
				<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
					Update person details
				</Dialog.Description>
			</div>

			<div class="flex-1 overflow-y-auto p-6">
				<form
					method="POST"
					action="?/update"
					class="space-y-6"
					enctype="multipart/form-data"
					use:enhance={() => {
						return async ({ result, update }) => {
							if (result.type === 'success') {
								isEditOpen = false;
								await update();
							}
						};
					}}
				>
					<input type="hidden" name="id" value={editPerson.id} />
					<input type="hidden" name="isTrained" value={editIsTrained ? 'true' : 'false'} />

					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label
								for="edit-name"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>{i18n.t('name')}</Label
							>
							<Input
								id="edit-name"
								name="name"
								bind:value={editName}
								required
								class="h-11 border-2"
							/>
						</div>
						<div class="space-y-2">
							<Label
								for="edit-codeNo"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>{i18n.t('codeNo')}</Label
							>
							<Input id="edit-codeNo" name="codeNo" bind:value={editCodeNo} class="h-11 border-2" />
						</div>
						<div class="space-y-2">
							<Label
								for="edit-company"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>{i18n.t('company')}</Label
							>
							<Input
								id="edit-company"
								name="company"
								bind:value={editCompany}
								class="h-11 border-2"
							/>
						</div>
						<div class="space-y-2">
							<Label
								for="edit-contactNo"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>{i18n.t('phone')}</Label
							>
							<Input
								id="edit-contactNo"
								name="contactNo"
								bind:value={editContactNo}
								class="h-11 border-2"
							/>
						</div>
						<div class="space-y-2">
							<Label
								for="edit-designation"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>{i18n.t('designation')}</Label
							>
							<DesignationCombobox
								name="designation"
								bind:value={editDesignation}
								placeholder="Job title"
							/>
						</div>
						<div class="space-y-2">
							<Label
								for="edit-biometricId"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>Biometric ID</Label
							>
							<Input
								id="edit-biometricId"
								name="biometricId"
								bind:value={editBiometricId}
								readonly
								class="h-11 cursor-not-allowed border-2 bg-slate-50 text-slate-500"
								placeholder="Device user PIN"
							/>
						</div>
					</div>

					{#if isEmployeeEdit()}
						<div class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
							<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
								<div class="space-y-2">
									<Label
										for="edit-department"
										class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
										>Department</Label
									>
									<DepartmentCombobox
										name="department"
										bind:value={editDepartment}
										placeholder="Select or add department"
									/>
								</div>

								<div class="space-y-2">
									<DatePicker
										name="joinDate"
										label="Joined Date"
										bind:value={editJoinDate}
										placeholder="Actual start date"
									/>
								</div>
								<div class="space-y-2">
									<DatePicker
										name="auditJoinDate"
										label="Audit Join Date"
										bind:value={editAuditJoinDate}
										placeholder="Date for audit reports"
									/>
								</div>
							</div>
						</div>
					{/if}

					<div class="space-y-2">
						<Label
							for="edit-notes"
							class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
							>{i18n.t('notes')}</Label
						>
						<Input id="edit-notes" name="notes" bind:value={editNotes} class="h-11 border-2" />
					</div>

					<div
						class="flex items-center space-x-3 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4"
					>
						<Checkbox
							id="edit-isTrained"
							checked={editIsTrained}
							onCheckedChange={(v: boolean | 'indeterminate') => (editIsTrained = !!v)}
						/>
						<Label for="edit-isTrained" class="text-sm font-black text-slate-700"
							>{i18n.t('isTrained')}</Label
						>
					</div>

					<Button type="submit" class="h-14 w-full gap-2 text-base font-black shadow-lg">
						<Save size={20} />
						{i18n.t('save')}
					</Button>
				</form>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

{#if changeCategoryPerson}
	<ChangeCategoryDialog bind:open={isChangeCategoryOpen} person={changeCategoryPerson} />
{/if}
