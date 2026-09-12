import { createFileRoute } from "@tanstack/react-router";
import { GameScreen } from "@/game/ui/GameScreen";

const title = "Play — Core Quest Finder";
const description =
  "Explore the 3D virtual campus, investigate objects and decrypt traces to recover CORE-X.";

export const Route = createFileRoute("/play")({
  ssr: false,
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: GameScreen,
});
