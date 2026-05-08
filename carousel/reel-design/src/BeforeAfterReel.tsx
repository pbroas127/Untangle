import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  AbsoluteFill,
} from "remotion";
import { loadFont, fontFamily as inter } from "@remotion/google-fonts/Inter";
import {
  loadFont as loadFraunces,
  fontFamily as fraunces,
} from "@remotion/google-fonts/Fraunces";

// ── Font loading ──────────────────────────────────────────────────────────────
loadFont("normal", { weights: ["300", "400", "500", "600", "700"] });
loadFraunces("normal", { weights: ["300", "400", "600", "700"] });
loadFraunces("italic", { weights: ["300", "400", "600"] });

// ── Design tokens ─────────────────────────────────────────────────────────────
const SAGE        = "#7DB87D";
const AMBER       = "#C4713A";
const AMBER_LIGHT = "#E8A87C";
const WHITE       = "#FFFFFF";
const WHITE_DIM   = "rgba(255,255,255,0.50)";

// ── Timing (frames at 30fps) ──────────────────────────────────────────────────
//  0 –  9s  (  0 – 270)  Before section
//  9 – 11.5s(270 – 345)  Pivot
// 11.5 – 18s(345 – 540)  After section
// 18 – 21s  (540 – 630)  End card
const B_END   = 255;
const P_IN    = 270;
const P_OUT   = 345;
const A_IN    = 360;
const END_IN  = 540;
export const TOTAL_FRAMES = 630;

// ── Before lines ──────────────────────────────────────────────────────────────
const BEFORE: { start: number; jsx: React.ReactNode }[] = [
  {
    start: 0,
    jsx: (
      <>
        You wake up{" "}
        <em style={{ fontStyle: "italic", color: WHITE_DIM }}>
          already tired.
        </em>
      </>
    ),
  },
  {
    start: 54,
    jsx: (
      <>
        You push through{" "}
        <span style={{ fontWeight: 700, color: WHITE }}>anyway.</span>
      </>
    ),
  },
  {
    start: 108,
    jsx: (
      <>
        You rest.{" "}
        <em style={{ fontStyle: "italic", color: WHITE_DIM }}>
          But nothing refills.
        </em>
      </>
    ),
  },
  {
    start: 162,
    jsx: (
      <>
        You smile{" "}
        <span style={{ color: WHITE }}>at work.</span>
      </>
    ),
  },
  {
    start: 210,
    jsx: (
      <>
        You{" "}
        <span
          style={{
            fontFamily: fraunces,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: "1.08em",
            color: WHITE,
          }}
        >
          collapse
        </span>{" "}
        at home.
      </>
    ),
  },
];

// ── After lines ───────────────────────────────────────────────────────────────
const AFTER: { start: number; jsx: React.ReactNode }[] = [
  {
    start: A_IN,
    jsx: (
      <>
        You know what is{" "}
        <span
          style={{ color: AMBER, fontFamily: fraunces, fontStyle: "italic", fontWeight: 600 }}
        >
          draining you.
        </span>
      </>
    ),
  },
  {
    start: A_IN + 50,
    jsx: (
      <>
        You protect your{" "}
        <span
          style={{ color: AMBER, fontFamily: fraunces, fontWeight: 700 }}
        >
          energy.
        </span>
      </>
    ),
  },
  {
    start: A_IN + 100,
    jsx: (
      <>
        Rest actually{" "}
        <span
          style={{ color: SAGE, fontFamily: fraunces, fontStyle: "italic", fontWeight: 600 }}
        >
          restores
        </span>{" "}
        you.
      </>
    ),
  },
  {
    start: A_IN + 150,
    jsx: (
      <>
        You feel like{" "}
        <span
          style={{ color: SAGE, fontFamily: fraunces, fontStyle: "italic", fontWeight: 600 }}
        >
          yourself
        </span>{" "}
        again.
      </>
    ),
  },
];

