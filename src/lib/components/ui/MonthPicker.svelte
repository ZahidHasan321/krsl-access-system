<script lang="ts">
  import { Popover, Calendar } from "bits-ui";
  import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-svelte";
  import { CalendarDate, today, getLocalTimeZone } from "@internationalized/date";
  import { cn } from "$lib/utils";
  import { format } from "date-fns";

  interface Props {
    value?: string; // YYYY-MM
    label?: string;
    placeholder?: string;
    id?: string;
    disabled?: boolean;
    className?: string;
    onchange?: (value: string) => void;
  }

  let { 
    value = $bindable(), 
    label, 
    placeholder = "Select month", 
    id = Math.random().toString(36).substring(7),
    disabled = false,
    className = "",
    onchange
  }: Props = $props();

  let open = $state(false);
  
  // Parse current value or use today
  let displayYear = $state(value ? parseInt(value.split('-')[0]) : today(getLocalTimeZone()).year);
  let selectedMonth = $derived(value ? parseInt(value.split('-')[1]) : null);

  const months = [
    { value: 1, label: "Jan" }, { value: 2, label: "Feb" }, { value: 3, label: "Mar" },
    { value: 4, label: "Apr" }, { value: 5, label: "May" }, { value: 6, label: "Jun" },
    { value: 7, label: "Jul" }, { value: 8, label: "Aug" }, { value: 9, label: "Sep" },
    { value: 10, label: "Oct" }, { value: 11, label: "Nov" }, { value: 12, label: "Dec" }
  ];

  function selectMonth(month: number) {
    const monthStr = month.toString().padStart(2, '0');
    value = `${displayYear}-${monthStr}`;
    onchange?.(value);
    open = false;
  }

  function changeYear(delta: number) {
    displayYear += delta;
  }

  let displayLabel = $derived.by(() => {
    if (!value) return placeholder;
    const [y, m] = value.split('-');
    const date = new Date(parseInt(y), parseInt(m) - 1);
    return format(date, 'MMMM yyyy');
  });
</script>

<div class={cn("flex flex-col gap-1.5", className)}>
  {#if label}
    <label for={id} class="text-sm font-medium text-slate-700">
      {label}
    </label>
  {/if}

  <Popover.Root bind:open>
    <Popover.Trigger
      {id}
      {disabled}
      class={cn(
        "flex h-10 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white transition-all placeholder:text-slate-500 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-slate-500"
      )}
    >
      <CalendarIcon class="size-4 shrink-0 opacity-50" />
      <span class="truncate font-medium text-slate-900">
        {displayLabel}
      </span>
    </Popover.Trigger>
    
    <Popover.Content
      class="z-50 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-xl outline-none"
      sideOffset={4}
      align="start"
    >
      <div class="flex items-center justify-between mb-4">
        <button 
          onclick={() => changeYear(-1)}
          class="size-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft class="size-4" />
        </button>
        <span class="text-sm font-bold text-slate-900">{displayYear}</span>
        <button 
          onclick={() => changeYear(1)}
          class="size-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
        >
          <ChevronRight class="size-4" />
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2">
        {#each months as month}
          <button
            onclick={() => selectMonth(month.value)}
            class={cn(
              "h-10 rounded-lg text-sm font-medium transition-all hover:bg-slate-100",
              selectedMonth === month.value && displayYear === parseInt(value?.split('-')[0] || "0")
                ? "bg-primary-600 text-white hover:bg-primary-700"
                : "text-slate-600"
            )}
          >
            {month.label}
          </button>
        {/each}
      </div>
    </Popover.Content>
  </Popover.Root>
</div>