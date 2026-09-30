"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSpeechToText } from "@/components/interview/use-speech-to-text";
import { FormAlert } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { endInterview, submitAnswer } from "./actions";

export type RoomQuestion = {
  id: string;
  label: string; // "3" or "3a"
  question: string;
  skill: string | null;
  source: string;
  status: "answered" | "skipped" | "current" | "upcoming";
};

const draftKey = (id: string) => `aia-draft-${id}`;
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

function useElapsed(startedAt: string | null) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  if (!startedAt || now === null) return "00:00";
  const s = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function InterviewRoom({
  interviewId,
  meta,
  questions,
  startedAt,
}: {
  interviewId: string;
  meta: { role: string; type: string; difficulty: string };
  questions: RoomQuestion[];
  startedAt: string | null;
}) {
  const router = useRouter();
  const current = questions.find((q) => q.status === "current");
  const index = current ? questions.indexOf(current) : questions.length;
  const doneCount = questions.filter(
    (q) => q.status === "answered" || q.status === "skipped",
  ).length;

  const [mode, setMode] = useState<"text" | "voice">("text");
  const [usedVoice, setUsedVoice] = useState(false);
  const [answer, setAnswer] = useState("");
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [pending, startTransition] = useTransition();
  const shownAt = useRef<number>(0);
  const elapsed = useElapsed(startedAt);

  // Load the saved draft whenever a new question appears.
  useEffect(() => {
    if (!current) return;
    shownAt.current = Date.now();
    let draft = "";
    try {
      draft = localStorage.getItem(draftKey(current.id)) ?? "";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAnswer(draft);
    setUsedVoice(false);
    setError(null);
  }, [current]);

  // Autosave the draft in this browser.
  useEffect(() => {
    if (!current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey(current.id), answer);
        setSavedAt(true);
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [answer, current]);

  const appendSpeech = useCallback((text: string) => {
    if (!text) return;
    setUsedVoice(true);
    setAnswer((a) => (a.trim() ? `${a.trimEnd()} ${text}` : text));
  }, []);
  const speech = useSpeechToText(appendSpeech);

  function send(skipped: boolean) {
    if (!current) return;
    speech.stop();
    setError(null);
    startTransition(async () => {
      const result = await submitAnswer({
        interviewId,
        questionId: current.id,
        answer: skipped ? "" : answer,
        mode: usedVoice ? "voice" : "text",
        skipped,
        durationSeconds: Math.round((Date.now() - shownAt.current) / 1000),
      });
      if (!result.ok) return setError(result.error);
      try {
        localStorage.removeItem(draftKey(current.id));
      } catch {}
      if (result.done) router.push(`/interview/${interviewId}/complete`);
      else router.refresh();
    });
  }

  function end() {
    speech.stop();
    startTransition(async () => {
      const result = await endInterview(interviewId);
      if (!result.ok) return setError(result.error);
      router.push(`/interview/${interviewId}/complete`);
    });
  }

  return (
    <>
      <header className="sticky top-0 z-10 flex min-h-[72px] flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-[18px]">
          <span className="hidden sm:block">
            <Logo href="/dashboard" />
          </span>
          <span className="hidden h-6 w-px bg-border sm:block" />
          <span className="truncate text-sm font-semibold">{meta.role}</span>
          <span className="chip chip-n hidden md:inline-flex">{meta.type}</span>
          <span className="chip chip-n hidden md:inline-flex">{meta.difficulty}</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-[13px] font-semibold whitespace-nowrap">
              Question {Math.min(index + 1, questions.length)} of {questions.length}
            </span>
            <span className="relative hidden h-2 w-[120px] overflow-hidden rounded bg-border-soft sm:block">
              <span
                className="absolute inset-y-0 left-0 rounded bg-primary-600"
                style={{ width: `${(doneCount / questions.length) * 100}%` }}
              />
            </span>
          </div>
          <span className="chip chip-n font-mono" aria-label={`Elapsed time ${elapsed}`}>
            <Icon name="clock" size={12} />
            {elapsed}
          </span>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={() => setConfirmEnd(true)}
            disabled={pending}
          >
            End interview
          </button>
        </div>
      </header>

      {confirmEnd && (
        <div
          role="alertdialog"
          aria-labelledby="end-title"
          className="border-b border-[#F4C7C2] bg-danger-bg px-4 py-3 sm:px-8"
        >
          <div className="mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-3">
            <p id="end-title" className="text-sm text-danger">
              End the interview now? Questions you haven&apos;t answered will be left out.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-sec btn-sm"
                onClick={() => setConfirmEnd(false)}
              >
                Keep going
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={end}
                disabled={pending}
              >
                {pending ? "Ending…" : "Yes, end interview"}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-[1280px] grow flex-col gap-5 px-4 py-6 sm:px-8 lg:flex-row">
        {current ? (
          <div className="flex min-w-0 grow flex-col gap-4">
            <section className="card flex items-start gap-5 !p-[26px]">
              <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white sm:flex">
                <Icon name="sparkle" size={26} />
              </span>
              <div className="flex flex-col gap-2.5">
                <span className="eyebrow">
                  Interviewer · Question {current.label}
                  {current.source === "follow_up" && " · Follow-up"}
                </span>
                <h1 className="font-display text-[22px] leading-snug font-semibold tracking-[-0.01em]">
                  {current.question}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {current.source === "resume" && (
                    <span className="chip chip-n">Based on: your resume</span>
                  )}
                  {current.skill && <span className="chip chip-n">Skill: {current.skill}</span>}
                </div>
              </div>
            </section>

            <section className="card flex grow flex-col gap-3.5 !p-[22px]">
              <div className="flex items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="Answer mode"
                  className="flex gap-2 rounded-xl bg-bg p-1"
                >
                  {(["text", "voice"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mode === m}
                      onClick={() => {
                        if (m === "text") speech.stop();
                        setMode(m);
                      }}
                      className={`inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border-0 px-4 text-sm ${
                        mode === m
                          ? "bg-surface font-semibold text-primary-900 shadow-[0_1px_2px_rgba(23,21,42,0.10)]"
                          : "bg-transparent text-text-2"
                      }`}
                    >
                      <Icon name={m === "text" ? "file" : "mic"} size={16} />
                      {m === "text" ? "Text" : "Voice"}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-muted" aria-live="polite">
                  {savedAt && answer ? "Draft autosaved" : ""}
                </span>
              </div>

              {mode === "voice" && (
                <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-border-soft bg-[#FCFBFA] p-3.5">
                  {speech.supported === false ? (
                    <p className="text-[13px] text-muted">
                      Voice answers need Chrome, Edge or Safari. You can type your answer instead.
                    </p>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={speech.listening ? speech.stop : speech.start}
                        aria-label={speech.listening ? "Stop recording" : "Start recording"}
                        className={`flex size-14 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-white ${
                          speech.listening
                            ? "bg-danger shadow-[0_0_0_6px_#FEF3F2]"
                            : "bg-primary-600 shadow-[0_0_0_6px_#EDE9FE]"
                        }`}
                      >
                        <Icon name="mic" size={22} />
                      </button>
                      <div className="min-w-0 grow text-[13px]" aria-live="polite">
                        {speech.listening ? (
                          <>
                            <span className="chip chip-warn">Recording · speak now</span>
                            {speech.interim && (
                              <p className="mt-1.5 text-muted italic">{speech.interim}</p>
                            )}
                          </>
                        ) : (
                          <span className="text-muted">
                            Tap the microphone and speak. Your words appear below, and you can edit
                            them before submitting.
                          </span>
                        )}
                        {speech.error && <p className="mt-1.5 text-danger">{speech.error}</p>}
                      </div>
                    </>
                  )}
                </div>
              )}

              <label htmlFor="answer" className="sr-only">
                Your answer
              </label>
              <textarea
                id="answer"
                className="input min-h-[220px] grow !text-[15px]"
                placeholder={
                  mode === "voice" ? "Your transcript appears here…" : "Type your answer…"
                }
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                maxLength={10000}
                disabled={pending}
              />

              {error && <FormAlert tone="error">{error}</FormAlert>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted">{words(answer)} words</span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => send(true)}
                    disabled={pending}
                  >
                    Skip question
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => send(false)}
                    disabled={pending || !answer.trim()}
                  >
                    {pending ? "Saving…" : "Submit answer"}
                    {!pending && <Icon name="arrowRight" size={16} />}
                  </button>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <section className="card grow text-center">
            <p className="text-sm text-muted">All questions are answered.</p>
          </section>
        )}

        <aside className="card flex shrink-0 flex-col gap-3.5 lg:w-[260px]" aria-label="Progress">
          <h2 className="text-[15px]">Progress</h2>
          <ol className="flex flex-col gap-3">
            {questions.map((q) => (
              <li
                key={q.id}
                className={`flex items-center gap-2.5 text-[13px] ${q.status === "upcoming" ? "text-muted" : "text-text"} ${q.status === "current" ? "font-semibold" : ""}`}
                aria-current={q.status === "current" ? "step" : undefined}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    q.status === "answered"
                      ? "bg-primary-600 text-white"
                      : q.status === "skipped"
                        ? "bg-border-soft text-muted"
                        : q.status === "current"
                          ? "border-2 border-primary-600 bg-surface text-primary-900"
                          : "border-[1.5px] border-[#D6D2C8] text-muted"
                  }`}
                >
                  {q.status === "answered" ? (
                    <Icon name="check" size={12} strokeWidth={3} />
                  ) : (
                    q.label
                  )}
                </span>
                <span className="line-clamp-1">{q.skill ?? q.question}</span>
                {q.status === "skipped" && (
                  <span className="chip chip-n !h-5 !px-1.5 !text-[10px]">Skipped</span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-auto text-xs leading-snug text-muted">
            Your answers are saved as you go. Drafts are kept in this browser.
          </p>
        </aside>
      </main>
    </>
  );
}
