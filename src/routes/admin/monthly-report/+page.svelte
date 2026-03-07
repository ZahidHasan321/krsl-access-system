<script lang="ts">
	import { i18n } from '$lib/i18n.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Search,
		Users,
		X,
		Printer,
		CalendarDays,
		Briefcase,
		Building2,
		HardHat,
		UserPlus,
		ChevronDown,
		ChevronUp,
		ChevronLeft,
		ChevronRight
	} from 'lucide-svelte';
	import logo from '$lib/assets/kr_logo.svg';
	import { format, parseISO } from 'date-fns';
	import { clsx } from 'clsx';
	import { utils, writeFile } from 'xlsx';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let selectedMonth = $state('');
	let searchQuery = $state('');
	let hideZeroHours = $state(false);

	$effect(() => {
		selectedMonth = data.month;
	});

	const filteredEmployees = $derived.by(() => {
		const q = searchQuery.trim().toLowerCase();
		let emps = data.employees;
		
		if (hideZeroHours) {
			emps = emps.filter(emp => emp.totalHours > 0);
		}

		if (q) {
			emps = emps.filter(
				(emp) =>
					emp.name.toLowerCase().includes(q) ||
					(emp.codeNo && emp.codeNo.toLowerCase().includes(q)) ||
					(emp.designation && emp.designation.toLowerCase().includes(q)) ||
					(emp.department && emp.department.toLowerCase().includes(q))
			);
		}

		// Flat sort: Department -> ID No
		return [...emps].sort((a, b) => {
			const deptA = a.department || 'Unassigned';
			const deptB = b.department || 'Unassigned';
			if (deptA !== deptB) return deptA.localeCompare(deptB);

			const idA = a.codeNo || '';
			const idB = b.codeNo || '';
			return idA.localeCompare(idB, undefined, { numeric: true });
		});
	});

	function applyFilters() {
		const url = new URL(page.url);
		if (selectedMonth) url.searchParams.set('month', selectedMonth);
		goto(url.toString(), { keepFocus: true, noScroll: true });
	}

	function changeMonth(e: Event) {
		selectedMonth = (e.target as HTMLInputElement).value;
		applyFilters();
	}

	function goToPrevMonth() {
		if (!selectedMonth) return;
		const [year, month] = selectedMonth.split('-').map(Number);
		const d = new Date(year, month - 2);
		selectedMonth = format(d, 'yyyy-MM');
		applyFilters();
	}

	function goToNextMonth() {
		if (!selectedMonth) return;
		const [year, month] = selectedMonth.split('-').map(Number);
		const d = new Date(year, month);
		selectedMonth = format(d, 'yyyy-MM');
		applyFilters();
	}

	function printReport() {
		window.print();
	}

	function exportToExcel() {
		const dataRows = filteredEmployees.map((emp, index) => {
			const displayCategory = emp.categoryId === 'frontliner' ? 'Frontliner' : emp.categoryId === 'management' ? 'Management' : 'Employee';
			
			return {
				'#': index + 1,
				'Name': emp.name,
				'ID No': emp.codeNo || '-',
				'Department': emp.department || 'Unassigned',
				'Category': displayCategory,
				'Designation': emp.designation || 'Unknown',
				'Total Hours': emp.totalHours
			};
		});

		const worksheet = utils.json_to_sheet(dataRows);
		const workbook = utils.book_new();
		utils.book_append_sheet(workbook, worksheet, 'Monthly Report');

		// Set column widths
		const wscols = [
			{ wch: 5 },
			{ wch: 30 },
			{ wch: 15 },
			{ wch: 20 },
			{ wch: 15 },
			{ wch: 20 },
			{ wch: 15 }
		];
		worksheet['!cols'] = wscols;

		writeFile(workbook, `Monthly_Report_${selectedMonth}.xlsx`);
	}

	function getDisplayMonth(monthStr: string) {
		if (!monthStr) return '';
		const [y, m] = monthStr.split('-');
		const d = new Date(parseInt(y), parseInt(m) - 1);
		return format(d, 'MMMM yyyy');
	}
</script>

<svelte:head>
	<title>{i18n.t('monthlyReport')} | {i18n.t('appName')}</title>
</svelte:head>

