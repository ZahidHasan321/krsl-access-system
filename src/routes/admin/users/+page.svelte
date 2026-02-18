<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { i18n } from '$lib/i18n.svelte';
	import { clsx } from 'clsx';
	import { format } from 'date-fns';
	import { Calendar, Eye, EyeOff, Loader2, Mail, Phone, Shield, Trash2, User, UserPlus, Users, Pencil } from 'lucide-svelte';
	import { appToast } from '$lib/utils';
	import { ROLES } from '$lib/constants/roles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isCreateDialogOpen = $state(false);
	let isEditDialogOpen = $state(false);
	let confirmDeleteOpen = $state(false);
	
	let userToDelete = $state<{ id: string; username: string } | null>(null);
	let editingUser = $state<{ id: string; username: string; name: string | null; contact: string | null; roleId: string } | null>(null);
	
	let deleteFormElement = $state<HTMLFormElement | null>(null);
	let showPassword = $state(false);
	let isSubmitting = $state(false);

	const isCurrentAdmin = $derived(data.currentUserRoleId === ROLES.ADMIN);

	function triggerDelete(u: any, form: HTMLFormElement) {
		userToDelete = u;
		deleteFormElement = form;
		confirmDeleteOpen = true;
	}

	function openEdit(u: any) {
		editingUser = { ...u };
		isEditDialogOpen = true;
	}

	function canEdit(u: any) {
		if (data.isMaster) return true;
		if (isCurrentAdmin) {
			if (u.isMaster) return false;
			if (u.roleId === ROLES.ADMIN) return false;
			return true;
		}
		return false;
	}

	function canDelete(u: any) {
		if (u.isMaster) return false;
		if (data.isMaster) return true;
		if (isCurrentAdmin) {
			if (u.roleId === ROLES.ADMIN) return false;
			return true;
		}
		return false;
	}

	$effect(() => {
		if (form && 'success' in form && form.success) {
			isCreateDialogOpen = false;
			isEditDialogOpen = false;
			// appToast.success('Operation successful'); // Form actions usually redirect or invalidate, but if not, we can show toast. server `fail` shows toast via form.message. Success? we can infer.
		} else if (form?.message) {
			appToast.error(form.message);
		}
	});
</script>

