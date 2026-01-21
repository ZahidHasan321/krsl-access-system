<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        label?: string;
        value?: string | number;
        type?: string;
        placeholder?: string;
        id?: string;
        name?: string;
        required?: boolean;
        className?: ClassValue;
        containerClass?: ClassValue;
        [key: string]: any;
    }

    let { 
        label, 
        value = $bindable(), 
        type = 'text', 
        placeholder = '', 
        id = Math.random().toString(36).substring(7),
        name,
        required = false,
        className = '',
        containerClass = '',
        ...rest
    }: Props = $props();

    const inputClasses = 'w-full px-4 py-2 border border-gray-200 bg-gray-50/50 rounded-lg focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-200 placeholder:text-gray-400';
</script>

<div class={twMerge('flex flex-col gap-1.5', containerClass as string)}>
    {#if label}
        <label for={id} class="text-sm font-medium text-gray-700">
            {label} {#if required}<span class="text-rose-500">*</span>{/if}
        </label>
    {/if}
    <input
        {id}
        {name}
        {type}
        {placeholder}
        {required}
        bind:value={value}
        class={twMerge(inputClasses, className as string)}
        {...rest}
    />
</div>
