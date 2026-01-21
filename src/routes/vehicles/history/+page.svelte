<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search, History, Truck, Calendar } from 'lucide-svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import DatePicker from '$lib/components/ui/DatePicker.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import { format } from 'date-fns';
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';

    let { data }: { data: PageData } = $props();

    let searchQuery = $state('');
    let selectedDate = $state('');
    let typeFilter = $state('all');

    $effect(() => {
        searchQuery = data.query || '';
        selectedDate = data.date || '';
    });

    const typeFilterOptions = $derived([
        { value: 'all', label: i18n.t('all') },
        { value: 'transport', label: i18n.t('transportVehicle') },
        { value: 'regular', label: i18n.t('regularVehicle') }
    ]);

    const filteredVehicles = $derived(
        typeFilter === 'all'
            ? data.vehicles
            : data.vehicles.filter((v: any) => v.type === typeFilter)
    );

    function updateFilters() {
        const url = new URL(window.location.href);
        if (searchQuery) {
            url.searchParams.set('q', searchQuery);
        } else {
            url.searchParams.delete('q');
        }

        if (selectedDate) {
            url.searchParams.set('date', selectedDate);
        } else {
            url.searchParams.delete('date');
        }

        goto(url.toString(), { keepFocus: true, replaceState: true });
    }

    let timeout: any;
    function debounceSearch() {
        clearTimeout(timeout);
        timeout = setTimeout(updateFilters, 300);
    }
</script>

<svelte:head>
    <title>{i18n.t('vehicles')} - {i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('vehicles')} - {i18n.t('history')}</h1>
            <p class="text-gray-500">{i18n.t('history')}</p>
        </div>
    </div>

    <Card className="p-4">
        <div class="flex flex-col md:flex-row gap-4">
            <div class="md:w-64">
                <DatePicker 
                    label={i18n.t('date')}
                    bind:value={selectedDate}
                    onchange={updateFilters}
                />
            </div>
            <div class="relative flex-1">
                <label for="search" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('vehicleNo')} / {i18n.t('driverName')} / {i18n.t('vendorName')}</label>
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                        id="search"
                        placeholder={i18n.t('searchPlaceholder')}
                        bind:value={searchQuery}
                        oninput={debounceSearch}
                        className="pl-10"
                    />
                </div>
            </div>
            <div class="md:w-48">
                <label for="type" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('type')}</label>
                <Select
                    id="type"
                    options={typeFilterOptions}
                    bind:value={typeFilter}
                />
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if filteredVehicles.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={Truck}
                />
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden lg:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('date')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('vehicleNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('driverName')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('vendorName')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('status')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredVehicles as vehicle}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-3 text-sm font-medium text-gray-900 align-middle whitespace-nowrap">
                                    {format(new Date(vehicle.date), 'PPP')}
                                </td>
                                <td class="px-6 py-3 text-sm font-black text-primary-600 font-mono uppercase align-middle whitespace-nowrap">
                                    {vehicle.vehicleNumber}
                                </td>
                                <td class="px-6 py-3 align-middle">
                                    <Badge>
                                        {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-3 text-sm text-gray-900 font-bold align-middle">{vehicle.driverName || '-'}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{vehicle.vendorName || '-'}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{format(new Date(vehicle.entryTime), 'p')}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">
                                    {vehicle.exitTime ? format(new Date(vehicle.exitTime), 'p') : '-'}
                                </td>
                                <td class="px-6 py-3 align-middle">
                                    <Badge status={vehicle.status}>
                                        {vehicle.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                    </Badge>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="lg:hidden space-y-4">
                {#each filteredVehicles as vehicle}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-sm font-bold text-primary-600">{format(new Date(vehicle.date), 'PP')}</p>
                                <p class="text-lg font-black text-gray-900 font-mono uppercase">{vehicle.vehicleNumber}</p>
                            </div>
                            <Badge>
                                {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                            </Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-gray-500">{i18n.t('driverName')}</div>
                            <div class="text-gray-900 font-medium">{vehicle.driverName || '-'}</div>
                            <div class="text-gray-500">{i18n.t('vendorName')}</div>
                            <div class="text-gray-900 font-medium">{vehicle.vendorName || '-'}</div>
                            <div class="text-gray-500">{i18n.t('entryTime')}</div>
                            <div class="text-gray-900 font-medium">{format(new Date(vehicle.entryTime), 'p')}</div>
                            <div class="text-gray-500">{i18n.t('exitTime')}</div>
                            <div class="text-gray-900 font-medium">{vehicle.exitTime ? format(new Date(vehicle.exitTime), 'p') : '-'}</div>
                            <div class="text-gray-500">{i18n.t('status')}</div>
                            <div>
                                <Badge status={vehicle.status}>
                                    {vehicle.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>
