/* KKUK_IOS_DEMO
   깃허브 액션의 아이폰 시뮬레이터 확인에서만 쓴다(patch-ios.js pre demo). 출시용 앱에는 들어가지 않는다.
   하는 일: 가짜 기록을 넣고(누구의 동네도 아닌 서울광장 둘레) 화면을 차례로 넘긴다. 그동안 액션이 화면을 찍는다.
   사용 통계는 꺼 둔다(시험이 통계에 섞이지 않게).
   진단 3판(11/11): 시뮬레이터에서 지도를 열면 화면이 15~30초씩 멈추고 한 번은 웹 화면이 다시 불러와졌다.
   카메라와 기록 카드는 지도 없이 돌리면 정상이었다. 그래서 이번에는 그래픽(WebGL) 쪽만 가른다.
   액션이 시뮬레이터를 껐다 켜며 앱을 네 번 켠다. 켤 때마다 순서가 하나씩 넘어간다(액션이 앱 안에 적는 kkv.txt로, 없으면 불러온 횟수로).
   - 1: 지도 없이 화면 크기 그대로 WebGL만 90장 그려 본다(시뮬레이터 그래픽이 버티는지)
   - 2: 앱 안 지도 파일과 일꾼, 화소 비율 1로 지도를 50초 열어 둔다
   - 3: 앱 안 지도 파일과 일꾼, 화소 비율 그대로(3)
   - 4: 지금 앱이 하는 대로(CDN 지도 파일, 일꾼은 blob), 화소 비율 그대로
   - 5부터: 가만히 둔다
   지도가 실제로 그려졌는지는 그린 화면의 가로 한 줄과 세로 한 줄을 읽어 색 가짓수로 적는다. */
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
  /* 작은 WebGL 확인: 만들기, 지우기, 한 점 읽기에 걸린 시간과 읽은 색(51,102,153이 나와야 정상) */
  function glProbe(tag,w,h){
    var t0=Date.now(), s="";
    try{
      var c=document.createElement("canvas"); c.width=w; c.height=h;
      var gl=c.getContext("webgl2")||c.getContext("webgl"), t1=Date.now();
      if(!gl){ lg("probe "+tag+" none "+(t1-t0)+"ms"); return; }
      var ex=gl.getExtension("WEBGL_debug_renderer_info"), rn=ex?String(gl.getParameter(ex.UNMASKED_RENDERER_WEBGL)).slice(0,24):"noext";
      gl.viewport(0,0,w,h); gl.clearColor(0.2,0.4,0.6,1); gl.clear(gl.COLOR_BUFFER_BIT);
      var px=new Uint8Array(4); gl.readPixels(w>>1,h>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); var t2=Date.now();
      s="ctx="+(t1-t0)+"ms draw="+(t2-t1)+"ms px="+px[0]+","+px[1]+","+px[2]+" buf="+gl.drawingBufferWidth+"x"+gl.drawingBufferHeight+" lost="+gl.isContextLost()+" r="+rn;
      var lc=gl.getExtension("WEBGL_lose_context"); if(lc)lc.loseContext();
    }catch(e){ s="ERR "+String(e&&e.message).slice(0,50); }
    lg("probe "+tag+" "+w+"x"+h+" "+s);
  }
  glProbe("p0",64,64);
  /* 화면이 멈춘 시간 재기: 0.5초마다 도는 시계가 3초 넘게 밀리면 적는다 */
  (function(){ var last=Date.now(); setInterval(function(){ var n=Date.now(), g=n-last; last=n; if(g>3000)lg("STALL "+g+"ms"); },500); })();

  function q(s){ return document.querySelector(s); }
  function click(s){ var e=q(s); if(e){ try{e.click();}catch(x){} } return !!e; }
  function hold(s,ms){ var e=q(s); if(!e)return; try{ e.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})); setTimeout(function(){ e.dispatchEvent(new PointerEvent("pointerup",{bubbles:true})); },ms); }catch(x){} }
  function feed(n){ var k=window.__kk; if(!k||!k.W||!k.gpsFix)return; var P=loop(200,0.0015,0.4), t=k.W.start+3000;
    for(var i=0;i<n;i++){ try{ k.gpsFix({lat:P[i][0],lng:P[i][1],t:t+i*4000,acc:6,spd:1.15}); }catch(x){} } }
  function mapSt(tag,which){
    var s="none"; try{ var k=window.__kk&&window.__kk.KM, M=k&&k[which||"L"];
      if(M){ s=M.mode; if(M.map){ var mp=M.map; function tr(f){ try{ return String(f()); }catch(e){ return "x"; } }
          s+=" loaded="+tr(function(){return mp.loaded();})+" style="+tr(function(){return mp.isStyleLoaded();})+" tiles="+tr(function(){return mp.areTilesLoaded();})+" z="+tr(function(){return mp.getZoom().toFixed(1);}); }
        if(M.err)s+=" err="+M.err+" "+String(M.errMsg).slice(0,70); }
      var lib=k&&k.lib&&k.lib.lib; s+=" lib="+(lib?"y":"n"); }catch(e){ s="x "+String(e&&e.message).slice(0,40); }
    lg(tag+" map"+(which||"L")+"="+s);
    HOOKS.forEach(function(f){ try{ f("t"); }catch(e){} });
  }
  function camSt(tag){
    var s="?"; try{ var v=document.getElementById("pw-video"), on=document.getElementById("pwc").classList.contains("on");
      s="pwc="+on+" video="+(v?(v.readyState+"/"+v.videoWidth+"x"+v.videoHeight+(v.srcObject?"/stream":"/nostream")):"none"); }catch(e){}
    lg(tag+" "+s);
  }
  function noCam(){ try{ if(navigator.mediaDevices)navigator.mediaDevices.getUserMedia=function(){ var e=new Error("demo"); e.name="NotFoundError"; return Promise.reject(e); }; lg("camera blocked"); }catch(e){ lg("camera block failed"); } }
  /* 지도가 그려졌는지 적기: 지도 이벤트와, 4초에 한 번 그린 화면의 가운데 가로줄과 세로줄을 읽어 색 가짓수 */
  var HOOKS=[];
  function hook(map,id){
    var t0=Date.now(), frames=0, want="first", slow=false, idles=0;
    function el(){ return (Math.round((Date.now()-t0)/100)/10)+"s"; }
    function ask(why){ if(slow)return; want=why; try{ map.triggerRepaint(); }catch(e){} }
    HOOKS.push(ask);
    ["load","webglcontextlost","webglcontextrestored"].forEach(function(ev){ try{ map.on(ev,function(){ lg("map"+id+" "+ev+" "+el()+" frames="+frames); if(ev==="load")ask("load"); }); }catch(e){} });
    try{ map.on("idle",function(){ idles++; if(idles===1){ lg("map"+id+" idle "+el()+" frames="+frames); ask("idle"); } }); }catch(e){}
    try{ map.on("error",function(e){ lg("map"+id+" error "+String(e&&e.error&&e.error.message).slice(0,80)); }); }catch(e){}
    try{ map.on("render",function(){ frames++; if(!want||slow)return; var why=want; want="";
      try{ var c=map.getCanvas(), gl=(map.painter&&map.painter.context&&map.painter.context.gl)||c.getContext("webgl2")||c.getContext("webgl");
        var w=gl.drawingBufferWidth, h=gl.drawingBufferHeight, seen={}, cnt=0, i, t1=Date.now();
        var row=new Uint8Array(w*4); gl.readPixels(0,h>>1,w,1,gl.RGBA,gl.UNSIGNED_BYTE,row); var t2=Date.now();
        if(t2-t1>3000){ slow=true; lg("map"+id+" px read slow "+(t2-t1)+"ms, stop reading"); return; }
        var col=new Uint8Array(h*4); gl.readPixels(w>>1,0,1,h,gl.RGBA,gl.UNSIGNED_BYTE,col);
        function add(a){ for(i=0;i<a.length;i+=16){ var k=(a[i]>>3)+","+(a[i+1]>>3)+","+(a[i+2]>>3); if(!seen[k]){ seen[k]=1; cnt++; } } }
        add(row); add(col);
        lg("map"+id+" px("+why+") "+el()+" colors="+cnt+" buf="+w+"x"+h+" css="+c.clientWidth+"x"+c.clientHeight+" read="+(Date.now()-t1)+"ms frames="+frames+" lost="+gl.isContextLost());
      }catch(e){ lg("map"+id+" px ERR "+String(e&&e.message).slice(0,60)); } }); }catch(e){}
  }
  /* 지도 파일 고르기. how="local": 앱 안의 지도 파일과 일꾼. how="cdn": 지금 앱이 쓰는 CDN 지도 파일 그대로(일꾼 주소도 손대지 않음).
     pr: 화소 비율(0이면 그대로). 앱은 L.Map만 쓰므로 Map만 바꾼 꾸러미를 앱에 건넨다.
     (앱 코드는 "maplibre-gl.mjs"를 ./ 없이 불러 늘 실패하고 CDN 파일을 쓴다. 11/11에 진단하다 찾음) */
  function useLib(how,pr){ try{ var imp=new Function("u","return import(u)");
    var src=how==="local"?"./maplibre-gl.mjs":"https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl.mjs";
    imp(src).then(function(m){
      if(!(m&&m.Map)){ lg("useLib "+how+": no Map"); return; }
      var wu="(default)"; if(how==="local"&&m.setWorkerUrl){ wu=new URL("maplibre-gl-worker.mjs",location.href).href; m.setWorkerUrl(wu); }
      var Base=m.Map, n=0;
      class DemoMap extends Base { constructor(o){ var x={}, k; for(k in o)x[k]=o[k]; if(pr)x.pixelRatio=pr; super(x); hook(this,++n); } }
      try{ window.__kk.KM.lib.lib={Map:DemoMap,setWorkerUrl:m.setWorkerUrl,getWorkerUrl:m.getWorkerUrl}; }catch(e){ lg("useLib: KM.lib set failed"); return; }
      lg("useLib "+how+" pr="+(pr||"dpr "+window.devicePixelRatio)+" worker="+String(wu).slice(-34)+" origin="+location.origin);
    },function(e){ lg("useLib "+how+" import ERR "+String(e&&e.message).slice(0,70)); }); }catch(e){ lg("useLib ERR "+String(e&&e.message).slice(0,50)); } }
  /* 지도 없이 WebGL만: 화면 크기 그대로(화소 비율 포함) 반투명 여섯 겹을 90장 그린다. 512 크기 그림 16장도 올린다 */
  function glStress(){
    try{
      var dpr=Math.min(3,window.devicePixelRatio||1), W=Math.round(innerWidth*dpr), H=Math.round(innerHeight*dpr);
      var c=document.createElement("canvas"); c.width=W; c.height=H;
      c.style.cssText="position:fixed;left:0;top:0;width:100%;height:100%;z-index:2147483000;pointer-events:none;opacity:.85";
      document.body.appendChild(c);
      var gl=c.getContext("webgl2",{alpha:true,depth:true,stencil:true,antialias:false});
      if(!gl){ lg("stress: no webgl2"); return; }
      function sh(t,src){ var s=gl.createShader(t); gl.shaderSource(s,src); gl.compileShader(s); return s; }
      var p=gl.createProgram();
      gl.attachShader(p,sh(gl.VERTEX_SHADER,"#version 300 es\nin vec2 a;uniform float u;out vec2 v;void main(){v=a;gl_Position=vec4(a.x+0.02*sin(u+a.y*9.0),a.y,0.0,1.0);}"));
      gl.attachShader(p,sh(gl.FRAGMENT_SHADER,"#version 300 es\nprecision highp float;in vec2 v;uniform float u;uniform sampler2D t;out vec4 o;void main(){vec4 k=texture(t,v*3.0+u*0.05);o=vec4(0.5+0.5*sin(v.x*8.0+u),k.g,0.5+0.5*cos(v.y*6.0-u),0.35);}"));
      gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){ lg("stress: link fail "+String(gl.getProgramInfoLog(p)).slice(0,60)); return; }
      gl.useProgram(p);
      var n=48, a=[], i, j; for(i=0;i<n;i++)for(j=0;j<n;j++){ var x0=-1+2*i/n,x1=-1+2*(i+1)/n,y0=-1+2*j/n,y1=-1+2*(j+1)/n; a.push(x0,y0,x1,y0,x0,y1,x1,y0,x1,y1,x0,y1); }
      var b=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,b); gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(a),gl.STATIC_DRAW);
      var la=gl.getAttribLocation(p,"a"); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la,2,gl.FLOAT,false,0,0);
      var texs=[], d=new Uint8Array(512*512*4); for(i=0;i<d.length;i++)d[i]=(i*31+((i>>9)*17))&255;
      var tt0=Date.now();
      for(i=0;i<16;i++){ var t=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,t); gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,512,512,0,gl.RGBA,gl.UNSIGNED_BYTE,d); gl.generateMipmap(gl.TEXTURE_2D); texs.push(t); }
      var texMs=Date.now()-tt0;
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
      var uu=gl.getUniformLocation(p,"u"), F=0, MAXF=90, t0=Date.now(), last=t0, mx=0, px=new Uint8Array(4), rd=0;
      function frame(){
        try{
          gl.viewport(0,0,W,H); gl.clearColor(0.9,0.9,0.85,1); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT|gl.STENCIL_BUFFER_BIT);
          for(var k=0;k<6;k++){ gl.bindTexture(gl.TEXTURE_2D,texs[(F+k)%16]); gl.uniform1f(uu,F*0.05+k); gl.drawArrays(gl.TRIANGLES,0,n*n*6); }
          if(F%30===29){ var r0=Date.now(); gl.readPixels(W>>1,H>>1,1,1,gl.RGBA,gl.UNSIGNED_BYTE,px); rd=Math.max(rd,Date.now()-r0); }
          var now=Date.now(); mx=Math.max(mx,now-last); last=now; F++;
          if(F<MAXF&&now-t0<40000&&!gl.isContextLost())requestAnimationFrame(frame);
          else { lg("stress done frames="+F+" total="+(now-t0)+"ms maxgap="+mx+"ms read="+rd+"ms px="+px[0]+","+px[1]+","+px[2]+" buf="+gl.drawingBufferWidth+"x"+gl.drawingBufferHeight+" lost="+gl.isContextLost());
            try{ c.remove(); var lc=gl.getExtension("WEBGL_lose_context"); if(lc)lc.loseContext(); }catch(e){}
            glProbe("after-stress",64,64); }
        }catch(e){ lg("stress frame ERR "+String(e&&e.message).slice(0,60)); }
      }
      lg("stress start "+W+"x"+H+" tex16="+texMs+"ms");
      requestAnimationFrame(frame);
    }catch(e){ lg("stress ERR "+String(e&&e.message).slice(0,60)); }
  }
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
  function plan(){
  function mapRun(how,pr){   // 지도 파일을 고르고, 산책을 시작해 지도 탭을 50초 열어 둔다
    T.push([1500,function(){ useLib(how,pr); }]);
    T=T.concat(startAt(9000),[st(14000,"map tab",function(){ click('#wseg [data-v="m"]'); })]);
    [20000,26000,32000,38000,44000,50000,56000,62000].forEach(function(ms){ T.push([ms,function(){ mapSt("map+"+Math.round((ms-14000)/1000)+"s"); }]); });
    T.push([66000,function(){ glProbe("after-map",64,64); }]);
  }
  if(V===1){          // 지도 없이 WebGL만
    T.push([2000,function(){ var d=Math.min(3,window.devicePixelRatio||1); glProbe("big",Math.round(innerWidth*d),Math.round(innerHeight*d)); }]);
    T.push([5000,function(){ glStress(); }]);
    T.push([60000,function(){ glProbe("end",64,64); }]);
  } else if(V===2){   // 앱 안 지도 파일과 일꾼, 화소 비율 1
    mapRun("local",1);
  } else if(V===3){   // 앱 안 지도 파일과 일꾼, 화소 비율 그대로
    mapRun("local",0);
  } else if(V===4){   // 지금 앱이 하는 대로(CDN 지도 파일, 일꾼은 blob)
    mapRun("cdn",0);
  } else {            // 가만히 둔다
    [15000,30000,45000,60000].forEach(function(ms){ T.push([ms,function(){ lg("idle "+Math.round(ms/1000)+"s"); }]); });
  }
  }
  /* 순서 정하기: 액션이 앱 안에 적어 둔 kkv.txt(1~4)가 있으면 그것을, 없으면 불러온 횟수를 쓴다 */
  window.addEventListener("load",function(){
    var done=false;
    function fin(v,how){ if(done)return; done=true; if(v>=1&&v<=9)V=v>5?5:v; else how="count"; plan(); lg("load event v"+V+" ("+how+")");
      T.forEach(function(s){ setTimeout(function(){ try{s[1]();}catch(e){ lg("stepERR "+String(e&&e.message).slice(0,60)); } },s[0]); }); }
    try{ fetch("./kkv.txt",{cache:"no-store"}).then(function(r){ return r.ok?r.text():""; }).then(function(t){ fin(parseInt(t,10)||0,"file"); },function(){ fin(0,"count"); }); }catch(e){ fin(0,"count"); }
    setTimeout(function(){ fin(0,"count"); },1500);
  });
})();
