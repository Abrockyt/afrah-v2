import React, { useRef } from 'react';
import {useStage} from '../core/useStage';
import {gsap} from '../core/ScrollManager';
import {setTheme} from '../core/store';
import {Lines} from '../ui/Reveal';
import {CONTACT} from '../content/copy';

const MOMENTS=[
  ['01','Origin','/v3/silver/time-1.webp'],
  ['02','Material','/v3/silver/arch-intro.webp'],
  ['03','Form','/v3/silver/gallery-3.webp'],
  ['04','Arrival','/v3/silver/lobby-space.webp'],
  ['05','Life','/v3/silver/time-4.webp'],
];

// One WebGL sculpture stays in place while the photographs revolve through
// actual CSS perspective. Scroll position, not timers or click state, controls
// the whole composition, so reversing the wheel reverses the choreography.
export function History(){
  const {runwayRef,stageRef}=useStage('history',{
    runway:7,
    build:(tl,{q,stage})=>{
      const cards=q('.memory__card'),num=q('.memory__number')[0],title=q('.memory__title')[0],bar=q('.memory__bar i')[0];
      let last=-1;
      const apply=p=>{
        const a=p*(MOMENTS.length-1),w=stage.clientWidth,h=stage.clientHeight;
        cards.forEach((el,i)=>{
          const d=i-a,ad=Math.abs(d),near=Math.max(0,1-ad),x=w*(.7+d*.38),y=h*(.58+Math.sin(d*1.25)*.055);
          el.style.transform=`translate3d(${x}px, ${y}px, ${-ad*240}px) translate(-50%,-50%) rotateY(${-d*17}deg) rotateZ(${Math.sin(d*.7)*3}deg) scale(${.72+near*.28})`;
          el.style.opacity=String(Math.max(0,1-ad*.38));
          el.style.visibility=ad>2.4?'hidden':'visible';el.style.zIndex=String(10-Math.round(ad));
        });
        const idx=Math.min(MOMENTS.length-1,Math.round(a));if(idx!==last){last=idx;num.textContent=`${MOMENTS[idx][0]} / 05`;title.textContent=MOMENTS[idx][1];}
        bar.style.transform=`scaleX(${p})`;
      };
      tl.to({}, {duration:1,onUpdate:()=>apply(tl.progress())},0);apply(0);
    },
    onProgress:()=>setTheme('dark'),
  });
  return <section className="runway" id="history" ref={runwayRef}><div className="stage stage--memory" ref={stageRef}>
    <div className="memory__label"><span className="t-small">05 / The story</span><h2>Moments<br/>that stay.</h2></div>
    <div className="memory__spatial">{MOMENTS.map(([n,t,image])=><figure className="memory__card" key={n}><img src={image} alt={`${t} — architectural and residential study photograph`} loading="lazy"/><figcaption>{n} / {t}</figcaption></figure>)}</div>
    <div className="memory__caption"><span className="memory__number">01 / 05</span><strong className="memory__title">Origin</strong></div>
    <div className="memory__bar"><i/></div>
    <span className="memory__cue t-small">Scroll through the moments ↓</span>
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
