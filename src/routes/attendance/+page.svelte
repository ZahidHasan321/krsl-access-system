<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import {
        Search,
        Users,
        PlayCircle,
        PlusCircle,
        Clock,
        CheckCircle2,
        LogOut,
        RotateCcw,
        ChevronRight,
        X
    } from 'lucide-svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { format } from 'date-fns';
    import { enhance } from '$app/forms';
    import { clsx } from 'clsx';
    import { slide } from 'svelte/transition';
    import { sineInOut } from 'svelte/easing';
    import { cn, getCategoryLevelClass, statusBadgeClasses } from '$lib/utils';
    import type { PageData } from './$types';
    import CheckInDialog from '$lib/components/CheckInDialog.svelte';
    import RegisterDialog from '../people/RegisterDialog.svelte';
    import { CATEGORIES, ROOT_CATEGORIES, getSubCategories, getCategoryById } from '$lib/constants/categories';

    let { data }: { data: PageData } = $props();

    const getCategoryPath = (categoryId: string) => {
        const path: { id: string, name: string, slug: string }[] = [];
        let current = getCategoryById(categoryId);
        while (current) {
            path.unshift({ id: current.id, name: current.name, slug: current.slug });
            if (!current.parentId) break;
            const parentId = current.parentId;
            current = getCategoryById(parentId);
        }
        return path;
    };

    let searchQuery = $state('');
    let selectedCategoryId = $state('');
    let isCheckInOpen = $state(false);
    let isRegisterOpen = $state(false);
    let debounceTimer: any;

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // No need for a separate handleSearch here since filteredLogs is a $derived
        }, 400);
    }

    // Derived states for filtering logic
    const activeRootCategoryId = $derived(() => {
        if (!selectedCategoryId) return '';
        // If selected is root
        if (ROOT_CATEGORIES.some(c => c.id === selectedCategoryId)) return selectedCategoryId;
        
        // Traverse up
        let current = getCategoryById(selectedCategoryId);
        if (!current) return '';
        
        while (current?.parentId) {
            const parentId = current.parentId;
            const parent = getCategoryById(parentId);
            if (!parent) break;
            current = parent;
        }
        return current?.id || '';
    });

    const activeCategoryName = $derived(() => {
        if (!selectedCategoryId) return '';
        const cat = getCategoryById(selectedCategoryId);
        return cat ? (i18n.t(cat.slug as any) || cat.name) : '';
    });
    
    const activeRootCategoryName = $derived(() => {
        const rootId = activeRootCategoryId();
        if (!rootId) return '';
        const cat = ROOT_CATEGORIES.find(c => c.id === rootId);
        return cat ? (i18n.t(cat.slug as any) || cat.name) : '';
    });

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
        if (selected.parentId) {
            return getSubCategories(selected.parentId);
        }
        return [];
    });
    
    const activeParentCategory = $derived(() => {
        if (!selectedCategoryId) return null;
        if (ROOT_CATEGORIES.some(c => c.id === selectedCategoryId)) return null;
        const selected = getCategoryById(selectedCategoryId);
        if (!selected?.parentId) return null;
        return getCategoryById(selected.parentId);
    });

    const isEmployeeView = $derived(activeRootCategoryName() === i18n.t('employee'));

    const filteredLogs = $derived(
        data.logs.filter(log => {
            const matchesSearch = !searchQuery ||
                log.person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.person.codeNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.person.company?.toLowerCase().includes(searchQuery.toLowerCase());

            // Category matching: check if log.person.categoryId is descendant of selectedCategoryId
            let matchesCategory = true;
            if (selectedCategoryId) {
                 let currentId = log.person.categoryId;
                 let isDescendant = false;
                 
                 if (currentId === selectedCategoryId) isDescendant = true;
                 else {
                     let cat = getCategoryById(currentId);
                     while (cat?.parentId) {
                         if (cat.parentId === selectedCategoryId) {
                             isDescendant = true;
                             break;
                         }
                         const parentId = cat.parentId;
                         const parent = getCategoryById(parentId);
                         if (!parent) break;
                         cat = parent;
                     }
                 }
                 
                 matchesCategory = isDescendant;
            }

            return matchesSearch && matchesCategory;
        })
    );

    const hasActiveFilters = $derived(
        !!searchQuery
    );

    function clearFilters() {
        searchQuery = '';
    }

    function getDuration(entry: Date, exit: Date | null) {
        if (!exit) return '';
        const diff = exit.getTime() - entry.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
</script>

<div class="space-y-6 pb-24">
    <div class="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('entryLog')}</h1>

        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 xl:max-w-3xl">
            <div class="relative flex-1 group">
                <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                <Input
                    placeholder={i18n.t('searchPlaceholder')}
                    class="h-14 pl-12 pr-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:border-primary-500 focus-visible:ring-0 shadow-sm font-bold text-base"
                    bind:value={searchQuery}
                    oninput={handleSearchInput}
                />
                {#if searchQuery}
                    <button 
                        class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                        onclick={() => searchQuery = ''}
                    >
                        <X size={16} />
                    </button>
                {/if}
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
    </div>

    <!-- Category Filters -->
    <div class="space-y-3 pt-2">
        <div class="flex flex-wrap items-center gap-2">
            <Button
                variant={selectedCategoryId === '' ? "default" : "outline"}
                size="sm"
                class={cn(
                    "rounded-full font-bold px-4 transition-all",
                    selectedCategoryId === '' ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
                )}
                onclick={() => selectedCategoryId = ''}
            >
                <div class="flex items-center gap-2">
                    {#if selectedCategoryId === ''}
                        <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                    {/if}
                    {i18n.t('all')}
                </div>
            </Button>
            {#each ROOT_CATEGORIES as cat}
                {@const isActive = activeRootCategoryId() === cat.id}
                <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    class={cn(
                        "rounded-full font-bold px-4 transition-all",
                        isActive ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
                    )}
                    onclick={() => selectedCategoryId = cat.id}
                >
                    <div class="flex items-center gap-2">
                        {#if isActive}
                            <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                        {/if}
                        {i18n.t(cat.slug as any) || cat.name}
                    </div>
                </Button>
            {/each}
        </div>

        <!-- Sub-category pills -->
        {#if availableSubCategories().length > 0}
            <div 
                class="flex items-center gap-2 pl-2"
                transition:slide={{ duration: 250, easing: sineInOut }}
            >
                <ChevronRight size={16} class="text-slate-300" />
                <div class="flex flex-wrap items-center gap-1.5">
                    <!-- Root Reset (e.g. "All Employees") -->
                    <button
                        class={clsx(
                            "px-3 py-1 text-xs font-bold rounded-full transition-all border",
                            activeRootCategoryId() === selectedCategoryId
                                ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                        )}
                        onclick={() => selectedCategoryId = activeRootCategoryId()}
                    >
                        All {activeRootCategoryName()}
                    </button>

                     <!-- Parent Reset (e.g. "Back to Contractors") -->
                    {#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
                         <button
                            class="px-3 py-1 text-xs font-bold rounded-full transition-all bg-white text-slate-600 border border-slate-200 hover:border-primary-300 shadow-sm"
                            onclick={() => selectedCategoryId = activeParentCategory()?.id || ''}
                        >
                            <span class="opacity-50 mr-1">↑</span>
                            {activeParentCategory()?.name}
                        </button>
                    {/if}

                    {#each availableSubCategories() as subCat}
                        <button
                            class={clsx(
                                "px-3 py-1 text-xs font-bold rounded-full transition-all border",
                                selectedCategoryId === subCat.id
                                    ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                    : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                            )}
                            onclick={() => selectedCategoryId = subCat.id}
                        >
                            {i18n.t(subCat.slug as any) || subCat.name}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <div class="grid grid-cols-1 gap-4">
        {#each filteredLogs as log}
            <Card.Root class="overflow-hidden border-l-4 border-l-emerald-500">
                <Card.Content class="p-4 md:p-6">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div class="flex items-center gap-4 min-w-0">
                            <div class="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                <Users size={24} />
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="font-black text-slate-900 truncate">{log.person.name}</h3>
                                    
                                    {#each getCategoryPath(log.person.categoryId) as cat, i}
                                        <Badge variant="outline" class={cn("text-[10px] font-bold uppercase tracking-wider", getCategoryLevelClass(i))}>
                                            {i18n.t(cat.slug as any) || cat.name}
                                        </Badge>
                                    {/each}
                                </div>
                                <p class="text-xs font-bold text-slate-500 mt-0.5">
                                    {log.person.codeNo || 'N/A'} • {log.person.company || 'Private'}
                                </p>
                                {#if !isEmployeeView && log.purpose}
                                    <p class="text-xs font-medium text-primary-600 mt-1 flex items-center gap-1">
                                        <span class="text-[10px] font-bold uppercase text-slate-400">Purpose:</span>
                                        {log.purpose}
                                    </p>
                                {/if}
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-6 md:gap-12 w-full md:w-auto">
                            <div class="flex items-center gap-8">
                                <div class="space-y-1">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{i18n.t('entryTime')}</p>
                                    <div class="flex items-center gap-1.5 text-slate-900 font-black">
                                        <Clock size={14} class="text-primary-500" />
                                        <span>{format(log.entryTime, 'hh:mm a')}</span>
                                    </div>
                                </div>
                            </div>

                            {#if data.user?.permissions.includes('people.create')}
                                <form method="POST" action="?/checkOut" use:enhance class="w-full md:w-auto">
                                    <input type="hidden" name="logId" value={log.id} />
                                    <Button type="submit" variant="outline" class="w-full md:w-auto border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-black gap-2">
                                        <CheckCircle2 size={18} />
                                        {i18n.t('checkOut')}
                                    </Button>
                                </form>
                            {/if}
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>
        {:else}
            <div class="py-20 text-center space-y-4">
                <div class="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Users size={40} />
                </div>
                <p class="text-slate-500 font-bold">{i18n.t('noResults')}</p>
            </div>
        {/each}
    </div>

    {#if data.pagination.totalPages > 1}
        <div class="flex items-center justify-center gap-2 mt-8">
            <Button
                variant="outline"
                size="sm"
                class="font-bold border-2"
                disabled={data.pagination.page === 1}
                onclick={() => {
                    const url = new URL(page.url);
                    url.searchParams.set('page', (data.pagination.page - 1).toString());
                    goto(url.toString());
                }}
            >
                Previous
            </Button>
            <div class="text-sm font-black text-slate-500 px-4">
                Page {data.pagination.page} of {data.pagination.totalPages}
            </div>
            <Button
                variant="outline"
                size="sm"
                class="font-bold border-2"
                disabled={data.pagination.page === data.pagination.totalPages}
                onclick={() => {
                    const url = new URL(page.url);
                    url.searchParams.set('page', (data.pagination.page + 1).toString());
                    goto(url.toString());
                }}
            >
                Next
            </Button>
        </div>
    {/if}
</div>

<!-- Floating Action Buttons -->
{#if data.user?.permissions.includes('people.create')}
    <div class="fixed bottom-8 right-8 flex flex-col gap-3 z-30">
        <Button
            variant="secondary"
            class="h-14 px-6 rounded-2xl shadow-xl border-2 border-slate-200 font-black text-base gap-3 group animate-in slide-in-from-bottom-8 duration-500 delay-100 hover:scale-105 active:scale-95 transition-all"
            onclick={() => isRegisterOpen = true}
        >
            <PlusCircle size={22} class="group-hover:rotate-90 transition-transform duration-300" />
            {i18n.t('register')}
        </Button>

        <Button
            variant="default"
            class="h-16 px-8 rounded-2xl shadow-2xl shadow-primary-200 font-black text-lg gap-3 animate-in slide-in-from-bottom-12 duration-500 hover:scale-105 active:scale-95 transition-all"
            onclick={() => isCheckInOpen = true}
        >
            <PlayCircle size={26} />
            {i18n.t('checkIn')}
        </Button>
    </div>
{/if}

<CheckInDialog bind:open={isCheckInOpen} />
<RegisterDialog bind:open={isRegisterOpen} />