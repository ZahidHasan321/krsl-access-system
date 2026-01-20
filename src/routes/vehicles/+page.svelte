<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { LogIn, LogOut, Truck, Search, Plus } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);
    let searchQuery = $state('');
    let typeFilter = $state('all');

    const filteredVehicles = $derived(
        data.activeVehicles.filter((v: any) => {
            const matchesType = typeFilter === 'all' || v.type === typeFilter;
            if (!matchesType) return false;
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
                v.vehicleNumber?.toLowerCase().includes(query) ||
                v.driverName?.toLowerCase().includes(query) ||
                v.vendorName?.toLowerCase().includes(query) ||
                v.cargoDescription?.toLowerCase().includes(query) ||
                v.mobile?.toLowerCase().includes(query)
            );
        })
    );

    const typeFilterOptions = $derived([
        { value: 'all', label: i18n.t('all') },
        { value: 'transport', label: i18n.t('transportVehicle') },
        { value: 'regular', label: i18n.t('regularVehicle') }
    ]);

    $effect(() => {
        if (form?.success) {
            isModalOpen = false;
            toast.success(i18n.t('successSaved'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    const vehicleTypeOptions = $derived([
        { value: 'transport', label: i18n.t('transportVehicle') },
        { value: 'regular', label: i18n.t('regularVehicle') }
    ]);
</script>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-2xl font-black text-gray-900">{i18n.t('vehicles')} - {i18n.t('activeLog')}</h1>
            <p class="text-gray-500">{data.activeVehicles.length} {i18n.t('vehicles')} {i18n.t('inside')}</p>
        </div>
        <Button onclick={() => isModalOpen = true} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
            <LogIn size={20} />
            {i18n.t('checkIn')}
        </Button>
    </div>

    <Card className="p-4">
        <div class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <Input
                    placeholder={i18n.t('searchPlaceholder')}
                    bind:value={searchQuery}
                    className="pl-10"
                />
            </div>
            <div class="sm:w-48">
                <Select
                    options={typeFilterOptions}
                    bind:value={typeFilter}
                />
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if filteredVehicles.length === 0}
            <Card className="p-12 text-center">
                <div class="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <Truck size={32} />
                </div>
                <p class="text-gray-500 font-medium">{i18n.t('noResults')}</p>
                <p class="text-sm text-gray-400 mt-1">{i18n.t('noData')}</p>
            </Card>
        {:else}
            <!-- Desktop Table -->
            <div class="hidden lg:block overflow-hidden rounded-xl border border-gray-100 shadow-sm bg-white">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('vehicleNo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('vehicleType')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('driverName')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('vendorName')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('cargo')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider align-middle">{i18n.t('entryTime')}</th>
                            <th class="px-6 py-2 text-sm font-bold text-gray-500 uppercase tracking-wider text-right align-middle">{i18n.t('actions')}</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        {#each filteredVehicles as vehicle}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-3 align-middle">
                                    <p class="text-sm font-black text-indigo-600 font-mono uppercase tracking-widest">{vehicle.vehicleNumber}</p>
                                </td>
                                <td class="px-6 py-3 align-middle">
                                    <Badge>
                                        {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                                    </Badge>
                                </td>
                                <td class="px-6 py-3 align-middle">
                                    <p class="text-sm font-bold text-gray-900">{vehicle.driverName || '-'}</p>
                                    <p class="text-xs text-gray-500">{vehicle.mobile || '-'}</p>
                                </td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{vehicle.vendorName || '-'}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{vehicle.cargoDescription || '-'}</td>
                                <td class="px-6 py-3 text-sm text-gray-600 align-middle">{format(new Date(vehicle.entryTime), 'p')}</td>
                                <td class="px-6 py-3 text-right align-middle">
                                    <form method="POST" action="?/checkOut" use:enhance class="inline-block">
                                        <input type="hidden" name="id" value={vehicle.id} />
                                        <Button variant="danger" type="submit" className="px-3 py-1.5 text-sm h-9 whitespace-nowrap">
                                            <LogOut size={16} /> {i18n.t('checkOut')}
                                        </Button>
                                    </form>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile & Tablet Cards -->
            <div class="lg:hidden space-y-4">
                {#each filteredVehicles as vehicle}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">{i18n.t('vehicleNo')}</p>
                                <p class="text-xl font-black text-indigo-600 font-mono">{vehicle.vehicleNumber}</p>
                            </div>
                            <Badge status="on_premises">{i18n.t('onPremises')}</Badge>
                        </div>
                        <div class="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p class="text-gray-500">{i18n.t('driverName')}</p>
                                <p class="font-bold text-gray-900">{vehicle.driverName || '-'}</p>
                                <p class="text-xs text-gray-500">{vehicle.mobile || '-'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">{i18n.t('vehicleType')}</p>
                                <p class="font-bold text-gray-900">{vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">{i18n.t('vendorName')}</p>
                                <p class="font-bold text-gray-900">{vehicle.vendorName || '-'}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">{i18n.t('entryTime')}</p>
                                <p class="font-bold text-gray-900">{format(new Date(vehicle.entryTime), 'p')}</p>
                            </div>
                        </div>
                        {#if vehicle.cargoDescription}
                            <div class="bg-gray-50 p-3 rounded-lg border text-sm">
                                <p class="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{i18n.t('cargo')}</p>
                                <p class="text-gray-700">{vehicle.cargoDescription}</p>
                            </div>
                        {/if}
                        <div class="pt-2 border-t">
                            <form method="POST" action="?/checkOut" use:enhance>
                                <input type="hidden" name="id" value={vehicle.id} />
                                <Button variant="danger" type="submit" className="w-full">
                                    <LogOut size={16} /> {i18n.t('checkOut')}
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
    title={i18n.t('checkIn') + ' ' + i18n.t('vehicles')}
    onclose={() => { isModalOpen = false; }}
>
    <form method="POST" action="?/checkIn" use:enhance class="space-y-4">
        <Input 
            label={i18n.t('vehicleNo')} 
            name="vehicleNumber" 
            required 
            placeholder="e.g. DHAKA METRO-T 11-2233"
        />

        <Select 
            label={i18n.t('vehicleType')} 
            name="type" 
            required 
            options={vehicleTypeOptions}
            value="transport"
        />
        
        <div class="grid grid-cols-2 gap-4">
            <Input label={i18n.t('driverName')} name="driverName" />
            <Input label={i18n.t('phone')} name="mobile" />
        </div>

        <Input label={i18n.t('vendorName')} name="vendorName" />

        <div class="flex flex-col gap-1.5">
            <label for="cargoDescription" class="text-sm font-medium text-gray-700">{i18n.t('cargo')}</label>
            <textarea 
                id="cargoDescription"
                name="cargoDescription" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            ></textarea>
        </div>

        <Input label={i18n.t('note')} name="note" />

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
