<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { i18n } from '$lib/i18n.svelte';
	import { clsx } from 'clsx';
	import { format } from 'date-fns';
	import { Monitor, RefreshCw, Fingerprint, Users, Loader2, Clock } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	let syncingDevice = $state<string | null>(null);

	async function syncDevice(deviceSn: string) {
		syncingDevice = deviceSn;
		try {
			const res = await fetch('/api/devices/sync', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ deviceSn })
			});
			const result = await res.json();
			if (res.ok) {
				toast.success(`Queued ${result.commandsQueued} commands for sync`);
				await invalidateAll();
			} else {
				toast.error(result.error || 'Sync failed');
			}
		} catch (e) {
			toast.error('Failed to sync device');
		} finally {
			syncingDevice = null;
		}
	}
</script>

<div class="space-y-8 px-4 pb-20 md:px-0">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-black tracking-tight text-slate-900 capitalize">Devices</h1>
			<p class="mt-1 text-sm font-bold tracking-widest text-slate-500 capitalize">
				{data.devices.length} Registered Devices
			</p>
		</div>
	</div>

	<!-- Template Stats -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
		<Card.Root class="border-2 border-slate-100 bg-white shadow-sm">
			<Card.Content class="p-5">
				<div class="flex items-center gap-4">
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600"
					>
						<Users size={24} />
					</div>
					<div class="min-w-0">
						<p class="text-2xl leading-none font-black text-slate-900">
							{data.templateStats.peopleWithBiometric}
						</p>
						<p class="mt-1.5 text-[10px] font-bold tracking-wider text-slate-500 capitalize">
							People with Biometric ID
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="border-2 border-slate-100 bg-white shadow-sm">
			<Card.Content class="p-5">
				<div class="flex items-center gap-4">
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600"
					>
						<Fingerprint size={24} />
					</div>
					<div class="min-w-0">
						<p class="text-2xl leading-none font-black text-slate-900">
							{data.templateStats.peopleWithTemplates}
						</p>
						<p class="mt-1.5 text-[10px] font-bold tracking-wider text-slate-500 capitalize">
							People with Stored Templates
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
		<Card.Root class="border-2 border-slate-100 bg-white shadow-sm sm:col-span-2 lg:col-span-1">
			<Card.Content class="p-5">
				<div class="flex items-center gap-4">
					<div
						class="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-violet-100 bg-violet-50 text-violet-600"
					>
						<Fingerprint size={24} />
					</div>
					<div class="min-w-0">
						<p class="text-2xl leading-none font-black text-slate-900">
							{data.templateStats.totalTemplates}
						</p>
						<p class="mt-1.5 text-[10px] font-bold tracking-wider text-slate-500 capitalize">
							Total Templates Stored
						</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Device List -->
	<div class="grid grid-cols-1 gap-4">
		{#each data.devices as device (device.id)}
			<Card.Root class="group overflow-hidden border-2 border-slate-100 bg-white">
				<Card.Content class="p-4 sm:p-6">
					<div class="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
						<div class="flex min-w-0 items-start gap-4">
							<div
								class={clsx(
									'flex size-12 shrink-0 items-center justify-center rounded-xl border-2 transition-all sm:size-14 sm:rounded-2xl',
									device.status === 'online'
										? 'border-emerald-200 bg-emerald-50 text-emerald-600'
										: 'border-slate-100 bg-slate-50 text-slate-400'
								)}
							>
								<Monitor size={24} />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2 sm:gap-3">
									<h3 class="truncate text-base leading-tight font-black text-slate-900 sm:text-lg">
										{device.name}
									</h3>
									<Badge
										variant="outline"
										class={clsx(
											'text-[9px] font-bold tracking-wider capitalize',
											device.status === 'online'
												? 'border-emerald-200 bg-emerald-100 text-emerald-700'
												: 'border-slate-200 bg-slate-100 text-slate-500'
										)}
									>
										{device.status}
									</Badge>
								</div>
								<div
									class="mt-1.5 flex flex-col gap-x-4 gap-y-1 text-[11px] font-bold tracking-tight text-slate-500 capitalize sm:flex-row sm:items-center sm:text-xs"
								>
									<span class="truncate">SN: {device.serialNumber}</span>
									{#if device.lastHeartbeat}
										<span class="flex items-center gap-1.5">
											<Clock size={12} class="opacity-50" />
											Last seen: {format(new Date(device.lastHeartbeat), 'PPp')}
										</span>
									{/if}
								</div>
								{#if device.pendingCommands > 0}
									<div class="mt-2">
										<Badge
											variant="outline"
											class="border-amber-200 bg-amber-50 text-[9px] font-bold tracking-wider text-amber-700 capitalize"
										>
											{device.pendingCommands} pending commands
										</Badge>
									</div>
								{/if}
							</div>
						</div>

						<div
							class="flex items-center gap-3 border-t border-slate-50 pt-4 md:border-t-0 md:pt-0"
						>
							<Button
								class="h-11 w-full gap-2 rounded-xl px-6 font-black shadow-sm transition-all sm:h-12 sm:w-auto sm:rounded-2xl"
								disabled={syncingDevice === device.serialNumber}
								onclick={() => syncDevice(device.serialNumber)}
							>
								{#if syncingDevice === device.serialNumber}
									<Loader2 size={18} class="animate-spin" />
									Syncing...
								{:else}
									<RefreshCw size={18} />
									Sync All Users
								{/if}
							</Button>
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="border-2 border-dashed border-slate-200">
				<Card.Content class="p-12 text-center">
					<Monitor size={48} class="mx-auto text-slate-300 mb-4" />
					<p class="text-lg font-bold text-slate-400">No devices registered</p>
					<p class="text-sm text-slate-400 mt-1">Devices will appear here once they connect</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
