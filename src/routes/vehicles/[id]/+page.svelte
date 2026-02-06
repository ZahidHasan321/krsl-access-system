<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import * as Card from '$lib/components/ui/card';
    import { Button } from '$lib/components/ui/button';
    import { Badge } from '$lib/components/ui/badge';
    import * as Table from '$lib/components/ui/table';
    import { 
        ChevronLeft, 
        Truck, 
        User, 
        Phone, 
        Building2, 
        Package,
        Clock,
        LogOut,
        History
    } from 'lucide-svelte';
    import type { PageData } from './$types';
    import { format, parseISO } from 'date-fns';

    let { data }: { data: PageData } = $props();

    function formatDuration(seconds: number) {
        if (!seconds) return '0m';
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    }
</script>

<div class="space-y-8 pb-20">
    <div class="flex items-center justify-between">
        <Button variant="ghost" class="font-bold gap-2" href="/vehicles">
            <ChevronLeft size={20} />
            {i18n.t('all')}
        </Button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <!-- Vehicle Info Sidebar -->
        <div class="space-y-6">
            <Card.Root class="overflow-hidden border-2 border-slate-100">
                <div class="bg-slate-50 p-8 flex flex-col items-center text-center border-b-2 border-slate-100">
                    <div class="size-24 rounded-2xl bg-white shadow-lg flex items-center justify-center text-amber-500 mb-6 border-2 border-amber-100">
                        <Truck size={48} />
                    </div>
                    <h2 class="text-2xl font-black text-slate-900 leading-tight font-mono tracking-widest uppercase">{data.entry.vehicleNumber}</h2>
                    <Badge variant="secondary" class="mt-2 font-bold uppercase tracking-widest text-[10px]">
                        {data.entry.type === 'transport' ? i18n.t('transportVehicle') : i18n.t('regularVehicle')}
                    </Badge>
                </div>
                <Card.Content class="p-6 space-y-6">
                    <div class="grid grid-cols-1 gap-4">
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <User size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('driverName')}</p>
                                <p class="font-bold text-slate-900">{data.entry.driverName || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <User size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('helperName')}</p>
                                <p class="font-bold text-slate-900">{data.entry.helperName || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Phone size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('phone')}</p>
                                <p class="font-bold text-slate-900">{data.entry.mobile || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Building2 size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('vendorName')}</p>
                                <p class="font-bold text-slate-900">{data.entry.vendorName || 'N/A'}</p>
                            </div>
                        </div>
                        <div class="flex items-center gap-3">
                            <div class="size-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                                <Package size={18} />
                            </div>
                            <div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{i18n.t('cargo')}</p>
                                <p class="font-bold text-slate-900">{data.entry.cargoDescription || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                </Card.Content>
            </Card.Root>

            {#if data.entry.note}
                <Card.Root class="p-4 bg-slate-50 border-2 border-slate-100">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{i18n.t('note')}</p>
                    <p class="text-sm font-bold text-slate-700">{data.entry.note}</p>
                </Card.Root>
            {/if}
        </div>

        <!-- Main Content: History -->
        <div class="lg:col-span-2 space-y-6">
            <Card.Root class="p-6 border-2 border-slate-100">
                <div class="flex items-center gap-3 mb-8">
                    <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <History size={20} />
                    </div>
                    <h3 class="text-xl font-black text-slate-900 uppercase tracking-tight">Recent Trips</h3>
                </div>

                <div class="overflow-x-auto">
                    <Table.Root>
                        <Table.Header>
                            <Table.Row class="hover:bg-transparent bg-slate-50">
                                <Table.Head class="font-black text-slate-900">{i18n.t('date')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('entryTime')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('exitTime')}</Table.Head>
                                <Table.Head class="font-black text-slate-900">{i18n.t('duration')}</Table.Head>
                            </Table.Row>
                        </Table.Header>
                        <Table.Body>
                            {#each data.history as log (log.id)}
                                <Table.Row>
                                    <Table.Cell class="font-bold text-slate-700">{format(parseISO(log.date), 'PP')}</Table.Cell>
                                    <Table.Cell class="font-black text-slate-900">{format(log.entryTime, 'hh:mm a')}</Table.Cell>
                                    <Table.Cell class="font-black text-slate-900">
                                        {log.exitTime ? format(log.exitTime, 'hh:mm a') : '-'}
                                    </Table.Cell>
                                    <Table.Cell class="font-bold text-slate-500">
                                        {#if log.exitTime}
                                            {formatDuration((log.exitTime.getTime() - log.entryTime.getTime()) / 1000)}
                                        {:else}
                                            <Badge class="bg-emerald-50 text-emerald-700 border-emerald-100">Inside</Badge>
                                        {/if}
                                    </Table.Cell>
                                </Table.Row>
                            {:else}
                                <Table.Row>
                                    <Table.Cell colspan={4} class="h-48 text-center text-slate-400 font-bold">{i18n.t('noData')}</Table.Cell>
                                </Table.Row>
                            {/each}
                        </Table.Body>
                    </Table.Root>
                </div>
            </Card.Root>
        </div>
    </div>
</div>
