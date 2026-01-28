<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import Card from '$lib/components/ui/Card.svelte';
    import { Users, UserCheck, Truck, ArrowRight, TrendingUp, Calendar, MousePointer2 } from 'lucide-svelte';
    import type { PageData } from './$types';
    import { format, parseISO } from 'date-fns';

    let { data }: { data: PageData } = $props();

    const stats = $derived([
        { 
            label: 'labours', 
            count: data.counts.labours, 
            today: data.today.labours,
            icon: Users, 
            href: '/labours/attendance',
            color: 'text-primary-600',
            bg: 'bg-primary-50'
        },
        { 
            label: 'visitors', 
            count: data.counts.visitors, 
            today: data.today.visitors,
            icon: UserCheck, 
            href: '/visitors',
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        { 
            label: 'vehicles', 
            count: data.counts.vehicles, 
            today: data.today.vehicles,
            icon: Truck, 
            href: '/vehicles',
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        }
    ]);

    // Chart logic
    let chartWidth = $state(800);
    let chartHeight = $state(300);
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };

    const maxCount = $derived(
        Math.max(...data.trends.flatMap(t => [t.labours, t.visitors, t.vehicles]), 5)
    );

    const lastIdx = $derived(data.trends.length - 1);

    function getX(index: number) {
        return padding.left + (index / (data.trends.length - 1)) * (chartWidth - padding.left - padding.right);
    }

    function getY(count: number) {
        return (chartHeight - padding.bottom) - (count / maxCount) * (chartHeight - padding.top - padding.bottom);
    }

    const labourPath = $derived(
        data.trends.map((t, i) => `${getX(i)},${getY(t.labours)}`).join(' L ')
    );
    const visitorPath = $derived(
        data.trends.map((t, i) => `${getX(i)},${getY(t.visitors)}`).join(' L ')
    );
    const vehiclePath = $derived(
        data.trends.map((t, i) => `${getX(i)},${getY(t.vehicles)}`).join(' L ')
    );

    // Click detail logic
    let selectedPoint = $state<any>(null);

    function handlePointClick(trend: any) {
        selectedPoint = trend;
    }

    // Traffic Summary Logic
    const totalTraffic = $derived(data.trends.reduce((sum, t) => sum + t.labours + t.visitors + t.vehicles, 0));
    const labourTraffic = $derived(data.trends.reduce((sum, t) => sum + t.labours, 0));
    const visitorTraffic = $derived(data.trends.reduce((sum, t) => sum + t.visitors, 0));
    const vehicleTraffic = $derived(data.trends.reduce((sum, t) => sum + t.vehicles, 0));

    const totalMonthlyTraffic = $derived(data.monthlyTraffic.labours + data.monthlyTraffic.visitors + data.monthlyTraffic.vehicles);
</script>

<svelte:head>
    <title>{i18n.t('dashboard')} | {i18n.t('appName')}</title>
</svelte:head>

