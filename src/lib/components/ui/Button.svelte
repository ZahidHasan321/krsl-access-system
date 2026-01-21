<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        children: any;
        type?: 'button' | 'submit' | 'reset';
        variant?: 'primary' | 'danger' | 'outline' | 'ghost';
        className?: ClassValue;
        disabled?: boolean;
        onclick?: (event: MouseEvent) => void;
        [key: string]: any;
    }

    let { 
        children, 
        type = 'button', 
        variant = 'primary', 
        className = '', 
        disabled = false, 
        onclick,
        ...rest 
    }: Props = $props();

    const variants = {
        primary: 'bg-primary-600 text-white shadow-md shadow-primary-600/20 hover:bg-primary-700 hover:shadow-lg hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
        danger: 'bg-rose-600 text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 hover:shadow-lg hover:shadow-rose-600/30 hover:-translate-y-0.5 active:translate-y-0 active:shadow-md',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 active:bg-primary-100',
        ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200'
    };

    const baseClasses = 'px-4 py-3 rounded-lg font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer';
</script>

<button
    {type}
    {disabled}
    {onclick}
    class={twMerge(baseClasses, variants[variant], className as string)}
    {...rest}
>
    {@render children()}
</button>
