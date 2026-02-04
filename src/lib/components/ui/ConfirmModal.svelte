<script lang="ts">
    import { fade, scale } from 'svelte/transition';
    import { AlertTriangle } from 'lucide-svelte';
    import { Button } from '$lib/components/ui/button';

    interface Props {
        open?: boolean;
        title?: string;
        message?: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'warning' | 'default';
        onconfirm?: () => void;
        oncancel?: () => void;
    }

    let {
        open = $bindable(false),
        title = 'Confirm',
        message = 'Are you sure?',
        confirmText = 'Confirm',
        cancelText = 'Cancel',
        variant = 'default',
        onconfirm,
        oncancel
    }: Props = $props();

    function handleConfirm() {
        open = false;
        onconfirm?.();
    }

    function handleCancel() {
        open = false;
        oncancel?.();
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && open) {
            handleCancel();
        }
    }

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-amber-600 hover:bg-amber-700',
        default: 'bg-primary-600 hover:bg-primary-700'
    };

    const iconColors = {
        danger: 'text-red-600',
        warning: 'text-amber-600',
        default: 'text-primary-600'
    };
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
        transition:fade={{ duration: 150 }}
    >
        <button
            class="absolute inset-0 bg-gray-900/50 backdrop-blur-sm cursor-default"
            onclick={handleCancel}
            aria-label="Close modal"
        ></button>

        <div
            class="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            transition:scale={{ duration: 150, start: 0.95 }}
        >
            <div class="p-6 text-center">
                <div class="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <AlertTriangle class={iconColors[variant]} size={24} />
                </div>
                <h3 class="text-lg font-bold text-gray-900 mb-2">
                    {title}
                </h3>
                <p class="text-sm text-gray-600">
                    {message}
                </p>
            </div>

            <div class="flex gap-3 p-4 bg-gray-50 border-t">
                <Button variant="outline" onclick={handleCancel} class="flex-1">
                    {cancelText}
                </Button>
                <Button onclick={handleConfirm} class="flex-1 {variantStyles[variant]}">
                    {confirmText}
                </Button>
            </div>
        </div>
    </div>
{/if}