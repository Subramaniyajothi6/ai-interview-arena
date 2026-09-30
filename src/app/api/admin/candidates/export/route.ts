import { NextResponse, type NextRequest } from "next/server";
import { param, ROLE_VALUES, searchTerm } from "@/lib/admin-query";
import { createClient } from "@/lib/supabase/server";
import type { JobRole } from "@/lib/constants";
import { experienceLabel } from "@/lib/format";

// Values starting with = + - @ are treated as formulas by spreadsheet apps;
// prefix them so exported data can't run as a formula.
function csvCell(value: unknown) {
  let s = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// CSV export of candidates (admins only), honouring the list's filters.
export async function GET(request: NextRequest) {
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

  const sp = Object.fromEntries(request.nextUrl.searchParams);
  const q = searchTerm(sp);
  const role = param(sp, "role", ROLE_VALUES);
  const status = param(sp, "status", ["active", "disabled"]);

  let query = supabase
    .from("profiles")
    .select(
      "full_name, email, phone, education, preferred_role, experience_level, status, created_at, last_active_at, interviews(count)",
    )
    .eq("role", "candidate")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (q) query = query.or(`full_name.ilike.%${q}%,email.ilike.%${q}%`);
  if (role) query = query.eq("preferred_role", role as JobRole);
  if (status) query = query.eq("status", status as "active" | "disabled");
  const { data } = await query;

  const header = [
    "Name",
    "Email",
    "Phone",
    "Education",
    "Preferred role",
    "Experience",
    "Interviews",
    "Status",
    "Registered",
    "Last active",
  ];
  const lines = (data ?? []).map((c) =>
    [
      c.full_name,
      c.email,
      c.phone,
      c.education,
      c.preferred_role,
      c.experience_level ? experienceLabel(c.experience_level) : "",
      c.interviews?.[0]?.count ?? 0,
      c.status,
      c.created_at.slice(0, 10),
      c.last_active_at?.slice(0, 10) ?? "",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...lines].join("\r\n");

  return new NextResponse(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="candidates-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
