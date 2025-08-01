import "./index.css";
import { exit } from '@tauri-apps/plugin-process';

Math.random = random

import { start } from "./game/game";
import player from "./timeline";
import { random } from "./game/world/utils";

// 
// document.body.appendChild(player.element);

addEventListener("keydown", async (event) => {
  console.log("Key pressed:", event.key);
  if (event.key === "Escape") {
    console.log("Exiting game...");
    await exit(0);
  }
})

const canvas = document.getElementById("canvas") as HTMLCanvasElement;

if (canvas) {
  start(canvas);
}
