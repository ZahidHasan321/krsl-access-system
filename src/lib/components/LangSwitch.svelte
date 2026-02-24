<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { Button } from './ui/button';

	function toggleLang() {
		i18n.setLang(i18n.lang === 'en' ? 'bn' : 'en');
	}
</script>

<button
	onclick={toggleLang}
	class="nav-link-text flex h-9 min-w-[95px] cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 px-4 py-1.5 shadow-sm transition-all hover:border-primary/30 hover:bg-slate-50 active:scale-95"
>
	{i18n.lang === 'en' ? 'বাংলা' : 'English'}
</button>
