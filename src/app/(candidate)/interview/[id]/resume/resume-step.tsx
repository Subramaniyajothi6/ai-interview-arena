"use client";

import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { FormAlert } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import type { ParsedResume } from "@/lib/resume/analyze";
import { createClient } from "@/lib/supabase/client";
import { processResume, attachExistingResume, type ProcessResumeResult } from "../../actions";

const EXT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

type Attached = { resumeId: string; fileName: string; parsed: ParsedResume };
type Previous = { id: string; fileName: string; uploaded: string };

export function ResumeStep({
  interviewId,
  userId,
  attached: initial,
  previous,
  maxMb,
}: {
  maxMb: number;
  interviewId: string;
  userId: string;
  attached: Attached | null;
  previous: Previous[];
}) {
  const [attached, setAttached] = useState<Attached | null>(initial);
  const [status, setStatus] = useState<"idle" | "uploading" | "reading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = status !== "idle";

  function finish(result: ProcessResumeResult) {
    if (result.ok) {
      setAttached({ resumeId: result.resumeId, fileName: result.fileName, parsed: result.parsed });
      setError(null);
    } else {
      setError(result.error);
    }
    setStatus("idle");
  }

  async function upload(file: File) {
    setError(null);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!EXT_TYPES[ext]) return setError("Upload a PDF, DOC or DOCX file.");
    if (file.size > maxMb * 1024 * 1024) return setError(`The file is larger than ${maxMb} MB.`);
    if (file.size === 0) return setError("The file is empty.");

    setStatus("uploading");
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error: uploadError } = await createClient()
      .storage.from("resumes")
      .upload(path, file, { contentType: EXT_TYPES[ext], upsert: false });
    if (uploadError) {
      setStatus("idle");
      return setError(
        /size/i.test(uploadError.message)
          ? "The file is larger than 5 MB."
          : /mime|type/i.test(uploadError.message)
            ? "Upload a PDF, DOC or DOCX file."
            : "Upload failed. Check your connection and try again.",
      );
    }

    setStatus("reading");
    startTransition(async () =>
      finish(await processResume({ interviewId, path, fileName: file.name })),
    );
  }

  function reuse(resumeId: string) {
    setError(null);
    setStatus("reading");
    startTransition(async () => finish(await attachExistingResume({ interviewId, resumeId })));
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row">
      <section className="card flex shrink-0 flex-col gap-4 !p-6 lg:w-[420px]">
        <h2 className="text-xl">Upload your resume</h2>

        <label
          htmlFor="resume-file"
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files[0];
            if (file && !busy) upload(file);
          }}
          className={`flex h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-card border-2 border-dashed px-4 text-center text-primary-600 ${
            dragging ? "border-primary-600 bg-primary-100" : "border-primary-300 bg-primary-50"
          } ${busy ? "pointer-events-none opacity-60" : ""}`}
        >
          <span className="flex size-[52px] items-center justify-center rounded-full bg-surface">
            <Icon name="upload" size={24} />
          </span>
          <span className="text-sm font-semibold text-text">
            Drag &amp; drop, or <span className="text-primary-600">browse</span>
          </span>
          <span className="text-xs text-muted">PDF, DOC or DOCX · up to {maxMb} MB</span>
        </label>
        <input
          ref={inputRef}
          id="resume-file"
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) upload(file);
          }}
        />

        {error && <FormAlert tone="error">{error}</FormAlert>}

        {(busy || attached) && (
          <div
            className="flex items-center gap-3 rounded-xl border border-border px-3.5 py-3"
            aria-live="polite"
          >
            <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[9px] bg-danger-bg text-danger">
              <Icon name="file" size={18} />
            </span>
            <div className="min-w-0 grow">
              <div className="flex justify-between gap-2 text-[13px]">
                <b className="truncate">
                  {busy
                    ? status === "uploading"
                      ? "Uploading…"
                      : "Reading your resume…"
                    : attached?.fileName}
                </b>
                {!busy && <span className="shrink-0 text-success">Ready</span>}
              </div>
              <div className="relative mt-2 h-1.5 overflow-hidden rounded bg-border-soft">
                <span
                  className={`absolute inset-y-0 left-0 rounded ${busy ? "w-1/2 animate-pulse bg-primary-600" : "w-full bg-success"}`}
                />
              </div>
            </div>
          </div>
        )}

        {previous.length > 0 && !busy && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold text-muted">Or use a previous resume</span>
            {previous.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => reuse(p.id)}
                className="btn btn-sec btn-sm justify-between"
                aria-pressed={attached?.resumeId === p.id}
              >
                <span className="truncate">{p.fileName}</span>
                <span className="shrink-0 text-xs font-normal text-muted">{p.uploaded}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto flex justify-between gap-3 pt-2">
          <Link href="/interview/new" className="btn btn-sec">
            <Icon name="arrowLeft" size={16} />
            Back
          </Link>
          {attached && !busy ? (
            <Link href={`/interview/${interviewId}/instructions`} className="btn">
              Continue
              <Icon name="arrowRight" size={16} />
            </Link>
          ) : (
            <button type="button" className="btn" disabled>
              Continue
              <Icon name="arrowRight" size={16} />
            </button>
          )}
        </div>
      </section>

      <AnalysisPanel parsed={attached?.parsed ?? null} busy={busy} />
    </div>
  );
}

