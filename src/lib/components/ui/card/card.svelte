<script lang="ts">
	import type { HTMLAttributes } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils";

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		"bg-card/80 backdrop-blur-md text-card-foreground flex flex-col gap-6 rounded-2xl border border-slate-200/50 py-0 shadow-[0_8px_32px_rgba(15,23,42,0.04)] hover:shadow-[0_20px_40px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 hover:border-primary/40",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
