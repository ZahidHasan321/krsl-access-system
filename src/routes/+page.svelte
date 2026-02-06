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
		Layers,
		CircleDot,
		UserPlus
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { format, parseISO } from 'date-fns';
	import { goto, invalidateAll } from '$app/navigation';
	import { clsx } from 'clsx';
	import { cn, getCategoryLevelClass, statusBadgeClasses, getCategoryColorClass } from '$lib/utils';
	import CheckInDialog from '$lib/components/CheckInDialog.svelte';
	import VehicleCheckInDialog from '$lib/components/VehicleCheckInDialog.svelte';
	import RegisterDialog from './people/RegisterDialog.svelte';
	import DashboardCategoryRow from '$lib/components/DashboardCategoryRow.svelte';
	import { getCategoryById } from '$lib/constants/categories';
	import CountUp from '$lib/components/ui/CountUp.svelte';

	let { data }: { data: PageData } = $props();

	// Real-time updates using Server-Sent Events
	$effect(() => {
		const eventSource = new EventSource('/api/events');

		eventSource.onmessage = (event) => {
			if (event.data === 'update') {
				invalidateAll();
			}
		};

		eventSource.onerror = () => {
			// If connection drops, retry after a delay
			setTimeout(() => {
				if (eventSource.readyState === EventSource.CLOSED) {
					// Svelte will re-run effect if we trigger a change or just let it naturally reconnect
				}
			}, 5000);
		};

		return () => eventSource.close();
	});

	let isCheckInTypeSelectOpen = $state(false);
	let isPersonCheckInOpen = $state(false);
	let isVehicleCheckInOpen = $state(false);
	let isRegisterOpen = $state(false);

	const trendMax = $derived(Math.max(...data.trend7Day.map((d) => d.count), 1));
	const trendTotal = $derived(data.trend7Day.reduce((a, d) => a + d.count, 0));

	function dayLabel(dateStr: string) {
		const d = parseISO(dateStr);
		const today = new Date();
		if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'Today';
		return format(d, 'EEE');
	}

	function openPersonCheckIn() {
		isCheckInTypeSelectOpen = false;
		isPersonCheckInOpen = true;
	}

	function openVehicleCheckIn() {
		isCheckInTypeSelectOpen = false;
		isVehicleCheckInOpen = true;
	}
</script>