// ── Animated line helper ──────────────────────────────────────────────────────
const Line: React.FC<{
  startFrame: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ startFrame, style, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 22, stiffness: 55, mass: 0.8 },
  });

  if (frame < startFrame) return null;

  return (
    <div
      style={{
        opacity: interpolate(progress, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(progress, [0, 1], [36, 0])}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const BeforeAfterReel: React.FC = () => {
  const frame = useCurrentFrame();

  const clamp = { extrapolateLeft: "clamp" as const, extrapolateRight: "clamp" as const };

  // Background transition before → after
  const bgShift = interpolate(frame, [P_OUT, A_IN + 60], [0, 1], clamp);

  // Section fades
  const beforeOpacity = interpolate(frame, [B_END, P_IN], [1, 0], clamp);
  const pivotOpacity  = interpolate(frame, [P_IN, P_IN + 18, P_OUT - 18, P_OUT], [0, 1, 1, 0], clamp);
  const afterOpacity  = interpolate(frame, [A_IN, A_IN + 20], [0, 1], clamp);
  const endOpacity    = interpolate(frame, [END_IN, END_IN + 22], [0, 1], clamp);

  const baseText: React.CSSProperties = {
    fontFamily: fraunces,
    fontSize: 62,
    fontWeight: 300,
    fontStyle: "italic",
    color: WHITE,
    textAlign: "center",
    lineHeight: 1.25,
    letterSpacing: "-0.02em",
    margin: 0,
  };

  return (
    <AbsoluteFill style={{ fontFamily: inter, overflow: "hidden" }}>

      {/* ── BACKGROUNDS ─────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        background: "linear-gradient(175deg, #080301 0%, #1A0D06 55%, #0D0603 100%)",
        opacity: 1 - bgShift,
      }} />
      <AbsoluteFill style={{
        background: "linear-gradient(175deg, #2C1A0E 0%, #7a3b1e 45%, #9A5228 100%)",
        opacity: bgShift,
      }} />

      {/* ── BEFORE ──────────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        opacity: beforeOpacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 88px",
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 30,
          width: "100%",
        }}>
          {BEFORE.map((line, i) => {
            // Active line = full white; previous lines dim
            const isLatest = BEFORE.findIndex((l) => l.start > frame) - 1 === i
              || (frame >= BEFORE[BEFORE.length - 1].start && i === BEFORE.length - 1);
            const dimmed = frame >= (BEFORE[i + 1]?.start ?? 9999) + 15;

            return (
              <Line key={i} startFrame={line.start}>
                <p style={{
                  ...baseText,
                  opacity: dimmed ? 0.38 : 1,
                  transition: "opacity 0.3s",
                }}>
                  {line.jsx}
                </p>
              </Line>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* ── PIVOT ───────────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        opacity: pivotOpacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 88px",
      }}>
        <p style={{
          fontFamily: fraunces,
          fontSize: 88,
          fontWeight: 700,
          color: WHITE,
          textAlign: "center",
          lineHeight: 1.08,
          letterSpacing: "-0.03em",
          margin: 0,
        }}>
          Something has<br />to{" "}
          <span style={{ fontStyle: "italic", fontWeight: 300, color: AMBER_LIGHT }}>
            change.
          </span>
        </p>
      </AbsoluteFill>

      {/* ── AFTER ───────────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        opacity: afterOpacity,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 88px",
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 38,
          width: "100%",
        }}>
          {AFTER.map((line, i) => (
            <Line key={i} startFrame={line.start}>
              <p style={{
                fontFamily: inter,
                fontSize: 58,
                fontWeight: 500,
                color: "rgba(255,255,255,0.92)",
                textAlign: "center",
                lineHeight: 1.3,
                letterSpacing: "-0.01em",
                margin: 0,
              }}>
                {line.jsx}
              </p>
            </Line>
          ))}
        </div>
      </AbsoluteFill>

      {/* ── END CARD ────────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        opacity: endOpacity,
        background: "linear-gradient(175deg, #7a3b1e 0%, #C4713A 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 88px",
        gap: 20,
      }}>
        <p style={{
          fontFamily: fraunces,
          fontSize: 22,
          fontWeight: 400,
          color: "rgba(255,255,255,0.55)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          margin: 0,
        }}>
          Untangle
        </p>
        <p style={{
          fontFamily: fraunces,
          fontSize: 90,
          fontWeight: 700,
          color: WHITE,
          textAlign: "center",
          lineHeight: 1.0,
          letterSpacing: "-0.03em",
          margin: "8px 0",
        }}>
          Running on<br />
          <span style={{ fontStyle: "italic", fontWeight: 300 }}>Empty.</span>
        </p>
        <p style={{
          fontFamily: inter,
          fontSize: 30,
          fontWeight: 300,
          color: "rgba(255,255,255,0.68)",
          textAlign: "center",
          lineHeight: 1.55,
          margin: 0,
        }}>
          7 days to find your way back.
        </p>
        <div style={{
          marginTop: 12,
          background: "rgba(255,255,255,0.14)",
          border: "1.5px solid rgba(255,255,255,0.28)",
          borderRadius: 100,
          padding: "16px 52px",
        }}>
          <p style={{
            fontFamily: inter,
            fontSize: 26,
            fontWeight: 700,
            color: WHITE,
            margin: 0,
            letterSpacing: "0.05em",
          }}>
            $14 · Link in bio
          </p>
        </div>
      </AbsoluteFill>

      {/* ── BRAND WATERMARK ─────────────────────────────────────────────── */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{
          position: "absolute",
          top: 56,
          left: 56,
          fontFamily: fraunces,
          fontSize: 18,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.35)",
          opacity: endOpacity > 0.5 ? 0 : 1,
        }}>
          Untangle
        </div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
