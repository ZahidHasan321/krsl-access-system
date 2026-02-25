declare module 'svelte-virtual-list' {
	import { SvelteComponent } from 'svelte';
	export default class VirtualList extends SvelteComponent<{
		items: any[];
		height?: string | number;
		itemHeight?: number;
		start?: number;
		end?: number;
	}> {}
}
