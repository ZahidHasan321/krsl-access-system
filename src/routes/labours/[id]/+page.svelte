<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import Badge from '$lib/components/ui/Badge.svelte';
    import { format } from 'date-fns';
    import { User, Calendar, Briefcase, Hash, Info } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
</script>

<div class="space-y-8">
    <!-- Header Card -->
    <Card className="p-6 md:p-8">
        <div class="flex flex-col md:flex-row gap-8 items-start">
            <div class="bg-indigo-100 p-6 rounded-3xl text-indigo-600">
                <User size={64} />
            </div>
            
            <div class="flex-1 space-y-6">
                <div>
                    <h1 class="text-3xl font-black text-gray-900">{data.labour.name}</h1>
                    <p class="text-indigo-600 font-bold flex items-center gap-2 mt-1">
                        <Hash size={16} /> {data.labour.codeNo}
                    </p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Briefcase size={14} /> {i18n.t('designation')}
                        </p>
                        <p class="text-gray-900 font-semibold">{data.labour.designation || '-'}</p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} /> {i18n.t('type')}
                        </p>
                        <Badge status={data.labour.type === 'company' ? 'on_premises' : 'default'}>
                            {data.labour.type === 'company' ? i18n.t('companyLabour') : i18n.t('contractorLabour')}
                        </Badge>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} /> {i18n.t('joinDate')}
                        </p>
                        <p class="text-gray-900 font-semibold">
                            {data.labour.joinDate ? format(new Date(data.labour.joinDate), 'PPP') : '-'}
                        </p>
                    </div>
                    <div class="space-y-1">
                        <p class="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Info size={14} /> {i18n.t('isTrained')}
                        </p>
                        <div>
                            <Badge status={data.labour.isTrained ? 'success' : 'danger'}>
                                {data.labour.isTrained ? i18n.t('certificateOk') : i18n.t('noCertificate')}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Card>

    <!-- History Section -->
    <div class="space-y-4">
        <h2 class="text-xl font-black text-gray-900 px-1">{i18n.t('history')}</h2>
        
        <Card>
            {#if data.logs.length === 0}
                <div class="p-12 text-center text-gray-500">
                    <p>{i18n.t('noData')}</p>
                </div>
            {:else}
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50 border-b">
                            <tr>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('date')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('entryTime')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('exitTime')}</th>
                                <th class="px-6 py-4 text-sm font-bold text-gray-500 uppercase">{i18n.t('status')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            {#each data.logs as log}
                                <tr class="hover:bg-gray-50 transition-colors">
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900">
                                        {format(new Date(log.date), 'PPP')}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-600">
                                        {format(new Date(log.entryTime), 'p')}
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-600">
                                        {log.exitTime ? format(new Date(log.exitTime), 'p') : '-'}
                                    </td>
                                    <td class="px-6 py-4">
                                        <Badge status={log.status}>
                                            {log.status === 'on_premises' ? i18n.t('onPremises') : i18n.t('checkedOut')}
                                        </Badge>
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                    </table>
                </div>
            {/if}
        </Card>
    </div>
</div>
