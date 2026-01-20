<script lang="ts">
    import { clsx, type ClassValue } from 'clsx';
    import { twMerge } from 'tailwind-merge';
    import { ChevronDown } from 'lucide-svelte';

    interface Option {
        value: string | number;
        text: string;
    }

    interface Props {
        label?: string;
        value?: string | number;
        options: Option[];
        placeholder?: string;
        id?: string;
        name?: string;
        required?: boolean;
        className?: ClassValue;
        containerClass?: ClassValue;
    }

    let {
        label,
        value = $bindable(),
        options = [],
        placeholder = '',
        id = Math.random().toString(36).substring(7),
        name,
        required = false,
        className = '',
        containerClass = '',
    }: Props = $props();

    let searchQuery = $state('');
    let isOpen = $state(false);
    let inputElement: HTMLInputElement;
    let containerElement: HTMLDivElement;
    let dropdownStyle = $state('');

    const filteredOptions = $derived(
        searchQuery
            ? options.filter(opt => opt.text.toLowerCase().includes(searchQuery.toLowerCase()))
            : options
    );

    const selectedOption = $derived(options.find(opt => opt.value === value));

    $effect(() => {
        if (selectedOption && !isOpen) {
            searchQuery = selectedOption.text;
        }
    });

    function updateDropdownPosition() {
        if (containerElement) {
            const rect = containerElement.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const dropdownHeight = Math.min(240, filteredOptions.length * 40 + 8); // max-h-60 = 240px

            // Open upward if not enough space below
            if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
                dropdownStyle = `position: fixed; left: ${rect.left}px; bottom: ${window.innerHeight - rect.top + 4}px; width: ${rect.width}px;`;
            } else {
                dropdownStyle = `position: fixed; left: ${rect.left}px; top: ${rect.bottom + 4}px; width: ${rect.width}px;`;
            }
        }
    }

    function handleSelect(option: Option) {
        value = option.value;
        searchQuery = option.text;
        isOpen = false;
    }

    function handleFocus() {
        isOpen = true;
        searchQuery = '';
        updateDropdownPosition();
    }

    function handleBlur(e: FocusEvent) {
        // Delay closing to allow click events on options
        setTimeout(() => {
            isOpen = false;
            if (selectedOption) {
                searchQuery = selectedOption.text;
            } else {
                searchQuery = '';
            }
        }, 150);
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            isOpen = false;
            inputElement?.blur();
        }
    }

    function handleInput() {
        updateDropdownPosition();
    }

    const inputClasses = 'w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all';
</script>

<svelte:window onscroll={updateDropdownPosition} onresize={updateDropdownPosition} />

<div bind:this={containerElement} class={twMerge('flex flex-col gap-1.5', containerClass as string)}>
    {#if label}
        <label for={id} class="text-sm font-medium text-gray-700">
            {label} {#if required}<span class="text-rose-500">*</span>{/if}
        </label>
    {/if}

    <div class="relative">
        <input
            bind:this={inputElement}
            {id}
            type="text"
            {placeholder}
            bind:value={searchQuery}
            onfocus={handleFocus}
            onblur={handleBlur}
            onkeydown={handleKeydown}
            oninput={handleInput}
            autocomplete="off"
            class={twMerge(inputClasses, className as string)}
        />
        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <ChevronDown size={20} />
        </div>

        <!-- Hidden input for form submission -->
        <input type="hidden" {name} value={value ?? ''} />
    </div>
</div>

{#if isOpen && filteredOptions.length > 0}
    <div
        style={dropdownStyle}
        class="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
    >
        {#each filteredOptions as option}
            <button
                type="button"
                onmousedown={() => handleSelect(option)}
                class="w-full px-4 py-2 text-left hover:bg-indigo-50 transition-colors text-sm {option.value === value ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}"
            >
                {option.text}
            </button>
        {/each}
    </div>
{:else if isOpen && searchQuery && filteredOptions.length === 0}
    <div
        style={dropdownStyle}
        class="z-[9999] bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500 text-sm"
    >
        No results found
    </div>
{/if}
