<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { cn, getCategoryColorClass } from '$lib/utils';
    import { Layers, CornerDownRight, ChevronRight } from 'lucide-svelte';
    import { getCategoryById } from '$lib/constants/categories';
    import { slide } from 'svelte/transition';
    import { clsx } from 'clsx';
    import DashboardCategoryRow from './DashboardCategoryRow.svelte';

    let { category, level = 0 } = $props<{
        category: any;
        level?: number;
    }>();

    let isExpanded = $state(false);
    
    const catInfo = $derived(getCategoryById(category.id));
    const Icon = $derived(catInfo?.icon || Layers);
    const hasChildren = $derived(category.children && category.children.length > 0);

    function toggle() {
        if (hasChildren) {
            isExpanded = !isExpanded;
        }
    }
</script>

<div class={clsx('relative', level > 0 && 'ml-6 border-l-2 border-slate-200 pl-4')}>
    <button
        type="button"
        class={clsx(
            'flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all text-left',
            hasChildren ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default',
            level === 0
                ? 'mb-3 border-slate-200 bg-white shadow-sm ring-1 ring-slate-200/50'
                : 'mb-1 border-transparent'
        )}
        onclick={toggle}
    >
        <!-- Left: Icon & Name -->
        <div class="flex items-center gap-3">
            {#if level === 0}
                <div
                    class={cn(
                        'flex size-10 items-center justify-center rounded-lg border-2 shadow-sm transition-transform',
                        getCategoryColorClass(category.color)
                    )}
                >
                    <Icon size={20} strokeWidth={2.5} />
                </div>
            {:else}
                <div class="relative">
                    <CornerDownRight
                        size={14}
                        class="absolute top-1/2 -left-6 -translate-y-1/2 text-slate-400"
                    />
                    <div
                        class={cn(
                            'flex size-8 items-center justify-center rounded-lg border shadow-sm',
                            getCategoryColorClass(category.color)
                        )}
                    >
                        <Icon size={16} strokeWidth={2} />
                    </div>
                </div>
            {/if}

            <div>
                <div class="flex items-center gap-2">
                    <span
                        class={clsx(
                            'text-slate-900',
                            level === 0 ? 'text-base font-bold uppercase' : 'text-sm font-bold',
                            level === 0 && i18n.lang !== 'bn' && 'tracking-tighter'
                        )}>{i18n.t(category.slug as any) || category.name}</span
                    >
                    {#if hasChildren}
                        <ChevronRight 
                            size={14} 
                            class={cn("text-slate-400 transition-transform duration-200", isExpanded && "rotate-90")} 
                        />
                    {/if}
                </div>
                {#if level === 0 && category.children.length > 0}
                    <div class="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        {category.children.length} Sub-categories
                    </div>
                {/if}
            </div>
        </div>

        <!-- Right: Counts -->
        <div class="flex items-center gap-3">
            {#if category.count > 0}
                <div
                    class={cn(
                        'flex h-8 min-w-8 items-center justify-center rounded-lg border-2 px-2 text-sm font-bold tracking-tighter shadow-sm',
                        getCategoryColorClass(category.color)
                    )}
                >
                    {category.count}
                </div>
            {/if}
        </div>
    </button>

    <!-- Render Children -->
    {#if hasChildren && isExpanded}
        <div class="mt-1" transition:slide={{ duration: 200 }}>
            {#each category.children as child}
                <DashboardCategoryRow category={child} level={level + 1} />
            {/each}
        </div>
    {/if}
</div>