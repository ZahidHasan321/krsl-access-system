<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Button } from './ui/button';

    function toggleLang() {
        i18n.setLang(i18n.lang === 'en' ? 'bn' : 'en');
    }
</script>

<button 
    onclick={toggleLang} 
    class="px-4 py-1.5 h-9 min-w-[95px] nav-link-text border-2 border-slate-200 rounded-full hover:bg-slate-50 hover:border-primary/30 transition-all cursor-pointer shadow-sm active:scale-95 flex items-center justify-center"
>
    {i18n.lang === 'en' ? 'বাংলা' : 'English'}
</button>