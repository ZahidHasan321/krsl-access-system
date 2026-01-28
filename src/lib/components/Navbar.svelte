<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import LangSwitch from './LangSwitch.svelte';
    import { Menu, X, LayoutDashboard, Users, UserCheck, Truck, Search, Loader2, ShieldCheck, Layout, LogOut } from 'lucide-svelte';
    import { page } from '$app/state';
    import { clsx } from 'clsx';
    import logo from '$lib/assets/logo.png';
    import { enhance } from '$app/forms';

    let isMobileMenuOpen = $state(false);
    let searchQuery = $state('');
    let searchResults = $state<any[]>([]);
    let isSearching = $state(false);
    let showResults = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout>;

    async function handleSearch(e: Event) {
        const query = (e.target as HTMLInputElement).value;
        searchQuery = query;
        const trimmedQuery = query.trim();
        
        clearTimeout(debounceTimer);
        
        if (trimmedQuery.length < 2) {
            searchResults = [];
            showResults = false;
            isSearching = false;
            return;
        }

        isSearching = true;
        showResults = true;

        debounceTimer = setTimeout(async () => {
            if (searchQuery.trim().length < 2) {
                isSearching = false;
                return;
            }
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(trimmedQuery)}`);
                if (res.ok) {
                    // Only update if current query still matches or is relevant
                    if (searchQuery.trim() === trimmedQuery) {
                        searchResults = await res.json();
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                isSearching = false;
            }
        }, 300);
    }

    function closeSearch() {
        // Delay to allow click on result
        setTimeout(() => {
            showResults = false;
        }, 200);
    }

    const navLinks = [
        { href: '/', label: 'dashboard', icon: LayoutDashboard },
        {
            label: 'labours',
            icon: Users,
            permission: 'labours.view',
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
            permission: 'visitors.view',
            sub: [
                { href: '/visitors', label: 'activeLog' },
                { href: '/visitors/profiles', label: 'registry' },
                { href: '/visitors/history', label: 'history' }
            ]
        },
        { 
            label: 'vehicles', 
            icon: Truck,
            permission: 'vehicles.view',
            sub: [
                { href: '/vehicles', label: 'activeLog' },
                { href: '/vehicles/history', label: 'history' }
            ]
        },
        {
            label: 'admin',
            icon: ShieldCheck,
            permission: 'users.manage',
            sub: [
                { href: '/admin/users', label: 'userManagement' },
                { href: '/admin/roles', label: 'roleManagement' }
            ]
        },
        {
            label: 'labours',
            icon: Layout,
            isPortal: true,
            permission: 'labours.portal',
            sub: [
                { href: '/portal/labours/attendance', label: 'attendance' },
                { href: '/portal/labours', label: 'registry' },
                { href: '/portal/labours/history', label: 'history' },
                { href: '/portal/labours/reports', label: 'monthlyReport' }
            ]
        }
    ];

    const isPortalActive = $derived(page.url.pathname.startsWith('/portal'));

    const filteredNavLinks = $derived.by(() => {
        const user = page.data.user;
        if (!user) return [];
        return navLinks.filter(link => {
            if (!link.permission) return true;
            return user.permissions.includes(link.permission);
        });
    });

    function isActive(href: string) {
        return activeHref === href;
    }

    let activeHref = $derived.by(() => {
        const path = page.url.pathname;
        const allLinks: string[] = [];
        
        for (const link of filteredNavLinks) {
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
    <div class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
            <!-- Logo & Desktop Nav -->
            <div class="flex items-center gap-4 xl:gap-6 min-w-0">
                <a href="/" class="flex items-center gap-3 text-xl font-bold text-primary-950 tracking-tight shrink-0 hover:opacity-80 transition-opacity">
                    <img src={logo} alt="Logo" class="h-8 w-auto" />
                    <span class={clsx(
                        "hidden xl:inline-block text-2xl normal-case",
                        i18n.lang === 'en' ? "font-cursive" : "font-bn-stylized pt-1"
                    )}>
                        {i18n.t('appName')}
                    </span>
                </a>
                
                <div class="hidden lg:flex items-center gap-0.5">
                    {#each filteredNavLinks as link}
                        {#if link.href}
                            <a 
                                href={link.href}
                                class={clsx(
                                    'px-2.5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap',
                                    isActive(link.href) ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                                )}
                            >
                                <link.icon size={16} />
                                {i18n.t(link.label as any)}
                            </a>
                        {:else}
                            {@const isSubActive = link.sub?.some(s => isActive(s.href))}
                            <div class="relative group">
                                <button class={clsx(
                                    "px-2.5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
                                    isSubActive ? 'text-primary-700 font-bold bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
                                )}>
                                    <link.icon size={16} />
                                    {i18n.t(link.label === 'portal' ? 'labours' : link.label as any)}
                                    <svg class="w-4 h-4 opacity-50" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                                </button>
                                <div class="absolute left-0 mt-0 w-48 bg-white border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div class="py-1">
                                        {#each link.sub || [] as sub}
                                            <a 
                                                href={sub.href}
                                                class={clsx(
                                                    'block px-4 py-2 text-sm transition-colors',
                                                    isActive(sub.href) ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50 hover:text-primary-600'
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
            <div class="flex items-center gap-2 xl:gap-4 shrink-0">
                <!-- Global Search -->
                <div class="relative hidden 2xl:block w-64 xl:w-80">
                    <div class="relative w-full">
                        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder={i18n.t('searchPlaceholder')} 
                            class="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white w-full transition-all"
                            value={searchQuery}
                            oninput={handleSearch}
                            onblur={closeSearch}
                            onfocus={() => searchQuery.length >= 2 && (showResults = true)}
                        />
                        {#if isSearching}
                            <div class="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 class="animate-spin text-primary-500" size={16} />
                            </div>
                        {/if}
                    </div>

                    {#if showResults && searchQuery.trim().length >= 2}
                        <div class="absolute right-0 mt-2 w-full bg-white border rounded-xl shadow-xl overflow-hidden z-50">
                            {#if isSearching}
                                <div class="py-2">
                                    {#each Array(3) as _}
                                        <div class="flex items-center gap-3 px-4 py-3 animate-pulse">
                                            <div class="size-9 bg-gray-100 rounded-lg"></div>
                                            <div class="flex-1 space-y-2">
                                                <div class="h-3 bg-gray-100 rounded w-3/4"></div>
                                                <div class="h-2 bg-gray-50 rounded w-1/2"></div>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {:else if searchResults.length > 0}
                                <div class="py-2">
                                    {#each searchResults as result}
                                        <a 
                                            href={result.url} 
                                            class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                            onclick={() => showResults = false}
                                        >
                                            <div class={clsx(
                                                "p-2 rounded-lg",
                                                result.category === 'labours' ? "bg-blue-50 text-blue-600" :
                                                result.category === 'visitors' ? "bg-emerald-50 text-emerald-600" :
                                                "bg-amber-50 text-amber-600"
                                            )}>
                                                {#if result.category === 'labours'}
                                                    <Users size={16} />
                                                {:else if result.category === 'visitors'}
                                                    <UserCheck size={16} />
                                                {:else}
                                                    <Truck size={16} />
                                                {/if}
                                            </div>
                                            <div>
                                                <p class="text-sm font-semibold text-gray-900">{result.title}</p>
                                                <p class="text-xs text-gray-500">{result.subtitle}</p>
                                            </div>
                                        </a>
                                    {/each}
                                </div>
                            {:else}
                                <div class="p-4 text-center text-gray-500 text-sm">
                                    {i18n.t('noResults')}
                                </div>
                            {/if}
                        </div>
                    {/if}
                </div>

                <LangSwitch />
                
                {#if page.data.user}
                    <div class="hidden md:flex items-center gap-3 pl-4 border-l border-gray-100 ml-2">
                        <div class="text-right">
                            <p class="text-xs font-bold text-gray-900 leading-none">{page.data.user.username}</p>
                            <p class="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-1">{page.data.user.roleName || 'User'}</p>
                        </div>
                        <form method="POST" action="/logout" use:enhance>
                            <button 
                                type="submit" 
                                class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                title={i18n.t('logout')}
                            >
                                <LogOut size={18} />
                            </button>
                        </form>
                    </div>
                {/if}

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
                {#each filteredNavLinks as link}
                    {#if link.href}
                        <a 
                            href={link.href}
                            onclick={() => isMobileMenuOpen = false}
                            class={clsx(
                                'block px-3 py-3 rounded-md text-base font-semibold flex items-center gap-3',
                                isActive(link.href) ? 'bg-primary-50 text-primary-700' : 'text-gray-700 hover:bg-gray-50'
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
                                            isActive(sub.href) ? 'text-primary-700' : 'text-gray-600 hover:bg-gray-50'
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
