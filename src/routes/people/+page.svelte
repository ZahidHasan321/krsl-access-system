<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import { Label } from '$lib/components/ui/label';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import * as Table from '$lib/components/ui/table';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Search, Users, PlusCircle, Edit2, Trash2, CheckCircle2, XCircle, Save, Eye, RotateCcw, ChevronRight, X } from 'lucide-svelte';
    import { clsx } from 'clsx';
    import { cn, getCategoryBadgeClass, statusBadgeClasses } from '$lib/utils';
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { enhance } from '$app/forms';
    import { slide } from 'svelte/transition';
    import { sineInOut } from 'svelte/easing';
    import RegisterDialog from './RegisterDialog.svelte';
    import ChangeCategoryDialog from './ChangeCategoryDialog.svelte';

import { CATEGORIES, ROOT_CATEGORIES, getSubCategories, getCategoryById } from '$lib/constants/categories';

    let { data }: { data: PageData } = $props();

    let searchQuery = $state(page.url.searchParams.get('q') || '');
    let isRegisterOpen = $state(false);
    let debounceTimer: any;

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handleSearch, 400);
    }

    // Edit dialog state
    let isEditOpen = $state(false);
    let editPerson = $state<any>(null);
    let editName = $state('');
    let editCodeNo = $state('');
    let editCompany = $state('');
    let editContactNo = $state('');
    let editDesignation = $state('');
    let editIsTrained = $state(false);
    let editNotes = $state('');

    // Change Category state
    let isChangeCategoryOpen = $state(false);
    let changeCategoryPerson = $state<any>(null);

    // Category filter logic
    const selectedCategoryId = $derived(page.url.searchParams.get('category') || '');

    const isRootCategory = $derived(
        ROOT_CATEGORIES.some(c => c.id === selectedCategoryId)
    );

    const availableSubCategories = $derived(() => {
        if (!selectedCategoryId) return [];

        // 1. If Root is selected, show its children
        if (isRootCategory) {
            return getSubCategories(selectedCategoryId);
        }

        const selected = getCategoryById(selectedCategoryId);
        if (!selected) return [];

        // 2. Check if the selected category has children
        const children = getSubCategories(selectedCategoryId);
        if (children.length > 0) {
            return children;
        }

        // 3. If no children (Leaf node), show siblings
        const parentId = selected.parentId;
        if (parentId) {
            return getSubCategories(parentId);
        }

        return [];
    });

    const activeRootCategoryId = $derived(() => {
        if (!selectedCategoryId) return '';
        if (isRootCategory) return selectedCategoryId;
        
        // Traverse up to find root
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

    const activeParentCategory = $derived(() => {
        if (!selectedCategoryId || isRootCategory) return null;
        const selected = getCategoryById(selectedCategoryId);
        if (!selected?.parentId) return null;
        return getCategoryById(selected.parentId);
    });

    const activeRootCategoryName = $derived(() => {
        const rootId = activeRootCategoryId();
        if (!rootId) return '';
        const cat = ROOT_CATEGORIES.find(c => c.id === rootId);
        return cat ? (i18n.t(cat.slug as any) || cat.name) : '';
    });

    const hasActiveFilters = $derived(
        !!searchQuery
    );

    function handleSearch() {
        const url = new URL(page.url);
        if (searchQuery) url.searchParams.set('q', searchQuery);
        else url.searchParams.delete('q');
        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true });
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
        handleSearch();
    }

    function openEdit(person: any, e: Event) {
        e.stopPropagation();
        editPerson = person;
        editName = person.name;
        editCodeNo = person.codeNo || '';
        editCompany = person.company || '';
        editContactNo = person.contactNo || '';
        editDesignation = person.designation || '';
        editIsTrained = person.isTrained;
        editNotes = person.notes || '';
        isEditOpen = true;
    }

    function openChangeCategory(person: any, e: Event) {
        e.stopPropagation();
        changeCategoryPerson = person;
        isChangeCategoryOpen = true;
    }
</script>

