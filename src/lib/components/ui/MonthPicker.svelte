<script lang="ts">
    import { twMerge } from 'tailwind-merge';

    interface Props {
        value?: string; // YYYY-MM
        label?: string;
        id?: string;
        className?: string;
        onchange?: (value: string) => void;
    }

    let { value = $bindable(), label, id = Math.random().toString(36).substring(7), className = '', onchange }: Props = $props();

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Parse current value or default to now
    let selectedYear = $state(value ? parseInt(value.split('-')[0]) : new Date().getFullYear());
    let selectedMonth = $state(value ? parseInt(value.split('-')[1]) : new Date().getMonth() + 1);

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 2050 - 2026 + 1 }, (_, i) => 2026 + i);

    function handleChange() {
        const mm = String(selectedMonth).padStart(2, '0');
        value = `${selectedYear}-${mm}`;
        onchange?.(value);
    }

    const selectClasses = 'px-3 py-2 border border-gray-200 bg-gray-50/50 rounded-lg focus:bg-white focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 outline-none transition-all duration-200 cursor-pointer';
</script>

<div class="w-full">
    {#if label}
        <label for={id} class="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {/if}
    <div class={twMerge("flex gap-2", className)}>
        <select
            {id}
            bind:value={selectedMonth}
            onchange={handleChange}
            class={twMerge(selectClasses, "flex-1")}
        >
            {#each months as name, i}
                <option value={i + 1}>{name}</option>
            {/each}
        </select>
        <select
            bind:value={selectedYear}
            onchange={handleChange}
            class={selectClasses}
        >
            {#each years as y}
                <option value={y}>{y}</option>
            {/each}
        </select>
    </div>
</div>
