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
const SAGE       = "#7DB87D";
const SAGE_DARK  = "#3B5740";
const WHITE      = "#FFFFFF";

// ── Word sequence ─────────────────────────────────────────────────────────────
//  Each word: snaps in (spring), holds, cuts out.
//  The loop words are white. The pivot word is sage and held longer.
//  Then a pure black pause — the dramatic breath — before resolution.
//
//  Timeline at 30fps:
//   0–12   Pre-roll black
//  12–70   "Replay."
//  73–131  "Analyse."
//  134–192 "Apologise."
//  195–253 "Rehearse."
//  256–314 "Worry."
//  317–407 "Repeat."   ← sage, 90f = 3s hold
//  407–464 BLACK PAUSE ← pure silence, 57f ≈ 1.9s
//  464–539 "Your brain is not broken."
//  542–614 "It is stuck in a loop."
//  614–645 Fade out
//  645–750 End card

const LOOP_WORDS: {
  text:  string;
  start: number;
  hold:  number;
  size:  number;
  color: string;
}[] = [
  { text: "Replay.",    start:  12, hold: 58, size: 192, color: WHITE },
  { text: "Analyse.",   start:  73, hold: 58, size: 172, color: WHITE },
  { text: "Apologise.", start: 134, hold: 58, size: 148, color: WHITE },
  { text: "Rehearse.",  start: 195, hold: 58, size: 164, color: WHITE },
  { text: "Worry.",     start: 256, hold: 58, size: 210, color: WHITE },
  { text: "Repeat.",    start: 317, hold: 90, size: 192, color: SAGE  },
];

const RESOLUTION_PHRASES: {
  text:   string;
  start:  number;
  hold:   number;
  size:   number;
  color:  string;
  italic: boolean;
  weight: number;
}[] = [
  {
    text:   "Your brain is not broken.",
    start:  464,
    hold:   75,
    size:   84,
    color:  WHITE,
    italic: true,
    weight: 300,
  },
  {
    text:   "It is stuck in a loop.",
    start:  542,
    hold:   72,
    size:   90,
    color:  SAGE,
    italic: true,
    weight: 300,
  },
];

