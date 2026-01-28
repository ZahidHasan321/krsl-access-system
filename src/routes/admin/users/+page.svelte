<script lang="ts">
    import { enhance } from '$app/forms';
    import Button from '$lib/components/ui/Button.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { Users, UserPlus, Trash2, Mail, Shield, Calendar } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data } = $props<{ data: PageData }>();

    let isCreatingUser = $state(false);

    const roleOptions = $derived(data.roles.map((r: typeof data.roles[number]) => ({ value: r.id, label: r.name })));
</script>

<div class="max-w-6xl mx-auto p-6 space-y-8">
    <div class="flex justify-between items-center">
        <div>
            <h1 class="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Users class="text-primary-600" />
                User Management
            </h1>
            <p class="text-gray-500 mt-1">Manage system users, their credentials and assigned roles.</p>
        </div>
        <Button onclick={() => isCreatingUser = true}>
            <UserPlus size={18} class="mr-2" />
            Add User
        </Button>
    </div>

    {#if isCreatingUser}
        <Card class="p-6">
            <h2 class="text-xl font-semibold mb-4">Create New User</h2>
            <form method="POST" action="?/createUser" use:enhance={() => {
                return async ({ result }) => {
                    if (result.type === 'success') {
                        isCreatingUser = false;
                    }
                };
            }} class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <Input name="username" label="Username / Email" required />
                <Input name="password" type="password" label="Password" required />
                <Select name="roleId" label="Assign Role" options={roleOptions} required />
                <div class="flex gap-2">
                    <Button type="submit">Create</Button>
                    <Button variant="ghost" onclick={() => isCreatingUser = false}>Cancel</Button>
                </div>
            </form>
        </Card>
    {/if}

    <div class="grid grid-cols-1 gap-4">
        {#each data.users as u}
            <Card class="p-4 hover:shadow-md transition-shadow">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="flex items-center gap-4">
                        <div class="h-12 w-12 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-gray-900">{u.username}</span>
                                {#if u.roleId}
                                    <Badge variant="secondary">
                                        <Shield size={12} class="mr-1" />
                                        {data.roles.find((r: typeof data.roles[number]) => r.id === u.roleId)?.name || u.roleId}
                                    </Badge>
                                {/if}
                            </div>
                            <div class="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                <span class="flex items-center gap-1">
                                    <Mail size={14} />
                                    {u.username}
                                </span>
                                <span class="flex items-center gap-1">
                                    <Calendar size={14} />
                                    Joined {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Unknown'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-3">
                        <form method="POST" action="?/updateUserRole" use:enhance class="flex items-center gap-2">
                            <input type="hidden" name="userId" value={u.id} />
                            <select 
                                name="roleId" 
                                class="text-sm border-gray-200 rounded-lg focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
                                onchange={(e) => e.currentTarget.form?.requestSubmit()}
                                disabled={u.roleId === 'admin'}
                            >
                                {#each data.roles as r}
                                    <option value={r.id} selected={u.roleId === r.id}>{r.name}</option>
                                {/each}
                            </select>
                        </form>
                        
                        {#if u.roleId !== 'admin'}
                            <form method="POST" action="?/deleteUser" use:enhance>
                                <input type="hidden" name="id" value={u.id} />
                                <Button variant="ghost" class="text-red-600 hover:bg-red-50 hover:text-red-700 p-2">
                                    <Trash2 size={18} />
                                </Button>
                            </form>
                        {/if}
                    </div>
                </div>
            </Card>
        {/each}
    </div>
</div>
