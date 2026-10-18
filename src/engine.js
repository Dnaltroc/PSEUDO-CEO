/* ============================================================
   PSEUDO CEO — simulation engine + content
   Numbers are computed here. Words around them are templates.
   ============================================================ */

/* ---------- seeded randomness ---------- */
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function rngFor(){return mulberry(hashStr(Array.prototype.join.call(arguments,'|')))}
function gauss(r){let u=0;while(u===0)u=r();const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const sum=a=>a.reduce((x,y)=>x+y,0);
const clone=o=>JSON.parse(JSON.stringify(o));

/* ---------- difficulty ---------- */
const DIFF={
  easy:{key:'easy',name:'Guided',quarters:8,time:'About 15 min',sd:0.6,lag:0.5,ev:0.35,evMul:1,hints:'plain',fire:null,rewinds:3,ghostLive:true,fog:false,advisors:'rec',
    blurb:'Plain English. Every number is explained, every term is defined, each choice shows what it helps or hurts, and an advisor flags the strongest option. The board cannot fire you. 3 rewinds.'},
  medium:{key:'medium',name:'Standard',quarters:12,time:'About 30 min',sd:1,lag:1,ev:0.5,evMul:1,hints:'tags',fire:{below:28,streak:2},rewinds:1,ghostLive:false,fog:false,advisors:'all',
    blurb:'Standard finance terms, no definitions. You see what each choice touches, not which way it moves. Advisors disagree. Two bad board quarters in a row and you are out. 1 rewind.'},
  hard:{key:'hard',name:'Hot Seat',quarters:16,time:'About 45–60 min',sd:1.4,lag:1.5,ev:0.7,evMul:1.3,hints:'numbers',fire:{below:32,streak:1},rewinds:0,ghostLive:false,fog:false,advisors:'all',
    blurb:'Everything on the table: full financial statements, exact effect sizes, odds and timing, and the effects still in your pipeline. Slower payoffs, bigger shocks, and one bad board quarter ends it. No rewinds.'}
};

/* ---------- labels ---------- */
const METERS=[['inv','Investors'],['brd','Board'],['emp','Workforce'],['cus','Customers'],['reg','Regulators'],['exe','Execution']];
const VAR_LABEL={g:'Growth',m:'Margin',cash:'Cash',cr:'Cash',debt:'Debt',dr:'Debt',inv:'Investors',brd:'Board',emp:'Workforce',cus:'Customers',reg:'Regulators',exe:'Execution',shares:'Share count',div:'Dividend'};
const VAR_GOOD={g:1,m:1,cash:1,cr:1,debt:-1,dr:-1,inv:1,brd:1,emp:1,cus:1,reg:1,exe:1,shares:-1,div:0};

/* fx tuple: [var, mean, lag, dur]
   g, m      : percentage-point modifiers to quarterly growth / operating margin, active for dur quarters
   cash,debt : $B per active quarter          cr,dr : % of quarterly revenue per active quarter
   meters    : one-time points                 kpi   : one-time change
   shares    : one-time % change in share count  div : one-time % change in the dividend
   ['flag', name] sets a flag */

/* ---------- companies ---------- */
const CO={
intc:{id:'intc',name:'Intel',ticker:'INTC',sector:'Semiconductors',ceo:'Lip-Bu Tan',dilemma:'Bet-the-company capex',
  pitch:'The products business is recovering. The foundry still loses about $2 billion a quarter, and almost all of its revenue comes from Intel itself.',
  start:{rev:16.128,g:1.0,m:11.1,cash:29.73,debt:50.54,da:2.93,capex:3.66,wc:0,div:0,mult:6,kpi:0.29},
  est:[],
  meters:{inv:65,brd:55,emp:40,cus:50,reg:60,exe:50},
  kpi:{plain:'Outside chip sales',plainS:'Chips made for other companies',plainD:'Money from making chips for other companies, per quarter. Higher is better.',name:'External foundry revenue',short:'Ext. foundry',unit:'$B/qtr',good:1,drift:0.02,min:0,max:6,fmt:v=>'$'+v.toFixed(2)+'B'},
  real:{reinvest:'raise',ret:'none',debt:'hold'},
  facts:[
    ['Q2 2026 revenue was $16.1B, up 25% from a year earlier.','https://cryptobriefing.com/intel-earnings-operational-turnaround-q2-2026/'],
    ['Intel Foundry lost $2.1B on $5.8B of revenue in Q2 2026, a −36% operating margin.','https://fourweekmba.com/ai-intel-foundry-q2-2026-losses-narrowing/'],
    ['About $293M of that foundry revenue came from outside customers.','https://www.webull.com/news/15685876526629888'],
    ['14A high-volume manufacturing is targeted for 2028, with no confirmed external volume customer.','https://fourweekmba.com/ai-intel-foundry-q2-2026-losses-narrowing/']
  ],
  deck:[
    {id:'intc-14a',cat:'Capital allocation',title:'How hard do you bet on 14A?',at:0,
     body:'Your 14A process targets high-volume production in 2028. Outside customers are asking how much capacity they can reserve, but none has signed for volume. Each quarter of clean-room construction costs billions.',
     src:'https://fourweekmba.com/ai-intel-foundry-q2-2026-losses-narrowing/',
     why:'When a capex bet depends on customers you have not signed, staging spend against commitments keeps the option alive without betting the balance sheet.',
     opts:[
      {l:'Build the full 14A line now',d:'About $6B extra over four quarters. Capacity is ready if customers come.',fx:[['cash',-1.5,0,4],['g',0.8,6,99],['kpi',0.4,5],['inv',-4],['exe',-2]],q:2,a:['Chief Technology Officer','If we wait for signatures, we will be late again. Late is how we lost this business.']},
      {l:'Build in stages against signed commitments',d:'About $2.4B over four quarters, with more released as contracts land.',fx:[['cash',-0.6,0,4],['g',0.45,5,99],['kpi',0.25,4],['inv',3]],q:3,ghost:1,a:['CFO','Tie every dollar of shell construction to a signed volume agreement. That is the deal we can defend.']},
      {l:'Pause 14A and partner on the leading edge',d:'Protects margins now. Washington and your engineers will not like it.',fx:[['m',1.5,0,99],['g',-0.5,4,99],['kpi',-0.1],['reg',-8],['emp',-6],['inv',5]],q:1,a:['Board member','The market rewarded discipline this year. A pause would be read as discipline.']}
     ]},
    {id:'intc-spin',cat:'Portfolio architecture',title:'Should the foundry stand on its own?',
     body:'Bankers say outside investors would buy a minority stake in Intel Foundry. Some shareholders want a full separation so the products business stops funding fab losses.',
     why:'A separation announced before the foundry is self-funding tends to distract both halves; minority capital can fund the build without breaking the structure.',
     opts:[
      {l:'Sell a minority stake to outside investors',d:'Raises cash for the build while keeping control.',fx:[['cash',8,2],['inv',4],['brd',2],['exe',-3]],q:2,a:['Head of Strategy','Outside money also brings outside discipline. Customers see a foundry that others will fund.']},
      {l:'Keep the company whole',d:'Stay integrated. Products and foundry share one plan.',fx:[['emp',2],['cus',2]],q:2,ghost:1,a:['COO','Splitting now would mean two half-finished turnarounds.']},
      {l:'Announce a full spin-off within 18 months',d:'A clean story for investors. A long distraction for everyone else.',fx:[['inv',8],['exe',-7],['emp',-6],['cus',-4],['g',-0.3,1,4],['cr',-1,1,2]],q:1,a:['Activist shareholder','Sum of the parts is worth more than the whole. Unlock it.']}
     ]},
    {id:'intc-asic',cat:'Vision and product',title:'A hyperscaler wants custom chips at thin margins',
     body:'A large cloud company offers a multi-year order for custom AI silicon built in your fabs. The volume is real. The price is low, and they want priority on capacity.',
     src:'https://seekingalpha.com/article/4926760-intels-turnaround-is-finally-backed-by-results',
     why:'Early foundry customers buy proof as much as wafers. Thin-margin volume that fills fabs and proves a node can be worth more than the margin it costs.',
     opts:[
      {l:'Accept their price',d:'Fills fabs and proves the node to other buyers.',fx:[['g',1.0,1,8],['m',-0.8,1,8],['kpi',0.5,2],['cus',6]],q:3,ghost:1,a:['Head of Foundry','Every other customer is watching who trusts us first.']},
      {l:'Counter at a higher price',d:'Better margin if they accept. They might walk.',out:[{p:0.55,t:'They accepted the counter.',fx:[['g',0.8,1,8],['m',-0.3,1,8],['kpi',0.4,2],['cus',3]]},{p:0.45,t:'They walked and signed elsewhere.',fx:[['cus',-4],['inv',-3]]}],q:2,a:['CFO','We are not a charity. If they need us, they will pay for it.']},
      {l:'Decline and protect product margins',d:'Keep capacity for your own x86 products.',fx:[['m',0.3,0,4],['kpi',-0.05],['cus',-5],['inv',-3]],q:1,a:['Head of Client Products','Our own chips earn more per wafer. Feed them first.']}
     ]},
    {id:'intc-raise',cat:'Financing',title:'Bankers pitch another capital raise',
     body:'The stock has rallied hard this year. Bankers say now is the time to raise money for the foundry build, either as new shares or as convertible debt.',
     src:'https://www.webull.com/news/15685876526629888',
     why:'Raising equity when the stock is strong dilutes less per dollar raised; the cost is a signal that management thinks the shares are fully priced.',
     opts:[
      {l:'Sell $10B of new shares',d:'No new interest bill. Existing holders own less.',fx:[['cash',10,0],['shares',4],['inv',-5]],q:2,ghost:1,a:['Treasurer','Raise when you can, not when you must.']},
      {l:'Issue $8B of convertible debt',d:'Cheaper than straight debt today. Adds leverage.',fx:[['cash',8,0],['debt',8,0],['inv',-1]],q:2,a:['CFO','A convertible lets us borrow cheaply against the rally.']},
      {l:'Do not raise',d:'Fund the build from operations and existing cash.',fx:[['inv',2]],q:2,a:['Investor Relations','Every raise since 2024 has cost us credibility. Show we can fund ourselves.']}
     ]},
    {id:'intc-layers',cat:'People and organization',title:'Where do the next cost cuts come from?',
     body:'Margins are still below peers. Your finance team proposes another round of cuts after the large layoffs of the past two years.',
     why:'After deep layoffs, further broad cuts tend to cost execution; removing layers is usually the cheaper lever.',
     opts:[
      {l:'Cut 8% of remaining staff',jobs:0.08,d:'Biggest savings. Morale and execution take a hit.',fx:[['m',1.5,1,99],['emp',-12],['exe',-5],['g',-0.2,2,4],['cr',-3,0,1],['inv',4]],q:1,a:['CFO','Peers run leaner. The math says cut.']},
      {l:'Remove management layers only',jobs:0.015,d:'Smaller savings. Faster decisions.',fx:[['m',0.6,1,99],['emp',-4],['exe',3]],q:3,ghost:1,a:['COO','We still have too many people approving work and too few doing it.']},
      {l:'Freeze hiring',d:'Slow, quiet savings through attrition.',fx:[['m',0.3,1,99],['emp',-2]],q:2,a:['Chief People Officer','People are tired. A freeze buys savings without another shock.']}
     ]},
    {id:'intc-yield',cat:'Crisis',title:'A product ramp is running behind on yield',
     body:'A scenario event: yields on a new product ramp are below plan. Launching on schedule means selling fewer good chips per wafer and risking quality complaints.',
     why:'Shipping a weak ramp to hit a date trades a one-quarter miss for a reputation problem that lasts much longer.',
     opts:[
      {l:'Delay the launch one quarter',d:'Fix yields first. Miss the date.',fx:[['g',-0.6,0,2],['exe',6],['cus',-3]],q:3,ghost:1,a:['Head of Manufacturing','Give us twelve weeks and the ramp is clean.']},
      {l:'Launch on schedule',d:'Hit the date at lower yield.',fx:[['m',-1.2,0,3],['cus',2],['exe',-5]],out:[{p:0.7,t:'The launch held up.',fx:[]},{p:0.3,t:'Customers reported quality problems.',fx:[['cus',-10],['inv',-5]]}],q:1,a:['Head of Sales','Customers planned around this date. Missing it hurts more than a weak ramp.']},
      {l:'Shift some volume to an outside foundry',d:'Protects the date. Undercuts your foundry story.',fx:[['m',-0.8,0,4],['cus',3],['kpi',-0.05],['emp',-3],['reg',-2]],q:2,a:['Head of Client Products','Customers do not care whose fab it came from.']}
     ]},
    {id:'intc-chips',cat:'Regulatory',title:'Washington wants faster domestic capacity',
     body:'Officials ask you to accelerate a delayed US fab. More public support is possible. The building only makes sense if demand shows up.',
     why:'Government support lowers the cost of capacity but does not create demand; matching timelines to customers protects both relationships.',
     opts:[
      {l:'Accelerate the fab for more support',d:'More grants later, heavy spending now.',fx:[['cash',-2,0,4],['cash',3,2],['reg',12],['g',0.3,8,99],['inv',-3]],q:2,a:['Head of Government Affairs','We need allies in Washington more than ever.']},
      {l:'Keep the current timeline',d:'Explain that capacity follows customers.',fx:[['reg',-4]],q:2,ghost:1,a:['CFO','Fabs without customers are monuments.']},
      {l:'Push the timeline out further',d:'Saves cash. Strains a key relationship.',fx:[['cash',1,0,2],['reg',-12],['inv',2]],q:1,a:['Treasurer','Every dollar we do not spend this year is a dollar we do not borrow.']}
     ]}
  ]},

ba:{id:'ba',name:'Boeing',ticker:'BA',sector:'Aerospace',ceo:'Kelly Ortberg',dilemma:'Production rate vs. quality and cash',
  pitch:'Production is the highest since 2018 and the company expects to be cash-positive this year. Every rate increase is a bet on quality holding.',
  start:{rev:24.56,g:1.8,m:0.6,cash:20.02,debt:50.16,da:0.49,capex:0.74,wc:1.17,div:0.08,mult:1.8,kpi:47},
  est:['working capital (set so 2026 free cash flow lands inside guidance)'],
  meters:{inv:50,brd:55,emp:45,cus:45,reg:35,exe:45},
  kpi:{plain:'Jets per month',plainS:'737 jets built each month',plainD:'How many 737 MAX planes the factory builds each month. More jets, more sales, but only if quality holds.',name:'737 MAX build rate',short:'737 rate',unit:'per month',good:1,drift:0,min:30,max:63,fmt:v=>Math.round(v)+'/mo'},
  real:{reinvest:'hold',ret:'none',debt:'pay'},
  facts:[
    ['Q2 2026 revenue was $24.56B, with a loss of $0.76 a share.','https://stocktwits.com/news-articles/markets/equity/boeing-ba-stock-climbs-after-ceo-says-production-at-levels-not-seen-since-2018/cZZCMQvRJbh'],
    ['737 MAX production is moving to 47 a month; the 787 has stabilized at 8.','https://stocktwits.com/news-articles/markets/equity/boeing-ba-stock-climbs-after-ceo-says-production-at-levels-not-seen-since-2018/cZZCMQvRJbh'],
    ['2026 free cash flow guidance is $1B to $3B; the long-term target is $10B.','https://stocktwits.com/news-articles/markets/equity/boeing-ba-stock-climbs-after-ceo-says-production-at-levels-not-seen-since-2018/cZZCMQvRJbh'],
    ['Commercial backlog is a record $597B, more than 6,200 airplanes. First 777X delivery is planned for 2027.','https://stocktwits.com/news-articles/markets/equity/boeing-ba-stock-climbs-after-ceo-says-production-at-levels-not-seen-since-2018/cZZCMQvRJbh']
  ],
  deck:[
    {id:'ba-rate',cat:'Operating architecture',title:'Ask the FAA for 52 a month?',at:1,
     body:'The line is moving to 47 jets a month. Leadership has said it wants 63 eventually, and that each step needs months of stability first. Airlines want planes now.',
     src:'https://stocktwits.com/news-articles/markets/equity/boeing-ba-stock-climbs-after-ceo-says-production-at-levels-not-seen-since-2018/cZZCMQvRJbh',
     why:'Rate increases taken before the system is stable are how quality escapes happen; waiting a quarter is cheaper than a grounding.',
     opts:[
      {l:'Request 52 now',d:'More deliveries sooner. Strains a line that just stepped up.',fx:[['kpi',5,1],['exe',-6]],out:[{p:0.65,t:'The step-up held.',fx:[['reg',-2]]},{p:0.35,t:'A quality escape forced a slowdown.',fx:[['reg',-12],['exe',-8],['cus',-6],['kpi',-5,2]]}],q:1,a:['Head of Sales','Customers are short of jets. Every month we wait, they look at Airbus.']},
      {l:'Hold 47 for two more quarters, then ask',d:'Prove stability first.',fx:[['kpi',5,3],['exe',4],['reg',4]],q:3,ghost:1,a:['Head of Quality','Show the regulator two clean quarters. Then the next step is easy.']},
      {l:'Hold until suppliers can support 55',d:'Slowest path. Biggest step when it comes.',fx:[['kpi',8,6],['exe',6],['inv',-4]],q:2,a:['Head of Supply Chain','Our suppliers are the constraint, not our line.']}
     ]},
    {id:'ba-newjet',cat:'Vision and product',title:'Launch a new single-aisle jet?',
     body:'Early design work has started. Leadership has said a launch waits until the balance sheet is repaired and the technology is ready, which could take a couple of years.',
     src:'https://www.webpronews.com/boeing-ceo-ortberg-draws-line-cash-first-then-a-new-jet/',
     why:'A clean-sheet program launched on a weak balance sheet can starve the existing programs that pay for it.',
     opts:[
      {l:'Launch the program now',d:'Tens of billions over a decade. Engineers and airlines cheer.',fx:[['cash',-2,0,8],['inv',-8],['emp',6],['cus',6]],q:0,a:['Chief Engineer','The 737 is a 1960s design. We cannot win the next 30 years with it.']},
      {l:'Keep design work going, launch later',d:'Small spend. Keep the option open.',fx:[['cash',-0.3,0,8],['cus',1]],q:3,ghost:1,a:['CFO','Fix the cash engine first. Then fund the next airplane from strength.']},
      {l:'Shelve new-jet work entirely',d:'Saves money. Signals you have given up on the next generation.',fx:[['cash',0.2,0,8],['emp',-6],['cus',-6]],q:1,a:['Treasurer','Every dollar should go to the balance sheet.']}
     ]},
    {id:'ba-cert',cat:'Regulatory',title:'The FAA wants more certification data',at:2,
     body:'Certification of the 737-7 and 737-10 is expected this year, with first deliveries in 2027. The FAA asks for additional test data, which could slip the schedule a quarter.',
     src:'https://stocktwits.com/news-articles/markets/equity/boeing-ba-stock-climbs-after-ceo-says-production-at-levels-not-seen-since-2018/cZZCMQvRJbh',
     why:'Rebuilding regulator trust is a long-term asset; a pushed schedule that fails costs more than a slip you chose.',
     opts:[
      {l:'Provide everything and accept the slip',d:'One quarter late. Regulator trust improves.',fx:[['g',-0.4,0,2],['reg',8],['cus',-3]],q:3,ghost:1,a:['General Counsel','Our relationship with the FAA is our license to operate.']},
      {l:'Push the FAA to hold the schedule',d:'Might work. Might backfire badly.',out:[{p:0.5,t:'The schedule held.',fx:[['g',0.3,0,2],['reg',-4]]},{p:0.5,t:'The pushback cost months and goodwill.',fx:[['reg',-12],['g',-0.6,0,3]]}],q:0,a:['Head of Sales','Two customers have penalty clauses that start next year.']},
      {l:'Prioritize the 737 variants, slow the 777X',d:'Shifts engineers. 777X customers wait longer.',fx:[['g',0.2,0,3],['cus',-6],['cash',-1,3]],q:2,a:['Chief Engineer','We cannot certify two programs at full speed at once.']}
     ]},
    {id:'ba-spirit',cat:'Operating architecture',title:'How deep do you integrate Spirit AeroSystems?',
     body:'Boeing completed its acquisition of Spirit AeroSystems, the supplier that built the fuselage involved in the 2024 door-plug blowout. Spirit is now yours to fix.',
     src:'https://ceointerviews.ai/quote/before-the-year-end-we-took-another-important-MTA2Nzg2NA/',
     why:'Buying a supplier only fixes quality if you bring it inside your quality system; squeezing it for cost repeats the original mistake.',
     opts:[
      {l:'Fully integrate its quality systems',d:'About $2B over a year. Fewer defects later.',fx:[['cash',-0.5,0,4],['exe',10,2],['m',0.5,4,99],['reg',3,2]],q:3,ghost:1,a:['Head of Quality','One quality system, one set of inspectors, one standard.']},
      {l:'Run Spirit at arm\'s length',d:'Cheap and simple. Little changes.',fx:[['exe',1]],q:1,a:['Head of Integration','Spirit has its own culture. Do not break what works.']},
      {l:'Cut Spirit\'s costs fast',d:'Margin now. The old supplier problem returns.',fx:[['m',0.6,1,99],['exe',-6],['emp',-6],['reg',-4]],q:0,a:['CFO','We paid for it. Now it should earn its keep.']}
     ]},
    {id:'ba-union',cat:'People and organization',title:'Open early talks with the machinists?',
     body:'The 2024 machinists\' strike stopped production for weeks. Some leaders want to start contract talks early this time.',
     why:'In a plant where a strike stops all output, labor peace is part of the production plan, not just a cost line.',
     opts:[
      {l:'Open early talks with a fair offer',d:'Higher wages. Lower strike risk.',fx:[['m',-0.4,0,99],['emp',10],['exe',3]],q:3,a:['Head of Labor Relations','Trust is cheaper than a strike.']},
      {l:'Wait until the contract expires',d:'No cost now. Strike risk later.',out:[{p:0.6,t:'Talks went smoothly later.',fx:[]},{p:0.4,t:'A strike stopped production.',fx:[['g',-2.5,3,2],['emp',-10],['cash',-2,3]]}],q:1,ghost:1,a:['CFO','Do not negotiate against yourself a year early.']},
      {l:'Automate more assembly steps',jobs:0.02,d:'Reduce dependence on labor over time.',fx:[['cash',-1,0,2],['emp',-10],['m',0.5,4,99]],q:1,a:['Head of Manufacturing','Automation also improves consistency.']}
     ]},
    {id:'ba-defense',cat:'Capital allocation',title:'How to bid on new defense work',
     body:'Defense budgets include increases for programs like the F-47, KC-46 and F-15EX. Fixed-price development contracts have produced large Boeing charges in the past.',
     src:'https://ceointerviews.ai/quote/before-the-year-end-we-took-another-important-MTA2Nzg2NA/',
     why:'Fixed-price development work transfers technical risk to the contractor; growth is only worth it if the price covers that risk.',
     opts:[
      {l:'Bid aggressively on fixed-price work',d:'Win more programs. Carry the cost risk.',fx:[['g',0.5,2,99],['m',-0.6,2,99]],out:[{p:0.7,t:'Programs ran on budget so far.',fx:[]},{p:0.3,t:'A program overran and forced a charge.',fx:[['cash',-2,4],['inv',-6,4]]}],q:1,a:['Head of Defense','Lose these and we lose the next generation of programs.']},
      {l:'Bid only with cost protection',d:'Fewer wins. Less downside.',fx:[['g',0.2,2,99]],q:3,ghost:1,a:['CFO','We have written off enough on fixed-price tankers.']},
      {l:'Exit some defense programs',jobs:0.02,d:'Simpler company. Washington notices.',fx:[['g',-0.4,0,99],['m',0.3,0,99],['reg',-4]],q:1,a:['Board member','Focus on commercial. That is where the cash is.']}
     ]},
    {id:'ba-china',cat:'Vision and product',title:'A possible China mega-order',
     body:'Leadership has said a US–China summit could produce a large aircraft order. Chinese buyers want steep discounts and early slots.',
     src:'https://ceointerviews.ai/quote/before-the-year-end-we-took-another-important-MTA2Nzg2NA/',
     why:'Discounting to win a politically timed order locks in low margins for a decade; holding price keeps the order book healthy but leaves you exposed to politics.',
     opts:[
      {l:'Offer deep discounts to lock it in',d:'Hundreds of jets. Thin margins.',fx:[['cus',6],['g',0.6,4,99],['m',-0.4,4,99]],q:2,a:['Head of Sales','This is the biggest order of the decade.']},
      {l:'Hold pricing and let the talks play out',d:'Might win the order. Might not.',out:[{p:0.5,t:'China placed the order at your price.',fx:[['g',0.4,4,99],['cus',3]]},{p:0.5,t:'The order did not come this year.',fx:[]}],q:2,ghost:1,a:['CFO','Our backlog is full. We do not need to buy this order.']},
      {l:'Give the slots to other airlines',d:'Reward loyal customers instead.',fx:[['cus',3]],q:2,a:['Head of Customer Engagement','Our existing customers waited through the groundings.']}
     ]}
  ]},

unh:{id:'unh',name:'UnitedHealth',ticker:'UNH',sector:'Health insurance',ceo:'Stephen Hemsley',dilemma:'Margin vs. membership and trust',
  pitch:'Profits are recovering after a cyberattack, missed targets and a withdrawn outlook. The margin has come back partly by shedding members.',
  start:{rev:112.69,g:0.2,m:5.9,cash:31.47,minCash:0.035,debt:73.33,da:1.09,capex:0.91,wc:0,div:1.98,mult:0.85,kpi:88.4},
  est:['balance sheet from the Q2 10-Q; the Q3 10-Q was not yet filed'],
  meters:{inv:52,brd:55,emp:45,cus:38,reg:30,exe:50},
  kpi:{plain:'Care cost per $1',plainS:'Cents per premium $1 spent on care',plainD:'Cents of every premium dollar spent on members\u2019 medical care. Lower means more profit.',name:'Medical cost ratio',short:'Med. cost ratio',unit:'% of premiums',good:-1,drift:0.08,min:80,max:95,fmt:v=>v.toFixed(1)+'%'},
  real:{reinvest:'hold',ret:'hold',debt:'hold'},
  facts:[
    ['Q3 2026 revenue was $112.69B; the medical cost ratio was 88.4%, down from 89.9% a year earlier.','https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/'],
    ['2026 adjusted EPS guidance was raised to at least $20.50.','https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/'],
    ['935,000 members have left its Medicare Advantage business since the end of 2025.','https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/'],
    ['Q3 operating income was $6.6B, up from $4.3B a year earlier.','https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/']
  ],
  deck:[
    {id:'unh-ma',cat:'Vision and product',title:'Next year\'s Medicare Advantage bids',at:0,
     body:'Benefit cuts and county exits restored margin, and 935,000 Medicare Advantage members have left since the end of 2025. Bids for next year are due.',
     src:'https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/',
     why:'Shedding unprofitable members restores margin once; doing it every year shrinks the base the business earns on.',
     opts:[
      {l:'Keep cutting benefits and exiting counties',d:'Margins keep improving. Membership keeps falling.',fx:[['kpi',-0.8,2],['g',-0.6,2,4],['cus',-8],['reg',-3]],q:2,ghost:1,a:['Head of Medicare','Price for the costs we actually see. Growth can come back later.']},
      {l:'Reinvest in benefits to win members back',d:'Growth returns. Costs rise first.',fx:[['kpi',0.6,2],['g',0.6,2,6],['cus',8],['inv',-6]],q:1,a:['Chief Growth Officer','We are losing members we spent decades winning.']},
      {l:'Hold benefits flat and compete on service',d:'Middle path. Slower margin gains.',fx:[['kpi',-0.2,2],['cus',2]],q:3,a:['COO','Faster approvals and fewer denials keep members without buying them.']}
     ]},
    {id:'unh-pa',cat:'Regulatory',title:'Prior authorization cuts',
     body:'The company committed to eliminating 30% of prior authorization volume by year-end. Doctors and regulators are watching whether it happens.',
     src:'https://www.tikr.com/blog/unitedhealths-medical-cost-ratio-just-improved-to-86-7-heres-what-that-means-for-the-stock',
     why:'A public promise kept quietly builds more trust than a bigger promise you cannot keep.',
     opts:[
      {l:'Deliver the 30% as promised',d:'Small cost increase. Trust improves.',fx:[['kpi',0.3,1],['cus',8],['reg',8],['emp',2]],q:3,ghost:1,a:['Chief Medical Officer','Doctors are counting. Hit the number.']},
      {l:'Go further, to 50%',d:'Bigger goodwill. Bigger cost.',fx:[['kpi',0.8,1],['cus',12],['reg',12],['inv',-4]],q:2,a:['Head of Provider Relations','Make it so obvious nobody can argue.']},
      {l:'Slow the rollout quietly',d:'Protects margins. Risky if noticed.',fx:[['kpi',-0.2,1]],out:[{p:0.5,t:'Nobody noticed yet.',fx:[]},{p:0.5,t:'Reporters noticed the missed pledge.',fx:[['reg',-12],['cus',-8],['inv',-4]]}],q:0,a:['CFO','The pledge was a target, not a contract.']}
     ]},
    {id:'unh-optum',cat:'Portfolio architecture',title:'Exit more Optum risk contracts?',
     body:'Optum exited some unfavorable contracts that had dragged on earnings. Others still lose money.',
     src:'https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/',
     why:'Renegotiating before exiting preserves scale where the contract can be fixed; exit is the fallback, not the first move.',
     opts:[
      {l:'Exit the rest of the losing contracts',jobs:0.01,d:'Margin up. Revenue down.',fx:[['g',-0.4,0,4],['m',0.5,1,99],['cus',-3]],q:2,ghost:1,a:['Head of Optum Health','Every losing contract we keep funds someone else\'s growth.']},
      {l:'Renegotiate with tighter terms',d:'Keep the ones you can fix.',fx:[['m',0.3,2,99]],out:[{p:0.6,t:'Most partners accepted.',fx:[]},{p:0.4,t:'Several partners walked away.',fx:[['g',-0.3,0,4]]}],q:3,a:['COO','Some of these are fixable with better terms.']},
      {l:'Keep them all to protect scale',d:'Revenue holds. Losses continue.',fx:[['m',-0.3,0,4],['g',0.2,0,4]],q:1,a:['Head of Strategy','Scale is our moat.']}
     ]},
    {id:'unh-coding',cat:'Regulatory',title:'Scrutiny of how diagnoses are coded',
     body:'A scenario: regulators are reviewing how Medicare Advantage plans code patient diagnoses, which affects how much the government pays.',
     why:'An independent audit costs some money and may surface problems; finding them yourself is far cheaper than having a regulator find them.',
     opts:[
      {l:'Commission and publish an independent audit',d:'Costs money. Might find problems.',fx:[['cr',-0.05,0,1],['reg',10],['inv',-2]],out:[{p:0.7,t:'The audit found minor issues only.',fx:[]},{p:0.3,t:'The audit found repayable errors.',fx:[['cash',-1.5,2],['reg',-4]]}],q:3,a:['General Counsel','Find it before they do.']},
      {l:'Cooperate quietly with requests',d:'Do what is asked, nothing more.',fx:[['reg',2]],q:2,ghost:1,a:['Head of Compliance','Volunteering findings invites more questions.']},
      {l:'Lobby for rule changes',d:'Change the rules instead of the practice.',fx:[['reg',-8],['inv',2]],q:0,a:['Head of Government Affairs','The rules are unclear. Make them clear in our favor.']}
     ]},
    {id:'unh-ai',cat:'Operating architecture',title:'How far do you automate claims?',
     body:'The company credits technology investments, including AI, with lowering the cost of delivering care. The next step is automating claims decisions.',
     src:'https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/',
     why:'Automation that speeds approvals builds trust; automation that speeds denials invites the scrutiny you are trying to escape.',
     opts:[
      {l:'Automate approvals, human review on every denial',d:'Steady savings. Safe.',fx:[['cr',-0.2,0,1],['m',0.4,2,99],['reg',2],['cus',3]],q:3,ghost:1,a:['Chief Medical Officer','Speed up yes. Slow down no.']},
      {l:'Automate denials too',d:'Bigger savings. Big risk.',fx:[['m',0.9,1,99]],out:[{p:0.5,t:'No problems surfaced yet.',fx:[]},{p:0.5,t:'A report showed automated denials of needed care.',fx:[['reg',-14,2],['cus',-10,2],['inv',-6,2]]}],q:0,a:['Head of Operations','The model is more consistent than our reviewers.']},
      {l:'Keep pilots small',d:'Low risk. Competitors move faster.',fx:[['m',-0.1,2,99]],q:1,a:['Chief Risk Officer','We are the most scrutinized insurer in the country.']}
     ]},
    {id:'unh-unit',cat:'Portfolio architecture',title:'Sell, keep, or buy care businesses',
     body:'Bankers bring two ideas: sell a non-core services unit for cash, or buy more physician practices to grow Optum Health.',
     why:'Buying physician practices deepens the vertical integration regulators already question; selling non-core assets strengthens the balance sheet.',
     opts:[
      {l:'Sell a non-core unit',d:'About $6B of cash. Slightly less revenue.',fx:[['cash',6,1],['g',-0.2,1,99],['inv',4]],q:2,a:['CFO','Simplify and de-lever.']},
      {l:'Keep the portfolio as is',d:'Focus on fixing what you own.',fx:[],q:2,ghost:1,a:['COO','We have enough to fix already.']},
      {l:'Buy more physician practices',d:'Growth. Regulators will object.',fx:[['cash',-5,0],['g',0.3,2,99],['reg',-8]],q:0,a:['Head of Optum Health','Owning care is our edge.']}
     ]},
    {id:'unh-2027',cat:'Investor communication',title:'What do you say about 2027?',at:1,
     body:'Your CFO has called the low end of a 13% to 16% long-term growth range a reasonable starting point for 2027 and said analyst estimates may be too low.',
     src:'https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/',
     why:'After a credibility collapse, a conservative target you beat rebuilds more trust than an ambitious one you miss.',
     opts:[
      {l:'Guide to the low end of the range',d:'Beatable. Builds credibility.',fx:[['inv',4],['brd',2]],q:3,ghost:1,a:['Investor Relations','Under-promise. We are still rebuilding trust.']},
      {l:'Promise the top of the range',d:'Stock pops. You must deliver.',fx:[['inv',8]],out:[{p:0.45,t:'You delivered the top of the range.',fx:[['inv',3,4]]},{p:0.55,t:'You fell short of the promise.',fx:[['inv',-12,4],['brd',-6,4]]}],q:1,a:['Head of Strategy','The business is better than the market thinks. Say so.']},
      {l:'Decline to guide 2027 yet',d:'Safe. Investors dislike silence.',fx:[['inv',-4]],q:2,a:['General Counsel','Too many unknowns in Medicare rates.']}
     ]}
  ]},

nke:{id:'nke',name:'Nike',ticker:'NKE',sector:'Apparel and footwear',ceo:'Elliott Hill',dilemma:'Reversing a channel strategy',
  pitch:'Revenue is flat, lifestyle sneakers are falling, and the CFO is leaving. Running is growing. The question is how much pain to take while you reset.',
  start:{rev:11.213,g:-0.8,m:8.1,cash:6.9,debt:7.89,da:0.19,capex:0.17,wc:0,div:0.6,mult:1.4,kpi:6},
  est:[],
  meters:{inv:35,brd:50,emp:45,cus:50,reg:55,exe:45},
  kpi:{plain:'Store sales growth',plainS:'Sales to stores vs. last year',plainD:'Growth in sales to stores like Foot Locker and Dick\u2019s versus a year ago.',name:'Wholesale revenue growth',short:'Wholesale',unit:'% yoy',good:1,drift:0,min:-20,max:25,fmt:v=>(v>=0?'+':'')+v.toFixed(1)+'%'},
  real:{reinvest:'raise',ret:'hold',debt:'hold'},
  facts:[
    ['Fiscal Q4 2026 revenue fell 1% to $10.97B.','https://www.benzinga.com/node/60207942'],
    ['EPS of $0.72 included a $986M tariff recovery; without it, EPS was $0.20.','https://www.benzinga.com/node/60207942'],
    ['Nike guided to revenue declines of low-to-mid single digits over the next six months.','https://www.benzinga.com/node/60207942'],
    ['Wholesale revenue grew 6% for fiscal 2026 while Nike Direct fell 6%.','https://www-statista-com.libproxy.pcc.edu/chart/27372/nikes-global-sales/']
  ],
  deck:[
    {id:'nke-channel',cat:'Operating architecture',title:'How hard do you clean up the channel?',at:0,
     body:'Nike is cutting wholesale supply and pulling back digital promotions to clean up retail channels. Revenue will fall before it recovers.',
     src:'https://www.benzinga.com/node/60207942',
     why:'Discounted inventory in the channel trains customers to wait for sales; clearing it costs revenue now and restores full-price selling later.',
     opts:[
      {l:'Cut supply and promotions hard',d:'Two weak quarters. Full-price selling returns.',fx:[['g',-1.2,0,2],['m',1.0,2,99],['cus',4,2],['kpi',-4]],q:3,ghost:1,a:['Head of Marketplace','Clean channels are the only way back to full price.']},
      {l:'Moderate cut',d:'Less pain. Slower reset.',fx:[['g',-0.5,0,2],['m',0.4,2,99],['kpi',-2]],q:2,a:['CFO','Investors cannot take two more quarters of steep declines.']},
      {l:'Keep shipping to hit revenue',d:'Revenue holds. Discounts deepen.',fx:[['g',0.3,0,2],['m',-0.8,1,4],['cus',-6]],q:0,a:['Head of Sales','Our wholesale partners want product. Give it to them.']}
     ]},
    {id:'nke-franchise',cat:'Vision and product',title:'What to do with Dunk, Air Force 1 and Jordan 1',
     body:'Nike Sportswear and Jordan Streetwear both fell double digits last quarter. Lifestyle and franchise footwear are expected to stay negative through the first half of fiscal 2027.',
     src:'https://www.benzinga.com/node/60207942',
     why:'Over-distributed icons lose their pull; scarcity restores it, but only if you can live with the lost volume.',
     opts:[
      {l:'Pull back sharply on legacy franchises',d:'Volume falls. Demand recovers later.',fx:[['g',-0.8,0,3],['cus',6,3],['m',0.4,2,99]],q:3,ghost:1,a:['Chief Brand Officer','Scarcity made these shoes. Flooding the market broke them.']},
      {l:'Refresh them with new colorways and collabs',d:'Short boost. Same oversupply problem.',fx:[['g',0.3,0,2],['cus',-3]],q:1,a:['Head of Lifestyle','New stories bring people back.']},
      {l:'Discount to clear inventory',d:'Fast cash. Brand damage.',fx:[['g',0.4,0,1],['m',-1.2,0,2],['cus',-6]],q:0,a:['CFO','Inventory is cash sitting on shelves.']}
     ]},
    {id:'nke-cfo',cat:'People and governance',title:'Replace the departing CFO',
     body:'Longtime CFO Matt Friend is leaving amid rising tariffs and soft digital sales. Investors are watching who replaces him.',
     src:'https://www.benzinga.com/node/60207942',ghostNote:'Nike had not named a permanent successor in the sources used here; the real playbook assumes an internal promotion.',
     why:'In a turnaround, an outside CFO with turnaround credibility can buy patience; an interim CFO signals drift.',
     opts:[
      {l:'Hire an outside CFO with turnaround experience',d:'Some disruption. Investors gain confidence.',fx:[['exe',-2],['exe',6,2],['inv',5]],q:3,a:['Lead Director','Bring in someone the market already trusts.']},
      {l:'Promote the internal finance lead',d:'Continuity. Less of a signal.',fx:[['exe',2],['emp',3],['inv',-2]],q:2,ghost:1,a:['Chief People Officer','Our bench is strong. Reward it.']},
      {l:'Leave it interim for a year',d:'No rush. Drift risk.',fx:[['exe',-6],['inv',-4]],q:0,a:['General Counsel','No need to decide during earnings season.']}
     ]},
    {id:'nke-running',cat:'Capital allocation',title:'Running is growing. Lifestyle is not.',
     body:'Technical running footwear posted its fifth straight quarter of double-digit growth. Nike moved 8,000 employees into sport-based teams.',
     src:'https://www.benzinga.com/node/60207942',
     why:'Concentrating resources where the brand is already winning compounds faster than spreading them evenly.',
     opts:[
      {l:'Double down on running',d:'Marketing and product money follows the growth.',fx:[['cr',-1.5,0,2],['g',0.5,2,99],['cus',5]],q:3,ghost:1,a:['Head of Running','We are winning athletes back one race at a time.']},
      {l:'Spread the budget across all sports',d:'Every team gets something.',fx:[['cr',-1.5,0,2],['g',0.2,2,99]],q:1,a:['Head of Sport Offense','Every sport team needs fuel.']},
      {l:'Bank the savings',d:'Margin now. Less momentum.',fx:[['m',0.4,0,2],['cus',-3]],q:1,a:['CFO','Show investors some margin.']}
     ]},
    {id:'nke-china',cat:'Vision and product',title:'Resetting Greater China',
     body:'Greater China sales fell double digits in fiscal 2026. Analysts point to single-brand distribution, too little retail investment and price-driven competition.',
     src:'https://www.tikr.com/blog/down-65-from-all-time-highs-can-nike-nyse-nke-stock-finally-recover-in-2026',
     why:'A structural problem needs a structural fix; price promotions treat the symptom.',
     opts:[
      {l:'Invest in local product and multi-brand partners',d:'Costs money. Fixes distribution.',fx:[['cr',-1,0,3],['g',0.4,4,99]],q:3,ghost:1,a:['Head of Greater China','Chinese consumers shop multi-brand. We should be there.']},
      {l:'Shrink the China footprint',jobs:0.01,d:'Margin up. A big market down.',fx:[['m',0.4,0,99],['g',-0.4,0,99]],q:1,a:['CFO','Stop the bleeding.']},
      {l:'Run price promotions',d:'Quick volume. Brand damage.',fx:[['g',0.3,0,2],['m',-0.6,0,3],['cus',-4]],q:0,a:['Head of Sales','Local brands are winning on price.']}
     ]},
    {id:'nke-amazon',cat:'Operating architecture',title:'How far do you go with Amazon and big-box partners?',
     body:'Nike rejoined Amazon and rebuilt relationships with Foot Locker and Dick\'s after years of pulling back.',
     src:'https://www.fool.com/investing/2026/03/27/should-you-buy-nike-stock-before-march-31',
     why:'Wholesale reach restores availability, but premium brands protect pricing by choosing where they appear.',
     opts:[
      {l:'Put the full line on Amazon',d:'Maximum reach. Some brand dilution.',fx:[['g',0.4,1,99],['m',-0.3,0,99],['kpi',3],['cus',-2]],q:2,a:['Head of Wholesale','Shoppers start their search on Amazon.']},
      {l:'Curated Amazon plus premium specialty stores',d:'Selective reach. Pricing holds.',fx:[['g',0.25,1,99],['kpi',2],['cus',2]],q:3,ghost:1,a:['Chief Brand Officer','Be everywhere the athlete shops, not everywhere.']},
      {l:'Pull back toward Nike Direct again',d:'Higher margins per pair. The old strategy.',fx:[['g',-0.4,0,99],['m',0.4,0,99],['kpi',-5]],q:0,a:['Head of Digital','Our app has the best customer data in retail.']}
     ]},
    {id:'nke-windfall',cat:'Financing',title:'What to do with the tariff refund',
     body:'Nike booked a $986M one-time benefit from recovering past tariffs. It is already in the bank.',
     src:'https://www.benzinga.com/node/60207942',ghostNote:'The sources used here do not say how Nike will use the refund; the real playbook assumes it strengthens the balance sheet.',
     why:'One-time cash is best spent on one-time needs; using it for a buyback during a downturn gives up flexibility.',
     opts:[
      {l:'Fund brand marketing',d:'Brand heat while you reset.',fx:[['cr',-3,0,2],['cus',6],['g',0.3,1,4]],q:2,a:['Chief Marketing Officer','The brand is the moat. Feed it.']},
      {l:'Pay down $1B of debt',d:'Stronger balance sheet.',fx:[['cash',-1,0],['debt',-1,0],['inv',2]],q:2,ghost:1,a:['Treasurer','Flexibility matters most in a downturn.']},
      {l:'Buy back $1B of stock',d:'Signals confidence. Uses the cushion.',fx:[['cash',-1,0],['shares',-1.6],['inv',3]],q:1,a:['Investor Relations','The stock is cheap.']}
     ]}
  ]},

khc:{id:'khc',name:'Kraft Heinz',ticker:'KHC',sector:'Packaged food',ceo:'Steve Cahillane',dilemma:'Slow decline of legacy brands',
  pitch:'Sales have shrunk for years, the planned breakup is on hold, and $600 million is going into marketing and R&D to prove the brands can grow again.',
  start:{rev:6.262,g:-0.6,m:14.7,cash:2.68,debt:19.0,da:0.24,capex:0.2,wc:0,div:0.47,mult:2.2,kpi:-3.0},
  est:[],
  meters:{inv:35,brd:50,emp:50,cus:42,reg:60,exe:50},
  kpi:{plain:'Sales growth',plainS:'Same-brand sales vs. last year',plainD:'Sales growth versus a year ago, from the same brands.',name:'Organic sales growth',short:'Organic',unit:'% yoy',good:1,derived:true,min:-30,max:30,fmt:v=>(v>=0?'+':'')+v.toFixed(1)+'%'},
  real:{reinvest:'raise',ret:'hold',debt:'hold'},
  facts:[
    ['2025 net sales were $24.9B, down 3.5%, with $9.3B of non-cash impairment charges.','https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment'],
    ['The planned split was paused; $600M is going into marketing, sales and R&D.','https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment'],
    ['2026 outlook: organic sales down 1.5% to 3.5%, adjusted EPS of $1.98 to $2.10.','https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment'],
    ['Q1 2026 sales were $6.05B, ahead of estimates.','https://www.esmmagazine.com/a-brands/kraft-heinz-tops-us-sales-estimates-as-ceo-cahillanes-turnaround-efforts-take-root-311362']
  ],
  deck:[
    {id:'khc-600',cat:'Capital allocation',title:'Where does the $600 million go?',at:0,
     body:'You committed $600M across marketing, sales, R&D, product superiority and select pricing. The Taste Elevation brands, like Heinz and Philadelphia, gained share last quarter.',
     src:'https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment',
     why:'Marketing money compounds on brands that are already gaining share; price cuts on declining staples buy volume that leaves when the cuts end.',
     opts:[
      {l:'Mostly marketing behind the growing brands',d:'Heinz, Philadelphia and condiments first.',fx:[['cr',-1.2,0,4],['g',0.35,1,99],['cus',4]],q:3,ghost:1,a:['Chief Marketing Officer','Back the winners. They are already gaining share.']},
      {l:'Mostly price cuts on grocery staples',d:'Volume returns while prices are low.',fx:[['g',0.4,0,4],['m',-1.2,0,4],['cus',2]],q:1,a:['Head of Sales','Shoppers are trading down. Meet them on price.']},
      {l:'Spread it evenly across everything',d:'Every brand gets a little.',fx:[['cr',-1.2,0,4],['g',0.2,1,99]],q:2,a:['Head of North America','Every brand team has a plan. Fund them all.']}
     ]},
    {id:'khc-split',cat:'Portfolio architecture',title:'Restart the breakup?',at:3,
     body:'The split into a sauces company and a grocery company was paused in February. Your CEO has kept the option open once the business is growing again.',
     src:'https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment',
     why:'Breaking up a shrinking company splits the problem in two; fixing growth first makes any later separation worth more.',
     opts:[
      {l:'Restart the split, targeting 2028',d:'Investors like it. Teams get distracted.',fx:[['cr',-1,0,4],['exe',-6],['inv',8]],out:[{p:0.5,t:'Investors stayed enthusiastic about the split.',fx:[['inv',6,6]]},{p:0.5,t:'Investors soured as the separation dragged.',fx:[['inv',-6,6]]}],q:1,a:['Activist shareholder','The sauces business deserves its own multiple.']},
      {l:'Stay together until growth returns',d:'Focus on the operating plan.',fx:[['inv',-2]],q:3,ghost:1,a:['CEO\'s chief of staff','Fix growth first. Then decide from strength.']},
      {l:'Sell a slow-growth brand group instead',d:'Smaller company. Better mix.',fx:[['cash',3,2],['g',-3,0,1],['g',0.2,1,99],['m',0.5,1,99],['inv',5]],q:2,a:['Head of Strategy','Selling one piece is faster than splitting in two.']}
     ]},
    {id:'khc-kids',cat:'Vision and product',title:'Lunchables and kids\' snacks',
     body:'Brands like Lunchables have lost ground with shoppers looking for healthier options.',
     src:'https://www.channel3000.com/lifestyle/food/kraft-mac-cheese-and-heinz-ketchup-are-sticking-together-after-all/article_1563d43d-045e-52a7-8e7d-a1a827ee4c49.html',
     why:'Reformulating a known brand is slower but more reliable than launching a new one into a crowded shelf.',
     opts:[
      {l:'Reformulate with cleaner ingredients',d:'Slow, steady recovery.',fx:[['cr',-0.5,0,3],['g',0.2,3,99],['cus',5],['reg',3]],q:3,a:['Head of R&D','Parents read labels now. Give them a better one.']},
      {l:'Cut marketing and harvest the brand',d:'Margin now. Slow decline.',fx:[['m',0.4,0,99],['g',-0.2,0,99]],q:2,ghost:1,a:['CFO','Not every brand needs saving.']},
      {l:'Launch a big new kids\' line',d:'Could be a hit. Could flop.',fx:[['cr',-1,0,2]],out:[{p:0.35,t:'The new line found an audience.',fx:[['g',0.5,2,99],['cus',4]]},{p:0.65,t:'The new line flopped.',fx:[['inv',-3]]}],q:1,a:['Head of Innovation','We need news on the shelf.']}
     ]},
    {id:'khc-private',cat:'Vision and product',title:'Store brands are taking share',
     body:'Packaged food companies are struggling with weak demand as shoppers look for cheaper alternatives to branded products.',
     src:'https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment',ghostNote:'The sources used here do not describe Kraft Heinz\'s response; the real playbook assumes value packs.',
     why:'Value formats keep shoppers inside your brands; making store brands for retailers fills plants but funds your competitor.',
     opts:[
      {l:'Make store-brand products for retailers',d:'Fills plants. Lower margins.',fx:[['g',0.4,0,99],['m',-0.6,0,99],['cus',-2]],q:2,a:['Head of Supply Chain','Our plants are a third empty.']},
      {l:'Launch value packs under your brands',d:'Keep shoppers in the family.',fx:[['g',0.2,0,4],['m',-0.3,0,4]],q:2,ghost:1,a:['Head of Revenue Management','Give them a cheaper way to buy Heinz.']},
      {l:'Hold premium pricing',d:'Protect margin. Lose volume.',fx:[['g',-0.3,0,4],['m',0.3,0,4]],q:1,a:['CFO','Price is the last lever we control.']}
     ]},
    {id:'khc-glp1',cat:'Vision and product',title:'Appetite-suppressing drugs change the basket',
     body:'A scenario: more shoppers on weight-loss drugs are buying smaller portions and more protein.',
     why:'Shifts in eating habits move slowly but do not reverse; early reformulation is cheaper than late acquisition.',
     opts:[
      {l:'Reformulate for protein and smaller portions',d:'Adapts the core.',fx:[['cr',-0.5,0,3],['g',0.25,3,99]],q:3,a:['Head of R&D','Same brands, new shapes.']},
      {l:'Wait and see',d:'No cost now.',fx:[['g',-0.15,2,99]],q:1,ghost:1,a:['CFO','It is a niche today.']},
      {l:'Buy a protein snack brand',d:'Instant presence. Adds debt.',fx:[['dr',10,0,1],['g',0.4,1,99],['exe',-3]],q:2,a:['Head of M&A','Buy the growth instead of building it.']}
     ]},
    {id:'khc-div',cat:'Financing',title:'Cut the dividend to fund the turnaround?',
     body:'Kraft Heinz pays a large dividend. Some investors own the stock only for that. Others think the cash belongs in the brands.',
     why:'A dividend cut frees real cash but tells income investors the business is weaker than they thought; it works best paired with a credible plan.',
     opts:[
      {l:'Cut the dividend by 30%',d:'More cash for the plan. Income investors sell.',fx:[['div',-30],['inv',-10],['brd',-2]],q:2,a:['CFO','We are paying out money we need.']},
      {l:'Keep the dividend',d:'Stability for shareholders.',fx:[],q:2,ghost:1,a:['Investor Relations','Our holders own us for the dividend.']},
      {l:'Raise the dividend',d:'A show of confidence you may not afford.',fx:[['div',10],['inv',3]],q:0,a:['Board member','Show the market we believe.']}
     ]},
    {id:'khc-coffee',cat:'Vision and product',title:'Coffee costs keep rising',
     body:'Pricing added 0.7 points to sales last year, mostly from coffee price increases to offset higher costs.',
     src:'https://www.foodingredientsfirst.com/news/kraft-heinz-separation-pause-investment',
     why:'Passing costs through openly protects margin with modest volume loss; hidden shrinkflation saves the most and costs the most trust.',
     opts:[
      {l:'Raise coffee prices again',d:'Margin holds. Some volume lost.',fx:[['m',0.5,0,4],['g',-0.2,0,4],['cus',-3]],q:2,ghost:1,a:['Head of Revenue Management','Everyone else is raising too.']},
      {l:'Hedge and hold prices',d:'Thinner margin. Happier shoppers.',fx:[['cr',-0.2,0,1],['m',-0.3,0,4],['cus',2]],q:2,a:['Head of Sales','Retailers will reward us with shelf space.']},
      {l:'Shrink the package, keep the price',d:'Quiet margin. Loud if noticed.',fx:[['m',0.6,0,4],['cus',-8],['reg',-3]],q:0,a:['Head of Packaging','Most people never check the weight.']}
     ]}
  ]}
};

/* ---------- real workforce data (researched Oct 2026; every item links to its source) ---------- */
const PEOPLE={
intc:{employees:85100,asof:'Dec 2025',src:'https://www.sec.gov/Archives/edgar/data/50863/000005086326000011/intc-20251227.htm',note:'Includes Mobileye. Intel targeted about 75,000 core employees by the end of 2025.',
 sites:[['Hillsboro and Aloha, OR','R&D hub for new process nodes; ramping Intel 18A','~18,000 in Oregon','https://www.klcc.org/economy-business/2025-11-17/intel-will-cut-another-669-workers-in-oregon-by-the-end-of-2025'],['Chandler, AZ','Leading-edge fabs, including Fab 52','~10,000','https://www.chandleraz.gov/business/economic-development/key-industries-and-employers/high-tech-manufacturing-and-development'],['Rio Rancho, NM','Fab 9 advanced packaging',null,'https://businesswire.com/news/home/20240124070327/en/5587037/Intel-Opens-Fab-9-in-New-Mexico'],['New Albany, OH','$28B fab, completion pushed to 2030–2031','3,000 jobs planned','https://www.manufacturingdive.com/news/intel-delays-new-albany-ohio-chip-manufacturing-project-again-2030-2031/741321/']],
 layoffs:[['Aug 2024','About 15,000 jobs','Cost cuts, buyouts; dividend suspended','https://www.fox10phoenix.com/news/intel-layoff-roughly-15000-workers-amid-revenue-slump-2024'],['Jul 2025','Core staff cut to 75,000','Layoffs plus attrition; Germany and Poland projects cancelled','https://www.ksat.com/business/2025/07/24/intel-cuts-back-spending-workforce-as-struggling-chip-maker-mounts-comeback/'],['Jul 2025','2,392 in Oregon','WARN notice for Hillsboro and Aloha','https://kval.com/news/local/intel-now-to-lay-off-nearly-2400-employees-in-oregon'],['Jul 2026','Undisclosed','Cuts in the Data Center group','https://www.tomshardware.com/tech-industry/policy/intel-layoffs-to-hit-data-center-group-division-focused-on-server-cpus-ai-chips-and-data-center-architecture-to-be-hit-by-an-unknown-number-of-cuts']],
 unions:[],earnings:['Oct 29, 2026','https://www.intc.com/news-events/press-releases/detail/1782/intel-to-report-third-quarter-2026-financial-results'],ir:'https://www.intc.com',cik:'50863'},
ba:{employees:182000,asof:'Dec 2025',src:'https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm',note:'About 40% of employees are represented by unions.',
 sites:[['Renton, WA','737 MAX final assembly, cleared for 47 a month',null,'https://migflug.com/jetflights/boeing-737-max-production-47-per-month-faa-may-2026/'],['Everett, WA','767, KC-46 and 777/777X; a fourth 737 line','30,000+ (Boeing page, may be dated)','https://www.boeing.com/company/about-bca/everett-production-facility'],['North Charleston, SC','787 Dreamliner final assembly; non-union','9,059 in South Carolina','https://www.postandcourier.com/business/aerospace/boeing-sc-hired-workers-payroll-2025/article_356964af-461f-4b8d-aeb1-6c309c94824b.html'],['St. Louis, MO','Defense: F-15, F/A-18, T-7A, MQ-25 and the F-47','18,000+','https://defence-industry.eu/boeing-st-louis-campus-to-build-f-47-sixth-generation-fighter-as-schmitt-highlights-jobs-investment-and-pacific-deterrence/']],
 layoffs:[['Oct 2024','About 17,000 jobs (10%)','Global cut during the machinists’ strike','https://washingtonstatestandard.com/briefs/boeing-to-cut-17000-workers/'],['Nov 2024','2,199 in Washington','First WARN notices, incl. 438 engineers','https://www.fortune.com/2024/11/19/boeing-starts-sending-2199-layoff-notices-washington-state-where-founded'],['Feb 2026','About 300','Defense supply-chain roles','https://www.storyboard18.com/brand-marketing/boeing-to-layoff-around-300-roles-across-multiple-us-sites-88879.htm']],
 unions:[['IAM District 751','33,000 struck Sept–Nov 2024 and won a 38% raise over four years','https://www.manufacturing.net/operations/news/22925404/boeing-factory-strike-ends-as-workers-vote-to-accept-contract'],['IAM District 837','3,200 St. Louis workers struck Aug–Nov 2025','https://missouriindependent.com/2025/11/13/boeing-strike-in-st-louis-ends-after-union-approves-new-contract/'],['SPEEA','About 17,000 engineers ratified a four-year deal on Oct 1, 2026','https://lynnwoodtimes.com/2026/10/02/speea-contract/']],
 earnings:['Oct 27, 2026','https://investors.boeing.com/investors/news/press-release-details/2026/Boeing-to-Release-Third-Quarter-Results-on-October-27/default.aspx'],ir:'https://investors.boeing.com',cik:'12927'},
unh:{employees:390000,asof:'Dec 2025',src:'https://www.sec.gov/Archives/edgar/data/731766/000073176626000062/unh-20251231.htm',note:'About 165,000 are clinicians.',
 sites:[['Eden Prairie, MN','Corporate headquarters and Optum campus',null,'https://www.sec.gov/Archives/edgar/data/731766/000073176626000062/unh-20251231.htm'],['Washington, DC','Second executive office',null,'https://www.sec.gov/Archives/edgar/data/731766/000073176626000062/unh-20251231.htm'],['Hudson Valley, NY','Optum primary care sites','~1,700 union caregivers','https://www.1199seiu.org/magazine/more-optum-caregivers-unite-1199seiu']],
 layoffs:[['Jul 2024','524 in California','Optum urgent-care closures','https://www.healthcarefinancenews.com/news/optum-reports-524-layoffs-california'],['Oct 2025','572 in New Jersey','Optum medical offices closing','https://arcxp-prod.modernhealthcare.com/providers/staffing/mh-optum-united-health-group-layoffs-new-jersey'],['Feb 2026','Unspecified','Layoffs under way; raises capped at 0–2%','https://www.beckerspayer.com/workforce/unitedhealth-pay-raises-not-to-exceed-2-amid-layoffs-bloomberg']],
 unions:[['1199SEIU','Represents about 1,700 Optum caregivers in New York','https://www.1199seiu.org/magazine/more-optum-caregivers-unite-1199seiu']],earnings:null,ir:'https://www.unitedhealthgroup.com/investors.html',cik:'731766'},
nke:{employees:73000,asof:'May 2026',src:'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm',note:'Includes retail and part-time staff.',
 sites:[['Beaverton, OR','World Headquarters',null,'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'],['Memphis, TN','Major distribution hub','583 laid off in 2026','https://www.aol.com/articles/nike-layoffs-hit-583-workers-151142974.html'],['Byhalia, MS','Distribution center',null,'https://www.freightwaves.com/news/nike-to-lay-off-hundreds-of-distribution-workers-in-mississippi-tennessee']],
 layoffs:[['Feb 2024','About 1,600 (2%)','Part of a $2B savings plan','https://www.retailgazette.co.uk/blog/2024/02/nike-cut-jobs/'],['Apr 2024','About 740 in Beaverton','Headquarters cuts','https://www.opb.org/article/2024/04/19/nike-layoffs-740-beaverton-oregon/'],['Jan 2026','About 775','Distribution consolidation and automation','https://www.wlbt.com/2026/01/27/nike-confirms-100s-layoffs-across-tennessee-mississippi/'],['Apr 2026','About 1,400','Global Operations, mostly technology','https://www.kptv.com/2026/04/24/nike-lay-off-1400-workers-worldwide-including-beaverton-headquarters/']],
 unions:[],earnings:null,ir:'https://investors.nike.com',cik:'320187'},
khc:{employees:35000,asof:'Dec 2025',src:'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm',note:'About 16,000 in the US; about 62% work in production.',
 sites:[['Pittsburgh, PA','Co-headquarters',null,'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm'],['Chicago, IL','Co-headquarters, Aon Center',null,'https://rejournals.com/the-kraft-heinz-company-signs-long-term-lease-at-aon-center-in-chicago/'],['Dover, DE','JELL-O, Kool-Aid and Shake ’N Bake plant','~400 union workers','https://ufcwlocal152.org/news/kraft-heinz-workers-in-dover-de-ratify-new-union-contract/'],['Davenport, IA','Automated Oscar Mayer deli-meat plant',null,'https://businessrecord.com/?p=13540']],
 layoffs:[['Mar 2026','About 350 in New Zealand','Three Heinz Wattie’s factories closing','https://www.just-food.com/news/kraft-heinz-nz-factories-closure/'],['May 2026','400','Roles outside North America, per SEC filing','https://gvwire.com/2026/05/06/kraft-heinz-plans-400-job-cuts-in-2026/']],
 unions:[['UFCW Local 152','About 400 Dover workers ratified a contract in June 2025','https://ufcwlocal152.org/news/kraft-heinz-workers-in-dover-de-ratify-new-union-contract/']],
 earnings:['Nov 4, 2026','https://finviz.com/news/401206/the-kraft-heinz-company-to-report-third-quarter-2026-results-on-november-4-2026'],ir:'https://ir.kraftheinzcompany.com',cik:'1637459'}
};
for(const k in PEOPLE){CO[k].workforce=PEOPLE[k].employees;CO[k].people=PEOPLE[k]}


/* ---------- starting figures pulled from SEC filings (XBRL data, Oct 2026) ---------- */
const SEC=(cik,acc)=>'https://www.sec.gov/Archives/edgar/data/'+cik+'/'+acc.replace(/-/g,'')+'/';
const FILINGS={
intc:{k:['10-K, fiscal 2025 (Dec 27, 2025)','https://www.sec.gov/Archives/edgar/data/50863/000005086326000011/intc-20251227.htm'],q:['10-Q, Q2 2026 (Jun 27, 2026)',SEC(50863,'0000050863-26-000157')],
 rows:[['Revenue, latest quarter',16.128,'q'],['Operating income, latest quarter',1.796,'q'],['Cash + short-term investments',29.727,'q'],['Total debt',50.537,'q'],['Revenue, fiscal 2025',52.853,'k'],['Operating income, fiscal 2025',-2.214,'k'],['Depreciation and amortization, FY',11.706,'k'],['Capital spending, FY',14.646,'k'],['Operating cash flow, FY',9.697,'k'],['Dividends paid, FY',0,'k']]},
ba:{k:['10-K, fiscal 2025 (Dec 31, 2025)','https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm'],q:['10-Q, Q2 2026 (Jun 30, 2026)',SEC(12927,'0001628280-26-050038')],
 rows:[['Revenue, latest quarter',24.560,'q'],['Operating income, latest quarter',0.156,'q'],['Cash + short-term investments',20.022,'q'],['Total debt',50.161,'q'],['Revenue, fiscal 2025',89.463,'k'],['Operating income, fiscal 2025',4.281,'k'],['Depreciation and amortization, FY',1.953,'k'],['Capital spending, FY',2.942,'k'],['Operating cash flow, FY',1.065,'k'],['Dividends paid, FY',0.331,'k']]},
unh:{k:['10-K, fiscal 2025 (Dec 31, 2025)','https://www.sec.gov/Archives/edgar/data/731766/000073176626000062/unh-20251231.htm'],q:['10-Q, Q2 2026 (Jun 30, 2026)',SEC(731766,'0000731766-26-000197')],
 extra:['Q3 2026 revenue ($112.69B) and operating income ($6.6B) come from the Oct 13 earnings release, before the Q3 10-Q was filed.','https://www.bnnbloomberg.ca/business/company-news/2026/10/13/unitedhealth-raises-profit-forecast-again-as-turnaround-efforts-gather-pace/'],
 rows:[['Revenue, Q2 2026',112.032,'q'],['Operating income, Q2 2026',7.991,'q'],['Cash + short-term investments',31.468,'q'],['Total debt',73.328,'q'],['Revenue, fiscal 2025',447.567,'k'],['Operating income, fiscal 2025',18.964,'k'],['Depreciation and amortization, FY',4.361,'k'],['Capital spending, FY',3.622,'k'],['Operating cash flow, FY',19.697,'k'],['Dividends paid, FY',7.916,'k']]},
nke:{k:['10-K, fiscal 2026 (May 31, 2026)','https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'],q:['10-Q, Q1 fiscal 2027 (Aug 31, 2026)',SEC(320187,'0000320187-26-000193')],
 extra:['Nike does not report operating income; it is pre-tax income less net interest income ($0.921B − $0.014B).',null],
 rows:[['Revenue, latest quarter',11.213,'q'],['Operating income, latest quarter',0.907,'q'],['Cash and equivalents',6.903,'q'],['Total debt',7.893,'q'],['Revenue, fiscal 2026',46.398,'k'],['Pre-tax income, fiscal 2026',3.900,'k'],['Depreciation and amortization, FY',0.747,'k'],['Capital spending, FY',0.684,'k'],['Operating cash flow, FY',2.868,'k'],['Dividends paid, FY',2.407,'k']]},
khc:{k:['10-K, fiscal 2025 (Dec 27, 2025)','https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm'],q:['10-Q, Q2 2026 (Jun 27, 2026)',SEC(1637459,'0001637459-26-000054')],
 extra:['Q2 2026 operating income was −$6.431B, including a $7.352B non-cash impairment. The game starts from the $0.921B before that charge.',null],
 rows:[['Revenue, latest quarter',6.262,'q'],['Operating income before impairment',0.921,'q'],['Cash + marketable securities',2.681,'q'],['Total debt',19.001,'q'],['Revenue, fiscal 2025',24.942,'k'],['Operating income, fiscal 2025',-4.669,'k'],['Depreciation and amortization, FY',0.968,'k'],['Capital spending, FY',0.801,'k'],['Operating cash flow, FY',4.462,'k'],['Dividends paid, FY',1.898,'k']]}
};
for(const k in FILINGS)CO[k].filings=FILINGS[k];

/* ---------- decisions any company faces ---------- */
const GENERIC=[
  {id:'g-ai',cat:'Operating architecture',title:'A company-wide AI productivity program',
   body:'Your teams want to roll out AI assistants across the company. Fortune 500 headcount fell for the second straight year as companies do more with fewer people.',
   src:'https://fortune.com/2026/06/19/fortune-500-employment-profits-revenue-hiring-jobs-ai/',
   why:'Productivity tools pay back best when people are trained to use them; tying the rollout to cuts gets savings faster and adoption slower.',
   opts:[
    {l:'Roll it out with retraining',d:'Costs now. Steady savings.',fx:[['cr',-2,0,1],['m',0.8,2,99],['emp',2],['exe',3]],q:3,ghost:1,a:['COO','The tool is only as good as the people using it.']},
    {l:'Roll it out and cut headcount',jobs:0.05,d:'Faster savings. People notice.',fx:[['cr',-1,0,1],['m',1.4,1,99],['emp',-10],['exe',-3],['inv',4]],q:1,a:['CFO','If it works, we need fewer people. Say so.']},
    {l:'Wait a year',d:'No cost. Rivals move first.',fx:[['m',-0.2,4,99]],q:1,a:['Chief Risk Officer','Let others find the problems first.']}
   ]},
  {id:'g-price',cat:'Vision and product',title:'Take a 3% price increase?',
   body:'Costs are up across your supply base. Your pricing team wants a broad 3% increase.',
   why:'Price increases stick when the brand is strong; when customers are already unhappy, volume falls faster than the price rises.',
   opts:[
    {l:'Raise prices 3%',d:'Margin up. Some customers leave.',fx:[['m',0.8,0,99],['g',-0.4,0,4],['cus',-6]],q:2,a:['Head of Revenue Management','Our competitors already moved.']},
    {l:'Hold prices',d:'Absorb the costs for now.',fx:[['m',-0.2,0,4],['cus',2]],q:2,ghost:1,a:['Head of Sales','Customers will remember who held the line.']},
    {l:'Run a promotion instead',d:'Volume now. Margin down.',fx:[['g',0.5,0,2],['m',-1,0,2],['cus',2]],q:1,a:['Chief Marketing Officer','We need traffic more than margin.']}
   ]},
  {id:'g-coo',cat:'People and governance',title:'A rival is recruiting your COO',
   body:'Your chief operating officer runs the turnaround day to day. A competitor has made an offer.',
   why:'Losing the person who runs execution mid-turnaround costs more than a retention package, unless a strong successor is ready.',
   opts:[
    {l:'Match with a retention package',d:'Keeps the plan on track.',fx:[['cr',-0.2,0,1],['exe',2],['brd',-1]],q:2,ghost:1,a:['Lead Director','Continuity matters more than the cost.']},
    {l:'Let them go and promote from within',d:'Some disruption. A signal to your bench.',fx:[['exe',-4],['emp',3],['exe',3,2]],q:2,a:['Chief People Officer','Our next leader is ready.']},
    {l:'Hire a well-known outside operator',d:'Expensive. Investors like the name.',fx:[['cr',-0.3,0,1],['exe',-2],['exe',5,2],['inv',3]],q:2,a:['Investor Relations','A big name buys us a quarter of patience.']}
   ]},
  {id:'g-union',cat:'People and governance',title:'Workers at a major site start organizing',
   body:'Employees at one of your largest sites have started a union drive.',
   why:'Fighting an organizing drive hard tends to damage trust whichever way the vote goes; neutrality and fair pay cost less over time.',
   opts:[
    {l:'Stay neutral and meet with organizers',d:'Respect the process.',fx:[['emp',6],['m',-0.3,0,99],['reg',2]],q:3,a:['Head of Labor Relations','Trust is cheaper than a fight.']},
    {l:'Fight it with outside consultants',d:'Might stop it. Costly to trust.',fx:[['cr',-0.1,0,1],['emp',-10],['reg',-4],['cus',-3]],q:0,a:['Plant manager','A union will slow every change we need.']},
    {l:'Raise wages ahead of the vote',d:'Address the cause.',fx:[['m',-0.6,0,99],['emp',10],['exe',2]],q:2,ghost:1,a:['Chief People Officer','Pay is the real issue. Fix it.']}
   ]},
  {id:'g-acq',cat:'Portfolio architecture',title:'A fast-growing competitor is for sale',
   body:'A smaller company with a product your customers want is for sale. The price is about 10% of a quarter\'s revenue, funded with new debt.',
   why:'Acquisitions during a turnaround compete for management attention; partnerships capture much of the upside without the integration load.',
   opts:[
    {l:'Buy it with debt',d:'Growth now. More debt and integration work.',fx:[['dr',10,0,1],['g',0.6,2,99],['exe',-4],['inv',-3]],q:1,a:['Head of M&A','We will never get this price again.']},
    {l:'Partner instead of buying',d:'Some of the upside. None of the debt.',fx:[['g',0.2,2,6]],q:3,ghost:1,a:['COO','We have enough to integrate already.']},
    {l:'Pass',d:'Stay focused.',fx:[],q:2,a:['CFO','Focus is a strategy too.']}
   ]},
  {id:'g-office',cat:'Operating architecture',title:'Real estate and return to office',
   body:'You have more office space than you use. Some leaders want everyone back five days a week; others want to consolidate sites.',
   why:'Consolidating space saves real money; mandates that ignore how people work cost attrition you do not see on the facilities line.',
   opts:[
    {l:'Consolidate sites, keep hybrid work',jobs:0.005,d:'Steady savings.',fx:[['m',0.5,1,99],['cr',1,1,1],['emp',-3]],q:3,a:['Head of Real Estate','We pay for floors nobody uses.']},
    {l:'Require five days in the office',d:'Fills buildings. Some people leave.',fx:[['emp',-8],['exe',1]],q:1,a:['Board member','Culture happens in person.']},
    {l:'Leave it as it is',d:'No disruption.',fx:[],q:2,ghost:1,a:['Chief People Officer','Do not pick a fight we do not need.']}
   ]},
  {id:'g-cyber',cat:'Crisis',title:'Your security chief asks for a bigger budget',
   body:'Your chief information security officer wants a large upgrade after attacks on peers.',
   why:'Security spending looks optional until the attack; the cost of a breach is many times the cost of prevention.',
   opts:[
    {l:'Fund it in full',d:'About 1% of a quarter\'s revenue.',fx:[['cr',-0.8,0,1],['reg',3],['exe',2],['flag','cyberShield']],q:3,a:['Chief Information Security Officer','Our peers learned this the hard way.']},
    {l:'Fund half',d:'Partial protection.',fx:[['cr',-0.4,0,1],['flag','cyberHalf']],q:2,ghost:1,a:['CFO','Prioritize the critical systems.']},
    {l:'Defer to next year',d:'Saves cash. Raises risk.',fx:[['flag','cyberWeak']],q:0,a:['Treasurer','We have bigger problems this year.']}
   ]},
  {id:'g-climate',cat:'Regulatory',title:'Your 2030 emissions target is out of reach',
   body:'Your internal review says the company will miss its public 2030 emissions target on the current path.',
   why:'Resetting a target openly costs a day of headlines; quietly missing it costs credibility on every other promise.',
   opts:[
    {l:'Reset to a later date you can hit',d:'Honest, and briefly awkward.',fx:[['reg',-1],['inv',1]],q:3,ghost:1,a:['General Counsel','A missed promise is worse than a revised one.']},
    {l:'Keep the target and hope',d:'No headlines now.',fx:[['reg',-6,4]],q:1,a:['Head of Communications','Nobody will check for years.']},
    {l:'Spend to hit it',d:'Costly, and you keep your word.',fx:[['cr',-1.5,0,1],['m',-0.3,0,99],['reg',4],['cus',2]],q:2,a:['Chief Sustainability Officer','We promised. We deliver.']}
   ]},
  {id:'g-iday',cat:'Investor communication',title:'Set long-term targets at Investor Day',
   body:'Investor Day is next quarter. Investors want multi-year targets.',
   why:'Targets you can beat compound credibility; bold targets win a day and lose a year if missed.',
   opts:[
    {l:'Set bold targets',d:'The stock pops. You must deliver.',fx:[['inv',8]],out:[{p:0.45,t:'You are tracking ahead of the bold targets.',fx:[['inv',4,6]]},{p:0.55,t:'You are tracking behind the bold targets.',fx:[['inv',-12,6],['brd',-6,6]]}],q:1,a:['Head of Strategy','Ambition is what investors pay for.']},
    {l:'Set targets you can beat',d:'Less excitement. More trust later.',fx:[['inv',2],['inv',4,6]],q:3,ghost:1,a:['Investor Relations','Beat and raise is the best story there is.']},
    {l:'Skip long-term targets',d:'No promises to miss.',fx:[['inv',-2]],q:2,a:['CFO','Too much is uncertain.']}
   ]},
  {id:'g-supply',cat:'Operating architecture',title:'A key supplier is struggling',
   body:'One of your single-source suppliers is short of cash and asks you to prepay orders.',
   why:'A single-source supplier is a risk whether or not it fails; a second source costs a little now and protects every future quarter.',
   opts:[
    {l:'Prepay to keep them alive',d:'Protects supply now.',fx:[['cr',-1,0,1],['exe',3]],q:2,ghost:1,a:['Head of Supply Chain','If they fail, our line stops.']},
    {l:'Prepay a little and qualify a second source',d:'Costs more now. Less risk later.',fx:[['cr',-0.5,0,1],['m',-0.2,0,4],['exe',5,2]],q:3,a:['COO','Never again one supplier for a critical part.']},
    {l:'Refuse',d:'Their problem, not yours.',fx:[],out:[{p:0.5,t:'The supplier survived on its own.',fx:[]},{p:0.5,t:'The supplier failed and your line stopped.',fx:[['g',-1,1,1],['exe',-8,1]]}],q:0,a:['CFO','We are not their bank.']}
   ]}
];

/* ---------- things that happen to you ---------- */
const EVENTS=[
  {id:'tariff',title:'Tariffs rise on key imports',w:{nke:2,intc:1,ba:1,khc:1,unh:0.2},
   body:'New tariffs raise the cost of imports from several of your sourcing countries.',auto:[['m',-0.7,0,4]],
   why:'Moving supply chains is slow and expensive, but tariffs that last longer than a year usually justify it.',
   opts:[
    {l:'Raise prices to cover it',d:'Margin recovers. Customers pay.',fx:[['m',0.5,0,4],['cus',-5],['g',-0.2,0,2]],q:2,ghost:1,a:['Head of Revenue Management','Everyone in the industry is passing it through.']},
    {l:'Absorb it this year',d:'Customers are spared. Margin is not.',fx:[['cus',2],['inv',-2]],q:2,a:['Head of Sales','Hold the line while competitors raise.']},
    {l:'Move sourcing over 18 months',d:'Costs now. Fixes it for good.',fx:[['cr',-1,0,2],['m',0.7,3,99],['exe',-2]],q:3,a:['Head of Supply Chain','Tariffs come and go. Resilience stays.']}
   ]},
  {id:'rates',title:'The Fed cuts rates by half a point',w:{},body:'Lower rates lift stock valuations and ease borrowing costs.',auto:[['inv',4],['g',0.2,0,3]]},
  {id:'recession',title:'A recession scare hits spending',w:{nke:1.5,khc:0.8,unh:0.5},
   body:'Consumer and business spending pull back sharply on recession fears.',auto:[['g',-0.7,0,3],['inv',-5]],
   why:'Cutting hard into a scare that passes damages the business you will need when demand returns.',
   opts:[
    {l:'Cut costs now',jobs:0.03,d:'Protect this year\'s margin.',fx:[['m',0.6,0,3],['emp',-6],['g',-0.2,1,3]],q:2,a:['CFO','Get ahead of it.']},
    {l:'Hold course',d:'Ride it out.',fx:[],q:2,ghost:1,a:['COO','We just rebuilt the team. Do not break it again.']},
    {l:'Lean in with promotions',d:'Win share while others retreat.',fx:[['g',0.4,0,2],['m',-0.8,0,2]],q:1,a:['Head of Sales','Customers remember who showed up in a downturn.']}
   ]},
  {id:'activist',title:'An activist fund takes a stake',w:{},
   body:'An activist fund discloses a 3% stake and asks for two board seats and a bigger buyback.',auto:[['inv',3]],
   why:'Settling early with an activist usually costs less than a proxy fight and keeps the plan intact.',
   opts:[
    {l:'Settle: give them two board seats',d:'Peace, with new voices on the board.',fx:[['brd',-6],['inv',6],['exe',-2]],q:2,ghost:1,a:['General Counsel','A settlement now beats a public fight.']},
    {l:'Fight a proxy contest',d:'Win and you keep control. Lose and you lose more.',fx:[['cr',-0.1,0,1]],out:[{p:0.5,t:'You won the proxy fight.',fx:[['brd',4],['inv',-2]]},{p:0.5,t:'You lost the proxy fight.',fx:[['brd',-15],['inv',4]]}],q:1,a:['Lead Director','They do not understand this business.']},
    {l:'Give them the buyback',d:'Cash goes out. Pressure eases.',fx:[['cr',-6,0,1],['shares',-2.5],['inv',5]],q:1,a:['Investor Relations','Give them what they want and move on.']}
   ]},
  {id:'cyber',title:'Ransomware hits a core system',w:{unh:1.5},
   body:'Attackers encrypted a core operating system. Customers are affected and regulators are asking questions.',auto:[['cus',-5],['reg',-5],['cr',-1.2,0,1],['exe',-5],['g',-0.3,0,1]],cyber:1,
   why:'Fast, full disclosure costs a day of bad press; slow disclosure turns an attack into a cover-up.',
   opts:[
    {l:'Disclose fast and in full',d:'Bad headlines now. Trust later.',fx:[['reg',6],['inv',-3]],q:3,ghost:1,a:['General Counsel','Get ahead of it.']},
    {l:'Disclose the minimum required',d:'Fewer headlines, if it stays quiet.',fx:[],out:[{p:0.5,t:'The minimal disclosure held.',fx:[]},{p:0.5,t:'Reporters found out more than you disclosed.',fx:[['reg',-12,1],['cus',-5,1]]}],q:0,a:['Head of Communications','Say only what we must.']}
   ]},
  {id:'viral',title:'A product goes viral',w:{nke:2,khc:1.5,intc:0.5,ba:0.3,unh:0.3},
   body:'One of your products took off on social media this quarter.',auto:[['g',0.5,0,2],['cus',5]]},
  {id:'probe',title:'A federal regulator opens an inquiry',w:{unh:2,ba:1.5},
   body:'A regulator opens an inquiry into some of your business practices.',auto:[['reg',-8],['inv',-4]],
   why:'Full cooperation with a credible outside review usually shortens an inquiry; fighting it tends to widen it.',
   opts:[
    {l:'Cooperate fully and hire outside counsel',d:'Costs money. Shortens the inquiry.',fx:[['cr',-0.1,0,1],['reg',7,1]],q:3,ghost:1,a:['General Counsel','Show them there is nothing to find.']},
    {l:'Contest it',d:'Might go away. Might grow.',fx:[],out:[{p:0.5,t:'The regulator dropped the inquiry.',fx:[['reg',2]]},{p:0.5,t:'The inquiry widened.',fx:[['reg',-10],['cr',-1,3,1]]}],q:1,a:['Head of Government Affairs','They are overreaching.']}
   ]},
  {id:'inputs',title:'Commodity costs spike',w:{khc:2.5,nke:1,ba:0.8,intc:0.6,unh:0.2},
   body:'Key input costs jumped this quarter.',auto:[['m',-1,0,3]],
   why:'Openly passing through costs keeps trust; hiding them in smaller packages saves margin and spends goodwill.',
   opts:[
    {l:'Raise prices',d:'Recover margin.',fx:[['m',0.6,0,3],['cus',-4]],q:2,ghost:1,a:['Head of Revenue Management','Costs went up. Prices follow.']},
    {l:'Hedge and absorb',d:'Customers spared.',fx:[['cr',-0.3,0,1],['cus',1]],q:2,a:['Treasurer','Spikes pass. Customers remember.']},
    {l:'Quietly reduce specs or sizes',d:'Margin recovers if no one notices.',fx:[['m',0.8,0,3],['cus',-8]],q:0,a:['Head of Product','Small changes, nobody notices.']}
   ]},
  {id:'raid',title:'A rival hires away key people',w:{intc:1.5},
   body:'A competitor recruited a group of your senior leaders and engineers.',auto:[['emp',-4],['exe',-4]],
   why:'Promoting from within after departures rewards the people who stayed; broad counter-offers reset pay expectations for everyone.',
   opts:[
    {l:'Counter-offer across the team',d:'Keep the rest. Costs money.',fx:[['cr',-0.3,0,1],['emp',5],['exe',3]],q:2,a:['Chief People Officer','Stop the bleeding before it spreads.']},
    {l:'Promote from within',d:'Reward those who stayed.',fx:[['emp',3],['exe',-1],['exe',3,2]],q:3,ghost:1,a:['COO','Our next layer is ready.']},
    {l:'Let them go',d:'No cost now.',fx:[],q:1,a:['CFO','Nobody is irreplaceable.']}
   ]},
  {id:'aisurge',title:'AI data-center demand jumps again',w:{intc:3,ba:0,unh:0,nke:0,khc:0},
   body:'Hyperscalers raised their capital spending plans. Demand for compute is outrunning supply.',auto:[['g',1.0,0,3],['kpi',0.08]],
   why:'Adding capacity into a demand surge pays if the surge lasts; raising prices captures it now without the build risk.',
   opts:[
    {l:'Add capacity fast',d:'Spend now to capture the wave.',fx:[['cash',-2,0,2],['g',0.4,2,99]],q:2,ghost:1,a:['Head of Data Center','Customers will remember who had supply.']},
    {l:'Raise prices instead',d:'Take the margin now.',fx:[['m',1,0,4],['cus',-4]],q:2,a:['CFO','Demand is outrunning supply. Price for it.']}
   ]},
  {id:'escape',title:'Inspectors find a quality escape',w:{ba:3,intc:0.5,nke:0.3,khc:0.5,unh:0},
   body:'Inspectors found a defect in delivered products. Customers and regulators want answers.',auto:[['reg',-8],['exe',-5],['cus',-5]],
   why:'Stopping to fix a defect costs a quarter; a recall or grounding costs years.',
   opts:[
    {l:'Stop and fix before shipping more',d:'Short delay. Problem contained.',fx:[['g',-0.6,0,1],['exe',7],['reg',7]],q:3,ghost:1,a:['Head of Quality','Fix it at the source.']},
    {l:'Keep shipping and fix in the field',d:'No delay, if it is minor.',fx:[],out:[{p:0.6,t:'The defect turned out to be minor.',fx:[['cus',-2]]},{p:0.4,t:'The defect led to a recall.',fx:[['g',-1.5,0,2],['reg',-15],['cus',-10]]}],q:0,a:['Head of Delivery','Customers need product now.']}
   ]},
  {id:'medtrend',title:'Hospital use runs hot',w:{unh:3,ba:0,intc:0,nke:0,khc:0},
   body:'Hospital visits and procedures among members are running well above plan.',auto:[['kpi',0.9]],
   why:'Repricing next year\'s plans fixes the cost trend; absorbing it hopes the trend reverses on its own.',
   opts:[
    {l:'Reprice next year\'s plans',d:'Costs come back in line. Some members leave.',fx:[['kpi',-0.6,2],['cus',-4],['g',-0.2,2,4]],q:3,ghost:1,a:['Chief Actuary','Price for the costs we actually see.']},
    {l:'Absorb it',d:'Members are spared. Margin is not.',fx:[],q:1,a:['Head of Sales','It may be a blip.']}
   ]},
  {id:'china',title:'China demand swings',w:{nke:2,ba:1.2,intc:1,khc:0,unh:0},
   body:'Demand in China moved sharply this quarter.',autoOut:[{p:0.5,t:'China demand jumped.',fx:[['g',0.5,0,2]]},{p:0.5,t:'China demand fell.',fx:[['g',-0.6,0,2]]}]},
  {id:'order',title:'A major customer offers a big multi-year order',w:{ba:2.5,intc:1,unh:0,nke:0.5,khc:0.5},
   body:'A large customer wants a multi-year order at a discount.',auto:[],
   why:'A discount that buys years of volume can be worth it; holding price works when your backlog is strong.',
   opts:[
    {l:'Accept at a discount',d:'Volume for years.',fx:[['g',0.4,2,99],['m',-0.3,2,99],['cus',4]],q:2,ghost:1,a:['Head of Sales','Lock it in.']},
    {l:'Hold your price',d:'They may walk.',fx:[],out:[{p:0.5,t:'They accepted your price.',fx:[['g',0.3,2,99]]},{p:0.5,t:'They walked.',fx:[['cus',-2]]}],q:2,a:['CFO','We do not need to buy volume.']}
   ]},
  {id:'strike',title:'A union strikes at a key site',w:{ba:1.5},
   body:'Workers at a key site walked out after contract talks broke down.',auto:[['g',-1.2,0,1],['emp',-4]],
   why:'A long strike costs far more than the wage gap that caused it.',
   opts:[
    {l:'Settle quickly with a raise',d:'Back to work fast.',fx:[['m',-0.4,0,99],['emp',8]],q:2,ghost:1,a:['Head of Labor Relations','Every week out costs more than the raise.']},
    {l:'Hold firm',d:'Costs less if it ends fast.',fx:[],out:[{p:0.5,t:'The strike ended quickly.',fx:[['g',-0.5,0,1]]},{p:0.5,t:'The strike dragged on.',fx:[['g',-2,0,2],['emp',-10],['cus',-4]]}],q:1,a:['CFO','Give in now and we give in every time.']}
   ]},
  {id:'glp1',title:'New data on weight-loss drugs and snacking',w:{khc:2,ba:0,intc:0,unh:0.3,nke:0},
   body:'New studies show people on appetite-suppressing drugs buy fewer snacks and smaller portions.',auto:[['g',-0.3,0,99]]}
];

/* ---------- lookups ---------- */
const CARD={};
for(const k in CO){for(const c of CO[k].deck)CARD[c.id]=c}
for(const c of GENERIC)CARD[c.id]=c;
const EV={};for(const e of EVENTS){EV[e.id]=e;if(e.opts)CARD['ev:'+e.id]=Object.assign({cat:'Event',isEvent:1},e)}

/* ---------- plan: cards and events per quarter, fixed by the seed ---------- */
function makePlan(co,D,seed){
  const N=D.quarters,r=rngFor(seed,'plan',co.id);
  const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=a[i];a[i]=a[j];a[j]=t}return a};
  const fixed=co.deck.filter(c=>c.at!=null&&c.at<N);
  const free=shuffle(co.deck.filter(c=>c.at==null||c.at>=N));
  const gen=shuffle(GENERIC);
  const used=new Set(),quarters=[];
  for(let q=0;q<N;q++){
    const cards=[];
    const f=fixed.find(c=>c.at===q);
    if(f)cards.push(f.id);else if(free.length)cards.push(free.shift().id);
    if((q%2===1||!cards.length)&&gen.length)cards.push(gen.shift().id);
    let ev=null;const re=rngFor(seed,'ev',q);
    if(q>0&&re()<D.ev){
      const wt=e=>(e.w&&e.w[co.id]!=null)?e.w[co.id]:1;
      const pool=EVENTS.filter(e=>!used.has(e.id)&&wt(e)>0);
      let x=re()*sum(pool.map(wt));
      for(const e of pool){x-=wt(e);if(x<=0){ev=e.id;break}}
      if(ev){used.add(ev);if(EV[ev].opts)cards.unshift('ev:'+ev)}
    }
    quarters.push({cards,event:ev});
  }
  return {quarters};
}

