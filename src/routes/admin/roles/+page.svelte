<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import { Checkbox } from '$lib/components/ui/checkbox';
    import { Label } from '$lib/components/ui/label';
    import * as Dialog from '$lib/components/ui/dialog';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import { Shield, Plus, Trash2, CheckCircle2, Save, Lock, Settings2 } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { clsx } from 'clsx';
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

<div class="space-y-8 pb-20">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('roleManagement')}</h1>
            <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">
                {data.roles.length} System Roles
            </p>
        </div>
        <Button class="font-black gap-2 h-11 px-6 shadow-lg shadow-primary-100" onclick={() => isCreateDialogOpen = true}>
            <Plus size={20} />
            Create Role
        </Button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Role List -->
        <div class="lg:col-span-1 space-y-3">
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">System Roles</p>
            <div class="flex flex-col gap-1.5">
                {#each data.roles as r}
                    <button
                        onclick={() => selectedRole = r.id}
                        class={clsx(
                            "w-full text-left px-4 py-4 rounded-2xl transition-all flex items-center justify-between group border-2",
                            selectedRole === r.id 
                                ? "bg-primary-50 text-primary-900 border-primary-100 shadow-sm" 
                                : "hover:bg-slate-50 text-slate-600 border-transparent"
                        )}
                    >
                        <div class="flex items-center gap-3">
                            <Shield size={18} class={selectedRole === r.id ? "text-primary-600" : "text-slate-300"} />
                            <div>
                                <p class="font-black leading-tight">{r.name}</p>
                                <p class="text-[10px] font-bold uppercase tracking-widest opacity-50">{r.id}</p>
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        </div>

        <!-- Permissions Editor -->
        <div class="lg:col-span-3">
            {#if role}
                <Card.Root class="border-2 border-slate-100 overflow-hidden">
                    <div class="p-8 border-b-2 border-slate-50 flex justify-between items-start">
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl font-black text-slate-900 leading-tight">{role.name}</h2>
                                <Badge variant="secondary" class="font-bold text-[10px] uppercase tracking-widest bg-slate-100">{role.id}</Badge>
                            </div>
                            <p class="text-slate-500 font-bold mt-2">{role.description || 'No description provided.'}</p>
                        </div>
                        {#if role.id !== 'admin'}
                            <form method="POST" action="?/deleteRole" use:enhance bind:this={deleteFormElement}>
                                <input type="hidden" name="id" value={role.id} />
                                <Button type="button" variant="ghost" class="text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-bold border-2 border-transparent hover:border-rose-100 rounded-xl gap-2" onclick={(e) => triggerDelete((e.currentTarget as HTMLButtonElement).form as HTMLFormElement)}>
                                    <Trash2 size={18} />
                                    Delete Role
                                </Button>
                            </form>
                        {/if}
                    </div>

                    <Card.Content class="p-8">
                        <form method="POST" action="?/updatePermissions" use:enhance={() => {
                            return async ({ result }) => {
                                if (result.type === 'success') toast.success('Permissions updated');
                            };
                        }}>
                            <input type="hidden" name="roleId" value={role.id} />
                            
                            {#if role.id === 'admin'}
                                <div class="mb-8 p-4 bg-amber-50 border-2 border-amber-100 rounded-2xl flex items-center gap-4 text-amber-900">
                                    <div class="size-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                                        <Lock size={20} />
                                    </div>
                                    <p class="text-sm font-bold">This role is system-protected. Administrators always have full access to all permissions.</p>
                                </div>
                            {/if}

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {#each data.allPermissions as perm}
                                    {@const isChecked = role.id === 'admin' || role.permissions.includes(perm.id)}
                                    <label class={clsx(
                                        "flex items-start gap-4 p-5 border-2 rounded-2xl transition-all",
                                        role.id === 'admin' ? "bg-slate-50 border-slate-100 opacity-80 cursor-not-allowed" : "hover:bg-slate-50 border-slate-50 cursor-pointer group"
                                    )}>
                                        <Checkbox 
                                            name="permissions" 
                                            value={perm.id} 
                                            checked={isChecked}
                                            disabled={role.id === 'admin'}
                                            class="mt-0.5"
                                        />
                                        <div>
                                            <p class="text-sm font-black text-slate-900 group-hover:text-primary-700 transition-colors uppercase tracking-tight">{perm.id}</p>
                                            <p class="text-xs font-bold text-slate-400 mt-0.5">{perm.description}</p>
                                        </div>
                                    </label>
                                {/each}
                            </div>

                            {#if role.id !== 'admin'}
                                <div class="mt-10 flex justify-end">
                                    <Button type="submit" class="h-12 px-8 font-black text-base gap-2 shadow-lg shadow-primary-100">
                                        <Save size={20} />
                                        Save Permissions
                                    </Button>
                                </div>
                            {/if}
                        </form>
                    </Card.Content>
                </Card.Root>
            {:else}
                <div class="h-96 flex flex-col items-center justify-center text-slate-300 bg-slate-50 rounded-3xl border-4 border-dashed border-slate-100">
                    <Shield size={64} class="mb-4 opacity-10" />
                    <p class="font-bold uppercase tracking-widest text-xs">Select a role to manage its permissions</p>
                </div>
            {/if}
        </div>
    </div>
</div>

<Dialog.Root bind:open={isCreateDialogOpen}>
    <Dialog.Content class="sm:max-w-[500px]">
        <Dialog.Header>
            <Dialog.Title class="text-2xl font-black">Create Role</Dialog.Title>
        </Dialog.Header>
        <form method="POST" action="?/createRole" use:enhance class="space-y-6 pt-4">
            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Role ID</Label>
                <Input name="id" required placeholder="e.g. manager" class="h-11 border-2" />
            </div>
            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Display Name</Label>
                <Input name="name" required placeholder="e.g. Area Manager" class="h-11 border-2" />
            </div>
            <div class="space-y-2">
                <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">Description</Label>
                <Input name="description" placeholder="Short description of this role" class="h-11 border-2" />
            </div>
            <div class="flex gap-3 pt-4">
                <Button type="button" variant="ghost" class="flex-1 h-12 font-bold" onclick={() => isCreateDialogOpen = false}>
                    Cancel
                </Button>
                <Button type="submit" class="flex-1 h-12 font-black text-base gap-2">
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