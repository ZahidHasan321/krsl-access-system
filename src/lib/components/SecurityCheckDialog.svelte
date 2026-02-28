<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import {
		CheckCircle,
		ShieldAlert,
		User,
		Briefcase,
		MapPin,
		Ship,
		Warehouse
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { appToast, cn } from '$lib/utils';
	import { getCategoryById, CATEGORIES } from '$lib/constants/categories';
	import type { CheckInData } from '$lib/server/events';
	import { page } from '$app/state';

	let open = $state(false);
	let data = $state<CheckInData | null>(null);
	let purpose = $state('');
	let location = $state<'ship' | 'yard' | ''>('');
	let isLoading = $state(false);

	// Only users with the 'checkin.view_details' permission see this verification dialog.
	const canViewDetails = $derived(page.data.user?.permissions?.includes('checkin.view_details'));

	let {} = $props();

	// Helper to find root category
	function getRootCategory(catId: string) {
		let cat = getCategoryById(catId);
		if (!cat) return null;
		while (cat.parentId) {
			const parent = getCategoryById(cat.parentId);
			if (!parent) break;
			cat = parent;
		}
		return cat;
	}

	export function handleCheckIn(checkInData: CheckInData) {
		if (!canViewDetails) return;

		// Don't show the verification dialog for manual check-ins
		// as location and purpose are already collected in the CheckInDialog
		if (checkInData.verifyMethod === 'manual') return;

		data = checkInData;
		purpose = '';
		location = '';
		open = true;
	}

	const category = $derived(data ? getCategoryById(data.categoryId) : null);
	const rootCategory = $derived(data ? getRootCategory(data.categoryId) : null);
	const isEmployee = $derived(rootCategory?.slug === 'employee');
	const needsPurpose = $derived(!isEmployee);

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!data || !location) return;

		isLoading = true;
		try {
			const res = await fetch('/api/attendance', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					logId: data.logId,
					location,
					purpose: purpose || null
				})
			});

			if (res.ok) {
				appToast.success('Check-in details updated');
				open = false;
				data = null;
			} else {
				const error = await res.json();
				appToast.error(error.message || 'Failed to update check-in details');
			}
		} catch (err) {
			console.error(err);
			appToast.error('An unexpected error occurred');
		} finally {
			isLoading = false;
		}
	}

	function handleClose() {
		open = false;
		data = null;
	}
</script>

<Dialog.Root bind:open onOpenChange={(v) => { if (!v) return; }}>
	<Dialog.Content 
		class="gap-0 overflow-hidden p-0 sm:max-w-[500px]"
		onInteractOutside={(e) => e.preventDefault()}
		onEscapeKeydown={(e) => e.preventDefault()}
	>
		{#if data}
			<div class={cn('h-2 w-full', isEmployee ? 'bg-emerald-500' : 'bg-blue-500')}></div>

			<div class="p-6 pb-0">
				<div class="flex items-start gap-5">
					<!-- Photo -->
					<div
						class="flex size-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-300 shadow-sm"
					>
						{#if data.thumbUrl || data.photoUrl}
							<img src={data.thumbUrl || data.photoUrl} alt={data.personName} class="size-full object-cover" />
						{:else}
							<User size={40} />
						{/if}
					</div>

					<div class="min-w-0 flex-1 space-y-1.5">
						<div class="flex items-center justify-between">
							<Badge
								variant="outline"
								class={cn(
									'text-[10px] font-black tracking-wider uppercase',
									isEmployee
										? 'border-emerald-200 bg-emerald-50 text-emerald-600'
										: 'border-blue-200 bg-blue-50 text-blue-600'
								)}
							>
								{isEmployee ? 'Employee' : 'Visitor'}
							</Badge>
							<span class="text-[10px] font-bold text-slate-400"
								>{new Date().toLocaleTimeString()}</span
							>
						</div>

						<h3 class="text-xl leading-tight font-black text-slate-900">{data.personName}</h3>

						{#if category}
							<div class="flex items-center gap-2 text-sm font-medium text-slate-600">
								<Briefcase size={14} />
								<span>{category.name}</span>
							</div>
						{/if}

						<div class="flex items-center gap-2 text-xs font-bold text-slate-400">
							<MapPin size={12} />
							<span>Checked In via {data.verifyMethod || 'Manual'}</span>
						</div>
					</div>
				</div>

				{#if data.isTrained === false}
					<div
						class="mt-6 flex animate-pulse items-start gap-3 rounded-xl border-2 border-rose-100 bg-rose-50 p-4"
					>
						<ShieldAlert size={20} class="mt-0.5 shrink-0 text-rose-600" />
						<div>
							<p class="text-xs font-black tracking-wider text-rose-700 uppercase">
								Safety Warning
							</p>
							<p class="text-[11px] leading-normal font-bold text-rose-600">
								This person has NOT completed mandatory safety training. Unauthorized access to
								production zones is strictly prohibited.
							</p>
						</div>
					</div>
				{/if}
			</div>

			<form onsubmit={handleSubmit} class="space-y-6 p-6">
				<div class="space-y-3">
					<Label class="text-xs font-black tracking-widest text-slate-500 uppercase">
						Assignment Location <span class="text-rose-500">*</span>
					</Label>
					<div class="grid grid-cols-2 gap-3">
						<button
							type="button"
							class={cn(
								'flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-[10px] font-black tracking-widest uppercase transition-all',
								location === 'yard'
									? 'scale-[1.02] border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/20'
									: 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
							)}
							onclick={() => (location = 'yard')}
						>
							<Warehouse size={24} strokeWidth={location === 'yard' ? 3 : 2} />
							Yard
						</button>
						<button
							type="button"
							class={cn(
								'flex h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-[10px] font-black tracking-widest uppercase transition-all',
								location === 'ship'
									? 'scale-[1.02] border-primary-500 bg-primary-500 text-white shadow-lg shadow-primary-500/20'
									: 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
							)}
							onclick={() => (location = 'ship')}
						>
							<Ship size={24} strokeWidth={location === 'ship' ? 3 : 2} />
							Ship
						</button>
					</div>
				</div>

				{#if needsPurpose}
					<div class="space-y-3">
						<Label
							for="purpose"
							class="text-xs font-black tracking-widest text-slate-500 uppercase"
						>
							Purpose of Visit (Optional)
						</Label>
						<Input
							id="purpose"
							name="purpose"
							bind:value={purpose}
							placeholder="e.g. Delivery, Meeting with HR..."
							class="h-12 border-2 bg-slate-50 transition-colors focus:bg-white"
							autofocus
						/>
					</div>
				{:else}
					<div
						class="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700"
					>
						<CheckCircle size={20} />
						<span class="text-sm font-bold">Employee verified.</span>
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-3">
					<Button type="button" variant="outline" class="h-12 font-bold" onclick={handleClose}>
						Close
					</Button>
					<Button
						type="submit"
						disabled={isLoading || !location}
						class="h-12 font-black tracking-widest uppercase"
					>
						{isLoading ? 'Saving...' : 'Confirm'}
					</Button>
				</div>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