<div class="space-y-10 pb-10">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div class="space-y-1">
            <h1 class="text-4xl font-black text-slate-900 tracking-tight font-header leading-tight">
                {i18n.t('dashboard')}
            </h1>
            <div class="flex items-center gap-2 text-slate-500 font-bold">
                <Calendar size={18} />
                <span>{new Date().toLocaleDateString(i18n.lang === 'bn' ? 'bn-BD' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
        </div>
    </div>

    <!-- Top Stats -->
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
                    
                    <div class="mt-8 flex items-center justify-between">
                        <div class="space-y-1">
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{i18n.lang === 'bn' ? 'আজকের মোট' : "Today's Total"}</p>
                            <p class="text-lg font-black text-slate-700">{stat.today}</p>
                        </div>
                        <div class="flex items-center gap-2 text-primary-600 font-bold group-hover:gap-3 transition-all">
                            <span class="text-sm">{i18n.t('inside')}</span>
                            <ArrowRight size={18} />
                        </div>
                    </div>
                </Card>
            </a>
        {/each}
    </div>

    <!-- Chart Section -->
    <div class="space-y-6">
        <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-3">
                <div class="p-2 bg-primary-100 text-primary-600 rounded-lg">
                    <TrendingUp size={20} />
                </div>
                <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">
                    {i18n.lang === 'bn' ? 'গত ৩০ দিনের প্রবেশ' : 'Last 30 Days Entries'}
                </h2>
            </div>
            {#if selectedPoint}
                <div class="bg-slate-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 animate-in fade-in zoom-in slide-in-from-right-4 duration-300 shadow-xl border border-slate-700">
                    <span class="text-slate-400">{format(parseISO(selectedPoint.date), 'PP')}</span>
                    <div class="flex flex-wrap gap-x-4 gap-y-1 sm:border-l sm:border-white/10 sm:pl-4">
                        <div class="flex items-center gap-1.5">
                            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                            <span>{i18n.t('labours')}: <span class="text-white font-black">{selectedPoint.labours}</span></span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span>{i18n.t('visitors')}: <span class="text-white font-black">{selectedPoint.visitors}</span></span>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <div class="w-2 h-2 rounded-full bg-amber-500"></div>
                            <span>{i18n.t('vehicles')}: <span class="text-white font-black">{selectedPoint.vehicles}</span></span>
                        </div>
                    </div>
                    <button onclick={() => selectedPoint = null} class="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600 transition-colors">
                        <ArrowRight size={12} class="rotate-45" />
                    </button>
                </div>
            {:else}
                <div class="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                    <MousePointer2 size={14} />
                    <span>{i18n.lang === 'bn' ? 'তথ্য দেখতে ক্লিক করুন' : 'Click points for details'}</span>
                </div>
            {/if}
        </div>

        <Card className="p-6 overflow-hidden">
            <div class="mb-8 flex flex-wrap gap-6 text-sm font-bold">
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-primary-500"></div>
                    <span class="text-slate-600">{i18n.t('labours')}</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span class="text-slate-600">{i18n.t('visitors')}</span>
                </div>
                <div class="flex items-center gap-2">
                    <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                    <span class="text-slate-600">{i18n.t('vehicles')}</span>
                </div>
            </div>

            <div class="relative w-full overflow-x-auto overflow-y-hidden pt-2" bind:clientWidth={chartWidth}>
                <svg width={chartWidth} height={chartHeight} class="overflow-visible">
                    {#each [0, 0.25, 0.5, 0.75, 1] as tick}
                        {@const y = getY(tick * maxCount)}
                        <line x1={padding.left} y1={y} x2={chartWidth - padding.right} y2={y} stroke="#f1f5f9" stroke-width="1" />
                        <text x={padding.left - 10} y={y} text-anchor="end" dominant-baseline="middle" class="text-[10px] font-bold fill-slate-400">
                            {Math.round(tick * maxCount)}
                        </text>
                    {/each}

                    {#each data.trends as trend, i}
                        {#if i % 5 === 0 || i === data.trends.length - 1}
                            <text x={getX(i)} y={chartHeight - padding.bottom + 20} text-anchor="middle" class="text-[10px] font-bold fill-slate-400">
                                {format(parseISO(trend.date), 'MMM d')}
                            </text>
                        {/if}
                    {/each}

                    <path d={`M ${labourPath}`} fill="none" stroke="#3b82f6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="transition-all duration-1000 opacity-80" />
                    <path d={`M ${visitorPath}`} fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="transition-all duration-1000 opacity-80" />
                    <path d={`M ${vehiclePath}`} fill="none" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="transition-all duration-1000 opacity-80" />

                    {#each data.trends as trend, i}
                        {@const lx = getX(i)}
                        <!-- Transparent hover target -->
                        <rect 
                            x={lx - 10} y={padding.top} width="20" height={chartHeight - padding.top - padding.bottom} 
                            fill="transparent" 
                            class="cursor-pointer hover:fill-slate-50/50 outline-none"
                            role="button"
                            tabindex="0"
                            onclick={() => handlePointClick(trend)}
                            onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && handlePointClick(trend)}
                        />
                        
                        <!-- Invisible dots that show on hover or stay if selected -->
                        <circle cx={lx} cy={getY(trend.labours)} r="4" fill="#3b82f6" class="opacity-0 group-hover:opacity-100 {selectedPoint?.date === trend.date ? 'opacity-100' : ''} pointer-events-none" />
                        <circle cx={lx} cy={getY(trend.visitors)} r="4" fill="#10b981" class="opacity-0 group-hover:opacity-100 {selectedPoint?.date === trend.date ? 'opacity-100' : ''} pointer-events-none" />
                        <circle cx={lx} cy={getY(trend.vehicles)} r="4" fill="#f59e0b" class="opacity-0 group-hover:opacity-100 {selectedPoint?.date === trend.date ? 'opacity-100' : ''} pointer-events-none" />
                    {/each}
                </svg>
            </div>
        </Card>
    </div>

    <!-- Traffic Summary Section -->
    <div class="space-y-6">
        <div class="flex items-center gap-3 px-1">
            <div class="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <TrendingUp size={20} />
            </div>
            <h2 class="text-xl font-black text-slate-900 uppercase tracking-tight">
                {i18n.lang === 'bn' ? 'ট্রাফিক সারসংক্ষেপ' : "Traffic Summary"}
            </h2>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Total Traffic Summary (30 Days) -->
            <Card className="p-8 border-2 border-slate-100 hover:border-primary-100 transition-colors relative overflow-hidden group">
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                                {i18n.lang === 'bn' ? 'মোট প্রবেশ (গত ৩০ দিন)' : 'Total Visits (Last 30d)'}
                            </h3>
                            <p class="text-5xl font-black text-slate-900">
                                {totalTraffic}
                            </p>
                        </div>
                        <div class="p-4 bg-slate-900 text-white rounded-2xl group-hover:scale-110 transition-transform duration-500">
                            <TrendingUp size={32} />
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-3 gap-4">
                        <div class="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                            <p class="text-[10px] font-black text-primary-600 uppercase tracking-wider mb-1">{i18n.t('labours')}</p>
                            <p class="text-2xl font-black text-primary-700">{labourTraffic}</p>
                        </div>
                        <div class="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p class="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">{i18n.t('visitors')}</p>
                            <p class="text-2xl font-black text-emerald-700">{visitorTraffic}</p>
                        </div>
                        <div class="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                            <p class="text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">{i18n.t('vehicles')}</p>
                            <p class="text-2xl font-black text-amber-700">{vehicleTraffic}</p>
                        </div>
                    </div>
                </div>
                <div class="absolute -right-20 -bottom-20 opacity-[0.03] text-slate-900 transform -rotate-12 pointer-events-none">
                    <TrendingUp size={320} />
                </div>
            </Card>

            <!-- Current Month Traffic breakdown -->
            <Card className="p-8 border-2 border-slate-100 hover:border-indigo-100 transition-colors relative overflow-hidden group">
                <div class="relative z-10">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <h3 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-1">
                                {i18n.lang === 'bn' ? 'চলতি মাসের ট্রাফিক' : 'Current Month Traffic'}
                            </h3>
                            <div class="flex items-center gap-2 text-indigo-600 font-black text-sm mb-4">
                                <Calendar size={14} />
                                <span>{format(new Date(), 'MMMM yyyy')}</span>
                            </div>
                            <p class="text-5xl font-black text-slate-900">
                                {totalMonthlyTraffic}
                            </p>
                        </div>
                        <div class="p-4 bg-indigo-600 text-white rounded-2xl group-hover:scale-110 transition-transform duration-500 shadow-lg shadow-indigo-100">
                            <TrendingUp size={32} />
                        </div>
                    </div>

                    <div class="mb-8">
                        <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            <span class="relative flex h-2 w-2">
                                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                            </span>
                            {i18n.lang === 'bn' ? `দৈনিক গড়: ${(totalMonthlyTraffic / (new Date().getDate() || 1)).toFixed(1)}` : `Daily Avg: ${(totalMonthlyTraffic / (new Date().getDate() || 1)).toFixed(1)}`}
                        </div>
                    </div>

                    <div class="space-y-5">
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span class="text-slate-500">{i18n.t('labours')}</span>
                                <span class="text-slate-900">{data.monthlyTraffic.labours} <span class="text-slate-400 font-medium ml-1">({((data.monthlyTraffic.labours / (totalMonthlyTraffic || 1)) * 100).toFixed(1)}%)</span></span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-primary-500 h-full rounded-full transition-all duration-1000" style="width: {(data.monthlyTraffic.labours / (totalMonthlyTraffic || 1) * 100).toFixed(0)}%"></div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span class="text-slate-500">{i18n.t('visitors')}</span>
                                <span class="text-slate-900">{data.monthlyTraffic.visitors} <span class="text-slate-400 font-medium ml-1">({((data.monthlyTraffic.visitors / (totalMonthlyTraffic || 1)) * 100).toFixed(1)}%)</span></span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-emerald-500 h-full rounded-full transition-all duration-1000" style="width: {(data.monthlyTraffic.visitors / (totalMonthlyTraffic || 1) * 100).toFixed(0)}%"></div>
                            </div>
                        </div>
                        <div class="space-y-2">
                            <div class="flex justify-between text-xs font-bold uppercase tracking-wider">
                                <span class="text-slate-500">{i18n.t('vehicles')}</span>
                                <span class="text-slate-900">{data.monthlyTraffic.vehicles} <span class="text-slate-400 font-medium ml-1">({((data.monthlyTraffic.vehicles / (totalMonthlyTraffic || 1)) * 100).toFixed(1)}%)</span></span>
                            </div>
                            <div class="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                                <div class="bg-amber-500 h-full rounded-full transition-all duration-1000" style="width: {(data.monthlyTraffic.vehicles / (totalMonthlyTraffic || 1) * 100).toFixed(0)}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="absolute -right-20 -bottom-20 opacity-[0.03] text-indigo-900 transform -rotate-12 pointer-events-none">
                    <Calendar size={320} />
                </div>
            </Card>
        </div>
    </div>
</div>
