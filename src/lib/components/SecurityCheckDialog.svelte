<script lang="ts">
    import * as Dialog from '$lib/components/ui/dialog';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Badge } from '$lib/components/ui/badge';
    import { CheckCircle, ShieldAlert, User, Briefcase, MapPin } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { appToast, cn } from '$lib/utils';
    import { getCategoryById, CATEGORIES } from '$lib/constants/categories';
    import type { CheckInData } from '$lib/server/events';
    import { page } from '$app/state';

    let open = $state(false);
    let data = $state<CheckInData | null>(null);
    let purpose = $state('');
    let isLoading = $state(false);

    // Hardcoded check: Only the 'guard' role sees this verification dialog.
    // Admin and other roles are excluded by default.
    const isGuard = $derived(page.data.user?.roleId === 'guard');

    // Helper to find root category
    function getRootCategory(catId: string) {
        let cat = getCategoryById(catId);
        if (!cat) return null;
        while (cat.parentId) {
            const parent = getCategoryById(cat.parentId);
            if (!parent) break;
            cat = parent;
        }
        return cat;
    }

    export function handleCheckIn(checkInData: CheckInData) {
        if (!isGuard) return;
        
        data = checkInData;
        purpose = '';
        open = true;
    }

    const category = $derived(data ? getCategoryById(data.categoryId) : null);
    const rootCategory = $derived(data ? getRootCategory(data.categoryId) : null);
    const isEmployee = $derived(rootCategory?.slug === 'employee');
    const needsPurpose = $derived(!isEmployee);

    function handleClose() {
        open = false;
        data = null;
    }
</script>

<Dialog.Root bind:open onOpenChange={(v) => !v && handleClose()}>
    <Dialog.Content class="sm:max-w-[500px] p-0 overflow-hidden gap-0">
        {#if data}
            <div class={cn("h-2 w-full", isEmployee ? "bg-emerald-500" : "bg-blue-500")}></div>
            
            <div class="p-6 pb-0">
                <div class="flex items-start gap-5">
                    <!-- Photo -->
                    <div class="size-24 rounded-2xl border-2 border-slate-100 bg-slate-50 overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-300 shadow-sm">
                        {#if data.photoUrl}
                            <img src={data.photoUrl} alt={data.personName} class="size-full object-cover" />
                        {:else}
                            <User size={40} />
                        {/if}
                    </div>

                    <div class="space-y-1.5 flex-1 min-w-0">
                        <div class="flex items-center justify-between">
                            <Badge variant="outline" class={cn("font-black text-[10px] uppercase tracking-wider", isEmployee ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-blue-600 bg-blue-50 border-blue-200")}>
                                {isEmployee ? 'Employee' : 'Visitor'}
                            </Badge>
                            <span class="text-[10px] font-bold text-slate-400">{new Date().toLocaleTimeString()}</span>
                        </div>
                        
                        <h3 class="text-xl font-black text-slate-900 leading-tight">{data.personName}</h3>
                        
                        {#if category}
                            <div class="flex items-center gap-2 text-sm font-medium text-slate-600">
                                <Briefcase size={14} />
                                <span>{category.name}</span>
                            </div>
                        {/if}

                        <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
                            <MapPin size={12} />
                            <span>Checked In via {data.verifyMethod || 'Manual'}</span>
                        </div>
                    </div>
                </div>
            </div>

            <form 
                method="POST" 
                action="/attendance?/updatePurpose" 
                use:enhance={() => {
                    isLoading = true;
                    return async ({ result, update }) => {
                        isLoading = false;
                        if (result.type === 'success') {
                            appToast.success('Purpose updated');
                            open = false;
                        } else {
                            appToast.error('Failed to update purpose');
                        }
                    };
                }}
                class="p-6 space-y-6"
            >
                <input type="hidden" name="logId" value={data.logId} />

                {#if needsPurpose}
                    <div class="space-y-3">
                        <Label for="purpose" class="text-xs font-black uppercase tracking-widest text-slate-500">
                            Purpose of Visit <span class="text-rose-500">*</span>
                        </Label>
                        <Input 
                            id="purpose" 
                            name="purpose" 
                            bind:value={purpose} 
                            placeholder="e.g. Delivery, Meeting with HR..." 
                            class="h-12 border-2 bg-slate-50 focus:bg-white transition-colors"
                            required
                            autofocus
                        />
                    </div>
                {:else}
                    <div class="p-4 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-700">
                        <CheckCircle size={20} />
                        <span class="font-bold text-sm">Employee verified. No further action needed.</span>
                    </div>
                {/if}

                <div class="grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" class="h-12 font-bold" onclick={handleClose}>
                        Close
                    </Button>
                    {#if needsPurpose}
                        <Button type="submit" disabled={isLoading || !purpose.trim()} class="h-12 font-black uppercase tracking-widest">
                            {isLoading ? 'Saving...' : 'Confirm'}
                        </Button>
                    {:else}
                         <Button type="button" onclick={handleClose} class="h-12 font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white">
                            OK
                        </Button>
                    {/if}
                </div>
            </form>
        {/if}
    </Dialog.Content>
</Dialog.Root>
