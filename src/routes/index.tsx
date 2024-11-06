import { clientOnly } from "@solidjs/start";

const GameContainer = clientOnly(() => import('../game/Container'));

export default function Home() {
  return <GameContainer />;
}
