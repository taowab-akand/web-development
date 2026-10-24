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
  // Keep compressed JPGs in memory, with only a small window decoded for drawing.
  // Revisiting a frame never needs another network download.
  const blobs = new Map();
  const downloads = new Map();
  const downloadQueue = [];
  let activeDownloads = 0;

  function getBlob(index, urgent = true) {
    if (blobs.has(index)) return Promise.resolve(blobs.get(index));
    if (downloads.has(index)) {
      const queued = downloadQueue.findIndex(job => job.index === index);
      if (urgent && queued > 0) downloadQueue.unshift(...downloadQueue.splice(queued, 1));
      return downloads.get(index);
    }
    const promise = new Promise((resolve, reject) => {
      const job = { index, resolve, reject };
      if (urgent) downloadQueue.unshift(job);
      else downloadQueue.push(job);
    });
    downloads.set(index, promise);
    pumpDownloads();
    return promise;
  }

  function pumpDownloads() {
    while (activeDownloads < 6 && downloadQueue.length && !document.hidden) {
      const { index, resolve, reject } = downloadQueue.shift();
      activeDownloads++;
      fetch(frameURL(index), { cache: 'force-cache' })
        .then(response => {
          if (!response.ok) throw new Error(`Frame ${index + 1}: HTTP ${response.status}`);
          return response.blob();
        })
        .then(blob => { blobs.set(index, blob); resolve(blob); }, reject)
        .finally(() => {
          activeDownloads--;
          downloads.delete(index);
          pumpDownloads();
        });
    }
  }

  let target = 0;
  let position = 0;
  let direction = 1;
  let lastDrawn = -1;
  let lastBlend = -1;
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
      loadFrame(index);
    }
  }

  async function loadFrame(index) {
    let objectURL;
    try {
      const blob = await getBlob(index);
      objectURL = URL.createObjectURL(blob);
      const image = new Image();
      image.decoding = 'async';
      image.onload = async () => {
        try {
          // A loaded image is drawable even if a browser rejects explicit decoding.
          if (typeof image.decode === 'function') {
            await image.decode().catch(() => {});
          }
          if (!image.naturalWidth) throw new Error('Empty frame');
          frames.set(index, image);
          failures.delete(index);
          trimCache();
        } catch {
          failures.set(index, (failures.get(index) || 0) + 1);
        } finally {
          URL.revokeObjectURL(objectURL);
          finishLoad(index);
        }
      };
      image.onerror = () => {
        failures.set(index, (failures.get(index) || 0) + 1);
        URL.revokeObjectURL(objectURL);
        finishLoad(index);
      };
      image.src = objectURL;
    } catch {
      if (objectURL) URL.revokeObjectURL(objectURL);
      failures.set(index, (failures.get(index) || 0) + 1);
      finishLoad(index);
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
    // Prioritize the playhead, the scroll destination, then nearby frames.
    // Rebuild the pending queue so a fast direction change discards stale requests.
    const wanted = new Set([Math.floor(position), Math.ceil(position), Math.round(target)]);
    for (let offset = 1; offset <= 16; offset++) {
      wanted.add(clamp(current + offset * direction));
      if (offset <= 6) wanted.add(clamp(current - offset * direction));
    }
    queue = [...wanted];
    pumpQueue();
  }

  function paint(image, opacity) {
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    context.globalAlpha = opacity;
    context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  }

  function draw() {
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const blend = position - lower;
    let base = lower;
    let next = upper;
    if (!frames.has(lower) || !frames.has(upper)) {
      // Show the closest available frame during initial loading.
      let distance = Infinity;
      for (const index of frames.keys()) {
        if (Math.abs(index - position) < distance) {
          base = index;
          distance = Math.abs(index - position);
        }
      }
      if (distance === Infinity) return;
      next = base;
    }
    const mix = next === base ? 0 : blend;
    if (base === lastDrawn && Math.abs(mix - lastBlend) < 0.005) return;
    context.globalAlpha = 1;
    context.fillStyle = '#0b0b0b';
    context.fillRect(0, 0, width, height);
    paint(frames.get(base), 1);
    if (mix > 0) paint(frames.get(next), mix);
    context.globalAlpha = 1;
    canvas.style.backgroundImage = 'none';
    lastDrawn = base;
    lastBlend = mix;
  }

  function render(time) {
    animationId = 0;
    // Time-based easing behaves consistently on 60 Hz and 120 Hz screens.
    const delta = previousTime ? Math.min(time - previousTime, 64) : 16.67;
    previousTime = time;
    // Reduced motion removes catch-up movement, but preserves deliberate scroll scrubbing.
    if (reducedMotion.matches) position = target;
    else position += (target - position) * (1 - Math.exp(-delta / 120));
    if (Math.abs(target - position) < 0.05) position = target;
    prefetch();
    draw();
    if (position !== target) requestRender();
    else previousTime = 0;
  }

  function readScroll() {
    const rect = sequence.getBoundingClientRect();
    const travel = Math.max(1, sequence.offsetHeight - viewport.clientHeight);
    const progress = Math.max(0, Math.min(1, -rect.top / travel));
    const next = progress * (FRAME_COUNT - 1);
    if (next !== target) direction = next > target ? 1 : -1;
    target = next;
    requestRender();
  }

  function resize() {
    // A landscape 16:9 stage, fitted inside the viewport without cropping.
    width = Math.min(viewport.clientWidth, viewport.clientHeight * 16 / 9);
    height = width * 9 / 16;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    lastDrawn = -1;
    lastBlend = -1;
    readScroll();
  }

  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', resize);
  window.addEventListener('pageshow', resize);
  window.addEventListener('online', () => { failures.clear(); requestRender(); });
  const onMotionChange = () => {
    lastDrawn = -1;
    lastBlend = -1;
    readScroll();
  };
  if (typeof reducedMotion.addEventListener === 'function') {
    reducedMotion.addEventListener('change', onMotionChange);
  } else if (typeof reducedMotion.addListener === 'function') {
    reducedMotion.addListener(onMotionChange);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(animationId);
      animationId = 0;
      previousTime = 0;
    } else { pumpDownloads(); readScroll(); }
  });

  resize();
  // Warm all 240 compressed frames in the background. The playhead gets priority.
  for (let index = 0; index < FRAME_COUNT; index++) {
    getBlob(index, false).catch(() => {});
  }
})();
