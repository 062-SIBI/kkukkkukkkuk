/* KKUK_IOS_DEMO
   깃허브 액션의 아이폰 시뮬레이터 확인에서만 쓴다(patch-ios.js pre demo). 출시용 앱에는 들어가지 않는다.
   하는 일: 가짜 기록을 넣고(누구의 동네도 아닌 서울광장 둘레) 화면을 차례로 넘긴다. 그동안 액션이 화면을 3초마다 찍는다.
   사용 통계는 꺼 둔다(시험이 통계에 섞이지 않게).
   진단(11/11): 첫 실행에서 산책을 끝낸 직후 화면이 다시 불러와지는 일이 있었다. 원인을 가르려고
   - 몇 번째로 불러왔는지, 단계, 오류, 지도와 카메라 상태를 저장소에 이어 적고 화면 위쪽과 콘솔에 보인다
   - 불러올 때마다 순서를 바꾼다: 1 전체, 2 지도 안 엶, 3 카메라 막음, 4 지도를 오래 열어 둠, 5부터 가만히 둠 */
(function(){
  var now=Date.now(), D=864e5, M=6e4, C=[37.5663,126.9779];
  function loop(n,r,ph){ var p=[]; for(var i=0;i<=n;i++){ var t=i/n*2*Math.PI+ph; p.push([+(C[0]+r*Math.sin(t)).toFixed(6), +(C[1]+r*1.25*Math.cos(t)).toFixed(6)]); } return p; }
  function walk(ago,h,mins,dist,pee,poop,sniff,gauge,pts){
    var d=new Date(now-ago*D); d.setHours(h,10,0,0); var s=d.getTime(); if(s+mins*M>now-10*M) s-=D;
    var P=pts?loop(120,0.0016,ago):[];
    function at(i,n){ var k=P.length?P[Math.floor((i+1)/(n+1)*P.length)]:[null,null]; return {t:Math.round(s+(i+1)*mins*M/(n+1)),lat:k[0],lng:k[1]}; }
    var w={start:s,end:s+mins*M,dist:dist,sniff:sniff*40000,pts:P,poops:[],kkuks:[],sniffs:[],newSpot:false,taps:3,route:null,gauge:gauge,
           slot:(h>=4&&h<11)?"morning":(h<17?"day":"evening")};
    var i,q; for(i=0;i<pee;i++)w.kkuks.push(at(i,pee));
    for(i=0;i<poop;i++){ q=at(i,poop); q.f=3; q.col=true; w.poops.push(q); }
    for(i=0;i<sniff;i++)w.sniffs.push(at(i,sniff));
    return w;
  }
  var walks=[], d;
  for(d=0;d<8;d++){ walks.push(walk(d,7,32+d%3*4,1500+d*90,4+d%3,d%2,3,80+d%4*4,d<3)); if(d>0)walks.push(walk(d,19,28,1300+d*60,3,1,2,76+d%5*3,false)); }
  walks.sort(function(a,b){return b.start-a.start;});
  var S={ver:3,user:{via:"demo",at:now-9*D},dog:{ava:"🐕",name:"혜준이",kg:13.5,age:5,potty:"out"},walks:walks,spots:[],routes:[],live:null,
         locOK:1,pkHint:1,priv:{v:3,at:0,ok:1},statsOff:1};
  try{ localStorage.setItem("kkuk.statsOff","1"); localStorage.setItem("kkuk.v3",JSON.stringify(S)); }catch(e){}

  /* ── 진단 기록 ── */
  var SCH="l"; try{ if(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches)SCH="d"; }catch(e){}
  var LK="kk.demo.log", NK="kk.demo.n."+SCH, LOG=[], N=1, RVM="?";
  try{ LOG=JSON.parse(localStorage.getItem(LK)||"[]"); }catch(e){ LOG=[]; }
  try{ N=(+localStorage.getItem(NK)||0)+1; localStorage.setItem(NK,String(N)); }catch(e){}
  try{ RVM=String(sessionStorage.getItem("kk.rvm")); }catch(e){}
  function paint(){
    if(!document.body)return; var d=document.getElementById("kk-demo-log");
    if(!d){ d=document.createElement("pre"); d.id="kk-demo-log";
      d.style.cssText="position:fixed;left:0;right:0;top:54px;z-index:2147483647;margin:0;padding:3px 6px;font:8px/1.2 Menlo,monospace;background:rgba(0,0,0,.66);color:#aef5a0;white-space:pre-wrap;word-break:break-all;pointer-events:none";
      document.body.appendChild(d); }
    d.textContent=LOG.slice(-10).join("\n");
  }
  function lg(s){
    var t=new Date(), line=("0"+t.getMinutes()).slice(-2)+":"+("0"+t.getSeconds()).slice(-2)+" "+s;
    LOG.push(line); if(LOG.length>80)LOG=LOG.slice(-80);
    try{ localStorage.setItem(LK,JSON.stringify(LOG)); }catch(e){}
    try{ console.log("[demo] "+line); }catch(e){}
    paint();
  }
  lg("LOAD "+SCH+"#"+N+" rvm="+RVM+" rv="+localStorage.getItem("kkuk.v3.rv")+" vis="+document.visibilityState+" on="+navigator.onLine);
  window.addEventListener("error",function(e){ lg("ERR "+String(e.message).slice(0,90)+" @"+(e.lineno||0)); });
  window.addEventListener("unhandledrejection",function(e){ var r=e.reason; lg("REJ "+String((r&&r.message)||r).slice(0,90)); });
  window.addEventListener("pagehide",function(){ lg("pagehide"); });
  document.addEventListener("visibilitychange",function(){ lg("vis="+document.visibilityState); });
  try{ var OW=window.Worker; if(OW){ var NW=function(u,o){ lg("Worker "+String(u).slice(-34)+" "+((o&&o.type)||""));
      var w=new OW(u,o); w.addEventListener("error",function(e){ lg("WorkerERR "+String(e.message||e.type).slice(0,70)); }); return w; };
    NW.prototype=OW.prototype; window.Worker=NW; } }catch(e){}
  try{ var OF=window.fetch, FN=0; if(OF){ window.fetch=function(u,o){ var s=String((u&&u.url)||u), hit=s.indexOf("openfreemap")>=0&&FN<4; if(hit)FN++;
      var p=OF.apply(this,arguments); if(hit){ var t0=Date.now(); p.then(function(r){ lg("fetch "+s.slice(-26)+" "+r.status+" "+(Date.now()-t0)+"ms"); },function(e){ lg("fetchERR "+s.slice(-26)+" "+String(e&&e.message).slice(0,40)); }); }
      return p; }; } }catch(e){}
  try{ var gc=document.createElement("canvas"), g=gc.getContext("webgl2")||gc.getContext("webgl"), gx=g&&g.getExtension("WEBGL_debug_renderer_info");
    lg("gl="+(g?(gx?String(g.getParameter(gx.UNMASKED_RENDERER_WEBGL)).slice(0,60):"ok"):"none"));
    var lc=g&&g.getExtension("WEBGL_lose_context"); if(lc)lc.loseContext(); }catch(e){ lg("gl err"); }

  function q(s){ return document.querySelector(s); }
  function click(s){ var e=q(s); if(e){ try{e.click();}catch(x){} } return !!e; }
  function hold(s,ms){ var e=q(s); if(!e)return; try{ e.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})); setTimeout(function(){ e.dispatchEvent(new PointerEvent("pointerup",{bubbles:true})); },ms); }catch(x){} }
  function feed(n){ var k=window.__kk; if(!k||!k.W||!k.gpsFix)return; var P=loop(200,0.0015,0.4), t=k.W.start+3000;
    for(var i=0;i<n;i++){ try{ k.gpsFix({lat:P[i][0],lng:P[i][1],t:t+i*4000,acc:6,spd:1.15}); }catch(x){} } }
  function mapSt(tag,which){
    var s="none"; try{ var k=window.__kk&&window.__kk.KM, M=k&&k[which||"L"];
      if(M){ s=M.mode; if(M.map){ s+=" loaded="+M.map.loaded()+" tiles="+(M.map.areTilesLoaded?M.map.areTilesLoaded():"?")+" z="+M.map.getZoom().toFixed(1); }
        if(M.err)s+=" err="+M.err+" "+String(M.errMsg).slice(0,70); }
      s+=" lib="+((k&&k.lib&&k.lib.lib)?"y":"n"); }catch(e){ s="x "+String(e&&e.message).slice(0,40); }
    lg(tag+" map"+(which||"L")+"="+s);
  }
  function camSt(tag){
    var s="?"; try{ var v=document.getElementById("pw-video"), on=document.getElementById("pwc").classList.contains("on");
      s="pwc="+on+" video="+(v?(v.readyState+"/"+v.videoWidth+"x"+v.videoHeight+(v.srcObject?"/stream":"/nostream")):"none"); }catch(e){}
    lg(tag+" "+s);
  }
  function noCam(){ try{ if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=function(){ var e=new Error("demo"); e.name="NotFoundError"; return Promise.reject(e); }; lg("camera blocked"); }catch(e){ lg("camera block failed"); } }
  function st(ms,name,fn){ return [ms,function(){ lg(name); fn(); }]; }
  function next(ms){ return [ms,function(){ lg("END v"+N+" reload"); try{ location.reload(); }catch(e){} }]; }
  function startAt(ms){ return [st(ms,"start",function(){ click("#start"); }), st(ms+2000,"feed pee sniff",function(){ feed(60); click("#b-pee"); click("#b-sniff"); })]; }
  function stopAt(ms){ return [st(ms,"stop hold",function(){ click('#wseg [data-v="g"]'); hold("#stop",1800); }),
    [ms+3000,function(){ camSt("stop+3s"); }], [ms+5000,function(){ camSt("stop+5s"); }], [ms+8000,function(){ camSt("stop+8s"); }],
    st(ms+11000,"pwc close",function(){ click("#pwc-close"); })]; }
  function tourAt(ms){ return [st(ms,"log tab",function(){ click('#tabs button[data-v="log"]'); click('#logtab [data-v="walk"]'); }),
    st(ms+4000,"walk detail",function(){ click("#walklist [data-wid]"); }), [ms+12000,function(){ mapSt("detail+8s","W"); }],
    st(ms+13000,"dong map",function(){ click("#w-close"); click('#logtab [data-v="poop"]'); }), [ms+21000,function(){ mapSt("dong+8s","A"); }],
    st(ms+22000,"party",function(){ click('#tabs button[data-v="party"]'); }), st(ms+26000,"home",function(){ click('#tabs button[data-v="home"]'); })]; }
  var T=[], V=N>5?5:N;
  if(V===1){          // 전체: 산책, 지도, 끝내기(카메라), 기록
    T=T.concat(startAt(9000),[st(17000,"map tab",function(){ click('#wseg [data-v="m"]'); }),[22000,function(){ mapSt("map+5s"); }]],stopAt(25000),tourAt(38000),[next(66000)]);
  } else if(V===2){   // 지도를 열지 않고 끝내기(카메라)
    T=T.concat(startAt(9000),stopAt(20000),[next(36000)]);
  } else if(V===3){   // 지도는 열고 카메라는 막고 끝내기
    T=T.concat(startAt(9000),[st(15000,"map tab",function(){ click('#wseg [data-v="m"]'); }),[19000,function(){ noCam(); }]],stopAt(20000),[next(36000)]);
  } else if(V===4){   // 지도를 40초 열어 두고 조각이 오는지 본다. 그다음 카메라 없이 끝내고 한 바퀴
    T=T.concat(startAt(9000),[st(13000,"map tab",function(){ click('#wseg [data-v="m"]'); })]);
    [18000,23000,28000,33000,38000,43000,48000,53000].forEach(function(ms){ T.push([ms,function(){ mapSt("map+"+Math.round((ms-13000)/1000)+"s"); }]); });
    T=T.concat([[54000,function(){ noCam(); }]],stopAt(55000),tourAt(68000),[next(98000)]);
  } else {            // 가만히 둔다(저절로 다시 불러와지는지)
    [15000,30000,45000,60000,75000,90000].forEach(function(ms){ T.push([ms,function(){ lg("idle "+Math.round(ms/1000)+"s"); }]); });
  }
  window.addEventListener("load",function(){ lg("load event v"+V); T.forEach(function(s){ setTimeout(function(){ try{s[1]();}catch(e){ lg("stepERR "+String(e&&e.message).slice(0,60)); } },s[0]); }); });
})();
