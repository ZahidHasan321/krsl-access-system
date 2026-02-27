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
	import {
		Calendar,
		Eye,
		EyeOff,
		Loader2,
		Mail,
		Phone,
		Shield,
		ShieldCheck,
		Trash2,
		User,
		UserPlus,
		Users,
		Pencil
	} from 'lucide-svelte';
	import { appToast } from '$lib/utils';
	import { ROLES } from '$lib/constants/roles';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isCreateDialogOpen = $state(false);
	let isEditDialogOpen = $state(false);
	let confirmDeleteOpen = $state(false);

	let userToDelete = $state<{ id: string; username: string } | null>(null);
	let editingUser = $state<{
		id: string;
		username: string;
		name: string | null;
		contact: string | null;
		roleId: string;
	} | null>(null);

	let deleteFormElement = $state<HTMLFormElement | null>(null);
	let showPassword = $state(false);
	let isSubmitting = $state(false);
	let generatedPassword = $state('');

	function generatePassword() {
		const length = 16;
		const charset = {
			upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
			lower: 'abcdefghijklmnopqrstuvwxyz',
			number: '0123456789',
			special: '!@#$%^&*()_+~`|}{[]:;?><,./-='
		};

		let password = '';
		// Ensure at least one of each
		password += charset.upper[Math.floor(Math.random() * charset.upper.length)];
		password += charset.lower[Math.floor(Math.random() * charset.lower.length)];
		password += charset.number[Math.floor(Math.random() * charset.number.length)];
		password += charset.special[Math.floor(Math.random() * charset.special.length)];

		const allChars = Object.values(charset).join('');
		for (let i = password.length; i < length; i++) {
			password += allChars[Math.floor(Math.random() * allChars.length)];
		}

		// Shuffle
		generatedPassword = password
			.split('')
			.sort(() => 0.5 - Math.random())
			.join('');

		showPassword = true;
	}

	const isCurrentAdmin = $derived(data.currentUserRoleId === ROLES.ADMIN);

	function triggerDelete(u: any, form: HTMLFormElement) {
		userToDelete = u;
		deleteFormElement = form;
		confirmDeleteOpen = true;
	}

	function openEdit(u: any) {
		generatedPassword = '';
		editingUser = { ...u };
		isEditDialogOpen = true;
	}

	function openCreate() {
		generatedPassword = '';
		isCreateDialogOpen = true;
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

<div class="space-y-8 px-4 pb-20 md:px-0">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-3xl font-black tracking-tight text-slate-900 capitalize">
				{i18n.t('userManagement')}
			</h1>
			<p class="mt-1 text-sm font-bold tracking-widest text-slate-500 capitalize">
				{data.users.length} System Users
			</p>
		</div>
		<Button
			class="h-11 shrink-0 gap-2 rounded-xl px-6 font-black shadow-lg sm:h-12 sm:rounded-2xl"
			onclick={openCreate}
		>
			<UserPlus size={20} />
			Add User
		</Button>
	</div>

	<div class="grid grid-cols-1 gap-4">
		{#each data.users as u (u.id)}
			<Card.Root class="group overflow-hidden border-2 border-slate-100 bg-white">
				<Card.Content class="p-4 sm:p-6">
					<div class="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between">
						<div class="flex items-start gap-4">
							<div
								class="flex size-12 shrink-0 items-center justify-center rounded-xl border-2 border-slate-100 bg-slate-50 text-slate-400 transition-all group-hover:border-primary-100 group-hover:bg-primary-50 group-hover:text-primary-600 sm:size-14 sm:rounded-2xl"
							>
								<Users size={22} />
							</div>
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2 sm:gap-3">
									<h3 class="max-w-full truncate text-base leading-tight font-black text-slate-900 sm:text-lg">
										{u.username}
									</h3>
									<Badge
										variant="outline"
										class={clsx(
											'shrink-0 px-2 py-0.5 text-[9px] font-black tracking-wider capitalize shadow-sm',
											u.roleId === ROLES.ADMIN
												? 'border-rose-200 bg-rose-50 text-rose-700'
												: 'border-indigo-200 bg-indigo-50 text-indigo-700'
										)}
									>
										{#if u.roleId === ROLES.ADMIN}
											<Shield size={12} class="mr-1.5 opacity-70" />
										{:else}
											<ShieldCheck size={12} class="mr-1.5 opacity-70" />
										{/if}
										{data.roles.find((r) => r.id === u.roleId)?.name || u.roleId}
									</Badge>
								</div>

								<div
									class="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-[11px] font-bold tracking-tight text-slate-500 capitalize sm:grid-cols-2 sm:text-xs"
								>
									{#if u.name}
										<div class="flex min-w-0 items-center gap-1.5">
											<User size={14} class="shrink-0 opacity-50" />
											<span class="truncate">{u.name}</span>
										</div>
									{/if}
									{#if u.contact}
										<div class="flex min-w-0 items-center gap-1.5">
											<Phone size={14} class="shrink-0 opacity-50" />
											<span class="truncate">{u.contact}</span>
										</div>
									{/if}
									<div class="flex min-w-0 items-center gap-1.5 lowercase">
										<Mail size={14} class="shrink-0 opacity-50" />
										<span class="truncate">{u.username}</span>
									</div>
									<div class="flex min-w-0 items-center gap-1.5">
										<Calendar size={14} class="shrink-0 opacity-50" />
										<span class="truncate">{u.createdAt ? format(new Date(u.createdAt), 'PP') : 'N/A'}</span>
									</div>
								</div>
							</div>
						</div>

						<div
							class="flex w-full flex-row items-center gap-2 border-t border-slate-50 pt-3 md:w-auto md:border-t-0 md:pt-0"
						>
							{#if canEdit(u)}
								<Button
									type="button"
									variant="ghost"
									size="icon"
									class="h-10 flex-1 rounded-xl border-2 border-transparent text-slate-400 transition-all hover:border-slate-100 hover:bg-slate-50 hover:text-primary-600 sm:w-10 sm:flex-none"
									onclick={() => openEdit(u)}
								>
									<Pencil size={18} class="shrink-0" />
									<span class="ml-2 font-bold sm:hidden">Edit User</span>
								</Button>
							{/if}

							{#if canDelete(u)}
								<form
									method="POST"
									action="?/deleteUser"
									use:enhance
									bind:this={deleteFormElement}
									class="flex-1 sm:w-auto sm:flex-none"
								>
									<input type="hidden" name="id" value={u.id} />
									<Button
										type="button"
										variant="ghost"
										size="icon"
										class="h-10 w-full rounded-xl border-2 border-transparent text-rose-500 transition-all hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 sm:w-10"
										onclick={(e: MouseEvent) =>
											triggerDelete(
												u,
												(e.currentTarget as HTMLButtonElement).form as HTMLFormElement
											)}
									>
										<Trash2 size={18} class="shrink-0" />
										<span class="ml-2 font-bold sm:hidden">Delete</span>
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
		<form
			method="POST"
			action="?/createUser"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update, result }) => {
					await update();
					isSubmitting = false;
					if (result.type === 'success') {
						isCreateDialogOpen = false;
						appToast.success('User created successfully');
					}
				};
			}}
			class="space-y-4 pt-4"
		>
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 capitalize">Name</Label>
					<Input name="name" placeholder="Full Name" class="h-11 border-2" />
				</div>
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 capitalize">Contact</Label>
					<Input name="contact" placeholder="Phone/Mobile" class="h-11 border-2" />
				</div>
			</div>

			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 capitalize">Username</Label>
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
				<div class="flex items-center justify-between">
					<Label class="text-xs font-bold tracking-widest text-slate-500 capitalize">Password</Label>
					<button
						type="button"
						class="text-[10px] font-black tracking-widest text-primary-600 uppercase transition-colors hover:text-primary-700"
						onclick={generatePassword}
					>
						Generate
					</button>
				</div>
				<div class="relative">
					<Input
						name="password"
						type={showPassword ? 'text' : 'password'}
						required
						minlength={10}
						value={generatedPassword}
						placeholder="••••••••"
						class="h-11 border-2 pr-12"
					/>
					<button
						type="button"
						class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
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
				<p class="text-xs text-slate-400">At least 10 characters with uppercase, lowercase, numbers, and special characters</p>
			</div>

			<div class="space-y-2">
				<Label class="text-xs font-bold tracking-widest text-slate-500 capitalize"
					>Assign Role</Label
				>
				<select
					name="roleId"
					class="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-primary-500 focus:ring-primary-500"
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
				<Button
					type="submit"
					class="h-12 flex-1 gap-2 text-base font-black"
					disabled={isSubmitting}
				>
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
			<form
				method="POST"
				action="?/updateUser"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update, result }) => {
						await update();
						isSubmitting = false;
						if (result.type === 'success') {
							isEditDialogOpen = false;
							appToast.success('User updated successfully');
						}
					};
				}}
				class="space-y-4 pt-4"
			>
				<input type="hidden" name="userId" value={editingUser.id} />

				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Name</Label>
						<Input
							name="name"
							value={editingUser.name}
							placeholder="Full Name"
							class="h-11 border-2"
						/>
					</div>
					<div class="space-y-2">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Contact</Label
						>
						<Input
							name="contact"
							value={editingUser.contact}
							placeholder="Phone/Mobile"
							class="h-11 border-2"
						/>
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
						disabled={data.isMaster &&
							editingUser.username === data.users.find((u) => u.isMaster)?.username}
					/>
					<!-- Note: For Master self, we disable username input. 
					     Wait, `editingUser.username` check against Master username might be tricky if I don't have isMaster flag on editingUser directly.
						 But `data.users` has `isMaster` flag.
						 Better: check if this user is Master user.
					-->
					{#if data.isMaster && data.users.find((u) => u.id === editingUser?.id)?.isMaster}
						<p class="text-xs text-amber-600">Master username cannot be changed.</p>
					{/if}
				</div>

				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">
							Password <span class="font-normal text-slate-400 normal-case"
								>(Leave blank to keep current)</span
							>
						</Label>
						{#if !(data.isMaster && data.users.find((u) => u.id === editingUser?.id)?.isMaster)}
							<button
								type="button"
								class="text-[10px] font-black tracking-widest text-primary-600 uppercase transition-colors hover:text-primary-700"
								onclick={generatePassword}
							>
								Generate
							</button>
						{/if}
					</div>
					<div class="relative">
						<Input
							name="password"
							type={showPassword ? 'text' : 'password'}
							minlength={10}
							value={generatedPassword}
							placeholder="••••••••"
							class="h-11 border-2 pr-12"
							disabled={data.isMaster && data.users.find((u) => u.id === editingUser?.id)?.isMaster}
						/>
						<button
							type="button"
							class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
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
					{#if !(data.isMaster && data.users.find((u) => u.id === editingUser?.id)?.isMaster)}
						<p class="text-xs text-slate-400">
							At least 10 characters with uppercase, lowercase, numbers, and special characters
						</p>
					{/if}
				</div>
				<div class="space-y-2">
					<Label class="text-xs font-bold tracking-widest text-slate-500 uppercase">Role</Label>
					<select
						name="roleId"
						class="h-11 w-full rounded-xl border-2 border-slate-200 bg-white px-4 text-sm font-bold outline-none focus:border-primary-500 focus:ring-primary-500 disabled:bg-slate-100 disabled:text-slate-400"
						value={editingUser.roleId}
						disabled={data.isMaster && data.users.find((u) => u.id === editingUser?.id)?.isMaster}
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
					<Button
						type="submit"
						class="h-12 flex-1 gap-2 text-base font-black"
						disabled={isSubmitting}
					>
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
