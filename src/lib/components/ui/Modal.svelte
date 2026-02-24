<script lang="ts">
	import { fade, scale } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	interface Props {
		children: any;
		title?: string;
		open?: boolean;
		onclose?: () => void;
	}

	let { children, title, open = $bindable(false), onclose }: Props = $props();

	function handleClose() {
		open = false;
		onclose?.();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
		transition:fade={{ duration: 200 }}
	>
		<!-- Backdrop -->
		<button
			class="absolute inset-0 cursor-default bg-gray-900/50 backdrop-blur-sm"
			onclick={handleClose}
			aria-label="Close modal"
		></button>

		<!-- Modal Content -->
		<div
			class="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
		>
			<!-- Header -->
			<div class="flex items-center justify-between border-b bg-gray-50/50 px-6 py-4">
				<h3 class="text-lg font-bold text-gray-900">
					{title || ''}
				</h3>
				<Button variant="ghost" onclick={handleClose} class="h-8 w-8 min-w-0 rounded-full p-1">
					<X size={20} />
				</Button>
			</div>

			<!-- Body -->
			<div class="overflow-y-auto p-6">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
