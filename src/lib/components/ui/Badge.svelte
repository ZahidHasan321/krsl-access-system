<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        children: any;
        status?: 'on_premises' | 'checked_out' | 'default' | 'success' | 'danger';
        className?: ClassValue;
    }

    let { 
        children, 
        status = 'default',
        className = ''
    }: Props = $props();

    const statuses = {
        on_premises: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        checked_out: 'bg-gray-50 text-gray-700 border-gray-200',
        default: 'bg-primary-50 text-primary-700 border-primary-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        danger: 'bg-red-50 text-red-700 border-red-200'
    };

    const baseClasses = 'px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap';
</script>

<span class={twMerge(baseClasses, statuses[status] || statuses.default, className as string)}>
    {@render children()}
</span>
