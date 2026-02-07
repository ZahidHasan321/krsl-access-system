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
		CreditCard
	} from 'lucide-svelte';
	import logo from '$lib/assets/logo.png';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { format } from 'date-fns';
	import { enhance } from '$app/forms';
	import { clsx } from 'clsx';
	import { slide } from 'svelte/transition';
	import { sineInOut } from 'svelte/easing';
	import { cn, getCategoryLevelClass, statusBadgeClasses } from '$lib/utils';
	import type { PageData } from './$types';
	import CheckInDialog from '$lib/components/CheckInDialog.svelte';
	import RegisterDialog from '../people/RegisterDialog.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';

	let { data }: { data: PageData } = $props();

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
	let isCheckInOpen = $state(false);
	    	let isRegisterOpen = $state(false);
	    	let isPreparingPrint = $state(false);
	    	let confirmCheckOutOpen = $state(false);
	    	let checkOutFormElement = $state<HTMLFormElement | null>(null);
	    	let previousLimit = $state(20);
	    	let debounceTimer: any;
	    	let isPrintConfirmOpen = $state(false);
	    
	    	$effect(() => {
	    		searchQuery = data.filters.query;
	    		selectedCategoryId = data.filters.categoryId;
	    	});
	    
	    	function triggerCheckOut(form: HTMLFormElement) {
	    		checkOutFormElement = form;
	    		confirmCheckOutOpen = true;
	    	}
	    
	    	$effect(() => {		if (page.url.searchParams.has('print')) {
			isPreparingPrint = true;
			const timer = setTimeout(() => {
				window.print();
				isPreparingPrint = false;

				// Cleanup: remove print param and restore limit
				const url = new URL(page.url);
				url.searchParams.delete('print');
				url.searchParams.set('limit', previousLimit.toString());
				goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
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

	const hasActiveFilters = $derived(!!searchQuery || !!selectedCategoryId);

	function clearFilters() {
		searchQuery = '';
		selectedCategoryId = '';
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
		previousLimit = data.pagination.limit;
		const url = new URL(page.url);
		url.searchParams.set('limit', '5000');
		url.searchParams.set('page', '1');
		url.searchParams.set('print', '1');
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	function goToPage(p: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function getPageRange(current: number, total: number) {
		const delta = 1;
		const range = [];
		const rangeWithDots: (number | string)[] = [];
		let l;
		for (let i = 1; i <= total; i++) {
			if (i == 1 || i == total || (i >= current - delta && i <= current + delta)) {
				range.push(i);
			}
		}
		for (let i of range) {
			if (l) {
				if (i - l === 2) {
					rangeWithDots.push(l + 1);
				} else if (i - l !== 1) {
					rangeWithDots.push('...');
				}
			}
			rangeWithDots.push(i);
			l = i;
		}
		return rangeWithDots;
	}
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
<div class="no-print space-y-6 pt-4 pb-20">
	<!-- Sticky Top Bar for Filters -->
	<div
		class="sticky-filter-bar"
	>
		<div class="mx-auto flex max-w-400 flex-wrap items-center justify-between gap-4">
			<!-- Search Section - Left -->
			<div class="group relative max-w-md flex-1">
				<div
					class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
				>
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
						onclick={() => {
							searchQuery = '';
							applyFilters();
						}}
					>
						<X size={16} />
					</button>
				{/if}
			</div>

			<!-- Actions - Right -->
			<div class="flex items-center gap-2">
				<div class="flex h-8 items-center gap-2 border-r-2 border-slate-100 pr-4">
					<span class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
						>{i18n.t('entryLog')}</span
					>
					<Badge class="border-primary-200 bg-primary-100 text-xs font-black text-primary-700">
						{data.pagination.totalCount} inside
					</Badge>
				</div>

				<div class="flex items-center gap-2">
					<Button
						variant="outline"
						class="h-12 cursor-pointer gap-2 rounded-2xl border-2 border-slate-200 px-6 font-black transition-all hover:border-primary-300 hover:bg-primary-50"
						onclick={confirmPrint}
					>
						<Printer size={18} />
						<span>Print Full Log</span>
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
	<div class="flex flex-col items-start gap-8 md:flex-row">
		<!-- Sidebar - Sticky -->
		<aside
			class="custom-scrollbar max-h-[calc(100vh-10rem)] w-full shrink-0 space-y-6 overflow-y-auto pr-2 pb-10 md:sticky md:top-36 md:w-64"
		>
			<!-- Category Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
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
		</aside>

		<!-- Main Content Area -->
		<main class="min-w-0 flex-1 space-y-6">
			<!-- List Area (Natural Scroll) -->
			<div class="space-y-4">
				<div class="grid grid-cols-1 gap-4">
					{#each data.logs as log (log.id)}
						<Card.Root
							class="overflow-hidden border-l-4 border-l-emerald-500 bg-white transition-shadow hover:shadow-lg"
						>
							<Card.Content class="p-5 md:p-6">
								<div
									class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center"
								>
									<div class="flex min-w-0 items-center gap-5">
										<div
											class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-100 bg-white shadow-sm"
										>
											{#if log.person.photoUrl}
												<img
													src={log.person.photoUrl}
													alt={log.person.name}
													class="size-full object-cover"
												/>
											{:else}
												<div class="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-lg font-black text-white">
													{log.person.name.trim().split(/\s+/).length > 1
														? log.person.name.trim().split(/\s+/).slice(0, 2).map((n: string) => [...n][0]).join('')
														: [...log.person.name.trim()][0] ?? '?'}
												</div>
											{/if}
										</div>
										<div class="min-w-0">
											<div class="flex flex-wrap items-center gap-3">
												<a href="/people/{log.person.id}" class="truncate text-lg leading-tight font-black text-slate-900 hover:text-primary-600 transition-colors">
													{log.person.name}
												</a>

												<div class="flex gap-1.5">
													{#each getCategoryPath(log.person.categoryId) as cat, i (cat.id)}
														<Badge
															variant="outline"
															class={cn(
																'h-6 px-2 text-[10px] font-black tracking-wider uppercase',
																getCategoryLevelClass(i)
															)}
														>
															{i18n.t(cat.slug as any) || cat.name}
														</Badge>
													{/each}
												</div>
											</div>
											<p class="mt-1 text-sm font-bold text-slate-500">
												{log.person.codeNo || 'N/A'} • {log.person.company || 'Private'}
											</p>
											{#if !isEmployeeView && log.purpose}
												<p
													class="mt-2 flex items-center gap-2 text-sm font-medium text-primary-600"
												>
													<span class="text-[10px] font-black text-slate-400 uppercase"
														>Purpose:</span
													>
													{log.purpose}
												</p>
											{/if}
										</div>
									</div>

									<div class="flex w-full flex-wrap items-center gap-8 md:w-auto md:gap-16">
										<div class="space-y-1">
											<p
												class="text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
											>
												{i18n.t('entryTime')}
											</p>
											<div class="flex items-center gap-2 text-base font-black text-slate-900">
												<div class="rounded-lg bg-primary-100 p-1.5 text-primary-600">
													<Clock size={16} />
												</div>
												<span>{format(log.entryTime, 'hh:mm a')}</span>
											</div>
										</div>

										{#if log.verifyMethod}
											<div class="space-y-1">
												<p
													class="text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
												>
													Method
												</p>
												<div class="flex items-center gap-2 text-sm font-black text-slate-700">
													<div class={cn('rounded-lg p-1.5', log.verifyMethod === 'face' ? 'bg-blue-100 text-blue-600' : log.verifyMethod === 'finger' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500')}>
														{#if log.verifyMethod === 'face'}
															<Scan size={16} />
														{:else if log.verifyMethod === 'finger'}
															<Fingerprint size={16} />
														{:else if log.verifyMethod === 'card'}
															<CreditCard size={16} />
														{:else}
															<Users size={16} />
														{/if}
													</div>
													<span class="capitalize">{log.verifyMethod}</span>
												</div>
											</div>
										{/if}

										{#if data.user?.permissions.includes('people.create')}
											<form method="POST" action="?/checkOut" use:enhance class="w-full md:w-auto">
												<input type="hidden" name="logId" value={log.id} />
												<Button
													type="button"
													variant="outline"
													class="h-12 w-full cursor-pointer gap-2 border-2 border-rose-100 px-6 font-black text-rose-600 shadow-sm hover:bg-rose-50 hover:text-rose-700 md:w-auto"
													onclick={(e) => triggerCheckOut((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
												>
													<CheckCircle2 size={20} />
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
							class="py-24 text-center space-y-6 bg-white border-2 border-dashed border-slate-200 rounded-3xl"
						>
							<div
								class="size-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300"
							>
								<Users size={48} />
							</div>
							<div class="space-y-2">
								<p class="text-xl font-black text-slate-600">{i18n.t('noResults')}</p>
								<p class="text-slate-400 text-sm font-bold uppercase tracking-widest">
									No one currently on premises matches your criteria
								</p>
							</div>
						</div>
					{/each}
				</div>

				<!-- Pagination (Improved UI) -->
				<div
					class="mt-6 flex flex-col items-center justify-between gap-6 border-t border-slate-200 px-4 py-8 lg:flex-row"
				>
					<!-- Left: Info -->
					<div class="order-2 text-sm font-bold text-slate-400 lg:order-1">
						Showing <span class="text-slate-900"
							>{(data.pagination.page - 1) * data.pagination.limit + 1}</span
						>
						to
						<span class="text-slate-900"
							>{Math.min(
								data.pagination.page * data.pagination.limit,
								data.pagination.totalCount
							)}</span
						>
						of <span class="text-slate-900">{data.pagination.totalCount}</span> results
					</div>

					<!-- Center: Page Numbers -->
					{#if data.pagination.totalPages > 1}
						<div class="order-1 flex items-center gap-1 lg:order-2">
							<Button
								variant="ghost"
								size="sm"
								class="h-10 cursor-pointer gap-1 rounded-xl px-3 font-bold"
								disabled={data.pagination.page === 1}
								onclick={() => goToPage(data.pagination.page - 1)}
							>
								<ChevronLeft size={16} />
								<span class="hidden sm:inline">Prev</span>
							</Button>

							<div class="mx-2 flex items-center gap-1">
								{#each getPageRange(data.pagination.page, data.pagination.totalPages) as p (p)}
									{#if p === '...'}
										<span class="px-2 text-slate-300">...</span>
									{:else}
										<Button
											variant={data.pagination.page === p ? 'default' : 'ghost'}
											size="sm"
											class={cn(
												'h-10 w-10 cursor-pointer rounded-xl text-xs font-black transition-all',
												data.pagination.page === p
													? 'scale-110 shadow-md'
													: 'text-slate-500 hover:bg-slate-100'
											)}
											onclick={() => goToPage(p as number)}
										>
											{p}
										</Button>
									{/if}
								{/each}
							</div>

							<Button
								variant="ghost"
								size="sm"
								class="h-10 cursor-pointer gap-1 rounded-xl px-3 font-bold"
								disabled={data.pagination.page === data.pagination.totalPages}
								onclick={() => goToPage(data.pagination.page + 1)}
							>
								<span class="hidden sm:inline">Next</span>
								<ChevronRight size={16} />
							</Button>
						</div>
					{/if}

					<!-- Right: Row Count -->
					<div class="order-3 flex items-center gap-3">
						<span class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
							>Per Page</span
						>
						<select
							class="cursor-pointer rounded-xl border-2 border-slate-100 bg-white px-3 py-2 text-xs font-black shadow-sm transition-colors hover:border-slate-200 focus:border-primary-500 focus:outline-none"
							value={data.pagination.limit}
							onchange={(e) => {
								const url = new URL(page.url);
								url.searchParams.set('limit', (e.currentTarget as HTMLSelectElement).value);
								url.searchParams.set('page', '1');
								goto(url.toString(), { keepFocus: true, noScroll: true });
							}}
						>
							{#each [10, 20, 50, 100] as limit}
								<option value={limit}>{limit}</option>
							{/each}
						</select>
					</div>
				</div>
			</div>
		</main>
	</div>

	<!-- Floating Action Buttons -->
	{#if data.user?.permissions.includes('people.create')}
		<div class="fixed right-10 bottom-10 z-30 flex flex-col gap-4">
			<Button
				variant="secondary"
				class="group h-14 animate-in cursor-pointer gap-3 rounded-2xl border-2 border-slate-200 px-6 text-sm font-black shadow-xl transition-all delay-100 duration-500 slide-in-from-bottom-8 hover:scale-105 active:scale-95"
				onclick={() => (isRegisterOpen = true)}
			>
				<PlusCircle size={20} class="transition-transform duration-300 group-hover:rotate-90" />
				{i18n.t('register')}
			</Button>

			<Button
				variant="default"
				class="h-16 animate-in cursor-pointer gap-3 rounded-2xl px-8 text-base font-black shadow-2xl shadow-primary/30 transition-all duration-500 slide-in-from-bottom-12 hover:scale-105 active:scale-95"
				onclick={() => (isCheckInOpen = true)}
			>
				<PlayCircle size={24} />
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
    message="This report contains {data.pagination.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
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
