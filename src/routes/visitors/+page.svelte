<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { LogIn, LogOut, UserCheck, PlusCircle, Plus, Search } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Combobox from '$lib/components/ui/Combobox.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);
    let isAddModalOpen = $state(false);
    let isConfirmOpen = $state(false);
    let itemToCheckOut = $state<string | null>(null);
    let selectedVisitorId = $state('');
    let searchQuery = $state('');
    let typeFilter = $state('all');

    let checkoutForm: HTMLFormElement;

    let newVisitorPurpose = $state('');
    let newVisitorCardNo = $state('');

    const filteredLogs = $derived(
        data.activeLogs.filter((log: any) => {
            const matchesType = typeFilter === 'all' || log.visitorType === typeFilter;
            if (!matchesType) return false;
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                log.visitorName?.toLowerCase().includes(query) ||
                log.visitorCompany?.toLowerCase().includes(query) ||
                log.visitorContact?.toLowerCase().includes(query) ||
                log.purpose?.toLowerCase().includes(query) ||
                log.visitingCardNo?.toLowerCase().includes(query)
            );
        })
    );

    const typeFilterOptions = $derived([
        { value: 'all', label: i18n.t('all') },
        { value: 'guest', label: i18n.t('guest') },
        { value: 'vendor', label: i18n.t('vendor') }
    ]);

    const profileOptions = $derived(
        data.profiles.map((p: any) => ({
            value: p.id,
            text: `${p.name} ${p.company ? '(' + p.company + ')' : ''}`
        }))
    );

    const visitorTypeOptions = $derived([
        { value: 'guest', label: i18n.t('guest') },
        { value: 'vendor', label: i18n.t('vendor') }
    ]);
</script>

