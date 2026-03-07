<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import * as Select from '$lib/components/ui/select';
	import EnrollmentPanel from '../EnrollmentPanel.svelte';
	import DesignationCombobox from '$lib/components/ui/designation-combobox.svelte';
	import DepartmentCombobox from '$lib/components/ui/department-combobox.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import {
		ChevronLeft,
		User,
		Phone,
		Building2,
		ShieldCheck,
		ShieldAlert,
		Clock,
		PlayCircle,
		CheckCircle2,
		Save,
		Trash2,
		Edit2,
		Camera,
		Upload,
		AlertCircle,
		X,
		ZoomIn,
		Calendar,
		IdCard,
		Briefcase,
		TrendingUp,
		Fingerprint,
		ScanFace,
		CreditCard,
		Radio,
		Loader2,
		Ship,
		Warehouse
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { format, parseISO } from 'date-fns';
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	let isEditOpen = $state(false);
	let confirmDeleteOpen = $state(false);
	let confirmCheckInOpen = $state(false);
	let confirmCheckOutOpen = $state(false);
	let deleteFormElement = $state<HTMLFormElement | null>(null);
	let checkOutFormElement = $state<HTMLFormElement | null>(null);
	let isImageViewerOpen = $state(false);
	let isEnrollOpen = $state(false);

	// Recent logs state for "Load More"
	let logs = $state<any[]>([]);
	let isLoadingMore = $state(false);
	let hasMoreLogs = $state(false);

	$effect(() => {
		logs = [...data.recentLogs];
		hasMoreLogs = data.recentLogs.length === 20;
	});

	async function loadMore() {
		if (isLoadingMore || !hasMoreLogs) return;
		isLoadingMore = true;

		try {
			const res = await fetch(
				`/api/people/${data.person.id}/activity?offset=${logs.length}&limit=20`
			);
			if (res.ok) {
				const newLogs = await res.json();
				if (newLogs.length < 20) {
					hasMoreLogs = false;
				}

				// Convert string dates back to Date objects
				const processedLogs = newLogs.map((log: any) => ({
					...log,
					entryTime: new Date(log.entryTime),
					exitTime: log.exitTime ? new Date(log.exitTime) : null,
					createdAt: log.createdAt ? new Date(log.createdAt) : null
				}));

				logs = [...logs, ...processedLogs];
			}
		} catch (e) {
			console.error('Failed to load more logs', e);
			toast.error('Failed to load more activity');
		} finally {
			isLoadingMore = false;
		}
	}

	let editName = $state('');
	let editCategoryId = $state('');
	let editCodeNo = $state('');
	let editCardNo = $state('');
	let editCompany = $state('');
	let editContactNo = $state('');
	let editDesignation = $state('');
	let editDepartment = $state('');
	let editJoinDate = $state('');
	let editAuditJoinDate = $state('');
	let editIsTrained = $state(false);
	let editNotes = $state('');
	let photoPreview = $state<string | null>(null);

	const enrolledMethods: string[] = $derived(
		(() => {
			try {
				const raw = data.person.enrolledMethods;
				if (!raw) return [];
				return JSON.parse(raw);
			} catch {
				return [];
			}
		})()
	);

	// Sync edit form state when data changes
	$effect(() => {
		if (!isEditOpen) {
			editName = data.person.name;
			editCategoryId = data.person.category.id;
			editCodeNo = data.person.codeNo || '';
			editCardNo = data.person.cardNo || '';
			editCompany = data.person.company || '';
			editContactNo = data.person.contactNo || '';
			editDesignation = data.person.designation || '';
			editDepartment = data.person.department || '';
			editJoinDate = data.person.joinDate ? format(data.person.joinDate, 'yyyy-MM-dd') : '';
			editAuditJoinDate = data.person.auditJoinDate ? format(data.person.auditJoinDate, 'yyyy-MM-dd') : '';
			editIsTrained = data.person.isTrained;
			editNotes = data.person.notes || '';
			photoPreview = data.person.photoUrl || null;
		}
	});

	const isEmployee = $derived(data.rootCategorySlug === 'employee');

	const selectedCategoryName = $derived(
		data.allCategoriesFlat.find((c) => c.id === editCategoryId)?.name ?? 'Select Category'
	);

	function handlePhotoChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				photoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		}
	}

	function openEdit() {
		isEditOpen = true;
	}

	function triggerDelete(form: HTMLFormElement) {
		deleteFormElement = form;
		confirmDeleteOpen = true;
	}

	let checkInLocation = $state<'ship' | 'yard' | ''>('');
	let checkInPurpose = $state('');
	const needsPurpose = $derived(data.rootCategorySlug !== 'employee');
	const canCheckIn = $derived(!!checkInLocation);

	function triggerCheckIn() {
		checkInLocation = '';
		checkInPurpose = '';
		confirmCheckInOpen = true;
	}

	function triggerCheckOut(form: HTMLFormElement) {
		checkOutFormElement = form;
		confirmCheckOutOpen = true;
	}

	function formatDuration(seconds: number) {
		if (!seconds) return '0m';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}
