<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import * as Table from '$lib/components/ui/table';
	import {
		Truck,
		Search,
		LogIn,
		LogOut,
		Clock,
		User,
		Phone,
		Package,
		AlertCircle,
		History as LucideHistory,
		CheckCircle2,
		Loader2,
		X,
		RotateCcw,
		ChevronLeft,
		ChevronRight,
		Printer,
		ArrowLeft,
		Filter
	} from 'lucide-svelte';
	import { slide } from 'svelte/transition';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { format } from 'date-fns';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { cn, appToast } from '$lib/utils';
	import type { PageData, ActionData } from './$types';
	import { untrack } from 'svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import Pagination from '$lib/components/ui/Pagination.svelte';
	import logo from '$lib/assets/kr_logo.svg';
	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isCheckInOpen = $state(false);
	let searchQuery = $state('');
	let searchInputEl = $state<HTMLInputElement | null>(null);
	let typeFilter = $state('all');

	// Initialize state from data prop once
	$effect.pre(() => {
		untrack(() => {
			if (!searchQuery && data.filters.query) searchQuery = data.filters.query;
			if (typeFilter === 'all' && data.filters.typeFilter) typeFilter = data.filters.typeFilter;
		});
	});

	$effect(() => {
		// Only sync from server if user is not currently focusing the input
		if (data.filters.query !== searchQuery && document.activeElement !== searchInputEl) {
			searchQuery = data.filters.query || '';
		}
	});

	let debounceTimer: any;

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

	// Vehicle lookup state
	let vehicleNumber = $state('');
	let isLookingUp = $state(false);
	let vehicleLookup = $state<any>(null);
	let lookupDebounce: ReturnType<typeof setTimeout>;

	$effect(() => {
		if (form?.success) {
			isCheckInOpen = false;
			vehicleNumber = '';
			vehicleLookup = null;
		} else if (form?.message) {
			appToast.error(form.message);
		}
	});

	async function lookupVehicle() {
		if (vehicleNumber.length < 3) {
			vehicleLookup = null;
			return;
		}

		clearTimeout(lookupDebounce);
		lookupDebounce = setTimeout(async () => {
			isLookingUp = true;
			try {
				const res = await fetch(
					`/api/vehicles/lookup?vehicleNumber=${encodeURIComponent(vehicleNumber)}`
				);
				if (res.ok) {
					vehicleLookup = await res.json();
				}
			} catch (e) {
				console.error(e);
			} finally {
				isLookingUp = false;
			}
		}, 400);
	}

	function handleSearchInput() {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(applyFilters, 400);
	}

	function applyFilters() {
		const url = new URL(page.url);
		if (searchQuery) url.searchParams.set('q', searchQuery);
		else url.searchParams.delete('q');

		if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);
		else url.searchParams.delete('type');

		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function changeTypeFilter(type: string) {
		typeFilter = type;
		applyFilters();
	}

	function clearFilters() {
		searchQuery = '';
		typeFilter = 'all';
		const url = new URL(page.url);
		url.searchParams.delete('q');
		url.searchParams.delete('type');
		url.searchParams.set('page', '1');
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function resetDialog() {
		vehicleNumber = '';
		vehicleLookup = null;
	}

	$effect(() => {
		if (!isCheckInOpen) {
			setTimeout(resetDialog, 300);
		}
	});

	function confirmPrint() {
		if (data.pagination.totalCount > 2000) {
			isPrintConfirmOpen = true;
		} else {
			printVehicles();
		}
	}

	function printVehicles() {
		const url = new URL(page.url);
		url.searchParams.set('limit', '5000');
		url.searchParams.set('page', '1');
		url.searchParams.set('print', '1');
		window.open(url.toString(), '_blank');
	}

	let showMobileFilters = $state(false);

	const hasActiveFilters = $derived(!!searchQuery || typeFilter !== 'all');
</script>

<svelte:head>
	<title>{i18n.t('vehicles')} | {i18n.t('appName')}</title>
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
				Vehicles On-Premises Report
			</h2>
			<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
				{format(new Date(), 'PPPP')} | {format(new Date(), 'hh:mm a')}
			</p>
		</div>
	</div>

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 0;">
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Fleet Status</span>
			<span style="font-size: 15px; font-weight: 900; color: #000;">INSIDE</span>
		</div>
		
		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; padding: 0 3rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Total Vehicles</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.pagination.totalCount} Units</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Log Type</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">Active Transport Log</span>
		</div>
	</div>

	<table style="width: 100%; border-collapse: collapse; font-size: 11px; font-family: inherit;">
		<thead>
			<tr style="background: #f0f0f0;">
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">#</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Vehicle No.</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Type</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Driver</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Vendor</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Entry Time</th>
				<th style="border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.05em;">Cargo</th>
			</tr>
		</thead>
		<tbody>
			{#each data.activeVehicles as vehicle, index (vehicle.id)}
				<tr style={index % 2 === 0 ? '' : 'background: #fff;'}>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #64748b;">{index + 1}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; font-weight: 800; color: #0f172a;">{vehicle.vehicleNumber}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">
						{vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
					</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{vehicle.driverName || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{vehicle.vendorName || '-'}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{format(new Date(vehicle.entryTime), 'hh:mm a')}</td>
					<td style="border: 1px solid #e2e8f0; padding: 8px; color: #475569;">{vehicle.cargoDescription || '-'}</td>
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
							placeholder={i18n.t('searchVehiclesPlaceholder')}
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
								>Inside</span
							>
							<span class="text-xs font-black text-amber-700">{data.pagination.totalCount}</span>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							class="h-10 shrink-0 cursor-pointer gap-2 rounded-xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 lg:h-12 lg:rounded-2xl lg:px-6"
							onclick={() => window.print()}
						>
							<Printer size={18} />
							<span class="hidden sm:inline">Print Report</span>
						</Button>

						<Button
							variant="outline"
							class="h-10 shrink-0 cursor-pointer gap-2 rounded-xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 lg:h-12 lg:rounded-2xl lg:px-6"
							onclick={() => goto('/vehicles/history')}
						>
							<LucideHistory size={18} />
							<span class="hidden sm:inline">{i18n.t('history')}</span>
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

						<Button
							class="h-10 shrink-0 gap-2 rounded-xl px-5 font-black shadow-lg lg:h-12 lg:rounded-2xl lg:px-8"
							onclick={() => (isCheckInOpen = true)}
						>
							<LogIn size={20} />
							<span class="hidden sm:inline">{i18n.t('checkIn')}</span>
						</Button>
					</div>
				</div>
			</div>

			<!-- Mobile Horizontal Filters -->
			{#if showMobileFilters}
				<div class="mt-4 lg:hidden" transition:slide>
					<div class="custom-scrollbar flex gap-2 overflow-x-auto pb-2">
						{#each [{ label: i18n.t('all'), value: 'all' }, { label: i18n.t('transportVehicle'), value: 'transport' }, { label: i18n.t('regularVehicle'), value: 'regular' }] as opt}
							<button
								class={cn(
									'shrink-0 rounded-xl px-4 py-2 text-xs font-black transition-all',
									typeFilter === opt.value
										? 'bg-primary-600 text-white shadow-md'
										: 'bg-slate-100 text-slate-600'
								)}
								onclick={() => changeTypeFilter(opt.value)}
							>
								{opt.label}
							</button>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="content-container flex flex-col gap-8 px-4 md:px-0 lg:flex-row lg:items-start">
		<!-- Sidebar - Desktop Only -->
		<aside
			class="hidden w-64 shrink-0 flex-col gap-6 lg:sticky lg:top-36 lg:flex lg:h-[calc(100vh-12rem)] print:hidden"
		>
			<div class="custom-scrollbar flex-1 space-y-6 overflow-y-auto pr-2">
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
								<div class="size-1.5 rounded-full bg-white"></div>
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
				<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Inside Now</p>
				<div class="space-y-4">
					<div>
						<p class="text-3xl font-black text-slate-900">{data.summary.total}</p>
						<p class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
							Total Vehicles
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
		</div>

		<!-- Sidebar Branding - Fixed at bottom of sticky aside -->
			<div
				class="mt-auto flex flex-col items-center gap-1 pt-4 pb-2 border-t border-slate-50/50 opacity-40 transition-opacity hover:opacity-100"
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
					{#each data.activeVehicles as vehicle}
						<Card.Root
							class="cursor-pointer overflow-hidden border-l-4 border-l-amber-500 bg-white transition-shadow hover:shadow-lg"
							onclick={() => goto(`/vehicles/${vehicle.id}`)}
						>
							<Card.Content class="p-4 sm:p-5">
								<div class="mb-4 flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="mb-1.5 flex flex-wrap items-center gap-2">
											<h3 class="font-mono text-lg font-black tracking-wider text-slate-900">
												{vehicle.vehicleNumber}
											</h3>
											<Badge variant="secondary" class="shrink-0 text-[9px] font-bold capitalize">
												{vehicle.type === 'transport'
													? i18n.t('transportVehicle')
													: i18n.t('regularVehicle')}
											</Badge>
										</div>
										<div class="truncate text-xs font-bold text-slate-500">
											{vehicle.driverName || 'No Driver'} • {vehicle.vendorName || 'No Vendor'}
										</div>
									</div>
									<div
										class="flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-50 px-2 py-1 font-black text-amber-600"
									>
										<Clock size={14} />
										<span class="text-xs whitespace-nowrap"
											>{format(new Date(vehicle.entryTime), 'hh:mm a')}</span
										>
									</div>
								</div>

								<div class="mb-4 grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 text-xs">
									<div class="space-y-1">
										<p class="text-[10px] font-bold tracking-widest text-slate-400 capitalize">
											{i18n.t('phone')}
										</p>
										<div class="flex items-center gap-1.5 font-black text-slate-700">
											<Phone size={12} class="text-slate-400" />
											<span>{vehicle.mobile || 'N/A'}</span>
										</div>
									</div>
									<div class="space-y-1">
										<p class="text-[10px] font-bold tracking-widest text-slate-400 capitalize">
											{i18n.t('cargo')}
										</p>
										<p class="truncate font-bold text-slate-600">
											{vehicle.cargoDescription || '-'}
										</p>
									</div>
								</div>

								<form
									method="POST"
									action="?/checkOut"
									use:enhance
									onsubmit={(e: SubmitEvent) => e.stopPropagation()}
									class="w-full"
								>
									<input type="hidden" name="id" value={vehicle.id} />
									<Button
										type="submit"
										variant="outline"
										class="h-11 w-full gap-2 rounded-xl border-2 border-rose-100 px-4 font-black text-rose-600 transition-all hover:bg-rose-50 hover:text-rose-700"
										onclick={(e: MouseEvent) => e.stopPropagation()}
									>
										<LogOut size={16} />
										{i18n.t('checkOut')}
									</Button>
								</form>
							</Card.Content>
						</Card.Root>
					{:else}
						<div class="py-20 text-center space-y-4">
							<div
								class="size-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border-2 border-slate-100 shadow-sm"
							>
								<Truck size={40} />
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
									<Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
									<Table.Head class="text-right font-black text-slate-900 print:hidden"
										>{i18n.t('actions')}</Table.Head
									>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.activeVehicles as vehicle}
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
										<Table.Cell>
											<div class="flex items-center gap-1.5 font-black text-slate-900">
												<Clock size={16} class="text-amber-500" />
												<span>{format(new Date(vehicle.entryTime), 'hh:mm a')}</span>
											</div>
										</Table.Cell>
										<Table.Cell class="text-right print:hidden">
											<div class="flex items-center justify-end gap-2">
												<form
													method="POST"
													action="?/checkOut"
													use:enhance
													onsubmit={(e: SubmitEvent) => e.stopPropagation()}
												>
													<input type="hidden" name="id" value={vehicle.id} />
													<Button
														type="submit"
														variant="outline"
														size="sm"
														class="h-10 gap-2 border-2 border-rose-100 px-4 font-black text-rose-600 hover:bg-rose-50 hover:text-rose-700"
														onclick={(e: MouseEvent) => e.stopPropagation()}
													>
														<LogOut size={16} />
														{i18n.t('checkOut')}
													</Button>
												</form>
											</div>
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={6} class="h-64 text-center text-slate-400 font-bold"
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

<ConfirmModal
	bind:open={isPrintConfirmOpen}
	title="Large Report Warning"
	message="This list contains {data.pagination
		.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
	confirmText="Print Anyway"
	cancelText="Cancel"
	variant="warning"
	onconfirm={printVehicles}
/>

<Dialog.Root bind:open={isCheckInOpen}>
	<Dialog.Content class="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[550px]">
		<div class="shrink-0 border-b bg-slate-50 p-6">
			<Dialog.Title class="text-2xl font-black"
				>{i18n.t('checkIn')} {i18n.t('vehicles')}</Dialog.Title
			>
			<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
				Enter vehicle details
			</Dialog.Description>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			<form method="POST" action="?/checkIn" use:enhance class="space-y-5">
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
						>{i18n.t('vehicleNo')}</Label
					>
					<div class="relative">
						<Input
							name="vehicleNumber"
							required
							placeholder="e.g. DHAKA METRO-T 11-2233"
							class="h-12 border-2 pr-10 font-mono font-bold"
							bind:value={vehicleNumber}
							oninput={lookupVehicle}
						/>
						{#if isLookingUp}
							<div class="absolute top-1/2 right-3 -translate-y-1/2">
								<Loader2 class="animate-spin text-primary-500" size={18} />
							</div>
						{/if}
					</div>
				</div>

				<!-- Vehicle History Lookup Result -->
				{#if vehicleLookup && vehicleNumber.length >= 3}
					{#if vehicleLookup.currentlyInside}
						<div
							class="flex items-start gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4"
						>
							<AlertCircle size={20} class="mt-0.5 shrink-0 text-amber-600" />
							<div>
								<p class="font-bold text-amber-800">This vehicle is currently inside</p>
								<p class="mt-1 text-sm text-amber-700">
									Entered at {format(new Date(vehicleLookup.currentEntry.entryTime), 'hh:mm a')} on {format(
										new Date(vehicleLookup.currentEntry.date),
										'PP'
									)}
								</p>
								{#if vehicleLookup.currentEntry.driverName}
									<p class="text-sm text-amber-700">
										Driver: {vehicleLookup.currentEntry.driverName}
									</p>
								{/if}
							</div>
						</div>
					{:else if vehicleLookup.found && vehicleLookup.lastVisit}
						<div class="space-y-3 rounded-xl border-2 border-blue-100 bg-blue-50 p-4">
							<div class="flex items-center gap-2">
								<LucideHistory size={16} class="text-blue-600" />
								<p class="font-bold text-blue-800">Previous Visitor</p>
								<Badge variant="secondary" class="text-[10px] font-bold"
									>{vehicleLookup.totalVisits} visits</Badge
								>
							</div>
							<div class="grid grid-cols-2 gap-3 text-sm">
								<div>
									<p class="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
										Last Visit
									</p>
									<p class="font-bold text-blue-900">
										{format(new Date(vehicleLookup.lastVisit.date), 'PP')}
									</p>
								</div>
								{#if vehicleLookup.lastVisit.driverName}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
											Driver
										</p>
										<p class="font-bold text-blue-900">{vehicleLookup.lastVisit.driverName}</p>
									</div>
								{/if}
								{#if vehicleLookup.lastVisit.vendorName}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-blue-400 uppercase">
											Vendor
										</p>
										<p class="font-bold text-blue-900">{vehicleLookup.lastVisit.vendorName}</p>
									</div>
								{/if}
								<div>
									<p class="text-[10px] font-bold tracking-widest text-blue-400 uppercase">Type</p>
									<p class="font-bold text-blue-900">
										{vehicleLookup.lastVisit.type === 'transport'
											? i18n.t('transportVehicle')
											: i18n.t('regularVehicle')}
									</p>
								</div>
							</div>
						</div>
					{:else if !vehicleLookup.found}
						<div
							class="flex items-center gap-3 rounded-xl border-2 border-emerald-100 bg-emerald-50 p-4"
						>
							<CheckCircle2 size={20} class="shrink-0 text-emerald-600" />
							<p class="font-bold text-emerald-800">New vehicle - no previous visits found</p>
						</div>
					{/if}
				{/if}

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
						>{i18n.t('vehicleType')}</Label
					>
					<div class="grid grid-cols-2 gap-2">
						<input
							type="radio"
							name="type"
							value="transport"
							id="type-transport"
							class="peer/transport hidden"
							checked
						/>
						<label
							for="type-transport"
							class="flex cursor-pointer items-center justify-center rounded-xl border-2 p-3 font-bold transition-all peer-checked/transport:border-primary-500 peer-checked/transport:bg-primary-50"
						>
							{i18n.t('transportVehicle')}
						</label>
						<input
							type="radio"
							name="type"
							value="regular"
							id="type-regular"
							class="peer/regular hidden"
						/>
						<label
							for="type-regular"
							class="flex cursor-pointer items-center justify-center rounded-xl border-2 p-3 font-bold transition-all peer-checked/regular:border-primary-500 peer-checked/regular:bg-primary-50"
						>
							{i18n.t('regularVehicle')}
						</label>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
							>{i18n.t('driverName')}</Label
						>
						<Input name="driverName" class="h-11 border-2" placeholder="Driver's name" />
					</div>
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
							>{i18n.t('helperName')}</Label
						>
						<Input name="helperName" class="h-11 border-2" placeholder="Helper's name" />
					</div>
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
						>{i18n.t('phone')}</Label
					>
					<Input name="mobile" class="h-11 border-2" placeholder="Phone number" />
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
						>{i18n.t('vendorName')}</Label
					>
					<Input name="vendorName" class="h-11 border-2" placeholder="Company / Vendor name" />
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
						>{i18n.t('cargo')}</Label
					>
					<Input name="cargoDescription" class="h-11 border-2" placeholder="Cargo description" />
				</div>

				<div class="flex gap-3 pt-2">
					<Button
						type="button"
						variant="ghost"
						class="h-12 flex-1 font-bold"
						onclick={() => (isCheckInOpen = false)}
					>
						{i18n.t('cancel')}
					</Button>
					<Button
						type="submit"
						class="h-12 flex-1 gap-2 text-base font-black"
						disabled={vehicleLookup?.currentlyInside}
					>
						<LogIn size={20} />
						{i18n.t('checkIn')}
					</Button>
				</div>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>
