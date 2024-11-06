import { onMount } from "solid-js";
import { start } from "./game";

export default function Container() {
  let canvas: HTMLCanvasElement|undefined;

  onMount(() => {
    if (!canvas) {
      throw new Error('Canvas not found');
    }
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    start(canvas);
  });

  return (
    <main>
      <canvas ref={canvas} width="800" height="600"></canvas>
    </main>
  );
}
