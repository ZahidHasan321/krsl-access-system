<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    type Status = 'on_premises' | 'checked_out' | 'default' | 'success' | 'danger';
    type Variant = 'outline' | 'secondary';

    interface Props {
        children: any;
        status?: Status;
        variant?: Variant;
        class?: ClassValue;
        className?: ClassValue;
    }

    let {
        children,
        status = 'default',
        variant,
        class: cls = '',
        className = ''
    }: Props = $props();

    const statuses: Record<Status, string> = {
        on_premises: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        checked_out: 'bg-gray-50 text-gray-700 border-gray-200',
        default: 'bg-primary-50 text-primary-700 border-primary-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        danger: 'bg-red-50 text-red-700 border-red-200'
    };

    const variants: Record<Variant, string> = {
        outline: 'bg-transparent text-gray-700 border-gray-300',
        secondary: 'bg-gray-100 text-gray-700 border-gray-200'
    };

    const baseClasses = 'px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap inline-flex items-center';

    const colorClass = $derived(variant ? variants[variant] : (statuses[status] || statuses.default));
</script>

<span class={twMerge(baseClasses, colorClass, cls as string, className as string)}>
    {@render children()}
</span>
