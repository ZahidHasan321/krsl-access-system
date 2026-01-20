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
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
        danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
        outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100',
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
