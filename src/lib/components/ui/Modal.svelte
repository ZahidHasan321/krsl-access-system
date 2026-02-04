<script lang="ts">
    import { fade, scale } from 'svelte/transition';
    import { X } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';

    interface Props {
        children: any;
        title?: string;
        open?: boolean;
        onclose?: () => void;
    }

    let { 
        children, 
        title, 
        open = $bindable(false), 
        onclose 
    }: Props = $props();

    function handleClose() {
        open = false;
        onclose?.();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && open) {
            handleClose();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
    <div 
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        transition:fade={{ duration: 200 }}
    >
        <!-- Backdrop -->
        <button 
            class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm cursor-default" 
            onclick={handleClose}
            aria-label="Close modal"
        ></button>

        <!-- Modal Content -->
        <div 
            class="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            transition:scale={{ duration: 200, start: 0.95 }}
        >
            <!-- Header -->
            <div class="px-6 py-4 border-b flex items-center justify-between bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900">
                    {title || ''}
                </h3>
                <Button variant="ghost" onclick={handleClose} class="p-1 rounded-full h-8 w-8 min-w-0">
                    <X size={20} />
                </Button>
            </div>

            <!-- Body -->
            <div class="p-6 overflow-y-auto">
                {@render children()}
            </div>
        </div>
    </div>
{/if}