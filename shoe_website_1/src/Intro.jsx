import React, {useEffect, useRef, useState} from 'react';
import {ArrowDown, ArrowUpRight} from 'lucide-react';
import {FRAME_COUNT, framePath, mountFrameSequence} from './frameSequence.js';

const clamp = (n, min=0, max=1) => Math.max(min, Math.min(max, n));
const smoothstep = n => {const t=clamp(n); return t*t*(3-2*t);};
const chapters = [
  {start:0, label:'REVEAL', title:<>THE FUTURE<br/>IS IN <em>MOTION.</em></>, support:'Discover footwear that moves beyond ordinary.'},
  {start:0.22, label:'PRECISION', title:<>PRECISION IN<br/>EVERY <em>DETAIL.</em></>, support:'Designed for comfort. Made to make a statement.'},
  {start:0.51, label:'EVOLUTION', title:<>BUILT TO<br/><em>STAND OUT.</em></>, support:'Where innovation meets unmistakable style.'},
  {start:0.79, label:'ARRIVAL', title:<>OWN<br/>EVERY <em>STEP.</em></>, support:'Find the pair that defines your journey.'},
];

export default function Intro() {
  const section = useRef(null), canvas = useRef(null);
  const chapterNodes = useRef([]), chapterIndicators = useRef([]), progress = useRef(null), counter = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const host=section.current;
    if (!host || !canvas.current) return;
    function updateCopy(index, reduced=false) {
      const timeline=index/(FRAME_COUNT-1);
      let activeChapter=0;
      chapters.forEach((chapter, i)=>{
        const node=chapterNodes.current[i];
        if(!node) return;
        const incoming=i===0 ? 1 : smoothstep((timeline-chapter.start+0.025)/0.05);
        const outgoing=i===chapters.length-1 ? 1 : 1-smoothstep((timeline-chapters[i+1].start+0.025)/0.05);
        const opacity=Math.min(incoming,outgoing);
        const y=reduced ? 0 : (1-incoming)*22-(1-outgoing)*16;
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
      counter.current.textContent=`${String(Math.round(index)+1).padStart(3,'0')} / ${FRAME_COUNT}`;
      host.dataset.frame=String(Math.round(index)+1);
      host.dataset.chapter=String(activeChapter+1);
      host.dataset.complete=String(Math.round(index)===FRAME_COUNT-1);
    }
    updateCopy(0);
    return mountFrameSequence({host,canvas:canvas.current,onFrame:updateCopy,onReady:()=>setReady(true)});
  }, []);

  return <section ref={section} id="home" className="intro cinematic-intro" aria-label="Home — footwear in motion">
    <div className="intro-pin">
      <div className="hero-media" aria-hidden="true">
        <img className="hero-ambient" src={framePath(0)} alt=""/>
        <img className={`hero-poster ${ready?'loaded':''}`} src={framePath(0)} alt=""/>
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
          <span className="frame-count" ref={counter} aria-hidden="true">001 / {FRAME_COUNT}</span>
        </div>
      </div>
      <div className="scroll-progress" aria-hidden="true"><i ref={progress}/></div>
    </div>
  </section>;
}
