<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { LogIn, LogOut, Search, UserCheck, History, Eye } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Combobox from '$lib/components/ui/Combobox.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import Pagination from '$lib/components/ui/Pagination.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import { goto } from '$app/navigation';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);
    let isConfirmOpen = $state(false);
    let itemToCheckOut = $state<string | null>(null);
    let selectedLabourId = $state('');
    let searchQuery = $state('');

    let checkoutForm: HTMLFormElement;

    $effect(() => {
        searchQuery = data.query || '';
    });

    $effect(() => {
        if (form?.success) {
            isModalOpen = false;
            selectedLabourId = '';
            toast.success(i18n.t('successSaved'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    const labourOptions = $derived(
        data.labours.map((l: any) => ({
            value: l.id,
            text: `${l.name} (${l.codeNo})`
        }))
    );

    function updateFilter() {
        const url = new URL(window.location.href);
        if (searchQuery) {
            url.searchParams.set('q', searchQuery);
        } else {
            url.searchParams.delete('q');
        }
        url.searchParams.delete('page');
        goto(url.toString(), { keepFocus: true, replaceState: true });
    }

    let timeout: any;
    function debounceSearch() {
        clearTimeout(timeout);
        timeout = setTimeout(updateFilter, 300);
    }

    const todayDate = format(new Date(), 'yyyy-MM-dd');

    const canCreate = $derived(data.user?.permissions.includes('labours.create'));
</script>

<svelte:head>
    <title>{i18n.t('labours')} - {i18n.t('attendance')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header leading-tight py-1">
                {i18n.t('labours')} <span class="text-primary-600">/</span> {i18n.t('attendance')}
            </h1>
            <p class="text-slate-600 font-semibold leading-relaxed py-0.5">{format(new Date(), 'PPP')}</p>
        </div>
        {#if canCreate}
            <Button onclick={() => isModalOpen = true} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                <LogIn size={20} />
                {i18n.t('checkIn')}
            </Button>
        {/if}
    </div>

    <Card className="p-4">
        <label for="search" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('name')} / {i18n.t('codeNo')} / {i18n.t('designation')} / {i18n.lang === 'bn' ? 'ঠিকাদার' : 'Contractor'}</label>
        <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input 
                id="search"
                placeholder={i18n.t('searchPlaceholder')} 
                bind:value={searchQuery}
                oninput={debounceSearch}
                className="pl-10"
                onclear={() => { searchQuery = ''; updateFilter(); }}
            />
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if data.logs.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={UserCheck}
                />
            </Card>
            {#if data.totalPages > 0 || data.logs.length === 0}
                 <Pagination 
                    currentPage={data.currentPage} 
                    totalPages={data.totalPages} 
                    pageSize={data.pageSize}
                />
            {/if}
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('isTrained')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('workingHours')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.logs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 align-middle">
                                    <a href="/labours/{log.labourId}" class="text-sm font-bold text-gray-900 hover:text-primary-600 transition-colors">
                                        {log.labourName}
                                    </a>
                                    <p class="text-xs text-gray-500 font-medium">{log.designation || '-'}</p>
                                </td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-primary-600 align-middle">{log.labourCode}</td>
                                <td class="px-6 py-2 align-middle">
                                    <div class="flex flex-col gap-1">
                                        <Badge status={log.labourType === 'company' ? 'on_premises' : 'default'}>
                                            {log.labourType === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                                        </Badge>
                                        {#if log.labourType === 'contractor' && log.contractorName}
                                            <span class="text-[10px] font-bold text-gray-500 uppercase">{log.contractorName}</span>
                                        {/if}
                                    </div>
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={log.isTrained ? 'success' : 'danger'}>
                                        {log.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{format(new Date(log.entryTime), 'p')}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">
                                    {log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}
                                </td>
                                <td class="px-6 py-2 text-sm font-bold text-gray-700 align-middle">
                                    {formatDuration(log.entryTime, log.exitTime)}
                                </td>
                                <td class="px-6 py-2 text-right align-middle">
                                    <div class="flex items-center justify-end gap-2">
                                        {#if log.status === 'on_premises'}
                                            {#if canCreate}
                                                <Button 
                                                    variant="danger" 
                                                    onclick={() => { itemToCheckOut = log.id; isConfirmOpen = true; }} 
                                                    className="px-3 py-1.5 text-sm h-9"
                                                >
                                                    <LogOut size={16} /> {i18n.t('checkOut')}
                                                </Button>
                                            {/if}
                                        {:else}
                                            <span class="text-gray-400 text-xs font-bold uppercase">{i18n.t('checkedOut')}</span>
                                        {/if}
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden space-y-4">
                {#each data.logs as log}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-lg font-bold text-gray-900">{log.labourName}</p>
                                <p class="text-xs font-mono font-bold text-primary-600">{log.labourCode}</p>
                                <p class="text-xs text-gray-500 font-medium mt-1">{log.designation || '-'}</p>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <Badge status={log.status}>
                                    {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                </Badge>
                                {#if log.labourType === 'contractor' && log.contractorName}
                                    <span class="text-[10px] font-bold text-gray-500 uppercase">{log.contractorName}</span>
                                {/if}
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-gray-500">{i18n.t('isTrained')}</div>
                            <div>
                                <Badge status={log.isTrained ? 'success' : 'danger'}>
                                    {log.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                </Badge>
                            </div>
                            <div class="text-gray-500">{i18n.t('entryTime')}</div>
                            <div class="text-gray-900 font-medium">{format(new Date(log.entryTime), 'p')}</div>
                            <div class="text-gray-500">{i18n.t('exitTime')}</div>
                            <div class="text-gray-900 font-medium">{log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}</div>
                        </div>
                        {#if log.status === 'on_premises'}
                            <div class="pt-2 border-t">
                                {#if canCreate}
                                    <Button 
                                        variant="danger" 
                                        onclick={() => { itemToCheckOut = log.id; isConfirmOpen = true; }} 
                                        className="w-full"
                                    >
                                        <LogOut size={16} /> {i18n.t('checkOut')}
                                    </Button>
                                {/if}
                            </div>
                        {/if}
                    </Card>
                {/each}
            </div>

            <Pagination 
                currentPage={data.currentPage} 
                totalPages={data.totalPages} 
                pageSize={data.pageSize}
            />
        {/if}
    </div>
</div>

<Modal 
    open={isModalOpen} 
    title={i18n.t('checkIn') + ' ' + i18n.t('labours')}
    onclose={() => { isModalOpen = false; selectedLabourId = ''; }}
>
    <form method="POST" action="?/checkIn" use:enhance class="space-y-6">
        <Combobox
            label={i18n.t('labours')}
            name="labourId"
            required
            options={labourOptions}
            bind:value={selectedLabourId}
            placeholder={i18n.t('searchPlaceholder')}
        />

        <div class="flex gap-3 pt-4">
            <Button variant="outline" onclick={() => isModalOpen = false} className="flex-1">
                {i18n.t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {i18n.t('checkIn')}
            </Button>
        </div>
    </form>
</Modal>

<form 
    bind:this={checkoutForm}
    method="POST" 
    action="?/checkOut" 
    use:enhance
>
    <input type="hidden" name="id" value={itemToCheckOut} />
</form>

<ConfirmModal
    bind:open={isConfirmOpen}
    title={i18n.t('checkOut')}
    message={i18n.t('confirmCheckOut')}
    variant="danger"
    onconfirm={() => checkoutForm.requestSubmit()}
/>