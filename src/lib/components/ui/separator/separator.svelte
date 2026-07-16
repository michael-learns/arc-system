<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		orientation?: "horizontal" | "vertical";
		decorative?: boolean;
	};

	let {
		class: className,
		orientation = "horizontal",
		decorative = true,
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="separator"
	role={decorative ? "none" : "separator"}
	aria-orientation={orientation}
	class={cn(
		"shrink-0 bg-border",
		orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
		className
	)}
	{...restProps}
></div>