/* ---------- state ---------- */
function initState(co){
  const s=co.start;
  const st={rev:s.rev,cash:s.cash,debt:s.debt,div:s.div,shares:1,kpi:s.kpi,meters:Object.assign({},co.meters),
    pending:[],flags:{},overpromise:0,jobsCut:0,revHist:[],opHist:[],idx:100,idxHist:[100],lastG:s.g,expOp:null,guide:'maintain',gf:0,
    rd:[],hist:[],cashHist:[s.cash]};
  for(let k=4;k>=0;k--){const r=s.rev/Math.pow(1+s.g/100,k);st.revHist.push(r);st.opHist.push(r*s.m/100)}
  st.lastOp=st.opHist[4];
  st.expOp=st.lastOp*(1+s.g/100);
  st.base=valBase(st,co);
  st.eq0=equityRaw(st,co,st.base);
  return st;
}
function ttm(a){return sum(a.slice(-4))}
function valBase(st,co){const tr=ttm(st.revHist),to=ttm(st.opHist);const n=st.revHist.length;
  return {mT:to/tr*100,yoy:(st.revHist[n-1]/st.revHist[n-5]-1)*100,inv:co.meters.inv}}
function equityRaw(st,co,b){
  const tr=ttm(st.revHist),to=ttm(st.opHist),n=st.revHist.length;
  const mT=to/tr*100,yoy=(st.revHist[n-1]/st.revHist[n-5]-1)*100;
  const tf=(0.75+0.5*st.meters.inv/100)/(0.75+0.5*b.inv/100);
  const mult=co.start.mult*Math.exp(0.06*(mT-b.mT)+0.025*clamp(yoy-b.yoy,-30,30))*tf;
  return tr*mult-(st.debt-st.cash);
}
function annRev(st){return st.rev*4}
function minCash(st,co){return ((co&&co.start.minCash)||0.06)*annRev(st)}
function leverage(st,co){const ebitda=ttm(st.opHist)+co.start.da*4;return (st.debt-st.cash)/Math.max(ebitda,0.02*annRev(st))}