<div class="space-y-8 pb-20">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-black tracking-tight text-slate-900">{i18n.t('userManagement')}</h1>
			<p class="mt-1 text-sm font-bold tracking-widest text-slate-500 uppercase">
				{data.users.length} System Users
			</p>
		</div>
		<Button
			class="h-11 gap-2 px-6 font-black shadow-lg"
			onclick={() => (isCreateDialogOpen = true)}
		>
			<UserPlus size={20} />
			Add User
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-4">
		{#each data.users as u (u.id)}
			<Card.Root class="group overflow-hidden border-2 border-slate-100">
				<Card.Content class="p-6">
					<div class="flex flex-col justify-between gap-6 md:flex-row md:items-center">
						<div class="flex items-center gap-4">
							<div
								class="flex size-14 items-center justify-center rounded-2xl border-2 border-slate-100 bg-slate-50 text-slate-400 transition-all group-hover:border-primary-100 group-hover:bg-primary-50 group-hover:text-primary-600"
							>
								<Users size={24} />
							</div>
							<div>
								<div class="flex items-center gap-3">
									<h3 class="text-lg leading-tight font-black text-slate-900">{u.username}</h3>
									<Badge
										variant="outline"
										class={clsx(
											'text-[10px] font-bold tracking-widest uppercase',
											u.roleId === ROLES.ADMIN
												? 'border-rose-200 bg-rose-100 text-rose-700'
												: 'border-blue-200 bg-blue-100 text-blue-700'
										)}
									>
										<Shield size={12} class="mr-1 opacity-50" />
										{data.roles.find((r) => r.id === u.roleId)?.name || u.roleId}
									</Badge>
								</div>
								
								<div class="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-xs font-bold tracking-tight text-slate-500 uppercase sm:grid-cols-2">
									{#if u.name}
										<span class="flex items-center gap-1.5">
											<User size={14} class="opacity-50" />
											{u.name}
										</span>
									{/if}
									{#if u.contact}
										<span class="flex items-center gap-1.5">
											<Phone size={14} class="opacity-50" />
											{u.contact}
										</span>
									{/if}
									<span class="flex items-center gap-1.5">
										<Mail size={14} class="opacity-50" />
										{u.username}
									</span>
									<span class="flex items-center gap-1.5">
										<Calendar size={14} class="opacity-50" />
										{u.createdAt ? format(new Date(u.createdAt), 'PP') : 'N/A'}
									</span>
								</div>
							</div>
						</div>

						<div class="flex items-center gap-2 border-t pt-4 md:border-t-0 md:pt-0">
							{#if canEdit(u)}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="size-10 rounded-xl border-2 border-transparent text-slate-400 hover:border-slate-100 hover:bg-slate-50 hover:text-primary-600"
									onclick={() => openEdit(u)}
								>
									<Pencil size={18} />
								</Button>
							{/if}

							{#if canDelete(u)}
								<form method="POST" action="?/deleteUser" use:enhance bind:this={deleteFormElement}>
									<input type="hidden" name="id" value={u.id} />
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="size-10 rounded-xl border-2 border-transparent text-rose-500 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700"
										onclick={(e: MouseEvent) =>
											triggerDelete(
												u,
												(e.currentTarget as HTMLButtonElement).form as HTMLFormElement
											)}
									>
										<Trash2 size={18} />
									</Button>
								</form>
							{/if}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>

<ConfirmModal
	bind:open={confirmDeleteOpen}
	title="Delete User"
	message="Are you sure you want to delete user '{userToDelete?.username}'? This action cannot be undone."
	confirmText="Delete"
	variant="danger"
	onconfirm={() => deleteFormElement?.requestSubmit()}
/>

<!-- Create User Dialog -->
<Dialog.Root bind:open={isCreateDialogOpen}>
	<Dialog.Content class="sm:max-w-112.5">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-black">Create User</Dialog.Title>
		</Dialog.Header>
		<form method="POST" action="?/createUser" use:enhance={() => {
			isSubmitting = true;
			return async ({ update, result }) => {
				await update();
				isSubmitting = false;
				if (result.type === 'success') {
					isCreateDialogOpen = false;
					appToast.success('User created successfully');
				}
			};
		}} class="space-y-4 pt-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Name</Label>
					<Input name="name" placeholder="Full Name" class="h-11 border-2" />
				</div>
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Contact</Label>
					<Input name="contact" placeholder="Phone/Mobile" class="h-11 border-2" />
				</div>
			</div>

			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Username</Label>
				<Input
					name="username"
					required
					minlength={3}
					maxlength={31}
					placeholder="Enter username"
					class="h-11 border-2"
				/>
			</div>

			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Password</Label>
				<div class="relative">
					<Input
						name="password"
						type={showPassword ? 'text' : 'password'}
						required
						minlength={8}
						placeholder="••••••••"
						class="h-11 border-2 pr-12"
					/>
					<button
						type="button"
						class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
						onclick={() => (showPassword = !showPassword)}
						tabindex={-1}
					>
						{#if showPassword}
							<EyeOff size={20} />
						{:else}
							<Eye size={20} />
						{/if}
					</button>
				</div>
				<p class="text-xs text-slate-400">At least 8 characters with both letters and numbers</p>
			</div>

			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Assign Role</Label>
				<select
					name="roleId"
					class="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold outline-none focus:border-primary-500 focus:ring-primary-500 bg-white"
				>
					{#each data.roles as r}
						<option value={r.id}>{r.name}</option>
					{/each}
				</select>
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
				<Button type="submit" class="h-12 flex-1 gap-2 text-base font-black" disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="animate-spin" size={20} />
						Creating...
					{:else}
						<UserPlus size={20} />
						Create
					{/if}
				</Button>
			</div>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit User Dialog -->
<Dialog.Root bind:open={isEditDialogOpen}>
	<Dialog.Content class="sm:max-w-112.5">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-black">Edit User</Dialog.Title>
		</Dialog.Header>
		{#if editingUser}
			<form method="POST" action="?/updateUser" use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success') {
						isEditDialogOpen = false;
						appToast.success('User updated successfully');
					}
				};
			}} class="space-y-4 pt-4">
				<input type="hidden" name="userId" value={editingUser.id} />

				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Name</Label>
						<Input name="name" value={editingUser.name} placeholder="Full Name" class="h-11 border-2" />
					</div>
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Contact</Label>
						<Input name="contact" value={editingUser.contact} placeholder="Phone/Mobile" class="h-11 border-2" />
					</div>
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Username</Label>
					<Input
						name="username"
						value={editingUser.username}
						required
						minlength={3}
						maxlength={31}
						placeholder="Enter username"
						class="h-11 border-2"
						disabled={data.isMaster && editingUser.username === data.users.find(u => u.isMaster)?.username} 
					/>
					<!-- Note: For Master self, we disable username input. 
					     Wait, `editingUser.username` check against Master username might be tricky if I don't have isMaster flag on editingUser directly.
						 But `data.users` has `isMaster` flag.
						 Better: check if this user is Master user.
					-->
					{#if data.isMaster && data.users.find(u => u.id === editingUser?.id)?.isMaster}
						<p class="text-xs text-amber-600">Master username cannot be changed.</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">
						Password <span class="text-slate-400 font-normal normal-case">(Leave blank to keep current)</span>
					</Label>
					<div class="relative">
						<Input
							name="password"
							type={showPassword ? 'text' : 'password'}
							minlength={8}
							placeholder="••••••••"
							class="h-11 border-2 pr-12"
							disabled={data.isMaster && data.users.find(u => u.id === editingUser?.id)?.isMaster}
						/>
						<button
							type="button"
							class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
							onclick={() => (showPassword = !showPassword)}
							tabindex={-1}
						>
							{#if showPassword}
								<EyeOff size={20} />
							{:else}
								<Eye size={20} />
							{/if}
						</button>
					</div>
					{#if !(data.isMaster && data.users.find(u => u.id === editingUser?.id)?.isMaster)}
						<p class="text-xs text-slate-400">At least 8 characters with both letters and numbers</p>
					{/if}
				</div>

				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Role</Label>
					<select
						name="roleId"
						class="h-11 w-full rounded-xl border-2 border-slate-200 px-4 text-sm font-bold outline-none focus:border-primary-500 focus:ring-primary-500 bg-white disabled:bg-slate-100 disabled:text-slate-400"
						value={editingUser.roleId}
						disabled={data.isMaster && data.users.find(u => u.id === editingUser?.id)?.isMaster}
					>
						{#each data.roles as r}
							<option value={r.id}>{r.name}</option>
						{/each}
					</select>
				</div>

				<div class="flex gap-3 pt-4">
					<Button
						type="button"
						variant="ghost"
						class="h-12 flex-1 font-bold"
						onclick={() => (isEditDialogOpen = false)}
					>
						Cancel
					</Button>
					<Button type="submit" class="h-12 flex-1 gap-2 text-base font-black" disabled={isSubmitting}>
						{#if isSubmitting}
							<Loader2 class="animate-spin" size={20} />
							Saving...
						{:else}
							<Pencil size={20} />
							Save Changes
						{/if}
					</Button>
				</div>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>
