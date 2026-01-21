<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import { Users, UserCheck, Truck, ArrowRight } from 'lucide-svelte';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const stats = $derived([
        { 
            label: 'labours', 
            count: data.counts.labours, 
            icon: Users, 
            href: '/labours/attendance',
            color: 'text-primary-600',
            bg: 'bg-primary-50'
        },
        { 
            label: 'visitors', 
            count: data.counts.visitors, 
            icon: UserCheck, 
            href: '/visitors',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        { 
            label: 'vehicles', 
            count: data.counts.vehicles, 
            icon: Truck, 
            href: '/vehicles',
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        }
    ]);
</script>

<svelte:head>
    <title>{i18n.t('dashboard')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-8">
    <div class="flex flex-col gap-2">
        <h1 class="text-4xl font-extrabold text-slate-900 tracking-tight font-header leading-tight py-1">
            {i18n.t('dashboard')}
        </h1>
        <p class="text-slate-600 font-semibold text-lg leading-relaxed py-0.5">
            {new Date().toLocaleDateString(i18n.lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        {#each stats as stat}
            <a href={stat.href} class="block group">
                <Card className="p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 active:scale-95 border-2 border-transparent hover:border-primary-100">
                    <div class="flex items-start justify-between">
                        <div class={stat.bg + " p-4 rounded-2xl " + stat.color}>
                            <stat.icon size={32} />
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-bold text-gray-500 uppercase tracking-wider">
                                {i18n.t(stat.label as any)}
                            </p>
                            <p class="text-4xl font-black text-gray-900 mt-1">
                                {stat.count}
                            </p>
                        </div>
                    </div>
                    
                    <div class="mt-8 flex items-center justify-between text-primary-600 font-bold">
                        <span>{i18n.t('activeLog')}</span>
                        <ArrowRight size={20} class="transition-transform group-hover:translate-x-1" />
                    </div>
                </Card>
            </a>
        {/each}
    </div>
</div>