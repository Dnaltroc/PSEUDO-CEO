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
let UI={screen:'home',setup:{co:'intc',diff:'medium',seed:randSeed()},card:0,picks:{},alloc:null,last:null,prevMeters:null,prevIdx:100,dash:false,answers:[],callRes:null,board:{co:'intc',d:'medium',state:'idle',rows:[],total:0}};

function randSeed(){const w=['ledger','harbor','granite','cobalt','summit','tandem','meridian','quarry','lantern','pivot','anchor','vector','orchard','forge','beacon','delta'];const r=Math.random;return w[Math.floor(r()*w.length)]+'-'+(100+Math.floor(r()*900))}

/* ---------- helpers ---------- */
function co(){return CO[G.coId]}
function D(){return DIFF[G.diffKey]}
function lastRec(st){return st.hist.length?st.hist[st.hist.length-1]:null}
function curMargin(st){const r=lastRec(st);return r?r.margin:CO[G.coId].start.m}
function kpiFmt(c,v){return c.kpi.fmt(v)}
function lvl(){return D().hints}
function isPlain(){return lvl()==='plain'}
function isFull(){return lvl()==='numbers'}
function save(){if(G)store.set(SAVE,{G,UI:{screen:UI.screen,card:UI.card,picks:UI.picks,alloc:UI.alloc,last:UI.last,prevMeters:UI.prevMeters,prevIdx:UI.prevIdx,answers:UI.answers,callRes:UI.callRes}})}
function go(screen){UI.screen=screen;render();window.scrollTo(0,0);save()}
function initials(n){return n.split(/\s+/).map(w=>w[0]).slice(0,2).join('')}
const ROLE_CLS={cfo:'',coo:'r2',cco:'r3',gc:'r4',cpo:'r5'};
function avatar(name,k,sm){return '<span class="av '+(k?ROLE_CLS[k]||'':'ext')+(sm?' sm':'')+'" aria-hidden="true">'+esc(initials(name))+'</span>'}
function jobsFmt(n){return n>=1000?(Math.round(n/100)*100).toLocaleString('en-US'):Math.round(n).toLocaleString('en-US')}

/* plain-English vocabulary for Easy */
const PLAIN={g:'Sales growth',m:'Profit per sale',cash:'Cash',cr:'Cash',debt:'Debt',dr:'Debt',inv:'Investor mood',brd:'Board support',emp:'Employee morale',cus:'Customer happiness',reg:'Government goodwill',exe:'How smoothly things run',shares:'Shares outstanding',div:'Dividend'};
const METER_PLAIN={inv:['Investor mood','How Wall Street feels about the stock'],brd:['Board support','Your bosses. Too low and they replace you'],emp:['Employee morale','Low morale slows everything down'],cus:['Customer happiness','Happy customers buy more'],reg:['Government goodwill','Regulators can help or hurt you'],exe:['Execution','How smoothly the company runs']};
function meterName(k){if(isPlain())return METER_PLAIN[k][0];return METERS.find(m=>m[0]===k)[1]}
function varName(k){const c=co();if(k==='kpi')return isPlain()?c.kpi.plain:c.kpi.short;return isPlain()?PLAIN[k]:VAR_LABEL[k]}

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
  if(b)out+='<polyline points="'+pts(b)+'" fill="none" stroke="var(--brass)" stroke-width="1.5" stroke-dasharray="3 2"/>';
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

