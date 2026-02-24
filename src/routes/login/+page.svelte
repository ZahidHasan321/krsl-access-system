<script lang="ts">
	import { enhance } from '$app/forms';
	import { i18n } from '$lib/i18n.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Shield, Loader2, ArrowRight, Eye, EyeOff } from 'lucide-svelte';
	import logo from '$lib/assets/kr_logo.svg';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let isLoading = $state(false);
	let showPassword = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
	<div class="w-full max-w-md space-y-8">
		<div class="text-center">
			<div
				class="mx-auto flex size-32 items-center justify-center overflow-hidden rounded-full border-2 border-slate-100 bg-white shadow-xl shadow-slate-200/50 transition-transform duration-700 hover:rotate-[360deg]"
			>
				<img src={logo} alt="Logo" class="size-full object-contain p-2" />
			</div>
			<h2 class="brand-logo-text mt-6 text-2xl text-slate-900">
				<span class="electric-text">KR</span> Steel Ltd.
			</h2>
			<div class="mt-2 flex flex-col items-center gap-1">
				<p class="text-[9px] font-black tracking-[0.4em] text-slate-400 uppercase">
					Access Management System
				</p>
				<p class="text-xs font-black tracking-widest text-slate-500 uppercase">
					Authorized Personnel Only
				</p>
			</div>
		</div>

		<Card.Root class="mesh-gradient overflow-hidden border-0 p-2 shadow-2xl shadow-slate-200/50">
			<Card.Content class="p-8">
				<form
					method="post"
					action="?/login"
					use:enhance={() => {
						isLoading = true;
						return async ({ update }) => {
							await update();
							isLoading = false;
						};
					}}
					class="space-y-8"
				>
					{#if form?.message}
						<div class="flex items-center gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100"
							>
								<span class="text-lg font-bold text-rose-600">!</span>
							</div>
							<p class="text-sm font-medium text-rose-800">{form.message}</p>
						</div>
					{/if}

					<div class="space-y-6">
						<div class="space-y-2">
							<Label
								for="username"
								class="ml-1 text-[10px] font-black tracking-widest text-slate-500 uppercase"
								>Username</Label
							>
							<Input
								id="username"
								name="username"
								placeholder="Enter your username"
								required
								autocomplete="username"
								disabled={isLoading}
								class="h-12 border-2 text-base"
							/>
						</div>

						<div class="space-y-2">
							<Label
								for="password"
								class="ml-1 text-[10px] font-black tracking-widest text-slate-500 uppercase"
								>Password</Label
							>
							<div class="relative">
								<Input
									id="password"
									name="password"
									type={showPassword ? 'text' : 'password'}
									placeholder="••••••••"
									required
									autocomplete="current-password"
									disabled={isLoading}
									class="h-12 border-2 pr-12 text-base"
								/>
								<button
									type="button"
									class="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
									onclick={() => (showPassword = !showPassword)}
									tabindex={-1}
								>
									{#if showPassword}
										<EyeOff size={20} />
									{:else}
										<Eye size={20} />
									{/if}
								</button>
							</div>
						</div>
					</div>

					<div class="flex items-center">
						<label class="group flex cursor-pointer items-center gap-3 text-sm text-slate-600">
							<input
								type="checkbox"
								name="rememberMe"
								class="h-5 w-5 cursor-pointer rounded-md border-slate-300 text-primary-600 transition-all focus:ring-primary-500"
							/>
							<span class="font-black transition-colors group-hover:text-slate-900"
								>Keep me signed in</span
							>
						</label>
					</div>

					<Button
						type="submit"
						class="flex h-14 w-full items-center justify-center gap-3 rounded-xl text-lg font-black shadow-lg transition-all"
						disabled={isLoading}
					>
						{#if isLoading}
							<Loader2 class="animate-spin" size={24} />
							<span>Signing in...</span>
						{:else}
							<span>Sign In</span>
							<ArrowRight size={22} strokeWidth={2.5} class="mt-0.5" />
						{/if}
					</Button>
				</form>
			</Card.Content>
		</Card.Root>

		<div
			class="flex items-center justify-center gap-2 text-[11px] font-black tracking-[0.3em] text-slate-400 uppercase"
		>
			<Shield size={12} class="opacity-50" />
			Secure Enterprise Gateway
		</div>
	</div>
</div>
