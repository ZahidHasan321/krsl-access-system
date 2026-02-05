<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
    import { Badge } from '$lib/components/ui/badge';
    import { Users, Briefcase, HardHat, UserCheck, ChevronRight, Save, X, Camera, Upload } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { fade, fly, slide } from 'svelte/transition';
    import { cn, getCategoryBadgeClass } from '$lib/utils';
    import { CATEGORIES, ROOT_CATEGORIES, getSubCategories, getCategoryById } from '$lib/constants/categories';

    let { open = $bindable() } = $props<{ open: boolean }>();

    let selectedRootCategoryId = $state<string>('');
    let selectedSubCategoryId = $state<string>('');
    
    let isTrained = $state(false);
    let autoCheckIn = $state(true);
    let photoPreview = $state<string | null>(null);
    let purpose = $state('');

    const selectedRootCategory = $derived(getCategoryById(selectedRootCategoryId));
    const selectedSubCategory = $derived(getCategoryById(selectedSubCategoryId));
    const subCategories = $derived(selectedRootCategoryId ? getSubCategories(selectedRootCategoryId) : []);

    const needsPurpose = $derived(selectedRootCategory && selectedRootCategory.slug !== 'employee');
    const isSubCategoryRequired = $derived(subCategories.length > 0);
    const isSubCategorySelected = $derived(!!selectedSubCategoryId);
    const canSubmit = $derived(selectedRootCategoryId && (!isSubCategoryRequired || isSubCategorySelected));

    function handlePhotoChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        } else {
            photoPreview = null;
        }
    }

    function selectRootCategory(catId: string) {
        selectedRootCategoryId = catId;
        selectedSubCategoryId = '';
        const cat = getCategoryById(catId);
        isTrained = cat?.slug === 'employee';
    }

    function selectSubCategory(subCatId: string) {
        selectedSubCategoryId = subCatId;
    }

    function clearCategorySelection() {
        selectedRootCategoryId = '';
        selectedSubCategoryId = '';
        photoPreview = null;
        purpose = '';
    }

    function resetState() {
        selectedRootCategoryId = '';
        selectedSubCategoryId = '';
        isTrained = false;
        autoCheckIn = true;
        photoPreview = null;
        purpose = '';
    }

    $effect(() => {
        if (open === false) {
            setTimeout(resetState, 300);
        }
    });

    const finalCategoryId = $derived(selectedSubCategoryId || selectedRootCategoryId || '');

    // Helper for category colors
    const activeColorMap: Record<string, string> = {
        blue: 'border-blue-500 bg-blue-500 text-white shadow-md scale-[1.02]',
        orange: 'border-orange-500 bg-orange-500 text-white shadow-md scale-[1.02]',
        amber: 'border-amber-500 bg-amber-500 text-white shadow-md scale-[1.02]',
        emerald: 'border-emerald-500 bg-emerald-500 text-white shadow-md scale-[1.02]',
        sky: 'border-sky-500 bg-sky-500 text-white',
        indigo: 'border-indigo-500 bg-indigo-500 text-white',
        cyan: 'border-cyan-500 bg-cyan-500 text-white',
        teal: 'border-teal-500 bg-teal-500 text-white',
        green: 'border-green-500 bg-green-500 text-white',
    };
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[650px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 border-b bg-slate-50 shrink-0">
            <Dialog.Title class="text-xl font-black">{i18n.t('register')}</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                {#if selectedRootCategory}
                    Registering new {i18n.t(selectedRootCategory.slug as any) || selectedRootCategory.name}
                {:else}
                    Select a category to continue
                {/if}
            </Dialog.Description>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
            {#if !selectedRootCategoryId}
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3" in:fade>
                    {#each ROOT_CATEGORIES as cat}
                        <button
                            class="group relative p-5 rounded-2xl border-2 border-slate-100 hover:border-primary-300 hover:bg-primary-50/50 transition-all text-center"
                            onclick={() => selectRootCategory(cat.id)}
                        >
                            <div class="size-14 rounded-2xl bg-slate-100 group-hover:bg-primary-100 flex items-center justify-center text-slate-400 group-hover:text-primary-600 mx-auto mb-3 transition-colors">
                                <cat.icon size={28} />
                            </div>
                            <p class="font-black text-slate-900 uppercase tracking-tight text-sm">{i18n.t(cat.slug as any) || cat.name}</p>
                        </button>
                    {/each}
                </div>
            {:else}
                <div class="space-y-6" in:fly={{ x: 20, duration: 300 }}>
                    <div class="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary-50 to-slate-50 border-2 border-primary-100">
                        <div class="flex items-center gap-3">
                            <div class="size-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600">
                                {#if selectedRootCategory}
                                    <selectedRootCategory.icon size={20} />
                                {:else}
                                    <Users size={20} />
                                {/if}
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="font-black text-slate-900">{i18n.t(selectedRootCategory.slug as any) || selectedRootCategory.name}</span>
                                    {#if selectedSubCategory}
                                        <ChevronRight size={14} class="text-slate-300" />
                                        <Badge variant="outline" class={cn("font-bold text-[10px]", getCategoryBadgeClass(selectedSubCategory.slug))}>
                                            {i18n.t(selectedSubCategory.slug as any) || selectedSubCategory.name}
                                        </Badge>
                                    {/if}
                                </div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" class="size-8" onclick={clearCategorySelection}>
                            <X size={16} />
                        </Button>
                    </div>

                    {#if subCategories.length > 0}
                        <div class="space-y-2" transition:slide>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sub-Category</p>
                            <div class="flex flex-wrap gap-2">
                                {#each subCategories as subCat}
                                    <button
                                        class={cn(
                                            "px-4 py-2 rounded-xl border-2 text-xs font-black uppercase tracking-wider transition-all",
                                            selectedSubCategoryId === subCat.id
                                                ? activeColorMap[subCat.color] || "border-primary-500 bg-primary-500 text-white"
                                                : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                        )}
                                        onclick={() => selectSubCategory(subCat.id)}
                                    >
                                        {i18n.t(subCat.slug as any) || subCat.name}
                                    </button>
                                {/each}
                            </div>
                        </div>
                    {/if}

                    <form
                        method="POST"
                        action="/people?/create"
                        class="space-y-5"
                        enctype="multipart/form-data"
                        use:enhance={() => {
                            return async ({ result, update }) => {
                                if (result.type === 'success') {
                                    open = false;
                                    toast.success('Registration successful');
                                    await update();
                                } else if (result.type === 'failure') {
                                    const msg = (result.data as any)?.message || 'Registration failed';
                                    toast.error(msg);
                                } else {
                                    toast.error('An unexpected error occurred');
                                }
                            };
                        }}
                    >
                        <input type="hidden" name="categoryId" value={finalCategoryId} />
                        <input type="hidden" name="isTrained" value={isTrained ? 'true' : 'false'} />
                        <input type="hidden" name="autoCheckIn" value={autoCheckIn ? 'true' : 'false'} />
                        <input type="hidden" name="purpose" value={purpose} />

                        <div class="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 group hover:border-primary-300 hover:bg-primary-50/30 transition-all">
                            <div class="relative group/photo">
                                <div class="size-24 rounded-2xl bg-white shadow-md border-2 border-slate-100 overflow-hidden flex items-center justify-center text-slate-300 group-hover/photo:border-primary-200 transition-all">
                                    {#if photoPreview}
                                        <img src={photoPreview} alt="Preview" class="w-full h-full object-cover" />
                                    {:else}
                                        <Camera size={32} />
                                    {/if}
                                </div>
                                <label
                                    for="photo-upload"
                                    class="absolute -bottom-2 -right-2 size-8 rounded-xl bg-primary-600 text-white flex items-center justify-center shadow-lg cursor-pointer hover:bg-primary-700 hover:scale-110 active:scale-95 transition-all"
                                >
                                    <Upload size={16} />
                                    <input id="photo-upload" name="photo" type="file" accept="image/*" class="hidden" onchange={handlePhotoChange} />
                                </label>
                            </div>
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4 group-hover:text-primary-600 transition-colors">
                                {photoPreview ? 'Change Photo' : 'Upload Photo'}
                            </p>
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <Label for="reg-name" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('name')} *</Label>
                                <Input id="reg-name" name="name" required class="h-11 border-2" placeholder="Full name" />
                            </div>
                            <div class="space-y-2">
                                <Label for="reg-codeNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('codeNo')}</Label>
                                <Input id="reg-codeNo" name="codeNo" class="h-11 border-2" placeholder="ID / Badge number" />
                            </div>
                            <div class="space-y-2">
                                <Label for="reg-company" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('company')}</Label>
                                <Input id="reg-company" name="company" class="h-11 border-2" placeholder="Company name" />
                            </div>
                            <div class="space-y-2">
                                <Label for="reg-contactNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('phone')}</Label>
                                <Input id="reg-contactNo" name="contactNo" class="h-11 border-2" placeholder="Phone number" />
                            </div>
                            <div class="space-y-2">
                                <Label for="reg-cardNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('cardNo')}</Label>
                                <Input id="reg-cardNo" name="cardNo" class="h-11 border-2" placeholder="Access card number" />
                            </div>
                            <div class="space-y-2">
                                <Label for="reg-designation" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('designation')}</Label>
                                <Input id="reg-designation" name="designation" class="h-11 border-2" placeholder="Job title" />
                            </div>
                        </div>

                        <div class="space-y-2">
                            <Label for="reg-notes" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">{i18n.t('notes')}</Label>
                            <Input id="reg-notes" name="notes" class="h-11 border-2" placeholder="Additional notes" />
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <button type="button" class={cn("flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left", isTrained ? "border-emerald-200 bg-emerald-50" : "border-slate-100 hover:border-slate-200")} onclick={() => isTrained = !isTrained}>
                                <Checkbox checked={isTrained} />
                                <div>
                                    <p class="font-bold text-sm text-slate-900">{i18n.t('isTrained')}</p>
                                    <p class="text-[10px] font-medium text-slate-500">Safety training completed</p>
                                </div>
                            </button>
                            <button type="button" class={cn("flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left", autoCheckIn ? "border-primary-200 bg-primary-50" : "border-slate-100 hover:border-slate-200")} onclick={() => autoCheckIn = !autoCheckIn}>
                                <Checkbox checked={autoCheckIn} />
                                <div>
                                    <p class="font-bold text-sm text-slate-900">{i18n.t('checkInImmediately')}</p>
                                    <p class="text-[10px] font-medium text-slate-500">Check in after registration</p>
                                </div>
                            </button>
                        </div>

                        {#if autoCheckIn && needsPurpose}
                            <div class="space-y-2" transition:slide>
                                <Label for="reg-purpose" class="font-black text-[10px] uppercase tracking-widest text-primary-700">{i18n.t('purpose')}</Label>
                                <Input
                                    id="reg-purpose"
                                    bind:value={purpose}
                                    placeholder="Reason for visit (Optional)"
                                    class="h-11 border-2 bg-white"
                                />
                            </div>
                        {/if}

                        <Button type="submit" disabled={!canSubmit} class="w-full h-14 text-sm font-black gap-2 shadow-lg uppercase tracking-widest">
                            <Save size={20} />
                            {i18n.t('save')}
                        </Button>
                    </form>
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>