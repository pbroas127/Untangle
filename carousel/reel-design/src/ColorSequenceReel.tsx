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

// ── Timing ────────────────────────────────────────────────────────────────────
//  Each segment = 85 frames (≈2.8s): 15f colour fade-in, 55f hold, 15f text fade-out
//  6 segments → 510 active frames + 15 pre-roll = 525
//  Fade to end card: 525–555
//  End card: 555–690
const SEG_DURATION  = 85;
const COLOUR_FADE   = 15; // frames to cross-fade background
const TEXT_FADE_OUT = 15; // frames before segment end to fade text

const SEGMENTS: {
  color:    string;
  text:     string;
  textDark: boolean; // true = dark text (for bright backgrounds)
  start:    number;
}[] = [
  { color: "#1E2B3A", text: "You carry more\nthan people know.",       textDark: false, start: 15  },
  { color: "#5C3545", text: "The worry\nbefore sleep.",                 textDark: false, start: 100 },
  { color: "#9A4F2A", text: "The exhaustion\nthat rest does not fix.", textDark: false, start: 185 },
  { color: "#C4713A", text: "The smile\nyou put on at work.",           textDark: false, start: 270 },
  { color: "#3B5740", text: "None of it\nis weakness.",                 textDark: false, start: 355 },
  { color: "#A8D4A8", text: "All of it\ncan change.",                   textDark: true,  start: 440 },
];

const FADE_OUT_START = 525;
const END_IN         = 555;
export const TOTAL_FRAMES_COLOR = 690;

// ── Helpers ───────────────────────────────────────────────────────────────────
const clamp = {
  extrapolateLeft:  "clamp" as const,
  extrapolateRight: "clamp" as const,
};

// ── Main composition ──────────────────────────────────────────────────────────
export const ColorSequenceReel: React.FC = () => {
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

      {/* ── COLOUR LAYERS — stacked, each fades in over its predecessor ── */}
      <AbsoluteFill style={{ opacity: mainOpacity }}>
        {SEGMENTS.map((seg, i) => {
          // This layer fades in at seg.start and stays visible permanently
          // (the next layer will cover it)
          const bgOpacity = interpolate(
            frame,
            [seg.start, seg.start + COLOUR_FADE],
            [0, 1],
            clamp
          );

          // Text: springs in at seg.start, fades out TEXT_FADE_OUT frames before end
          const textEnd     = seg.start + SEG_DURATION;
          const textFadeStart = textEnd - TEXT_FADE_OUT;
          const localFrame  = frame - seg.start;

          const textSpring = spring({
            frame:  Math.max(localFrame, 0),
            fps,
            config: { damping: 20, stiffness: 60, mass: 0.9 },
          });

          const textOpacity =
            frame < seg.start
              ? 0
              : frame < textFadeStart
              ? textSpring
              : interpolate(frame, [textFadeStart, textEnd], [1, 0], clamp);

          const textY = interpolate(textSpring, [0, 1], [28, 0]);

          const textColor = seg.textDark
            ? "rgba(15,26,18,0.90)"
            : "rgba(255,255,255,0.94)";

          const lines = seg.text.split("\n");

          return (
            <AbsoluteFill key={i} style={{ background: seg.color, opacity: bgOpacity }}>
              <AbsoluteFill
                style={{
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "center",
                  padding:        "0 80px",
                }}
              >
                <div
                  style={{
                    opacity:   textOpacity,
                    transform: `translateY(${textY}px)`,
                    textAlign: "center",
                  }}
                >
                  {lines.map((line, li) => (
                    <p
                      key={li}
                      style={{
                        fontFamily:    fraunces,
                        fontSize:      li === 0 ? 108 : 108,
                        fontWeight:    li === 0 ? 300 : 700,
                        fontStyle:     li === 0 ? "italic" : "normal",
                        color:         textColor,
                        textAlign:     "center",
                        lineHeight:    1.08,
                        letterSpacing: "-0.03em",
                        margin:        0,
                        maxWidth:      900,
                      }}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              </AbsoluteFill>
            </AbsoluteFill>
          );
        })}
      </AbsoluteFill>

      {/* ── END CARD ────────────────────────────────────────────────────── */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(165deg, #7a3b1e 0%, #C4713A 100%)",
          opacity:    endOpacity,
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          padding:        "0 88px",
          gap:            24,
        }}
      >
        <div style={{ opacity: ec1, transform: `translateY(${ecY(ec1)}px)` }}>
          <p style={{
            fontFamily:    fraunces,
            fontSize:      18,
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

        <div style={{ opacity: ec2, transform: `translateY(${ecY(ec2)}px)` }}>
          <p style={{
            fontFamily:    fraunces,
            fontSize:      102,
            fontWeight:    700,
            color:         "#fff",
            textAlign:     "center",
            lineHeight:    0.94,
            letterSpacing: "-0.038em",
            margin:        "6px 0",
          }}>
            Running on
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 300, fontSize: "0.90em" }}>
              Empty.
            </span>
          </p>
        </div>

        <div style={{ opacity: ec3, transform: `translateY(${ecY(ec3)}px)` }}>
          <p style={{
            fontFamily: inter,
            fontSize:   28,
            fontWeight: 300,
            color:      "rgba(255,255,255,0.62)",
            textAlign:  "center",
            lineHeight: 1.65,
            margin:     0,
          }}>
            7 days to find your way back.
            <br />
            10 minutes a day.
          </p>
        </div>

        <div style={{ opacity: ec4, transform: `translateY(${ecY(ec4)}px)`, marginTop: 8 }}>
          <div style={{
            background:   "rgba(255,255,255,0.14)",
            border:       "1.5px solid rgba(255,255,255,0.30)",
            borderRadius: 100,
            padding:      "18px 58px",
          }}>
            <p style={{
              fontFamily:    inter,
              fontSize:      24,
              fontWeight:    700,
              color:         "#fff",
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
          fontSize:      16,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color:         "rgba(255,255,255,0.20)",
          opacity:       endOpacity > 0.5 ? 0 : 1,
        }}>
          Untangle
        </div>
      </AbsoluteFill>

    </AbsoluteFill>
  );
};
