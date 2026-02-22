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

<div class="min-h-screen flex items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
        <div class="text-center">
            <div class="size-24 rounded-full bg-white mx-auto flex items-center justify-center overflow-hidden border-2 border-slate-100 shadow-xl shadow-slate-200/50 hover:rotate-[360deg] transition-transform duration-700">
                <img src={logo} alt="Logo" class="size-full object-contain scale-150" />
            </div>
            <h2 class="mt-6 text-2xl font-black text-slate-900 tracking-tighter uppercase">
                <span class="electric-text">{i18n.t('appName')}</span>
            </h2>
            <div class="mt-2 flex flex-col items-center gap-1">
                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">
                    Access Management System
                </p>
                <p class="text-xs text-slate-500 font-black uppercase tracking-widest">
                    Authorized Personnel Only
                </p>
            </div>
        </div>

        <Card.Root class="p-2 shadow-2xl shadow-slate-200/50 border-0 overflow-hidden mesh-gradient">
            <Card.Content class="p-8">
                <form method="post" action="?/login" use:enhance={() => {
                    isLoading = true;
                    return async ({ update }) => {
                        await update();
                        isLoading = false;
                    };
                }} class="space-y-8">
                    {#if form?.message}
                        <div class="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-center gap-3">
                            <div class="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                <span class="text-rose-600 font-bold text-lg">!</span>
                            </div>
                            <p class="text-sm text-rose-800 font-medium">{form.message}</p>
                        </div>
                    {/if}

                    <div class="space-y-6">
                        <div class="space-y-2">
                            <Label for="username" class="font-black uppercase text-[10px] tracking-widest text-slate-500 ml-1">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                placeholder="Enter your username"
                                required
                                autocomplete="username"
                                disabled={isLoading}
                                class="h-12 text-base border-2"
                            />
                        </div>
                        
                        <div class="space-y-2">
                            <Label for="password" class="font-black uppercase text-[10px] tracking-widest text-slate-500 ml-1">Password</Label>
                            <div class="relative">
                                <Input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    required
                                    autocomplete="current-password"
                                    disabled={isLoading}
                                    class="h-12 text-base border-2 pr-12"
                                />
                                <button
                                    type="button"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                        <label class="flex items-center gap-3 text-sm text-slate-600 cursor-pointer group">
                            <input type="checkbox" name="rememberMe" class="w-5 h-5 rounded-md border-slate-300 text-primary-600 focus:ring-primary-500 transition-all cursor-pointer" />
                            <span class="group-hover:text-slate-900 transition-colors font-black">Keep me signed in</span>
                        </label>
                    </div>

                    <Button 
                        type="submit" 
                        class="w-full h-14 text-lg font-black transition-all rounded-xl shadow-lg flex items-center justify-center gap-3"
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

        <div class="flex items-center justify-center gap-2 text-slate-400 text-[11px] uppercase tracking-[0.3em] font-black">
            <Shield size={12} class="opacity-50" />
            Secure Enterprise Gateway
        </div>
    </div>
</div>