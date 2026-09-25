import {createContext, useContext, useEffect, useRef, useState} from 'react';
import {ArrowUpRight, ArrowDown, Plus, Minus, ChevronLeft, ChevronRight} from 'lucide-react';
import {chapters, nextChapter} from './data';

export const Site = createContext(null);
export const useSite = () => useContext(Site);

export function Link({to, children, className = '', ...props}) {
  const {navigate} = useSite();
  return <a href={to} className={className} {...props} onClick={e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault(); navigate(to);
  }}>{children}</a>;
}

export const Label = ({children, className = ''}) => <span className={`v-label ${className}`}>{children}</span>;

export function Img({src, alt = '', className = '', eager = false, parallax = false, ...rest}) {
  return <figure className={`v-img ${className}`} data-parallax={parallax || undefined} {...rest}>
    <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : undefined}/>
  </figure>;
}

// Headline whose lines rise out of a mask. Lines are passed as an array.
export function Title({lines, as: Tag = 'h2', className = '', accent = []}) {
  return <Tag className={`v-title ${className}`} data-lines>
    {lines.map((line, i) => <span className="v-line" key={i}><span className={accent.includes(i) ? 'v-accent' : undefined}>{line}</span></span>)}
  </Tag>;
}

export function TextLink({to, children, light}) {
  return <Link to={to} className={`v-text-link ${light ? 'light' : ''}`}><span>{children}</span><i><ArrowUpRight size={18}/></i></Link>;
}

// Statement paragraph lit word by word on scroll (ERA manifesto / Composites captions).
export function Statement({label, children, className = '', aside}) {
  return <section className={`v-statement v-pad ${className}`}>
    <div className="v-statement-top"><Label>{label}</Label>{aside && <Label>{aside}</Label>}</div>
    <p data-words>{children.split(' ').map((w, i) => <span key={i}>{w} </span>)}</p>
  </section>;
}

export function Counter({value, suffix = '', label}) {
  return <div className="v-counter"><strong data-count={value}>{value}</strong><sup>{suffix}</sup><span>{label}</span></div>;
}

export function Marquee({items, className = ''}) {
  const row = items.map((t, i) => <span key={i}>{t}<i>✦</i></span>);
  return <div className={`v-marquee ${className}`} aria-hidden="true"><div>{row}{row}</div></div>;
}

// Card that tilts in 3D toward the pointer.
export function Tilt({children, className = '', max = 9}) {
  const ref = useRef();
  const move = e => {
    if (matchMedia('(pointer: coarse)').matches) return;
    const r = ref.current.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    ref.current.style.transform = `perspective(900px) rotateY(${x * max}deg) rotateX(${-y * max}deg) translateZ(0)`;
    ref.current.style.setProperty('--gx', `${(x + .5) * 100}%`); ref.current.style.setProperty('--gy', `${(y + .5) * 100}%`);
  };
  const leave = () => { ref.current.style.transform = ''; };
  return <div ref={ref} className={`v-tilt ${className}`} onPointerMove={move} onPointerLeave={leave}>{children}<i className="v-tilt-glare"/></div>;
}

// Opening of every chapter page: time stamp, giant title, full-bleed image that expands on scroll.
export function ChapterHero({chapter, lines, intro, image}) {
  // --len lets the CSS shrink the title so the longest line always fits the viewport width.
  const len = Math.max(...lines.map(l => l.length));
  return <section className="v-chapter-hero" data-hero style={{'--len': len}}>
    <div className="v-chapter-hero-top v-pad">
      <Label>Chapter {chapter.num} / {chapter.time}</Label>
      <span className="v-clock">{chapter.hour}</span>
      <Label>{chapter.kicker}</Label>
    </div>
    <Title as="h1" lines={lines} className="v-chapter-title" accent={[lines.length - 1]}/>
    <div className="v-chapter-hero-bottom v-pad">
      <p>{intro}</p>
      <a href="#start" className="v-round" aria-label="Start this chapter"><ArrowDown size={20}/></a>
    </div>
    <div className="v-expand" data-expand><Img src={image || chapter.image} alt={chapter.title} eager/></div>
    <span id="start"/>
  </section>;
}

export function NextChapter({path}) {
  const next = nextChapter(path);
  return <Link to={next.path} className="v-next">
    <Img src={next.image} alt="" parallax/>
    <div className="v-next-shade"/>
    <div className="v-next-copy v-pad">
      <Label>Next — Chapter {next.num} / {next.hour}</Label>
      <strong>{next.title}</strong>
      <p>{next.teaser}</p>
      <span className="v-round big"><ArrowUpRight size={30}/></span>
    </div>
  </Link>;
}

