<script lang="ts">
    import { i18n } from '$lib/i18n.svelte';
    import LangSwitch from './LangSwitch.svelte';
    import { Menu, X, LayoutDashboard, Users, UserCheck, Truck, Search, Loader2, ShieldCheck, History, LogOut, Settings2, Monitor, ClipboardList } from 'lucide-svelte';
    import { page } from '$app/state';
    import { clsx } from 'clsx';
    import logo from '$lib/assets/kr_logo.svg';
    import { enhance } from '$app/forms';

    let isMobileMenuOpen = $state(false);
    let isMobileSearchOpen = $state(false);
    let isProfileOpen = $state(false);
    let searchQuery = $state('');
    let searchResults = $state<any[]>([]);
    let isSearching = $state(false);
    let showResults = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout>;

    let searchInput: HTMLInputElement | undefined = $state();

    let isScrolled = $state(false);

    $effect(() => {
        const handleScroll = () => {
            isScrolled = window.scrollY > 20;
        };
        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check
        return () => window.removeEventListener('scroll', handleScroll);
    });

    $effect(() => {
        if (isMobileSearchOpen && searchInput) {
            searchInput.focus();
        }
    });

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
        setTimeout(() => {
            showResults = false;
        }, 200);
    }

    const navLinks = [
        { href: '/', label: 'dashboard', icon: LayoutDashboard },
        { href: '/attendance', label: 'entryLog', icon: UserCheck, permission: 'people.view' },
        { href: '/people', label: 'people', icon: Users, permission: 'people.view' },
        { href: '/vehicles', label: 'vehicles', icon: Truck, permission: 'vehicles.view' },
        {
            label: 'admin',
            icon: ShieldCheck,
            permission: 'users.manage',
            sub: [
                { href: '/admin/users', label: 'userManagement', icon: Users },
                { href: '/admin/roles', label: 'roleManagement', icon: Settings2 },
                { href: '/devices', label: 'devices', icon: Monitor },
                { href: '/admin/audit-report', label: 'auditReport', icon: ClipboardList }
            ]
        }
    ];

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

