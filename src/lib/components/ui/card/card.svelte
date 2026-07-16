<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const cardVariants = tv({
		base: "rounded-[1rem] border border-border bg-card text-card-foreground shadow-[0_2px_8px_rgba(20,18,12,0.06),0_0_0_1px_rgba(20,18,12,0.04)]",
		variants: {
			tone: {
				default: "",
				subtle: "bg-muted/70",
				ghost: "bg-transparent shadow-none",
			},
		},
		defaultVariants: {
			tone: "default",
		},
	});

	export type CardTone = VariantProps<typeof cardVariants>["tone"];
	export type CardProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		tone?: CardTone;
	};
</script>

<script lang="ts">
	let {
		class: className,
		tone = "default",
		ref = $bindable(null),
		children,
		...restProps
	}: CardProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(cardVariants({ tone }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
