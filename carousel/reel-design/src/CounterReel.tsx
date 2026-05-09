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
const SAGE_DARK   = "#3B5740";
const WHITE       = "#FFFFFF";
const WHITE_DIM   = "rgba(255,255,255,0.52)";

// ── Timing (frames at 30 fps) ─────────────────────────────────────────────────
//   0 –  0.5s (  0 –  15)  Pre-roll black — anticipation
//   0.5– 5.5s ( 15 – 165)  Counter counts up 0 → 47,000
//   5.5– 7.5s (165 – 225)  "thoughts today." fades in
//   7.5– 8.5s (225 – 255)  Divider line draws in
//   8.5–11.5s (255 – 345)  Stat 2 slides up
//  11.5–15.5s (345 – 465)  Both stats breathe
//  15.5–17.5s (465 – 525)  Question fades in at bottom
//  17.5–19.0s (525 – 570)  Everything fades to black
//  19.0–24.0s (570 – 720)  End card
const COUNT_START  = 15;
const LABEL_IN     = 170;
const DIVIDER_IN   = 220;
const STAT2_IN     = 260;
const QUESTION_IN  = 380;
const FADE_OUT     = 520;
const END_IN       = 565;
export const TOTAL_FRAMES_COUNTER = 720;

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = {
  extrapolateLeft:  "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ── Main composition ──────────────────────────────────────────────────────────
export const CounterReel: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Counter spring 0 → 47 000 ─────────────────────────────────────────────
  const counterVal = spring({
    frame: frame - COUNT_START,
    fps,
    config: { damping: 30, stiffness: 26, mass: 1.1 },
    from: 0,
    to: 47000,
  });
  const displayNumber = Math.round(Math.min(counterVal, 47000));

  // Satisfying thud-scale when counter locks onto 47,000
  const lockProgress = spring({
    frame: frame - 158,
    fps,
    config: { damping: 9, stiffness: 320, mass: 0.35 },
    from: 0,
    to: 1,
  });
  const lockScale = frame >= 158 ? 1 + lockProgress * 0.045 * (1 - lockProgress) * 4 : 1;

  // ── Opacities ─────────────────────────────────────────────────────────────
  const counterOpacity  = interpolate(frame, [COUNT_START, COUNT_START + 10], [0, 1], clamp);
  const labelOpacity    = interpolate(frame, [LABEL_IN, LABEL_IN + 20], [0, 1], clamp);
  const dividerWidth    = interpolate(
    spring({ frame: frame - DIVIDER_IN, fps, config: { damping: 22, stiffness: 55, mass: 0.7 } }),
    [0, 1], [0, 110]
  );
  const stat2Opacity    = interpolate(frame, [STAT2_IN, STAT2_IN + 24], [0, 1], clamp);
  const stat2Y          = interpolate(
    spring({ frame: frame - STAT2_IN, fps, config: { damping: 22, stiffness: 48, mass: 0.85 } }),
    [0, 1], [38, 0]
  );
  const questionOpacity = interpolate(frame, [QUESTION_IN, QUESTION_IN + 22], [0, 1], clamp);
  const mainOpacity     = interpolate(frame, [FADE_OUT, END_IN], [1, 0], clamp);
  const endOpacity      = interpolate(frame, [END_IN, END_IN + 24], [0, 1], clamp);

  // End card stagger
  const ec1 = interpolate(frame, [END_IN + 8,  END_IN + 28],  [0, 1], clamp);
  const ec2 = interpolate(frame, [END_IN + 22, END_IN + 42],  [0, 1], clamp);
  const ec3 = interpolate(frame, [END_IN + 36, END_IN + 56],  [0, 1], clamp);
  const ec4 = interpolate(frame, [END_IN + 50, END_IN + 70],  [0, 1], clamp);

  const ecY = (op: number) =>
    interpolate(op, [0, 1], [24, 0]);

  return (
    <AbsoluteFill style={{ fontFamily: inter, overflow: "hidden" }}>

      {/* ── BACKGROUNDS ─────────────────────────────────────────────────── */}
      {/* Dark counting phase */}
      <AbsoluteFill style={{
        background: "linear-gradient(170deg, #040606 0%, #080E09 55%, #040404 100%)",
        opacity: 1 - endOpacity,
      }} />
      {/* Sage end card */}
      <AbsoluteFill style={{
        background: `linear-gradient(165deg, #1C3220 0%, ${SAGE_DARK} 52%, #243828 100%)`,
        opacity: endOpacity,
      }} />

      {/* ── MAIN CONTENT ────────────────────────────────────────────────── */}
      <AbsoluteFill style={{ opacity: mainOpacity }}>

        <AbsoluteFill style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 72px",
        }}>

          {/* ── THE NUMBER ── */}
          <div style={{
            opacity:         counterOpacity,
            transform:       `scale(${lockScale})`,
            transformOrigin: "center center",
          }}>
            <p style={{
              fontFamily:    fraunces,
              fontSize:      196,
              fontWeight:    700,
              color:         WHITE,
              lineHeight:    0.86,
              letterSpacing: "-0.055em",
              textAlign:     "center",
              margin:        0,
            }}>
              {displayNumber.toLocaleString()}
            </p>
          </div>

          {/* ── "thoughts today." ── */}
          <div style={{ opacity: labelOpacity, marginTop: 32 }}>
            <p style={{
              fontFamily:    fraunces,
              fontSize:      56,
              fontWeight:    300,
              fontStyle:     "italic",
              color:         SAGE,
              textAlign:     "center",
              letterSpacing: "-0.015em",
              margin:        0,
            }}>
              thoughts today.
            </p>
          </div>

          {/* ── Divider ── */}
          <div style={{
            marginTop:   46,
            width:       dividerWidth,
            height:      1,
            background:  "rgba(255,255,255,0.14)",
          }} />

          {/* ── Stat 2 ── */}
          <div style={{
            opacity:   stat2Opacity,
            transform: `translateY(${stat2Y}px)`,
            marginTop: 42,
            maxWidth:  760,
          }}>
            <p style={{
              fontFamily:    inter,
              fontSize:      38,
              fontWeight:    300,
              color:         WHITE_DIM,
              textAlign:     "center",
              lineHeight:    1.5,
              letterSpacing: "-0.01em",
              margin:        0,
            }}>
              <span style={{
                fontFamily: fraunces,
                fontWeight: 700,
                fontSize:   "1.14em",
                color:      WHITE,
              }}>38,000</span>
              {" "}were the same ones{" "}
              <span style={{
                fontFamily: fraunces,
                fontStyle:  "italic",
                fontWeight: 300,
                color:      SAGE,
              }}>
                from yesterday.
              </span>
            </p>
          </div>

        </AbsoluteFill>

        {/* ── Question anchored at bottom ── */}
        <AbsoluteFill style={{
          opacity:        questionOpacity,
          display:        "flex",
          alignItems:     "flex-end",
          justifyContent: "center",
          paddingBottom:  136,
        }}>
          <p style={{
            fontFamily:    fraunces,
            fontSize:      33,
            fontWeight:    300,
            fontStyle:     "italic",
            color:         "rgba(255,255,255,0.30)",
            textAlign:     "center",
            margin:        0,
            letterSpacing: "0.01em",
          }}>
            What are they costing you?
          </p>
        </AbsoluteFill>

      </AbsoluteFill>

      {/* ── END CARD ────────────────────────────────────────────────────── */}
      <AbsoluteFill style={{
        opacity:        endOpacity,
        display:        "flex",
        flexDirection:  "column",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "0 88px",
        gap:            24,
      }}>

        {/* Wordmark */}
        <div style={{
          opacity:   ec1,
          transform: `translateY(${ecY(ec1)}px)`,
        }}>
          <p style={{
            fontFamily:    fraunces,
            fontSize:      19,
            fontWeight:    400,
            color:         "rgba(255,255,255,0.42)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            margin:        0,
            textAlign:     "center",
          }}>
            Untangle
          </p>
        </div>

        {/* Headline */}
        <div style={{
          opacity:   ec2,
          transform: `translateY(${ecY(ec2)}px)`,
        }}>
          <p style={{
            fontFamily:    fraunces,
            fontSize:      102,
            fontWeight:    700,
            color:         WHITE,
            textAlign:     "center",
            lineHeight:    0.94,
            letterSpacing: "-0.038em",
            margin:        "6px 0",
          }}>
            Stop<br/>
            <span style={{
              fontStyle:  "italic",
              fontWeight: 300,
              color:      SAGE,
              fontSize:   "0.90em",
            }}>
              Overthinking.
            </span>
          </p>
        </div>

        {/* Body */}
        <div style={{
          opacity:   ec3,
          transform: `translateY(${ecY(ec3)}px)`,
        }}>
          <p style={{
            fontFamily: inter,
            fontSize:   28,
            fontWeight: 300,
            color:      "rgba(255,255,255,0.60)",
            textAlign:  "center",
            lineHeight: 1.65,
            margin:     0,
          }}>
            7 CBT-backed exercises.<br/>10 minutes a day.
          </p>
        </div>

        {/* CTA pill */}
        <div style={{
          opacity:   ec4,
          transform: `translateY(${ecY(ec4)}px)`,
          marginTop: 8,
        }}>
          <div style={{
            background:   "rgba(255,255,255,0.10)",
            border:       `1.5px solid rgba(125,184,125,0.55)`,
            borderRadius: 100,
            padding:      "18px 58px",
          }}>
            <p style={{
              fontFamily:    inter,
              fontSize:      24,
              fontWeight:    700,
              color:         WHITE,
              margin:        0,
              letterSpacing: "0.06em",
              textAlign:     "center",
            }}>
              $14 · Link in bio
            </p>
          </div>
        </div>

      </AbsoluteFill>

      {/* ── BRAND WATERMARK ─────────────────────────────────────────────── */}
      <AbsoluteFill style={{ pointerEvents: "none" }}>
        <div style={{
          position:      "absolute",
          top:           58,
          left:          58,
          fontFamily:    fraunces,
          fontSize:      17,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         "rgba(255,255,255,0.26)",
          opacity:       endOpacity > 0.5 ? 0 : 1,
          transition:    "opacity 0.3s",
        }}>
          Untangle
        </div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
