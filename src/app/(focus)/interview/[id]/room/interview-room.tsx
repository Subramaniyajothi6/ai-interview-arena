"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useSpeechToText } from "@/components/interview/use-speech-to-text";
import { FormAlert } from "@/components/ui/form";
import { Icon } from "@/components/ui/icon";
import { Logo } from "@/components/ui/logo";
import { isNetworkError, withNetworkErrors } from "@/lib/network";
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

function clock(fromMs: number | null, now: number | null) {
  if (fromMs === null || now === null) return "00:00";
  const s = Math.max(0, Math.floor((now - fromMs) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

// Current time, updated every second (null until mounted, to match the server render).
function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

// Decorative level bars; they move while the microphone is listening.
const BAR_HEIGHTS = [
  10, 18, 26, 14, 30, 20, 12, 24, 32, 16, 22, 28, 12, 20, 30, 18, 26, 14, 22, 32, 16, 24,
];
function Waveform({ active, compact = false }: { active: boolean; compact?: boolean }) {
  const bars = compact ? BAR_HEIGHTS.slice(0, 12) : BAR_HEIGHTS;
  return (
    <span className="flex h-9 min-w-0 grow items-center gap-[3px] overflow-hidden" aria-hidden>
      {bars.map((h, i) => (
        <span
          key={i}
          className={`w-[3px] shrink-0 rounded-full ${active ? "wave-bar bg-primary-600" : "bg-primary-200"}`}
          style={{ height: active ? h : 6, animationDelay: `${(i % 7) * 0.12}s` }}
        />
      ))}
      {!compact &&
        Array.from({ length: 18 }, (_, i) => (
          <span key={`d${i}`} className="size-[3px] shrink-0 rounded-full bg-primary-200" />
        ))}
    </span>
  );
}

export function InterviewRoom({
  interviewId,
  meta,
  questions,
  previous,
  startedAt,
  allowVoice,
}: {
  interviewId: string;
  meta: { role: string; type: string; difficulty: string };
  questions: RoomQuestion[];
  previous: { label: string; text: string } | null;
  startedAt: string | null;
  allowVoice: boolean;
}) {
  const router = useRouter();
  const current = questions.find((q) => q.status === "current");
  const index = current ? questions.indexOf(current) : questions.length;
  const doneCount = questions.filter(
    (q) => q.status === "answered" || q.status === "skipped",
  ).length;
  const isFollowUp = current?.source === "follow_up";

  const [mode, setMode] = useState<"text" | "voice">("text");
  const [usedVoice, setUsedVoice] = useState(false);
  const [answer, setAnswer] = useState("");
  const [savedAt, setSavedAt] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const confirmEndRef = useRef<HTMLButtonElement>(null);
  // Move focus to the confirm button so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (confirmEnd) confirmEndRef.current?.focus();
  }, [confirmEnd]);
  const [recStart, setRecStart] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const shownAt = useRef<number>(0);
  const now = useNow();
  const elapsed = clock(startedAt ? new Date(startedAt).getTime() : null, now);

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
  const voiceAvailable = allowVoice && speech.supported !== false;
  const recording = clock(recStart, now);

  function startRecording() {
    setRecStart(Date.now());
    speech.start();
  }
  function toggleRecording() {
    if (speech.listening) speech.stop();
    else startRecording();
  }
  function reRecord() {
    speech.stop();
    setAnswer("");
    startRecording();
  }

  function send(skipped: boolean) {
    if (!current) return;
    speech.stop();
    setError(null);
    startTransition(async () => {
      const result = await withNetworkErrors(() =>
        submitAnswer({
          interviewId,
          questionId: current.id,
          answer: skipped ? "" : answer,
          mode: usedVoice ? "voice" : "text",
          skipped,
          durationSeconds: Math.round((Date.now() - shownAt.current) / 1000),
        }),
      );
      // The draft stays saved in this browser, so nothing typed is lost.
      if (isNetworkError(result)) return setError(result.networkError);
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
    setEndError(null);
    startTransition(async () => {
      const result = await withNetworkErrors(() => endInterview(interviewId));
      // Shown in the confirm bar, which is always on screen.
      if (isNetworkError(result)) return setEndError(result.networkError);
      if (!result.ok) return setEndError(result.error);
      router.push(`/interview/${interviewId}/complete`);
    });
  }

  const status = speech.listening ? (
    <span className="chip chip-warn">
      <span className="size-2 animate-pulse rounded-full bg-accent" />
      Recording · {recording}
    </span>
  ) : savedAt && answer ? (
    <span className="chip chip-ok">
      <Icon name="check" size={12} strokeWidth={3} />
      Autosaved
    </span>
  ) : null;

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-surface px-4 py-3 sm:px-8">
        {/* Phone header: role, timer, End, and a segmented progress bar. */}
        <div className="flex flex-col gap-3 sm:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold">{meta.role}</p>
              <p className="text-xs text-muted">
                {meta.type} · {meta.difficulty}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="chip chip-n font-mono" aria-label={`Elapsed time ${elapsed}`}>
                <Icon name="clock" size={12} />
                {elapsed}
              </span>
              <button
                type="button"
                className="btn btn-danger btn-sm !px-3"
                onClick={() => setConfirmEnd(true)}
                disabled={pending}
              >
                End
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="flex grow gap-1" aria-hidden>
              {questions.map((q, i) => (
                <span
                  key={q.id}
                  className={`h-1 grow rounded-full ${
                    i < index ? "bg-primary-600" : i === index ? "bg-primary-300" : "bg-border-soft"
                  }`}
                />
              ))}
            </span>
            <span className="text-xs font-semibold whitespace-nowrap">
              {Math.min(index + 1, questions.length)} of {questions.length}
            </span>
          </div>
        </div>

        <div className="hidden min-h-12 items-center justify-between gap-3 sm:flex">
          <div className="flex min-w-0 items-center gap-[18px]">
            <Logo href="/dashboard" />
            <span className="h-6 w-px bg-border" />
            <span className="truncate text-sm font-semibold">{meta.role}</span>
            <span className="chip chip-n hidden md:inline-flex">{meta.type}</span>
            <span className="chip chip-n hidden md:inline-flex">{meta.difficulty}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <span className="text-[13px] font-semibold whitespace-nowrap">
                Question {Math.min(index + 1, questions.length)} of {questions.length}
              </span>
              <span className="relative hidden h-2 w-[120px] overflow-hidden rounded bg-border-soft md:block">
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
        </div>

        {/* Inside the sticky header, so it shows even when the page is scrolled. */}
        {confirmEnd && (
          <div
            role="alertdialog"
            aria-labelledby="end-title"
            className="-mx-4 mt-3 -mb-3 border-t border-[#F4C7C2] bg-danger-bg px-4 py-3 sm:-mx-8 sm:px-8"
          >
            <div className="mx-auto flex max-w-[1216px] flex-wrap items-center justify-between gap-3">
              <p id="end-title" className="text-sm text-danger">
                End the interview now? Questions you haven&apos;t answered will be left out.
              </p>
              {endError && <p className="w-full text-sm font-semibold text-danger">{endError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-sec btn-sm"
                  onClick={() => {
                    setConfirmEnd(false);
                    setEndError(null);
                  }}
                >
                  Keep going
                </button>
                <button
                  ref={confirmEndRef}
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
      </header>

      <main className="mx-auto flex w-full max-w-[1280px] grow flex-col gap-5 px-4 pt-5 pb-40 sm:px-8 sm:py-6 lg:flex-row">
        {current ? (
          <div className="flex min-w-0 grow flex-col gap-4">
            {previous && (
              <div className="hidden items-center gap-3 rounded-card border border-border bg-[#FBFAF8] px-4 py-2.5 sm:flex">
                <span className="chip chip-ok shrink-0">
                  <Icon name="check" size={12} strokeWidth={3} />
                  Answered
                </span>
                <span className="truncate text-[13px] text-muted">
                  Q{previous.label} · &ldquo;{previous.text}
                  {previous.text.length >= 160 ? "…" : ""}&rdquo;
                </span>
              </div>
            )}

            <section
              className={`card flex items-start gap-5 !p-5 sm:!p-[26px] ${
                isFollowUp ? "!border-primary-300 !bg-[#FAF8FF]" : ""
              }`}
            >
              <span className="hidden size-14 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white sm:flex">
                <Icon name="sparkle" size={26} />
              </span>
              <div className="flex min-w-0 flex-col gap-2.5">
                {isFollowUp ? (
                  <span className="chip self-start">
                    <Icon name="message" size={12} />
                    Follow-up · based on your answer
                  </span>
                ) : (
                  <>
                    <span className="flex items-center gap-2 text-xs font-semibold text-muted sm:hidden">
                      <span className="flex size-6 items-center justify-center rounded-md bg-primary-600 text-white">
                        <Icon name="sparkle" size={14} />
                      </span>
                      AI interviewer · Question {current.label}
                    </span>
                    <span className="eyebrow hidden sm:block">
                      AI interviewer · Question {current.label}
                    </span>
                  </>
                )}
                <h1 className="font-display text-[20px] leading-snug font-semibold tracking-[-0.01em] sm:text-[22px]">
                  {current.question}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {current.source === "resume" && (
                    <span className="chip chip-n">Based on: your resume</span>
                  )}
                  {current.source === "gap" && (
                    <span className="chip chip-warn">Skill gap from the job description</span>
                  )}
                  {current.skill && <span className="chip">Skill: {current.skill}</span>}
                </div>
              </div>
            </section>

            <section className="card flex grow flex-col gap-3.5 !p-4 sm:!p-[22px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold sm:hidden">Your answer</span>
                {voiceAvailable ? (
                  <div
                    role="tablist"
                    aria-label="Answer mode"
                    className="hidden gap-2 rounded-xl bg-bg p-1 sm:flex"
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
                        <Icon name={m === "text" ? "pencil" : "mic"} size={16} />
                        {m === "text" ? "Text" : "Voice"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="hidden text-sm font-semibold sm:inline">Your answer</span>
                )}
                <span aria-live="polite">{status}</span>
              </div>

              {allowVoice && speech.supported === false && mode === "voice" && (
                <p className="text-[13px] text-muted">
                  Voice answers need Chrome, Edge or Safari. You can type your answer instead.
                </p>
              )}

              {mode === "voice" && voiceAvailable && (
                <div className="hidden items-center gap-4 sm:flex">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    aria-label={speech.listening ? "Stop recording" : "Start recording"}
                    aria-pressed={speech.listening}
                    className={`flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 text-white shadow-[0_0_0_8px_#EDE9FE] ${
                      speech.listening ? "bg-primary-700" : "bg-primary-600"
                    }`}
                  >
                    <Icon name="mic" size={24} />
                  </button>
                  <Waveform active={speech.listening} />
                </div>
              )}

              {speech.error && <FormAlert tone="error">{speech.error}</FormAlert>}

              {mode === "voice" ? (
                <div className="flex grow flex-col gap-2 rounded-xl border border-border-soft bg-[#FCFBFA] p-3.5 focus-within:border-primary-600">
                  <label htmlFor="answer" className="eyebrow !text-muted">
                    Live transcript
                  </label>
                  <textarea
                    id="answer"
                    className="min-h-[170px] grow resize-none border-0 bg-transparent text-[15px] leading-relaxed outline-none"
                    placeholder={
                      speech.listening ? "Listening…" : "Tap the microphone and start speaking."
                    }
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={10000}
                    disabled={pending}
                  />
                  {speech.interim && (
                    <p className="text-[15px] text-muted italic" aria-live="polite">
                      {speech.interim}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <label htmlFor="answer" className="sr-only">
                    Your answer
                  </label>
                  <textarea
                    id="answer"
                    className="input min-h-[220px] grow !text-[15px] max-sm:!border-0 max-sm:!p-0 max-sm:!shadow-none"
                    placeholder="Type your answer…"
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    maxLength={10000}
                    disabled={pending}
                  />
                  {speech.interim && (
                    <p className="text-sm text-muted italic sm:hidden" aria-live="polite">
                      {speech.interim}
                    </p>
                  )}
                </>
              )}

              {error && <FormAlert tone="error">{error}</FormAlert>}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-muted">
                  {mode === "voice" ? (
                    <span className="hidden sm:inline">
                      You can edit the transcript before submitting.
                    </span>
                  ) : null}
                  <span className={mode === "voice" ? "sm:hidden" : ""}>{words(answer)} words</span>
                </span>
                <span className="text-xs text-muted sm:hidden">
                  {voiceAvailable ? "Voice or type" : ""}
                </span>
                <div className="hidden gap-2.5 sm:flex">
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => send(true)}
                    disabled={pending}
                  >
                    Skip question
                  </button>
                  {mode === "voice" && voiceAvailable && (
                    <button
                      type="button"
                      className="btn btn-sec"
                      onClick={reRecord}
                      disabled={pending}
                    >
                      <Icon name="refresh" size={16} />
                      Re-record
                    </button>
                  )}
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

        <aside
          className="card hidden shrink-0 flex-col gap-3.5 lg:flex lg:w-[260px]"
          aria-label="Progress"
        >
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
                <span className="line-clamp-1">
                  {q.source === "follow_up"
                    ? `Follow-up: ${q.skill ?? "details"}`
                    : (q.skill ?? q.question)}
                </span>
                {q.source === "follow_up" && (
                  <span className="chip !h-5 !px-1.5 !text-[10px]">AI</span>
                )}
                {q.source === "gap" && (
                  <span className="chip chip-warn !h-5 !px-1.5 !text-[10px]">Gap</span>
                )}
                {q.status === "skipped" && (
                  <span className="chip chip-n !h-5 !px-1.5 !text-[10px]">Skipped</span>
                )}
              </li>
            ))}
          </ol>
          <p className="mt-auto text-xs leading-snug text-muted">
            Follow-ups are added when an answer needs more depth. Drafts are kept in this browser.
          </p>
        </aside>
      </main>

      {/* Phone: answer controls pinned to the bottom, like the mobile room board. */}
      {current && (
        <div className="fixed inset-x-0 bottom-0 z-10 flex flex-col gap-3 border-t border-border bg-surface px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:hidden">
          {voiceAvailable && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleRecording}
                aria-label={speech.listening ? "Stop recording" : "Answer by voice"}
                aria-pressed={speech.listening}
                className="flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-primary-600 text-white shadow-[0_0_0_6px_#EDE9FE]"
              >
                <Icon name="mic" size={20} />
              </button>
              <Waveform active={speech.listening} compact />
              {speech.listening && (
                <span className="chip chip-warn font-mono">
                  <span className="size-2 animate-pulse rounded-full bg-accent" />
                  {recording}
                </span>
              )}
            </div>
          )}
          <div className="grid grid-cols-[1fr_1.6fr] gap-2.5">
            <button
              type="button"
              className="btn btn-sec"
              onClick={() => send(true)}
              disabled={pending}
            >
              Skip
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
      )}
    </>
  );
}