/* ---------- allocation menu ---------- */
function allocMenu(co,st){
  const R=annRev(st);
  return {
    reinvest:[['cut','Cut','Trim R&D and capex budgets. Margin now, growth later.'],['hold','Hold','Keep budgets where they are.'],['raise','Raise','About '+fmtB(0.02*st.rev)+' more this quarter. Growth in 3+ quarters.'],['surge','Surge','About '+fmtB(0.04*st.rev)+' more. Faster growth, strained teams.']],
    ret: st.div>0
      ?[['cutdiv','Cut dividend 40%','Saves about '+fmtB(st.div*0.4)+' a quarter. Income investors sell.'],['hold','Hold dividend',fmtB(st.div)+' a quarter.'],['buyback','Buy back stock','About '+fmtB(0.02*R)+' on top of the dividend.']]
      :[['none','No payout','Keep the cash in the business.'],['startdiv','Start a dividend','About '+fmtB(0.004*R)+' a quarter.'],['buyback','Buy back stock','About '+fmtB(0.02*R)+' this quarter.']],
    debt:[['pay','Pay down debt','About '+fmtB(Math.max(0.03*R,0.04*st.debt))+' if cash allows.'],['hold','Hold','Refinance as it comes due.'],['borrow','Borrow more','About '+fmtB(Math.max(0.03*R,0.04*st.debt))+' of new debt.']],
    guide:[['raise','Raise','Tell investors next quarter will beat the trend.'],['maintain','Maintain','Expect the current trend.'],['lower','Lower','Reset expectations down.'],['withdraw','Withdraw','Stop giving guidance.']]
  };
}
const RD_EFF={cut:-0.3,hold:0,raise:0.35,surge:0.55};

