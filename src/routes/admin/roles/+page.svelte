<script lang="ts">
    import { enhance } from '$app/forms';
    import Button from '$lib/components/ui/Button.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { Shield, Plus, Trash2, CheckCircle2 } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    // svelte-ignore state_referenced_locally
    let selectedRole = $state(data.roles[0]?.id || '');
    let role = $derived(data.roles.find((r: typeof data.roles[number]) => r.id === selectedRole));

    let isCreatingRole = $state(false);
</script>

<div class="max-w-6xl mx-auto p-6 space-y-8">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Shield class="text-primary-600" />
                Role Management
            </h1>
            <p class="text-gray-500 mt-1">Configure system roles and their associated permissions.</p>
        </div>
        <Button onclick={() => isCreatingRole = true}>
            <Plus size={18} class="mr-2" />
            Create Role
        </Button>
    </div>

    {#if isCreatingRole}
        <Card class="p-6">
            <h2 class="text-xl font-semibold mb-4">Create New Role</h2>
            <form method="POST" action="?/createRole" use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        isCreatingRole = false;
                    }
                };
            }} class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <Input name="id" label="Role ID (e.g., manager)" required />
                <Input name="name" label="Display Name" required />
                <Input name="description" label="Description" />
                <div class="flex gap-2">
                    <Button type="submit">Create</Button>
                    <Button variant="ghost" onclick={() => isCreatingRole = false}>Cancel</Button>
                </div>
            </form>
        </Card>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <!-- Role List -->
        <div class="lg:col-span-1 space-y-2">
            <h2 class="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 px-2">System Roles</h2>
            {#each data.roles as r}
                <button
                    onclick={() => selectedRole = r.id}
                    class="w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group {selectedRole === r.id ? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-200' : 'hover:bg-gray-50 text-gray-600'}"
                >
                    <div>
                        <p class="font-semibold">{r.name}</p>
                        <p class="text-xs opacity-70">{r.id}</p>
                    </div>
                    {#if selectedRole === r.id}
                        <div class="h-2 w-2 rounded-full bg-primary-600"></div>
                    {/if}
                </button>
            {/each}
        </div>

        <!-- Permissions Editor -->
        <div class="lg:col-span-3">
            {#if role}
                <Card class="p-8">
                    <div class="flex justify-between items-start mb-8">
                        <div>
                            <div class="flex items-center gap-3">
                                <h2 class="text-2xl font-bold text-gray-900">{role.name}</h2>
                                <Badge variant="outline">{role.id}</Badge>
                            </div>
                            <p class="text-gray-500 mt-1">{role.description || 'No description provided.'}</p>
                        </div>
                        {#if role.id !== 'admin'}
                            <form method="POST" action="?/deleteRole" use:enhance>
                                <input type="hidden" name="id" value={role.id} />
                                <Button variant="ghost" class="text-red-600 hover:bg-red-50 hover:text-red-700">
                                    <Trash2 size={18} class="mr-2" />
                                    Delete Role
                                </Button>
                            </form>
                        {/if}
                    </div>

                    <form method="POST" action="?/updatePermissions" use:enhance>
                        <input type="hidden" name="roleId" value={role.id} />
                        
                        {#if role.id === 'admin'}
                            <div class="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-amber-800">
                                <Shield size={20} class="shrink-0" />
                                <p class="text-sm font-medium">This role is system-protected. Administrators always have full access to all permissions.</p>
                            </div>
                        {/if}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {#each data.allPermissions as perm}
                                <label class="flex items-start gap-3 p-4 border rounded-xl transition-colors {role.id === 'admin' ? 'bg-gray-50 opacity-80 cursor-not-allowed' : 'hover:bg-gray-50 cursor-pointer group'}">
                                    <input 
                                        type="checkbox" 
                                        name="permissions" 
                                        value={perm.id} 
                                        checked={role.id === 'admin' || role.permissions.includes(perm.id)}
                                        disabled={role.id === 'admin'}
                                        class="mt-1 w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 disabled:opacity-50"
                                    />
                                    <div>
                                        <p class="text-sm font-bold text-gray-900 {role.id !== 'admin' ? 'group-hover:text-primary-700' : ''} transition-colors">{perm.id}</p>
                                        <p class="text-xs text-gray-500">{perm.description}</p>
                                    </div>
                                </label>
                            {/each}
                        </div>

                        {#if role.id !== 'admin'}
                            <div class="mt-8 flex justify-end">
                                <Button type="submit">
                                    <CheckCircle2 size={18} class="mr-2" />
                                    Save Permissions
                                </Button>
                            </div>
                        {/if}
                    </form>
                </Card>
            {:else}
                <div class="h-64 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed">
                    <Shield size={48} class="mb-4 opacity-20" />
                    <p>Select a role to manage its permissions</p>
                </div>
            {/if}
        </div>
    </div>
</div>
