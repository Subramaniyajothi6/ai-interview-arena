"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

const BARS = 14;

// Optional microphone test: asks for permission and shows live input levels.
export function MicCheck() {
  const [state, setState] = useState<"idle" | "listening" | "ok" | "denied" | "unsupported">(
    "idle",
  );
  const [levels, setLevels] = useState<number[]>(Array(BARS).fill(0.08));
  const cleanup = useRef<() => void>(() => {});

  useEffect(() => () => cleanup.current(), []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) return setState("unsupported");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      let frame = 0;
      let heard = false;
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const next = Array.from({ length: BARS }, (_, i) => Math.max(0.08, data[i + 1] / 255));
        setLevels(next);
        if (!heard && next.some((v) => v > 0.35)) {
          heard = true;
          setState("ok");
        }
        frame = requestAnimationFrame(tick);
      };
      setState("listening");
      tick();
      const timeout = setTimeout(() => cleanup.current(), 15000);
      cleanup.current = () => {
        clearTimeout(timeout);
        cancelAnimationFrame(frame);
        stream.getTracks().forEach((t) => t.stop());
        ctx.close();
        setLevels(Array(BARS).fill(0.08));
        cleanup.current = () => {};
      };
    } catch {
      setState("denied");
    }
  }

  return (
    <section className="card flex flex-col gap-3.5">
      <div>
        <h3 className="text-base">Microphone check</h3>
        <p className="mt-0.5 text-[13px] text-muted">Only needed for voice answers.</p>
      </div>
      <div className="flex h-12 items-center gap-[3px]" aria-hidden="true">
        {levels.map((v, i) => (
          <span
            key={i}
            className="w-1.5 rounded-sm bg-primary-500 transition-[height] duration-75"
            style={{ height: `${Math.round(v * 44) + 4}px` }}
          />
        ))}
      </div>
      <div aria-live="polite">
        {state === "idle" && (
          <button type="button" className="btn btn-sec btn-sm" onClick={start}>
            <Icon name="mic" size={16} />
            Test microphone
          </button>
        )}
        {state === "listening" && <span className="chip chip-warn">Listening… say something</span>}
        {state === "ok" && (
          <span className="chip chip-ok">
            <Icon name="check" size={12} strokeWidth={2.5} />
            Microphone working
          </span>
        )}
        {state === "denied" && (
          <span className="text-[13px] text-danger">
            Microphone access was blocked. You can still answer by text.
          </span>
        )}
        {state === "unsupported" && (
          <span className="text-[13px] text-muted">
            This browser can&apos;t record audio. Answer by text instead.
          </span>
        )}
      </div>
    </section>
  );
}
