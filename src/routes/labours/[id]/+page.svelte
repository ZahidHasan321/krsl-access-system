<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import DatePicker from '$lib/components/ui/DatePicker.svelte';
    import { enhance } from '$app/forms';
    import { invalidateAll } from '$app/navigation';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import { User, Calendar, Briefcase, Hash, Info, Clock, CalendarCheck, Edit2 } from 'lucide-svelte';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);
    let labourType = $state('');

    $effect(() => {
        labourType = data.labour.type;
    });

    const labourTypeOptions = $derived([
        { value: 'company', label: i18n.t('companyLabour') },
        { value: 'contractor', label: i18n.t('contractorLabour') }
    ]);
</script>

<svelte:head>
    <title>{data.labour.name} | {i18n.t('labours')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-8">
    <!-- Header Card -->
    <Card className="p-6 md:p-8">
        <div class="flex flex-col md:flex-row gap-8 items-start">
            <div class="bg-primary-100 p-6 rounded-3xl text-primary-600">
                <User size={64} />
            </div>
            
            <div class="flex-1 space-y-6">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div class="flex items-center gap-3">
                            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header">{data.labour.name}</h1>
                            <Button variant="ghost" onclick={() => isModalOpen = true} className="p-2 h-9 w-9 min-w-0 bg-amber-50 hover:bg-amber-100">
                                <Edit2 size={16} class="text-amber-600" />
                            </Button>
                        </div>
                        <p class="text-primary-600 font-bold flex items-center gap-2 mt-1">
                            <Hash size={16} /> {data.labour.codeNo}
                        </p>
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
                            <Briefcase size={14} /> {i18n.t('designation')}
                        </p>
                        <p class="text-gray-900 font-semibold">{data.labour.designation || '-'}</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} /> {i18n.t('type')}
                        </p>
                        <div class="flex flex-col gap-1 items-start">
                            <Badge status={data.labour.type === 'company' ? 'on_premises' : 'default'}>
                                {data.labour.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                            </Badge>
                            {#if data.labour.type === 'contractor' && data.labour.contractorName}
                                <span class="text-xs font-bold text-gray-500 uppercase">{data.labour.contractorName}</span>
                            {/if}
                        </div>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} /> {i18n.t('joinDate')}
                        </p>
                        <p class="text-gray-900 font-semibold">
                            {data.labour.joinDate ? format(new Date(data.labour.joinDate), 'PPP') : '-'}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} /> {i18n.t('isTrained')}
                        </p>
                        <div>
                            <Badge status={data.labour.isTrained ? 'success' : 'danger'}>
                                {data.labour.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                            </Badge>
                        </div>
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
                    <CalendarCheck size={24} />
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">{i18n.t('totalPresentDays')}</p>
                    <p class="text-2xl font-black text-gray-900">{data.stats.totalPresentDays}</p>
                </div>
            </div>
        </Card>
        <Card className="p-6">
            <div class="flex items-center gap-4">
                <div class="bg-amber-50 text-amber-600 p-3 rounded-xl">
                    <Clock size={24} />
                </div>
                <div>
                    <p class="text-sm font-bold text-gray-400 uppercase tracking-wider">{i18n.t('avgWorkingHours')}</p>
                    <p class="text-2xl font-black text-gray-900">{data.stats.avgWorkingHours}h</p>
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
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('entryTime')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('exitTime')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('workingHours')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('status')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            {#each data.logs as log}
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900">
                                        {format(new Date(log.date), 'PPP')}
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
    title={i18n.t('edit') + ' ' + i18n.t('labours')}
    onclose={() => { isModalOpen = false; }}
>
    <form 
        method="POST" 
        action="/labours?/update" 
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
        <input type="hidden" name="id" value={data.labour.id} />
        
        <Input 
            label={i18n.t('name')} 
            name="name" 
            required 
            value={data.labour.name || ''} 
        />
        
        <Input 
            label={i18n.t('codeNo')} 
            name="codeNo" 
            required 
            value={data.labour.codeNo || ''} 
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
                value={data.labour.contractorName || ''} 
            />
        {/if}
        
        <Input 
            label={i18n.t('designation')} 
            name="designation" 
            value={data.labour.designation || ''} 
        />
        
        <DatePicker 
            label={i18n.t('joinDate')} 
            name="joinDate" 
            value={data.labour.joinDate ? format(new Date(data.labour.joinDate), 'yyyy-MM-dd') : ''} 
        />
        
        <div class="flex items-center gap-2">
            <input 
                type="checkbox" 
                id="isTrained" 
                name="isTrained" 
                class="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                checked={data.labour.isTrained}
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