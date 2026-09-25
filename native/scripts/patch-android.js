/* npx cap add android 직후에 돈다. 기본 템플릿을 꾹꾹이 앱으로 바꾼다.
   - 아이콘(점 세 개) · 알림줄 아이콘 · 스플래시
   - 백그라운드 위치 알림 문구/채널 이름
   - 버전 번호, 릴리스 서명 설정
   바꿀 곳을 못 찾으면 바로 멈춘다(빌드가 조용히 엉뚱한 앱을 만들지 않게). */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const APP = path.join(ROOT, 'android', 'app');
const RES = path.join(APP, 'src', 'main', 'res');
const ver = JSON.parse(fs.readFileSync(path.join(ROOT, 'app-version.json'), 'utf8'));
const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'res', 'legacy_icons.json'), 'utf8'));

function write(p, c) { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c); }
function edit(p, fn) {
  const before = fs.readFileSync(p, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error('바꿀 곳을 못 찾음: ' + p);
  fs.writeFileSync(p, after);
}
function mustReplace(s, from, to, label) {
  if (typeof from === 'string' ? !s.includes(from) : !from.test(s)) throw new Error('못 찾음: ' + label);
  return s.replace(from, to);
}

/* 로고: 발바닥에서 큰 패드를 뺀 점 세 개 (100×100 설계 좌표) */
const DOTS = [
  { cx: 22, cy: 58, rot: -22, color: '#FF6B57' },
  { cx: 50, cy: 40, rot: 0, color: '#EFB02F' },
  { cx: 78, cy: 58, rot: 22, color: '#3B9DF5' },
];
const ell = (d, fill) => {
  const p = `<path android:fillColor="${fill}" android:pathData="M${d.cx - 13},${d.cy}a13,16 0 1,0 26,0a13,16 0 1,0 -26,0z"/>`;
  return d.rot ? `<group android:rotation="${d.rot}" android:pivotX="${d.cx}" android:pivotY="${d.cy}">${p}</group>` : p;
};
function vector(sizeDp, viewport, scale, mono) {
  // 로고 중심(50,49)을 viewport 가운데로
  const tx = (viewport / 2 - 50 * scale).toFixed(2), ty = (viewport / 2 - 49 * scale).toFixed(2);
  return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${sizeDp}dp" android:height="${sizeDp}dp"
    android:viewportWidth="${viewport}" android:viewportHeight="${viewport}">
  <group android:translateX="${tx}" android:translateY="${ty}" android:scaleX="${scale}" android:scaleY="${scale}">
    ${DOTS.map(d => ell(d, mono || d.color)).join('\n    ')}
  </group>
</vector>
`;
}

// 1) 적응형 아이콘: 앞(점 세 개) + 뒤(잉크색)
write(path.join(RES, 'drawable', 'ic_launcher_fg.xml'), vector(108, 108, 0.58));
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_fg"/>
</adaptive-icon>
`;
write(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
write(path.join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);
write(path.join(RES, 'values', 'ic_launcher_background.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#17100A</color>\n</resources>\n');
// 안드로이드 7 이하용 PNG
for (const [dn, [sq, rd]] of Object.entries(legacy)) {
  write(path.join(RES, `mipmap-${dn}`, 'ic_launcher.png'), Buffer.from(sq, 'base64'));
  write(path.join(RES, `mipmap-${dn}`, 'ic_launcher_round.png'), Buffer.from(rd, 'base64'));
}

// 2) 알림줄 아이콘(흰색 단색) — 산책 중 알림에 쓴다
write(path.join(RES, 'drawable', 'ic_tracking.xml'), vector(24, 24, 0.26, '#FFFFFFFF'));

// 3) 스플래시: 잉크색 바탕 + 가운데 점 세 개. 템플릿의 splash.png는 전부 지운다(같은 이름 충돌)
write(path.join(RES, 'values', 'padd_colors.xml'),
  '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="padd_ink">#17100A</color>\n</resources>\n');
write(path.join(RES, 'drawable', 'ic_splash_mark.xml'), vector(112, 100, 1));
for (const d of fs.readdirSync(RES)) {
  if (!d.startsWith('drawable')) continue;
  const f = path.join(RES, d, 'splash.png');
  if (fs.existsSync(f)) fs.unlinkSync(f);
}
write(path.join(RES, 'drawable', 'splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/padd_ink"/>
    <item android:drawable="@drawable/ic_splash_mark" android:gravity="center"
        android:width="112dp" android:height="112dp"/>
</layer-list>
`);
edit(path.join(RES, 'values', 'styles.xml'), s => mustReplace(s,
  '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">',
  '<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n        <item name="windowSplashScreenBackground">@color/padd_ink</item>',
  'splash style'));

// 4) 백그라운드 위치 알림: 채널 이름·아이콘·색
edit(path.join(RES, 'values', 'strings.xml'), s => mustReplace(s, '</resources>',
  '    <string name="capacitor_background_geolocation_notification_channel_name">산책 기록</string>\n' +
  '    <string name="capacitor_background_geolocation_notification_icon">drawable/ic_tracking</string>\n' +
  '    <string name="capacitor_background_geolocation_notification_color">#EFB02F</string>\n</resources>',
  'strings.xml'));

// 5) 버전 · 릴리스 서명 (키는 워크플로가 저장소 비밀값에서 풀어 app/release.p12로 둔다)
edit(path.join(APP, 'build.gradle'), s => {
  s = mustReplace(s, /versionCode \d+/, `versionCode ${ver.code}`, 'versionCode');
  s = mustReplace(s, /versionName "[^"]*"/, `versionName "${ver.name}"`, 'versionName');
  s = mustReplace(s, '    buildTypes {', `    signingConfigs {
        release {
            storeFile file("release.p12")
            storeType "pkcs12"
            storePassword System.getenv("KS_PASS")
            keyAlias "padd"
            keyPassword System.getenv("KS_PASS")
        }
    }
    buildTypes {`, 'buildTypes');
  s = mustReplace(s, /(buildTypes \{\s*release \{\s*)minifyEnabled false/,
    '$1minifyEnabled false\n            signingConfig signingConfigs.release', 'release signing');
  return s;
});

console.log(`✓ 꾹꾹이 안드로이드 패치 완료 · v${ver.name} (${ver.code})`);
