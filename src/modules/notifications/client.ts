"use client";

import { toast as sonnerToast } from "sonner";

const DEFAULT_DURATION_MS = 5000;

type NotifyInput =
  | string
  | {
      title?: string;
      message?: string;
      description?: string;
      durationMs?: number;
      id?: string | number;
    };
type SonnerOptions = Parameters<typeof sonnerToast.success>[1];

function normalize(input: NotifyInput, fallbackTitle: string) {
  if (typeof input === "string") {
    return { title: input, description: undefined, duration: DEFAULT_DURATION_MS };
  }

  return {
    title: input.title ?? input.message ?? fallbackTitle,
    description: input.description ?? (input.title ? input.message : undefined),
    duration: input.durationMs ?? DEFAULT_DURATION_MS,
    id: input.id,
  };
}

export const notify = {
  success(input: NotifyInput, options?: SonnerOptions | string) {
    const next = normalize(input, "Success");
    return sonnerToast.success(next.title, {
      ...(typeof options === "object" ? options : {}),
      description:
        typeof options === "string" ? options : options?.description ?? next.description,
      duration: options && typeof options === "object" && "duration" in options
        ? options.duration
        : next.duration,
      id: next.id,
    });
  },
  error(input: NotifyInput, options?: SonnerOptions | string) {
    const next = normalize(input, "Action failed");
    return sonnerToast.error(next.title, {
      ...(typeof options === "object" ? options : {}),
      description:
        typeof options === "string" ? options : options?.description ?? next.description,
      duration: options && typeof options === "object" && "duration" in options
        ? options.duration
        : next.duration,
      id: next.id,
    });
  },
  info(input: NotifyInput, options?: SonnerOptions | string) {
    const next = normalize(input, "Notice");
    return sonnerToast.info(next.title, {
      ...(typeof options === "object" ? options : {}),
      description:
        typeof options === "string" ? options : options?.description ?? next.description,
      duration: options && typeof options === "object" && "duration" in options
        ? options.duration
        : next.duration,
      id: next.id,
    });
  },
  warning(input: NotifyInput, options?: SonnerOptions | string) {
    const next = normalize(input, "Warning");
    return sonnerToast.warning(next.title, {
      ...(typeof options === "object" ? options : {}),
      description:
        typeof options === "string" ? options : options?.description ?? next.description,
      duration: options && typeof options === "object" && "duration" in options
        ? options.duration
        : next.duration,
      id: next.id,
    });
  },
  important(input: NotifyInput, options?: SonnerOptions | string) {
    const next = normalize(input, "Action required");
    return sonnerToast.warning(next.title, {
      ...(typeof options === "object" ? options : {}),
      description:
        typeof options === "string" ? options : options?.description ?? next.description,
      duration: Infinity,
      id: next.id,
    });
  },
  loading: sonnerToast.loading,
  promise: sonnerToast.promise,
  dismiss: sonnerToast.dismiss,
  custom: sonnerToast.custom,
  message: sonnerToast.message,
};

export const toast = notify;