/* ---------- effects ---------- */
function pushFx(st,fx,q,rng,noise,D,mul,src){
  mul=mul||1;
  for(const e of fx){
    const v=e[0];
    if(v==='flag'){st.flags[e[1]]=true;continue}
    let mean=e[1]*mul;
    const lag=Math.round((e[2]||0)*D.lag),dur=e[3]||1;
    const isMeter=['inv','brd','emp','cus','reg','exe'].indexOf(v)>=0;
    let val=noise?mean+gauss(rng)*Math.abs(mean)*(isMeter?0.25:0.35)*D.sd:mean;
    if(Math.sign(val)!==Math.sign(mean))val=mean*0.15;
    st.pending.push({v,val,s:q+lag,e:q+lag+dur,src:src||null});
  }
}
function oddsFor(out,pmul){
  if(!pmul||pmul===1||out.length<2)return out.map(o=>o.p);
  const p0=clamp(out[0].p*pmul,0.05,0.95),rest=sum(out.slice(1).map(o=>o.p))||1;
  return [p0].concat(out.slice(1).map(o=>o.p/rest*(1-p0)));
}
function applyOpt(st,opt,q,rng,noise,D,mul,notes,src,ctx){
  if(opt.fx)pushFx(st,opt.fx,q,rng,noise,D,mul,src);
  if(ctx&&ctx.extra.length)pushFx(st,ctx.extra,q,rng,noise,D,mul,src);
  if(opt.out){
    const ps=oddsFor(opt.out,ctx&&ctx.pmul);
    if(noise){let x=rng(),pick=opt.out[opt.out.length-1];for(let i=0;i<opt.out.length;i++){x-=ps[i];if(x<=0){pick=opt.out[i];break}}
      pushFx(st,pick.fx,q,rng,noise,D,mul,src);if(notes&&pick.t)notes.push(pick.t);return pick.t}
    else{opt.out.forEach((o,i)=>pushFx(st,o.fx,q,rng,false,D,(mul||1)*ps[i],src));}
  }
  return null;
}

