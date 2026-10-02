"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { FormAlert } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { JOB_DESCRIPTION_FILE_MAX_BYTES, JOB_DESCRIPTION_MAX_CHARS } from "@/lib/constants";
import type { JobMatch } from "@/lib/interview/job-match";
import { isNetworkError, withNetworkErrors } from "@/lib/network";
import { clearJobDescription, readJobDescriptionFile, saveJobDescription } from "../../actions";

const FILE_TYPES = ["pdf", "doc", "docx"];

export function JobStep({
  interviewId,
  jobRole,
  saved: initial,
}: {
  interviewId: string;
  jobRole: string;
  saved: { text: string; match: JobMatch | null } | null;
}) {
  const router = useRouter();
  const [text, setText] = useState(initial?.text ?? "");
  const [saved, setSaved] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"reading" | "analysing" | "skipping" | null>(null);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(0);

  const match = saved?.match ?? null;
  // The analysis on screen belongs to the text in the box.
  const upToDate = saved !== null && saved.text === text.trim();
  const instructions = `/interview/${interviewId}/instructions`;

  function analyse(value: string) {
    setError(null);
    setBusy("analysing");
    startTransition(async () => {
      const result = await withNetworkErrors(() =>
        saveJobDescription({ interviewId, text: value }),
      );
      setBusy(null);
      if (isNetworkError(result)) return setError(result.networkError);
      if (!result.ok) return setError(result.error);
      setText(result.text);
      setSaved({ text: result.text, match: result.match });
      setRevealed((n) => n + 1);
    });
  }

  // Below lg the result sits under the form, so bring it into view.
  useEffect(() => {
    if (revealed && window.matchMedia("(max-width: 1023px)").matches)
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [revealed]);

  function readFile(file: File) {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!FILE_TYPES.includes(ext)) return setError("Upload a PDF, DOC or DOCX file.");
    if (file.size === 0) return setError("The file is empty.");
    if (file.size > JOB_DESCRIPTION_FILE_MAX_BYTES)
      return setError("The file is larger than 2 MB.");
    const data = new FormData();
    data.set("interviewId", interviewId);
    data.set("file", file);
    setBusy("reading");
    startTransition(async () => {
      const result = await withNetworkErrors(() => readJobDescriptionFile(data));
      if (isNetworkError(result)) {
        setBusy(null);
        return setError(result.networkError);
      }
      if (!result.ok) {
        setBusy(null);
        return setError(result.error);
      }
      setText(result.text);
      analyse(result.text);
    });
  }

  function skip() {
    setError(null);
    setBusy("skipping");
    startTransition(async () => {
      const result = await withNetworkErrors(() => clearJobDescription(interviewId));
      if (isNetworkError(result)) {
        setBusy(null);
        return setError(result.networkError);
      }
      if (result.error) {
        setBusy(null);
        return setError(result.error);
      }
      router.push(instructions);
    });
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <section className="card flex min-w-0 flex-col gap-4 !p-6 lg:w-[520px] lg:shrink-0">
        <div>
          <h2 className="text-xl">
            Job description <span className="text-sm font-normal text-muted">(optional)</span>
          </h2>
          <p className="mt-1 text-[13px] text-muted">
            Paste the job post you&apos;re preparing for, or upload it. We&apos;ll compare it with
            your resume and start your interview with the skills the job needs that your resume
            doesn&apos;t show yet.
          </p>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <label className="label !mb-0" htmlFor="jobDescription">
              Job description
            </label>
            <span className="text-xs text-muted" aria-live="polite">
              {text.length.toLocaleString("en-IN")} /{" "}
              {JOB_DESCRIPTION_MAX_CHARS.toLocaleString("en-IN")}
            </span>
          </div>
          <textarea
            id="jobDescription"
            className="input mt-1.5 min-h-[240px] resize-y"
            placeholder={`e.g. We are hiring a ${jobRole}. You will build… Requirements: React, TypeScript, REST APIs…`}
            value={text}
            maxLength={JOB_DESCRIPTION_MAX_CHARS}
            disabled={busy !== null}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn btn-sec btn-sm"
            disabled={busy !== null}
            onClick={() => fileRef.current?.click()}
          >
            <Icon name="upload" size={16} />
            {busy === "reading" ? "Reading file…" : "Upload a file instead"}
          </button>
          <span className="text-xs text-muted">PDF, DOC or DOCX · up to 2 MB</span>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-label="Upload job description file"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) readFile(file);
            }}
          />
        </div>

        {error && <FormAlert tone="error">{error}</FormAlert>}

        <div className="mt-auto flex flex-wrap justify-between gap-3 pt-2">
          <Link href={`/interview/${interviewId}/resume`} className="btn btn-sec">
            <Icon name="arrowLeft" size={16} />
            Back
          </Link>
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className="btn btn-ghost" disabled={busy !== null} onClick={skip}>
              {busy === "skipping" ? "Skipping…" : saved ? "Continue without it" : "Skip"}
            </button>
            {upToDate ? (
              <Link href={instructions} className="btn">
                Continue
                <Icon name="arrowRight" size={16} />
              </Link>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={busy !== null || text.trim().length === 0}
                onClick={() => analyse(text)}
              >
                {busy === "analysing"
                  ? "Comparing…"
                  : saved
                    ? "Compare again"
                    : "Compare with resume"}
                {busy !== "analysing" && <Icon name="arrowRight" size={16} />}
              </button>
            )}
          </div>
        </div>
      </section>

      <MatchPanel
        ref={panelRef}
        match={upToDate ? match : null}
        busy={busy === "analysing"}
        stale={saved !== null && !upToDate}
      />
    </div>
  );
}

