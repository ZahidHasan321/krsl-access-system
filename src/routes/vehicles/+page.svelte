<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Input } from '$lib/components/ui/input';
    import { Badge } from '$lib/components/ui/badge';
    import * as Dialog from '$lib/components/ui/dialog';
    import { Label } from '$lib/components/ui/label';
    import * as Table from '$lib/components/ui/table';
    import { Truck, Search, LogIn, LogOut, Clock, User, Phone, Package, AlertCircle, History as LucideHistory, CheckCircle2, Loader2, X, RotateCcw, ChevronLeft, ChevronRight, Printer } from 'lucide-svelte';
    import { enhance } from '$app/forms';
    import { toast } from 'svelte-sonner';
    import { format } from 'date-fns';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { cn } from '$lib/utils';
    import type { PageData, ActionData } from './$types';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import logo from '$lib/assets/logo.png';

    let { data, form }: { data: PageData, form: ActionData } = $props();

    let isCheckInOpen = $state(false);
    let searchQuery = $state('');
    let typeFilter = $state('all');
    let debounceTimer: any;

    let isPreparingPrint = $state(false);
    let previousLimit = $state(20);
    let isPrintConfirmOpen = $state(false);

    $effect(() => {
        searchQuery = data.filters.query;
        typeFilter = data.filters.typeFilter;
    });

    $effect(() => {
        if (page.url.searchParams.has('print')) {
            isPreparingPrint = true;
            const timer = setTimeout(() => {
                window.print();
                isPreparingPrint = false;
                const url = new URL(page.url);
                url.searchParams.delete('print');
                url.searchParams.set('limit', previousLimit.toString());
                goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
            }, 1500);
            return () => clearTimeout(timer);
        }
    });

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

    function handleSearchInput() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(applyFilters, 400);
    }

    function applyFilters() {
        const url = new URL(page.url);
        if (searchQuery) url.searchParams.set('q', searchQuery);
        else url.searchParams.delete('q');

        if (typeFilter !== 'all') url.searchParams.set('type', typeFilter);
        else url.searchParams.delete('type');

        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function changeTypeFilter(type: string) {
        typeFilter = type;
        applyFilters();
    }

    function clearFilters() {
        searchQuery = '';
        typeFilter = 'all';
        const url = new URL(page.url);
        url.searchParams.delete('q');
        url.searchParams.delete('type');
        url.searchParams.set('page', '1');
        goto(url.toString(), { keepFocus: true, noScroll: true });
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

    function goToPage(p: number) {
        const url = new URL(page.url);
        url.searchParams.set('page', p.toString());
        goto(url.toString(), { keepFocus: true, noScroll: true });
    }

    function confirmPrint() {
        if (data.pagination.totalCount > 2000) {
            isPrintConfirmOpen = true;
        } else {
            printVehicles();
        }
    }

    function printVehicles() {
        previousLimit = data.pagination.limit;
        const url = new URL(page.url);
        url.searchParams.set('limit', '5000');
        url.searchParams.set('page', '1');
        url.searchParams.set('print', '1');
        goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
    }

    function getPageRange(current: number, total: number) {
        const delta = 1;
        const range = [];
        const rangeWithDots: (number | string)[] = [];
        let l;
        for (let i = 1; i <= total; i++) {
            if (i == 1 || i == total || (i >= current - delta && i <= current + delta)) {
                range.push(i);
            }
        }
        for (let i of range) {
            if (l) {
                if (i - l === 2) {
                    rangeWithDots.push(l + 1);
                } else if (i - l !== 1) {
                    rangeWithDots.push('...');
                }
            }
            rangeWithDots.push(i);
            l = i;
        }
        return rangeWithDots;
    }

    const hasActiveFilters = $derived(
        !!searchQuery || typeFilter !== 'all'
    );
</script>

<svelte:head>
    <title>{i18n.t('vehicles')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="print-only hidden">
    <div class="print-header" style="display: flex !important; justify-content: space-between; align-items: center; padding: 1rem 0; border-bottom: 2px solid #333; margin-bottom: 1rem;">
        <div style="display: flex; align-items: center; gap: 12px;">
            <img src={logo} alt="Logo" style="height: 48px; width: auto;" />
            <div>
                <div style="font-size: 24px; font-weight: 800; margin: 0;">{i18n.t('appName')}</div>
                <p style="font-size: 14px; font-weight: 600; color: #333; margin: 4px 0 0 0;">
                    Vehicles On-Premises Report
                </p>
            </div>
        </div>
        <div style="text-align: right;">
            <p style="font-size: 14px; font-weight: 600; margin: 0;">Generated: {new Date().toLocaleDateString()}</p>
        </div>
    </div>

    <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f5f5f5; border-radius: 4px;">
        <p style="font-size: 14px; font-weight: 600; margin: 0;">
            Total Vehicles: <strong>{data.pagination.totalCount}</strong>
        </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
            <tr style="background: #f0f0f0;">
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">#</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Vehicle No.</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Type</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Driver</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Vendor</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Entry Time</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; font-weight: 700;">Cargo</th>
            </tr>
        </thead>
        <tbody>
            {#each data.activeVehicles as vehicle, index (vehicle.id)}
                <tr>
                    <td style="border: 1px solid #ddd; padding: 8px;">{index + 1}</td>
                    <td style="border: 1px solid #ddd; padding: 8px; font-weight: 600;">{vehicle.vehicleNumber}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{vehicle.driverName || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{vehicle.vendorName || '-'}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{format(new Date(vehicle.entryTime), 'hh:mm a')}</td>
                    <td style="border: 1px solid #ddd; padding: 8px;">{vehicle.cargoDescription || '-'}</td>
                </tr>
            {/each}
        </tbody>
    </table>

    <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #ddd; font-size: 10px; color: #666; text-align: center;">
        Generated by {i18n.t('appName')}
    </div>
</div>

{#if isPreparingPrint}
    <div class="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center">
        <Loader2 class="animate-spin text-primary-600 mb-4" size={48} />
        <h2 class="text-xl font-black text-slate-900">Preparing Print Report...</h2>
        <p class="text-slate-500 font-bold mt-2">Fetching {data.pagination.totalCount} records</p>
    </div>
{/if}

<div class="pb-20 no-print">
    <!-- Sticky Top Bar for Search -->
    <div class="sticky-filter-bar">
        <div class="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
            <!-- Search Section - Left -->
            <div class="flex-1 max-w-md relative group">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors">
                    <Search size={20} />
                </div>
                <Input 
                    bind:value={searchQuery}
                    oninput={handleSearchInput}
                    placeholder={i18n.t('searchPlaceholder')}
                    class="h-12 pl-12 pr-12 bg-white border-2 border-slate-100 rounded-2xl focus-visible:border-primary-500 focus-visible:ring-0 shadow-sm font-bold text-base w-full"
                />
                {#if searchQuery}
                    <button 
                        class="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                        onclick={() => { searchQuery = ''; applyFilters(); }}
                    >
                        <X size={16} />
                    </button>
                {/if}
            </div>

            <!-- Actions - Right -->
            <div class="flex items-center gap-3">
                <Button
                    variant="outline"
                    class="h-12 px-6 rounded-2xl font-black gap-2 border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer"
                    onclick={confirmPrint}
                >
                    <Printer size={18} />
                    <span>Print Report</span>
                </Button>

                <Button variant="outline" class="h-12 px-6 rounded-2xl font-black gap-2 border-2 border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all cursor-pointer" onclick={() => goto('/vehicles/history')}>
                    <LucideHistory size={18} />
                    <span class="hidden sm:inline">{i18n.t('history')}</span>
                </Button>

                {#if hasActiveFilters}
                    <Button 
                        variant="ghost" 
                        class="h-12 px-6 rounded-2xl font-black text-rose-500 hover:bg-rose-50 hover:text-rose-600 gap-2 border-2 border-transparent hover:border-rose-100 transition-all cursor-pointer" 
                        onclick={clearFilters}
                    >
                        <RotateCcw size={18} />
                        Reset
                    </Button>
                {/if}

                <Button class="h-12 px-8 rounded-2xl font-black gap-2 shadow-lg" onclick={() => isCheckInOpen = true}>
                    <LogIn size={20} />
                    {i18n.t('checkIn')}
                </Button>
            </div>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex flex-col md:flex-row gap-8 items-start">
        
        <!-- Sidebar - Sticky -->
        <aside class="w-full md:w-64 shrink-0 md:sticky md:top-36 space-y-6 max-h-[calc(100vh-10rem)] overflow-y-auto pr-2 custom-scrollbar pb-10 print:hidden">
            <!-- Vehicle Type Filter -->
            <div class="space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{i18n.t('vehicleType')}</p>
                <div class="flex flex-col gap-1">
                    <Button
                        variant={typeFilter === 'all' ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 px-3 transition-all cursor-pointer",
                            typeFilter === 'all' ? "bg-primary-600 text-white hover:bg-primary-700 shadow-md" : "text-slate-600"
                        )}
                        onclick={() => changeTypeFilter('all')}
                    >
                        <div class="flex items-center gap-2">
                            {#if typeFilter === 'all'}
                                <div class="size-1.5 rounded-full bg-white animate-pulse"></div>
                            {/if}
                            {i18n.t('all')}
                        </div>
                    </Button>
                    <Button
                        variant={typeFilter === 'transport' ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 px-3 transition-all cursor-pointer",
                            typeFilter === 'transport' ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600 rounded-l-none" : "text-slate-600"
                        )}
                        onclick={() => changeTypeFilter('transport')}
                    >
                        <div class="flex items-center gap-2">
                            {#if typeFilter === 'transport'}
                                <div class="size-1.5 rounded-full bg-primary-600"></div>
                            {/if}
                            {i18n.t('transportVehicle')}
                        </div>
                    </Button>
                    <Button
                        variant={typeFilter === 'regular' ? "secondary" : "ghost"}
                        class={cn(
                            "justify-start font-bold h-10 px-3 transition-all cursor-pointer",
                            typeFilter === 'regular' ? "bg-primary-50 text-primary-700 border-l-4 border-primary-600 rounded-l-none" : "text-slate-600"
                        )}
                        onclick={() => changeTypeFilter('regular')}
                    >
                        <div class="flex items-center gap-2">
                            {#if typeFilter === 'regular'}
                                <div class="size-1.5 rounded-full bg-primary-600"></div>
                            {/if}
                            {i18n.t('regularVehicle')}
                        </div>
                    </Button>
                </div>
            </div>

            <!-- Summary Stats -->
            <div class="p-4 rounded-xl bg-white border-2 border-slate-100 shadow-sm space-y-3">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inside Now</p>
                <div class="space-y-4">
                    <div>
                        <p class="text-3xl font-black text-slate-900">{data.summary.total}</p>
                        <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Vehicles</p>
                    </div>
                    <div class="grid grid-cols-1 gap-3 pt-2 border-t border-slate-50">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-500 uppercase">{i18n.t('transportVehicle')}</span>
                            <span class="text-sm font-black text-primary-600">{data.summary.transport}</span>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-500 uppercase">{i18n.t('regularVehicle')}</span>
                            <span class="text-sm font-black text-emerald-600">{data.summary.regular}</span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Scrolling Content Area -->
        <main class="flex-1 min-w-0 space-y-6">
            <!-- List Section -->
            <div class="space-y-4">
                <!-- Mobile Card View -->
                <div class="lg:hidden space-y-3">
                    {#each data.activeVehicles as vehicle}
                        <Card.Root class="overflow-hidden border-l-4 border-l-amber-500 cursor-pointer hover:shadow-lg transition-shadow bg-white" onclick={() => goto(`/vehicles/${vehicle.id}`)}>
                            <Card.Content class="p-4">
                                <div class="flex items-start justify-between gap-3 mb-3">
                                    <div class="flex-1 min-w-0">
                                        <div class="flex items-center gap-2 flex-wrap mb-1">
                                            <h3 class="text-lg font-black text-slate-900 tracking-widest font-mono uppercase">{vehicle.vehicleNumber}</h3>
                                            <Badge variant="secondary" class="text-[10px] font-bold uppercase shrink-0">
                                                {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                                            </Badge>
                                        </div>
                                        <div class="text-xs font-bold text-slate-500 truncate">
                                            {vehicle.driverName || 'No Driver'} • {vehicle.vendorName || 'No Vendor'}
                                        </div>
                                    </div>
                                    <div class="flex items-center gap-1.5 text-amber-600 font-black shrink-0">
                                        <Clock size={14} />
                                        <span class="text-xs">{format(new Date(vehicle.entryTime), 'hh:mm a')}</span>
                                    </div>
                                </div>
                                
                                <div class="flex items-center justify-between gap-4 mt-4 pt-4 border-t border-slate-50">
                                    <div class="flex items-center gap-1.5 text-slate-400">
                                        <Phone size={14} />
                                        <span class="text-xs font-bold">{vehicle.mobile || 'N/A'}</span>
                                    </div>

                                    <form 
                                        method="POST" 
                                        action="?/checkOut" 
                                        use:enhance 
                                        onsubmit={(e: SubmitEvent) => e.stopPropagation()} 
                                    >
                                        <input type="hidden" name="id" value={vehicle.id} />
                                        <Button 
                                            type="submit" 
                                            variant="outline" 
                                            size="sm" 
                                            class="h-9 border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-black px-4 gap-1.5"
                                            onclick={(e: MouseEvent) => e.stopPropagation()}
                                        >
                                            <LogOut size={14} />
                                            {i18n.t('checkOut')}
                                        </Button>
                                    </form>
                                </div>
                            </Card.Content>
                        </Card.Root>
                    {:else}
                        <div class="py-20 text-center space-y-4">
                            <div class="size-20 bg-white rounded-full flex items-center justify-center mx-auto text-slate-300 border-2 border-slate-100 shadow-sm">
                                <Truck size={40} />
                            </div>
                            <p class="text-slate-500 font-bold">{i18n.t('noResults')}</p>
                        </div>
                    {/each}
                </div>

                <!-- Desktop Table View -->
                <div class="hidden lg:block">
                    <Card.Root class="border-2 shadow-sm rounded-3xl overflow-hidden bg-white">
                        <Table.Root>
                            <Table.Header>
                                                                    <Table.Row class="bg-slate-50 hover:bg-transparent">
                                                                        <Table.Head class="font-black text-slate-900">{i18n.t('vehicleNo')}</Table.Head>
                                                                        <Table.Head class="font-black text-slate-900">{i18n.t('vehicleType')}</Table.Head>
                                                                        <Table.Head class="font-black text-slate-900">{i18n.t('driverName')}</Table.Head>
                                                                        <Table.Head class="font-black text-slate-900">{i18n.t('vendorName')}</Table.Head>
                                                                        <Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
                                                                        <Table.Head class="text-right font-black text-slate-900 print:hidden">{i18n.t('actions')}</Table.Head>
                                                                    </Table.Row>
                                
                            </Table.Header>
                            <Table.Body>
                                {#each data.activeVehicles as vehicle}
                                    <Table.Row class="cursor-pointer group" onclick={() => goto(`/vehicles/${vehicle.id}`)}>
                                        <Table.Cell class="py-4">
                                            <div class="font-black text-slate-900 group-hover:text-primary-600 transition-colors tracking-widest font-mono uppercase">{vehicle.vehicleNumber}</div>
                                            <div class="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                {vehicle.cargoDescription || 'No Cargo Description'}
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <Badge variant="secondary" class="font-bold text-[10px] uppercase tracking-wider">
                                                {vehicle.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                                            </Badge>
                                        </Table.Cell>
                                        <Table.Cell>
                                            <div class="font-bold text-slate-700">{vehicle.driverName || '-'}</div>
                                            <div class="text-[10px] font-bold text-slate-400">{vehicle.mobile || '-'}</div>
                                        </Table.Cell>
                                        <Table.Cell class="font-medium text-slate-500">{vehicle.vendorName || '-'}</Table.Cell>
                                        <Table.Cell>
                                            <div class="flex items-center gap-1.5 text-slate-900 font-black">
                                                <Clock size={16} class="text-amber-500" />
                                                <span>{format(new Date(vehicle.entryTime), 'hh:mm a')}</span>
                                            </div>
                                        </Table.Cell>
                                        <Table.Cell class="text-right print:hidden">
                                            <div class="flex items-center justify-end gap-2">
                                                <form 
                                                    method="POST" 
                                                    action="?/checkOut" 
                                                    use:enhance 
                                                    onsubmit={(e: SubmitEvent) => e.stopPropagation()} 
                                                >
                                                    <input type="hidden" name="id" value={vehicle.id} />
                                                    <Button 
                                                        type="submit" 
                                                        variant="outline" 
                                                        size="sm" 
                                                        class="h-10 border-2 border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-black px-4 gap-2"
                                                        onclick={(e: MouseEvent) => e.stopPropagation()}
                                                    >
                                                        <LogOut size={16} />
                                                        {i18n.t('checkOut')}
                                                    </Button>
                                                </form>
                                            </div>
                                        </Table.Cell>
                                    </Table.Row>
                                {:else}
                                    <Table.Row>
                                        <Table.Cell colspan={6} class="h-64 text-center text-slate-400 font-bold">{i18n.t('noResults')}</Table.Cell>
                                    </Table.Row>
                                {/each}
                            </Table.Body>
                        </Table.Root>
                    </Card.Root>
                </div>

                <!-- Pagination (Improved UI) -->
                {#if data.pagination.totalPages > 1}
                    <div class="flex flex-col lg:flex-row items-center justify-between gap-6 py-8 px-4 border-t border-slate-200 mt-6 print:hidden">
                        <!-- Left: Info -->
                        <div class="text-sm font-bold text-slate-400 order-2 lg:order-1">
                            Showing <span class="text-slate-900">{(data.pagination.page - 1) * data.pagination.limit + 1}</span> 
                            to <span class="text-slate-900">{Math.min(data.pagination.page * data.pagination.limit, data.pagination.totalCount)}</span> 
                            of <span class="text-slate-900">{data.pagination.totalCount}</span> results
                        </div>

                        <!-- Center: Page Numbers -->
                        <div class="flex items-center gap-1 order-1 lg:order-2">
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                class="h-10 px-3 rounded-xl font-bold gap-1 cursor-pointer"
                                disabled={data.pagination.page === 1}
                                onclick={() => goToPage(data.pagination.page - 1)}
                            >
                                <ChevronLeft size={16} />
                                <span class="hidden sm:inline">Prev</span>
                            </Button>

                            <div class="flex items-center gap-1 mx-2">
                                {#each getPageRange(data.pagination.page, data.pagination.totalPages) as p}
                                    {#if p === '...'}
                                        <span class="px-2 text-slate-300">...</span>
                                    {:else}
                                        <Button 
                                            variant={data.pagination.page === p ? "default" : "ghost"}
                                            size="sm"
                                            class={cn(
                                                "h-10 w-10 rounded-xl font-black text-xs cursor-pointer transition-all",
                                                data.pagination.page === p ? "shadow-md scale-110" : "text-slate-500 hover:bg-slate-100"
                                            )}
                                            onclick={() => goToPage(p as number)}
                                        >
                                            {p}
                                        </Button>
                                    {/if}
                                {/each}
                            </div>

                            <Button 
                                variant="ghost" 
                                size="sm" 
                                class="h-10 px-3 rounded-xl font-bold gap-1 cursor-pointer"
                                disabled={data.pagination.page === data.pagination.totalPages}
                                onclick={() => goToPage(data.pagination.page + 1)}
                            >
                                <span class="hidden sm:inline">Next</span>
                                <ChevronRight size={16} />
                            </Button>
                        </div>

                        <!-- Right: Row Count -->
                        <div class="flex items-center gap-3 order-3">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Per Page</span>
                            <select 
                                class="bg-white border-2 border-slate-100 rounded-xl text-xs font-black px-3 py-2 focus:outline-none focus:border-primary-500 transition-colors cursor-pointer shadow-sm hover:border-slate-200"
                                value={data.pagination.limit}
                                onchange={(e) => {
                                    const url = new URL(page.url);
                                    url.searchParams.set('limit', (e.currentTarget as HTMLSelectElement).value);
                                    url.searchParams.set('page', '1');
                                    goto(url.toString(), { keepFocus: true, noScroll: true });
                                }}
                            >
                                {#each [10, 20, 50, 100] as limit}
                                    <option value={limit}>{limit}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                {/if}
            </div>
        </main>
    </div>
</div>

<ConfirmModal
    bind:open={isPrintConfirmOpen}
    title="Large Report Warning"
    message="This list contains {data.pagination.totalCount} records. Printing more than 2,000 records may slow down your browser or take a long time to load. Are you sure you want to proceed?"
    confirmText="Print Anyway"
    cancelText="Cancel"
    variant="warning"
    onconfirm={printVehicles}
/>

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
                        <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('helperName')}</Label>
                        <Input name="helperName" class="h-11 border-2" placeholder="Helper's name" />
                    </div>
                </div>

                <div class="space-y-2">
                    <Label class="font-bold text-xs uppercase tracking-widest text-slate-500">{i18n.t('phone')}</Label>
                    <Input name="mobile" class="h-11 border-2" placeholder="Phone number" />
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