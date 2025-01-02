import { createSignal, For, onMount, Show } from "solid-js";
import { loadingManager, onLoaded, start } from "./game";

export default function Container() {
  let canvas: HTMLCanvasElement|undefined;
  const [currentItem, setCurrentItem] = createSignal('');
  const [loadedCount, setLoadedCount] = createSignal(0);
  const [totalCount, setTotalCount] = createSignal(0);
  const [loading, setLoading] = createSignal(true);
  const [showLoading, setShowLoading] = createSignal(true);
  const [showTimings, setShowTimings] = createSignal(true)
  const [timings, setTimings] = createSignal<{ pass: string, timeMs: number }[]>([])

  onMount(() => {
    if (!canvas) {
      throw new Error('Canvas not found');
    }
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      setCurrentItem(url);
      setLoadedCount(itemsLoaded);
      setTotalCount(itemsTotal);
    }

    loadingManager.onLoad = () => {
      setLoading(false);
      setTimeout(() => {
        setShowLoading(false);
      }, 2000);
      onLoaded();
    }
    
    start(canvas);
  });

  setInterval(() => {
    const timingData = performance.getEntriesByType("measure")
    setTimings(timingData.map(p => ({
      pass: p.name,
      timeMs: p.duration
    })))
  }, 1000)

  return (
    <main>
      <canvas ref={canvas} width="800" height="600"></canvas>
      <a 
        href="https://github.com/Veikkosuhonen/three-deferred-rp"
        class="absolute top-0 left-[45vw] underline cursor-pointer text-slate-400"
      >
        Source code
      </a>
      <Show when={showLoading()}>
        <div class="absolute top-[40vh] w-[100vw] flex">
          <div class="mx-auto transition-opacity duration-1000" style={{
            opacity: loading() ? 1 : 0,
          }}>
            <p class="font-bold">Loading...</p>
            <p>{loadedCount()}/{totalCount()}</p>
            <p>{currentItem()}</p>
          </div>
        </div>
      </Show>
      <Show when={showTimings()}>
        <div class="absolute right-10 top-[40vh]">
          <table class="text-xs">
            <thead>
              <tr>
                <th>Pass</th>
                <th>Time (ms)</th>
              </tr>
            </thead>
            <tbody>
              <For each={timings()}>{(t) => (
                <tr>
                  <td>{t.pass}</td>
                  <td class="font-mono">{t.timeMs.toFixed(2)}</td>
                </tr>
              )}</For>
            </tbody>
          </table>
        </div>
      </Show>
    </main>
  );
}
