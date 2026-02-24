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
		LogOut,
		RotateCcw,
		ChevronRight,
		ChevronLeft,
		X,
		Printer,
		Loader2,
		Scan,
		Fingerprint,
		CreditCard,
		History,
		ArrowLeft,
		Filter,
		Shield,
		MapPin
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
		getCategoryLevelClass,
		getCategoryBadgeClass,
		statusBadgeClasses,
		appToast
	} from '$lib/utils';
	import type { PageData, ActionData } from './$types';
	import CheckInDialog from '$lib/components/CheckInDialog.svelte';
	import RegisterDialog from '../people/RegisterDialog.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';

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
	let selectedCategoryId = $state('');
	let selectedLocation = $state('');
	let isCheckInOpen = $state(false);
	let isRegisterOpen = $state(false);
	let isPreparingPrint = $state(false);
	let confirmCheckOutOpen = $state(false);
	let checkOutFormElement = $state<HTMLFormElement | null>(null);
	let debounceTimer: any;
	let isPrintConfirmOpen = $state(false);

	$effect(() => {
		return () => {
			clearTimeout(debounceTimer);
		};
	});

	$effect(() => {
		searchQuery = data.filters.query;
		selectedCategoryId = data.filters.categoryId;
		selectedLocation = data.filters.location || '';
	});

	function triggerCheckOut(form: HTMLFormElement) {
		checkOutFormElement = form;
		confirmCheckOutOpen = true;
	}

	$effect(() => {
		if (page.url.searchParams.has('print')) {
			isPreparingPrint = true;
			const timer = setTimeout(() => {
				window.print();
				isPreparingPrint = false;
				window.close();
			}, 1500);
			return () => clearTimeout(timer);
		}
	});

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');

		if (selectedCategoryId) url.searchParams.set('category', selectedCategoryId);
		else url.searchParams.delete('category');

		if (selectedLocation) url.searchParams.set('location', selectedLocation);
		else url.searchParams.delete('location');

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

	const hasActiveFilters = $derived(!!searchQuery || !!selectedCategoryId || !!selectedLocation);

	function clearFilters() {
		searchQuery = '';
		selectedCategoryId = '';
		selectedLocation = '';
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
<div class="print-only hidden">
	<div
		class="print-header"
		style="display: flex !important; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 2px solid #333; margin-bottom: 1rem;"
	>
		<div style="display: flex; align-items: center; gap: 12px;">
			<img src={logo} alt="Logo" style="height: 48px; width: auto;" />
			<div>
				<h1 style="font-size: 24px; font-weight: 800; margin: 0;">{i18n.t('appName')}</h1>
				<p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">Current Attendance Report</p>
			</div>
		</div>
		<div style="text-align: right;">
			<p style="font-size: 14px; font-weight: 600; margin: 0;">{format(new Date(), 'PPPP')}</p>
			<p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">
				Printed at {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="margin-bottom: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">
		<p style="font-size: 14px; font-weight: 600; margin: 0;">
			Total People Currently Inside: <strong>{data.pagination.totalCount}</strong>
		</p>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
		<thead>
			<tr style="background: #f0f0f0;">
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">#</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Name</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Code No.</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Category</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Company</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Entry Time</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>{i18n.t('location')}</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Duration</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Purpose</th
				>
			</tr>
		</thead>
		<tbody>
			{#each data.logs as log, index (log.id)}
				<tr>
					<td style="border: 1px solid #ddd; padding: 8px;">{index + 1}</td>
					<td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">{log.person.name}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{log.person.codeNo || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{log.category.name}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{log.person.company || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{format(log.entryTime, 'hh:mm a')}</td>
					<td
						style="border: 1px solid #ddd; padding: 8px; text-transform: uppercase; font-weight: 700;"
						>{log.location || '-'}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{formatDuration(log.durationSeconds)}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;">{log.purpose || '-'}</td>
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
		<h2 class="text-xl font-black text-slate-900">Preparing Entry Log Report...</h2>
		<p class="mt-2 font-bold text-slate-500">Fetching all entries currently inside</p>
	</div>
{/if}

<!-- Screen view -->
<div class="no-print pb-20">
	<!-- Sticky Top Bar for Filters -->
	<div class="sticky-filter-bar px-4 md:px-0">
		<div class="content-container">
			<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<!-- Top Row: Search & Stats -->
				<div class="flex flex-1 items-center gap-3">
					<div class="group relative flex-1 lg:max-w-md">
						<div
							class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
						>
							<Search size={18} />
						</div>
						<Input
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

					<!-- Mobile Info Badge -->
					<div class="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 lg:hidden">
						<span class="text-[9px] font-black tracking-widest text-slate-400 capitalize"
							>Inside</span
						>
						<span class="text-xs font-black text-primary-700">{data.pagination.totalCount}</span>
					</div>
				</div>

				<!-- Actions Row: Buttons -->
				<div
					class="flex items-center justify-between gap-2 overflow-x-auto pb-1 lg:justify-end lg:overflow-visible lg:pb-0"
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
					<div class="mt-4 space-y-2">
						<p class="ml-1 text-[9px] font-black tracking-widest text-slate-400 uppercase">
							{i18n.t('location')}
						</p>
						<div
							class="flex w-fit items-center gap-1 rounded-2xl border-2 border-slate-100 bg-white p-1 shadow-sm"
						>
							<button
								class={cn(
									'rounded-xl px-4 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
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
									'rounded-xl px-4 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
									selectedLocation === 'ship'
										? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
										: 'text-slate-500 hover:bg-slate-50'
								)}
								onclick={() => changeLocation('ship')}
							>
								Ship
							</button>
							<button
								class={cn(
									'rounded-xl px-4 py-1.5 text-[10px] font-black tracking-widest uppercase transition-all',
									selectedLocation === 'yard'
										? 'bg-primary-600 text-white shadow-md shadow-primary-600/20'
										: 'text-slate-500 hover:bg-slate-50'
								)}
								onclick={() => changeLocation('yard')}
							>
								Yard
							</button>
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
			class="custom-scrollbar hidden max-h-[calc(100vh-10rem)] w-full shrink-0 space-y-6 overflow-y-auto pr-2 pb-10 lg:block lg:w-64"
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
												'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
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
												class="cursor-pointer rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 transition-all hover:bg-slate-200"
												onclick={() => changeCategory(activeParentCategory()?.id || '')}
											>
												<span class="mr-1 opacity-50">↑</span>
												{activeParentCategory()?.name}
											</button>
										{/if}

										{#each availableSubCategories() as subCat (subCat.id)}
											<button
												class={clsx(
													'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-all',
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
				</div>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="w-full min-w-0 flex-1 space-y-6">
			<!-- List Area (Natural Scroll) -->
			<div class="space-y-4 pb-24 lg:pb-0">
				<div class="grid grid-cols-1 gap-4">
					{#each data.logs as log (log.id)}
						<Card.Root
							class="overflow-hidden border-l-4 border-l-emerald-500 bg-white transition-shadow hover:shadow-lg"
						>
							<Card.Content class="p-4 sm:p-5 md:p-6">
								<div
									class="flex flex-col items-start gap-4 xl:flex-row xl:items-center xl:justify-between"
								>
									<div class="flex w-full min-w-0 items-center gap-4 md:gap-5">
										<!-- Avatar -->
										<div
											class="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-100 bg-white shadow-sm md:size-14 md:rounded-2xl"
										>
											{#if log.person.photoUrl}
												<img
													src={log.person.photoUrl}
													alt={log.person.name}
													class="size-full object-cover"
												/>
											{:else}
												<div
													class="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-base font-black text-white md:text-lg"
												>
													{log.person.name.trim().split(/\s+/).length > 1
														? log.person.name
																.trim()
																.split(/\s+/)
																.slice(0, 2)
																.map((n: string) => [...n][0])
																.join('')
														: ([...log.person.name.trim()][0] ?? '?')}
												</div>
											{/if}
										</div>

										<!-- Main Info -->
										<div class="min-w-0 flex-1">
											<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
												<a
													href="/people/{log.person.id}"
													class="truncate text-base leading-tight font-black text-slate-900 transition-colors hover:text-primary-600 sm:text-lg"
												>
													{log.person.name}
												</a>

												<div class="flex flex-wrap gap-1">
													{#each getCategoryPath(log.person.categoryId).slice(-2) as cat, i (cat.id)}
														<Badge
															variant="outline"
															class={cn(
																'h-5 px-1.5 text-[8px] font-black tracking-wider capitalize sm:h-6 sm:px-2 sm:text-[10px]',
																getCategoryBadgeClass(cat.slug)
															)}
														>
															{i18n.t(cat.slug as any) || cat.name}
														</Badge>
													{/each}
												</div>
											</div>
											<p class="mt-0.5 text-xs font-bold text-slate-500 sm:text-sm">
												<span class="text-primary-600/70">#{log.person.codeNo || 'N/A'}</span>
												<span class="mx-1.5 opacity-30">|</span>
												<span class="truncate">{log.person.company || 'Private'}</span>
											</p>
											{#if !isEmployeeView && log.purpose}
												<p
													class="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-600"
												>
													<span
														class="text-[9px] font-black text-slate-400 capitalize sm:text-[10px]"
														>Purpose:</span
													>
													<span class="truncate italic opacity-80">{log.purpose}</span>
												</p>
											{/if}
										</div>
									</div>

									<!-- Stats Row - Dynamic Layout -->
									<div
										class="grid w-full grid-cols-2 gap-4 border-t border-slate-50 pt-4 xl:flex xl:w-auto xl:items-center xl:gap-10 xl:border-none xl:pt-0 2xl:gap-16"
									>
										<div class="space-y-1">
											<p
												class="text-[9px] leading-none font-black tracking-widest text-slate-400 capitalize md:text-[10px]"
											>
												{i18n.t('location')}
											</p>
											<div
												class="flex items-center gap-1.5 text-sm font-black whitespace-nowrap text-slate-900 uppercase sm:text-base md:gap-2"
											>
												<div
													class={cn(
														'rounded-lg p-1 md:p-1.5',
														log.location === 'ship'
															? 'bg-blue-100 text-blue-600'
															: 'bg-amber-100 text-amber-600'
													)}
												>
													<MapPin size={14} />
												</div>
												<span>{log.location || 'N/A'}</span>
											</div>
										</div>

										<div class="space-y-1">
											<p
												class="text-[9px] leading-none font-black tracking-widest text-slate-400 capitalize md:text-[10px]"
											>
												{i18n.t('entryTime')}
											</p>
											<div
												class="flex items-center gap-1.5 text-sm font-black whitespace-nowrap text-slate-900 sm:text-base md:gap-2"
											>
												<div class="rounded-lg bg-primary-100 p-1 text-primary-600 md:p-1.5">
													<Clock size={14} />
												</div>
												<span>{format(log.entryTime, 'hh:mm a')}</span>
											</div>
										</div>

										<div class="space-y-1">
											<p
												class="text-[9px] leading-none font-black tracking-widest text-slate-400 capitalize md:text-[10px]"
											>
												Inside For
											</p>
											<div
												class="flex items-center gap-1.5 text-sm font-black whitespace-nowrap text-emerald-600 sm:text-base md:gap-2"
											>
												<div class="rounded-lg bg-emerald-100 p-1 md:p-1.5">
													<Clock size={14} />
												</div>
												<span>{formatDuration(log.durationSeconds)}</span>
											</div>
										</div>

										{#if log.verifyMethod}
											<div class="col-span-1 space-y-1">
												<p
													class="text-[9px] leading-none font-black tracking-widest text-slate-400 capitalize md:text-[10px]"
												>
													Method
												</p>
												<div
													class="flex items-center gap-1.5 text-xs font-black text-slate-700 sm:text-sm md:gap-2"
												>
													<div
														class={cn(
															'rounded-lg p-1 md:p-1.5',
															log.verifyMethod === 'face'
																? 'bg-blue-100 text-blue-600'
																: log.verifyMethod === 'finger'
																	? 'bg-amber-100 text-amber-600'
																	: 'bg-slate-100 text-slate-500'
														)}
													>
														{#if log.verifyMethod === 'face'}
															<Scan size={14} />
														{:else if log.verifyMethod === 'finger'}
															<Fingerprint size={14} />
														{:else if log.verifyMethod === 'card'}
															<CreditCard size={14} />
														{:else}
															<Users size={14} />
														{/if}
													</div>
													<span class="capitalize">{log.verifyMethod}</span>
												</div>
											</div>
										{/if}

										{#if data.user?.permissions.includes('people.create')}
											<form
												method="POST"
												action="?/checkOut"
												use:enhance
												class="col-span-2 xl:col-span-1 xl:w-auto"
											>
												<input type="hidden" name="logId" value={log.id} />
												<Button
													type="button"
													variant="outline"
													class="h-11 w-full cursor-pointer gap-2 border-2 border-rose-100 px-4 font-black text-rose-600 shadow-sm transition-all hover:bg-rose-50 hover:text-rose-700 md:h-12 xl:w-auto xl:px-6"
													onclick={(e) =>
														triggerCheckOut(
															(e.currentTarget as HTMLButtonElement).form as HTMLFormElement
														)}
												>
													<CheckCircle2 size={18} />
													{i18n.t('checkOut')}
												</Button>
											</form>
										{/if}
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{:else}
						<div
							class="py-16 text-center space-y-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl lg:py-24"
						>
							<div
								class="size-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300 md:size-24"
							>
								<Users size={32} class="md:hidden" />
								<Users size={48} class="hidden md:block" />
							</div>
							<div class="space-y-2 px-6">
								<p class="text-lg font-black text-slate-600 md:text-xl">{i18n.t('noResults')}</p>
								<p
									class="text-slate-400 text-[10px] font-bold uppercase tracking-widest md:text-sm"
								>
									No one currently on premises matches your criteria
								</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination -->
				<Pagination {...data.pagination} />
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
