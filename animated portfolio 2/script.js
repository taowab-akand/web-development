(() => {
  'use strict';

  const FRAME_COUNT = 240;
  const CACHE_LIMIT = 32;
  const CONCURRENT_LOADS = 4;
  const sequence = document.querySelector('.sequence');
  const viewport = document.querySelector('.sequence__viewport');
  const canvas = document.querySelector('#sequence');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) return; // The CSS poster remains visible without canvas support.

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frames = new Map();
  const loading = new Set();
  const failures = new Map();
  let queue = [];
  let activeLoads = 0;
  let target = 0;
  let position = 0;
  let direction = 1;
  let lastDrawn = -1;
  let animationId = 0;
  let previousTime = 0;
  let width = 0;
  let height = 0;

  const clamp = (value) => Math.max(0, Math.min(FRAME_COUNT - 1, value));
  const frameURL = (index) => `./frames_1/frame_${String(index + 1).padStart(4, '0')}.jpg`;

  function requestRender() {
    if (!animationId && !document.hidden) animationId = requestAnimationFrame(render);
  }

  function trimCache() {
    // Evict frames furthest from the playhead, retaining the currently displayed image.
    const candidates = [...frames.keys()].filter((index) => index !== lastDrawn && index !== target)
      .sort((a, b) => Math.abs(b - position) - Math.abs(a - position));
    while (frames.size > CACHE_LIMIT) frames.delete(candidates.shift());
  }

  function pumpQueue() {
    while (activeLoads < CONCURRENT_LOADS && queue.length) {
      const index = queue.shift();
      if (frames.has(index) || loading.has(index) || (failures.get(index) || 0) >= 3) continue;
      activeLoads++;
      loading.add(index);
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try {
          await image.decode();
          frames.set(index, image);
          failures.delete(index);
          trimCache();
        } catch {
          failures.set(index, (failures.get(index) || 0) + 1);
        } finally {
          finishLoad(index);
        }
      };
      image.onerror = () => {
        failures.set(index, (failures.get(index) || 0) + 1);
        finishLoad(index);
      };
      image.src = frameURL(index);
    }
  }

  function finishLoad(index) {
    activeLoads--;
    loading.delete(index);
    requestRender();
    pumpQueue();
  }

  function prefetch() {
    const current = Math.round(position);
    if (reducedMotion.matches) {
      queue = [0];
      pumpQueue();
      return;
    }
    // Prioritize the playhead, the scroll destination, then nearby frames.
    // Rebuild the pending queue so a fast direction change discards stale requests.
    const wanted = new Set([current, target]);
    for (let offset = 1; offset <= 16; offset++) {
      wanted.add(clamp(current + offset * direction));
      if (offset <= 6) wanted.add(clamp(current - offset * direction));
    }
    queue = [...wanted];
    pumpQueue();
  }

  function draw(index) {
    const image = frames.get(index);
    if (!image || index === lastDrawn) return;
    // Contain the complete image on both portrait and landscape screens.
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.fillStyle = '#0b0b0b';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    canvas.style.backgroundImage = 'none';
    lastDrawn = index;
  }

  function render(time) {
    animationId = 0;
    // Time-based easing behaves consistently on 60 Hz and 120 Hz screens.
    const delta = previousTime ? Math.min(time - previousTime, 64) : 16.67;
    previousTime = time;
    position += (target - position) * (1 - Math.exp(-delta / 75));
    if (Math.abs(target - position) < 0.05) position = target;
    prefetch();
    const desired = Math.round(position);
    if (frames.has(desired)) {
      draw(desired);
    } else if (lastDrawn < 0 && frames.size) {
      // A restored scroll position may need a frame other than the poster first.
      const nearest = [...frames.keys()].sort((a, b) => Math.abs(a - desired) - Math.abs(b - desired))[0];
      draw(nearest);
    }
    // Keep the last complete frame while the next image loads; never clear to black.
    if (position !== target) requestRender();
    else previousTime = 0;
  }

  function readScroll() {
    const rect = sequence.getBoundingClientRect();
    const travel = Math.max(1, sequence.offsetHeight - viewport.clientHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / travel));
    const next = reducedMotion.matches ? 0 : Math.round(progress * (FRAME_COUNT - 1));
    if (next !== target) direction = next > target ? 1 : -1;
    target = next;
    requestRender();
  }

  function resize() {
    width = viewport.clientWidth;
    height = viewport.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    lastDrawn = -1;
    readScroll();
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('pageshow', resize);
  window.addEventListener('online', () => { failures.clear(); requestRender(); });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) position = 0;
    lastDrawn = -1;
    readScroll();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
      animationId = 0;
      previousTime = 0;
    } else readScroll();
  });

  resize();
})();