</script>

<svelte:head>
	<title>{data.person.name} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6 pb-20">
	<!-- Back Button -->
	<div class="flex items-center justify-between">
		<Button variant="ghost" class="gap-2 font-bold hover:bg-primary-50" href="/people">
			<ChevronLeft size={20} />
			{i18n.t('all')}
			{i18n.t('people')}
		</Button>
	</div>

	<!-- Main Content Grid -->
	<div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
		<!-- Left Column: Profile Card -->
		<div class="space-y-6 xl:col-span-4">
			<Card.Root class="overflow-hidden border-2 border-slate-200 shadow-lg">
				<!-- Hero Section with Photo -->
				<div class="relative bg-gradient-to-br from-primary-600 to-primary-800 p-6 pb-24">
					<div class="absolute inset-0 opacity-10">
						<svg class="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
							<defs>
								<pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
									<path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5" />
								</pattern>
							</defs>
							<rect width="100" height="100" fill="url(#grid)" />
						</svg>
					</div>
					<div class="relative text-center text-white">
						<h1 class="mb-2 text-2xl font-black tracking-tight md:text-3xl">{data.person.name}</h1>
						<Badge
							variant="secondary"
							class="border-white/30 bg-white/20 text-xs font-bold tracking-wider text-white uppercase"
						>
							{data.person.category.name}
						</Badge>
					</div>
				</div>

				<!-- Photo Avatar (overlapping) -->
				<div class="relative -mt-20 flex justify-center px-6">
					<button
						class="group relative cursor-pointer"
						onclick={() => data.person.photoUrl && (isImageViewerOpen = true)}
						disabled={!data.person.photoUrl}
					>
						<div
							class="flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-white text-slate-300 shadow-2xl transition-transform group-hover:scale-105 md:h-40 md:w-40"
						>
							{#if data.person.photoUrl}
								<img
									src={data.person.thumbUrl || data.person.photoUrl}
									alt={data.person.name}
									class="h-full w-full object-cover"
								/>
								<div
									class="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<ZoomIn size={32} class="text-white" />
								</div>
							{:else}
								<User size={64} />
							{/if}
						</div>
						{#if data.isInside}
							<div
								class="absolute -right-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-emerald-500 lg:animate-pulse"
							>
								<CheckCircle2 size={16} class="text-white" />
							</div>
						{/if}
					</button>
				</div>

				<!-- Info Cards -->
				<Card.Content class="space-y-4 p-6 pt-4">
					{#if data.isInside}
						<div class="flex items-center justify-center">
							<Badge
								class="border-emerald-200 bg-emerald-100 px-4 py-1.5 text-xs font-black tracking-wider text-emerald-700 uppercase lg:animate-pulse"
							>
								Currently Inside
							</Badge>
						</div>
					{/if}

					<!-- Quick Info Grid -->
					<div class="mt-4 grid grid-cols-1 gap-3">
						<div class="flex items-center gap-3 rounded-xl border-2 border-primary-100 bg-primary-50 p-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-200 text-primary-700"
							>
								<Fingerprint size={20} />
							</div>
							<div class="min-w-0">
								<p class="text-[10px] font-black tracking-widest text-primary-500 uppercase">
									Biometric ID (PIN)
								</p>
								<p class="truncate font-black text-primary-900">{data.person.biometricId}</p>
							</div>
						</div>

						{#if data.person.codeNo}
							<div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<IdCard size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										{i18n.t('codeNo')}
									</p>
									<p class="truncate font-bold text-slate-900">{data.person.codeNo}</p>
								</div>
							</div>
						{/if}

						{#if data.person.cardNo}
							<div class="flex items-center gap-3 rounded-xl border-2 border-amber-100 bg-amber-50 p-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-700"
								>
									<CreditCard size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-amber-500 uppercase">
										{i18n.t('cardNo')}
									</p>
									<p class="truncate font-black text-amber-900">{data.person.cardNo}</p>
								</div>
							</div>
						{/if}

						{#if data.person.company}
							<div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<Building2 size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										{i18n.t('company')}
									</p>
									<p class="truncate font-bold text-slate-900">{data.person.company}</p>
								</div>
							</div>
						{/if}

						{#if data.person.contactNo}
							<div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<Phone size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										{i18n.t('phone')}
									</p>
									<p class="truncate font-bold text-slate-900">{data.person.contactNo}</p>
								</div>
							</div>
						{/if}

						{#if data.person.designation}
							<div
								class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<Briefcase size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										{i18n.t('designation')}
									</p>
									<p class="truncate font-bold text-slate-900">{data.person.designation}</p>
								</div>
							</div>
						{/if}

						{#if data.person.department}
							<div
								class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<Building2 size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										Department
									</p>
									<p class="truncate font-bold text-slate-900">{data.person.department}</p>
								</div>
							</div>
						{/if}

						{#if data.person.joinDate}
							<div
								class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<Calendar size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										Joined Date
									</p>
									<p class="truncate font-bold text-slate-900">
										{format(data.person.joinDate, 'PPP')}
									</p>
								</div>
							</div>
						{/if}

						{#if data.person.auditJoinDate}
							<div
								class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"
								>
									<Calendar size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
										Audit Join Date
									</p>
									<p class="truncate font-bold text-slate-900">
										{format(data.person.auditJoinDate, 'PPP')}
									</p>
								</div>
							</div>
						{/if}

						{#if data.person.createdAt}
							<div
								class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
							>
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600"
								>
									<Calendar size={20} />
								</div>
								<div class="min-w-0">
									<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">
										Registered
									</p>
									<p class="truncate font-bold text-slate-900">
										{format(data.person.createdAt, 'PPP')}
									</p>
								</div>
							</div>
						{/if}
					</div>

					<!-- Biometric Info -->
					{#if data.person.biometricId}
						<div class="space-y-3 rounded-xl border-2 border-indigo-100 bg-indigo-50 p-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600"
									>
										<Fingerprint size={20} />
									</div>
									<div class="min-w-0">
										<p class="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
											Biometric ID
										</p>
										<p class="font-bold text-indigo-900">{data.person.biometricId}</p>
									</div>
								</div>
								{#if data.user?.permissions.includes('people.edit')}
									<Button
										variant="outline"
										size="sm"
										class="gap-1 border-indigo-200 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
										onclick={() => (isEnrollOpen = true)}
									>
										<Radio size={14} /> Enroll
									</Button>
								{/if}
							</div>
							<div class="flex flex-wrap gap-2">
								{#if enrolledMethods.includes('finger')}
									<Badge
										class="gap-1 border-sky-200 bg-sky-100 text-[10px] font-bold text-sky-700 uppercase"
									>
										<Fingerprint size={12} /> Finger
									</Badge>
								{/if}
								{#if enrolledMethods.includes('face')}
									<Badge
										class="gap-1 border-violet-200 bg-violet-100 text-[10px] font-bold text-violet-700 uppercase"
									>
										<ScanFace size={12} /> Face
									</Badge>
								{/if}
								{#if enrolledMethods.includes('card')}
									<Badge
										class="gap-1 border-amber-200 bg-amber-100 text-[10px] font-bold text-amber-700 uppercase"
									>
										<CreditCard size={12} /> Card
									</Badge>
								{/if}
								{#if enrolledMethods.length === 0}
									<p class="text-[10px] font-bold text-indigo-400">Not enrolled on device yet</p>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Training Status -->
					<div
						class="flex items-center justify-between rounded-xl p-4 {data.person.isTrained
							? 'border-2 border-emerald-100 bg-emerald-50'
							: 'border-2 border-rose-100 bg-rose-50'}"
					>
						<div class="flex items-center gap-3">
							{#if data.person.isTrained}
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
								>
									<ShieldCheck size={20} />
								</div>
								<div>
									<p class="text-xs font-black tracking-wider text-emerald-800 uppercase">
										{i18n.t('isTrained')}
									</p>
									<p class="text-[10px] font-bold text-emerald-600">Safety certified</p>
								</div>
							{:else}
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600"
								>
									<ShieldAlert size={20} />
								</div>
								<div>
									<p class="text-xs font-black tracking-wider text-rose-800 uppercase">
										Pending
									</p>
									<p class="text-[10px] font-bold text-rose-600">Requires certification</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Action Buttons -->
					<div class="flex items-center gap-2 border-t border-slate-100 pt-4">
						{#if data.user?.permissions.includes('people.edit')}
							<Button variant="outline" class="h-11 flex-1 border-2 font-bold" onclick={openEdit}>
								<Edit2 size={16} class="mr-2" />
								{i18n.t('edit')}
							</Button>
						{/if}
						{#if data.user?.permissions.includes('people.delete')}
							<form
								method="POST"
								action="?/delete"
								use:enhance={() => {
									return async ({ result }) => {
										if (result.type === 'success') {
											goto('/people');
										}
									};
								}}
								bind:this={deleteFormElement}
								class="shrink-0"
							>
								<Button
									type="button"
									variant="outline"
									class="h-11 w-11 border-2 border-rose-100 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
									onclick={(e: MouseEvent) =>
										triggerDelete((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
								>
									<Trash2 size={18} />
								</Button>
							</form>
						{/if}
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Stats Cards -->
			<div class="grid grid-cols-2 gap-4">
				<Card.Root
					class="border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-primary-100 p-4"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-200 text-primary-700"
						>
							<TrendingUp size={20} />
						</div>
						<div>
							<p class="text-[10px] font-black tracking-widest text-primary-600 uppercase">
								{i18n.t('totalVisits')}
							</p>
							<p class="text-2xl font-black text-primary-900">{data.stats.totalVisits}</p>
						</div>
					</div>
				</Card.Root>
				<Card.Root
					class="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 p-4"
				>
					<div class="flex items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-200 text-emerald-700"
						>
							<Clock size={20} />
						</div>
						<div>
							<p class="text-[10px] font-black tracking-widest text-emerald-600 uppercase">
								{i18n.t('totalDuration')}
							</p>
							<p class="text-xl font-black text-emerald-900">
								{formatDuration(data.stats.totalDuration)}
							</p>
						</div>
					</div>
				</Card.Root>
			</div>
		</div>

		<!-- Right Column: Activity -->
		<div class="space-y-6 xl:col-span-8">
			<!-- Check In/Out Actions -->
			<Card.Root class="border-2 border-slate-100 p-6">
				<div class="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
					<div class="flex items-center gap-3">
						<div class="rounded-xl bg-primary-100 p-3 text-primary-600">
							<Clock size={24} />
						</div>
						<div>
							<h3 class="text-lg font-black text-slate-900">Quick Actions</h3>
							<p class="text-sm font-medium text-slate-500">Manage attendance</p>
						</div>
					</div>

					<div class="flex w-full items-center gap-3 md:w-auto">
						{#if data.isInside}
							<Badge
								class="flex h-11 animate-pulse items-center gap-2 border-2 border-emerald-200 bg-emerald-100 px-4 font-bold tracking-wider text-emerald-700 uppercase"
							>
								<div class="h-2 w-2 rounded-full bg-emerald-500"></div>
								Currently Inside
							</Badge>
							{#if data.user?.permissions.includes('people.create')}
								<form
									method="POST"
									action="/attendance?/checkOut"
									use:enhance
									class="flex-1 md:flex-none"
									bind:this={checkOutFormElement}
								>
									<input type="hidden" name="logId" value={data.activeLog?.id} />
									<Button
										type="button"
										variant="destructive"
										class="h-11 w-full gap-2 px-6 font-bold"
										onclick={() => triggerCheckOut(checkOutFormElement!)}
									>
										<CheckCircle2 size={18} />
										{i18n.t('checkOut')}
									</Button>
								</form>
							{/if}
						{:else if data.user?.permissions.includes('people.create')}
							<Button
								type="button"
								class="h-11 w-full gap-2 px-8 font-bold shadow-lg"
								onclick={triggerCheckIn}
							>
								<PlayCircle size={18} />
								{i18n.t('checkIn')}
							</Button>
						{/if}
					</div>
				</div>
			</Card.Root>

			<!-- Recent Activity -->
			<Card.Root class="overflow-hidden border-2 border-slate-100">
				<Card.Header class="border-b border-slate-100 bg-slate-50 px-4 py-4 md:px-6">
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-indigo-100 p-2 text-indigo-600">
							<Calendar size={18} />
						</div>
						<div>
							<Card.Title class="text-lg font-black text-slate-900">Recent Activity</Card.Title>
							<p class="text-sm font-medium text-slate-500">Last 20 visits</p>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="p-0">
					<!-- Mobile View -->
					<div class="divide-y divide-slate-100 md:hidden">
						{#each logs as log (log.id)}
							<div class="p-4 transition-colors hover:bg-primary-50/50">
								<div class="mb-2 flex items-center justify-between">
									<span class="text-sm font-bold text-slate-700"
										>{format(parseISO(log.date), 'PP')}</span
									>
									{#if !log.exitTime}
										<Badge
											class="animate-pulse border-emerald-200 bg-emerald-100 text-xs font-bold text-emerald-700 uppercase"
											>Inside</Badge
										>
									{:else}
										<Badge variant="outline" class="text-xs font-bold text-slate-500 uppercase"
											>Completed</Badge
										>
									{/if}
								</div>
								<div class="grid grid-cols-4 gap-2 text-xs">
									<div>
										<p class="font-medium text-slate-400">{i18n.t('entryTime')}</p>
										<p class="font-black text-slate-900">{format(log.entryTime, 'hh:mm a')}</p>
									</div>
									<div>
										<p class="font-medium text-slate-400">{i18n.t('exitTime')}</p>
										<p class="font-black text-slate-900">
											{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
										</p>
									</div>
									<div>
										<p class="font-medium text-slate-400">{i18n.t('duration')}</p>
										<p class="font-bold text-slate-500">
											{#if log.exitTime}
												{formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
											{:else}
												-
											{/if}
										</p>
									</div>
									<div>
										<p class="font-medium text-slate-400">Method</p>
										<p class="font-bold text-slate-500 capitalize">{log.verifyMethod || '-'}</p>
									</div>
								</div>
							</div>
						{:else}
							<div class="py-16 text-center">
								<div class="flex flex-col items-center gap-3 text-slate-400">
									<Calendar size={40} class="opacity-50" />
									<p class="font-bold">{i18n.t('noData')}</p>
									<p class="text-sm">No attendance records found</p>
								</div>
							</div>
						{/each}
					</div>

					<!-- Desktop View -->
					<div class="hidden overflow-x-auto md:block">
						<Table.Root>
							<Table.Header>
								<Table.Row class="bg-slate-50/50 hover:bg-transparent">
									<Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
									<Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
									<Table.Head class="font-black text-slate-900">Method</Table.Head>
									<Table.Head class="font-black text-slate-900">Status</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each logs as log (log.id)}
									<Table.Row class="transition-colors hover:bg-primary-50/50">
										<Table.Cell class="font-bold text-slate-700"
											>{format(
												typeof log.date === 'string' ? parseISO(log.date) : log.date,
												'PP'
											)}</Table.Cell
										>
										<Table.Cell class="font-black text-slate-900"
											>{format(log.entryTime, 'hh:mm a')}</Table.Cell
										>
										<Table.Cell class="font-black text-slate-900">
											{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
										</Table.Cell>
										<Table.Cell class="font-bold text-slate-500">
											{#if log.exitTime}
												{formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
											{:else}
												-
											{/if}
										</Table.Cell>
										<Table.Cell>
											{#if log.verifyMethod}
												<Badge
													variant="outline"
													class={cn(
														'text-[10px] font-bold uppercase',
														log.verifyMethod === 'finger'
															? 'border-emerald-200 bg-emerald-50 text-emerald-600'
															: log.verifyMethod === 'face'
																? 'border-violet-200 bg-violet-50 text-violet-600'
																: log.verifyMethod === 'card'
																	? 'border-amber-200 bg-amber-50 text-amber-600'
																	: log.verifyMethod === 'manual'
																		? 'border-blue-200 bg-blue-50 text-blue-600'
																		: 'border-slate-200 text-slate-500'
													)}
												>
													{log.verifyMethod}
												</Badge>
											{:else}
												<span class="text-xs text-slate-400">-</span>
											{/if}
										</Table.Cell>
										<Table.Cell>
											{#if !log.exitTime}
												<Badge
													class="animate-pulse border-emerald-200 bg-emerald-100 text-xs font-bold text-emerald-700 uppercase"
													>Inside</Badge
												>
											{:else}
												<Badge variant="outline" class="text-xs font-bold text-slate-500 uppercase"
													>Completed</Badge
												>
											{/if}
										</Table.Cell>
									</Table.Row>
								{:else}
									<Table.Row>
										<Table.Cell colspan={6} class="h-48 text-center">
											<div class="flex flex-col items-center gap-3 text-slate-400">
												<Calendar size={40} class="opacity-50" />
												<p class="font-bold">{i18n.t('noData')}</p>
												<p class="text-sm">No attendance records found</p>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</div>

					{#if hasMoreLogs}
						<div class="flex justify-center border-t border-slate-100 bg-slate-50/30 p-4">
							<Button
								variant="outline"
								class="h-11 w-full gap-2 rounded-xl border-2 border-slate-200 px-12 font-black transition-all hover:border-primary-300 hover:bg-primary-50 md:w-auto"
								onclick={loadMore}
								disabled={isLoadingMore}
							>
								{#if isLoadingMore}
									<Loader2 size={18} class="animate-spin" />
									Loading...
								{:else}
									Load More Activity
								{/if}
							</Button>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			{#if data.person.notes}
				<Card.Root class="border-2 border-slate-100 bg-slate-50 p-6">
					<h4 class="mb-2 text-[10px] font-black tracking-widest text-slate-400 uppercase">
						{i18n.t('notes')}
					</h4>
					<p class="whitespace-pre-wrap text-slate-700">{data.person.notes}</p>
				</Card.Root>
			{/if}
		</div>
	</div>
</div>

<!-- Image Viewer Modal -->
{#if data.person.photoUrl}
	<Dialog.Root bind:open={isImageViewerOpen}>
		<Dialog.Content class="max-w-4xl overflow-hidden border-0 bg-black/95 p-0">
			<button
				class="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
				onclick={() => (isImageViewerOpen = false)}
			>
				<X size={24} />
			</button>
			<div class="flex min-h-[60vh] items-center justify-center p-4">
				<img
					src={data.person.photoUrl}
					alt={data.person.name}
					class="max-h-[80vh] max-w-full rounded-lg object-contain shadow-2xl"
				/>
			</div>
			<div class="bg-black/50 p-4 text-center">
				<p class="text-lg font-bold text-white">{data.person.name}</p>
				<p class="text-sm text-white/70">{data.person.category.name}</p>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Enrollment Dialog -->
{#if data.person.biometricId}
	<Dialog.Root bind:open={isEnrollOpen}>
		<Dialog.Content class="overflow-hidden p-0 sm:max-w-[500px]">
			<div class="border-b bg-slate-50 p-6">
				<Dialog.Title class="text-xl font-black">Device Enrollment</Dialog.Title>
				<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
					Enroll {data.person.name} on a device
				</Dialog.Description>
			</div>
			<div class="p-6">
				<EnrollmentPanel
					personId={data.person.id}
					biometricId={data.person.biometricId}
					personName={data.person.name}
					categorySlug={data.person.category.slug}
					initialCardNo={data.person.cardNo}
					onDone={() => {
						isEnrollOpen = false;
						invalidateAll();
					}}
					onSkip={() => {
						isEnrollOpen = false;
					}}
				/>
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Edit Dialog -->
<Dialog.Root bind:open={isEditOpen}>
	<Dialog.Content class="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[600px]">
		<div class="shrink-0 border-b bg-slate-50 p-6">
			<Dialog.Title class="text-xl font-black">{i18n.t('edit')}: {data.person.name}</Dialog.Title>
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
				<!-- Photo Upload Section -->
				<div
					class="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-primary-300 hover:bg-primary-50/30"
				>
					<div class="group/photo relative">
						<div
							class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-100 bg-white text-slate-300 shadow-md transition-all group-hover/photo:border-primary-200"
						>
							{#if photoPreview}
								<img src={photoPreview} alt="Preview" class="h-full w-full object-cover" />
							{:else}
								<Camera size={32} />
							{/if}
						</div>
						<label
							for="edit-photo-upload"
							class="absolute -right-2 -bottom-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg transition-all hover:scale-110 hover:bg-primary-700 active:scale-95"
						>
							<Upload size={16} />
							<input
								id="edit-photo-upload"
								name="photo"
								type="file"
								accept="image/*"
								class="hidden"
								onchange={handlePhotoChange}
							/>
						</label>
					</div>
					<p
						class="mt-4 text-[10px] font-black tracking-widest text-slate-400 uppercase transition-colors group-hover:text-primary-600"
					>
						{photoPreview ? 'Change Photo' : 'Upload Photo'}
					</p>
				</div>

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
						<Label class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
							>{i18n.t('category')}</Label
						>
						<input type="hidden" name="categoryId" value={editCategoryId} />
						<Select.Root type="single" bind:value={editCategoryId}>
							<Select.Trigger class="h-11 border-2">
								{selectedCategoryName}
							</Select.Trigger>
							<Select.Content class="max-h-[300px] overflow-y-auto">
								{#each data.allCategoriesFlat as cat (cat.id)}
									<Select.Item
										value={cat.id}
										class="font-medium"
										style="padding-left: {cat.level * 1.25 + 0.5}rem"
									>
										{#if cat.level > 0}
											<span class="mr-2 text-slate-300">↳</span>
										{/if}
										{i18n.t(cat.slug as any) || cat.name}
									</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				</div>

				<!-- Biometric ID (Read-only Info) -->
				<div class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-70">
					<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
						<Fingerprint size={16} />
					</div>
					<div class="min-w-0">
						<p class="text-[9px] font-black tracking-widest text-slate-400 uppercase">
							System Biometric ID (Machine PIN)
						</p>
						<p class="font-bold text-slate-700">{data.person.biometricId || 'Not assigned yet'}</p>
					</div>
					{#if !data.person.biometricId}
						<div class="ml-auto text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-full uppercase tracking-tighter">
							Will be generated on save
						</div>
					{/if}
				</div>

				<!-- Access Card Hero Input (Edit Mode) -->
				<div class="space-y-3 rounded-2xl border-2 border-amber-100 bg-amber-50/30 p-5 shadow-sm">
					<div class="flex items-center gap-3">
						<div class="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
							<CreditCard size={20} />
						</div>
						<div>
							<Label
								for="edit-cardNo"
								class="text-[10px] font-black tracking-widest text-amber-700 uppercase"
							>
								{i18n.t('cardNo')}
							</Label>
							<p class="text-[10px] font-medium text-slate-400">
								RFID/NFC Card ID for automated check-in
							</p>
						</div>
					</div>
					<Input
						id="edit-cardNo"
						name="cardNo"
						bind:value={editCardNo}
						class="h-14 border-2 bg-white text-lg font-black tracking-wider ring-amber-500 focus:ring-2"
						placeholder="ENTER CARD NUMBER"
					/>
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
				</div>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
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
						</div>

						{#if isEmployee}
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

						<div
						class="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-[10px] font-bold tracking-wider text-amber-800 uppercase"
						>

					<AlertCircle size={14} class="shrink-0" />
					<p>Changing the category might affect required fields or training status.</p>
				</div>

				<div class="space-y-2">
					<Label
						for="edit-notes"
						class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
						>{i18n.t('notes')}</Label
					>
					<Input id="edit-notes" name="notes" bind:value={editNotes} class="h-11 border-2" />
				</div>

				<input type="hidden" name="isTrained" value={editIsTrained ? 'true' : 'false'} />

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

				<Button type="submit" class="h-12 w-full gap-2 text-base font-black shadow-lg">
					<Save size={20} />
					{i18n.t('save')}
				</Button>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Delete Person"
	message="Are you sure you want to delete '{data.person
		.name}'? All history and records for this person will be permanently removed. This action cannot be undone."
	confirmText="Delete"
	variant="danger"
	onconfirm={() => deleteFormElement?.requestSubmit()}
/>

<Dialog.Root bind:open={confirmCheckInOpen}>
	<Dialog.Content class="overflow-hidden p-0 sm:max-w-[500px]">
		<div class="border-b bg-slate-50 p-6">
			<Dialog.Title class="text-xl font-black">Manual Check-In</Dialog.Title>
			<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
				Confirm entry for {data.person.name}
			</Dialog.Description>
		</div>

		<div class="space-y-6 p-6">
			{#if data.person.isTrained === false}
				<div class="flex items-start gap-3 rounded-xl border-2 border-rose-100 bg-rose-50 p-4">
					<AlertCircle size={20} class="mt-0.5 shrink-0 text-rose-600" />
					<div>
						<p class="text-sm font-black tracking-tight text-rose-700 uppercase">Safety Warning</p>
						<p class="mt-0.5 text-xs font-bold text-rose-600">
							This person has not completed mandatory safety training.
						</p>
					</div>
				</div>
			{/if}

			<form
				method="POST"
				action="/attendance?/checkIn"
				use:enhance={() => {
					return async ({ result }) => {
						if (result.type === 'success') {
							confirmCheckInOpen = false;
							await invalidateAll();
						}
					};
				}}
				class="space-y-6"
			>
				<input type="hidden" name="personId" value={data.person.id} />
				<input type="hidden" name="location" value={checkInLocation} />
				<input type="hidden" name="purpose" value={checkInPurpose} />

				<div class="space-y-2">
					<Label class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
						>Assignment Location <span class="text-rose-500">*</span></Label
					>
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							class={cn(
								'flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-[10px] font-black tracking-widest uppercase transition-all',
								checkInLocation === 'yard'
									? 'scale-[1.02] border-primary-500 bg-primary-500 text-white shadow-lg'
									: 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
							)}
							onclick={() => (checkInLocation = 'yard')}
						>
							<Warehouse size={24} strokeWidth={checkInLocation === 'yard' ? 3 : 2} />
							Yard
						</button>
						<button
							type="button"
							class={cn(
								'flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-[10px] font-black tracking-widest uppercase transition-all',
								checkInLocation === 'ship'
									? 'scale-[1.02] border-primary-500 bg-primary-500 text-white shadow-lg'
									: 'border-slate-100 bg-white text-slate-500 hover:border-slate-200'
							)}
							onclick={() => (checkInLocation = 'ship')}
						>
							<Ship size={24} strokeWidth={checkInLocation === 'ship' ? 3 : 2} />
							Ship
						</button>
					</div>
				</div>

				{#if needsPurpose}
					<div class="space-y-2">
						<Label
							for="person-checkin-purpose"
							class="text-[10px] font-black tracking-widest text-primary-700 uppercase"
							>{i18n.t('purpose')} (Optional)</Label
						>
						<Input
							id="person-checkin-purpose"
							bind:value={checkInPurpose}
							placeholder="Reason for visit"
							class="h-11 border-2 bg-white"
						/>
					</div>
				{/if}

				<div class="flex gap-3 pt-2">
					<Button
						type="button"
						variant="outline"
						class="h-12 flex-1 border-2 font-bold"
						onclick={() => (confirmCheckInOpen = false)}
					>
						{i18n.t('cancel')}
					</Button>
					<Button
						type="submit"
						disabled={!canCheckIn}
						class="h-12 flex-1 gap-2 font-black shadow-lg"
					>
						<PlayCircle size={18} />
						{i18n.t('confirm')}
					</Button>
				</div>
			</form>
		</div>
	</Dialog.Content>
</Dialog.Root>

<ConfirmModal
	bind:open={confirmCheckOutOpen}
	title="Confirm Check-Out"
	message="Are you sure you want to check out {data.person.name}?"
	confirmText="Confirm"
	onconfirm={() => checkOutFormElement?.requestSubmit()}
/>
