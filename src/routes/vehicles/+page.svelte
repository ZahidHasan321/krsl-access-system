<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import { LogIn, LogOut, Truck, Search, Plus } from 'lucide-svelte';
    import Button from '$lib/components/ui/Button.svelte';
    import Select from '$lib/components/ui/Select.svelte';
    import Input from '$lib/components/ui/Input.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import EmptyState from '$lib/components/ui/EmptyState.svelte';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import Pagination from '$lib/components/ui/Pagination.svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { goto } from '$app/navigation';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isModalOpen = $state(false);
    let isConfirmOpen = $state(false);
    let itemToCheckOut = $state<string | null>(null);
    let searchQuery = $state('');
    let typeFilter = $state('all');

    let checkoutForm: HTMLFormElement;

    $effect(() => {
        searchQuery = data.query || '';
        typeFilter = data.typeFilter || 'all';
    });

    $effect(() => {
        if (form?.success) {
            isModalOpen = false;
            toast.success(i18n.t('successSaved'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    function updateFilter() {
        const url = new URL(window.location.href);
        if (searchQuery) {
            url.searchParams.set('q', searchQuery);
        } else {
            url.searchParams.delete('q');
        }
        
        if (typeFilter !== 'all') {
            url.searchParams.set('type', typeFilter);
        } else {
            url.searchParams.delete('type');
        }

        url.searchParams.delete('page');
        goto(url.toString(), { keepFocus: true, replaceState: true });
    }

    let timeout: any;
    function debounceSearch() {
        clearTimeout(timeout);
        timeout = setTimeout(updateFilter, 300);
    }

    const typeFilterOptions = $derived([
        { value: 'all', label: i18n.t('all') },
        { value: 'transport', label: i18n.t('transportVehicle') },
        { value: 'regular', label: i18n.t('regularVehicle') }
    ]);

    const vehicleTypeOptions = $derived([
        { value: 'transport', label: i18n.t('transportVehicle') },
        { value: 'regular', label: i18n.t('regularVehicle') }
    ]);

    const canCreate = $derived(data.user?.permissions.includes('vehicles.create'));
</script>

<svelte:head>
    <title>{i18n.t('vehicles')} - {i18n.t('activeLog')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
            <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight font-header">
                {i18n.t('vehicles')} <span class="text-amber-600">/</span> {i18n.t('activeLog')}
            </h1>
            <p class="text-slate-600 font-semibold">{data.activeVehicles.length} {i18n.t('vehicles')} {i18n.t('inside')}</p>
        </div>
        {#if canCreate}
            <Button onclick={() => isModalOpen = true} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                <LogIn size={20} />
                {i18n.t('checkIn')}
            </Button>
        {/if}
    </div>

    <Card className="p-4">
        <div class="flex flex-col sm:flex-row gap-4">
            <div class="relative flex-1">
                <label for="search" class="block text-sm font-medium text-gray-700 mb-1">{i18n.t('vehicleNo')} / {i18n.t('driverName')} / {i18n.t('vendorName')} / {i18n.t('cargo')} / {i18n.t('phone')}</label>
                <div class="relative">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <Input
                        id="search"
                        placeholder={i18n.t('searchPlaceholder')}
                        bind:value={searchQuery}
                        oninput={debounceSearch}
                        className="pl-10"
                        onclear={() => { searchQuery = ''; updateFilter(); }}
                    />
                </div>
            </div>
            <div class="sm:w-48 sm:self-end">
                <Select
                    options={typeFilterOptions}
                    bind:value={typeFilter}
                    onchange={updateFilter}
                />
            </div>
        </div>
    </Card>

    <div class="grid grid-cols-1 gap-4">
        {#if data.activeVehicles.length === 0}
            <Card>
                <EmptyState 
                    title={i18n.t('noResults')} 
                    icon={Truck}
                />
            </Card>
            {#if data.totalPages > 0 || data.activeVehicles.length === 0}
                 <Pagination 
                    currentPage={data.currentPage} 
                    totalPages={data.totalPages} 
                    pageSize={data.pageSize}
                />
            {/if}
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
                        {#each data.activeVehicles as vehicle}
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-6 py-3 align-middle">
                                    <p class="text-sm font-black text-primary-600 font-mono uppercase tracking-widest">{vehicle.vehicleNumber}</p>
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
                                    {#if canCreate}
                                        <Button 
                                            variant="danger" 
                                            onclick={() => { itemToCheckOut = vehicle.id; isConfirmOpen = true; }} 
                                            className="px-3 py-1.5 text-sm h-9 whitespace-nowrap"
                                        >
                                            <LogOut size={16} /> {i18n.t('checkOut')}
                                        </Button>
                                    {/if}
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            </div>

            <!-- Mobile & Tablet Cards -->
            <div class="lg:hidden space-y-4">
                {#each data.activeVehicles as vehicle}
                    <Card className="p-4 space-y-4">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-wider">{i18n.t('vehicleNo')}</p>
                                <p class="text-xl font-black text-primary-600 font-mono">{vehicle.vehicleNumber}</p>
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
                            {#if canCreate}
                                <Button 
                                    variant="danger" 
                                    onclick={() => { itemToCheckOut = vehicle.id; isConfirmOpen = true; }} 
                                    className="w-full"
                                >
                                    <LogOut size={16} /> {i18n.t('checkOut')}
                                </Button>
                            {/if}
                        </div>
                    </Card>
                {/each}
            </div>

            <Pagination 
                currentPage={data.currentPage} 
                totalPages={data.totalPages} 
                pageSize={data.pageSize}
            />
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
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
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

<form 
    bind:this={checkoutForm}
    method="POST" 
    action="?/checkOut" 
    use:enhance
>
    <input type="hidden" name="id" value={itemToCheckOut} />
</form>

<ConfirmModal
    bind:open={isConfirmOpen}
    title={i18n.t('checkOut')}
    message={i18n.t('confirmCheckOut')}
    variant="danger"
    onconfirm={() => checkoutForm.requestSubmit()}
/>
