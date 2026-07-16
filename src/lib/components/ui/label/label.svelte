<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLLabelAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLLabelAttributes>;

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: Props = $props();
</script>

<label
	bind:this={ref}
	data-slot="label"
	class={cn("text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</label>
