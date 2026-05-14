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
const AMBER      = "#C4713A";
const AMBER_LITE = "#E8A87C";
const WHITE      = "#FFFFFF";
const WHITE_DIM  = "rgba(255,255,255,0.55)";

// ── Sequence ──────────────────────────────────────────────────────────────────
//  Each line: rushes in from a speck (scale 0.12 → 1), holds, fades out.
//  Pure black screen between lines.
//
//  Timeline (30 fps):
//   0 –  15  Pre-roll black
//  15 –  75  "You wake up tired."
//  78 – 138  "You push through."
// 141 – 201  "You rest."
// 204 – 264  "Nothing refills."
// 267 – 347  "This is not weakness."        (80f — extra weight)
// 350 – 450  "This is running on empty."    (100f — final statement)
// 450 – 510  Pure black pause               (2s silence)
// 510 – 540  Fade to end card
// 540 – 660  End card
const LINES: {
  text:    string;
  start:   number;
  hold:    number;
  italic?: boolean;
  size?:   number;
  color?:  string;
}[] = [
  { text: "You wake up tired.",            start:  15, hold: 60 },
  { text: "You push through.",             start:  78, hold: 60 },
  { text: "You rest.",                     start: 141, hold: 60 },
  { text: "Nothing refills.",              start: 204, hold: 60 },
  { text: "This is not weakness.",         start: 267, hold: 80,  italic: true },
  { text: "This is running on empty.",     start: 350, hold: 100, color: AMBER_LITE },
];

const FADE_OUT_START = 450;
const END_IN         = 510;
export const TOTAL_FRAMES_ZOOM = 660;

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = {
  extrapolateLeft:  "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ── Single zooming line ───────────────────────────────────────────────────────
const ZoomLine: React.FC<{
  text:    string;
  startF:  number;
  hold:    number;
  italic?: boolean;
  size?:   number;
  color?:  string;
}> = ({ text, startF, hold, italic = false, size = 96, color = WHITE }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const local = frame - startF;
  if (local < 0 || local >= hold) return null;

  const FADE_IN_FRAMES  = 14;
  const FADE_OUT_FRAMES = 10;
  const fadeOutStart    = hold - FADE_OUT_FRAMES;

  // Rush-in spring — starts near zero, decelerates into resting size
  const zoomProgress = spring({
    frame:  local,
    fps,
    config: { damping: 24, stiffness: 52, mass: 1.05 },
  });

  // Scale rushes from 0.12 up to 1.0
  const scale = interpolate(zoomProgress, [0, 1], [0.12, 1], clamp);

  // Opacity: fades in quickly, then fades out at end
  const opacity =
    local < fadeOutStart
      ? interpolate(local, [0, FADE_IN_FRAMES], [0, 1], clamp)
      : interpolate(local, [fadeOutStart, hold], [1, 0], clamp);

  return (
    <AbsoluteFill
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 72px",
      }}
    >
      <p
        style={{
          fontFamily:    fraunces,
          fontSize:      size,
          fontWeight:    italic ? 300 : 700,
          fontStyle:     italic ? "italic" : "normal",
          color,
          opacity,
          transform:     `scale(${scale})`,
          transformOrigin: "center center",
          textAlign:     "center",
          lineHeight:    1.1,
          letterSpacing: "-0.03em",
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
export const ZoomReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mainOpacity = interpolate(frame, [FADE_OUT_START, END_IN], [1, 0], clamp);
  const endOpacity  = interpolate(frame, [END_IN, END_IN + 24], [0, 1], clamp);

  // End card stagger
  const ec1 = interpolate(frame, [END_IN + 8,  END_IN + 28], [0, 1], clamp);
  const ec2 = interpolate(frame, [END_IN + 24, END_IN + 44], [0, 1], clamp);
  const ec3 = interpolate(frame, [END_IN + 40, END_IN + 60], [0, 1], clamp);
  const ec4 = interpolate(frame, [END_IN + 56, END_IN + 76], [0, 1], clamp);
  const ecY = (op: number) => interpolate(op, [0, 1], [22, 0]);

  return (
    <AbsoluteFill style={{ fontFamily: inter, overflow: "hidden" }}>

      {/* ── PURE BLACK STAGE ────────────────────────────────────────── */}
      <AbsoluteFill style={{ background: "#040404", opacity: mainOpacity }} />

      {/* ── AMBER END CARD BACKGROUND ───────────────────────────────── */}
      <AbsoluteFill style={{
        background: `linear-gradient(165deg, #7a3b1e 0%, ${AMBER} 100%)`,
        opacity:    endOpacity,
      }} />

      {/* ── ZOOM LINES ──────────────────────────────────────────────── */}
      <AbsoluteFill style={{ opacity: mainOpacity }}>
        {LINES.map((line, i) => (
          <ZoomLine
            key={i}
            text={line.text}
            startF={line.start}
            hold={line.hold}
            italic={line.italic}
            size={line.size}
            color={line.color}
          />
        ))}
      </AbsoluteFill>

      {/* ── END CARD ────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        opacity:        endOpacity,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 88px",
        gap:            24,
      }}>
        <div style={{ opacity: ec1, transform: `translateY(${ecY(ec1)}px)` }}>
          <p style={{
            fontFamily: fraunces, fontSize: 18, fontWeight: 400,
            color: "rgba(255,255,255,0.42)", letterSpacing: "0.22em",
            textTransform: "uppercase", margin: 0, textAlign: "center",
          }}>Untangle</p>
        </div>

        <div style={{ opacity: ec2, transform: `translateY(${ecY(ec2)}px)` }}>
          <p style={{
            fontFamily: fraunces, fontSize: 100, fontWeight: 700,
            color: WHITE, textAlign: "center", lineHeight: 0.94,
            letterSpacing: "-0.038em", margin: "6px 0",
          }}>
            Running on<br/>
            <span style={{ fontStyle: "italic", fontWeight: 300, fontSize: "0.90em" }}>
              Empty.
            </span>
          </p>
        </div>

        <div style={{ opacity: ec3, transform: `translateY(${ecY(ec3)}px)` }}>
          <p style={{
            fontFamily: inter, fontSize: 28, fontWeight: 300,
            color: "rgba(255,255,255,0.62)", textAlign: "center",
            lineHeight: 1.65, margin: 0,
          }}>
            7 days to find your way back.<br/>10 minutes a day.
          </p>
        </div>

        <div style={{ opacity: ec4, transform: `translateY(${ecY(ec4)}px)`, marginTop: 8 }}>
          <div style={{
            background: "rgba(255,255,255,0.14)",
            border: "1.5px solid rgba(255,255,255,0.30)",
            borderRadius: 100, padding: "18px 58px",
          }}>
            <p style={{
              fontFamily: inter, fontSize: 24, fontWeight: 700,
              color: WHITE, margin: 0, letterSpacing: "0.06em", textAlign: "center",
            }}>$14 · Link in bio</p>
          </div>
        </div>
      </AbsoluteFill>

      {/* ── BRAND WATERMARK ─────────────────────────────────────────── */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: 58, left: 58,
          fontFamily: fraunces, fontSize: 16, letterSpacing: "0.18em",
          textTransform: "uppercase", color: "rgba(255,255,255,0.20)",
          opacity: endOpacity > 0.5 ? 0 : 1,
        }}>Untangle</div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
