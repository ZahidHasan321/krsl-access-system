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
    import {
        ChevronLeft,
        User,
        Phone,
        Building2,
        ShieldCheck,
        ShieldAlert,
        Clock,
        LogOut,
        PlayCircle,
        CheckCircle2,
        Save,
        Trash2,
        Edit2,
        Camera,
        Upload,
        AlertCircle
    } from 'lucide-svelte';
    import type { PageData } from './$types';
    import { format, parseISO } from 'date-fns';
    import { enhance } from '$app/forms';
    import { goto } from '$app/navigation';

    let { data }: { data: PageData } = $props();

    let isEditOpen = $state(false);
    let confirmDeleteOpen = $state(false);
    let deleteFormElement = $state<HTMLFormElement | null>(null);

    let editName = $state(data.person.name);
    let editCategoryId = $state(data.person.category.id);
    let editCodeNo = $state(data.person.codeNo || '');
    let editCompany = $state(data.person.company || '');
    let editContactNo = $state(data.person.contactNo || '');
    let editDesignation = $state(data.person.designation || '');
    let editIsTrained = $state(data.person.isTrained);
    let editNotes = $state(data.person.notes || '');
    let photoPreview = $state<string | null>(data.person.photoUrl || null);

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
        editName = data.person.name;
        editCategoryId = data.person.category.id;
        editCodeNo = data.person.codeNo || '';
        editCompany = data.person.company || '';
        editContactNo = data.person.contactNo || '';
        editDesignation = data.person.designation || '';
        editIsTrained = data.person.isTrained;
        editNotes = data.person.notes || '';
        photoPreview = data.person.photoUrl || null;
        isEditOpen = true;
    }

    function triggerDelete(form: HTMLFormElement) {
        deleteFormElement = form;
        confirmDeleteOpen = true;
    }

    function formatDuration(seconds: number) {
        if (!seconds) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
</script>

<div class="space-y-8 pb-20">
    <div class="flex items-center justify-between">
        <Button variant="ghost" class="font-bold gap-2" href="/people">
            <ChevronLeft size={20} />
            {i18n.t('all')}
        </Button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Profile Sidebar -->
        <div class="space-y-6">
            <Card.Root class="overflow-hidden border-2 border-slate-100">
                <div class="bg-slate-50 p-8 flex flex-col items-center text-center border-b-2 border-slate-100">
                    <div class="size-48 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-300 mb-6 border-4 border-white overflow-hidden shrink-0">
                        {#if data.person.photoUrl}
                            <img src={data.person.photoUrl} alt={data.person.name} class="w-full h-full object-cover" />
                        {:else}
                            <User size={96} />
                        {/if}
                    </div>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <Badge variant="secondary" class="font-bold uppercase tracking-widest text-[10px] bg-primary-50 text-primary-700 border-primary-100">
                            {data.person.category.name}
                        </Badge>
                    </div>
                </div>
                <Card.Content class="p-6 space-y-6">
                    <div class="grid grid-cols-1 gap-4">
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <ShieldCheck size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('codeNo')}</p>
                                <p class="font-bold text-slate-900">{data.person.codeNo || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('company')}</p>
                                <p class="font-bold text-slate-900">{data.person.company || 'Private'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Phone size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('phone')}</p>
                                <p class="font-bold text-slate-900">{data.person.contactNo || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="pt-6 border-t flex items-center justify-between">
                        <div class="flex items-center gap-2">
                            {#if data.person.isTrained}
                                <div class="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                    <CheckCircle2 size={16} />
                                </div>
                                <span class="text-xs font-black text-emerald-700 uppercase tracking-wider">{i18n.t('isTrained')}</span>
                            {:else}
                                <div class="size-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                                    <ShieldAlert size={16} />
                                </div>
                                <span class="text-xs font-black text-rose-700 uppercase tracking-wider">Not Trained</span>
                            {/if}
                        </div>
                    </div>

                    <div class="pt-6 border-t flex items-center gap-2">
                        {#if data.user?.permissions.includes('people.edit')}
                            <Button variant="outline" class="flex-1 font-bold" onclick={openEdit}>
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
                                <Button type="button" variant="ghost" class="text-rose-500 hover:text-rose-700 hover:bg-rose-50" onclick={(e) => triggerDelete((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}>
                                    <Trash2 size={18} />
                                </Button>
                            </form>
                        {/if}
                    </div>
                </Card.Content>
            </Card.Root>

            <div class="grid grid-cols-2 gap-4">
                <Card.Root class="p-4 bg-primary-50 border-primary-100 border-2">
                    <p class="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">{i18n.t('totalVisits')}</p>
                    <p class="text-3xl font-black text-primary-900">{data.stats.totalVisits}</p>
                </Card.Root>
                <Card.Root class="p-4 bg-emerald-50 border-emerald-100 border-2">
                    <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{i18n.t('avgDuration')}</p>
                    <p class="text-xl font-black text-emerald-900">{formatDuration(data.stats.avgDuration)}</p>
                </Card.Root>
            </div>
        </div>

        <!-- Main Content: Recent Activity -->
        <div class="lg:col-span-2 space-y-6">
            <Card.Root class="p-6 border-2 border-slate-100">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div class="flex items-center gap-3">
                        <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Clock size={20} />
                        </div>
                        <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Activity</h3>
                    </div>

                    {#if data.isInside}
                        <div class="flex items-center gap-3 w-full md:w-auto">
                            <Badge class="h-10 px-4 bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase tracking-wider animate-pulse flex-1 md:flex-none">
                                Currently Inside
                            </Badge>
                            {#if data.user?.permissions.includes('people.create')}
                                <form method="POST" action="/attendance?/checkOut" use:enhance class="flex-1 md:flex-none">
                                    <input type="hidden" name="logId" value={data.activeLog?.id} />
                                    <Button type="submit" variant="destructive" class="h-10 px-6 font-bold gap-2 w-full">
                                        <CheckCircle2 size={18} />
                                        {i18n.t('checkOut')}
                                    </Button>
                                </form>
                            {/if}
                        </div>
                    {:else}
                        {#if data.user?.permissions.includes('people.create')}
                            <form method="POST" action="/attendance?/checkIn" use:enhance class="w-full md:w-auto">
                                <input type="hidden" name="personId" value={data.person.id} />
                                <Button type="submit" class="h-10 px-8 font-bold gap-2 w-full">
                                    <PlayCircle size={18} />
                                    {i18n.t('checkIn')}
                                </Button>
                            </form>
                        {/if}
                    {/if}
                </div>

                <div class="overflow-x-auto">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row class="hover:bg-transparent bg-slate-50">
                                <Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each data.recentLogs as log}
                                <Table.Row>
                                    <Table.Cell class="font-bold text-slate-700">{format(parseISO(log.date), 'PP')}</Table.Cell>
                                    <Table.Cell class="font-black text-slate-900">{format(log.entryTime, 'hh:mm a')}</Table.Cell>
                                    <Table.Cell class="font-black text-slate-900">
                                        {log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
                                    </Table.Cell>
                                    <Table.Cell class="font-bold text-slate-500">
                                        {#if log.exitTime}
                                            {formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
                                        {:else}
                                            <Badge variant="outline" class="text-emerald-600 border-emerald-100 bg-emerald-50">Inside</Badge>
                                        {/if}
                                    </Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={4} class="h-48 text-center text-slate-400 font-bold">{i18n.t('noData')}</Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>
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
                        <div class="size-24 rounded-2xl bg-white shadow-md border-2 border-slate-100 overflow-hidden flex items-center justify-center text-slate-300 group-hover/photo:border-primary-200 transition-all">
                            {#if photoPreview}
                                <img src={photoPreview} alt="Preview" class="w-full h-full object-cover" />
                            {:else}
                                <Camera size={32} />
                            {/if}
                        </div>
                        <label
                            for="edit-photo-upload"
                            class="absolute -bottom-2 -right-2 size-8 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all"
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
                                {#each data.allCategoriesFlat as cat}
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
                    <Checkbox id="edit-isTrained" checked={editIsTrained} onCheckedChange={(v) => editIsTrained = !!v} />
                    <Label for="edit-isTrained" class="text-sm font-black text-slate-700">{i18n.t('isTrained')}</Label>
                </div>

                <Button type="submit" class="w-full h-14 text-base font-black gap-2 shadow-lg shadow-primary-100">
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
