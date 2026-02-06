<script lang="ts">
    import { tweened } from 'svelte/motion';
    import { cubicOut } from 'svelte/easing';

    let { value = 0, duration = 600 } = $props();

    const displayValue = tweened(0, {
        duration: Number(duration),
        easing: cubicOut
    });

    $effect(() => {
        displayValue.set(Number(value) || 0);
    });
</script>

<span>{Math.floor($displayValue)}</span>
