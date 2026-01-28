<script lang="ts">
    import Flatpickr from 'svelte-flatpickr';
    import 'flatpickr/dist/flatpickr.css';
    import 'flatpickr/dist/plugins/monthSelect/style.css';
    import monthSelectPlugin from 'flatpickr/dist/plugins/monthSelect';
    import { twMerge } from 'tailwind-merge';

    interface Props {
        value?: string; // YYYY-MM
        label?: string;
        id?: string;
        className?: string;
        onchange?: (value: string) => void;
    }

    let { value = $bindable(), label, id = Math.random().toString(36).substring(7), className = '', onchange }: Props = $props();

    const flatpickrOptions = {
        plugins: [
            monthSelectPlugin({
                shorthand: true,
                dateFormat: 'Y-m',
                altFormat: 'F Y',
                theme: 'light'
            })
        ],
        disableMobile: true,
        dateFormat: 'Y-m',
        altInput: true,
        altFormat: 'F Y'
    };

    function handleChange(event: CustomEvent<[Date[], string, any]>) {
        const [selectedDates, dateStr] = event.detail;
        value = dateStr;
        onchange?.(dateStr);
    }
</script>

<div class="w-full">
    {#if label}
        <label for={id} class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {/if}
    
    <div class="relative">
        <Flatpickr
            {id}
            options={flatpickrOptions}
            bind:value
            class={twMerge(
                "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white transition-all",
                className
            )}
            on:change={handleChange}
            placeholder="Select month"
        >{""}</Flatpickr>
    </div>
</div>
