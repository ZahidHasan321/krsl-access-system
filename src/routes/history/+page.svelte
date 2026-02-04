<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Table from '$lib/components/ui/table';
    import { Search, Calendar, Filter, Clock, Users, TrendingUp, X, RotateCcw, ChevronRight } from 'lucide-svelte';
    import { clsx } from 'clsx';
    import { cn, getCategoryBadgeClass, statusBadgeClasses } from '$lib/utils';
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { fade, slide } from 'svelte/transition';
    import { sineInOut } from 'svelte/easing';
    import { format, parseISO } from 'date-fns';

import { CATEGORIES, ROOT_CATEGORIES, getSubCategories, getCategoryById } from '$lib/constants/categories';

    let { data }: { data: PageData } = $props();

    let searchQuery = $state(data.filters.query);
    let startDate = $state(data.filters.startDate);
    let endDate = $state(data.filters.endDate);
    let debounceTimer: any;

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 400);
    }

    // Get the selected category ID from URL
    const selectedCategoryId = $derived(page.url.searchParams.get('category') || '');

    // Get parent root category for highlighting
    const activeRootCategoryId = $derived(() => {
        if (!selectedCategoryId) return '';
        if (ROOT_CATEGORIES.some(c => c.id === selectedCategoryId)) return selectedCategoryId;

        // Traverse up
        let current = getCategoryById(selectedCategoryId);
        if (!current) return '';

        while (current?.parentId) {
             const parentId = current.parentId;
             const parent = getCategoryById(parentId);
             if (!parent) break;
             // If parent is a root category, that's our root
             if (ROOT_CATEGORIES.some(r => r.id === parent.id)) return parent.id;
             current = parent;
        }
        return current?.id || '';
    });

    const activeRootCategoryName = $derived(() => {
        const rootId = activeRootCategoryId();
        if (!rootId) return '';
        const cat = ROOT_CATEGORIES.find(c => c.id === rootId);
        return cat ? (i18n.t(cat.slug as any) || cat.name) : '';
    });

    const activeParentCategory = $derived(() => {
        if (!selectedCategoryId) return null;
        if (ROOT_CATEGORIES.some(c => c.id === selectedCategoryId)) return null;
        const selected = getCategoryById(selectedCategoryId);
        if (!selected?.parentId) return null;
        return getCategoryById(selected.parentId);
    });

    const isEmployeeView = $derived(activeRootCategoryName() === i18n.t('employee'));

    // Dynamic sub-categories based on selection depth
    const availableSubCategories = $derived(() => {
        if (!selectedCategoryId) return [];
        
        // 1. If Root selected, show L2
        if (ROOT_CATEGORIES.some(c => c.id === selectedCategoryId)) {
             return getSubCategories(selectedCategoryId);
        }

        const selected = getCategoryById(selectedCategoryId);
        if (!selected) return [];

        // 2. If children exist (drill down), show them
        const children = getSubCategories(selectedCategoryId);
        if (children.length > 0) return children;

        // 3. If leaf, show siblings
        const parentId = selected.parentId;
        if (parentId) {
            return getSubCategories(parentId);
        }
        return [];
    });

    function applyFilters() {
        const url = new URL(page.url);
        if (searchQuery) url.searchParams.set('q', searchQuery);
        else url.searchParams.delete('q');

        if (startDate) url.searchParams.set('startDate', startDate);
        else url.searchParams.delete('startDate');

        if (endDate) url.searchParams.set('endDate', endDate);
        else url.searchParams.delete('endDate');

        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function changeView(view: string) {
        const url = new URL(page.url);
        url.searchParams.set('view', view);
        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function changeCategory(catId: string | null) {
        const url = new URL(page.url);
        if (catId) url.searchParams.set('category', catId);
        else url.searchParams.delete('category');
        url.searchParams.set('page', '1');
        goto(url.toString());
    }

    function clearFilters() {
        searchQuery = '';
        startDate = '';
        endDate = '';
        applyFilters();
    }

    function formatDuration(seconds: number) {
        if (!seconds) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }

    const hasActiveFilters = $derived(
        !!searchQuery || !!startDate || !!endDate
    );
</script>

<div class="space-y-6 pb-20">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('history')}</h1>

        <div class="flex items-center gap-3">
            <div class="text-sm font-bold text-slate-400">
                {data.pagination.totalCount} {data.pagination.totalCount === 1 ? 'record' : 'records'}
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
                oninput={handleSearchInput}
                placeholder={i18n.t('searchPlaceholder')}
                class="h-14 pl-12 pr-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:border-primary-500 focus-visible:ring-0 shadow-sm font-bold text-base"
            />
            {#if searchQuery}
                <button 
                    class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                    onclick={() => { searchQuery = ''; applyFilters(); }}
                >
                    <X size={16} />
                </button>
            {/if}
        </div>

        <!-- Date Range Section -->
        <div class="flex flex-col sm:flex-row items-center bg-white border-2 border-slate-100 rounded-2xl min-h-14 px-4 shadow-sm gap-4">
            <div class="flex items-center gap-2 text-slate-400 shrink-0 border-r-2 border-slate-50 pr-4 h-8">
                 <Calendar size={18} />
                 <span class="text-[10px] font-black uppercase tracking-widest">Date Range</span>
            </div>
            <div class="flex items-center gap-3 py-2 sm:py-0">
                <div class="flex flex-col">
                    <span class="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">From</span>
                    <input type="date" bind:value={startDate} onchange={applyFilters} class="text-sm font-black text-slate-700 bg-transparent focus:outline-none cursor-pointer" />
                </div>
                <div class="w-4 h-0.5 bg-slate-200 rounded-full"></div>
                <div class="flex flex-col">
                    <span class="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">To</span>
                    <input type="date" bind:value={endDate} onchange={applyFilters} class="text-sm font-black text-slate-700 bg-transparent focus:outline-none cursor-pointer" />
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

    <div class="flex flex-col md:flex-row gap-6 pt-4">
        <!-- Sidebar -->
        <div class="w-full md:w-64 space-y-6 shrink-0">
            <!-- Category Filter -->
            <div class="space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('category')}</p>
                <div class="flex flex-col gap-1">
                    <Button
                        variant={!selectedCategoryId ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 px-3 transition-all",
                            !selectedCategoryId ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-100" : "text-slate-600"
                        )}
                        onclick={() => changeCategory(null)}
                    >
                        <div class="flex items-center gap-2">
                            {#if !selectedCategoryId}
                                <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                            {/if}
                            {i18n.t('all')}
                        </div>
                    </Button>
                    {#each ROOT_CATEGORIES as cat}
                        {@const catSubCategories = getSubCategories(cat.id)}
                        {@const isCatActive = activeRootCategoryId() === cat.id}
                        <div>
                            <Button
                                variant={isCatActive ? "secondary" : "ghost"}
                                class={cn(
                                    "justify-start font-bold h-10 w-full px-3 transition-all",
                                    isCatActive ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600 rounded-l-none" : "text-slate-600"
                                )}
                                onclick={() => changeCategory(cat.id)}
                            >
                                <div class="flex items-center gap-2">
                                    {#if isCatActive}
                                        <div class="size-1.5 rounded-full bg-primary-600"></div>
                                    {/if}
                                    {i18n.t(cat.slug as any) || cat.name}
                                </div>
                            </Button>

                            <!-- Sub-category pills nested under parent -->
                            {#if isCatActive && availableSubCategories().length > 0}
                                <div 
                                    class="ml-3 mt-1 mb-2 pl-3 border-l-2 border-primary-100"
                                    transition:slide={{ duration: 250, easing: sineInOut }}
                                >
                                    <div class="flex flex-wrap gap-1.5 py-1">
                                        <!-- Root Reset -->
                                        <button
                                            class={clsx(
                                                "px-3 py-1 text-[11px] font-bold rounded-full transition-all border",
                                                activeRootCategoryId() === selectedCategoryId
                                                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                                    : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                                            )}
                                            onclick={() => changeCategory(activeRootCategoryId())}
                                        >
                                            All
                                        </button>

                                        <!-- Parent Reset (Back button) -->
                                        {#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
                                            <button
                                                class="px-2.5 py-1 text-[11px] font-bold rounded-full transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                onclick={() => changeCategory(activeParentCategory()?.id || null)}
                                            >
                                                <span class="opacity-50 mr-1">↑</span>
                                                {activeParentCategory()?.name}
                                            </button>
                                        {/if}

                                        <!-- Sub Categories -->
                                        {#each availableSubCategories() as subCat}
                                            <button
                                                class={clsx(
                                                    "px-3 py-1 text-[11px] font-bold rounded-full transition-all border",
                                                    selectedCategoryId === subCat.id
                                                        ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                                        : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                                                )}
                                                onclick={() => changeCategory(subCat.id)}
                                            >
                                                {i18n.t(subCat.slug as any) || subCat.name}
                                            </button>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- View Selector -->
            <div class="space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Views</p>
                <div class="flex flex-col gap-1">
                    <Button
                        variant={data.view === 'detailed' ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 gap-2 transition-all px-3",
                            data.view === 'detailed' ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600 rounded-l-none" : "text-slate-600"
                        )}
                        onclick={() => changeView('detailed')}
                    >
                        <div class="flex items-center gap-2">
                            {#if data.view === 'detailed'}
                                <div class="size-1.5 rounded-full bg-primary-600 animate-pulse"></div>
                            {/if}
                            <Clock size={16} />
                            {i18n.t('detailed')}
                        </div>
                    </Button>
                    <Button
                        variant={data.view === 'daily' ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 gap-2 transition-all px-3",
                            data.view === 'daily' ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600 rounded-l-none" : "text-slate-600"
                        )}
                        onclick={() => changeView('daily')}
                    >
                        <div class="flex items-center gap-2">
                            {#if data.view === 'daily'}
                                <div class="size-1.5 rounded-full bg-primary-600 animate-pulse"></div>
                            {/if}
                            <Calendar size={16} />
                            {i18n.t('dailySummary')}
                        </div>
                    </Button>
                    <Button
                        variant={data.view === 'monthly' ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 gap-2 transition-all px-3",
                            data.view === 'monthly' ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600 rounded-l-none" : "text-slate-600"
                        )}
                        onclick={() => changeView('monthly')}
                    >
                        <div class="flex items-center gap-2">
                            {#if data.view === 'monthly'}
                                <div class="size-1.5 rounded-full bg-primary-600 animate-pulse"></div>
                            {/if}
                            <TrendingUp size={16} />
                            {i18n.t('monthlySummary')}
                        </div>
                    </Button>
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="p-4 rounded-xl bg-slate-100 space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Summary</p>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <p class="text-2xl font-black text-slate-900">{data.summary.totalEntries}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('entries')}</p>
                    </div>
                    <div>
                        <p class="text-2xl font-black text-slate-900">{data.summary.uniquePeople}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">{i18n.t('people')}</p>
                    </div>
                    <div>
                        <p class="text-2xl font-black text-slate-900">{data.summary.activeDays}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">Days</p>
                    </div>
                    <div>
                        <p class="text-2xl font-black text-slate-900">{formatDuration(data.summary.totalDuration)}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase">Total Time</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Main Content -->
        <div class="flex-1 min-w-0">
            <Card.Root>
                <Table.Root>
                    {#if data.view === 'detailed'}
                        <Table.Header>
                            <Table.Row class="bg-slate-50 hover:bg-transparent">
                                <Table.Head class="font-black text-slate-900">{i18n.t('name')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
                                {#if !isEmployeeView}
                                    <Table.Head class="font-black text-slate-900">{i18n.t('purpose')}</Table.Head>
                                {/if}
                                <Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each data.data as log}
                                <Table.Row class="cursor-pointer group" onclick={() => goto(`/people/${log.person.id}`)}>
                                    <Table.Cell class="py-4">
                                        <div class="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{log.person.name}</div>
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {log.rootCategory.name} {log.category.name !== log.rootCategory.name ? '• ' + log.category.name : ''} • {log.person.codeNo || 'N/A'}
                                        </div>
                                    </Table.Cell>
                                    <Table.Cell class="py-4 font-medium text-slate-600">{format(parseISO(log.date), 'PP')}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-slate-700">{format(log.entryTime, 'hh:mm a')}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-slate-700">
                                        {log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
                                    </Table.Cell>
                                    {#if !isEmployeeView}
                                        <Table.Cell class="py-4 font-medium text-slate-600">
                                            {log.purpose || '-'}
                                        </Table.Cell>
                                    {/if}
                                    <Table.Cell class="py-4 font-bold text-slate-500">
                                        {#if log.exitTime}
                                            {formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
                                        {:else}
                                            <Badge class={cn("text-[10px] font-bold uppercase", statusBadgeClasses.on_premises)}>
                                                {i18n.t('inside')}
                                            </Badge>
                                        {/if}
                                    </Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={5} class="h-64 text-center text-slate-400 font-bold">{i18n.t('noData')}</Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    {:else if data.view === 'daily'}
                        <Table.Header>
                            <Table.Row class="bg-slate-50 hover:bg-transparent">
                                <Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('entries')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">Unique People</Table.Head>
                                <Table.Head class="font-black text-slate-900">Total Hours</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each data.data as day}
                                <Table.Row>
                                    <Table.Cell class="py-4 font-bold text-slate-900">{format(parseISO(day.date), 'PP')}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-primary-600">{day.totalEntries}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-emerald-600">{day.uniquePeople}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-slate-700">{formatDuration(day.totalDuration)}</Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={4} class="h-64 text-center text-slate-400 font-bold">{i18n.t('noData')}</Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    {:else if data.view === 'monthly'}
                        <Table.Header>
                            <Table.Row class="bg-slate-50 hover:bg-transparent">
                                <Table.Head class="font-black text-slate-900">{i18n.t('month')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('entries')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">Unique People</Table.Head>
                                <Table.Head class="font-black text-slate-900">Active Days</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each data.data as month}
                                <Table.Row>
                                    <Table.Cell class="py-4 font-black text-slate-900 uppercase">
                                        {format(parseISO(month.month + '-01'), 'MMMM yyyy')}
                                    </Table.Cell>
                                    <Table.Cell class="py-4 font-black text-primary-600">{month.totalEntries}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-emerald-600">{month.uniquePeople}</Table.Cell>
                                    <Table.Cell class="py-4 font-black text-amber-600">{month.activeDays}</Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={4} class="h-64 text-center text-slate-400 font-bold">{i18n.t('noData')}</Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    {/if}
                </Table.Root>
            </Card.Root>

            {#if data.pagination.totalPages > 1}
                <div class="flex items-center justify-center gap-2 mt-8">
                    <Button variant="outline" size="sm" disabled={data.pagination.page === 1} onclick={() => {
                        const url = new URL(page.url);
                        url.searchParams.set('page', (data.pagination.page - 1).toString());
                        goto(url.toString());
                    }}>Previous</Button>
                    <div class="text-sm font-bold text-slate-500 px-4">Page {data.pagination.page} of {data.pagination.totalPages}</div>
                    <Button variant="outline" size="sm" disabled={data.pagination.page === data.pagination.totalPages} onclick={() => {
                        const url = new URL(page.url);
                        url.searchParams.set('page', (data.pagination.page + 1).toString());
                        goto(url.toString());
                    }}>Next</Button>
                </div>
            {/if}
        </div>
    </div>
</div>
