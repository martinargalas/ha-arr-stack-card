var GLASS_DEFAULTS={edgeIntensity:.06,rimIntensity:.06,baseIntensity:0,edgeDistance:.12,rimDistance:.3,baseDistance:.1,cornerBoost:.03,ripple:0,tint:.3,dispersion:.45,specular:.3,rimLight:.45,rimWidth:1.25,blur:6,dark:0,contrast:1},VERT=`
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
  v_uv = vec2((a_pos.x + 1.0) * 0.5, (1.0 - a_pos.y) * 0.5);
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`,FRAG=`
precision highp float;
uniform sampler2D u_bg;
uniform vec2 u_size;
uniform vec2 u_origin;
uniform vec4 u_bgRect;
uniform float u_radius;
uniform float u_px;   // one device pixel in CSS px (1 / devicePixelRatio)
uniform float u_edgeI, u_rimI, u_baseI, u_edgeD, u_rimD, u_baseD, u_corner, u_ripple, u_tint, u_disp, u_spec, u_rimL, u_rimW, u_dark, u_shade, u_tintA;
uniform vec3 u_tintC;
varying vec2 v_uv;

float sdRoundRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
vec4 bg(vec2 uv) { return texture2D(u_bg, uv); }

void main() {
  vec2 coord = v_uv;
  vec2 p = coord * u_size;
  vec2 b = u_size * 0.5;
  vec2 c = p - b;
  float r = min(u_radius, min(b.x, b.y));
  float sd = sdRoundRect(c, b, r);
  // anti-alias over one device pixel only \u2013 crisp edge on Retina
  float mask = 1.0 - smoothstep(-u_px, u_px, sd);
  if (mask <= 0.0) discard;

  // page (wallpaper) UV of this pixel
  vec2 uv = (u_origin + p - u_bgRect.xy) / u_bgRect.zw;

  float d = max(-sd, 0.0);                       // px from the edge
  vec2 n = normalize(coord - 0.5 + 1e-5);       // radial normal (as liquid-glass-js)
  float minRes = min(u_size.x, u_size.y);

  float baseK = (1.0 - exp(-d * u_baseD)) * u_baseI;
  float edgeK = exp(-d * u_edgeD) * u_edgeI;
  float rimF = exp(-d * u_rimD);
  vec2 refr = n * (baseK + edgeK + rimF * u_rimI);

  float cx = min(coord.x, 1.0 - coord.x);
  float cy = min(coord.y, 1.0 - coord.y);
  refr += n * exp(-max(cx, cy) * minRes * 0.3) * u_corner;

  vec2 perp = vec2(-n.y, n.x);
  refr += perp * sin(d / minRes * 25.0) * u_ripple * rimF;

  // chromatic dispersion: red bends a little more, blue a little less
  vec3 col = vec3(
    bg(uv + refr * (1.0 + u_disp)).r,
    bg(uv + refr).g,
    bg(uv + refr * (1.0 - u_disp)).b);

  // tint: white\u2192grey vertical gradient, then a hint of the wallpaper's own colours.
  // Night (u_dark): no milk \u2013 the glass takes the wallpaper's colour behind it,
  // slightly lifted and saturated like macOS, just a touch darker towards the bottom.
  vec2 cuv = (u_origin + b - u_bgRect.xy) / u_bgRect.zw;
  vec2 dy = vec2(0.0, u_size.y * 0.4 / u_bgRect.w);
  vec3 sampled = coord.y < 0.5
    ? mix(bg(cuv - dy).rgb, bg(cuv).rgb, coord.y * 2.0)
    : mix(bg(cuv).rgb, bg(cuv + dy).rgb, coord.y * 2.0 - 1.0);
  float lum = dot(sampled, vec3(0.299, 0.587, 0.114));
  vec3 vivid = clamp(mix(vec3(lum), sampled, 1.25) * 1.12 + 0.04, 0.0, 1.0);
  vec3 nightGrad = vivid * mix(1.0, 0.82, coord.y);
  vec3 grad = mix(mix(vec3(1.0), vec3(0.7), coord.y), nightGrad, u_dark);
  col = mix(col, grad, mix(u_tint, 0.35, u_dark));
  col = mix(col, sampled, u_tint * 0.3 * (1.0 - u_dark));
  // bright wallpaper behind: less milk and a slightly deeper glass, so white
  // text keeps its contrast (u_shade, from the wallpaper's luminance)
  col = mix(col, col * vec3(0.74, 0.76, 0.8), u_shade);
  // user color tint: colours the glass, the wallpaper still shows through
  col = mix(col, u_tintC, u_tintA);

  // specular highlight from the top left along the edge (not in liquid-glass-js)
  vec2 sn = normalize(vec2(
    sdRoundRect(c + vec2(0.75, 0.0), b, r) - sdRoundRect(c - vec2(0.75, 0.0), b, r),
    sdRoundRect(c + vec2(0.0, 0.75), b, r) - sdRoundRect(c - vec2(0.0, 0.75), b, r)) + 1e-5);
  vec2 L = normalize(vec2(-0.55, -0.83));
  float edgeBand = exp(-d * 0.12) * smoothstep(0.0, 3.0, d);
  col += u_spec * edgeBand * (pow(max(dot(sn, L), 0.0), 2.0) * 0.6 + pow(max(dot(sn, -L), 0.0), 2.0) * 0.25);

  // Edge light like macOS. Left/right: a dark (blue) line on the outer edge \u2013
  // the glass thickness \u2013 running into the corner arcs and fading out there as
  // the edge turns horizontal. A white line runs just inside it and moves out to
  // the very edge past the corners, where it becomes the top/bottom line:
  // strongest mid-edge with a soft blue tint below it.
  float rimL = u_rimL * mix(1.0, 0.85, u_dark);
  float alongX = 1.0 - smoothstep(0.0, 1.0, abs(coord.x - 0.5) * 2.0);
  float alongY = 1.0 - smoothstep(0.0, 1.0, abs(coord.y - 0.5) * 2.0);
  float side = smoothstep(0.25, 0.95, abs(sn.x));          // 1 on the sides, 0 top/bottom
  float darkW = u_rimW * 1.0;
  float darkLine = 1.0 - smoothstep(darkW - u_px, darkW + u_px, d);
  float darkShade = exp(-max(d - darkW, 0.0) / 4.0) * (1.0 - darkLine);
  vec3 dark = vec3(0.03, 0.045, 0.08);   // near black
  col = mix(col, dark, clamp(rimL * (0.85 * darkLine + 0.12 * darkShade) * side, 0.0, 1.0));

  // the light line runs along the outer edge through the corner arcs, then slips
  // inside (under) the dark side line and ends there
  float wOff = darkW * smoothstep(0.3, 0.85, abs(sn.x));
  float lineW = u_rimW * 1.5;
  float core = smoothstep(wOff - u_px, wOff + u_px, d) * (1.0 - smoothstep(wOff + lineW - u_px, wOff + lineW + u_px, d));
  float whiteW = mix(0.55, 1.0, alongX) * (1.0 - smoothstep(0.55, 0.98, abs(sn.x)));
  float tintBand = exp(-max(d - lineW, 0.0) / 6.0) * (1.0 - core);
  // glow takes its hue from the wallpaper behind, always light (towards white)
  vec3 envG = bg(uv).rgb;
  vec3 glowCol = mix(vec3(1.0), envG / max(max(envG.r, max(envG.g, envG.b)), 0.01), 0.42);
  col = mix(col, glowCol, clamp(rimL * 1.4 * tintBand * abs(sn.y) * alongX, 0.0, 1.0));
  // the line picks up the colours behind it: white over light areas, a bright
  // shade of the wallpaper over saturated ones
  vec3 env = bg(uv).rgb;
  vec3 lineCol = mix(vec3(1.0), min(env * 1.35 + 0.3, vec3(1.0)), 0.55);
  col = mix(col, lineCol, clamp(rimL * 1.6 * core * whiteW, 0.0, 1.0));

  gl_FragColor = vec4(min(col, vec3(1.0)) * mask, mask);
}`;function findBackdrop(){let el=deepFind(document,"hui-view-background");if(!el)return;let s=getComputedStyle(el),m=s.backgroundImage.match(/url\(["']?(.*?)["']?\)/);if(!m)return;let box=el.getBoundingClientRect(),img=images.get(m[1])?.img;if(!img||!img.naturalWidth)return{url:m[1],rect:{x:box.x,y:box.y,w:box.width,h:box.height}};let iw=img.naturalWidth,ih=img.naturalHeight,w=iw,h=ih,size=s.backgroundSize;if(size==="cover"||size==="contain"){let k=size==="cover"?Math.max(box.width/iw,box.height/ih):Math.min(box.width/iw,box.height/ih);w=iw*k,h=ih*k}let[px,py]=s.backgroundPosition.split(" ").map(v=>v.endsWith("%")?parseFloat(v)/100:NaN),x=box.x+(Number.isNaN(px)?.5:px)*(box.width-w),y=box.y+(Number.isNaN(py)?.5:py)*(box.height-h);return{url:m[1],rect:{x,y,w,h}}}var cachedBg=null;function deepFind(root,tag){if(cachedBg?.isConnected)return cachedBg;let stack=[root];for(;stack.length;){let r=stack.pop(),hit=r.querySelector(tag);if(hit)return cachedBg=hit;r.querySelectorAll("*").forEach(e=>e.shadowRoot&&stack.push(e.shadowRoot))}return null}var images=new Map;function loadImage(url){let entry=images.get(url);if(!entry){let img=new Image;img.crossOrigin="anonymous";let ready=new Promise((res,rej)=>{img.onload=()=>res(),img.onerror=rej});img.src=url,entry={img,ready},images.set(url,entry)}return entry}var Renderer=class{canvas=document.createElement("canvas");gl=null;prog=void 0;tex=void 0;texKey="";thumb=void 0;loc={};constructor(){this.gl=this.canvas.getContext("webgl",{premultipliedAlpha:!0,preserveDrawingBuffer:!0,antialias:!1}),this.gl&&this.init(this.gl)}get ok(){return!!this.gl&&!!this.prog}init(gl){let sh=(type,src)=>{let s=gl.createShader(type);if(gl.shaderSource(s,src),gl.compileShader(s),!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)??"shader");return s};try{let p=gl.createProgram();if(gl.attachShader(p,sh(gl.VERTEX_SHADER,VERT)),gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FRAG)),gl.linkProgram(p),!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error("link");gl.useProgram(p);let buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf),gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);let a=gl.getAttribLocation(p,"a_pos");gl.enableVertexAttribArray(a),gl.vertexAttribPointer(a,2,gl.FLOAT,!1,0,0);for(let u of["u_bg","u_size","u_origin","u_bgRect","u_radius","u_edgeI","u_rimI","u_baseI","u_edgeD","u_rimD","u_baseD","u_corner","u_ripple","u_tint","u_disp","u_spec","u_rimL","u_rimW","u_px","u_dark","u_shade","u_tintA","u_tintC"])this.loc[u]=gl.getUniformLocation(p,u);this.prog=p}catch(e){console.warn("[arr-card] WebGL liquid glass unavailable",e)}}texture(img,bgW,blur){let gl=this.gl,k=Math.min(1,2048/Math.max(img.naturalWidth,img.naturalHeight)),w=Math.round(img.naturalWidth*k),h=Math.round(img.naturalHeight*k),blurPx=Math.max(0,blur*w/bgW),key=`${img.src}|${w}|${blurPx.toFixed(1)}`;if(key===this.texKey&&this.tex)return;let c=document.createElement("canvas");c.width=w,c.height=h;let ctx=c.getContext("2d");blurPx>.3&&(ctx.filter=`blur(${blurPx}px)`),ctx.drawImage(img,0,0,w,h);let t=document.createElement("canvas");t.width=t.height=48;let tctx=t.getContext("2d",{willReadFrequently:!0});tctx.drawImage(img,0,0,48,48),this.thumb=tctx.getImageData(0,0,48,48).data,this.tex??=gl.createTexture(),gl.bindTexture(gl.TEXTURE_2D,this.tex),gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,!1),gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE),gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE),this.texKey=key}edgeLight(target,r,bg){let d=this.thumb;if(!d)return 0;let x0=Math.max(0,Math.floor((r.left-bg.x)/bg.w*48)),x1=Math.min(47,Math.ceil((r.right-bg.x)/bg.w*48)),y0=Math.max(0,Math.floor((r.top-bg.y)/bg.h*48)),y1=Math.min(47,Math.ceil((r.bottom-bg.y)/bg.h*48)),R=0,G=0,B=0,n=0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let i=(y*48+x)*4;R+=d[i],G+=d[i+1],B+=d[i+2],n++}if(!n)return 0;let m=Math.max(R,G,B,1),c=[R,G,B].map(v=>Math.round(255*(.58+.42*v/m)));return target.style.setProperty("--glass-edge-light",c.join(", ")),(.299*R+.587*G+.114*B)/(n*255)}contrast(target,lum,strength){let t=Math.min(1,Math.max(0,(lum-.55)/.3)),k=t*t*(3-2*t)*strength;if(k<.02)return target.style.removeProperty("--glass-text-shadow"),target.style.removeProperty("--glass-icon-shadow"),0;let a=x=>x.toFixed(3);return target.style.setProperty("--glass-text-shadow",`0 1px 2px rgba(0, 0, 0, ${a(.16+.22*k)}), 0 0 ${Math.round(12+10*k)}px rgba(0, 0, 0, ${a(.08+.22*k)})`),target.style.setProperty("--glass-icon-shadow",`drop-shadow(0 2px ${Math.round(6+4*k)}px rgba(0, 0, 0, ${a(.35+.2*k)}))`),k}legibility(target,strength=1){let bd=findBackdrop();if(!bd||!this.thumb)return;let r=target.getBoundingClientRect();if(!r.width||!r.height)return;let d=this.thumb,x0=Math.max(0,Math.floor((r.left-bd.rect.x)/bd.rect.w*48)),x1=Math.min(47,Math.ceil((r.right-bd.rect.x)/bd.rect.w*48)),y0=Math.max(0,Math.floor((r.top-bd.rect.y)/bd.rect.h*48)),y1=Math.min(47,Math.ceil((r.bottom-bd.rect.y)/bd.rect.h*48)),L=0,n=0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){let i=(y*48+x)*4;L+=.299*d[i]+.587*d[i+1]+.114*d[i+2],n++}n&&this.contrast(target,L/(n*255),strength)}render(target,out,p){if(!this.ok)return!1;let bd=findBackdrop();if(!bd)return!1;let entry=loadImage(bd.url);if(!entry.img.complete||!entry.img.naturalWidth)return entry.ready.then(()=>scheduleAll()).catch(()=>{}),!1;let gl=this.gl,r=target.getBoundingClientRect();if(!r.width||!r.height)return!1;let k=target.offsetWidth?r.width/target.offsetWidth:1,dpr=Math.min(window.devicePixelRatio||1,2),W=Math.round(r.width*dpr),H=Math.round(r.height*dpr);this.texture(entry.img,bd.rect.w,(p.blur/2)**2);let shade=this.contrast(target,this.edgeLight(target,r,bd.rect)??0,p.contrast);this.canvas.width=W,this.canvas.height=H,gl.viewport(0,0,W,H),gl.clearColor(0,0,0,0),gl.clear(gl.COLOR_BUFFER_BIT),gl.uniform1i(this.loc.u_bg,0),gl.uniform2f(this.loc.u_size,r.width,r.height),gl.uniform2f(this.loc.u_origin,r.x,r.y),gl.uniform4f(this.loc.u_bgRect,bd.rect.x,bd.rect.y,bd.rect.w,bd.rect.h);let set=(name,v)=>gl.uniform1f(this.loc[name],v);set("u_radius",p.radius*k),set("u_edgeI",p.edgeIntensity),set("u_rimI",p.rimIntensity),set("u_baseI",p.baseIntensity),set("u_edgeD",p.edgeDistance),set("u_rimD",p.rimDistance),set("u_baseD",p.baseDistance),set("u_corner",p.cornerBoost),set("u_ripple",p.ripple),set("u_tint",p.tint),set("u_disp",p.dispersion),set("u_spec",p.specular),set("u_rimL",p.rimLight),set("u_rimW",p.rimWidth*k),set("u_dark",p.dark),set("u_shade",shade),set("u_tintA",p.tintA??0),gl.uniform3f(this.loc.u_tintC,(p.tintR??255)/255,(p.tintG??255)/255,(p.tintB??255)/255),set("u_px",1/dpr),gl.drawArrays(gl.TRIANGLE_STRIP,0,4),out.width!==W&&(out.width=W),out.height!==H&&(out.height=H);let ctx=out.getContext("2d");return ctx.clearRect(0,0,W,H),ctx.drawImage(this.canvas,0,0),!0}},renderer;function getRenderer(){return renderer??=new Renderer,renderer.ok?renderer:void 0}var webglAvailable=(()=>{try{return!!document.createElement("canvas").getContext("webgl")}catch{return!1}})(),jobs=new Set,frame=0;function scheduleAll(){frame||(frame=requestAnimationFrame(()=>{frame=0,jobs.forEach(j=>j())}))}function registerJob(job){return jobs.size||(window.addEventListener("resize",scheduleAll,{passive:!0}),window.addEventListener("scroll",scheduleAll,{passive:!0,capture:!0})),jobs.add(job),()=>{jobs.delete(job),jobs.size||(window.removeEventListener("resize",scheduleAll),window.removeEventListener("scroll",scheduleAll,{capture:!0}))}}var LOOKS={liquid:dark=>[{sel:".col-left, .col-right",p:dark?{dark:1,rimLight:.22,specular:.15}:{dark:0}}],"apple-home":dark=>[{sel:".col-left",p:dark?{dark:1,tintR:24,tintG:26,tintB:32,tintA:.6,rimLight:.22,specular:.15}:{dark:1,tintR:22,tintG:30,tintB:46,tintA:.45}}]},BAR_SEL=".ash-col:not(.ash-bare), .ash-close:not(.ash-bare)",HERO_SEL=".popup-overlay .pp-hero-pill :is(.is-open-btn, .remove-lib-btn, .is-collapse-btn)",lensSupported=(()=>{try{return CSS.supports("backdrop-filter","url(#a)")&&/Chrome\/\d+/.test(navigator.userAgent)}catch{return!1}})(),maps=new Map;function lensMap(w,h,r,bezel){let key=`${w}x${h}r${r}b${bezel}`;if(maps.has(key))return maps.get(key);let S=.25,cw=Math.max(2,Math.round(w*S)),ch=Math.max(2,Math.round(h*S)),c=document.createElement("canvas");c.width=cw,c.height=ch;let ctx=c.getContext("2d"),img=ctx.createImageData(cw,ch),hw=w/2,hh=h/2,rr=Math.min(r,hw,hh);for(let py=0;py<ch;py++)for(let px=0;px<cw;px++){let x=(px+.5)/S-hw,y=(py+.5)/S-hh,qx=Math.abs(x)-(hw-rr),qy=Math.abs(y)-(hh-rr),ox=Math.max(qx,0),oy=Math.max(qy,0),inside=-(Math.min(Math.max(qx,qy),0)+Math.hypot(ox,oy)-rr),nx=0,ny=0;if(ox>0&&oy>0){let l=Math.hypot(ox,oy)||1;nx=ox/l*Math.sign(x),ny=oy/l*Math.sign(y)}else qx>qy?nx=Math.sign(x):ny=Math.sign(y);let t=Math.min(1,Math.max(0,1-inside/bezel)),m=1-Math.sqrt(1-t*t),i=(py*cw+px)*4;img.data[i]=128+Math.round(127*m*nx),img.data[i+1]=128+Math.round(127*m*ny),img.data[i+2]=128,img.data[i+3]=255}ctx.putImageData(img,0,0);let url=c.toDataURL("image/png");return maps.set(key,url),url}var uid=0,LiquidLayer=class{constructor(root,parent,{lensOnly=!1}={}){this.root=root,this.lensOnly=lensOnly,this.parent=parent,this.canvases=new Map,this.lenses=new Map,this.params=new Map}update(groups){let want=new Map;for(let g of groups)this.root.querySelectorAll(g.sel).forEach(el=>{(el.offsetParent!==null||el.offsetWidth)&&want.set(el,g.p)});this.params=want,!this.lensOnly&&getRenderer()?this._gl(want):lensSupported&&this._lens(want)}_gl(want){this.layer?.isConnected||(this.layer=document.createElement("div"),this.layer.className="lq-layer",this.layer.setAttribute("aria-hidden","true"),this.parent.prepend(this.layer));for(let[el,cv]of this.canvases)(!want.has(el)||!el.isConnected)&&(cv.remove(),el.classList.remove("lg-on"),this.canvases.delete(el),this.ro?.unobserve(el));this.ro??=new ResizeObserver(()=>this.draw()),this.ro.observe(this.parent);for(let el of want.keys()){if(this.canvases.has(el))continue;let cv=document.createElement("canvas");cv.className="lq",this.layer.appendChild(cv),this.canvases.set(el,cv),this.ro.observe(el)}this.unregister??=registerJob(()=>this.draw()),this.draw(),clearTimeout(this.settle),this.settle=setTimeout(()=>this.draw(),600)}draw(){let r=getRenderer();if(!r||!this.layer)return;let base=this.parent.getBoundingClientRect(),k=this.parent.offsetWidth?base.width/this.parent.offsetWidth:1;for(let[el,cv]of this.canvases){if(!el.isConnected)continue;let b=el.getBoundingClientRect();if(!b.width||!b.height){cv.style.display="none";continue}cv.style.display="",Object.assign(cv.style,{left:`${(b.left-base.left)/k}px`,top:`${(b.top-base.top)/k}px`,width:`${b.width/k}px`,height:`${b.height/k}px`});let p={radius:parseFloat(getComputedStyle(el).borderTopLeftRadius)||24,...GLASS_DEFAULTS,...this.params.get(el)||{}};el.classList.toggle("lg-on",!!r.render(el,cv,p))}}_lens(want){for(let el of[...this.lenses.keys()])want.has(el)||(this.ro?.unobserve(el),el.style.removeProperty("backdrop-filter"),el.style.removeProperty("-webkit-backdrop-filter"),this.lenses.delete(el));this.ro??=new ResizeObserver(entries=>{let dirty=!1;for(let e of entries)dirty=this._measure(e.target)||dirty;dirty&&this._flush()});for(let el of want.keys())this.lenses.has(el)||(this.lenses.set(el,{id:`arr-liquid-${++uid}`,w:0,h:0,markup:""}),this.ro.observe(el))}_measure(el){let lens=this.lenses.get(el);if(!lens)return!1;let w=Math.round(el.offsetWidth),h=Math.round(el.offsetHeight);if(!w||!h||w===lens.w&&h===lens.h)return!1;lens.w=w,lens.h=h;let r=Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius)||24,w/2,h/2),bezel=Math.max(6,Math.min(30,Math.min(w,h)/3)),scale=Math.round(Math.min(56,bezel*1.9)),map=`<feImage href="${lensMap(w,h,r,bezel)}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="map"/>`,shift=(k,res)=>`<feDisplacementMap in="SourceGraphic" in2="map" scale="${(scale*k).toFixed(1)}" xChannelSelector="R" yChannelSelector="G" result="${res}"/>`,only=(inp,row,res)=>{let m=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0];return m[row*5+row]=1,`<feColorMatrix in="${inp}" type="matrix" values="${m.join(" ")}" result="${res}"/>`};lens.markup=`<filter id="${lens.id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">${map}${shift(1,"dr")}${shift(.92,"dg")}${shift(.84,"db")}${only("dr",0,"r")}${only("dg",1,"g")}${only("db",2,"b")}<feBlend in="r" in2="g" mode="screen" result="rg"/><feBlend in="rg" in2="b" mode="screen"/></filter>`;let f=`url(#${lens.id}) blur(6px) saturate(115%)`;return el.style.setProperty("backdrop-filter",f),el.style.setProperty("-webkit-backdrop-filter",f),!0}_flush(){this.svg?.isConnected||(this.svg=document.createElementNS("http://www.w3.org/2000/svg","svg"),this.svg.setAttribute("aria-hidden","true"),this.svg.style.cssText="position:absolute;width:0;height:0;overflow:hidden",this.root.appendChild(this.svg)),this.svg.innerHTML=[...this.lenses.values()].map(l=>l.markup).join("")}teardown(){this.unregister?.(),this.unregister=void 0,clearTimeout(this.settle);for(let[el,cv]of this.canvases)cv.remove(),el.classList.remove("lg-on");this.canvases.clear(),this.layer?.remove(),this.layer=void 0,this.ro?.disconnect(),this.ro=void 0,this.svg?.remove(),this.svg=void 0;for(let el of this.lenses.keys())el.style.removeProperty("backdrop-filter"),el.style.removeProperty("-webkit-backdrop-filter");this.lenses.clear()}},_LiquidMethods=class{_liquidSync(){let look=LOOKS[this._config?.styles?.preset],dark=this._lookNight,groups=look&&(webglAvailable||lensSupported)&&!this._config?.styles?.performanceMode?look(dark):null;this._lqLayers??=new Map;let body=this.shadowRoot?.querySelector(".card-body");this._liquidOn(this.shadowRoot,body,groups);let bar=this._searchExt,barRoot=bar?.shadowRoot,right=groups?.find(g=>g.sel.includes("col-right")),barGroups=right?[{sel:BAR_SEL,p:right.p}]:null;barRoot&&(bar.style.position="relative",this._liquidOn(barRoot,barRoot.querySelector(".ash-layer")||this._liquidHost(barRoot),barGroups));for(let[root,layer]of this._lqLayers)root!==this.shadowRoot&&root!==barRoot&&(layer.teardown(),this._lqLayers.delete(root))}_liquidHost(root){let host=document.createElement("div");return host.className="ash-layer",host.style.cssText="position:absolute;inset:0;pointer-events:none",root.prepend(host),host}_liquidOn(root,parent,groups){if(!root||!parent)return;let layer=this._lqLayers.get(root);if(!groups){layer?.teardown(),this._lqLayers.delete(root);return}(!layer||layer.parent!==parent)&&(layer?.teardown(),layer=new LiquidLayer(root,parent),this._lqLayers.set(root,layer)),layer.update(groups)}_liquidHeroSync(){if(!(this._config?.styles?.preset==="apple-home"&&lensSupported&&!this._config?.styles?.performanceMode)){this._lqHero?.teardown();return}this._lqHero??=new LiquidLayer(this.shadowRoot,null,{lensOnly:!0}),this._lqHero.update([{sel:HERO_SEL,p:{}}])}_liquidOff(){for(let layer of this._lqLayers?.values()||[])layer.teardown();this._lqLayers?.clear(),this._lqHero?.teardown()}},liquidMixin=_LiquidMethods.prototype;var liquid_default=[liquidMixin];export{liquid_default as default};