function MatchPanel({
  ref,
  match,
  busy,
  stale,
}: {
  ref: React.Ref<HTMLElement>;
  match: JobMatch | null;
  busy: boolean;
  stale: boolean;
}) {
  return (
    <section
      ref={ref}
      className="card flex min-w-0 grow scroll-mt-24 flex-col gap-4 !p-6"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl">
          <span className="text-primary-900">
            <Icon name="target" size={20} />
          </span>
          Resume vs job
        </h2>
        {busy ? (
          <span className="chip chip-warn">Comparing…</span>
        ) : match ? (
          <span className="chip chip-ok">
            <Icon name="check" size={12} strokeWidth={2.5} />
            Complete
          </span>
        ) : null}
      </div>

      {!match ? (
        <p className="text-[13px] text-muted">
          {stale
            ? "You changed the job description. Compare again to update the result."
            : "Add a job description to see which of its skills your resume already shows, and which ones to work on. You can also skip this step and practise for the role in general."}
        </p>
      ) : match.required.length === 0 ? (
        <p className="rounded-xl bg-bg p-3.5 text-[13px] text-text-2">
          We couldn&apos;t find skills from our skills list in this job description, so your
          interview will follow your role and resume as usual. Try pasting the requirements section
          of the job post.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border-soft bg-[#FCFBFA] p-4">
            <div className="font-display text-[40px] leading-none font-bold">
              {match.match_percent}%
            </div>
            <div className="min-w-0 grow">
              <div className="text-sm font-semibold">Match with your resume</div>
              <div className="text-[13px] text-muted">
                Your resume shows {match.matched.length} of the {match.required.length} skills this
                job asks for.
              </div>
              <div className="relative mt-2 h-2 overflow-hidden rounded bg-border-soft">
                <span
                  className="absolute inset-y-0 left-0 rounded bg-primary-600"
                  style={{ width: `${match.match_percent ?? 0}%` }}
                />
              </div>
            </div>
          </div>

          <SkillGroup
            title="Skills to work on"
            empty="None — your resume shows every skill we found in this job description."
            note={
              match.gaps.length
                ? "Your interview starts with questions on these, so you can practise where you're lagging."
                : undefined
            }
            items={match.gaps}
            chip="chip chip-warn"
          />
          <SkillGroup
            title="Already on your resume"
            empty="None of the job's skills were found on your resume."
            items={match.matched}
            chip="chip chip-ok"
            check
          />
          {match.method === "keyword" && (
            <p className="text-xs text-muted">
              Skills are matched against our skills list. Make sure your resume names the tools
              you&apos;ve used.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function SkillGroup({
  title,
  items,
  empty,
  note,
  chip,
  check,
}: {
  title: string;
  items: string[];
  empty: string;
  note?: string;
  chip: string;
  check?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-xs font-bold tracking-[0.06em] text-muted uppercase">
        {title} ({items.length})
      </span>
      {items.length === 0 ? (
        <span className="text-[13px] text-muted">{empty}</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((s) => (
            <span key={s} className={chip}>
              {check && <Icon name="check" size={12} strokeWidth={2.5} />}
              {s}
            </span>
          ))}
        </div>
      )}
      {note && <span className="text-[13px] text-text-2">{note}</span>}
    </div>
  );
}
