import "./index.css";
import { Composition } from "remotion";
import { HelloWorld, myCompSchema } from "./HelloWorld";
import { Logo, myCompSchema2 } from "./HelloWorld/Logo";
import { BeforeAfterReel, TOTAL_FRAMES } from "./BeforeAfterReel";
import { CounterReel, TOTAL_FRAMES_COUNTER } from "./CounterReel";
import { WordReel, TOTAL_FRAMES_WORD } from "./WordReel";

// Each <Composition> is an entry in the sidebar!

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── UNTANGLE REELS ── */}
      <Composition
        id="WordReel"
        component={WordReel}
        durationInFrames={TOTAL_FRAMES_WORD}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="CounterReel"
        component={CounterReel}
        durationInFrames={TOTAL_FRAMES_COUNTER}
        fps={30}
        width={1080}
        height={1920}
      />

      <Composition
        id="BeforeAfterReel"
        component={BeforeAfterReel}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />

      {/* ── HELLO WORLD (scaffold, ignore) ── */}
      <Composition
        // You can take the "id" to render a video:
        // npx remotion render HelloWorld
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        // You can override these props for each render:
        // https://www.remotion.dev/docs/parametrized-rendering
        schema={myCompSchema}
        defaultProps={{
          titleText: "Welcome to Remotion",
          titleColor: "#000000",
          logoColor1: "#91EAE4",
          logoColor2: "#86A8E7",
        }}
      />

      {/* Mount any React component to make it show up in the sidebar and work on it individually! */}
      <Composition
        id="OnlyLogo"
        component={Logo}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        schema={myCompSchema2}
        defaultProps={{
          logoColor1: "#91dAE2" as const,
          logoColor2: "#86A8E7" as const,
        }}
      />
    </>
  );
};
