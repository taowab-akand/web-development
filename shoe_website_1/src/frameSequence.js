import manifest from './shoeFrames.json';

export const FRAME_COUNT = manifest.files.length;
export const framePath = index => `${import.meta.env.BASE_URL}shoe%20frames/${manifest.files[index]}`;
const clamp = (value, max=1) => Math.max(0, Math.min(max, value));

// Adapted from animated portfolio 2/script.js: a compressed frame cache,
// bounded decoded window, adjacent-frame blending and time-based scroll easing.
export function mountFrameSequence({host, canvas, onFrame, onReady}) {
  const context = canvas.getContext('2d', {alpha:true});
  if (!context) return () => {};
  const compact = matchMedia('(max-width: 1100px)').matches;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection?.saveData);
  const frames = new Map(), blobs = new Map(), downloads = new Map(), failures = new Map();
  const loading = new Set(), downloadQueue = [];
  const aborter = new AbortController();
  let queue = [], activeLoads = 0, activeDownloads = 0;
  let target = 0, position = 0, direction = 1, lastDrawn = -1, lastBlend = -1;
  let raf = 0, previousTime = 0, width = 0, height = 0, stopped = false, visible = true, ready = false;
  const limit = compact ? 16 : 32;
  const bound = value => clamp(value, FRAME_COUNT - 1);
  const canWork = () => !stopped && visible && !document.hidden;
  const requestRender = () => {if (!raf && canWork()) raf = requestAnimationFrame(render);};
  const dispose = image => image?.close?.();

  function getBlob(index, urgent=true) {
    if (blobs.has(index)) return Promise.resolve(blobs.get(index));
    if (downloads.has(index)) {
      const queued = downloadQueue.findIndex(job => job.index === index);
      if (urgent && queued > 0) downloadQueue.unshift(...downloadQueue.splice(queued, 1));
      return downloads.get(index);
    }
    const promise = new Promise((resolve,reject) => {
      const job = {index,resolve,reject};
      if (urgent) downloadQueue.unshift(job); else downloadQueue.push(job);
    });
    downloads.set(index,promise);
    pumpDownloads();
    return promise;
  }

  function pumpDownloads() {
    while (canWork() && activeDownloads < (saveData ? 2 : compact ? 4 : 6) && downloadQueue.length) {
      const {index,resolve,reject} = downloadQueue.shift();
      activeDownloads++;
      fetch(framePath(index), {cache:'force-cache', signal:aborter.signal})
        .then(response => {if (!response.ok) throw new Error('Frame unavailable'); return response.blob();})
        .then(blob => {
          if (!stopped) {
            blobs.set(index,blob);
            if (saveData && blobs.size > 48) {
              const distant = [...blobs.keys()].sort((a,b) => Math.abs(b-target)-Math.abs(a-target));
              while (blobs.size > 48) blobs.delete(distant.shift());
            }
          }
          resolve(blob);
        },reject)
        .finally(() => {activeDownloads--; downloads.delete(index); pumpDownloads();});
    }
  }

  function trimCache() {
    const candidates = [...frames.keys()]
      .filter(index => index !== lastDrawn && index !== Math.floor(position) && index !== Math.ceil(position) && index !== Math.round(target))
      .sort((a,b) => Math.abs(b-position)-Math.abs(a-position));
    while (frames.size > limit && candidates.length) {
      const index = candidates.shift(); dispose(frames.get(index)); frames.delete(index);
    }
  }

  async function decode(blob) {
    if (compact && typeof createImageBitmap === 'function') {
      try {return await createImageBitmap(blob, {resizeWidth:Math.min(1920,Math.max(640,canvas.width)),resizeQuality:'high'});} catch {}
    }
    const url = URL.createObjectURL(blob);
    try {
      return await new Promise((resolve,reject) => {
        const image = new Image(); image.decoding = 'async';
        image.onload = async () => {
          // Safari can reject decode() even though the loaded image is drawable.
          if (typeof image.decode === 'function') await image.decode().catch(() => {});
          if (image.naturalWidth) resolve(image); else reject(new Error('Empty frame'));
        };
        image.onerror = () => reject(new Error('Invalid frame'));
        image.src = url;
      });
    } finally {URL.revokeObjectURL(url);}
  }

  function pumpQueue() {
    while (canWork() && activeLoads < (compact ? 2 : 4) && queue.length) {
      const index = queue.shift();
      if (frames.has(index) || loading.has(index) || (failures.get(index)||0) >= 3) continue;
      loading.add(index); activeLoads++;
      getBlob(index).then(decode).then(image => {
        if (stopped) {dispose(image); return;}
        frames.set(index,image); failures.delete(index); trimCache();
      }).catch(() => {if (!stopped) failures.set(index,(failures.get(index)||0)+1);})
        .finally(() => {loading.delete(index); activeLoads--; requestRender(); pumpQueue();});
    }
  }

  function prefetch() {
    const current = Math.round(position);
    const wanted = new Set([Math.floor(position),Math.ceil(position),Math.round(target)]);
    for (let offset=1; offset <= (compact ? 9 : 16); offset++) {
      wanted.add(bound(current+offset*direction));
      if (offset <= (compact ? 3 : 6)) wanted.add(bound(current-offset*direction));
    }
    queue = [...wanted]; pumpQueue();
  }

  function paint(image, opacity) {
    const iw = image.naturalWidth || image.width, ih = image.naturalHeight || image.height;
    const portrait = width < 800 && height > width;
    const scale = portrait ? Math.min(width*1.72/iw,height*.68/ih) : Math.min(width/iw,height/ih);
    const dw = iw*scale, dh = ih*scale, cy = portrait ? height*.38 : height*.5;
    context.globalAlpha = opacity;
    context.drawImage(image,(width-dw)/2,cy-dh/2,dw,dh);
  }

  function draw() {
    let base = Math.floor(position), next = Math.ceil(position), mix = position-base;
    if (!frames.has(base) || !frames.has(next)) {
      let distance = Infinity;
      for (const index of frames.keys()) {
        if (Math.abs(index-position) < distance) {base=index; distance=Math.abs(index-position);}
      }
      if (distance === Infinity) return;
      next=base; mix=0;
    }
    if (base === lastDrawn && Math.abs(mix-lastBlend) < .005) return;
    context.globalAlpha = 1; context.clearRect(0,0,width,height);
    paint(frames.get(base),1);
    if (mix > 0) paint(frames.get(next),mix);
    context.globalAlpha = 1;
    lastDrawn=base; lastBlend=mix;
    onFrame(base+mix, motion.matches);
    host.dataset.sourceFrame = manifest.files[mix > .5 ? next : base];
    host.dataset.blend = mix.toFixed(3);
    if (!ready) {ready=true; onReady();}
  }

  function render(time) {
    raf=0; if (!canWork()) return;
    const delta = previousTime ? Math.min(time-previousTime,64) : 16.67;
    previousTime=time;
    if (motion.matches) position=target;
    else position += (target-position)*(1-Math.exp(-delta/120));
    if (Math.abs(target-position) < .05) position=target;
    prefetch(); draw();
    if (position !== target) requestRender(); else previousTime=0;
  }

  function readScroll() {
    const rect=host.getBoundingClientRect();
    const progress=clamp(-rect.top/Math.max(1,host.offsetHeight-innerHeight));
    // Reserve the last 12% for the final reveal before releasing the sticky stage.
    const next=clamp(progress/.88)*(FRAME_COUNT-1);
    if (next !== target) direction=next>target ? 1 : -1;
    target=next; requestRender();
  }

  function resize() {
    width=canvas.clientWidth; height=canvas.clientHeight;
    const ratio=Math.min(devicePixelRatio||1,compact ? 1.5 : 2);
    canvas.width=Math.round(width*ratio); canvas.height=Math.round(height*ratio);
    context.setTransform(ratio,0,0,ratio,0,0);
    const portrait=width<800 && height>width;
    const dh=Math.min(width*1.72*9/16,height*.68), edge=height*.38-dh/2;
    canvas.style.maskImage=portrait ? `linear-gradient(180deg,transparent ${edge}px,#000 ${edge+32}px,#000 ${edge+dh-32}px,transparent ${edge+dh}px)` : 'none';
    lastDrawn=-1; lastBlend=-1; readScroll();
  }
  function visibility() {
    if (!canWork()) {cancelAnimationFrame(raf); raf=0; previousTime=0;}
    else {pumpDownloads();pumpQueue();readScroll();}
  }
  const online=() => {failures.clear();readScroll();};
  const motionChange=() => {lastDrawn=-1;readScroll();};
  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {visible=entries[0].isIntersecting;visibility();}) : null;
  observer?.observe(host);
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  resizeObserver?.observe(canvas);
  addEventListener('scroll',readScroll,{passive:true});
  addEventListener('resize',resize);addEventListener('pageshow',resize);addEventListener('online',online);
  document.addEventListener('visibilitychange',visibility);
  if (motion.addEventListener) motion.addEventListener('change',motionChange); else motion.addListener?.(motionChange);
  resize();
  if (!saveData) for (let index=0;index<FRAME_COUNT;index++) getBlob(index,false).catch(() => {});

  return () => {
    stopped=true;aborter.abort();cancelAnimationFrame(raf);observer?.disconnect();resizeObserver?.disconnect();
    for (const job of downloadQueue.splice(0)) job.reject(new Error('Sequence disposed'));
    removeEventListener('scroll',readScroll);removeEventListener('resize',resize);removeEventListener('pageshow',resize);removeEventListener('online',online);
    document.removeEventListener('visibilitychange',visibility);
    if (motion.removeEventListener) motion.removeEventListener('change',motionChange); else motion.removeListener?.(motionChange);
    frames.forEach(dispose);frames.clear();blobs.clear();
  };
}
