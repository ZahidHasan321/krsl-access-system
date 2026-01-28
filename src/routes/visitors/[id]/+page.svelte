<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import { User, Phone, Briefcase, Calendar, MapPin, Building, History, ArrowRight, UserCheck, Clock, Edit2 } from 'lucide-svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);

    // Remove the $effect as we'll use enhance callback for cross-page actions

    const visitorTypeOptions = $derived([
        { value: 'guest', label: i18n.t('guest') },
        { value: 'vendor', label: i18n.t('vendor') }
    ]);
</script>

<svelte:head>
    <title>{data.visitor.name} | {i18n.t('visitors')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-8">
    <!-- Header Card -->
    <Card className="p-6 md:p-8">
        <div class="flex flex-col md:flex-row gap-8 items-start">
            <div class="bg-emerald-100 p-6 rounded-3xl text-emerald-600">
                <User size={64} />
            </div>
            
            <div class="flex-1 space-y-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header">{data.visitor.name}</h1>
                            <Button variant="ghost" onclick={() => isModalOpen = true} className="p-2 h-9 w-9 min-w-0 bg-amber-50 hover:bg-amber-100">
                                <Edit2 size={16} class="text-amber-600" />
                            </Button>
                        </div>
                        <div class="flex wrap gap-3 mt-2">
                            <Badge status="default" className="text-sm">
                                {data.visitor.visitorType === 'vendor' ? i18n.t('vendor') : i18n.t('guest')}
                            </Badge>
                        </div>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <Badge status={data.stats.currentStatus} className="px-4 py-2 text-base">
                            {data.stats.currentStatus === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                        </Badge>
                        {#if data.stats.currentStatus === 'on_premises' && data.logs[0]}
                            <p class="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
                                <Clock size={12} /> {i18n.t('entryTime')}: {format(new Date(data.logs[0].entryTime), 'p')}
                            </p>
                        {/if}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Building size={14} /> {i18n.t('company')}
                        </p>
                        <p class="text-gray-900 font-semibold">{data.visitor.company || '-'}</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Phone size={14} /> {i18n.t('phone')}
                        </p>
                        <p class="text-gray-900 font-semibold">{data.visitor.contactNo || '-'}</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} /> {i18n.t('joinDate')}
                        </p>
                        <p class="text-gray-900 font-semibold">
                            {data.visitor.createdAt ? format(new Date(data.visitor.createdAt), 'PPP') : '-'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </Card>

    <!-- Stats Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
            <div class="flex items-center gap-4">
                <div class="bg-blue-50 text-blue-600 p-3 rounded-xl">
                    <UserCheck size={24} />
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">{i18n.t('totalVisits')}</p>
                    <p class="text-2xl font-black text-gray-900">{data.stats.totalVisits}</p>
                </div>
            </div>
        </Card>
        <Card className="p-6">
            <div class="flex items-center gap-4">
                <div class="bg-amber-50 text-amber-600 p-3 rounded-xl">
                    <History size={24} />
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">{i18n.t('lastVisit')}</p>
                    <p class="text-lg font-bold text-gray-900">
                        {data.stats.lastVisit ? format(new Date(data.stats.lastVisit), 'PPP') : i18n.t('noData')}
                    </p>
                </div>
            </div>
        </Card>
    </div>

    <!-- History Section -->
    <div class="space-y-4">
        <h2 class="text-xl font-black text-gray-900 px-1">{i18n.t('history')}</h2>
        
        <Card>
            {#if data.logs.length === 0}
                <div class="p-12 text-center text-gray-500">
                    <p>{i18n.t('noData')}</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('date')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('purpose')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('entryTime')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('exitTime')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('duration')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('status')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            {#each data.logs as log}
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900">
                                        {format(new Date(log.date), 'PPP')}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                        {log.purpose || '-'}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-600">
                                        {format(new Date(log.entryTime), 'p')}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-600">
                                        {log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}
                                    </td>
                                    <td class="px-6 py-4 text-sm font-bold text-gray-700">
                                        {formatDuration(log.entryTime, log.exitTime)}
                                    </td>
                                    <td class="px-6 py-4">
                                        <Badge status={log.status}>
                                            {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                        </Badge>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </Card>
    </div>
</div>

<Modal 
    open={isModalOpen} 
    title={i18n.t('edit') + ' ' + i18n.t('visitors')}
    onclose={() => { isModalOpen = false; }}
>
    <form 
        method="POST" 
        action="/visitors/profiles?/update" 
        use:enhance={() => {
            return async ({ result }) => {
                if (result.type === 'success') {
                    isModalOpen = false;
                    toast.success(i18n.t('successSaved'));
                    await invalidateAll();
                } else if (result.type === 'failure') {
                    toast.error(String(result.data?.message || 'Update failed'));
                }
            };
        }} 
        class="space-y-4"
    >
        <input type="hidden" name="id" value={data.visitor.id} />
        
        <Input 
            label={i18n.t('name')} 
            name="name" 
            required 
            value={data.visitor.name || ''} 
        />
        
        <Input 
            label={i18n.t('company')} 
            name="company" 
            value={data.visitor.company || ''} 
        />
        
        <Input 
            label={i18n.t('phone')} 
            name="contactNo" 
            value={data.visitor.contactNo || ''} 
        />
        
        <Select 
            label={i18n.t('visitorType')} 
            name="visitorType" 
            required 
            options={visitorTypeOptions}
            value={data.visitor.visitorType || 'guest'}
        />

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
