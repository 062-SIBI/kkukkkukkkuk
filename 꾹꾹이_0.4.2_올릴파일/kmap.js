
/* ══ 귀여운 지도(10/30 확정안을 실제 지도에) ═══════════════════════════
   바탕: MapLibre GL JS(BSD-3) + OpenFreeMap 벡터 지도(OpenStreetMap 데이터). 키와 가입이 필요 없다.
   위에 캔버스 한 장을 겹쳐 구름, 로고 점 길, 꾹자리 검정 도장, 킁킁과 똥 점을 그린다.
   걸은 곳만 구름이 걷힌다. 지도 라이브러리나 지도 조각을 못 받으면(오프라인 등) 같은 그림을 종이색 위에 그린다.
   타일 서버가 받는 건 화면에 보이는 지역 칸 요청뿐이다. 걸은 길과 꾹자리 좌표는 이 기기 밖으로 나가지 않는다. */
var KM={lib:null,p:null,gl:null,fogM:null,fogN:-1};
var KM_JS=["maplibre-gl.mjs","https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl.mjs"];
var KM_SRC="https://tiles.openfreemap.org/planet";
var KM_ATTR='<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>';
var KMC={land:"#CBEBAC",bld:"#ECE4D3",bldsh:"#CFC3AC",road:"#FFF8E2",roadc:"#A7CF8A",mainc:"#99C47C",park:"#A3DA86",grass:"#B7E39A",wood:"#92D077",
  path:"#FFF4D8",pathc:"#A9D08C",water:"#6EC8F0",parkl:"#3F6B34",waterl:"#2F6E99",trail:"#C08A55",tree:"#4BAA4C",tree2:"#74C568",
  ink:"#1B1712",coral:"#FF6B57",sun:"#EFB02F",sky:"#3B9DF5",moss:"#2F7A45"};   // 10/31: 게임 지도처럼 초록 땅에 크림색 길
/* ── 계절과 시간대: 지도 색, 나무, 구름이 바뀐다. 산책 상세는 그 산책을 한 때, 나머지 지도는 지금 ── */
var KM_SE={
  spring:{land:"#D5EFB8",park:"#B3E096",grass:"#C4E8A8",wood:"#A3D98A",tree:"#F2A3BC",tree2:"#FBD2DE",treeB:"#6ABD5E",treeB2:"#97D488",fog:[253,245,242],deco:{c:["#F5AFC4","#FBD0DC"],k:"petal"}},
  summer:{land:"#C4E9A0",park:"#96D47A",grass:"#ABDE8C",wood:"#84CB69",tree:"#43A447",tree2:"#6CBF63",treeB:"#3B9841",treeB2:"#62B55B",water:"#5FC2EF",fog:[250,248,236],deco:null},
  autumn:{land:"#E5E6AE",bld:"#EFE6D1",bldsh:"#D3C4A6",roadc:"#C9BB84",mainc:"#BEB077",park:"#D3D58F",grass:"#DCDDA0",wood:"#DDBE7C",pathc:"#C9BB84",
    tree:"#EE9744",tree2:"#F5B565",treeB:"#E7B53E",treeB2:"#F3D47C",fog:[253,242,228],deco:{c:["#EE9744","#EFC049","#D9773A"],k:"leaf"}},
  winter:{land:"#EFF4F6",bld:"#DCE3EA",bldsh:"#BFCAD4",road:"#FFFFFF",roadc:"#C6D3DC",mainc:"#BACAD5",park:"#E2EBEE",grass:"#E8EFF1",wood:"#D9E4E8",path:"#FFFFFF",pathc:"#C8D4DB",
    water:"#B6DBEF",rail:"#CFD8DE",trail:"#A99A86",tree:"#8DA8B7",tree2:"#FFFFFF",treeB:"#A1B8C5",treeB2:"#FFFFFF",fog:[246,249,252],deco:{c:["#FFFFFF"],k:"snow"}}
};
var KM_NIGHT={land:"#243146",bld:"#3D4A68",bldsh:"#141C30",road:"#3D4C6B",roadc:"#1F2A40",mainc:"#2A3752",path:"#3A4863",pathc:"#1F2A40",water:"#1D4B70",rail:"#3A4762",
  trail:"#C9A27A",parkl:"#9FD39A",waterl:"#9CCBEA",placel:"#E2D8C6",roadl:"#B7AE9E",halo:"#243146"};
function kmMix(a,b,t){var x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);
  function c(s){return Math.round(((x>>s)&255)*(1-t)+((y>>s)&255)*t);}
  return "#"+((1<<24)|(c(16)<<16)|(c(8)<<8)|c(0)).toString(16).slice(1);}
function kmTheme(t){
  var d=new Date(t||Date.now()),m=d.getMonth()+1,h=d.getHours();
  var se=m>=3&&m<=5?"spring":m>=6&&m<=8?"summer":m>=9&&m<=11?"autumn":"winter";
  var sl=h>=5&&h<10?"morning":h>=10&&h<17?"day":h>=17&&h<20?"evening":"night";
  return {se:se,sl:sl,key:se+"-"+sl,name:{spring:"봄",summer:"여름",autumn:"가을",winter:"겨울"}[se]+" "+{morning:"아침",day:"낮",evening:"저녁",night:"밤"}[sl]};
}
function kmPal(th){
  var P={},k;for(k in KMC)P[k]=KMC[k];
  P.placel="#4F6B3B";P.roadl="#6F8458";P.halo="#F6FCEF";P.halo2="#F6FCEF";P.rail="#9DBF86";P.treeB=null;P.treeB2=null;
  var S=KM_SE[th.se]||{};for(k in S)if(k!=="fog"&&k!=="deco")P[k]=S[k];
  if(!P.treeB){P.treeB=P.tree;P.treeB2=P.tree2;}
  var fg=S.fog||[252,246,236];P.fog="rgba("+fg[0]+","+fg[1]+","+fg[2]+",.82)";P.puff="rgba(255,255,255,.92)";P.puffsh="rgba(222,200,170,.32)";P.deco=S.deco||null;
  var tint=null,tt=0;
  if(th.sl==="morning"){tint="#FFF6DA";tt=.07;}
  if(th.sl==="evening"){tint="#FFB98A";tt=.16;P.fog="rgba(252,232,214,.82)";P.puffsh="rgba(214,160,120,.32)";}
  if(tint)["land","bld","bldsh","road","roadc","mainc","park","grass","wood","path","pathc","water","tree","tree2","treeB","treeB2"].forEach(function(c){P[c]=kmMix(P[c],tint,tt);});
  if(th.sl==="night"){
    ["park","grass","wood"].forEach(function(c){P[c]=kmMix(P[c],"#1C2A33",.66);});
    ["tree","tree2","treeB","treeB2"].forEach(function(c){P[c]=kmMix(P[c],"#1E2433",.45);});
    for(k in KM_NIGHT)P[k]=KM_NIGHT[k];P.halo2=KM_NIGHT.halo;
    P.fog="rgba(33,34,52,.84)";P.puff="rgba(64,66,96,.75)";P.puffsh="rgba(10,10,20,.35)";P.deco={c:["#FFFFFF","#FFE9A8"],k:"star"};
  }
  return P;
}
var KM_LOGO=[[22,58,-22],[50,40,0],[78,58,22]];       // 로고 점 세 개(100 단위 가운데와 기울기)
var KM_DLA=0.00018,KM_DLN=0.000227;                   // 구름 칸 약 20m
var KM_FONT="Jua,'Pretendard Variable',Pretendard,sans-serif";
var KM_RM=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

function kmX(ln){return (ln+180)/360;}
function kmY(la){var s=Math.sin(la*Math.PI/180);s=Math.max(-.9999,Math.min(.9999,s));return .5-Math.log((1+s)/(1-s))/(4*Math.PI);}
function kmLat(y){return 360/Math.PI*Math.atan(Math.exp((1-2*y)*Math.PI))-90;}
function kmD(a,b){return dist({lat:a[0],lng:a[1]},{lat:b[0],lng:b[1]});}

/* ── 라이브러리: 앱과 같은 곳에 둔 파일을 먼저, 없으면 jsDelivr(버전 고정) ── */
function kmGL(){
  if(KM.gl!=null)return KM.gl;
  try{var c=document.createElement("canvas");KM.gl=!!(c.getContext("webgl2")||c.getContext("webgl"));}catch(e){KM.gl=false;}
  return KM.gl;
}
var kmImport=null;try{kmImport=new Function("u","return import(u)");}catch(e){}
function kmLib(){
  if(KM.lib)return Promise.resolve(KM.lib);
  if(KM.p)return KM.p;
  if(!kmImport||!kmGL())return Promise.reject(new Error("webgl"));
  var i=0;
  KM.p=new Promise(function(ok,no){
    (function next(err){
      if(i>=KM_JS.length){no(err||new Error("maplibre"));return;}
      kmImport(KM_JS[i++]).then(function(m){if(m&&m.Map){KM.lib=m;ok(m);}else next();},next);
    })();
  });
  KM.p.catch(function(){KM.p=null;});
  return KM.p;
}

