/* 꾹꾹이 아이폰 앱 만들기 준비. 깃허브 액션의 맥(macOS)에서 돈다. 안드로이드 빌드는 이 파일을 쓰지 않는다.
   (이 폴더를 native/ 밖에 둔 까닭: native/가 바뀌면 안드로이드 APK 빌드가 자동으로 돌기 때문이다)
   native 폴더에서 두 단계로 부른다.
     node ../ios-kit/patch-ios.js pre [demo]    npx cap add ios 전에
       ① 웹 파일을 www에 담는다(아이폰 앱은 화면 파일을 앱 안에 넣는다. 서버 주소로 받아 오지 않는다)
       ② 아이폰용 설정(capacitor.config.json)을 쓴다. 이 파일은 빌드 기계 안에서만 바뀌고 저장소에는 올리지 않는다
       ③ 위치 플러그인을 손본다(Capacitor 8과 맞추기, 위치 권한은 '앱을 사용하는 동안'만 묻기)
     node ../ios-kit/patch-ios.js post          npx cap add ios 뒤에
       ④ Info.plist(권한을 왜 쓰는지 적는 글, 화면을 꺼도 위치 받기, 세로 고정, 한국어, 암호화 신고)
       ⑤ 프로젝트 설정(아이폰 전용, 버전, 빌드 번호, 개인정보 파일 넣기)
       ⑥ 아이콘과 시작 화면
   바꿀 곳을 못 찾으면 바로 멈춘다(빌드가 조용히 엉뚱한 앱을 만들지 않게). */
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');            // 저장소 맨 위(웹 파일이 있는 곳)
const ROOT = path.join(REPO, 'native');             // Capacitor 프로젝트
const KIT = __dirname;                              // ios-kit/
const IOS = path.join(ROOT, 'ios', 'App');
// 아이폰 앱의 버전과 빌드 번호 앞자리는 ios-kit/version.json에서 읽는다. 안드로이드(native/app-version.json)와 나눠 두어
// 두 앱을 따로 낼 수 있다. 같은 판을 낼 때는 두 파일의 name을 같게 맞춘다
const ver = JSON.parse(fs.readFileSync(path.join(KIT, 'version.json'), 'utf8'));
const SITE = 'https://062-sibi.github.io/kkukkkukkkuk/';

