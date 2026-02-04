<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Label } from '$lib/components/ui/label';
    import { Truck, Search, LogIn, LogOut, Clock, User, Phone, Package, AlertCircle, History as LucideHistory, CheckCircle2, Loader2 } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import type { PageData, ActionData } from './$types';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isCheckInOpen = $state(false);
    let searchQuery = $state(data.query || '');
    let typeFilter = $state(data.typeFilter || 'all');

    // Vehicle lookup state
    let vehicleNumber = $state('');
    let isLookingUp = $state(false);
    let vehicleLookup = $state<any>(null);
    let lookupDebounce: ReturnType<typeof setTimeout>;

    $effect(() => {
        if (form?.success) {
            isCheckInOpen = false;
            vehicleNumber = '';
            vehicleLookup = null;
            toast.success(i18n.t('successCheckIn'));
        } else if (form?.message) {
            toast.error(form.message);
        }
    });

    async function lookupVehicle() {
        if (vehicleNumber.length < 3) {
            vehicleLookup = null;
            return;
        }

        clearTimeout(lookupDebounce);
        lookupDebounce = setTimeout(async () => {
            isLookingUp = true;
            try {
                const res = await fetch(`/api/vehicles/lookup?vehicleNumber=${encodeURIComponent(vehicleNumber)}`);
                if (res.ok) {
                    vehicleLookup = await res.json();
                }
            } catch (e) {
                console.error(e);
            } finally {
                isLookingUp = false;
            }
        }, 400);
    }

    function applyFilters() {
        const url = new URL(page.url);
        if (searchQuery) url.searchParams.set('q', searchQuery);
        else url.searchParams.delete('q');

        if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);
        else url.searchParams.delete('type');

        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true });
    }

    function resetDialog() {
        vehicleNumber = '';
        vehicleLookup = null;
    }

    $effect(() => {
        if (!isCheckInOpen) {
            setTimeout(resetDialog, 300);
        }
    });
</script>