// LIKOVA-style numbered chapter row: big numeral, framed caption and image.
export function Numbered({n, label, title, text, image, reverse, children}) {
  return <section className={`v-numbered v-pad ${reverse ? 'reverse' : ''}`}>
    <div className="v-numbered-num" aria-hidden="true">{n}</div>
    <div className="v-numbered-copy">
      <Label>{label}</Label>
      <Title lines={title}/>
      <p data-reveal>{text}</p>
      {children}
    </div>
    <Img src={image} alt="" className="v-numbered-img" parallax/>
  </section>;
}

// Cards pinned one over another as you scroll (Silver Pinewood courtyard rhythm).
export function StickyStack({items}) {
  return <section className="v-stack v-pad">
    {items.map(([title, text, image], i) => <article className="v-stack-card" key={title} style={{'--i': i}}>
      <Img src={image} alt=""/>
      <div><Label>{String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</Label><h3>{title}</h3><p>{text}</p></div>
    </article>)}
  </section>;
}

// Horizontal pinned gallery driven by vertical scroll.
export function HGallery({label, title, items}) {
  return <section className="v-hgallery" data-hscroll>
    <div className="v-hgallery-pin">
      <div className="v-hgallery-head v-pad"><Label>{label}</Label><Title lines={title}/></div>
      <div className="v-hgallery-track" data-track>
        {items.map(([src, caption], i) => <figure className="v-hgallery-item" key={src + i}>
          <Img src={src} alt={caption}/><figcaption><Label>{String(i + 1).padStart(2, '0')}</Label>{caption}</figcaption>
        </figure>)}
      </div>
    </div>
  </section>;
}

export function Accordion({items}) {
  const [open, setOpen] = useState(0);
  return <div className="v-accordion">{items.map(([q, a], i) => <div key={q} className={open === i ? 'open' : ''}>
    <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span>{String(i + 1).padStart(2, '0')}</span>{q}{open === i ? <Minus/> : <Plus/>}</button>
    <div className="v-accordion-body"><p>{a}</p></div>
  </div>)}</div>;
}

// Slider with "1 / 5" counter (ERA joys-of-every-day carousel).
export function Carousel({items}) {
  const [i, setI] = useState(0);
  const go = d => setI(v => (v + d + items.length) % items.length);
  useEffect(() => { const t = setTimeout(() => go(1), 6000); return () => clearTimeout(t); }, [i]);
  return <div className="v-carousel">
    <div className="v-carousel-stage">{items.map(([src, title, text], k) => <figure key={src} className={k === i ? 'active' : ''} aria-hidden={k !== i}>
      <img src={src} alt={title} loading="lazy"/><figcaption><h3>{title}</h3><p>{text}</p></figcaption></figure>)}</div>
    <div className="v-carousel-bar">
      <span className="v-carousel-count">{i + 1} <i>/ {items.length}</i></span>
      <div className="v-carousel-progress"><i key={i}/></div>
      <button className="v-round" aria-label="Previous" onClick={() => go(-1)}><ChevronLeft/></button>
      <button className="v-round" aria-label="Next" onClick={() => go(1)}><ChevronRight/></button>
    </div>
  </div>;
}

// Two-state image comparison: morning east / evening west (Silver Pinewood "choose your side").
export function SideSwitch({a, b}) {
  const [side, setSide] = useState(0);
  const cur = side ? b : a;
  return <section className={`v-sides v-pad ${side ? 'west' : 'east'}`}>
    <div className="v-sides-copy">
      <Label>Choose your side</Label>
      <h2 className="v-sides-title"><span className={!side ? 'on' : ''}>East.</span> <span className={side ? 'on' : ''}>West.</span></h2>
      <p>{cur.text}</p>
      <div className="v-switch" role="group" aria-label="Aspect">
        <button aria-pressed={!side} onClick={() => setSide(0)}>{a.label}</button>
        <button aria-pressed={!!side} onClick={() => setSide(1)}>{b.label}</button>
        <i/>
      </div>
    </div>
    <div className="v-sides-media">
      <img src={a.image} alt={a.label} className={!side ? 'on' : ''} loading="lazy"/>
      <img src={b.image} alt={b.label} className={side ? 'on' : ''} loading="lazy"/>
    </div>
  </section>;
}

export function ChapterIndex({current}) {
  const [hover, setHover] = useState(0);
  return <section className="v-index v-pad">
    <div className="v-index-head"><Label>The whole day</Label><Label>Eight chapters / one story</Label></div>
    <div className="v-index-body">
      <nav aria-label="Chapters">{chapters.map((c, i) => <Link to={c.path} key={c.path} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} aria-current={current === c.path ? 'page' : undefined}>
        <span className="v-index-hour">{c.hour}</span><span className="v-index-title">{c.title}</span><span className="v-index-kicker">{c.kicker}</span><ArrowUpRight/>
      </Link>)}</nav>
      <div className="v-index-media">{chapters.map((c, i) => <img key={c.path} src={c.image} alt="" loading="lazy" className={hover === i ? 'on' : ''}/>)}</div>
    </div>
  </section>;
}
