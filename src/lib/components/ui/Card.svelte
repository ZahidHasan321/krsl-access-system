<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        children: any;
        class?: ClassValue;
        className?: ClassValue;
    }

    let { children, class: cls = '', className = '' }: Props = $props();
</script>

<div class={twMerge('bg-white rounded-xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-md transition-all duration-300', cls as string, className as string)}>
    {@render children()}
</div>
