<script lang="ts">
	import logo from '$lib/assets/kr_logo.svg';
	import { format } from 'date-fns';

	let { title, subtitle }: { title: string; subtitle?: string } = $props();
</script>

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
			{title}
		</h2>
		<p style="font-size: 12px; font-weight: 700; color: #64748b; margin: 4px 0 0 0;">
			{subtitle ?? `${format(new Date(), 'PPPP')} | ${format(new Date(), 'hh:mm a')}`}
		</p>
	</div>
</div>
