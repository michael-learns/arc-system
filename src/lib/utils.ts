import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { WithElementRef } from "bits-ui";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export type { WithElementRef };
export type WithoutChild<T> = T extends { child?: unknown } ? Omit<T, "child"> : T;
export type WithoutChildren<T> = T extends { children?: unknown } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
