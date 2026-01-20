<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        children: any;
        status?: 'on_premises' | 'checked_out' | 'default';
        className?: ClassValue;
    }

    let { 
        children, 
        status = 'default',
        className = ''
    }: Props = $props();

    const statuses = {
        on_premises: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        checked_out: 'bg-gray-100 text-gray-800 border-gray-200',
        default: 'bg-blue-100 text-blue-800 border-blue-200',
        success: 'bg-green-100 text-green-800 border-green-200',
        danger: 'bg-red-100 text-red-800 border-red-200'
    };

    const baseClasses = 'px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap';
</script>

<span class={twMerge(baseClasses, statuses[status] || statuses.default, className as string)}>
    {@render children()}
</span>