<div class="space-y-6 pb-20">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 class="text-3xl font-black text-slate-900 tracking-tight">{i18n.t('vehicles')}</h1>
            <p class="text-slate-500 font-bold text-sm uppercase tracking-widest mt-1">
                {data.activeVehicles.length} {i18n.t('inside')}
            </p>
        </div>

        <div class="flex items-center gap-3 w-full md:w-auto">
            <div class="relative w-full md:w-64">
                <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input
                    placeholder={i18n.t('searchPlaceholder')}
                    class="pl-10 h-11 border-2 focus-visible:ring-primary-500"
                    bind:value={searchQuery}
                    onkeydown={(e) => e.key === 'Enter' && applyFilters()}
                />
            </div>
            <Button variant="outline" class="h-11 px-4 font-bold gap-2" onclick={() => goto('/vehicles/history')}>
                <LucideHistory size={18} />
                <span class="hidden sm:inline">{i18n.t('history')}</span>
            </Button>
            <Button class="h-11 px-6 font-black gap-2" onclick={() => isCheckInOpen = true}>
                <LogIn size={20} />
                {i18n.t('checkIn')}
            </Button>
        </div>
    </div>

    <div class="flex flex-wrap gap-2">
        <Button
            variant={typeFilter === 'all' ? "default" : "outline"}
            size="sm"
            class="rounded-full font-bold px-4"
            onclick={() => { typeFilter = 'all'; applyFilters(); }}
        >
            {i18n.t('all')}
        </Button>
        <Button
            variant={typeFilter === 'transport' ? "default" : "outline"}
            size="sm"
            class="rounded-full font-bold px-4"
            onclick={() => { typeFilter = 'transport'; applyFilters(); }}
        >
            {i18n.t('transportVehicle')}
        </Button>
        <Button
            variant={typeFilter === 'regular' ? "default" : "outline"}
            size="sm"
            class="rounded-full font-bold px-4"
            onclick={() => { typeFilter = 'regular'; applyFilters(); }}
        >
            {i18n.t('regularVehicle')}
        </Button>
    </div>

    <div class="grid grid-cols-1 gap-4">
        {#each data.activeVehicles as vehicle}
            <Card.Root class="overflow-hidden border-l-4 border-l-amber-500 cursor-pointer hover:shadow-lg transition-shadow" onclick={() => goto(`/vehicles/${vehicle.id}`)}>
                <Card.Content class="p-6">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div class="flex items-center gap-6 min-w-0">
                            <div class="size-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 border-2 border-amber-100">
                                <Truck size={28} />
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <h3 class="text-xl font-black text-slate-900 tracking-widest font-mono uppercase">{vehicle.vehicleNumber}</h3>
                                    <Badge variant="secondary" class="text-[10px] font-bold uppercase tracking-wider">
                                        {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                                    </Badge>
                                </div>
                                <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm font-bold text-slate-500">
                                    <div class="flex items-center gap-1.5">
                                        <User size={14} class="text-slate-400" />
                                        <span>{vehicle.driverName || 'N/A'}</span>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <Phone size={14} class="text-slate-400" />
                                        <span>{vehicle.mobile || 'N/A'}</span>
                                    </div>
                                    <div class="flex items-center gap-1.5">
                                        <Package size={14} class="text-slate-400" />
                                        <span>{vehicle.vendorName || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-wrap items-center gap-6 md:gap-12 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                            <div class="space-y-1">
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{i18n.t('entryTime')}</p>
                                <div class="flex items-center gap-1.5 text-slate-900 font-black mt-1">
                                    <Clock size={16} class="text-amber-500" />
                                    <span>{format(new Date(vehicle.entryTime), 'hh:mm a')}</span>
                                </div>
                            </div>

                            <form method="POST" action="?/checkOut" use:enhance class="w-full md:w-auto" onclick={(e) => e.stopPropagation()}>
                                <input type="hidden" name="id" value={vehicle.id} />
                                <Button type="submit" variant="outline" class="w-full md:w-auto border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-black h-11 px-6 gap-2">
                                    <LogOut size={18} />
                                    {i18n.t('checkOut')}
                                </Button>
                            </form>
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>
        {:else}
            <div class="py-24 text-center space-y-4">
                <div class="size-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Truck size={40} />
                </div>
                <p class="text-slate-500 font-bold">{i18n.t('noResults')}</p>
            </div>
        {/each}
    </div>
</div>

<Dialog.Root bind:open={isCheckInOpen}>
    <Dialog.Content class="sm:max-w-[550px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 border-b bg-slate-50 shrink-0">
            <Dialog.Title class="text-2xl font-black">{i18n.t('checkIn')} {i18n.t('vehicles')}</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                Enter vehicle details
            </Dialog.Description>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
            <form method="POST" action="?/checkIn" use:enhance class="space-y-5">
                <div class="space-y-2">
                    <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('vehicleNo')}</Label>
                    <div class="relative">
                        <Input
                            name="vehicleNumber"
                            required
                            placeholder="e.g. DHAKA METRO-T 11-2233"
                            class="h-12 border-2 font-mono font-bold pr-10"
                            bind:value={vehicleNumber}
                            oninput={lookupVehicle}
                        />
                        {#if isLookingUp}
                            <div class="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 class="animate-spin text-primary-500" size={18} />
                            </div>
                        {/if}
                    </div>
                </div>

                <!-- Vehicle History Lookup Result -->
                {#if vehicleLookup && vehicleNumber.length >= 3}
                    {#if vehicleLookup.currentlyInside}
                        <div class="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
                            <AlertCircle size={20} class="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                <p class="font-bold text-amber-800">This vehicle is currently inside</p>
                                <p class="text-sm text-amber-700 mt-1">
                                    Entered at {format(new Date(vehicleLookup.currentEntry.entryTime), 'hh:mm a')} on {format(new Date(vehicleLookup.currentEntry.date), 'PP')}
                                </p>
                                {#if vehicleLookup.currentEntry.driverName}
                                    <p class="text-sm text-amber-700">Driver: {vehicleLookup.currentEntry.driverName}</p>
                                {/if}
                            </div>
                        </div>
                    {:else if vehicleLookup.found && vehicleLookup.lastVisit}
                        <div class="p-4 rounded-xl bg-blue-50 border-2 border-blue-100 space-y-3">
                            <div class="flex items-center gap-2">
                                <LucideHistory size={16} class="text-blue-600" />
                                <p class="font-bold text-blue-800">Previous Visitor</p>
                                <Badge variant="secondary" class="text-[10px] font-bold">{vehicleLookup.totalVisits} visits</Badge>
                            </div>
                            <div class="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Last Visit</p>
                                    <p class="font-bold text-blue-900">{format(new Date(vehicleLookup.lastVisit.date), 'PP')}</p>
                                </div>
                                {#if vehicleLookup.lastVisit.driverName}
                                    <div>
                                        <p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Driver</p>
                                        <p class="font-bold text-blue-900">{vehicleLookup.lastVisit.driverName}</p>
                                    </div>
                                {/if}
                                {#if vehicleLookup.lastVisit.vendorName}
                                    <div>
                                        <p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Vendor</p>
                                        <p class="font-bold text-blue-900">{vehicleLookup.lastVisit.vendorName}</p>
                                    </div>
                                {/if}
                                <div>
                                    <p class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Type</p>
                                    <p class="font-bold text-blue-900">{vehicleLookup.lastVisit.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}</p>
                                </div>
                            </div>
                        </div>
                    {:else if !vehicleLookup.found}
                        <div class="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border-2 border-emerald-100">
                            <CheckCircle2 size={20} class="text-emerald-600 shrink-0" />
                            <p class="font-bold text-emerald-800">New vehicle - no previous visits found</p>
                        </div>
                    {/if}
                {/if}

                <div class="space-y-2">
                    <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('vehicleType')}</Label>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="radio" name="type" value="transport" id="type-transport" class="peer/transport hidden" checked />
                        <label for="type-transport" class="flex items-center justify-center p-3 rounded-xl border-2 font-bold cursor-pointer transition-all peer-checked/transport:border-primary-500 peer-checked/transport:bg-primary-50">
                            {i18n.t('transportVehicle')}
                        </label>
                        <input type="radio" name="type" value="regular" id="type-regular" class="peer/regular hidden" />
                        <label for="type-regular" class="flex items-center justify-center p-3 rounded-xl border-2 font-bold cursor-pointer transition-all peer-checked/regular:border-primary-500 peer-checked/regular:bg-primary-50">
                            {i18n.t('regularVehicle')}
                        </label>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('driverName')}</Label>
                        <Input name="driverName" class="h-11 border-2" placeholder="Driver's name" />
                    </div>
                    <div class="space-y-2">
                        <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('phone')}</Label>
                        <Input name="mobile" class="h-11 border-2" placeholder="Phone number" />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('vendorName')}</Label>
                    <Input name="vendorName" class="h-11 border-2" placeholder="Company / Vendor name" />
                </div>

                <div class="space-y-2">
                    <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('cargo')}</Label>
                    <Input name="cargoDescription" class="h-11 border-2" placeholder="Cargo description" />
                </div>

                <div class="flex gap-3 pt-2">
                    <Button type="button" variant="ghost" class="flex-1 h-12 font-bold" onclick={() => isCheckInOpen = false}>
                        {i18n.t('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        class="flex-1 h-12 font-black text-base gap-2"
                        disabled={vehicleLookup?.currentlyInside}
                    >
                        <LogIn size={20} />
                        {i18n.t('checkIn')}
                    </Button>
                </div>
            </form>
        </div>
    </Dialog.Content>
</Dialog.Root>