/* ---------- context: the same option is wise in one position and reckless in another ---------- */
function fxSum(fx,v){return sum((fx||[]).filter(e=>e[0]===v).map(e=>e[1]))}
function spendFrac(o,st){
  let c=0;const all=(o.fx||[]).concat(o.out?[].concat.apply([],o.out.map(x=>x.fx.map(e=>[e[0],e[1]*x.p,e[2],e[3]]))):[]);
  for(const e of all){const d=Math.min(e[3]||1,8);if(e[0]==='cash'&&e[1]<0)c-=e[1]*d;if(e[0]==='cr'&&e[1]<0)c-=e[1]*st.rev/100*d}
  return c/st.rev;
}
function contextFor(co,st,o,card){
  const M=st.meters,lev=leverage(st,co),floor=minCash(st,co),r={dq:0,extra:[],pmul:1,notes:[]};
  const rich=st.cash>floor*3.5&&lev<2.2,tight=st.cash<floor*2.2||lev>3.5;
  const shrinking=st.lastG<-0.3,sf=spendFrac(o,st);
  const add=(dq,fx,kind,text)=>{r.dq+=dq;r.extra.push.apply(r.extra,fx);r.notes.push([kind,text])};
  const inflow=Math.max(0,fxSum(o.fx,'cash'))+Math.max(0,fxSum(o.fx,'cr'))*st.rev/100;
  const gUp=sum((o.fx||[]).filter(e=>e[0]==='g'&&e[1]>0&&(e[3]||1)>=4).map(e=>e[1]));
  const maxSf=card?Math.max.apply(null,card.opts.map(x=>spendFrac(x,st))):sf;
  const top=sf>=maxSf*0.99,mid=!top&&sf>=maxSf*0.3;
  if(sf>=0.1&&mid){
    if(tight)add(-1,[['inv',-3],['brd',-2]],'bad','Cash is tight. Even a moderate spend strains the balance sheet.');
    else if(rich)add(1,[['inv',1],['g',0.1,2,99]],'good','You can afford this comfortably.');
  }
  if(sf>=0.1&&top){
    if(tight)add(-2,[['inv',-6],['brd',-4],['g',-0.25,1,4]],'bad','Cash is tight. A spend this size forces you to borrow at bad rates, and the board will push back.');
    else if(rich)add(2,[['inv',3],['g',0.3,2,99]],'good','You have the cash to fund this from strength, so the team can move fast.');
  }
  if(inflow>=0.2*st.rev){
    if(tight)add(2,[['inv',4],['brd',3]],'good','Cash is tight. New money now keeps you away from emergency loans.');
    else if(rich)add(-1,[['inv',-4]],'bad','You already have plenty of cash. Investors will ask why you need more.');
  }
  const emp=fxSum(o.fx,'emp');
  if(emp<=-6){
    if(M.emp<40)add(-2,[['emp',-4],['exe',-6]],'bad','Morale is already low. Deeper cuts will push your best people out.');
    else if(shrinking&&M.emp>=50)add(1,[['inv',3]],'good','Sales are falling and morale can take it. Investors want to see costs come down.');
  }
  if(o.out){
    if(M.exe>=60){r.pmul=1.4;add(2,[],'good','Execution is strong, which improves the odds.')}
    else if(M.exe<40){r.pmul=0.6;add(-2,[],'bad','Execution is weak, which worsens the odds.')}
  }
  const cautious=sf<0.02&&!o.out&&gUp<=0&&inflow<0.2*st.rev&&!!card&&card.opts.some(x=>x!==o&&(spendFrac(x,st)>=0.1||x.fx&&x.fx.some(e=>e[0]==='g'&&e[1]>0)));
  if(cautious&&shrinking&&M.cus<55)add(-2,[['g',-0.4,1,4],['inv',-3]],'bad','Sales are slipping. Playing it safe now lets rivals take share.');
  if(cautious&&rich&&!shrinking&&M.inv<70)add(-2,[['inv',-4],['g',-0.15,2,4]],'bad','You are sitting on a lot of cash. Investors expect you to put it to work.');
  if(gUp>0&&shrinking&&sf<0.1)add(2,[['g',0.25,1,99]],'good','Sales are falling, so anything that restarts growth is worth more now.');
  if(fxSum(o.fx,'cus')<=-5&&M.cus<38)add(-2,[['cus',-4],['g',-0.3,0,3]],'bad','Customers are already unhappy. This could push them to rivals.');
  if(fxSum(o.fx,'reg')<=-6&&M.reg<30)add(-2,[['reg',-5],['inv',-3]],'bad','Regulators are already hostile. This invites retaliation.');
  const invUp=fxSum(o.fx,'inv');
  if(invUp>=4&&M.inv>=72)add(-1,[],'bad','Investors are already enthusiastic. There is little left to win with them.');
  if(invUp>=4&&M.inv<35&&!o.out)add(1,[['inv',2]],'good','Investors are nervous. A move they like matters more now.');
  return r;
}
function ctxRaw(co,st,o,card){return o.q+contextFor(co,st,o,card).dq}
/* grade relative to the best option available in this situation */
function ctxGrades(co,st,card){const raw=card.opts.map(o=>ctxRaw(co,st,o,card)),mx=Math.max.apply(null,raw);return raw.map(v=>clamp(Math.round(3-(mx-v)),0,3))}
function ctxQ(co,st,o,card){return ctxGrades(co,st,card)[card.opts.indexOf(o)]}

