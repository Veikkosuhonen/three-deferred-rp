import "./index.css";

import { start } from "./game/game";

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

if (canvas) {
  start(canvas);
}