function AnalysisPanel({ parsed, busy }: { parsed: ParsedResume | null; busy: boolean }) {
  const boxes: { title: string; items: string[]; chips?: "chip" | "chip chip-n" }[] = parsed
    ? [
        { title: "Skills", items: parsed.skills, chips: "chip" },
        { title: "Technologies", items: parsed.technologies, chips: "chip chip-n" },
        { title: "Education", items: parsed.education },
        {
          title: "Experience",
          items: parsed.experience.length
            ? parsed.experience
            : parsed.experience_years
              ? [`About ${parsed.experience_years} years mentioned`]
              : [],
        },
        { title: "Projects", items: parsed.projects },
        { title: "Certifications", items: parsed.certifications },
      ]
    : [];

  return (
    <section className="card flex min-w-0 grow flex-col gap-4 !p-6" aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl">
          <span className="text-primary-900">
            <Icon name="sparkle" size={20} />
          </span>
          Resume analysis
        </h2>
        {parsed ? (
          <span className="chip chip-ok">
            <Icon name="check" size={12} strokeWidth={2.5} />
            Complete
          </span>
        ) : busy ? (
          <span className="chip chip-warn">Analysing…</span>
        ) : null}
      </div>

      {!parsed ? (
        <p className="text-[13px] text-muted">
          Upload your resume to see the skills, education, experience, projects and certifications
          we find. Your interview questions draw on them.
        </p>
      ) : (
        <>
          <p className="text-[13px] text-muted">
            Here&apos;s what we found. Your questions will draw on this.
            {parsed.method === "keyword" && " Skills are matched against our skills list."}
          </p>
          <div className="grid gap-3.5 sm:grid-cols-2">
            {boxes.map((b) => (
              <div
                key={b.title}
                className="flex flex-col gap-2.5 rounded-xl border border-border-soft bg-[#FCFBFA] p-3.5"
              >
                <span className="text-xs font-bold tracking-[0.06em] text-muted uppercase">
                  {b.title}
                </span>
                {b.items.length === 0 ? (
                  <span className="text-[13px] text-muted">Nothing found</span>
                ) : b.chips ? (
                  <div className="flex flex-wrap gap-2">
                    {b.items.map((i) => (
                      <span key={i} className={b.chips}>
                        {i}
                      </span>
                    ))}
                  </div>
                ) : (
                  <ul className="flex flex-col gap-1.5 text-[13px] leading-snug">
                    {b.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
