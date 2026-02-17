<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Fingerprint, Scan, CreditCard, Wifi, WifiOff, Loader2, X, AlertTriangle, CheckCircle, ChevronRight } from 'lucide-svelte';
    import { cn, appToast } from '$lib/utils';
    import { fade } from 'svelte/transition';

    let {
        personId,
        biometricId,
        personName,
        onDone,
        onSkip
    }: {
        personId: string;
        biometricId: string;
        personName: string;
        onDone: (method: string | null) => void;
        onSkip: () => void;
    } = $props();

    type Step = 'choose' | 'choose-device' | 'card-input' | 'waiting' | 'success' | 'failed';
    let step = $state<Step>('choose');
    let devices = $state<any[]>([]);
    let selectedDeviceSn = $state('');
    let deviceLoading = $state(true);
    let selectedMethod = $state<'face' | 'finger' | 'card' | ''>('');
    let cardNo = $state('');
    let failureCode = $state('');
    let eventSource: EventSource | null = null;

    const onlineDevices = $derived(devices.filter(d => d.isOnline));
    const deviceOnline = $derived(onlineDevices.length > 0);

    onMount(async () => {
        // Check device status
        try {
            const res = await fetch('/api/devices/status');
            const data = await res.json();
            devices = data.devices || [];
            
            // Auto-select if only one online
            if (onlineDevices.length === 1) {
                selectedDeviceSn = onlineDevices[0].serialNumber;
            }
        } catch {}
        deviceLoading = false;

        // Listen for enrollment events via SSE
        eventSource = new EventSource('/api/events');
        
        // ... rest of mount logic ...
    });

    onDestroy(() => {
        eventSource?.close();
    });

    function selectMethod(method: 'face' | 'finger') {
        selectedMethod = method;
        if (onlineDevices.length > 1) {
            step = 'choose-device';
        } else if (onlineDevices.length === 1) {
            selectedDeviceSn = onlineDevices[0].serialNumber;
            startEnroll(method, selectedDeviceSn);
        } else {
            appToast.error('No device connected');
        }
    }

    async function startEnroll(method: 'face' | 'finger', deviceSn: string) {
        selectedDeviceSn = deviceSn;
        step = 'waiting';
        try {
            await fetch('/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personId, method, deviceSn })
            });
        } catch {
            failureCode = 'network';
            step = 'failed';
            appToast.error('Network error during enrollment');
        }
    }

    async function enrollCard() {
        if (!cardNo.trim()) return;
        selectedMethod = 'card';
        try {
            const res = await fetch('/api/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ personId, method: 'card', cardNo: cardNo.trim() })
            });
            if (res.ok) {
                step = 'success';
                return;
            } else {
                failureCode = 'card-failed';
                step = 'failed';
                appToast.error('Failed to register card');
            }
        } catch {
            failureCode = 'network';
            step = 'failed';
            appToast.error('Network error during card registration');
        }
    }

    function handleSkip() {
        // Sync user to device when skipping enrollment so the device knows about them
        fetch('/api/enroll/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ personId })
        }).catch(() => {});
        onSkip();
    }
</script>

