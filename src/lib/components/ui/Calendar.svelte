<script lang="ts">
  import { Calendar, type CalendarRootProps } from "bits-ui";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";
  import { type DateValue } from "@internationalized/date";
  import { cn } from "$lib/utils";

  let { 
    value = $bindable(), 
    placeholder = $bindable(),
    weekdayFormat = "short",
    fixedWeeks = true,
    ...rest 
  }: any = $props();
</script>

<Calendar.Root
  bind:value={value as any}
  bind:placeholder={placeholder as any}
  {weekdayFormat}
  {fixedWeeks}
  class="p-4"
  {...rest}
>
  {#snippet children({ months, weekdays })}
    <Calendar.Header class="flex items-center justify-between gap-2 pb-4">
      <div class="flex items-center gap-1 flex-1">
        <Calendar.MonthSelect 
          class="h-8 flex-1 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500" 
        />
        <Calendar.YearSelect 
          class="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500" 
        />
      </div>
      <div class="flex items-center gap-1">
        <Calendar.PrevButton
          class="inline-flex size-8 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-slate-100 active:scale-95"
        >
          <ChevronLeft class="size-5 text-slate-600" />
        </Calendar.PrevButton>
        <Calendar.NextButton
          class="inline-flex size-8 items-center justify-center rounded-md bg-transparent transition-colors hover:bg-slate-100 active:scale-95"
        >
          <ChevronRight class="size-5 text-slate-600" />
        </Calendar.NextButton>
      </div>
    </Calendar.Header>
    <div class="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0">
      {#each months as month}
        <Calendar.Grid class="w-full border-collapse select-none space-y-1">
          <Calendar.GridHead>
            <Calendar.GridRow class="flex w-full justify-between">
              {#each weekdays as day}
                <Calendar.HeadCell
                  class="w-8 rounded-md text-[10px] font-bold uppercase text-slate-400"
                >
                  <div>{day.slice(0, 2)}</div>
                </Calendar.HeadCell>
              {/each}
            </Calendar.GridRow>
          </Calendar.GridHead>
          <Calendar.GridBody>
            {#each month.weeks as weekDates}
              <Calendar.GridRow class="flex w-full">
                {#each weekDates as date}
                  <Calendar.Cell
                    {date}
                    month={month.value}
                    class="relative size-8 p-0 text-center text-sm"
                  >
                    <Calendar.Day
                      class={cn(
                        "group inline-flex size-8 items-center justify-center whitespace-nowrap rounded-lg border border-transparent bg-transparent p-0 text-sm font-medium transition-all hover:border-primary-500 hover:text-primary-600 active:scale-95",
                        "data-[selected]:bg-primary-600 data-[selected]:text-white data-[selected]:hover:bg-primary-700 data-[selected]:hover:text-white",
                        "data-[today]:border-primary-200 data-[today]:text-primary-600",
                        "data-[outside-month]:text-slate-300 data-[outside-month]:pointer-events-none",
                        "data-[disabled]:text-slate-300 data-[disabled]:pointer-events-none"
                      )}
                    >
                      {date.day}
                    </Calendar.Day>
                  </Calendar.Cell>
                {/each}
              </Calendar.GridRow>
            {/each}
          </Calendar.GridBody>
        </Calendar.Grid>
      {/each}
    </div>
  {/snippet}
</Calendar.Root>
