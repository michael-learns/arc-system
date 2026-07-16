<script lang="ts" module>
	import { cn, type WithElementRef } from "$lib/utils.js";
	import type { HTMLAttributes } from "svelte/elements";
	import { type VariantProps, tv } from "tailwind-variants";

	export const avatarVariants = tv({
		base: "inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[color:var(--na-accent-ink)] font-semibold uppercase",
		variants: {
			size: {
				sm: "size-8 text-[0.72rem]",
				md: "size-10 text-sm",
				lg: "size-12 text-base",
			},
		},
		defaultVariants: {
			size: "sm",
		},
	});

	export type AvatarSize = VariantProps<typeof avatarVariants>["size"];
	export type AvatarProps = WithElementRef<HTMLAttributes<HTMLSpanElement>> & {
		src?: string;
		alt?: string;
		fallback?: string;
		size?: AvatarSize;
	};
</script>

<script lang="ts">
	let {
		class: className,
		src,
		alt = "",
		fallback = "",
		size = "sm",
		ref = $bindable(null),
		children,
		...restProps
	}: AvatarProps = $props();
</script>

<span
	bind:this={ref}
	data-slot="avatar"
	class={cn(avatarVariants({ size }), className)}
	{...restProps}
>
	{#if src}
		<img class="size-full rounded-full object-cover" {src} {alt} />
	{:else if children}
		{@render children?.()}
	{:else}
		{fallback}
	{/if}
</span>
