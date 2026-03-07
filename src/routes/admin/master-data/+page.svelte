<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { 
		Building2, 
		Briefcase, 
		Pencil, 
		Trash2, 
		Check, 
		X, 
		Search,
		Database
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { appToast, cn } from '$lib/utils';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import { fade } from 'svelte/transition';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeTab = $state<'departments' | 'designations'>('departments');
	let searchQuery = $state('');

	// Edit states
	let editingId = $state<number | null>(null);
	let editValue = $state('');
	
	// Delete states
	let confirmDeleteOpen = $state(false);
	let itemToDelete = $state<{ id: number; type: 'dept' | 'desig'; name: string } | null>(null);
	let deleteFormElement = $state<HTMLFormElement | null>(null);

	const items = $derived(activeTab === 'departments' ? data.departments : data.designations);
	
	const filteredItems = $derived(
		items.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
	);

	function startEdit(id: number, name: string) {
		editingId = id;
		editValue = name;
	}

	function triggerDelete(id: number, name: string, type: 'dept' | 'desig', form: HTMLFormElement) {
		itemToDelete = { id, name, type };
		deleteFormElement = form;
		confirmDeleteOpen = true;
	}

	$effect(() => {
		if (form?.success) {
			editingId = null;
			appToast.success('Updated successfully');
		} else if (form?.message) {
			appToast.error(form.message);
		}
	});
</script>

<svelte:head>
	<title>Master Data | {i18n.t('appName')}</title>
</svelte:head>

<div class="content-container space-y-6 pb-10">
	<!-- Header -->
	<div class="flex flex-col justify-between gap-4 md:flex-row md:items-end">
		<div class="space-y-1">
			<h1 class="text-2xl leading-tight font-black tracking-tighter text-slate-900 capitalize sm:text-4xl">
				<span class="electric-text">Master Data</span>
			</h1>
			<p class="text-sm font-black text-slate-500">Manage organization departments and job titles</p>
		</div>

		<!-- Standard Tab Switcher -->
		<div class="flex p-1 bg-slate-100 rounded-2xl border-2 border-slate-100">
			<button 
				onclick={() => { activeTab = 'departments'; searchQuery = ''; editingId = null; }}
				class={cn(
					"flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
					activeTab === 'departments' 
						? "bg-white text-primary-700 shadow-sm" 
						: "text-slate-500 hover:text-slate-700"
				)}
			>
				<Building2 size={14} />
				Departments
			</button>
			<button 
				onclick={() => { activeTab = 'designations'; searchQuery = ''; editingId = null; }}
				class={cn(
					"flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
					activeTab === 'designations' 
						? "bg-white text-primary-700 shadow-sm" 
						: "text-slate-500 hover:text-slate-700"
				)}
			>
				<Briefcase size={14} />
				Job Titles
			</button>
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-4">
		<!-- Search Panel -->
		<div class="lg:col-span-1 space-y-6">
			<Card.Root class="overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
				<Card.Header class="p-4 border-b-2 border-slate-50">
					<Card.Title class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Filters</Card.Title>
				</Card.Header>
				<Card.Content class="p-4 space-y-4">
					<div class="relative">
						<Search size={16} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<Input 
							placeholder="Search..." 
							bind:value={searchQuery}
							class="h-10 pl-9 border-2 border-slate-100 bg-slate-50 focus:bg-white transition-colors font-bold text-sm"
						/>
					</div>
					<div class="rounded-xl bg-primary-50 p-3 border border-primary-100">
						<p class="text-[9px] font-black text-primary-600 uppercase tracking-widest mb-1">Total {activeTab}</p>
						<p class="text-2xl font-black text-primary-700">{items.length}</p>
					</div>
				</Card.Content>
			</Card.Root>
		</div>

		<!-- Registry Panel -->
		<div class="lg:col-span-3">
			<Card.Root class="overflow-hidden border-2 border-slate-200 bg-white shadow-sm">
				<Card.Header class="border-b-2 border-slate-50 bg-slate-50/30 px-6 py-4 flex flex-row items-center justify-between">
					<div class="flex items-center gap-3">
						<span class="text-sm font-black text-slate-700 uppercase tracking-widest">
							{activeTab === 'departments' ? 'Department' : 'Job Title'} Registry
						</span>
					</div>
					<Badge variant="outline" class="font-black border-2">{filteredItems.length} Records</Badge>
				</Card.Header>
				
				<Card.Content class="p-0">
					<div class="divide-y-2 divide-slate-50">
						{#each filteredItems as item (item.id)}
							<div class="group flex items-center justify-between p-4 px-6 transition-colors hover:bg-slate-50">
								{#if editingId === item.id}
									<form 
										method="POST" 
										action={activeTab === 'departments' ? "?/updateDepartment" : "?/updateDesignation"} 
										use:enhance
										class="flex flex-1 items-center gap-3"
									>
										<input type="hidden" name="id" value={item.id} />
										<Input 
											name="name" 
											bind:value={editValue} 
											class="h-10 border-2 border-primary-500 font-black"
											autofocus
										/>
										<div class="flex items-center gap-1">
											<Button size="icon" type="submit" class="size-9 bg-primary-600">
												<Check size={16} strokeWidth={3} />
											</Button>
											<Button 
												size="icon" 
												variant="outline" 
												onclick={() => editingId = null}
												class="size-9 border-2"
											>
												<X size={16} strokeWidth={3} />
											</Button>
										</div>
									</form>
								{:else}
									<div class="flex-1">
										<p class="font-black text-slate-800 uppercase tracking-tight text-sm">{item.name}</p>
									</div>
									
									<div class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
										<Button 
											variant="ghost" 
											size="icon" 
											onclick={() => startEdit(item.id, item.name)}
											class="size-9 text-slate-400 hover:bg-primary-50 hover:text-primary-600"
										>
											<Pencil size={16} />
										</Button>
										<form 
											method="POST" 
											action={activeTab === 'departments' ? "?/deleteDepartment" : "?/deleteDesignation"} 
											use:enhance
										>
											<input type="hidden" name="id" value={item.id} />
											<Button 
												variant="ghost" 
												size="icon"
												type="button"
												onclick={(e) => triggerDelete(item.id, item.name, activeTab === 'departments' ? 'dept' : 'desig', (e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
												class="size-9 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
											>
												<Trash2 size={16} />
											</Button>
										</form>
									</div>
								{/if}
							</div>
						{:else}
							<div class="flex flex-col items-center justify-center py-20 text-center">
								<Database size={40} class="text-slate-200 mb-2" />
								<p class="text-sm font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
							</div>
						{/each}
					</div>
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Confirm Deletion"
	message="Are you sure you want to delete '{itemToDelete?.name}'? All people records using this field will be updated."
	confirmText="Yes, Delete"
	variant="danger"
	onconfirm={() => deleteFormElement?.requestSubmit()}
/>