function write(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
function edit(p, fn) {
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error('바꿀 곳을 못 찾음: ' + p);
  fs.writeFileSync(p, after);
}
function mustReplace(s, from, to, label, times) {
  const n = typeof from === 'string' ? s.split(from).length - 1 : (s.match(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g')) || []).length;
  if (!n) throw new Error('못 찾음: ' + label);
  if (times && n !== times) throw new Error('개수가 다름(' + n + '번, 기대 ' + times + '번): ' + label);
  return typeof from === 'string' ? s.split(from).join(to) : s.replace(new RegExp(from.source, from.flags.includes('g') ? from.flags : from.flags + 'g'), to);
}
const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const DEMO_MARK = 'KKUK_IOS_DEMO';

/* ───────────────────────── pre ───────────────────────── */
function pre() {
  // ① 웹 파일을 www에 담는다
  const WWW = path.join(ROOT, 'www');
  const need = ['index.html'];
  const nice = ['hackle.min.js', 'hackle-LICENSE.txt', 'maplibre-gl.mjs', 'maplibre-gl-worker.mjs', 'maplibre-LICENSE.txt', 'u2netp.onnx', 'icon-192.png', 'apple-touch-icon.png'];
  for (const f of need.concat(nice)) {
    const src = path.join(REPO, f);
    if (!fs.existsSync(src)) { if (need.includes(f)) throw new Error('웹 파일이 없음: ' + f); console.log('  (없어서 건너뜀) ' + f); continue; }
    fs.copyFileSync(src, path.join(WWW, f));
  }
  const html = fs.readFileSync(path.join(WWW, 'index.html'), 'utf8');
  // 아이폰 갈래가 든 웹 코드(0.5.0부터)인지 확인한다. 아니면 아이폰에서 "localhost가 위치를 쓰려 합니다" 창이 뜨고 받기 띠가 보일 수 있다
  for (const mark of ['var IOS=false;', 'function iosLoc(', '.ios .only-ios{', 'if(!IOS&&(+i.build||0)<APK_NEED)']) {
    if (!html.includes(mark)) throw new Error('웹 코드에 아이폰 준비가 없음(0.5.0 이상이어야 함): ' + mark);
  }
  const fo = path.join(WWW, 'offline.html'); if (fs.existsSync(fo)) fs.unlinkSync(fo);   // 안드로이드용(서버 주소로 받을 때의 오류 화면). 아이폰 앱에는 넣지 않는다
  if (html.includes(DEMO_MARK)) throw new Error('웹 코드에 시험용 표시가 들어 있음');
  if (process.argv[3] === 'demo') {
    // 시뮬레이터 확인용: 가짜 기록을 넣고 화면을 차례로 넘기는 스크립트를 맨 앞에 끼운다. 출시용 빌드에는 넣지 않는다
    const demo = fs.readFileSync(path.join(KIT, 'demo.js'), 'utf8');
    if (!demo.includes(DEMO_MARK)) throw new Error('demo.js에 표시가 없음');
    const at = html.indexOf('<head>'); if (at < 0) throw new Error('<head>를 못 찾음');
    fs.writeFileSync(path.join(WWW, 'index.html'), html.slice(0, at + 6) + '\n<script>' + demo + '</script>' + html.slice(at + 6));
    console.log('✓ 시뮬레이터 확인용 웹 파일(가짜 기록과 화면 넘기기)을 www에 담음');
  } else console.log('✓ 웹 파일을 www에 담음: index.html ' + Math.round(html.length / 1024) + 'KB');

  // ② 아이폰용 설정: 서버 주소를 지우고(앱 안 파일로 돈다) 아이폰에 쓰는 플러그인만 넣는다
  const cp = path.join(ROOT, 'capacitor.config.json');
  const cfg = JSON.parse(fs.readFileSync(cp, 'utf8'));
  delete cfg.server; delete cfg.android;
  if (cfg.plugins) { delete cfg.plugins.LocalNotifications; if (!Object.keys(cfg.plugins).length) delete cfg.plugins; }
  cfg.ios = {
    contentInset: 'never',            // 안전 영역은 웹 코드가 직접 띄운다(env(safe-area-inset-*))
    allowsLinkPreview: false,
    zoomEnabled: false,
    includePlugins: ['@capacitor-community/background-geolocation', '@capacitor/app', '@capacitor/filesystem', '@capacitor/share'],
  };
  if (cfg.appId !== 'app.padd.walk') throw new Error('앱 아이디가 다름: ' + cfg.appId);
  write(cp, JSON.stringify(cfg, null, 2) + '\n');
  console.log('✓ 아이폰용 capacitor.config.json(서버 주소 없음, 플러그인 4개)');

  // ③ 위치 플러그인
  const BG = path.join(ROOT, 'node_modules', '@capacitor-community', 'background-geolocation');
  const pkgSwift = path.join(BG, 'Package.swift');
  let ps = fs.readFileSync(pkgSwift, 'utf8');
  if (/from:\s*"7\.0\.0"/.test(ps)) {
    // 1.2.26은 Capacitor 7까지만 받게 적혀 있다. 1.3.1이 고친 줄과 똑같이 넓힌다(스위프트 코드는 두 판이 같다)
    ps = ps.replace(/from:\s*"7\.0\.0"/, '"7.0.0"..<"99.0.0"'); fs.writeFileSync(pkgSwift, ps);
    console.log('✓ 위치 플러그인 Package.swift: Capacitor 8 받게 넓힘');
  } else if (/"7\.0\.0"\.\.<"99\.0\.0"/.test(ps) || /from:\s*"8\./.test(ps)) console.log('· 위치 플러그인 Package.swift: 이미 Capacitor 8을 받음');
  else throw new Error('위치 플러그인 Package.swift 모양이 예상과 다름');
  const plug = path.join(BG, 'ios', 'Plugin', 'Swift', 'Plugin.swift');
  let sw = fs.readFileSync(plug, 'utf8');
  if (sw.includes('requestAlwaysAuthorization')) {
    // 꾹꾹이는 산책을 시작해야만 위치를 받는다. '항상 허용'은 필요 없으니 묻지 않는다.
    // '앱을 사용하는 동안' 권한과 화면을 꺼도 위치 받기(Info.plist)만으로, 화면에서 시작한 기록은 화면을 꺼도 이어진다(화면 위에 위치 표시가 뜬다).
    sw = mustReplace(sw, /return \(\s*background\s*\?\s*manager\.requestAlwaysAuthorization\(\)\s*:\s*manager\.requestWhenInUseAuthorization\(\)\s*\)/,
      'return manager.requestWhenInUseAuthorization()', '위치 권한 묻는 곳', 1);
    sw = mustReplace(sw, /if \(\s*background && status == \.authorizedWhenInUse\s*\) \{\s*\/\/ Attempt to escalate\.\s*manager\.requestAlwaysAuthorization\(\)\s*\}/,
      '// 꾹꾹이: 항상 허용으로 올려 달라고 묻지 않는다', '항상 허용으로 올리는 곳', 1);
    if (sw.includes('requestAlwaysAuthorization')) throw new Error('항상 허용을 묻는 코드가 남아 있음');
    fs.writeFileSync(plug, sw);
    console.log("✓ 위치 플러그인: 권한은 '앱을 사용하는 동안'만 묻게 함");
  } else console.log("· 위치 플러그인: 이미 '앱을 사용하는 동안'만 묻음");
  if (!sw.includes('manager.allowsBackgroundLocationUpdates = background')) throw new Error('위치 플러그인 코드가 예상과 다름(화면 꺼짐 처리)');
}

/* ───────────────────────── post ───────────────────────── */
const PURPOSE = {
  NSLocationWhenInUseUsageDescription: '산책하는 동안 걸은 길과 거리를 기록하고, 지금 있는 곳의 바닥 온도를 계산하는 데 위치를 씁니다. 산책을 시작하면 화면을 꺼도 끝낼 때까지 기록이 이어집니다. 걸은 길은 이 아이폰에만 저장됩니다.',
  NSLocationAlwaysAndWhenInUseUsageDescription: '산책하는 동안 걸은 길과 거리를 기록하고, 지금 있는 곳의 바닥 온도를 계산하는 데 위치를 씁니다. 산책을 시작하면 화면을 꺼도 끝낼 때까지 기록이 이어집니다. 걸은 길은 이 아이폰에만 저장됩니다.',
  NSCameraUsageDescription: '산책 기록 카드에 넣을 사진과 강아지 프로필 사진을 찍는 데 카메라를 씁니다. 사진은 이 아이폰에만 저장됩니다.',
  NSPhotoLibraryAddUsageDescription: '만든 산책 기록 카드를 사진 앱에 저장할 때 씁니다.',
};
/* 개인정보 파일(PrivacyInfo.xcprivacy)을 웹 코드에 맞춰 만든다. 앱스토어 등록 때 적는 '앱이 수집하는 정보' 답과 같아야 한다.
   - 정확한 위치(앱 기능): 날씨와 동네 이름을 받으려고 소수점 셋째 자리로 줄인 좌표를 외부 서비스에 보낸다. 걸은 길은 보내지 않는다.
   - 기기 번호와 앱 사용 기록(분석): 아이폰 앱에서 사용 통계를 켠 경우(웹 코드의 HK_IOS=true)에만 넣는다.
   - 사용자 신원과 잇지 않고(계정이 없다) 광고 추적에 쓰지 않는다.
   - 파일 시각(C617.1): 기록 내보내기와 카드 저장에 쓰는 파일 플러그인이 요구한다.
   값 이름은 애플 문서에 적힌 그대로다(2026-11-10에 확인). 지어낸 이름을 쓰면 Xcode의 개인정보 보고서가 틀어진다. */
function privacyManifest(html) {
  const on = html.includes('var HK_IOS=true;'), off = html.includes('var HK_IOS=false;');
  if (on === off) throw new Error('웹 코드에서 아이폰 사용 통계 설정(HK_IOS)을 못 읽음');
  const types = [['NSPrivacyCollectedDataTypePreciseLocation', 'NSPrivacyCollectedDataTypePurposeAppFunctionality']];
  if (on) types.push(['NSPrivacyCollectedDataTypeDeviceID', 'NSPrivacyCollectedDataTypePurposeAnalytics'],
    ['NSPrivacyCollectedDataTypeProductInteraction', 'NSPrivacyCollectedDataTypePurposeAnalytics']);
  const T = '\t';
  const one = t => T + T + '<dict>\n' +
    T + T + T + '<key>NSPrivacyCollectedDataType</key>\n' + T + T + T + '<string>' + t[0] + '</string>\n' +
    T + T + T + '<key>NSPrivacyCollectedDataTypeLinked</key>\n' + T + T + T + '<false/>\n' +
    T + T + T + '<key>NSPrivacyCollectedDataTypeTracking</key>\n' + T + T + T + '<false/>\n' +
    T + T + T + '<key>NSPrivacyCollectedDataTypePurposes</key>\n' + T + T + T + '<array>\n' + T + T + T + T + '<string>' + t[1] + '</string>\n' + T + T + T + '</array>\n' +
    T + T + '</dict>\n';
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
    '<plist version="1.0">\n<dict>\n' +
    T + '<key>NSPrivacyTracking</key>\n' + T + '<false/>\n' +
    T + '<key>NSPrivacyTrackingDomains</key>\n' + T + '<array/>\n' +
    T + '<key>NSPrivacyCollectedDataTypes</key>\n' + T + '<array>\n' + types.map(one).join('') + T + '</array>\n' +
    T + '<key>NSPrivacyAccessedAPITypes</key>\n' + T + '<array>\n' +
    T + T + '<dict>\n' +
    T + T + T + '<key>NSPrivacyAccessedAPIType</key>\n' + T + T + T + '<string>NSPrivacyAccessedAPICategoryFileTimestamp</string>\n' +
    T + T + T + '<key>NSPrivacyAccessedAPITypeReasons</key>\n' + T + T + T + '<array>\n' + T + T + T + T + '<string>C617.1</string>\n' + T + T + T + '</array>\n' +
    T + T + '</dict>\n' +
    T + '</array>\n' +
    '</dict>\n</plist>\n';
}
function post() {
  if (!fs.existsSync(path.join(IOS, 'App.xcodeproj', 'project.pbxproj'))) throw new Error('ios 폴더가 없음. npx cap add ios를 먼저 돌린다');
  if (!fs.existsSync(path.join(IOS, 'App', 'public', 'index.html'))) throw new Error('앱 안에 index.html이 없음');
  const build = String(process.env.IOS_BUILD || ver.code);
  if (!/^\d+(\.\d+){0,2}$/.test(build)) throw new Error('빌드 번호 모양이 다름: ' + build);
  if (!/^\d+(\.\d+){0,2}$/.test(ver.name)) throw new Error('버전 모양이 다름: ' + ver.name);
  const team = (process.env.APPLE_TEAM_ID || '').trim();
  if (team && !/^[A-Z0-9]{10}$/.test(team)) throw new Error('팀 아이디 모양이 다름(영문 대문자와 숫자 10자)');

  // ④ Info.plist
  edit(path.join(IOS, 'App', 'Info.plist'), s => {
    for (const k of Object.keys(PURPOSE).concat(['UIBackgroundModes', 'ITSAppUsesNonExemptEncryption', 'CFBundleLocalizations'])) {
      if (s.includes('<key>' + k + '</key>')) throw new Error('Info.plist에 이미 있음: ' + k);
    }
    // 가로 화면을 빼고 세로만(아이폰). 아이패드용 줄은 그대로 둔다(아이폰 전용 앱이라 쓰이지 않는다)
    s = mustReplace(s, /(<key>UISupportedInterfaceOrientations<\/key>\s*<array>)[\s\S]*?(<\/array>)/,
      '$1\n\t\t<string>UIInterfaceOrientationPortrait</string>\n\t$2', '화면 방향', 1);
    s = mustReplace(s, /(<key>CFBundleDevelopmentRegion<\/key>\s*<string>)en(<\/string>)/, '$1ko$2', '기본 언어', 1);
    let add = '';
    for (const k of Object.keys(PURPOSE)) add += '\t<key>' + k + '</key>\n\t<string>' + xml(PURPOSE[k]) + '</string>\n';
    add += '\t<key>UIBackgroundModes</key>\n\t<array>\n\t\t<string>location</string>\n\t</array>\n';
    add += '\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n';      // HTTPS만 쓴다(수출 신고 면제). 올릴 때마다 묻지 않게
    add += '\t<key>CFBundleLocalizations</key>\n\t<array>\n\t\t<string>ko</string>\n\t</array>\n';
    return mustReplace(s, /<\/dict>\s*<\/plist>\s*$/, add + '</dict>\n</plist>\n', 'Info.plist 끝', 1);
  });
  console.log('✓ Info.plist: 권한 글 4개, 화면 꺼도 위치 받기, 세로 고정, 한국어, 암호화 신고');

  // ⑤ 프로젝트 설정
  const FR = '4B4B50524956000000000001', BF = '4B4B50524956000000000002';   // 개인정보 파일의 참조 번호(16진수 24자)
  edit(path.join(IOS, 'App.xcodeproj', 'project.pbxproj'), s => {
    if (s.includes('PrivacyInfo.xcprivacy')) throw new Error('프로젝트에 PrivacyInfo.xcprivacy가 이미 있음');
    s = mustReplace(s, 'TARGETED_DEVICE_FAMILY = "1,2";', 'TARGETED_DEVICE_FAMILY = 1;', '아이폰 전용', 2);
    s = mustReplace(s, /MARKETING_VERSION = [^;]+;/, 'MARKETING_VERSION = ' + ver.name + ';', '버전', 2);
    s = mustReplace(s, /CURRENT_PROJECT_VERSION = [^;]+;/, 'CURRENT_PROJECT_VERSION = ' + build + ';', '빌드 번호', 2);
    s = mustReplace(s, 'PRODUCT_BUNDLE_IDENTIFIER = app.padd.walk;', 'PRODUCT_BUNDLE_IDENTIFIER = app.padd.walk;' + (team ? '\n\t\t\t\tDEVELOPMENT_TEAM = ' + team + ';' : ''), '앱 아이디', 2);
    s = mustReplace(s, 'developmentRegion = en;', 'developmentRegion = ko;', '프로젝트 기본 언어', 1);
    s = mustReplace(s, /knownRegions = \(\s*en,\s*Base,\s*\);/, 'knownRegions = (\n\t\t\t\ten,\n\t\t\t\tko,\n\t\t\t\tBase,\n\t\t\t);', '프로젝트 언어 목록', 1);
    // 개인정보 파일(PrivacyInfo.xcprivacy)을 앱에 넣는다: 파일 참조, 빌드 파일, 폴더, 리소스 단계 네 군데
    s = mustReplace(s, '/* Begin PBXBuildFile section */\n',
      '/* Begin PBXBuildFile section */\n\t\t' + BF + ' /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = ' + FR + ' /* PrivacyInfo.xcprivacy */; };\n', '빌드 파일 목록', 1);
    s = mustReplace(s, '/* Begin PBXFileReference section */\n',
      '/* Begin PBXFileReference section */\n\t\t' + FR + ' /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n', '파일 참조 목록', 1);
    s = mustReplace(s, /(\/\* Info\.plist \*\/,\n)(\s*)([0-9A-F]{24} \/\* config\.xml \*\/,)/,
      '$1$2' + FR + ' /* PrivacyInfo.xcprivacy */,\n$2$3', 'App 폴더 목록', 1);
    s = mustReplace(s, /([0-9A-F]{24} \/\* config\.xml in Resources \*\/,\n)/,
      '$1\t\t\t\t' + BF + ' /* PrivacyInfo.xcprivacy in Resources */,\n', '리소스 단계', 1);
    return s;
  });
  const pm = privacyManifest(fs.readFileSync(path.join(IOS, 'App', 'public', 'index.html'), 'utf8'));
  write(path.join(IOS, 'App', 'PrivacyInfo.xcprivacy'), pm);
  console.log('✓ 프로젝트: 아이폰 전용, 버전 ' + ver.name + ', 빌드 ' + build + (team ? ', 팀 아이디 넣음' : ', 팀 아이디 없음(서명 없는 빌드)') +
    ', 개인정보 파일 넣음(위치' + (pm.includes('NSPrivacyCollectedDataTypeDeviceID') ? ', 기기 번호, 앱 사용 기록' : '만. 사용 통계는 꺼짐') + ')');

  // ⑥ 아이콘과 시작 화면
  const AS = path.join(IOS, 'App', 'Assets.xcassets');
  const icon = path.join(AS, 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  if (!fs.existsSync(icon)) throw new Error('아이콘 자리를 못 찾음');
  fs.copyFileSync(path.join(KIT, 'AppIcon-1024.png'), icon);
  const SP = path.join(AS, 'Splash.imageset');
  for (const f of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
    if (!fs.existsSync(path.join(SP, f))) throw new Error('시작 화면 자리를 못 찾음: ' + f);
    fs.copyFileSync(path.join(KIT, 'splash-light-2732.png'), path.join(SP, f));
    fs.copyFileSync(path.join(KIT, 'splash-dark-2732.png'), path.join(SP, f.replace('splash-', 'splash-dark-')));
  }
  const img = (file, scale, dark) => Object.assign({ idiom: 'universal', filename: file, scale: scale }, dark ? { appearances: [{ appearance: 'luminosity', value: 'dark' }] } : {});
  write(path.join(SP, 'Contents.json'), JSON.stringify({
    images: [
      img('splash-2732x2732-2.png', '1x'), img('splash-2732x2732-1.png', '2x'), img('splash-2732x2732.png', '3x'),
      img('splash-dark-2732x2732-2.png', '1x', true), img('splash-dark-2732x2732-1.png', '2x', true), img('splash-dark-2732x2732.png', '3x', true),
    ],
    info: { version: 1, author: 'xcode' },
  }, null, 2) + '\n');
  console.log('✓ 아이콘(1024)과 시작 화면(밝은 것, 어두운 것)');

  // 앱 안에 든 설정에 서버 주소가 없는지 마지막으로 본다
  const inner = JSON.parse(fs.readFileSync(path.join(IOS, 'App', 'capacitor.config.json'), 'utf8'));
  if (inner.server && inner.server.url) throw new Error('아이폰 앱 설정에 서버 주소가 남아 있음(pre 단계를 먼저 돌린다)');
  if (!fs.existsSync(path.join(IOS, 'App', 'public', 'index.html'))) throw new Error('앱 안에 index.html이 없음');
  const pk = fs.readFileSync(path.join(IOS, 'CapApp-SPM', 'Package.swift'), 'utf8');
  if (/LocalNotifications/.test(pk)) throw new Error('아이폰 앱에 알림 플러그인이 들어 있음(설정의 includePlugins 확인)');
  for (const p of ['CapacitorCommunityBackgroundGeolocation', 'CapacitorApp', 'CapacitorFilesystem', 'CapacitorShare']) if (!pk.includes(p)) throw new Error('플러그인이 빠짐: ' + p);
  console.log('✓ 확인: 앱 안 파일로 돎(서버 주소 없음), 플러그인 4개');
}

const mode = process.argv[2];
if (mode === 'pre') pre();
else if (mode === 'post') post();
else if (mode === 'check-release') {
  // 올리기 직전: 앱 안에 든 웹 파일이 출시용인지(시험용 스크립트가 없는지) 본다
  const inner = fs.readFileSync(path.join(IOS, 'App', 'public', 'index.html'), 'utf8');
  if (inner.includes(DEMO_MARK)) throw new Error('앱 안 웹 파일에 시험용 스크립트가 들어 있음. pre를 다시 돌리고 npx cap copy ios를 한다');
  if (inner !== fs.readFileSync(path.join(REPO, 'index.html'), 'utf8')) throw new Error('앱 안 웹 파일이 저장소의 index.html과 다름');
  if (fs.readFileSync(path.join(IOS, 'App', 'PrivacyInfo.xcprivacy'), 'utf8') !== privacyManifest(inner)) throw new Error('개인정보 파일이 웹 코드의 사용 통계 설정과 다름. post를 다시 돌린다');
  console.log('✓ 앱 안 웹 파일은 저장소의 index.html과 같음(시험용 스크립트 없음), 개인정보 파일도 웹 코드와 맞음');
}
else { console.error('쓰는 법: node ../ios-kit/patch-ios.js pre [demo] | post | check-release'); process.exit(2); }
