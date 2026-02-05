<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Label } from '$lib/components/ui/label';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import { Plus, Edit2, Trash2, ChevronRight, Layers, FolderTree, Folder, CornerDownRight } from 'lucide-svelte';
    import type { PageData } from './$types';
    import { enhance } from '$app/forms';
    import { clsx } from 'clsx';

    let { data }: { data: PageData } = $props();

    let isDialogOpen = $state(false);
    let editingCategory = $state<any>(null);
    let parentContext = $state<{ name: string; level: number } | null>(null);

    let confirmDeleteOpen = $state(false);
    let categoryToDelete = $state<{id: string, name: string} | null>(null);
    let deleteFormElement = $state<HTMLFormElement | null>(null);

    function triggerDelete(cat: any, form: HTMLFormElement) {
        categoryToDelete = cat;
        deleteFormElement = form;
        confirmDeleteOpen = true;
    }

    // Build tree structure
    const categoryTree = $derived.by(() => {
        const map = new Map();
        const roots: any[] = [];
        
        // Initialize map
        data.categories.forEach(c => {
            map.set(c.id, { ...c, children: [] });
        });

        // Build hierarchy
        data.categories.forEach(c => {
            if (c.parentId && map.has(c.parentId)) {
                map.get(c.parentId).children.push(map.get(c.id));
            } else if (!c.parentId) {
                roots.push(map.get(c.id));
            }
        });

        return roots;
    });

    function openAdd(parentId: string | null = null, parentName: string | null = null, level: number = 0) {
        editingCategory = { parentId, name: '' };
        parentContext = parentName ? { name: parentName, level } : null;
        isDialogOpen = true;
    }

    function openEdit(cat: any) {
        editingCategory = { ...cat };
        parentContext = null;
        isDialogOpen = true;
    }

    function getLevelLabel(level: number) {
        if (level === 0) return 'Main Category';
        if (level === 1) return 'Sub-category';
        return 'Child Category';
    }
</script>

{#snippet categoryItem(category: any, level: number)}
    <div class={clsx(
        "relative group transition-all duration-200",
        level > 0 && "ml-8 pl-4 border-l-2 border-slate-100"
    )}>
        <div class={clsx(
            "flex items-center justify-between p-3 rounded-xl border border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm transition-all",
            level === 0 ? "bg-slate-50 mb-2" : "mb-1"
        )}>
            <div class="flex items-center gap-3">
                {#if level === 0}
                    <div class="p-2 bg-white rounded-lg border border-slate-100 text-slate-500">
                        <FolderTree size={18} />
                    </div>
                {:else}
                    <div class="relative">
                        <CornerDownRight size={14} class="text-slate-300 absolute -left-6 top-1/2 -translate-y-1/2" />
                        <Folder size={16} class="text-slate-400" />
                    </div>
                {/if}
                
                <div>
                    <div class="flex items-center gap-2">
                        <span class={clsx(
                            "text-slate-900 leading-tight",
                            level === 0 ? "font-black text-base" : "font-bold text-sm"
                        )}>{category.name}</span>
                        {#if category.children.length > 0}
                            <Badge variant="secondary" class="font-bold text-[9px] h-5 px-1.5 min-w-[1.25rem] justify-center bg-slate-200 text-slate-600">
                                {category.children.length}
                            </Badge>
                        {/if}
                    </div>
                    {#if level === 0}
                         <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Root Category</div>
                    {/if}
                </div>
            </div>

            <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" class="size-8 rounded-lg hover:bg-primary-50 hover:text-primary-600" onclick={() => openEdit(category)}>
                    <Edit2 size={14} />
                </Button>
                
                {#if level < 2} <!-- Limit nesting to 3 levels (0, 1, 2) for now, or remove condition for infinite -->
                    <Button variant="ghost" size="icon" class="size-8 rounded-lg hover:bg-emerald-50 hover:text-emerald-600" onclick={() => openAdd(category.id, category.name, level + 1)} title="Add child">
                        <Plus size={16} />
                    </Button>
                {/if}

                <form method="POST" action="?/delete" use:enhance>
                    <input type="hidden" name="id" value={category.id} />
                    <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        class="size-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                        onclick={(e) => triggerDelete(category, (e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
                    >
                        <Trash2 size={14} />
                    </Button>
                </form>
            </div>
        </div>

        {#if category.children.length > 0}
            <div class="mt-1 space-y-1">
                {#each category.children as child}
                    {@render categoryItem(child, level + 1)}
                {/each}
            </div>
        {/if}
    </div>
{/snippet}

<div class="space-y-8 pb-20 max-w-5xl mx-auto">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('categoryManagement')}</h1>
            <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">
                Organize people structure
            </p>
        </div>
        <Button class="font-black gap-2 h-11 px-6 shadow-lg" onclick={() => openAdd(null, null, 0)}>
            <Plus size={20} />
            Add Main Category
        </Button>
    </div>

    <div class="space-y-6">
        {#each categoryTree as root}
            <Card.Root class="overflow-hidden border-2 border-slate-100/50 shadow-sm bg-white/50 backdrop-blur-sm">
                <Card.Content class="p-6">
                    {@render categoryItem(root, 0)}
                </Card.Content>
            </Card.Root>
        {:else}
            <div class="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl">
                <Layers size={48} class="mx-auto text-slate-300 mb-4" />
                <h3 class="text-lg font-bold text-slate-900">No categories yet</h3>
                <p class="text-slate-500">Create your first category to get started</p>
            </div>
        {/each}
    </div>
</div>

<ConfirmModal
    bind:open={confirmDeleteOpen}
    title="Delete Category"
    message="Are you sure you want to delete category '{categoryToDelete?.name}'? All sub-categories and linked people data might be affected. This action cannot be undone."
    confirmText="Delete"
    variant="danger"
    onconfirm={() => deleteFormElement?.requestSubmit()}
/>

<Dialog.Root bind:open={isDialogOpen}>
    <Dialog.Content class="sm:max-w-[450px]">
        <Dialog.Header>
            <Dialog.Title class="text-2xl font-black">
                {editingCategory?.id ? 'Edit Category' : parentContext ? `Add ${getLevelLabel(parentContext.level)}` : 'Add Main Category'}
            </Dialog.Title>
            {#if parentContext && !editingCategory?.id}
                <div class="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded-lg border border-slate-100 w-fit">
                    <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Parent:</span>
                    <span class="text-sm font-bold text-slate-700 flex items-center gap-1">
                        <Folder size={12} />
                        {parentContext.name}
                    </span>
                </div>
            {/if}
        </Dialog.Header>
        <form method="POST" action="?/upsert" class="space-y-6 pt-4" use:enhance={() => {
            return async ({ result, update }) => {
                if (result.type === 'success') {
                    isDialogOpen = false;
                    await update();
                }
            };
        }}>
            <input type="hidden" name="id" value={editingCategory?.id || ''} />
            <input type="hidden" name="parentId" value={editingCategory?.parentId || ''} />

            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Category Name</Label>
                <Input name="name" bind:value={editingCategory.name} required class="h-12 border-2 text-lg font-medium" placeholder="e.g. Contractors, Visitors, Staff" />
            </div>

            <div class="flex gap-3 pt-4">
                <Button type="button" variant="ghost" class="flex-1 h-12 font-bold" onclick={() => isDialogOpen = false}>
                    Cancel
                </Button>
                <Button type="submit" class="flex-1 h-12 font-black text-base gap-2">
                    {editingCategory?.id ? 'Save Changes' : 'Create Category'}
                </Button>
            </div>
        </form>
    </Dialog.Content>
</Dialog.Root>
