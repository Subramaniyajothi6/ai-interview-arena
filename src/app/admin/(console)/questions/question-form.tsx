"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormAlert, SubmitButton } from "@/components/ui/form";
import { DIFFICULTIES, INTERVIEW_TYPES, JOB_ROLES } from "@/lib/constants";
import { deleteQuestion, saveQuestion, type AdminFormState } from "../actions";

export type QuestionValues = {
  id?: string;
  question: string;
  jobRole: string;
  skill: string;
  difficulty: string;
  interviewType: string;
  expectedAnswer: string;
  isActive: boolean;
};

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1.5 text-xs text-danger">{msg}</p> : null;
}

export function QuestionForm({ values }: { values: QuestionValues }) {
  const [state, action] = useActionState<AdminFormState, FormData>(saveQuestion, {});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const err = state.fieldErrors ?? {};

  return (
    <section
      className="card flex flex-col gap-4 xl:w-[380px] xl:shrink-0"
      aria-label={values.id ? "Edit question" : "Add question"}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base">{values.id ? "Edit question" : "Add question"}</h2>
        <Link
          href="/admin/questions"
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-lg text-text-2 no-underline hover:bg-bg"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </Link>
      </div>
      {state.error && <FormAlert tone="error">{state.error}</FormAlert>}

      <form action={action} noValidate className="flex flex-col gap-3.5">
        {values.id && <input type="hidden" name="id" value={values.id} />}
        <div>
          <label className="label" htmlFor="question">
            Question
          </label>
          <textarea
            id="question"
            name="question"
            rows={3}
            className="input"
            defaultValue={values.question}
          />
          <Err msg={err.question} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="jobRole">
              Job role
            </label>
            <select id="jobRole" name="jobRole" className="input" defaultValue={values.jobRole}>
              <option value="">All roles</option>
              {JOB_ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="skill">
              Skill
            </label>
            <input
              id="skill"
              name="skill"
              className="input"
              defaultValue={values.skill}
              placeholder="e.g. SQL"
            />
            <Err msg={err.skill} />
          </div>
          <div>
            <label className="label" htmlFor="difficulty">
              Difficulty
            </label>
            <select
              id="difficulty"
              name="difficulty"
              className="input"
              defaultValue={values.difficulty}
            >
              {DIFFICULTIES.map((d) => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="interviewType">
              Type
            </label>
            <select
              id="interviewType"
              name="interviewType"
              className="input"
              defaultValue={values.interviewType}
            >
              {INTERVIEW_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="label" htmlFor="expectedAnswer">
            Expected answer
          </label>
          <textarea
            id="expectedAnswer"
            name="expectedAnswer"
            rows={5}
            className="input"
            defaultValue={values.expectedAnswer}
            placeholder="Key points a good answer covers."
          />
          <Err msg={err.expectedAnswer} />
        </div>
        <label className="flex items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={values.isActive}
            className="size-4 accent-primary-600"
          />
          Active (used in new interviews)
        </label>
        <div className="flex justify-end gap-2.5">
          <Link href="/admin/questions" className="btn btn-sec">
            Cancel
          </Link>
          <SubmitButton pendingText="Saving…" className="btn">
            Save question
          </SubmitButton>
        </div>
      </form>

      {values.id && (
        <div className="border-t border-border-soft pt-3.5">
          {confirmDelete ? (
            <form action={deleteQuestion} className="flex flex-wrap items-center gap-2.5">
              <input type="hidden" name="id" value={values.id} />
              <span className="text-[13px] text-danger">Delete this question permanently?</span>
              <button
                type="button"
                className="btn btn-sec btn-sm"
                onClick={() => setConfirmDelete(false)}
              >
                Keep
              </button>
              <button type="submit" className="btn btn-danger btn-sm">
                Delete
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="btn btn-ghost btn-sm !text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete question
            </button>
          )}
        </div>
      )}
    </section>
  );
}
