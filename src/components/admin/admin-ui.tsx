import Link from "next/link";
import { initials } from "@/lib/auth";

const AVATAR_TONES = [
  "bg-primary-100 text-primary-900",
  "bg-warning-bg text-warning",
  "bg-success-bg text-success",
  "bg-danger-bg text-danger",
  "bg-info-bg text-info",
  "bg-border-soft text-text-2",
];

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  const tone =
    AVATAR_TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${tone}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
    >
      {initials(name)}
    </span>
  );
}

export function PersonCell({ name, email }: { name: string; email?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar name={name || email || "?"} />
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{name || "—"}</span>
        {email && <span className="block truncate text-xs text-muted">{email}</span>}
      </span>
    </div>
  );
}

// Previous / Next links that keep the current filters in the URL.
export function Pagination({
  basePath,
  params,
  page,
  pageSize,
  total,
}: {
  basePath: string;
  params: Record<string, string>;
  page: number;
  pageSize: number;
  total: number;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (p: number) => {
    const q = new URLSearchParams({ ...params, page: String(p) });
    return `${basePath}?${q.toString()}`;
  };
  return (
    <div className="flex items-center justify-between gap-3 px-3 pt-2 pb-1 text-[13px]">
      <span className="text-muted">
        Showing {from}–{to} of {total.toLocaleString("en-IN")}
      </span>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={href(page - 1)} className="btn btn-sec btn-sm">
            Previous
          </Link>
        ) : (
          <span className="btn btn-sec btn-sm" aria-disabled="true">
            Previous
          </span>
        )}
        {to < total ? (
          <Link href={href(page + 1)} className="btn btn-sec btn-sm">
            Next
          </Link>
        ) : (
          <span className="btn btn-sec btn-sm" aria-disabled="true">
            Next
          </span>
        )}
      </div>
    </div>
  );
}

const DIFFICULTY_CHIPS: Record<string, string> = {
  easy: "chip-ok",
  medium: "chip-warn",
  hard: "chip-bad",
  expert: "chip-bad",
};

export function DifficultyChip({ value, label }: { value: string; label: string }) {
  return <span className={`chip ${DIFFICULTY_CHIPS[value] ?? "chip-n"}`}>{label}</span>;
}

export function SearchInput({
  defaultValue,
  placeholder,
  className = "w-full sm:w-80",
}: {
  defaultValue: string;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <label htmlFor="q" className="sr-only">
        {placeholder}
      </label>
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        className="pointer-events-none absolute top-3.5 left-3.5 text-muted"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        className="input !pl-10"
        placeholder={placeholder}
      />
    </div>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="!py-10 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
