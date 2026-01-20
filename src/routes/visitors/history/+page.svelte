<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search, History, User } from 'lucide-svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import { format } from 'date-fns';
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';

    let { data }: { data: PageData } = $props();

    let searchQuery = $state('');
    let typeFilter = $state('all');

    $effect(() => {
        searchQuery = data.query || '';
    });

    const typeFilterOptions = $derived([
        { value: 'all', label: i18n.t('all') },
        { value: 'guest', label: i18n.t('guest') },
        { value: 'vendor', label: i18n.t('vendor') }
    ]);

    const filteredLogs = $derived(
        typeFilter === 'all'
            ? data.logs
            : data.logs.filter((log: any) => log.visitorType === typeFilter)
    );

    function handleSearch() {
        const url = new URL(window.location.href);
        if (searchQuery) {
            url.searchParams.set('q', searchQuery);
        } else {
            url.searchParams.delete('q');
        }
        goto(url.toString(), { keepFocus: true, replaceState: true });
    }

    let timeout: any;
    function debounceSearch() {
        clearTimeout(timeout);
        timeout = setTimeout(handleSearch, 300);
    }
</script>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('visitors')} - {i18n.t('history')}</h1>
            <p class="text-gray-500">{i18n.t('history')}</p>
        </div>
    </div>

    <Card className="p-4">
        <div class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    placeholder={i18n.t('searchPlaceholder')}
                    bind:value={searchQuery}
                    oninput={debounceSearch}
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
            <Card className="p-12 text-center">
                <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <History size={32} />
                </div>
                <p class="text-gray-500 font-medium">{i18n.t('noResults')}</p>
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('date')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('company')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('purpose')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('status')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredLogs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-3 text-sm font-medium text-gray-900 align-middle">
                                    {format(new Date(log.date), 'PPP')}
                                </td>
                                <td class="px-6 py-3 align-middle">
                                    <p class="text-sm font-bold text-gray-900">{log.visitorName}</p>
                                    <p class="text-xs text-indigo-600 font-mono font-bold">{log.visitingCardNo || '-'}</p>
                                </td>
                                <td class="px-6 py-3 align-middle">
                                    <Badge>
                                        {log.visitorType === 'guest' ? i18n.t('guest') : i18n.t('vendor')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{log.visitorCompany || '-'}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{log.purpose || '-'}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{format(new Date(log.entryTime), 'p')}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">
                                    {log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}
                                </td>
                                <td class="px-6 py-3 align-middle">
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
                                <p class="text-sm font-bold text-indigo-600">{format(new Date(log.date), 'PP')}</p>
                                <p class="text-lg font-bold text-gray-900">{log.visitorName}</p>
                            </div>
                            <Badge>{log.visitorType === 'guest' ? i18n.t('guest') : i18n.t('vendor')}</Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-gray-500">{i18n.t('company')}</div>
                            <div class="text-gray-900 font-medium">{log.visitorCompany || '-'}</div>
                            <div class="text-gray-500">{i18n.t('purpose')}</div>
                            <div class="text-gray-900 font-medium">{log.purpose || '-'}</div>
                            <div class="text-gray-500">{i18n.t('entryTime')}</div>
                            <div class="text-gray-900 font-medium">{format(new Date(log.entryTime), 'p')}</div>
                            <div class="text-gray-500">{i18n.t('exitTime')}</div>
                            <div class="text-gray-900 font-medium">{log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}</div>
                            <div class="text-gray-500">{i18n.t('status')}</div>
                            <div>
                                <Badge status={log.status}>
                                    {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>
