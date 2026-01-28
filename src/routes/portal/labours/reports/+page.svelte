<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search, Calendar } from 'lucide-svelte';
    import MonthPicker from '$lib/components/ui/MonthPicker.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Pagination from '$lib/components/ui/Pagination.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import { format } from 'date-fns';
    import { goto } from '$app/navigation';
    import type { PageData } from './$types';

    let { data } = $props<{ data: PageData }>();

    let selectedMonth = $state('');
    let searchQuery = $state('');

    $effect(() => {
        selectedMonth = data.month;
        searchQuery = data.query || '';
    });

    function updateFilter() {
        const url = new URL(window.location.href);
        url.searchParams.set('month', selectedMonth);
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
    <title>Portal - {i18n.t('monthlyReport')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('monthlyReport')} <span class="text-primary-600">/</span> {i18n.t('portal')}</h1>
            <p class="text-gray-500">{format(new Date(data.month), 'MMMM yyyy')}</p>
        </div>
    </div>

    <!-- Month Picker Filter -->
    <Card className="p-4">
        <div class="flex flex-col md:flex-row gap-4">
            <div class="flex items-end gap-4 max-w-md flex-1">
                <div class="flex-1">
                    <MonthPicker 
                        label={i18n.t('month')}
                        bind:value={selectedMonth}
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
        {#if data.monthlyReport.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={Calendar}
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
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('designation')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('daysPresent')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('avgWorkingHours')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.monthlyReport as report}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-bold text-gray-900 align-middle">
                                    <a href="/portal/labours/{report.id}" class="hover:text-primary-600 transition-colors">
                                        {report.name}
                                    </a>
                                </td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-primary-600 align-middle">{report.code}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={report.type === 'company' ? 'on_premises' : 'default'}>
                                        {report.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{report.designation || '-'}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status="success" className="px-3 py-1 text-sm bg-emerald-50 text-emerald-700 border-emerald-100">
                                        {report.daysPresent} {i18n.lang === 'bn' ? 'দিন' : 'Days'}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <span class="text-sm font-bold text-gray-700">
                                        {report.avgWorkingHours || 0}h
                                    </span>
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
