<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import LangSwitch from './LangSwitch.svelte';
    import { Menu, X, LayoutDashboard, Users, UserCheck, Truck, History, ClipboardList, LogOut } from 'lucide-svelte';
    import { page } from '$app/state';
    import { clsx } from 'clsx';
    import Button from './ui/Button.svelte';

    let isMobileMenuOpen = $state(false);

    const navLinks = [
        { href: '/', label: 'dashboard', icon: LayoutDashboard },
        {
            label: 'labours',
            icon: Users,
            sub: [
                { href: '/labours/attendance', label: 'attendance' },
                { href: '/labours', label: 'registry' },
                { href: '/labours/history', label: 'history' },
                { href: '/labours/reports', label: 'monthlyReport' }
            ]
        },
        { 
            label: 'visitors', 
            icon: UserCheck,
            sub: [
                { href: '/visitors', label: 'activeLog' },
                { href: '/visitors/profiles', label: 'registry' },
                { href: '/visitors/history', label: 'history' }
            ]
        },
        { 
            label: 'vehicles', 
            icon: Truck,
            sub: [
                { href: '/vehicles', label: 'activeLog' },
                { href: '/vehicles/history', label: 'history' }
            ]
        }
    ];

    function isActive(href: string) {
        return activeHref === href;
    }

    let activeHref = $derived.by(() => {
        const path = page.url.pathname;
        const allLinks: string[] = [];
        
        for (const link of navLinks) {
            if (link.href) allLinks.push(link.href);
            if (link.sub) {
                for (const sub of link.sub) {
                    if (sub.href) allLinks.push(sub.href);
                }
            }
        }
        
        // Sort by length descending to match most specific first
        allLinks.sort((a, b) => b.length - a.length);
        
        for (const link of allLinks) {
             if (link === '/' && path === '/') return link;
             if (link !== '/' && (path === link || path.startsWith(link + '/'))) {
                 return link;
             }
        }
        return '';
    });
</script>

<nav class="bg-white border-b sticky top-0 z-40">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <!-- Logo & Desktop Nav -->
            <div class="flex items-center gap-8">
                <a href="/" class="text-2xl font-black text-indigo-600 tracking-tight shrink-0">
                    {i18n.t('appName')}
                </a>
                
                <div class="hidden lg:flex items-center gap-1">
                    {#each navLinks as link}
                        {#if link.href}
                            <a 
                                href={link.href}
                                class={clsx(
                                    'px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                                    isActive(link.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-indigo-600 hover:bg-gray-50'
                                )}
                            >
                                <link.icon size={18} />
                                {i18n.t(link.label as any)}
                            </a>
                        {:else}
                            <div class="relative group">
                                <button class="px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 transition-colors flex items-center gap-2">
                                    <link.icon size={18} />
                                    {i18n.t(link.label as any)}
                                    <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                                </button>
                                <div class="absolute left-0 mt-0 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div class="py-1">
                                        {#each link.sub || [] as sub}
                                            <a 
                                                href={sub.href}
                                                class={clsx(
                                                    'block px-4 py-2 text-sm transition-colors',
                                                    isActive(sub.href) ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-indigo-600'
                                                )}
                                            >
                                                {i18n.t(sub.label as any)}
                                            </a>
                                        {/each}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>

            <!-- Right side -->
            <div class="flex items-center gap-4">
                <LangSwitch />
                
                <button 
                    class="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                    onclick={() => isMobileMenuOpen = !isMobileMenuOpen}
                >
                    {#if isMobileMenuOpen}
                        <X size={24} />
                    {:else}
                        <Menu size={24} />
                    {/if}
                </button>
            </div>
        </div>
    </div>

    <!-- Mobile Menu -->
    {#if isMobileMenuOpen}
        <div class="lg:hidden bg-white border-b absolute w-full shadow-xl">
            <div class="px-4 pt-2 pb-6 space-y-1">
                {#each navLinks as link}
                    {#if link.href}
                        <a 
                            href={link.href}
                            onclick={() => isMobileMenuOpen = false}
                            class={clsx(
                                'block px-3 py-3 rounded-md text-base font-semibold flex items-center gap-3',
                                isActive(link.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50'
                            )}
                        >
                            <link.icon size={20} />
                            {i18n.t(link.label as any)}
                        </a>
                    {:else}
                        <div class="py-2">
                            <div class="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-3">
                                <link.icon size={16} />
                                {i18n.t(link.label as any)}
                            </div>
                            <div class="mt-1 space-y-1 pl-8">
                                {#each link.sub || [] as sub}
                                    <a 
                                        href={sub.href}
                                        onclick={() => isMobileMenuOpen = false}
                                        class={clsx(
                                            'block px-3 py-3 rounded-md text-base font-medium transition-colors',
                                            isActive(sub.href) ? 'text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
                                        )}
                                    >
                                        {i18n.t(sub.label as any)}
                                    </a>
                                {/each}
                            </div>
                        </div>
                    {/if}
                {/each}
            </div>
        </div>
    {/if}
</nav>
