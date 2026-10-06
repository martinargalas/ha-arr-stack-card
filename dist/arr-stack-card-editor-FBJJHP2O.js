var COLOR_ROLES=[["fg","text",null],["fg2","text-secondary","fg"],["fg3","text-muted","fg2"],["hd","heading","fg"],["hdl","heading-line","hd"],["icon","icon","hd"],["fill","fill",null],["line","line",null],["btn-fg","button-text","fg"],["btn-bg","button","fill"],["btn-ico","button-icon","@icon"],["pill-fg","pill-text","fg"],["dot","dot",null],["dot-on","dot-active","dot"],["ptx","poster-text",null],["shade","shade",null],["shadow","shadow",null]],SURFACE_TOKENS=[["bg","background"],["border","border"],["radius","radius"],["pad","padding"],["blur","blur"],["shine","shine"],["elev","panel-shadow"],["icon-bg","icon-background"],["icon-r","icon-radius"],["icon-pad","icon-padding"]],OPACITY_TOKENS=[["a-box","box-opacity"],["a-ctl","control-opacity"],["a-line","line-opacity"],["a-track","track-opacity"],["a-poster","poster-opacity"],["a-tag","tag-opacity"],["a-tint","tint-opacity"]],STATUS_TOKENS=["accent","success","warning","error","info"];function roleBlock(side){return COLOR_ROLES.map(([id,name,parent])=>{let pub=`--arr-${name}-rgb`,v;if(parent?.startsWith("@")){let p=parent.slice(1);v=side?`var(${pub}, var(--arr-${side}-${p}-rgb, var(--arr-${p}-rgb)))`:`var(${pub}, var(--arr-${p}-rgb))`}else v=parent?`var(${pub}, var(--_${parent}))`:`var(${pub})`;return side&&(v=`var(--arr-${side}-${name}-rgb, ${v})`),`--_${id}: ${v};`}).concat(side?[...SURFACE_TOKENS,...OPACITY_TOKENS].map(([id,name])=>`--_${id}: var(--arr-${side}-${name}, var(--arr-${name}));`):[]).join(`
        `)}var MODAL_TOKENS=[["text-rgb","color"],["text-secondary-rgb","color"],["text-muted-rgb","color"],["fill-rgb","color"],["line-rgb","color"],["background","value"],["overlay","value"],["header","value"],["menu","value"],["blur","value"],["shine","value"],["nav-background","value"],["nav-border","value"],["nav-text","value"],["nav-active","value"],["nav-active-text","value"],["sub-text","value"],["sub-active","value"],["sub-active-text","value"],["toolbar","value"],["toolbar-border","value"],["toolbar-text","value"],["toolbar-active","value"],["toolbar-active-text","value"],["filter","value"],["button","value"],["button-border","value"],["button-text","value"],["button-hover","value"],["button-active","value"],["button-active-text","value"],["switch-on","value"],["switch-off","value"],["switch-knob","value"],["progress-track","value"],["progress-fill","value"],["grab-rgb","color"],["grab-done-rgb","color"],["grab-failed-rgb","color"],["quality-4k-rgb","color"],["quality-1080-rgb","color"],["quality-720-rgb","color"],["torrent-rgb","color"],["usenet-rgb","color"],["score-positive-rgb","color"],["score-negative-rgb","color"],["rejected-rgb","color"],["seeds-rgb","color"],["leechers-rgb","color"],["search-done-rgb","color"],["search-downloading-rgb","color"]],NAV_ROLES=[["nav-bg","nav-background"],["nav-bdr","nav-border"],["nav-fg","nav-text"],["nav-on","nav-active"],["nav-on-fg","nav-active-text"],["sub-fg","sub-text"],["sub-on","sub-active"],["sub-on-fg","sub-active-text"],["tb-bg","toolbar"],["tb-bdr","toolbar-border"],["tb-fg","toolbar-text"],["tb-on","toolbar-active"],["tb-on-fg","toolbar-active-text"],["flt","filter"],["sw-on","switch-on"],["sw-off","switch-off"],["sw-knob","switch-knob"],["pg-track","progress-track"],["pg-fill","progress-fill"],["as-ok","search-done-rgb"],["as-dl","search-downloading-rgb"],["grab","grab-rgb"]],MODAL_ONLY=[["radius","value"]];function modalRoles(m){return[`--_fg: var(--arr-${m}text-rgb);`,`--_fg2: var(--arr-${m}text-secondary-rgb, var(--_fg));`,`--_fg3: var(--arr-${m}text-muted-rgb, var(--_fg2));`,"--_hd: var(--_fg);","--_hdl: var(--_hd);",`--_fill: var(--arr-${m}fill-rgb);`,`--_line: var(--arr-${m}line-rgb);`,"--_btn-fg: var(--_fg);","--_btn-bg: var(--_fill);","--_pill-fg: var(--_fg);","--_dot: var(--_fg);","--_dot-on: var(--_dot);","--_ptx: var(--arr-poster-text-rgb);","--_shade: var(--arr-shade-rgb);","--_shadow: var(--arr-shadow-rgb);",...NAV_ROLES.map(([id,name])=>`--_${id}: var(--arr-${m}${name});`)].join(`
        `)}var TOKEN_CSS=`
      .popup-overlay {
        ${modalRoles("modal-")}
      }
      .popup-overlay.popup-day {
        ${modalRoles("modal-day-")}
      }
      .card {
        ${roleBlock(null)}
      }
      .col-left {
        ${roleBlock("left")}
      }
      .col-right {
        ${roleBlock("right")}
      }
`,camel=s=>s.replace(/-(\w)/g,(_,c)=>c.toUpperCase()),SIDE_COLORS=COLOR_ROLES.map(([,name])=>[camel(name),`${name}-rgb`]),SIDE_SURFACE=SURFACE_TOKENS.map(([,name])=>[camel(name),name]),SIDE_OPACITY=OPACITY_TOKENS.map(([,name])=>[camel(name),name]),CARD_ONLY=[...STATUS_TOKENS.map(n=>[n,`${n}-rgb`,"color"]),["gap","gap","length"],["cardPadding","card-padding","length"]];function toRgbTriplet(v){if(v==null||v==="")return null;let s=String(v).trim();if(/^var\(--[\w-]+(,[^;{}<>]*)?\)$/.test(s))return s;let m=s.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);if(m){let h=m[1];return h.length<=4&&(h=h.split("").map(c=>c+c).join("")),[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)).join(", ")}return m=s.match(/^(?:rgba?\()?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+%?\s*)?\)?$/i),m&&[m[1],m[2],m[3]].every(n=>+n<=255)?`${+m[1]}, ${+m[2]}, ${+m[3]}`:null}var STYLE_KEYS={modal:[...MODAL_TOKENS,...MODAL_ONLY].map(([t])=>camel(t.replace(/-rgb$/,""))),colors:SIDE_COLORS.map(([k])=>k),surface:SIDE_SURFACE.map(([k])=>k),opacity:SIDE_OPACITY.map(([k])=>k),card:CARD_ONLY.map(([k])=>k)};var esc=s=>String(s??"").replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;"),TEXT=[["text","Text","color","#ffffff"],["textSecondary","Secondary text","color","#ffffff","Sizes, dates, metadata. Follows Text when unset."],["textMuted","Muted text","color","#ffffff","Labels and empty states. Follows Secondary text."],["heading","Headings","color","#ffffff","Column and section titles. Follows Text."],["headingLine","Heading line","color","#ffffff","The bar beside a column title. Follows Headings."]],CONTROLS=[["fill","Fills","color","#ffffff","Rows, chips and tracks, drawn faintly."],["line","Lines and borders","color","#ffffff"],["button","Buttons","color","#ffffff","Follows Fills."],["buttonText","Button text","color","#ffffff","Follows Text."],["buttonIcon","Button icons","color","#ffffff","Glyphs on buttons and paging arrows. Follows Icon colour if set, else the button text."],["pillText","Count pills","color","#ffffff","The totals beside a section title."],["dot","Paging dots","color","#ffffff"],["dotActive","Current paging dot","color","#ffffff","Follows Paging dots."]],SURFACE=[["background","Background","paint","#121216","Any CSS colour, rgba() for transparency, or a gradient."],["border","Border","text","","Full CSS border, e.g. 1px solid #333 \u2014 or none."],["radius","Corner radius","px","34"],["padding","Padding","text","","In px, or CSS like 8px 14px."],["blur","Blur","blur","35","0 turns the glass blur off."],["shine","Glass shine","shine","0.35"],["panelShadow","Shadow","text","","Full CSS box-shadow, or none."]],ICONS=[["icon","Icon colour","color","#ffffff","MDI icons, the app logos when drawn in one colour, and the glyphs on buttons. Follows Headings."],["iconBackground","Icon background","paint","#ffffff","A capsule behind each app icon \u2014 none by default."],["iconRadius","Icon corners","px","0","Large values make a circle."],["iconPadding","Icon padding","px","0","Room between the icon and its background."]],OPACITY=[["boxOpacity","Boxes","pct","200","VPN bar, disks, download lists, statistics tiles, paging capsules."],["controlOpacity","Controls","pct","200","Buttons, sorting, the search field, request controls."],["lineOpacity","Lines and borders","pct","200","Every border and divider, and the line beside a column title."],["trackOpacity","Progress tracks","pct","200"],["posterOpacity","Poster ground","pct","200","Behind a poster, before and around its image."],["tagOpacity","Labels on posters","pct","200"],["tintOpacity","App colour tint","pct","100","The glow in each app's colours behind a section (Category colour overlays, General)."]],POSTER=[["posterText","Text over posters","color","#ffffff","Titles on the dark shade over an image. Stays light by default."],["shade","Image shade","color","#000000","The darkening laid over posters and covers."],["shadow","Shadows","color","#000000"]],STATUS=[["accent","Accent","color","#0a84ff","Selected controls, links, progress."],["success","Success","color","#30d158"],["warning","Warning","color","#ff9500"],["error","Error","color","#ff453a"],["info","Info","color","#60a5fa"]],CARD=[["gap","Gap between panels","px","12"],["cardPadding","Card padding","text","","In px, or CSS like 0 12px 8px."]],MODAL_TEXT=day=>[["text","Text","color",day?"#000000":"#ffffff","Titles, values and table cells."],["textSecondary","Secondary text","color",day?"#000000":"#ffffff","Descriptions and table text. Follows Text."],["textMuted","Muted text","color",day?"#000000":"#ffffff","Labels and table headers. Follows Secondary text."],["fill","Fills","color",day?"#000000":"#ffffff","Row highlight, chips, cards inside a modal."],["line","Lines and borders","color","#ffffff","Dividers, table rules, the window border."]],MODAL_WINDOW=day=>[["background","Background","paint",day?"#ebeef5":"#0a0a16"],["overlay","Backdrop","paint",day?"#ffffff":"#000000","Behind the window."],["header","Header bar","paint",day?"#f0f2ff":"#0a0c16"],["menu","Drop-down menus","paint",day?"#f5f6ff":"#18182a","Filter and column pickers, action menus."],["blur","Blur","blur",day?"40":"35"],["shine","Glass shine","shine",day?"0.65":"0.35"],...day?[]:[["radius","Corner radius","px","28"]]],MENU=day=>[["navBackground","Background","paint",day?"#f2f2f7":"#18181f"],["navBorder","Border line","paint",day?"#e0e0e6":"#3a3a44"],["navText","Item","paint",day?"#1c1c1e":"#ffffff"],["navActive","Active item","paint","#0a84ff","The fill that slides to the chosen tab or option."],["navActiveText","Active item text","paint","#ffffff"],["subText","Sub-item","paint",day?"#1c1c1e":"#ffffff","The items under a tab, e.g. in Tracearr. Drawn at 65 % until hovered."],["subActive","Active sub-item","paint",day?"#e5e5ea":"#3a3a44"],["subActiveText","Active sub-item text","paint",day?"#1c1c1e":"#ffffff"]],TOOLBAR=day=>[["toolbar","Background","paint",day?"#f2f2f7":"#1c1c26"],["toolbarBorder","Border and separators","paint",day?"#e0e0e6":"#3a3a44"],["toolbarText","Text and icons","paint",day?"#1c1c1e":"#ffffff","Search field, pickers and buttons in the bar."],["toolbarActive","Toggle on","paint","#0a84ff"],["toolbarActiveText","Toggle on text","paint","#ffffff"],["filter","Active filter","paint",day?"#0060df":"#4da3ff","The value of a filter that narrows the list."]],BUTTONS=day=>[["button","Background","paint",day?"#f2f2f7":"#2a2a34"],["buttonBorder","Border","paint",day?"#e0e0e6":"#44444e"],["buttonText","Text","paint",day?"#1c1c1e":"#ffffff"],["buttonHover","Hover","paint",day?"#e5e5ea":"#3a3a44"],["buttonActive","Active","paint","#0a84ff"],["buttonActiveText","Active text","paint",day?"#0050c8":"#64b4ff"]],SWITCHES=[["switchOn","On","paint","#0a84ff","Switches and ticked checkboxes."],["switchOff","Off","paint","#3a3a44"],["switchKnob","Knob and tick","paint","#ffffff"]],PROGRESS=day=>[["progressTrack","Track","paint",day?"#e0e0e6":"#3a3a44"],["progressFill","Fill","paint","#0a84ff","Playback position, season progress."]],INTERACTIVE=[["grab","Grab button","color","#0a84ff"],["grabDone","Grabbed","color","#30d158"],["grabFailed","Grab failed","color","#ff9500"],["quality4k","4K","color","#bf5af2","Quality chips; fill, rim and label come from one colour."],["quality1080","1080p","color","#0a84ff"],["quality720","720p","color","#5ac8fa"],["torrent","Torrent","color","#30d158"],["usenet","Usenet","color","#0a84ff"],["scorePositive","Positive score","color","#30d158"],["scoreNegative","Negative score","color","#ff453a"],["rejected","Rejected","color","#ff9500"],["seeds","Seeds","color","#30d158"],["leechers","Leechers","color","#ff453a"]],AUTOMATIC=[["searchDone","Found","color","#4ade80","The badge on the search button once a release is found."],["searchDownloading","Downloading","color","#3b82f6","The badge and the progress while it downloads."]],modalGroups=(ed,id,path,day)=>group(ed,`${id}.all`,"All modals",sharedModalGroups(ed,`${id}.all`,path,day),!0)+group(ed,`${id}.search`,"Release search",`<div class="st-hint">Interactive Search and the automatic search, wherever they appear: a film's or series' detail, an album, Activity's season search.</div>`+group(ed,`${id}.search.is`,"Interactive Search",fields(ed,path,INTERACTIVE),!0)+group(ed,`${id}.search.as`,"Automatic search",fields(ed,path,AUTOMATIC),!0),!0),sharedModalGroups=(ed,id,path,day)=>group(ed,`${id}.window`,"Window",fields(ed,path,MODAL_WINDOW(day)),!0)+group(ed,`${id}.text`,"Text, tables and lines",fields(ed,path,MODAL_TEXT(day)),!0)+group(ed,`${id}.menu`,"Top menu",fields(ed,path,MENU(day)),!0)+group(ed,`${id}.tb`,"Toolbar and filters",fields(ed,path,TOOLBAR(day)),!0)+group(ed,`${id}.btn`,"Buttons",fields(ed,path,BUTTONS(day)),!0)+group(ed,`${id}.sw`,"Switches and checkboxes",fields(ed,path,SWITCHES),!0)+group(ed,`${id}.pg`,"Progress bars",fields(ed,path,PROGRESS(day)),!0),read=(ed,path,key)=>{let o=ed._config?.styles||{};for(let p of path)o=o?.[p]||{};return o?.[key]};function setStyle(styles,path,key,value){let out={...styles||{}},parent=out;for(let p of path)parent[p]={...parent[p]||{}},parent=parent[p];value===void 0||value===""?delete parent[key]:parent[key]=value;for(let i=path.length;i>0;i--){let o=out;for(let p of path.slice(0,i-1))o=o[p];Object.keys(o[path[i-1]]).length===0&&delete o[path[i-1]]}return out}function swatchHex(v,fallback){let t=toRgbTriplet(v);return!t||t.startsWith("var(")?fallback:"#"+t.split(",").map(n=>(+n).toString(16).padStart(2,"0")).join("")}function alphaOf(v){let s=String(v??"").trim();if(!s)return 100;let m=s.match(/^rgba?\([^,]+,[^,]+,[^,]+(?:,\s*([\d.]+)(%?))?\s*\)$/i);return m?m[1]==null?100:Math.round(m[2]?+m[1]:+m[1]*100):(m=s.match(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i),m?100:(m=s.match(/^#[0-9a-f]{6}([0-9a-f]{2})$/i),m?Math.round(parseInt(m[1],16)/2.55):null))}function compose(hex,a){if(a>=100)return hex;let[r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));return`rgba(${r}, ${g}, ${b}, ${Math.round(a)/100})`}function field(ed,path,[key,label,kind,def,hint]){let v=read(ed,path,key),set=v!=null&&v!=="",attrs=`data-st-path="${esc(path.join("."))}" data-st-key="${key}" data-st-kind="${kind}"`,clear=`<button class="st-clear" ${attrs} data-st-clear title="Reset to default"${set?"":" hidden"}>\xD7</button>`,ctl,suffix="";if(kind==="color"||kind==="paint"){let sw=kind==="paint"&&set&&!/^#|^rgb/i.test(String(v))?def:swatchHex(v,def||"#ffffff");ctl=`<input type="color" class="st-swatch" ${attrs} value="${sw}"${set?"":" data-unset"}><input type="text" class="st-text" ${attrs} value="${esc(set?v:"")}" placeholder="${kind==="color"?"hex or r, g, b":"CSS colour"}" spellcheck="false">`}else if(kind==="pct"){let n=set?Math.round(+v):100;ctl=`<input type="range" class="st-range st-pct" ${attrs} min="0" max="${def}" step="5" value="${n}">`,suffix=`<span class="st-val">${n}%</span>`}else if(kind==="shine"){let n=set?+v:+def;ctl=`<input type="range" class="st-range" ${attrs} min="0" max="1" step="0.05" value="${n}">`,suffix=`<span class="st-val">${n.toFixed(2)}</span>`}else kind==="px"||kind==="blur"?(ctl=`<input type="number" class="st-num" ${attrs} min="0" step="1" value="${set?esc(v):""}" placeholder="${esc(def)}">`,suffix="px"):ctl=`<input type="text" class="st-text" ${attrs} value="${esc(set?v:"")}" placeholder="default" spellcheck="false">`;let row=`<div class="st-row"><span class="st-label">${label}</span><span class="st-ctl"><span class="st-field">${ctl}</span><span class="st-suffix">${suffix}</span>${clear}</span></div>`,help=hint?`<div class="st-hint">${hint}</div>`:"";if(kind!=="paint")return row+help;let a=set?alphaOf(v):100;return`<div class="st-paint">${row}<div class="st-row st-sub"><span class="st-label">Opacity</span><span class="st-ctl"><span class="st-field"><input type="range" class="st-range st-alpha" min="0" max="100" step="1" value="${a??100}"${a==null?' disabled title="Not for a gradient or a theme variable"':""}></span><span class="st-suffix"><span class="st-val">${a??100}%</span></span><span class="st-clear" hidden></span></span></div></div>${help}`}function group(ed,id,title,body,nested){let open=ed._stOpen?.has(id)?" open":"",count=(body.match(/data-st-clear title="Reset to default">/g)||[]).length,badge=count?`<span class="st-badge">${count}</span>`:"";return`<details class="st-group${nested?" st-nested":""}" data-st-group="${id}"${open}><summary>${title}${badge}</summary><div class="st-body">${body}</div></details>`}var fields=(ed,path,list)=>list.map(f=>field(ed,path,f)).join("");function scoped(ed,id,list){return group(ed,`${id}.card`,"Whole card",fields(ed,[],list),!0)+group(ed,`${id}.left`,"Left panel",fields(ed,["left"],list),!0)+group(ed,`${id}.right`,"Right panel",fields(ed,["right"],list),!0)}function iconStyleRow(ed){let mdi=read(ed,[],"applicationIcons")==="mdi",mono=read(ed,[],"iconStyle")==="mono",v=mdi?"mdi":mono?"mono":"brand",opt=(val,label)=>`<option value="${val}"${v===val?" selected":""}>${label}</option>`;return`<div class="st-row"><span class="st-label">App icons</span><span class="st-ctl"><span class="st-field">
      <select class="st-select" data-st-iconstyle>
        ${opt("brand","Real logos, own colours")}${opt("mono","Real logos, icon colour")}${opt("mdi","MDI icons, icon colour")}
      </select></span><span class="st-suffix"></span><span class="st-clear" hidden></span></span></div>
    <div class="st-hint">The icons beside the section titles. Real logos are the apps' own; MDI icons are plain glyphs.</div>`}function stylesTabHtml(ed,general=""){ed._stOpen=ed._stOpen||new Set(["general"]);let preset=read(ed,[],"preset")||"glass",opt=(v,l)=>`<option value="${v}"${preset===v?" selected":""}>${l}</option>`;return`
    <div class="section">
      <div class="row">
        <span class="row-label">Preset</span>
        <select data-st-preset>
          ${opt("glass","Glass (default)")}${opt("ha","Home Assistant theme")}${opt("solid","Solid")}${opt("nord","Nord")}${opt("catppuccin","Catppuccin")}${opt("cinema","Cinema")}
        </select>
      </div>
      <div class="hint">${{glass:"The card as it has always looked: frosted glass over your dashboard.",ha:"Background, border, corners, text and accent from your Home Assistant theme \u2014 modals included.",solid:"Opaque and flat: no blur and no glass shine.",nord:"Arctic frost: slate glass, frost-blue headings and icons, aurora status colours.",catppuccin:"Soothing pastels: a mauve glow on a deep base, pink headings, rounder corners.",cinema:"The dark of a theatre: a velvet-red glow from below, gold accents, sharper corners."}[preset]||""} Anything you set below wins over the preset.</div>
      ${general?group(ed,"general","General",general):""}
      ${group(ed,"panels","Panels",scoped(ed,"panels",SURFACE))}
      ${group(ed,"text","Text",scoped(ed,"text",TEXT))}
      ${group(ed,"controls","Controls",scoped(ed,"controls",CONTROLS))}
      ${group(ed,"icons","Icons",iconStyleRow(ed)+scoped(ed,"icons",ICONS))}
      ${group(ed,"posters","Posters and shadows",scoped(ed,"posters",POSTER))}
      ${group(ed,"opacity","Transparency",'<div class="st-hint">100 % is the card as designed. Each element keeps its own transparency and these scale it, so a row stays fainter than its box.</div>'+scoped(ed,"opacity",OPACITY))}
      ${group(ed,"status","Status colours",fields(ed,[],STATUS))}
      ${group(ed,"layout","Spacing",fields(ed,[],CARD))}
      ${group(ed,"modals","Modals",group(ed,"modals.night","Night",modalGroups(ed,"modals.night",["modal"],!1),!0)+group(ed,"modals.day","Day",modalGroups(ed,"modals.day",["modalDay"],!0),!0)+'<div class="st-hint">Day colours apply while the sun is up, when Day / night modal colours is on in General.</div>')}
      <div class="st-hint st-foot">Colours take a hex value (#e6e6e6), rgb() or "r, g, b". The same settings can come from a Home Assistant theme or card-mod \u2014 see the README.</div>
    </div>`}var STYLES_TAB_CSS=`
  :host { --st-ctl-w: min(260px, 58%); }
  .st-group { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 10px; margin-bottom: 8px; background: var(--card-background-color, #fff); }
  .st-group > summary { cursor: pointer; padding: 10px 12px; font-weight: 600; font-size: 13px; list-style: none; display: flex; align-items: center; gap: 8px; }
  .st-group > summary::-webkit-details-marker { display: none; }
  .st-group > summary::before { content: '\u203A'; display: inline-block; width: 10px; transition: transform .15s; color: var(--secondary-text-color, #757575); }
  .st-group[open] > summary::before { transform: rotate(90deg); }
  .st-body { padding: 2px 12px 10px; }
  .st-nested { background: var(--secondary-background-color, #f5f5f5); }
  .st-nested > summary { font-weight: 500; padding: 8px 10px; }
  .st-badge { margin-left: auto; font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 6px; border-radius: 9px; display: inline-flex; align-items: center; justify-content: center; background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff); }
  .st-row { display: flex; align-items: center; gap: 8px; margin: 8px 0 2px; }
  .st-label { flex: 1; font-size: 13px; min-width: 0; }
  .st-ctl { display: flex; align-items: center; gap: 6px; flex: 0 0 var(--st-ctl-w); width: var(--st-ctl-w); }
  .st-field { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; }
  .st-suffix { flex: 0 0 28px; font-size: 11px; color: var(--secondary-text-color, #757575); }
  .st-swatch { flex: 0 0 34px; width: 34px; height: 30px; padding: 2px; border-radius: 6px; cursor: pointer; border: 1px solid var(--divider-color, #e0e0e0); background: var(--card-background-color, #fff); box-sizing: border-box; }
  .st-swatch[data-unset] { opacity: .45; }
  .st-text, .st-num, .st-select {
    flex: 1; min-width: 0; width: 100%; height: 30px; box-sizing: border-box; padding: 0 8px; border-radius: 6px;
    font: inherit; font-size: 12px; border: 1px solid var(--divider-color, #e0e0e0);
    background: var(--card-background-color, #fff); color: var(--primary-text-color, #212121);
  }
  .st-num { text-align: right; }
  .st-text.st-bad { border-color: var(--error-color, #db4437); }
  .st-range { flex: 1; min-width: 0; margin: 0; accent-color: var(--primary-color, #03a9f4); }
  .st-clear { flex: 0 0 22px; width: 22px; height: 22px; padding: 0; border-radius: 50%; border: none; cursor: pointer; font-size: 14px; line-height: 1; background: var(--secondary-background-color, #eee); color: var(--secondary-text-color, #757575); }
  .st-clear[hidden] { visibility: hidden; display: inline-block; }
  .st-sub .st-label { padding-left: 14px; font-size: 12px; color: var(--secondary-text-color, #757575); }
  .st-sub { margin-top: 2px; }
  .st-alpha:disabled { opacity: .4; }
  .st-hint { font-size: 11px; color: var(--secondary-text-color, #757575); margin: 0 0 4px; }
  .st-foot { margin-top: 10px; }
`;function parse(kind,raw){let s=String(raw??"").trim();if(s==="")return{value:void 0};if(kind==="color")return toRgbTriplet(s)?{value:s}:{bad:!0};if(kind==="px"||kind==="blur"){let n=parseFloat(s);return isNaN(n)||n<0?{bad:!0}:{value:n}}return kind==="shine"?{value:Math.max(0,Math.min(1,parseFloat(s)||0))}:/[;{}<>]/.test(s)?{bad:!0}:{value:s}}function wireStylesTab(ed,root){let save=(el,value)=>{let path=el.dataset.stPath?el.dataset.stPath.split("."):[];ed._update({styles:setStyle(ed._config.styles,path,el.dataset.stKey,value)}),el.closest(".st-row")?.querySelector("[data-st-clear]")?.toggleAttribute("hidden",value===void 0)};root.querySelector("[data-st-preset]")?.addEventListener("change",e=>{let v=e.target.value;ed._update({styles:setStyle(ed._config.styles,[],"preset",v==="glass"?void 0:v)}),ed._render()}),root.querySelector("[data-st-iconstyle]")?.addEventListener("change",e=>{let v=e.target.value,st=setStyle(ed._config.styles,[],"applicationIcons",v==="mdi"?"mdi":void 0);st=setStyle(st,[],"iconStyle",v==="mono"?"mono":void 0),ed._update({styles:st})}),root.querySelectorAll("details[data-st-group]").forEach(d=>d.addEventListener("toggle",()=>{ed._stOpen=ed._stOpen||new Set,d.open?ed._stOpen.add(d.dataset.stGroup):ed._stOpen.delete(d.dataset.stGroup)}));let paintValue=sw=>{let alpha=sw.closest(".st-paint")?.querySelector(".st-alpha");return alpha&&!alpha.disabled?compose(sw.value,+alpha.value):sw.value};root.querySelectorAll(".st-swatch").forEach(el=>el.addEventListener("input",()=>{el.removeAttribute("data-unset");let value=paintValue(el),text=el.closest(".st-row").querySelector(".st-text");text&&(text.value=value,text.classList.remove("st-bad")),save(el,value)})),root.querySelectorAll(".st-alpha").forEach(el=>{el.addEventListener("pointerdown",e=>e.stopPropagation()),el.addEventListener("input",()=>{let paint=el.closest(".st-paint");el.closest(".st-ctl").querySelector(".st-val").textContent=`${el.value}%`;let sw=paint.querySelector(".st-swatch");sw.removeAttribute("data-unset");let value=paintValue(sw),text=paint.querySelector(".st-text");text&&(text.value=value,text.classList.remove("st-bad")),save(sw,value)})}),root.querySelectorAll(".st-text, .st-num").forEach(el=>el.addEventListener("change",()=>{let r=parse(el.dataset.stKind,el.value);if(el.classList.toggle("st-bad",!!r.bad),r.bad)return;let sw=el.closest(".st-row").querySelector(".st-swatch");if(sw&&r.value!==void 0){let hex=swatchHex(r.value,null);hex&&(sw.value=hex,sw.removeAttribute("data-unset"))}let alpha=el.closest(".st-paint")?.querySelector(".st-alpha");if(alpha){let a=alphaOf(r.value);alpha.disabled=a==null,alpha.value=a??100,alpha.closest(".st-ctl").querySelector(".st-val").textContent=`${a??100}%`}save(el,r.value)})),root.querySelectorAll(".st-pct").forEach(el=>{el.addEventListener("pointerdown",e=>e.stopPropagation()),el.addEventListener("input",()=>{el.closest(".st-ctl").querySelector(".st-val").textContent=`${el.value}%`,save(el,+el.value)})}),root.querySelectorAll(".st-range:not(.st-pct):not(.st-alpha)").forEach(el=>{el.addEventListener("pointerdown",e=>e.stopPropagation()),el.addEventListener("input",()=>{el.closest(".st-ctl").querySelector(".st-val").textContent=(+el.value).toFixed(2),save(el,+el.value)})}),root.querySelectorAll("[data-st-clear]").forEach(el=>el.addEventListener("click",()=>{save(el,void 0),ed._render()}))}var ArrStackCardEditor=class extends HTMLElement{constructor(){super(),this.attachShadow({mode:"open"}),this._config={},this._caps=null,this._activeTab="general"}set hass(hass){let wasAdmin=this._hass?.user?.is_admin;this._hass=hass,this._caps||this._loadCaps(),wasAdmin!==hass?.user?.is_admin&&this._render()}async _loadCaps(){try{if(this._caps=await this._hass.callApi("GET","arr_stack/capabilities/info"),!(this._caps.qbit||this._caps.sabnzbd||this._caps.nzbget||this._caps.deluge||this._caps.rtorrent||this._caps.transmission)&&this._config.layout!=="right"&&(this._config={...this._config,layout:"right"},this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))),this._caps.overseerr)try{let accts=await this._hass.callApi("GET","arr_stack/overseerr/seerr_accounts");this._seerrAccounts=accts||[]}catch{this._seerrAccounts=[]}this._render()}catch{this._caps={}}}setConfig(config){if(config=config||{},Array.isArray(config.categories)){let CAT_MAP={radarr:"recentlyAdded",sonarr:"recentlyRequested"},seen=new Set;config={...config,categories:config.categories.map(c=>CAT_MAP[c.id]?{...c,id:CAT_MAP[c.id]}:c).filter(c=>seen.has(c.id)?!1:seen.add(c.id))}}if(this._sent&&JSON.stringify(config)===this._sent){this._config=config;return}this._config=config,this._render()}connectedCallback(){this._render()}_cfg(group2,key,fallback){let v=this._config?.[group2]?.[key];if(v!==void 0)return v;let flat=this._config?.[key];return flat!==void 0?flat:fallback}_val(key,fallback){let v=this._config?.[key];return v!==void 0?v:fallback}_styleVal(key,fallback){let v=this._config?.styles?.[key];return v!==void 0?v:fallback}_toHex(val,fallback){if(!val)return fallback;if(/^#/.test(val))return val;let m=val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);return m?"#"+[m[1],m[2],m[3]].map(n=>parseInt(n).toString(16).padStart(2,"0")).join(""):fallback}_render(){let perfMode=!!this._styleVal("performanceMode",!1);this._activeTab==="styles"&&(this._activeTab="appearance");let tab=this._activeTab;this.shadowRoot.innerHTML=`
      <style>
        :host {
          display: block;
          font-family: var(--paper-font-body1_-_font-family, -apple-system, sans-serif);
          font-size: 14px;
          color: var(--primary-text-color, #212121);
        }
        .bmc {
          display: flex; align-items: center; gap: 10px;
          background: var(--secondary-background-color, #f5f5f5);
          border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
          text-decoration: none; color: inherit;
          border: 1px solid var(--divider-color, #e0e0e0);
        }
        .bmc:hover { background: var(--primary-background-color, #fff); }
        .bmc img { width: 22px; height: 22px; }
        .bmc-text { flex: 1; }
        .bmc-title { font-weight: 600; font-size: 13px; }
        .bmc-sub { font-size: 11px; color: var(--secondary-text-color, #757575); }
        /* The tabs are wider than the dialog on most screens. They scroll on
           their own, so dragging them no longer shifts the whole editor. */
        :host { overflow-x: hidden; }
        .tabs {
          display: flex; gap: 0; margin-bottom: 16px;
          border-bottom: 2px solid var(--divider-color, #e0e0e0);
          overflow-x: auto; overflow-y: hidden; overscroll-behavior-x: contain;
          scrollbar-width: none; -webkit-overflow-scrolling: touch;
        }
        .tabs::-webkit-scrollbar { display: none; }
        .tab { flex-shrink: 0; }
        .tab {
          padding: 8px 14px; font-size: 12px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.04em;
          cursor: pointer; border: none; background: none;
          color: var(--secondary-text-color, #757575);
          border-bottom: 2px solid transparent;
          margin-bottom: -2px; transition: color .15s, border-color .15s;
          white-space: nowrap;
        }
        .tab:hover { color: var(--primary-text-color, #212121); }
        .tab.active {
          color: var(--primary-color, #03a9f4);
          border-bottom-color: var(--primary-color, #03a9f4);
        }
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .section { margin-bottom: 20px; }
        .sub-group { padding-left: 14px; }
        .section-title {
          font-size: 11px; font-weight: 700; text-transform: uppercase;
          letter-spacing: 0.08em; color: var(--secondary-text-color, #757575);
          margin-bottom: 10px; padding-bottom: 4px;
          border-bottom: 1px solid var(--divider-color, #e0e0e0);
        }
        .row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 10px;
        }
        .row-label { flex: 1; font-size: 13px; }
        /* Same width as the fields in the Styles tab: its control column less
           the suffix and reset slots. They end at the edge, with the toggles. */
        .row select, .row input[type="number"] {
          width: calc(var(--st-ctl-w) - 62px); flex-shrink: 0;
          height: 30px; box-sizing: border-box; padding: 0 8px; border-radius: 6px; font: inherit; font-size: 12px;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          color: var(--primary-text-color, #212121);
        }
        .row input[type="color"] {
          width: 44px; height: 32px; padding: 2px; border-radius: 6px; cursor: pointer;
          border: 1px solid var(--divider-color, #e0e0e0);
          background: var(--card-background-color, #fff);
          flex-shrink: 0;
        }
        .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-slider {
          position: absolute; inset: 0; background: var(--divider-color, #ccc);
          border-radius: 20px; cursor: pointer; transition: background .2s;
        }
        .toggle-slider::before {
          content: ''; position: absolute; width: 14px; height: 14px;
          left: 3px; top: 3px; background: #fff; border-radius: 50%;
          transition: transform .2s;
        }
        .toggle input:checked + .toggle-slider { background: var(--primary-color, #03a9f4); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(16px); }
        .hint { font-size: 11px; color: var(--secondary-text-color, #757575); margin-top: -6px; margin-bottom: 8px; }
        .color-alpha { font-size: 10px; color: var(--secondary-text-color, #9e9e9e); flex-shrink: 0; white-space: nowrap; }
        .cat-list { display: flex; flex-direction: column; gap: 6px; }
        .cat-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 10px; border-radius: 8px;
          background: var(--secondary-background-color, #f5f5f5);
          border: 1px solid var(--divider-color, #e0e0e0);
          transition: opacity .15s, border-color .15s, background .15s;
        }
        .cat-item.drag-over { border-color: var(--primary-color, #03a9f4); background: var(--primary-background-color, #fff); }
        .cat-item.dragging { opacity: 0.4; }
        .cat-label { flex: 1; font-size: 13px; }
        .cat-disabled .cat-label { opacity: 0.45; }
        ${STYLES_TAB_CSS}
      </style>

      <a class="bmc" href="https://buymeacoffee.com/argii" target="_blank" rel="noopener">
        <img src="https://cdn.buymeacoffee.com/buttons/bmc-new-btn-logo.svg" alt="coffee"/>
        <div class="bmc-text">
          <div class="bmc-title">Buy me a coffee \u2615</div>
          <div class="bmc-sub">If you find this card useful, support the developer</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="opacity:.4;flex-shrink:0"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </a>

      <div class="tabs">
        <button class="tab${tab==="general"?" active":""}" data-tab="general">General</button>
        <button class="tab${tab==="left"?" active":""}" data-tab="left">Left Panel</button>
        <button class="tab${tab==="right"?" active":""}" data-tab="right">Right Panel</button>
        ${this._seerrAccounts?.length>1?`<button class="tab${tab==="users"?" active":""}" data-tab="users">Users</button>`:""}
        <button class="tab${tab==="appearance"?" active":""}" data-tab="appearance">Appearance</button>
      </div>

      <!-- \u2550\u2550\u2550 TAB: General \u2550\u2550\u2550 -->
      <div class="tab-content${tab==="general"?" active":""}" data-tab-content="general">
        <div class="section">
          <div class="row">
            <span class="row-label">Language</span>
            <select data-key="localisation">
              <option value="cs" ${this._val("localisation","en")==="cs"?"selected":""}>Czech</option>
              <option value="en" ${this._val("localisation","en")==="en"?"selected":""}>English</option>
              <option value="fr" ${this._val("localisation","en")==="fr"?"selected":""}>French</option>
            </select>
          </div>
          ${this._caps?.qbit||this._caps?.sabnzbd||this._caps?.nzbget||this._caps?.deluge||this._caps?.rtorrent||this._caps?.transmission||this._caps===null?`
          <div class="row">
            <span class="row-label">Layout</span>
            <select data-key="layout">
              <option value="both"  ${this._val("layout","both")==="both"?"selected":""}>Both panels</option>
              <option value="left"  ${this._val("layout","both")==="left"?"selected":""}>Downloads only</option>
              <option value="right" ${this._val("layout","both")==="right"?"selected":""}>Media only</option>
            </select>
          </div>`:""}
          ${this._caps?.qbit||this._caps?.sabnzbd||this._caps===null?`
          <div class="row">
            <span class="row-label">Swap sides</span>
            <label class="toggle">
              <input type="checkbox" data-key="swap_sides" ${this._val("swap_sides",!1)?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          ${this._val("swap_sides",!1)?'<div class="hint">Media panel is taller \u2014 set Sticky nav offset to ~2000 for the nav to appear immediately on mobile.</div>':""}`:""}
          <div class="row">
            <span class="row-label">Sticky nav offset (px)</span>
            <input type="number" data-key="sticky_nav_offset" value="${this._val("sticky_nav_offset",100)}" min="0" max="500" step="10"/>
          </div>
        </div>
      </div>

      <!-- \u2550\u2550\u2550 TAB: Left Panel \u2550\u2550\u2550 -->
      <div class="tab-content${tab==="left"?" active":""}" data-tab-content="left">

        <!-- Downloads -->
        <div class="section">
          <div class="section-title">Downloads</div>
          <div class="row">
            <span class="row-label">Torrent items per page</span>
            <input type="number" data-group="downloads" data-key="torrentItems" value="${this._cfg("downloads","torrentItems",3)}" min="1" max="20"/>
          </div>
          <div class="row">
            <span class="row-label">Usenet items per page</span>
            <input type="number" data-group="downloads" data-key="usenetItems" value="${this._cfg("downloads","usenetItems",3)}" min="1" max="20"/>
          </div>
          <div class="row">
            <span class="row-label">Allow download controls</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="allowControls" ${this._cfg("downloads","allowControls",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">When disabled, play/pause and delete buttons are hidden. Category filters remain accessible.</div>
          <div class="section-subtitle" style="font-size:11px;font-weight:600;color:var(--secondary-text-color,#9e9e9e);text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 6px">Cards</div>
          <div class="sub-group">
          <div class="row">
            <span class="row-label">Show storage card</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="showStorage" ${this._cfg("downloads","showStorage",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show total speed card</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="showTotalSpeed" ${this._cfg("downloads","showTotalSpeed",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show VPN card</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="showVpnCard" ${this._cfg("downloads","showVpnCard",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div></div>
<div class="section-subtitle" style="font-size:11px;font-weight:600;color:var(--secondary-text-color,#9e9e9e);text-transform:uppercase;letter-spacing:0.06em;margin:20px 0 6px">Download row</div>
          <div class="sub-group">
          <div class="row">
            <span class="row-label">Upload speed</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowUpload" ${this._cfg("downloads","rowUpload",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Time left</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowEta" ${this._cfg("downloads","rowEta",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Size</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowSize" ${this._cfg("downloads","rowSize",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Peers</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowPeers" ${this._cfg("downloads","rowPeers",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Percentage</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowPercent" ${this._cfg("downloads","rowPercent",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Progress bar</span>
            <label class="toggle"><input type="checkbox" data-group="downloads" data-key="rowProgress" ${this._cfg("downloads","rowProgress",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div></div>
          <div class="hint">What each download row shows. The first pill always stays \u2014 it carries the state, so Stalled, Paused, Complete and errors remain visible. Upload speed and Peers apply to torrent clients only.</div>
        </div>

        <!-- Download Clients -->
        ${(()=>{let caps=this._caps,allClients=this._getClients().filter(c=>caps===null?!0:!(c.id==="qbit"&&!caps?.qbit||c.id==="deluge"&&!caps?.deluge||c.id==="rtorrent"&&!caps?.rtorrent||c.id==="transmission"&&!caps?.transmission||c.id==="sab"&&!caps?.sabnzbd||c.id==="nzbget"&&!caps?.nzbget)),torrentIds=["qbit","deluge","rtorrent","transmission"],usenetIds=["sab","nzbget"],torrentClients=allClients.filter(c=>torrentIds.includes(c.id)),usenetClients=allClients.filter(c=>usenetIds.includes(c.id));if(allClients.length===0)return"";let renderGroup=(title,clients)=>clients.length===0?"":`
          <div class="section-subtitle" style="font-size:11px;font-weight:600;color:var(--secondary-text-color,#9e9e9e);text-transform:uppercase;letter-spacing:0.06em;margin:8px 0 4px">${title}</div>
          <div class="cat-list">
            ${clients.map(c=>`
              <div class="cat-item${c.enabled===!1?" cat-disabled":""}" draggable="true" data-client-id="${c.id}">
                <ha-icon icon="mdi:drag-vertical" style="--mdc-icon-size:18px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0;cursor:grab"></ha-icon>
                <span class="cat-label">${this._clientLabel(c.id)}</span>
                <label class="toggle">
                  <input type="checkbox" data-client-toggle="${c.id}" ${c.enabled!==!1?"checked":""}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            `).join("")}
          </div>`;return`
        <div class="section">
          <div class="section-title">Download Clients</div>
          <div class="hint" style="margin-bottom:8px">Drag to reorder \xB7 toggle to show/hide. Only configured clients are shown.</div>
          ${renderGroup("Torrent",torrentClients)}
          ${renderGroup("Usenet",usenetClients)}
        </div>`})()}

        <!-- Storage -->
        <div class="section">
          <div class="section-title">Storage</div>
          <div class="row">
            <span class="row-label">Disk space source</span>
            <select data-style-key="storageSource">
              <option value="auto"    ${this._styleVal("storageSource","auto")==="auto"?"selected":""}>Auto</option>
              <option value="radarr"  ${this._styleVal("storageSource","auto")==="radarr"?"selected":""}>Radarr</option>
              ${this._caps?.radarr2?'<option value="radarr2" '+(this._styleVal("storageSource","auto")==="radarr2"?"selected":"")+">Radarr 2</option>":""}
              <option value="sonarr"  ${this._styleVal("storageSource","auto")==="sonarr"?"selected":""}>Sonarr</option>
              ${this._caps?.sonarr2?'<option value="sonarr2" '+(this._styleVal("storageSource","auto")==="sonarr2"?"selected":"")+">Sonarr 2</option>":""}
            </select>
          </div>
          <div class="hint">Which service to use for the disk space widget. Use Radarr or Sonarr if SABnzbd reports a different volume (e.g. cache drive instead of array).</div>
        </div>
      </div>

      <!-- \u2550\u2550\u2550 TAB: Right Panel \u2550\u2550\u2550 -->
      <div class="tab-content${tab==="right"?" active":""}" data-tab-content="right">

        <div class="section">
          <div class="row">
            <span class="row-label">Categories per page</span>
            <input type="number" data-group="discover" data-key="categoriesCount" value="${this._cfg("discover","categoriesCount",3)}" min="1" max="10"/>
          </div>
          <div class="row">
            <span class="row-label">Items per category</span>
            <input type="number" data-group="discover" data-key="itemsPerCategory" value="${this._cfg("discover","itemsPerCategory",4)}" min="2" max="10"/>
          </div>
          <div class="row">
            <span class="row-label">Search bar</span>
            <label class="toggle"><input type="checkbox" data-group="discover" data-key="showSearch" ${this._cfg("discover","showSearch",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Off gives its slot to one more category \u2014 for a static or e-ink dashboard.</div>
          <div class="hint">Number of poster columns per category row, search results and More overlay. Default: 4.</div>
          <div class="row">
            <span class="row-label">Show More card on page</span>
            <input type="number" data-group="discover" data-key="showMoreOnPage" value="${this._cfg("discover","showMoreOnPage",3)}" min="1" max="50"/>
          </div>
          <div class="hint">Insert a "See More" card as the last slot on this page. Opens full-section overlay. Default: 3.</div>
          ${this._caps?.trakt||this._caps?.suggestarr?`
          <div class="section-title" style="margin-top:16px">Recommendations</div>
          ${this._caps?.trakt?`
          <div class="row">
            <span class="row-label">Trakt</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="recTrakt" ${this._cfg("discover","recTrakt",!0)!==!1?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>`:""}
          ${this._caps?.suggestarr?`
          <div class="row">
            <span class="row-label">SuggestArr</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="recSuggestarr" ${this._cfg("discover","recSuggestarr",!0)!==!1?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>`:""}
          <div class="hint">What the Recommendations row draws on. With both on, the two are dealt out one after the other so neither fills the row. Music from Last.fm joins it whenever Lidarr is set up \u2014 the row's own filter is where it gets switched off.</div>`:""}
          ${this._caps?.overseerr?`
          <div class="section-title" style="margin-top:16px">Recently Requested</div>
          <div class="row">
            <span class="row-label">Source</span>
            <select data-group="discover" data-key="requestedSource" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="both" ${this._cfg("discover","requestedSource","both")==="both"?"selected":""}>Seerr + card</option>
              <option value="seerr" ${this._cfg("discover","requestedSource","both")==="seerr"?"selected":""}>Seerr only</option>
              <option value="library" ${this._cfg("discover","requestedSource","both")==="library"?"selected":""}>Library</option>
            </select>
          </div>
          <div class="hint">Seerr + card adds what you requested through the card and anything downloading right now. Seerr only mirrors your Seerr request list exactly. Library is the old behaviour: every monitored title without a file, whatever put it there.</div>`:""}
          <div class="section-title" style="margin-top:16px">One-click Request</div>
          <div class="row">
            <span class="row-label">Enabled</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="oneClickRequest" ${this._cfg("discover","oneClickRequest",!1)||this._cfg("discover","oneClickMovieRequest",!1)?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Skip profile dialog for movies and TV shows.</div>
          <div class="row">
            <span class="row-label">Non-admin only</span>
            <label class="toggle">
              <input type="checkbox" data-group="discover" data-key="oneClickNonAdminOnly" ${this._cfg("discover","oneClickNonAdminOnly",!1)?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Admin keeps the profile selection dialog, non-admin users get one-click.</div>
          <div class="row">
            <span class="row-label">Season mode</span>
            <select data-group="discover" data-key="oneClickTvSeasonMode" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="first" ${this._cfg("discover","oneClickTvSeasonMode","first")==="first"?"selected":""}>First season</option>
              <option value="latest" ${this._cfg("discover","oneClickTvSeasonMode","first")==="latest"?"selected":""}>Latest season</option>
              <option value="all" ${this._cfg("discover","oneClickTvSeasonMode","first")==="all"?"selected":""}>All seasons</option>
            </select>
          </div>
          <div class="hint">Which seasons to request when using one-click for shows.</div>
          <div class="row">
            <span class="row-label">Default movie profile</span>
            <input type="text" data-group="discover" data-key="oneClickDefaultMovieProfile" value="${this._cfg("discover","oneClickDefaultMovieProfile","")}" placeholder="e.g. HD-1080p" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)"/>
          </div>
          <div class="hint">Quality profile name from Radarr (Settings \u2192 Profiles \u2192 Name). Leave empty to use Radarr default.</div>
          <div class="row">
            <span class="row-label">Default show profile</span>
            <input type="text" data-group="discover" data-key="oneClickDefaultShowProfile" value="${this._cfg("discover","oneClickDefaultShowProfile","")}" placeholder="e.g. HD-1080p" style="width:160px;padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)"/>
          </div>
          <div class="hint">Quality profile name from Sonarr (Settings \u2192 Profiles \u2192 Name). Leave empty to use Sonarr default.</div>
        </div>

        <!-- Posters -->
        <div class="section">
          <div class="section-title">Posters</div>
          <div class="row">
            <span class="row-label">Show title</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showTitle" ${this._cfg("posters","showTitle",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show audio languages</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showAudio" ${this._cfg("posters","showAudio",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show subtitles</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showSubtitles" ${this._cfg("posters","showSubtitles",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show rating</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showRating" ${this._cfg("posters","showRating",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="row">
            <span class="row-label">Show media type tag</span>
            <label class="toggle"><input type="checkbox" data-group="posters" data-key="showMediaType" ${this._cfg("posters","showMediaType",!0)!==!1?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Show a Movie or TV label in the top-left corner of each poster.</div>
          <div class="row">
            <span class="row-label">Language display</span>
            <select data-group="posters" data-key="langDisplay" style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="flags" ${this._cfg("posters","langDisplay","flags")==="flags"?"selected":""}>Combined \u2014 flags</option>
              <option value="tags" ${this._cfg("posters","langDisplay","flags")==="tags"?"selected":""}>Separate tags</option>
            </select>
          </div>
          <div class="hint">Combined puts subtitle flags, the rating and audio flags in one strip. Separate keeps the original rating, audio and subtitle tags. The two toggles above switch the left and right flags off in either mode.</div>
          ${this._caps===null||this._caps?.maintainerr?`
          <div class="row">
            <span class="row-label">Show deletion tag</span>
            <select data-group="posters" data-key="goneTag" style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="all" ${this._cfg("posters","goneTag","all")==="all"?"selected":""}>All categories</option>
              <option value="maintainerr" ${this._cfg("posters","goneTag","all")==="maintainerr"?"selected":""}>Maintainerr only</option>
              <option value="off" ${this._cfg("posters","goneTag","all")==="off"?"selected":""}>Never</option>
            </select>
          </div>
          <div class="hint">Marks titles Maintainerr has queued for deletion with a "Gone in\u2026" tag.</div>`:""}
          <div class="row">
            <span class="row-label">Rating provider</span>
            <select data-group="posters" data-key="ratingProvider" style="padding:6px 8px;border-radius:6px;font-size:13px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color,#212121)">
              <option value="imdb" ${this._cfg("posters","ratingProvider",this._cfg("discover","ratingProvider","imdb"))==="imdb"?"selected":""}>IMDb</option>
              <option value="tmdb" ${this._cfg("posters","ratingProvider",this._cfg("discover","ratingProvider","imdb"))==="tmdb"?"selected":""}>TMDB</option>
            </select>
          </div>
          <div class="hint">Falls back to TMDB \u2192 TheTVDB if IMDb score is unavailable.</div>
          <div class="row">
            <span class="row-label">Status display</span>
            <select data-group="posters" data-key="statusDisplay">
              <option value="tags" ${this._cfg("posters","statusDisplay","tags")==="tags"?"selected":""}>Tags</option>
              <option value="stripes" ${this._cfg("posters","statusDisplay","tags")==="stripes"?"selected":""}>Stripes</option>
              <option value="both" ${this._cfg("posters","statusDisplay","tags")==="both"?"selected":""}>Both</option>
            </select>
          </div>
          <div class="hint">Tags show status badges on posters. Stripes show a coloured bar at the bottom with download progress. Both combines them.</div>
        </div>

        <!-- Now Playing -->
        <div class="section">
          <div class="section-title">Now Playing</div>
          <div class="row">
            <span class="row-label">Show playback details</span>
            <label class="toggle"><input type="checkbox" data-group="streams" data-key="showTechInfo" ${this._cfg("streams","showTechInfo",!1)?"checked":""}><span class="toggle-slider"></span></label>
          </div>
          <div class="hint">Adds a line to each stream: the source, Direct Play / Direct Stream / Transcode, what reaches the player, and the bitrate \u2014 e.g. 1080p \u203A Transcode \u203A 720p \xB7 4.0 Mbps. Plex, Jellyfin and Emby only.</div>
        </div>

        <!-- Categories -->
        <div class="section">
          <div class="section-title">Categories</div>
          <div class="hint" style="margin-bottom:8px">Drag to reorder \xB7 toggle to show/hide.</div>
          <div class="cat-list">
            ${this._getCats().filter(c=>!(!this._hass?.user?.is_admin&&["tautulli","jellystat","tracearr","activity","prowlarr","maintainerr"].includes(c.id)||c.id==="prowlarr"&&this._caps!==null&&!this._caps?.prowlarr||c.id==="tracearr"&&this._caps!==null&&!this._caps?.tracearr||c.id==="maintainerr"&&this._caps!==null&&!this._caps?.maintainerr)).map(c=>`
              <div class="cat-item${c.enabled===!1?" cat-disabled":""}" draggable="true" data-cat-id="${c.id}">
                <ha-icon icon="mdi:drag-vertical" style="--mdc-icon-size:18px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0;cursor:grab"></ha-icon>
                <span class="cat-label">${this._catLabel(c.id)}</span>
                <label class="toggle">
                  <input type="checkbox" data-cat-toggle="${c.id}" ${c.enabled!==!1?"checked":""}>
                  <span class="toggle-slider"></span>
                </label>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- \u2550\u2550\u2550 TAB: Users \u2550\u2550\u2550 -->
      ${this._caps?.overseerr?`
      <div class="tab-content${tab==="users"?" active":""}" data-tab-content="users">
        <div class="section">
          <div class="section-title">Seerr User Mapping</div>
          <div class="hint" style="margin-top:0;margin-bottom:12px">Map HA users to Seerr accounts. Non-admin HA users without a specific mapping use the default.</div>
          <div class="user-map-rows">
            ${this._renderUserMapRows()}
          </div>
          <button class="user-map-add" style="margin-top:8px;padding:6px 14px;border-radius:6px;border:1px solid var(--divider-color,#e0e0e0);background:var(--secondary-background-color,#f5f5f5);color:var(--primary-text-color);font-size:12px;cursor:pointer">+ Add mapping</button>
        </div>
      </div>`:""}

      <!-- \u2550\u2550\u2550 TAB: Appearance \u2014 general settings, then the design tokens (#42) \u2550\u2550\u2550 -->
      <div class="tab-content${tab==="appearance"?" active":""}" data-tab-content="appearance">
        ${stylesTabHtml(this,`          <div class="row">
            <span class="row-label">Performance mode</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="performanceMode" ${perfMode?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Disables backdrop blur \u2014 improves performance on low-end devices.</div>

          ${perfMode?this._colorRow("Card background","cardBackground","#121216"):""}
          ${perfMode?this._numberRow("Card background transparency","cardBackgroundOpacity",90,0,100,1,"0\u2013100 %"):""}

          <div class="row">
            <span class="row-label">Day / night modal colours</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="dayNightMode" ${this._styleVal("dayNightMode",!0)?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Automatically switches modal (popup) colours based on time of day. Disable if you use custom modal colours.</div>

          <div class="row">
            <span class="row-label">Category colour overlays</span>
            <label class="toggle">
              <input type="checkbox" data-style-key="categoryOverlays" ${this._styleVal("categoryOverlays",!0)!==!1?"checked":""}>
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="hint">Show brand-colour background tint behind each section's content.</div>

          ${this._numberRow("UI scale","uiScale",1,.5,3,.05,"0.5\u20133")}
          <div class="hint">Scale all card content proportionally. Use values above 1 on large screens or TVs where the default text is too small. Reduce columns (Items per category) if content overflows.</div>

          ${this._numberRow("Left panel width","leftPanelWidth",40,10,90,1,"10\u201390 %")}
          <div class="hint">Width of the downloads panel as a percentage of the card. Default is 40 %. Has no effect when the downloads panel is hidden or on mobile.</div>
`)}
      </div>
    `,this._wireEvents(),wireStylesTab(this,this.shadowRoot.querySelector('[data-tab-content="appearance"]'));let tabs=this.shadowRoot.querySelector(".tabs");tabs&&(tabs.scrollLeft=this._tabsScroll||0,tabs.addEventListener("scroll",()=>{this._tabsScroll=tabs.scrollLeft},{passive:!0})),this._wireUserMap(),this._activeTab==="users"&&!this._haUsers&&this._loadUserMapData()}_defaultCats(){return[{id:"recentlyAdded",enabled:!0},{id:"recentlyRequested",enabled:!0},{id:"upcoming",enabled:!0},{id:"tvUpcoming",enabled:!0},{id:"trending",enabled:!0},{id:"popular",enabled:!0},{id:"recommendations",enabled:!1},{id:"calendar",enabled:!0},{id:"streams",enabled:!1},{id:"tautulli",enabled:!1},{id:"jellystat",enabled:!1},{id:"tracearr",enabled:!1},{id:"activity",enabled:!1},{id:"prowlarr",enabled:!1},{id:"maintainerr",enabled:!1},{id:"library",enabled:!0}]}_mergeRecCats(cats){let REC=["trakt","suggestarr","lastfm"];if(!cats.some(c=>REC.includes(c.id)))return cats;if(cats.some(c=>c.id==="recommendations"))return cats.filter(c=>!REC.includes(c.id));let slot=cats.findIndex(c=>c.id==="trakt")>=0?cats.findIndex(c=>c.id==="trakt"):cats.findIndex(c=>REC.includes(c.id)),enabled=cats.some(c=>REC.includes(c.id)&&c.enabled!==!1),out=cats.filter(c=>!REC.includes(c.id));return out.splice(Math.min(slot,out.length),0,{id:"recommendations",enabled}),out}_getCats(){if(!this._config?.categories)return this._defaultCats();let saved=this._mergeRecCats(this._config.categories.filter(c=>c.id!=="music")),savedIds=new Set(saved.map(c=>c.id)),missing=this._defaultCats().filter(c=>!savedIds.has(c.id));return[...saved,...missing]}_catLabel(id){return{radarr:"Recently Added",sonarr:"Recently Requested",recentlyAdded:"Recently Added",recentlyRequested:"Recently Requested",music:"Recently Added Music (Lidarr)",upcoming:"Upcoming Movies",tvUpcoming:"New Shows",trending:"Trending",popular:"Popular Movies",recommendations:"Recommendations (Trakt / SuggestArr / Last.fm)",calendar:"Calendar",streams:"Now Playing (Plex / Jellyfin / Kodi / Emby) \u2014 auto-hidden when nothing plays",tautulli:"Statistics (Plex)",jellystat:"Statistics (Jellyfin)",tracearr:"Streaming Statistics (Tracearr)",activity:"Activity (Queue / History / Blocklist)",prowlarr:"Prowlarr (Indexers / Stats / History)",maintainerr:"Maintainerr (Rules / Collections / Storage)",library:"Library (Movies & TV Shows)"}[id]||id}_defaultClients(){return[{id:"qbit",enabled:!0},{id:"deluge",enabled:!0},{id:"rtorrent",enabled:!0},{id:"transmission",enabled:!0},{id:"sab",enabled:!0},{id:"nzbget",enabled:!0}]}_getClients(){let saved=this._config?.downloadClients;if(!Array.isArray(saved))return this._defaultClients();let savedIds=new Set(saved.map(c=>c.id)),missing=this._defaultClients().filter(c=>!savedIds.has(c.id));return[...saved,...missing]}_clientLabel(id){return{qbit:"qBittorrent",sab:"SABnzbd",nzbget:"NZBGet",deluge:"Deluge",rtorrent:"rTorrent",transmission:"Transmission"}[id]||id}_numberRow(label,key,defaultVal,min,max,step,hint){let stored=this._styleVal(key,null),val=stored??defaultVal;return`
      <div class="row">
        <span class="row-label">${label}</span>
        ${hint?`<span class="color-alpha">${hint}</span>`:""}
        <input type="number" data-style-key="${key}" value="${val}" min="${min}" max="${max}" step="${step}" style="text-align:right"/>
      </div>`}_sliderRow(label,key,defaultVal,min,max,step,unit){let stored=this._styleVal(key,null),val=stored??defaultVal,display=unit?`${val}${unit}`:`${val}`;return`
      <div class="row" style="flex-wrap:wrap;gap:4px">
        <span class="row-label">${label}</span>
        <span class="color-alpha" data-val-for="${key}" style="min-width:36px;text-align:right">${display}</span>
      </div>
      <input type="range" data-style-key="${key}" data-unit="${unit||""}" value="${val}" min="${min}" max="${max}" step="${step}"
        style="width:100%;margin:2px 0 6px;accent-color:var(--primary-color,#03a9f4)"/>`}_colorRow(label,key,defaultHex,alphaHint){let stored=this._styleVal(key,null),hex=this._toHex(stored,defaultHex);return`
      <div class="row">
        <span class="row-label">${label}</span>
        ${alphaHint?`<span class="color-alpha">${alphaHint}</span>`:""}
        <input type="color" data-style-key="${key}" value="${hex}"/>
      </div>`}_wireEvents(){this.shadowRoot.querySelectorAll(".tab").forEach(btn=>{btn.addEventListener("click",()=>{this._activeTab=btn.dataset.tab;let strip=btn.parentElement,left=btn.offsetLeft-(strip.clientWidth-btn.offsetWidth)/2;strip.scrollTo?.({left:Math.max(0,left),behavior:"smooth"}),this.shadowRoot.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t.dataset.tab===this._activeTab)),this.shadowRoot.querySelectorAll(".tab-content").forEach(c=>c.classList.toggle("active",c.dataset.tabContent===this._activeTab)),this._activeTab==="users"&&this._loadUserMapData()})}),this.shadowRoot.querySelectorAll("select[data-key]").forEach(el=>{el.addEventListener("change",()=>this._update({[el.dataset.key]:el.value}))}),this.shadowRoot.querySelectorAll('input[type="number"][data-key]').forEach(el=>{el.addEventListener("change",()=>this._update({[el.dataset.key]:parseInt(el.value)}))}),this.shadowRoot.querySelectorAll('input[type="number"][data-group]').forEach(el=>{el.addEventListener("change",()=>{let existing=this._config[el.dataset.group]||{};this._update({[el.dataset.group]:{...existing,[el.dataset.key]:parseInt(el.value)}})})}),this.shadowRoot.querySelectorAll('input[type="text"][data-group]').forEach(el=>{el.addEventListener("change",()=>{let existing=this._config[el.dataset.group]||{};this._update({[el.dataset.group]:{...existing,[el.dataset.key]:el.value}})})}),this.shadowRoot.querySelectorAll('input[type="checkbox"][data-key]').forEach(el=>{el.addEventListener("change",()=>this._update({[el.dataset.key]:el.checked}))}),this.shadowRoot.querySelectorAll('input[type="checkbox"][data-group]').forEach(el=>{el.addEventListener("change",()=>{let existing=this._config[el.dataset.group]||{};this._update({[el.dataset.group]:{...existing,[el.dataset.key]:el.checked}})})}),this.shadowRoot.querySelectorAll("select[data-group]").forEach(el=>{el.addEventListener("change",()=>{let existing=this._config[el.dataset.group]||{};this._update({[el.dataset.group]:{...existing,[el.dataset.key]:el.value}})})}),this.shadowRoot.querySelectorAll("select[data-style-key]").forEach(el=>{el.addEventListener("change",()=>{let existing=this._config.styles||{};this._update({styles:{...existing,[el.dataset.styleKey]:el.value}})})}),this.shadowRoot.querySelectorAll('input[type="checkbox"][data-style-key]').forEach(el=>{el.addEventListener("change",()=>{let existing=this._config.styles||{};this._update({styles:{...existing,[el.dataset.styleKey]:el.checked}}),this._render()})}),this.shadowRoot.querySelectorAll('input[type="number"][data-style-key]').forEach(el=>{el.addEventListener("change",()=>{let existing=this._config.styles||{};this._update({styles:{...existing,[el.dataset.styleKey]:parseFloat(el.value)}})})}),this.shadowRoot.querySelectorAll('input[type="range"][data-style-key]').forEach(el=>{let key=el.dataset.styleKey,unit=el.dataset.unit||"",label=this.shadowRoot.querySelector(`[data-val-for="${key}"]`);el.addEventListener("pointerdown",e=>e.stopPropagation()),el.addEventListener("mousedown",e=>e.stopPropagation()),el.addEventListener("input",()=>{label&&(label.textContent=el.value+unit);let existing=this._config.styles||{};this._update({styles:{...existing,[key]:parseFloat(el.value)}})})}),this.shadowRoot.querySelectorAll('input[type="color"][data-style-key]').forEach(el=>{el.addEventListener("input",()=>{let existing=this._config.styles||{};this._update({styles:{...existing,[el.dataset.styleKey]:el.value}})})}),this.shadowRoot.querySelectorAll("input[data-client-toggle]").forEach(el=>{el.addEventListener("change",()=>{let clients=this._getClients().map(c=>c.id===el.dataset.clientToggle?{...c,enabled:el.checked}:c);this._update({downloadClients:clients})})});let dragClientId=null;this.shadowRoot.querySelectorAll("[data-client-id]").forEach(el=>{el.addEventListener("dragstart",e=>{dragClientId=el.dataset.clientId,el.classList.add("dragging"),e.dataTransfer.effectAllowed="move"}),el.addEventListener("dragend",()=>{el.classList.remove("dragging"),dragClientId=null}),el.addEventListener("dragover",e=>{e.preventDefault(),e.dataTransfer.dropEffect="move",el.classList.add("drag-over")}),el.addEventListener("dragleave",()=>el.classList.remove("drag-over")),el.addEventListener("drop",e=>{e.preventDefault(),el.classList.remove("drag-over");let toId=el.dataset.clientId;if(!dragClientId||dragClientId===toId)return;let clients=[...this._getClients()],from=clients.findIndex(c=>c.id===dragClientId),to=clients.findIndex(c=>c.id===toId);if(from<0||to<0)return;let[item]=clients.splice(from,1);clients.splice(to,0,item),this._update({downloadClients:clients}),this._render()})}),this.shadowRoot.querySelectorAll("input[data-cat-toggle]").forEach(el=>{el.addEventListener("change",()=>{let cats=this._getCats().map(c=>c.id===el.dataset.catToggle?{...c,enabled:el.checked}:c);this._update({categories:cats})})});let dragId=null;this.shadowRoot.querySelectorAll(".cat-item").forEach(el=>{el.addEventListener("dragstart",e=>{dragId=el.dataset.catId,el.classList.add("dragging"),e.dataTransfer.effectAllowed="move"}),el.addEventListener("dragend",()=>{el.classList.remove("dragging"),dragId=null}),el.addEventListener("dragover",e=>{e.preventDefault(),e.dataTransfer.dropEffect="move",el.classList.add("drag-over")}),el.addEventListener("dragleave",()=>el.classList.remove("drag-over")),el.addEventListener("drop",e=>{e.preventDefault(),el.classList.remove("drag-over");let toId=el.dataset.catId;if(!dragId||dragId===toId)return;let cats=[...this._getCats()],from=cats.findIndex(c=>c.id===dragId),to=cats.findIndex(c=>c.id===toId);if(from<0||to<0)return;let[item]=cats.splice(from,1);cats.splice(to,0,item),this._update({categories:cats}),this._render()})})}_renderUserMapRows(){let map=this._config.seerr_user_map||[{ha:"all_non_admin",seerr:"family"}],haUsers=this._haUsers||[],seerrAccounts=this._seerrAccounts||[],usedHaIds=new Set(map.filter(m=>m.ha!=="all_non_admin").map(m=>m.ha));return map.map((m,i)=>{let isDefault=m.ha==="all_non_admin",haOptions=isDefault?'<option value="all_non_admin" selected>All non-admin users</option>':haUsers.filter(u=>!u.is_admin&&(u.id===m.ha||!usedHaIds.has(u.id)||m.ha===u.id)).map(u=>`<option value="${u.id}" ${u.id===m.ha?"selected":""}>${u.name||u.id}</option>`).join(""),seerrOptions=seerrAccounts.map(a=>`<option value="${a.id}" ${a.id===m.seerr?"selected":""}>${a.id==="family"?"Family":"Guest"} (${a.email})</option>`).join("");return`
        <div class="row" data-map-idx="${i}">
          <select data-map-ha="${i}" style="flex:1;min-width:0;padding:6px 8px;border-radius:6px;font-size:12px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color)"${isDefault?" disabled":""}>
            ${haOptions}
          </select>
          <span style="font-size:11px;color:var(--secondary-text-color,#9e9e9e);flex-shrink:0">\u2192</span>
          <select data-map-seerr="${i}" style="flex:1;min-width:0;padding:6px 8px;border-radius:6px;font-size:12px;border:1px solid var(--divider-color,#e0e0e0);background:var(--card-background-color,#fff);color:var(--primary-text-color)">
            ${seerrOptions}
          </select>
          ${isDefault?'<span style="width:30px"></span>':`<button data-map-del="${i}" style="border:none;background:none;cursor:pointer;font-size:16px;color:var(--error-color,#e53935);padding:2px 6px" title="Remove">\xD7</button>`}
        </div>`}).join("")}async _loadUserMapData(){if(!this._haUsers)try{let[haUsers,seerrAccounts]=await Promise.all([this._hass.callApi("GET","arr_stack/overseerr/ha_users"),this._hass.callApi("GET","arr_stack/overseerr/seerr_accounts")]);this._haUsers=haUsers||[],this._seerrAccounts=seerrAccounts||[],this._activeTab==="users"&&this._render()}catch{this._haUsers=[],this._seerrAccounts=[]}}_wireUserMap(){let root=this.shadowRoot;root.querySelectorAll("[data-map-seerr]").forEach(sel=>{sel.addEventListener("change",()=>{let idx=parseInt(sel.dataset.mapSeerr),map=[...this._config.seerr_user_map||[{ha:"all_non_admin",seerr:"family"}]];map[idx]&&(map[idx]={...map[idx],seerr:sel.value}),this._update({seerr_user_map:map})})}),root.querySelectorAll("[data-map-ha]").forEach(sel=>{sel.addEventListener("change",()=>{let idx=parseInt(sel.dataset.mapHa),map=[...this._config.seerr_user_map||[{ha:"all_non_admin",seerr:"family"}]];map[idx]&&(map[idx]={...map[idx],ha:sel.value}),this._update({seerr_user_map:map}),this._render()})}),root.querySelectorAll("[data-map-del]").forEach(btn=>{btn.addEventListener("click",()=>{let idx=parseInt(btn.dataset.mapDel),map=[...this._config.seerr_user_map||[{ha:"all_non_admin",seerr:"family"}]];map.splice(idx,1),this._update({seerr_user_map:map}),this._render()})});let addBtn=root.querySelector(".user-map-add");addBtn&&addBtn.addEventListener("click",()=>{let map=[...this._config.seerr_user_map||[{ha:"all_non_admin",seerr:"family"}]],haUsers=this._haUsers||[],usedIds=new Set(map.map(m=>m.ha)),available=haUsers.find(u=>!u.is_admin&&!usedIds.has(u.id));if(!available)return;let defaultSeerr=(this._seerrAccounts||[])[0]?.id||"family";map.push({ha:available.id,seerr:defaultSeerr}),this._update({seerr_user_map:map}),this._render()})}_update(patch){this._config={...this._config,...patch},this._sent=JSON.stringify(this._config),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}};customElements.define("arr-stack-card-editor",ArrStackCardEditor);
