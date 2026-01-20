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
    import { format } from 'date-fns';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let searchQuery = $state('');
    let isModalOpen = $state(false);
    let editingLabour = $state<any>(null);

    const filteredLabours = $derived(
        data.labours.filter((l: any) => 
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.codeNo.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    function openAddModal() {
        editingLabour = null;
        isModalOpen = true;
    }

    function openEditModal(labour: any) {
        editingLabour = {
            ...labour,
            joinDate: labour.joinDate ? format(new Date(labour.joinDate), 'yyyy-MM-dd') : ''
        };
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

    const labourTypeOptions = $derived([
        { value: 'company', label: i18n.t('companyLabour') },
        { value: 'contractor', label: i18n.t('contractorLabour') }
    ]);
</script>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('labours')} - {i18n.t('registry')}</h1>
            <p class="text-gray-500">{data.labours.length} {i18n.t('labours')} {i18n.t('noResults').toLowerCase() === 'no results found.' ? 'total' : 'মোট'}</p>
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
        {#if filteredLabours.length === 0}
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
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('type')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('designation')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('isTrained')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('joinDate')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredLabours as labour}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-mono font-bold text-indigo-600 align-middle">{labour.codeNo}</td>
                                <td class="px-6 py-2 align-middle">
                                    <a href="/labours/{labour.id}" class="text-sm font-bold text-gray-900 hover:text-indigo-600 transition-colors">
                                        {labour.name}
                                    </a>
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={labour.type === 'company' ? 'on_premises' : 'default'}>
                                        {labour.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{labour.designation || '-'}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={labour.isTrained ? 'success' : 'danger'}>
                                        {labour.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">
                                    {labour.joinDate ? format(new Date(labour.joinDate), 'PP') : '-'}
                                </td>
                                <td class="px-6 py-2 text-right align-middle">
                                    <div class="flex items-center justify-end gap-2">
                                        <Button variant="ghost" onclick={() => openEditModal(labour)} className="p-2 h-9 w-9 min-w-0">
                                            <Edit2 size={16} class="text-amber-600" />
                                        </Button>
                                        <form method="POST" action="?/delete" use:enhance class="inline-block">
                                            <input type="hidden" name="id" value={labour.id} />
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
                {#each filteredLabours as labour}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-mono font-bold text-indigo-600">{labour.codeNo}</p>
                                <a href="/labours/{labour.id}" class="text-lg font-bold text-gray-900">{labour.name}</a>
                            </div>
                            <Badge status={labour.type === 'company' ? 'on_premises' : 'default'}>
                                {labour.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                            </Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-gray-500">{i18n.t('designation')}</div>
                            <div class="text-gray-900 font-medium">{labour.designation || '-'}</div>
                            <div class="text-gray-500">{i18n.t('isTrained')}</div>
                            <div>
                                <Badge status={labour.isTrained ? 'success' : 'danger'}>
                                    {labour.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                </Badge>
                            </div>
                            <div class="text-gray-500">{i18n.t('joinDate')}</div>
                            <div class="text-gray-900 font-medium">{labour.joinDate ? format(new Date(labour.joinDate), 'PP') : '-'}</div>
                        </div>
                        <div class="flex gap-2 pt-2 border-t">
                            <Button variant="outline" onclick={() => openEditModal(labour)} className="flex-1">
                                <Edit2 size={16} /> {i18n.t('edit')}
                            </Button>
                            <form method="POST" action="?/delete" use:enhance class="flex-1">
                                <input type="hidden" name="id" value={labour.id} />
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
    title={editingLabour ? i18n.t('edit') + ' ' + i18n.t('labours') : i18n.t('addNew') + ' ' + i18n.t('labours')}
    onclose={() => { editingLabour = null; isModalOpen = false; }}
>
    <form method="POST" action={editingLabour ? "?/update" : "?/create"} use:enhance class="space-y-4">
        {#if editingLabour}
            <input type="hidden" name="id" value={editingLabour.id} />
        {/if}
        
        <Input 
            label={i18n.t('name')} 
            name="name" 
            required 
            value={editingLabour?.name || ''} 
        />
        
        <Input 
            label={i18n.t('codeNo')} 
            name="codeNo" 
            required 
            value={editingLabour?.codeNo || ''} 
        />
        
        <Select 
            label={i18n.t('type')} 
            name="type" 
            required 
            options={labourTypeOptions}
            value={editingLabour?.type || 'company'}
        />
        
        <Input 
            label={i18n.t('designation')} 
            name="designation" 
            value={editingLabour?.designation || ''} 
        />
        
        <Input 
            label={i18n.t('joinDate')} 
            name="joinDate" 
            type="date" 
            value={editingLabour?.joinDate || ''} 
        />
        
        <div class="flex items-center gap-2">
            <input 
                type="checkbox" 
                id="isTrained" 
                name="isTrained" 
                class="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 border-gray-300"
                checked={editingLabour ? editingLabour.isTrained : true}
            />
            <label for="isTrained" class="text-sm font-medium text-gray-700">{i18n.t('isTrained')}</label>
        </div>

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
