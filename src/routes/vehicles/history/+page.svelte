<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import {
		Search,
		History,
		Truck,
		Calendar,
		Filter,
		User,
		Package,
		Clock,
		LogOut,
		RotateCcw,
		ArrowLeft,
		X,
		Printer,
		Loader2,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { format, parseISO } from 'date-fns';
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cn, getPageRange } from '$lib/utils';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import logo from '$lib/assets/kr_logo.svg';

	let { data }: { data: PageData } = $props();

	// Form input state - synced with data
	let searchQuery = $state('');
	let dateFrom = $state('');
	let dateTo = $state('');
	let typeFilter = $state('all');
	let debounceTimer: any;

	let isPreparingPrint = $state(false);
	let previousLimit = $state(20);
	let isPrintConfirmOpen = $state(false);

	function handleInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(updateFilters, 400);
	}

	// Sync state when data changes (e.g., after navigation)
	$effect(() => {
		searchQuery = data.filters.query;
		dateFrom = data.filters.dateFrom;
		dateTo = data.filters.dateTo;
		typeFilter = data.filters.typeFilter;
	});

	$effect(() => {
		if (page.url.searchParams.has('print')) {
			isPreparingPrint = true;
			const timer = setTimeout(() => {
				window.print();
				isPreparingPrint = false;
				const url = new URL(page.url);
				url.searchParams.delete('print');
				url.searchParams.set('limit', previousLimit.toString());
				goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
			}, 1500);
			return () => clearTimeout(timer);
		}
	});

	function updateFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');

		if (dateFrom) url.searchParams.set('from', dateFrom);
		else url.searchParams.delete('from');

		if (dateTo) url.searchParams.set('to', dateTo);
		else url.searchParams.delete('to');

		if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);
		else url.searchParams.delete('type');

		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function changeTypeFilter(type: string) {
		typeFilter = type;
		updateFilters();
	}

	function clearFilters() {
		searchQuery = '';
		dateFrom = '';
		dateTo = '';
		typeFilter = 'all';
		updateFilters();
	}

	function goToPage(p: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', p.toString());
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function confirmPrint() {
		if (data.pagination.totalCount > 2000) {
			isPrintConfirmOpen = true;
		} else {
			printHistory();
		}
	}

	function printHistory() {
		previousLimit = data.pagination.limit;
		const url = new URL(page.url);
		url.searchParams.set('limit', '5000');
		url.searchParams.set('page', '1');
		url.searchParams.set('print', '1');
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	const hasActiveFilters = $derived(
		!!data.filters.query ||
			!!data.filters.dateFrom ||
			!!data.filters.dateTo ||
			data.filters.typeFilter !== 'all'
	);
</script>

<svelte:head>
	<title>{i18n.t('vehicles')} - {i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="print-only hidden">
	<div
		class="print-header"
		style="display: flex !important; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 2px solid #333; margin-bottom: 1rem;"
	>
		<div style="display: flex; align-items: center; gap: 12px;">
			<img src={logo} alt="Logo" style="height: 48px; width: auto;" />
			<div>
				<div style="font-size: 24px; font-weight: 800; margin: 0;">{i18n.t('appName')}</div>
				<p style="font-size: 14px; font-weight: 600; color: #333; margin: 4px 0 0 0;">
					Vehicle History Report
				</p>
			</div>
		</div>
		<div style="text-align: right;">
			<p style="font-size: 14px; font-weight: 600; margin: 0;">
				Generated: {new Date().toLocaleDateString()}
			</p>
		</div>
	</div>

	<div style="margin-bottom: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">
		<p style="font-size: 14px; font-weight: 600; margin: 0;">
			Total Visits: <strong>{data.pagination.totalCount}</strong>
		</p>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 12px;">
		<thead>
			<tr style="background: #f0f0f0;">
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">#</th>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Vehicle No.</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Type</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Driver</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Vendor</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Date</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Entry</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Exit</th
				>
				<th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;"
					>Status</th
				>
			</tr>
		</thead>
		<tbody>
			{#each data.vehicles as vehicle, index (vehicle.id)}
				<tr>
					<td style="border: 1px solid #ddd; padding: 8px;">{index + 1}</td>
					<td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;"
						>{vehicle.vehicleNumber}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{vehicle.type === 'transport'
							? i18n.t('transportVehicle')
							: i18n.t('regularVehicle')}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;">{vehicle.driverName || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;">{vehicle.vendorName || '-'}</td>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{format(parseISO(vehicle.date), 'PP')}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{format(new Date(vehicle.entryTime), 'hh:mm a')}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{vehicle.exitTime ? format(new Date(vehicle.exitTime), 'hh:mm a') : '-'}</td
					>
					<td style="border: 1px solid #ddd; padding: 8px;"
						>{vehicle.status === 'on_premises' ? 'Inside' : 'Checked Out'}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>

	<div
		style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center;"
	>
		Generated by {i18n.t('appName')}
	</div>
</div>

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
			<!-- Search & Back Section - Left -->
			<div class="flex max-w-2xl flex-1 items-center gap-4">
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
						oninput={handleInput}
						placeholder={i18n.t('searchHistoryPlaceholder')}
						class="h-12 w-full rounded-2xl border-2 border-slate-300 bg-white pr-12 pl-12 text-base font-bold shadow-sm transition-all focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/30"
					/>
					{#if searchQuery}
						<button
							class="absolute top-1/2 right-4 -translate-y-1/2 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"
							onclick={() => {
								searchQuery = '';
								updateFilters();
							}}
						>
							<X size={16} />
						</button>
					{/if}
				</div>
			</div>

			<!-- Date Range & Actions - Right -->
			<div class="flex flex-wrap items-center gap-3">
				<div
					class="flex h-12 items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white px-4 shadow-sm"
				>
					<Calendar size={18} class="text-slate-400" />
					<div class="flex items-center gap-3">
						<input
							type="date"
							bind:value={dateFrom}
							onchange={updateFilters}
							max={new Date().toISOString().split('T')[0]}
							class="cursor-pointer bg-transparent text-sm font-black text-slate-700 focus:outline-none"
						/>
						<div class="h-0.5 w-4 rounded-full bg-slate-200"></div>
						<input
							type="date"
							bind:value={dateTo}
							onchange={updateFilters}
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
			class="custom-scrollbar max-h-[calc(100vh-10rem)] w-full shrink-0 space-y-6 overflow-y-auto pr-2 pb-10 md:sticky md:top-36 md:w-64 print:hidden"
		>
			<!-- Vehicle Type Filter -->
			<div class="space-y-3">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
					{i18n.t('vehicleType')}
				</p>
				<div class="flex flex-col gap-1">
					<Button
						variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							typeFilter === 'all'
								? 'bg-primary-600 text-white shadow-md hover:bg-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeTypeFilter('all')}
					>
						<div class="flex items-center gap-2">
							{#if typeFilter === 'all'}
								<div class="size-1.5 animate-pulse rounded-full bg-white"></div>
							{/if}
							{i18n.t('all')}
						</div>
					</Button>
					<Button
						variant={typeFilter === 'transport' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							typeFilter === 'transport'
								? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeTypeFilter('transport')}
					>
						<div class="flex items-center gap-2">
							{#if typeFilter === 'transport'}
								<div class="size-1.5 rounded-full bg-primary-600"></div>
							{/if}
							{i18n.t('transportVehicle')}
						</div>
					</Button>
					<Button
						variant={typeFilter === 'regular' ? 'secondary' : 'ghost'}
						class={cn(
							'h-10 cursor-pointer justify-start px-3 font-bold transition-all',
							typeFilter === 'regular'
								? 'rounded-l-none border-l-4 border-primary-600 bg-primary-50 text-primary-700'
								: 'text-slate-600'
						)}
						onclick={() => changeTypeFilter('regular')}
					>
						<div class="flex items-center gap-2">
							{#if typeFilter === 'regular'}
								<div class="size-1.5 rounded-full bg-primary-600"></div>
							{/if}
							{i18n.t('regularVehicle')}
						</div>
					</Button>
				</div>
			</div>

			<!-- Summary Stats -->
			<div class="space-y-3 rounded-xl border-2 border-slate-100 bg-white p-4 shadow-sm">
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
					History Summary
				</p>
				<div class="space-y-4">
					<div>
						<p class="text-3xl font-black text-slate-900">{data.summary.total}</p>
						<p class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
							Total Visits
						</p>
					</div>
					<div class="grid grid-cols-1 gap-3 border-t border-slate-50 pt-2">
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold text-slate-500 uppercase"
								>{i18n.t('transportVehicle')}</span
							>
							<span class="text-sm font-black text-primary-600">{data.summary.transport}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-xs font-bold text-slate-500 uppercase"
								>{i18n.t('regularVehicle')}</span
							>
							<span class="text-sm font-black text-emerald-600">{data.summary.regular}</span>
						</div>
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
					{#each data.vehicles as vehicle (vehicle.id)}
						<Card.Root
							class="cursor-pointer overflow-hidden border-l-4 border-l-slate-200 bg-white transition-shadow hover:shadow-lg"
							onclick={() => goto(`/vehicles/${vehicle.id}`)}
						>
							<Card.Content class="p-4">
								<div class="mb-3 flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="mb-1 flex flex-wrap items-center gap-2">
											<h3
												class="font-mono text-lg font-black tracking-widest text-slate-900 uppercase"
											>
												{vehicle.vehicleNumber}
											</h3>
											<Badge variant="secondary" class="shrink-0 text-[10px] font-bold uppercase">
												{vehicle.type === 'transport'
													? i18n.t('transportVehicle')
													: i18n.t('regularVehicle')}
											</Badge>
										</div>
										<div class="truncate text-xs font-bold text-slate-500">
											{vehicle.driverName || 'No Driver'} • {vehicle.vendorName || 'No Vendor'}
										</div>
									</div>
									<div class="shrink-0 text-right">
										<div class="text-[10px] font-black text-slate-400 uppercase">
											{format(parseISO(vehicle.date), 'PP')}
										</div>
										{#if vehicle.status === 'on_premises'}
											<Badge
												class="mt-1 border-emerald-100 bg-emerald-50 text-[10px] font-bold text-emerald-700 uppercase"
											>
												{i18n.t('inside')}
											</Badge>
										{/if}
									</div>
								</div>

								<div class="mt-4 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 text-xs">
									<div>
										<p class="text-[10px] font-bold text-slate-400 uppercase">
											{i18n.t('entryTime')}
										</p>
										<p class="font-black text-slate-700">
											{format(new Date(vehicle.entryTime), 'hh:mm a')}
										</p>
									</div>
									<div>
										<p class="text-[10px] font-bold text-slate-400 uppercase">
											{i18n.t('exitTime')}
										</p>
										<p class="font-black text-slate-700">
											{vehicle.exitTime ? format(new Date(vehicle.exitTime), 'hh:mm a') : '-'}
										</p>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					{:else}
						<div class="py-20 text-center space-y-4">
							<div
								class="size-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border-2 border-slate-100 shadow-sm"
							>
								<History size={40} />
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
									<Table.Head class="font-black text-slate-900">{i18n.t('vehicleNo')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('vehicleType')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('driverName')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('vendorName')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('status')}</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.vehicles as vehicle (vehicle.id)}
									<Table.Row
										class="group cursor-pointer"
										onclick={() => goto(`/vehicles/${vehicle.id}`)}
									>
										<Table.Cell class="py-4">
											<div
												class="font-mono font-black tracking-widest text-slate-900 uppercase transition-colors group-hover:text-primary-600"
											>
												{vehicle.vehicleNumber}
											</div>
											<div class="text-[10px] font-bold tracking-tight text-slate-400 uppercase">
												{vehicle.cargoDescription || 'No Cargo Description'}
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge
												variant="secondary"
												class="text-[10px] font-bold tracking-wider uppercase"
											>
												{vehicle.type === 'transport'
													? i18n.t('transportVehicle')
													: i18n.t('regularVehicle')}
											</Badge>
										</Table.Cell>
										<Table.Cell>
											<div class="font-bold text-slate-700">{vehicle.driverName || '-'}</div>
											<div class="text-[10px] font-bold text-slate-400">
												{vehicle.mobile || '-'}
											</div>
										</Table.Cell>
										<Table.Cell class="font-medium text-slate-500"
											>{vehicle.vendorName || '-'}</Table.Cell
										>
										<Table.Cell class="font-bold text-slate-600">
											{format(parseISO(vehicle.date), 'PP')}
										</Table.Cell>
										<Table.Cell class="font-black text-slate-700">
											{format(new Date(vehicle.entryTime), 'hh:mm a')}
										</Table.Cell>
										<Table.Cell class="font-black text-slate-700">
											{vehicle.exitTime ? format(new Date(vehicle.exitTime), 'hh:mm a') : '-'}
										</Table.Cell>
										<Table.Cell>
											{#if vehicle.status === 'on_premises'}
												<Badge
													class="border-emerald-100 bg-emerald-50 text-[10px] font-bold text-emerald-700 uppercase"
												>
													{i18n.t('inside')}
												</Badge>
											{:else}
												<Badge
													variant="outline"
													class="text-[10px] font-bold text-slate-400 uppercase"
												>
													{i18n.t('checkedOut')}
												</Badge>
											{/if}
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

				<!-- Pagination (Improved UI) -->
				{#if data.pagination.totalPages > 1}
					<div
						class="mt-6 flex flex-col items-center justify-between gap-6 border-t border-slate-200 px-4 py-8 lg:flex-row print:hidden"
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
								{#each getPageRange(data.pagination.page, data.pagination.totalPages) as p}
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
				{/if}
			</div>
		</main>
	</div>
</div>

<ConfirmModal
	bind:open={isPrintConfirmOpen}
	title="Large Report Warning"
	message="This history contains {data.pagination
		.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
	confirmText="Print Anyway"
	cancelText="Cancel"
	variant="warning"
	onconfirm={printHistory}
/>
