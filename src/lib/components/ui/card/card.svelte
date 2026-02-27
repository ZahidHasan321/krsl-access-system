<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils';

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
		'flex flex-col gap-6 rounded-2xl border border-slate-200/50 bg-card py-0 text-card-foreground shadow-sm transition-colors duration-200 hover:border-primary/20',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
