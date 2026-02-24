<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Table from '$lib/components/ui/table';
	import {
		ChevronLeft,
		Truck,
		User,
		Phone,
		Building2,
		Package,
		Clock,
		LogOut,
		History
	} from 'lucide-svelte';
	import type { PageData } from './$types';
	import { format, parseISO } from 'date-fns';

	let { data }: { data: PageData } = $props();

	function formatDuration(seconds: number) {
		if (!seconds) return '0m';
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${minutes}m`;
		return `${minutes}m`;
	}
</script>

<div class="space-y-8 pb-20">
	<div class="flex items-center justify-between">
		<Button variant="ghost" class="gap-2 font-bold" href="/vehicles">
			<ChevronLeft size={20} />
			{i18n.t('all')}
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
		<!-- Vehicle Info Sidebar -->
		<div class="space-y-6">
			<Card.Root class="overflow-hidden border-2 border-slate-100">
				<div
					class="flex flex-col items-center border-b-2 border-slate-100 bg-slate-50 p-8 text-center"
				>
					<div
						class="mb-6 flex size-24 items-center justify-center rounded-2xl border-2 border-amber-100 bg-white text-amber-500 shadow-lg"
					>
						<Truck size={48} />
					</div>
					<h2
						class="font-mono text-2xl leading-tight font-black tracking-widest text-slate-900 uppercase"
					>
						{data.entry.vehicleNumber}
					</h2>
					<Badge variant="secondary" class="mt-2 text-[10px] font-bold tracking-widest uppercase">
						{data.entry.type === 'transport'
							? i18n.t('transportVehicle')
							: i18n.t('regularVehicle')}
					</Badge>
				</div>
				<Card.Content class="space-y-6 p-6">
					<div class="grid grid-cols-1 gap-4">
						<div class="flex items-center gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"
							>
								<User size={18} />
							</div>
							<div>
								<p
									class="mb-1 text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
								>
									{i18n.t('driverName')}
								</p>
								<p class="font-bold text-slate-900">{data.entry.driverName || 'N/A'}</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"
							>
								<User size={18} />
							</div>
							<div>
								<p
									class="mb-1 text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
								>
									{i18n.t('helperName')}
								</p>
								<p class="font-bold text-slate-900">{data.entry.helperName || 'N/A'}</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"
							>
								<Phone size={18} />
							</div>
							<div>
								<p
									class="mb-1 text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
								>
									{i18n.t('phone')}
								</p>
								<p class="font-bold text-slate-900">{data.entry.mobile || 'N/A'}</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"
							>
								<Building2 size={18} />
							</div>
							<div>
								<p
									class="mb-1 text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
								>
									{i18n.t('vendorName')}
								</p>
								<p class="font-bold text-slate-900">{data.entry.vendorName || 'N/A'}</p>
							</div>
						</div>
						<div class="flex items-center gap-3">
							<div
								class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400"
							>
								<Package size={18} />
							</div>
							<div>
								<p
									class="mb-1 text-[10px] leading-none font-black tracking-widest text-slate-400 uppercase"
								>
									{i18n.t('cargo')}
								</p>
								<p class="font-bold text-slate-900">{data.entry.cargoDescription || 'N/A'}</p>
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			{#if data.entry.note}
				<Card.Root class="border-2 border-slate-100 bg-slate-50 p-4">
					<p class="mb-1 text-[10px] font-black tracking-widest text-slate-400 uppercase">
						{i18n.t('note')}
					</p>
					<p class="text-sm font-bold text-slate-700">{data.entry.note}</p>
				</Card.Root>
			{/if}
		</div>

		<!-- Main Content: History -->
		<div class="space-y-6 lg:col-span-2">
			<Card.Root class="border-2 border-slate-100 p-6">
				<div class="mb-8 flex items-center gap-3">
					<div class="rounded-lg bg-indigo-50 p-2 text-indigo-600">
						<History size={20} />
					</div>
					<h3 class="text-xl font-black tracking-tight text-slate-900 uppercase">Recent Trips</h3>
				</div>

				<div class="overflow-x-auto">
					<Table.Root>
						<Table.Header>
							<Table.Row class="bg-slate-50 hover:bg-transparent">
								<Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
								<Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
								<Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
								<Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.history as log (log.id)}
								<Table.Row>
									<Table.Cell class="font-bold text-slate-700"
										>{format(parseISO(log.date), 'PP')}</Table.Cell
									>
									<Table.Cell class="font-black text-slate-900"
										>{format(log.entryTime, 'hh:mm a')}</Table.Cell
									>
									<Table.Cell class="font-black text-slate-900">
										{log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
									</Table.Cell>
									<Table.Cell class="font-bold text-slate-500">
										{#if log.exitTime}
											{formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
										{:else}
											<Badge class="border-emerald-100 bg-emerald-50 text-emerald-700">Inside</Badge
											>
										{/if}
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={4} class="h-48 text-center text-slate-400 font-bold"
										>{i18n.t('noData')}</Table.Cell
									>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Root>
		</div>
	</div>
</div>