/* ---------- one quarter ---------- */
/* choices: {cards:{cardId:optIndex}, reinvest, ret, debt, guide} */
function step(game,who,ch,opt){
  opt=opt||{};
  const co=CO[game.coId],D=DIFF[game.diffKey],q=game.q,st=game[who],seed=game.seed;
  const cash0=st.cash;let fin=0;
  const noise=opt.noise!==false,notes=[],outs={},fits={};
  const pq=game.plan.quarters[q];
  const sd=noise?D.sd:0;
  // event auto effects
  if(pq.event&&!opt.skipEvent){
    const ev=EV[pq.event];let mul=D.evMul;
    const sg=who==='st'?game.strategy:game.ghostStrategy;
    if(sg&&EVENT_FORCE[ev.id]&&sg.top.indexOf(EVENT_FORCE[ev.id])>=0){mul*=HEDGE;if(who==='st')opt._hedged=true}
    if(ev.cyber){mul*=st.flags.cyberShield?0.4:st.flags.cyberHalf?0.7:st.flags.cyberWeak?1.5:1}
    if(ev.auto)pushFx(st,ev.auto,q,rngFor(seed,'evfx',q),noise,D,mul);
    if(ev.autoOut){const t=applyOpt(st,{out:ev.autoOut},q,rngFor(seed,'evout',q),noise,D,mul,null);if(t)outs['ev:'+ev.id+':auto']=t}
  }
  // decisions
  if(!opt.skipCards)for(const cid of pq.cards){
    const card=CARD[cid],oi=ch.cards[cid];if(oi==null)continue;
    const o=card.opts[oi];
    const ctx=contextFor(co,st,o,card);
    const t=applyOpt(st,o,q,rngFor(seed,'fx',q,cid,oi),noise,D,1,null,{cid,oi,q},ctx);
    if(t)outs[cid]=t;
    const sg=who==='st'?game.strategy:game.ghostStrategy;
    if(sg){const f=fitOf(cid,oi,sg.posture);fits[cid]=f;
      if(f>0)pushFx(st,[['exe',2],['inv',0.5]],q,null,false,D);
      else if(f<0)pushFx(st,[['exe',-2],['inv',-1.5]],q,null,false,D)}
  }
  // allocation
  const R=annRev(st),eqNow=Math.max(equityRaw(st,co,st.base),0.05*st.eq0);
  st.rd.push(ch.reinvest||'hold');
  if(ch.reinvest==='cut')pushFx(st,[['m',0.9,0,1],['emp',-3],['exe',-1]],q,null,false,D);
  if(ch.reinvest==='raise')pushFx(st,[['cr',-2,0,1],['exe',1]],q,null,false,D);
  if(ch.reinvest==='surge')pushFx(st,[['cr',-4,0,1],['exe',-2],['inv',-2]],q,null,false,D);
  let buyback=0;
  if(ch.ret==='cutdiv'){st.div*=0.6;st.meters.inv-=8;st.meters.brd-=2}
  if(ch.ret==='startdiv'){st.div=0.004*R;st.meters.inv+=4}
  if(ch.ret==='buyback'){buyback=0.02*R;st.shares*=1-buyback/eqNow;st.meters.inv+=2}
  const dAmt=Math.max(0.03*R,0.04*st.debt);
  if(ch.debt==='pay'){const p=Math.max(0,Math.min(dAmt,st.cash-minCash(st,co)));st.debt-=p;st.cash-=p;fin-=p;st.meters.inv+=1}
  if(ch.debt==='borrow'){st.debt+=dAmt;st.cash+=dAmt;fin+=dAmt;st.meters.inv-=1}
  // activate pending
  let gm=0,mm=0;
  const kpiBefore=st.kpi;
  for(const p of st.pending){
    if(p.s>q||p.e<=q)continue;
    if(p.v==='g')gm+=p.val;else if(p.v==='m')mm+=p.val;
    else if(p.v==='cash')st.cash+=p.val;else if(p.v==='debt')st.debt+=p.val;
    else if(p.v==='cr')st.cash+=p.val*st.rev/100;else if(p.v==='dr')st.debt+=p.val*st.rev/100;
    else if(p.s===q){
      if(p.v==='kpi')st.kpi+=p.val;
      else if(p.v==='shares')st.shares*=1+p.val/100;
      else if(p.v==='div')st.div*=1+p.val/100;
      else if(st.meters[p.v]!=null)st.meters[p.v]+=p.val;
    }
  }
  st.pending=st.pending.filter(p=>p.e>q+1||p.s>q);
  // reinvestment payoff: average of choices made 3-6 quarters ago (scaled by difficulty lag)
  const L=Math.max(1,Math.round(3*D.lag));let rdSum=0;
  for(let k=L;k<L+4;k++){const c=st.rd[st.rd.length-1-k];if(c)rdSum+=RD_EFF[c]}
  gm+=rdSum/4;
  // KPI
  const K=co.kpi,ri=rngFor(seed,'idio',q),rm=rngFor(seed,'macro',q),rx=rngFor(seed,'idx',q);
  const macro=gauss(rm),idio=gauss(ri),idio2=gauss(ri),kn=gauss(ri),inoise=gauss(rx);
  if(!K.derived){
    if(co.id==='nke')st.kpi+=(3-st.kpi)*0.12+kn*0.5*sd;
    else if(co.id==='unh')st.kpi+=K.drift+kn*0.15*sd;
    else st.kpi+=K.drift||0;
    st.kpi=clamp(st.kpi,K.min,K.max);
  }
  let kpiG=0,kpiM=0;
  if(co.id==='nke')kpiG=(st.kpi-6)*0.04;
  if(co.id==='unh')kpiM=(co.start.kpi-st.kpi)*0.85;
  // revenue
  const M=st.meters;
  const g=co.start.g+gm+(M.cus-50)*0.012+kpiG+macro*0.7*sd+idio*0.4*sd;
  st.rev=st.rev*(1+g/100);
  if(co.id==='intc')st.rev+=Math.max(0,st.kpi-kpiBefore);
  if(co.id==='ba'&&kpiBefore>0)st.rev*=1+0.45*(st.kpi-kpiBefore)/kpiBefore;
  st.rev=Math.max(st.rev,0.2*co.start.rev);
  // margin and cash
  const margin=clamp(co.start.m+mm+(M.exe-50)*0.02+kpiM+idio2*0.35*sd,-40,60);
  const op=st.rev*margin/100;
  const interest=st.debt*0.045/4;
  const tax=Math.max(0,op-interest)*0.18;
  const ni=op-interest-tax;
  const fcf=ni+co.start.da-co.start.capex+co.start.wc;
  st.cash+=fcf-st.div-buyback;
  if(co.kpi.derived){st.revHist.push(st.rev);st.opHist.push(op);st.kpi=(st.rev/st.revHist[st.revHist.length-5]-1)*100;st.revHist.pop();st.opHist.pop()}
  // forced financing
  let rescue=0;
  if(st.cash<minCash(st,co)){rescue=minCash(st,co)*1.5-st.cash;st.debt+=rescue;st.cash+=rescue;fin+=rescue;M.inv-=5;M.brd-=5}
  // earnings vs expectations
  const exp=st.expOp,den=Math.max(Math.abs(exp),0.015*st.rev);
  let s=clamp((op-exp)/den,-0.6,0.6);
  const sMul=st.guide==='withdraw'?0.5:1;
  M.inv+=clamp(s*50*sMul,-10,8);
  let callNote=null;
  if(st.overpromise>0){if(s<-0.02){M.inv-=8*st.overpromise;M.brd-=4*st.overpromise;callNote='bad'}else{M.inv+=2;callNote='good'}st.overpromise=0}
  if(st.guide==='raise'&&s<-0.02){M.inv-=5;M.brd-=3}
  if(st.guide==='lower'&&s>0.02)M.inv+=2;
  // meter dynamics
  const base=co.meters;
  M.exe+=(M.emp-50)*0.02;
  for(const k in M){M[k]+=(base[k]-M[k])*0.04;M[k]=clamp(M[k],0,100)}
  // history
  st.revHist.push(st.rev);st.opHist.push(op);
  if(st.revHist.length>12){st.revHist.shift();st.opHist.shift()}
  // value index
  const prevIdx=st.idx;
  const eq=Math.max(equityRaw(st,co,st.base),0.05*st.eq0);
  const target=eq/st.shares/st.eq0*100;
  st.idx=Math.max(3,st.idx+0.75*(target-st.idx)+inoise*st.idx*0.025*sd);
  st.idxHist.push(st.idx);
  // board
  const ret=(st.idx/prevIdx-1)*100;
  M.brd+=clamp(ret*0.35,-6,6)+(s>0.02?2:s<-0.02?-3:0)+(M.inv-50)*0.02-(rescue>0?2:0);
  M.brd=clamp(M.brd,0,100);M.inv=clamp(M.inv,0,100);
  // guidance for next quarter
  const gfMap={raise:0.04,maintain:0,lower:-0.04,withdraw:0};
  st.guide=ch.guide||'maintain';st.gf=gfMap[st.guide];
  if(st.guide==='raise')M.inv=clamp(M.inv+3,0,100);
  if(st.guide==='lower')M.inv=clamp(M.inv-4,0,100);
  if(st.guide==='withdraw'){M.inv=clamp(M.inv-6,0,100);M.brd=clamp(M.brd-2,0,100)}
  st.expOp=op*(1+clamp(g,-5,5)/100)*(1+st.gf);
  st.lastG=g;st.lastOp=op;st.cashHist.push(st.cash);
  const nH=st.revHist.length;
  const rec={q,rev:st.rev,g,margin,op,fcf,cash:st.cash,debt:st.debt,kpi:st.kpi,idx:st.idx,ret,s,exp,rescue,div:st.div,buyback,outs,callNote,fits,hedged:!!opt._hedged,meters:Object.assign({},M),
    interest,tax,ni,da:co.start.da,capex:co.start.capex,wc:co.start.wc,cash0,fin,other:(st.cash-cash0)-(fcf-st.div-buyback)-fin,
    yoy:(st.revHist[nH-1]/st.revHist[nH-5]-1)*100,ttmRev:ttm(st.revHist),ttmOp:ttm(st.opHist),lev:leverage(st,co),shares:st.shares,expNext:st.expOp,guide:st.guide,eq:eq};
  st.hist.push(rec);
  return rec;
}