<div class="space-y-6 pb-20">
    <div class="flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4">
        <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('people')}</h1>

        <div class="flex flex-col md:flex-row items-stretch md:items-center gap-3 flex-1 xl:max-w-4xl">
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
                        onclick={() => { searchQuery = ''; handleSearch(); }}
                    >
                        <X size={16} />
                    </button>
                {/if}
            </div>

            <div class="flex items-center gap-2">
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

                {#if data.user?.permissions.includes('people.create')}
                    <Button class="h-14 px-8 rounded-2xl font-black gap-2 shadow-lg shadow-primary-100" onclick={() => isRegisterOpen = true}>
                        <PlusCircle size={20} />
                        <span class="hidden sm:inline">{i18n.t('register')}</span>
                    </Button>
                {/if}
            </div>
        </div>
    </div>

    <!-- Category Filters -->
    <div class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
            <Button
                variant={!selectedCategoryId ? "default" : "outline"}
                size="sm"
                class={cn(
                    "rounded-full font-bold px-4 transition-all",
                    !selectedCategoryId ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
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
                {@const isActive = activeRootCategoryId() === cat.id}
                <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    class={cn(
                        "rounded-full font-bold px-4 transition-all",
                        isActive ? "bg-primary-600 text-white border-primary-600 shadow-md shadow-primary-100" : "bg-white text-slate-600 border-slate-200"
                    )}
                    onclick={() => changeCategory(cat.id)}
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
                    <!-- Root Reset -->
                    <button
                        class={clsx(
                            "px-3 py-1 text-xs font-bold rounded-full transition-all border",
                            isRootCategory
                                ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                : "bg-white text-slate-600 border-slate-200 hover:border-primary-300"
                        )}
                        onclick={() => changeCategory(activeRootCategoryId())}
                    >
                        All {activeRootCategoryName()}
                    </button>

                    <!-- Parent Reset (if deep) -->
                    {#if activeParentCategory() && activeParentCategory()?.id !== activeRootCategoryId()}
                         <button
                            class="px-3 py-1 text-xs font-bold rounded-full transition-all bg-white text-slate-600 border border-slate-200 hover:border-primary-300 shadow-sm"
                            onclick={() => changeCategory(activeParentCategory()?.id || null)}
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
                            onclick={() => changeCategory(subCat.id)}
                        >
                            {i18n.t(subCat.slug as any) || subCat.name}
                        </button>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <Card.Root>
        <Table.Root>
            <Table.Header>
                <Table.Row class="hover:bg-transparent bg-slate-50">
                    <Table.Head class="font-black text-slate-900">{i18n.t('name')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('category')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('codeNo')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('company')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('isTrained')}</Table.Head>
                    <Table.Head class="font-black text-slate-900">{i18n.t('status')}</Table.Head>
                    <Table.Head class="text-right font-black text-slate-900">{i18n.t('actions')}</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each data.people as person}
                    <Table.Row class="group cursor-pointer" onclick={() => goto(`/people/${person.id}`)}>
                        <Table.Cell class="font-bold text-slate-900">
                            {person.name}
                        </Table.Cell>
                        <Table.Cell>
                            <button
                                class="hover:opacity-70 transition-opacity"
                                onclick={(e) => openChangeCategory(person, e)}
                            >
                                <Badge variant="outline" class={cn("font-bold text-[10px] uppercase tracking-wider", getCategoryBadgeClass(person.category.slug))}>
                                    {person.category.name}
                                </Badge>
                            </button>
                        </Table.Cell>
                        <Table.Cell class="font-medium text-slate-500">{person.codeNo || '-'}</Table.Cell>
                        <Table.Cell class="font-medium text-slate-500">{person.company || '-'}</Table.Cell>
                        <Table.Cell>
                            {#if person.isTrained}
                                <div class="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                    <CheckCircle2 size={14} />
                                    <span>YES</span>
                                </div>
                            {:else}
                                <div class="flex items-center gap-1.5 text-rose-500 font-bold text-xs">
                                    <XCircle size={14} />
                                    <span>NO</span>
                                </div>
                            {/if}
                        </Table.Cell>
                        <Table.Cell>
                            {#if person.status === 'on_premises'}
                                <Badge class={cn("text-[10px] font-bold uppercase animate-pulse", statusBadgeClasses.on_premises)}>
                                    {i18n.t('inside')}
                                </Badge>
                            {:else}
                                <Badge class={cn("text-[10px] font-bold uppercase", statusBadgeClasses.checked_out)}>
                                    {i18n.t('checkedOut')}
                                </Badge>
                            {/if}
                        </Table.Cell>
                        <Table.Cell class="text-right">
                            <div class="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" class="size-8 text-slate-400 hover:text-primary-600 hover:bg-primary-50" onclick={(e) => { e.stopPropagation(); goto(`/people/${person.id}`); }}>
                                    <Eye size={15} />
                                </Button>
                                {#if data.user?.permissions.includes('people.edit')}
                                    <Button variant="ghost" size="icon" class="size-8 text-slate-400 hover:text-primary-600 hover:bg-primary-50" onclick={(e) => openEdit(person, e)}>
                                        <Edit2 size={15} />
                                    </Button>
                                {/if}
                                {#if data.user?.permissions.includes('people.delete')}
                                    <form method="POST" action="?/delete" use:enhance={() => {
                                        return async ({ result, update }) => {
                                            if (result.type === 'success') await update();
                                        };
                                    }}>
                                        <input type="hidden" name="id" value={person.id} />
                                        <Button type="submit" variant="ghost" size="icon" class="size-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50" onclick={(e) => e.stopPropagation()}>
                                            <Trash2 size={15} />
                                        </Button>
                                    </form>
                                {/if}
                            </div>
                        </Table.Cell>
                    </Table.Row>
                {:else}
                    <Table.Row>
                        <Table.Cell colspan={7} class="h-64 text-center">
                            <div class="flex flex-col items-center gap-2 text-slate-400">
                                <Users size={40} />
                                <p class="font-bold">{i18n.t('noResults')}</p>
                            </div>
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </Card.Root>

    {#if data.pagination.totalPages > 1}
        <div class="flex items-center justify-center gap-2 mt-8">
            <Button
                variant="outline"
                size="sm"
                disabled={data.pagination.page === 1}
                onclick={() => {
                    const url = new URL(page.url);
                    url.searchParams.set('page', (data.pagination.page - 1).toString());
                    goto(url.toString());
                }}
            >
                Previous
            </Button>
            <div class="text-sm font-bold text-slate-500 px-4">
                Page {data.pagination.page} of {data.pagination.totalPages}
            </div>
            <Button
                variant="outline"
                size="sm"
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

<RegisterDialog bind:open={isRegisterOpen} />

<!-- Edit Dialog -->
{#if editPerson}
<Dialog.Root bind:open={isEditOpen}>
    <Dialog.Content class="sm:max-w-[600px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 border-b bg-slate-50 shrink-0">
            <Dialog.Title class="text-xl font-black">{i18n.t('edit')}: {editPerson.name}</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                Update person details
            </Dialog.Description>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
            <form
                method="POST"
                action="?/update"
                class="space-y-6"
                enctype="multipart/form-data"
                use:enhance={() => {
                    return async ({ result, update }) => {
                        if (result.type === 'success') {
                            isEditOpen = false;
                            await update();
                        }
                    };
                }}
            >
                <input type="hidden" name="id" value={editPerson.id} />
                <input type="hidden" name="isTrained" value={editIsTrained ? 'true' : 'false'} />

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label for="edit-name" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('name')}</Label>
                        <Input id="edit-name" name="name" bind:value={editName} required class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-codeNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('codeNo')}</Label>
                        <Input id="edit-codeNo" name="codeNo" bind:value={editCodeNo} class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-company" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('company')}</Label>
                        <Input id="edit-company" name="company" bind:value={editCompany} class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-contactNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('phone')}</Label>
                        <Input id="edit-contactNo" name="contactNo" bind:value={editContactNo} class="h-11 border-2" />
                    </div>
                    <div class="space-y-2">
                        <Label for="edit-designation" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('designation')}</Label>
                        <Input id="edit-designation" name="designation" bind:value={editDesignation} class="h-11 border-2" />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label for="edit-notes" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('notes')}</Label>
                    <Input id="edit-notes" name="notes" bind:value={editNotes} class="h-11 border-2" />
                </div>

                <div class="flex items-center space-x-3 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
                    <Checkbox id="edit-isTrained" checked={editIsTrained} onCheckedChange={(v) => editIsTrained = !!v} />
                    <Label for="edit-isTrained" class="text-sm font-black text-slate-700">{i18n.t('isTrained')}</Label>
                </div>

                <Button type="submit" class="w-full h-14 text-base font-black gap-2 shadow-lg shadow-primary-100">
                    <Save size={20} />
                    {i18n.t('save')}
                </Button>
            </form>
        </div>
    </Dialog.Content>
</Dialog.Root>
{/if}

{#if changeCategoryPerson}
<ChangeCategoryDialog
    bind:open={isChangeCategoryOpen}
    person={changeCategoryPerson}
/>
{/if}