<div class="space-y-6">
    {#if step === 'choose'}
        <div in:fade>
            <!-- Device status -->
            <div class="flex items-center gap-2 p-3 rounded-xl mb-5 {deviceOnline ? 'bg-emerald-50 border border-emerald-200' : 'bg-rose-50 border border-rose-200'}">
                {#if deviceLoading}
                    <Loader2 size={16} class="animate-spin text-slate-400" />
                    <span class="text-xs font-bold text-slate-500">Checking device...</span>
                {:else if deviceOnline}
                    <Wifi size={16} class="text-emerald-600" />
                    <span class="text-xs font-bold text-emerald-700">Device connected</span>
                {:else}
                    <WifiOff size={16} class="text-rose-600" />
                    <span class="text-xs font-bold text-rose-700">No device connected</span>
                {/if}
            </div>

            <div class="text-center space-y-1 mb-6">
                <h3 class="text-lg font-black text-slate-900">Enroll on Device</h3>
                <p class="text-sm text-slate-500">Choose enrollment method for <span class="font-bold text-slate-700">{personName}</span></p>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Biometric ID: {biometricId}</p>
            </div>

            <!-- Method cards -->
            <div class="grid grid-cols-3 gap-3">
                <button
                    disabled={!deviceOnline || deviceLoading}
                    onclick={() => selectMethod('face')}
                    class={cn(
                        "group p-5 rounded-2xl border-2 text-center transition-all cursor-pointer",
                        !deviceOnline || deviceLoading
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                            : "border-blue-100 hover:border-blue-300 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700"
                    )}
                >
                    <div class="size-12 rounded-xl mx-auto mb-3 flex items-center justify-center {!deviceOnline || deviceLoading ? 'bg-slate-100' : 'bg-blue-100 group-hover:bg-blue-200'} transition-colors">
                        <Scan size={24} />
                    </div>
                    <p class="font-black text-xs uppercase tracking-wider">Face</p>
                </button>

                <button
                    disabled={!deviceOnline || deviceLoading}
                    onclick={() => selectMethod('finger')}
                    class={cn(
                        "group p-5 rounded-2xl border-2 text-center transition-all cursor-pointer",
                        !deviceOnline || deviceLoading
                            ? "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                            : "border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700"
                    )}
                >
                    <div class="size-12 rounded-xl mx-auto mb-3 flex items-center justify-center {!deviceOnline || deviceLoading ? 'bg-slate-100' : 'bg-emerald-100 group-hover:bg-emerald-200'} transition-colors">
                        <Fingerprint size={24} />
                    </div>
                    <p class="font-black text-xs uppercase tracking-wider">Finger</p>
                </button>

                <button
                    onclick={() => step = 'card-input'}
                    class="group p-5 rounded-2xl border-2 border-amber-100 hover:border-amber-300 hover:bg-amber-50/50 text-slate-600 hover:text-amber-700 text-center transition-all cursor-pointer"
                >
                    <div class="size-12 rounded-xl bg-amber-100 group-hover:bg-amber-200 mx-auto mb-3 flex items-center justify-center transition-colors">
                        <CreditCard size={24} />
                    </div>
                    <p class="font-black text-xs uppercase tracking-wider">Card</p>
                </button>
            </div>

            {#if !deviceOnline && !deviceLoading}
                <p class="text-[10px] font-bold text-rose-400 text-center mt-3">
                    Face and Finger enrollment require a connected device
                </p>
            {/if}

            <Button variant="ghost" onclick={handleSkip} class="w-full mt-4 font-bold text-slate-500">
                Skip Enrollment
            </Button>
        </div>

    {:else if step === 'choose-device'}
        <div class="space-y-5" in:fade>
            <div class="text-center space-y-1">
                <div class="size-14 rounded-2xl bg-blue-100 text-blue-600 mx-auto mb-3 flex items-center justify-center">
                    <Wifi size={28} />
                </div>
                <h3 class="text-lg font-black text-slate-900">Select Device</h3>
                <p class="text-sm text-slate-500">Which device should perform the <span class="font-bold text-primary-700 capitalize">{selectedMethod}</span> enrollment?</p>
            </div>

            <div class="grid grid-cols-1 gap-2">
                {#each onlineDevices as d}
                    <button
                        class="flex items-center justify-between p-4 rounded-xl border-2 border-slate-100 hover:border-primary-300 hover:bg-primary-50 transition-all text-left"
                        onclick={() => startEnroll(selectedMethod as any, d.serialNumber)}
                    >
                        <div>
                            <p class="font-black text-slate-900">{d.name}</p>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">SN: {d.serialNumber}</p>
                        </div>
                        <ChevronRight size={18} class="text-slate-300" />
                    </button>
                {/each}
            </div>

            <Button variant="outline" onclick={() => step = 'choose'} class="w-full font-bold border-2">
                Back
            </Button>
        </div>

    {:else if step === 'card-input'}
        <div class="space-y-5" in:fade>
            <div class="text-center space-y-1">
                <div class="size-14 rounded-2xl bg-amber-100 text-amber-600 mx-auto mb-3 flex items-center justify-center">
                    <CreditCard size={28} />
                </div>
                <h3 class="text-lg font-black text-slate-900">Card Enrollment</h3>
                <p class="text-sm text-slate-500">Enter the card number for <span class="font-bold text-slate-700">{personName}</span></p>
            </div>

            <div class="space-y-2">
                <Label for="enroll-cardNo" class="font-bold uppercase text-[10px] tracking-widest text-slate-500">Card Number</Label>
                <Input id="enroll-cardNo" bind:value={cardNo} class="h-12 border-2 text-center text-lg font-bold tracking-wider" placeholder="Enter card number" />
            </div>

            <div class="flex gap-3">
                <Button variant="outline" onclick={() => { step = 'choose'; cardNo = ''; }} class="flex-1 font-bold border-2">
                    Back
                </Button>
                <Button disabled={!cardNo.trim()} onclick={enrollCard} class="flex-1 font-bold">
                    Register Card
                </Button>
            </div>
        </div>

    {:else if step === 'waiting'}
        <div class="text-center space-y-5 py-6" in:fade>
            <div class="size-20 rounded-full bg-primary-100 mx-auto flex items-center justify-center">
                <Loader2 size={40} class="animate-spin text-primary-600" />
            </div>
            <div class="space-y-1">
                <h3 class="text-lg font-black text-slate-900">Waiting for Enrollment</h3>
                <p class="text-sm text-slate-500">
                    Please complete <span class="font-bold text-primary-700 capitalize">{selectedMethod}</span> enrollment on the device
                </p>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">{personName}</p>
            </div>

            <div class="p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p class="text-xs text-blue-700 font-medium">
                    {#if selectedMethod === 'face'}
                        Ask the person to look at the device camera
                    {:else}
                        Ask the person to place their finger on the scanner
                    {/if}
                </p>
            </div>

            <Button variant="outline" onclick={handleSkip} class="font-bold border-2 text-slate-500">
                <X size={16} class="mr-1" /> Cancel
            </Button>
        </div>

    {:else if step === 'success'}
        <div class="text-center space-y-5 py-6" in:fade>
            <div class="size-20 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <CheckCircle size={40} class="text-emerald-600" />
            </div>
            <div class="space-y-1">
                <h3 class="text-lg font-black text-slate-900">Enrollment Successful!</h3>
                <p class="text-sm text-slate-500">
                    <span class="font-bold text-emerald-700 capitalize">{selectedMethod}</span> enrolled for <span class="font-bold text-slate-700">{personName}</span>
                </p>
                <p class="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Biometric ID: {biometricId}</p>
            </div>

            <Button onclick={() => onDone(selectedMethod)} class="w-full h-12 font-black text-sm uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700">
                Continue
            </Button>
        </div>

    {:else if step === 'failed'}
        <div class="text-center space-y-5 py-6" in:fade>
            <div class="size-20 rounded-full bg-rose-100 mx-auto flex items-center justify-center">
                <AlertTriangle size={40} class="text-rose-600" />
            </div>
            <div class="space-y-1">
                <h3 class="text-lg font-black text-slate-900">Enrollment Failed</h3>
                <p class="text-sm text-slate-500">
                    <span class="font-bold text-rose-700 capitalize">{selectedMethod}</span> enrollment could not be completed
                </p>
                <p class="text-[10px] text-rose-400 font-bold uppercase tracking-widest mt-2">Error code: {failureCode}</p>
            </div>

            <div class="flex gap-3 justify-center">
                <Button variant="outline" onclick={() => { step = 'choose'; failureCode = ''; }} class="font-bold border-2">
                    Try Again
                </Button>
                <Button variant="outline" onclick={handleSkip} class="font-bold border-2 text-slate-500">
                    Close
                </Button>
            </div>
        </div>

    {/if}
</div>
