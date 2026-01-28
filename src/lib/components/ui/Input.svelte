<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';
    import { X } from 'lucide-svelte';

    interface Props {
        label?: string;
        value?: string | number;
        type?: string;
        placeholder?: string;
        id?: string;
        name?: string;
        required?: boolean;
        class?: ClassValue;
        className?: ClassValue;
        containerClass?: ClassValue;
        onclear?: () => void;
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
        class: cls = '',
        className = '',
        containerClass = '',
        onclear,
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
    <div class="relative">
        <input
            {id}
            {name}
            {type}
            {placeholder}
            {required}
            bind:value={value}
            class={twMerge(inputClasses, onclear ? 'pr-10' : '', cls as string, className as string)}
            {...rest}
        />
        {#if value && onclear}
            <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-transparent p-1 rounded-full hover:bg-gray-100 transition-colors"
                onclick={onclear}
                aria-label="Clear input"
            >
                <X size={16} />
            </button>
        {/if}
    </div>
</div>
