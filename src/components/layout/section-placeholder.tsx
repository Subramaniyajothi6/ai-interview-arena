import { Icon, type IconName } from "@/components/ui/icon";

// Temporary content for admin sections that are not built yet.
export function SectionPlaceholder({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-[1120px]">
      <section className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
          <Icon name={icon} size={22} />
        </span>
        <h2 className="text-lg">{title}</h2>
        <p className="max-w-md text-sm text-muted">{description}</p>
        <span className="chip chip-n">Coming soon</span>
      </section>
    </div>
  );
}
