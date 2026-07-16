<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLHeadingElement>>;

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: Props = $props();
</script>

<h3
	bind:this={ref}
	data-slot="card-title"
	class={cn("font-[family-name:var(--font-editorial,Georgia,serif)] text-[1.35rem] font-medium tracking-[-0.015em] text-foreground", className)}
	{...restProps}
>
	{@render children?.()}
</h3>