/* ---------- ghost: the real playbook ---------- */
function ghostChoices(game,q){
  const co=CO[game.coId],cards={};
  for(const cid of game.plan.quarters[q].cards){const c=CARD[cid];let i=c.opts.findIndex(o=>o.ghost);cards[cid]=i<0?0:i}
  return {cards,reinvest:co.real.reinvest,ret:co.real.ret,debt:co.real.debt,guide:'maintain'};
}

/* ---------- process quality for allocation and guidance ---------- */
function assess(game,ch){
  const co=CO[game.coId],st=game.st,lev=leverage(st,co);
  const fcfLast=st.hist.length?st.hist[st.hist.length-1].fcf:co.start.da-co.start.capex+co.start.wc+st.lastOp*0.7;
  const trendDown=st.lastG<0;
  const r={};
  r.reinvest={cut:(trendDown&&st.meters.cus<45)?1:2,hold:2,raise:lev<4?3:1,surge:lev>4?0:2}[ch.reinvest];
  if(ch.ret==='buyback')r.ret=(fcfLast<0||lev>3.5)?0:2;
  else if(ch.ret==='cutdiv')r.ret=(lev>3.5||fcfLast-st.div<0)?3:1;
  else if(ch.ret==='startdiv')r.ret=(fcfLast>0&&lev<2)?2:0;
  else r.ret=(fcfLast-st.div<0&&lev>4)?1:2;
  r.debt={pay:lev>2.5?3:2,hold:lev>4?1:2,borrow:lev>3?0:1}[ch.debt];
  // guidance: peek at next quarter with no noise
  const f=forecast(game,ch);
  const ratio=f.ratio;
  const best=ratio>1.03?'raise':ratio<0.97?'lower':'maintain';
  r.guide=ch.guide===best?3:ch.guide==='maintain'?2:ch.guide==='withdraw'?1:0;
  r.best=best;r.ratio=ratio;r.cashNext=f.cash;
  return r;
}
function forecast(game,ch){
  const g=clone(game);
  const c2=Object.assign({},ch,{guide:'maintain'});
  const a=step(g,'st',c2,{noise:false});
  g.q++;
  let ratio=1;
  if(g.q<g.plan.quarters.length){
    const b=step(g,'st',{cards:{},reinvest:'hold',ret:ch.ret==='buyback'?'hold':ch.ret,debt:'hold',guide:'maintain'},{noise:false,skipCards:true,skipEvent:true});
    const trend=a.op*(1+clamp(a.g,-5,5)/100);
    ratio=b.op/(Math.abs(trend)>0.0001?trend:0.0001);
    if(trend<0)ratio=b.op>=trend?1+(b.op-trend)/Math.abs(trend):1-(trend-b.op)/Math.abs(trend);
  }
  return {cash:a.cash,ratio,op:a.op};
}


/* ---------- the cabinet: named executives who remember ---------- */
const CAB_ROLES=[['cfo','Chief Financial Officer'],['coo','Chief Operating Officer'],['cco','Chief Commercial Officer'],['gc','General Counsel'],['cpo','Chief People Officer']];
const NAMES=['Dana Okafor','Marcus Lindqvist','Priya Natarajan','Tom Brennan','Elena Ruiz','Samuel Adeyemi','Grace Holloway','Kenji Watanabe','Rachel Stein','Victor Alvarez','Nadia Haddad','Owen Gallagher','Mei Chen','Andre Dupree','Laura Kowalski','Hassan Farouk','Julia Bergstrom','Darnell Price','Sofia Marchetti','Ian McAllister','Aisha Bello','Peter Novak','Hannah Leclerc','Ravi Menon'];
const ANALYSTS=[['Claire Whitmore','Halvorsen & Co.'],['Marcus Bell','Crestline Securities'],['Ana Sousa','Northgate Research'],['David Kim','Meridian Capital Markets'],['Fatima Rahman','Ashby Partners'],['Leo Hartmann','Granite Bay Equity'],['Nora Quinlan','Tidewater Securities'],['Raj Patel','Corbett Wells']];
function roleOf(who){
  if(/Counsel|Compliance|Risk|Government|Medical Officer|Sustainability|Communications|Security/.test(who))return 'gc';
  if(/People|Labor/.test(who))return 'cpo';
  if(/CFO|Treasurer|Investor Relations|Actuary/.test(who))return 'cfo';
  if(/COO|Manufactur|Supply|Operations|Quality|Engineer|Technology|Foundry|Integration|Delivery|Plant|Packaging|R&D|Innovation|Data Center|Real Estate/.test(who))return 'coo';
  if(/Sales|Marketing|Growth|Strategy|Brand|Revenue|Wholesale|Digital|Lifestyle|Running|Sport|M&A|Product|Medicare|Optum|Provider|Customer|Defense|North America|China|Marketplace|Client/.test(who))return 'cco';
  return null;
}
function newCabinet(seed){
  const r=rngFor(seed,'cab'),pool=NAMES.slice(),cab={};
  for(const [k,t] of CAB_ROLES){const i=Math.floor(r()*pool.length);cab[k]={name:pool.splice(i,1)[0],title:t,loyalty:60,since:0,ally:false}}
  cab._pool=pool;return cab;
}
function cabUpdate(game,ch){
  const cab=game.cab,q=game.q,ev=[];
  const M=game.st.meters;
  for(const cid in ch.cards){
    const card=CARD[cid],pick=ch.cards[cid];
    card.opts.forEach((o,i)=>{
      if(!o.a)return;const k=roleOf(o.a[0]);if(!k)return;const m=cab[k];
      if(i===pick){m.loyalty=clamp(m.loyalty+6,0,100)}else{m.loyalty=clamp(m.loyalty-4,0,100)}
    });
  }
  for(const [k,t] of CAB_ROLES){
    const m=cab[k];
    if(m.loyalty<58)m.loyalty+=1;
    if(m.loyalty<18){
      const hit={cfo:['inv',-5],coo:['exe',-6],cco:['cus',-4],gc:['reg',-5],cpo:['emp',-5]}[k];
      M[hit[0]]=clamp(M[hit[0]]+hit[1],0,100);
      const r=rngFor(game.seed,'repl',q,k),pool=cab._pool;const nn=pool.length?pool.splice(Math.floor(r()*pool.length),1)[0]:'Interim '+t;
      ev.push({type:'quit',k,name:m.name,title:t,repl:nn,hit});
      cab[k]={name:nn,title:t,loyalty:50,since:q+1,ally:false};
    }else if(m.loyalty>=85&&!m.ally){
      m.ally=true;const b={cfo:['inv',3],coo:['exe',4],cco:['cus',3],gc:['reg',4],cpo:['emp',4]}[k];
      M[b[0]]=clamp(M[b[0]]+b[1],0,100);ev.push({type:'ally',k,name:m.name,title:t,hit:b});
    }
  }
  return ev;
}

/* ---------- callbacks: decisions coming due ---------- */
function comingDue(game){
  const st=game.st,q=game.q,by={};
  for(const p of st.pending){
    if(!p.src||p.s!==q||q-p.src.q<2)continue;
    const k=p.src.cid+'|'+p.src.q;(by[k]=by[k]||{src:p.src,fx:[]}).fx.push([p.v,p.val]);
  }
  return Object.values(by);
}

/* ---------- earnings call ---------- */
function makeCall(game,who){
  const st=game[who],co=CO[game.coId],r=st.hist[st.hist.length-1];if(!r)return [];
  const lev=leverage(st,co),M=st.meters,qs=[];
  const sur=r.exp!==0?(r.op-r.exp)/Math.abs(r.exp)*100:0;
  const K=co.kpi,kd=(st.kpi-co.start.kpi)*K.good;
  const add=(id,bad,pri,text)=>qs.push({id,bad,pri,text});
  if(r.rescue>0)add('rescue',1,10,'You needed '+fmtB(r.rescue)+' of emergency financing this quarter. How close did the company come to running out of cash?');
  if(r.s<-0.02)add('miss',1,9,'You missed our operating income estimate by '+Math.abs(sur).toFixed(0)+'%. Why should we believe the plan is working?');
  if(r.fcf<0)add('burn',1,7,'Free cash flow was '+fmtB(r.fcf)+'. When does the cash burn stop?');
  if(lev>3.5)add('lev',1,7,'Net debt is '+lev.toFixed(1)+' times earnings. Are you considering selling shares to raise money?');
  if(M.emp<38)add('morale',1,6,'There are reports of low morale and senior departures. Are more job cuts coming?');
  if(M.reg<32)add('reg',1,6,'Regulators appear to be circling. How big is your exposure?');
  if(M.cus<38)add('cus',1,5,'Customer satisfaction looks weak. Are you losing share to competitors?');
  if(r.g<-1)add('decline',1,6,'Revenue fell '+Math.abs(r.g).toFixed(1)+'% from last quarter. What turns that around?');
  if(r.s>0.02)add('beat',0,5,'A clear beat this quarter. How much of that is sustainable versus one-time?');
  if(r.g>1.5)add('growth',0,4,'Revenue grew '+r.g.toFixed(1)+'% sequentially. What is driving it, and can it continue?');
  if(r.margin>co.start.m+1)add('margin',0,4,'Operating margin reached '+r.margin.toFixed(1)+'%. Can you hold that level?');
  add('kpi',kd<0?1:0,3,(kd>=0?K.name+' moved the right way, to ':K.name+' moved the wrong way, to ')+K.fmt(st.kpi)+'. What is your target for next year?');
  const last=game.log.length?game.log[game.log.length-1]:null;
  qs.sort((a,b)=>b.pri-a.pri);
  const pick=qs.slice(0,3),rr=rngFor(game.seed,'an',game.q),an=ANALYSTS.slice();
  return pick.map(x=>Object.assign(x,{analyst:an.splice(Math.floor(rr()*an.length),1)[0]}));
}
const TONES=[['confident','Confident','Project strength. Great if the news is good; costly if you oversell.'],['candid','Candid','Lay out the facts, good or bad.'],['deflect','Deflect','Avoid specifics and talk about the long term.']];
function callEffect(bad,tone){
  if(!bad)return {confident:{inv:4,brd:0,flag:0,q:3},candid:{inv:2,brd:1,flag:0,q:2},deflect:{inv:-2,brd:0,flag:0,q:1}}[tone];
  return {confident:{inv:2,brd:0,flag:1,q:1},candid:{inv:-1,brd:2,flag:0,q:3},deflect:{inv:-4,brd:-1,flag:0,q:0}}[tone];
}
function applyCall(game,who,qs,answers){
  const st=game[who],M=st.meters;let inv=0,brd=0,flag=0,qsum=0;
  qs.forEach((x,i)=>{const e=callEffect(x.bad,answers[i]);inv+=e.inv;brd+=e.brd;flag+=e.flag;qsum+=e.q});
  M.inv=clamp(M.inv+inv,0,100);M.brd=clamp(M.brd+brd,0,100);st.overpromise=Math.min(2,st.overpromise+(flag?1:0));
  return {inv,brd,flag,quality:qs.length?qsum/qs.length:2};
}

/* ---------- strategy: Five Forces read + how-to-win posture ---------- */
const FORCES=[['rivalry','Rivals'],['buyers','Buyers'],['suppliers','Suppliers'],['entrants','New entrants'],['substitutes','Substitutes']];
const POSTURES=[['cost','Cost leader'],['differentiate','Differentiator'],['focus','Focused niche'],['reinvent','Reinventor']];
const POSTURE_OPP={cost:'differentiate',differentiate:'cost',focus:'reinvent',reinvent:'focus'};
/* which force each shock belongs to; a force you flagged softens the shock because you saw it coming */
const EVENT_FORCE={tariff:'suppliers',inputs:'suppliers',strike:'suppliers',medtrend:'suppliers',recession:'buyers',raid:'rivalry',glp1:'substitutes'};
const HEDGE=0.65;
/* Hand-tagged: which strategy each option serves. c cost leader, d differentiator, f focus, r reinvent, - neutral.
   Our judgment; it decides whether a choice fits or fights the posture you picked. */
