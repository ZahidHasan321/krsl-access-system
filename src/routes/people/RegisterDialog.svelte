<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Users,
		Briefcase,
		HardHat,
		UserCheck,
		ChevronRight,
		Save,
		X,
		Camera,
		Upload,
		Wifi,
		WifiOff,
		Loader2,
		AlertTriangle,
		Ship,
		Warehouse,
		IdCard,
		CreditCard
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { appToast } from '$lib/utils';
	import { fade, fly, slide } from 'svelte/transition';
	import { cn, getCategoryBadgeClass } from '$lib/utils';
	import {
		CATEGORIES,
		ROOT_CATEGORIES,
		getSubCategories,
		getCategoryById
	} from '$lib/constants/categories';
	import EnrollmentPanel from './EnrollmentPanel.svelte';
	import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
	import DesignationCombobox from '$lib/components/ui/designation-combobox.svelte';
	import DepartmentCombobox from '$lib/components/ui/department-combobox.svelte';
	import DatePicker from '$lib/components/ui/DatePicker.svelte';
	import { onMount } from 'svelte';

	let { open = $bindable() } = $props<{ open: boolean }>();

	let deviceOnline = $state(false);
	let deviceLoading = $state(true);
	let showOfflineWarning = $state(false);
	let skipOfflineCheck = $state(false);
	let pendingFormSubmit = $state<HTMLFormElement | null>(null);

	async function checkDeviceStatus() {
		try {
			const res = await fetch('/api/devices/status');
			const data = await res.json();
			deviceOnline = data.online;
		} catch {
			deviceOnline = false;
		} finally {
			deviceLoading = false;
		}
	}

	onMount(() => {
		checkDeviceStatus();
		const interval = setInterval(checkDeviceStatus, 10000); // Check every 10s
		return () => clearInterval(interval);
	});

	let selectedRootCategoryId = $state<string>('');
	let selectedSubCategoryId = $state<string>('');

	let isTrained = $state(false);
	let autoCheckIn = $state(true);
	let location = $state<'ship' | 'yard' | ''>('');
	let photoPreview = $state<string | null>(null);
	let purpose = $state('');
	let designationValue = $state('');
	let departmentValue = $state('');
	let showSummary = $state(false);
	let enrolledMethod = $state<string | null>(null);

	// After registration, store person data for enrollment step
	let registeredPerson = $state<{
		id: string;
		biometricId: string;
		name: string;
		photoUrl: string | null;
		categoryName: string;
		categorySlug: string;
		subCategoryName: string | null;
		company: string | null;
		contactNo: string | null;
		designation: string | null;
		department: string | null;
		codeNo: string | null;
		cardNo: string | null;
		isTrained: boolean;
	} | null>(null);

	const selectedRootCategory = $derived(getCategoryById(selectedRootCategoryId));
	const selectedSubCategory = $derived(getCategoryById(selectedSubCategoryId));
	const subCategories = $derived(
		selectedRootCategoryId ? getSubCategories(selectedRootCategoryId) : []
	);

	const needsPurpose = $derived(selectedRootCategory && selectedRootCategory.slug !== 'employee');
	const isSubCategorySelected = $derived(!!selectedSubCategoryId);
	const canSubmit = $derived(
		selectedRootCategoryId &&
			(!autoCheckIn || !!location)
	);

	function handlePhotoChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				photoPreview = e.target?.result as string;
			};
			reader.readAsDataURL(file);
		} else {
			photoPreview = null;
		}
	}

	function selectRootCategory(catId: string) {
		selectedRootCategoryId = catId;
		selectedSubCategoryId = '';
		const cat = getCategoryById(catId);
		isTrained = cat?.slug === 'employee';
	}

	function selectSubCategory(subCatId: string) {
		selectedSubCategoryId = subCatId;
	}

	function clearCategorySelection() {
		selectedRootCategoryId = '';
		selectedSubCategoryId = '';
		photoPreview = null;
		purpose = '';
	}

	function resetState() {
		selectedRootCategoryId = '';
		selectedSubCategoryId = '';
		isTrained = false;
		autoCheckIn = true;
		location = '';
		photoPreview = null;
		purpose = '';
		designationValue = '';
		registeredPerson = null;
		showSummary = false;
		enrolledMethod = null;
		showOfflineWarning = false;
		skipOfflineCheck = false;
		pendingFormSubmit = null;
	}

	$effect(() => {
		if (open === false) {
			setTimeout(resetState, 300);
		}
	});

	const finalCategoryId = $derived(selectedSubCategoryId || selectedRootCategoryId || '');
	const isEmployee = $derived(selectedRootCategory?.slug === 'employee');

	const activeColorMap: Record<string, string> = {
		purple: 'border-purple-500 bg-purple-500 text-white shadow-md scale-[1.02]',
		blue: 'border-blue-500 bg-blue-500 text-white shadow-md scale-[1.02]',
		orange: 'border-orange-500 bg-orange-500 text-white shadow-md scale-[1.02]',
		amber: 'border-amber-500 bg-amber-500 text-white shadow-md scale-[1.02]',
		emerald: 'border-emerald-500 bg-emerald-500 text-white shadow-md scale-[1.02]',
		sky: 'border-sky-500 bg-sky-500 text-white',
		indigo: 'border-indigo-500 bg-indigo-500 text-white',
		cyan: 'border-cyan-500 bg-cyan-500 text-white',
		teal: 'border-teal-500 bg-teal-500 text-white',
		green: 'border-green-500 bg-green-500 text-white'
	};
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden rounded-none p-0 sm:h-auto sm:max-h-[90vh] sm:max-w-[650px] sm:rounded-lg">
		<div class="flex shrink-0 items-center justify-between border-b bg-slate-50 p-6">
			<div>
				<Dialog.Title class="text-xl font-black">
					{#if registeredPerson}
						{#if showSummary}
							Registration Complete
						{:else}
							Device Enrollment
						{/if}
					{:else}
						{i18n.t('register')}
					{/if}
				</Dialog.Title>
				<Dialog.Description class="text-xs font-bold tracking-widest text-slate-500 uppercase">
					{#if registeredPerson}
						{#if showSummary}
							Successfully added {registeredPerson.name}
						{:else}
							Register {registeredPerson.name} on a device
						{/if}
					{:else if selectedRootCategory}
						Registering new {i18n.t(selectedRootCategory.slug as any) || selectedRootCategory.name}
					{:else}
						Select a category to continue
					{/if}
				</Dialog.Description>
			</div>

			<div class="flex items-center gap-3">
				<!-- Device status indicator -->
				<div
					class={cn(
						'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wider uppercase transition-colors',
						deviceLoading
							? 'border-slate-200 bg-slate-100 text-slate-400'
							: deviceOnline
								? 'border-emerald-200 bg-emerald-50 text-emerald-600'
								: 'border-rose-200 bg-rose-50 text-rose-600'
					)}
				>
					{#if deviceLoading}
						<Loader2 size={12} class="animate-spin" />
						<span>Checking...</span>
					{:else if deviceOnline}
						<Wifi size={12} />
						<span>Online</span>
					{:else}
						<WifiOff size={12} />
						<span>Offline</span>
					{/if}
				</div>
			</div>
		</div>

		<div class="flex-1 overflow-y-auto p-6">
			{#if registeredPerson}
				{#if showSummary}
					<!-- Step 3: Summary View -->
					<div class="flex flex-col items-center space-y-6 text-center" in:fade>
						<div
							class="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
						>
							<UserCheck size={32} />
						</div>

						<h3 class="text-xl font-black text-slate-900">Registration Complete!</h3>

						<!-- Person card -->
						<div
							class="w-full overflow-hidden rounded-2xl border-2 border-slate-100 bg-slate-50/50 text-left"
						>
							<div class="flex items-start gap-4 p-5">
								<div
									class="flex size-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-slate-100 bg-white text-slate-300 shadow-md"
								>
									{#if registeredPerson.photoUrl}
										<img
											src={registeredPerson.photoUrl}
											alt={registeredPerson.name}
											class="h-full w-full object-cover"
										/>
									{:else}
										<Users size={32} />
									{/if}
								</div>
								<div class="min-w-0 flex-1 space-y-1.5">
									<h4 class="truncate text-lg font-black text-slate-900">
										{registeredPerson.name}
									</h4>
									<div class="flex flex-wrap items-center gap-2">
										<Badge variant="outline" class="text-[10px] font-bold uppercase"
											>{registeredPerson.categoryName}</Badge
										>
										{#if registeredPerson.subCategoryName}
											<Badge variant="outline" class="text-[10px] font-bold uppercase"
												>{registeredPerson.subCategoryName}</Badge
											>
										{/if}
										{#if registeredPerson.isTrained}
											<Badge
												class="border-emerald-200 bg-emerald-100 text-[10px] font-bold text-emerald-700 uppercase"
												>Trained</Badge
											>
										{:else}
											<Badge
												class="border-rose-200 bg-rose-100 text-[10px] font-bold text-rose-700 uppercase"
												>Pending</Badge
											>
										{/if}
									</div>
								</div>
							</div>

							<div class="grid grid-cols-2 gap-3 border-t border-slate-100 px-5 py-3 text-xs">
								<div>
									<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
										Biometric ID
									</p>
									<p class="font-black text-slate-700">{registeredPerson.biometricId}</p>
								</div>
								<div>
									<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
										Enrollment
									</p>
									{#if enrolledMethod}
										<p class="font-black text-emerald-700 capitalize">{enrolledMethod}</p>
									{:else}
										<p class="font-black text-slate-400">Skipped</p>
									{/if}
								</div>
								{#if registeredPerson.codeNo}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
											Code No.
										</p>
										<p class="font-black text-slate-700">{registeredPerson.codeNo}</p>
									</div>
								{/if}
								{#if registeredPerson.company}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
											Company
										</p>
										<p class="font-black text-slate-700">{registeredPerson.company}</p>
									</div>
								{/if}
								{#if registeredPerson.designation}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
											Designation
										</p>
										<p class="font-black text-slate-700">{registeredPerson.designation}</p>
									</div>
								{/if}
								{#if registeredPerson.department}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
											Department
										</p>
										<p class="font-black text-slate-700">{registeredPerson.department}</p>
									</div>
								{/if}
								{#if registeredPerson.contactNo}
									<div>
										<p class="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
											Phone
										</p>
										<p class="font-black text-slate-700">{registeredPerson.contactNo}</p>
									</div>
								{/if}
							</div>
						</div>

						<Button
							onclick={() => {
								open = false;
							}}
							class="h-12 w-full text-sm font-black tracking-widest uppercase"
						>
							Done
						</Button>
					</div>
				{:else}
					<!-- Step 2: Enrollment -->
					<EnrollmentPanel
						personId={registeredPerson.id}
						biometricId={registeredPerson.biometricId}
						personName={registeredPerson.name}
						categorySlug={registeredPerson.categorySlug}
						initialCardNo={registeredPerson.cardNo}
						onDone={(method, photoUrl) => {
							enrolledMethod = method;
							if (photoUrl && registeredPerson) registeredPerson.photoUrl = photoUrl;
							showSummary = true;
						}}
						onSkip={() => {
							enrolledMethod = null;
							showSummary = true;
						}}
					/>
				{/if}
			{:else if !selectedRootCategoryId}
				<!-- Step 1a: Category selection -->
				<div class="grid grid-cols-1 gap-3 sm:grid-cols-3" in:fade>
					{#each ROOT_CATEGORIES as cat}
						<button
							class="card-pressable group relative cursor-pointer rounded-2xl border-2 border-slate-100 p-5 text-center transition-all hover:border-primary-300 hover:bg-primary-50/50 active:bg-primary-50"
							onclick={() => selectRootCategory(cat.id)}
						>
							<div
								class="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 transition-colors group-hover:bg-primary-100 group-hover:text-primary-600"
							>
								<cat.icon size={28} />
							</div>
							<p class="text-sm font-black tracking-tight text-slate-900 uppercase">
								{i18n.t(cat.slug as any) || cat.name}
							</p>
						</button>
					{/each}
				</div>
			{:else}
				<!-- Step 1b: Registration form -->
				<div class="space-y-6" in:fly={{ x: 20, duration: 300 }}>
					<div
						class="flex items-center justify-between rounded-2xl border-2 border-primary-100 bg-gradient-to-r from-primary-50 to-slate-50 p-4"
					>
						<div class="flex items-center gap-3">
							<div
								class="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600"
							>
								{#if selectedRootCategory}
									<selectedRootCategory.icon size={20} />
								{:else}
									<Users size={20} />
								{/if}
							</div>
							<div>
								<div class="flex items-center gap-2">
									{#if selectedRootCategory}
										<span class="font-black text-slate-900"
											>{i18n.t(selectedRootCategory.slug as any) || selectedRootCategory.name}</span
										>
									{/if}
									{#if selectedSubCategory}
										<ChevronRight size={14} class="text-slate-300" />
										<Badge
											variant="outline"
											class={cn(
												'text-[10px] font-bold',
												getCategoryBadgeClass(selectedSubCategory.slug)
											)}
										>
											{i18n.t(selectedSubCategory.slug as any) || selectedSubCategory.name}
										</Badge>
									{/if}
								</div>
								<p class="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
									Category
								</p>
							</div>
						</div>
						<Button variant="ghost" size="icon" class="size-8" onclick={clearCategorySelection}>
							<X size={16} />
						</Button>
					</div>

					{#if subCategories.length > 0}
						<div class="space-y-2" transition:slide>
							<p class="ml-1 text-[10px] font-bold tracking-widest text-slate-400 uppercase">
								Sub-Category
							</p>
							<div class="flex flex-wrap gap-2">
								{#each subCategories as subCat}
									<button
										class={cn(
											'chip-pressable cursor-pointer rounded-xl border-2 px-4 py-2 text-xs font-black tracking-wider uppercase transition-all',
											selectedSubCategoryId === subCat.id
												? activeColorMap[subCat.color] ||
														'border-primary-500 bg-primary-500 text-white'
												: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
										)}
										onclick={() => selectSubCategory(subCat.id)}
									>
										{i18n.t(subCat.slug as any) || subCat.name}
									</button>
								{/each}
							</div>
						</div>
					{/if}

					<form
						method="POST"
						action="/people?/create"
						class="space-y-5"
						enctype="multipart/form-data"
						use:enhance={({ formData, cancel, formElement }) => {
							if (!deviceOnline && !skipOfflineCheck) {
								showOfflineWarning = true;
								pendingFormSubmit = formElement;
								cancel();
								return;
							}
							skipOfflineCheck = false;
							// Capture form values before submission
							const formName = formData.get('name') as string;
							const formCompany = (formData.get('company') as string) || null;
							const formContactNo = (formData.get('contactNo') as string) || null;
							const formDesignation = (formData.get('designation') as string) || null;
							const formDepartment = (formData.get('department') as string) || null;
							const formCodeNo = (formData.get('codeNo') as string) || null;
							const formCardNo = (formData.get('cardNo') as string) || null;
							const capturedPhoto = photoPreview;
							const capturedTrained = isTrained;
							const rootCatName = selectedRootCategory
								? i18n.t(selectedRootCategory.slug as any) || selectedRootCategory.name
								: '';
							const rootCatSlug = selectedRootCategory?.slug || '';
							const subCatName = selectedSubCategory
								? i18n.t(selectedSubCategory.slug as any) || selectedSubCategory.name
								: null;

							return async ({ result, update }) => {
								if (result.type === 'success') {
									const data = result.data as any;
									appToast.success('Registration successful');
									await update();
									// Transition to enrollment step
									registeredPerson = {
										id: data.personId,
										biometricId: data.biometricId,
										name: data.personName,
										photoUrl: capturedPhoto,
										categoryName: rootCatName,
										categorySlug: rootCatSlug,
										subCategoryName: subCatName,
										company: formCompany,
										contactNo: formContactNo,
										designation: formDesignation,
										department: formDepartment,
										codeNo: formCodeNo,
										cardNo: formCardNo,
										isTrained: capturedTrained
									};
								} else if (result.type === 'failure') {
									const msg = (result.data as any)?.message || 'Registration failed';
									appToast.error(msg);
								} else {
									appToast.error('An unexpected error occurred');
								}
							};
						}}
					>
						<input type="hidden" name="categoryId" value={finalCategoryId} />
						<input type="hidden" name="isTrained" value={isTrained ? 'true' : 'false'} />
						<input type="hidden" name="autoCheckIn" value={autoCheckIn ? 'true' : 'false'} />
						<input type="hidden" name="location" value={location} />
						<input type="hidden" name="purpose" value={purpose} />

						<div
							class="group flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-4 transition-all hover:border-primary-300 hover:bg-primary-50/30"
						>
							<div class="group/photo relative">
								<div
									class="flex size-24 items-center justify-center overflow-hidden rounded-2xl border-2 border-slate-100 bg-white text-slate-300 shadow-md transition-all group-hover/photo:border-primary-200"
								>
									{#if photoPreview}
										<img src={photoPreview} alt="Preview" class="h-full w-full object-cover" />
									{:else}
										<Camera size={32} />
									{/if}
								</div>
								<label
									for="photo-upload"
									class="absolute -right-2 -bottom-2 flex size-8 cursor-pointer items-center justify-center rounded-xl bg-primary-600 text-white shadow-lg transition-all hover:scale-110 hover:bg-primary-700 active:scale-95"
								>
									<Upload size={16} />
									<input
										id="photo-upload"
										name="photo"
										type="file"
										accept="image/*"
										class="hidden"
										onchange={handlePhotoChange}
									/>
								</label>
							</div>
							<p
								class="mt-4 text-[10px] font-black tracking-widest text-slate-400 uppercase transition-colors group-hover:text-primary-600"
							>
								{photoPreview ? 'Change Photo' : 'Upload Photo'}
							</p>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label
									for="reg-name"
									class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
									>{i18n.t('name')} *</Label
								>
								<Input
									id="reg-name"
									name="name"
									required
									class="h-11 border-2"
									placeholder="Full name"
								/>
							</div>
							<div class="space-y-2">
								<Label
									for="reg-codeNo"
									class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
									>{i18n.t('codeNo')}</Label
								>
								<Input
									id="reg-codeNo"
									name="codeNo"
									class="h-11 border-2"
									placeholder="ID / Badge number"
								/>
							</div>
						</div>

						<!-- Access Card Hero Input -->
						<div
							class={cn(
								'space-y-3 rounded-2xl border-2 p-5 transition-all',
								selectedRootCategory?.slug === 'card'
									? 'border-amber-200 bg-amber-50/50 shadow-sm'
									: 'border-slate-100 bg-slate-50/30'
							)}
						>
							<div class="flex items-center gap-3">
								<div
									class={cn(
										'flex size-10 items-center justify-center rounded-xl transition-colors',
										selectedRootCategory?.slug === 'card'
											? 'bg-amber-100 text-amber-600'
											: 'bg-slate-100 text-slate-400'
									)}
								>
									<CreditCard size={20} />
								</div>
								<div>
									<Label
										for="reg-cardNo"
										class={cn(
											'text-[10px] font-black tracking-widest uppercase',
											selectedRootCategory?.slug === 'card' ? 'text-amber-700' : 'text-slate-500'
										)}
									>
										{i18n.t('cardNo')}
										{selectedRootCategory?.slug === 'card' ? ' *' : ' (Optional)'}
									</Label>
									<p class="text-[10px] font-medium text-slate-400">
										{selectedRootCategory?.slug === 'card'
											? 'Manual input for Access Card category'
											: 'Optionally link a card during registration'}
									</p>
								</div>
							</div>
							<Input
								id="reg-cardNo"
								name="cardNo"
								required={selectedRootCategory?.slug === 'card'}
								class={cn(
									'h-14 border-2 text-lg font-black tracking-wider transition-all placeholder:text-slate-300',
									selectedRootCategory?.slug === 'card'
										? 'border-amber-200 bg-white ring-amber-500 focus:ring-2'
										: 'bg-white'
								)}
								placeholder="ENTER CARD NUMBER (e.g. 0012345678)"
							/>
						</div>

						<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label
									for="reg-company"
									class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
									>{i18n.t('company')}</Label
								>
								<Input
									id="reg-company"
									name="company"
									class="h-11 border-2"
									placeholder="Company name"
								/>
							</div>
							<div class="space-y-2">
								<Label
									for="reg-contactNo"
									class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
									>{i18n.t('phone')}</Label
								>
								<Input
									id="reg-contactNo"
									name="contactNo"
									class="h-11 border-2"
									placeholder="Phone number"
								/>
							</div>
							<div class="space-y-2">
								<Label
									for="reg-designation"
									class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
									>{i18n.t('designation')}</Label
								>
								<DesignationCombobox
									name="designation"
									bind:value={designationValue}
									placeholder="Job title"
								/>
							</div>
						</div>

						{#if isEmployee}
							<div class="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/30 p-4">
								<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
									<div class="space-y-2">
										<Label
											for="reg-department"
											class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
											>Department</Label
										>
										<DepartmentCombobox
											name="department"
											bind:value={departmentValue}
											placeholder="Select or add department"
										/>
									</div>
									<div class="space-y-2">
										<DatePicker
											name="joinDate"
											label="Joined Date"
											placeholder="Actual start date"
										/>
									</div>
									<div class="space-y-2">
										<DatePicker
											name="auditJoinDate"
											label="Audit Join Date"
											placeholder="Date for audit reports"
										/>
									</div>
								</div>
							</div>
						{/if}

						<div class="space-y-2">
							<Label
								for="reg-notes"
								class="text-[10px] font-bold tracking-widest text-slate-500 uppercase"
								>{i18n.t('notes')}</Label
							>
							<Input
								id="reg-notes"
								name="notes"
								class="h-11 border-2"
								placeholder="Additional notes"
							/>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<button
								type="button"
								class={cn(
									'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
									isTrained
										? 'border-emerald-200 bg-emerald-50'
										: 'border-slate-100 hover:border-slate-200'
								)}
								onclick={() => (isTrained = !isTrained)}
							>
								<Checkbox checked={isTrained} />
								<div>
									<p class="text-sm font-bold text-slate-900">{i18n.t('isTrained')}</p>
									<p class="text-[10px] font-medium text-slate-500">Safety training completed</p>
								</div>
							</button>
							<button
								type="button"
								class={cn(
									'flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 text-left transition-all',
									autoCheckIn
										? 'border-primary-200 bg-primary-50'
										: 'border-slate-100 hover:border-slate-200'
								)}
								onclick={() => (autoCheckIn = !autoCheckIn)}
							>
								<Checkbox checked={autoCheckIn} />
								<div>
									<p class="text-sm font-bold text-slate-900">{i18n.t('checkInImmediately')}</p>
									<p class="text-[10px] font-medium text-slate-500">Check in after registration</p>
								</div>
							</button>
						</div>

						{#if autoCheckIn}
							<div
								class="space-y-4 rounded-2xl border-2 border-primary-100 bg-primary-50/30 p-4"
								transition:slide
							>
								<div class="space-y-2">
									<Label class="text-[10px] font-black tracking-widest text-primary-700 uppercase"
										>Check-In Location <span class="text-rose-500">*</span></Label
									>
									<div class="grid grid-cols-2 gap-3">
										<button
											type="button"
											class={cn(
												'chip-pressable flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 text-[10px] font-black tracking-widest uppercase transition-all',
												location === 'yard'
													? 'border-primary-500 bg-primary-500 text-white shadow-md'
													: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
											)}
											onclick={() => (location = 'yard')}
										>
											<Warehouse size={18} strokeWidth={location === 'yard' ? 3 : 2} />
											Yard
										</button>
										<button
											type="button"
											class={cn(
												'chip-pressable flex h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 text-[10px] font-black tracking-widest uppercase transition-all',
												location === 'ship'
													? 'border-primary-500 bg-primary-500 text-white shadow-md'
													: 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
											)}
											onclick={() => (location = 'ship')}
										>
											<Ship size={18} strokeWidth={location === 'ship' ? 3 : 2} />
											Ship
										</button>
									</div>
								</div>

								{#if needsPurpose}
									<div class="space-y-2">
										<Label
											for="reg-purpose"
											class="text-[10px] font-black tracking-widest text-primary-700 uppercase"
											>{i18n.t('purpose')} (Optional)</Label
										>
										<Input
											id="reg-purpose"
											bind:value={purpose}
											placeholder="Reason for visit"
											class="h-11 border-2 bg-white"
										/>
									</div>
								{/if}
							</div>
						{/if}

						<Button
							type="submit"
							disabled={!canSubmit}
							class="h-14 w-full gap-2 text-sm font-black tracking-widest uppercase shadow-lg"
						>
							<Save size={20} />
							{i18n.t('save')}
						</Button>
					</form>
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>

<ConfirmModal
	bind:open={showOfflineWarning}
	title="Device is Offline"
	message="No device is currently connected. The person will be registered in the system but biometric enrollment and device sync will not happen until a device comes online."
	confirmText="Register Anyway"
	variant="warning"
	onconfirm={() => {
		skipOfflineCheck = true;
		pendingFormSubmit?.requestSubmit();
	}}
/>
