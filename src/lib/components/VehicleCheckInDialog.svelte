<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Badge } from '$lib/components/ui/badge';
    import { Skeleton } from '$lib/components/ui/skeleton';
    import { appToast } from '$lib/utils';
    import { Truck, Search, LogIn, Clock, User, Phone, Package, AlertCircle, History as LucideHistory, CheckCircle2, Loader2 } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { format } from 'date-fns';

    let { open = $bindable() } = $props<{ open: boolean }>();

    let vehicleNumber = $state('');
    let isLookingUp = $state(false);
    let vehicleLookup = $state<any>(null);
    let lookupDebounce: ReturnType<typeof setTimeout>;

    async function lookupVehicle() {
        if (vehicleNumber.length < 3) {
            vehicleLookup = null;
            isLookingUp = false;
            return;
        }

        isLookingUp = true;
        clearTimeout(lookupDebounce);
        lookupDebounce = setTimeout(async () => {
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

    function resetDialog() {
        vehicleNumber = '';
        vehicleLookup = null;
        isLookingUp = false;
    }

    $effect(() => {
        if (!open) {
            setTimeout(resetDialog, 300);
        }
    });
</script>

<Dialog.Root bind:open>
    <Dialog.Content class="sm:max-w-[550px] p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div class="p-6 border-b bg-slate-50 shrink-0">
            <Dialog.Title class="text-2xl font-black">{i18n.t('checkIn')} {i18n.t('vehicles')}</Dialog.Title>
            <Dialog.Description class="font-bold text-xs uppercase tracking-widest text-slate-500">
                Enter vehicle details
            </Dialog.Description>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
            <form method="POST" action="/vehicles?/checkIn" use:enhance={() => {
                return async ({ result, update }) => {
                                                    if (result.type === 'success') {
                                                        open = false;
                                                        await update();
                                                    } else if (result.type === 'failure') {
                                                        const msg = (result.data as any)?.message || 'Check-in failed';
                                                        appToast.error(msg);
                                                    } else if (result.type === 'error') {
                                                        appToast.error('An unexpected error occurred');
                                                    }                };
            }} class="space-y-5">
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
                    </div>
                </div>

                <!-- Vehicle History Lookup Result -->
                {#if isLookingUp || (vehicleLookup && vehicleNumber.length >= 3)}
                    <div class="animate-in fade-in slide-in-from-top-2 duration-200">
                        {#if isLookingUp}
                            <div class="p-4 rounded-xl border-2 border-slate-50 space-y-3">
                                <div class="flex items-center gap-2">
                                    <Skeleton class="size-4 rounded-full" />
                                    <Skeleton class="h-4 w-[120px]" />
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <Skeleton class="h-10 w-full rounded-lg" />
                                    <Skeleton class="h-10 w-full rounded-lg" />
                                </div>
                            </div>
                        {:else if vehicleLookup}
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
                    </div>
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
                    <Button type="button" variant="ghost" class="flex-1 h-12 font-bold" onclick={() => open = false}>
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
