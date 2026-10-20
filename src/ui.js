/* ============================================================
   PSEUDO CEO — interface
   ============================================================ */
const $app=document.getElementById('app'),$hud=document.getElementById('hud'),$bar=document.getElementById('bar');
const SAVE='thechair.save.v3',BEST='thechair.best.v1';
const store={get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
/* ---------- online: anonymous counts + leaderboard (all optional, fail silently) ---------- */
const NET=(()=>{
  let pid=store.get('pseudoceo.pid');
  if(!pid||!/^[a-f0-9]{16,32}$/.test(pid)){try{pid=Array.from(crypto.getRandomValues(new Uint8Array(12))).map(b=>b.toString(16).padStart(2,'0')).join('')}catch(e){pid='0123456789abcdef'+Math.random().toString(16).slice(2,10).padEnd(8,'0')}store.set('pseudoceo.pid',pid)}
  const ok=/^https?:$/.test(location.protocol)&&!/claude|anthropic/i.test(location.hostname);
  const dnt=navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true;
  const json=async r=>{const j=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(new Error(j.error||'Request failed'),{status:r.status});return j};
  const post=(path,body,keep)=>fetch(path,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body),keepalive:!!keep}).then(json);
  return {pid,ok,post,get:path=>fetch(path).then(json),ev(t,x){if(!ok||dnt)return;try{post('/api/event',Object.assign({t,pid},x),true).catch(()=>{})}catch(e){}}};
})();
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const LET='ABCD';
const ext=(href,text)=>'<a href="'+esc(href)+'" target="_blank" rel="noopener">'+text+'</a>';

let G=null;
let UI={screen:'home',setup:{co:'intc',diff:(()=>{const b=store.get(BEST);return b&&Object.keys(b).length?'medium':'easy'})(),seed:randSeed(),auto:true},card:0,picks:{},alloc:null,last:null,prevMeters:null,prevIdx:100,dash:false,answers:[],callRes:null,board:{co:'intc',d:'medium',state:'idle',rows:[],total:0}};

/* A scenario code that starts with a signature from the server ('harbor-482-9f3a1c') can be posted to the leaderboard.
   A plain local code ('harbor-482') still plays, but only as practice. */
const RANKED=/^[a-z]{3,10}-\d{3}-[0-9a-f]{6}$/;
const isRanked=sd=>RANKED.test(String(sd||''));
let seedP=null;
function fetchSeed(){
  if(!NET.ok)return null;
  seedP=NET.get('/api/seed').then(j=>{
    if(j&&typeof j.seed==='string'&&isRanked(j.seed)&&UI.setup.auto){UI.setup.seed=j.seed;const i=document.getElementById('seed');if(i&&UI.screen==='home'){i.value=j.seed;seedNote()}}
  }).catch(()=>{});
  return seedP;
}
function seedNote(){const i=document.getElementById('seed'),n=document.getElementById('seednote');if(!i||!n)return;const r=isRanked(i.value.trim());n.textContent=r?'Ranked code. You can post this game to the leaderboard.':'Practice code. You can play it, but it cannot be posted to the leaderboard. Reload or tap Play again for a ranked one.';n.className='note'+(r?'':' faint')}
function randSeed(){const w=['ledger','harbor','granite','cobalt','summit','tandem','meridian','quarry','lantern','pivot','anchor','vector','orchard','forge','beacon','delta'];const r=Math.random;return w[Math.floor(r()*w.length)]+'-'+(100+Math.floor(r()*900))}

/* ---------- helpers ---------- */
function co(){return CO[G.coId]}
function saveOK(sv){return !!(sv&&sv.G&&CO[sv.G.coId]&&DIFF[sv.G.diffKey]&&sv.G.plan&&sv.G.plan.quarters&&sv.G.plan.quarters.length===DIFF[sv.G.diffKey].quarters)}
function D(){return DIFF[G.diffKey]}
function lastRec(st){return st.hist.length?st.hist[st.hist.length-1]:null}
function curMargin(st){const r=lastRec(st);return r?r.margin:CO[G.coId].start.m}
function kpiFmt(c,v){return c.kpi.fmt(v)}
function lvl(){return D().hints}
function isPlain(){return lvl()==='plain'}
function isFull(){return lvl()==='numbers'}
function isSimple(){return !isFull()}
function save(){if(G)store.set(SAVE,{G,UI:{screen:UI.screen,card:UI.card,picks:UI.picks,alloc:UI.alloc,last:UI.last,prevMeters:UI.prevMeters,prevIdx:UI.prevIdx,answers:UI.answers,callRes:UI.callRes}})}
function go(screen){UI.screen=screen;render();window.scrollTo(0,0);save()}
function initials(n){return n.split(/\s+/).map(w=>w[0]).slice(0,2).join('')}
const ROLE_CLS={cfo:'',coo:'r2',cco:'r3',gc:'r4',cpo:'r5'};
function avatar(name,k,sm){return '<span class="av pic'+(k&&ROLE_CLS[k]?' '+ROLE_CLS[k]:'')+(sm?' sm':'')+'" aria-hidden="true">'+portrait(name)+'</span>'}
function jobsFmt(n){return n>=1000?(Math.round(n/100)*100).toLocaleString('en-US'):Math.round(n).toLocaleString('en-US')}

/* plain-English vocabulary for Easy */
const PLAIN={g:'Sales growth',m:'Profit per sale',cash:'Cash',cr:'Cash',debt:'Debt',dr:'Debt',inv:'Investor mood',brd:'Board support',emp:'Employee morale',cus:'Customer happiness',reg:'Government goodwill',exe:'How smoothly things run',shares:'Shares outstanding',div:'Dividend'};
const METER_PLAIN={inv:['Investor mood','How Wall Street feels about the stock'],brd:['Board support','Your bosses. Too low and they replace you'],emp:['Employee morale','Low morale slows everything down'],cus:['Customer happiness','Happy customers buy more'],reg:['Government goodwill','Regulators can help or hurt you'],exe:['Execution','How smoothly the company runs']};
function meterName(k){if(isSimple())return METER_PLAIN[k][0];return METERS.find(m=>m[0]===k)[1]}
function varName(k){const c=co();if(k==='kpi')return isSimple()?c.kpi.plain:c.kpi.short;return isSimple()?PLAIN[k]:VAR_LABEL[k]}

/* glossary for Easy */
const GLOSS=[
 [/\brevenue\b|\bsales\b/i,'Revenue','All the money customers paid the company, before any costs.'],
 [/operating margin|\bmargins?\b/i,'Margin','Cents of profit kept from each dollar of sales after running the business.'],
 [/free cash flow|cash flow/i,'Free cash flow','Cash left over after paying for operations and new equipment.'],
 [/\bcapex\b|capital spending|clean.room|shell construction/i,'Capital spending','Money spent on buildings and equipment that pay off over years.'],
 [/\bR&D\b/i,'R&D','Research and development: money spent inventing new products.'],
 [/dividend/i,'Dividend','Cash the company pays its shareholders every quarter.'],
 [/buy back|buyback/i,'Buyback','The company buys its own shares, so each remaining share owns a bigger slice.'],
 [/guid(e|ance)|outlook/i,'Guidance','What the CEO tells Wall Street to expect. Missing it hurts trust.'],
 [/foundry|\bfabs?\b/i,'Foundry','A factory that makes chips, for the company itself or for other companies.'],
 [/\b(14A|18A)\b|\bnode\b/i,'Process node','A generation of chip-making technology. Newer nodes make faster chips.'],
 [/yield/i,'Yield','The share of chips that come out working. Low yield means wasted wafers.'],
 [/hyperscaler|cloud company/i,'Hyperscaler','A giant cloud company like Amazon, Microsoft or Google.'],
 [/convertible/i,'Convertible debt','A loan that can turn into shares later, so it carries lower interest.'],
 [/new shares|dilut/i,'Dilution','Selling new shares means each existing share owns a smaller piece.'],
 [/spin.off|separation|breakup|split/i,'Spin-off','Splitting part of the company into its own separately traded company.'],
 [/minority stake/i,'Minority stake','Selling a piece, under half, of a business to outside investors.'],
 [/wholesale/i,'Wholesale','Selling to stores that resell your products, instead of selling directly.'],
 [/Nike Direct|direct-to-consumer/i,'Direct sales','Selling through your own stores, website and app.'],
 [/franchise/i,'Franchise','A famous product line, like Air Force 1 or Dunk.'],
 [/Medicare Advantage/i,'Medicare Advantage','Private insurance plans for people 65 and older, paid largely by the government.'],
 [/medical cost ratio|medical loss ratio/i,'Medical cost ratio','Share of premiums spent on members’ care. Lower means more profit.'],
 [/prior authori/i,'Prior authorization','Insurer approval required before some treatments. Doctors find it slow.'],
 [/\bOptum\b/i,'Optum','UnitedHealth’s doctors, clinics and health-tech business.'],
 [/risk contracts?|losing contracts|unfavorable contracts/i,'Risk contract','A deal where Optum is paid a fixed amount per patient and loses money if care costs more.'],
 [/cod(e|ing) (patient )?diagnos/i,'Diagnosis coding','How patient illnesses are recorded. It decides how much the government pays.'],
 [/activist/i,'Activist investor','A fund that buys stock and pushes the company to change.'],
 [/proxy/i,'Proxy fight','A shareholder vote over who sits on the board.'],
 [/fixed.price/i,'Fixed-price contract','The price is set up front, so cost overruns come out of your profit.'],
 [/\bFAA\b|certif/i,'Certification','Government approval a new airplane needs before it can fly passengers.'],
 [/backlog/i,'Backlog','Orders customers have placed that are not delivered yet.'],
 [/impairment|write.?down/i,'Write-down','Admitting an asset is worth less than you paid. It hits profit but not cash.'],
 [/organic/i,'Organic sales','Sales growth from existing brands, not from buying companies.'],
 [/store.brand|private label/i,'Store brand','Products sold under a retailer’s own name, usually cheaper.'],
 [/\bhedge/i,'Hedging','Locking in prices ahead of time to avoid surprises.'],
 [/tariff/i,'Tariff','A tax on imported goods.'],
 [/\bdebt\b|borrow|loan/i,'Debt','Money borrowed that must be repaid with interest.'],
 [/stake|shares|stock/i,'Shares','Pieces of ownership in the company, traded on the stock market.'],
 [/capacity/i,'Capacity','How much the factories can produce.'],
 [/union|machinists/i,'Union','Workers who bargain together over pay and conditions.'],
 [/layoff|headcount|staff|job cuts/i,'Layoff','Ending jobs to cut costs. It saves money and costs morale.']
];
function glossFor(text){const out=[];for(const g of GLOSS){if(g[0].test(text)&&!out.some(o=>o[1]===g[1]))out.push(g)}return out.slice(0,6)}

/* exact effect text for Hard */
function qOff(n){return n<=0?'now':'in '+n+' qtr'+(n>1?'s':'')}
function fxText(e,st){
  const v=e[0],d=D(),c=co();if(v==='flag')return null;
  const lag=Math.round((e[2]||0)*d.lag),dur=e[3]||1,when=qOff(lag);
  const sg=x=>(x>0?'+':x<0?'−':'')+Math.abs(x);
  const span=dur>=50?', lasting':dur>1?', '+dur+' qtrs':'';
  if(v==='g')return 'Growth '+sg(+e[1].toFixed(2))+' pt/qtr '+when+span;
  if(v==='m')return 'Margin '+sg(+e[1].toFixed(2))+' pt '+when+span;
  if(v==='cash'||v==='cr'||v==='debt'||v==='dr'){const b=(v==='cr'||v==='dr')?e[1]*st.rev/100:e[1];const nm=(v==='cash'||v==='cr')?'Cash':'Debt';return nm+' '+(b<0?'−':'+')+fmtB(Math.abs(b))+(dur>1&&dur<50?' ×'+dur+' qtrs':dur>=50?' per qtr, lasting':'')+' '+when}
  if(v==='kpi'){const x=e[1];return c.kpi.short+' '+(x>0?'+':'−')+Math.abs(x).toFixed(Math.abs(x)<1?2:1)+' '+when}
  if(v==='shares')return 'Shares '+sg(e[1])+'%';
  if(v==='div')return 'Dividend '+sg(e[1])+'%';
  const m=METERS.find(x=>x[0]===v);if(m)return m[1]+' '+sg(e[1])+(lag>0?' '+when:'');
  return null;
}
function fxClass(e){const v=e[0],good=v==='kpi'?co().kpi.good:VAR_GOOD[v==='cr'?'cash':v==='dr'?'debt':v];if(!good)return '';return (e[1]>0)===(good>0)?'up':'down'}

/* ---------- sparkline ---------- */
function spark(a,b,W,H){
  W=W||84;H=H||30;const all=a.concat(b||[]);let lo=Math.min.apply(null,all),hi=Math.max.apply(null,all);
  if(hi-lo<10){const m=(hi+lo)/2;lo=m-5;hi=m+5}
  const n=Math.max(a.length,(b||[]).length,2);
  const X=i=>(i/(n-1))*(W-6)+3,Y=v=>H-3-((v-lo)/(hi-lo))*(H-6);
  const pts=s=>s.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ');
  let out='<svg viewBox="0 0 '+W+' '+H+'" aria-hidden="true">';
  const base=Y(100);if(base>0&&base<H)out+='<line x1="0" x2="'+W+'" y1="'+base.toFixed(1)+'" y2="'+base.toFixed(1)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
  if(b)out+='<polyline points="'+pts(b)+'" fill="none" stroke="var(--ghost)" stroke-width="1.5" stroke-dasharray="3 2"/>';
  out+='<polyline points="'+pts(a)+'" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
  out+='<circle cx="'+X(a.length-1).toFixed(1)+'" cy="'+Y(a[a.length-1]).toFixed(1)+'" r="2.6" fill="var(--accent)"/></svg>';
  return out;
}

/* ---------- photos and colors ---------- */
const PHOTO={
 intc:{what:'Intel headquarters, Santa Clara, California',by:'Coolcaesar',lic:'CC BY-SA 4.0',url:'https://commons.wikimedia.org/wiki/File:Intel_Headquarters_in_2023.jpg'},
 ba:{what:'A Boeing 737 MAX 9 in flight',by:'KirkXWB',lic:'CC BY-SA 4.0',url:'https://commons.wikimedia.org/wiki/File:Alaska_737_Max_9.jpg'},
 unh:{what:'UnitedHealth Group and Optum campus, Eden Prairie, Minnesota',by:'Chad Davis',lic:'CC BY 2.0',url:'https://commons.wikimedia.org/wiki/File:Optum_Headquarters,_Eden_Prairie,_MN_(49120017041).jpg'},
 nke:{what:'Nike World Headquarters, Beaverton, Oregon',by:'Brandon Carson',lic:'CC BY 2.0',url:'https://commons.wikimedia.org/wiki/File:Nike_Headquarters_Oregon.jpg'},
 khc:{what:'PPG Place, Pittsburgh, home of Kraft Heinz’s co-headquarters',by:'Derek Jensen (Tysto)',lic:'Public domain',url:'https://commons.wikimedia.org/wiki/File:Pittsburgh-pennsylvania-ppg-place-2007.jpg'}
};
const HUE={intc:'#0B4FB3',ba:'#14325E',unh:'#0A6658',nke:'#B83A0B',khc:'#A3201C'};
function credit(k){const p=PHOTO[k];return '<div class="credit">'+esc(p.what)+'. Photo: '+ext(p.url,esc(p.by)+', '+esc(p.lic))+'</div>'}
/* ---------- real people, company logos, illustrated portraits ---------- */
const FACE_CREDIT={
 intc:{by:'U.S. Department of Commerce',lic:'Public domain',url:'https://commons.wikimedia.org/wiki/File:Intel_CEO_Lip-Bu_Tan_(2025)_(cropped).jpg'},
 ba:{by:'U.S. Senate Committee on Commerce, Science, and Transportation',lic:'Public domain',url:'https://commons.wikimedia.org/wiki/File:Ortberg-Senate_(cropped).png'},
 unh:{by:'U.S. House Committee on Ways and Means',lic:'Public domain',url:'https://commons.wikimedia.org/wiki/File:Stephen_Hemsley.jpg'}
};
const LOGO_CREDIT={
 intc:'https://commons.wikimedia.org/wiki/File:Intel_logo_(2020,_dark_blue).svg',
 ba:'https://commons.wikimedia.org/wiki/File:Boeing_full_logo.svg',
 unh:'https://commons.wikimedia.org/wiki/File:UnitedHealth_Group_logo.svg',
 nke:'https://commons.wikimedia.org/wiki/File:Logo_NIKE.svg',
 khc:'https://commons.wikimedia.org/wiki/File:KraftHeinz.svg'
};
/* decorative marks next to a company name use deco=1 so screen readers do not read the name twice */
function logo(id,sz,deco){return '<span class="logo logo-'+id+(sz?' '+sz:'')+'"'+(deco?' aria-hidden="true"':' role="img" aria-label="'+esc(CO[id].name)+' logo"')+'></span>'}
function LG(){return G?logo(G.coId,'xs',1):''}
function face(id,sz){
  const c=CO[id];
  if(FACE_CREDIT[id])return '<span class="face face-'+id+(sz?' '+sz:'')+'" role="img" aria-label="Photo of '+esc(c.ceo)+'"></span>';
  return '<span class="face mono'+(sz?' '+sz:'')+'" style="--c:'+HUE[id]+'" role="img" aria-label="'+esc(c.ceo)+'">'+esc(initials(c.ceo))+'</span>';
}
/* small illustrated portraits for the fictional executives and analysts, drawn from their names */
function portrait(name){
  const h=hashStr(String(name)),p=(m,s)=>((h>>>s)%m);
  const skin=['#F2CDAA','#E6B58B','#CC9468','#A96E46','#7C4B2E','#573322'][p(6,0)];
  const hair=['#1C1612','#3A2A1F','#5C3F26','#9C6B35','#C8B07A','#8A8A90','#2A2A33'][p(7,3)];
  const bg=['#CFDDF3','#F3DDC9','#D9EBD8','#EEDAEC','#F6EBB9','#D3E7EA'][p(6,6)];
  const shirt=['#26364F','#3C4250','#5A3A3A','#2F4F4F','#4A416B','#6B5028','#1F2A44'][p(7,9)];
  const style=p(4,12),glasses=p(3,15)===0,smile=p(2,17)===0;
  let s='<svg viewBox="0 0 48 48" aria-hidden="true"><rect width="48" height="48" fill="'+bg+'"/>';
  if(style===1)s+='<path d="M12 25c0-11 5-16 12-16s12 5 12 16v11h-5V25H17v11h-5z" fill="'+hair+'"/>';
  s+='<path d="M5 49c0-9 8-14 19-14s19 5 19 14z" fill="'+shirt+'"/><path d="M19.5 35l4.5 7 4.5-7z" fill="#fff" opacity=".92"/>';
  s+='<rect x="20.5" y="27" width="7" height="10" rx="2.5" fill="'+skin+'"/><ellipse cx="24" cy="21" rx="8.5" ry="10" fill="'+skin+'"/>';
  if(style===0||style===1)s+='<path d="M15.5 20c-.6-7.4 3-11.6 8.5-11.6s9.1 4.2 8.5 11.6c-1.5-3.8-4-5.3-8.5-5.3s-7 1.5-8.5 5.3z" fill="'+hair+'"/>';
  if(style===3)s+='<path d="M15.2 21c-1.2-8.6 3-13.6 9.3-13.6 5.2 0 8.9 3.8 8.3 13.6-.8-4.4-2.6-7-5.2-8-2.2 2.2-6.6 3.2-12.4 8z" fill="'+hair+'"/>';
  if(style===2)s+='<path d="M15.6 21c0-2.4.6-3.6 1.5-4.2V22zM32.4 21c0-2.4-.6-3.6-1.5-4.2V22z" fill="'+hair+'" opacity=".8"/>';
  s+='<circle cx="20.5" cy="21.8" r="1.05" fill="#2A211C"/><circle cx="27.5" cy="21.8" r="1.05" fill="#2A211C"/>';
  if(glasses)s+='<g fill="none" stroke="#2A211C" stroke-width="1"><rect x="17.2" y="19.4" width="6.6" height="4.8" rx="2"/><rect x="24.2" y="19.4" width="6.6" height="4.8" rx="2"/><path d="M23.8 21.4h.4"/></g>';
  s+=smile?'<path d="M21.3 27c1.6 1.8 3.8 1.8 5.4 0" fill="none" stroke="#7A3B2E" stroke-width="1.2" stroke-linecap="round"/>':'<path d="M21.8 27.6h4.4" fill="none" stroke="#7A3B2E" stroke-width="1.2" stroke-linecap="round"/>';
  return s+'</svg>';
}

