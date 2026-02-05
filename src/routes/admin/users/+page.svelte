<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Label } from '$lib/components/ui/label';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import { Shield, UserPlus, Users, Trash2, Mail, Calendar, Key, MoreVertical } from 'lucide-svelte';
    import { clsx } from 'clsx';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isCreateDialogOpen = $state(false);
    let confirmDeleteOpen = $state(false);
    let userToDelete = $state<{id: string, username: string} | null>(null);
    let deleteFormElement = $state<HTMLFormElement | null>(null);

    function triggerDelete(u: any, form: HTMLFormElement) {
        userToDelete = u;
        deleteFormElement = form;
        confirmDeleteOpen = true;
    }

    $effect(() => {
        if (form && 'success' in form && form.success) {
            isCreateDialogOpen = false;
            toast.success('Operation successful');
        } else if (form?.message) {
            toast.error(form.message);
        }
    });
</script>

<div class="space-y-8 pb-20">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('userManagement')}</h1>
            <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">
                {data.users.length} System Users
            </p>
        </div>
        <Button class="font-black gap-2 h-11 px-6 shadow-lg" onclick={() => isCreateDialogOpen = true}>
            <UserPlus size={20} />
            Add User
        </Button>
    </div>

    <div class="grid grid-cols-1 gap-4">
        {#each data.users as u}
            <Card.Root class="overflow-hidden border-2 border-slate-100 group">
                <Card.Content class="p-6">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div class="flex items-center gap-4">
                            <div class="size-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 border-2 border-slate-100 group-hover:bg-primary-50 group-hover:text-primary-600 group-hover:border-primary-100 transition-all">
                                <Users size={24} />
                            </div>
                            <div>
                                <div class="flex items-center gap-3">
                                    <h3 class="text-lg font-black text-slate-900 leading-tight">{u.username}</h3>
                                    <Badge variant="outline" class={clsx(
                                        "font-bold text-[10px] uppercase tracking-widest",
                                        u.roleId === 'admin' ? "bg-rose-100 text-rose-700 border-rose-200" : "bg-blue-100 text-blue-700 border-blue-200"
                                    )}>
                                        <Shield size={12} class="mr-1 opacity-50" />
                                        {data.roles.find(r => r.id === u.roleId)?.name || u.roleId}
                                    </Badge>
                                </div>
                                <div class="flex items-center gap-4 mt-1 text-xs font-bold text-slate-500 uppercase tracking-tight">
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

                        <div class="flex items-center gap-4 pt-4 md:pt-0 border-t md:border-t-0">
                            <form method="POST" action="?/updateUserRole" use:enhance class="flex items-center gap-2">
                                <input type="hidden" name="userId" value={u.id} />
                                <select 
                                    name="roleId" 
                                    class="h-10 text-sm font-bold border-2 border-slate-100 rounded-xl px-4 focus:ring-primary-500 focus:border-primary-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
                                    onchange={(e) => e.currentTarget.form?.requestSubmit()}
                                    disabled={u.roleId === 'admin'}
                                >
                                    {#each data.roles as r}
                                        <option value={r.id} selected={u.roleId === r.id}>{r.name}</option>
                                    {/each}
                                </select>
                            </form>
                            
                            {#if u.roleId !== 'admin'}
                                <form method="POST" action="?/deleteUser" use:enhance bind:this={deleteFormElement}>
                                    <input type="hidden" name="id" value={u.id} />
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        class="text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-2 border-transparent hover:border-rose-100 rounded-xl size-10"
                                        onclick={(e) => triggerDelete(u, (e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}
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

<Dialog.Root bind:open={isCreateDialogOpen}>
    <Dialog.Content class="sm:max-w-[450px]">
        <Dialog.Header>
            <Dialog.Title class="text-2xl font-black">Create User</Dialog.Title>
        </Dialog.Header>
        <form method="POST" action="?/createUser" use:enhance class="space-y-6 pt-4">
            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Username</Label>
                <Input name="username" required minlength={3} maxlength={31} placeholder="Enter username" class="h-11 border-2" />
            </div>
            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Password</Label>
                <Input name="password" type="password" required minlength={6} placeholder="••••••••" class="h-11 border-2" />
            </div>
            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Assign Role</Label>
                <select name="roleId" class="w-full h-11 border-2 border-slate-200 rounded-xl px-4 font-bold text-sm focus:ring-primary-500 focus:border-primary-500 outline-none">
                    {#each data.roles as r}
                        <option value={r.id}>{r.name}</option>
                    {/each}
                </select>
            </div>
            <div class="flex gap-3 pt-4">
                <Button type="button" variant="ghost" class="flex-1 h-12 font-bold" onclick={() => isCreateDialogOpen = false}>
                    Cancel
                </Button>
                <Button type="submit" class="flex-1 h-12 font-black text-base gap-2">
                    <UserPlus size={20} />
                    Create
                </Button>
            </div>
        </form>
    </Dialog.Content>
</Dialog.Root>