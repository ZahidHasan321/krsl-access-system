<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import Button from './ui/Button.svelte';

    function toggleLang() {
        i18n.setLang(i18n.lang === 'en' ? 'bn' : 'en');
    }
</script>

<Button 
    variant="outline" 
    onclick={toggleLang} 
    className="px-3 py-1.5 text-sm h-9 min-w-[80px]"
>
    {i18n.lang === 'en' ? 'বাংলা' : 'English'}
</Button>
