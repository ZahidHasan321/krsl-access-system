<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search, UserCheck } from 'lucide-svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import Pagination from '$lib/components/ui/Pagination.svelte';
    import { format } from 'date-fns';
    import { formatDuration } from '$lib/utils';
    import type { PageData } from './$types';

    let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
    <title>Portal - {i18n.t('labours')} - {i18n.t('attendance')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header leading-tight py-1">
                {i18n.t('attendance')} <span class="text-primary-600">/</span> {i18n.t('portal')}
            </h1>
            <p class="text-slate-600 font-semibold leading-relaxed py-0.5">{format(new Date(), 'PPP')}</p>
        </div>
    </div>

    <Card className="p-4">
        <label for="search" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('name')} / {i18n.t('codeNo')}</label>
        <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input 
                id="search"
                placeholder={i18n.t('searchPlaceholder')} 
                value={data.query}
                className="pl-10"
                readonly
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
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('workingHours')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('status')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each data.logs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
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
                                <td class="px-6 py-2 text-right align-middle">
                                    <Badge status={log.status}>
                                        {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                    </Badge>
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
