<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import LangSwitch from './LangSwitch.svelte';
	import {
		Menu,
		X,
		LayoutDashboard,
		Users,
		UserCheck,
		Truck,
		Search,
		Loader2,
		ShieldCheck,
		History,
		LogOut,
		Settings2,
		Monitor,
		ClipboardList
	} from 'lucide-svelte';
	import { page } from '$app/state';
	import { clsx } from 'clsx';
	import logo from '$lib/assets/kr_logo.svg';
	import { enhance } from '$app/forms';
	import NotificationSettings from './NotificationSettings.svelte';
	import ActivityFeed from './ActivityFeed.svelte';

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
				{ href: '/admin/activity', label: 'activityHistory', icon: History },
				{ href: '/devices', label: 'devices', icon: Monitor },
				{ href: '/admin/audit-report', label: 'auditReport', icon: ClipboardList }
			]
		}
	];

	const filteredNavLinks = $derived.by(() => {
		const user = page.data.user;
		if (!user) return [];
		return navLinks.filter((link) => {
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

<nav
	class={clsx(
		'no-print sticky top-0 z-40 transition-all duration-300',
		isScrolled
			? 'border-b border-slate-200/60 bg-white/95 py-0 shadow-sm'
			: 'border-b border-transparent bg-transparent py-2'
	)}
>
	<div class="container">
		<div class="flex h-16 justify-between">
			<div class="flex min-w-0 items-center gap-3 xl:gap-6">
				<a
					href="/"
					class="group flex shrink-0 items-center gap-3 overflow-visible text-xl font-bold tracking-tight transition-all"
				>
					<div
						class={clsx(
							'logo-pill flex size-9 items-center justify-center overflow-visible rounded-full border bg-white transition-all duration-500 group-hover:rotate-[360deg] group-hover:shadow-md group-hover:shadow-primary/10',
							isScrolled ? 'border-slate-100' : 'border-white/20 shadow-lg shadow-black/5'
						)}
					>
						<img src={logo} alt="Logo" class="size-full object-contain" />
					</div>
					<div class="hidden flex-col leading-none sm:flex">
						<span class="brand-logo-text transition-colors duration-300 group-hover:text-primary">
							<span class="electric-text">KR</span> Steel Ltd.
						</span>
						<span
							class={clsx(
								'brand-sub-text mt-0.5 hidden transition-colors duration-300 xl:block',
								isScrolled
									? 'text-slate-500 group-hover:text-slate-900'
									: 'text-slate-600 group-hover:text-slate-900'
							)}
						>
							Access Management System
						</span>
					</div>
				</a>

				<div class="hidden items-center gap-0.5 xl:flex">
					{#each filteredNavLinks as link}
						{#if link.href}
							<a
								href={link.href}
								class={clsx(
									'nav-link-text touch-feedback flex items-center gap-1.5 rounded-full px-3 py-2 whitespace-nowrap transition-all active:scale-95',
									isActive(link.href)
										? 'bg-primary text-white shadow-[0_5px_15px_rgba(28,85,164,0.2)]'
										: isScrolled
											? 'text-slate-600 hover:bg-slate-50 hover:text-primary'
											: 'text-slate-700 hover:bg-white/50 hover:text-primary'
								)}
							>
								<link.icon size={16} />
								{i18n.t(link.label as any)}
							</a>
						{:else}
							{@const isSubActive = link.sub?.some((s) => isActive(s.href))}
							<div class="group relative">
								<button
									class={clsx(
										'nav-link-text touch-feedback flex items-center gap-1.5 rounded-full px-3 py-2 whitespace-nowrap transition-all active:scale-95',
										isSubActive
											? 'bg-primary text-white shadow-[0_5px_15px_rgba(28,85,164,0.2)]'
											: isScrolled
												? 'text-slate-600 hover:bg-slate-50 hover:text-primary'
												: 'text-slate-700 hover:bg-white/50 hover:text-primary'
									)}
								>
									<link.icon size={16} />
									{i18n.t(link.label as any)}
									<svg class="h-4 w-4 opacity-50" viewBox="0 0 20 20" fill="currentColor"
										><path
											fill-rule="evenodd"
											d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
											clip-rule="evenodd"
										/></svg
									>
								</button>
								<div
									class="invisible absolute left-0 z-50 mt-1 w-64 rounded-2xl border border-slate-200 bg-white/95 opacity-0 shadow-xl backdrop-blur-lg transition-all duration-300 group-hover:visible group-hover:opacity-100"
								>
									<div class="py-2">
										{#each link.sub || [] as sub}
											<a
												href={sub.href}
												class={clsx(
													'nav-link-text touch-feedback flex items-center gap-2 px-5 py-3 transition-colors active:bg-slate-50',
													isActive(sub.href)
														? 'bg-primary/10 text-primary'
														: 'text-slate-600 hover:bg-slate-50 hover:text-primary'
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

			<div class="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2 xl:gap-4">
				<div class="relative flex items-center">
					<button
						class="touch-target touch-feedback flex items-center justify-center rounded-full p-2 text-gray-600 transition-colors hover:bg-gray-100 active:scale-90 2xl:hidden"
						onclick={() => (isMobileSearchOpen = !isMobileSearchOpen)}
						aria-label="Toggle search"
					>
						{#if isMobileSearchOpen}
							<X size={20} />
						{:else}
							<Search size={20} />
						{/if}
					</button>

					<div
						class={clsx(
							'2xl:block',
							isMobileSearchOpen
								? 'fixed inset-x-0 top-16 z-50 animate-in border-b bg-white p-4 shadow-lg duration-200 slide-in-from-top 2xl:relative 2xl:top-0 2xl:border-0 2xl:p-0 2xl:shadow-none'
								: 'hidden 2xl:w-80'
						)}
					>
						<div class="relative w-full">
							<Search class="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" size={16} />
							<input
								bind:this={searchInput}
								type="text"
								placeholder={i18n.t('searchPlaceholder')}
								class="w-full rounded-full border border-slate-300 bg-gray-50 py-2 pr-4 pl-9 text-sm transition-all focus:border-primary-500 focus:bg-white focus:ring-4 focus:ring-primary-500/30 focus:outline-none 2xl:py-1.5"
								value={searchQuery}
								oninput={handleSearch}
								onblur={closeSearch}
								onfocus={() => searchQuery.length >= 2 && (showResults = true)}
							/>
							{#if isSearching}
								<div class="absolute top-1/2 right-3 -translate-y-1/2">
									<Loader2 class="animate-spin text-primary-500" size={14} />
								</div>
							{/if}
						</div>

						{#if showResults && searchQuery.trim().length >= 2}
							<div
								class="absolute right-0 z-50 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-xl"
							>
								{#if isSearching}
									<div class="py-2">
										{#each Array(3) as _}
											<div class="flex animate-pulse items-center gap-3 px-4 py-3">
												<div class="size-9 rounded-lg bg-gray-100"></div>
												<div class="flex-1 space-y-2">
													<div class="h-3 w-3/4 rounded bg-gray-100"></div>
													<div class="h-2 w-1/2 rounded bg-gray-50"></div>
												</div>
											</div>
										{/each}
									</div>
								{:else if searchResults.length > 0}
									<div class="max-h-[60vh] overflow-y-auto py-2">
										{#each searchResults as result}
											<a
												href={result.url}
												class="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
												onclick={() => {
													showResults = false;
													isMobileSearchOpen = false;
												}}
											>
												<div
													class={clsx(
														'shrink-0 rounded-lg p-2',
														result.type === 'person'
															? 'bg-blue-50 text-blue-600'
															: 'bg-amber-50 text-amber-600'
													)}
												>
													{#if result.type === 'person'}
														<Users size={16} />
													{:else}
														<Truck size={16} />
													{/if}
												</div>
												<div class="min-w-0 text-left">
													<p class="truncate text-sm font-semibold text-gray-900">{result.title}</p>
													<p class="truncate text-xs text-gray-500">{result.subtitle}</p>
												</div>
											</a>
										{/each}
									</div>
								{:else}
									<div class="p-4 text-center text-sm text-gray-500">
										{i18n.t('noResults')}
									</div>
								{/if}
							</div>
						{/if}
					</div>
				</div>

				<div class="hidden sm:block">
					<LangSwitch />
				</div>
				{#if page.data.user?.permissions?.includes('users.manage')}
					<ActivityFeed />
				{/if}

				{#if page.data.user}
					<div class="relative ml-1 border-l border-gray-100 pl-2 sm:pl-4">
						<button
							class="group flex cursor-pointer items-center gap-2 rounded-full p-1 transition-all duration-200 hover:bg-slate-50"
							onclick={() => (isProfileOpen = !isProfileOpen)}
							onblur={() => setTimeout(() => (isProfileOpen = false), 200)}
						>
							<div
								class="flex size-9 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#1C55A4] to-[#209FCF] text-sm font-bold text-white shadow-md transition-transform group-hover:scale-105"
							>
								{page.data.user.name?.[0]?.toUpperCase() ||
									page.data.user.username?.[0]?.toUpperCase()}
							</div>
						</button>

						{#if isProfileOpen}
							<div
								class="absolute right-0 z-50 mt-2 w-64 animate-in overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl duration-200 fade-in slide-in-from-top-2"
							>
								<div class="border-b border-slate-50 bg-slate-50/50 p-4">
									<p class="truncate text-sm leading-none font-bold text-slate-900">
										{page.data.user.name || page.data.user.username}
									</p>
									<p class="mt-1.5 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
										{page.data.user.roleName || 'User'}
									</p>
								</div>
								<div class="p-2 space-y-1">
									<div class="sm:hidden px-3 py-2">
										<p class="mb-2 text-[10px] font-bold tracking-widest text-slate-400 uppercase">Language</p>
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div class="flex" onclick={(e) => e.stopPropagation()}>
											<LangSwitch class="w-full" />
										</div>
									</div>
									<NotificationSettings variant="menu" />

									<form method="POST" action="/logout" use:enhance>
										<button
											type="submit"
											class="group flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-rose-600 transition-colors hover:bg-rose-50"
										>
											<div
												class="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-rose-100 transition-transform group-hover:scale-110"
											>
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
					class="rounded-md p-2 text-gray-600 hover:bg-gray-100 xl:hidden"
					onclick={() => (isMobileMenuOpen = !isMobileMenuOpen)}
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
		<div
			class="absolute max-h-[calc(100vh-4rem)] w-full overflow-y-auto border-b bg-white shadow-xl xl:hidden"
		>
			<div class="space-y-1 px-4 pt-2 pb-6">
				{#each filteredNavLinks as link}
					{#if link.href}
						<a
							href={link.href}
							onclick={() => (isMobileMenuOpen = false)}
							class={clsx(
								'block flex items-center gap-3 rounded-md px-3 py-3 text-base font-semibold',
								isActive(link.href)
									? 'bg-primary-50 text-primary-700'
									: 'text-gray-700 hover:bg-gray-50'
							)}
						>
							<link.icon size={20} />
							{i18n.t(link.label as any)}
						</a>
					{:else}
						<div class="py-2">
							<div
								class="flex items-center gap-3 px-3 py-2 text-xs font-bold tracking-wider text-gray-400 uppercase"
							>
								<link.icon size={16} />
								{i18n.t(link.label as any)}
							</div>
							<div class="mt-1 space-y-1 pl-8">
								{#each link.sub || [] as sub}
									<a
										href={sub.href}
										onclick={() => (isMobileMenuOpen = false)}
										class={clsx(
											'block flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors',
											isActive(sub.href)
												? 'bg-primary-50 font-bold text-primary-700'
												: 'text-gray-600 hover:bg-gray-50'
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
