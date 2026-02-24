<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { cn, getCategoryBadgeClass, statusBadgeClasses, appToast } from '$lib/utils';
	import {
		Users,
		Search,
		Loader2,
		CheckCircle2,
		Building2,
		IdCard,
		Clock,
		AlertCircle,
		ChevronRight,
		X,
		Ship,
		Warehouse
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { fade, fly, slide } from 'svelte/transition';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';

	let { open = $bindable() } = $props<{
		open: boolean;
	}>();

	let searchQuery = $state('');
	let results = $state<any[]>([]);
	let isSearching = $state(false);
	let selectedPerson = $state<any>(null);
	let selectedCategoryId = $state('');
	let purpose = $state('');
	let location = $state<'ship' | 'yard' | ''>('');
	let debounceTimer: ReturnType<typeof setTimeout>;

	const needsPurpose = $derived(selectedPerson && selectedPerson.rootCategorySlug !== 'employee');

	// Filter subcategories based on selected root category
	const availableSubCategories = $derived(() => {
		if (!selectedCategoryId) return [];
		const isRoot = ROOT_CATEGORIES.some((c) => c.id === selectedCategoryId);
		if (isRoot) {
			return getSubCategories(selectedCategoryId);
		}
		return [];
	});

	const selectedCategory = $derived(getCategoryById(selectedCategoryId));

	async function handleSearch() {
		if (searchQuery.length < 2) {
			results = [];
			isSearching = false;
			return;
		}
		isSearching = true;
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(async () => {
			try {
				let url = `/api/search?q=${encodeURIComponent(searchQuery)}`;
				if (selectedCategoryId) {
					url += `&category=${selectedCategoryId}`;
				}
				const res = await fetch(url);
				if (res.ok) {
					const data = await res.json();
					results = data.filter((r: any) => r.type === 'person');
				}
			} catch (err) {
				console.error(err);
			} finally {
				isSearching = false;
			}
		}, 300);
	}

	function selectPerson(person: any) {
		selectedPerson = person;
	}

	function clearSelection() {
		selectedPerson = null;
		location = '';
	}

	function changeCategory(catId: string) {
		selectedCategoryId = catId;
		// Re-search with new category filter
		if (searchQuery.length >= 2) {
			handleSearch();
		}
	}

	function clearCategory() {
		selectedCategoryId = '';
		if (searchQuery.length >= 2) {
			handleSearch();
		}
	}

	$effect(() => {
		if (open === false) {
			setTimeout(() => {
				searchQuery = '';
				results = [];
				selectedPerson = null;
				selectedCategoryId = '';
				purpose = '';
				location = '';
				isSearching = false;
			}, 300);
		}
	});

	// Re-search when query changes
	$effect(() => {
		if (searchQuery) {
			handleSearch();
		}
	});

	// Helper for category colors
	const colorMap: Record<string, string> = {
		blue: 'border-blue-200 bg-blue-50 text-blue-700',
		orange: 'border-orange-200 bg-orange-50 text-orange-700',
		emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
		sky: 'border-sky-200 bg-sky-50 text-sky-700',
		indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
		cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
		teal: 'border-teal-200 bg-teal-50 text-teal-700',
		green: 'border-green-200 bg-green-50 text-green-700'
	};

	const activeColorMap: Record<string, string> = {
		blue: 'border-blue-500 bg-blue-500 text-white',
		orange: 'border-orange-500 bg-orange-500 text-white',
		amber: 'border-amber-500 bg-amber-500 text-white',
		emerald: 'border-emerald-500 bg-emerald-500 text-white',
		sky: 'border-sky-500 bg-sky-500 text-white',
		indigo: 'border-indigo-500 bg-indigo-500 text-white',
		cyan: 'border-cyan-500 bg-cyan-500 text-white',
		teal: 'border-teal-500 bg-teal-500 text-white',
		green: 'border-green-500 bg-green-500 text-white'
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[90vh] flex-col overflow-hidden p-0 sm:max-w-[550px]">
		<div class="shrink-0 border-b bg-slate-50 p-6">
			<Dialog.Title class="text-xl font-black">{i18n.t('checkIn')}</Dialog.Title>
			<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
				Search and select a person to check in
			</Dialog.Description>
		</div>

		<div class="flex-1 space-y-4 overflow-y-auto p-6">
			{#if !selectedPerson}
				<!-- Search & Category Section -->
				<div class="space-y-4">
					<!-- Search Input -->
					<div class="relative">
						<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400" size={18} />
						<Input
							placeholder={i18n.t('searchPeoplePlaceholder')}
							class="h-12 w-full rounded-2xl border-2 border-slate-300 pl-10 text-base font-bold shadow-sm transition-all focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/30"
							bind:value={searchQuery}
							autofocus
						/>
						{#if searchQuery}
							<button
								class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-600"
								onclick={() => (searchQuery = '')}
							>
								<X size={18} />
							</button>
						{/if}
					</div>

					<!-- Category Selection -->
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<Label class="text-[10px] font-bold tracking-widest text-slate-400 uppercase"
								>Filter by Category</Label
							>
							{#if selectedCategoryId}
								<button
									onclick={clearCategory}
									class="cursor-pointer text-[10px] font-black tracking-wider text-primary-600 uppercase hover:underline"
									in:fade
								>
									Clear Filter
								</button>
							{/if}
						</div>

						<!-- Root Categories -->
						<div class="grid grid-cols-3 gap-2">
							{#each ROOT_CATEGORIES as cat}
								{@const isActive =
									selectedCategoryId === cat.id || selectedCategory?.parentId === cat.id}
								<button
									class={cn(
										'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 transition-all',
										isActive
											? activeColorMap[cat.color] ||
													'scale-[1.02] border-primary-500 bg-primary-500 text-white shadow-md'
											: 'border-slate-100 bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-50'
									)}
									onclick={() => changeCategory(cat.id)}
								>
									<cat.icon size={20} strokeWidth={isActive ? 3 : 2} />
									<span class="text-[10px] font-black tracking-tight uppercase"
										>{i18n.t(cat.slug as any) || cat.name}</span
									>
								</button>
							{/each}
						</div>

						<!-- Subcategories -->
						{#if availableSubCategories().length > 0}
							<div class="pt-1" transition:slide={{ duration: 200 }}>
								<div
									class="flex flex-wrap gap-2 rounded-xl border-2 border-slate-100 bg-slate-50 p-2"
								>
									{#each availableSubCategories() as subCat}
										<button
											class={cn(
												'cursor-pointer rounded-lg border-2 px-3 py-1.5 text-[10px] font-black tracking-wider uppercase transition-all',
												selectedCategoryId === subCat.id
													? activeColorMap[subCat.color] ||
															'border-primary-500 bg-primary-500 text-white'
													: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
											)}
											onclick={() => changeCategory(subCat.id)}
										>
											{i18n.t(subCat.slug as any) || subCat.name}
										</button>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>

				<!-- Results -->
				<div class="mt-4 max-h-[300px] min-h-[300px] space-y-2 overflow-y-auto pr-1">
					{#if isSearching}
						<div class="space-y-2">
							{#each Array(4) as _}
								<div class="flex w-full items-center gap-3 rounded-xl border-2 border-slate-50 p-3">
									<Skeleton class="size-10 shrink-0 rounded-full" />
									<div class="flex-1 space-y-2">
										<Skeleton class="h-4 w-[140px]" />
										<Skeleton class="h-3 w-[100px]" />
									</div>
								</div>
							{/each}
						</div>
					{:else}
						{#each results as person (person.id)}
							<button
								class="flex w-full cursor-pointer items-center gap-3 rounded-xl border-2 border-slate-100 p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50/50"
								onclick={() => selectPerson(person)}
								in:fly={{ y: 10, duration: 200 }}
							>
								<div
									class="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100"
								>
									{#if person.photoUrl}
										<img
											src={person.photoUrl}
											alt={person.title}
											class="size-full object-cover"
											loading="lazy"
										/>
									{:else}
										<div
											class="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-xs font-black text-white"
										>
											{person.title.trim().split(/\s+/).length > 1
												? person.title
														.trim()
														.split(/\s+/)
														.slice(0, 2)
														.map((n: string) => [...n][0])
														.join('')
												: ([...person.title.trim()][0] ?? '?')}
										</div>
									{/if}
								</div>
								<div class="min-w-0 flex-1">
									<p class="truncate font-bold text-slate-900">{person.title}</p>
									<div class="mt-0.5 flex items-center gap-1.5">
										<Badge
											variant="outline"
											class={cn(
												'h-4 px-1.5 text-[9px] font-bold tracking-wider uppercase',
												getCategoryBadgeClass(person.rootCategorySlug)
											)}
										>
											{person.category}
										</Badge>
										{#if person.codeNo}
											<span class="truncate text-[10px] font-medium text-slate-400"
												>{person.codeNo}</span
											>
										{/if}
									</div>
								</div>
								<div class="flex shrink-0 flex-col items-end gap-1">
									{#if person.status === 'on_premises'}
										<Badge
											class={cn(
												'h-5 px-1.5 text-[9px] font-black uppercase',
												statusBadgeClasses.on_premises
											)}
										>
											{i18n.t('inside')}
										</Badge>
									{/if}
									<ChevronRight size={14} class="text-slate-300" />
								</div>
							</button>
						{:else}
							{#if searchQuery.length >= 2}
								<div class="py-12 text-center" in:fade>
									<div
										class="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-3 border-2 border-dashed border-slate-200"
									>
										<Users size={28} />
									</div>
									<p class="text-slate-400 font-bold">{i18n.t('noResults')}</p>
									<p class="text-slate-300 text-[10px] uppercase font-black mt-1">
										Try a different name or ID
									</p>
								</div>
							{:else if searchQuery.length < 2}
								<div class="py-12 text-center" in:fade>
									<div
										class="size-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300 mb-3 border-2 border-dashed border-slate-200"
									>
										<Search size={28} />
									</div>
									<p class="text-slate-400 font-bold">Search for a person</p>
									<p class="text-slate-300 text-[10px] uppercase font-black mt-1">
										Type at least 2 characters
									</p>
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			{:else}
				<!-- Selected Person Preview -->
				<div class="space-y-4" in:fly={{ x: 20, duration: 300 }}>
					<div
						class="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm"
					>
						<div class="absolute top-0 right-0 p-4">
							<CheckCircle2 size={40} class="text-primary-500/10" />
						</div>

						<div class="relative flex items-start gap-4">
							<div
								class="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-primary-100 bg-white shadow-sm"
							>
								{#if selectedPerson.photoUrl}
									<img
										src={selectedPerson.photoUrl}
										alt={selectedPerson.title}
										class="size-full object-cover"
										loading="lazy"
									/>
								{:else}
									<div
										class="flex size-full items-center justify-center bg-gradient-to-br from-primary-400 to-primary-600 text-xl font-black text-white"
									>
										{selectedPerson.title.trim().split(/\s+/).length > 1
											? selectedPerson.title
													.trim()
													.split(/\s+/)
													.slice(0, 2)
													.map((n: string) => [...n][0])
													.join('')
											: ([...selectedPerson.title.trim()][0] ?? '?')}
									</div>
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<h3 class="truncate text-xl font-black text-slate-900">{selectedPerson.title}</h3>
								<div class="mt-2 flex flex-wrap items-center gap-2">
									{#if selectedPerson.category}
										<Badge
											variant="outline"
											class={cn(
												'text-[10px] font-bold tracking-wider uppercase',
												getCategoryBadgeClass(selectedPerson.rootCategorySlug)
											)}
										>
											{selectedPerson.category}
										</Badge>
									{/if}
									{#if selectedPerson.status === 'on_premises'}
										<Badge
											class={cn('text-[10px] font-bold uppercase', statusBadgeClasses.on_premises)}
										>
											{i18n.t('inside')}
										</Badge>
									{/if}
								</div>
							</div>
						</div>

						<div class="mt-6 grid grid-cols-2 gap-4">
							{#if selectedPerson.codeNo}
								<div class="flex flex-col gap-1">
									<span class="text-[9px] font-black tracking-widest text-slate-400 uppercase"
										>ID Number</span
									>
									<div class="flex items-center gap-2 text-sm">
										<IdCard size={16} class="text-slate-400" />
										<span class="font-bold text-slate-600">{selectedPerson.codeNo}</span>
									</div>
								</div>
							{/if}
							{#if selectedPerson.company}
								<div class="flex flex-col gap-1">
									<span class="text-[9px] font-black tracking-widest text-slate-400 uppercase"
										>Company</span
									>
									<div class="flex items-center gap-2 text-sm">
										<Building2 size={16} class="text-slate-400" />
										<span class="truncate font-bold text-slate-600">{selectedPerson.company}</span>
									</div>
								</div>
							{/if}
						</div>
					</div>

					{#if selectedPerson.isTrained === false}
						<div
							class="flex animate-in items-start gap-3 rounded-xl border-2 border-rose-100 bg-rose-50 p-4 fade-in slide-in-from-top-2"
							in:slide
						>
							<AlertCircle size={20} class="mt-0.5 shrink-0 text-rose-600" />
							<div>
								<p class="text-sm font-black tracking-tight text-rose-700 uppercase">
									Safety Warning
								</p>
								<p class="mt-0.5 text-xs font-bold text-rose-600">
									This person has not completed mandatory safety training. Please ensure they are
									accompanied or supervised.
								</p>
							</div>
						</div>
					{/if}

					<div class="space-y-4" in:slide>
						<div class="space-y-2">
							<Label class="text-[10px] font-black tracking-widest text-slate-400 uppercase"
								>Assignment Location <span class="text-rose-500">*</span></Label
							>
							<div class="grid grid-cols-2 gap-3">
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
							</div>
						</div>

						{#if needsPurpose}
							<div class="space-y-2 rounded-xl border-2 border-primary-100/50 bg-primary-50/50 p-4">
								<Label
									for="checkin-purpose"
									class="text-[10px] font-black tracking-widest text-primary-700 uppercase"
									>{i18n.t('purpose')} (Optional)</Label
								>
								<Input
									id="checkin-purpose"
									bind:value={purpose}
									placeholder="Reason for visit"
									class="h-11 border-2 bg-white"
								/>
							</div>
						{/if}
					</div>

					{#if selectedPerson.status === 'on_premises'}
						<div
							class="flex items-center gap-3 rounded-xl border-2 border-amber-100 bg-amber-50 p-4"
						>
							<AlertCircle size={20} class="shrink-0 text-amber-600" />
							<p class="text-xs font-bold text-amber-800">
								This person is already checked in. They must check out first.
							</p>
						</div>
					{/if}

					<div class="flex gap-3 pt-2">
						<Button
							type="button"
							variant="outline"
							class="h-12 flex-1 border-2 text-xs font-black tracking-wider uppercase"
							onclick={clearSelection}
						>
							Back to Search
						</Button>
						{#if selectedPerson.status !== 'on_premises'}
							<form
								method="POST"
								action="/attendance?/checkIn"
								class="flex-1"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (result.type === 'success') {
											open = false;
											await update();
										} else if (result.type === 'failure') {
											const msg = (result.data as any)?.message || 'Check-in failed';
											appToast.error(msg);
										} else if (result.type === 'error') {
											appToast.error('An unexpected error occurred');
										}
									};
								}}
							>
								<input type="hidden" name="personId" value={selectedPerson.id} />
								<input type="hidden" name="purpose" value={purpose} />
								<input type="hidden" name="location" value={location} />
								<Button
									type="submit"
									disabled={!location}
									class="h-12 w-full gap-2 text-sm font-black tracking-widest uppercase"
								>
									<CheckCircle2 size={20} />
									{i18n.t('confirm')}
								</Button>
							</form>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
