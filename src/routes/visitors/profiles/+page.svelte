<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { Plus, Search, Edit2, Trash2, User } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let searchQuery = $state('');
    let isModalOpen = $state(false);
    let editingProfile = $state<any>(null);

    const filteredProfiles = $derived(
        data.profiles.filter((p: any) => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.contactNo && p.contactNo.includes(searchQuery)) ||
            (p.company && p.company.toLowerCase().includes(searchQuery.toLowerCase()))
        )
    );

    function openAddModal() {
        editingProfile = null;
        isModalOpen = true;
    }

    function openEditModal(profile: any) {
        editingProfile = { ...profile };
        isModalOpen = true;
    }

    $effect(() => {
        if (form?.success) {
            isModalOpen = false;
            toast.success(i18n.t('successSaved'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    const visitorTypeOptions = $derived([
        { value: 'guest', label: i18n.t('guest') },
        { value: 'vendor', label: i18n.t('vendor') },
        { value: 'transport', label: i18n.t('transport') }
    ]);
</script>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('visitors')} - {i18n.t('registry')}</h1>
            <p class="text-gray-500">{data.profiles.length} {i18n.t('visitors')} {i18n.t('noResults').toLowerCase() === 'no results found.' ? 'total' : 'মোট'}</p>
        </div>
        <Button onclick={openAddModal} className="w-full sm:w-auto">
            <Plus size={20} />
            {i18n.t('addNew')}
        </Button>
    </div>

    <Card className="p-4">
        <div class="relative">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <Input 
                placeholder={i18n.t('searchPlaceholder')} 
                bind:value={searchQuery} 
                className="pl-10"
            />
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if filteredProfiles.length === 0}
            <Card className="p-12 text-center">
                <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <User size={32} />
                </div>
                <p class="text-gray-500 font-medium">{i18n.t('noResults')}</p>
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('company')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('phone')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredProfiles as profile}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-bold text-gray-900 align-middle">{profile.name}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{profile.company || '-'}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{profile.contactNo || '-'}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge>
                                        {i18n.t(profile.visitorType as any)}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-right align-middle">
                                    <div class="flex items-center justify-end gap-2">
                                        <Button variant="ghost" onclick={() => openEditModal(profile)} className="p-2 h-9 w-9 min-w-0">
                                            <Edit2 size={16} class="text-amber-600" />
                                        </Button>
                                        <form method="POST" action="?/delete" use:enhance class="inline-block">
                                            <input type="hidden" name="id" value={profile.id} />
                                            <Button variant="ghost" type="submit" className="p-2 h-9 w-9 min-w-0">
                                                <Trash2 size={16} class="text-rose-600" />
                                            </Button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden space-y-4">
                {#each filteredProfiles as profile}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-lg font-bold text-gray-900">{profile.name}</p>
                                <p class="text-sm text-gray-500">{profile.company || '-'}</p>
                            </div>
                            <Badge>
                                {i18n.t(profile.visitorType as any)}
                            </Badge>
                        </div>
                        <div class="text-sm flex items-center gap-2 text-gray-600">
                            <span class="font-bold">{i18n.t('phone')}:</span> {profile.contactNo || '-'}
                        </div>
                        <div class="flex gap-2 pt-2 border-t">
                            <Button variant="outline" onclick={() => openEditModal(profile)} className="flex-1">
                                <Edit2 size={16} /> {i18n.t('edit')}
                            </Button>
                            <form method="POST" action="?/delete" use:enhance class="flex-1">
                                <input type="hidden" name="id" value={profile.id} />
                                <Button variant="danger" type="submit" className="w-full">
                                    <Trash2 size={16} /> {i18n.t('delete')}
                                </Button>
                            </form>
                        </div>
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>

<Modal 
    open={isModalOpen} 
    title={editingProfile ? i18n.t('edit') + ' ' + i18n.t('visitors') : i18n.t('addNew') + ' ' + i18n.t('visitors')}
    onclose={() => { editingProfile = null; isModalOpen = false; }}
>
    <form method="POST" action={editingProfile ? "?/update" : "?/create"} use:enhance class="space-y-4">
        {#if editingProfile}
            <input type="hidden" name="id" value={editingProfile.id} />
        {/if}
        
        <Input 
            label={i18n.t('name')} 
            name="name" 
            required 
            value={editingProfile?.name || ''} 
        />
        
        <Input 
            label={i18n.t('company')} 
            name="company" 
            value={editingProfile?.company || ''} 
        />
        
        <Input 
            label={i18n.t('phone')} 
            name="contactNo" 
            value={editingProfile?.contactNo || ''} 
        />
        
        <Select 
            label={i18n.t('visitorType')} 
            name="visitorType" 
            required 
            options={visitorTypeOptions}
            value={editingProfile?.visitorType || 'guest'}
        />

        {#if !editingProfile}
            <div class="flex items-center gap-2">
                <input 
                    type="checkbox" 
                    id="checkIn" 
                    name="checkIn" 
                    class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                />
                <label for="checkIn" class="text-sm font-medium text-gray-700">{i18n.t('checkInImmediately')}</label>
            </div>
        {/if}

        <div class="flex gap-3 pt-4">
            <Button variant="outline" onclick={() => isModalOpen = false} className="flex-1">
                {i18n.t('cancel')}
            </Button>
            <Button type="submit" className="flex-1">
                {i18n.t('save')}
            </Button>
        </div>
    </form>
</Modal>
