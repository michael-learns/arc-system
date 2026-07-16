<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLTextareaAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLTextareaAttributes>;

	let {
		class: className,
		ref = $bindable(null),
		...restProps
	}: Props = $props();
</script>

<textarea
	bind:this={ref}
	data-slot="textarea"
	class={cn(
		"flex min-h-28 w-full rounded-[0.5rem] border border-input bg-background px-3 py-2 text-sm text-foreground shadow-[0_1px_0_rgba(20,18,12,0.03)] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	{...restProps}
></textarea>
