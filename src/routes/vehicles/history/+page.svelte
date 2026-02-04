<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Search, History, Truck, Calendar, Filter, User, Package, Clock, LogOut, RotateCcw, ArrowLeft, X } from 'lucide-svelte';
    import * as Card from '$lib/components/ui/card';
    import * as Table from '$lib/components/ui/table';
    import { Badge } from '$lib/components/ui/badge';
    import { Input } from '$lib/components/ui/input';
    import { Button } from '$lib/components/ui/button';
    import { format, parseISO } from 'date-fns';
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { cn } from '$lib/utils';

    let { data }: { data: PageData } = $props();

    // Form input state - synced with data
    let searchQuery = $state(data.query || '');
    let dateFrom = $state(data.dateFrom || '');
    let dateTo = $state(data.dateTo || '');
    let typeFilter = $state(data.typeFilter || 'all');
    let debounceTimer: any;

    function handleInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(updateFilters, 400);
    }

    // Sync state when data changes (e.g., after navigation)
    $effect(() => {
        searchQuery = data.query || '';
        dateFrom = data.dateFrom || '';
        dateTo = data.dateTo || '';
        typeFilter = data.typeFilter || 'all';
    });

    function updateFilters() {
        const url = new URL(page.url);
        if (searchQuery) url.searchParams.set('q', searchQuery);
        else url.searchParams.delete('q');

        if (dateFrom) url.searchParams.set('from', dateFrom);
        else url.searchParams.delete('from');

        if (dateTo) url.searchParams.set('to', dateTo);
        else url.searchParams.delete('to');

        if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);
        else url.searchParams.delete('type');

        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function clearFilters() {
        searchQuery = '';
        dateFrom = '';
        dateTo = '';
        updateFilters();
    }

    // Use data props for hasActiveFilters to ensure it reflects actual URL state
    const hasActiveFilters = $derived(
        !!data.query || !!data.dateFrom || !!data.dateTo
    );
</script>

