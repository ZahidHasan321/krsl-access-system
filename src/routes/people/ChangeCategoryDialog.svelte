<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Dialog from '$lib/components/ui/dialog';
    import * as Select from '$lib/components/ui/select';
    import { Button } from '$lib/components/ui/button';
    import { Label } from '$lib/components/ui/label';
    import { Save, AlertCircle } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { CATEGORIES } from '$lib/constants/categories';

    let { open = $bindable(), person } = $props<{ 
        open: boolean, 
        person: { id: string, name: string, category: { id: string, name: string } }
    }>();

    let selectedCategoryId = $state(person.category.id);
    let isLoading = $state(false);

    $effect(() => {
        if (open) {
            selectedCategoryId = person.category.id;
        }
    });

    const selectedCategoryName = $derived(
        CATEGORIES.find((c) => c.id === selectedCategoryId)?.name ?? 'Select Category'
    );

    // Group categories for the select
    const rootCategories = CATEGORIES.filter(c => !c.parentId);
    const subCategories = (parentId: string) => CATEGORIES.filter(c => c.parentId === parentId);
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>{i18n.t('changeCategory' as any)}</Dialog.Title>
            <Dialog.Description>
                Change the category for <span class="font-bold text-slate-900">{person.name}</span>.
            </Dialog.Description>
        </Dialog.Header>

        <form
            method="POST"
            action="/people?/update" 
            use:enhance={() => {
                isLoading = true;
                return async ({ result, update }) => {
                    isLoading = false;
                    if (result.type === 'success') {
                        open = false;
                        await update();
                    }
                };
            }}
            class="space-y-6 pt-4"
        >
            <input type="hidden" name="id" value={person.id} />
            <input type="hidden" name="name" value={person.name} /> <!-- Name is required by update action -->
            <input type="hidden" name="categoryId" value={selectedCategoryId} />

            <div class="space-y-2">
                <Label>{i18n.t('category')}</Label>
                <Select.Root type="single" bind:value={selectedCategoryId}>
                    <Select.Trigger class="h-11 border-2">
                        {selectedCategoryName}
                    </Select.Trigger>
                    <Select.Content class="max-h-[300px] overflow-y-auto">
                        {#each rootCategories as root}
                            <Select.Item value={root.id} class="font-black uppercase text-xs">
                                {i18n.t(root.slug as any) || root.name}
                            </Select.Item>
                            {#each subCategories(root.id) as sub}
                                <Select.Item value={sub.id} class="font-medium pl-6 text-sm">
                                    <span class="text-slate-300 mr-2">↳</span>
                                    {i18n.t(sub.slug as any) || sub.name}
                                </Select.Item>
                            {/each}
                        {/each}
                    </Select.Content>
                </Select.Root>
            </div>

            <div class="flex items-start gap-2 p-3 rounded-lg bg-amber-50 text-amber-800 text-xs font-medium">
                <AlertCircle size={16} class="shrink-0 mt-0.5" />
                <p>Changing the category might affect required fields or training status.</p>
            </div>

            <Dialog.Footer>
                <Button type="button" variant="outline" onclick={() => open = false}>Cancel</Button>
                <Button type="submit" disabled={isLoading} class="gap-2 font-bold">
                    <Save size={16} />
                    {i18n.t('save')}
                </Button>
            </Dialog.Footer>
        </form>
    </Dialog.Content>
</Dialog.Root>
