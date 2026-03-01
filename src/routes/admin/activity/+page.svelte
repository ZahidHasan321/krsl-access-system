<script lang="ts">
	import { UserCheck, UserPlus, Bell, Clock, ChevronRight, Truck } from 'lucide-svelte';
	import { i18n } from '$lib/i18n.svelte';
	import { format } from 'date-fns';
	import { clsx } from 'clsx';
	import { Card } from '$lib/components/ui/card';
	import Pagination from '$lib/components/ui/Pagination.svelte';

	let { data } = $props();

	function getIcon(type: string) {
		switch (type) {
			case 'checkin':
			case 'checkout':
				return UserCheck;
			case 'vehicle':
				return Truck;
			case 'enrollment':
				return UserPlus;
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
				return 'bg-blue-100 text-blue-600';
			default:
				return 'bg-slate-100 text-slate-600';
		}
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-black tracking-tight text-slate-900">{i18n.t('activityHistory' as any)}</h1>
			<p class="mt-1 text-slate-500">Comprehensive log of all system activities and alerts (Admin Only).</p>
		</div>
	</div>

	<Card class="overflow-hidden border-slate-200/60 shadow-sm">
		{#if data.history.length === 0}
			<div class="flex flex-col items-center justify-center py-24 text-center text-slate-400">
				<Clock class="mb-4 size-12 opacity-20" />
				<p class="text-lg font-medium">No activity recorded yet.</p>
			</div>
		{:else}
			<div class="divide-y divide-slate-100">
				{#each data.history as item}
					<a
						href={item.link || '#'}
						class="flex items-center gap-4 p-4 transition-colors hover:bg-slate-50 sm:p-6"
					>
						<div
							class={clsx(
								'flex size-12 shrink-0 items-center justify-center rounded-xl shadow-sm',
								getIconClass(item.type)
							)}
						>
							{#if item.type === 'checkin' || item.type === 'checkout'}
								<UserCheck size={24} />
							{:else if item.type === 'vehicle'}
								<Truck size={24} />
							{:else if item.type === 'enrollment'}
								<UserPlus size={24} />
							{:else}
								<Bell size={24} />
							{/if}
						</div>

						<div class="min-w-0 flex-1">
							<div class="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
								<h3 class="font-bold text-slate-900">{item.title}</h3>
								<span class="text-xs font-medium text-slate-400">
									{item.createdAt ? format(new Date(item.createdAt), 'PPP p') : ''}
								</span>
							</div>
							<p class="mt-1 text-sm leading-relaxed text-slate-600">
								{item.message}
							</p>
						</div>

						{#if item.link}
							<ChevronRight size={20} class="text-slate-300" />
						{/if}
					</a>
				{/each}
			</div>
			
			<Pagination 
				page={data.pagination.page}
				limit={data.pagination.limit}
				totalPages={data.pagination.totalPages}
				totalCount={data.pagination.total}
			/>
		{/if}
	</Card>
</div>
