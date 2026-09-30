import type { Metadata } from "next";
import Link from "next/link";
import { DifficultyChip, EmptyRow, Pagination, SearchInput } from "@/components/admin/admin-ui";
import { AutoFilterForm } from "@/components/admin/auto-filter-form";
import { FormAlert } from "@/components/ui/form";
import {
  DIFFICULTY_VALUES,
  PAGE_SIZE,
  pageParam,
  param,
  ROLE_VALUES,
  searchTerm,
  TYPE_VALUES,
} from "@/lib/admin-query";
import { requireAdmin } from "@/lib/auth";
import {
  DIFFICULTIES,
  INTERVIEW_TYPES,
  JOB_ROLES,
  type Difficulty,
  type InterviewType,
  type JobRole,
} from "@/lib/constants";
import { difficultyLabel, typeLabel } from "@/lib/format";
import { QuestionForm, type QuestionValues } from "./question-form";

export const metadata: Metadata = { title: "Question bank" };

export default async function QuestionsPage({ searchParams }: PageProps<"/admin/questions">) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;

  const { data: skillRows } = await supabase.from("question_bank").select("skill");
  const skills = [...new Set((skillRows ?? []).map((r) => r.skill))].sort((a, b) =>
    a.localeCompare(b),
  );

  const q = searchTerm(sp);
  const role = param(sp, "role", [...ROLE_VALUES, "all"]);
  const skill = param(sp, "skill", skills);
  const difficulty = param(sp, "difficulty", DIFFICULTY_VALUES);
  const type = param(sp, "type", TYPE_VALUES);
  const editId = param(sp, "edit");
  const isNew = param(sp, "new") === "1";
  const page = pageParam(sp);

  let query = supabase
    .from("question_bank")
    .select("id, question, job_role, skill, difficulty, interview_type, is_active", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (q) query = query.ilike("question", `%${q}%`);
  if (role === "all") query = query.is("job_role", null);
  else if (role) query = query.eq("job_role", role as JobRole);
  if (skill) query = query.eq("skill", skill);
  if (difficulty) query = query.eq("difficulty", difficulty as Difficulty);
  if (type) query = query.eq("interview_type", type as InterviewType);
  const { data, count } = await query;
  const rows = data ?? [];

  let editing: QuestionValues | null = null;
  if (editId) {
    const { data: row } = await supabase
      .from("question_bank")
      .select("*")
      .eq("id", editId)
      .maybeSingle();
    if (row) {
      editing = {
        id: row.id,
        question: row.question,
        jobRole: row.job_role ?? "",
        skill: row.skill,
        difficulty: row.difficulty,
        interviewType: row.interview_type,
        expectedAnswer: row.expected_answer,
        isActive: row.is_active,
      };
    }
  } else if (isNew) {
    editing = {
      question: "",
      jobRole: role && role !== "all" ? role : "",
      skill: skill || "",
      difficulty: difficulty || "medium",
      interviewType: type || "technical",
      expectedAnswer: "",
      isActive: true,
    };
  }

  const filters = Object.fromEntries(
    Object.entries({ q, role, skill, difficulty, type }).filter(([, v]) => v),
  );
  const editHref = (id: string) =>
    `/admin/questions?${new URLSearchParams({ ...filters, ...(page > 1 ? { page: String(page) } : {}), edit: id })}`;
  const notice = param(sp, "saved")
    ? "Question saved."
    : param(sp, "deleted")
      ? "Question deleted."
      : null;

  return (
    <div className="mx-auto flex max-w-[1216px] flex-col gap-5">
      {notice && <FormAlert tone="success">{notice}</FormAlert>}
      <AutoFilterForm label="Filter questions">
        <SearchInput defaultValue={q} placeholder="Search questions…" className="w-full sm:w-72" />
        <select aria-label="Role" name="role" defaultValue={role} className="input !w-auto">
          <option value="">All roles</option>
          <option value="all">General (all roles)</option>
          {JOB_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select aria-label="Skill" name="skill" defaultValue={skill} className="input !w-auto">
          <option value="">All skills</option>
          {skills.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select
          aria-label="Difficulty"
          name="difficulty"
          defaultValue={difficulty}
          className="input !w-auto"
        >
          <option value="">All levels</option>
          {DIFFICULTIES.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
        <select aria-label="Type" name="type" defaultValue={type} className="input !w-auto">
          <option value="">All types</option>
          {INTERVIEW_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {Object.keys(filters).length > 0 && (
          <Link href="/admin/questions" className="btn btn-ghost">
            Clear
          </Link>
        )}
        <Link href="/admin/questions?new=1" className="btn sm:hidden">
          Add question
        </Link>
      </AutoFilterForm>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        <section className="card min-w-0 grow !px-2 !py-2">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Job role</th>
                  <th>Skill</th>
                  <th>Level</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <EmptyRow colSpan={5}>No questions match these filters.</EmptyRow>
                )}
                {rows.map((row) => (
                  <tr key={row.id} className={row.id === editId ? "bg-primary-50" : "hover:bg-bg"}>
                    <td className="max-w-[300px]">
                      <Link
                        href={editHref(row.id)}
                        className="font-semibold text-text no-underline hover:text-primary-700"
                      >
                        {row.question}
                      </Link>
                      {!row.is_active && (
                        <span className="chip chip-n mt-1 !h-5 !text-[11px]">Inactive</span>
                      )}
                    </td>
                    <td className="min-w-28">{row.job_role ?? "All roles"}</td>
                    <td>
                      <span className="chip chip-n">{row.skill}</span>
                    </td>
                    <td>
                      <DifficultyChip
                        value={row.difficulty}
                        label={difficultyLabel(row.difficulty)}
                      />
                    </td>
                    <td>{typeLabel(row.interview_type)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/admin/questions"
            params={filters}
            page={page}
            pageSize={PAGE_SIZE}
            total={count ?? 0}
          />
        </section>
        {editing && <QuestionForm key={editing.id ?? "new"} values={editing} />}
      </div>
    </div>
  );
}
