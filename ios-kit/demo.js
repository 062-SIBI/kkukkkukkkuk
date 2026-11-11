/* KKUK_IOS_DEMO
   깃허브 액션의 아이폰 시뮬레이터 확인에서만 쓴다(patch-ios.js pre demo). 출시용 앱에는 들어가지 않는다.
   하는 일: 가짜 기록을 넣고(누구의 동네도 아닌 서울광장 둘레) 화면을 차례로 넘긴다. 그동안 액션이 화면을 3초마다 찍는다.
   사용 통계는 꺼 둔다(시험이 통계에 섞이지 않게). */
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

  function q(s){ return document.querySelector(s); }
  function click(s){ var e=q(s); if(e){ try{e.click();}catch(x){} } return !!e; }
  function hold(s,ms){ var e=q(s); if(!e)return; try{ e.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})); setTimeout(function(){ e.dispatchEvent(new PointerEvent("pointerup",{bubbles:true})); },ms); }catch(x){} }
  function feed(n){ var k=window.__kk; if(!k||!k.W||!k.gpsFix)return; var P=loop(200,0.0015,0.4), t=k.W.start+3000;
    for(var i=0;i<n;i++){ try{ k.gpsFix({lat:P[i][0],lng:P[i][1],t:t+i*4000,acc:6,spd:1.15}); }catch(x){} } }
  var T=[
    [9000,function(){ click("#start"); }],                                        // 산책 화면
    [11000,function(){ feed(60); click("#b-pee"); click("#b-sniff"); }],
    [17000,function(){ click('#wseg [data-v="m"]'); }],                           // 산책 중 지도
    [25000,function(){ click('#wseg [data-v="g"]'); hold("#stop",1800); }],       // 끝내기 → 기록 카드
    [34000,function(){ click("#pwc-close"); }],
    [36000,function(){ click('#tabs button[data-v="log"]'); click('#logtab [data-v="walk"]'); }],   // 기록 탭
    [41000,function(){ click("#walklist [data-wid]"); }],                         // 산책 상세(지도)
    [50000,function(){ click("#w-close"); click('#logtab [data-v="poop"]'); }],   // 동네 지도
    [58000,function(){ click('#tabs button[data-v="party"]'); }],
    [62000,function(){ click('#tabs button[data-v="home"]'); }]
  ];
  window.addEventListener("load",function(){ T.forEach(function(s){ setTimeout(function(){ try{s[1]();}catch(e){} },s[0]); }); });
})();
