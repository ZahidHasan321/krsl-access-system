<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Select from '$lib/components/ui/select';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Badge } from '$lib/components/ui/badge';
    import { Skeleton } from '$lib/components/ui/skeleton';
    import { cn, getCategoryBadgeClass, statusBadgeClasses } from '$lib/utils';
    import { Users, Search, Loader2, CheckCircle2, Building2, IdCard, Clock, AlertCircle, ChevronRight, X } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { fade, fly, slide } from 'svelte/transition';
    import { CATEGORIES, ROOT_CATEGORIES, getSubCategories, getCategoryById } from '$lib/constants/categories';

    let { open = $bindable() } = $props<{
        open: boolean;
    }>();

    let searchQuery = $state('');
    let results = $state<any[]>([]);
    let isSearching = $state(false);
    let selectedPerson = $state<any>(null);
    let selectedCategoryId = $state('');
    let purpose = $state('');
    let debounceTimer: ReturnType<typeof setTimeout>;

    const needsPurpose = $derived(selectedPerson && selectedPerson.rootCategorySlug !== 'employee');

    // Filter subcategories based on selected root category
    const availableSubCategories = $derived(() => {
        if (!selectedCategoryId) return [];
        const isRoot = ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId);
        if (isRoot) {
            return getSubCategories(selectedCategoryId);
        }
        return [];
    });

    const selectedCategory = $derived(getCategoryById(selectedCategoryId));

    async function handleSearch() {
        if (searchQuery.length < 2) {
            results = [];
            isSearching = false;
            return;
        }
        isSearching = true;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            try {
                let url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
                if (selectedCategoryId) {
                    url += `&category=${selectedCategoryId}`;
                }
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    results = data.filter((r: any) => r.type === 'person');
                }
            } catch (err) {
                console.error(err);
            } finally {
                isSearching = false;
            }
        }, 300);
    }

    function selectPerson(person: any) {
        selectedPerson = person;
    }

    function clearSelection() {
        selectedPerson = null;
    }

    function changeCategory(catId: string) {
        selectedCategoryId = catId;
        // Re-search with new category filter
        if (searchQuery.length >= 2) {
            handleSearch();
        }
    }

    function clearCategory() {
        selectedCategoryId = '';
        if (searchQuery.length >= 2) {
            handleSearch();
        }
    }

    $effect(() => {
        if (open === false) {
            setTimeout(() => {
                searchQuery = '';
                results = [];
                selectedPerson = null;
                selectedCategoryId = '';
                purpose = '';
                isSearching = false;
            }, 300);
        }
    });

    // Re-search when query changes
    $effect(() => {
        if (searchQuery) {
            handleSearch();
        }
    });

    // Helper for category colors
    const colorMap: Record<string, string> = {
        blue: 'border-blue-200 bg-blue-50 text-blue-700',
        orange: 'border-orange-200 bg-orange-50 text-orange-700',
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        sky: 'border-sky-200 bg-sky-50 text-sky-700',
        indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        teal: 'border-teal-200 bg-teal-50 text-teal-700',
        green: 'border-green-200 bg-green-50 text-green-700',
    };

    const activeColorMap: Record<string, string> = {
        blue: 'border-blue-500 bg-blue-500 text-white',
        orange: 'border-orange-500 bg-orange-500 text-white',
        amber: 'border-amber-500 bg-amber-500 text-white',
        emerald: 'border-emerald-500 bg-emerald-500 text-white',
        sky: 'border-sky-500 bg-sky-500 text-white',
        indigo: 'border-indigo-500 bg-indigo-500 text-white',
        cyan: 'border-cyan-500 bg-cyan-500 text-white',
        teal: 'border-teal-500 bg-teal-500 text-white',
        green: 'border-green-500 bg-green-500 text-white',
    };
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[550px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 border-b bg-slate-50 shrink-0">
            <Dialog.Title class="text-xl font-black">{i18n.t('checkIn')}</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                Search and select a person to check in
            </Dialog.Description>
        </div>

        <div class="p-6 space-y-4 overflow-y-auto flex-1">
            {#if !selectedPerson}
                <!-- Search & Category Section -->
                <div class="space-y-4">
                    <!-- Search Input -->
                    <div class="relative">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <Input
                            placeholder={i18n.t('searchPlaceholder')}
                            class="pl-10 h-12 border-2 text-lg font-medium"
                            bind:value={searchQuery}
                            autofocus
                        />
                        {#if searchQuery}
                            <button 
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                onclick={() => searchQuery = ''}
                            >
                                <X size={18} />
                            </button>
                        {/if}
                    </div>

                    <!-- Category Selection -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between">
                            <Label class="font-bold text-[10px] uppercase tracking-widest text-slate-400">Filter by Category</Label>
                            {#if selectedCategoryId}
                                <button 
                                    onclick={clearCategory}
                                    class="text-[10px] font-black uppercase tracking-wider text-primary-600 hover:underline"
                                    in:fade
                                >
                                    Clear Filter
                                </button>
                            {/if}
                        </div>

                        <!-- Root Categories -->
                        <div class="grid grid-cols-3 gap-2">
                            {#each ROOT_CATEGORIES as cat}
                                {@const isActive = selectedCategoryId === cat.id || (selectedCategory?.parentId === cat.id)}
                                <button
                                    class={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-2",
                                        isActive 
                                            ? activeColorMap[cat.color] || "border-primary-500 bg-primary-500 text-white shadow-md scale-[1.02]" 
                                            : "border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50"
                                    )}
                                    onclick={() => changeCategory(cat.id)}
                                >
                                    <cat.icon size={20} strokeWidth={isActive ? 3 : 2} />
                                    <span class="text-[10px] font-black uppercase tracking-tight">{i18n.t(cat.slug as any) || cat.name}</span>
                                </button>
                            {/each}
                        </div>

                        <!-- Subcategories -->
                        {#if availableSubCategories().length > 0}
                            <div class="pt-1" transition:slide={{ duration: 200 }}>
                                <div class="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border-2 border-slate-100">
                                    {#each availableSubCategories() as subCat}
                                        <button
                                            class={cn(
                                                "px-3 py-1.5 rounded-lg border-2 text-[10px] font-black uppercase tracking-wider transition-all",
                                                selectedCategoryId === subCat.id
                                                    ? activeColorMap[subCat.color] || "border-primary-500 bg-primary-500 text-white"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
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
                </div>

                <!-- Results -->
                <div class="min-h-[300px] max-h-[300px] overflow-y-auto space-y-2 pr-1 mt-4">
                    {#if isSearching}
                        <div class="space-y-2">
                            {#each Array(4) as _}
                                <div class="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-50">
                                    <Skeleton class="size-10 rounded-full shrink-0" />
                                    <div class="flex-1 space-y-2">
                                        <Skeleton class="h-4 w-[140px]" />
                                        <Skeleton class="h-3 w-[100px]" />
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        {#each results as person (person.id)}
                            <button
                                class="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-slate-100 hover:border-primary-200 hover:bg-primary-50/50 transition-all text-left"
                                onclick={() => selectPerson(person)}
                                in:fly={{ y: 10, duration: 200 }}
                            >
                                <div class="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                                    <Users size={18} />
                                </div>
                                <div class="min-w-0 flex-1">
                                    <p class="font-bold text-slate-900 truncate">{person.title}</p>
                                    <p class="text-xs font-medium text-slate-500 truncate">{person.subtitle}</p>
                                </div>
                                <div class="flex flex-col items-end gap-1 shrink-0">
                                    {#if person.status === 'on_premises'}
                                        <Badge class={cn("text-[9px] font-black uppercase px-1.5 h-5", statusBadgeClasses.on_premises)}>
                                            {i18n.t('inside')}
                                        </Badge>
                                    {/if}
                                    <ChevronRight size={14} class="text-slate-300" />
                                </div>
                            </button>
                        {:else}
                            {#if searchQuery.length >= 2}
                                <div class="py-12 text-center" in:fade>
                                    <div class="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-3 border-2 border-dashed border-slate-200">
                                        <Users size={28} />
                                    </div>
                                    <p class="text-slate-400 font-bold">{i18n.t('noResults')}</p>
                                    <p class="text-slate-300 text-[10px] uppercase font-black mt-1">Try a different name or ID</p>
                                </div>
                            {:else if searchQuery.length < 2}
                                <div class="py-12 text-center" in:fade>
                                    <div class="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-3 border-2 border-dashed border-slate-200">
                                        <Search size={28} />
                                    </div>
                                    <p class="text-slate-400 font-bold">Search for a person</p>
                                    <p class="text-slate-300 text-[10px] uppercase font-black mt-1">Type at least 2 characters</p>
                                </div>
                            {/if}
                        {/each}
                    {/if}
                </div>
            {:else}
                <!-- Selected Person Preview -->
                <div class="space-y-4" in:fly={{ x: 20, duration: 300 }}>
                    <div class="p-6 rounded-2xl bg-gradient-to-br from-white to-slate-50 border-2 border-slate-200 shadow-sm relative overflow-hidden">
                        <div class="absolute top-0 right-0 p-4">
                            <CheckCircle2 size={40} class="text-primary-500/10" />
                        </div>
                        
                        <div class="flex items-start gap-4 relative">
                            <div class="size-16 rounded-2xl bg-white flex items-center justify-center text-primary-500 border-2 border-primary-100 shadow-sm shrink-0">
                                <Users size={32} />
                            </div>
                            <div class="min-w-0 flex-1">
                                <h3 class="text-xl font-black text-slate-900 truncate">{selectedPerson.title}</h3>
                                <div class="flex flex-wrap items-center gap-2 mt-2">
                                    {#if selectedPerson.category}
                                        <Badge variant="outline" class={cn("text-[10px] font-bold uppercase tracking-wider", getCategoryBadgeClass(selectedPerson.rootCategorySlug))}>
                                            {selectedPerson.category}
                                        </Badge>
                                    {/if}
                                    {#if selectedPerson.status === 'on_premises'}
                                        <Badge class={cn("text-[10px] font-bold uppercase", statusBadgeClasses.on_premises)}>
                                            {i18n.t('inside')}
                                        </Badge>
                                    {/if}
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-4 mt-6">
                            {#if selectedPerson.codeNo}
                                <div class="flex flex-col gap-1">
                                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">ID Number</span>
                                    <div class="flex items-center gap-2 text-sm">
                                        <IdCard size={16} class="text-slate-400" />
                                        <span class="font-bold text-slate-600">{selectedPerson.codeNo}</span>
                                    </div>
                                </div>
                            {/if}
                            {#if selectedPerson.company}
                                <div class="flex flex-col gap-1">
                                    <span class="text-[9px] font-black uppercase tracking-widest text-slate-400">Company</span>
                                    <div class="flex items-center gap-2 text-sm">
                                        <Building2 size={16} class="text-slate-400" />
                                        <span class="font-bold text-slate-600 truncate">{selectedPerson.company}</span>
                                    </div>
                                </div>
                            {/if}
                        </div>
                    </div>

                    {#if needsPurpose}
                        <div class="space-y-2 p-4 bg-primary-50/50 rounded-xl border-2 border-primary-100/50" in:slide>
                            <Label for="checkin-purpose" class="font-black text-[10px] uppercase tracking-widest text-primary-700">{i18n.t('purpose')}</Label>
                            <Input
                                id="checkin-purpose"
                                bind:value={purpose}
                                placeholder="Reason for visit (Optional)"
                                class="h-11 border-2 bg-white"
                            />
                        </div>
                    {/if}

                    {#if selectedPerson.status === 'on_premises'}
                        <div class="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-100">
                            <AlertCircle size={20} class="text-amber-600 shrink-0" />
                            <p class="text-xs font-bold text-amber-800">
                                This person is already checked in. They must check out first.
                            </p>
                        </div>
                    {/if}

                    <div class="flex gap-3 pt-2">
                        <Button type="button" variant="outline" class="flex-1 h-12 font-black border-2 uppercase tracking-wider text-xs" onclick={clearSelection}>
                            Back to Search
                        </Button>
                        {#if selectedPerson.status !== 'on_premises'}
                            <form method="POST" action="/attendance?/checkIn" class="flex-1" use:enhance={() => {
                                return async ({ result, update }) => {
                                    if (result.type === 'success') {
                                        open = false;
                                        toast.success('Check-in successful');
                                        await update();
                                    } else if (result.type === 'failure') {
                                        const msg = (result.data as any)?.message || 'Check-in failed';
                                        toast.error(msg);
                                    } else if (result.type === 'error') {
                                        toast.error('An unexpected error occurred');
                                    }
                                };
                            }}>
                                <input type="hidden" name="personId" value={selectedPerson.id} />
                                <input type="hidden" name="purpose" value={purpose} />
                                <Button type="submit" class="w-full h-12 text-sm font-black gap-2 uppercase tracking-widest">
                                    <CheckCircle2 size={20} />
                                    {i18n.t('confirm')}
                                </Button>
                            </form>
                        {/if}
                    </div>
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>
