import Link from "next/link";
import { Icon } from "./icon";

export function Logo({
  href = "/",
  tone = "dark",
  label = "Interview Arena",
}: {
  href?: string;
  tone?: "dark" | "light";
  label?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2.5 no-underline ${tone === "light" ? "text-white hover:text-white" : "text-ink hover:text-ink"}`}
    >
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-primary-600 text-white">
        <Icon name="sparkle" />
      </span>
      <span className="font-display text-[17px] font-bold tracking-[-0.02em]">{label}</span>
    </Link>
  );
}
