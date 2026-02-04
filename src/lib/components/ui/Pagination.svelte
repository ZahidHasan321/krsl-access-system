<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { Button } from '$lib/components/ui/button';
    import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
    import { i18n } from '$lib/i18n.svelte';

    interface Props {
        currentPage: number;
        totalPages: number;
        pageSize?: number;
        pageSizeOptions?: number[];
        onPageChange?: (page: number) => void;
        onPageSizeChange?: (size: number) => void;
    }

    let { 
        currentPage, 
        totalPages, 
        pageSize = 20, 
        pageSizeOptions = [20, 50, 100], 
        onPageChange,
        onPageSizeChange
    }: Props = $props();

    function changePage(newPage: number) {
        if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
        
        if (onPageChange) {
            onPageChange(newPage);
        } else {
            const url = new URL($page.url);
            url.searchParams.set('page', newPage.toString());
            goto(url.toString(), { keepFocus: true });
        }
    }

    function changePageSize(event: Event) {
        const newSize = Number((event.target as HTMLSelectElement).value);
        if (onPageSizeChange) {
            onPageSizeChange(newSize);
        } else {
            const url = new URL($page.url);
            url.searchParams.set('limit', newSize.toString());
            url.searchParams.set('page', '1'); // Reset to first page
            goto(url.toString(), { keepFocus: true });
        }
    }

    function getVisiblePages(current: number, total: number) {
        if (total <= 7) {
            return Array.from({ length: total }, (_, i) => i + 1);
        }

        const pages = [1];
        
        if (current > 4) {
            pages.push(-1); // Ellipsis
        }

        const start = Math.max(2, current - 1);
        const end = Math.min(total - 1, current + 1);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        if (current < total - 3) {
            pages.push(-1); // Ellipsis
        }

        if (total > 1) {
            pages.push(total);
        }

        return pages;
    }

    let visiblePages = $derived(getVisiblePages(currentPage, totalPages));
</script>

<div class="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
    <!-- Page Size Selector -->
    <div class="flex items-center gap-2 text-sm text-gray-600">
        <span>Rows per page:</span>
        <select 
            value={pageSize} 
            onchange={changePageSize}
            class="pl-2 pr-8 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none bg-white cursor-pointer"
        >
            {#each pageSizeOptions as size}
                <option value={size}>{size}</option>
            {/each}
        </select>
    </div>

    <!-- Pagination Controls -->
    <div class="flex items-center gap-2">
        <Button 
            variant="outline" 
            class="w-10 h-10 p-0" 
            onclick={() => changePage(1)} 
            disabled={currentPage === 1}
            aria-label="First page"
        >
            <ChevronsLeft size={16} />
        </Button>
        <Button 
            variant="outline" 
            class="w-10 h-10 p-0" 
            onclick={() => changePage(currentPage - 1)} 
            disabled={currentPage === 1}
            aria-label="Previous page"
        >
            <ChevronLeft size={16} />
        </Button>

        {#if totalPages > 0}
            <div class="hidden sm:flex gap-2">
                {#each visiblePages as p}
                    {#if p === -1}
                        <span class="px-2 py-2 text-gray-400">...</span>
                    {:else}
                        <Button 
                            variant={p === currentPage ? 'default' : 'outline'} 
                            class="w-10 h-10 p-0" 
                            onclick={() => changePage(p)}
                        >
                            {p}
                        </Button>
                    {/if}
                {/each}
            </div>
            <!-- Mobile Page Indicator -->
            <span class="sm:hidden text-sm font-medium text-gray-700">
                Page {currentPage} of {totalPages}
            </span>
        {/if}

        <Button 
            variant="outline" 
            class="w-10 h-10 p-0" 
            onclick={() => changePage(currentPage + 1)} 
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label="Next page"
        >
            <ChevronRight size={16} />
        </Button>
        <Button 
            variant="outline" 
            class="w-10 h-10 p-0" 
            onclick={() => changePage(totalPages)} 
            disabled={currentPage === totalPages || totalPages === 0}
            aria-label="Last page"
        >
            <ChevronsRight size={16} />
        </Button>
    </div>
</div>