<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const badgeVariants = tv({
		base: "inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] whitespace-nowrap",
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground",
				secondary: "bg-accent text-accent-foreground",
				outline: "border border-border bg-muted/80 text-muted-foreground",
				live: "bg-[color:var(--na-live)] text-white",
			},
		},
		defaultVariants: {
			variant: "secondary",
		},
	});

	export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
	export type BadgeProps = WithElementRef<HTMLAttributes<HTMLSpanElement>> & {
		variant?: BadgeVariant;
	};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "secondary",
		ref = $bindable(null),
		children,
		...restProps
	}: BadgeProps = $props();
</script>

<span
	bind:this={ref}
	data-slot="badge"
	class={cn(badgeVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</span>