<svelte:head>
    <title>{i18n.t('visitors')} - {i18n.t('activeLog')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header">
                {i18n.t('visitors')} <span class="text-emerald-600">/</span> {i18n.t('activeLog')}
            </h1>
            <p class="text-slate-600 font-semibold">{data.activeLogs.length} {i18n.t('visitors')} {i18n.t('inside')}</p>
        </div>
        <div class="flex gap-2">
            <Button onclick={() => isAddModalOpen = true} variant="outline" className="flex-1 sm:flex-none">
                <Plus size={20} />
                {i18n.t('addNew')}
            </Button>
            <Button onclick={() => isModalOpen = true} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700">
                <LogIn size={20} />
                {i18n.t('checkIn')}
            </Button>
        </div>
    </div>

    <Card className="p-4">
        <div class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    placeholder={i18n.t('searchPlaceholder')}
                    bind:value={searchQuery}
                    className="pl-10"
                />
            </div>
            <div class="sm:w-48">
                <Select
                    options={typeFilterOptions}
                    bind:value={typeFilter}
                />
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if filteredLogs.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={UserCheck}
                />
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('company')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('purpose')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('cardNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('duration')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredLogs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 align-middle">
                                    <a href="/visitors/{log.visitorId}" class="text-sm font-bold text-gray-900 hover:text-emerald-600 transition-colors">
                                        {log.visitorName}
                                    </a>
                                    <p class="text-xs text-gray-500">{log.visitorContact || '-'}</p>
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge>
                                        {log.visitorType === 'guest' ? i18n.t('guest') : i18n.t('vendor')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{log.visitorCompany || '-'}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{log.purpose || '-'}</td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-primary-600 align-middle">{log.visitingCardNo || '-'}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{format(new Date(log.entryTime), 'p')}</td>
                                <td class="px-6 py-2 text-sm font-bold text-gray-700 align-middle">
                                    {formatDuration(log.entryTime, log.exitTime)}
                                </td>
                                <td class="px-6 py-2 text-right align-middle">
                                    <Button 
                                        variant="danger" 
                                        onclick={() => { itemToCheckOut = log.id; isConfirmOpen = true; }} 
                                        className="px-3 py-1.5 text-sm h-9"
                                    >
                                        <LogOut size={16} /> {i18n.t('checkOut')}
                                    </Button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden space-y-4">
                {#each filteredLogs as log}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <a href="/visitors/{log.visitorId}" class="text-lg font-bold text-gray-900 hover:text-emerald-600 transition-colors">
                                    {log.visitorName}
                                </a>
                                <p class="text-sm text-gray-500">{log.visitorCompany || '-'}</p>
                            </div>
                            <Badge>{log.visitorType === 'guest' ? i18n.t('guest') : i18n.t('vendor')}</Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-gray-500">{i18n.t('purpose')}</div>
                            <div class="text-gray-900 font-medium">{log.purpose || '-'}</div>
                            <div class="text-gray-500">{i18n.t('cardNo')}</div>
                            <div class="text-primary-600 font-bold font-mono">{log.visitingCardNo || '-'}</div>
                            <div class="text-gray-500">{i18n.t('entryTime')}</div>
                            <div class="text-gray-900 font-medium">{format(new Date(log.entryTime), 'p')}</div>
                        </div>
                        <div class="pt-2 border-t">
                            <Button 
                                variant="danger" 
                                onclick={() => { itemToCheckOut = log.id; isConfirmOpen = true; }} 
                                className="w-full"
                            >
                                <LogOut size={16} /> {i18n.t('checkOut')}
                            </Button>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>

<Modal 
    open={isModalOpen} 
    title={i18n.t('checkIn') + ' ' + i18n.t('visitors')}
    onclose={() => { isModalOpen = false; selectedVisitorId = ''; }}
>
    <form method="POST" action="?/checkIn" use:enhance class="space-y-4">
        <Combobox 
            label={i18n.t('visitors')} 
            name="visitorId" 
            required 
            options={profileOptions}
            bind:value={selectedVisitorId}
            placeholder={i18n.t('searchVisitor')}
        />
        
        <div class="text-right">
            <button type="button" onclick={() => { isModalOpen = false; isAddModalOpen = true; }} class="text-sm text-primary-600 hover:text-primary-800 font-medium underline">
                + {i18n.t('addNew')} {i18n.t('visitors')}
            </button>
        </div>
        
        <Input 
            label={i18n.t('purpose')} 
            name="purpose" 
            placeholder="e.g. Meeting with MD"
        />

        <Input 
            label={i18n.t('cardNo')} 
            name="visitingCardNo" 
            placeholder="e.g. V-001"
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

<Modal 
    open={isAddModalOpen} 
    title={i18n.t('addNew') + ' ' + i18n.t('visitors')}
    onclose={() => { isAddModalOpen = false; newVisitorPurpose = ''; newVisitorCardNo = ''; }}
>
    <form method="POST" use:enhance class="space-y-4">
        <input type="hidden" name="isNewVisitor" value="true" />
        
        <div class="space-y-4 border-b pb-4">
            <h3 class="font-medium text-gray-900">{i18n.t('visitors')} {i18n.t('details')}</h3>
            <Input 
                label={i18n.t('name')} 
                name="name" 
                required 
            />
            
            <Input 
                label={i18n.t('company')} 
                name="company" 
            />
            
            <Input 
                label={i18n.t('phone')} 
                name="contactNo" 
            />
            
            <Select 
                label={i18n.t('visitorType')} 
                name="visitorType" 
                required 
                options={visitorTypeOptions}
                value="guest"
            />
        </div>

        <div class="space-y-4">
             <h3 class="font-medium text-gray-900">{i18n.t('checkIn')} {i18n.t('details')} <span class="text-xs font-normal text-gray-500">({i18n.t('optional')})</span></h3>
             <Input 
                label={i18n.t('purpose')} 
                name="purpose" 
                placeholder="e.g. Meeting with MD"
                bind:value={newVisitorPurpose}
            />

            <Input 
                label={i18n.t('cardNo')} 
                name="visitingCardNo" 
                placeholder="e.g. V-001"
                bind:value={newVisitorCardNo}
            />
        </div>

        <div class="flex gap-3 pt-4">
            <Button variant="outline" onclick={() => isAddModalOpen = false} className="flex-1">
                {i18n.t('cancel')}
            </Button>
            <Button 
                type="submit" 
                formaction="?/createVisitor" 
                className="flex-1"
                disabled={!!newVisitorPurpose || !!newVisitorCardNo}
            >
                {i18n.t('save')}
            </Button>
            <Button type="submit" formaction="?/checkIn" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {i18n.t('checkIn')}
            </Button>
        </div>
    </form>
</Modal>