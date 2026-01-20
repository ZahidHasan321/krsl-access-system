<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';

    interface Option {
        value: string | number;
        label: string;
    }

    interface Props {
        label?: string;
        value?: string | number;
        options: Option[];
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
        options = [],
        id = Math.random().toString(36).substring(7),
        name,
        required = false,
        className = '',
        containerClass = '',
        ...rest
    }: Props = $props();

    const selectClasses = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white';
</script>

<div class={twMerge('flex flex-col gap-1.5', containerClass as string)}>
    {#if label}
        <label for={id} class="text-sm font-medium text-gray-700">
            {label} {#if required}<span class="text-rose-500">*</span>{/if}
        </label>
    {/if}
    <select
        {id}
        {name}
        {required}
        bind:value={value}
        class={twMerge(selectClasses, className as string)}
        {...rest}
    >
        {#each options as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
</div>