/* ── 귀여운 바탕 스타일(OpenMapTiles 스키마) ── */
function kmStyle(th){
  th=th||kmTheme();
  var C=kmPal(th),sx="-"+th.se+(th.sl==="night"?"-n":th.sl==="evening"?"-e":""),nm=["coalesce",["get","name:ko"],["get","name"]];
  function zw(a){return ["interpolate",["exponential",1.6],["zoom"]].concat(a);}
  function cls(a){return ["match",["get","class"],a,true,false];}
  var line=["match",["geometry-type"],["LineString","MultiLineString"],true,false];
  var soft=["any",["==",["get","class"],"track"],["all",["==",["get","class"],"path"],["match",["get","subclass"],["path","bridleway"],true,false]],
            ["==",["get","surface"],"unpaved"]];
  var L=[
    {id:"bg",type:"background",paint:{"background-color":C.land}},
    {id:"grass",type:"fill",source:"o","source-layer":"landcover",filter:cls(["grass","farmland"]),paint:{"fill-color":C.grass}},
    {id:"lu-green",type:"fill",source:"o","source-layer":"landuse",filter:cls(["park","cemetery","pitch","playground","garden","recreation_ground"]),paint:{"fill-color":C.grass}},
    {id:"park",type:"fill",source:"o","source-layer":"park",filter:["match",["geometry-type"],["Polygon","MultiPolygon"],true,false],paint:{"fill-color":C.park}},
    {id:"wood",type:"fill",source:"o","source-layer":"landcover",filter:["==",["get","class"],"wood"],paint:{"fill-color":C.wood}},
    {id:"wood-tree",type:"fill",source:"o","source-layer":"landcover",minzoom:13,filter:["==",["get","class"],"wood"],paint:{"fill-pattern":"km-tree"+sx}},
    {id:"park-tree",type:"fill",source:"o","source-layer":"park",minzoom:13,filter:["match",["geometry-type"],["Polygon","MultiPolygon"],true,false],paint:{"fill-pattern":"km-tree2"+sx}},
    {id:"water",type:"fill",source:"o","source-layer":"water",filter:["!=",["get","brunnel"],"tunnel"],paint:{"fill-color":C.water}},
    {id:"waterway",type:"line",source:"o","source-layer":"waterway",filter:["!=",["get","brunnel"],"tunnel"],layout:{"line-cap":"round","line-join":"round"},
      paint:{"line-color":C.water,"line-width":zw([12,1,18,10])}},
    {id:"rail",type:"line",source:"o","source-layer":"transportation",minzoom:13,filter:["all",line,cls(["rail","transit"]),["!=",["get","brunnel"],"tunnel"]],
      paint:{"line-color":C.rail,"line-width":zw([13,.8,18,2.4])}},
    {id:"path-c",type:"line",source:"o","source-layer":"transportation",minzoom:14,filter:["all",line,["==",["get","class"],"path"],["!",soft],["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.pathc,"line-width":zw([14,1.6,18,6])}},
    {id:"path",type:"line",source:"o","source-layer":"transportation",minzoom:14,filter:["all",line,["==",["get","class"],"path"],["!",soft],["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.path,"line-width":zw([14,.8,18,3.6])}},
    {id:"minor-c",type:"line",source:"o","source-layer":"transportation",minzoom:12.5,filter:["all",line,cls(["minor","service"]),["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.roadc,"line-width":zw([13,1.6,15,5,18,19])}},
    {id:"major-c",type:"line",source:"o","source-layer":"transportation",filter:["all",line,cls(["motorway","trunk","primary","secondary","tertiary"]),["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.mainc,"line-width":zw([11,1.5,15,9,18,30])}},
    {id:"minor",type:"line",source:"o","source-layer":"transportation",minzoom:12.5,filter:["all",line,cls(["minor","service"]),["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.road,"line-width":zw([13,.8,15,3.4,18,15])}},
    {id:"major",type:"line",source:"o","source-layer":"transportation",filter:["all",line,cls(["motorway","trunk","primary","secondary","tertiary"]),["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.road,"line-width":zw([11,.8,15,6.6,18,25])}},
    {id:"soft-u",type:"line",source:"o","source-layer":"transportation",minzoom:14,filter:["all",line,soft,["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.path,"line-width":zw([14,2,18,6.5]),"line-opacity":.85}},
    {id:"soft",type:"line",source:"o","source-layer":"transportation",minzoom:14,filter:["all",line,soft,["!=",["get","brunnel"],"tunnel"]],
      layout:{"line-cap":"round","line-join":"round"},paint:{"line-color":C.trail,"line-width":zw([14,1,18,2.6]),"line-opacity":.75}},
    {id:"bld-s",type:"fill",source:"o","source-layer":"building",minzoom:14,paint:{"fill-color":C.bldsh,"fill-translate":[0,1.6]}},
    {id:"bld",type:"fill",source:"o","source-layer":"building",minzoom:14,paint:{"fill-color":C.bld}},
    {id:"water-n",type:"symbol",source:"o","source-layer":"water_name",minzoom:13,filter:["match",["geometry-type"],["Point","MultiPoint"],true,false],
      layout:{"text-field":nm,"text-font":["Noto Sans Bold"],"text-size":12},
      paint:{"text-color":C.waterl,"text-halo-color":C.halo,"text-halo-width":1.4}},
    {id:"water-nl",type:"symbol",source:"o","source-layer":"water_name",minzoom:13,filter:line,
      layout:{"text-field":nm,"text-font":["Noto Sans Bold"],"text-size":12,"symbol-placement":"line"},
      paint:{"text-color":C.waterl,"text-halo-color":C.halo,"text-halo-width":1.4}},
    {id:"road-n",type:"symbol",source:"o","source-layer":"transportation_name",minzoom:16.5,filter:cls(["primary","secondary","tertiary","trunk","minor"]),
      layout:{"symbol-placement":"line","text-field":nm,"text-font":["Noto Sans Regular"],"text-size":11,"text-max-angle":30,"symbol-spacing":320},
      paint:{"text-color":C.roadl,"text-halo-color":C.halo,"text-halo-width":1.5}},
    {id:"park-n",type:"symbol",source:"o","source-layer":"park",minzoom:14,filter:["match",["geometry-type"],["Point","MultiPoint"],true,false],
      layout:{"text-field":nm,"text-font":["Noto Sans Bold"],"text-size":12.5,"text-max-width":7},
      paint:{"text-color":C.parkl,"text-halo-color":C.halo,"text-halo-width":1.6}},
    {id:"peak",type:"symbol",source:"o","source-layer":"mountain_peak",minzoom:12,
      layout:{"icon-image":"km-peak"+sx,"icon-size":1,"text-field":nm,"text-font":["Noto Sans Bold"],"text-size":12,"text-anchor":"left","text-offset":[.9,0],"icon-anchor":"right"},
      paint:{"text-color":C.parkl,"text-halo-color":C.halo,"text-halo-width":1.6}},
    {id:"place",type:"symbol",source:"o","source-layer":"place",minzoom:12,filter:cls(["suburb","quarter","neighbourhood"]),
      layout:{"text-field":nm,"text-font":["Noto Sans Bold"],"text-size":["interpolate",["linear"],["zoom"],12,12,16,14]},
      paint:{"text-color":C.placel,"text-halo-color":C.halo2,"text-halo-width":1.8}}
  ];
  return {version:8,glyphs:"https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources:{o:{type:"vector",url:KM_SRC,attribution:KM_ATTR}},layers:L};
}

/* 나무 무늬와 산 아이콘은 캔버스로 그려 넣는다(스프라이트 파일 없음) */
function kmIcon(id){
  var mm=/^km-(tree2|tree|peak)-([a-z]+)(-n|-e)?$/.exec(id);if(!mm)return null;
  var P=kmPal({se:mm[2],sl:mm[3]==="-n"?"night":mm[3]==="-e"?"evening":"day"}),kind=mm[1];
  var r=2,c=document.createElement("canvas"),x,w,h;
  if(kind!=="peak"){
    var dense=kind==="tree";w=h=dense?40:64;
    c.width=w*r;c.height=h*r;x=c.getContext("2d");x.scale(r,r);
    (dense?[[10,11,6.6,0],[30,31,7,1]]:[[16,18,6.2,0],[47,49,6.6,1]]).forEach(function(t){
      x.fillStyle=t[3]?P.treeB:P.tree;x.beginPath();x.arc(t[0],t[1]+t[2]*.35,t[2],0,6.2832);x.fill();
      x.fillStyle=t[3]?P.treeB2:P.tree2;x.beginPath();x.arc(t[0]-t[2]*.18,t[1],t[2]*.72,0,6.2832);x.fill();
    });
  } else {
    w=22;h=16;c.width=w*r;c.height=h*r;x=c.getContext("2d");x.scale(r,r);
    x.fillStyle=P.halo;x.beginPath();x.moveTo(0,15.5);x.lineTo(7.5,2);x.lineTo(11.5,8);x.lineTo(14.5,4.5);x.lineTo(22,15.5);x.closePath();x.fill();
    x.fillStyle=P.trail;x.beginPath();x.moveTo(2.4,14);x.lineTo(7.5,4.8);x.lineTo(11.4,10.6);x.lineTo(14.5,7);x.lineTo(19.6,14);x.closePath();x.fill();
  }
  return x.getImageData(0,0,c.width,c.height);
}

/* ── 지도 한 장 ─────────────────────────────────────────────────
   o: {coop:두 손가락으로만 움직이기(시트 안), chip:윗줄 안내, onPick:도장을 눌렀을 때, onIdle:지도 다 그렸을 때} */
function KMap(box,o){
  var me=this;me.box=box;me.o=o||{};me.d={};me.map=null;me.dead=false;me.mode="wait";me.hits=[];me.follow=true;
  box.classList.add("km");
  box.innerHTML='<div class="km-base"></div><div class="km-ui"></div>';
  me.base=box.firstChild;me.ui=box.lastChild;
  me.cv=document.createElement("canvas");me.cv.className="km-ov";me.ctx=me.cv.getContext("2d");
  me.dpr=Math.min(3,window.devicePixelRatio||1);
  me.se=document.createElement("span");me.se.className="km-se";box.appendChild(me.se);
  me.theme(me.o.th||kmTheme());
  if(window.ResizeObserver){me.ro=new ResizeObserver(function(){me.size();});me.ro.observe(box);}
  kmLib().then(function(L){if(!me.dead)me.mk(L);},function(){if(!me.dead)me.flat();});
}
/* 계절과 시간대 바꾸기: 지도 색은 스타일 차이만 바꾸고(setStyle diff) 구름 무늬는 다시 만든다 */
KMap.prototype.theme=function(th){
  var me=this,ch=!me.th||me.th.key!==th.key;me.th=th;
  me.se.textContent=th.name;me.box.classList.toggle("km-night",th.sl==="night");
  me.box.style.background=kmPal(th).land;
  if(ch){me.pat=null;if(me.map&&me.mode==="gl"){try{me.map.setStyle(kmStyle(th));}catch(e){}}me.draw();}
};
KMap.prototype.view=function(ll,z){var me=this;if(me.map){me.map.jumpTo({center:[ll[1],ll[0]],zoom:z});return;}me.c0=[ll[1],ll[0]];me.z0=z;};
KMap.prototype.pxy=function(la,ln){var T=this.T||this.tr();return T?[T.ox+(kmX(ln)-T.mx)*T.ws,T.oy+(kmY(la)-T.my)*T.ws]:[-999,-999];};
KMap.prototype.ll=function(X,Y){
  var me=this;if(me.map){var p=me.map.unproject([X,Y]);return [p.lat,p.lng];}
  var T=me.ft;if(!T)return null;return [kmLat(T.my+(Y-T.oy)/T.ws),(T.mx+(X-T.ox)/T.ws)*360-180];
};
KMap.prototype.pinAt=function(X,Y){                // 핀 머리(18px 위)나 끝을 누르면 그 핀
  var me=this,pi=-1,pd=24;
  (me.d.pins||[]).forEach(function(p,i){var q=me.pxy(p.la,p.ln),dd=Math.min(Math.hypot(q[0]-X,q[1]-18-Y),Math.hypot(q[0]-X,q[1]-Y));if(dd<pd){pd=dd;pi=i;}});
  return pi;
};
KMap.prototype.mk=function(L){
  var me=this,o=me.o;
  try{
    me.map=new L.Map({container:me.base,style:kmStyle(me.th),center:me.c0||[126.978,37.5665],zoom:me.z0||15,minZoom:11,maxZoom:18.6,
      attributionControl:{compact:false},dragRotate:false,pitchWithRotate:false,touchPitch:false,keyboard:false,
      cooperativeGestures:!!o.coop,fadeDuration:0,localIdeographFontFamily:"'Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif",
      locale:{"CooperativeGesturesHandler.MobileHelpText":"두 손가락으로 지도를 움직여요","CooperativeGesturesHandler.WindowsHelpText":"Ctrl 키를 누른 채 굴리면 지도가 커져요",
              "CooperativeGesturesHandler.MacHelpText":"⌘ 키를 누른 채 굴리면 지도가 커져요","AttributionControl.ToggleAttribution":"지도 출처",
              "AttributionControl.MapFeedback":"지도 고치기 제안"}});
  }catch(e){me.flat();return;}
  var m=me.map;
  if(m.touchZoomRotate&&m.touchZoomRotate.disableRotation)m.touchZoomRotate.disableRotation();
  function addIc(id){var im=kmIcon(id);if(im&&!m.hasImage(id))m.addImage(id,im,{pixelRatio:2});}
  if(m.setMissingStyleImageResolver)m.setMissingStyleImageResolver(function(id){addIc(id);return Promise.resolve();});
  else m.on("styleimagemissing",function(e){addIc(e.id);});
  m.getCanvasContainer().appendChild(me.cv);
  me.mode="gl";
  m.on("render",function(){me.draw();});
  m.on("resize",function(){me.size();});
  m.on("click",function(e){me.tap(e.point.x,e.point.y);});
  m.on("dragstart",function(){me.follow=false;me.ui.classList.add("moved");});
  m.on("idle",function(){if(me.o.onIdle)me.o.onIdle(me);});
  if(o.onDrag){                                    // 핀 끌어 옮기기: 핀 위에서 누르면 지도 대신 핀이 움직인다
    var dg=-1;
    var mv=function(e){if(dg<0)return;var p=me.d.pins[dg];if(!p)return;me.moved=true;p.la=e.lngLat.lat;p.ln=e.lngLat.lng;me.draw();};
    var up=function(){m.off("mousemove",mv);m.off("touchmove",mv);var i=dg;dg=-1;m.getCanvas().style.cursor="";
      if(i>=0&&me.moved){me.drop=Date.now();var p=me.d.pins[i];o.onDrag(i,[p.la,p.ln]);}};
    var down=function(e){if(e.points&&e.points.length!==1)return;var i=me.pinAt(e.point.x,e.point.y);if(i<0)return;
      e.preventDefault();dg=i;me.moved=false;m.getCanvas().style.cursor="grabbing";
      var t=e.type==="touchstart";m.on(t?"touchmove":"mousemove",mv);m.once(t?"touchend":"mouseup",up);};
    m.on("mousedown",down);m.on("touchstart",down);
  }
  m.on("error",function(e){me.err=(me.err||0)+1;me.errMsg=String((e&&e.error&&e.error.message)||e);});
  if(me.fit0){var f=me.fit0;me.fit0=null;me.fit(f[0],f[1]);}
  me.size();
};
KMap.prototype.flat=function(){                    // 지도 없이 같은 그림(종이 바탕)
  var me=this;me.mode="flat";me.base.classList.add("km-flat");me.box.insertBefore(me.cv,me.ui);
  me.cv.style.pointerEvents="auto";
  me.cv.addEventListener("click",function(e){var r=me.cv.getBoundingClientRect();me.tap(e.clientX-r.left,e.clientY-r.top);});
  if(me.fit0){var f=me.fit0;me.fit0=null;me.fit(f[0],f[1]);}
  me.size();
  if(me.o.onFlat)me.o.onFlat(me);
};
KMap.prototype.size=function(){
  var me=this,w=me.box.clientWidth,h=me.box.clientHeight;if(!w||!h)return;
  if(w!==me.w||h!==me.h){
    me.w=w;me.h=h;me.cv.width=Math.round(w*me.dpr);me.cv.height=Math.round(h*me.dpr);me.cv.style.width=w+"px";me.cv.style.height=h+"px";
    if(me.map)me.map.resize();
    if(me.fitLater){var f=me.fitLater;me.fitLater=null;me.fit(f[0],f[1]);}
  }
  me.draw();
};
KMap.prototype.remove=function(){this.dead=true;if(this.ro)this.ro.disconnect();if(this.map)this.map.remove();this.box.innerHTML="";};
/* 화면 변환: 회전·기울기가 없으니 메르카토르 좌표 → 화면은 확대 배율 하나와 원점 하나 */
KMap.prototype.tr=function(){
  var me=this;
  if(me.map){var c=me.map.getCenter(),p=me.map.project(c);
    return {ox:p.x,oy:p.y,mx:kmX(c.lng),my:kmY(c.lat),ws:512*Math.pow(2,me.map.getZoom()),lat:c.lat,z:me.map.getZoom()};}
  return me.ft||null;
};
/* pts: [[lat,lng],...] 를 화면에 맞춘다 */
KMap.prototype.fit=function(pts,pad){
  var me=this;pad=pad==null?36:pad;
  if(!pts||!pts.length)return;
  var a=90,b=-90,c=180,d=-180;
  pts.forEach(function(p){if(p[0]<a)a=p[0];if(p[0]>b)b=p[0];if(p[1]<c)c=p[1];if(p[1]>d)d=p[1];});
  if(b-a<0.0012){var m=(a+b)/2;a=m-0.0006;b=m+0.0006;}
  if(d-c<0.0015){var n=(c+d)/2;c=n-0.00075;d=n+0.00075;}
  me.c0=[(c+d)/2,(a+b)/2];
  if(me.mode==="wait"){me.fit0=[pts,pad];return;}
  if(!me.w){me.fitLater=[pts,pad];return;}
  if(me.map){
    var P=typeof pad==="number"?{top:pad,bottom:pad,left:pad,right:pad}:pad;
    me.map.fitBounds([[c,a],[d,b]],{padding:P,maxZoom:17.4,duration:0});me.follow=true;me.ui.classList.remove("moved");return;
  }
  var pt=typeof pad==="number"?pad:Math.max(pad.top,pad.bottom,pad.left,pad.right);
  var x0=kmX(c),x1=kmX(d),y0=kmY(b),y1=kmY(a);
  var ws=Math.min((me.w-pt*2)/Math.max(x1-x0,1e-9),(me.h-pt*2)/Math.max(y1-y0,1e-9));
  ws=Math.min(ws,512*Math.pow(2,17.4));
  me.ft={ox:me.w/2,oy:me.h/2,mx:(x0+x1)/2,my:(y0+y1)/2,ws:ws,lat:(a+b)/2,z:Math.log(ws/512)/Math.LN2};
  me.draw();
};
KMap.prototype.go=function(la,ln,z){
  var me=this;
  if(me.map){me.map.easeTo({center:[ln,la],zoom:z==null?me.map.getZoom():z,duration:KM_RM?0:450});return;}
  if(me.ft){me.ft.mx=kmX(ln);me.ft.my=kmY(la);me.draw();}
};

/* d: {fog, extra:[pts], trail:pts, trailK, guide:pts, guideDash, marks:[{la,ln,k}], stamps:[{la,ln,n,w,rank,neu,check,id,num}],
       cluster, sel, start:[la,ln], home:[la,ln], here:[la,ln], bubble:{la,ln,t}} */
KMap.prototype.set=function(d){
  var me=this;me.d=d||{};
  function M(pts){if(!pts||pts.length<2)return null;var n=pts.length,xs=new Float64Array(n),ys=new Float64Array(n),g=new Uint8Array(n);
    for(var i=0;i<n;i++){xs[i]=kmX(pts[i][1]);ys[i]=kmY(pts[i][0]);g[i]=pts[i][2]===1?1:0;}return {xs:xs,ys:ys,g:g,n:n};}
  me.d.trailM=M(me.d.trail);me.d.guideM=M(me.d.guide);me.dots=null;
  me.d.altsM=(me.d.alts||[]).map(M).filter(Boolean);
  me.d.extraM=null;
  if(me.d.extra&&me.d.extra.length){var cs=kmCells(me.d.extra,{}),ks=Object.keys(cs);
    var ex=new Float64Array(ks.length),ey=new Float64Array(ks.length);
    ks.forEach(function(k,i){var q=k.split("_");ey[i]=kmY(+q[0]*KM_DLA);ex[i]=kmX(+q[1]*KM_DLN);});me.d.extraM={xs:ex,ys:ey,n:ks.length};}
  (me.d.marks||[]).forEach(function(q){q.mx=kmX(q.ln);q.my=kmY(q.la);});
  (me.d.stamps||[]).forEach(function(q){q.mx=kmX(q.ln);q.my=kmY(q.la);});
  me.draw();
};

/* ── 그리기 ── */
KMap.prototype.draw=function(){
  var me=this,x=me.ctx,W=me.w,H=me.h,d=me.d;if(!x||!W||!H)return;
  var T=me.tr();
  x.setTransform(me.dpr,0,0,me.dpr,0,0);x.clearRect(0,0,W,H);
  if(!T)return;
  me.T=T;
  function px(mx){return T.ox+(mx-T.mx)*T.ws;} function py(my){return T.oy+(my-T.my)*T.ws;}
  var mpp=40075016.686*Math.cos(T.lat*Math.PI/180)/T.ws;   // 1px = 몇 m
  if(d.fog)me.drawFog(x,W,H,T,px,py,mpp);
  (d.altsM||[]).forEach(function(A){x.save();x.lineCap="round";x.lineJoin="round";x.beginPath();
    for(var i=0;i<A.n;i++){var X=px(A.xs[i]),Y=py(A.ys[i]);if(i===0)x.moveTo(X,Y);else x.lineTo(X,Y);}
    x.strokeStyle="rgba(255,255,255,.7)";x.lineWidth=6.5;x.stroke();x.strokeStyle="rgba(120,108,94,.55)";x.lineWidth=3.2;x.stroke();x.restore();});
  if(d.guideM)me.drawGuide(x,d.guideM,px,py,d.guideDash,d.guideNew);
  if(d.trailM)me.drawDots(x,T,px,py,W,H);
  (d.marks||[]).forEach(function(q){kmMark(x,px(q.mx),py(q.my),q.k,0.95);});
  if(d.start)kmRing(x,px(kmX(d.start[1])),py(kmY(d.start[0])),null);
  if(d.home)kmRing(x,px(kmX(d.home[1])),py(kmY(d.home[0])),"집");
  me.drawStamps(x,px,py);
  if(d.here){var hx=px(kmX(d.here[1])),hy=py(kmY(d.here[0])),av=kmAvaImg();
    x.fillStyle="rgba(27,23,18,.12)";x.beginPath();x.arc(hx,hy,av?30:22,0,6.2832);x.fill();
    if(av){x.save();x.fillStyle="rgba(0,0,0,.18)";x.beginPath();x.ellipse(hx,hy+22,12,4,0,0,6.2832);x.fill();
      x.beginPath();x.arc(hx,hy-6,20,0,6.2832);x.fillStyle="#FFFFFF";x.fill();x.lineWidth=2.5;x.strokeStyle=KMC.ink;x.stroke();
      x.beginPath();x.moveTo(hx-7,hy+11);x.lineTo(hx,hy+19);x.lineTo(hx+7,hy+11);x.closePath();x.fillStyle=KMC.ink;x.fill();
      x.beginPath();x.arc(hx,hy-6,17,0,6.2832);x.clip();x.drawImage(av,hx-17,hy-23,34,34);x.restore();}
    else{x.fillStyle=KMC.ink;x.strokeStyle="#FFFFFF";x.lineWidth=3.5;x.beginPath();x.arc(hx,hy,9,0,6.2832);x.fill();x.stroke();}}
  (d.pins||[]).forEach(function(p,i){kmPin(x,px(kmX(p.ln)),py(kmY(p.la)),i+1);});
  if(d.bubble)kmBubble(x,px(kmX(d.bubble.ln)),py(kmY(d.bubble.la)),d.bubble.t,W);
};
/* 구름: 덮개를 깔고 걸은 칸(약 20m)마다 반지름 50m 원을 흐릿하게 지운다 */
KMap.prototype.drawFog=function(x,W,H,T,px,py,mpp){
  var me=this;
  if(!me.pat)me.pat=kmFogPat(x,me.dpr,me.th||kmTheme());
  var F=kmFogM(),ax=0,ay=0;
  if(F.n){ax=px(F.xs[0]);ay=py(F.ys[0]);}else if(me.d.extraM&&me.d.extraM.n){ax=px(me.d.extraM.xs[0]);ay=py(me.d.extraM.ys[0]);}
  var S2=256;
  if(me.pat.setTransform&&window.DOMMatrix)me.pat.setTransform(new DOMMatrix([1/me.dpr,0,0,1/me.dpr,((ax%S2)+S2)%S2,((ay%S2)+S2)%S2]));
  x.fillStyle=me.pat;x.fillRect(0,0,W,H);
  var r=Math.max(7,50/mpp),bl=Math.max(6,Math.min(22,r*.45)),OFF=W+H+400,any=false;   // 안개 가장자리를 더 부드럽게
  // 그림자 기법: 원은 화면 왼쪽 밖에 그리고 흐린 그림자만 제자리에 떨어뜨려 지운다(사파리도 되는 흐림)
  x.save();x.globalCompositeOperation="destination-out";x.beginPath();
  function add(xs,ys,n){for(var i=0;i<n;i++){var X=px(xs[i]),Y=py(ys[i]);if(X<-r||X>W+r||Y<-r||Y>H+r)continue;x.moveTo(X-OFF+r,Y);x.arc(X-OFF,Y,r,0,6.2832);any=true;}}
  add(F.xs,F.ys,F.n);
  if(me.d.extraM)add(me.d.extraM.xs,me.d.extraM.ys,me.d.extraM.n);
  if(any){x.shadowColor="#000";x.shadowBlur=bl*me.dpr;x.shadowOffsetX=OFF*me.dpr;x.fillStyle="#000";x.fill();}
  x.restore();
};
KMap.prototype.drawGuide=function(x,G,px,py,dash,NW){
  x.save();x.lineCap="round";x.lineJoin="round";
  function path(sel){x.beginPath();var on=false;   // sel: null 전부, 0 걸어 본 구간, 1 처음 가는 구간
    for(var i=1;i<G.n;i++){var use=!G.g[i]&&(sel==null||((NW&&NW[i])?1:0)===sel);
      if(use){if(!on){x.moveTo(px(G.xs[i-1]),py(G.ys[i-1]));on=true;}x.lineTo(px(G.xs[i]),py(G.ys[i]));}else on=false;}}
  path(null);x.strokeStyle="rgba(255,255,255,.9)";x.lineWidth=dash?7:8.5;x.stroke();
  if(dash){path(null);x.strokeStyle=KMC.ink;x.lineWidth=4;x.setLineDash([2,9]);x.globalAlpha=.6;x.stroke();}
  else{path(0);x.strokeStyle=KMC.ink;x.lineWidth=4.5;x.stroke();
    if(NW){path(1);x.strokeStyle=KMC.sky;x.lineWidth=4.5;x.stroke();}}
  x.setLineDash([]);x.globalAlpha=1;
  if(!dash){                                       // 가는 방향 화살표
    var acc=60,prev=null;x.strokeStyle="#FFFFFF";x.lineWidth=2;
    for(var i=1;i<G.n;i++){var a=[px(G.xs[i-1]),py(G.ys[i-1])],b=[px(G.xs[i]),py(G.ys[i])],L=Math.hypot(b[0]-a[0],b[1]-a[1]);
      if(G.g[i]||!L)continue;
      while(acc<=L){var t=acc/L,X=a[0]+(b[0]-a[0])*t,Y=a[1]+(b[1]-a[1])*t,ang=Math.atan2(b[1]-a[1],b[0]-a[0]);
        x.save();x.translate(X,Y);x.rotate(ang);x.beginPath();x.moveTo(-4.5,-4.5);x.lineTo(2.7,0);x.lineTo(-4.5,4.5);x.stroke();x.restore();acc+=150;}
      acc-=L;}
  }
  x.restore();
};
/* 로고 점 길: 확대 단계마다 20px 간격으로 지리 위치를 정해 두고(움직여도 점이 미끄러지지 않게) 세 색을 돌린다 */
KMap.prototype.drawDots=function(x,T,px,py,W,H){   // 걸은 길: 이어진 세 색 띠(10/31, 점은 너무 점점이라는 피드백)
  var me=this,G=me.d.trailM,k=me.d.trailK||1.1,lw=3.6*k,seg=16;
  x.save();x.lineCap="round";x.lineJoin="round";
  x.beginPath();var on=false;
  for(var i=1;i<G.n;i++){if(G.g[i]){on=false;continue;}
    if(!on){x.moveTo(px(G.xs[i-1]),py(G.ys[i-1]));on=true;}x.lineTo(px(G.xs[i]),py(G.ys[i]));}
  x.strokeStyle="rgba(255,255,255,.92)";x.lineWidth=lw+3.6;x.stroke();
  x.lineCap="butt";
  [KMC.coral,KMC.sun,KMC.sky].forEach(function(c,j){x.strokeStyle=c;x.lineWidth=lw;x.setLineDash([seg,seg*2]);x.lineDashOffset=-j*seg;x.stroke();});
  x.setLineDash([]);x.restore();
};
/* 꾹자리 도장: 자주 갈수록 크게, 1~3위 번호, 처음 마킹한 곳은 노란 반짝임. 멀리 보면 가까운 도장끼리 묶는다 */
KMap.prototype.drawStamps=function(x,px,py){
  var me=this,st=me.d.stamps||[];me.hits=[];
  var L=st.map(function(q){return {x:px(q.mx),y:py(q.my),q:q};}).sort(function(a,b){return (b.q.n||1)-(a.q.n||1);});
  var G=[];
  L.forEach(function(p){
    if(me.d.cluster){for(var i=0;i<G.length;i++){var g=G[i];if(Math.hypot(g.x-p.x,g.y-p.y)<30){g.m.push(p);g.n+=p.q.n||1;return;}}}
    G.push({x:p.x,y:p.y,m:[p],n:p.q.n||1,top:p.q});
  });
  G.reverse().forEach(function(g){
    var q=g.top,w=q.w||kmSize(g.n);
    if(g.m.length>1){                              // 묶인 도장: 가장 높은 순위 번호는 그대로, 아래에 몇 곳인지
      var rk=null,nu=false;g.m.forEach(function(p){if(p.q.rank&&(!rk||p.q.rank<rk))rk=p.q.rank;if(p.q.neu)nu=true;});
      kmStamp(x,g.x,g.y,w,nu,rk,false);
      kmPill(x,g.x,g.y+w*.5+9,g.m.length+"곳");
      me.hits.push({x:g.x,y:g.y,c:g});return;
    }
    var sel=me.d.sel!=null&&q.id===me.d.sel;
    kmStamp(x,g.x,g.y,w,q.neu,q.rank,sel);
    if(q.num)kmTag(x,g.x+w*.48,g.y-w*.42,q.num,true);
    if(q.check)kmCheck(x,g.x+w*.48,g.y-w*.42);
    me.hits.push({x:g.x,y:g.y,id:q.id});
  });
};
KMap.prototype.tap=function(X,Y){
  var me=this,best=null,bd=24;                     // 둘레 48px 안을 누르면 된다
  if(me.drop&&Date.now()-me.drop<400)return;        // 핀을 끌어 놓은 직후의 탭은 버린다
  me.hits.forEach(function(h){var dd=Math.hypot(h.x-X,h.y-Y);if(dd<=bd){bd=dd;best=h;}});
  if(me.o.onTap){me.o.onTap({pin:me.pinAt(X,Y),id:best&&!best.c?best.id:null,ll:me.ll(X,Y)});return;}
  if(best&&best.c){                                // 묶인 도장: 그쪽으로 확대
    if(me.map)me.map.easeTo({center:me.map.unproject([best.x,best.y]),zoom:Math.min(18,me.map.getZoom()+2),duration:KM_RM?0:400});
    return;
  }
  if(me.o.onPick)me.o.onPick(best?best.id:null);
};

/* ── 그림 조각 ── */
function kmSize(n){return 16+5.2*Math.sqrt(n||1);}
function kmLogo(x,cx,cy,w,halo,col){
  var k=w/90;
  function e(gr){KM_LOGO.forEach(function(q){x.beginPath();x.ellipse(cx+(q[0]-50)*k,cy+(q[1]-49)*k,13*k+gr,16*k+gr,q[2]*Math.PI/180,0,6.2832);x.fill();});}
  if(halo){x.fillStyle="#FFFFFF";e(2.2);}
  x.fillStyle=col||KMC.ink;e(0);
}
function kmSpark(x,cx,cy,rr){
  x.save();x.strokeStyle=KMC.sun;x.lineWidth=2.4;x.lineCap="round";x.beginPath();
  for(var a=0;a<360;a+=45){var c=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180);x.moveTo(cx+c*rr,cy+s*rr);x.lineTo(cx+c*(rr+5),cy+s*(rr+5));}
  x.stroke();x.restore();
}
function kmTag(x,X,Y,n,ink){
  x.save();x.beginPath();x.arc(X,Y,8.5,0,6.2832);x.fillStyle=ink?KMC.ink:"#FFFFFF";x.fill();x.lineWidth=1.8;x.strokeStyle=ink?"#FFFFFF":KMC.ink;x.stroke();
  x.fillStyle=ink?"#FFFFFF":KMC.ink;x.font="11px "+KM_FONT;x.textAlign="center";x.textBaseline="middle";x.fillText(String(n),X,Y+.5);x.restore();
}
function kmPill(x,X,Y,t){
  x.save();x.font="11px "+KM_FONT;var w=x.measureText(t).width+12;
  x.fillStyle=KMC.ink;kmRR(x,X-w/2,Y-8,w,16,8);x.fill();x.lineWidth=1.5;x.strokeStyle="#FFFFFF";x.stroke();
  x.fillStyle="#FFFFFF";x.textAlign="center";x.textBaseline="middle";x.fillText(t,X,Y+.5);x.restore();
}
function kmPin(x,X,Y,n){                           // 가고 싶은 곳 핀(번호)
  x.save();
  x.fillStyle="rgba(0,0,0,.16)";x.beginPath();x.ellipse(X,Y,5,2,0,0,6.2832);x.fill();
  x.beginPath();x.moveTo(X,Y-1);x.lineTo(X-7.5,Y-14);x.arc(X,Y-19,10.5,Math.PI*.83,Math.PI*.17);x.closePath();
  x.fillStyle=KMC.ink;x.fill();x.lineWidth=2.4;x.strokeStyle="#FFFFFF";x.stroke();
  x.fillStyle="#FFFFFF";x.font="12px "+KM_FONT;x.textAlign="center";x.textBaseline="middle";x.fillText(String(n),X,Y-18.5);
  x.restore();
}
function kmCheck(x,X,Y){
  x.save();x.beginPath();x.arc(X,Y,9,0,6.2832);x.fillStyle=KMC.moss;x.fill();x.lineWidth=2;x.strokeStyle="#FFFFFF";x.stroke();
  x.beginPath();x.moveTo(X-4,Y);x.lineTo(X-1.2,Y+2.8);x.lineTo(X+4,Y-2.4);x.lineWidth=2.2;x.lineCap="round";x.lineJoin="round";x.stroke();x.restore();
}
function kmStamp(x,X,Y,w,neu,rank,sel){
  if(sel){w*=1.3;x.save();x.beginPath();x.arc(X,Y,w*.78,0,6.2832);x.fillStyle="#FFFFFF";x.fill();x.lineWidth=2;x.strokeStyle=KMC.ink;x.stroke();x.restore();}
  kmLogo(x,X,Y,w,true);
  if(neu)kmSpark(x,X,Y,w*.62+6);
  if(rank)kmTag(x,X+w*.48,Y-w*.42,rank,false);
}
function kmMark(x,X,Y,k,s){
  var c=k==="poop"?[KMC.coral,-22]:[KMC.sun,0],r=c[1]*Math.PI/180;
  x.save();
  x.fillStyle="rgba(0,0,0,.10)";x.beginPath();x.ellipse(X,Y+2.2,8.6*s,10.4*s,r,0,6.2832);x.fill();
  x.fillStyle=c[0];x.strokeStyle="#FFFFFF";x.lineWidth=2.6;x.beginPath();x.ellipse(X,Y,8.2*s,10*s,r,0,6.2832);x.fill();x.stroke();
  x.fillStyle="rgba(255,255,255,.75)";x.beginPath();x.ellipse(X-2.6*s,Y-3.4*s,2.1*s,2.8*s,r,0,6.2832);x.fill();
  x.restore();
}
function kmRing(x,X,Y,label){
  x.save();x.beginPath();x.arc(X,Y,6.5,0,6.2832);x.fillStyle="#FFFFFF";x.fill();x.lineWidth=3;x.strokeStyle=KMC.ink;x.stroke();
  if(label){x.font="12px "+KM_FONT;var w=x.measureText(label).width+14;
    x.fillStyle="#FFFFFF";x.strokeStyle="#E4DED4";x.lineWidth=1;kmRR(x,X+10,Y-11,w,22,11);x.fill();x.stroke();
    x.fillStyle=KMC.ink;x.textBaseline="middle";x.fillText(label,X+17,Y+.5);}
  x.restore();
}
function kmBubble(x,X,Y,t,W){
  x.save();x.font="12.5px "+KM_FONT;var w=x.measureText(t).width+22,bx=Math.max(6,Math.min(W-w-6,X-w/2)),by=Y-24-15;
  x.fillStyle=KMC.ink;kmRR(x,bx,by,w,30,10);x.fill();
  x.beginPath();x.moveTo(X-6,by+30);x.lineTo(X,by+37);x.lineTo(X+6,by+30);x.closePath();x.fill();
  x.fillStyle="#FFFFFF";x.textAlign="center";x.textBaseline="middle";x.fillText(t,bx+w/2,by+15.5);x.restore();
}
function kmRR(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath();}
function kmDark(){var t=document.documentElement.getAttribute("data-theme");
  return t==="dark"||(t!=="light"&&window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches);}
function kmFogPat(x,dpr,th){
  var C=kmPal(th),S2=256,c=document.createElement("canvas");c.width=c.height=Math.round(S2*dpr);
  var g=c.getContext("2d");g.scale(dpr,dpr);
  g.fillStyle=C.fog;g.fillRect(0,0,S2,S2);
  // 10/31: 구름 그림과 꽃잎·별 장식은 빼고 안개만 깐다
  return x.createPattern(c,"repeat");
}

/* ══ 걸은 칸(구름 걷기) ══════════════════════════════════════════
   S.fog.c: 걸은 적 있는 약 20m 칸. 산책 좌표는 최근 30번만 남기지만 걷힌 구름은 계속 남는다.
   산책을 끝낼 때 그 산책에서 처음 걸은 길(nk, km)과 그 가운데 자리(na)도 적어 둔다. */
function kmCells(pts,into){
  into=into||{};
  for(var i=0;i<pts.length;i++){
    var p=pts[i];into[Math.round(p[0]/KM_DLA)+"_"+Math.round(p[1]/KM_DLN)]=1;
    if(i&&p[2]!==1){var q=pts[i-1],L=kmD(q,p),n=Math.min(40,Math.floor(L/10));
      for(var k=1;k<n;k++){var t=k/n;into[Math.round((q[0]+(p[0]-q[0])*t)/KM_DLA)+"_"+Math.round((q[1]+(p[1]-q[1])*t)/KM_DLN)]=1;}}
  }
  return into;
}
function kmFogWalk(w,noSave){                     // 산책 하나를 구름 칸에 더한다(새 길 길이도 잰다)
  if(!noSave)kmFogEnsure();
  var pts=w.pts||[],C=S.fog.c,N={},nN=0,sum=0,run=0,best=0,bestAt=null,runPts=[];
  var prev=(!noSave&&w.resumedAt&&w.nk!=null)?w.nk:0,prevNa=prev?w.na:null;   // 이어 걸은 산책은 앞에서 잰 새 길에 더한다
  // 새 칸: 이 산책 칸 가운데 이전에 걸은 칸 둘레(3x3)에 없는 칸. 같은 새 길을 갔다 오면 두 번 세지 않게 칸 수로 상한을 둔다
  var mine=kmCells(pts,{});
  Object.keys(mine).forEach(function(k){var q=k.split("_"),i=+q[0],j=+q[1];
    for(var a=-1;a<=1;a++)for(var b=-1;b<=1;b++)if(C[(i+a)+"_"+(j+b)])return;N[k]=1;nN++;});
  for(var k=1;k<pts.length;k++){
    var p=pts[k],q=pts[k-1];if(p[2]===1){run=0;runPts=[];continue;}
    var L=kmD(q,p);if(L>150){run=0;runPts=[];continue;}
    if(N[Math.round((p[0]+q[0])/2/KM_DLA)+"_"+Math.round((p[1]+q[1])/2/KM_DLN)]){sum+=L;run+=L;runPts.push(p);
      if(run>best){best=run;bestAt=runPts[Math.floor(runPts.length/2)];}}
    else{run=0;runPts=[];}
  }
  Object.keys(mine).forEach(function(k){C[k]=1;});S.fog.n=Object.keys(C).length;
  w.nk=Math.round(prev*1000+Math.min(sum,nN*20))/1000;
  if(bestAt&&best>=60)w.na=[bestAt[0],bestAt[1]];else if(prevNa)w.na=prevNa;else delete w.na;
}
function kmFogEnsure(){
  if(S.fog&&S.fog.v===1&&S.fog.c)return;
  S.fog={v:1,c:{},n:0};
  S.walks.slice().reverse().forEach(function(w){if(w.pts&&w.pts.length>1)kmFogWalk(w,true);});
  S.routes.forEach(function(r){if(r.pts)kmCells(r.pts,S.fog.c);});
  S.fog.n=Object.keys(S.fog.c).length;save();
}
function kmFogM(){
  kmFogEnsure();
  if(KM.fogM&&KM.fogN===S.fog.n&&KM.fogC===S.fog.c)return KM.fogM;
  var ks=Object.keys(S.fog.c),n=ks.length,xs=new Float64Array(n),ys=new Float64Array(n);
  for(var i=0;i<n;i++){var q=ks[i].split("_");ys[i]=kmY(+q[0]*KM_DLA);xs[i]=kmX(+q[1]*KM_DLN);}
  KM.fogM={xs:xs,ys:ys,n:n};KM.fogN=S.fog.n;KM.fogC=S.fog.c;return KM.fogM;
}
/* 집(산책을 가장 많이 시작한 곳): 최근 산책 출발점들의 가운데값 */
function kmHome(){
  var a=[],b=[];
  S.walks.forEach(function(w){if(w.pts&&w.pts.length){a.push(w.pts[0][0]);b.push(w.pts[0][1]);}});
  if(!a.length){S.spots.forEach(function(s){a.push(s.lat);b.push(s.lng);});}
  if(!a.length)return null;
  function med(v){v=v.slice().sort(function(x,y){return x-y;});return v[Math.floor(v.length/2)];}
  return [med(a),med(b)];
}
/* 구름 걷힌 동네: 집에서 1km 안 100m 칸 가운데 걸은 칸의 비율 */
function kmCleared(){
  var h=kmHome();if(!h)return null;kmFogEnsure();
  var CL=KM_DLA*5,CN=KM_DLN*5,hi=Math.round(h[0]/CL),hj=Math.round(h[1]/CN),tot=0,got={},n=0;
  for(var a=-12;a<=12;a++)for(var b=-12;b<=12;b++)if(kmD(h,[(hi+a)*CL,(hj+b)*CN])<=1000)tot++;
  Object.keys(S.fog.c).forEach(function(k){var q=k.split("_"),i=Math.round(+q[0]/5),j=Math.round(+q[1]/5),kk=i+"_"+j;
    if(got[kk])return;if(kmD(h,[i*CL,j*CN])<=1000){got[kk]=1;n++;}});
  return {pct:tot?Math.round(n/tot*100):0,n:n,tot:tot};
}

/* ══ 꾹자리 이름 ════════════════════════════════════════════════
   사용자가 붙인 이름(nm) → 지도에서 찾은 가까운 가게(앞)나 길 이름(an) → "꾹자리 N". 이름 찾기도 폰 안에서 한다. */
function kmSpotIds(){                              // 꾹자리마다 겹치지 않는 번호(위젯에서 한꺼번에 받은 꾹은 만든 시각이 같을 수 있다)
  var used={},ch=false;
  S.spots.forEach(function(s){var id=s.id||s.first||1;while(used[id])id++;if(s.id!==id){s.id=id;ch=true;}used[id]=1;});
  if(ch)save();
}
function kmSpotId(s){if(!s.id)kmSpotIds();return s.id;}
function kmSpotName(s){
  if(s.nm)return s.nm;
  if(s.an){var same=S.spots.filter(function(x){return !x.nm&&x.an===s.an;});
    if(same.length>1){same.sort(function(a,b){return (a.first||0)-(b.first||0);});var i=same.indexOf(s);return i?s.an+" "+(i+1):s.an;}
    return s.an;}
  return "꾹자리 "+(S.spots.indexOf(s)+1);
}
function kmSpotNear(p,r){var best=null,bd=r||10;S.spots.forEach(function(s){var d=kmD(p,[s.lat,s.lng]);if(d<=bd){bd=d;best=s;}});return best;}
function kmAutoName(map){
  if(!map||map.getZoom()<14)return;
  var b=map.getBounds(),changed=false;
  var todo=S.spots.filter(function(s){return !s.nm&&!s.an&&!s.at&&b.contains([s.lng,s.lat]);});
  if(!todo.length)return;
  var pois,roads;
  try{pois=map.querySourceFeatures("o",{sourceLayer:"poi"});roads=map.querySourceFeatures("o",{sourceLayer:"transportation_name"});}catch(e){return;}
  if(!pois.length&&!roads.length)return;            // 지도 조각을 못 받았으면 다음에 다시 찾는다
  function nm(f){var p=f.properties||{};return p["name:ko"]||p.name||"";}
  function segD(p,a,b){var kx=Math.cos(p[0]*Math.PI/180)*111320,ky=110540;
    var ax=(a[0]-p[1])*kx,ay=(a[1]-p[0])*ky,bx=(b[0]-p[1])*kx,by=(b[1]-p[0])*ky,dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0;
    return Math.hypot(ax+dx*t,ay+dy*t);}
  todo.forEach(function(s){
    var p=[s.lat,s.lng],best="",bd=28;
    pois.forEach(function(f){var n=nm(f);if(!n||f.geometry.type!=="Point")return;var c=f.geometry.coordinates,d=kmD(p,[c[1],c[0]]);if(d<bd){bd=d;best=n.slice(0,12)+" 앞";}});
    if(!best){bd=45;roads.forEach(function(f){var n=nm(f);if(!n)return;var g=f.geometry,ls=g.type==="LineString"?[g.coordinates]:g.type==="MultiLineString"?g.coordinates:[];
      ls.forEach(function(l){for(var i=1;i<l.length;i++){var d=segD(p,l[i-1],l[i]);if(d<bd){bd=d;best=n.slice(0,12);}}});});}
    s.at=1;if(best){s.an=best;}changed=true;
  });
  if(changed){save();if(KM.onNames)KM.onNames();}
}

/* ══ 추천 길: 걸어 본 길 토막만 이어서 꾹자리를 지나 집으로 ═══════════ */
function kmGraph(){
  var G={},CL=0.00011,CN=0.000139;               // 약 12m 마디
  function key(la,ln){return Math.round(la/CL)+"_"+Math.round(ln/CN);}
  var paths=[];
  S.walks.forEach(function(w){if(w.pts&&w.pts.length>1)paths.push(w.pts);});
  S.routes.forEach(function(r){if(r.pts&&r.pts.length>1)paths.push(r.pts);});
  paths.forEach(function(P){var pk=null;
    for(var i=0;i<P.length;i++){var p=P[i],k=key(p[0],p[1]),nd=G[k]||(G[k]={la:0,ln:0,c:0,e:{}});
      nd.la+=p[0];nd.ln+=p[1];nd.c++;
      if(pk&&pk!==k&&p[2]!==1&&kmD(P[i-1],p)<120){G[pk].e[k]=1;nd.e[pk]=1;}
      pk=k;}});
  var ks=Object.keys(G);
  ks.forEach(function(k){var n=G[k];n.la/=n.c;n.ln/=n.c;});
  ks.forEach(function(k){var q=k.split("_"),i=+q[0],j=+q[1],n=G[k];   // 옆 칸끼리 잇기(같은 길을 조금씩 다르게 찍은 GPS)
    for(var a=-1;a<=1;a++)for(var b=-1;b<=1;b++){if(!a&&!b)continue;var k2=(i+a)+"_"+(j+b),m=G[k2];
      if(m&&kmD([n.la,n.ln],[m.la,m.ln])<=16){n.e[k2]=1;m.e[k]=1;}}});
  return G;
}
function kmNearest(G,p){var best=null,bd=Infinity;for(var k in G){var n=G[k],d=kmD(p,[n.la,n.ln]);if(d<bd){bd=d;best=k;}}return best?{k:best,d:bd}:null;}
function kmDijkstra(G,a){
  var D={},P={},H=[[0,a]];D[a]=0;
  function push(it){H.push(it);var i=H.length-1;while(i){var j=(i-1)>>1;if(H[j][0]<=H[i][0])break;var t=H[i];H[i]=H[j];H[j]=t;i=j;}}
  function pop(){var top=H[0],last=H.pop();if(H.length){H[0]=last;var i=0;for(;;){var l=2*i+1,r=l+1,m=i;
    if(l<H.length&&H[l][0]<H[m][0])m=l;if(r<H.length&&H[r][0]<H[m][0])m=r;if(m===i)break;var t=H[i];H[i]=H[m];H[m]=t;i=m;}}return top;}
  while(H.length){var t=pop(),d=t[0],u=t[1];if(d>D[u])continue;var nu=G[u];
    for(var v in nu.e){var nv=G[v],nd=d+kmD([nu.la,nu.ln],[nv.la,nv.ln]);if(D[v]===undefined||nd<D[v]){D[v]=nd;P[v]=u;push([nd,v]);}}}
  return {D:D,P:P};
}
function kmPathTo(R,a,b){if(R.D[b]===undefined)return null;var out=[b];while(out[0]!==a)out.unshift(R.P[out[0]]);return out;}
/* spots: 지날 꾹자리들. 돌아오는 값 {pts, dist, order:[spot], skip:[spot]} */
function kmReco(spots){
  var G=kmGraph();if(!Object.keys(G).length)return null;
  var h=kmHome(),H=h&&kmNearest(G,h);if(!H)return null;
  var nodes=[H.k],use=[],skip=[];
  spots.forEach(function(s){var n=kmNearest(G,[s.lat,s.lng]);if(n&&n.d<=60){use.push(s);nodes.push(n.k);}else skip.push(s);});
  var R=nodes.map(function(k){return kmDijkstra(G,k);});
  var m=nodes.length,DM=[];
  for(var i=0;i<m;i++){DM.push([]);for(var j=0;j<m;j++)DM[i].push(R[i].D[nodes[j]]);}
  for(i=1;i<m;i++)if(DM[0][i]===undefined){skip.push(use[i-1]);}
  var idx=[];for(i=1;i<m;i++)if(DM[0][i]!==undefined)idx.push(i);
  if(!idx.length)return {pts:null,skip:skip,order:[]};
  var best=null,bd=Infinity;
  (function perm(a,k){if(k===a.length){var d=DM[0][a[0]];for(var t=1;t<a.length;t++)d+=DM[a[t-1]][a[t]];d+=DM[a[a.length-1]][0];
      if(d<bd){bd=d;best=a.slice();}return;}
    for(var t=k;t<a.length;t++){var c=a[k];a[k]=a[t];a[t]=c;perm(a,k+1);c=a[k];a[k]=a[t];a[t]=c;}})(idx,0);
  var seq=[0].concat(best,[0]),keys=[];
  for(var s=1;s<seq.length;s++){var part=kmPathTo(R[seq[s-1]],nodes[seq[s-1]],nodes[seq[s]]);if(!part)continue;keys=keys.concat(keys.length?part.slice(1):part);}
  var pts=keys.map(function(k){return [G[k].la,G[k].ln];});
  if(pts.length>2){var sm=[pts[0]];for(var q=1;q<pts.length;q++){var A=pts[q-1],B=pts[q];   // 모서리를 한 번 둥글린다
      sm.push([A[0]*.75+B[0]*.25,A[1]*.75+B[1]*.25],[A[0]*.25+B[0]*.75,A[1]*.25+B[1]*.75]);}sm.push(pts[pts.length-1]);pts=sm;}
  pts=pts.map(function(p){return [+p[0].toFixed(6),+p[1].toFixed(6)];});
  var d=0;for(q=1;q<pts.length;q++)d+=kmD(pts[q-1],pts[q]);
  return {pts:pts,dist:d,order:best.map(function(i){return use[i-1];}),skip:skip,home:[G[H.k].la,G[H.k].ln]};
}
/* 걷는 속도: 최근 산책의 가운데값(없으면 시속 3.4km). 개와 걷는 속도라 사람 걸음보다 느리다 */
function kmPace(){
  var v=S.walks.filter(function(w){return w.end&&w.dist>300&&w.end>w.start;}).slice(0,20).map(function(w){return w.dist/((w.end-w.start)/3600000);});
  if(v.length<3)return 3400;v.sort(function(a,b){return a-b;});return Math.max(2000,Math.min(5500,v[Math.floor(v.length/2)]));
}

/* ══ 강아지 사진(프로필) ══════════════════════════════════════════
   고른 사진은 가운데를 정사각으로 잘라 320px JPEG로 줄여 이 폰(S.dog.photo)에만 저장한다. 서버로 보내지 않는다. */
var KM_AVA={src:null,img:null};
function kmAvaImg(){var src=S.dog&&S.dog.photo;if(!src)return null;
  if(KM_AVA.src!==src){KM_AVA.src=src;KM_AVA.img=new Image();KM_AVA.img.onload=function(){[KMA,KMW,KML,KMR].forEach(function(k){if(k)k.draw();});};KM_AVA.img.src=src;}
  return KM_AVA.img.complete&&KM_AVA.img.naturalWidth?KM_AVA.img:null;}
function kmAvaHtml(){var p=S.dog&&S.dog.photo;
  return p?'<img src="'+p+'" alt="">':'<svg viewBox="0 0 24 18" aria-hidden="true"><ellipse cx="6" cy="11" rx="3.2" ry="4" transform="rotate(-22 6 11)" fill="#FF6B57"/><ellipse cx="12" cy="6.5" rx="3.2" ry="4" fill="#EFB02F"/><ellipse cx="18" cy="11" rx="3.2" ry="4" transform="rotate(22 18 11)" fill="#3B9DF5"/></svg>';}
function kmAvaRender(){
  var has=!!(S.dog&&S.dog.photo);
  ["hdr-ava","d-ava","ka-ava"].forEach(function(id){var el=$(id);if(el){el.innerHTML=kmAvaHtml();el.classList.toggle("ph",has);}});
  var b=$("d-photo-b"),x=$("d-photo-x");if(b)b.textContent=has?"사진 바꾸기":"사진 넣기";if(x)x.hidden=!has;
}
function kmPhotoPick(file){
  if(!file||!/^image\//.test(file.type||"image/")){toast("사진 파일을 골라 주세요");return;}
  var url=URL.createObjectURL(file),im=new Image();
  im.onload=function(){var s0=Math.min(im.naturalWidth,im.naturalHeight),c=document.createElement("canvas");c.width=c.height=320;
    c.getContext("2d").drawImage(im,(im.naturalWidth-s0)/2,(im.naturalHeight-s0)/2,s0,s0,0,0,320,320);URL.revokeObjectURL(url);
    if(!S.dog)S.dog={};var old=S.dog.photo;S.dog.photo=c.toDataURL("image/jpeg",.82);
    if(!save()){S.dog.photo=old;toast("저장 공간이 꽉 찼어요");return;}
    kmAvaRender();[KMA,KMW,KML,KMR].forEach(function(k){if(k)k.draw();});toast(kmJosa(kmDog(),"이","가")+" 사진을 넣었어요");};
  im.onerror=function(){URL.revokeObjectURL(url);toast("이 사진은 열 수 없어요");};
  im.src=url;
}
if($("d-file")){
  $("d-file").addEventListener("change",function(){var f=this.files&&this.files[0];this.value="";if(f)kmPhotoPick(f);});
  ["d-photo","d-photo-b"].forEach(function(id){$(id).addEventListener("click",function(){$("d-file").click();});});
  $("d-photo-x").addEventListener("click",function(){if(!S.dog||!S.dog.photo)return;if(!confirm("사진을 지울까요?"))return;delete S.dog.photo;save();kmAvaRender();
    [KMA,KMW,KML,KMR].forEach(function(k){if(k)k.draw();});toast("사진을 지웠어요");});
  $("hdr-ava").addEventListener("click",function(){openProfile();});
  kmAvaRender();
}

/* ══ 화면에 붙이기 ══════════════════════════════════════════════ */
function kmDog(){return (S.dog&&S.dog.name)||"우리 아이";}
function kmJosa(w,a,b){var c=w.charCodeAt(w.length-1);return w+((c>=0xAC00&&c<=0xD7A3&&(c-0xAC00)%28)?a:b);}
function kmRank(){return S.spots.slice().sort(function(a,b){return b.n-a.n||(a.first||0)-(b.first||0);});}
function kmStampSvg(s){
  var k=s*.92/90,cx=s/2,cy=s*.36,o="";
  KM_LOGO.forEach(function(q){var x=(cx+(q[0]-50)*k).toFixed(1),y=(cy+(q[1]-49)*k).toFixed(1);
    o+='<ellipse cx="'+x+'" cy="'+y+'" rx="'+(13*k).toFixed(1)+'" ry="'+(16*k).toFixed(1)+'" transform="rotate('+q[2]+' '+x+' '+y+')" fill="currentColor"/>';});
  return '<svg class="km-st" width="'+s+'" height="'+Math.round(s*.72)+'" viewBox="0 0 '+s+' '+(s*.72).toFixed(1)+'" aria-hidden="true">'+o+'</svg>';
}
function kmDotSvg(k,s){var c=k==="poop"?[KMC.coral,-22]:[KMC.sun,0];
  return '<svg width="'+s+'" height="'+s+'" viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="10" cy="10" rx="6.5" ry="8.2" transform="rotate('+c[1]+' 10 10)" fill="'+c[0]+'"/></svg>';}
function kmAgo(t){if(!t)return "";var d=Math.floor((Date.now()-t)/864e5);return d<=0?"오늘":d===1?"어제":d<30?d+"일 전":Math.floor(d/30)+"달 전";}

/* ── 산책 상세: 그날 걸은 길 ── */
var KMW=null;
function kmWalkShow(w){
  var box=$("w-map"),pts=w.pts||[];
  if(pts.length<2){box.hidden=true;return;}
  box.hidden=false;
  if(!KMW)KMW=new KMap(box,{coop:true,th:kmTheme(w.start)});
  KMW.theme(kmTheme(w.start));                     // 그 산책을 한 계절과 시간대 색
  function at(a){return (a||[]).filter(function(k){return k.lat!=null;});}
  var ks=at(w.kkuks),t1=(w.end||w.start)+60000;
  var stamps=ks.map(function(k,i){var sp=kmSpotNear([k.lat,k.lng],10);
    return {la:k.lat,ln:k.lng,w:24,neu:!!(sp&&sp.first>=w.start&&sp.first<=t1),id:"k"+i};});
  var marks=at(w.sniffs).map(function(k){return {la:k.lat,ln:k.lng,k:"sniff"};}).concat(at(w.poops).map(function(k){return {la:k.lat,ln:k.lng,k:"poop"};}));
  var bub=(w.nk>=0.05&&w.na)?{la:w.na[0],ln:w.na[1],t:"처음 걸은 길 "+w.nk.toFixed(2)+"km"}:null;
  KMW.set({fog:true,trail:pts,trailK:1.15,marks:marks,stamps:stamps,start:pts[0],bubble:bub});
  KMW.fit(pts,{top:58,bottom:54,left:30,right:30});
  box.setAttribute("role","img");box.setAttribute("aria-label","이날 걸은 길 지도. "+(w.dist/1000).toFixed(2)+"km, 꾹 "+(w.kkuks||[]).length+"번");
  KMW.ui.innerHTML='<span class="km-chip">걸은 곳만 안개가 걷혀요</span>'+
    '<div class="km-leg"><span>'+kmStampSvg(18)+'꾹 '+(w.kkuks||[]).length+'</span>'+
    (w.sniffs?'<span>'+kmDotSvg("sniff",13)+'킁킁 '+w.sniffs.length+'</span>':'')+
    '<span>'+kmDotSvg("poop",13)+'똥 '+(w.poops||[]).length+'</span></div>';
}

/* ── 기록 › 꾹·똥: {이름} 산책 동네 ── */
var KMA=null,KMA_SEL=null,KMA_ALL=false;
function kmAreaRender(){
  if(!$("km-area"))return;
  var R=kmRank(),nm=kmDog();
  $("ka-title").textContent=nm+" 산책 동네";
  var any=S.walks.some(function(w){return w.pts&&w.pts.length>1;})||S.spots.length>0;
  $("ka-empty").hidden=any;$("ka-body").hidden=!any;
  if(!any)return;
  var C=kmCleared(),wk=0,now=Date.now();
  S.walks.forEach(function(w){if(w.nk&&now-w.start<7*864e5)wk+=w.nk;});
  function cell(v,u,k){return '<div class="s"><div class="v">'+v+(u?'<small>'+u+'</small>':'')+'</div><div class="k">'+k+'</div></div>';}
  $("ka-stats").innerHTML=cell(C?C.pct:"-",C?"%":"","안개 걷힌 동네")+cell(wk.toFixed(2),"km","이번 주 새 길")+cell(S.spots.length,"곳","꾹자리");
  var show=KMA_ALL?R:R.slice(0,3);
  $("ka-rank").innerHTML=!R.length?'<div class="empty">꾹을 기록하면 꾹자리가 생겨요</div>':
    show.map(function(s,i){var id=kmSpotId(s);
      return '<button type="button" class="km-row'+(KMA_SEL===id?' on':'')+'" data-sid="'+id+'">'+
        '<span class="km-rk">'+(i+1)+'</span>'+kmStampSvg(24)+'<b>'+esc(kmSpotName(s))+'</b>'+
        '<span class="km-cnt">'+s.n+'<small>번</small></span></button>';}).join("")+
    (R.length>3?'<button type="button" class="km-more" id="ka-more">'+(KMA_ALL?'접기':'꾹자리 '+R.length+'곳 다 보기')+'</button>':'');
  $("ka-reco").hidden=!kmHome();
  $("ka-reco-t").textContent="추천 길 만들기";
  $("ka-note").textContent="동네는 산책을 가장 많이 시작한 곳에서 1km 안이에요. 새 길은 처음 걸은 길만 셉니다.";
  kmAreaPickUI();
  if($("lv-poop").classList.contains("on"))kmAreaMap();
}
function kmAreaMap(){
  var box=$("ka-map");if(!box||$("ka-body").hidden)return;
  if(!KMA){KMA=new KMap(box,{coop:true,onPick:kmAreaPick,onIdle:function(k){kmAutoName(k.map);}});KM.onNames=kmAreaRender;}
  KMA.theme(kmTheme());
  var R=kmRank(),now=Date.now(),last=S.walks.filter(function(w){return w.pts&&w.pts.length>1;})[0];
  KMA.set({fog:true,trail:last?last.pts:null,trailK:.85,cluster:true,sel:KMA_SEL,
    stamps:R.map(function(s,i){return {la:s.lat,ln:s.lng,n:s.n,rank:i<3?i+1:null,neu:now-(s.first||0)<7*864e5,id:kmSpotId(s)};})});
  var sig=S.spots.length+"/"+S.walks.length;
  if(KMA.sig!==sig){KMA.sig=sig;
    var f=R.map(function(s){return [s.lat,s.lng];});if(last)f=f.concat(last.pts);
    if(!f.length){var h=kmHome();if(h)f=[h];}
    KMA.fit(f,{top:30,bottom:30,left:26,right:26});}
  box.setAttribute("role","img");box.setAttribute("aria-label",kmDog()+" 산책 동네 지도. 꾹자리 "+R.length+"곳, 순위는 아래 목록에 있어요");
}
function kmAreaPick(id){
  KMA_SEL=(id==null||id===KMA_SEL)?null:id;
  kmAreaPickUI();
  Array.prototype.forEach.call(document.querySelectorAll("#ka-rank .km-row"),function(b){b.classList.toggle("on",+b.dataset.sid===KMA_SEL);});
  if(KMA){KMA.d.sel=KMA_SEL;KMA.draw();}
}
function kmAreaPickUI(){
  var el=$("ka-pick"),s=KMA_SEL==null?null:S.spots.filter(function(x){return kmSpotId(x)===KMA_SEL;})[0];
  if(!s){el.hidden=true;KMA_SEL=null;return;}
  el.hidden=false;
  el.innerHTML='<div class="t"><b>'+esc(kmSpotName(s))+'</b><span>'+s.n+'번 마킹 · 처음 '+kmAgo(s.first)+' · 마지막 '+kmAgo(s.last)+'</span></div>'+
    '<button type="button" id="ka-ren">이름 바꾸기</button>';
}
$("ka-rank").addEventListener("click",function(e){
  var m=e.target.closest("#ka-more");if(m){KMA_ALL=!KMA_ALL;kmAreaRender();return;}
  var b=e.target.closest("[data-sid]");if(!b)return;
  var id=+b.dataset.sid,s=S.spots.filter(function(x){return kmSpotId(x)===id;})[0];if(!s)return;
  KMA_SEL=null;kmAreaPick(id);
  if(KMA)KMA.go(s.lat,s.lng,KMA.map?Math.max(16.4,KMA.map.getZoom()):null);
  $("ka-map").scrollIntoView({block:"nearest",behavior:KM_RM?"auto":"smooth"});
});
$("ka-pick").addEventListener("click",function(e){
  if(!e.target.closest("#ka-ren"))return;
  var s=S.spots.filter(function(x){return kmSpotId(x)===KMA_SEL;})[0];if(!s)return;
  var v=prompt("꾹자리 이름 (비우면 지도에서 찾은 이름)",s.nm||kmSpotName(s));
  if(v==null)return;v=v.trim().slice(0,14);
  if(v)s.nm=v;else delete s.nm;
  save();kmAreaRender();
});
$("ka-reco").addEventListener("click",function(){kmRecoOpen();});
$("logtab").addEventListener("click",function(e){var b=e.target.closest("button");if(b&&b.dataset.v==="poop")setTimeout(kmAreaMap,0);});

/* ══ 길 그물: 지도 조각의 길로 잇는다(폰 안, 서버 없음) ══════════════════
   큰길 옆은 비싸게, 인도와 공원, 강가는 싸게 매긴다. 봄부터 가을까지는 풀숲(비포장 흙길)을 비싸게(대한수의사회: 봄~가을 우거진 수풀 피하기).
   바닥 온도는 쓰지 않는다. 처음 가는 구간은 구름 칸으로 가려 파랗게 보여 준다. */
var KMN={f:{},p:{},w:{},G:null};
var KM_CLS={primary:"P",secondary:"P",tertiary:"T",minor:"M",service:"S",track:"K",path:"A"};
var KM_CF={P:2.3,T:1.7,M:1.25,S:1.3,K:1.15,F:0.9,C:1.0,A:1.0,X:1.3};
function kmNetCollect(map){
  var add=0;
  function lines(g){return g.type==="LineString"?[g.coordinates]:g.type==="MultiLineString"?g.coordinates:null;}
  function poly(f,kind){var g=f.geometry,ps=g.type==="Polygon"?[g.coordinates]:g.type==="MultiPolygon"?g.coordinates:null;if(!ps)return;
    ps.forEach(function(pg){var r=pg[0];if(!r||r.length<4)return;var k=kind+r.length+":"+r[0][0].toFixed(6)+","+r[0][1].toFixed(6);if(KMN.p[k])return;
      var bb=[180,90,-180,-90];r.forEach(function(q){if(q[0]<bb[0])bb[0]=q[0];if(q[1]<bb[1])bb[1]=q[1];if(q[0]>bb[2])bb[2]=q[0];if(q[1]>bb[3])bb[3]=q[1];});
      KMN.p[k]={k:kind,r:r,bb:bb};add++;});}
  try{
    map.querySourceFeatures("o",{sourceLayer:"transportation"}).forEach(function(f){
      var p=f.properties||{},c=KM_CLS[p["class"]];if(!c||p.brunnel==="tunnel")return;
      var sc=p.subclass||"";if(c==="A")c=(sc==="footway"||sc==="pedestrian")?"F":sc==="cycleway"?"C":sc==="steps"?"X":"A";
      var ls=lines(f.geometry);if(!ls)return;
      var js=JSON.stringify(ls),k=c+js.length+js.slice(0,48)+js.slice(-48);if(KMN.f[k])return;
      KMN.f[k]={c:c,u:(p["class"]==="track"||sc==="path"||sc==="bridleway"||p.surface==="unpaved")?1:0,b:p.brunnel==="bridge"?1:0,ls:ls};add++;});
    map.querySourceFeatures("o",{sourceLayer:"park"}).forEach(function(f){poly(f,"g");});
    map.querySourceFeatures("o",{sourceLayer:"landcover"}).forEach(function(f){var c=(f.properties||{})["class"];if(c==="wood"||c==="grass")poly(f,"g");});
    map.querySourceFeatures("o",{sourceLayer:"water"}).forEach(function(f){poly(f,"w");});
    map.querySourceFeatures("o",{sourceLayer:"waterway"}).forEach(function(f){(lines(f.geometry)||[]).forEach(function(l){
      if(l.length<2)return;var k="l"+l.length+":"+l[0][0].toFixed(6)+","+l[0][1].toFixed(6);if(!KMN.w[k]){KMN.w[k]=l;add++;}});});
  }catch(e){return -1;}
  if(add)KMN.G=null;
  return add;
}
function kmSegD(p,A,B){                            // p와 선분 AB 사이 거리(m). A, B는 {la,ln}
  var kx=Math.cos(p[0]*Math.PI/180)*111320,ky=110540;
  var ax=(A.ln-p[1])*kx,ay=(A.la-p[0])*ky,bx=(B.ln-p[1])*kx,by=(B.la-p[0])*ky,dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy,t=L?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/L)):0;
  return Math.hypot(ax+dx*t,ay+dy*t);
}
function kmInRing(la,ln,r){var c=false;for(var i=0,j=r.length-1;i<r.length;j=i++){var a=r[i],b=r[j];
  if(((a[1]>la)!==(b[1]>la))&&(ln<(b[0]-a[0])*(la-a[1])/(b[1]-a[1])+a[0]))c=!c;}return c;}
function kmNet(){
  if(KMN.G)return KMN.G;
  var N={},NK=[],SG=[],CA=0.0000135,CO=0.000017;   // 꼭짓점은 약 1.5m 칸으로 합친다
  function nk(ln,la){var k=Math.round(la/CA)+"_"+Math.round(ln/CO);if(!N[k]){N[k]={la:la,ln:ln,e:[]};NK.push(k);}return k;}
  function edge(a,b,c,u){var A=N[a],B=N[b],d=kmD([A.la,A.ln],[B.la,B.ln]);if(!(d>0))return;var e={t:b,d:d,c:c,u:u};A.e.push(e);B.e.push({t:a,d:d,c:c,u:u});return e;}
  for(var fk in KMN.f){var f=KMN.f[fk];f.ls.forEach(function(l){var pk=null;
    for(var i=0;i<l.length;i++){var q=nk(l[i][0],l[i][1]);if(pk&&pk!==q&&edge(pk,q,f.c,f.u))SG.push([pk,q,f.c,f.u,f.b]);pk=q;}});}
  NK.forEach(function(k){var q=k.split("_"),i=+q[0],j=+q[1];      // 옆 칸 꼭짓점(타일 경계에서 조금 어긋난 같은 점)
    for(var a=0;a<=1;a++)for(var b=-1;b<=1;b++){if(a===0&&b<1)continue;var k2=(i+a)+"_"+(j+b);if(N[k2])edge(k,k2,"F",0);}});
  var CL=0.0004,CN=0.0005,cell={};
  SG.forEach(function(s,ix){var A=N[s[0]],B=N[s[1]];
    for(var gi=Math.floor(Math.min(A.la,B.la)/CL);gi<=Math.floor(Math.max(A.la,B.la)/CL);gi++)
      for(var gj=Math.floor(Math.min(A.ln,B.ln)/CN);gj<=Math.floor(Math.max(A.ln,B.ln)/CN);gj++)(cell[gi+"_"+gj]=cell[gi+"_"+gj]||[]).push(ix);});
  var seen={},nx=0;                                 // 교차로: 꼭짓점을 같이 쓰지 않고 지나는 길(다리는 다리끼리)
  for(var ck in cell){var L=cell[ck];for(var x1=0;x1<L.length;x1++)for(var y1=x1+1;y1<L.length;y1++){
    var i1=L[x1],j1=L[y1],pk2=i1<j1?i1+","+j1:j1+","+i1;if(seen[pk2])continue;seen[pk2]=1;
    var s1=SG[i1],s2=SG[j1];if(s1[4]!==s2[4]||s1[0]===s2[0]||s1[0]===s2[1]||s1[1]===s2[0]||s1[1]===s2[1])continue;
    var p1=N[s1[0]],p2=N[s1[1]],p3=N[s2[0]],p4=N[s2[1]];
    var den=(p2.la-p1.la)*(p4.ln-p3.ln)-(p2.ln-p1.ln)*(p4.la-p3.la);if(Math.abs(den)<1e-16)continue;
    var t=((p3.la-p1.la)*(p4.ln-p3.ln)-(p3.ln-p1.ln)*(p4.la-p3.la))/den,w=((p3.la-p1.la)*(p2.ln-p1.ln)-(p3.ln-p1.ln)*(p2.la-p1.la))/den;
    if(t<=0||t>=1||w<=0||w>=1)continue;
    var jk="x"+(nx++);N[jk]={la:p1.la+(p2.la-p1.la)*t,ln:p1.ln+(p2.ln-p1.ln)*t,e:[]};NK.push(jk);
    edge(jk,s1[0],s1[2],s1[3]);edge(jk,s1[1],s1[2],s1[3]);edge(jk,s2[0],s2[2],s2[3]);edge(jk,s2[1],s2[2],s2[3]);}}
  NK.forEach(function(k){var n=N[k];if(n.e.length!==1||k.charAt(0)==="x")return;   // T자 길: 끝이 다른 길 한가운데 붙는 곳(6m 안)
    var best=null,bd=6;(cell[Math.floor(n.la/CL)+"_"+Math.floor(n.ln/CN)]||[]).forEach(function(ix){var sg=SG[ix];if(sg[0]===k||sg[1]===k)return;
      var dd=kmSegD([n.la,n.ln],N[sg[0]],N[sg[1]]);if(dd<bd){bd=dd;best=sg;}});
    if(best){edge(k,best[0],best[2],best[3]);edge(k,best[1],best[2],best[3]);}});
  // 공원·숲(g)과 물가(w)는 길 가운데 점으로 본다
  var PG={},PW={},GC=0.002,WC=0.0006;
  for(var pk in KMN.p){var P=KMN.p[pk];
    if(P.k==="g"){for(var a=Math.floor(P.bb[1]/GC);a<=Math.floor(P.bb[3]/GC);a++)for(var b=Math.floor(P.bb[0]/GC);b<=Math.floor(P.bb[2]/GC);b++)(PG[a+"_"+b]=PG[a+"_"+b]||[]).push(P);}
    else{for(var i=1;i<P.r.length;i++){var q0=P.r[i-1],q1=P.r[i];(PW[Math.floor(q0[1]/WC)+"_"+Math.floor(q0[0]/WC)]=PW[Math.floor(q0[1]/WC)+"_"+Math.floor(q0[0]/WC)]||[]).push([q0,q1]);}}}
  for(var wk in KMN.w){var l=KMN.w[wk];for(var i2=1;i2<l.length;i2++){var c0=Math.floor(l[i2-1][1]/WC)+"_"+Math.floor(l[i2-1][0]/WC);(PW[c0]=PW[c0]||[]).push([l[i2-1],l[i2]]);}}
  function green(la,ln){var L2=PG[Math.floor(la/GC)+"_"+Math.floor(ln/GC)];if(!L2)return 0;
    for(var i=0;i<L2.length;i++){var Q=L2[i];if(ln<Q.bb[0]||ln>Q.bb[2]||la<Q.bb[1]||la>Q.bb[3])continue;if(kmInRing(la,ln,Q.r))return 1;}return 0;}
  function water(la,ln){var gi=Math.floor(la/WC),gj=Math.floor(ln/WC);
    for(var a=-1;a<=1;a++)for(var b=-1;b<=1;b++){var L3=PW[(gi+a)+"_"+(gj+b)];if(!L3)continue;
      for(var i=0;i<L3.length;i++){var sg=L3[i];if(kmSegD([la,ln],{la:sg[0][1],ln:sg[0][0]},{la:sg[1][1],ln:sg[1][0]})<=45)return 1;}}return 0;}
  NK.forEach(function(k){var n=N[k];n.e.forEach(function(e){var m=N[e.t],la=(n.la+m.la)/2,ln=(n.ln+m.ln)/2;e.g=green(la,ln);e.w=water(la,ln);});});
  var comp={},best2=null;                            // 가장 큰 덩어리만 쓴다(떨어진 조각에 핀이 붙지 않게)
  NK.forEach(function(k){if(comp[k]!=null)return;var id=k,st=[k],c=[k];comp[k]=id;
    while(st.length){var u=st.pop();N[u].e.forEach(function(e){if(comp[e.t]==null){comp[e.t]=id;st.push(e.t);c.push(e.t);}});}
    if(!best2||c.length>best2.length)best2=c;});
  var big={};(best2||[]).forEach(function(k){big[k]=1;});
  KMN.G={N:N,K:best2||[],big:big};return KMN.G;
}
function kmSnap(G,p,max){var best=null,bd=max||150;G.K.forEach(function(k){var n=G.N[k],d=kmD(p,[n.la,n.ln]);if(d<bd){bd=d;best=k;}});return best;}
function kmCostFn(mode){
  var m=new Date().getMonth()+1,tick=m>=4&&m<=11,summer=m>=6&&m<=8,winter=m===12||m<=2;
  return function(e){var f=KM_CF[e.c]||1.2;
    if(mode==="short")f=Math.min(f,1.25);
    if(e.g)f*=mode==="green"?.55:.82;
    if(e.w)f*=mode==="green"?.6:.85;
    if(tick&&e.u)f*=1.35;                             // 봄~가을 풀숲
    if(summer&&e.g)f*=.92;                            // 여름엔 나무 그늘 쪽으로 조금
    if(winter&&(e.c==="P"||e.c==="T"))f*=1.12;        // 겨울엔 제설제 많은 큰길을 조금 더 피한다
    return e.d*f;};
}
function kmRun(G,src,cost,used){
  var D={},P={},H=[[0,src]];D[src]=0;
  function push(it){H.push(it);var i=H.length-1;while(i){var j=(i-1)>>1;if(H[j][0]<=H[i][0])break;var t=H[i];H[i]=H[j];H[j]=t;i=j;}}
  function pop(){var top=H[0],last=H.pop();if(H.length){H[0]=last;var i=0;for(;;){var l=2*i+1,r=l+1,m=i;
    if(l<H.length&&H[l][0]<H[m][0])m=l;if(r<H.length&&H[r][0]<H[m][0])m=r;if(m===i)break;var t=H[i];H[i]=H[m];H[m]=t;i=m;}}return top;}
  while(H.length){var t=pop(),d=t[0],u=t[1];if(d>D[u])continue;var E=G.N[u].e;
    for(var i=0;i<E.length;i++){var e=E[i],w=cost(e);if(used&&used[u+">"+e.t])w*=2.5;var nd=d+w;if(D[e.t]===undefined||nd<D[e.t]){D[e.t]=nd;P[e.t]=u;push([nd,e.t]);}}}
  return {D:D,P:P};
}
function kmLoop(G,keys,cost){                       // 집 → 지날 곳들 → 집. 돌아오는 길은 간 길을 덜 쓰게
  var seq=keys.concat([keys[0]]),path=[keys[0]],used={};
  for(var i=1;i<seq.length;i++){var R=kmRun(G,seq[i-1],cost,used),p=kmPathTo(R,seq[i-1],seq[i]);if(!p)return null;
    for(var j=1;j<p.length;j++){used[p[j-1]+">"+p[j]]=1;used[p[j]+">"+p[j-1]]=1;}path=path.concat(p.slice(1));}
  return path;
}
function kmWalked(la,ln){kmFogEnsure();var C=S.fog.c,i=Math.round(la/KM_DLA),j=Math.round(ln/KM_DLN);
  for(var a=-1;a<=1;a++)for(var b=-1;b<=1;b++)if(C[(i+a)+"_"+(j+b)])return true;return false;}
function kmPathInfo(G,path){
  var pts=[],nw=[0],o={dist:0,big:0,park:0,water:0,fresh:0};
  for(var i=0;i<path.length;i++){var n=G.N[path[i]];pts.push([+n.la.toFixed(6),+n.ln.toFixed(6)]);if(!i)continue;
    var m=G.N[path[i-1]],e=null;for(var k=0;k<m.e.length;k++)if(m.e[k].t===path[i]){e=m.e[k];break;}
    var d=e?e.d:kmD(pts[i-1],pts[i]);o.dist+=d;
    if(e&&(e.c==="P"||e.c==="T"))o.big+=d;if(e&&e.g)o.park+=d;else if(e&&e.w)o.water+=d;
    var fr=!kmWalked((n.la+m.la)/2,(n.ln+m.ln)/2);nw.push(fr?1:0);if(fr)o.fresh+=d;}
  o.pts=pts;o.nw=nw;o.keys=path;return o;
}
function kmOrder(home,wps){                         // 지날 곳 순서: 직선 거리로 가장 짧게(3곳까지라 전부 따져 본다)
  if(wps.length<2)return wps;var best=null,bd=Infinity;
  (function perm(a,k){if(k===a.length){var d=kmD(home,a[0].p);for(var t=1;t<a.length;t++)d+=kmD(a[t-1].p,a[t].p);d+=kmD(a[a.length-1].p,home);
      if(d<bd){bd=d;best=a.slice();}return;}
    for(var t=k;t<a.length;t++){var c=a[k];a[k]=a[t];a[t]=c;perm(a,k+1);c=a[k];a[k]=a[t];a[t]=c;}})(wps.slice(),0);
  return best;
}
function kmTypical(){var v=S.walks.filter(function(w){return w.dist>300;}).slice(0,20).map(function(w){return w.dist;});
  if(v.length<3)return 1600;v.sort(function(a,b){return a-b;});return Math.max(800,Math.min(4000,v[Math.floor(v.length/2)]));}
function kmGreenPoint(G,h,typ){                     // 공원이나 강가: 집에서 알맞게 떨어진 곳(강가가 있으면 강가 먼저)
  var r=Math.max(250,Math.min(700,typ*.32)),best=null,bs=Infinity;
  G.K.forEach(function(k){var n=G.N[k],gw=0;n.e.forEach(function(e){if(e.c==="P"||e.c==="T")return;if(e.w&&(e.c==="F"||e.c==="C"||e.c==="A"))gw=2;else if(e.g&&gw<1)gw=1;});if(!gw)return;
    var d=kmD(h,[n.la,n.ln]);if(d<200||d>Math.max(500,typ*.45))return;var sc=Math.abs(d-r)-(gw===2?120:0);if(sc<bs){bs=sc;best={p:[n.la,n.ln],w:gw===2};}});
  return best;
}
function kmNewPoint(G,h,typ){                       // 새 길: 집 둘레 8방향 가운데 구름이 가장 많이 남은 쪽
  var r=Math.max(250,Math.min(650,typ*.3)),best=null,bs=Infinity,ky=110540,kx=Math.cos(h[0]*Math.PI/180)*111320;
  for(var a=0;a<8;a++){var ang=a*Math.PI/4,t=[h[0]+Math.sin(ang)*r/ky,h[1]+Math.cos(ang)*r/kx],k=kmSnap(G,t,160);if(!k)continue;
    var n=G.N[k],cnt=0,tot=0;for(var dy=-5;dy<=5;dy++)for(var dx=-5;dx<=5;dx++){tot++;if(kmWalked(n.la+dy*KM_DLA,n.ln+dx*KM_DLN))cnt++;}
    var sc=cnt/tot;if(sc<bs){bs=sc;best=[n.la,n.ln];}}
  return bs<.55?best:null;
}
function kmOverlap(a,b){var A={};a.forEach(function(k){A[k]=1;});var c=0;b.forEach(function(k){if(A[k])c++;});return c/Math.max(1,b.length);}
/* 추천 길 1~3개. pins가 있으면 그 자리를 지나는 세 가지(큰길 피하기, 공원 강가, 가장 짧게), 없으면 단골, 공원 강가, 새 길 */
function kmRecos(pins){
  var G=kmNet();if(!G||G.K.length<20)return null;
  var h=kmHome();if(!h)return null;var H=kmSnap(G,h,250);if(!H)return null;
  var out=[],typ=kmTypical(),miss=[];
  function add(kind,title,wps,mode){
    var ord=kmOrder(h,wps),keys=[H];
    for(var i=0;i<ord.length;i++){var k=kmSnap(G,ord[i].p,150);if(!k){if(miss.indexOf(ord[i])<0)miss.push(ord[i]);return;}keys.push(k);}
    var path=kmLoop(G,keys,kmCostFn(mode));if(!path||path.length<3)return;
    var inf=kmPathInfo(G,path);if(inf.dist<150)return;
    if(kind==="green"&&inf.park+inf.water<inf.dist*.15)return;      // 이름만 공원 강가인 길은 내지 않는다
    for(var j=0;j<out.length;j++)if(kmOverlap(out[j].keys,inf.keys)>.85)return;
    inf.kind=kind;inf.title=title;inf.wps=ord;inf.home=[G.N[H].la,G.N[H].ln];out.push(inf);
  }
  if(pins.length){
    var wp=pins.map(function(p){return {p:[p.la,p.ln],sid:p.sid};});
    add("safe","큰길 피하는 길",wp,"safe");add("green","공원과 강가로 가는 길",wp,"green");add("short","가장 짧은 길",wp,"short");
  } else {
    var R=kmRank().slice(0,3);
    if(R.length)add("spots","단골 꾹자리 길",R.map(function(s){return {p:[s.lat,s.lng],sid:kmSpotId(s)};}),"safe");
    var gp=kmGreenPoint(G,h,typ);if(gp)add("green",gp.w?"강가 따라 걷는 길":"공원 지나는 길",[{p:gp.p}],"green");
    var np=kmNewPoint(G,h,typ);if(np)add("new","새 길 한 바퀴",[{p:np}],"safe");
  }
  var st=S.recoStat||{},od={spots:0,safe:0,green:1,new:2,short:2};   // 자주 고른 종류를 앞으로
  out.sort(function(a,b){return ((st[b.kind]||0)-(st[a.kind]||0))||(od[a.kind]-od[b.kind]);});
  out.miss=miss;return out;
}

/* ── 추천 길 화면: 열면 길 3개, 지도를 누르면 핀(3개까지), 끌면 옮기고 누르면 지운다 ── */
var KMR=null,KMR_PINS=[],KMR_LIST=[],KMR_SEL=0,KMR_WAIT=false;
function kmRecoOpen(){
  KMR_PINS=[];KMR_LIST=[];KMR_SEL=0;
  $("krsheet").classList.add("on");
  if(!KMR)KMR=new KMap($("r-map"),{onTap:kmRecoTap,onDrag:kmRecoDrag,onIdle:function(k){if(KMR_WAIT&&k.map&&k.map.getZoom()>=13.9){KMR_WAIT=false;kmRecoBuild();}},
    onFlat:function(){if(KMR_WAIT){KMR_WAIT=false;kmRecoBuild();}}});
  KMR.theme(kmTheme());KMR.fitted=false;
  var h=kmHome();
  $("r-cards").innerHTML='<div class="km-wait">길을 찾는 중</div>';$("r-note").textContent="";
  $("kr-save").disabled=true;$("r-go").disabled=true;
  KMR.set({fog:true,home:h,stamps:kmRank().map(function(s){return {la:s.lat,ln:s.lng,n:s.n,id:kmSpotId(s)};}),cluster:false,pins:KMR_PINS});
  KMR.ui.innerHTML='<span class="km-chip" id="r-hint">지도를 누르면 핀이 찍혀요</span>';
  if(KMR.mode==="flat"||!h){kmRecoBuild();return;}
  KMR_WAIT=true;KMR.view(h,14.2);                  // 집 둘레 지도 조각(14단계)을 받은 뒤 길을 만든다
  setTimeout(function(){if(KMR_WAIT){KMR_WAIT=false;kmRecoBuild();}},9000);
}
function kmRecoBuild(){
  if(KMR&&KMR.map)kmNetCollect(KMR.map);
  var list=null;try{list=kmRecos(KMR_PINS);}catch(e){list=null;}
  KMR.fallback=false;
  if(!list||!list.length){                         // 지도 길을 못 받으면 걸어 본 길로만(단골 꾹자리)
    var R=kmRank().slice(0,3),old=(!KMR_PINS.length&&R.length)?kmReco(R):null;
    list=[];if(old&&old.pts)list.push({kind:"spots",title:"단골 꾹자리 길",pts:old.pts,nw:null,dist:old.dist,big:0,park:0,water:0,fresh:0,home:old.home,
      wps:old.order.map(function(s){return {p:[s.lat,s.lng],sid:kmSpotId(s)};})});
    KMR.fallback=true;
  }
  KMR_LIST=list;KMR_SEL=0;kmRecoShow(true);
}
function kmRecoShow(refit){
  var L=KMR_LIST,cur=L[KMR_SEL],pace=kmPace();
  function km(m){return (m/1000).toFixed(m<1000?2:1);}
  $("r-cards").innerHTML=L.length?L.map(function(r,i){
    var chips=[];
    chips.push(r.big>30?'<span class="c warn">큰길 옆 '+(Math.round(r.big/10)*10)+'m</span>':'<span class="c">큰길 없음</span>');
    if(r.fresh>50)chips.push('<span class="c new">처음 가는 길 '+km(r.fresh)+'km</span>');
    else if(r.water>50)chips.push('<span class="c">강가 '+km(r.water)+'km</span>');
    else if(r.park>50)chips.push('<span class="c">공원 '+km(r.park)+'km</span>');
    return '<button type="button" class="km-card'+(i===KMR_SEL?' on':'')+'" role="radio" aria-checked="'+(i===KMR_SEL)+'" data-i="'+i+'">'+
      '<b>'+r.title+'</b><span class="m"><em>'+km(r.dist)+'</em>km <em>'+Math.max(1,Math.round(r.dist/pace*60))+'</em>분</span>'+
      '<span class="cs">'+chips.join("")+'</span></button>';}).join(""):
    '<div class="km-wait">'+(KMR_PINS.length?"핀까지 이어지는 길을 못 찾았어요. 핀을 길 가까이 옮겨 주세요.":"경로가 남은 산책이 아직 없어요. 한 번 걸으면 길을 만들 수 있어요.")+'</div>';
  var m=new Date().getMonth()+1,note=KMR_PINS.length?"핀은 끌어서 옮기고 누르면 지워져요. 파란 구간은 처음 가는 길이에요.":
    "지도를 누르면 가고 싶은 곳에 핀이 찍혀요. 큰길 옆은 피하고 인도와 공원, 강가를 먼저 골라요.";
  if(m>=4&&m<=11)note+=" 봄부터 가을까지는 풀숲 길을 줄여요.";
  if(m===12||m<=2)note+=" 겨울엔 제설제가 있을 수 있으니 산책 뒤 발을 닦아 주세요.";
  if(KMR.fallback)note="지도를 받지 못해 "+kmJosa(kmDog(),"이","가")+" 걸어 본 길로만 이었어요.";
  if(L.miss&&L.miss.length)note="핀 "+L.miss.length+"곳은 길에서 너무 멀어 뺐어요. "+note;
  $("r-note").textContent=note;
  var h=$("r-hint");if(h)h.textContent=KMR_PINS.length?"끌면 옮기고 누르면 지워요":"지도를 누르면 핀이 찍혀요";
  $("kr-save").disabled=!cur;$("r-go").disabled=!cur||!!W;
  var stamps=kmRank().map(function(s){return {la:s.lat,ln:s.lng,n:s.n,id:kmSpotId(s)};});
  KMR.set({fog:true,guide:cur?cur.pts:null,guideNew:cur?cur.nw:null,alts:L.filter(function(r,i){return i!==KMR_SEL;}).map(function(r){return r.pts;}),
    home:cur?cur.home:kmHome(),stamps:stamps,cluster:false,pins:KMR_PINS});
  if(refit&&cur)KMR.fit(cur.pts.concat(KMR_PINS.map(function(p){return [p.la,p.ln];})),{top:44,bottom:30,left:28,right:28});
}
function kmRecoTap(t){
  if(t.pin>=0){KMR_PINS.splice(t.pin,1);toast("핀을 지웠어요");kmRecoBuild();return;}
  var s=t.id!=null?S.spots.filter(function(x){return kmSpotId(x)===t.id;})[0]:null;
  if(s){var j=-1;KMR_PINS.forEach(function(p,i){if(p.sid===t.id)j=i;});
    if(j>=0){KMR_PINS.splice(j,1);kmRecoBuild();return;}}
  if(KMR_PINS.length>=3){toast("핀은 3개까지 찍을 수 있어요");return;}
  if(s)KMR_PINS.push({la:s.lat,ln:s.lng,sid:kmSpotId(s)});
  else if(t.ll)KMR_PINS.push({la:t.ll[0],ln:t.ll[1]});
  else return;
  kmRecoBuild();
}
function kmRecoDrag(i,ll){var p=KMR_PINS[i];if(!p)return;if(p.sid!=null){var s=S.spots.filter(function(x){return kmSpotId(x)===p.sid;})[0];
  if(!s||kmD([s.lat,s.lng],ll)>15)delete p.sid;}kmRecoBuild();}
function kmRecoSave(){
  var r=KMR_LIST[KMR_SEL];if(!r||!r.pts)return null;
  var base=r.title,used={},nm=base;
  S.routes.forEach(function(x){used[x.name]=1;});
  if(used[nm]){for(var i=2;i<50;i++)if(!used[base+" "+i]){nm=base+" "+i;break;}}
  var id=Date.now();
  S.routes.unshift({id:id,name:nm,pts:r.pts,segs:segsOf(r.pts),dist:pathLen(r.pts),from:null,kind:r.kind,
    via:(r.wps||[]).filter(function(w){return w.sid!=null;}).map(function(w){return w.sid;})});
  S.routes=S.routes.slice(0,12);
  S.recoStat=S.recoStat||{};S.recoStat[r.kind]=(S.recoStat[r.kind]||0)+1;   // 고른 종류를 세어 다음에 먼저 보여 준다(폰 안)
  if(!save()){S.routes.shift();S.recoStat[r.kind]--;toast("저장 공간이 꽉 찼어요");return null;}
  renderRoutes();return id;
}
$("r-cards").addEventListener("click",function(e){var b=e.target.closest("[data-i]");if(!b)return;KMR_SEL=+b.dataset.i;kmRecoShow(true);});
$("kr-save").addEventListener("click",function(){var id=kmRecoSave();if(id==null)return;$("krsheet").classList.remove("on");toast("꾹꾹로에 저장했어요");});
$("r-go").addEventListener("click",function(){var id=kmRecoSave();if(id==null)return;$("krsheet").classList.remove("on");startWalk(id);});
$("kr-close").addEventListener("click",function(){$("krsheet").classList.remove("on");});
$("krsheet").addEventListener("click",function(e){if(e.target===this)this.classList.remove("on");});

/* ── 산책 중: 꾹게이지 | 지도 (기본은 꾹게이지, 추천 길로 나가면 지도) ── */
var KML=null,KML_T=null,KML_SIG="";
function kmLiveRoute(){if(!W||W.route==null)return null;var r=S.routes.filter(function(x){return x.id===W.route;})[0];return r&&r.pts&&r.pts.length>1?r:null;}
function kmLiveStart(){
  var r=kmLiveRoute();
  if(KML)KML.fitted=false;
  kmLiveMode(!!r);
  clearInterval(KML_T);KML_T=setInterval(kmLiveTick,1000);kmLiveTick();
}
function kmLiveStop(){clearInterval(KML_T);KML_T=null;kmLiveMode(false);if(KML)KML.fitted=false;}
function kmLiveMode(on){
  var v=$("v-walk");v.classList.toggle("km-on",on);
  Array.prototype.forEach.call(document.querySelectorAll("#wseg button"),function(b){b.setAttribute("aria-pressed",String((b.dataset.v==="m")===on));});
  if(on){if(!KML){KML=new KMap($("w-livemap"),{onPick:null});KML.ui.innerHTML='<button type="button" class="km-me" id="km-me" aria-label="내 위치로">'+
      '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0"/><path d="M12 12m-8 0a8 8 0 1 0 16 0a8 8 0 1 0 -16 0"/><path d="M12 2l0 2"/><path d="M12 20l0 2"/><path d="M20 12l2 0"/><path d="M2 12l2 0"/></svg></button>';
      $("km-me").addEventListener("click",function(){KML.follow=true;KML.ui.classList.remove("moved");var h=kmLiveHere();if(h)KML.go(h[0],h[1],Math.max(16.5,KML.map?KML.map.getZoom():17));});}
    KML_SIG="";kmLiveTick();}
}
function kmLiveHere(){if(!W)return null;if(lastFix&&Date.now()-lastFix.t<120000)return [lastFix.lat,lastFix.lng];var p=W.pts||[];return p.length?p[p.length-1]:null;}
function kmLiveTick(){
  if(!W){kmLiveStop();return;}
  var g=$("gnum").textContent;if($("wseg-g").textContent!==g)$("wseg-g").textContent=g;
  if(!KML||!$("v-walk").classList.contains("km-on")||document.hidden||$("pocket").classList.contains("on"))return;   // 주머니 모드와 꺼진 화면에선 지도를 쉰다
  var th=kmTheme();if(!KML.th||KML.th.key!==th.key)KML.theme(th);   // 산책하다 저녁에서 밤이 되면 지도도 바뀐다
  var pts=W.pts||[],here=kmLiveHere(),r=kmLiveRoute();
  var lc=function(a){a=a||[];var n=0;for(var i=0;i<a.length;i++)if(a[i].lat!=null)n++;return a.length+"."+n;};var sig=pts.length+"/"+lc(W.kkuks)+"/"+lc(W.poops)+"/"+lc(W.sniffs)+"/"+S.spots.length;
  if(sig!==KML_SIG){KML_SIG=sig;
    function vis(s){return (W.kkuks||[]).some(function(k){return k.lat!=null&&kmD([k.lat,k.lng],[s.lat,s.lng])<=10;});}
    var bub=null;
    if(r&&r.via&&here){var nx=null;r.via.some(function(id){var s=S.spots.filter(function(x){return kmSpotId(x)===id;})[0];if(s&&!vis(s)){nx=s;return true;}return false;});
      if(nx){var dm=kmD(here,[nx.lat,nx.lng]);bub={la:nx.lat,ln:nx.lng,t:"다음 꾹자리 "+kmSpotName(nx)+" "+(dm<1000?Math.round(dm/10)*10+"m":(dm/1000).toFixed(1)+"km")};}}
    function at(a,k){return (a||[]).filter(function(q){return q.lat!=null;}).map(function(q){return {la:q.lat,ln:q.lng,k:k};});}
    KML.set({fog:true,extra:pts,trail:pts,trailK:1.1,guide:r?r.pts:null,guideDash:true,cluster:true,here:here,bubble:bub,
      marks:at(W.sniffs,"sniff").concat(at(W.poops,"poop")),
      stamps:S.spots.map(function(s){return {la:s.lat,ln:s.lng,n:s.n,check:vis(s),id:kmSpotId(s)};})});
  } else if(here){KML.d.here=here;KML.draw();}
  if(!KML.fitted&&KML.mode!=="wait"){
    if(r){var f=r.pts.slice();if(here)f.push(here);KML.fit(f,48);KML.fitted=true;}
    else if(here||pts.length){var c=here||pts[pts.length-1];KML.fit([[c[0]-.0021,c[1]-.0026],[c[0]+.0021,c[1]+.0026]],0);KML.fitted=true;}   // 내 둘레 약 450m
  } else if(here&&KML.follow&&KML.map&&KML.w){
    var p=KML.map.project([here[1],here[0]]);
    if(Math.abs(p.x-KML.w/2)>KML.w*.28||Math.abs(p.y-KML.h/2)>KML.h*.28)KML.go(here[0],here[1]);
  }
}
$("wseg").addEventListener("click",function(e){var b=e.target.closest("button");if(!b)return;kmLiveMode(b.dataset.v==="m");});