<svelte:head>
	<title>{i18n.t('dashboard')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
		<div class="space-y-1">
			<div class="flex items-center gap-3">
				<h1 class="text-3xl leading-tight font-black tracking-tight text-slate-900">
					{i18n.t('dashboard')}
				</h1>
				<div
					class="flex animate-pulse items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-600"
				>
					<div class="size-1.5 rounded-full bg-emerald-500"></div>
					<span class="text-[10px] font-black tracking-widest uppercase">Live</span>
				</div>
			</div>
			<div class="flex items-center gap-2 font-bold text-slate-500">
				<Calendar size={16} />
				<span class="text-sm"
					>{new Date().toLocaleDateString(i18n.lang === 'bn' ? 'bn-BD' : 'en-US', {
						weekday: 'long',
						year: 'numeric',
						month: 'long',
						day: 'numeric'
					})}</span
				>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if data.user?.permissions.includes('people.create')}
				<Button
					variant="default"
					class="h-10 gap-2 px-5 font-bold shadow-lg"
					onclick={() => (isCheckInTypeSelectOpen = true)}
				>
					<PlayCircle size={18} />
					{i18n.t('checkIn')}
				</Button>
				<Button
					variant="outline"
					class="h-10 gap-2 border-2 bg-white px-5 font-bold"
					onclick={() => (isRegisterOpen = true)}
				>
					<PlusCircle size={18} />
					{i18n.t('register')}
				</Button>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
		<!-- Left Column: Currently Inside -->
		<div class="space-y-6 lg:col-span-2">
			<Card.Root class="overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
				<Card.Header class="px-4 py-3">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Card.Title
								class="flex items-center gap-2 text-lg font-black tracking-tight text-slate-900"
							>
								<Users size={20} class="text-primary-600" />
								{i18n.t('currentlyInside')}
							</Card.Title>
						</div>
						<div
							class="flex flex-col items-end rounded-xl border-2 border-primary-100 bg-primary-50 px-3 py-1.5"
						>
							<span class="text-xl leading-none font-black text-primary-700"
								><CountUp value={data.currentlyInside?.totalPeople || 0} /></span
							>
							<span class="text-[9px] font-black tracking-widest text-primary-500 uppercase"
								>Total People</span
							>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="p-4 pt-0">
					<div class="space-y-1">
						{#each data.currentlyInside.categoryTree as root (root.id)}
							<DashboardCategoryRow category={root} level={0} />
						{:else}
							<div
								class="py-10 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
							>
								<UserCheck size={40} class="mx-auto text-slate-300 mb-2" />
								<p class="text-slate-500 font-bold text-sm">No one currently on premises</p>
							</div>
						{/each}
					</div>

					<!-- Vehicles Section -->
					<div class="mt-6 border-t-2 border-slate-100 pt-4">
						<div class="grid grid-cols-1 gap-3 md:grid-cols-3">
							<!-- Total Vehicles -->
							<div
								class="flex items-center justify-between rounded-xl border-2 border-amber-100 bg-amber-50 p-3 shadow-sm"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-100 text-amber-700"
									>
										<Truck size={20} />
									</div>
									<div>
										<h3 class="text-sm font-black text-slate-900">{i18n.t('vehicles')}</h3>
										<p class="text-[9px] font-black tracking-widest text-amber-600 uppercase">
											On Premises
										</p>
									</div>
								</div>
								<div class="text-right">
									<span class="block text-xl leading-none font-black text-amber-700"
										><CountUp value={data.currentlyInside?.vehicleStats?.total || 0} /></span
									>
								</div>
							</div>

							<!-- Transport Vehicles -->
							<div
								class="flex items-center justify-between rounded-xl border-2 border-blue-100 bg-blue-50 p-3 shadow-sm"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-100 text-blue-700"
									>
										<Truck size={16} />
									</div>
									<div>
										<h3 class="text-xs font-black text-slate-800">{i18n.t('transportVehicle')}</h3>
										<p class="text-[8px] font-black tracking-widest text-blue-600 uppercase">
											Logistics
										</p>
									</div>
								</div>
								<div class="text-right">
									<span class="block text-lg leading-none font-black text-blue-700"
										><CountUp value={data.currentlyInside?.vehicleStats?.transport || 0} /></span
									>
								</div>
							</div>

							<!-- Regular Vehicles -->
							<div
								class="flex items-center justify-between rounded-xl border-2 border-indigo-100 bg-indigo-50 p-3 shadow-sm"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-100 text-indigo-700"
									>
										<Truck size={16} />
									</div>
									<div>
										<h3 class="text-xs font-black text-slate-800">{i18n.t('regularVehicle')}</h3>
										<p class="text-[8px] font-black tracking-widest text-indigo-600 uppercase">
											Personal
										</p>
									</div>
								</div>
								<div class="text-right">
									<span class="block text-lg leading-none font-black text-indigo-700"
										><CountUp value={data.currentlyInside?.vehicleStats?.regular || 0} /></span
									>
								</div>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Right Column: Activity & Stats -->
		<div class="space-y-6">
			<!-- Quick Stats Mini-Grid -->
			<div class="grid grid-cols-2 gap-3">
				<div class="rounded-xl border-2 border-emerald-100 bg-white p-3 shadow-sm">
					<div class="mb-1.5 flex items-center gap-2 text-emerald-700">
						<ArrowRight size={14} />
						<span class="text-[9px] font-black tracking-widest uppercase">Today's Entries</span>
					</div>
					<span class="text-xl font-black text-slate-900"><CountUp value={data.todayActivity?.entries || 0} /></span>
				</div>
				<div class="rounded-xl border-2 border-rose-100 bg-white p-3 shadow-sm">
					<div class="mb-1.5 flex items-center gap-2 text-rose-700">
						<LogOut size={14} />
						<span class="text-[9px] font-black tracking-widest uppercase">Today's Exits</span>
					</div>
					<span class="text-xl font-black text-slate-900"><CountUp value={data.todayActivity?.exits || 0} /></span>
				</div>
			</div>

			<!-- Recent Activity -->
			<Card.Root class="border-2 border-slate-200 bg-white shadow-sm">
				<Card.Header class="px-4 py-3">
					<div class="flex items-center justify-between">
						<Card.Title
							class="flex items-center gap-2 text-xs font-black tracking-widest text-slate-600 uppercase"
						>
							<Clock size={14} />
							Recent Activity
						</Card.Title>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 text-[10px] font-black text-primary-600 hover:bg-primary-50"
							href="/attendance"
						>
							View all
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0">
					<div class="divide-y-2 divide-slate-50">
						{#each data.recentLogs as log (log.id)}
							<button
								class="group flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
								onclick={() => goto(`/people/${log.personId}`)}
							>
								<div class="flex min-w-0 items-center gap-3">
									<div
										class="size-7 rounded-full {log.status === 'on_premises'
											? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
											: 'border border-slate-200 bg-slate-100 text-slate-500'} flex shrink-0 items-center justify-center transition-colors group-hover:scale-110"
									>
										{#if log.status === 'on_premises'}
											<ArrowRight size={12} />
										{:else}
											<LogOut size={12} />
										{/if}
									</div>
									<div class="min-w-0">
										<p class="truncate text-xs font-bold text-slate-900">{log.personName}</p>
										<div class="flex items-center gap-1.5">
											<p
												class="truncate text-[9px] font-black tracking-wider text-slate-500 uppercase"
											>
												{log.categoryName}
											</p>
										</div>
									</div>
								</div>
								<div class="shrink-0 pl-2 text-right">
									<p class="text-[10px] font-black text-slate-900">
										{format(log.entryTime, 'hh:mm a')}
									</p>
									{#if log.status === 'on_premises'}
										<span
											class={cn(
												'rounded-md border px-1 py-0.5 text-[8px] font-black tracking-wide uppercase',
												statusBadgeClasses.on_premises
											)}>In</span
										>
									{:else}
										<span
											class={cn(
												'rounded-md border px-1 py-0.5 text-[8px] font-black tracking-wide uppercase',
												statusBadgeClasses.checked_out
											)}>Out</span
										>
									{/if}
								</div>
							</button>
						{:else}
							<div class="p-6 text-center text-slate-500 text-sm font-bold">No activity today</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- 7-Day Trend -->
			<Card.Root class="border-2 border-slate-200 bg-white shadow-sm">
				<Card.Header class="px-4 py-3">
					<div class="flex items-center justify-between">
						<Card.Title
							class="flex items-center gap-2 text-xs font-black tracking-widest text-slate-600 uppercase"
						>
							<TrendingUp size={14} />
							{i18n.t('trend7Day')}
						</Card.Title>
						<span class="text-[10px] font-black text-slate-500">{trendTotal} total</span>
					</div>
				</Card.Header>
				<Card.Content class="p-4 pt-0">
					<div class="flex h-32 items-end gap-2 pt-6">
						{#each data.trend7Day as day, i (day.date)}
							{@const isToday = i === data.trend7Day.length - 1}
							{@const pct = trendMax > 0 ? (day.count / trendMax) * 100 : 0}
							<div class="group flex flex-1 flex-col items-center h-full">
								<!-- Bar Container -->
								<div class="relative flex-1 w-full flex items-end justify-center">
									<!-- Tooltip-ish Value -->
									<div
										class="pointer-events-none absolute -top-6 z-10 rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-black text-white opacity-0 transition-opacity group-hover:opacity-100"
									>
										{day.count}
									</div>

									<!-- Bar -->
									<div
										class={clsx(
											'w-full max-w-[20px] rounded-t-sm transition-all duration-500',
											isToday ? 'bg-primary-600' : 'bg-slate-200 group-hover:bg-primary-400'
										)}
										style="height: {Math.max(pct, 5)}%"
									></div>
								</div>
								
								<!-- Day label -->
								<span
									class={clsx(
										'w-full truncate text-center text-[8px] font-black uppercase mt-2',
										isToday ? 'text-primary-700' : 'text-slate-500'
									)}
								>
									{dayLabel(day.date).slice(0, 3)}
								</span>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<!-- Check-in Type Selection Dialog -->
<Dialog.Root bind:open={isCheckInTypeSelectOpen}>
	<Dialog.Content class="sm:max-w-112.5">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-black">Choose Entry Type</Dialog.Title>
			<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
				Select the type of entry to record
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid grid-cols-2 gap-4 py-4">
			<button
				class="group flex flex-col items-center justify-center rounded-3xl border-2 border-slate-100 p-6 transition-all hover:border-primary-500 hover:bg-primary-50"
				onclick={openPersonCheckIn}
			>
				<div
					class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-primary-100 group-hover:text-primary-600"
				>
					<Users size={32} />
				</div>
				<span class="font-black text-slate-900">{i18n.t('personLabel')}</span>
			</button>

			<button
				class="group flex flex-col items-center justify-center rounded-3xl border-2 border-slate-100 p-6 transition-all hover:border-amber-500 hover:bg-amber-50"
				onclick={openVehicleCheckIn}
			>
				<div
					class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-amber-100 group-hover:text-amber-600"
				>
					<Truck size={32} />
				</div>
				<span class="font-black text-slate-900">{i18n.t('vehicles')}</span>
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<CheckInDialog
	bind:open={isPersonCheckInOpen}
/>
<VehicleCheckInDialog bind:open={isVehicleCheckInOpen} />
<RegisterDialog bind:open={isRegisterOpen} />

