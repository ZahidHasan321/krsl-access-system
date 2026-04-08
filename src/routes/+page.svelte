<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import {
		Users,
		UserCheck,
		Truck,
		TrendingUp,
		Calendar,
		PlusCircle,
		PlayCircle,
		Clock,
		ArrowRight,
		ChevronRight,
		LogOut,
		CornerDownRight,
		UserPlus,
		Ship,
		Warehouse,
		ScanFace,
		Fingerprint,
		IdCard,
		PenTool,
		Printer,
		Radio,
		Wifi,
		WifiOff
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { format, parseISO } from 'date-fns';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import PrintHeader from '$lib/components/PrintHeader.svelte';
	import { clsx } from 'clsx';
	import { cn, getCategoryLevelClass, statusBadgeClasses, getCategoryColorClass } from '$lib/utils';
	import CheckInDialog from '$lib/components/CheckInDialog.svelte';
	import VehicleCheckInDialog from '$lib/components/VehicleCheckInDialog.svelte';
	import RegisterDialog from './people/RegisterDialog.svelte';
	import DashboardCategoryRow from '$lib/components/DashboardCategoryRow.svelte';
	import { getCategoryById } from '$lib/constants/categories';
	import CountUp from '$lib/components/ui/CountUp.svelte';

	let { data }: { data: PageData } = $props();

	// Real-time updates are handled by the layout's SSE connection,
	// which calls invalidateAll() with debounce on every event.

	let isCheckInTypeSelectOpen = $state(false);
	let isPersonCheckInOpen = $state(false);
	let isVehicleCheckInOpen = $state(false);
	let isRegisterOpen = $state(false);
	let isPrintMode = $derived(page.url.searchParams.has('print'));
	let leftColHeight = $state(0);

	$effect(() => {
		if (isPrintMode) {
			tick().then(() => {
				window.print();
				const url = new URL(page.url);
				url.searchParams.delete('print');
				goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
			});
		}
	});

	function openPersonCheckIn() {
		isCheckInTypeSelectOpen = false;
		isPersonCheckInOpen = true;
	}

	function openVehicleCheckIn() {
		isCheckInTypeSelectOpen = false;
		isVehicleCheckInOpen = true;
	}

	function printDashboard() {
		const url = new URL(page.url);
		url.searchParams.set('print', '');
		url.searchParams.set('limit', '999');
		goto(url.toString(), { noScroll: true });
	}
</script>

<svelte:head>
	<title>{i18n.t('dashboard')} | {i18n.t('appName')}</title>
</svelte:head>

<!-- Print Only Report -->
<div class={cn('print-only', !isPrintMode && 'hidden')} style="page-break-after: always;">
	<div style="padding: 15px 30px; font-family: 'Inter', sans-serif; color: #000; background: #fff; max-height: 100vh; overflow: hidden;">
		<PrintHeader title="Operations Summary" />

		<div style="display: flex !important; gap: 2rem; margin-bottom: 1rem; font-size: 11px; font-weight: 900; color: #334155;">
			<span>Personnel Inside: <span style="color: #1c55a4;">{data.currentlyInside.totalPeople}</span></span>
			<span>Total Registered: <span style="color: #1c55a4;">{data.totalPeople}</span></span>
			<span>Vehicles Inside: <span style="color: #b45309;">{data.currentlyInside.totalVehicles}</span></span>
		</div>

		<!-- Section 1: Summary of Personnel -->
		<div style="margin-bottom: 20px;">
			<h3 style="font-size: 12px; background: #fff; color: #1c55a4; padding: 6px 10px; border-left: 4px solid #1c55a4; margin-bottom: 10px; font-weight: 900; letter-spacing: 0.5px;">I. PERSONNEL STATUS SUMMARY</h3>
			<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
				<thead>
					<tr style="border-bottom: 2px solid #1c55a4;">
						<th style="text-align: left; padding: 8px; font-size: 11px; width: 40%; color: #1c55a4;">Category Description</th>
						<th style="text-align: center; padding: 8px; font-size: 11px; color: #1c55a4;">Total Registered</th>
						<th style="text-align: center; padding: 8px; font-size: 11px; color: #1c55a4;">Currently Inside</th>
					</tr>
				</thead>
				<tbody>
					{#each data.currentlyInside.categoryTree as cat}
						<tr style="border-bottom: 1px solid #e2e8f0; background: #fff;">
							<td style="padding: 8px; font-size: 11px; font-weight: bold; color: #334155;">{cat.name}</td>
							<td style="padding: 8px; font-size: 11px; text-align: center; color: #475569;">{cat.registeredCount}</td>
							<td style="padding: 8px; font-size: 11px; text-align: center; font-weight: bold; color: #000;">{cat.count}</td>
						</tr>
						{#each cat.children as sub}
							<tr style="border-bottom: 1px solid #e2e8f0; color: #64748b;">
								<td style="padding: 6px 8px 6px 30px; font-size: 10px;">{sub.name}</td>
								<td style="padding: 6px 8px; font-size: 10px; text-align: center;">{sub.registeredCount}</td>
								<td style="padding: 6px 8px; font-size: 10px; text-align: center;">{sub.count}</td>
							</tr>
						{/each}
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Section 2: Logistics & Locations -->
		<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
			<div>
				<h3 style="font-size: 12px; background: #fff; color: #1c55a4; padding: 6px 10px; border-left: 4px solid #1c55a4; margin-bottom: 10px; font-weight: 900; letter-spacing: 0.5px;">II. LOGISTICS STATUS</h3>
				<table style="width: 100%; border-collapse: collapse;">
					<tbody>
						<tr style="border-bottom: 1px solid #e2e8f0;">
							<td style="padding: 8px; font-size: 10px; color: #475569;">Transport Vehicles Inside</td>
							<td style="padding: 8px; font-size: 11px; text-align: right; font-weight: 900; color: #1c55a4;">{data.currentlyInside.vehicleStats.transport}</td>
						</tr>
						<tr style="border-bottom: 1px solid #e2e8f0;">
							<td style="padding: 8px; font-size: 10px; color: #475569;">Regular Vehicles Inside</td>
							<td style="padding: 8px; font-size: 11px; text-align: right; font-weight: 900; color: #1c55a4;">{data.currentlyInside.vehicleStats.regular}</td>
						</tr>
						<tr style="background: #fff;">
							<td style="padding: 8px; font-size: 10px; font-weight: bold; color: #0f172a;">Total Vehicles On-Premises</td>
							<td style="padding: 8px; font-size: 11px; text-align: right; font-weight: 900; color: #b45309; border-top: 1px solid #b45309;">{data.currentlyInside.totalVehicles}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<div>
				<h3 style="font-size: 12px; background: #fff; color: #1c55a4; padding: 6px 10px; border-left: 4px solid #1c55a4; margin-bottom: 10px; font-weight: 900; letter-spacing: 0.5px;">III. LOCATION DISTRIBUTION</h3>
				<table style="width: 100%; border-collapse: collapse;">
					<tbody>
						<tr style="border-bottom: 1px solid #e2e8f0;">
							<td style="padding: 8px; font-size: 10px; color: #475569;">Yard Operations</td>
							<td style="padding: 8px; font-size: 11px; text-align: right; font-weight: 900; color: #000;">{data.locationStats.yard}</td>
						</tr>
						<tr style="border-bottom: 1px solid #e2e8f0;">
							<td style="padding: 8px; font-size: 10px; color: #475569;">Ship Boarding</td>
							<td style="padding: 8px; font-size: 11px; text-align: right; font-weight: 900; color: #0369a1;">{data.locationStats.ship}</td>
						</tr>
						<tr style="background: #fff;">
							<td style="padding: 8px; font-size: 10px; font-weight: bold; color: #0f172a;">Total Verified Personnel</td>
							<td style="padding: 8px; font-size: 11px; text-align: right; font-weight: 900; color: #1c55a4; border-top: 1px solid #1c55a4;">{data.locationStats.yard + data.locationStats.ship}</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Footer / Signatures -->
		<div style="margin-top: 60px; display: flex; justify-content: space-between;">
			<div style="width: 180px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">
				<p style="font-size: 10px; font-weight: bold; margin: 0;">Prepared By</p>
				<p style="font-size: 8px; color: #666; margin: 2px 0;">System Generated</p>
			</div>
			<div style="width: 180px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">
				<p style="font-size: 10px; font-weight: bold; margin: 0;">Security Supervisor</p>
				<p style="font-size: 8px; color: #666; margin: 2px 0;">KR Steel Ltd.</p>
			</div>
			<div style="width: 180px; border-top: 1px solid #000; text-align: center; padding-top: 5px;">
				<p style="font-size: 10px; font-weight: bold; margin: 0;">Official Authorization</p>
				<p style="font-size: 8px; color: #666; margin: 2px 0;">Date & Stamp</p>
			</div>
		</div>

		<div style="margin-top: 40px; text-align: center; border-top: 1px solid #eee; padding-top: 8px;">
			<p style="font-size: 8px; color: #999; margin: 0;">This is an electronically generated report. For security purposes, please verify all data against the live system logs.</p>
			<p style="font-size: 8px; color: #999; margin: 2px 0;">© {new Date().getFullYear()} KR Steel Ltd. Access Management System v1.0</p>
		</div>
	</div>
</div>

<div class="no-print space-y-5 pb-10">
	<!-- Header -->
	<div class="content-container flex items-start justify-between gap-3 sm:items-end">
		<div>
			<div class="flex items-center gap-3">
				<h1 class="text-2xl leading-tight font-black tracking-tighter text-slate-900 capitalize sm:text-3xl">
					<span class="electric-text">{i18n.t('dashboard')}</span>
				</h1>
				{#if data.anyDeviceOnline}
					<div class="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-600">
						<div class="size-1.5 animate-pulse rounded-full bg-emerald-500"></div>
						<span class="text-[10px] font-black tracking-widest uppercase">Live</span>
					</div>
				{/if}
			</div>
			<div class="mt-1 flex items-center gap-2 text-sm font-bold text-slate-400">
				<Calendar size={14} />
				<span>{new Date().toLocaleDateString(i18n.lang === 'bn' ? 'bn-BD' : 'en-US', {
					weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
				})}</span>
			</div>
		</div>
		<div class="flex shrink-0 items-center gap-2">
			<Button variant="ghost" size="icon" class="size-10 text-slate-400 hover:bg-slate-100" aria-label="Print report" onclick={printDashboard}>
				<Printer size={18} />
			</Button>
			{#if data.user?.permissions.includes('people.create')}
				<Button variant="default" class="h-9 gap-2 px-4 text-xs font-black shadow-lg" onclick={() => (isCheckInTypeSelectOpen = true)}>
					<PlayCircle size={15} />
					<span class="hidden sm:inline">{i18n.t('checkIn')}</span>
				</Button>
				<Button variant="outline" class="h-9 gap-2 border-2 bg-white px-3 text-xs font-black" onclick={() => (isRegisterOpen = true)}>
					<PlusCircle size={15} />
					<span class="hidden sm:inline">{i18n.t('register')}</span>
				</Button>
			{/if}
		</div>
	</div>

	<!-- Key Numbers Strip -->
	<div class="content-container grid grid-cols-2 gap-3 sm:grid-cols-4">
		<button class="card-pressable group relative cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-slate-900 to-primary-900 p-4 text-left shadow-lg shadow-slate-900/10 ring-1 ring-white/10 transition-all duration-200 hover:shadow-xl hover:shadow-primary-900/20 hover:ring-white/20 hover:brightness-110 active:brightness-95" onclick={() => goto('/attendance')}>
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(28,85,164,0.25),transparent_60%)] transition-opacity duration-200 group-hover:opacity-150"></div>
			<div class="relative">
				<div class="flex items-center gap-2 text-primary-300/80 transition-colors group-hover:text-primary-200">
					<Users size={14} />
					<span class="text-[9px] font-black tracking-widest uppercase">People Inside</span>
				</div>
				<p class="mt-2 text-3xl font-black tabular-nums tracking-tight text-white"><CountUp value={data.currentlyInside?.totalPeople || 0} /></p>
			</div>
		</button>
		<button class="card-pressable group relative cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 p-4 text-left shadow-lg shadow-amber-900/15 ring-1 ring-white/10 transition-all duration-200 hover:shadow-xl hover:shadow-amber-800/25 hover:ring-white/20 hover:brightness-110 active:brightness-95" onclick={() => goto('/vehicles')}>
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_60%)]"></div>
			<div class="relative">
				<div class="flex items-center gap-2 text-amber-200/80 transition-colors group-hover:text-amber-100">
					<Truck size={14} />
					<span class="text-[9px] font-black tracking-widest uppercase">{i18n.t('vehicles')}</span>
				</div>
				<p class="mt-2 text-3xl font-black tabular-nums tracking-tight text-white"><CountUp value={data.currentlyInside?.vehicleStats?.total || 0} /></p>
			</div>
		</button>
		<button class="card-pressable group relative cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-sky-600 via-blue-700 to-blue-800 p-4 text-left shadow-lg shadow-blue-900/15 ring-1 ring-white/10 transition-all duration-200 hover:shadow-xl hover:shadow-blue-800/25 hover:ring-white/20 hover:brightness-110 active:brightness-95" onclick={() => goto('/attendance?location=ship')}>
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_60%)]"></div>
			<div class="relative">
				<div class="flex items-center gap-2 text-sky-200/80 transition-colors group-hover:text-sky-100">
					<Ship size={14} />
					<span class="text-[9px] font-black tracking-widest uppercase">Ship</span>
				</div>
				<p class="mt-2 text-3xl font-black tabular-nums tracking-tight text-white"><CountUp value={data.locationStats?.ship || 0} /></p>
			</div>
		</button>
		<button class="card-pressable group relative cursor-pointer overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-800 p-4 text-left shadow-lg shadow-emerald-900/15 ring-1 ring-white/10 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-800/25 hover:ring-white/20 hover:brightness-110 active:brightness-95" onclick={() => goto('/attendance?location=yard')}>
			<div class="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.08),transparent_60%)]"></div>
			<div class="relative">
				<div class="flex items-center gap-2 text-emerald-200/80 transition-colors group-hover:text-emerald-100">
					<Warehouse size={14} />
					<span class="text-[9px] font-black tracking-widest uppercase">Yard</span>
				</div>
				<p class="mt-2 text-3xl font-black tabular-nums tracking-tight text-white"><CountUp value={data.locationStats?.yard || 0} /></p>
			</div>
		</button>
	</div>

	<!-- Main Content -->
	<div class="content-container grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
		<!-- Activity Feed — first on mobile, right on desktop -->
		<div class="order-1 lg:order-2">
			<div class="activity-feed-panel flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm" style:--feed-height="{leftColHeight}px">
				<div class="relative shrink-0 overflow-hidden border-b border-slate-800 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 px-4 py-3">
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(28,85,164,0.2),transparent_50%)]"></div>
					<div class="relative flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Clock size={14} class="text-slate-400" />
							<h2 class="text-xs font-black tracking-widest text-slate-300 uppercase">Activity</h2>
						</div>
						<Button variant="ghost" size="sm" class="h-7 text-[10px] font-black text-primary-300 hover:bg-white/10 hover:text-white" href="/attendance">
							All
						</Button>
					</div>
				</div>
				<div class="min-h-0 flex-1 overflow-y-auto">
					<div class="divide-y divide-slate-100">
						{#each data.recentLogs as log (log.id)}
							<button
								class="touch-feedback group flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-primary-50/40 active:bg-primary-100/40"
								onclick={() => goto(`/people/${log.personId}`)}
							>
								<div class="flex min-w-0 items-center gap-2.5">
									<div class={cn(
										'flex size-7 shrink-0 items-center justify-center rounded-full border',
										log.status === 'on_premises'
											? 'border-emerald-200 bg-emerald-100 text-emerald-700'
											: 'border-slate-200 bg-slate-100 text-slate-500'
									)}>
										{#if log.status === 'on_premises'}<ArrowRight size={12} />{:else}<LogOut size={12} />{/if}
									</div>
									<div class="min-w-0">
										<p class="truncate text-xs font-black text-slate-900 transition-colors group-hover:text-primary-700">{log.personName}</p>
										<div class="flex items-center gap-1.5">
											<span class="text-[9px] font-bold text-slate-400">{log.categoryName}</span>
											{#if log.verifyMethod}
												<div class={cn('flex size-4 items-center justify-center rounded-full',
													log.verifyMethod === 'face' ? 'text-indigo-500'
													: log.verifyMethod === 'finger' ? 'text-emerald-500'
													: log.verifyMethod === 'card' ? 'text-amber-500'
													: 'text-slate-400'
												)}>
													{#if log.verifyMethod === 'face'}<ScanFace size={10} />
													{:else if log.verifyMethod === 'finger'}<Fingerprint size={10} />
													{:else if log.verifyMethod === 'card'}<IdCard size={10} />
													{:else}<PenTool size={10} />
													{/if}
												</div>
											{/if}
										</div>
									</div>
								</div>
								<div class="flex shrink-0 flex-col items-end gap-0.5 pl-2">
									<span class="text-[10px] font-black tabular-nums text-slate-600">
										{log.status === 'checked_out' && log.exitTime
											? format(new Date(log.exitTime), 'hh:mm a')
											: log.entryTime ? format(new Date(log.entryTime), 'hh:mm a') : '--:--'}
									</span>
									{#if log.status === 'on_premises'}
										<span class={cn('rounded px-1 py-0.5 text-[7px] font-black tracking-wider uppercase', statusBadgeClasses.on_premises)}>In</span>
									{:else}
										<span class={cn('rounded px-1 py-0.5 text-[7px] font-black tracking-wider uppercase', statusBadgeClasses.checked_out)}>Out</span>
									{/if}
								</div>
							</button>
						{:else}
							<div class="flex flex-col items-center justify-center py-16 text-center">
								<Clock size={32} class="mb-2 text-slate-200" />
								<p class="text-sm font-bold text-slate-400">No recent activity</p>
							</div>
						{/each}
					</div>
				</div>
			</div>
		</div>

		<!-- Left Column — second on mobile, first on desktop -->
		<div class="order-2 space-y-5 lg:order-1 lg:col-span-2" bind:clientHeight={leftColHeight}>
			<!-- Category Breakdown -->
			<div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
				<div class="relative overflow-hidden border-b border-primary-800 bg-gradient-to-r from-primary-800 via-primary-900 to-slate-900 px-4 py-3.5">
					<div class="absolute inset-0 bg-[radial-gradient(circle_at_100%_50%,rgba(32,159,207,0.15),transparent_50%)]"></div>
					<div class="relative flex items-center justify-between">
						<div class="flex items-center gap-2">
							<UserCheck size={15} class="text-primary-300" />
							<h2 class="text-xs font-black tracking-widest text-primary-200/90 uppercase">{i18n.t('currentlyInside')}</h2>
						</div>
						<span class="text-xl font-black tabular-nums text-white"><CountUp value={data.currentlyInside?.totalPeople || 0} /></span>
					</div>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-slate-100">
					<!-- Categories -->
					<div class="p-4">
						<p class="mb-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">By Category</p>
						<div class="space-y-1">
							{#each data.currentlyInside.categoryTree as root (root.id)}
								<DashboardCategoryRow category={root} level={0} />
							{:else}
								<div class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-center">
									<UserCheck size={32} class="mb-2 text-slate-300" />
									<p class="text-sm font-bold text-slate-500">No one on premises</p>
								</div>
							{/each}
						</div>
					</div>
					<!-- Departments -->
					<div class="border-t border-slate-100 p-4 md:border-t-0">
						<p class="mb-3 text-[9px] font-black tracking-widest text-slate-400 uppercase">By Department</p>
						<div class="space-y-1.5">
							{#each data.currentlyInside.registeredByDepartment.filter(d => d.department).sort((a, b) => {
								const map = new Map(data.currentlyInside.insideByDepartment.map(d => [d.department, d.count]));
								return (map.get(b.department) || 0) - (map.get(a.department) || 0);
							}) as dept}
								{@const insideCount = new Map(data.currentlyInside.insideByDepartment.map(d => [d.department, d.count])).get(dept.department) || 0}
								{@const percentage = dept.count > 0 ? Math.round((insideCount / dept.count) * 100) : 0}
								<button
									class="card-pressable group w-full rounded-lg border border-slate-200/80 bg-white p-2.5 text-left shadow-sm transition-all hover:border-primary-300 hover:shadow-md active:bg-slate-50"
									onclick={() => goto(`/attendance?category=employee&department=${encodeURIComponent(dept.department || '')}`)}
								>
									<div class="mb-2 flex items-center justify-between">
										<span class="text-[11px] font-black tracking-tight text-slate-700 uppercase">{dept.department}</span>
										<div class="flex items-baseline gap-1">
											<span class="text-sm font-black tabular-nums text-primary-700">{insideCount}</span>
											<span class="text-[10px] font-bold tabular-nums text-slate-400">/{dept.count}</span>
										</div>
									</div>
									<div class="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
										<div class="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-[width] duration-700" style="width: {percentage}%"></div>
									</div>
								</button>
							{:else}
								<div class="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-slate-100 text-center">
									<p class="text-[10px] font-bold text-slate-400 uppercase">No department data</p>
								</div>
							{/each}
						</div>
					</div>
				</div>
			</div>

			<!-- Vehicles & Methods -->
			<div class="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
				<div class="rounded-xl border border-blue-200/60 bg-gradient-to-b from-blue-50 to-white p-3 shadow-sm">
					<div class="mb-2 flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/20">
						<Truck size={13} />
					</div>
					<p class="text-xl font-black tabular-nums text-slate-900"><CountUp value={data.currentlyInside?.vehicleStats?.transport || 0} /></p>
					<span class="text-[8px] font-black tracking-widest text-blue-600/70 uppercase">Transport</span>
				</div>
				<div class="rounded-xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50 to-white p-3 shadow-sm">
					<div class="mb-2 flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
						<Truck size={13} />
					</div>
					<p class="text-xl font-black tabular-nums text-slate-900"><CountUp value={data.currentlyInside?.vehicleStats?.regular || 0} /></p>
					<span class="text-[8px] font-black tracking-widest text-indigo-600/70 uppercase">Regular</span>
				</div>
				<div class="rounded-xl border border-violet-200/60 bg-gradient-to-b from-violet-50 to-white p-3 shadow-sm">
					<div class="mb-2 flex size-7 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm shadow-violet-600/20">
						<ScanFace size={13} />
					</div>
					<p class="text-xl font-black tabular-nums text-slate-900"><CountUp value={data.methodStats?.face || 0} /></p>
					<span class="text-[8px] font-black tracking-widest text-violet-600/70 uppercase">Face</span>
				</div>
				<div class="rounded-xl border border-emerald-200/60 bg-gradient-to-b from-emerald-50 to-white p-3 shadow-sm">
					<div class="mb-2 flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm shadow-emerald-600/20">
						<Fingerprint size={13} />
					</div>
					<p class="text-xl font-black tabular-nums text-slate-900"><CountUp value={data.methodStats?.finger || 0} /></p>
					<span class="text-[8px] font-black tracking-widest text-emerald-600/70 uppercase">Finger</span>
				</div>
				<div class="rounded-xl border border-amber-200/60 bg-gradient-to-b from-amber-50 to-white p-3 shadow-sm">
					<div class="mb-2 flex size-7 items-center justify-center rounded-lg bg-amber-600 text-white shadow-sm shadow-amber-600/20">
						<IdCard size={13} />
					</div>
					<p class="text-xl font-black tabular-nums text-slate-900"><CountUp value={data.methodStats?.card || 0} /></p>
					<span class="text-[8px] font-black tracking-widest text-amber-600/70 uppercase">Card</span>
				</div>
				<div class="rounded-xl border border-slate-200/60 bg-gradient-to-b from-slate-100 to-white p-3 shadow-sm">
					<div class="mb-2 flex size-7 items-center justify-center rounded-lg bg-slate-600 text-white shadow-sm shadow-slate-600/20">
						<PenTool size={13} />
					</div>
					<p class="text-xl font-black tabular-nums text-slate-900"><CountUp value={data.methodStats?.manual || 0} /></p>
					<span class="text-[8px] font-black tracking-widest text-slate-500/70 uppercase">Manual</span>
				</div>
			</div>

			<!-- Device Status -->
			{#if data.deviceStatus?.length}
				<div class="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
					<div class="relative overflow-hidden border-b border-slate-700 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-700 px-4 py-3">
						<div class="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,rgba(28,85,164,0.15),transparent_50%)]"></div>
						<div class="relative flex items-center justify-between">
							<div class="flex items-center gap-2">
								<Radio size={14} class="text-slate-400" />
								<h2 class="text-xs font-black tracking-widest text-slate-300 uppercase">Device Status</h2>
							</div>
							<Button variant="ghost" size="sm" class="h-7 text-[10px] font-black text-primary-300 hover:bg-white/10 hover:text-white" href="/devices">
								Manage
							</Button>
						</div>
					</div>
					<div class="divide-y divide-slate-100">
						{#each data.deviceStatus as device (device.id)}
							<div class="flex items-center gap-3 px-4 py-3">
								<div class={cn(
									'flex size-9 shrink-0 items-center justify-center rounded-lg',
									device.isOnline
										? 'bg-emerald-100 text-emerald-600'
										: 'bg-red-50 text-red-400'
								)}>
									{#if device.isOnline}<Wifi size={16} />{:else}<WifiOff size={16} />{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-center gap-2">
										<p class="truncate text-xs font-black text-slate-900">{device.name}</p>
										{#if device.isOnline}
											<div class="flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 ring-1 ring-emerald-200/60">
												<div class="size-1.5 animate-pulse rounded-full bg-emerald-500"></div>
												<span class="text-[8px] font-black tracking-widest text-emerald-600 uppercase">Online</span>
											</div>
										{:else}
											<div class="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 ring-1 ring-red-200/60">
												<div class="size-1.5 rounded-full bg-red-400"></div>
												<span class="text-[8px] font-black tracking-widest text-red-500 uppercase">Offline</span>
											</div>
										{/if}
									</div>
									<div class="mt-0.5 flex items-center gap-2 text-[10px] font-bold text-slate-400">
										<span>{device.serialNumber}</span>
										{#if device.location}
											<span>·</span>
											<span class="capitalize">{device.location}</span>
										{/if}
										{#if device.lastHeartbeat}
											<span>·</span>
											<span>Last seen {format(new Date(device.lastHeartbeat), 'hh:mm a')}</span>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

		</div>
	</div>

	<!-- Check-in Type Selection Dialog -->
	<Dialog.Root bind:open={isCheckInTypeSelectOpen}>
		<Dialog.Content class="sm:max-w-112.5">
			<Dialog.Header>
				<Dialog.Title class="text-2xl font-black">Choose Entry Type</Dialog.Title>
				<Dialog.Description class="text-xs font-black tracking-widest text-slate-500 capitalize">
					Select the type of entry to record
				</Dialog.Description>
			</Dialog.Header>
			<div class="grid grid-cols-2 gap-4 py-4">
				<button
					class="card-pressable group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-slate-100 p-6 transition-all hover:border-primary-500 hover:bg-primary-50 active:bg-primary-100"
					onclick={openPersonCheckIn}
				>
					<div class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-primary-100 group-hover:text-primary-600">
						<Users size={32} />
					</div>
					<span class="font-black tracking-tighter text-slate-900 capitalize">{i18n.t('personLabel')}</span>
				</button>
				<button
					class="card-pressable group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-slate-100 p-6 transition-all hover:border-amber-500 hover:bg-amber-50 active:bg-amber-100"
					onclick={openVehicleCheckIn}
				>
					<div class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-amber-100 group-hover:text-amber-600">
						<Truck size={32} />
					</div>
					<span class="font-black tracking-tighter text-slate-900 capitalize">{i18n.t('vehicles')}</span>
				</button>
			</div>
		</Dialog.Content>
	</Dialog.Root>

	<CheckInDialog bind:open={isPersonCheckInOpen} />
	<VehicleCheckInDialog bind:open={isVehicleCheckInOpen} />
	<RegisterDialog bind:open={isRegisterOpen} />
</div>
