import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState} from 'react';
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {Dialog,Enquiry} from '../Forms';
import {ChapterPage,ResidenceExperience,PlaceMap,Link} from './Chapters';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import './cinematic.css';

gsap.registerPlugin(ScrollTrigger);
const World=lazy(()=>import('./three/World'));
const memories=['Morning','Architecture','Inside','Stillness','Evening'];
const chapters=[['Architecture','/architecture'],['Interiors','/interiors'],['Landscape','/landscape'],['Residences','/residences'],['Place','/place']];
const clamp=p=>Math.max(0,Math.min(1,p));
function Stage({scene,id,children,height=260,className=''}){return <section id={id||scene} data-scene={scene} className={`af-stage ${className}`} style={{'--length':height}}><div className="af-pin">{children}</div></section>;}
function Small({children}){return <span className="af-small">{children}</span>;}
function Editorial({title='Material.',number='01',image='/cinematic/images/building.webp',line='Presence, in every detail.',link='/architecture',onNavigate}){return <section className="af-editorial af-ivory" data-scene="none" data-ui="light"><div className="af-editorial-heading"><Small>{number} / {link.slice(1)}</Small><h2>{title}</h2></div><figure><img src={image} alt={link==='/architecture'?'The original Afrah towers, with recessed glazing and bronze facade details':'An illustrative vision of life at Afrah'} loading="lazy"/><figcaption><span>{line}</span><Link to={link} onNavigate={onNavigate}>Discover ↗</Link></figcaption></figure></section>;}
function Home({active,onNavigate,onViewing,floor,setFloor,hover}){const memory=active.mode==='gallery'?Math.min(4,Math.round(active.progress*4)):0;return <>
  <Stage scene="opening" height={330}><div className="af-opening-title" style={{opacity:1-clamp(active.mode==='opening'?active.progress*3:1)}}><Small>A place apart</Small><h1>AFRAH</h1></div><div className="af-stage-foot"><Small>00 / The beginning</Small><a href="#building">Scroll to enter <span>↓</span></a></div></Stage>
  <Stage scene="building" height={360}><div className="af-caption"><Small>01 / Architecture</Small><h2>{active.mode==='building'?['Residences.','Light.','Detail.','Terraces.'][Math.min(3,Math.floor(active.progress*4))]:'Residences.'}</h2></div><div className="af-stage-foot"><Small>Stone / Glass / Light</Small><Link to="/architecture" onNavigate={onNavigate}>Explore architecture ↗</Link></div></Stage>
  <Editorial onNavigate={onNavigate}/>
  <Stage scene="tunnel" height={340}><div className="af-tunnel-copy" style={{opacity:active.mode==='tunnel'?1-clamp(active.progress*2.6):1}}><Small>02 / A passage</Small><h2>Follow<br/><em>the light.</em></h2></div><div className="af-aperture" style={{opacity:active.mode==='tunnel'?clamp((active.progress-.91)/.09):0}}/><div className="af-stage-foot"><Small>From structure, to stillness</Small><Small>Continue ↓</Small></div></Stage>
  <Editorial title="Within." number="03" image="/cinematic/images/interior.webp" line="Room for the quiet moments." link="/interiors" onNavigate={onNavigate}/>
  <Stage scene="object" height={250}><div className="af-caption"><Small>04 / An Afrah study</Small><h2>Stone.<br/>Glass.<br/><em>Light.</em></h2></div></Stage>
  <Stage scene="gallery" height={500}><div className="af-gallery-heading"><Small>05 / Life, in moments</Small></div><div className="af-gallery-caption"><Small>0{memory+1} / 05</Small><h2>{memories[memory]}</h2></div><div className="af-gallery-index">{memories.map((v,i)=><button key={v} aria-label={`Explore ${v.toLowerCase()}`} className={memory===i?'on':''} onClick={()=>{const el=document.getElementById('gallery');window.dispatchEvent(new CustomEvent('afrah:scroll',{detail:el.offsetTop+(el.offsetHeight-innerHeight)*i/4}));}}><span>0{i+1}</span><i/></button>)}</div></Stage>
  <ResidenceExperience Stage={Stage} floor={floor} setFloor={setFloor} hover={hover} onViewing={onViewing} compact/>
  <PlaceMap onNavigate={onNavigate}/>
  <Stage scene="finale" height={200}><div className="af-caption"><Small>The last light</Small><h2>AFRAH</h2></div></Stage>
  <section className="af-cta" data-scene="none"><Small>The next chapter</Small><Link to="/residences" onNavigate={onNavigate}>Find your<br/><em>place.</em><span>↗</span></Link><button className="af-text-link" onClick={()=>onViewing()}>Arrange a viewing ↗</button></section>
</>;}

