<script lang="ts">
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";

	type Props = WithElementRef<HTMLAttributes<HTMLDivElement>>;

	let {
		class: className,
		ref = $bindable(null),
		children,
		...restProps
	}: Props = $props();
</script>

<div
	bind:this={ref}
	data-slot="card-header"
	class={cn("flex flex-col gap-1.5 px-6 pt-6", className)}
	{...restProps}
>
	{@render children?.()}
</div>
