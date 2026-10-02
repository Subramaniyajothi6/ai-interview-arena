import { initials } from "@/lib/auth";

// Round profile picture, falling back to the person's initials.
export function Avatar({
  name,
  url,
  size = 36,
  className = "bg-primary-600",
}: {
  name: string;
  url?: string | null;
  size?: number;
  className?: string;
}) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small user photo from Supabase Storage
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 3) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
