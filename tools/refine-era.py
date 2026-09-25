from pathlib import Path
p=Path('src/EraApp.jsx');s=p.read_text();s=s.replace('[menu,setMenu]=useState(false),','[menu,setMenu]=useState(false),[hideDock,setHideDock]=useState(false),')
s=s.replace("end:'bottom bottom',scrub:1.15}}).to('.hero-picture',{width:'100%',left:0,top:0,height:'100%',borderRadius:0,ease:'none'},0)","end:'bottom bottom',scrub:1.15,invalidateOnRefresh:true}}).fromTo('.hero-picture',{width:()=>innerWidth<701?'86%':'76%',left:()=>innerWidth<701?'7%':'12%',top:()=>innerWidth<701?'43%':'54%',height:()=>innerWidth<701?'78%':'100%'},{width:'100%',left:'0%',top:'0%',height:'100%',borderRadius:0,ease:'none'},0)")
s=s.replace("const mm=gsap.matchMedia();const context=gsap.context(()=>{","const mm=gsap.matchMedia();const context=gsap.context(()=>{\n   ScrollTrigger.create({trigger:'#residences',start:'top 70%',endTrigger:'.era-footer',end:'bottom bottom',onToggle:self=>setHideDock(self.isActive)});")
s=s.replace('{!overlay&&<button className="map-dock','{!overlay&&!hideDock&&<button className="map-dock')
s=s.replace("smooth.on('scroll',ScrollTrigger.update);","smooth.on('scroll',ScrollTrigger.update);gsap.ticker.lagSmoothing(0);")
p.write_text(s)
p=Path('src/Forms.jsx');s=p.read_text().replace('<dialog ref={ref}', '<dialog data-lenis-prevent ref={ref}');p.write_text(s)
