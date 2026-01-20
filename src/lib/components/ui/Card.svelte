<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        children: any;
        className?: ClassValue;
    }

    let { children, className = '' }: Props = $props();
</script>

<div class={twMerge('bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden', className as string)}>
    {@render children()}
</div>
