import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Opens a candidate's resume for an admin via a short-lived signed URL.
// The storage bucket is private; admins can read it through RLS.
export async function GET(_request: NextRequest, ctx: RouteContext<"/api/admin/resumes/[id]">) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin" || me.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!resume) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: signed } = await supabase.storage
    .from("resumes")
    .createSignedUrl(resume.storage_path, 60);
  if (!signed) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
