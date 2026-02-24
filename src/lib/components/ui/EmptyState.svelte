<script lang="ts">
	import { FolderOpen } from 'lucide-svelte';
	import { clsx } from 'clsx';
	import { i18n } from '$lib/i18n.svelte';

	interface Props {
		title?: string;
		description?: string;
		icon?: any;
		class?: string;
	}

	let {
		title = i18n.t('noResults'),
		description,
		icon: Icon = FolderOpen,
		class: className = ''
	}: Props = $props();
</script>

<div class={clsx('flex flex-col items-center justify-center py-12 text-center', className)}>
	<div class="mb-4 rounded-full bg-gray-50 p-4">
		<Icon size={48} class="text-gray-400" />
	</div>
	<h3 class="mb-1 text-lg font-semibold text-gray-900">
		{title}
	</h3>
	{#if description}
		<p class="mx-auto max-w-sm text-sm text-gray-500">
			{description}
		</p>
	{/if}
</div>
