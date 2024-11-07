import { createSignal, onMount, Show } from "solid-js";
import { loadingManager, onLoaded, start } from "./game";

export default function Container() {
  let canvas: HTMLCanvasElement|undefined;
  const [currentItem, setCurrentItem] = createSignal('');
  const [loadedCount, setLoadedCount] = createSignal(0);
  const [totalCount, setTotalCount] = createSignal(0);
  const [loading, setLoading] = createSignal(true);
  const [showLoading, setShowLoading] = createSignal(true);

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

  return (
    <main>
      <canvas ref={canvas} width="800" height="600"></canvas>
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
    </main>
  );
}
