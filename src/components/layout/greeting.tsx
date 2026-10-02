"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

// "Good morning/afternoon/evening" in the viewer's own time zone. The server
// render (and first paint) says "Welcome back" to avoid a hydration mismatch.
export function Greeting({ name }: { name: string }) {
  const hour = useSyncExternalStore(
    noop,
    () => new Date().getHours(),
    () => null,
  );
  const text =
    hour === null
      ? "Welcome back"
      : hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";
  return (
    <h2 className="text-2xl">
      {text}, {name}
    </h2>
  );
}