<nav class={clsx(
    "sticky top-0 z-40 transition-all duration-300 no-print",
    isScrolled 
        ? "bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm py-0" 
        : "bg-transparent border-b border-transparent py-2"
)}>
    <div class="container">
        <div class="flex justify-between h-16">
            <div class="flex items-center gap-3 xl:gap-6 min-w-0">
                <a href="/" class="flex items-center gap-3 text-xl font-bold tracking-tight shrink-0 transition-all group">
                    <div class={clsx(
                        "size-10 rounded-full bg-white flex items-center justify-center overflow-hidden border transition-all duration-500 group-hover:rotate-[360deg] group-hover:shadow-md group-hover:shadow-primary/10",
                        isScrolled ? "border-slate-100" : "border-white/20 shadow-lg shadow-black/5"
                    )}>
                        <img src={logo} alt="Logo" class="size-full object-contain scale-150" />
                    </div>
                    <div class="hidden sm:flex flex-col leading-none">
                        <span class="brand-logo-text transition-colors duration-300 group-hover:text-primary">
                            <span class="electric-text">KR</span> Steel Ltd.
                        </span>
                        <span class={clsx(
                            "brand-sub-text mt-0.5 transition-colors duration-300 hidden xl:block",
                            isScrolled ? "text-slate-500 group-hover:text-slate-900" : "text-slate-600 group-hover:text-slate-900"
                        )}>
                            Access Management System
                        </span>
                    </div>
                </a>
                
                <div class="hidden xl:flex items-center gap-0.5">
                    {#each filteredNavLinks as link}
                        {#if link.href}
                            <a 
                                href={link.href}
                                class={clsx(
                                    'px-3 py-2 rounded-full nav-link-text transition-all flex items-center gap-1.5 whitespace-nowrap',
                                    isActive(link.href) 
                                        ? 'bg-primary text-white shadow-[0_5px_15px_rgba(28,85,164,0.2)]' 
                                        : isScrolled 
                                            ? 'text-slate-600 hover:text-primary hover:bg-slate-50' 
                                            : 'text-slate-700 hover:text-primary hover:bg-white/50'
                                )}
                            >
                                <link.icon size={16} />
                                {i18n.t(link.label as any)}
                            </a>
                        {:else}
                            {@const isSubActive = link.sub?.some(s => isActive(s.href))}
                            <div class="relative group">
                                <button class={clsx(
                                    "px-3 py-2 rounded-full nav-link-text transition-all flex items-center gap-1.5 whitespace-nowrap",
                                    isSubActive 
                                        ? 'bg-primary text-white shadow-[0_5px_15px_rgba(28,85,164,0.2)]' 
                                        : isScrolled 
                                            ? 'text-slate-600 hover:text-primary hover:bg-slate-50' 
                                            : 'text-slate-700 hover:text-primary hover:bg-white/50'
                                )}>
                                    <link.icon size={16} />
                                    {i18n.t(link.label as any)}
                                    <svg class="w-4 h-4 opacity-50" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                                </button>
                                <div class="absolute left-0 mt-1 w-64 bg-white/95 backdrop-blur-lg border border-slate-200 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                    <div class="py-2">
                                        {#each link.sub || [] as sub}
                                            <a 
                                                href={sub.href}
                                                class={clsx(
                                                    'flex items-center gap-2 px-5 py-3 nav-link-text transition-colors',
                                                    isActive(sub.href) ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50 hover:text-primary'
                                                )}
                                            >
                                                <sub.icon size={16} class="opacity-70" />
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

            <div class="flex items-center gap-1.5 sm:gap-2 xl:gap-4 shrink-0 min-w-0">
                <div class="relative flex items-center">
                    <button 
                        class="2xl:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                        onclick={() => isMobileSearchOpen = !isMobileSearchOpen}
                        aria-label="Toggle search"
                    >
                        {#if isMobileSearchOpen}
                            <X size={20} />
                        {:else}
                            <Search size={20} />
                        {/if}
                    </button>

                    <div class={clsx(
                        "2xl:block",
                        isMobileSearchOpen 
                            ? "fixed inset-x-0 top-16 bg-white p-4 border-b shadow-lg animate-in slide-in-from-top duration-200 z-50 2xl:relative 2xl:top-0 2xl:p-0 2xl:border-0 2xl:shadow-none" 
                            : "hidden 2xl:w-80"
                    )}>
                        <div class="relative w-full">
                            <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                bind:this={searchInput}
                                type="text" 
                                placeholder={i18n.t('searchPlaceholder')} 
                                class="pl-9 pr-4 py-2 2xl:py-1.5 bg-gray-50 border border-slate-300 rounded-full text-sm focus:outline-none focus:ring-4 focus:ring-primary-500/30 focus:border-primary-500 focus:bg-white w-full transition-all"
                                value={searchQuery}
                                oninput={handleSearch}
                                onblur={closeSearch}
                                onfocus={() => searchQuery.length >= 2 && (showResults = true)}
                            />
                            {#if isSearching}
                                <div class="absolute right-3 top-1/2 -translate-y-1/2">
                                    <Loader2 class="animate-spin text-primary-500" size={14} />
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
                                    <div class="py-2 max-h-[60vh] overflow-y-auto">
                                        {#each searchResults as result}
                                            <a 
                                                href={result.url} 
                                                class="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                                                onclick={() => { showResults = false; isMobileSearchOpen = false; }}
                                            >
                                                <div class={clsx(
                                                    "p-2 rounded-lg shrink-0",
                                                    result.type === 'person' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                                                )}>
                                                    {#if result.type === 'person'}
                                                        <Users size={16} />
                                                    {:else}
                                                        <Truck size={16} />
                                                    {/if}
                                                </div>
                                                <div class="min-w-0 text-left">
                                                    <p class="text-sm font-semibold text-gray-900 truncate">{result.title}</p>
                                                    <p class="text-xs text-gray-500 truncate">{result.subtitle}</p>
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
                </div>

                <LangSwitch />
                
                {#if page.data.user}
                    <div class="relative pl-2 sm:pl-4 border-l border-gray-100 ml-1">
                        <button 
                            class="flex items-center gap-2 group hover:bg-slate-50 p-1 rounded-full transition-all duration-200 cursor-pointer"
                            onclick={() => isProfileOpen = !isProfileOpen}
                            onblur={() => setTimeout(() => isProfileOpen = false, 200)}
                        >
                            <div class="size-9 rounded-full bg-gradient-to-br from-[#1C55A4] to-[#209FCF] flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform cursor-pointer">
                                {page.data.user.name?.[0]?.toUpperCase() || page.data.user.username?.[0]?.toUpperCase()}
                            </div>
                        </button>

                        {#if isProfileOpen}
                            <div 
                                class="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
                            >
                                <div class="p-4 border-b border-slate-50 bg-slate-50/50">
                                    <p class="text-sm font-bold text-slate-900 leading-none truncate">{page.data.user.name || page.data.user.username}</p>
                                    <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{page.data.user.roleName || 'User'}</p>
                                </div>
                                <div class="p-2">
                                    <form method="POST" action="/logout" use:enhance>
                                        <button 
                                            type="submit" 
                                            class="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors group cursor-pointer"
                                        >
                                            <div class="size-8 rounded-lg bg-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform cursor-pointer">
                                                <LogOut size={16} />
                                            </div>
                                            {i18n.t('logout')}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        {/if}
                    </div>
                {/if}

                <button 
                    class="xl:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-md"
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

    {#if isMobileMenuOpen}
        <div class="xl:hidden bg-white border-b absolute w-full shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto">
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
                                            'block px-3 py-3 rounded-md text-base font-medium transition-colors flex items-center gap-3',
                                            isActive(sub.href) ? 'bg-primary-50 text-primary-700 font-bold' : 'text-gray-600 hover:bg-gray-50'
                                        )}
                                    >
                                        <sub.icon size={18} />
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