export default function App(){
  const [path,setPath]=useState(location.pathname.replace(/\/$/,'')||'/'),[menu,setMenu]=useState(false),[enquiry,setEnquiry]=useState(null),[ready,setReady]=useState(false),[sound,setSound]=useState(false),[floor,setFloor]=useState(18),[hover,setHover]=useState(-1),[active,setActive]=useState({mode:'opening',progress:0});
  const signal=useRef({mode:'opening',progress:0}),root=useRef(),lenis=useRef(),audio=useRef(),header=useRef();
  const navigate=to=>{setMenu(false);history.pushState({},'',to);setPath(to);window.scrollTo(0,0);lenis.current?.scrollTo(0,{immediate:true});};
  const viewing=residence=>setEnquiry(typeof residence==='string'?residence:'');
  useEffect(()=>{const pop=()=>{setPath(location.pathname);window.scrollTo(0,0);};addEventListener('popstate',pop);return()=>removeEventListener('popstate',pop);},[]);
  useLayoutEffect(()=>{
    document.title=`AFRAH — ${path==='/'?'A place apart':chapters.find(x=>x[1]===path)?.[0]||'Architecture'}`;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduced){const l=new Lenis({lerp:.08,smoothWheel:true,anchors:true});lenis.current=l;l.on('scroll',ScrollTrigger.update);}
    let frame,lastStep='';const tick=t=>{lenis.current?.raf(t);frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
    const blocks=[...root.current.querySelectorAll('[data-scene]')];
    const update=()=>{const y=window.scrollY;let block=blocks[0];for(const b of blocks){if(b.offsetTop<=y+1)block=b;else break;}if(!block)return;const mode=block.dataset.scene,p=clamp((y-block.offsetTop)/Math.max(1,block.offsetHeight-innerHeight)),progress=reduced?Math.round(p*4)/4:p;signal.current={mode,progress};const step=mode+Math.round(progress*100);if(step!==lastStep){setActive({mode,progress});lastStep=step;}header.current?.classList.toggle('is-ivory',block.dataset.ui==='light'||(mode==='tunnel'&&progress>.93));};
    const trigger=ScrollTrigger.create({start:0,end:'max',onUpdate:update});
    const scroll=e=>lenis.current?lenis.current.scrollTo(e.detail,{duration:1.7}):window.scrollTo({top:e.detail,behavior:reduced?'instant':'smooth'});addEventListener('afrah:scroll',scroll);addEventListener('resize',update);update();
    const timer=setTimeout(()=>{ScrollTrigger.refresh();update();},120);
    return()=>{clearTimeout(timer);cancelAnimationFrame(frame);trigger.kill();lenis.current?.destroy();lenis.current=null;removeEventListener('afrah:scroll',scroll);removeEventListener('resize',update);};
  },[path]);
  useEffect(()=>{if(menu||enquiry!==null){lenis.current?.stop();document.body.style.overflow='hidden';}else{lenis.current?.start();document.body.style.overflow='';}},[menu,enquiry]);
  useEffect(()=>()=>audio.current?.close(),[]);
  const toggleSound=()=>{if(sound){audio.current?.suspend();setSound(false);return;}if(!audio.current){const ctx=new AudioContext(),master=ctx.createGain();master.gain.value=.015;master.connect(ctx.destination);[65.41,98,130.81].forEach((f,i)=>{const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=.2/(i+1);o.connect(g);g.connect(master);o.start();});audio.current=ctx;}audio.current.resume();setSound(true);};
  return <div className="af-site" ref={root}>
    <a className="af-skip" href="#content">Skip to content</a>
    <Suspense fallback={null}><World signal={signal} floor={floor} fallbackScene={active.mode} onFloor={setFloor} onHover={setHover} route={path} onReady={()=>setReady(true)}/></Suspense>
    <header className="af-header" ref={header}><Link className="af-wordmark" to="/" onNavigate={navigate}>AFRAH</Link><nav aria-label="Primary"><Link to="/residences" onNavigate={navigate}>Residences</Link><Link to="/place" onNavigate={navigate}>Place</Link><button onClick={()=>viewing()}>Viewing</button><button aria-expanded={menu} aria-controls="af-menu" onClick={()=>setMenu(true)}>Menu <span className="af-menu-icon">＋</span></button></nav></header>
    <main id="content" key={path}>{path==='/'?<Home active={active} onNavigate={navigate} onViewing={viewing} floor={floor} setFloor={setFloor} hover={hover}/>:<ChapterPage path={path} Stage={Stage} Editorial={Editorial} onNavigate={navigate} onViewing={viewing} floor={floor} setFloor={setFloor} hover={hover}/>}</main>
    <div className={`af-sound ${active.mode==='none'?'is-hidden':''}`}><button onClick={toggleSound} aria-pressed={sound}>Sound {sound?'on':'off'} <span>{sound?'ııı':'ıı'}</span></button></div>
    {!ready&&<div className="af-loading" role="status"><span>AFRAH</span><i/></div>}
    <footer className="af-footer" data-scene="none"><Link to="/" onNavigate={navigate}>AFRAH</Link><Small>© {new Date().getFullYear()} Afrah</Small><Small>Illustrative residences</Small><button onClick={()=>window.dispatchEvent(new CustomEvent('afrah:scroll',{detail:0}))}>Back to beginning ↑</button></footer>
    {menu&&<Dialog title="Explore Afrah" onClose={()=>setMenu(false)} className="af-menu"><div id="af-menu"><Small>A place apart</Small><nav aria-label="Explore Afrah"><Link to="/" onNavigate={navigate}><span>00</span>Beginning</Link>{chapters.map(([label,to],i)=><Link to={to} key={to} onNavigate={navigate}><span>0{i+1}</span>{label}</Link>)}</nav><button className="af-text-link" onClick={()=>{setMenu(false);viewing();}}>Arrange a viewing ↗</button></div></Dialog>}
    {enquiry!==null&&<Enquiry residence={enquiry} onClose={()=>setEnquiry(null)}/>}
  </div>;
}