const FIT_TAG={
 'intc-14a':'rfc','intc-spin':'r-f','intc-asic':'cdf','intc-raise':'---','intc-layers':'c--','intc-yield':'dc-','intc-chips':'r-c',
 'ba-rate':'cdf','ba-newjet':'rdc','ba-cert':'dcf','ba-spirit':'d-c','ba-union':'---','ba-defense':'cff','ba-china':'cd-',
 'unh-ma':'fd-','unh-pa':'ddc','unh-optum':'f-c','unh-coding':'d--','unh-ai':'cc-','unh-unit':'f-r','unh-2027':'---',
 'nke-channel':'d-c','nke-franchise':'fdc','nke-cfo':'---','nke-running':'f-c','nke-china':'rfc','nke-amazon':'cdf','nke-windfall':'d--',
 'khc-600':'dc-','khc-split':'r-f','khc-kids':'dcr','khc-private':'c-d','khc-glp1':'d-r','khc-div':'---','khc-coffee':'d-c',
 'g-ai':'dc-','g-price':'d-c','g-coo':'---','g-union':'---','g-acq':'r-f','g-office':'---','g-cyber':'d-c','g-climate':'---','g-iday':'---','g-supply':'---',
 'ev:tariff':'d-c','ev:recession':'c-r','ev:activist':'---','ev:cyber':'d-','ev:probe':'d-','ev:inputs':'d-c','ev:raid':'---','ev:aisurge':'rd','ev:escape':'dc','ev:medtrend':'--','ev:order':'cd','ev:strike':'--'
};
const _FT={c:'cost',d:'differentiate',f:'focus',r:'reinvent'};
/* +1 the option fits the posture, -1 it fights it, 0 neutral */
function fitOf(cid,oi,posture){
  const t=_FT[(FIT_TAG[cid]||'')[oi]];
  if(!t)return 0;
  if(t===posture)return 1;
  if(POSTURE_OPP[posture]===t)return -1;
  return 0;
}
function validStrategy(s,co){
  if(!s||typeof s!=='object')return false;
  if(!Array.isArray(s.top)||s.top.length!==2||s.top[0]===s.top[1])return false;
  if(!s.top.every(f=>FORCES.some(x=>x[0]===f)))return false;
  return POSTURES.some(x=>x[0]===s.posture);
}
function setStrategy(game,s){
  const co=CO[game.coId];
  if(!co.strategy||!validStrategy(s))return false;
  game.strategy={top:s.top.slice(),posture:s.posture};
  game.ghostStrategy={top:co.strategy.ref.slice(),posture:co.strategy.lead.posture};
  return true;
}
function strategySummary(game){
  const co=CO[game.coId],S=co.strategy,mine=game.strategy;
  if(!mine||!S)return null;
  let al=0,fo=0,ne=0,hedged=0;
  for(const l of game.log){if(l.fits)for(const k in l.fits){const f=l.fits[k];if(f>0)al++;else if(f<0)fo++;else ne++}if(l.hedged)hedged++}
  const match=mine.top.filter(f=>S.ref.indexOf(f)>=0).length;
  return {posture:mine.posture,top:mine.top,refPosture:S.lead.posture,ref:S.ref,match,aligned:al,fought:fo,neutral:ne,hedged};
}

/* ---------- strategy data: a sourced Five Forces read for each company ----------
   Pressure: 1 weak, 2 moderate, 3 strong. The reference read and the leadership posture are our
   reading of the filings and public statements, not a ruling. */
const _SD={
 intc:{
  forces:{
   rivalry:{p:3,line:'AMD contests x86 chips, Arm designers and hyperscaler custom silicon attack share, Nvidia leads AI, and TSMC leads contract manufacturing.',src:'https://www.sec.gov/Archives/edgar/data/50863/000005086326000011/intc-20251227.htm'},
   buyers:{p:2,line:'Big cloud and PC customers hold some leverage, but demand is outrunning supply and Intel has signed long-term deals and raised prices.',src:'https://download.intel.com/newsroom/2026/earnings/Intel-Q22026-Earnings-Call.pdf'},
   suppliers:{p:3,line:'ASML is the sole source of EUV tools, TSMC makes some Intel chips, and substrates, memory and wafers are short.',src:'https://www.sec.gov/Archives/edgar/data/50863/000005086326000011/intc-20251227.htm'},
   entrants:{p:2,line:'Leading-edge fabs cost enormous sums, so few can enter; the newer threat is Arm and RISC-V designers and custom chips from the cloud giants.',src:'https://www.sec.gov/Archives/edgar/data/50863/000005086326000011/intc-20251227.htm'},
   substitutes:{p:2,line:'GPU systems and custom chips can divert spending from CPUs, though management says AI inference is now lifting server CPU demand.',src:'https://www.sec.gov/Archives/edgar/data/50863/000005086326000011/intc-20251227.htm'}},
  ref:['rivalry','suppliers'],refWhy:'Intel fights AMD, Arm designers, Nvidia and TSMC on every front while depending on ASML, TSMC and scarce supply to ship what customers want.',
  lead:{line:'Leadership says it is rebuilding the balance sheet and execution, proving 18A with internal volume to win outside customers for 14A, and pairing CPUs with GPUs and custom chips for AI.',src:'https://download.intel.com/newsroom/2026/earnings/Intel-Q22026-Earnings-Call.pdf',posture:'reinvent'},
  pl:{cost:'Squeeze fab and packaging costs, but TSMC’s scale makes undercutting it very hard.',
      differentiate:'Win on x86 compatibility, advanced packaging and tightly paired CPU, GPU and custom-chip systems for AI.',
      focus:'Retreat to core client and server CPUs on mature in-house nodes, and pause 14A if no big outside customer signs.',
      reinvent:'Become a trusted leading-edge foundry for outside designers while also supplying AI systems. Costly, and it hinges on landing 14A customers.'}},
 ba:{
  forces:{
   rivalry:{p:2,line:'Airbus and Chinese makers challenge in jets and Lockheed, Northrop, RTX and SpaceX in defense, but a backlog near twelve years of output softens price fights.',src:'https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm'},
   buyers:{p:2,line:'A 6,200-plane backlog gives Boeing leverage, but delays let airlines claim compensation or cancel, and fixed-price defense contracts have cost billions.',src:'https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm'},
   suppliers:{p:3,line:'Many parts are sole-sourced and slow to requalify; engine delays hold up 787 output and Boeing bought Spirit to regain control.',src:'https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm'},
   entrants:{p:1,line:'Certification hurdles keep new jet makers out; China’s COMAC delivered only eight aircraft in the first half of 2026.',src:'https://aircargoweek.com/?p=110037'},
   substitutes:{p:1,line:'The 10-K names no substitute threat; fuel prices and environmental rules sway demand more than any alternative to flying.',src:'https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm'}},
  ref:['suppliers','buyers'],refWhy:'A sold-out order book makes rivalry mild, so profit is squeezed by parts and engine bottlenecks and by customers’ delay remedies and fixed-price government terms.',
  lead:{line:'Leadership says it will stabilize around safety and quality, ramp 737 and 787 output step by step, turn cash flow positive, stop signing loss-making fixed-price deals, sell Jeppesen and take Spirit back in.',src:'https://leehamnews.com/2026/07/28/boeing-losses-narrow-cash-flow-positive/',posture:'focus'},
  pl:{cost:'Squeeze the 737 and 787 lines and suppliers for lower unit costs. Risky for a company whose past cost-cutting is blamed for quality crises.',
      differentiate:'Win on proven safety, quality and delivery reliability plus the widebody range, so airlines pay for dependability.',
      focus:'Concentrate on core jets, chosen defense programs and services, sell non-core units and walk away from loss-making bids.',
      reinvent:'Build a new-generation airplane or rebuild the engineering culture. Years of heavy spending while cash flow is just recovering.'}},
 unh:{
  forces:{
   rivalry:{p:2,line:'Rivals range from startups to giant insurers; Medicare Advantage enrollment fell to about 7.6M from 8.4M, though margins are recovering.',src:'https://www.sec.gov/Archives/edgar/data/0000731766/000073176626000255/earningsrelease3q26unh.htm'},
   buyers:{p:3,line:'Medicare premiums from CMS are about 44% of revenue and the government sets rates, while employers and states hold the contracts.',src:'https://www.sec.gov/Archives/edgar/data/731766/000073176626000062/unh-20251231.htm'},
   suppliers:{p:3,line:'Hospitals, physician groups and drug makers hold leverage: cost trend ran above plan and out-of-network awards can far exceed Medicare rates.',src:'https://www.webull.com/news/15741091905627136'},
   entrants:{p:1,line:'Heavy regulation and scale protect it; the 10-K flags provider-run groups and tech entrants as possible disruptors.',src:'https://www.sec.gov/Archives/edgar/data/731766/000073176626000062/unh-20251231.htm'},
   substitutes:{p:2,line:'Traditional Medicare and provider-run care groups can replace Medicare Advantage plans, though over half of eligible seniors still choose Advantage.',src:'https://www.webull.com/news/15741091905627136'}},
  ref:['buyers','suppliers'],refWhy:'Premiums are set by government and employer buyers while medical costs are set largely by providers and drug makers, squeezing the margin between them.',
  lead:{line:'Leadership says it is repairing margins through discipline and simpler operations, exiting weak markets, cutting prior authorizations, shifting toward integrated value-based care and building AI tools.',src:'https://www.webull.com/news/15741091905627136',posture:'focus'},
  pl:{cost:'Use Optum’s scale, AI claims automation and employed physicians to run lower administrative and medical costs than any rival insurer.',
      differentiate:'Win on integrated Optum care, higher Medicare quality ratings and pharmacy transparency, so members and employers pay for a better-run experience.',
      focus:'Concentrate on profitable niches such as special-needs Medicare plans and national employer accounts, and exit markets where margins lag.',
      reinvent:'Rebuild how the company pays, authorizes and delivers care with AI, fewer prior authorizations and value-based contracts.'}},
 nke:{
  forces:{
   rivalry:{p:3,line:'Adidas, New Balance, On, Deckers, Anta, Li Ning and lululemon contest the same shoppers on innovation, style and athlete ties.',src:'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'},
   buyers:{p:3,line:'Retailers can cancel orders placed months ahead, and the top three U.S. accounts make about 29% of U.S. sales.',src:'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'},
   suppliers:{p:2,line:'Contractors make nearly all product: four factories produce about 60% of footwear, Vietnam about 52%, and tariffs have lifted costs.',src:'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'},
   entrants:{p:2,line:'Nike says startup barriers in footwear and apparel are low and newer brands can react faster to trends.',src:'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'},
   substitutes:{p:1,line:'The filing warns tastes could drift away from athletic goods, but it shows no concrete substitute taking share today.',src:'https://www.sec.gov/Archives/edgar/data/0000320187/000032018726000088/nke-20260531.htm'}},
  ref:['rivalry','buyers'],refWhy:'Nike’s weak spots are where rivals and retail partners meet it: Sportswear is down and partners are clearing aged shoes, forcing tighter orders and discounts.',
  lead:{line:'Leadership says it is rebuilding around specific sports to win back performance credibility first, with a multiyear cost and supply-chain program funding the turnaround.',src:'https://www.benzinga.com/news/26/10/62124853',posture:'differentiate'},
  pl:{cost:'Use sourcing scale and savings to undercut rivals and retail discounts, risking the premium image just when pricing power is needed.',
      differentiate:'Bet on performance innovation, athlete ties and scarcity in key sports, so shoppers pay up over On, New Balance or adidas.',
      focus:'Narrow to a few sports and segments such as running, basketball and football, and shrink lifestyle lines.',
      reinvent:'Rewrite how Nike operates: fewer regions, a flexible supply chain, and a reset of China and direct-to-consumer.'}},
 khc:{
  forces:{
   rivalry:{p:3,line:'National food giants, regional players and retailer private labels fight on price, promotion and innovation.',src:'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm'},
   buyers:{p:3,line:'Walmart alone is about 21% of sales and the top five North America customers make about 46% of segment sales.',src:'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm'},
   suppliers:{p:2,line:'It buys huge volumes of dairy, meat, coffee, sweeteners and packaging at volatile, partly hedged prices.',src:'https://www.marketbeat.com/instant-alerts/kraft-heinz-q2-earnings-call-highlights-2026-08-05/'},
   entrants:{p:1,line:'The 10-K treats new entrants as a minor risk; shelf space and scale distribution do most of the blocking.',src:'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm'},
   substitutes:{p:2,line:'Weight-loss drugs, ingredient worries and health trends could pull shoppers toward fresher or store-brand options; the 10-K flags it without a number.',src:'https://www.sec.gov/Archives/edgar/data/1637459/000163745926000009/khc-20251227.htm'}},
  ref:['buyers','rivalry'],refWhy:'A few big retailers and a crowded field of brand and store-brand rivals cap pricing and force promotions, and volume fell even as price rose.',
  lead:{line:'Leadership says it is spending more, about $700M extra in 2026 mostly on marketing and innovation, to rebuild its brands and return to volume-led growth after pausing the planned split.',src:'https://businesswire.com/news/home/20260805074009/en/Kraft-Heinz-Reports-Second-Quarter-2026-Results-Updates-2026-Full-Year-Outlook',posture:'differentiate'},
  pl:{cost:'Use scale in sourcing, plants and logistics to cut prices against Walmart and private label, squeezing margins already under input inflation.',
      differentiate:'Fund Heinz, Kraft, Philadelphia, Oscar Mayer and Capri Sun with more marketing and innovation so shoppers pay a premium.',
      focus:'Concentrate on a few winning platforms and prune or sell weaker areas like meats.',
      reinvent:'Revive the paused split or remake the portfolio into healthier, protein-forward and beverage categories.'}}
};
for(const k in _SD)CO[k].strategy=_SD[k];

/* ---------- game lifecycle ---------- */
function newGame(coId,diffKey,seed,strategy){
  const co=CO[coId],D=DIFF[diffKey];
  const st=initState(co);
  const mine=(strategy&&co.strategy&&validStrategy(strategy))?{top:strategy.top.slice(),posture:strategy.posture}:null;
  const ghostS=mine?{top:co.strategy.ref.slice(),posture:co.strategy.lead.posture}:null;
  return {v:2,strategy:mine,ghostStrategy:ghostS,coId,diffKey,seed:String(seed),q:0,st,ghost:clone(st),plan:makePlan(co,D,String(seed)),log:[],rewinds:D.rewinds,boardLow:0,status:'play',firedAt:null,snap:null,cab:newCabinet(String(seed)),call:null};
}
function commitQuarter(game,ch,quality){
  const D=DIFF[game.diffKey];
  game.snap=clone({q:game.q,st:game.st,ghost:game.ghost,log:game.log,boardLow:game.boardLow,status:game.status,firedAt:game.firedAt,cab:game.cab,call:null});
  const co=CO[game.coId];
  const jobs=st=>sum(Object.keys(ch.cards).map(cid=>CARD[cid].opts[ch.cards[cid]].jobs||0));
  const rec=step(game,'st',ch,{});
  game.st.jobsCut+=jobs()*(co.workforce||0);
  const gch=ghostChoices(game,game.q);
  step(game,'ghost',gch,{});
  game.ghost.jobsCut+=sum(Object.keys(gch.cards).map(cid=>CARD[cid].opts[gch.cards[cid]].jobs||0))*(co.workforce||0);
  const cabEv=cabUpdate(game,ch);
  game.log.push({q:game.q,ch,gch,quality,outs:rec.outs,cab:cabEv,fits:rec.fits,hedged:rec.hedged});
  if(D.fire&&game.q>=2){
    if(game.st.meters.brd<D.fire.below)game.boardLow++;else game.boardLow=0;
    if(game.boardLow>=D.fire.streak){game.status='fired';game.firedAt=game.q}
  }
  game.q++;
  if(game.status==='play'&&game.q>=D.quarters)game.status='done';
  game.call=game.status==='fired'?null:{qs:makeCall(game,'st'),done:false};
  const gq=makeCall(game,'ghost');applyCall(game,'ghost',gq,gq.map(x=>x.bad?'candid':'confident'));
  return rec;
}
function rewind(game){
  if(!game.snap||game.rewinds<=0)return false;
  Object.assign(game,clone(game.snap));game.snap=null;game.rewinds--;return true;
}
/* replay the player's choices with no noise: what the choices were worth without luck */
function replayExpected(game){
  const g=newGame(game.coId,game.diffKey,game.seed);
  for(const l of game.log){g.q=l.q;step(g,'st',l.ch,{noise:false})}
  return g.st;
}

/* ---------- scoring ---------- */
function scorecard(st,co){
  const lev=leverage(st,co);
  const s={
    value:clamp(50+(st.idx-100)*0.8,0,100),
    balance:clamp(100-Math.max(lev,0)*14-(st.cash<minCash(st,co)*1.2?10:0),0,100),
    customers:st.meters.cus,
    people:(st.meters.emp+st.meters.exe)/2,
    trust:(st.meters.reg+st.meters.brd+st.meters.inv)/3
  };
  s.overall=0.35*s.value+0.2*s.balance+0.15*s.customers+0.15*s.people+0.15*s.trust;
  return s;
}
function grade(avg){return avg>=2.5?'A':avg>=2.1?'B':avg>=1.6?'C':avg>=1.1?'D':'F'}
function processScore(game){
  const xs=[];
  for(const l of game.log){if(l.call)xs.push(l.call.quality);for(const k in l.quality.cards)xs.push(l.quality.cards[k]);xs.push((l.quality.reinvest+l.quality.ret+l.quality.debt)/3);xs.push(l.quality.guide)}
  return xs.length?sum(xs)/xs.length:0;
}

/* ---------- formatting ---------- */
function fmtB(v){const a=Math.abs(v),s=v<0?'−':'';return s+'$'+(a>=100?a.toFixed(0):a>=10?a.toFixed(1):a.toFixed(2))+'B'}
function fmtPct(v,d){d=d==null?1:d;return (v<0?'−':v>0?'+':'')+Math.abs(v).toFixed(d)+'%'}
function qLabel(q){const qq=((q+3)%4)+1,y=2026+Math.floor((q+3)/4);return 'Q'+qq+' '+y}
function qMonths(q){return ['Jan–Mar','Apr–Jun','Jul–Sep','Oct–Dec'][((q+3)%4)]}

if(typeof module!=='undefined'&&module.exports)module.exports={setStrategy,FORCES,POSTURES,EVENT_FORCE,FIT_TAG,fitOf,validStrategy,strategySummary,contextFor,ctxQ,ctxRaw,ctxGrades,makeCall,applyCall,comingDue,roleOf,TONES,ttm,minCash,CO,GENERIC,EVENTS,CARD,EV,DIFF,newGame,commitQuarter,step,assess,ghostChoices,replayExpected,scorecard,processScore,grade,rewind,allocMenu,leverage,fmtB};
