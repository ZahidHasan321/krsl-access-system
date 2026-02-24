<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { i18n } from '$lib/i18n.svelte';
	import { clsx } from 'clsx';
	import { Lock, Plus, Save, Shield, ShieldCheck, Trash2 } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import { ROLES } from '$lib/constants/roles';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// svelte-ignore state_referenced_locally
	let selectedRole = $state(data.roles[0]?.id || '');
	let role = $derived(data.roles.find((r: any) => r.id === selectedRole));

	let isCreateDialogOpen = $state(false);
	let confirmDeleteOpen = $state(false);
	let deleteFormElement = $state<HTMLFormElement | null>(null);

	function triggerDelete(form: HTMLFormElement) {
		deleteFormElement = form;
		confirmDeleteOpen = true;
	}
</script>

<div class="space-y-8 px-4 pb-20 md:px-0">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-black tracking-tight text-slate-900 capitalize">
				{i18n.t('roleManagement')}
			</h1>
			<p class="mt-1 text-sm font-bold tracking-widest text-slate-500 capitalize">
				{data.roles.length} System Roles
			</p>
		</div>
		<Button
			class="h-11 shrink-0 gap-2 rounded-xl px-6 font-black shadow-lg sm:h-12 sm:rounded-2xl"
			onclick={() => (isCreateDialogOpen = true)}
		>
			<Plus size={20} />
			Create Role
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-4">
		<!-- Role List - Horizontal on mobile, vertical sidebar on desktop -->
		<div class="space-y-3 lg:col-span-1">
			<p class="ml-1 text-[10px] font-black tracking-widest text-slate-400 capitalize">
				System Roles
			</p>
			<div
				class="custom-scrollbar flex flex-row gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0"
			>
				{#each data.roles as r (r.id)}
					<button
						onclick={() => (selectedRole = r.id)}
						class={clsx(
							'group flex shrink-0 items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition-all sm:rounded-2xl sm:py-4 lg:w-full',
							selectedRole === r.id
								? 'border-primary-100 bg-primary-50 text-primary-900 shadow-sm'
								: 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
						)}
					>
						<div class="flex items-center gap-3">
							<Shield
								size={18}
								class={selectedRole === r.id ? 'text-primary-600' : 'text-slate-300'}
							/>
							<div>
								<p class="text-sm leading-tight font-black sm:text-base">{r.name}</p>
								<p class="text-[9px] font-bold tracking-widest capitalize opacity-50">{r.id}</p>
							</div>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Permissions Editor -->
		<div class="lg:col-span-3">
			{#if role}
				<Card.Root class="overflow-hidden border-2 border-slate-100 bg-white">
					<div
						class="flex flex-col justify-between gap-4 border-b-2 border-slate-50 p-4 sm:flex-row sm:items-start sm:p-6"
					>
						<div>
							<div class="flex items-center gap-3">
								<h2 class="text-xl leading-tight font-black text-slate-900 sm:text-2xl">
									{role.name}
								</h2>
								<Badge
									variant="secondary"
									class={clsx(
										'px-2 py-0.5 text-[9px] font-black tracking-wider capitalize',
										role.id === ROLES.ADMIN
											? 'border border-rose-100 bg-rose-50 text-rose-700'
											: 'border border-indigo-100 bg-indigo-50 text-indigo-700'
									)}
								>
									{#if role.id === ROLES.ADMIN}
										<Shield size={12} class="mr-1.5 opacity-70" />
									{:else}
										<ShieldCheck size={12} class="mr-1.5 opacity-70" />
									{/if}
									{role.id}
								</Badge>
							</div>
							<p class="mt-2 text-xs leading-relaxed font-bold text-slate-500 sm:text-sm">
								{role.description || 'No description provided.'}
							</p>
						</div>
						{#if role.id !== ROLES.ADMIN}
							<form method="POST" action="?/deleteRole" use:enhance bind:this={deleteFormElement}>
								<input type="hidden" name="id" value={role.id} />
								<Button
									type="button"
									variant="ghost"
									class="w-full gap-2 rounded-xl border-2 border-transparent font-bold text-rose-600 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 sm:w-auto"
									onclick={(e: MouseEvent) =>
										triggerDelete((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
								>
									<Trash2 size={18} />
									Delete Role
								</Button>
							</form>
						{/if}
					</div>

					<Card.Content class="p-4 sm:p-6">
						<form
							method="POST"
							action="?/updatePermissions"
							use:enhance={() => {
								return async ({ result }) => {
									if (result.type === 'success') toast.success('Permissions updated');
								};
							}}
						>
							<input type="hidden" name="roleId" value={role.id} />

							{#if role.id === ROLES.ADMIN}
								<div
									class="mb-6 flex items-center gap-4 rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-amber-900"
								>
									<div
										class="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600"
									>
										<Lock size={20} />
									</div>
									<p class="text-xs font-bold sm:text-sm">
										This role is system-protected. Most permissions are locked, except for
										"checkin.view_details" which controls the check-in verification dialog.
									</p>
								</div>
							{/if}

							<div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
								{#each data.allPermissions as perm (perm.id)}
									{@const isCheckinView = perm.id === 'checkin.view_details'}
									{@const isChecked =
										role.id === ROLES.ADMIN
											? isCheckinView
												? role.permissions.includes(perm.id)
												: true
											: role.permissions.includes(perm.id)}
									{@const isDisabled = role.id === ROLES.ADMIN && !isCheckinView}
									<label
										class={clsx(
											'flex items-start gap-3 rounded-2xl border-2 p-4 transition-all sm:gap-4 sm:p-5',
											isDisabled
												? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-80'
												: 'group cursor-pointer border-slate-50 hover:bg-slate-50'
										)}
									>
										<Checkbox
											name="permissions"
											value={perm.id}
											checked={isChecked}
											disabled={isDisabled}
											class="mt-0.5"
										/>
										<div class="min-w-0">
											<p
												class="truncate text-xs font-black tracking-tight text-slate-900 capitalize transition-colors group-hover:text-primary-700 sm:text-sm"
											>
												{perm.id}
											</p>
											<p
												class="mt-0.5 text-[10px] leading-tight font-bold text-slate-400 sm:text-xs"
											>
												{perm.description}
											</p>
										</div>
									</label>
								{/each}
							</div>

							{#if role.id !== ROLES.ADMIN}
								<div class="mt-10 flex justify-end">
									<Button
										type="submit"
										class="h-12 w-full gap-2 rounded-xl px-8 text-base font-black shadow-lg sm:w-auto"
									>
										<Save size={20} />
										Save Permissions
									</Button>
								</div>
							{/if}
						</form>
					</Card.Content>
				</Card.Root>
			{:else}
				<div
					class="flex h-96 flex-col items-center justify-center rounded-3xl border-4 border-dashed border-slate-100 bg-slate-50 text-slate-300"
				>
					<Shield size={64} class="mb-4 opacity-10" />
					<p class="text-xs font-bold tracking-widest capitalize">
						Select a role to manage its permissions
					</p>
				</div>
			{/if}
		</div>
	</div>
</div>

<Dialog.Root bind:open={isCreateDialogOpen}>
	<Dialog.Content class="sm:max-w-125">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-black">Create Role</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/createRole" use:enhance class="space-y-6 pt-4">
			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Role ID</Label>
				<Input name="id" required placeholder="e.g. manager" class="h-11 border-2" />
			</div>
			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase"
					>Display Name</Label
				>
				<Input name="name" required placeholder="e.g. Area Manager" class="h-11 border-2" />
			</div>
			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Description</Label
				>
				<Input
					name="description"
					placeholder="Short description of this role"
					class="h-11 border-2"
				/>
			</div>
			<div class="flex gap-3 pt-4">
				<Button
					type="button"
					variant="ghost"
					class="h-12 flex-1 font-bold"
					onclick={() => (isCreateDialogOpen = false)}
				>
					Cancel
				</Button>
				<Button type="submit" class="h-12 flex-1 gap-2 text-base font-black">
					<Plus size={20} />
					Create Role
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Delete Role"
	message="Are you sure you want to delete the '{role?.name}' role? All users assigned to this role might lose access. This action cannot be undone."
	confirmText="Delete"
	variant="danger"
	onconfirm={() => deleteFormElement?.requestSubmit()}
/>
