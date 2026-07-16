<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLSelectAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLSelectAttributes>;

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: Props = $props();
</script>

<select
	bind:this={ref}
	data-slot="select"
	class={cn(
		"flex h-11 w-full appearance-none rounded-[0.5rem] border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground shadow-[0_1px_0_rgba(20,18,12,0.03)] transition-[border-color,box-shadow] outline-none focus-visible:border-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</select>
