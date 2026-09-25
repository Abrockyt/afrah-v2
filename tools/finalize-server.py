from pathlib import Path
p=Path('server/start.mjs');s=p.read_text();s=s.replace("res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(data);", """const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Accept-Ranges':'bytes'};const range=req.headers.range?.match(/^bytes=(\\d+)-(\\d*)$/);if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),data.length-1):data.length-1;if(start>=data.length||end<start){res.writeHead(416,{'Content-Range':`bytes */${data.length}`}).end();return;}res.writeHead(206,{...headers,'Content-Range':`bytes ${start}-${end}/${data.length}`,'Content-Length':end-start+1});res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));return;}res.writeHead(200,{...headers,'Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);""").replace("listen(4174,", "listen(Number(process.env.PORT)||4174,");p.write_text(s)
Path('README.md').write_text('''# AFRAH

The property website is `index.html`, built with React, Three.js, React Three Fiber, Drei and GSAP. An original stepped building has a construction reveal, glazing, terraces, planting and animated day/dusk lighting. Editorial interiors, an 18-second Remotion film, floor selection, illustrative plans, gardens and an enquiry flow complete the homepage.

## Run

`npm install` then `npm run dev`. Open http://localhost:4174.

For the optimized build and enquiry endpoint, run `npm run build` then `npm start`.

`/architecture`, `/interiors`, `/residences` and `/contact` open corresponding homepage chapters. Keyboard controls, reduced motion and WebGL poster fallbacks are included. The scene pauses behind opaque chapters and open overlays.

## Enquiries

Both the Vite server and `server/start.mjs` save validated enquiries under `private/enquiries/`, ignored by Git and excluded from the production site. Submissions are local records. Email, CRM delivery and a real viewing calendar are not connected.

## Assets and property data

The architecture is original procedural geometry. Plans, residence identifiers and specifications are illustrative. Reference photography and footage are temporary local-study assets requested by the user; they do not depict this new building. Sources are recorded in `assets/website-media-provenance.json`. Replace or obtain rights before publication. Local fonts are Inter and Playfair Display. The park HDRI is the Drei-distributed Rooitou Park environment.

The film source is `film/index.jsx`. Re-render with `npm run render:film`.

The old `review.html`, `research/`, `docs/` and `architecture/` are internal work files, not linked from the website or included in the production build. The sibling `Afrah/` project remains untouched.

Browser verification scripts and screenshots are under `tools/` and `qa/website/`.
''')