/* ---------- stock price, profit and loss, and the race against the real CEO ---------- */
const STAKE=10000,WK=13;
const usd=(v,d)=>(v<0?'−':'')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const sUsd=(v,d)=>(v>=0?'+':'−')+'$'+Math.abs(v).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
function gameOf(who){return who==='ghost'?G.ghost:G.st}
function pxOf(who){return stockPx(co(),gameOf(who).idx)}
function pnlOf(who){const c=co(),px=pxOf(who),sh=STAKE/c.px0,val=sh*px;return {sh,px,val,pl:val-STAKE,pct:(val/STAKE-1)*100}}
/* weekly closes inside each quarter. Display only: each quarter ends exactly on the simulated price,
   and the wiggle in between is a seeded random walk pulled back to that end point. */
function stockPath(who){
  const c=co(),pts=[{t:0,v:c.px0}];let prev=100;
  gameOf(who).hist.forEach((rec,q)=>{
    const end=rec.idx,r=rngFor(G.seed,'tick',who,q),raw=[0];
    for(let i=1;i<=WK;i++)raw.push(raw[i-1]+gauss(r));
    for(let i=1;i<=WK;i++){
      const lin=prev+(end-prev)*i/WK,br=raw[i]-raw[WK]*i/WK;
      pts.push({t:q+i/WK,v:(i===WK?end:Math.max(2,lin+br*prev*0.011))*c.px0/100});
    }
    prev=end;
  });
  return pts;
}
function niceTicks(lo,hi,n){const raw=(hi-lo)/n,mag=Math.pow(10,Math.floor(Math.log10(raw))),f=raw/mag,s=(f<1.5?1:f<3?2:f<7?5:10)*mag,out=[];for(let v=Math.ceil(lo/s)*s;v<=hi+1e-9;v+=s)out.push(v);return out}
function stockChart(){
  const nar=(window.innerWidth||800)<600,c=co(),N=D().quarters,W=nar?360:680,H=nar?230:250,L=nar?46:56,R=12,T=14,B=28,FS=nar?11:12;
  const you=stockPath('st'),gh=stockPath('ghost');
  const vs=you.concat(gh).map(p=>p.v).concat([c.px0]);
  let lo=Math.min.apply(null,vs),hi=Math.max.apply(null,vs);const pad=(hi-lo)*0.14||c.px0*0.06;lo=Math.max(0,lo-pad);hi+=pad;
  const X=t=>L+(t/N)*(W-L-R),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  const fv=v=>'$'+(v>=100?v.toFixed(0):v>=20?v.toFixed(1):v.toFixed(2));
  const eu=you[you.length-1].v,eg=gh[gh.length-1].v;
  let h='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Share price by week. You: '+fmtPx(eu)+'. '+esc(c.ceoLast)+': '+fmtPx(eg)+'. Started at '+fmtPx(c.px0)+'.">';
  for(const v of niceTicks(lo,hi,4))h+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(L-7)+'" y="'+(Y(v)+4).toFixed(1)+'" text-anchor="end" font-size="'+FS+'" fill="var(--muted)" font-family="Geist Mono, monospace">'+fv(v)+'</text>';
  h+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(c.px0).toFixed(1)+'" y2="'+Y(c.px0).toFixed(1)+'" stroke="var(--muted)" stroke-dasharray="4 4"/>';
  for(let i=0;i<=N;i+=nar?Math.ceil(N/3):Math.max(1,Math.round(N/6)))h+='<text x="'+X(i).toFixed(1)+'" y="'+(H-9)+'" text-anchor="'+(i===N?'end':'middle')+'" font-size="'+FS+'" fill="var(--muted)" font-family="Geist Mono, monospace">'+(i===0?'start':qLabel(i-1))+'</text>';
  const line=(pts,col,w,dash)=>'<polyline points="'+pts.map(p=>X(p.t).toFixed(1)+','+Y(p.v).toFixed(1)).join(' ')+'" fill="none" stroke="'+col+'" stroke-width="'+w+'" stroke-linejoin="round" stroke-linecap="round"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
  h+=line(gh,'var(--ghost)',2,'6 4')+line(you,'var(--accent)',2.6);
  const ex=X(you[you.length-1].t);
  h+='<circle cx="'+ex.toFixed(1)+'" cy="'+Y(eg).toFixed(1)+'" r="3.5" fill="var(--ghost)"/><circle cx="'+ex.toFixed(1)+'" cy="'+Y(eu).toFixed(1)+'" r="4.2" fill="var(--accent)"/>';
  return h+'</svg>';
}
function raceGap(){const c=co(),d=pxOf('st')-pxOf('ghost');return {d,pts:G.st.idx-G.ghost.idx,txt:(d>=0?'You lead ':'You trail ')+c.ceoLast+' by '+usd(Math.abs(d),2)+' a share'}}
function raceTable(){
  const c=co(),a=G.st,b=G.ghost,P=(x,y,fmt,better,lab)=>{
    const d=x-y,win=Math.abs(d)<1e-6?0:(d>0?1:-1)*better;
    return '<tr><td>'+lab+'</td><td class="n">'+fmt(x)+'</td><td class="n">'+fmt(y)+'</td><td class="n '+(win>0?'up':win<0?'down':'faint')+'">'+(win>0?'You':win<0?esc(c.ceoLast):'Even')+'</td></tr>'};
  const sa=scorecard(a,c).overall,sb=scorecard(b,c).overall,n0=v=>v.toFixed(0),n1=v=>v.toFixed(1);
  let h='<div class="tblwrap"><table class="tbl race"><thead><tr><th>Right now</th><th>You</th><th>'+esc(c.ceoLast)+'</th><th>Ahead</th></tr></thead><tbody>';
  h+=P(pxOf('st'),pxOf('ghost'),v=>fmtPx(v),1,'Stock price');
  h+=P(a.rev,b.rev,fmtB,1,'Sales this quarter');
  h+=P(curMargin(a),curMargin(b),v=>v.toFixed(1)+'%',1,'Profit per sale');
  h+=P(a.cash,b.cash,fmtB,1,'Cash in the bank');
  h+=P(a.debt,b.debt,fmtB,-1,'Debt owed');
  h+=P(a.meters.brd,b.meters.brd,n0,1,'Board support');
  h+=P(a.meters.cus,b.meters.cus,n0,1,'Customer happiness');
  h+=P(a.meters.emp,b.meters.emp,n0,1,'Employee morale');
  h+=P(sa,sb,n0,1,'Overall score, 0 to 100');
  return h+'</tbody></table></div>';
}
function pnlBlock(){
  const c=co(),m=pnlOf('st'),g=pnlOf('ghost');
  const cell=(k,v,sub,cls)=>'<div class="pc"><span class="k">'+k+'</span><b class="'+(cls||'')+'">'+v+'</b>'+(sub?'<span class="sub">'+sub+'</span>':'')+'</div>';
  let h='<div class="pnl">';
  h+=cell('You put in',usd(STAKE),'on day one, at '+fmtPx(c.px0)+' a share');
  h+=cell('Worth now',usd(m.val),fmtPx(m.px)+' a share');
  h+=cell('Your profit or loss',sUsd(m.pl)+' ('+fmtPct(m.pct)+')','',m.pl>=0?'up':'down');
  h+=cell(esc(c.ceoLast)+'’s path would be',usd(g.val),sUsd(g.pl)+' ('+fmtPct(g.pct)+')',g.pl>=0?'up':'down');
  return h+'</div>';
}
function stockBlock(){
  const c=co(),m=pnlOf('st'),gap=raceGap(),n=G.st.hist.length;
  let h='<div class="stock"><div class="stock-top"><div><div class="k">'+esc(c.ticker)+' share price'+(n?'':', at the start')+'</div><div class="px">'+fmtPx(m.px)+' <span class="'+(m.pct>=0?'up':'down')+'">'+(m.pct>=0?'▲ ':'▼ ')+fmtPct(m.pct).replace(/^[+−]/,'')+'</span></div></div>';
  h+='<span class="pill '+(gap.d>=0?'up':'down')+'">'+(n?esc(gap.txt):'Neck and neck with '+esc(c.ceoLast))+'</span></div>';
  h+='<div class="chartbox">'+stockChart()+'</div>';
  h+='<div class="legend"><span><i style="border-color:var(--accent)"></i>You</span><span><i style="border-color:var(--ghost);border-top-style:dashed"></i>'+esc(c.ceo)+'’s announced plan</span><span><i style="border-color:var(--muted);border-top-style:dashed"></i>Starting price</span></div>';
  return h+'</div>';
}
function stockNote(){return '<p class="note">Starting price is the real close on '+PX_ASOF+'. After that the price follows how your decisions play out in the game, so it is a score you can read like a stock, not a forecast. Dividends are not counted. Not investment advice.</p>'}
function timelineHtml(){
  const c=co(),N=D().quarters,hist=G.st.hist,gh=G.ghost.hist;
  if(!hist.length)return '<p class="note">Your first quarter will show up here.</p>';
  let h='<ol class="tl">';
  hist.forEach((r,i)=>{
    const g=gh[i],l=G.log[i],ev=G.plan.quarters[i].event,pu=stockPx(c,r.idx),pg=stockPx(c,g.idx),ahead=pu>=pg;
    let same=0,tot=0,rows='';
    if(l)for(const cid in l.ch.cards){
      const cd=CARD[cid],yi=l.ch.cards[cid],gi=l.gch.cards[cid];tot++;if(yi===gi)same++;
      rows+='<li><b>'+esc(cd.title)+'</b><span>You: '+esc(cd.opts[yi].l)+'</span><span>'+esc(c.ceoLast)+': '+(yi===gi?'<i>same call</i>':esc(cd.opts[gi].l))+'</span></li>';
    }
    h+='<li class="tl-i '+(ahead?'up':'down')+'"><details><summary><span class="tl-q">'+qLabel(i)+'</span><span class="tl-px">'+fmtPx(pu)+' <small class="'+(r.ret>=0?'up':'down')+'">'+fmtPct(r.ret)+'</small></span><span class="tl-gap '+(ahead?'up':'down')+'">'+(ahead?'You +':esc(c.ceoLast)+' +')+usd(Math.abs(pu-pg),2)+'</span></summary>';
    h+='<div class="tl-body">';
    if(ev)h+='<p class="tl-ev"><b>'+(EV[ev].opts?'Event: ':'Happened: ')+'</b>'+esc(EV[ev].title)+'</p>';
    h+='<p class="note">'+esc(c.ceoLast)+' closed the quarter at '+fmtPx(pg)+'. '+(tot?'You made the same call as '+esc(c.ceoLast)+' on '+same+' of '+tot+' decisions.':'No big decisions this quarter.')+'</p>';
    if(rows)h+='<ul class="tl-dec">'+rows+'</ul>';
    h+='</div></details></li>';
  });
  const left=N-hist.length;
  if(left>0&&G.status==='play')h+='<li class="tl-i now"><div class="tl-next"><span class="tl-q">'+qLabel(hist.length)+'</span><span>Next up, '+left+' quarter'+(left>1?'s':'')+' to go</span></div></li>';
  return h+'</ol>';
}
function deskHtml(){
  const c=co();
  let h='<div class="desk-back" data-act="deskx"></div><div class="desk-panel" role="dialog" aria-modal="true" aria-labelledby="desk-t" tabindex="-1">';
  h+='<div class="desk-head"><div class="dh-id">'+logo(c.id,'sm',1)+'<div><div class="kicker">Live tracker</div><h2 id="desk-t" class="h2">'+(PL()?esc(plFirst(PL().name)):'You')+' vs '+esc(c.ceo)+'</h2></div></div><button class="btn sec" data-act="deskx" id="deskclose">Close</button></div>';
  h+='<div class="stack">'+stockBlock()+'<section class="stack tight"><h3 class="h3">Your stock, if you had owned it</h3>'+pnlBlock()+stockNote()+'</section>';
  h+='<section class="stack tight"><h3 class="h3">Live scoreboard</h3>'+raceTable()+'</section>';
  h+='<section class="stack tight"><h3 class="h3">Timeline</h3><p class="note">Tap a quarter to see the decisions behind it.</p>'+timelineHtml()+'</section></div></div>';
  return h;
}
let deskFrom=null;
function renderDesk(){const el=document.getElementById('desk');if(!el)return;if(UI.desk&&G){el.innerHTML=deskHtml();el.hidden=false}else{el.innerHTML='';el.hidden=true}}
function openDesk(){if(!G)return;deskFrom=document.activeElement;UI.desk=true;renderDesk();document.body.classList.add('noscroll');const p=document.querySelector('#desk .desk-panel');if(p)p.focus()}
function closeDesk(){UI.desk=false;renderDesk();document.body.classList.remove('noscroll');if(deskFrom&&deskFrom.focus&&document.contains(deskFrom))deskFrom.focus();deskFrom=null}
document.addEventListener('keydown',e=>{
  if(!UI.desk)return;
  if(e.key==='Escape'){closeDesk();return}
  if(e.key==='Tab'){const f=[].slice.call(document.querySelectorAll('#desk button,#desk summary,#desk a,#desk [tabindex="-1"]')).filter(x=>x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];
    if(e.shiftKey&&(document.activeElement===a||document.activeElement.classList.contains('desk-panel'))){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});
function faceCredits(){
  let h='<details class="fold"><summary>Photo and logo credits</summary><div class="stack tight"><ul class="list">';
  for(const x of Object.values(CO)){
    const f=FACE_CREDIT[x.id];
    h+='<li><b>'+esc(x.ceo)+':</b> '+(f?'photo by '+esc(f.by)+', '+ext(f.url,esc(f.lic)):'no freely licensed photo is available, so initials are shown')+'. '+esc(x.name)+' logo: '+ext(LOGO_CREDIT[x.id],'file on Wikimedia Commons')+'.</li>';
  }
  return h+'</ul><p class="note">Company names and logos belong to their owners and appear here only to identify the companies. The people shown are the real leaders of each company; the executives and analysts who advise you in the game are fictional, and their portraits are illustrations.</p></div></details>';
}


/* ---------- scoreboard band ---------- */
const MARK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 13h17M7 13v8M17 13v8M7 17.5h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>';
function renderBar(){
  const onBoard=UI.screen==='board';
  const inGame=G&&UI.screen!=='home'&&!onBoard;
  const bco=onBoard?UI.board.co:inGame?G.coId:UI.setup.co;
  let h='<div class="wrap"><div class="row1"><button class="brand" data-act="home" aria-label="Pseudo CEO, home">'+MARK+'Pseudo CEO</button><span class="grow"></span>';
  if(!inGame&&NET.ok&&!onBoard)h+='<button class="bandbtn" data-act="board">Leaderboard</button>';
  if(onBoard)h+='<button class="bandbtn" data-act="home">Back</button>';
  if(inGame)h+='<span class="dn" style="font-size:13.5px;opacity:.75">'+esc(D().name)+'</span><button class="bandbtn" data-act="desk">Tracker</button><button class="bandbtn" data-act="home">Exit</button>';
  h+='</div>';
  if(onBoard){
    h+='<div class="home-hero"><h1>Leaderboard</h1><p>Every score is replayed on the server before it counts. Ranked by points ahead of the real playbook in the same scenario. <b>Finish a game to post yours.</b></p></div>';
  }else if(!inGame){
    h+='<div class="home-hero"><h1>Be the pseudo CEO.</h1><p>Run Intel, Boeing, UnitedHealth, Nike or Kraft Heinz from where they actually stand today. Every starting number comes from their SEC filings. <b>Then see how your quarters compare with what the real CEO did.</b></p></div>';
  }else h+=scoreboard();
  if(!inGame||onBoard||UI.dash||UI.screen==='brief'||UI.screen==='debrief')h+=credit(bco);
  h+='</div>';
  $bar.className='band ph-'+bco;
  $bar.innerHTML=h;
}
function stageLabel(){
  const pq=G.plan.quarters[G.q],n=(pq?pq.cards.length:0)+1;
  return ({story:'Why it is struggling',fired:'Fired',brief:'Briefing',card:'Decision '+(UI.card+1)+' of '+n,alloc:'Decision '+n+' of '+n,results:'Results',call:'Earnings call'})[UI.screen]||'';
}
function scoreboard(){
  const c=co(),st=G.st,d=D(),P=isSimple(),F=isFull(),mg=curMargin(st);
  const debrief=UI.screen==='debrief';
  const shownQ=Math.max(0,Math.min((UI.screen==='results'||UI.screen==='call'||UI.screen==='fired')?G.q-1:G.q,d.quarters-1));
  const pm=pnlOf('st'),gp=raceGap();
  let h='<div class="co-line"><div class="co-id">'+logo(c.id,'md',1)+'<div><div class="co-name">'+c.name+'</div><div class="co-sub">'+(PL()?plCEO()+', ':'')+(debrief?(PL()?'final results':'Final results'):qLabel(shownQ)+', '+qMonths(shownQ))+'</div></div></div>';
  h+='<div class="score"><div class="n">'+fmtPx(pm.px)+'</div><div class="k">'+esc(c.ticker)+' stock, '+fmtPct(pm.pct)+' since you started</div>'+(st.hist.length?'<div class="k gap '+(gp.d>=0?'up':'down')+'">'+esc(gp.txt)+'</div>':'')+'</div></div>';
  /* quarter track: one block per quarter, filled as played, coral when the index fell */
  h+='<div class="track-wrap"><div class="track" aria-label="Quarter '+Math.min(G.q+1,d.quarters)+' of '+d.quarters+'">';
  for(let i=0;i<d.quarters;i++){
    const r=st.hist[i];
    const cls=r?('done'+(r.ret<0?' neg':'')):(i===G.q&&G.status==='play'?'now':'');
    h+='<i class="'+cls+'" title="'+qLabel(i)+(r?': index '+r.idx.toFixed(1):'')+'"></i>';
  }
  const played=st.hist.length;
  h+='</div><div class="k2"><span>'+(debrief?played+' of '+d.quarters+' quarters played':'Quarter '+Math.min(G.q+(UI.screen==='results'||UI.screen==='call'||UI.screen==='fired'?0:1),d.quarters)+' of '+d.quarters+' <b>'+stageLabel()+'</b>')+(G.rewinds>0&&!debrief?'. '+G.rewinds+' rewind'+(G.rewinds>1?'s':'')+' left':'')+'</span>'+(debrief?'':'<button class="bandbtn sm" data-act="dash" aria-expanded="'+UI.dash+'">'+(UI.dash?'Fewer numbers':'More numbers')+'</button>')+'</div></div>';
  if(debrief)return h;
  const b=st.meters.brd;
  h+='<div class="figs">';
  h+='<div class="fig"><div class="k">'+(P?'Cash in the bank':'Cash')+'</div><div class="v">'+fmtB(st.cash)+'</div></div>';
  h+='<div class="fig"><div class="k">Margin</div><div class="v">'+mg.toFixed(1)+'%</div></div>';
  h+='<div class="fig"><div class="k">'+(P?'Debt owed':'Debt')+'</div><div class="v">'+fmtB(st.debt)+'</div></div>';
  h+='<div class="fig"><div class="k">Board</div><div class="v'+(b<35?' warn':'')+'">'+(F?b.toFixed(1):Math.round(b))+'</div></div>';
  h+='</div>';
  if(UI.dash){
    const cell=(t,v,sub)=>'<div><dt>'+t+'</dt><dd>'+v+'</dd>'+(sub?'<div class="sub">'+sub+'</div>':'')+'</div>';
    h+='<div class="dash"><dl class="dgrid">';
    h+=cell('Company score',st.idx.toFixed(F?1:0),'Starts at 100. Stock price is the starting price times score divided by 100.');
    if(P){
      h+=cell('Sales this quarter',fmtB(st.rev),'Money customers paid');
      h+=cell(esc(c.kpi.plain),kpiFmt(c,st.kpi),esc(c.kpi.plainS));
      h+=cell('Employees',(c.workforce/1000).toFixed(0)+'k','From the '+c.people.asof+' 10-K');
    }else{
      h+=cell('Revenue this quarter',fmtB(st.rev));
      h+=cell(esc(c.kpi.short),kpiFmt(c,st.kpi));
      h+=cell('Employees',c.workforce.toLocaleString('en-US'));
      if(F){const r=lastRec(st);
        h+=cell('Revenue, last 4 quarters',fmtB(ttm(st.revHist)));
        h+=cell('Operating income, last 4 quarters',fmtB(ttm(st.opHist)));
        h+=cell('Net debt to EBITDA',leverage(st,c).toFixed(2)+'x');
        h+=cell('Last free cash flow',r?fmtB(r.fcf):'none yet');
        h+=cell('Street expects this quarter',fmtB(st.expOp));
        h+=cell('Dividend per quarter',fmtB(st.div));}
    }
    h+='</dl><div><h3>'+(P?'How people feel about you, 0 to 100':'Stakeholders, 0 to 100')+'</h3><div class="dgrid" style="margin-top:10px">';
    for(const [k] of METERS){const v=st.meters[k];h+='<div class="meter"'+(P?' title="'+esc(METER_PLAIN[k][1])+'"':'')+'><div class="ml"><span>'+meterName(k)+'</span><b>'+(F?v.toFixed(1):Math.round(v))+'</b></div><div class="bar"><b class="'+(v<35?'low':'')+'" style="width:'+v+'%"></b></div></div>'}
    h+='</div></div><div><h3>Your leadership team and how much they trust you</h3><div class="dgrid" style="margin-top:10px">';
    for(const [k,t] of CAB_ROLES){const m=G.cab[k];
      h+='<div class="meter"><div class="people-row">'+avatar(m.name,k,1)+'<div style="min-width:0"><div style="font-size:14px;font-weight:600">'+esc(m.name)+'</div><div style="font-size:12.5px;opacity:.7">'+esc(t)+'</div></div></div><div class="bar"><b class="'+(m.loyalty<30?'low':'')+'" style="width:'+m.loyalty+'%"></b></div></div>'}
    h+='</div></div></div>';
  }
  return h;
}
function renderHud(){$hud.innerHTML=''}

/* ---------- shared panels ---------- */
function filingsTable(c,open){
  const f=c.filings;
  let h='<details class="fold"'+(open?' open':'')+'><summary>Starting numbers from the SEC filings</summary><div class="stack tight">';
  h+='<p class="note">The game starts from these reported figures. Quarterly flows in the game (depreciation, capital spending, dividends) are the annual figures divided by four.</p>';
  h+='<div class="tblwrap"><table class="tbl"><thead><tr><th>Line</th><th>$ billions</th><th>Filing</th></tr></thead><tbody>';
  for(const r of f.rows)h+='<tr><td>'+esc(r[0])+'</td><td class="n">'+(r[1]<0?'−':'')+Math.abs(r[1]).toFixed(3)+'</td><td>'+ext(r[2]==='k'?f.k[1]:f.q[1],r[2]==='k'?'10-K':'10-Q')+'</td></tr>';
  h+='</tbody></table></div>';
  h+='<div class="links">'+ext(f.k[1],esc(f.k[0]))+ext(f.q[1],esc(f.q[0]))+'</div>';
  if(f.extra)h+='<p class="note">'+esc(f.extra[0])+(f.extra[1]?' '+ext(f.extra[1],'Source'):'')+'</p>';
  if(c.est.length)h+='<p class="note">Not from a filing: '+esc(c.est.join('; '))+'.</p>';
  h+='<p class="note">Interest is modeled at 4.5% a year on total debt and tax at 18%, rather than each company’s exact rate.</p>';
  return h+'</div></details>';
}
function sourcesBlock(c){
  const p=c.people;
  let h='<div class="links">'+ext(p.src,'Latest annual report (10-K)')+ext(p.ir,'Investor relations')+ext('https://www.sec.gov/edgar/browse/?CIK='+p.cik,'All SEC filings');
  if(p.earnings)h+=ext(p.earnings[1],'Next earnings: '+p.earnings[0]);
  return h+'</div>';
}
function peoplePanel(c,jobs){
  const p=c.people;
  let h='<details class="fold people"'+(jobs?' open':'')+'><summary>The real workforce'+(jobs?' this decision touches':'')+'</summary><div class="stack tight">';
  h+='<p class="body">'+c.name+' employs about <b>'+p.employees.toLocaleString('en-US')+'</b> people ('+p.asof+', '+ext(p.src,'10-K')+'). '+esc(p.note)+'</p>';
  if(jobs)h+='<p class="body">At that size, this option means roughly <b>'+jobsFmt(jobs*p.employees)+' jobs</b>. Actual cuts land on real sites and teams like these.</p>';
  h+='<h3 class="h3">Major sites</h3><ul class="sites">';
  for(const s of p.sites)h+='<li><div>'+ext(s[3],esc(s[0]))+(s[2]?'<span class="faint">, '+esc(s[2])+'</span>':'')+'</div><div class="note">'+esc(s[1])+'</div></li>';
  h+='</ul>';
  h+='<h3 class="h3">Recent layoffs</h3><div class="tblwrap"><table class="tbl"><tbody>';
  for(const l of p.layoffs)h+='<tr><td class="n" style="text-align:left">'+esc(l[0])+'</td><td class="t"><b style="color:var(--ink);font-weight:600">'+esc(l[1])+'</b>. '+esc(l[2])+'</td><td>'+ext(l[3],'Source')+'</td></tr>';
  h+='</tbody></table></div>';
  if(p.unions.length){h+='<h3 class="h3">Unions</h3><ul class="list">'+p.unions.map(u=>'<li><b>'+esc(u[0])+':</b> '+esc(u[1])+' '+ext(u[2],'Source')+'</li>').join('')+'</ul>'}
  h+='<p class="note">Headcounts and layoff rounds are real and sourced. Who exactly would be affected in this game is not modeled site by site.</p>';
  return h+'</div></details>';
}

/* ---------- HOME ---------- */
function renderHome(){
  const s=UI.setup,sv=store.get(SAVE),c=CO[s.co];
  let h='<div class="stack enter">';
  if(saveOK(sv)&&(sv.G.status==='play'||(sv.G.call&&!sv.G.call.done)||(sv.UI&&sv.UI.screen==='fired'))){
    const sc=CO[sv.G.coId];
    h+='<section class="section actions" style="justify-content:space-between"><div><h3 class="h3">Game in progress</h3><div><b>'+sc.name+'</b>, '+DIFF[sv.G.diffKey].name+', '+qLabel(Math.min(sv.G.q,DIFF[sv.G.diffKey].quarters-1))+'</div></div><div class="actions"><button class="btn" data-act="resume">Resume</button><button class="btn sec" data-act="discard">Discard</button></div></section>';
  }
  h+='<section class="stack tight"><div class="step"><span class="n">01</span><h2 class="h3">Choose a company</h2></div><div class="grid-co" role="radiogroup" aria-label="Company">';
  for(const x of Object.values(CO)){
    const best=(store.get(BEST)||{})[x.id+':'+s.diff];
    h+='<button class="choice" style="--c:'+HUE[x.id]+'" role="radio" aria-checked="'+(s.co===x.id)+'" data-act="pickco" data-v="'+x.id+'"><span class="thumb th-'+x.id+'" aria-hidden="true">'+logo(x.id,'sm',1)+'</span><span class="t"><span>'+esc(x.sector)+'</span>'+(best?'<span>best '+best.toFixed(0)+'</span>':'')+'</span><span class="n">'+x.name+'</span><span class="s">'+esc(x.dilemma)+'</span><span class="d ceo">'+face(x.id,'xs')+'<span>'+esc(x.ceo)+', CEO</span></span><span class="d">'+(x.workforce/1000).toFixed(0)+'k employees</span></button>';
  }
  h+='</div></section>';
  h+='<section class="section stack tight"><h3 class="h3">'+c.name+' right now</h3><p class="body">'+esc(c.pitch)+'</p><ul class="facts">'+c.facts.map(f=>'<li>'+esc(f[0])+' '+ext(f[1],'Source')+'</li>').join('')+'</ul>'+sourcesBlock(c)+'</section>';
  h+=filingsTable(c,false);
  h+='<section class="stack tight"><div class="step"><span class="n">02</span><h2 class="h3">Choose difficulty</h2></div><div class="grid-3" role="radiogroup" aria-label="Difficulty">';
  for(const d of Object.values(DIFF)){
    h+='<button class="choice" role="radio" aria-checked="'+(s.diff===d.key)+'" data-act="pickdiff" data-v="'+d.key+'"><span class="t"><span>'+({easy:'Easy',medium:'Medium',hard:'Hard'})[d.key]+'</span><span>'+d.time.replace('About ','about ')+'</span></span><span class="n">'+d.name+'</span><span class="d">'+d.quarters+' quarters. '+esc(d.blurb)+'</span></button>';
  }
  h+='</div></section>';
  h+='<section class="stack tight"><div class="step"><span class="n">03</span><h2 class="h3">Take the job</h2></div>';
  h+='<div class="field"><label for="seed">Scenario code. Share it so a friend faces the same events.</label><input id="seed" value="'+esc(s.seed)+'" autocomplete="off" spellcheck="false"><p class="note" id="seednote" aria-live="polite"></p></div>';
  {const p=PL();
  h+='<p class="who">'+(p?'You are <b>'+esc(p.name)+'</b>, taking the chair at <b>'+esc(c.name)+'</b>. <button class="link" data-act="plclear">Not you?</button>':'You will enter your name and email next, then take the chair at <b>'+esc(c.name)+'</b>.')+'</p>';}
  h+='<div class="actions"><button class="btn" data-act="start">'+(PL()?esc(plFirst(PL().name))+', start as CEO of '+c.name:'Start as CEO of '+c.name)+'</button></div></section>';
  h+='<details class="fold"><summary>How it works</summary><ul class="list">';
  h+='<li>Each company starts from its latest annual and quarterly reports filed with the SEC. Every starting number links to its filing.</li>';
  h+='<li>You play as the real CEO. You make the calls that CEO faced, one quarter at a time, and watch the company’s stock price react. A live tracker compares you with what the real CEO actually did.</li>';
  h+='<li>Before quarter 1 you read a one-page briefing on <b>why the company is struggling</b>, in plain English, with a source link for every number.</li>';
  h+='<li>The right call depends on your situation. A big bet is smart when you have cash to spare and reckless when cash is tight. Each choice shows what your situation means for it.</li>';
  h+='<li>Five named executives advise you. They remember when you overrule them, and an advisor who loses your trust resigns. The advisors and analysts are fictional.</li>';
  h+='<li>After each quarter you take questions on the earnings call. Overselling bad news buys a quarter of calm and costs you if the next quarter misses.</li>';
  h+='<li>Layoff decisions show the company’s real headcount, sites, unions and recent layoff rounds, with sources.</li>';
  h+='<li>The <b>stock price</b> starts at the real closing price on '+PX_ASOF+'. After that it moves with how your decisions play out in a simplified model of the company, so it is a score you can read like a stock, not a forecast. The <b>real playbook</b> plays the same scenario using the choices leadership actually announced.</li>';
  h+='<li>Photos and logos come from Wikimedia Commons. Credits are listed below.</li>';
  h+='<li>Leaderboard: after you finish a game you can post it under a name you choose. The server hands out each ranked scenario code and replays your choices to confirm the score, so numbers cannot be typed in. Only your name and result are saved.</li>';
  h+='<li>Privacy: the site counts anonymous plays (which company and difficulty were picked, how far games got) and unique players using a random ID kept in your browser. These counts hold no names or emails. Separately, the welcome screen asks for your name and email. They are stored privately for the site owner, who may write to you about his work. It is never shown to other players, sold or shared, and you can have it removed on the <a href="/privacy" target="_blank" rel="noopener">privacy page</a>. Do Not Track turns off the anonymous counts only. An hour-long abuse limit uses a scrambled form of your connection address that is not kept.</li><li>Simulation only; not investment advice.</li></ul></details>';
  h+='<p class="note">Intel, Boeing, UnitedHealth Group, Nike and Kraft Heinz are real companies used as settings. They are not affiliated with this game and have not endorsed it. Logos belong to their owners. The newspaper, advisors and analysts are fictional. Simulation only; not investment advice.</p>';
  h+='<p class="note"><a href="/method" target="_blank" rel="noopener">How the model works</a> &middot; <a href="/privacy" target="_blank" rel="noopener">Privacy</a></p>';
  h+=faceCredits();
  h+='</div>';
  $app.innerHTML=h;seedNote();
}

/* ---------- start / quarter ---------- */
async function startGame(){
  const s=UI.setup;
  if(s.auto&&!isRanked(s.seed)&&seedP)await Promise.race([seedP,new Promise(r=>setTimeout(r,1500))]);
  const inp=document.getElementById('seed');
  if(inp&&inp.value.trim()&&!s.auto)s.seed=inp.value.trim().slice(0,40);
  G=newGame(s.co,s.diff,s.seed);
  UI.card=0;UI.picks={};UI.alloc=null;UI.last=null;UI.answers=[];UI.callRes=null;UI.dash=false;
  NET.ev('start',{co:s.co,d:s.diff});
  go('welcome');
}
function quarterCards(){return G.plan.quarters[G.q].cards}
function defaultAlloc(){return {reinvest:'hold',ret:G.st.div>0?'hold':'none',debt:'hold',guide:'maintain'}}

function faceLine(id){const f=FACE_CREDIT[id];return f?'<p class="note">Photo of '+esc(CO[id].ceo)+': '+esc(f.by)+', '+ext(f.url,esc(f.lic))+'.</p>':'<p class="note">No freely licensed photo of '+esc(CO[id].ceo)+' is available, so initials are shown.</p>'}
/* the player: name and email collected on the welcome screen, kept on this device and sent once to the site owner */
const PKEY='pseudoceo.player';
function PL(){const p=store.get(PKEY);return p&&typeof p.name==='string'&&p.name.trim().length>=2?p:null}
function plClean(n){return String(n||'').replace(/\s+/g,' ').trim()}
function plNameOK(n){n=plClean(n);return n.length>=2&&n.length<=40&&/^\p{L}[\p{L}\p{M} .'’-]*$/u.test(n)}
function plEmailOK(e){e=String(e||'').trim();return e.length<=120&&/^[^\s@<>(),;:"\\]+@[^\s@<>(),;:"\\]+\.[^\s@<>(),;:"\\.]{2,}$/.test(e)}
function plLast(n){const w=plClean(n).split(' ').filter(Boolean);return w.length?w[w.length-1]:''}
function plFirst(n){const w=plClean(n).split(' ').filter(Boolean);return w.length?w[0]:''}
function plCEO(){const p=PL();return p?'CEO '+plLast(p.name):''}
/* a starting leaderboard name that passes the server rules (letters, numbers, space . _ -, 2 to 16) */
function plBoardName(){const p=PL();if(!p)return '';const f=plFirst(p.name).normalize('NFD').replace(/[^A-Za-z0-9]/g,''),l=plLast(p.name).normalize('NFD').replace(/[^A-Za-z0-9]/g,'');
  const n=(f+(l&&l!==f?' '+l[0]+'.':'')).trim();return n.length>=2?n.slice(0,16):''}
let leadBusy=false;
async function sendLead(){
  const p=store.get(PKEY);if(!p||p.sent||!p.email||!NET.ok||leadBusy)return false;
  leadBusy=true;let ok=false;
  try{await NET.post('/api/leads',{name:p.name||'Player',email:p.email,updates:!!p.updates,co:G?G.coId:undefined,d:G?G.diffKey:undefined});const q=store.get(PKEY);if(q&&q.email===p.email){q.sent=true;store.set(PKEY,q)}ok=true}
  catch(e){/* try again on the next start; play is never blocked */}
  leadBusy=false;return ok;
}
/* After a game: an optional, plainly worded way to leave an email. */
function contactBlock(){
  if(!NET.ok)return '';
  const p=store.get(PKEY)||{};
  let h='<section class="section stack tight" id="contact"><h3 class="h3">A note from the developer</h3>';
  if(p.email){
    return h+'<p class="body">Thanks, your email is saved. You can have it removed any time on the <a href="/privacy" target="_blank" rel="noopener">privacy page</a>.</p></section>';
  }
  h+='<p class="body">I’m Cortland Clarke. I built this game on my own while I look for work in finance. If you leave your email, I may write to you once or twice about my work or roles I’m after. I will not sell or share it, and you can have it removed any time on the <a href="/privacy" target="_blank" rel="noopener">privacy page</a>. Leaving it is entirely optional. Here is <a href="https://cortlandclarke.com" target="_blank" rel="noopener">my site</a>.</p>';
  h+='<form id="contactform" novalidate>';
  if(!PL())h+='<div class="field"><label for="ctname">Your name</label><input id="ctname" maxlength="40" autocomplete="name" spellcheck="false" placeholder="First and last name"></div>';
  h+='<div class="field"><label for="ctemail">Your email</label><input id="ctemail" type="email" inputmode="email" maxlength="120" autocomplete="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com"><p class="ferr" id="ctemail-e" role="alert"></p></div>';
  h+='<label class="chk"><input type="checkbox" id="ctupd"><span>Also email me when new companies and features are added.</span></label>';
  h+='<div class="actions"><button class="btn" type="submit">Leave my email</button></div><p class="note" id="ctmsg" role="status"></p></form></section>';
  return h;
}
async function submitContact(){
  const m=document.getElementById('ctemail'),er=document.getElementById('ctemail-e'),nm=document.getElementById('ctname');
  const email=m.value.trim(),name=nm?plClean(nm.value):(PL()?PL().name:'');
  if(!plEmailOK(email)){er.textContent='Enter a valid email, like you@example.com.';m.setAttribute('aria-invalid','true');m.focus();return}
  if(nm&&!plNameOK(name)){er.textContent='Enter your name, at least 2 letters.';nm.focus();return}
  er.textContent='';m.removeAttribute('aria-invalid');
  const upd=!!document.getElementById('ctupd').checked,btn=document.querySelector('#contactform button[type=submit]');
  btn.disabled=true;flash('ctmsg','Saving…');
  store.set(PKEY,Object.assign({},store.get(PKEY)||{},{name,email,updates:upd,sent:false}));
  const ok=await sendLead();
  if(ok){const sec=document.getElementById('contact');if(sec)sec.innerHTML='<h3 class="h3">A note from the developer</h3><p class="body">Thanks, your email is saved. You can have it removed any time on the <a href="/privacy" target="_blank" rel="noopener">privacy page</a>.</p>'}
  else{flash('ctmsg','Could not save it right now. Try again in a minute.','down');btn.disabled=false}
}
/* ---------- WELCOME ---------- */
function renderWelcome(){
  const c=co(),d=D(),pxs=fmtPx(c.px0),p=PL();
  let h='<div class="stack enter welcome">';
  h+='<div class="wl-hero">'+logo(c.id,'lg')+'<div class="kicker">Welcome to the corner office</div><h1 class="h1" id="wl-h">'+(p?'Welcome, CEO '+esc(plLast(p.name))+'.':'Welcome, future CEO.')+'</h1></div>';
  h+='<p class="lede">For the next '+d.quarters+' quarters you run '+esc(c.name)+' from today’s numbers. '+esc(c.ceoLast)+'’s announced plan plays through the same scenario beside you, so you can see who does better.</p>';
  const needMail=NET.ok;
  h+='<form id="lead" class="wl-form" novalidate autocomplete="on"><p class="wl-ask">'+(p?'Welcome back. Check your details, then take the chair.':'Before you take the job, tell us who is taking it.')+'</p>';
  h+='<div class="field"><label for="plname">Your name</label><input id="plname" name="name" maxlength="40" autocomplete="name" autocapitalize="words" spellcheck="false" aria-describedby="plname-e" value="'+esc(p?p.name:'')+'" placeholder="First and last name"><p class="ferr" id="plname-e" role="alert"></p></div>';
  if(needMail){
    h+='<div class="field"><label for="plemail">Your email</label><input id="plemail" name="email" type="email" inputmode="email" maxlength="120" autocomplete="email" autocapitalize="off" spellcheck="false" aria-describedby="plemail-e" value="'+esc(p&&p.email?p.email:'')+'" placeholder="you@example.com"><p class="ferr" id="plemail-e" role="alert"></p></div>';
    h+='<label class="chk"><input type="checkbox" id="plupd"'+(p&&p.updates?' checked':'')+'><span>Also email me when new companies and features are added.</span></label>';
    h+='<p class="note">Your name goes on your scorecard and in the newspaper if the board fires you. I’m Cortland Clarke, a developer who built this game while looking for work in finance. I save your name and email privately and may write to you about my work or roles I’m after. I won’t sell or share them, and you can have them removed any time on the <a href="/privacy" target="_blank" rel="noopener">privacy page</a>.</p>';
  }else h+='<p class="note">Your name goes on your scorecard and in the newspaper if the board fires you. It stays on this device.</p>';
  h+='<button class="btn" type="submit">Take the chair</button></form>';
  h+='<div class="wl-card">'+face(c.id,'xl')+'<div><div class="kicker" style="margin:0 0 4px">You take the chair of</div><div class="wl-name">'+esc(c.ceo)+'</div><div class="wl-role">'+esc(c.ceoRole)+' since '+esc(c.ceoSince)+'</div><div class="wl-stock">'+esc(c.ticker)+' closed at <b>'+pxs+'</b> on '+PX_ASOF+'</div></div></div>';
  h+='<ul class="wl-list"><li><b>The stock price shows how you are doing.</b> It starts at '+pxs+'. Put $10,000 in on day one and watch it grow or shrink with your decisions. Your final score also counts cash and debt, customers, people and trust, and stock is the biggest piece at 35%.</li>';
  h+='<li><b>A live tracker shows how you compare</b> with '+esc(c.ceoLast)+'’s announced plan, quarter by quarter. Whoever ends with the higher overall score wins.</li>';
  h+='<li><b>It takes '+d.time.replace('About ','about ')+'.</b> First you read why the company is struggling, then you run it one quarter at a time.</li></ul>';
  h+='<p class="note">'+esc(c.pitch)+'</p>';
  h+=faceLine(c.id)+'</div>';
  $app.innerHTML=h;
}
function enterGame(){
  const n=document.getElementById('plname');if(!n)return;
  const en=document.getElementById('plname-e'),name=plClean(n.value),badN=!plNameOK(name);
  en.textContent=badN?'Enter your name, at least 2 letters.':'';
  n.setAttribute('aria-invalid',badN);
  if(badN){n.focus();return}
  const old=store.get(PKEY)||{};
  const m=document.getElementById('plemail');
  if(m){
    const email=m.value.trim(),em=document.getElementById('plemail-e'),bad=!plEmailOK(email);
    em.textContent=bad?'Enter a valid email, like you@example.com.':'';
    m.setAttribute('aria-invalid',bad);
    if(bad){m.focus();return}
    const upd=!!(document.getElementById('plupd')||{}).checked;
    const same=old.email&&old.email.toLowerCase()===email.toLowerCase()&&old.name===name&&!!old.updates===upd;
    store.set(PKEY,Object.assign({},old,{name,email,updates:upd,sent:same?!!old.sent:false}));
    sendLead();/* sent in the background; if it fails it is retried on the next page load */
  }else store.set(PKEY,Object.assign({},old,{name}));
  go('story');
}
/* ---------- WHY IS THE COMPANY STRUGGLING (replaces the old Strategy room) ---------- */
/* Each point is [title, plain-English text, source refs, optional extra]. 'f0'.. point at c.facts; 'r:<force>' at the five-forces evidence links. */
const STORY={
  intc:{head:'Intel’s chips are selling again, but the factories it built to make chips for other companies lose billions.',pts:[
    ['The chip business is coming back.','Intel made $16.1 billion in the quarter ended June 27, up 25% from a year ago.',['f0']],
    ['Making chips for other companies is the money pit.','Intel Foundry, the part that runs the factories, lost $2.1 billion in one quarter on $5.8 billion of sales.',['f1']],
    ['Almost nobody outside Intel is buying.','Only about $293 million of that factory revenue came from outside customers. Nearly all the rest came from Intel’s own chip designers.',['f2']],
    ['The next big bet has no announced volume customer.','Intel’s next chip-making process, called 14A, is aimed at 2028. Intel has not announced a signed volume commitment from an outside customer.',['f3']],
    ['Rivals are strong on every side.','AMD fights for PC and server chips, Nvidia leads in AI, and TSMC leads in making chips for other companies. Intel also buys its most advanced machines from a single supplier, ASML.',['r:rivalry','r:suppliers']]],
    job:'Keep spending billions on factories that lose money, or protect cash for the chip products that are finally selling?'},
  ba:{head:'Boeing is building planes faster again, but it still loses money and one quality slip could undo the progress.',pts:[
    ['It is still losing money.','Boeing had $24.56 billion in sales in the quarter ended June 30 and still lost money: $0.76 a share on a core (adjusted) basis, or $0.67 under standard accounting rules.',['f0']],
    ['Production is climbing.','Boeing began moving the 737 MAX to 47 planes a month in the quarter ended June 30.',['f1']],
    ['Cash is the scoreboard.','Boeing expects to keep only $1 billion to $3 billion of free cash this year, which is the cash left after paying its bills and buying equipment. It calls $10 billion attainable as it works through its backlog.',['f2']],
    ['Customers are waiting, but not forever.','Commercial orders on hand come to $597 billion, more than 6,200 planes. Delays let airlines ask for payback or cancel. The first 777X is not due until 2027.',['f3','r:buyers']],
    ['Boeing depends on a few suppliers.','Many parts come from a single source and take a long time to approve. Engine delays hold up the 787, and Boeing bought Spirit to get more control.',['r:suppliers']]],
    job:'Build faster to bring in cash, or slow down to protect quality?'},
  unh:{head:'UnitedHealth is recovering from a cyberattack and missed targets. Its profit is coming back, partly because it let customers go.',pts:[
    ['Profit is bouncing back.','Operating profit was $6.6 billion last quarter, up from $4.3 billion a year ago. UnitedHealth raised its 2026 forecast to at least $20.50 a share in adjusted earnings.',['f3','f1']],
    ['It is paying out less of each premium dollar.','On $112.69 billion of sales, its medical cost ratio fell to 88.4% from 89.9%, helped by $610 million of favorable reserve adjustments. That ratio is the share of premiums spent on patients’ care, so lower is better for UnitedHealth.',['f0']],
    ['But it is getting smaller.','The number of seniors it serves through Medicare Advantage, including some programs inside Medicaid, is down 935,000 since the end of 2025. Reported Medicare Advantage enrollment is about 7.6 million, down from 8.4 million a year ago.',['f2','r:rivalry']],
    ['The government sets the rules.','Premiums from the Medicare agency are about 44% of revenue, and the government sets the rates, so a change in Washington can move the whole business.',['r:buyers']]],
    job:'Keep winning back profit by dropping unprofitable members, or grow again and risk the margin?'},
  nke:{head:'Nike’s sales are falling. Running is growing, but lifestyle sneakers and China are shrinking and the company is changing its plan.',pts:[
    ['Sales fell again.','Revenue fell 4% to $11.2 billion last quarter. In Greater China it fell 26% once currency is stripped out.',['f0','f1']],
    ['Profit held up only because costs fell.','Profit before tax was flat at $921 million on 4% less revenue. Gross margin rose 0.6 points and selling and admin costs fell 3%.',['f0']],
    ['More decline is expected.','Nike told investors to expect fiscal 2027 sales to fall at a high single digit rate, with adjusted earnings of $1.15 to $1.35 a share. Last year it earned $2.10, helped by a one-time tariff refund.',['f2','f4']],
    ['It is reversing a big bet.','Nike leaned toward selling straight to shoppers through its own stores and app. Last quarter Nike Direct fell 8% and wholesale fell 1% as Nike works with retailers to clear aged shoes, so the company is changing course. A $2.5 billion cost-savings program called Pace is just starting.',['f3']],
    ['Rivals and retailers have the upper hand.','Adidas, New Balance, On and others chase the same shoppers. The top three U.S. retailers make up about 29% of U.S. sales, and tariffs have raised the cost of making shoes.',['r:rivalry','r:buyers','r:suppliers']]],
    job:'Take short-term pain to reset the business, or protect this year’s numbers and risk falling further behind?'},
  khc:{head:'Kraft Heinz sells a little less every year, and its plan to split in two is on hold.',pts:[
    ['Sales are shrinking.','2025 sales were $24.9 billion, down 3.5%. The company wrote down $9.3 billion of what it paid for its brands and businesses, then another $7.4 billion in the second quarter of 2026. Those are paper losses, not cash out the door.',['f0','f3']],
    ['The breakup is paused.','Kraft Heinz planned to split in two, then paused the work in February. It is putting about $700 million this year into marketing, sales, research, product quality and select price moves instead.',['f1']],
    ['More shrinking is expected.','For 2026 it now expects sales to fall 0.5% to 2.0%, not counting business sales and currency swings, with profit of $2.03 to $2.09 a share. That is a better outlook than it gave in February.',['f2']],
    ['The outlook got a little better.','In August Kraft Heinz raised its 2026 sales outlook, even though second-quarter sales fell 1.4% to $6.26 billion.',['f3']],
    ['Stores hold the power.','Walmart alone is about 21% of sales. Store brands fight on price, and health trends could pull shoppers toward fresher food.',['r:buyers','r:rivalry','r:substitutes']]],
    job:'Spend to make the old brands grow again, or protect profit while sales slowly decline?'}
};
function storyLinks(c,refs){
  const out=refs.map(r=>r.startsWith('f')?c.facts[+r.slice(1)][1]:c.strategy.forces[r.slice(2)].src).filter((u,i,a)=>u&&a.indexOf(u)===i);
  return out.map((u,i)=>ext(u,out.length>1?'Source '+(i+1):'Source')).join('');
}
function renderStory(){
  const c=co(),S=STORY[c.id],pxs=fmtPx(c.px0);
  let h='<div class="stack enter story">';
  h+='<div class="wl-hero">'+logo(c.id,'lg')+'<div class="kicker">Before you start. <b>Read this first</b></div><h1 class="h1">Why is '+esc(c.name)+' struggling?</h1></div>';
  h+='<p class="lede">'+esc(S.head)+'</p>';
  h+='<ol class="why">';
  S.pts.forEach((p,i)=>{
    const l=storyLinks(c,p[2]);
    h+='<li><span class="wn" aria-hidden="true">'+(i+1)+'</span><div><h2 class="wt">'+esc(p[0])+'</h2><p>'+esc(p[1])+'</p>'+(l||p[3]?'<div class="links">'+l+(p[3]?'<span class="note">'+esc(p[3])+'</span>':'')+'</div>':'')+'</div></li>';
  });
  h+='</ol>';
  h+='<div class="bright"><div class="kicker">Your job</div><p>'+esc(S.job)+'</p><p class="note">'+esc(c.ticker)+' closed at <b>'+pxs+'</b> on '+PX_ASOF+'. That is your starting score. Every decision from here moves it.</p></div>';
  h+='<p class="note">The numbers come from '+esc(c.name)+'’s filings and news reports. Each link opens the source. The plain-English wording is ours.</p>';
  h+='<div class="actions stick"><span class="grow"></span><button class="btn" data-act="begin">Start Quarter 1</button></div>';
  h+='</div>';
  $app.innerHTML=h;
}

/* ---------- FIRED: a fake newspaper story ---------- */
const PHOTO_DISTRESS={by:'CIPHR Connect',lic:'CC BY 2.0',url:'https://commons.wikimedia.org/wiki/File:Man_Stressed_At_Work.jpg'};
const FIRED_QUOTE={inv:'The market stopped believing the story',brd:'The directors had seen enough',emp:'The people inside the company lost faith in the leadership',cus:'Customers were walking away',reg:'Regulators were closing in',exe:'The company simply could not carry out the plan'};
function firedWorst(){
  let wk='inv',wv=101;
  for(const [k] of METERS){if(k==='brd')continue;const v=G.st.meters[k];if(v<wv){wv=v;wk=k}}
  return wk;
}
function renderFired(){
  const c=co(),d=D(),p=PL(),nm=p?plClean(p.name):'The new CEO',first=p?plFirst(p.name):'The CEO';
  const n=G.log.length,pm=pnlOf('st'),gm=pnlOf('ghost'),fire=d.fire;
  const miss=G.st.hist.filter(r=>r.s<-0.02).length,rec=lastRec(G.st);
  const wk=firedWorst(),an=ANALYSTS[hashStr(G.seed+'|'+G.coId)%ANALYSTS.length];
  const dir=pm.pct<0?'down':'up',ed=1+(hashStr(G.seed+'|'+G.coId)%97);
  const ph=PHOTO_DISTRESS;
  let h='<div class="stack enter">';
  h+='<article class="paper" aria-labelledby="pp-h">';
  h+='<div class="pp-banner" aria-hidden="true">FIRED!</div>';
  h+='<header class="pp-head"><div class="pp-ear"><b>Late Edition</b><span>After '+esc(qLabel(G.firedAt))+' results</span></div><div class="pp-mast">The Pseudo Post</div><div class="pp-ear r"><b>Price</b><span>One lost job</span></div></header>';
  h+='<div class="pp-rule"><span>Business</span><span class="pp-fic">Fictional news from the Pseudo CEO game. Not a real article.</span><span>Vol. 1, No. '+ed+'</span></div>';
  h+='<h1 class="pp-h" id="pp-h">CEO '+esc(nm)+' fired from '+esc(c.name)+'</h1>';
  h+='<p class="pp-deck">The board ran out of patience after '+n+' quarter'+(n>1?'s':'')+'. The stock is '+dir+' '+Math.abs(pm.pct).toFixed(1)+'% since the new chief took over.</p>';
  h+='<div class="pp-grid"><div class="pp-main">';
  h+='<figure class="pp-fig"><div class="pp-photo" role="img" aria-label="A man in a suit sitting with his head in his hands. His face is blurred."></div><figcaption><b>FILE PHOTO.</b> A man in distress. Stock image with the face blurred. It is not '+esc(nm)+' or anyone connected to '+esc(c.name)+'. Photo: '+ext('https://www.ciphr.com',esc(ph.by))+', '+ext(ph.url,esc(ph.lic))+'. Cropped, blurred and made black and white.</figcaption></figure>';
  h+='<p class="pp-by">By the Pseudo Post staff</p>';
  h+='<div class="pp-body">';
  h+='<p><span class="pp-dl">THE BOARD —</span> The board of '+esc(c.name)+' ('+esc(c.ticker)+') voted to remove '+esc(nm)+' as chief executive after '+n+' quarter'+(n>1?'s':'')+' in the job. '+(miss>0?(miss===1?'One quarter':miss+' quarters')+' came in below what Wall Street expected. ':'')+'Directors lost patience with the results.</p>';
  h+='<p>Shares of '+esc(c.name)+' closed at '+fmtPx(pm.px)+', '+dir+' '+Math.abs(pm.pct).toFixed(1)+'% from '+fmtPx(c.px0)+' when '+esc(first)+' started. An investor who put $10,000 into the stock on day one would have '+usd(pm.val)+' left.</p>';
  if(rec)h+='<p>In its last quarter the company sold '+fmtB(rec.rev)+' and '+(rec.op>=0?'kept '+fmtB(rec.op)+' in operating profit':'lost '+fmtB(Math.abs(rec.op))+' running the business')+'. It ended the quarter with '+fmtB(rec.cash)+' in cash.</p>';
  h+='<p>“'+esc(FIRED_QUOTE[wk])+',” said '+esc(an[0])+', an analyst at '+esc(an[1])+'. Both are made up for this game.</p>';
  if(fire)h+='<p>Board support, which measures how much the directors trust the chief executive, sat below '+fire.below+' out of 100 for '+fire.streak+' '+(fire.streak>1?'quarters in a row':'quarter')+'.</p>';
  if(G.st.jobsCut>0)h+='<p>Decisions made during the tenure cut about '+jobsFmt(G.st.jobsCut)+' jobs.</p>';
  h+='<p>In the game’s model of '+esc(c.ceo)+'’s announced plan, the same scenario would have left the stock at '+fmtPx(gm.px)+'.</p>';
  h+='<p>'+esc(first)+' could not be reached for comment. The board has not named a successor.</p>';
  h+='</div></div>';
  h+='<aside class="pp-side">';
  h+='<div class="pp-box"><h2>Stock watch</h2><div class="pp-big">'+fmtPx(pm.px)+'</div><div class="pp-sm">'+esc(c.ticker)+', '+(pm.pct<0?'−':'+')+Math.abs(pm.pct).toFixed(1)+'% since '+esc(first)+' started</div></div>';
  h+='<div class="pp-box"><h2>$10,000 became</h2><div class="pp-big">'+usd(pm.val)+'</div><div class="pp-sm">The real playbook: '+fmtPx(gm.px)+' a share</div></div>';
  h+='<div class="pp-box"><h2>Time in the chair</h2><div class="pp-big">'+n+' of '+d.quarters+'</div><div class="pp-sm">quarters served</div></div>';
  h+='<div class="pp-box"><h2>Weather</h2><div class="pp-sm" style="font-size:15px">Cloudy in the corner office. Chance of layoffs: high.</div></div>';
  h+='</aside></div>';
  h+='<p class="pp-disc"><b>This is fiction.</b> The Pseudo Post is not a real newspaper. The game wrote this page from your results. '+esc(c.name)+' is a real company used as the setting. Nothing here was said or decided by the real company, its board or its leaders. The analyst is invented, and the photo shows no one connected to this story.</p>';
  h+='</article>';
  h+='<div class="actions stick"><button class="btn" data-act="debrief">See your debrief</button>';
  if(G.rewinds>0&&G.snap)h+='<button class="btn sec" data-act="rewind">Undo it: rewind ('+G.rewinds+' left)</button>';
  h+='<button class="btn sec" data-act="lastres">See the final quarter</button></div>';
  h+='</div>';
  $app.innerHTML=h;
}

/* ---------- BRIEFING ---------- */
function renderBrief(){
  const c=co(),q=G.q,pq=G.plan.quarters[q],d=D(),P=isPlain(),SM=isSimple();
  let agendaHtml='<div class="section stack tight"><h3 class="h3">Agenda for this quarter</h3><ol class="agenda">';
  for(const cid of pq.cards){const cd=CARD[cid];agendaHtml+='<li><span>'+esc(cd.title)+'</span><span class="c">'+esc(cd.isEvent?'Response':cd.cat)+'</span></li>'}
  agendaHtml+='<li><span>'+(SM?'Money plan and what you tell Wall Street':'Capital plan and guidance')+'</span><span class="c">'+(SM?'Money plan':'Allocation')+'</span></li><li><span>Earnings call</span><span class="c">'+(SM?'Wall Street':'Investors')+'</span></li></ol></div>';
  let h='<div class="stack enter">';
  h+='<div class="kicker">'+LG()+'Board briefing for <b>'+qLabel(q)+'</b>, '+qMonths(q)+'</div>';
  if(q===0){
    h+='<h1 class="h1">You are the new CEO of '+c.name+'.</h1><p class="lede">'+esc(c.pitch)+'</p>';
    h+='<div class="section stack tight"><h3 class="h3">Where it stands</h3><p class="note">The numbers behind the struggle are on the page you just read. Each starting figure links to its filing below.</p>';
    h+=SM?'<p class="note">Your key number is <b>'+esc(c.kpi.plain)+'</b>: '+esc(c.kpi.plainD)+' It is '+kpiFmt(c,G.st.kpi)+' today.</p>':'<p class="note">Key number: <b>'+esc(c.kpi.name)+'</b> ('+esc(c.kpi.unit)+'), now '+kpiFmt(c,G.st.kpi)+'.</p>';
    h+=sourcesBlock(c)+'</div>';
    h+=agendaHtml;
    h+=filingsTable(c,false);
    h+='<details class="fold"><summary>Your leadership team</summary><div class="stack tight"><div class="advisors">';
    for(const [k,t] of CAB_ROLES){const m=G.cab[k];h+='<div class="adv">'+avatar(m.name,k)+'<div><b>'+esc(m.name)+'</b><div class="note">'+esc(t)+'</div></div></div>'}
    h+='</div><p class="note">They advise on every decision and remember whether you listen. Lose someone’s trust and they resign, which hurts the part of the company they run. The names are fictional.</p></div></details>';
    if(P){
      h+='<div class="section stack tight"><h3 class="h3">How to play</h3><ol class="list">';
      h+='<li><b>Read the briefing</b> for what happened and what is on the agenda.</li>';
      h+='<li><b>Make each decision.</b> Green tags show what a choice helps, red what it hurts. Dots under a choice explain how your situation changes it.</li>';
      h+='<li><b>Set the money plan:</b> spend on the future, pay shareholders, handle debt.</li>';
      h+='<li><b>Tell Wall Street what to expect,</b> then answer analysts on the earnings call.</li>';
      h+='<li><b>Repeat for '+d.quarters+' quarters.</b> Aim for a company score above 100.</li></ol></div>';
    }
  }else{
    const r=lastRec(G.st);
    h+='<h1 class="h1">'+esc(briefHeadline(c,r))+'</h1>';
    h+=SM?'<p class="lede">Last quarter you sold '+fmtB(r.rev)+', '+(r.g>=0?'up ':'down ')+Math.abs(r.g).toFixed(1)+'%. You '+(r.op>=0?'kept '+fmtB(r.op)+' in operating profit':'lost '+fmtB(Math.abs(r.op))+' running the business')+' and have '+fmtB(r.cash)+' in the bank. The stock closed at '+fmtPx(stockPx(c,r.idx))+'.</p>'
         :'<p class="lede">Last quarter: revenue '+fmtB(r.rev)+' ('+fmtPct(r.g)+' q/q), operating margin '+r.margin.toFixed(1)+'%, cash '+fmtB(r.cash)+', stock '+fmtPx(stockPx(c,r.idx))+'.</p>';
    h+=raceStrip();
  }
  // news: cabinet changes from last quarter
  const lastLog=G.log.length?G.log[G.log.length-1]:null;
  if(lastLog&&lastLog.cab&&lastLog.cab.length){
    h+='<div class="section news"><h3 class="h3">Leadership news</h3>';
    for(const e of lastLog.cab){
      if(e.type==='quit')h+='<div>'+avatar(e.name,e.k)+'<span><b>'+esc(e.name)+' resigned as '+esc(e.title)+'.</b> After being overruled too often, '+esc(e.name.split(' ')[0])+' left. '+esc(e.repl)+' takes over. '+(isFull()?'('+METERS.find(m=>m[0]===e.hit[0])[1]+' '+e.hit[1]+')':'')+'</span></div>';
      else h+='<div>'+avatar(e.name,e.k)+'<span><b>'+esc(e.name)+' is now a close ally.</b> Your '+esc(e.title.toLowerCase())+' trusts your judgment and is pushing the plan hard.</span></div>';
    }
    h+='</div>';
  }
  // coming due
  const due=comingDue(G);
  if(due.length){
    h+='<div class="section due"><h3 class="h3">Coming due this quarter</h3>';
    for(const x of due){
      const card=CARD[x.src.cid],o=card.opts[x.src.oi];
      const cls=x.fx.map(e=>fxClass(e)).filter(Boolean);const good=cls.filter(v=>v==='up').length>=cls.filter(v=>v==='down').length;
      h+='<div class="dueitem"><div><span class="faint">'+qLabel(x.src.q)+'</span>. '+esc(card.title)+'</div><div class="note">You chose: '+esc(o.l)+'</div>';
      if(!P||true)h+='<div class="chips">'+x.fx.map(e=>{const t=isFull()?fxText([e[0],e[1],0,1],G.st):varName(e[0]==='cr'?'cash':e[0]==='dr'?'debt':e[0]);return t?'<span class="chip '+(lvl()==='tags'?'':fxClass(e))+'">'+esc(t.replace(/ now$/,''))+'</span>':''}).join('')+'</div>';
      // reaction
      let speaker=null,line='';
      if(good&&o.a){const k=roleOf(o.a[0]);if(k){speaker=[G.cab[k].name,k];line='This is the payoff we planned for.'}}
      if(!good){const opp=card.opts.find((p,i)=>i!==x.src.oi&&p.a&&roleOf(p.a[0]));if(opp){const k=roleOf(opp.a[0]);speaker=[G.cab[k].name,k];line='We raised this risk back in '+qLabel(x.src.q)+'.'}}
      if(speaker)h+='<div class="quote">'+avatar(speaker[0],speaker[1],1)+'<span><b>'+esc(speaker[0])+':</b> “'+esc(line)+'”</span></div>';
      h+='</div>';
    }
    h+='</div>';
  }
  if(pq.event){
    const e=EV[pq.event];const good=['rates','viral','aisurge','order'].indexOf(e.id)>=0;
    h+='<div class="section event'+(good?' good':'')+' stack tight"><div class="flag">'+(good?'Good news this quarter':'Trouble this quarter')+'</div><h3 class="h2" style="font-size:24px">'+esc(e.title)+'</h3><p class="body">'+esc(e.body)+'</p><p class="note">'+(e.opts?'You will decide how to respond.':'No decision needed. It will show up in your results.')+'</p>'+(G.strategy&&EVENT_FORCE[e.id]&&G.strategy.top.indexOf(EVENT_FORCE[e.id])>=0?'<p class="note"><b>You were watching '+esc(forceName(EVENT_FORCE[e.id]))+'.</b> The first hit lands about a third softer.</p>':'')+'</div>';
  }
  if(isFull()){h+=pipelineTable();if(G.st.hist.length)h+=historyTable()}
  if(q!==0)h+=agendaHtml;
  h+='<div class="actions stick"><button class="btn" data-act="agenda">'+(pq.cards.length?'Open the first decision':'Go to the capital plan')+'</button></div></div>';
  $app.innerHTML=h;
}
function raceStrip(){
  const c=co(),m=pnlOf('st'),gp=raceGap();
  return '<div class="section racestrip"><div><div class="k">'+esc(c.ticker)+' stock</div><div class="px">'+fmtPx(m.px)+' <span class="'+(m.pct>=0?'up':'down')+'">'+fmtPct(m.pct)+'</span></div></div><div class="rs-mid"><span class="pill '+(gp.d>=0?'up':'down')+'">'+esc(gp.txt)+'</span><span class="note">Your $10,000 from day one is now '+usd(m.val)+'.</span></div><button class="btn sec" data-act="desk">Open the tracker</button></div>';
}
function briefHeadline(c,r){
  if(r.rescue>0)return c.name+' needed emergency financing last quarter.';
  if(r.callNote==='bad')return 'Analysts remember what you promised on the last call.';
  if(r.s>0.04)return c.name+' beat Wall Street last quarter.';
  if(r.s<-0.04)return c.name+' missed Wall Street last quarter.';
  if(r.ret>3)return 'Investors are warming to your plan.';
  if(r.ret<-3)return 'Investors are losing patience.';
  return c.name+' landed roughly in line last quarter.';
}
function pipelineTable(){
  const st=G.st,q=G.q,c=co(),map={};
  for(const p of st.pending){if(p.e<=q)continue;const k=p.v+'|'+p.s+'|'+p.e;map[k]=map[k]||{v:p.v,s:p.s,e:p.e,val:0};map[k].val+=p.val}
  const rows=Object.values(map).filter(r=>Math.abs(r.val)>1e-6).sort((a,b)=>a.s-b.s||a.v.localeCompare(b.v));
  const L=Math.max(1,Math.round(3*D().lag)),RD={cut:-0.3,hold:0,raise:0.35,surge:0.55};
  let h='<details class="fold"><summary>Effects in your pipeline ('+rows.length+')</summary>';
  if(!rows.length)h+='<p class="note">Nothing pending.</p>';
  else{
    h+='<div class="tblwrap"><table class="tbl"><thead><tr><th>Effect</th><th>Size</th><th>When</th></tr></thead><tbody>';
    for(const r of rows.slice(0,18)){
      let nm,sz;
      if(r.v==='g'){nm='Revenue growth';sz=fmtPct(r.val,2).replace('%',' pt/qtr')}
      else if(r.v==='m'){nm='Operating margin';sz=fmtPct(r.val,2).replace('%',' pt')}
      else if(r.v==='cash'||r.v==='debt'){nm=r.v==='cash'?'Cash':'Debt';sz=(r.val<0?'−':'+')+fmtB(Math.abs(r.val))+'/qtr'}
      else if(r.v==='cr'||r.v==='dr'){nm=r.v==='cr'?'Cash':'Debt';sz=fmtPct(r.val,2).replace('%','% of rev/qtr')}
      else if(r.v==='kpi'){nm=c.kpi.short;sz=(r.val>0?'+':'−')+Math.abs(r.val).toFixed(2)}
      else if(r.v==='shares'||r.v==='div'){nm=r.v==='shares'?'Share count':'Dividend';sz=fmtPct(r.val,1)}
      else{const m=METERS.find(x=>x[0]===r.v);nm=m?m[1]:r.v;sz=(r.val>0?'+':'−')+Math.abs(r.val).toFixed(1)}
      const once=['g','m','cash','debt','cr','dr'].indexOf(r.v)<0;
      h+='<tr><td>'+esc(nm)+'</td><td class="n '+fxClass([r.v,r.val])+'">'+sz+'</td><td class="n">'+(once?(r.s<=q?'now':qLabel(r.s))+', once':(r.s<=q?'now':qLabel(r.s))+' → '+(r.e-r.s>=50?'lasting':qLabel(r.e-1)))+'</td></tr>';
    }
    h+='</tbody></table></div>';
  }
  let rd=0;for(let k=L;k<L+4;k++){const ch=st.rd[st.rd.length-k];if(ch)rd+=RD[ch]}
  h+='<p class="note" style="margin-top:8px">Past reinvestment adds '+fmtPct(rd/4,2).replace('%',' pt')+' to growth this quarter. Each plan pays off '+L+' to '+(L+3)+' quarters later. Sizes shown include luck already drawn.</p></details>';
  return h;
}
function historyTable(){
  const H=G.st.hist;
  let h='<details class="fold"><summary>Quarterly history ('+H.length+')</summary><div class="tblwrap"><table class="tbl"><thead><tr><th>Quarter</th><th>Revenue</th><th>q/q</th><th>Margin</th><th>FCF</th><th>Cash</th><th>Debt</th><th>Index</th></tr></thead><tbody>';
  for(let i=H.length-1;i>=0;i--){const r=H[i];
    h+='<tr><td>'+qLabel(r.q)+'</td><td class="n">'+fmtB(r.rev)+'</td><td class="n '+(r.g>=0?'up':'down')+'">'+fmtPct(r.g)+'</td><td class="n">'+r.margin.toFixed(1)+'%</td><td class="n">'+fmtB(r.fcf)+'</td><td class="n">'+fmtB(r.cash)+'</td><td class="n">'+fmtB(r.debt)+'</td><td class="n">'+r.idx.toFixed(1)+'</td></tr>'}
  return h+'</tbody></table></div></details>';
}

/* ---------- DECISION ---------- */
function chipsFor(o){
  const d=D(),c=co();
  if(d.hints==='numbers'){
    const st=G.st;let h='<div class="chips">';
    for(const e of (o.fx||[])){const t=fxText(e,st);if(t)h+='<span class="chip '+fxClass(e)+'">'+esc(t)+'</span>'}
    if(o.jobs)h+='<span class="chip jobs">≈ '+jobsFmt(o.jobs*c.workforce)+' jobs</span>';
    h+='</div>';
    return h;
  }
  const agg={};
  const add=(fx,risk)=>{for(const e of fx){const v=e[0];if(v==='flag')continue;const key=v==='cr'?'cash':v==='dr'?'debt':v;const dur=(['cash','cr','debt','dr','g','m'].indexOf(v)>=0)?(e[3]||1):1;
    agg[key]=agg[key]||{s:0,lag:99};agg[key].s+=e[1]*Math.min(dur,8);agg[key].lag=Math.min(agg[key].lag,e[2]||0)}};
  add(o.fx||[]);if(o.out)for(const x of o.out)add(x.fx);
  let h='<div class="chips">';
  if(o.jobs)h+='<span class="chip jobs">≈ '+jobsFmt(o.jobs*c.workforce)+' jobs</span>';
  for(const k in agg){
    const a=agg[k];if(Math.abs(a.s)<1e-9)continue;
    const lbl=varName(k);
    if(d.hints==='tags'){h+='<span class="chip">'+esc(lbl)+'</span>';continue}
    const good=k==='kpi'?c.kpi.good:VAR_GOOD[k];
    const cls=good===0?'':((a.s>0)===(good>0)?'up':'down');
    h+='<span class="chip '+cls+'">'+(cls==='up'?'+ ':cls==='down'?'− ':'')+esc(lbl)+(a.lag>=2?', later':'')+'</span>';
  }
  if(o.out)h+='<span class="chip risk">'+(d.hints==='plain'?'A gamble':'Uncertain outcome')+'</span>';
  return h+'</div>';
}
function oddsFor_(o,ctx){
  const st=G.st,ps=oddsFor(o.out,ctx.pmul);
  let h='<div class="odds">';
  o.out.forEach((x,i)=>{
    h+='<div class="oddrow"><span class="pct">'+Math.round(ps[i]*100)+'%</span><span>'+esc(x.t);
    if(isFull())h+='<span class="chips" style="margin-top:4px">'+(x.fx.length?x.fx.map(e=>{const t=fxText(e,st);return t?'<span class="chip '+fxClass(e)+'">'+esc(t)+'</span>':''}).join(''):'<span class="chip">No further effect</span>')+'</span>';
    h+='</span></div>';
  });
  return h+'</div>';
}
function renderCard(){
  const cards=quarterCards(),cid=cards[UI.card],cd=CARD[cid],d=D(),c=co(),st=G.st;
  const total=cards.length+1;
  const grades=ctxGrades(c,st,cd),ctxs=cd.opts.map(o=>contextFor(c,st,o,cd));
  const best=Math.max.apply(null,grades);
  let h='<div class="stack enter">';
  h+='<div class="prog" aria-hidden="true">'+Array.from({length:total},(_,i)=>'<span class="'+(i<=UI.card?'on':'')+'"></span>').join('')+'</div>';
  h+='<div class="stack tight"><div class="kicker">'+LG()+'Decision '+(UI.card+1)+' of '+total+'. <b>'+esc(cd.isEvent?'Response to events':cd.cat)+'</b></div><h2 class="h2">'+esc(cd.title)+'</h2></div>';
  h+='<p class="body">'+esc(cd.body)+(cd.src?' '+ext(cd.src,'Source'):'')+'</p>';
  // advisors
  let advIdx=cd.opts.map((o,i)=>i);
  h+='<div class="section stack tight"><h3 class="h3">Your team weighs in</h3><div class="advisors">';
  const usedRole={};
  for(const i of advIdx){const o=cd.opts[i];if(!o.a)continue;
    let k=roleOf(o.a[0]);let m=k?G.cab[k]:null;
    let name=m?m.name:o.a[0],title=m?m.title:'';
    /* two options argued by the same cabinet member would read as one person on both sides, so the second adviser is shown under their own fictional name and title */
    if(k&&usedRole[k]){const free=NAMES.filter(n=>!Object.keys(G.cab).some(z=>z[0]!=='_'&&G.cab[z].name===n));name=free[hashStr(G.seed+'|'+cid+'|'+i)%free.length];title=o.a[0];m=null;k=null}
    else if(k)usedRole[k]=1;
    h+='<div class="adv">'+avatar(m?m.name:name,k)+'<div><q>'+esc(o.a[1])+'</q><div class="who"><b>'+esc(name)+'</b>'+(title?'<span>'+esc(title)+'</span>':'')+'<span>backs '+LET[i]+'</span>';
    if(m&&d.hints!=='tags')h+='<span class="trust">trust <span class="tbar"><b class="'+(m.loyalty<30?'low':'')+'" style="width:'+m.loyalty+'%"></b></span>'+(isFull()?Math.round(m.loyalty):'')+'</span>';
    if(m&&m.loyalty<30)h+='<span class="tag r">May resign</span>';
    if(d.advisors==='rec'&&grades[i]===best)h+='<span class="tag">Best fit now</span>';
    h+='</div></div></div>'}
  h+='</div><p class="note">Advisors you overrule lose trust in you. Advisors whose advice you take gain it.</p></div>';
  // options
  h+='<div class="opts" role="radiogroup" aria-label="Your decision">';
  cd.opts.forEach((o,i)=>{
    const ctx=ctxs[i];
    h+='<button class="opt" role="radio" aria-checked="'+(UI.picks[cid]===i)+'" data-act="pickopt" data-v="'+i+'"><span class="lt">'+LET[i]+'</span><span><span class="ol">'+esc(o.l)+'</span><span class="od" style="display:block">'+esc(o.d)+'</span>'+chipsFor(o);
    if(ctx.notes.length)h+='<span class="ctx">'+ctx.notes.map(n=>'<div class="'+(d.hints==='tags'?'':n[0])+'">'+esc(n[1])+(isFull()&&ctx.extra.length&&n===ctx.notes[0]?' <span class="faint">('+ctx.extra.map(e=>fxText(e,st)).filter(Boolean).join(', ')+')</span>':'')+'</div>').join('')+'</span>';
    if(o.out&&d.hints!=='tags')h+=oddsFor_(o,ctx);
    h+='</span></button>';
  });
  h+='</div>';
  if(cd.opts.some(o=>o.jobs))h+=peoplePanel(c,Math.max.apply(null,cd.opts.map(o=>o.jobs||0)));
  if(isSimple()){
    const words=glossFor(cd.title+' '+cd.body+' '+cd.opts.map(o=>o.l+' '+o.d).join(' '));
    if(words.length)h+='<div class="section gloss stack tight"><h3 class="h3">Words to know</h3><dl>'+words.map(w=>'<div><dt>'+esc(w[1])+'</dt><dd>'+esc(w[2])+'</dd></div>').join('')+'</dl></div>';
  }
  if(isFull())h+='<p class="note">Sizes are averages; each is drawn at random within roughly ±'+Math.round(35*d.sd)+'%. Delays include Hot Seat’s slower payoffs. Growth and margin are percentage points; meters run 0 to 100.</p>';
  h+='<div class="actions stick"><button class="btn sec" data-act="back">Back</button><span class="grow"></span><button class="btn" data-act="nextcard" '+(UI.picks[cid]==null?'disabled':'')+'>'+(UI.card+1<cards.length?'Next decision':(isSimple()?'Go to the money plan':'Go to the capital plan'))+'</button></div></div>';
  $app.innerHTML=h;
}

/* ---------- ALLOCATION ---------- */
function choicesNow(){return {cards:Object.assign({},UI.picks),reinvest:UI.alloc.reinvest,ret:UI.alloc.ret,debt:UI.alloc.debt,guide:UI.alloc.guide}}
function renderAlloc(){
  if(!UI.alloc)UI.alloc=defaultAlloc();
  const c=co(),st=G.st,d=D(),m=allocMenu(c,st);
  const cards=quarterCards(),total=cards.length+1;
  const a=assess(G,choicesNow());
  const P=isSimple(),F=isFull(),lev=leverage(st,c);
  const groups=P?[
    ['reinvest','Spend on the future?','Extra money for research, factories and marketing. It costs cash now and grows sales a few quarters later.'],
    ['ret','Pay shareholders?',st.div>0?'You pay owners '+fmtB(st.div)+' every quarter. Cutting it saves cash but upsets investors.':'You pay owners nothing right now.'],
    ['debt','What about debt?','You owe '+fmtB(st.debt)+' and have '+fmtB(st.cash)+' in the bank. '+(lev>4?'That is a lot of debt for what you earn.':lev>2?'A moderate amount of debt.':'A comfortable amount of debt.')],
    ['guide','What will you tell Wall Street?','Your promise for next quarter. Beat it and investors cheer. Promise big and miss, and they punish you.']
  ]:[
    ['reinvest','Reinvestment','R&D, capex and marketing beyond the base budget.'],
    ['ret','Shareholder returns',st.div>0?'Dividend: '+fmtB(st.div)+' a quarter.':'No dividend today.'],
    ['debt','Debt','Debt '+fmtB(st.debt)+', cash '+fmtB(st.cash)+', net debt '+lev.toFixed(1)+'× EBITDA.'],
    ['guide','Guidance for next quarter','Beating it builds trust; missing after a raise is punished.']
  ];
  if(P){
    const PL={reinvest:{cut:['Spend less','More profit now, slower sales later.'],hold:['Keep the same','No change.'],raise:['Spend more','About '+fmtB(0.02*st.rev)+' now for faster sales later.'],surge:['Spend a lot more','About '+fmtB(0.04*st.rev)+'. Biggest boost later; strains the team.']},
      ret:{cutdiv:['Cut the dividend','Keeps about '+fmtB(st.div*0.4)+' a quarter. Income investors sell.'],hold:['Keep paying it','Same as now.'],buyback:['Buy back shares','About '+fmtB(0.08*st.rev)+'. Owners like it; it uses cash.'],none:['Pay nothing','Keep the cash in the company.'],startdiv:['Start a dividend','About '+fmtB(0.016*st.rev)+' a quarter.']},
      debt:{pay:['Pay some back','Less debt and interest. Uses cash.'],hold:['Leave it','Keep the debt you have.'],borrow:['Borrow more','More cash now, more interest.']},
      guide:{raise:['Promise better','Say next quarter beats the trend.'],maintain:['Promise the same','Say next quarter matches the trend.'],lower:['Promise less','Make it easier to beat.'],withdraw:['Say nothing','Investors dislike silence.']}};
    for(const k in m)m[k]=m[k].map(([v,l,dd])=>PL[k]&&PL[k][v]?[v,PL[k][v][0],PL[k][v][1]]:[v,l,dd]);
  }
  let h='<div class="stack enter">';
  h+='<div class="prog" aria-hidden="true">'+Array.from({length:total},()=>'<span class="on"></span>').join('')+'</div>';
  h+='<div class="stack tight"><div class="kicker">'+LG()+'Decision '+total+' of '+total+'. <b>'+(P?'Money':'Capital allocation')+'</b></div><h2 class="h2">'+(P?'Set the money plan':'Set the capital plan')+'</h2><p class="lede">Each choice starts on <b>keep things as they are</b>. Change only what you want to, then close the quarter.'+(isFull()?'':' Your CFO, '+G.cab.cfo.name.split(' ')[0]+', flags any risk at the bottom.')+'</p></div>';
  h+='<div class="section stack">';
  groups.forEach(([k,t,desc],gi)=>{
    if(gi)h+='<hr class="sep">';
    h+='<div class="group"><div class="h3">'+t+'</div><p class="note">'+esc(desc)+'</p><div class="seg" role="radiogroup" aria-label="'+esc(t)+'">';
    for(const [v,l,dd] of m[k])h+='<button role="radio" aria-checked="'+(UI.alloc[k]===v)+'" data-act="alloc" data-k="'+k+'" data-v="'+v+'"><b>'+esc(l)+'</b><small>'+esc(dd)+'</small></button>';
    h+='</div></div>';
  });
  h+='</div>';
  const floor=minCash(st,c),cfo=G.cab.cfo;
  if(P){
    h+='<div class="advice">'+avatar(cfo.name,'cfo',1)+'<span><b>'+esc(cfo.name)+', CFO:</b> after this plan we should have about '+fmtB(a.cashNext)+'. Below '+fmtB(floor)+', the banks force an emergency loan.</span></div>';
    const say={raise:'Next quarter looks better than usual. Promising better is safe.',lower:'Next quarter looks weaker than usual. Promise less so we do not miss.',maintain:'Next quarter looks normal. Promise the same.'}[a.best];
    h+='<div class="advice">'+avatar(cfo.name,'cfo',1)+'<span><b>'+esc(cfo.name)+':</b> '+say+'</span></div>';
  }else if(!F){
    h+='<div class="advice">'+avatar(cfo.name,'cfo',1)+'<span><b>'+esc(cfo.name)+', CFO:</b> projected cash after this quarter is about '+fmtB(a.cashNext)+'. Below '+fmtB(floor)+' the banks force emergency borrowing.</span></div>';
  }else{
    const pct=(a.ratio-1)*100;
    h+='<div class="section stack tight"><h3 class="h3">Plan model, before luck</h3><div class="tblwrap"><table class="tbl"><tbody>';
    const row=(l,v,cls)=>'<tr><td>'+l+'</td><td class="n '+(cls||'')+'">'+v+'</td></tr>';
    h+=row('Street expects operating income this quarter',fmtB(st.expOp));
    h+=row('Projected cash at quarter end',fmtB(a.cashNext),a.cashNext<floor*1.2?'down':'');
    h+=row('Emergency-financing floor',fmtB(floor));
    h+=row('Net debt / EBITDA',lev.toFixed(2)+'×',lev>4?'down':'');
    h+=row('Interest per quarter (4.5%)',fmtB(st.debt*0.045/4));
    h+=row('Next quarter vs. trend, from effects queued',(pct>=0?'+':'−')+Math.abs(pct).toFixed(1)+'%',pct>=0?'up':'down');
    h+=row('Guidance shifts the next target','Raise +4%, lower −4%');
    h+=row('Board firing line',d.fire?'Below '+d.fire.below+' for '+d.fire.streak+' qtr'+(d.fire.streak>1?'s':''):'None');
    h+='</tbody></table></div><p class="note">Raise costs '+fmtB(0.02*st.rev)+' now for +0.35 pt of growth a quarter over four quarters, starting '+Math.max(1,Math.round(3*d.lag))+' quarters out. Surge costs '+fmtB(0.04*st.rev)+' for +0.55 pt. Cut adds +0.9 pt of margin now and −0.3 pt of growth later.</p></div>';
  }
  h+='<div class="actions stick"><button class="btn sec" data-act="back">Back</button><span class="grow"></span><button class="btn" data-act="commit">Close the quarter</button></div></div>';
  $app.innerHTML=h;
}

/* ---------- COMMIT ---------- */
function commit(){
  const ch=choicesNow(),c=co();
  const a=assess(G,ch);
  const quality={cards:{},reinvest:a.reinvest,ret:a.ret,debt:a.debt,guide:a.guide,bestGuide:a.best,ctx:{}};
  for(const k in ch.cards){const card=CARD[k];quality.cards[k]=ctxGrades(c,G.st,card)[ch.cards[k]];quality.ctx[k]=ctxGrades(c,G.st,card)}
  UI.prevMeters=Object.assign({},G.st.meters);UI.prevIdx=G.st.idx;
  const jobsBefore=G.st.jobsCut;
  const rec=commitQuarter(G,ch,quality);
  rec.jobs=G.st.jobsCut-jobsBefore;
  UI.last=rec;UI.card=0;UI.picks={};UI.alloc=null;UI.answers=[];UI.callRes=null;
  NET.ev('q',{co:G.coId,d:G.diffKey,q:Math.min(19,G.q-1)});
  if(G.status!=='play')recordBest();
  go(G.status==='fired'?'fired':'results');
}
function recordBest(){
  const s=scorecard(G.st,co()).overall,b=store.get(BEST)||{},k=G.coId+':'+G.diffKey;
  if(G.status==='done'&&(!b[k]||s>b[k])){b[k]=s;store.set(BEST,b)}
}

/* ---------- RESULTS ---------- */
function resultsStock(r,chg){
  const c=co(),m=pnlOf('st'),gp=raceGap(),prev=stockPx(c,UI.prevIdx);
  return '<div class="section racestrip"><div><div class="k">'+esc(c.ticker)+' stock this quarter</div><div class="px">'+fmtPx(prev)+' → '+fmtPx(m.px)+' <span class="'+(chg>=0?'up':'down')+'">'+fmtPct(chg)+'</span></div></div><div class="rs-mid"><span class="pill '+(gp.d>=0?'up':'down')+'">'+esc(gp.txt)+'</span><span class="note">Your $10,000 from day one is now '+usd(m.val)+' ('+sUsd(m.pl)+').</span></div><button class="btn sec" data-act="desk">Open the tracker</button></div>';
}
function resultsStandard(c,r,beat,miss,chg,q){
  let h='<div class="section"><div class="tblwrap"><table class="tbl"><thead><tr><th>'+qLabel(q)+', $ billions</th><th>Amount</th><th>Note</th></tr></thead><tbody>';
  const row=(l,v,n,cls)=>'<tr><td>'+l+'</td><td class="n">'+v+'</td><td class="n '+(cls||'')+'">'+n+'</td></tr>';
  h+=row('Revenue',fmtB(r.rev),fmtPct(r.g)+' q/q',r.g>=0?'up':'down');
  h+=row('Operating margin',r.margin.toFixed(1)+'%','');
  h+=row('Operating income',fmtB(r.op),'expected '+fmtB(r.exp),beat?'up':miss?'down':'');
  h+=row('Free cash flow',fmtB(r.fcf),'',r.fcf>=0?'up':'down');
  if(r.div>0)h+=row('Dividends',fmtB(r.div),'');
  if(r.buyback>0)h+=row('Buybacks',fmtB(r.buyback),'');
  h+=row('Cash',fmtB(r.cash),r.rescue>0?'incl. '+fmtB(r.rescue)+' emergency loan':'',r.rescue>0?'down':'');
  h+=row('Debt',fmtB(r.debt),'');
  h+=row(esc(c.kpi.name),kpiFmt(c,r.kpi),esc(c.kpi.unit));
  h+=row('Value index',r.idx.toFixed(1),fmtPct(chg),chg>=0?'up':'down');
  return h+'</tbody></table></div></div>';
}
function resultsPlain(c,r,beat,miss,chg){
  let story='You sold <b>'+fmtB(r.rev)+'</b> this quarter, '+(r.g>=0?'up':'down')+' '+Math.abs(r.g).toFixed(1)+'% from last quarter. ';
  story+=r.op>=0?'After the costs of running the business you kept <b>'+fmtB(r.op)+'</b>, about '+r.margin.toFixed(0)+'¢ of every dollar. ':'Running the business cost more than you sold: a loss of <b>'+fmtB(Math.abs(r.op))+'</b>. ';
  story+='Wall Street expected '+(r.exp>=0?'a profit of '+fmtB(r.exp):'a loss of '+fmtB(Math.abs(r.exp)))+', so you '+(beat?'<b>beat</b> expectations.':miss?'<b>fell short</b>.':'landed about where they expected.');
  let h='<div class="section stack tight"><p class="lede" style="font-size:16.5px">'+story+'</p><div class="tblwrap"><table class="tbl"><thead><tr><th>What</th><th>Amount</th><th style="text-align:left">What it means</th></tr></thead><tbody>';
  const row=(l,v,n,cls)=>'<tr><td>'+l+'</td><td class="n '+(cls||'')+'">'+v+'</td><td class="t">'+n+'</td></tr>';
  h+=row('Sales',fmtB(r.rev),r.g>=0?'Customers paid more than last quarter.':'Customers paid less than last quarter.',r.g>=0?'up':'down');
  h+=row('Operating profit',fmtB(r.op),'Left after paying to run the business.',r.op>=0?'up':'down');
  h+=row('Cash generated',fmtB(r.fcf),r.fcf>=0?'Cash added after paying for equipment.':'The business used more cash than it made.',r.fcf>=0?'up':'down');
  if(r.div+r.buyback>0)h+=row('Paid to shareholders',fmtB(r.div+r.buyback),'Dividends'+(r.buyback>0?' and buybacks':'')+'.');
  h+=row('Cash in the bank',fmtB(r.cash),r.rescue>0?'Ran too low; banks forced a '+fmtB(r.rescue)+' emergency loan.':'Your safety cushion.',r.rescue>0?'down':'');
  h+=row('Debt',fmtB(r.debt),'What you owe lenders.');
  h+=row(esc(c.kpi.plain),kpiFmt(c,r.kpi),esc(c.kpi.plainS)+'.');
  h+=row('Stock price',fmtPx(stockPx(c,r.idx)),(chg>=0?'Up ':'Down ')+Math.abs(chg).toFixed(1)+'% this quarter. It started at '+fmtPx(c.px0)+'.',chg>=0?'up':'down');
  return h+'</tbody></table></div></div>';
}
function resultsFull(c,r,beat,miss,chg,q){
  const row=(l,v,n,cls,tot)=>'<tr'+(tot?' class="tot"':'')+'><td>'+l+'</td><td class="n '+(cls||'')+'">'+v+'</td><td class="n faint">'+(n||'')+'</td></tr>';
  const sec=t=>'<tr class="sec"><td colspan="3">'+t+'</td></tr>';
  const sur=r.exp!==0?(r.op-r.exp)/Math.abs(r.exp)*100:0;
  let h='<div class="section"><div class="tblwrap"><table class="tbl"><thead><tr><th>'+qLabel(q)+', $ billions</th><th>Amount</th><th>Detail</th></tr></thead><tbody>';
  h+=sec('Income statement');
  h+=row('Revenue',fmtB(r.rev),fmtPct(r.g,2)+' q/q, '+fmtPct(r.yoy,1)+' y/y',r.g>=0?'up':'down');
  h+=row('Operating costs',fmtB(-(r.rev-r.op)));
  h+=row('Operating income',fmtB(r.op),'margin '+r.margin.toFixed(2)+'%','',1);
  h+=row('Interest',fmtB(-r.interest),'4.5% a year');
  h+=row('Tax',fmtB(-r.tax),'18%');
  h+=row('Net income',fmtB(r.ni),'',r.ni>=0?'up':'down',1);
  h+=sec('Cash flow');
  h+=row('+ D&amp;A',fmtB(r.da));h+=row('− Capex',fmtB(-r.capex));h+=row('+ Working capital',fmtB(r.wc));
  h+=row('Free cash flow',fmtB(r.fcf),'',r.fcf>=0?'up':'down',1);
  h+=row('− Dividends',fmtB(-r.div));h+=row('− Buybacks',fmtB(-r.buyback));
  h+=row('Borrowing (repayment)',fmtB(r.fin),r.rescue>0?'incl. '+fmtB(r.rescue)+' emergency':'',r.rescue>0?'down':'');
  h+=row('Decisions, one-time',fmtB(r.other));
  h+=row('Change in cash',fmtB(r.cash-r.cash0),fmtB(r.cash0)+' → '+fmtB(r.cash),'',1);
  h+=sec('Balance sheet');
  h+=row('Cash',fmtB(r.cash));h+=row('Debt',fmtB(r.debt));h+=row('Net debt',fmtB(r.debt-r.cash));
  h+=row('Net debt / EBITDA',r.lev.toFixed(2)+'×','TTM',r.lev>4?'down':'');
  h+=row('Share count',((r.shares-1)*100>=0?'+':'−')+Math.abs((r.shares-1)*100).toFixed(2)+'%','vs. start');
  h+=sec('Market');
  h+=row('Street expected',fmtB(r.exp));
  h+=row('Surprise',(sur>=0?'+':'−')+Math.abs(sur).toFixed(1)+'%',beat?'beat':miss?'miss':'in line',beat?'up':miss?'down':'');
  h+=row('Stock price',fmtPx(stockPx(c,r.idx)),fmtPct(chg,2),chg>=0?'up':'down');
  h+=row('Company score',r.idx.toFixed(2),'start = 100');
  h+=row('Next quarter’s Street target',fmtB(r.expNext),'guidance: '+r.guide);
  h+=row(esc(c.kpi.name),kpiFmt(c,r.kpi),esc(c.kpi.unit));
  return h+'</tbody></table></div></div>';
}
function renderResults(){
  const c=co(),r=UI.last,d=D(),q=G.q-1,F=isFull(),P=isSimple();
  const beat=r.s>0.02,miss=r.s<-0.02,chg=(r.idx/UI.prevIdx-1)*100;
  let h='<div class="stack enter">';
  h+='<div class="kicker">'+LG()+'Simulated earnings release for <b>'+qLabel(q)+'</b></div>';
  h+='<div class="verdict"><h1 class="h1">'+esc(c.name+(beat?' beats':miss?' misses':' meets')+' expectations')+'</h1><span class="stamp '+(beat?'up':miss?'down':'flat')+'">'+(beat?'Beat':miss?'Miss':'In line')+'</span></div>';
  h+=resultsStock(r,chg);
  h+=F?resultsFull(c,r,beat,miss,chg,q):resultsPlain(c,r,beat,miss,chg);
  const news=[];
  for(const k in (r.outs||{}))news.push(['risk',r.outs[k]]);
  if(r.callNote==='bad')news.push(['bad','Analysts remembered your confident answers on the last call. The miss cost extra trust.']);
  if(r.callNote==='good')news.push(['good','You delivered on the confidence you showed on the last call.']);
  if(r.jobs>0)news.push(['bad','Your decisions eliminate about '+jobsFmt(r.jobs)+' jobs at a company of '+c.workforce.toLocaleString('en-US')+' people.']);
  const lastLog=G.log[G.log.length-1];
  for(const e of (lastLog.cab||[]))news.push([e.type==='quit'?'bad':'good',e.type==='quit'?e.name+' ('+e.title+') resigned after being overruled too often. '+e.repl+' replaces them.':e.name+' ('+e.title+') is now a close ally.']);
  if(news.length)h+='<div class="section news"><h3 class="h3">What happened</h3>'+news.map(n=>'<div><span class="tag '+(n[0]==='good'?'g':n[0]==='bad'?'r':'')+'">'+(n[0]==='risk'?'Outcome':n[0]==='good'?'Good':'Cost')+'</span><span>'+esc(n[1])+'</span></div>').join('')+'</div>';
  h+='<div class="section stack tight"><h3 class="h3">'+(P?'How people feel about you, 0 to 100':'Stakeholders, 0 to 100')+'</h3><div class="mgrid">';
  for(const [k] of METERS){const v=r.meters[k],dv=v-(UI.prevMeters?UI.prevMeters[k]:v);
    h+='<div><span>'+meterName(k)+'</span><b>'+(F?v.toFixed(1):Math.round(v))+' <small class="'+(dv>=0.5?'up':dv<=-0.5?'down':'faint')+'">'+(dv>=0?'+':'−')+Math.abs(dv).toFixed(F?1:0)+'</small></b></div>'}
  h+='</div></div>';
  const brd=r.meters.brd,fire=d.fire;let bn,warn=false;
  if(G.status==='fired'){bn='The board has voted to replace you.';warn=true}
  else if(fire&&brd<fire.below){bn='The board is discussing your replacement. '+(fire.streak>1?'Another quarter like this and you are out.':'');warn=true}
  else if(fire&&brd<fire.below+8){bn='The board is uneasy. Confidence is close to the line where directors discuss a replacement.';warn=true}
  else if(brd>=60)bn='The board is behind you.';else bn='The board is watching closely.';
  if(!fire)bn+=' On Guided, the board cannot fire you.';
  if(F&&fire)bn+=' Confidence '+brd.toFixed(1)+'; firing line '+fire.below+'.';
  h+='<div class="section board'+(warn?' warn':'')+'"><h3 class="h3">From the board</h3><p>'+esc(bn)+'</p></div>';
  h+='<div class="actions stick">';
  if(G.call&&!G.call.done)h+='<button class="btn" data-act="call">Join the earnings call</button>';
  else if(G.status==='play')h+='<button class="btn" data-act="nextq">Start '+qLabel(G.q)+'</button>';
  else h+='<button class="btn" data-act="debrief">See your debrief</button>';
  if(G.rewinds>0&&G.snap)h+='<button class="btn sec" data-act="rewind">Rewind this quarter ('+G.rewinds+' left)</button>';
  h+='</div></div>';
  $app.innerHTML=h;
}

/* ---------- EARNINGS CALL ---------- */
const REPLY={
  confident:['We are ahead of plan, and the next few quarters will show it.','We are confident in the trajectory. The numbers speak for themselves.'],
  candid:['Fair question. Here is what went wrong, and here is what we are changing.','It is real progress, and some of it came from one-time help. Here is the split.'],
  deflect:['We do not manage the business quarter to quarter. Our focus is the long term.','I will not get into specifics, but we like where we are headed.']
};
function renderCall(){
  const c=co(),q=G.q-1,call=G.call,P=isPlain(),F=isFull();
  const done=!!UI.callRes;
  let h='<div class="stack enter">';
  h+='<div class="kicker">'+LG()+''+c.name+' '+qLabel(q)+' earnings call, live questions</div>';
  h+='<h1 class="h1">Analysts have questions.</h1>';
  h+='<p class="lede">'+(isSimple()?'Pick how you answer each one. Confident works when the news is good. When the news is bad, being candid usually builds more trust; overselling can come back to bite you next quarter.':'Choose a tone for each answer. Overselling bad news buys calm now and costs you if next quarter misses.')+'</p>';
  h+='<div class="section stack">';
  call.qs.forEach((x,i)=>{
    const a=UI.answers[i];
    h+='<div class="qa"><div class="ask">'+avatar(x.analyst[0],null)+'<div><div class="who"><b>'+esc(x.analyst[0])+'</b>, '+esc(x.analyst[1])+(P||F?' <span class="tag '+(x.bad?'r':'g')+'">'+(x.bad?'Bad news':'Good news')+'</span>':'')+'</div><p>'+esc(x.text)+'</p></div></div>';
    h+='<div class="tones" role="radiogroup" aria-label="Your answer">';
    for(const [k,l,dd] of TONES){
      let sub=dd;
      if(F){const e=callEffect(x.bad,k);sub='Investors '+(e.inv>=0?'+':'−')+Math.abs(e.inv)+(e.brd?', board '+(e.brd>0?'+':'−')+Math.abs(e.brd):'')+(e.flag?'; −8 investors, −4 board if next quarter misses':'')}
      h+='<button role="radio" aria-checked="'+(a===k)+'" data-act="tone" data-i="'+i+'" data-v="'+k+'"'+(done?' disabled':'')+'><b>'+l+'</b><small>'+esc(sub)+'</small></button>';
    }
    h+='</div>';
    if(a)h+='<p class="reply">“'+esc(REPLY[a][x.bad?0:1])+'”</p>';
    h+='</div>';
  });
  h+='</div>';
  if(done){
    const r=UI.callRes;
    h+='<div class="section stack tight"><h3 class="h3">Reaction</h3><p class="body">Investor mood '+(r.inv>=0?'rose ':'fell ')+Math.abs(r.inv)+' point'+(Math.abs(r.inv)===1?'':'s')+(r.brd?' and board support moved '+(r.brd>0?'+':'−')+Math.abs(r.brd):'')+'. '+(r.flag?'You talked up bad news. If next quarter misses, analysts will hold it against you.':'You made no promises you will have to walk back.')+'</p></div>';
    h+='<div class="actions stick">'+(G.status==='play'?'<button class="btn" data-act="nextq">Start '+qLabel(G.q)+'</button>':'<button class="btn" data-act="debrief">See your debrief</button>')+'</div>';
  }else{
    h+='<div class="actions stick"><button class="btn" data-act="endcall" '+(UI.answers.filter(Boolean).length<call.qs.length?'disabled':'')+'>End the call</button></div>';
  }
  h+='<p class="note">Analysts and their firms are fictional.</p></div>';
  $app.innerHTML=h;
}

/* ---------- DEBRIEF ---------- */
function lineChart(series,N){
  const W=680,H=260,L=40,R=30,T=14,B=30;
  const all=[].concat.apply([],series.map(s=>s.v));
  let lo=Math.min.apply(null,all.concat([100])),hi=Math.max.apply(null,all.concat([100]));
  const pad=(hi-lo)*0.1||5;lo=Math.floor((lo-pad)/10)*10;hi=Math.ceil((hi+pad)/10)*10;
  const X=i=>L+(i/Math.max(N,1))*(W-L-R),Y=v=>T+(1-(v-lo)/(hi-lo))*(H-T-B);
  let h='<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Value index by quarter">';
  const step=(hi-lo)>160?40:(hi-lo)>60?20:10;
  for(let v=lo;v<=hi;v+=step)h+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"'+(v===100?' stroke-dasharray="4 3"':'')+'/><text x="'+(L-6)+'" y="'+(Y(v)+4)+'" text-anchor="end" font-size="11" fill="var(--muted)" font-family="Geist Mono, monospace">'+v+'</text>';
  for(let i=0;i<=N;i+=Math.max(1,Math.round(N/7)))h+='<text x="'+X(i)+'" y="'+(H-10)+'" text-anchor="middle" font-size="11" fill="var(--muted)" font-family="Geist Mono, monospace">'+(i===0?'start':qLabel(i-1))+'</text>';
  for(const s of series){
    h+='<polyline points="'+s.v.map((v,i)=>X(i).toFixed(1)+','+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="'+s.c+'" stroke-width="'+(s.w||2)+'" stroke-linejoin="round"'+(s.dash?' stroke-dasharray="'+s.dash+'"':'')+'/>';
    const li=s.v.length-1;h+='<circle cx="'+X(li)+'" cy="'+Y(s.v[li])+'" r="3.5" fill="'+s.c+'"/>';
  }
  return h+'</svg>';
}
function optLabel(cid,i){return LET[i]+'. '+CARD[cid].opts[i].l}
function renderDebrief(){
  const c=co(),d=D(),me=scorecard(G.st,c),gh=scorecard(G.ghost,c);
  const exp=replayExpected(G),luck=G.st.idx-exp.idx,ps=processScore(G),gr=grade(ps);
  const fired=G.status==='fired',n=G.log.length,P=d.hints==='plain';
  const dv=G.st.idx-G.ghost.idx,ds=me.overall-gh.overall;
  const title=fired?'The board replaced you after '+qLabel(G.firedAt)+'.':ds>=3?'You beat the real playbook.':ds<=-3?'The real playbook beat you.':'You finished close to the real playbook.';
  let h='<div class="stack enter">';
  h+='<div class="kicker">'+LG()+(PL()?esc(PL().name)+'’s debrief':'Debrief')+' for '+c.name+' on '+d.name+', scenario '+esc(G.seed)+'</div><h1 class="h1">'+esc(title)+'</h1>';
  h+='<p class="lede">You ran '+c.name+' for '+n+' quarter'+(n>1?'s':'')+'. Your stock finished at <b>'+fmtPx(pxOf('st'))+'</b>, '+fmtPct(pnlOf('st').pct)+' from where you started. '+esc(c.ceo)+'’s real playbook would have finished at '+fmtPx(pxOf('ghost'))+' in the same scenario. The verdict above uses your overall score below, where the stock price counts for 35% and the rest is balance sheet, customers, people and trust.</p>';
  h+=shareBlock();
  h+='<div class="section scores">';
  h+='<div class="big"><span class="k">Overall score</span><span class="v">'+me.overall.toFixed(0)+'</span><span class="k">real playbook '+gh.overall.toFixed(0)+'</span></div>';
  h+='<div class="big"><span class="k">Decision quality</span><span class="v">'+gr+'</span><span class="k">'+(P?'How well your choices fit your situation at the time. A is best.':ps.toFixed(2)+' of 3, judged on what you knew')+'</span></div>';
  h+='<div class="big"><span class="k">Luck</span><span class="v '+(luck>=0?'up':'down')+'">'+(luck>=0?'+':'−')+Math.abs(luck).toFixed(1)+'</span><span class="k">'+(P?(luck>=0?'Points gained from good breaks':'Points lost to bad breaks'):'index points from breaks you did not control')+'</span></div></div>';
  h+='<section class="section stack tight"><h3 class="h3">Your run as a stock</h3>'+stockBlock()+pnlBlock()+stockNote()+'</section>';
  h+='<section class="section stack tight"><h3 class="h3">Timeline against '+esc(c.ceo)+'</h3><p class="note">Tap a quarter to see the decisions behind it.</p>'+timelineHtml()+'</section>';
  h+='<div class="section stack tight chart"><h3 class="h3">Company score by quarter, 100 is where you started</h3>';
  h+=lineChart([{v:exp.idxHist,c:'var(--faint)',dash:'2 4',w:1.5},{v:G.ghost.idxHist,c:'var(--ghost)',dash:'6 4'},{v:G.st.idxHist,c:'var(--accent)',w:2.5}],n);
  h+='<div class="legend"><span><i style="border-color:var(--accent)"></i>You</span><span><i style="border-color:var(--ghost);border-top-style:dashed"></i>Real playbook</span><span><i style="border-color:var(--faint);border-top-style:dotted"></i>Your choices without luck</span></div></div>';
  const rows=[['value','Shareholder value'],['balance','Balance sheet'],['customers','Customers'],['people','People and execution'],['trust','Stakeholder trust']];
  h+='<div class="section stack tight"><h3 class="h3">Scorecard, 0 to 100</h3><div class="bars">';
  for(const [k,l] of rows)h+='<div class="brow"><span>'+l+'</span><div class="pair"><div class="pb"><b style="width:'+me[k].toFixed(0)+'%"></b></div><div class="pb gh"><b style="width:'+gh[k].toFixed(0)+'%"></b></div><div class="nums"><span>you '+me[k].toFixed(0)+'</span><span>real playbook '+gh[k].toFixed(0)+'</span></div></div></div>';
  h+='</div><p class="note">Weights: shareholder value 35%, balance sheet 20%, the other three 15% each.</p></div>';
  // people & team
  const quits=[].concat.apply([],G.log.map(l=>(l.cab||[]).filter(e=>e.type==='quit')));
  const calls=G.log.filter(l=>l.call);const callAvg=calls.length?calls.reduce((a,l)=>a+l.call.quality,0)/calls.length:null;
  h+='<div class="section stack tight"><h3 class="h3">People and credibility</h3><div class="tblwrap"><table class="tbl"><tbody>';
  h+='<tr><td>Jobs eliminated by your decisions</td><td class="n">'+jobsFmt(G.st.jobsCut)+'</td><td class="n faint">real playbook '+jobsFmt(G.ghost.jobsCut)+'</td></tr>';
  h+='<tr><td>Executives who resigned</td><td class="n">'+quits.length+'</td><td class="t">'+esc(quits.map(e=>e.name+' ('+e.title.replace('Chief ','').replace(' Officer','')+')').join(', ')||'None')+'</td></tr>';
  if(callAvg!=null)h+='<tr><td>Earnings call grade</td><td class="n">'+grade(callAvg)+'</td><td class="t">'+calls.length+' calls</td></tr>';
  h+='</tbody></table></div><p class="note">Job counts apply each option’s share to '+c.name+'’s real headcount of '+c.workforce.toLocaleString('en-US')+' ('+ext(c.people.src,'10-K')+').</p></div>';
  // review
  h+='<details class="fold" open><summary>Decision review</summary><ul class="review">';
  for(const l of G.log){
    for(const cid in l.ch.cards){
      const cd=CARD[cid],yi=l.ch.cards[cid],gi=l.gch.cards[cid],qq=l.quality.cards[cid];
      const grades=l.quality.ctx&&l.quality.ctx[cid],bestI=grades?grades.indexOf(Math.max.apply(null,grades)):-1;
      h+='<li><span class="rq">'+qLabel(l.q)+', '+esc(cd.isEvent?'event response':cd.cat.toLowerCase())+'</span><b>'+esc(cd.title)+'</b>';
      h+='<div class="row"><span>You chose</span><span><i class="dot q'+qq+'"></i>'+esc(optLabel(cid,yi))+' <span class="muted">('+['poor fit','risky','reasonable','best fit'][qq]+')</span></span></div>';
      if(bestI>=0&&bestI!==yi)h+='<div class="row"><span>Best fit then</span><span>'+esc(optLabel(cid,bestI))+'</span></div>';
      h+='<div class="row"><span>Real playbook</span><span>'+(gi===yi?'<span class="muted">Same choice</span>':esc(optLabel(cid,gi)))+'</span></div>';
      if(l.outs&&l.outs[cid])h+='<div class="row"><span>What happened</span><span>'+esc(l.outs[cid])+'</span></div>';
      if(cd.ghostNote)h+='<div class="row"><span>Note</span><span class="muted">'+esc(cd.ghostNote)+'</span></div>';
      if(cd.why)h+='<p class="why">'+esc(cd.why)+'</p>';
      if(cd.src)h+='<div class="note">'+ext(cd.src,'Read the source')+'</div>';
      h+='</li>';
    }
    const Q=l.quality,aq=Math.round((Q.reinvest+Q.ret+Q.debt)/3);
    const nm={cut:'Cut',hold:'Hold',raise:'Raise',surge:'Surge',cutdiv:'Cut dividend',buyback:'Buyback',none:'No payout',startdiv:'Start dividend',pay:'Pay down',borrow:'Borrow',maintain:'Maintain',lower:'Lower',withdraw:'Withdraw'};
    h+='<li><span class="rq">'+qLabel(l.q)+', capital plan</span><div class="row"><span>You chose</span><span><i class="dot q'+aq+'"></i>Reinvest '+nm[l.ch.reinvest]+', returns '+nm[l.ch.ret]+', debt '+nm[l.ch.debt]+'</span></div>';
    h+='<div class="row"><span>Guidance</span><span><i class="dot q'+Q.guide+'"></i>'+nm[l.ch.guide]+(Q.bestGuide&&Q.bestGuide!==l.ch.guide?' <span class="muted">(your pipeline pointed to '+nm[Q.bestGuide]+')</span>':'')+'</span></div>';
    if(l.call)h+='<div class="row"><span>Earnings call</span><span><i class="dot q'+Math.round(l.call.quality)+'"></i>'+grade(l.call.quality)+'</span></div>';
    h+='</li>';
  }
  h+='</ul></details>';
  h+='<details class="fold"><summary>Assumptions and sources</summary><ul class="list">';
  h+='<li>Start: '+c.name+'’s latest 10-K and 10-Q.'+(c.est.length?' Not from a filing: '+esc(c.est.join('; '))+'.':'')+'</li>';
  h+='<li>The real playbook reinvests "'+c.real.reinvest+'", treats returns as "'+c.real.ret+'" and debt as "'+c.real.debt+'", keeps guidance steady, answers analysts candidly on bad news, and picks the option closest to leadership’s announced moves. Some events are hypothetical; there it picks the response most consistent with leadership’s stated approach.</li>';
  h+='<li>Why it is struggling: the briefing restates figures from each company’s filings and news reports, linked on the page, in plain words of our own.</li>';
  h+='<li>Decision quality compares your option with the best fit for your situation at the time, not with how the dice landed.</li>';
  h+='<li>Advisors and analysts are fictional. Workforce figures are real. Simulation only; not investment advice.</li></ul>';
  h+='<div class="links" style="margin-top:12px">'+c.facts.map((f,i)=>ext(f[1],'Fact source '+(i+1))).join('')+'</div>'+'<div style="margin-top:8px">'+sourcesBlock(c)+'</div></details>';
  h+=postBlock();
  h+=contactBlock();
  h+='<div class="actions"><button class="btn" data-act="again">Play '+c.name+' again</button><button class="btn sec" data-act="same">Replay this exact scenario</button><button class="btn link" data-act="home">Choose another company</button></div></div>';
  $app.innerHTML=h;
  drawCard(document.getElementById('sharecv'));
}

/* ---------- online features: end-of-game report, share card, leaderboard ---------- */
const fmtEdge=x=>(x>=0?'+':'−')+Math.abs(x).toFixed(1);
function reportEnd(){
  if(!G||G.evEnd)return;G.evEnd=1;
  const c=co(),ds=scorecard(G.st,c).overall-scorecard(G.ghost,c).overall;
  NET.ev('end',{co:G.coId,d:G.diffKey,out:G.status==='fired'?'fired':'done',q:Math.min(20,G.log.length),edge:Math.max(-1000,Math.min(1000,Math.round(ds*10)))});
}
function siteUrl(){return NET.ok?location.origin:'https://pseudo-ceo.vercel.app'}
function cardInfo(){
  const c=co(),d=D(),me=scorecard(G.st,c),gh=scorecard(G.ghost,c);
  return {c,d,me,gh,ds:me.overall-gh.overall,fired:G.status==='fired',grade:grade(processScore(G)),n:G.log.length};
}
function shareText(){
  const i=cardInfo(),url=siteUrl();
  return i.fired
    ?'The board fired me as CEO of '+i.c.name+' after '+qLabel(G.firedAt)+' on '+i.d.name+'. Think you can last longer? '+url
    :'I ran '+i.c.name+' on '+i.d.name+' and finished '+Math.abs(i.ds).toFixed(1)+' points '+(i.ds>=0?'ahead of':'behind')+' the real playbook (scenario '+G.seed+'). Try it: '+url;
}
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src})}
async function drawCard(cv){
  if(!cv)return;
  const i=cardInfo(),W=1200,H=630,x=cv.getContext('2d'),hue=HUE[G.coId];
  cv.width=W;cv.height=H;
  try{await Promise.all([document.fonts.load('800 120px Archivo'),document.fonts.load('500 30px Archivo')])}catch(e){}
  const F=(w,px)=>w+' '+px+"px Archivo, 'Helvetica Neue', Arial, sans-serif";
  x.fillStyle=hue;x.fillRect(0,0,W,H);
  try{
    const m=/url\(["']?(.*?)["']?\)/.exec(getComputedStyle($bar).getPropertyValue('--photo'));
    if(m){const im=await loadImg(m[1]),s=Math.max(W/im.width,H/im.height);x.drawImage(im,(W-im.width*s)/2,(H-im.height*s)/2,im.width*s,im.height*s)}
  }catch(e){}
  const g=x.createLinearGradient(0,0,W,0);g.addColorStop(0,hue+'F5');g.addColorStop(.6,hue+'E0');g.addColorStop(1,hue+'80');
  x.fillStyle=g;x.fillRect(0,0,W,H);
  x.fillStyle='#fff';x.textBaseline='alphabetic';
  x.font=F(700,34);x.fillText('Pseudo CEO',64,86);
  x.globalAlpha=.8;x.font=F(500,30);{const t=(PL()?PL().name+', CEO of ':'')+i.c.name+', '+i.d.name+', '+i.n+' quarter'+(i.n>1?'s':'');let px=30;x.font=F(500,px);while(px>18&&x.measureText(t).width>W-128){px--;x.font=F(500,px)}x.fillText(t,64,150)}x.globalAlpha=1;
  x.font=F(800,i.fired?190:210);
  const big=i.fired?'Fired':fmtEdge(i.ds);
  x.fillText(big,56,360);
  x.font=F(500,36);x.globalAlpha=.92;
  x.fillText(i.fired?'after '+qLabel(G.firedAt)+'. The board lost patience.':'points vs the real '+i.c.ceo+' playbook',64,425);x.globalAlpha=1;
  x.font=F(600,30);
  x.fillText('Stock '+fmtPx(pxOf('st'))+(i.fired?'':' vs '+fmtPx(pxOf('ghost')))+',  decision grade '+i.grade,64,490);
  x.font=F(700,34);x.fillText(siteUrl().replace(/^https?:\/\//,''),64,574);
  x.globalAlpha=.7;x.font=F(500,17);x.textAlign='right';
  const p=PHOTO[G.coId];x.fillText('Photo: '+p.by+', '+p.lic,W-48,590);x.textAlign='left';x.globalAlpha=1;
  cv.setAttribute('aria-label',shareText());
}
function cardBlob(){const cv=document.getElementById('sharecv');return new Promise(res=>cv.toBlob(res,'image/png'))}
function flash(id,text,cls){const m=document.getElementById(id);if(m){m.textContent=text;m.className='note '+(cls||'')}}
async function shareResult(act){
  const text=shareText();
  try{
    if(act==='sharedl'){
      const b=await cardBlob(),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='pseudo-ceo-'+G.coId+'.png';document.body.appendChild(a);a.click();a.remove();
      NET.ev('share',{kind:'download'});flash('sharemsg','Image saved.','up');
    }else if(act==='sharecopy'){
      try{await navigator.clipboard.writeText(text)}catch(e){const t=document.createElement('textarea');t.value=text;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove()}
      NET.ev('share',{kind:'copy'});flash('sharemsg','Copied. Paste it anywhere.','up');
    }else{
      const b=await cardBlob(),f=new File([b],'pseudo-ceo.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[f]}))await navigator.share({files:[f],text});else await navigator.share({text,url:siteUrl()});
      NET.ev('share',{kind:'native'});
    }
  }catch(e){if(e&&e.name!=='AbortError')flash('sharemsg','Could not share from this browser. Try Save image.','down')}
}
function shareBlock(){
  const i=cardInfo();
  let h='<section class="section stack tight"><h3 class="h3">Share your result</h3><canvas id="sharecv" class="sharecv" role="img" aria-label="Result card"></canvas><div class="actions">';
  if(typeof navigator.share==='function')h+='<button class="btn" data-act="sharenative">Share</button>';
  h+='<button class="btn'+(typeof navigator.share==='function'?' sec':'')+'" data-act="sharedl">Save image</button><button class="btn sec" data-act="sharecopy">Copy text</button></div><p class="note" id="sharemsg"></p></section>';
  return h;
}
function postBlock(){
  if(!NET.ok)return '';
  if(G.status!=='done')return '<section class="section stack tight"><h3 class="h3">Leaderboard</h3><p class="note">Runs that end with the board replacing you are not ranked. Finish all '+D().quarters+' quarters to post a score.</p><div class="actions"><button class="btn sec" data-act="board">See the leaderboard</button></div></section>';
  if(!isRanked(G.seed))return '<section class="section stack tight"><h3 class="h3">Leaderboard</h3><p class="note">This game used a practice scenario code, so it cannot be ranked. Ranked codes are handed out by the server when the home screen loads. Tap Play again to get one.</p><div class="actions"><button class="btn sec" data-act="board">See the leaderboard</button></div></section>';
  return '<section class="section stack tight"><h3 class="h3">Post to the leaderboard</h3><p class="note">The server replays your choices to confirm the score. Only the name you enter and your result are saved, one row per player on each board.</p>'
   +'<div class="field"><label for="lbname">Display name</label><input id="lbname" maxlength="16" autocomplete="nickname" spellcheck="false" value="'+esc(store.get('pseudoceo.name')||plBoardName())+'"></div>'
   +'<div class="actions"><button class="btn" data-act="postscore">Post score</button><button class="btn sec" data-act="board">See the leaderboard</button></div><p class="note" id="lbmsg"></p></section>';
}
async function postScore(btn){
  const inp=document.getElementById('lbname'),name=(inp.value||'').trim();
  if(name.length<2){flash('lbmsg','Enter a name of 2 to 16 characters.','down');return}
  btn.disabled=true;flash('lbmsg','Checking your run on the server…');
  try{
    const r=await NET.post('/api/score',{pid:NET.pid,name,co:G.coId,d:G.diffKey,seed:G.seed,rewinds:Math.max(0,D().rewinds-G.rewinds),strategy:G.strategy||undefined,runs:G.log.map(l=>({ch:l.ch,ans:l.ans}))});
    store.set('pseudoceo.name',name);store.set('pseudoceo.lastboard',[G.coId,G.diffKey]);
    const mine=store.get('pseudoceo.mine')||[];if(!mine.includes(r.k)){mine.push(r.k);store.set('pseudoceo.mine',mine.slice(-30))}
    flash('lbmsg',(r.kept?'Posted. ':'You already have a higher score on this board, so that one stays. ')+'You are #'+r.rank+' of '+r.total+' on '+co().name+', '+D().name+'. Server-verified score: '+fmtEdge(r.edge)+' vs the real playbook.','up');
    btn.textContent=r.kept?'Posted':'Post score';btn.disabled=!r.kept?false:true;
  }catch(e){flash('lbmsg',e.message||'Could not reach the leaderboard.','down');btn.disabled=false}
}
function openBoard(c,d){UI.board.co=c;UI.board.d=d;UI.screen='board';NET.ev('board');loadBoard(true)}
async function loadBoard(top){
  const B=UI.board,tok=B.tok=(B.tok||0)+1;
  B.state='loading';B.rows=[];render();if(top)window.scrollTo(0,0);
  try{const j=await NET.get('/api/leaderboard?co='+B.co+'&d='+B.d);if(tok!==B.tok)return;B.rows=j.rows;B.total=j.total;B.state='ok'}
  catch(e){if(tok!==B.tok)return;B.state='err';B.err=e.message}
  if(UI.screen==='board')render();
}
function renderBoard(){
  const B=UI.board,mine=store.get('pseudoceo.mine')||[];
  let h='<div class="stack enter"><div class="section stack tight" style="border-top:0;padding-top:0"><h2 class="h3">Company</h2><div class="tabs" role="group" aria-label="Company">';
  for(const x of Object.values(CO))h+='<button class="tab" aria-pressed="'+(B.co===x.id)+'" data-act="bco" data-v="'+x.id+'" style="--c:'+HUE[x.id]+'">'+logo(x.id,'xs',1)+esc(x.name)+'</button>';
  h+='</div><h2 class="h3" style="margin-top:6px">Difficulty</h2><div class="tabs" role="group" aria-label="Difficulty">';
  for(const d of Object.values(DIFF))h+='<button class="tab" aria-pressed="'+(B.d===d.key)+'" data-act="bd" data-v="'+d.key+'">'+d.name+' <span class="faint">'+d.quarters+'q</span></button>';
  h+='</div></div>';
  if(B.state==='loading')h+='<p class="note">Loading scores…</p>';
  else if(B.state==='err')h+='<p class="note down">Could not load the leaderboard. '+esc(B.err||'')+'</p>';
  else if(!B.rows.length)h+='<div class="section stack tight"><h3 class="h3">No scores yet</h3><p class="body">Nobody has posted a '+esc(CO[B.co].name)+' run on '+DIFF[B.d].name+'. The top spot is open.</p><div class="actions"><button class="btn" data-act="pickstart">Play '+esc(CO[B.co].name)+' on '+DIFF[B.d].name+'</button></div></div>';
  else{
    h+='<div class="tblwrap"><table class="tbl board"><thead><tr><th>#</th><th>Name</th><th>vs real playbook</th><th>Score</th><th>Rewinds</th></tr></thead><tbody>';
    for(const r of B.rows){const me=mine.includes(r.k);
      h+='<tr'+(me?' class="tot"':'')+'><td class="n">'+r.rank+'</td><td class="t" style="color:var(--ink)">'+esc(r.name)+(me?' <span class="faint">(you)</span>':'')+'<div class="faint" style="font-size:12.5px">scenario '+esc(r.seed)+'</div></td><td class="n '+(r.edge>=0?'up':'down')+'">'+fmtEdge(r.edge)+'</td><td class="n">'+r.overall.toFixed(0)+'</td><td class="n">'+r.rewinds+'</td></tr>';}
    h+='</tbody></table></div><p class="note">'+B.total+' player'+(B.total===1?'':'s')+' ranked. Score is the 0 to 100 overall scorecard. Rewinds used are self-reported; everything else is recomputed by the server. Only completed games are ranked.</p>';
    h+='<div class="actions"><button class="btn" data-act="pickstart">Play '+esc(CO[B.co].name)+' on '+DIFF[B.d].name+'</button></div>';
  }
  h+='</div>';$app.innerHTML=h;
}

/* ---------- render & events ---------- */
function render(){
  document.body.dataset.co=UI.screen==='board'?UI.board.co:(G&&UI.screen!=='home')?G.coId:UI.setup.co;
  renderBar();renderHud();
  ({home:renderHome,welcome:renderWelcome,story:renderStory,fired:renderFired,brief:renderBrief,card:renderCard,alloc:renderAlloc,results:renderResults,call:renderCall,debrief:renderDebrief,board:renderBoard})[UI.screen]();
  renderDesk();
}
function keepSeed(){const inp=document.getElementById('seed');if(inp&&inp.value!==UI.setup.seed){UI.setup.seed=inp.value;UI.setup.auto=false}}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  const act=b.dataset.act,v=b.dataset.v;
  switch(act){
    case 'home':keepSeed();if(UI.desk)closeDesk();UI.screen='home';render();window.scrollTo(0,0);break;
    case 'pickco':keepSeed();UI.setup.co=v;render();break;
    case 'pickdiff':keepSeed();UI.setup.diff=v;render();break;
    case 'start':startGame();break;
    case 'plclear':store.del(PKEY);render();break;
    case 'desk':openDesk();break;
    case 'deskx':closeDesk();break;
    case 'resume':{const sv=store.get(SAVE);if(saveOK(sv)){G=sv.G;Object.assign(UI,sv.UI);if(UI.screen==='home')UI.screen='brief';if(UI.screen==='strategy')UI.screen='story';render();window.scrollTo(0,0)}break}
    case 'discard':store.del(SAVE);G=null;render();break;
    case 'dash':UI.dash=!UI.dash;renderHud();break;
    case 'begin':go('brief');break;
    case 'lastres':go('results');break;
    case 'agenda':UI.card=0;go(quarterCards().length?'card':'alloc');break;
    case 'pickopt':UI.picks[quarterCards()[UI.card]]=+v;renderCard();save();break;
    case 'nextcard':if(UI.card+1<quarterCards().length){UI.card++;go('card')}else go('alloc');break;
    case 'back':
      if(UI.screen==='alloc'){if(quarterCards().length){UI.card=quarterCards().length-1;go('card')}else go('brief')}
      else if(UI.card>0){UI.card--;go('card')}else go('brief');break;
    case 'alloc':UI.alloc[b.dataset.k]=v;renderAlloc();save();break;
    case 'commit':commit();break;
    case 'call':UI.answers=[];UI.callRes=null;go('call');break;
    case 'tone':UI.answers[+b.dataset.i]=v;renderCall();save();break;
    case 'endcall':{
      const res=applyCall(G,'st',G.call.qs,UI.answers);
      G.call.done=true;G.log[G.log.length-1].call=res;G.log[G.log.length-1].ans=UI.answers.slice();UI.callRes=res;
      renderHud();renderCall();save();break}
    case 'nextq':go('brief');break;
    case 'rewind':if(rewind(G)){UI.card=0;UI.picks={};UI.alloc=null;go('brief')}break;
    case 'debrief':store.del(SAVE);reportEnd();go('debrief');break;
    case 'board':{const lb=store.get('pseudoceo.lastboard');if(G&&UI.screen==='debrief')openBoard(G.coId,G.diffKey);else if(lb&&CO[lb[0]]&&DIFF[lb[1]])openBoard(lb[0],lb[1]);else openBoard(UI.setup.co,UI.setup.diff);break}
    case 'pickstart':UI.setup.co=UI.board.co;UI.setup.diff=UI.board.d;UI.screen='home';render();window.scrollTo(0,0);break;
    case 'bco':UI.board.co=v;loadBoard();break;
    case 'bd':UI.board.d=v;loadBoard();break;
    case 'postscore':postScore(b);break;
    case 'sharenative':case 'sharedl':case 'sharecopy':shareResult(act);break;
    case 'again':UI.setup={co:G.coId,diff:G.diffKey,seed:randSeed(),auto:true};fetchSeed();startGame();break;
    case 'same':UI.setup={co:G.coId,diff:G.diffKey,seed:G.seed,auto:false};startGame();break;
  }
});

document.addEventListener('submit',e=>{if(e.target&&e.target.id==='lead'){e.preventDefault();enterGame()}else if(e.target&&e.target.id==='contactform'){e.preventDefault();submitContact()}});
document.addEventListener('input',e=>{
  if(e.target&&e.target.id==='seed'){UI.setup.seed=e.target.value;UI.setup.auto=false;seedNote()}
  const t=e.target;if(t&&(t.id==='plname'||t.id==='plemail'||t.id==='ctemail'||t.id==='ctname')){const er=document.getElementById(t.id+'-e');if(er)er.textContent='';t.removeAttribute('aria-invalid')}
  if(e.target&&e.target.id==='plname'){const h=document.getElementById('wl-h'),l=plLast(e.target.value);if(h)h.textContent=l&&plNameOK(e.target.value)?'Welcome, CEO '+l+'.':'Welcome, future CEO.'}
});
/* ---------- boot ---------- */
function boot(data){{const sv=store.get(SAVE);if(sv&&!saveOK(sv))store.del(SAVE)}if(data&&data.G&&saveOK(data)){G=data.G;UI=Object.assign(UI,data.UI)}if(UI.screen==='board')UI.screen='home';if(UI.screen==='strategy')UI.screen='story';render();NET.ev('view');sendLead();if(UI.setup.auto&&!isRanked(UI.setup.seed))fetchSeed()}
if(window.claude&&window.claude.hot&&window.claude.hot.snapshot)window.claude.hot.snapshot(()=>({G,UI}));
if(window.claude&&window.claude.hot&&window.claude.hot.ready)window.claude.hot.ready(boot);else boot((window.claude&&window.claude.hot&&window.claude.hot.data)||{});