<!-- Print-only section -->
<div class="print-only">
	<div
		class="print-header"
		style="display: flex !important; justify-content: space-between; align-items: flex-end; padding-bottom: 1.5rem; border-bottom: 2px solid #000; margin-bottom: 2rem;"
	>
		<div style="display: flex; align-items: center; gap: 20px;">
			<img src={logo} alt="Logo" style="height: 70px; width: auto;" />
			<div style="border-left: 2px solid #e2e8f0; padding-left: 20px;">
				<h1 style="font-family: 'HandelGothic', sans-serif; font-size: 32px; color: #0f172a; margin: 0; line-height: 1;">
					<span style="color: #1c55a4;">KR</span> Steel Ltd.
				</h1>
				<p style="font-size: 11px; font-weight: 900; color: #64748b; margin: 6px 0 0 0; letter-spacing: 0.3em; text-transform: uppercase;">
					Access Management System
				</p>
			</div>
		</div>
		<div style="text-align: right;">
			<h2 style="font-size: 18px; font-weight: 900; color: #0f172a; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">
				Monthly Report
			</h2>
			<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
				{getDisplayMonth(selectedMonth)}
			</p>
		</div>
	</div>

	<div style="display: flex !important; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1.25rem 2rem; background: #fff; border: 1px solid #cbd5e1; border-radius: 0;">
		<div style="display: flex; flex-direction: column; gap: 2px;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Total Employees</span>
			<span style="font-size: 15px; font-weight: 900; color: #0f172a;">{data.employees.length}</span>
		</div>
		
		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; padding-left: 2rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Management</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.managementCount}</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: center; border-left: 1px solid #cbd5e1; padding-left: 2rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">Frontliner</span>
			<span style="font-size: 15px; font-weight: 900; color: #1c55a4;">{data.frontlineCount}</span>
		</div>

		<div style="display: flex; flex-direction: column; gap: 2px; align-items: flex-end; border-left: 1px solid #cbd5e1; padding-left: 2rem;">
			<span style="font-size: 9px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.15em;">New Registrations</span>
			<span style="font-size: 15px; font-weight: 900; color: #10b981;">{data.newRegistrationCount}</span>
		</div>
	</div>

	{#if Object.keys(data.departmentCounts).length > 0}
		<div style="margin-bottom: 2rem;">
			<h3 style="font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #000; padding-bottom: 4px;">Employees By Department</h3>
			<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background-color: #cbd5e1; border: 1px solid #000;">
				{#each Object.entries(data.departmentCounts).sort((a, b) => b[1] - a[1]) as [dept, count]}
					<div style="display: flex; justify-content: space-between; padding: 4px 8px; font-size: 9px; background-color: #fff;">
						<span style="font-weight: 800; color: #475569; text-transform: uppercase;">{dept}</span>
						<span style="font-weight: 900; color: #000;">{count}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<table style="width: 100%; border-collapse: collapse; font-size: 10px; font-family: inherit; border: 1px solid #000;">
		<thead>
			<tr style="background: #f0f0f0; -webkit-print-color-adjust: exact;">
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">#</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Name</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">ID No</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Department</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Category</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Designation</th>
				<th style="border: 1px solid #000; padding: 8px 6px; text-align: left; font-weight: 900; color: #000; text-transform: uppercase;">Total Hours</th>
			</tr>
		</thead>
		<tbody>
			{#each filteredEmployees as emp, index}
				{@const displayCategory = emp.categoryId === 'frontliner' ? 'Frontliner' : emp.categoryId === 'management' ? 'Management' : 'Employee'}
				<tr style="page-break-inside: avoid;">
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{index + 1}</td>
					<td style="border: 1px solid #000; padding: 6px; font-weight: 800; color: #000;"
						>{emp.name}</td
					>
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{emp.codeNo || '-'}</td>
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{emp.department || 'Unassigned'}</td>
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{displayCategory}</td>
					<td style="border: 1px solid #000; padding: 6px; color: #000;">{emp.designation || 'Unknown'}</td>
					<td style="border: 1px solid #000; padding: 6px; font-weight: 800; color: #000;">
						{emp.totalHours} hrs
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	<div
		style="margin-top: 3rem; padding-top: 1rem; border-top: 1px dashed #000; display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; color: #000; text-transform: uppercase; letter-spacing: 0.1em;"
	>
		<p>System Generated: {new Date().toISOString()}</p>
		<p>{i18n.t('appName')} Official Report</p>
	</div>
</div>

<!-- Screen view -->
<div class="no-print pb-20">
	<div class="content-container space-y-6">
		<!-- Header & Filters -->
		<div class="flex flex-col justify-between gap-4 px-4 md:flex-row md:items-end md:px-0">
			<div class="space-y-1">
				<h1 class="text-3xl font-black tracking-tighter text-slate-900 capitalize">
					<span class="electric-text">{i18n.t('monthlyReport')}</span>
				</h1>
				<p class="text-sm font-bold text-slate-500">
					View and export employee monthly statistics and working hours.
				</p>
			</div>

			<div class="flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-2">
					<button
						class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 border-slate-100 bg-white text-slate-500 transition-colors hover:bg-slate-50 focus:border-primary-500 focus:outline-none"
						onclick={goToPrevMonth}
						aria-label="Previous Month"
					>
						<ChevronLeft size={18} />
					</button>

					<div
						class="flex items-center gap-3 rounded-2xl border-2 border-slate-100 bg-white p-2 shadow-sm"
					>
						<span class="pl-2 text-[10px] font-black tracking-widest text-slate-400 uppercase"
							>Report Month</span
						>
						<input
							type="month"
							value={selectedMonth}
							onchange={changeMonth}
							class="h-10 cursor-pointer rounded-xl border-2 border-slate-100 bg-slate-50 px-4 text-sm font-black transition-colors hover:bg-white focus:border-primary-500 focus:outline-none"
						/>
					</div>

					<button
						class="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border-2 border-slate-100 bg-white text-slate-500 transition-colors hover:bg-slate-50 focus:border-primary-500 focus:outline-none"
						onclick={goToNextMonth}
						aria-label="Next Month"
					>
						<ChevronRight size={18} />
					</button>
				</div>
			</div>
		</div>

		<main class="space-y-6">
			<!-- Summary Cards -->
			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 px-4 md:px-0">
				<!-- Total Employees -->
				<Card.Root class="overflow-hidden border-2 border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
					<div class="flex items-center gap-4 p-5">
						<div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-600">
							<Users size={24} />
						</div>
						<div>
							<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Total Employees</p>
							<p class="text-2xl font-black text-slate-900">{data.employees.length}</p>
						</div>
					</div>
				</Card.Root>

				<!-- Management -->
				<Card.Root class="overflow-hidden border-2 border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
					<div class="flex items-center gap-4 p-5">
						<div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-teal-100 text-teal-600">
							<Briefcase size={24} />
						</div>
						<div>
							<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Management</p>
							<p class="text-2xl font-black text-slate-900">{data.managementCount}</p>
						</div>
					</div>
				</Card.Root>

				<!-- Frontliner -->
				<Card.Root class="overflow-hidden border-2 border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
					<div class="flex items-center gap-4 p-5">
						<div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
							<HardHat size={24} />
						</div>
						<div>
							<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">Frontliner</p>
							<p class="text-2xl font-black text-slate-900">{data.frontlineCount}</p>
						</div>
					</div>
				</Card.Root>

				<!-- New Registrations -->
				<Card.Root class="overflow-hidden border-2 border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
					<div class="flex items-center gap-4 p-5">
						<div class="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
							<UserPlus size={24} />
						</div>
						<div>
							<p class="text-[10px] font-black tracking-widest text-slate-400 uppercase">New Registrations</p>
							<p class="text-2xl font-black text-slate-900">{data.newRegistrationCount}</p>
						</div>
					</div>
				</Card.Root>
			</div>

			<!-- Department Breakdown -->
			{#if Object.keys(data.departmentCounts).length > 0}
				{@const sortedDepts = Object.entries(data.departmentCounts).sort((a, b) => b[1] - a[1])}
				<Card.Root class="mx-4 overflow-hidden border-2 border-slate-100 bg-white shadow-sm md:mx-0">
					<div class="flex items-center justify-between border-b-2 border-slate-100 bg-slate-50/50 px-5 py-4">
						<h3 class="flex items-center gap-2 text-sm font-black text-slate-900">
							<Building2 size={16} class="text-slate-400" />
							Employees by Department
						</h3>
						<Badge variant="outline" class="bg-white">{sortedDepts.length} Departments</Badge>
					</div>
					<div class="p-5">
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
							{#each sortedDepts as [dept, count]}
								<button 
									class="flex cursor-pointer items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 focus:border-primary-300 focus:outline-none focus:ring-4 focus:ring-primary-500/10"
									onclick={() => searchQuery = dept}
								>
									<span class="truncate pr-2 text-[11px] font-bold text-slate-600 uppercase tracking-wide" title={dept}>{dept}</span>
									<span class="shrink-0 rounded-lg bg-white px-2 py-1 text-xs font-black text-slate-900 shadow-sm ring-1 ring-slate-200/50">{count}</span>
								</button>
							{/each}
						</div>
					</div>
				</Card.Root>
			{/if}

			<!-- Results Table -->
			<div class="space-y-4">
				<div class="flex flex-col gap-4 px-4 md:flex-row md:items-center md:justify-between md:px-0">
					<div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
						<div class="group relative max-w-md flex-1">
							<div
								class="absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary-500"
							>
								<Search size={18} />
							</div>
							<Input
								bind:value={searchQuery}
								placeholder="Search by name, ID or designation..."
								class="h-11 w-full rounded-2xl border-2 border-slate-200 bg-white pr-10 pl-11 text-sm font-bold shadow-sm transition-all focus-visible:border-primary-500 focus-visible:ring-4 focus-visible:ring-primary-500/10"
							/>
							{#if searchQuery}
								<button
									class="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100"
									onclick={() => (searchQuery = '')}
								>
									<X size={14} />
								</button>
							{/if}
						</div>
						<label class="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 w-fit">
							<input type="checkbox" bind:checked={hideZeroHours} class="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-600" />
							Hide 0 Hours
						</label>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<Button
							variant="outline"
							class="h-11 shrink-0 gap-2 rounded-2xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 md:px-6"
							onclick={exportToExcel}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="18"
								height="18"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								class="lucide lucide-file-spreadsheet"
								><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path
									d="M14 2v4a2 2 0 0 0 2 2h4"
								/><path d="M8 13h2" /><path d="M14 13h2" /><path d="M8 17h2" /><path d="M14 17h2" /><path
									d="M10 10h4v10h-4z"
								/></svg
							>
							<span class="hidden sm:inline">Export Excel</span>
						</Button>

						<Button
							variant="outline"
							class="h-11 shrink-0 gap-2 rounded-2xl border-2 border-slate-200 px-4 font-black transition-all hover:border-primary-300 hover:bg-primary-50 md:px-6"
							onclick={printReport}
						>
							<Printer size={18} />
							<span class="hidden sm:inline">{i18n.t('printReport')}</span>
						</Button>
					</div>
				</div>

				{#if filteredEmployees.length > 0}
					<div class="overflow-x-auto rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
						<table class="w-full min-w-[800px] text-sm">
							<thead>
								<tr class="border-b-2 border-slate-100 bg-slate-50">
									<th
										class="w-12 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>#</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Name</th
									>
									<th
										class="w-32 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>ID NO</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Department</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Category</th
									>
									<th
										class="px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Designation</th
									>
									<th
										class="w-32 px-4 py-3 text-left text-[10px] font-black tracking-widest text-slate-400 uppercase"
										>Total Hours</th
									>
								</tr>
							</thead>
							<tbody>
								{#each filteredEmployees as emp, index}
									{@const displayCategory = emp.categoryId === 'frontliner' ? 'Frontliner' : emp.categoryId === 'management' ? 'Management' : 'Employee'}
									<tr
										class="cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50"
										onclick={() => goto(`/people/${emp.id}`)}
									>
										<td class="px-4 py-3 font-bold text-slate-500">{index + 1}</td>
										<td class="px-4 py-3">
											<span class="font-black text-slate-900">{emp.name}</span>
										</td>
										<td class="px-4 py-3 font-bold text-slate-600">{emp.codeNo || '-'}</td>
										<td class="px-4 py-3">
											<span class="text-[10px] font-black tracking-widest text-slate-500 uppercase">{emp.department || 'Unassigned'}</span>
										</td>
										<td class="px-4 py-3">
											<Badge
												variant="outline"
												class={clsx(
													'h-5 px-1.5 text-[9px] font-black tracking-wider uppercase',
													emp.categoryId === 'frontliner' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 
													emp.categoryId === 'management' ? 'border-teal-200 bg-teal-50 text-teal-700' : 
													'border-slate-200 bg-slate-50 text-slate-700'
												)}
											>
												{displayCategory}
											</Badge>
										</td>
										<td class="px-4 py-3 font-bold text-slate-600">{emp.designation || '-'}</td>
										<td class="px-4 py-3">
											<div class="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-700">
												{emp.totalHours} <span class="ml-1 text-[10px] text-slate-400">HRS</span>
											</div>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

				{:else}
					<div
						class="space-y-6 rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center"
					>
						<div
							class="mx-auto flex size-24 items-center justify-center rounded-full bg-slate-100 text-slate-300"
						>
							<Users size={48} />
						</div>
						<div class="space-y-2">
							<p class="text-xl font-black text-slate-600">No employees found</p>
							<p class="text-sm font-bold tracking-widest text-slate-400 uppercase">
								Try adjusting your search filters
							</p>
						</div>
					</div>
				{/if}
			</div>
		</main>
	</div>
</div>