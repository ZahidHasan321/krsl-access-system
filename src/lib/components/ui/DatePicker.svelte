<script lang="ts">
  import { Popover } from "bits-ui";
  import { Calendar as CalendarIcon, X } from "lucide-svelte";
  import { CalendarDate, parseDate, getLocalTimeZone, today } from "@internationalized/date";
  import Calendar from "./Calendar.svelte";
  import { cn, toCalendarDate } from "$lib/utils";
  import { i18n } from "$lib/i18n.svelte";

  interface Props {
    value?: string; // YYYY-MM-DD
    label?: string;
    placeholder?: string;
    id?: string;
    name?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
    onchange?: (value: string) => void;
  }

  let { 
    value = $bindable(), 
    label, 
    placeholder = "Select date", 
    id = Math.random().toString(36).substring(7),
    name,
    required = false,
    disabled = false,
    className = "",
    onchange
  }: Props = $props();

  let open = $state(false);
  
  // Internal state for bits-ui
  let dateValue = $derived.by(() => toCalendarDate(value || new Date().toISOString().split('T')[0]));
  let placeholderDate = $state(today(getLocalTimeZone()));

  function handleSelect(v: any) {
    const newValue = v ? v.toString() : "";
    value = newValue;
    onchange?.(newValue);
    open = false;
  }

  function clearDate(e: MouseEvent) {
    e.stopPropagation();
    value = "";
    onchange?.("");
  }
</script>

<div class={cn("flex flex-col gap-1.5", className)}>
  {#if label}
    <label for={id} class="text-sm font-medium text-slate-700">
      {label} {#if required}<span class="text-rose-500">*</span>{/if}
    </label>
  {/if}

  <Popover.Root bind:open>
    <Popover.Trigger
      {id}
      {disabled}
      class={cn(
        "flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white transition-all placeholder:text-slate-500 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        !value && "text-slate-500"
      )}
    >
      <div class="flex items-center gap-2 overflow-hidden">
        <CalendarIcon class="size-4 shrink-0 opacity-50" />
        <span class="truncate">
          {value ? value : placeholder}
        </span>
      </div>
      
      {#if value && !disabled}
        <button 
          type="button" 
          onclick={clearDate}
          class="rounded-sm p-0.5 opacity-50 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
        >
          <X class="size-3.5" />
        </button>
      {/if}
    </Popover.Trigger>
    
    <Popover.Content
      class="z-50 w-auto rounded-xl border border-slate-200 bg-white p-0 shadow-xl outline-none"
      sideOffset={4}
      align="start"
    >
      <Calendar 
        type="single" 
        value={dateValue} 
        onValueChange={handleSelect}
        bind:placeholder={placeholderDate}
      />
    </Popover.Content>
  </Popover.Root>
  
  {#if name}
    <input type="hidden" {name} {value} {required} />
  {/if}
</div>