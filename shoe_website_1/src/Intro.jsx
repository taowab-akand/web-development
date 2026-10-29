import React, {useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowUpRight} from 'lucide-react';

const FRAME_COUNT = 239;
const ANIMATION_END = 0.88; // Leave a final reveal before the sticky background releases.
const framePath = (index, mobile) => `/frames${mobile ? '-mobile' : ''}/frame_${String(index).padStart(6, '0')}.webp`;
const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max, n));
const smoothstep = n => {const t=clamp(n); return t*t*(3-2*t);};
const chapters = [
  {start:0, label:'REVEAL', title:<>THE FUTURE<br/>IS IN <em>MOTION.</em></>, support:'Discover footwear that moves beyond ordinary.'},
  {start:0.22, label:'PRECISION', title:<>PRECISION IN<br/>EVERY <em>DETAIL.</em></>, support:'Designed for comfort. Made to make a statement.'},
  {start:0.51, label:'EVOLUTION', title:<>BUILT TO<br/><em>STAND OUT.</em></>, support:'Where innovation meets unmistakable style.'},
  {start:0.79, label:'ARRIVAL', title:<>OWN<br/>EVERY <em>STEP.</em></>, support:'Find the pair that defines your journey.'},
];

export default function Intro() {
  const section = useRef(null), canvas = useRef(null), ambient = useRef(null);
  const chapterNodes = useRef([]), chapterIndicators = useRef([]), progress = useRef(null), counter = useRef(null);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>setReduced(preference.matches);
    preference.addEventListener('change', change);
    return()=>preference.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const host=section.current, surface=canvas.current;
    if(!host || !surface) return;
    const context=surface.getContext('2d', {alpha:true});
    const mobileSource=innerWidth<800;
    let stopped=false, visible=true, raf=0, current=1, target=1, rendered=0;
    let lastWidth=0, lastHeight=0, direction=1, previousTarget=1;
    let networkActive=0, decodeActive=0, backgroundCursor=1;
    let fetchQueue=[], decodePriority=[];
    const encoded=new Map(), decoded=new Map(), fetching=new Set(), decoding=new Set(), failedDecode=new Set();
    const aborter=new AbortController();
    const MAX_DECODED=14, NETWORK_LIMIT=4, DECODE_LIMIT=2;
    setReady(false);

    function updateCopy(index) {
      const timeline=(index-1)/(FRAME_COUNT-1);
      let activeChapter=0;
      chapters.forEach((chapter, i)=>{
        const node=chapterNodes.current[i];
        if(!node) return;
        const incoming=i===0 ? 1 : smoothstep((timeline-chapter.start+0.025)/0.05);
        const outgoing=i===chapters.length-1 ? 1 : 1-smoothstep((timeline-chapters[i+1].start+0.025)/0.05);
        const opacity=Math.min(incoming,outgoing);
        const y=(1-incoming)*22-(1-outgoing)*16;
        node.style.opacity=opacity.toFixed(3);
        node.style.transform=`translate3d(0,${y.toFixed(2)}px,0)`;
        node.style.visibility=opacity>0.001 ? 'visible' : 'hidden';
        node.style.pointerEvents=opacity>0.5 ? 'auto' : 'none';
        node.setAttribute('aria-hidden',opacity>0.5 ? 'false' : 'true');
        const link=node.querySelector('a'); if(link) link.tabIndex=opacity>0.5 ? 0 : -1;
        if(opacity>=0.5) activeChapter=i;
      });
      chapterIndicators.current.forEach((node,i)=>node?.classList.toggle('active',i===activeChapter));
      progress.current.style.width=`${timeline*100}%`;
      counter.current.textContent=`${String(index).padStart(3,'0')} / ${FRAME_COUNT}`;
      host.dataset.frame=String(index);
      host.dataset.chapter=String(activeChapter+1);
      host.dataset.complete=String(index===FRAME_COUNT);
    }
    updateCopy(1);
    if(reduced || !context) {
      host.dataset.motion='reduced';
      return;
    }
    host.dataset.motion='scroll';

    const schedule=()=>{
      if(!stopped && visible && !raf) raf=requestAnimationFrame(tick);
    };
    const dispose=frame=>frame?.close?.();
    function trimDecoded() {
      if(decoded.size<=MAX_DECODED) return;
      const score=index=>index===1 || index===FRAME_COUNT || index===rendered ? -1000 :
        decodePriority.includes(index) ? decodePriority.indexOf(index) : 100+Math.abs(index-current);
      const removable=[...decoded.keys()].sort((a,b)=>score(b)-score(a));
      for(const index of removable) {
        if(decoded.size<=MAX_DECODED) break;
        if(index===1 || index===FRAME_COUNT || index===rendered) continue;
        dispose(decoded.get(index)); decoded.delete(index);
      }
    }
    async function decodeBlob(blob) {
      const width=mobileSource ? 800 : Math.min(1920,Math.max(1280,Math.round(innerWidth*Math.min(devicePixelRatio||1,1.25))));
      if(typeof createImageBitmap==='function') {
        try{return await createImageBitmap(blob,{resizeWidth:width,resizeQuality:'high'});}catch{}
      }
      const image=new Image(), url=URL.createObjectURL(blob);
      try {image.src=url; await image.decode(); return image;} finally {URL.revokeObjectURL(url);}
    }
    function pumpDecodes() {
      if(stopped || !visible) return;
      while(decodeActive<DECODE_LIMIT) {
        const index=decodePriority.find(n=>encoded.has(n) && !decoded.has(n) && !decoding.has(n) && !failedDecode.has(n));
        if(index===undefined) break;
        decoding.add(index); decodeActive++;
        decodeBlob(encoded.get(index)).then(image=>{
          if(stopped) {dispose(image); return;}
          decoded.set(index,image); trimDecoded(); schedule();
        }).catch(()=>{failedDecode.add(index);/* Keep the last valid image when a frame cannot decode. */})
          .finally(()=>{decoding.delete(index); decodeActive--; pumpDecodes();});
      }
    }
    function nextNetworkFrame() {
      while(fetchQueue.length) {
        const index=fetchQueue.shift();
        if(!encoded.has(index) && !fetching.has(index)) return index;
      }
      while(backgroundCursor<=FRAME_COUNT) {
        const index=backgroundCursor++;
        if(!encoded.has(index) && !fetching.has(index)) return index;
      }
      return null;
    }
    function pumpNetwork() {
      if(stopped || !visible) return;
      while(networkActive<NETWORK_LIMIT) {
        const index=nextNetworkFrame(); if(index===null) break;
        fetching.add(index); networkActive++;
        fetch(framePath(index,mobileSource),{signal:aborter.signal,cache:'force-cache',priority:decodePriority.includes(index)?'high':'low'})
          .then(response=>{if(!response.ok)throw new Error('Frame unavailable');return response.blob();})
          .then(blob=>{if(blob.size && !stopped){encoded.set(index,blob);pumpDecodes();}})
          .catch(()=>{/* A missing frame never clears the canvas. */})
          .finally(()=>{fetching.delete(index); networkActive--; pumpNetwork();});
      }
    }
    let lastRequested=-1,lastTarget=-1,lastDirection=0;
    function prepareWindow(desired) {
      const goal=clamp(Math.round(target),1,FRAME_COUNT);
      if(desired===lastRequested && goal===lastTarget && direction===lastDirection) return;
      lastRequested=desired; lastTarget=goal; lastDirection=direction;
      const ahead=Array.from({length:6},(_,n)=>clamp(desired+(n+1)*direction,1,FRAME_COUNT));
      const behind=Array.from({length:3},(_,n)=>clamp(desired-(n+1)*direction,1,FRAME_COUNT));
      decodePriority=[...new Set([desired,goal,...ahead,...behind,1,FRAME_COUNT])];
      fetchQueue=[...new Set([...decodePriority,...fetchQueue])];
      pumpNetwork(); pumpDecodes();
    }
    function draw(index,force=false) {
      const image=decoded.get(index); if(!image) return;
      const width=surface.clientWidth,height=surface.clientHeight;
      if(!width || !height) return;
      const dpr=Math.min(devicePixelRatio||1,1.5);
      const resized=lastWidth!==width || lastHeight!==height;
      if(!force && index===rendered && !resized) return;
      if(resized) {surface.width=Math.round(width*dpr);surface.height=Math.round(height*dpr);lastWidth=width;lastHeight=height;}
      context.setTransform(dpr,0,0,dpr,0,0);
      context.clearRect(0,0,width,height);
      const portrait=width<800 && height>width;
      const scale=portrait ? Math.min(width*1.72/image.width,height*0.68/image.height) : Math.max(width/image.width,height/image.height);
      const drawWidth=image.width*scale,drawHeight=image.height*scale;
      const centerY=portrait ? height*0.38 : height*0.5;
      if(resized){const edge=centerY-drawHeight/2;surface.style.maskImage=portrait ? `linear-gradient(180deg,transparent ${edge}px,#000 ${edge+32}px,#000 ${edge+drawHeight-32}px,transparent ${edge+drawHeight}px)` : 'none';}
      context.drawImage(image,(width-drawWidth)/2,centerY-drawHeight/2,drawWidth,drawHeight);
      if(ambient.current && (index!==rendered || resized)) ambient.current.src=framePath(index,mobileSource);
      rendered=index; updateCopy(index); setReady(true);
    }
    function tick() {
      raf=0;if(stopped || !visible) return;
      const rect=host.getBoundingClientRect();
      const travel=Math.max(1,host.offsetHeight-innerHeight);
      const scrollProgress=clamp(-rect.top/travel);
      target=1+clamp(scrollProgress/ANIMATION_END)*(FRAME_COUNT-1);
      if(Math.abs(target-previousTarget)>0.01) direction=target>=previousTarget ? 1 : -1;
      previousTarget=target;
      current+=(target-current)*0.22;
      if(Math.abs(target-current)<0.1)current=target;
      const desired=clamp(Math.round(current),1,FRAME_COUNT);
      prepareWindow(desired);
      let chosen=desired;
      if(!decoded.has(chosen)) {
        const candidates=[...decoded.keys()].filter(n=>direction>0 ? n<=desired && (!rendered||n>=rendered||target<rendered) : n>=desired && (!rendered||n<=rendered||target>rendered));
        chosen=candidates.sort((a,b)=>Math.abs(a-desired)-Math.abs(b-desired))[0] ?? rendered;
      }
      if(chosen) draw(chosen);
      if(Math.abs(target-current)>0.1) schedule();
    }
    const observer=new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(visible) {pumpNetwork();pumpDecodes();schedule();}
      else {cancelAnimationFrame(raf);raf=0;}
    },{rootMargin:'0px'});
    observer.observe(host);
    const resize=()=>{lastWidth=0;lastHeight=0;schedule();};
    const visibility=()=>{if(document.hidden){visible=false;cancelAnimationFrame(raf);raf=0;}else{visible=host.getBoundingClientRect().bottom>0&&host.getBoundingClientRect().top<innerHeight;if(visible){pumpNetwork();pumpDecodes();schedule();}}};
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',visibility);
    decodePriority=[1,FRAME_COUNT,2,3,4,5,6,7,8,9];fetchQueue=[...decodePriority];pumpNetwork();schedule();
    return()=>{stopped=true;aborter.abort();cancelAnimationFrame(raf);observer.disconnect();removeEventListener('scroll',schedule);removeEventListener('resize',resize);document.removeEventListener('visibilitychange',visibility);decoded.forEach(dispose);decoded.clear();encoded.clear();};
  },[reduced]);

  return <section ref={section} id="home" className={`intro cinematic-intro ${reduced?'reduced':''}`} aria-label="Home — footwear in motion">
    <div className="intro-pin">
      <div className="hero-media" aria-hidden="true">
        <img ref={ambient} className="hero-ambient" src={framePath(1,true)} alt=""/>
        <img className={`hero-poster ${ready?'loaded':''}`} src={framePath(1,true)} alt=""/>
        <canvas ref={canvas} className={ready?'ready':''}/>
      </div>
      <div className="hero-shade" aria-hidden="true"/>
      <div className="hero-overlay">
        <div className="hero-topline"><span><i/> THE NEXT GENERATION OF FOOTWEAR</span><a href="#showroom">Skip intro <ArrowUpRight size={13}/></a></div>
        <div className="hero-copy-stack">
          {chapters.map((chapter,i)=><div key={chapter.label} ref={node=>chapterNodes.current[i]=node} className="hero-copy hero-chapter" aria-hidden={i!==0} style={{opacity:i===0?1:0,visibility:i===0?'visible':'hidden'}}>
            <div className="eyebrow">A NEW PERSPECTIVE / VOL. 01</div>
            {i===0?<h1>{chapter.title}</h1>:<h2>{chapter.title}</h2>}
            <p>{chapter.support}</p>
            <a className="pill-link" href="#showroom" tabIndex={i===0?0:-1}>{i===3?'Explore Collection':'Enter the experience'}<ArrowUpRight size={18}/></a>
          </div>)}
        </div>
        <div className="hero-spec"><span>ENGINEERED TO MOVE.</span><b>AER / 001</b><p>Adaptive comfort.<br/>Uncompromising form.</p></div>
        <div className="hero-bottom">
          <a href="#showroom" className="scroll-cue"><span className="scroll-line"/>SCROLL TO EXPLORE<ArrowDown size={13}/></a>
          <div className="hero-chapters" aria-hidden="true">{chapters.map((chapter,i)=><span ref={node=>chapterIndicators.current[i]=node} key={chapter.label} className={i===0?'active':''}><small>0{i+1}</small>{chapter.label}</span>)}</div>
          <span className="frame-count" ref={counter} aria-hidden="true">001 / 239</span>
        </div>
      </div>
      <div className="scroll-progress" aria-hidden="true"><i ref={progress}/></div>
    </div>
  </section>;
}
