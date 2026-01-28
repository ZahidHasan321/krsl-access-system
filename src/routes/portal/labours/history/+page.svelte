<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search } from 'lucide-svelte';
    import DatePicker from '$lib/components/ui/DatePicker.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Pagination from '$lib/components/ui/Pagination.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let selectedDate = $state('');
    let searchQuery = $state('');

    $effect(() => {
        selectedDate = data.date || '';
        searchQuery = data.query || '';
    });

    function updateFilter() {
        const url = new URL(window.location.href);
        if (selectedDate) url.searchParams.set('date', selectedDate);
        else url.searchParams.delete('date');
        
        if (searchQuery) url.searchParams.set('q', searchQuery);
        else url.searchParams.delete('q');

        url.searchParams.delete('page');
        goto(url.toString(), { keepFocus: true, replaceState: true });
    }

    let timeout: any;
    function debounceSearch() {
        clearTimeout(timeout);
        timeout = setTimeout(updateFilter, 300);
    }
</script>

<svelte:head>
    <title>Portal - {i18n.t('labours')} - {i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('history')} <span class="text-primary-600">/</span> {i18n.t('portal')}</h1>
            <p class="text-gray-500">
                {#if data.date}
                    {format(new Date(data.date), 'PPP')}
                {:else}
                    {i18n.t('all') + ' ' + i18n.t('history')}
                {/if}
            </p>
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
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if data.logs.length === 0}
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
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('date')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('workingHours')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.logs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-medium text-gray-900 align-middle">
                                    {format(new Date(log.date), 'PPP')}
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <a href="/portal/labours/{log.labourId}" class="text-sm font-bold text-gray-900 hover:text-primary-600 transition-colors">
                                        {log.labourName}
                                    </a>
                                </td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-primary-600 align-middle">{log.labourCode}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={log.labourType === 'company' ? 'on_premises' : 'default'}>
                                        {log.labourType === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{format(new Date(log.entryTime), 'p')}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">
                                    {log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}
                                </td>
                                <td class="px-6 py-2 text-sm font-bold text-gray-700 align-middle">
                                    {formatDuration(log.entryTime, log.exitTime)}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <Pagination 
                currentPage={data.currentPage} 
                totalPages={data.totalPages}
                pageSize={data.pageSize}
            />
        {/if}
    </div>
</div>
