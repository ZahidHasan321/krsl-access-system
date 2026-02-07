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
        Scan,
        CreditCard,
        Radio
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
    let checkInFormElement = $state<HTMLFormElement | null>(null);
    let checkOutFormElement = $state<HTMLFormElement | null>(null);
    let isImageViewerOpen = $state(false);
    let isEnrollOpen = $state(false);

    let editName = $state('');
    let editCategoryId = $state('');
    let editCodeNo = $state('');
    let editCompany = $state('');
    let editContactNo = $state('');
    let editDesignation = $state('');
    let editIsTrained = $state(false);
    let editNotes = $state('');
    let photoPreview = $state<string | null>(null);

    const enrolledMethods: string[] = $derived(
        (() => {
            try {
                const raw = data.person.enrolledMethods;
                if (!raw) return [];
                return JSON.parse(raw);
            } catch { return []; }
        })()
    );

    // Sync edit form state when data changes
    $effect(() => {
        if (!isEditOpen) {
            editName = data.person.name;
            editCategoryId = data.person.category.id;
            editCodeNo = data.person.codeNo || '';
            editCompany = data.person.company || '';
            editContactNo = data.person.contactNo || '';
            editDesignation = data.person.designation || '';
            editIsTrained = data.person.isTrained;
            editNotes = data.person.notes || '';
            photoPreview = data.person.photoUrl || null;
        }
    });

    const selectedCategoryName = $derived(
        data.allCategoriesFlat.find(c => c.id === editCategoryId)?.name ?? 'Select Category'
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

    function triggerCheckIn(form: HTMLFormElement) {
        checkInFormElement = form;
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
        <Button variant="ghost" class="font-bold gap-2 hover:bg-primary-50" href="/people">
            <ChevronLeft size={20} />
            {i18n.t('all')} {i18n.t('people')}
        </Button>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <!-- Left Column: Profile Card -->
        <div class="xl:col-span-4 space-y-6">
            <Card.Root class="overflow-hidden border-2 border-slate-200 shadow-lg">
                <!-- Hero Section with Photo -->
                <div class="relative bg-gradient-to-br from-primary-600 to-primary-800 p-6 pb-24">
                    <div class="absolute inset-0 opacity-10">
                        <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                            <defs>
                                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" stroke-width="0.5"/>
                                </pattern>
                            </defs>
                            <rect width="100" height="100" fill="url(#grid)" />
                        </svg>
                    </div>
                    <div class="relative text-center text-white">
                        <h1 class="text-2xl md:text-3xl font-black tracking-tight mb-2">{data.person.name}</h1>
                        <Badge variant="secondary" class="bg-white/20 text-white border-white/30 font-bold uppercase tracking-wider text-xs">
                            {data.person.category.name}
                        </Badge>
                    </div>
                </div>

                <!-- Photo Avatar (overlapping) -->
                <div class="relative -mt-20 flex justify-center px-6">
                    <button
                        class="relative group cursor-pointer"
                        onclick={() => data.person.photoUrl && (isImageViewerOpen = true)}
                        disabled={!data.person.photoUrl}
                    >
                        <div class="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-white shadow-2xl border-4 border-white overflow-hidden flex items-center justify-center text-slate-300 transition-transform group-hover:scale-105">
                            {#if data.person.photoUrl}
                                <img
                                    src={data.person.photoUrl}
                                    alt={data.person.name}
                                    class="w-full h-full object-cover"
                                />
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                                    <ZoomIn size={32} class="text-white" />
                                </div>
                            {:else}
                                <User size={64} />
                            {/if}
                        </div>
                        {#if data.isInside}
                            <div class="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center animate-pulse">
                                <CheckCircle2 size={16} class="text-white" />
                            </div>
                        {/if}
                    </button>
                </div>

                <!-- Info Cards -->
                <Card.Content class="p-6 pt-4 space-y-4">
                    {#if data.isInside}
                        <div class="flex items-center justify-center">
                            <Badge class="bg-emerald-100 text-emerald-700 border-emerald-200 font-black uppercase tracking-wider text-xs px-4 py-1.5 animate-pulse">
                                Currently Inside
                            </Badge>
                        </div>
                    {/if}

                    <!-- Quick Info Grid -->
                    <div class="grid grid-cols-1 gap-3 mt-4">
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <IdCard size={20} />
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('codeNo')}</p>
                                <p class="font-bold text-slate-900 truncate">{data.person.codeNo || 'N/A'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <Building2 size={20} />
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('company')}</p>
                                <p class="font-bold text-slate-900 truncate">{data.person.company || 'N/A'}</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <Phone size={20} />
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('phone')}</p>
                                <p class="font-bold text-slate-900 truncate">{data.person.contactNo || 'N/A'}</p>
                            </div>
                        </div>

                        {#if data.person.designation}
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <Briefcase size={20} />
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('designation')}</p>
                                <p class="font-bold text-slate-900 truncate">{data.person.designation}</p>
                            </div>
                        </div>
                        {/if}

                        {#if data.person.createdAt}
                        <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div class="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600 shrink-0">
                                <Calendar size={20} />
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Registered</p>
                                <p class="font-bold text-slate-900 truncate">{format(data.person.createdAt, 'PPP')}</p>
                            </div>
                        </div>
                        {/if}
                    </div>

                    <!-- Biometric Info -->
                    {#if data.person.biometricId}
                        <div class="p-4 rounded-xl bg-indigo-50 border-2 border-indigo-100 space-y-3">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                        <Fingerprint size={20} />
                                    </div>
                                    <div class="min-w-0">
                                        <p class="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Biometric ID</p>
                                        <p class="font-bold text-indigo-900">{data.person.biometricId}</p>
                                    </div>
                                </div>
                                {#if data.user?.permissions.includes('people.edit')}
                                    <Button variant="outline" size="sm" class="text-xs font-bold gap-1 border-indigo-200 text-indigo-700 hover:bg-indigo-100" onclick={() => isEnrollOpen = true}>
                                        <Radio size={14} /> Enroll
                                    </Button>
                                {/if}
                            </div>
                            <div class="flex flex-wrap gap-2">
                                {#if enrolledMethods.includes('finger')}
                                    <Badge class="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase gap-1">
                                        <Fingerprint size={12} /> Finger
                                    </Badge>
                                {/if}
                                {#if enrolledMethods.includes('face')}
                                    <Badge class="bg-blue-100 text-blue-700 border-blue-200 font-bold text-[10px] uppercase gap-1">
                                        <Scan size={12} /> Face
                                    </Badge>
                                {/if}
                                {#if enrolledMethods.includes('card')}
                                    <Badge class="bg-amber-100 text-amber-700 border-amber-200 font-bold text-[10px] uppercase gap-1">
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
                    <div class="flex items-center justify-between p-4 rounded-xl {data.person.isTrained ? 'bg-emerald-50 border-2 border-emerald-100' : 'bg-rose-50 border-2 border-rose-100'}">
                        <div class="flex items-center gap-3">
                            {#if data.person.isTrained}
                                <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p class="text-xs font-black text-emerald-800 uppercase tracking-wider">{i18n.t('isTrained')}</p>
                                    <p class="text-[10px] text-emerald-600 font-bold">Safety certified</p>
                                </div>
                            {:else}
                                <div class="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                    <ShieldAlert size={20} />
                                </div>
                                <div>
                                    <p class="text-xs font-black text-rose-800 uppercase tracking-wider">Not Trained</p>
                                    <p class="text-[10px] text-rose-600 font-bold">Requires certification</p>
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-2 pt-4 border-t border-slate-100">
                        {#if data.user?.permissions.includes('people.edit')}
                            <Button variant="outline" class="flex-1 font-bold h-11 border-2" onclick={openEdit}>
                                <Edit2 size={16} class="mr-2" />
                                {i18n.t('edit')}
                            </Button>
                        {/if}
                        {#if data.user?.permissions.includes('people.delete')}
                            <form method="POST" action="?/delete" use:enhance={() => {
                                return async ({ result }) => {
                                    if (result.type === 'success') {
                                        goto('/people');
                                    }
                                };
                            }} bind:this={deleteFormElement} class="shrink-0">
                                <Button type="button" variant="outline" class="h-11 w-11 text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-2 border-rose-100" onclick={(e: MouseEvent) => triggerDelete((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}>
                                    <Trash2 size={18} />
                                </Button>
                            </form>
                        {/if}
                    </div>
                </Card.Content>
            </Card.Root>

            <!-- Stats Cards -->
            <div class="grid grid-cols-2 gap-4">
                <Card.Root class="p-4 bg-gradient-to-br from-primary-50 to-primary-100 border-2 border-primary-200">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-primary-200 flex items-center justify-center text-primary-700">
                            <TrendingUp size={20} />
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest">{i18n.t('totalVisits')}</p>
                            <p class="text-2xl font-black text-primary-900">{data.stats.totalVisits}</p>
                        </div>
                    </div>
                </Card.Root>
                <Card.Root class="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg bg-emerald-200 flex items-center justify-center text-emerald-700">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{i18n.t('avgDuration')}</p>
                            <p class="text-xl font-black text-emerald-900">{formatDuration(data.stats.avgDuration)}</p>
                        </div>
                    </div>
                </Card.Root>
            </div>
        </div>

        <!-- Right Column: Activity -->
        <div class="xl:col-span-8 space-y-6">
            <!-- Check In/Out Actions -->
            <Card.Root class="p-6 border-2 border-slate-100">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div class="flex items-center gap-3">
                        <div class="p-3 bg-primary-100 text-primary-600 rounded-xl">
                            <Clock size={24} />
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-slate-900">Quick Actions</h3>
                            <p class="text-sm text-slate-500 font-medium">Manage attendance</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-3 w-full md:w-auto">
                        {#if data.isInside}
                            <Badge class="h-11 px-4 bg-emerald-100 text-emerald-700 border-2 border-emerald-200 font-bold uppercase tracking-wider flex items-center gap-2 animate-pulse">
                                <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                                Currently Inside
                            </Badge>
                            {#if data.user?.permissions.includes('people.create')}
                                <form method="POST" action="/attendance?/checkOut" use:enhance class="flex-1 md:flex-none" bind:this={checkOutFormElement}>
                                    <input type="hidden" name="logId" value={data.activeLog?.id} />
                                    <Button type="button" variant="destructive" class="h-11 px-6 font-bold gap-2 w-full" onclick={() => triggerCheckOut(checkOutFormElement!)}>
                                        <CheckCircle2 size={18} />
                                        {i18n.t('checkOut')}
                                    </Button>
                                </form>
                            {/if}
                        {:else}
                            {#if data.user?.permissions.includes('people.create')}
                                <form method="POST" action="/attendance?/checkIn" use:enhance class="w-full md:w-auto" bind:this={checkInFormElement}>
                                    <input type="hidden" name="personId" value={data.person.id} />
                                    <Button type="button" class="h-11 px-8 font-bold gap-2 w-full shadow-lg" onclick={() => triggerCheckIn(checkInFormElement!)}>
                                        <PlayCircle size={18} />
                                        {i18n.t('checkIn')}
                                    </Button>
                                </form>
                            {/if}
                        {/if}
                    </div>
                </div>
            </Card.Root>

            <!-- Recent Activity -->
            <Card.Root class="border-2 border-slate-100 overflow-hidden">
                <Card.Header class="bg-slate-50 border-b border-slate-100 px-4 md:px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <Card.Title class="text-lg font-black text-slate-900">Recent Activity</Card.Title>
                            <p class="text-sm text-slate-500 font-medium">Last 20 visits</p>
                        </div>
                    </div>
                </Card.Header>
                <Card.Content class="p-0">
                    <!-- Mobile View -->
                    <div class="md:hidden divide-y divide-slate-100">
                        {#each data.recentLogs as log (log.id)}
                            <div class="p-4 hover:bg-primary-50/50 transition-colors">
                                <div class="flex items-center justify-between mb-2">
                                    <span class="font-bold text-slate-700 text-sm">{format(parseISO(log.date), 'PP')}</span>
                                    {#if !log.exitTime}
                                        <Badge class="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-xs uppercase animate-pulse">Inside</Badge>
                                    {:else}
                                        <Badge variant="outline" class="text-slate-500 font-bold text-xs uppercase">Completed</Badge>
                                    {/if}
                                </div>
                                <div class="grid grid-cols-4 gap-2 text-xs">
                                    <div>
                                        <p class="text-slate-400 font-medium">{i18n.t('entryTime')}</p>
                                        <p class="font-black text-slate-900">{format(log.entryTime, 'hh:mm a')}</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-400 font-medium">{i18n.t('exitTime')}</p>
                                        <p class="font-black text-slate-900">{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-400 font-medium">{i18n.t('duration')}</p>
                                        <p class="font-bold text-slate-500">
                                            {#if log.exitTime}
                                                {formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
                                            {:else}
                                                -
                                            {/if}
                                        </p>
                                    </div>
                                    <div>
                                        <p class="text-slate-400 font-medium">Method</p>
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
                    <div class="hidden md:block overflow-x-auto">
                        <Table.Root>
                            <Table.Header>
                                <Table.Row class="hover:bg-transparent bg-slate-50/50">
                                    <Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
                                    <Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
                                    <Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
                                    <Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
                                    <Table.Head class="font-black text-slate-900">Method</Table.Head>
                                    <Table.Head class="font-black text-slate-900">Status</Table.Head>
                                </Table.Row>
                            </Table.Header>
                            <Table.Body>
                                {#each data.recentLogs as log (log.id)}
                                    <Table.Row class="hover:bg-primary-50/50 transition-colors">
                                        <Table.Cell class="font-bold text-slate-700">{format(parseISO(log.date), 'PP')}</Table.Cell>
                                        <Table.Cell class="font-black text-slate-900">{format(log.entryTime, 'hh:mm a')}</Table.Cell>
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
                                                <Badge variant="outline" class={cn("font-bold text-[10px] uppercase",
                                                    log.verifyMethod === 'finger' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                                                    log.verifyMethod === 'face' ? 'text-blue-600 border-blue-200 bg-blue-50' :
                                                    log.verifyMethod === 'card' ? 'text-amber-600 border-amber-200 bg-amber-50' :
                                                    'text-slate-500 border-slate-200'
                                                )}>
                                                    {log.verifyMethod}
                                                </Badge>
                                            {:else}
                                                <span class="text-slate-400 text-xs">-</span>
                                            {/if}
                                        </Table.Cell>
                                        <Table.Cell>
                                            {#if !log.exitTime}
                                                <Badge class="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold text-xs uppercase animate-pulse">Inside</Badge>
                                            {:else}
                                                <Badge variant="outline" class="text-slate-500 font-bold text-xs uppercase">Completed</Badge>
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
                </Card.Content>
            </Card.Root>

            {#if data.person.notes}
                <Card.Root class="p-6 border-2 border-slate-100 bg-slate-50">
                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{i18n.t('notes')}</h4>
                    <p class="text-slate-700 whitespace-pre-wrap">{data.person.notes}</p>
                </Card.Root>
            {/if}
        </div>
    </div>
</div>

<!-- Image Viewer Modal -->
{#if data.person.photoUrl}
<Dialog.Root bind:open={isImageViewerOpen}>
    <Dialog.Content class="max-w-4xl p-0 overflow-hidden bg-black/95 border-0">
        <button
            class="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onclick={() => isImageViewerOpen = false}
        >
            <X size={24} />
        </button>
        <div class="flex items-center justify-center p-4 min-h-[60vh]">
            <img
                src={data.person.photoUrl}
                alt={data.person.name}
                class="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
        </div>
        <div class="p-4 bg-black/50 text-center">
            <p class="text-white font-bold text-lg">{data.person.name}</p>
            <p class="text-white/70 text-sm">{data.person.category.name}</p>
        </div>
    </Dialog.Content>
</Dialog.Root>
{/if}

<!-- Enrollment Dialog -->
{#if data.person.biometricId}
<Dialog.Root bind:open={isEnrollOpen}>
    <Dialog.Content class="sm:max-w-[500px] p-0 overflow-hidden">
        <div class="p-6 border-b bg-slate-50">
            <Dialog.Title class="text-xl font-black">Device Enrollment</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                Enroll {data.person.name} on a device
            </Dialog.Description>
        </div>
        <div class="p-6">
            <EnrollmentPanel
                personId={data.person.id}
                biometricId={data.person.biometricId}
                personName={data.person.name}
                onDone={() => { isEnrollOpen = false; invalidateAll(); }}
                onSkip={() => { isEnrollOpen = false; }}
            />
        </div>
    </Dialog.Content>
</Dialog.Root>
{/if}

<!-- Edit Dialog -->
<Dialog.Root bind:open={isEditOpen}>
    <Dialog.Content class="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 border-b bg-slate-50 shrink-0">
            <Dialog.Title class="text-xl font-black">{i18n.t('edit')}: {data.person.name}</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                Update person details
            </Dialog.Description>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
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
                <div class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 group hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                    <div class="relative group/photo">
                        <div class="w-24 h-24 rounded-2xl bg-white shadow-md border-2 border-slate-100 overflow-hidden flex items-center justify-center text-slate-300 group-hover/photo:border-primary-200 transition-all">
                            {#if photoPreview}
                                <img src={photoPreview} alt="Preview" class="w-full h-full object-cover" />
                            {:else}
                                <Camera size={32} />
                            {/if}
                        </div>
                        <label
                            for="edit-photo-upload"
                            class="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all"
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
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 group-hover:text-primary-600 transition-colors">
                        {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="edit-name" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('name')}</Label>
                        <Input id="edit-name" name="name" bind:value={editName} required class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('category')}</Label>
                        <input type="hidden" name="categoryId" value={editCategoryId} />
                        <Select.Root type="single" bind:value={editCategoryId}>
                            <Select.Trigger class="h-11 border-2">
                                {selectedCategoryName}
                            </Select.Trigger>
                            <Select.Content class="max-h-[300px] overflow-y-auto">
                                {#each data.allCategoriesFlat as cat (cat.id)}
                                    <Select.Item value={cat.id} class="font-medium" style="padding-left: {cat.level * 1.25 + 0.5}rem">
                                        {#if cat.level > 0}
                                            <span class="text-slate-300 mr-2">↳</span>
                                        {/if}
                                        {i18n.t(cat.slug as any) || cat.name}
                                    </Select.Item>
                                {/each}
                            </Select.Content>
                        </Select.Root>
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-codeNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('codeNo')}</Label>
                        <Input id="edit-codeNo" name="codeNo" bind:value={editCodeNo} class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-company" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('company')}</Label>
                        <Input id="edit-company" name="company" bind:value={editCompany} class="h-11 border-2" />
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="edit-contactNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('phone')}</Label>
                        <Input id="edit-contactNo" name="contactNo" bind:value={editContactNo} class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-designation" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('designation')}</Label>
                        <Input id="edit-designation" name="designation" bind:value={editDesignation} class="h-11 border-2" />
                    </div>
                </div>

                <div class="flex items-start gap-2 p-3 rounded-xl bg-amber-50 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
                    <AlertCircle size={14} class="shrink-0" />
                    <p>Changing the category might affect required fields or training status.</p>
                </div>

                <div class="space-y-2">
                    <Label for="edit-notes" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('notes')}</Label>
                    <Input id="edit-notes" name="notes" bind:value={editNotes} class="h-11 border-2" />
                </div>

                <input type="hidden" name="isTrained" value={editIsTrained ? 'true' : 'false'} />

                <div class="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <Checkbox id="edit-isTrained" checked={editIsTrained} onCheckedChange={(v: boolean | "indeterminate") => editIsTrained = !!v} />
                    <Label for="edit-isTrained" class="text-sm font-black text-slate-700">{i18n.t('isTrained')}</Label>
                </div>

                <Button type="submit" class="w-full h-12 text-base font-black gap-2 shadow-lg">
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
    message="Are you sure you want to delete '{data.person.name}'? All history and records for this person will be permanently removed. This action cannot be undone."
    confirmText="Delete"
    variant="danger"
    onconfirm={() => deleteFormElement?.requestSubmit()}
/>

<ConfirmModal
    bind:open={confirmCheckInOpen}
    title="Confirm Check-In"
    message="Are you sure you want to check in {data.person.name}?"
    confirmText="Confirm"
    onconfirm={() => checkInFormElement?.requestSubmit()}
/>

<ConfirmModal
    bind:open={confirmCheckOutOpen}
    title="Confirm Check-Out"
    message="Are you sure you want to check out {data.person.name}?"
    confirmText="Confirm"
    onconfirm={() => checkOutFormElement?.requestSubmit()}
/>
