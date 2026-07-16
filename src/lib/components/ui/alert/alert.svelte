<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const alertVariants = tv({
		base: "relative w-full rounded-[0.75rem] border px-4 py-3 text-sm",
		variants: {
			variant: {
				default: "border-border bg-card text-card-foreground",
				destructive: "border-destructive/25 bg-destructive/10 text-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	});

	export type AlertVariant = VariantProps<typeof alertVariants>["variant"];
	export type AlertProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
		variant?: AlertVariant;
	};
</script>

<script lang="ts">
	let {
		class: className,
		variant = "default",
		ref = $bindable(null),
		children,
		...restProps
	}: AlertProps = $props();
</script>

<div
	bind:this={ref}
	data-slot="alert"
	role="alert"
	class={cn(alertVariants({ variant }), className)}
	{...restProps}
>
	{@render children?.()}
</div>
