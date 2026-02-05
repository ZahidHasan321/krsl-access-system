<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Table from '$lib/components/ui/table';
    import { Search, Calendar, Filter, Clock, Users, TrendingUp, X, RotateCcw, ChevronRight, Printer } from 'lucide-svelte';
    import logo from '$lib/assets/logo.png';
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

    let searchQuery = $state('');
    let startDate = $state('');
    let endDate = $state('');

    $effect(() => {
        searchQuery = data.filters.query;
        startDate = data.filters.startDate;
        endDate = data.filters.endDate;
    });
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
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function changeView(view: string) {
        const url = new URL(page.url);
        url.searchParams.set('view', view);
        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function changeCategory(catId: string | null) {
        const url = new URL(page.url);
        if (catId) url.searchParams.set('category', catId);
        else url.searchParams.delete('category');
        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true, noScroll: true });
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

    const activeCategoryName = $derived(() => {
        if (!selectedCategoryId) return '';
        const cat = getCategoryById(selectedCategoryId);
        return cat ? (i18n.t(cat.slug as any) || cat.name) : '';
    });

    function printHistory() {
        window.print();
    }
</script>

<!-- Print-only section -->
<div class="print-only hidden">
    <div class="print-header" style="display: flex !important; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 2px solid #333; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src={logo} alt="Logo" style="height: 48px; width: auto;" />
            <div>
                <h1 style="font-size: 24px; font-weight: 800; margin: 0;">{i18n.t('appName')}</h1>
                <p style="font-size: 14px; font-weight: 600; color: #333; margin: 4px 0 0 0;">
                    {#if data.view === 'detailed'}
                        Attendance History - Detailed Log
                    {:else if data.view === 'daily'}
                        Attendance History - Daily Summary
                    {:else}
                        Attendance History - Monthly Summary
                    {/if}
                </p>
            </div>
        </div>
        <div style="text-align: right;">
            <p style="font-size: 14px; font-weight: 600; margin: 0;">Generated: {format(new Date(), 'PPPP')}</p>
            <p style="font-size: 12px; color: #666; margin: 4px 0 0 0;">at {format(new Date(), 'hh:mm a')}</p>
        </div>
    </div>

    <!-- Summary Section (MOVED TO TOP) -->
    <div style="margin-bottom: 1.5rem; padding: 1rem; background: #f9f9f9; border: 1px solid #ddd; border-radius: 4px;">
        <p style="font-size: 12px; font-weight: 700; margin: 0 0 0.5rem 0;">Summary Statistics:</p>
        <div style="display: flex; gap: 2rem; font-size: 12px;">
            <span><strong>Total Entries:</strong> {data.summary.totalEntries}</span>
            <span><strong>Unique People:</strong> {data.summary.uniquePeople}</span>
            <span><strong>Active Days:</strong> {data.summary.activeDays}</span>
            <span><strong>Total Time:</strong> {formatDuration(data.summary.totalDuration)}</span>
        </div>
    </div>

    <!-- Active Filters Info -->
    <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">
        <p style="font-size: 12px; margin: 0;">
            <strong>Filters Applied:</strong>
            {#if selectedCategoryId}
                Category: {activeCategoryName()} |
            {/if}
            {#if data.filters.query}
                Search: "{data.filters.query}" |
            {/if}
            {#if data.filters.startDate}
                From: {format(parseISO(data.filters.startDate), 'PP')} |
            {/if}
            {#if data.filters.endDate}
                To: {format(parseISO(data.filters.endDate), 'PP')} |
            {/if}
            {#if !selectedCategoryId && !data.filters.query && !data.filters.startDate && !data.filters.endDate}
                None (showing all records)
            {/if}
        </p>
        <p style="font-size: 12px; margin: 4px 0 0 0;">
            <strong>Total Records:</strong> {data.pagination.totalCount} |
            <strong>Page:</strong> {data.pagination.page} of {data.pagination.totalPages}
        </p>
    </div>

    {#if data.view === 'detailed'}
        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">#</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Name</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Code No.</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Category</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Date</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Entry</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Exit</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Duration</th>
                    {#if !isEmployeeView}
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Purpose</th>
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#each data.data as log, index}
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 6px;">{index + 1}</td>
                        <td style="border: 1px solid #ddd; padding: 6px; font-weight: 600;">{log.person.name}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">{log.person.codeNo || '-'}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">{log.category.name}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">{format(parseISO(log.date), 'PP')}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">{format(log.entryTime, 'hh:mm a')}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">{log.exitTime ? format(log.exitTime, 'hh:mm a') : 'Still Inside'}</td>
                        <td style="border: 1px solid #ddd; padding: 6px;">
                            {#if log.exitTime}
                                {formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
                            {:else}
                                -
                            {/if}
                        </td>
                        {#if !isEmployeeView}
                            <td style="border: 1px solid #ddd; padding: 6px;">{log.purpose || '-'}</td>
                        {/if}
                    </tr>
                {:else}
                    <tr>
                        <td colspan={isEmployeeView ? 8 : 9} style="border: 1px solid #ddd; padding: 20px; text-align: center; color: #666;">
                            No records found
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {:else if data.view === 'daily'}
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Date</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Total Entries</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Unique People</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Total Hours</th>
                </tr>
            </thead>
            <tbody>
                {#each data.data as day}
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">{format(parseISO(day.date), 'PP')}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">{day.totalEntries}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">{day.uniquePeople}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">{formatDuration(day.totalDuration)}</td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="4" style="border: 1px solid #ddd; padding: 20px; text-align: center; color: #666;">
                            No records found
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {:else if data.view === 'monthly'}
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <thead>
                <tr style="background: #f0f0f0;">
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Month</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Total Entries</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Unique People</th>
                    <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Active Days</th>
                </tr>
            </thead>
            <tbody>
                {#each data.data as month}
                    <tr>
                        <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">{format(parseISO(month.month + '-01'), 'MMMM yyyy')}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">{month.totalEntries}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">{month.uniquePeople}</td>
                        <td style="border: 1px solid #ddd; padding: 8px;">{month.activeDays}</td>
                    </tr>
                {:else}
                    <tr>
                        <td colspan="4" style="border: 1px solid #ddd; padding: 20px; text-align: center; color: #666;">
                            No records found
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    {/if}

    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center;">
        Generated by {i18n.t('appName')} • Page {data.pagination.page} of {data.pagination.totalPages}
    </div>
</div>

<!-- Screen view -->
<div class="no-print">
<div class="space-y-6 pb-20">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('history')}</h1>

        <div class="flex items-center gap-3">
            <div class="text-sm font-bold text-slate-400">
                {data.pagination.totalCount} {data.pagination.totalCount === 1 ? 'record' : 'records'}
            </div>
            <Button
                variant="outline"
                class="h-10 px-4 rounded-xl font-bold gap-2 border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                onclick={printHistory}
            >
                <Printer size={16} />
                <span class="hidden sm:inline">Print</span>
            </Button>
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
                            !selectedCategoryId ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md" : "text-slate-600"
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
            <!-- Mobile Card View -->
            <div class="lg:hidden space-y-3">
                {#if data.view === 'detailed'}
                    {#each data.data as log}
                        <Card.Root class="cursor-pointer hover:shadow-lg transition-shadow" onclick={() => goto(`/people/${log.person.id}`)}>
                            <Card.Content class="p-4">
                                <div class="flex items-start justify-between gap-3 mb-3">
                                    <div>
                                        <div class="font-bold text-slate-900">{log.person.name}</div>
                                        <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                            {log.rootCategory.name} {log.category.name !== log.rootCategory.name ? '• ' + log.category.name : ''} • {log.person.codeNo || 'N/A'}
                                        </div>
                                    </div>
                                    {#if !log.exitTime}
                                        <Badge class={cn("text-[10px] font-bold uppercase shrink-0", statusBadgeClasses.on_premises)}>
                                            {i18n.t('inside')}
                                        </Badge>
                                    {/if}
                                </div>
                                <div class="grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p class="text-slate-400 font-medium">{i18n.t('date')}</p>
                                        <p class="font-bold text-slate-600">{format(parseISO(log.date), 'PP')}</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-400 font-medium">{i18n.t('entryTime')}</p>
                                        <p class="font-black text-slate-700">{format(log.entryTime, 'hh:mm a')}</p>
                                    </div>
                                    <div>
                                        <p class="text-slate-400 font-medium">{i18n.t('exitTime')}</p>
                                        <p class="font-black text-slate-700">{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}</p>
                                    </div>
                                </div>
                                {#if log.exitTime}
                                    <div class="mt-2 pt-2 border-t border-slate-100 text-xs">
                                        <span class="text-slate-400 font-medium">{i18n.t('duration')}:</span>
                                        <span class="font-bold text-slate-500 ml-1">{formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}</span>
                                    </div>
                                {/if}
                                {#if !isEmployeeView && log.purpose}
                                    <div class="mt-2 pt-2 border-t border-slate-100 text-xs">
                                        <span class="text-slate-400 font-medium">{i18n.t('purpose')}:</span>
                                        <span class="font-medium text-slate-600 ml-1">{log.purpose}</span>
                                    </div>
                                {/if}
                            </Card.Content>
                        </Card.Root>
                    {:else}
                        <div class="py-20 text-center space-y-4">
                            <div class="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Users size={40} />
                            </div>
                            <p class="text-slate-500 font-bold">{i18n.t('noData')}</p>
                        </div>
                    {/each}
                {:else if data.view === 'daily'}
                    {#each data.data as day}
                        <Card.Root>
                            <Card.Content class="p-4">
                                <div class="font-bold text-slate-900 mb-2">{format(parseISO(day.date), 'PP')}</div>
                                <div class="grid grid-cols-3 gap-2 text-center">
                                    <div class="bg-primary-50 rounded-lg p-2">
                                        <p class="text-xl font-black text-primary-600">{day.totalEntries}</p>
                                        <p class="text-[10px] font-bold text-primary-500 uppercase">{i18n.t('entries')}</p>
                                    </div>
                                    <div class="bg-emerald-50 rounded-lg p-2">
                                        <p class="text-xl font-black text-emerald-600">{day.uniquePeople}</p>
                                        <p class="text-[10px] font-bold text-emerald-500 uppercase">{i18n.t('people')}</p>
                                    </div>
                                    <div class="bg-slate-100 rounded-lg p-2">
                                        <p class="text-xl font-black text-slate-700">{formatDuration(day.totalDuration)}</p>
                                        <p class="text-[10px] font-bold text-slate-500 uppercase">Hours</p>
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {:else}
                        <div class="py-20 text-center space-y-4">
                            <div class="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <Calendar size={40} />
                            </div>
                            <p class="text-slate-500 font-bold">{i18n.t('noData')}</p>
                        </div>
                    {/each}
                {:else if data.view === 'monthly'}
                    {#each data.data as month}
                        <Card.Root>
                            <Card.Content class="p-4">
                                <div class="font-black text-slate-900 uppercase mb-2">{format(parseISO(month.month + '-01'), 'MMMM yyyy')}</div>
                                <div class="grid grid-cols-3 gap-2 text-center">
                                    <div class="bg-primary-50 rounded-lg p-2">
                                        <p class="text-xl font-black text-primary-600">{month.totalEntries}</p>
                                        <p class="text-[10px] font-bold text-primary-500 uppercase">{i18n.t('entries')}</p>
                                    </div>
                                    <div class="bg-emerald-50 rounded-lg p-2">
                                        <p class="text-xl font-black text-emerald-600">{month.uniquePeople}</p>
                                        <p class="text-[10px] font-bold text-emerald-500 uppercase">{i18n.t('people')}</p>
                                    </div>
                                    <div class="bg-amber-50 rounded-lg p-2">
                                        <p class="text-xl font-black text-amber-600">{month.activeDays}</p>
                                        <p class="text-[10px] font-bold text-amber-500 uppercase">Days</p>
                                    </div>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {:else}
                        <div class="py-20 text-center space-y-4">
                            <div class="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <TrendingUp size={40} />
                            </div>
                            <p class="text-slate-500 font-bold">{i18n.t('noData')}</p>
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- Desktop Table View -->
            <Card.Root class="hidden lg:block">
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
                        goto(url.toString(), { keepFocus: true, noScroll: true });
                    }}>Previous</Button>
                    <div class="text-sm font-bold text-slate-500 px-4">Page {data.pagination.page} of {data.pagination.totalPages}</div>
                    <Button variant="outline" size="sm" disabled={data.pagination.page === data.pagination.totalPages} onclick={() => {
                        const url = new URL(page.url);
                        url.searchParams.set('page', (data.pagination.page + 1).toString());
                        goto(url.toString(), { keepFocus: true, noScroll: true });
                    }}>Next</Button>
                </div>
            {/if}
        </div>
    </div>
</div>
</div>
