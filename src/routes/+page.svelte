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
		PenTool
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { format, parseISO } from 'date-fns';
	import { goto } from '$app/navigation';
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

<div class="space-y-6 pb-10">
	<!-- Header -->
	<div class="content-container flex flex-col justify-between gap-4 md:flex-row md:items-end">
		<div class="space-y-1">
			<div class="flex items-center gap-3">
				<h1
					class="text-2xl leading-tight font-black tracking-tighter text-slate-900 capitalize sm:text-4xl"
				>
					<span class="electric-text">{i18n.t('dashboard')}</span>
				</h1>
				{#if data.anyDeviceOnline}
					<div
						class="flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-emerald-600 lg:animate-pulse"
					>
						<div class="size-1.5 rounded-full bg-emerald-500"></div>
						<span class="text-[10px] font-black tracking-widest capitalize">Live</span>
					</div>
				{/if}
			</div>
			<div class="flex items-center gap-2 font-black text-slate-500">
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
					class="h-10 gap-2 px-5 font-black shadow-lg"
					onclick={() => (isCheckInTypeSelectOpen = true)}
				>
					<PlayCircle size={18} />
					{i18n.t('checkIn')}
				</Button>
				<Button
					variant="outline"
					class="h-10 gap-2 border-2 bg-white px-5 font-black"
					onclick={() => (isRegisterOpen = true)}
				>
					<PlusCircle size={18} />
					{i18n.t('register')}
				</Button>
			{/if}
		</div>
	</div>

	<div class="content-container grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
		<!-- Left Column: Currently Inside -->
		<div class="space-y-6 lg:col-span-2">
			<Card.Root class="overflow-hidden border-2 border-slate-200 bg-white shadow-sm lg:mesh-gradient contain-paint">
				<Card.Header class="px-4 py-3">
					<div class="flex items-center justify-between">
						<div class="space-y-1">
							<Card.Title
								class="flex items-center gap-2 text-lg font-black tracking-tighter text-slate-900 capitalize"
							>
								<Users size={20} class="text-primary-600" />
								{i18n.t('currentlyInside')}
							</Card.Title>
						</div>
						{#if data.currentlyInside?.totalPeople > 0}
							<div
								class="flex flex-col items-end rounded-xl border-2 border-primary-100 bg-primary-50 px-3 py-1.5"
							>
								<span class="text-xl leading-none font-black tracking-tighter text-primary-700"
									><CountUp value={data.currentlyInside?.totalPeople || 0} /></span
								>
								<span class="text-[9px] font-black tracking-widest text-primary-500 capitalize"
									>Total People</span
								>
							</div>
						{/if}
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
								class="flex items-center justify-between rounded-xl border-2 border-amber-100 bg-white p-3 shadow-sm ring-1 ring-amber-100/50"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700"
									>
										<Truck size={20} />
									</div>
									<div>
										<h3 class="text-sm font-black tracking-tighter text-slate-900 capitalize">
											{i18n.t('vehicles')}
										</h3>
										<p class="text-[9px] font-black tracking-widest text-amber-600 capitalize">
											On Premises
										</p>
									</div>
								</div>
								<div class="text-right">
									<span
										class="block text-xl leading-none font-black tracking-tighter text-amber-700"
										><CountUp value={data.currentlyInside?.vehicleStats?.total || 0} /></span
									>
								</div>
							</div>

							<!-- Transport Vehicles -->
							<div
								class="flex items-center justify-between rounded-xl border-2 border-blue-100 bg-white p-3 shadow-sm ring-1 ring-blue-100/50"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700"
									>
										<Truck size={16} />
									</div>
									<div>
										<h3 class="text-xs font-black tracking-tighter text-slate-800 capitalize">
											{i18n.t('transportVehicle')}
										</h3>
										<p class="text-[8px] font-black tracking-widest text-blue-600 capitalize">
											Logistics
										</p>
									</div>
								</div>
								<div class="text-right">
									<span class="block text-lg leading-none font-black tracking-tighter text-blue-700"
										><CountUp value={data.currentlyInside?.vehicleStats?.transport || 0} /></span
									>
								</div>
							</div>

							<!-- Regular Vehicles -->
							<div
								class="flex items-center justify-between rounded-xl border-2 border-indigo-100 bg-white p-3 shadow-sm ring-1 ring-indigo-100/50"
							>
								<div class="flex items-center gap-3">
									<div
										class="flex size-9 shrink-0 items-center justify-center rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700"
									>
										<Truck size={16} />
									</div>
									<div>
										<h3 class="text-xs font-black tracking-tighter text-slate-800 capitalize">
											{i18n.t('regularVehicle')}
										</h3>
										<p class="text-[8px] font-black tracking-widest text-indigo-600 capitalize">
											Personal
										</p>
									</div>
								</div>
								<div class="text-right">
									<span
										class="block text-lg leading-none font-black tracking-tighter text-indigo-700"
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
			<!-- Quick Stats Mini-Grid (Location Stats) -->
			<div class="grid grid-cols-2 gap-3">
				<div class="rounded-xl border-2 border-blue-100 bg-white p-3 shadow-sm">
					<div class="mb-1.5 flex items-center gap-2 text-blue-700">
						<Ship size={14} />
						<span class="text-[9px] font-black tracking-widest capitalize">Ship</span>
					</div>
					<span class="text-xl font-black tracking-tighter text-slate-900"
						><CountUp value={data.locationStats?.ship || 0} /></span
					>
				</div>
				<div class="rounded-xl border-2 border-emerald-100 bg-white p-3 shadow-sm">
					<div class="mb-1.5 flex items-center gap-2 text-emerald-700">
						<Warehouse size={14} />
						<span class="text-[9px] font-black tracking-widest capitalize">Yard</span>
					</div>
					<span class="text-xl font-black tracking-tighter text-slate-900"
						><CountUp value={data.locationStats?.yard || 0} /></span
					>
				</div>
			</div>

			<!-- Method Stats -->
			<div class="grid grid-cols-4 gap-2">
				<div class="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-white py-3 shadow-sm text-center transition-all hover:border-indigo-200 hover:bg-indigo-50/30">
					<div class="mb-2 flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 transition-transform group-hover:scale-110">
						<ScanFace size={18} />
					</div>
					<span class="block text-[9px] font-black tracking-widest text-slate-400 uppercase">Face</span>
					<span class="text-sm font-black text-slate-900"><CountUp value={data.methodStats?.face || 0} /></span>
				</div>
				<div class="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-white py-3 shadow-sm text-center transition-all hover:border-emerald-200 hover:bg-emerald-50/30">
					<div class="mb-2 flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
						<Fingerprint size={18} />
					</div>
					<span class="block text-[9px] font-black tracking-widest text-slate-400 uppercase">Finger</span>
					<span class="text-sm font-black text-slate-900"><CountUp value={data.methodStats?.finger || 0} /></span>
				</div>
				<div class="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-white py-3 shadow-sm text-center transition-all hover:border-amber-200 hover:bg-amber-50/30">
					<div class="mb-2 flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 transition-transform group-hover:scale-110">
						<IdCard size={18} />
					</div>
					<span class="block text-[9px] font-black tracking-widest text-slate-400 uppercase">Card</span>
					<span class="text-sm font-black text-slate-900"><CountUp value={data.methodStats?.card || 0} /></span>
				</div>
				<div class="group flex flex-col items-center justify-center rounded-2xl border-2 border-slate-50 bg-white py-3 shadow-sm text-center transition-all hover:border-slate-200 hover:bg-slate-50">
					<div class="mb-2 flex size-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-transform group-hover:scale-110">
						<PenTool size={18} />
					</div>
					<span class="block text-[9px] font-black tracking-widest text-slate-400 uppercase">Manual</span>
					<span class="text-sm font-black text-slate-900"><CountUp value={data.methodStats?.manual || 0} /></span>
				</div>
			</div>

			<!-- Recent Activity -->
			<Card.Root class="border-2 border-slate-200 bg-white shadow-sm flex flex-col h-[calc(100vh-20rem)] min-h-[400px]">
				<Card.Header class="px-4 py-3 shrink-0 border-b-2 border-slate-50">
					<div class="flex items-center justify-between">
						<Card.Title
							class="flex items-center gap-2 text-xs font-black tracking-widest text-slate-600 capitalize"
						>
							<Clock size={14} />
							Recent Activity
						</Card.Title>
						<Button
							variant="ghost"
							size="sm"
							class="h-7 text-[10px] font-black tracking-tighter text-primary-600 capitalize hover:bg-primary-50"
							href="/attendance"
						>
							View all
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0 overflow-y-auto min-h-0 flex-1">
					<div class="divide-y-2 divide-slate-50">
						{#each data.recentLogs as log (log.id)}
							<button
								class="group flex w-full cursor-pointer items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-slate-50"
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
										<p class="truncate text-xs font-black text-slate-900">{log.personName}</p>
										<div class="flex items-center gap-1.5">
											<p
												class="truncate text-[9px] font-black tracking-wider text-slate-500 capitalize"
											>
												{log.categoryName}
											</p>
											{#if log.verifyMethod}
												<div
													class={cn(
														'flex size-6 items-center justify-center rounded-full border shadow-sm',
														log.verifyMethod === 'face'
															? 'border-indigo-100 bg-indigo-50 text-indigo-600'
															: log.verifyMethod === 'finger'
																? 'border-emerald-100 bg-emerald-50 text-emerald-600'
																: log.verifyMethod === 'card'
																	? 'border-amber-100 bg-amber-50 text-amber-600'
																	: 'border-slate-100 bg-slate-50 text-slate-500'
													)}
													title={log.verifyMethod}
												>
													{#if log.verifyMethod === 'face'}
														<ScanFace size={12} />
													{:else if log.verifyMethod === 'finger'}
														<Fingerprint size={12} />
													{:else if log.verifyMethod === 'card'}
														<IdCard size={12} />
													{:else}
														<PenTool size={12} />
													{/if}
												</div>
											{/if}
										</div>
									</div>
								</div>
								<div class="shrink-0 pl-2 text-right flex flex-col items-end gap-1">
									<p class="text-[10px] font-black text-slate-900">
										{format(log.entryTime, 'hh:mm a')}
									</p>
									{#if log.status === 'on_premises'}
										<span
											class={cn(
												'rounded-md border px-1 py-0.5 text-[8px] font-black tracking-wide capitalize lg:animate-pulse',
												statusBadgeClasses.on_premises
											)}>In</span
										>
									{:else}
										<span
											class={cn(
												'rounded-md border px-1 py-0.5 text-[8px] font-black tracking-wide capitalize',
												statusBadgeClasses.checked_out
											)}>Out</span
										>
									{/if}
								</div>
							</button>
						{:else}
							<div class="p-6 text-center text-slate-500 text-sm font-black">No recent activity</div>
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
			<Dialog.Description class="text-xs font-black tracking-widest text-slate-500 capitalize">
				Select the type of entry to record
			</Dialog.Description>
		</Dialog.Header>
		<div class="grid grid-cols-2 gap-4 py-4">
			<button
				class="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-slate-100 p-6 transition-all hover:border-primary-500 hover:bg-primary-50"
				onclick={openPersonCheckIn}
			>
				<div
					class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-primary-100 group-hover:text-primary-600"
				>
					<Users size={32} />
				</div>
				<span class="font-black tracking-tighter text-slate-900 capitalize"
					>{i18n.t('personLabel')}</span
				>
			</button>

			<button
				class="group flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-slate-100 p-6 transition-all hover:border-amber-500 hover:bg-amber-50"
				onclick={openVehicleCheckIn}
			>
				<div
					class="mb-4 flex size-16 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all group-hover:bg-amber-100 group-hover:text-amber-600"
				>
					<Truck size={32} />
				</div>
				<span class="font-black tracking-tighter text-slate-900 capitalize"
					>{i18n.t('vehicles')}</span
				>
			</button>
		</div>
	</Dialog.Content>
</Dialog.Root>

<CheckInDialog bind:open={isPersonCheckInOpen} />
<VehicleCheckInDialog bind:open={isVehicleCheckInOpen} />
<RegisterDialog bind:open={isRegisterOpen} />