<svelte:head>
    <title>{i18n.t('vehicles')} - {i18n.t('history')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6 pb-20">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div class="flex items-center gap-4">
            <Button variant="ghost" size="icon" class="shrink-0" onclick={() => goto('/vehicles')}>
                <ArrowLeft size={20} />
            </Button>
            <div>
                <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('vehicles')} <span class="text-slate-300">/</span> {i18n.t('history')}</h1>
                <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">
                    {#if data.dateFrom && data.dateTo}
                        {format(parseISO(data.dateFrom), 'PP')} - {format(parseISO(data.dateTo), 'PP')}
                    {:else if data.dateFrom}
                        From {format(parseISO(data.dateFrom), 'PP')}
                    {:else if data.dateTo}
                        Until {format(parseISO(data.dateTo), 'PP')}
                    {:else}
                        {i18n.t('all')} {i18n.t('history')}
                    {/if}
                </p>
            </div>
        </div>
    </div>

    <!-- Filters Bar -->
    <div class="flex flex-col xl:flex-row gap-3">
        <!-- Search Section -->
        <div class="flex-1 relative group">
            <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                <Search size={20} />
            </div>
            <Input 
                bind:value={searchQuery}
                oninput={handleInput}
                placeholder={i18n.t('searchPlaceholder')}
                class="h-14 pl-12 pr-12 bg-white border-2 border-slate-200 rounded-2xl focus-visible:border-primary-500 focus-visible:ring-0 shadow-sm font-bold text-base"
            />
            {#if searchQuery}
                <button 
                    class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                    onclick={() => { searchQuery = ''; updateFilters(); }}
                >
                    <X size={16} />
                </button>
            {/if}
        </div>

        <!-- Date Range Section -->
        <div class="flex flex-col sm:flex-row items-center bg-white border-2 border-slate-200 rounded-2xl min-h-14 px-4 shadow-sm gap-4">
            <div class="flex items-center gap-2 text-slate-400 shrink-0 border-r-2 border-slate-100 pr-4 h-8">
                 <Calendar size={18} />
                 <span class="text-[10px] font-black uppercase tracking-widest">Date Range</span>
            </div>
            <div class="flex items-center gap-3 py-2 sm:py-0">
                <div class="flex flex-col">
                    <span class="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">From</span>
                    <input type="date" bind:value={dateFrom} onchange={updateFilters} class="text-sm font-black text-slate-700 bg-transparent focus:outline-none cursor-pointer" />
                </div>
                <div class="w-4 h-0.5 bg-slate-200 rounded-full"></div>
                <div class="flex flex-col">
                    <span class="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">To</span>
                    <input type="date" bind:value={dateTo} onchange={updateFilters} class="text-sm font-black text-slate-700 bg-transparent focus:outline-none cursor-pointer" />
                </div>
            </div>
        </div>

        {#if hasActiveFilters}
            <Button 
                variant="ghost" 
                class="h-14 px-6 rounded-2xl font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600 gap-2 border-2 border-transparent hover:border-rose-100 transition-all animate-in zoom-in duration-200" 
                onclick={clearFilters}
            >
                <RotateCcw size={18} />
                Reset
            </Button>
        {/if}
    </div>

    <!-- Type Filter Pills -->
    <div class="flex flex-wrap items-center gap-2 pt-2">
        <Button
            variant={data.typeFilter === 'all' ? "default" : "outline"}
            size="sm"
            class={cn(
                "rounded-full font-bold px-4 transition-all",
                data.typeFilter === 'all' ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
            )}
            onclick={() => { typeFilter = 'all'; updateFilters(); }}
        >
            <div class="flex items-center gap-2">
                {#if data.typeFilter === 'all'}
                    <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                {/if}
                {i18n.t('all')}
            </div>
        </Button>
        <Button
            variant={data.typeFilter === 'transport' ? "default" : "outline"}
            size="sm"
            class={cn(
                "rounded-full font-bold px-4 transition-all",
                data.typeFilter === 'transport' ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
            )}
            onclick={() => { typeFilter = 'transport'; updateFilters(); }}
        >
            <div class="flex items-center gap-2">
                {#if data.typeFilter === 'transport'}
                    <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                {/if}
                {i18n.t('transportVehicle')}
            </div>
        </Button>
        <Button
            variant={data.typeFilter === 'regular' ? "default" : "outline"}
            size="sm"
            class={cn(
                "rounded-full font-bold px-4 transition-all",
                data.typeFilter === 'regular' ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
            )}
            onclick={() => { typeFilter = 'regular'; updateFilters(); }}
        >
            <div class="flex items-center gap-2">
                {#if data.typeFilter === 'regular'}
                    <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                {/if}
                {i18n.t('regularVehicle')}
            </div>
        </Button>
    </div>

    <Card.Root class="overflow-hidden">
        <Table.Root>
            <Table.Header>
                <Table.Row class="bg-slate-50/50 hover:bg-transparent">
                    <Table.Head class="font-black text-slate-900">{i18n.t('vehicleNo')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('vehicleType')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('driverName')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('vendorName')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('status')}</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each data.vehicles as vehicle}
                    <Table.Row class="cursor-pointer group" onclick={() => goto(`/vehicles/${vehicle.id}`)}>
                        <Table.Cell class="font-black tracking-widest font-mono uppercase text-slate-900">
                            {vehicle.vehicleNumber}
                        </Table.Cell>
                        <Table.Cell>
                            <Badge variant="secondary" class="text-[10px] font-bold uppercase tracking-wider bg-slate-100">
                                {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                            </Badge>
                        </Table.Cell>
                        <Table.Cell class="font-bold text-slate-600">
                            {vehicle.driverName || '-'}
                        </Table.Cell>
                        <Table.Cell class="font-bold text-slate-600">
                            {vehicle.vendorName || '-'}
                        </Table.Cell>
                        <Table.Cell class="font-bold text-slate-600">
                            {format(parseISO(vehicle.date), 'PP')}
                        </Table.Cell>
                        <Table.Cell class="font-black text-slate-700">
                            {format(new Date(vehicle.entryTime), 'hh:mm a')}
                        </Table.Cell>
                        <Table.Cell class="font-black text-slate-700">
                            {vehicle.exitTime ? format(new Date(vehicle.exitTime), 'hh:mm a') : '-'}
                        </Table.Cell>
                        <Table.Cell>
                            {#if vehicle.status === 'on_premises'}
                                <Badge class="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] font-bold uppercase">
                                    {i18n.t('inside')}
                                </Badge>
                            {:else}
                                <Badge variant="outline" class="text-[10px] font-bold uppercase text-slate-400">
                                    {i18n.t('checkedOut')}
                                </Badge>
                            {/if}
                        </Table.Cell>
                    </Table.Row>
                {:else}
                    <Table.Row>
                        <Table.Cell colspan={8} class="h-64 text-center">
                            <div class="flex flex-col items-center gap-2 text-slate-400">
                                <History size={40} />
                                <p class="font-bold">{i18n.t('noResults')}</p>
                            </div>
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </Card.Root>

    {#if data.totalPages > 1}
        <div class="flex items-center justify-center gap-2 mt-8">
            <Button variant="outline" size="sm" disabled={data.currentPage === 1} onclick={() => {
                const url = new URL(page.url);
                url.searchParams.set('page', (data.currentPage - 1).toString());
                goto(url.toString());
            }}>Previous</Button>
            <div class="text-sm font-bold text-slate-500 px-4">Page {data.currentPage} of {data.totalPages}</div>
            <Button variant="outline" size="sm" disabled={data.currentPage === data.totalPages} onclick={() => {
                const url = new URL(page.url);
                url.searchParams.set('page', (data.currentPage + 1).toString());
                goto(url.toString());
            }}>Next</Button>
        </div>
    {/if}
</div>
