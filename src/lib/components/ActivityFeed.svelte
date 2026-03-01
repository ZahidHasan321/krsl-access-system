<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Bell, UserCheck, UserPlus, AlertCircle, Clock, ChevronRight, Truck, Edit, Trash2, Filter } from 'lucide-svelte';
	import { i18n } from '$lib/i18n.svelte';
	import { clsx } from 'clsx';
	import { formatDistanceToNow } from 'date-fns';
	import * as Popover from '$lib/components/ui/popover';
	import { buttonVariants } from '$lib/components/ui/button';
	import { page } from '$app/state';

	let history = $state<any[]>([]);
	let activeFilter = $state<string>('all');
	
	const filteredHistory = $derived(
		activeFilter === 'all' 
			? history 
			: history.filter(n => n.type === activeFilter)
	);

	let unreadCount = $derived(history.filter((n) => !n.isRead).length);
	let isOpen = $state(false);
	let isAdmin = $derived(page.data.user?.permissions?.includes('users.manage'));

	async function fetchHistory() {
		try {
			const res = await fetch('/api/notifications');
			if (res.ok) {
				history = await res.json();
			}
		} catch (err) {
			console.error('Failed to fetch notification history:', err);
		}
	}

	async function markAllAsRead() {
		if (unreadCount === 0) return;
		try {
			await fetch('/api/notifications', { method: 'POST' });
			history = history.map((n) => ({ ...n, isRead: true }));
		} catch (err) {
			console.error(err);
		}
	}

	// Listen for SSE updates to refresh the feed
	function setupRefresh() {
		// This listens to the window event dispatched in +layout.svelte on SSE message
		const handler = () => {
			if (document.visibilityState === 'visible') {
				fetchHistory();
			}
		};
		window.addEventListener('checkin-sse', handler);
		window.addEventListener('checkout-sse', handler);
		window.addEventListener('vehicle-checkin-sse', handler);
		window.addEventListener('vehicle-checkout-sse', handler);
		window.addEventListener('enrollment-sse', handler);
		return () => {
			window.removeEventListener('checkin-sse', handler);
			window.removeEventListener('checkout-sse', handler);
			window.removeEventListener('vehicle-checkin-sse', handler);
			window.removeEventListener('vehicle-checkout-sse', handler);
			window.removeEventListener('enrollment-sse', handler);
		};
	}

	onMount(() => {
		fetchHistory();
		const cleanup = setupRefresh();
		return cleanup;
	});

	function getIcon(type: string) {
		switch (type) {
			case 'checkin':
			case 'checkout':
				return UserCheck;
			case 'vehicle':
				return Truck;
			case 'enrollment':
			case 'registration':
				return UserPlus;
			case 'edit':
				return Edit;
			case 'delete':
				return Trash2;
			default:
				return Bell;
		}
	}

	function getIconClass(type: string) {
		switch (type) {
			case 'checkin':
				return 'bg-emerald-100 text-emerald-600';
			case 'checkout':
				return 'bg-amber-100 text-amber-600';
			case 'vehicle':
				return 'bg-indigo-100 text-indigo-600';
			case 'enrollment':
			case 'registration':
				return 'bg-blue-100 text-blue-600';
			case 'edit':
				return 'bg-cyan-100 text-cyan-600';
			case 'delete':
				return 'bg-rose-100 text-rose-600';
			default:
				return 'bg-slate-100 text-slate-600';
		}
	}
</script>

<Popover.Root bind:open={isOpen} onOpenChange={(open: boolean) => open && markAllAsRead()}>
	<Popover.Trigger class={buttonVariants({ variant: "ghost", size: "icon", className: "relative" })}>
		<Bell class="size-5 text-slate-600" />
		{#if unreadCount > 0}
			<span
				class="absolute top-2 right-2 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-white"
			>
				{unreadCount > 9 ? '9+' : unreadCount}
			</span>
		{/if}
	</Popover.Trigger>
	<Popover.Content
		class="z-50 w-[calc(100vw-2rem)] max-w-[400px] overflow-hidden p-0 shadow-2xl sm:w-96"
		align="end"
		sideOffset={8}
	>
		<div class="flex flex-col border-b bg-slate-50/50">
			<div class="flex items-center justify-between px-4 py-3">
				<h3 class="font-bold text-slate-900">{i18n.t('activityHistory' as any) || 'Activity History'}</h3>
				{#if history.length > 0}
					<span class="text-xs text-slate-500">{history.length} recent</span>
				{/if}
			</div>
			
			<div class="flex gap-1.5 overflow-x-auto px-4 pb-2 no-scrollbar">
				{#each ['all', 'checkin', 'checkout', 'registration', 'edit', 'delete'] as filter}
					<button
						onclick={() => activeFilter = filter}
						class={clsx(
							'rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase transition-all',
							activeFilter === filter 
								? 'bg-primary text-white shadow-sm' 
								: 'bg-white text-slate-500 border border-slate-200 hover:border-primary/30 hover:text-primary'
						)}
					>
						{filter}
					</button>
				{/each}
			</div>
		</div>

		<div class="max-h-[400px] overflow-y-auto">
			{#if filteredHistory.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center text-slate-400">
					<Clock class="mb-2 size-8 opacity-20" />
					<p class="text-sm">No recent activity matching filter</p>
				</div>
			{:else}
				<div class="divide-y divide-slate-50">
					{#each filteredHistory as item}
						<a
							href={item.link || '#'}
							onclick={() => (isOpen = false)}
							class={clsx(
								'group block px-3 py-2.5 transition-colors hover:bg-slate-50',
								!item.isRead && 'bg-blue-50/30'
							)}
						>
							<div class="flex items-center gap-3">
								<div
									class={clsx(
										'flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110',
										getIconClass(item.type)
									)}
								>
									{#if item.type === 'checkin' || item.type === 'checkout'}
										<UserCheck size={16} />
									{:else if item.type === 'vehicle'}
										<Truck size={16} />
									{:else if item.type === 'enrollment' || item.type === 'registration'}
										<UserPlus size={16} />
									{:else if item.type === 'edit'}
										<Edit size={16} />
									{:else if item.type === 'delete'}
										<Trash2 size={16} />
									{:else}
										<Bell size={16} />
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<div class="flex items-baseline justify-between gap-2">
										<p class="truncate text-xs font-black text-slate-900">{item.title}</p>
										<span class="shrink-0 text-[9px] font-bold text-slate-400">
											{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
										</span>
									</div>
									<p class="mt-0.5 truncate text-[11px] font-medium text-slate-500">
										{item.message}
									</p>
								</div>
								{#if item.link}
									<ChevronRight size={12} class="shrink-0 text-slate-300" />
								{/if}
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>

		{#if history.length > 0 && isAdmin}
			<div class="border-t p-2">
				<a
					href="/admin/activity"
					onclick={() => (isOpen = false)}
					class="block w-full rounded-lg py-2 text-center text-xs font-bold text-primary-600 transition-colors hover:bg-primary-50"
				>
					View Detailed History
				</a>
			</div>
		{/if}
	</Popover.Content>
</Popover.Root>
