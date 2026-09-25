import React, { useEffect, useRef } from 'react';
import {useStage} from '../core/useStage';
import {gsap} from '../core/ScrollManager';
import {setTheme,store} from '../core/store';
import {HISTORY_ITEMS,HISTORY_TITLE,HISTORY_INTRO} from '../content/history';
import {Lines} from '../ui/Reveal';
import {CONTACT} from '../content/copy';

// Composites-style history: a huge title rises word by word and is wiped
// away by its mask, the intro lines slide in and out, then the WebGL helix
// (HistoryScene) turns through the milestones while the year strip slides
// underneath and the current milestone's year and title are shown.
export function History(){
  const itemRef=useRef(null);
  const {runwayRef,stageRef}=useStage('history',{
    runway:15,
    build:(tl,{q})=>{
      const strip=q('.hx__timeline-strip')[0];
      tl.fromTo(q('.hx__title .hx__word > span'),{yPercent:100},{yPercent:0,duration:.08,stagger:.006,ease:'power2.out'},.01)
        .fromTo(q('.hx__title-mask'),{height:'100%'},{height:'0%',duration:.1,ease:'power1.inOut'},.12)
        .fromTo(q('.hx__intro .hx__line'),{yPercent:200,autoAlpha:0},{yPercent:0,autoAlpha:1,duration:.05,stagger:.007},.13)
        .to(q('.hx__intro'),{autoAlpha:0,x:-20,duration:.03},.21)
        .fromTo(q('.hx__item'),{autoAlpha:0},{autoAlpha:1,duration:.04},.21)
        .fromTo(q('.hx__timeline'),{autoAlpha:0},{autoAlpha:1,duration:.04},.14)
        .fromTo(strip,{x:0},{x:()=>-(strip.scrollWidth-strip.parentElement.clientWidth),duration:.83,ease:'none'},.14)
        .to(q('.hx__item, .hx__timeline'),{autoAlpha:0,duration:.03},.965);
    },
    onProgress:()=>setTheme('light'),
  });
  // The helix reports which milestone is at the reading point.
  useEffect(()=>{
    let last=-2;
    const tick=()=>{
      const i=store.ch.historyIndex;
      if(i===undefined||i===last||!itemRef.current)return;
      last=i;const it=HISTORY_ITEMS[i];if(!it)return;
      const el=itemRef.current;
      el.querySelector('.hx__item-year').textContent=it.year;
      const t=el.querySelector('.hx__item-title');
      t.innerHTML=it.title.split(' ').map(w=>`<span class="hx__word"><span>${w}</span></span>`).join(' ');
      gsap.fromTo(t.querySelectorAll('.hx__word > span'),{yPercent:100},{yPercent:0,duration:.6,stagger:.04,ease:'power3.out',overwrite:true});
    };
    gsap.ticker.add(tick);return()=>gsap.ticker.remove(tick);
  },[]);
  const years=[...HISTORY_ITEMS].reverse();
  return <section className="runway" id="history" ref={runwayRef}><div className="stage hx" ref={stageRef}>
    <div className="hx__title-wrap"><div className="hx__title-mask"><h2 className="hx__title">{HISTORY_TITLE.map((line,i)=><span className="hx__title-line" key={i}>{line.split(' ').map((w,j)=><span className="hx__word" key={j}><span>{w}</span></span>)}</span>)}</h2></div></div>
    <div className="hx__intro">{HISTORY_INTRO.map((l,i)=><span className="hx__line" key={i}>{l||'\u00a0'}</span>)}</div>
    <div className="hx__item" ref={itemRef} aria-live="polite"><span className="hx__item-year"/><h3 className="hx__item-title"/></div>
    <div className="hx__timeline" aria-hidden="true"><div className="hx__timeline-strip">{years.map((it,i)=><span key={i}>{it.year}</span>)}</div></div>
    <span className="hx__kicker t-small">11 / The story</span>
  </div></section>;
}

/* ---------------------------------------------------------------- Contact */
export function Contact() {
  const ref = useRef(null);
  const [status, setStatus] = React.useState('idle');
  const submit = async (e) => {
    e.preventDefault(); setStatus('sending');
    try { const r = await fetch('/api/enquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(e.currentTarget))) }); setStatus(r.ok ? 'sent' : 'error'); }
    catch { setStatus('error'); }
  };
  React.useLayoutEffect(() => {
    const el = ref.current;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 70%', end: 'top 20%', scrub: 0.4, onUpdate: () => setTheme('dark') } });
      tl.fromTo(el.querySelectorAll('.contact__title .line__in'), { yPercent: 110, y: 0 }, { yPercent: 0, y: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out' }, 0)
        .fromTo(el.querySelectorAll('.contact__body p'), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.3)
        .fromTo(el.querySelectorAll('.field'), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.3 }, 0.2)
        .fromTo(el.querySelectorAll('.field i'), { scaleX: 0 }, { scaleX: 1, stagger: 0.05, duration: 0.3, transformOrigin: 'left' }, 0.3)
        .fromTo(el.querySelector('.contact__cta'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.8)
        .fromTo(el.querySelector('.footer'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 0.9);
    }, el);
    return () => ctx.revert();
  }, []);
  return (
    <section className="contact" ref={ref} id="contact">
      <div className="contact__grid">
        <div className="contact__left">
          <Lines lines={CONTACT.lines} className="contact__title t-h2" />
          <div className="contact__body t-body t-mist">{CONTACT.body.map((p, i) => <p key={i}>{p}</p>)}</div>
        </div>
        <form className="contact__form" onSubmit={submit}>
          {CONTACT.fields.map((f) => (
            <label className={`field field--${f.type}`} key={f.name}>
              <span className="t-small">{f.label} *</span>
              {f.type === 'textarea' ? <textarea name={f.name} rows={3} placeholder="Your message" /> : <input name={f.name} type={f.type} placeholder={`Your ${f.label.toLowerCase()}`} />}
              <i />
            </label>
          ))}
          <label className="contact__consent"><input name="consent" type="checkbox" value="yes" required/> I agree to be contacted about this enquiry.</label>
          <button className="cta contact__cta" type="submit" disabled={status === 'sending'}>{status === 'sent' ? 'Request received — thank you' : status === 'error' ? 'Could not send — try again' : CONTACT.cta}</button>
        </form>
      </div>
      <footer className="footer">
        <span className="t-small t-mist">© {new Date().getFullYear()} AFRAH — illustrative concept, plans and imagery not final</span>
        <nav className="t-small">{CONTACT.footer.map(([href, f]) => <a key={href} href={href}>{f}</a>)}</nav>
      </footer>
    </section>
  );
}
