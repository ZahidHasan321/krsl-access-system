<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { Button } from './ui/button';
	import { cn } from '$lib/utils';

	let { class: className } = $props<{ class?: string }>();

	function toggleLang(e: Event) {
		e.stopPropagation();
		i18n.setLang(i18n.lang === 'en' ? 'bn' : 'en');
	}
</script>

<button
	onclick={toggleLang}
	class={cn(
		"nav-link-text flex h-9 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 px-4 py-1.5 shadow-sm transition-all hover:border-primary/30 hover:bg-slate-50 active:scale-95 sm:min-w-[95px]",
		className
	)}
>
	<span class={cn("hidden sm:inline", className?.includes('w-full') && "inline sm:inline")}>{i18n.lang === 'en' ? 'বাংলা' : 'English'}</span>
	<span class={cn("sm:hidden", className?.includes('w-full') && "hidden sm:hidden")}>{i18n.lang === 'en' ? 'BN' : 'EN'}</span>
</button>
