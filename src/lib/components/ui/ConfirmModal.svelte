<script lang="ts">
	import { AlertTriangle } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';

	interface Props {
		open?: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		variant?: 'danger' | 'warning' | 'default';
		onconfirm?: () => void;
		oncancel?: () => void;
	}

	let {
		open = $bindable(false),
		title = 'Confirm',
		message = 'Are you sure?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		variant = 'default',
		onconfirm,
		oncancel
	}: Props = $props();

	function handleConfirm() {
		open = false;
		// Small delay to ensure state update propagates before re-submission
		setTimeout(() => {
			onconfirm?.();
		}, 100);
	}

	function handleCancel() {
		open = false;
		oncancel?.();
	}

	const variantStyles = {
		danger: 'bg-red-600 hover:bg-red-700',
		warning: 'bg-amber-600 hover:bg-amber-700',
		default: 'bg-primary-600 hover:bg-primary-700'
	};

	const iconColors = {
		danger: 'text-red-600',
		warning: 'text-amber-600',
		default: 'text-primary-600'
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-sm overflow-hidden rounded-2xl p-0" showCloseButton={false}>
		<div class="p-6 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
			>
				<AlertTriangle class={iconColors[variant]} size={24} />
			</div>
			<Dialog.Title class="mb-2 text-lg font-bold text-gray-900">
				{title}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-gray-600">
				{message}
			</Dialog.Description>
		</div>

		<div class="flex gap-3 border-t bg-gray-50 p-4">
			<Button variant="outline" onclick={handleCancel} class="flex-1">
				{cancelText}
			</Button>
			<Button onclick={handleConfirm} class="flex-1 {variantStyles[variant]}">
				{confirmText}
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
