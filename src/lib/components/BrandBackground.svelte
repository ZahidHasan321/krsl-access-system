<script lang="ts">
    import { onMount } from 'svelte';

    /**
     * Famous Polygon Mesh Animation (Nodes and Lines)
     * A lightweight canvas implementation for the brand background.
     */

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    let animationFrame: number;

    const NODE_COUNT = 80;
    const CONNECT_DISTANCE = 220;
    const NODE_SPEED = 0.5;

    interface Node {
        x: number;
        y: number;
        vx: number;
        vy: number;
        r: number;
    }

    let nodes: Node[] = [];
    let width = 0;
    let height = 0;

    function initNodes() {
        nodes = [];
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * NODE_SPEED,
                vy: (Math.random() - 0.5) * NODE_SPEED,
                r: Math.random() * 2 + 0.5
            });
        }
    }

    function update() {
        if (!ctx) return;

        ctx.clearRect(0, 0, width, height);
        
        // Draw connections
        ctx.beginPath();
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < CONNECT_DISTANCE) {
                    const opacity = 1 - dist / CONNECT_DISTANCE;
                    // Use a slightly more visible slate color
                    ctx.strokeStyle = `rgba(15, 23, 42, ${opacity * 0.15})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                }
            }
        }
        ctx.stroke();

        // Draw and update nodes
        nodes.forEach(node => {
            ctx!.beginPath();
            ctx!.arc(node.x, node.y, node.r, 0, Math.PI * 2);
            ctx!.fillStyle = 'rgba(15, 23, 42, 0.15)';
            ctx!.fill();

            node.x += node.vx;
            node.y += node.vy;

            // Bounce off edges
            if (node.x < 0 || node.x > width) node.vx *= -1;
            if (node.y < 0 || node.y > height) node.vy *= -1;
        });

        animationFrame = requestAnimationFrame(update);
    }

    function handleResize() {
        if (!canvas) return;
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
        initNodes();
    }

    onMount(() => {
        ctx = canvas.getContext('2d');
        handleResize();
        window.addEventListener('resize', handleResize);
        update();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrame);
        };
    });
</script>

<canvas
    bind:this={canvas}
    class="fixed inset-0 -z-10 pointer-events-none opacity-60"
></canvas>

<style>
    canvas {
        /* Prevent layout shifts */
        backface-visibility: hidden;
    }
</style>
