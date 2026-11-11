/* KKUK_IOS_DEMO
   깃허브 액션의 아이폰 시뮬레이터 확인에서만 쓴다(patch-ios.js pre demo). 출시용 앱에는 들어가지 않는다.
   하는 일: 가짜 기록을 넣고(누구의 동네도 아닌 서울광장 둘레) 화면을 차례로 넘긴다. 그동안 액션이 화면을 3초마다 찍는다.
   사용 통계는 꺼 둔다(시험이 통계에 섞이지 않게).
   시뮬레이터에서는 WebGL을 꺼서 지도를 '지도 없는 그림'(앱의 flat 그림)으로 그리게 한다. 까닭(11/11 진단, PR #6 실행 #7):
   깃허브 맥(가상 머신)의 시뮬레이터에서 MapLibre가 그리기 시작하면 2초쯤 뒤 시뮬레이터의 그래픽 중계 프로그램(SimMetalHost)이 죽고,
   그 연결이 끊긴 웹킷 그래픽 프로세스가 멈춰 웹 화면이 다시 불러와졌다. 지도 파일을 앱 안에서 쓰든 CDN에서 받든, 화소 비율이 1이든 3이든 같았고
   지도 없는 WebGL은 같은 크기에서 멀쩡했다. SimMetalHost는 시뮬레이터에만 있다. 진짜 지도 화면은 실제 아이폰(테스트플라이트)에서 본다. */
(function(){
  try{ var GC=HTMLCanvasElement.prototype.getContext; HTMLCanvasElement.prototype.getContext=function(t){ if(/webgl/i.test(String(t)))return null; return GC.apply(this,arguments); }; }catch(e){}
  function lg(s){ try{ var t=new Date(); console.log("[demo] "+("0"+t.getMinutes()).slice(-2)+":"+("0"+t.getSeconds()).slice(-2)+" "+s); }catch(e){} }
  lg("LOAD vis="+document.visibilityState);
  window.addEventListener("error",function(e){ lg("ERR "+String(e.message).slice(0,90)+" @"+(e.lineno||0)); });
  window.addEventListener("unhandledrejection",function(e){ var r=e.reason; lg("REJ "+String((r&&r.message)||r).slice(0,90)); });
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

  function q(s){ return document.querySelector(s); }
  function click(s){ var e=q(s); if(e){ try{e.click();}catch(x){} } return !!e; }
  function hold(s,ms){ var e=q(s); if(!e)return; try{ e.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})); setTimeout(function(){ e.dispatchEvent(new PointerEvent("pointerup",{bubbles:true})); },ms); }catch(x){} }
  function feed(n){ var k=window.__kk; if(!k||!k.W||!k.gpsFix)return; var P=loop(200,0.0015,0.4), t=k.W.start+3000;
    for(var i=0;i<n;i++){ try{ k.gpsFix({lat:P[i][0],lng:P[i][1],t:t+i*4000,acc:6,spd:1.15}); }catch(x){} } }
  function mapMode(which){ try{ var m=window.__kk.KM[which]; return m?m.mode:"none"; }catch(e){ return "x"; } }
  var T=[
    [9000,"start",function(){ click("#start"); }],                                        // 산책 화면
    [11000,"feed pee sniff",function(){ feed(60); click("#b-pee"); click("#b-sniff"); }],
    [17000,"map tab",function(){ click('#wseg [data-v="m"]'); }],                         // 산책 중 지도(시뮬레이터에서는 지도 없는 그림)
    [23000,"map mode",function(){ lg("mapL="+mapMode("L")); }],
    [25000,"stop hold",function(){ click('#wseg [data-v="g"]'); hold("#stop",1800); }],   // 끝내기 → 기록 카드
    [34000,"pwc close",function(){ click("#pwc-close"); }],
    [36000,"log tab",function(){ click('#tabs button[data-v="log"]'); click('#logtab [data-v="walk"]'); }],   // 기록 탭
    [41000,"walk detail",function(){ click("#walklist [data-wid]"); }],                   // 산책 상세
    [50000,"dong map",function(){ click("#w-close"); click('#logtab [data-v="poop"]'); }],   // 동네 지도
    [58000,"party",function(){ click('#tabs button[data-v="party"]'); }],
    [62000,"home",function(){ click('#tabs button[data-v="home"]'); }]
  ];
  window.addEventListener("load",function(){ lg("load event"); T.forEach(function(s){ setTimeout(function(){ lg(s[1]); try{s[2]();}catch(e){ lg("stepERR "+String(e&&e.message).slice(0,60)); } },s[0]); }); });
})();
