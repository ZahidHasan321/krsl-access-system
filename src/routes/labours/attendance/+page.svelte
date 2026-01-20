<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { LogIn, LogOut, Search, UserCheck, History } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Combobox from '$lib/components/ui/Combobox.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);
    let selectedLabourId = $state('');
    let searchQuery = $state('');

    const labourOptions = $derived(
        data.labours.map((l: any) => ({
            value: l.id,
            text: `${l.name} (${l.codeNo})`
        }))
    );

    const filteredLogs = $derived(
        data.logs.filter((log: any) => 
            log.labourName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.labourCode.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    $effect(() => {
        if (form?.success) {
            isModalOpen = false;
            selectedLabourId = '';
            toast.success(i18n.t('successSaved'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    const todayDate = format(new Date(), 'yyyy-MM-dd');
</script>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('labours')} - {i18n.t('attendance')}</h1>
            <p class="text-gray-500">{format(new Date(), 'PPP')}</p>
        </div>
        <Button onclick={() => isModalOpen = true} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
            <LogIn size={20} />
            {i18n.t('checkIn')}
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
        {#if filteredLogs.length === 0}
            <Card className="p-12 text-center">
                <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <UserCheck size={32} />
                </div>
                <p class="text-gray-500 font-medium">{i18n.t('noData')}</p>
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden md:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('name')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('codeNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('isTrained')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('exitTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('status')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredLogs as log}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-2 text-sm font-bold text-gray-900 align-middle">{log.labourName}</td>
                                <td class="px-6 py-2 text-sm font-mono font-bold text-indigo-600 align-middle">{log.labourCode}</td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={log.isTrained ? 'success' : 'danger'}>
                                        {log.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">{format(new Date(log.entryTime), 'p')}</td>
                                <td class="px-6 py-2 text-sm text-gray-600 align-middle">
                                    {log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}
                                </td>
                                <td class="px-6 py-2 align-middle">
                                    <Badge status={log.status}>
                                        {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-2 text-right align-middle">
                                    {#if log.status === 'on_premises'}
                                        <form method="POST" action="?/checkOut" use:enhance class="inline-block">
                                            <input type="hidden" name="id" value={log.id} />
                                            <Button variant="danger" type="submit" className="px-3 py-1.5 text-sm h-9">
                                                <LogOut size={16} /> {i18n.t('checkOut')}
                                            </Button>
                                        </form>
                                    {:else}
                                        <span class="text-gray-400 text-xs font-bold uppercase">{i18n.t('checkedOut')}</span>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile Cards -->
            <div class="md:hidden space-y-4">
                {#each filteredLogs as log}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-lg font-bold text-gray-900">{log.labourName}</p>
                                <p class="text-xs font-mono font-bold text-indigo-600">{log.labourCode}</p>
                            </div>
                            <Badge status={log.status}>
                                {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                            </Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-sm">
                            <div class="text-gray-500">{i18n.t('isTrained')}</div>
                            <div>
                                <Badge status={log.isTrained ? 'success' : 'danger'}>
                                    {log.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                                </Badge>
                            </div>
                            <div class="text-gray-500">{i18n.t('entryTime')}</div>
                            <div class="text-gray-900 font-medium">{format(new Date(log.entryTime), 'p')}</div>
                            <div class="text-gray-500">{i18n.t('exitTime')}</div>
                            <div class="text-gray-900 font-medium">{log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}</div>
                        </div>
                        {#if log.status === 'on_premises'}
                            <div class="pt-2 border-t">
                                <form method="POST" action="?/checkOut" use:enhance>
                                    <input type="hidden" name="id" value={log.id} />
                                    <Button variant="danger" type="submit" className="w-full">
                                        <LogOut size={16} /> {i18n.t('checkOut')}
                                    </Button>
                                </form>
                            </div>
                        {/if}
                    </Card>
                {/each}
            </div>
        {/if}
    </div>
</div>

<Modal 
    open={isModalOpen} 
    title={i18n.t('checkIn') + ' ' + i18n.t('labours')}
    onclose={() => { isModalOpen = false; selectedLabourId = ''; }}
>
    <form method="POST" action="?/checkIn" use:enhance class="space-y-6">
        <Combobox
            label={i18n.t('labours')}
            name="labourId"
            required
            options={labourOptions}
            bind:value={selectedLabourId}
            placeholder={i18n.t('searchPlaceholder')}
        />

        <div class="flex gap-3 pt-4">
            <Button variant="outline" onclick={() => isModalOpen = false} className="flex-1">
                {i18n.t('cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {i18n.t('checkIn')}
            </Button>
        </div>
    </form>
</Modal>
