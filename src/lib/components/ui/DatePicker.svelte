<script lang="ts">
    import Flatpickr from 'svelte-flatpickr';
    import 'flatpickr/dist/flatpickr.css';
    import { twMerge } from 'tailwind-merge';
    import { X } from 'lucide-svelte';
    import { onMount } from 'svelte';

    interface Props {
        value?: string; // YYYY-MM-DD
        label?: string;
        id?: string;
        className?: string;
        name?: string;
        placeholder?: string;
        onchange?: (value: string) => void;
    }

    let { 
        value = $bindable(), 
        label, 
        id = Math.random().toString(36).substring(7), 
        className = '', 
        name,
        placeholder = 'Select date',
        onchange 
    }: Props = $props();

    let mounted = $state(false);
    onMount(() => { mounted = true; });

    const options = {
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'F j, Y',
        disableMobile: true,
        allowInput: true,
    };

    function handleChange(event: CustomEvent<[Date[], string, any]>) {
        const [selectedDates, dateStr] = event.detail;
        value = dateStr;
        onchange?.(dateStr);
    }

    function clearDate() {
        value = '';
        onchange?.('');
    }
</script>

<div class="w-full">
    {#if label}
        <label for={id} class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {/if}
    
    <div class="relative group">
        {#if mounted}
            <Flatpickr
                {options}
                bind:value
                {id}
                {name}
                class={twMerge(
                    "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white transition-all",
                    className
                )}
                on:change={handleChange}
                {placeholder}
            >{""}</Flatpickr>
        {:else}
            <div class={twMerge(
                "w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 h-10",
                className
            )}></div>
        {/if}
        {#if value}
            <button 
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 bg-white p-0.5 rounded-full"
                onclick={clearDate}
                aria-label="Clear date"
            >
                <X size={16} />
            </button>
        {/if}
    </div>
</div>
