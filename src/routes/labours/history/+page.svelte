<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import DatePicker from '$lib/components/ui/DatePicker.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let selectedDate = $state('');
    let searchQuery = $state('');

    $effect(() => {
        selectedDate = data.date;
    });

    const filteredLogs = $derived(
        data.logs.filter((log: any) => 
            log.labourName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.labourCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    function updateFilter() {
        const query = new URLSearchParams(page.url.searchParams);
        query.set('date', selectedDate);
        goto(`?${query.toString()}`);
    }
</script>

<svelte:head>
    <title>{i18n.t('labours')} - {i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('labours')} - {i18n.t('history')}</h1>
            <p class="text-gray-500">{format(new Date(data.date), 'PPP')}</p>
        </div>
    </div>

    <!-- Filters -->
    <Card className="p-4">
        <div class="flex flex-col md:flex-row gap-4">
            <div class="flex items-end gap-4 max-w-md flex-1">
                <div class="flex-1">
                    <DatePicker 
                        label={i18n.t('date')}
                        bind:value={selectedDate}
                        onchange={updateFilter}
                    />
                </div>
            </div>
            
            <div class="flex-1 relative">
                 <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div class="relative">
                     <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        id="search"
                        placeholder={i18n.t('searchPlaceholder')} 
                        bind:value={searchQuery} 
                        class="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                </div>
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if filteredLogs.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={Search}
                />
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('isTrained')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('workingHours')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('status')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredLogs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-bold text-gray-900 align-middle">
                                    <a href="/labours/{log.labourId}" class="hover:text-primary-600 transition-colors">
                                        {log.labourName}
                                    </a>
                                </td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-primary-600 align-middle">{log.labourCode}</td>
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
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={log.status}>
                                        {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                    </Badge>
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
                                <a href="/labours/{log.labourId}" class="text-lg font-bold text-gray-900 hover:text-primary-600 transition-colors">
                                    {log.labourName}
                                </a>
                                <p class="text-xs font-mono font-bold text-primary-600">{log.labourCode}</p>
                            </div>
                            <Badge status={log.status}>
                                {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                            </Badge>
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
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>