/* ---------- scoreboard band ---------- */
const MARK='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2.5" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3.5 13h17M7 13v8M17 13v8M7 17.5h10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"/></svg>';
function renderBar(){
  const onBoard=UI.screen==='board';
  const inGame=G&&UI.screen!=='home'&&!onBoard;
  const bco=onBoard?UI.board.co:inGame?G.coId:UI.setup.co;
  let h='<div class="wrap"><div class="row1"><button class="brand" data-act="home" aria-label="Pseudo CEO, home">'+MARK+'Pseudo CEO</button><span class="grow"></span>';
  if(!inGame&&NET.ok&&!onBoard)h+='<button class="bandbtn" data-act="board">Leaderboard</button>';
  if(onBoard)h+='<button class="bandbtn" data-act="home">Back</button>';
  if(inGame)h+='<span style="font-size:13.5px;opacity:.75">'+esc(D().name)+'</span><button class="bandbtn" data-act="home">Exit</button>';
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
  return ({brief:'Briefing',card:'Decision '+(UI.card+1)+' of '+n,alloc:'Decision '+n+' of '+n,results:'Results',call:'Earnings call'})[UI.screen]||'';
}
function scoreboard(){
  const c=co(),st=G.st,d=D(),P=isPlain(),F=isFull(),mg=curMargin(st);
  const debrief=UI.screen==='debrief';
  const shownQ=Math.max(0,Math.min((UI.screen==='results'||UI.screen==='call')?G.q-1:G.q,d.quarters-1));
  let h='<div class="co-line"><div><div class="co-name">'+c.name+'</div><div class="co-sub">'+(debrief?'Final results':qLabel(shownQ)+', '+qMonths(shownQ))+'</div></div>';
  h+='<div class="score"><div class="n">'+st.idx.toFixed(F?1:0)+'</div><div class="k">'+(P?'company score':'value index')+', started at 100'+(d.ghostLive?'. Real playbook: '+G.ghost.idx.toFixed(0):'')+'</div></div></div>';
  /* quarter track: one block per quarter, filled as played, coral when the index fell */
  h+='<div class="track-wrap"><div class="track" aria-label="Quarter '+Math.min(G.q+1,d.quarters)+' of '+d.quarters+'">';
  for(let i=0;i<d.quarters;i++){
    const r=st.hist[i];
    const cls=r?('done'+(r.ret<0?' neg':'')):(i===G.q&&G.status==='play'?'now':'');
    h+='<i class="'+cls+'" title="'+qLabel(i)+(r?': index '+r.idx.toFixed(1):'')+'"></i>';
  }
  const played=st.hist.length;
  h+='</div><div class="k2"><span>'+(debrief?played+' of '+d.quarters+' quarters played':'Quarter '+Math.min(G.q+(UI.screen==='results'||UI.screen==='call'?0:1),d.quarters)+' of '+d.quarters+' <b>'+stageLabel()+'</b>')+(G.rewinds>0&&!debrief?'. '+G.rewinds+' rewind'+(G.rewinds>1?'s':'')+' left':'')+'</span>'+(debrief?'':'<button class="bandbtn sm" data-act="dash" aria-expanded="'+UI.dash+'">'+(UI.dash?'Fewer numbers':'More numbers')+'</button>')+'</div></div>';
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
  if(sv&&sv.G&&(sv.G.status==='play'||(sv.G.call&&!sv.G.call.done))){
    const sc=CO[sv.G.coId];
    h+='<section class="section actions" style="justify-content:space-between"><div><h3 class="h3">Game in progress</h3><div><b>'+sc.name+'</b>, '+DIFF[sv.G.diffKey].name+', '+qLabel(Math.min(sv.G.q,DIFF[sv.G.diffKey].quarters-1))+'</div></div><div class="actions"><button class="btn" data-act="resume">Resume</button><button class="btn sec" data-act="discard">Discard</button></div></section>';
  }
  h+='<section class="stack tight"><div class="step"><span class="n">01</span><h2 class="h3">Choose a company</h2></div><div class="grid-co" role="radiogroup" aria-label="Company">';
  for(const x of Object.values(CO)){
    const best=(store.get(BEST)||{})[x.id+':'+s.diff];
    h+='<button class="choice" style="--c:'+HUE[x.id]+'" role="radio" aria-checked="'+(s.co===x.id)+'" data-act="pickco" data-v="'+x.id+'"><span class="thumb th-'+x.id+'" aria-hidden="true"></span><span class="t"><span>'+esc(x.sector)+'</span>'+(best?'<span>best '+best.toFixed(0)+'</span>':'')+'</span><span class="n">'+x.name+'</span><span class="s">'+esc(x.dilemma)+'</span><span class="d">'+(x.workforce/1000).toFixed(0)+'k employees</span></button>';
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
  h+='<div class="field"><label for="seed">Scenario code. Share it so a friend faces the same events.</label><input id="seed" value="'+esc(s.seed)+'" autocomplete="off" spellcheck="false"></div>';
  h+='<div class="actions"><button class="btn" data-act="start">Start as CEO of '+c.name+'</button></div></section>';
  h+='<details class="fold"><summary>How it works</summary><ul class="list">';
  h+='<li>Each company starts from its latest 10-K and 10-Q, pulled from SEC filing data. Every starting figure links to its filing.</li>';
  h+='<li>The right call depends on your position. A big bet is smart with cash to spare and reckless when cash is tight. Each option shows what your situation means for it.</li>';
  h+='<li>Five named executives advise you. They remember when you overrule them, and an advisor who loses trust resigns. Advisors and analysts are fictional.</li>';
  h+='<li>After each quarter you take questions on the earnings call. Overselling bad news buys a quarter of calm and costs you if the next quarter misses.</li>';
  h+='<li>Layoff decisions show the company’s real headcount, sites, unions and recent layoff rounds, with sources.</li>';
  h+='<li>The <b>value index</b> starts at 100 and tracks a simplified equity value. It is not a stock forecast. The <b>real playbook</b> plays the same scenario with leadership’s announced choices.</li>';
  h+='<li>Photos come from Wikimedia Commons under the licenses credited on each banner.</li>';
  h+='<li>Leaderboard: after you finish a game you can post it under a name you choose. The server replays your choices to confirm the score, so numbers cannot be typed in. Only your name and result are saved.</li>';
  h+='<li>Privacy: the site counts anonymous plays (which company and difficulty were picked, how far games got) and unique players using a random ID kept in your browser. No names, emails or addresses are stored. Turn on Do Not Track in your browser to opt out. An hour-long abuse limit uses a scrambled form of your connection address that is not kept.</li><li>Simulation only; not investment advice.</li></ul></details>';
  h+='</div>';
  $app.innerHTML=h;
}

/* ---------- start / quarter ---------- */
function startGame(){
  const s=UI.setup;const inp=document.getElementById('seed');
  if(inp&&inp.value.trim())s.seed=inp.value.trim().slice(0,40);
  G=newGame(s.co,s.diff,s.seed);
  UI.card=0;UI.picks={};UI.alloc=null;UI.last=null;UI.answers=[];UI.callRes=null;UI.dash=false;
  NET.ev('start',{co:s.co,d:s.diff});
  go('brief');
}
function quarterCards(){return G.plan.quarters[G.q].cards}
function defaultAlloc(){return {reinvest:'hold',ret:G.st.div>0?'hold':'none',debt:'hold',guide:'maintain'}}

/* ---------- BRIEFING ---------- */
function renderBrief(){
  const c=co(),q=G.q,pq=G.plan.quarters[q],d=D(),P=isPlain();
  let agendaHtml='<div class="section stack tight"><h3 class="h3">Agenda for this quarter</h3><ol class="agenda">';
  for(const cid of pq.cards){const cd=CARD[cid];agendaHtml+='<li><span>'+esc(cd.title)+'</span><span class="c">'+esc(cd.isEvent?'Response':cd.cat)+'</span></li>'}
  agendaHtml+='<li><span>'+(P?'Money plan and promise to Wall Street':'Capital plan and guidance')+'</span><span class="c">Allocation</span></li><li><span>Earnings call</span><span class="c">Investors</span></li></ol></div>';
  let h='<div class="stack enter">';
  h+='<div class="kicker">Board briefing for <b>'+qLabel(q)+'</b>, '+qMonths(q)+'</div>';
  if(q===0){
    h+='<h1 class="h1">You are the new CEO of '+c.name+'.</h1><p class="lede">'+esc(c.pitch)+'</p>';
    h+='<div class="section stack tight"><h3 class="h3">Where it stands</h3><ul class="facts">'+c.facts.map(f=>'<li>'+esc(f[0])+' '+ext(f[1],'Source')+'</li>').join('')+'</ul>';
    h+=P?'<p class="note">Your key number is <b>'+esc(c.kpi.plain)+'</b>: '+esc(c.kpi.plainD)+' It is '+kpiFmt(c,G.st.kpi)+' today.</p>':'<p class="note">Key number: <b>'+esc(c.kpi.name)+'</b> ('+esc(c.kpi.unit)+'), now '+kpiFmt(c,G.st.kpi)+'.</p>';
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
    h+=P?'<p class="lede">Last quarter you sold '+fmtB(r.rev)+', '+(r.g>=0?'up ':'down ')+Math.abs(r.g).toFixed(1)+'%. You '+(r.op>=0?'kept '+fmtB(r.op)+' in operating profit':'lost '+fmtB(Math.abs(r.op))+' running the business')+' and have '+fmtB(r.cash)+' in the bank. Company score: '+r.idx.toFixed(1)+'.</p>'
         :'<p class="lede">Last quarter: revenue '+fmtB(r.rev)+' ('+fmtPct(r.g)+' q/q), operating margin '+r.margin.toFixed(1)+'%, cash '+fmtB(r.cash)+', value index '+r.idx.toFixed(1)+'.</p>';
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
    h+='<div class="section event'+(good?' good':'')+' stack tight"><div class="flag">'+(good?'Good news this quarter':'Trouble this quarter')+'</div><h3 class="h2" style="font-size:24px">'+esc(e.title)+'</h3><p class="body">'+esc(e.body)+'</p><p class="note">'+(e.opts?'You will decide how to respond.':'No decision needed. It will show up in your results.')+'</p></div>';
  }
  if(isFull()){h+=pipelineTable();if(G.st.hist.length)h+=historyTable()}
  if(q!==0)h+=agendaHtml;
  h+='<div class="actions stick"><button class="btn" data-act="agenda">'+(pq.cards.length?'Open the first decision':'Go to the capital plan')+'</button></div></div>';
  $app.innerHTML=h;
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
  h+='<div class="stack tight"><div class="kicker">Decision '+(UI.card+1)+' of '+total+'. <b>'+esc(cd.isEvent?'Response to events':cd.cat)+'</b></div><h2 class="h2">'+esc(cd.title)+'</h2></div>';
  h+='<p class="body">'+esc(cd.body)+(cd.src?' '+ext(cd.src,'Source'):'')+'</p>';
  // advisors
  let advIdx=cd.opts.map((o,i)=>i);
  h+='<div class="section stack tight"><h3 class="h3">Your team weighs in</h3><div class="advisors">';
  for(const i of advIdx){const o=cd.opts[i];if(!o.a)continue;
    const k=roleOf(o.a[0]);const m=k?G.cab[k]:null;
    const name=m?m.name:o.a[0],title=m?m.title:'';
    h+='<div class="adv">'+avatar(m?m.name:o.a[0],k)+'<div><q>'+esc(o.a[1])+'</q><div class="who"><b>'+esc(name)+'</b>'+(title?'<span>'+esc(title)+'</span>':'')+'<span>backs '+LET[i]+'</span>';
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
  if(isPlain()){
    const words=glossFor(cd.title+' '+cd.body+' '+cd.opts.map(o=>o.l+' '+o.d).join(' '));
    if(words.length)h+='<div class="section gloss stack tight"><h3 class="h3">Words to know</h3><dl>'+words.map(w=>'<div><dt>'+esc(w[1])+'</dt><dd>'+esc(w[2])+'</dd></div>').join('')+'</dl></div>';
  }
  if(isFull())h+='<p class="note">Sizes are averages; each is drawn at random within roughly ±'+Math.round(35*d.sd)+'%. Delays include Hot Seat’s slower payoffs. Growth and margin are percentage points; meters run 0 to 100.</p>';
  h+='<div class="actions stick"><button class="btn sec" data-act="back">Back</button><span class="grow"></span><button class="btn" data-act="nextcard" '+(UI.picks[cid]==null?'disabled':'')+'>'+(UI.card+1<cards.length?'Next decision':(isPlain()?'Go to the money plan':'Go to the capital plan'))+'</button></div></div>';
  $app.innerHTML=h;
}

/* ---------- ALLOCATION ---------- */
function choicesNow(){return {cards:Object.assign({},UI.picks),reinvest:UI.alloc.reinvest,ret:UI.alloc.ret,debt:UI.alloc.debt,guide:UI.alloc.guide}}
function renderAlloc(){
  if(!UI.alloc)UI.alloc=defaultAlloc();
  const c=co(),st=G.st,d=D(),m=allocMenu(c,st);
  const cards=quarterCards(),total=cards.length+1;
  const a=assess(G,choicesNow());
  const P=isPlain(),F=isFull(),lev=leverage(st,c);
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
  h+='<div class="stack tight"><div class="kicker">Decision '+total+' of '+total+'. <b>'+(P?'Money':'Capital allocation')+'</b></div><h2 class="h2">'+(P?'Set the money plan':'Set the capital plan')+'</h2><p class="lede">Each choice starts on <b>keep things as they are</b>. Change only what you want to, then close the quarter.'+(isFull()?'':' Your CFO, '+G.cab.cfo.name.split(' ')[0]+', flags any risk at the bottom.')+'</p></div>';
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
  go('results');
}
function recordBest(){
  const s=scorecard(G.st,co()).overall,b=store.get(BEST)||{},k=G.coId+':'+G.diffKey;
  if(G.status==='done'&&(!b[k]||s>b[k])){b[k]=s;store.set(BEST,b)}
}

/* ---------- RESULTS ---------- */
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
  h+=row('Company score',r.idx.toFixed(1),(chg>=0?'Up ':'Down ')+Math.abs(chg).toFixed(1)+'%. 100 is where you started.',chg>=0?'up':'down');
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
  h+=row('Value index',r.idx.toFixed(2),fmtPct(chg,2),chg>=0?'up':'down');
  h+=row('Next quarter’s Street target',fmtB(r.expNext),'guidance: '+r.guide);
  h+=row(esc(c.kpi.name),kpiFmt(c,r.kpi),esc(c.kpi.unit));
  return h+'</tbody></table></div></div>';
}
function renderResults(){
  const c=co(),r=UI.last,d=D(),q=G.q-1,F=isFull(),P=isPlain();
  const beat=r.s>0.02,miss=r.s<-0.02,chg=(r.idx/UI.prevIdx-1)*100;
  let h='<div class="stack enter">';
  h+='<div class="kicker">Simulated earnings release for <b>'+qLabel(q)+'</b></div>';
  h+='<div class="verdict"><h1 class="h1">'+esc(c.name+(beat?' beats':miss?' misses':' meets')+' expectations')+'</h1><span class="stamp '+(beat?'up':miss?'down':'flat')+'">'+(beat?'Beat':miss?'Miss':'In line')+'</span></div>';
  h+=P?resultsPlain(c,r,beat,miss,chg):F?resultsFull(c,r,beat,miss,chg,q):resultsStandard(c,r,beat,miss,chg,q);
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
  h+='<div class="kicker">'+c.name+' '+qLabel(q)+' earnings call, live questions</div>';
  h+='<h1 class="h1">Analysts have questions.</h1>';
  h+='<p class="lede">'+(P?'Pick how you answer each one. Confident works when the news is good. When the news is bad, being candid usually builds more trust; overselling can come back to bite you next quarter.':'Choose a tone for each answer. Overselling bad news buys calm now and costs you if next quarter misses.')+'</p>';
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
  h+='<div class="kicker">Debrief for '+c.name+' on '+d.name+', scenario '+esc(G.seed)+'</div><h1 class="h1">'+esc(title)+'</h1>';
  h+='<p class="lede">You ran '+c.name+' for '+n+' quarter'+(n>1?'s':'')+'. Your '+(P?'company score':'value index')+' finished at '+G.st.idx.toFixed(1)+'; the real playbook finished at '+G.ghost.idx.toFixed(1)+' in the same scenario ('+(dv>=0?'+':'−')+Math.abs(dv).toFixed(1)+').</p>';
  h+=shareBlock();
  h+='<div class="section scores">';
  h+='<div class="big"><span class="k">Overall score</span><span class="v">'+me.overall.toFixed(0)+'</span><span class="k">real playbook '+gh.overall.toFixed(0)+'</span></div>';
  h+='<div class="big"><span class="k">Decision quality</span><span class="v">'+gr+'</span><span class="k">'+(P?'How well your choices fit your situation at the time. A is best.':ps.toFixed(2)+' of 3, judged on what you knew')+'</span></div>';
  h+='<div class="big"><span class="k">Luck</span><span class="v '+(luck>=0?'up':'down')+'">'+(luck>=0?'+':'−')+Math.abs(luck).toFixed(1)+'</span><span class="k">'+(P?(luck>=0?'Points gained from good breaks':'Points lost to bad breaks'):'index points from breaks you did not control')+'</span></div></div>';
  h+='<div class="section stack tight chart"><h3 class="h3">Value index by quarter</h3>';
  h+=lineChart([{v:exp.idxHist,c:'var(--faint)',dash:'2 4',w:1.5},{v:G.ghost.idxHist,c:'var(--brass)',dash:'6 4'},{v:G.st.idxHist,c:'var(--accent)',w:2.5}],n);
  h+='<div class="legend"><span><i style="border-color:var(--accent)"></i>You</span><span><i style="border-color:var(--brass);border-top-style:dashed"></i>Real playbook</span><span><i style="border-color:var(--faint);border-top-style:dotted"></i>Your choices without luck</span></div></div>';
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
  h+='<li>Decision quality compares your option with the best fit for your situation at the time, not with how the dice landed.</li>';
  h+='<li>Advisors and analysts are fictional. Workforce figures are real. Simulation only; not investment advice.</li></ul>';
  h+='<div class="links" style="margin-top:12px">'+c.facts.map((f,i)=>ext(f[1],'Fact source '+(i+1))).join('')+'</div>'+'<div style="margin-top:8px">'+sourcesBlock(c)+'</div></details>';
  h+=postBlock();
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
  x.globalAlpha=.8;x.font=F(500,30);x.fillText(i.c.name+', '+i.d.name+', '+i.n+' quarter'+(i.n>1?'s':''),64,150);x.globalAlpha=1;
  x.font=F(800,i.fired?190:210);
  const big=i.fired?'Fired':fmtEdge(i.ds);
  x.fillText(big,56,360);
  x.font=F(500,36);x.globalAlpha=.92;
  x.fillText(i.fired?'after '+qLabel(G.firedAt)+'. The board lost patience.':'points vs the real '+i.c.name+' playbook',64,425);x.globalAlpha=1;
  x.font=F(600,30);
  x.fillText((i.fired?'Value index '+G.st.idx.toFixed(0):'Value index '+G.st.idx.toFixed(0)+' vs '+G.ghost.idx.toFixed(0))+',  decision grade '+i.grade,64,490);
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
  return '<section class="section stack tight"><h3 class="h3">Post to the leaderboard</h3><p class="note">The server replays your choices to confirm the score. Only the name you enter and your result are saved, one row per player on each board.</p>'
   +'<div class="field"><label for="lbname">Display name</label><input id="lbname" maxlength="16" autocomplete="nickname" spellcheck="false" value="'+esc(store.get('pseudoceo.name')||'')+'"></div>'
   +'<div class="actions"><button class="btn" data-act="postscore">Post score</button><button class="btn sec" data-act="board">See the leaderboard</button></div><p class="note" id="lbmsg"></p></section>';
}
async function postScore(btn){
  const inp=document.getElementById('lbname'),name=(inp.value||'').trim();
  if(name.length<2){flash('lbmsg','Enter a name of 2 to 16 characters.','down');return}
  btn.disabled=true;flash('lbmsg','Checking your run on the server…');
  try{
    const r=await NET.post('/api/score',{pid:NET.pid,name,co:G.coId,d:G.diffKey,seed:G.seed,rewinds:Math.max(0,D().rewinds-G.rewinds),runs:G.log.map(l=>({ch:l.ch,ans:l.ans}))});
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
  for(const x of Object.values(CO))h+='<button class="tab" aria-pressed="'+(B.co===x.id)+'" data-act="bco" data-v="'+x.id+'" style="--c:'+HUE[x.id]+'">'+esc(x.name)+'</button>';
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
  ({home:renderHome,brief:renderBrief,card:renderCard,alloc:renderAlloc,results:renderResults,call:renderCall,debrief:renderDebrief,board:renderBoard})[UI.screen]();
}
function keepSeed(){const inp=document.getElementById('seed');if(inp)UI.setup.seed=inp.value}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b||b.disabled)return;
  const act=b.dataset.act,v=b.dataset.v;
  switch(act){
    case 'home':keepSeed();UI.screen='home';render();window.scrollTo(0,0);break;
    case 'pickco':keepSeed();UI.setup.co=v;render();break;
    case 'pickdiff':keepSeed();UI.setup.diff=v;render();break;
    case 'start':startGame();break;
    case 'resume':{const sv=store.get(SAVE);if(sv&&sv.G){G=sv.G;Object.assign(UI,sv.UI);if(UI.screen==='home')UI.screen='brief';render();window.scrollTo(0,0)}break}
    case 'discard':store.del(SAVE);G=null;render();break;
    case 'dash':UI.dash=!UI.dash;renderHud();break;
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
    case 'again':UI.setup={co:G.coId,diff:G.diffKey,seed:randSeed()};startGame();break;
    case 'same':UI.setup={co:G.coId,diff:G.diffKey,seed:G.seed};startGame();break;
  }
});

/* ---------- boot ---------- */
function boot(data){if(data&&data.G){G=data.G;UI=Object.assign(UI,data.UI)}if(UI.screen==='board')UI.screen='home';render();NET.ev('view')}
if(window.claude&&window.claude.hot&&window.claude.hot.snapshot)window.claude.hot.snapshot(()=>({G,UI}));
if(window.claude&&window.claude.hot&&window.claude.hot.ready)window.claude.hot.ready(boot);else boot((window.claude&&window.claude.hot&&window.claude.hot.data)||{});
