import { requireUser } from "@/lib/auth";

// Distraction-free pages (interview room, completion): no sidebar.
export default async function FocusLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <div className="flex min-h-dvh flex-col bg-bg">{children}</div>;
}
