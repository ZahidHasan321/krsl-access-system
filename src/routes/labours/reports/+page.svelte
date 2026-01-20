<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search, Calendar } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { format } from 'date-fns';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let selectedMonth = $state('');
    let searchQuery = $state('');

    $effect(() => {
        selectedMonth = data.month;
    });

    const filteredReports = $derived(
        data.monthlyReport.filter((report: any) => 
            report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            report.code.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    function updateFilter() {
        const query = new URLSearchParams(page.url.searchParams);
        query.set('month', selectedMonth);
        goto(`?${query.toString()}`);
    }
</script>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('labours')} - {i18n.t('monthlyReport')}</h1>
            <p class="text-gray-500">{format(new Date(data.month), 'MMMM yyyy')}</p>
        </div>
    </div>

    <!-- Month Picker Filter -->
    <Card className="p-4">
        <div class="flex flex-col md:flex-row gap-4">
            <div class="flex items-end gap-4 max-w-md flex-1">
                <div class="flex-1">
                    <label for="month" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('month')}</label>
                    <div class="relative">
                        <input 
                            type="month" 
                            id="month" 
                            class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white cursor-pointer"
                            bind:value={selectedMonth}
                        />
                         <div class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                            <Calendar size={18} />
                        </div>
                    </div>
                </div>
                <Button onclick={updateFilter}>
                    <Search size={18} /> Filter
                </Button>
            </div>

             <div class="flex-1 relative">
                 <label for="search" class="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <div class="relative">
                     <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        id="search"
                        placeholder={i18n.t('searchPlaceholder')} 
                        bind:value={searchQuery} 
                        class="w-full pl-10 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                </div>
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if filteredReports.length === 0}
            <Card className="p-12 text-center text-gray-500">
                <p>{i18n.t('noData')}</p>
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
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('daysPresent')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredReports as report}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-bold text-gray-900 align-middle">{report.name}</td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-indigo-600 align-middle">{report.code}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={report.isTrained ? 'success' : 'danger'}>
                                        {report.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status="success" className="px-3 py-1 text-sm">
                                        {report.daysPresent} Days
                                    </Badge>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
            
             <!-- Mobile Cards -->
            <div class="md:hidden space-y-4">
                {#each filteredReports as report}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                             <div>
                                <p class="text-lg font-bold text-gray-900">{report.name}</p>
                                <p class="text-xs font-mono font-bold text-indigo-600">{report.code}</p>
                            </div>
                            <Badge status="success" className="px-3 py-1 text-sm">
                                {report.daysPresent} Days
                            </Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                             <div class="text-gray-500">{i18n.t('isTrained')}</div>
                            <div>
                                <Badge status={report.isTrained ? 'success' : 'danger'}>
                                    {report.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>
