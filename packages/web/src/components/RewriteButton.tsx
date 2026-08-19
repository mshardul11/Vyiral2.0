import { useEffect, useRef, useState } from "react";
import type { RewriteKind } from "@resume/shared";
import { ApiCallError, rewrite } from "../api/client";

/**
 * Inline "rewrite this with AI" affordance.
 *
 * Nothing is applied automatically: the model returns three alternatives and the
 * user picks one or keeps what they had. That matters because the alternative —
 * silently overwriting a line someone wrote about their own career — is the kind of
 * thing that makes a tool feel untrustworthy.
 */

type Phase =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; variants: string[] }
  | { status: "error"; message: string };

export function RewriteButton({
  text,
  kind,
  context,
  onApply,
}: {
  text: string;
  kind: RewriteKind;
  context: string;
  onApply: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>({ status: "idle" });
  const [instruction, setInstruction] = useState("");
  const [placement, setPlacement] = useState<"below" | "above">("below");
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const empty = text.trim().length === 0;

  // Close on outside click or Escape, and abandon any request in flight.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  });

  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Bullets sit low in a long scrolling form, so a popover that always opens
   * downward gets clipped by the viewport. Measure after each content change —
   * the height jumps when the variants replace the loading line — and flip above
   * the trigger when there isn't room below.
   */
  useEffect(() => {
    if (!open) return;
    const trigger = containerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const triggerBox = trigger.getBoundingClientRect();
    const height = popover.offsetHeight;
    const spaceBelow = window.innerHeight - triggerBox.bottom;
    const spaceAbove = triggerBox.top;

    setPlacement(spaceBelow < height + 16 && spaceAbove > spaceBelow ? "above" : "below");
  }, [open, phase]);

  function close() {
    abortRef.current?.abort();
    abortRef.current = null;
    setOpen(false);
    setPhase({ status: "idle" });
    setInstruction("");
  }

  async function run() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase({ status: "loading" });

    try {
      const result = await rewrite({ text, kind, context, instruction }, controller.signal);
      setPhase({ status: "ready", variants: result.variants });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setPhase({
        status: "error",
        message:
          error instanceof ApiCallError ? error.message : "Something went wrong. Try again.",
      });
    }
  }

  return (
    <div className="rewrite" ref={containerRef}>
      <button
        type="button"
        className="icon-button icon-button--ghost"
        aria-label="Rewrite with AI"
        title={empty ? "Write something first" : "Rewrite with AI"}
        disabled={empty}
        onClick={() => {
          if (open) {
            close();
          } else {
            setOpen(true);
            void run();
          }
        }}
      >
        ✦
      </button>

      {open ? (
        <div
          className={`rewrite__popover rewrite__popover--${placement}`}
          ref={popoverRef}
          role="dialog"
          aria-label="Rewrite suggestions"
        >
          <div className="rewrite__original">
            <span className="rewrite__label">Original</span>
            <p>{text}</p>
          </div>

          {phase.status === "loading" ? (
            <p className="rewrite__status">Thinking…</p>
          ) : null}

          {phase.status === "error" ? (
            <p className="rewrite__status rewrite__status--error">{phase.message}</p>
          ) : null}

          {phase.status === "ready" ? (
            <ul className="rewrite__variants">
              {phase.variants.map((variant, index) => (
                <li key={index}>
                  <button
                    type="button"
                    className="rewrite__variant"
                    onClick={() => {
                      onApply(variant);
                      close();
                    }}
                  >
                    {variant}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="rewrite__footer">
            <input
              className="input"
              type="text"
              value={instruction}
              placeholder="Optional: shorter, more technical, lead with the result…"
              disabled={phase.status === "loading"}
              onChange={(event) => setInstruction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void run();
              }}
            />
            <button
              type="button"
              className="button button--ghost"
              disabled={phase.status === "loading"}
              onClick={() => void run()}
            >
              {phase.status === "ready" ? "Try again" : "Rewrite"}
            </button>
            <button type="button" className="button button--ghost" onClick={close}>
              Keep original
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
