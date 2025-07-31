import "./index.css";

import { start } from "./game/game";
import player from "./game/timeline";

document.body.appendChild(player.element);

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

if (canvas) {
  start(canvas);
}
