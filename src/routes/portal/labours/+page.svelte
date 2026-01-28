<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Plus, Search, Edit2, Trash2, User, Eye } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import DatePicker from '$lib/components/ui/DatePicker.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Pagination from '$lib/components/ui/Pagination.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';
    import { format } from 'date-fns';
    import { goto } from '$app/navigation';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let searchQuery = $state('');
    let isModalOpen = $state(false);
    let editingLabour = $state<any>(null);
    let labourType = $state('company');

    $effect(() => {
        searchQuery = data.query || '';
    });

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

    function openAddModal() {
        editingLabour = null;
        labourType = 'company';
        isModalOpen = true;
    }

    function openEditModal(labour: any) {
        editingLabour = {
            ...labour,
            joinDate: labour.joinDate ? format(new Date(labour.joinDate), 'yyyy-MM-dd') : ''
        };
        labourType = labour.type;
        isModalOpen = true;
    }

    $effect(() => {
        if (form?.success) {
            isModalOpen = false;
            toast.success(i18n.t('successSaved'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    const labourTypeOptions = $derived([
        { value: 'company', label: i18n.t('companyLabour') },
        { value: 'contractor', label: i18n.t('contractorLabour') }
    ]);

    // Portal users always have view permission if they can see this, but we mirror the check for UI consistency
    const canCreate = $derived(data.user?.permissions.includes('labours.create'));
    const canEdit = $derived(data.user?.permissions.includes('labours.edit'));
    const canDelete = $derived(data.user?.permissions.includes('labours.delete'));
</script>

<svelte:head>
    <title>Portal - {i18n.t('labours')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header leading-tight py-1">
                {i18n.t('labours')} <span class="text-primary-600">/</span> {i18n.t('portal')}
            </h1>
            <p class="text-slate-600 font-semibold leading-relaxed py-0.5">
                {data.labours.length} {i18n.t('labours')} {i18n.lang === 'bn' ? 'প্রদর্শিত' : 'showing'}
            </p>
        </div>
        {#if canCreate}
            <Button onclick={openAddModal} className="w-full sm:w-auto">
                <Plus size={20} />
                {i18n.t('addNew')}
            </Button>
        {/if}
    </div>

    <Card className="p-4 border-amber-100 shadow-amber-50">
         <label for="search" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('name')} / {i18n.t('codeNo')}</label>
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
        {#if data.labours.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={User}
                />
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('designation')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.labours as labour}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-mono font-bold text-primary-600 align-middle">{labour.codeNo}</td>
                                <td class="px-6 py-2 align-middle">
                                    <a href="/portal/labours/{labour.id}" class="text-sm font-bold text-gray-900 hover:text-primary-600 transition-colors">
                                        {labour.name}
                                    </a>
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={labour.type === 'company' ? 'on_premises' : 'default'}>
                                        {labour.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{labour.designation || '-'}</td>
                                <td class="px-6 py-2 text-right align-middle">
                                    <div class="flex items-center justify-end gap-2">
                                        <a href="/portal/labours/{labour.id}" class="inline-block">
                                            <Button variant="ghost" className="p-2 h-9 w-9 min-w-0">
                                                <Eye size={16} class="text-blue-600" />
                                            </Button>
                                        </a>
                                        {#if canEdit}
                                            <Button variant="ghost" onclick={() => openEditModal(labour)} className="p-2 h-9 w-9 min-w-0">
                                                <Edit2 size={16} class="text-amber-600" />
                                            </Button>
                                        {/if}
                                        {#if canDelete}
                                            <form method="POST" action="?/delete" use:enhance={() => {
                                                return async ({ update }) => { await update(); };
                                            }} class="inline-block">
                                                <input type="hidden" name="id" value={labour.id} />
                                                <Button variant="ghost" type="submit" className="p-2 h-9 w-9 min-w-0">
                                                    <Trash2 size={16} class="text-rose-600" />
                                                </Button>
                                            </form>
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
                {#each data.labours as labour}
                    <Card className="p-4 space-y-4 border-amber-50">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-mono font-bold text-primary-600">{labour.codeNo}</p>
                                <a href="/portal/labours/{labour.id}" class="text-lg font-bold text-gray-900">{labour.name}</a>
                            </div>
                            <Badge status={labour.type === 'company' ? 'on_premises' : 'default'}>
                                {labour.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                            </Badge>
                        </div>
                        <div class="flex gap-2 pt-2 border-t">
                            <a href="/portal/labours/{labour.id}" class="flex-1">
                                <Button variant="outline" className="w-full">
                                    <Eye size={16} /> {i18n.t('details')}
                                </Button>
                            </a>
                            {#if canEdit}
                                <Button variant="outline" onclick={() => openEditModal(labour)} className="flex-1">
                                    <Edit2 size={16} /> {i18n.t('edit')}
                                </Button>
                            {/if}
                        </div>
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
    title={editingLabour ? i18n.t('edit') + ' ' + i18n.t('labours') : i18n.t('addNew') + ' ' + i18n.t('labours')}
    onclose={() => { editingLabour = null; isModalOpen = false; }}
>
    <form method="POST" action={editingLabour ? "?/update" : "?/create"} use:enhance={() => {
        return async ({ result, update }) => {
            if (result.type === 'success') {
                isModalOpen = false;
                toast.success(i18n.t('successSaved'));
            }
            await update();
        };
    }} class="space-y-4">
        {#if editingLabour}
            <input type="hidden" name="id" value={editingLabour.id} />
        {/if}
        
        <Input 
            label={i18n.t('name')} 
            name="name" 
            required 
            value={editingLabour?.name || ''} 
        />
        
        <Input 
            label={i18n.t('codeNo')} 
            name="codeNo" 
            required 
            value={editingLabour?.codeNo || ''} 
        />
        
        <Select 
            label={i18n.t('type')} 
            name="type" 
            required 
            options={labourTypeOptions}
            bind:value={labourType}
        />

        {#if labourType === 'contractor'}
            <Input 
                label={i18n.lang === 'bn' ? 'ঠিকাদারের নাম' : 'Contractor Name'} 
                name="contractorName" 
                placeholder={i18n.lang === 'bn' ? 'যেমন: এস আর ট্রেডার্স' : 'e.g. SR Traders'}
                value={editingLabour?.contractorName || ''} 
            />
        {/if}
        
        <Input 
            label={i18n.t('designation')} 
            name="designation" 
            value={editingLabour?.designation || ''} 
        />
        
        <DatePicker 
            label={i18n.t('joinDate')} 
            name="joinDate" 
            value={editingLabour?.joinDate || ''} 
        />
        
        <div class="flex items-center gap-2">
            <input 
                type="checkbox" 
                id="isTrained" 
                name="isTrained" 
                class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                checked={editingLabour ? editingLabour.isTrained : true}
            />
            <label for="isTrained" class="text-sm font-medium text-gray-700">{i18n.t('isTrained')}</label>
        </div>

        <div class="flex gap-3 pt-4">
            <Button variant="outline" onclick={() => isModalOpen = false} className="flex-1">
                {i18n.t('cancel')}
            </Button>
            <Button type="submit" className="flex-1">
                {i18n.t('save')}
            </Button>
        </div>
    </form>
</Modal>