const FADE_OUT_START = 614;
const END_IN         = 645;
export const TOTAL_FRAMES_WORD = 750;

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = {
  extrapolateLeft:  "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ── Single word renderer ──────────────────────────────────────────────────────
const WordCard: React.FC<{
  text:    string;
  startF:  number;
  hold:    number;
  size:    number;
  color:   string;
  italic?: boolean;
  weight?: number;
}> = ({ text, startF, hold, size, color, italic = false, weight = 700 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const local = frame - startF;
  if (local < 0 || local >= hold) return null;

  const SNAP_FRAMES  = 12;
  const FADE_FRAMES  = 9;
  const fadeOutStart = hold - FADE_FRAMES;

  // Snap-in spring — fast and weighty
  const snapProgress = spring({
    frame:  local,
    fps,
    config: { damping: 10, stiffness: 420, mass: 0.40 },
  });

  const opacity =
    local < fadeOutStart
      ? snapProgress
      : interpolate(local, [fadeOutStart, hold], [1, 0], clamp);

  const y = interpolate(snapProgress, [0, 1], [42, 0]);

  return (
    <AbsoluteFill
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 68px",
      }}
    >
      <p
        style={{
          fontFamily:    fraunces,
          fontSize:      size,
          fontWeight:    weight,
          fontStyle:     italic ? "italic" : "normal",
          color,
          opacity,
          transform:     `translateY(${y}px)`,
          textAlign:     "center",
          letterSpacing: "-0.045em",
          lineHeight:    1.0,
          margin:        0,
          maxWidth:      940,
        }}
      >
        {text}
      </p>
    </AbsoluteFill>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const WordReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainOpacity = interpolate(
    frame,
    [FADE_OUT_START, END_IN],
    [1, 0],
    clamp
  );
  const endOpacity = interpolate(
    frame,
    [END_IN, END_IN + 22],
    [0, 1],
    clamp
  );

  // End card staggered entries
  const ec1 = interpolate(frame, [END_IN + 8,  END_IN + 28], [0, 1], clamp);
  const ec2 = interpolate(frame, [END_IN + 24, END_IN + 44], [0, 1], clamp);
  const ec3 = interpolate(frame, [END_IN + 40, END_IN + 60], [0, 1], clamp);
  const ec4 = interpolate(frame, [END_IN + 56, END_IN + 76], [0, 1], clamp);
  const ecY = (op: number) => interpolate(op, [0, 1], [22, 0]);

  return (
    <AbsoluteFill style={{ fontFamily: inter, overflow: "hidden" }}>

      {/* ── PURE BLACK — the stage for the words ────────────────────── */}
      <AbsoluteFill style={{ background: "#050505", opacity: mainOpacity }} />

      {/* ── SAGE END CARD BACKGROUND ────────────────────────────────── */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(165deg, #1C3220 0%, ${SAGE_DARK} 52%, #243828 100%)`,
          opacity:    endOpacity,
        }}
      />

      {/* ── LOOP WORDS ──────────────────────────────────────────────── */}
      <AbsoluteFill style={{ opacity: mainOpacity }}>
        {LOOP_WORDS.map((w, i) => (
          <WordCard
            key={i}
            text={w.text}
            startF={w.start}
            hold={w.hold}
            size={w.size}
            color={w.color}
          />
        ))}

        {/* ── RESOLUTION PHRASES ────────────────────────────────────── */}
        {RESOLUTION_PHRASES.map((p, i) => (
          <WordCard
            key={`r${i}`}
            text={p.text}
            startF={p.start}
            hold={p.hold}
            size={p.size}
            color={p.color}
            italic={p.italic}
            weight={p.weight}
          />
        ))}
      </AbsoluteFill>

      {/* ── END CARD ────────────────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          opacity:        endOpacity,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 88px",
          gap:            26,
        }}
      >
        {/* Wordmark */}
        <div style={{ opacity: ec1, transform: `translateY(${ecY(ec1)}px)` }}>
          <p
            style={{
              fontFamily:    fraunces,
              fontSize:      18,
              fontWeight:    400,
              color:         "rgba(255,255,255,0.40)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              margin:        0,
              textAlign:     "center",
            }}
          >
            Untangle
          </p>
        </div>

        {/* Headline */}
        <div style={{ opacity: ec2, transform: `translateY(${ecY(ec2)}px)` }}>
          <p
            style={{
              fontFamily:    fraunces,
              fontSize:      104,
              fontWeight:    700,
              color:         WHITE,
              textAlign:     "center",
              lineHeight:    0.94,
              letterSpacing: "-0.038em",
              margin:        "6px 0",
            }}
          >
            Stop
            <br />
            <span
              style={{
                fontStyle:  "italic",
                fontWeight: 300,
                color:      SAGE,
                fontSize:   "0.90em",
              }}
            >
              Overthinking.
            </span>
          </p>
        </div>

        {/* Body */}
        <div style={{ opacity: ec3, transform: `translateY(${ecY(ec3)}px)` }}>
          <p
            style={{
              fontFamily: inter,
              fontSize:   28,
              fontWeight: 300,
              color:      "rgba(255,255,255,0.58)",
              textAlign:  "center",
              lineHeight: 1.65,
              margin:     0,
            }}
          >
            7 CBT-backed exercises.
            <br />
            10 minutes a day.
          </p>
        </div>

        {/* CTA pill */}
        <div
          style={{
            opacity:   ec4,
            transform: `translateY(${ecY(ec4)}px)`,
            marginTop: 8,
          }}
        >
          <div
            style={{
              background:   "rgba(255,255,255,0.10)",
              border:       "1.5px solid rgba(125,184,125,0.50)",
              borderRadius: 100,
              padding:      "18px 58px",
            }}
          >
            <p
              style={{
                fontFamily:    inter,
                fontSize:      24,
                fontWeight:    700,
                color:         WHITE,
                margin:        0,
                letterSpacing: "0.06em",
                textAlign:     "center",
              }}
            >
              $14 · Link in bio
            </p>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── BRAND WATERMARK ─────────────────────────────────────────── */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div
          style={{
            position:      "absolute",
            top:           58,
            left:          58,
            fontFamily:    fraunces,
            fontSize:      16,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color:         "rgba(255,255,255,0.20)",
            opacity:       endOpacity > 0.5 ? 0 : 1,
          }}
        >
          Untangle
        </div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
