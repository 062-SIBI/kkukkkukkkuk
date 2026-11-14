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

// 5) 카메라: PWC 기록 인증샷을 앱 안에서 찍는다(라이브 카메라 · getUserMedia).
//    권한을 적어 두지 않으면 웹뷰가 카메라를 바로 거절한다. 카메라 없는 기기도 설치는 되게 required=false
edit(path.join(APP, 'src', 'main', 'AndroidManifest.xml'), s => mustReplace(s,
  '<uses-permission android:name="android.permission.INTERNET" />',
  '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />\n    <uses-feature android:name="android.hardware.camera" android:required="false" />',
  'camera permission'));

// 6) 홈 화면 위젯: 산책 중엔 위에 km·시간, 아래에 로고 점 세 개 모양으로 똥 | 킁킁 | 꾹. 산책 안 할 땐 로고가 "산책 시작".
//    세 버튼(똥·킁킁·꾹)은 앱을 열지 않는다. 누른 시각을 큐에 쌓아 두면, 화면이 꺼져 있어도
//    앱이 GPS 점을 받을 때마다 큐를 가져가 그 시각과 마지막 위치로 기록한다.
//    킁킁은 오래 맡는 곳에서 한 번 누른다(10/26 결정: GPS 멈춤은 신호등과 구분이 안 됨). 숫자는 누른 곳 수.
{
  const javaRoot = path.join(APP, 'src', 'main', 'java');
  const found = [];
  (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p); else if (f === 'MainActivity.java') found.push(p); } })(javaRoot);
  if (found.length !== 1) throw new Error('MainActivity.java를 못 찾음: ' + found.length);
  const mainPath = found[0], pkgDir = path.dirname(mainPath);
  const pkg = (fs.readFileSync(mainPath, 'utf8').match(/^package\s+([\w.]+);/m) || [])[1];
  if (!pkg) throw new Error('패키지 이름을 못 찾음');

  write(path.join(pkgDir, 'PaddWidget.java'), `package ${pkg};

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.TypedValue;
import android.view.View;
import android.widget.RemoteViews;
import android.widget.Toast;
import org.json.JSONArray;
import org.json.JSONObject;

/** 꾹꾹이 홈 화면 위젯. 상태는 앱(PaddWidgetPlugin)이 SharedPreferences에 써 준다. */
public class PaddWidget extends AppWidgetProvider {
    static final String ACT_PEE = "${pkg}.WIDGET_PEE";
    static final String ACT_POOP = "${pkg}.WIDGET_POOP";
    static final String ACT_SNIFF = "${pkg}.WIDGET_SNIFF";

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("padd_widget", Context.MODE_PRIVATE);
    }

    /** 위젯에서 누른 것을 큐에 쌓는다. 화면의 숫자는 앱이 받기 전에도 바로 올린다 */
    static synchronized void push(Context c, String type) {
        SharedPreferences p = prefs(c);
        try {
            JSONArray q = new JSONArray(p.getString("queue", "[]"));
            JSONObject ev = new JSONObject();
            ev.put("type", type);
            ev.put("t", System.currentTimeMillis());
            q.put(ev);
            String key = "pee".equals(type) ? "pee" : "sniff".equals(type) ? "sniffN" : "poop";
            p.edit().putString("queue", q.toString()).putInt(key, p.getInt(key, 0) + 1).apply();
        } catch (Exception ignored) {
        }
    }

    /** 앱이 가져갈 큐. 가져가면 비운다 */
    static synchronized JSONArray takeQueue(Context c) {
        SharedPreferences p = prefs(c);
        JSONArray q;
        try {
            q = new JSONArray(p.getString("queue", "[]"));
        } catch (Exception e) {
            q = new JSONArray();
        }
        p.edit().putString("queue", "[]").apply();
        return q;
    }

    static void refreshAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, PaddWidget.class));
        if (ids == null) return;
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    /** 위젯이 낮은가(휴대폰 글자 크기까지 따져). 낮으면 버튼은 아이콘 없이 숫자만, 바탕은 알약, 대기 화면 로고는 작게 */
    static boolean compact(Context c, AppWidgetManager m, int id) {
        Bundle o = m.getAppWidgetOptions(id);
        int h = o == null ? 0 : o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0);
        float fs = c.getResources().getConfiguration().fontScale;
        return h > 0 && h < 117 + 33 * fs;
    }

    static RemoteViews build(Context c, AppWidgetManager m, int id) {
        SharedPreferences p = prefs(c);
        boolean walking = p.getBoolean("walking", false);
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.padd_widget);
        v.setViewVisibility(R.id.pw_walk, walking ? View.VISIBLE : View.GONE);
        v.setViewVisibility(R.id.pw_idle, walking ? View.GONE : View.VISIBLE);
        boolean small = compact(c, m, id);
        int icon = small ? View.GONE : View.VISIBLE;
        v.setViewVisibility(R.id.pw_poop_ic, icon);
        v.setViewVisibility(R.id.pw_sniff_ic, icon);
        v.setViewVisibility(R.id.pw_pee_ic, icon);
        v.setViewVisibility(R.id.pw_logo, small ? View.GONE : View.VISIBLE);
        v.setViewVisibility(R.id.pw_logo_s, small ? View.VISIBLE : View.GONE);
        if (small) {
            v.setImageViewResource(R.id.pw_poop_bg, R.drawable.padd_pill_coral);
            v.setImageViewResource(R.id.pw_sniff_bg, R.drawable.padd_pill_yellow);
            v.setImageViewResource(R.id.pw_pee_bg, R.drawable.padd_pill_blue);
            v.setTextViewTextSize(R.id.pw_poop_n, TypedValue.COMPLEX_UNIT_DIP, 20);
            v.setTextViewTextSize(R.id.pw_sniff_n, TypedValue.COMPLEX_UNIT_DIP, 20);
            v.setTextViewTextSize(R.id.pw_pee_n, TypedValue.COMPLEX_UNIT_DIP, 20);
        }
        if (walking) {
            long startedAt = p.getLong("startedAt", System.currentTimeMillis());
            long base = SystemClock.elapsedRealtime() - Math.max(0L, System.currentTimeMillis() - startedAt);
            v.setChronometer(R.id.pw_time, base, null, true);
            v.setTextViewText(R.id.pw_km, p.getString("km", "0.00"));
            v.setTextViewText(R.id.pw_pee_n, String.valueOf(p.getInt("pee", 0)));
            v.setTextViewText(R.id.pw_sniff_n, String.valueOf(p.getInt("sniffN", 0)));
            v.setTextViewText(R.id.pw_poop_n, String.valueOf(p.getInt("poop", 0)));
        } else {
            v.setChronometer(R.id.pw_time, SystemClock.elapsedRealtime(), null, false);
        }
        v.setOnClickPendingIntent(R.id.pw_pee, broadcast(c, ACT_PEE, 11));
        v.setOnClickPendingIntent(R.id.pw_poop, broadcast(c, ACT_POOP, 12));
        v.setOnClickPendingIntent(R.id.pw_info, openApp(c, null, 13));
        v.setOnClickPendingIntent(R.id.pw_start, openApp(c, "start", 14));
        v.setOnClickPendingIntent(R.id.pw_sniff, broadcast(c, ACT_SNIFF, 15));
        return v;
    }

    static PendingIntent broadcast(Context c, String action, int code) {
        Intent i = new Intent(c, PaddWidget.class).setAction(action);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** 앱 열기. action이 있으면 앱이 열리자마자 그 일을 한다(지금은 "산책 시작"만) */
    static PendingIntent openApp(Context c, String action, int code) {
        Intent i = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        if (action != null) i.putExtra("padd_action", action);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, build(c, m, id));
    }

    /** 위젯 크기를 바꾸면 다시 그린다(낮아지면 아이콘을 뺌) */
    @Override
    public void onAppWidgetOptionsChanged(Context c, AppWidgetManager m, int id, Bundle o) {
        m.updateAppWidget(id, build(c, m, id));
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        String a = intent.getAction();
        if (!ACT_PEE.equals(a) && !ACT_POOP.equals(a) && !ACT_SNIFF.equals(a)) return;
        if (!prefs(c).getBoolean("walking", false)) {
            Toast.makeText(c, "산책을 시작하면 기록돼요", Toast.LENGTH_SHORT).show();
            refreshAll(c);
            return;
        }
        String type = ACT_PEE.equals(a) ? "pee" : ACT_SNIFF.equals(a) ? "sniff" : "poop";
        push(c, type);
        refreshAll(c);
        Toast.makeText(c, "pee".equals(type) ? "꾹 기록" : "sniff".equals(type) ? "킁킁 기록" : "똥 기록", Toast.LENGTH_SHORT).show();
        try {
            Vibrator vib = (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
            if (vib != null) {
                if (Build.VERSION.SDK_INT >= 26) vib.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE));
                else vib.vibrate(30);
            }
        } catch (Exception ignored) {
        }
    }
}
`);

  write(path.join(pkgDir, 'PaddWidgetPlugin.java'), `package ${pkg};

import android.content.Intent;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** 앱(웹) ↔ 위젯 다리. update: 위젯에 보일 값, drain: 위젯에서 누른 것 가져가기, consumeLaunch: 위젯으로 연 이유 */
@CapacitorPlugin(name = "PaddWidget")
public class PaddWidgetPlugin extends Plugin {
    @Override
    public void load() {
        if (getActivity() != null) grab(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (grab(intent)) notifyListeners("launch", new JSObject(), true);
    }

    private boolean grab(Intent i) {
        if (i == null) return false;
        String a = i.getStringExtra("padd_action");
        if (a == null) return false;
        i.removeExtra("padd_action");
        PaddWidget.prefs(getContext()).edit().putString("launch", a).apply();
        return true;
    }

    /** 숫자는 opt*로 읽는다. call.getLong은 작은 수(Integer로 들어옴)를 기본값으로 바꿔 버린다 */
    @PluginMethod
    public void update(PluginCall call) {
        JSObject d = call.getData();
        PaddWidget.prefs(getContext()).edit()
            .putBoolean("walking", d.optBoolean("walking", false))
            .putLong("startedAt", d.optLong("startedAt", 0L))
            .putString("km", d.optString("km", "0.00"))
            .putInt("pee", d.optInt("pee", 0))
            .putInt("poop", d.optInt("poop", 0))
            .putInt("sniffN", d.optInt("sniff", 0))
            .apply();
        PaddWidget.refreshAll(getContext());
        call.resolve();
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("events", PaddWidget.takeQueue(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void consumeLaunch(PluginCall call) {
        String a = PaddWidget.prefs(getContext()).getString("launch", "");
        PaddWidget.prefs(getContext()).edit().remove("launch").apply();
        JSObject ret = new JSObject();
        ret.put("action", a == null ? "" : a);
        call.resolve(ret);
    }
}
`);

  // 플러그인 등록(Capacitor 3+ 방식)
  edit(mainPath, s => {
    s = mustReplace(s, 'import com.getcapacitor.BridgeActivity;', 'import android.os.Bundle;\nimport com.getcapacitor.BridgeActivity;', 'MainActivity import');
    s = mustReplace(s, /public class MainActivity extends BridgeActivity \{\s*\}/,
      'public class MainActivity extends BridgeActivity {\n    @Override\n    public void onCreate(Bundle savedInstanceState) {\n        registerPlugin(PaddWidgetPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n}', 'MainActivity body');
    return s;
  });

  // 화면: 잉크색 판, 위는 km와 시간. 아래는 로고 점 세 개 그대로 똥(코랄) | 킁킁(노랑) | 꾹(파랑).
  //  누르는 자리는 모양이 아니라 칸 전체(모양 밖 빈 곳도 눌림). 산책 안 할 땐 로고 + "산책 시작"
  const INK = '#FF1B1712';
  const stroke = (paths, color, w) => `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
${paths.map(d => `    <path android:pathData="${d}" android:strokeColor="${color}" android:strokeWidth="${w}" android:strokeLineCap="round" android:strokeLineJoin="round" android:fillColor="#00000000"/>`).join('\n')}
</vector>
`;
  // 버튼 바탕: 로고 점 하나를 그대로 키운 것(13×16 타원, 로고와 같은 기울기). 화면은 기울인 외곽에 꼭 맞춘다
  const pad = (d, rx = 13) => {
    const w = d.rot ? 30 : 2 * rx + 2, h = 34;
    return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="${w * 3}dp" android:height="${h * 3}dp" android:viewportWidth="${w}" android:viewportHeight="${h}">
  <group android:translateX="${w / 2}" android:translateY="${h / 2}" android:rotation="${d.rot}">
    <path android:fillColor="#FF${d.color.slice(1)}" android:pathData="M-${rx},0a${rx},16 0 1,0 ${2 * rx},0a${rx},16 0 1,0 -${2 * rx},0z"/>
  </group>
</vector>
`;
  };
  write(path.join(RES, 'drawable', 'padd_pad_coral.xml'), pad(DOTS[0]));
  write(path.join(RES, 'drawable', 'padd_pad_yellow.xml'), pad(DOTS[1]));
  write(path.join(RES, 'drawable', 'padd_pad_blue.xml'), pad(DOTS[2]));
  // 위젯이 아주 낮을 때는 타원 대신 같은 색 알약(글자가 들어갈 너비를 지킨다)
  const pill = d => `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#FF${d.color.slice(1)}"/>
    <corners android:radius="100dp"/>
</shape>
`;
  write(path.join(RES, 'drawable', 'padd_pill_coral.xml'), pill(DOTS[0]));
  write(path.join(RES, 'drawable', 'padd_pill_yellow.xml'), pill(DOTS[1]));
  write(path.join(RES, 'drawable', 'padd_pill_blue.xml'), pill(DOTS[2]));
  // 아이콘: 꾹 = 로고 점 세 개, 똥 = 배변봉투, 킁킁 = 강아지 코(통통한 코 + 흰 반짝임, 10/26 사용자 선택 A)
  const NOSE = 'M12 19.6C9 19.6 2.8 16.4 2.8 10.8C2.8 7.2 6.6 4.8 12 4.8C17.4 4.8 21.2 7.2 21.2 10.8C21.2 16.4 15 19.6 12 19.6Z';
  const shine = (cx, cy, rx, ry, rot) => {
    const p = `<path android:fillColor="#FFFFFFFF" android:pathData="M${cx - rx},${cy}a${rx},${ry} 0 1,0 ${2 * rx},0a${rx},${ry} 0 1,0 -${2 * rx},0z"/>`;
    return rot ? `<group android:rotation="${rot}" android:pivotX="${cx}" android:pivotY="${cy}">${p}</group>` : p;
  };
  write(path.join(RES, 'drawable', 'padd_ic_dots_ink.xml'), vector(28, 100, 1, INK));
  write(path.join(RES, 'drawable', 'padd_ic_bag_ink.xml'), stroke(['M5.5 10.5h13l-1.2 9a2.2 2.2 0 0 1 -2.2 1.9h-6.2a2.2 2.2 0 0 1 -2.2 -1.9z', 'M8.6 10.5l-1.8 -6l4.4 2.6', 'M15.4 10.5l1.8 -6l-4.4 2.6', 'M11.2 7.1h1.6'], INK, 2.3));
  write(path.join(RES, 'drawable', 'padd_ic_nose.xml'), `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="${INK}" android:pathData="${NOSE}"/>
    ${shine(7.6, 8.6, 2.3, 1.25, -18)}
    ${shine(10.7, 7.9, 0.75, 0.6, 0)}
</vector>
`);
  write(path.join(RES, 'drawable', 'padd_ic_dots_color.xml'), vector(72, 100, 1));
  write(path.join(RES, 'drawable', 'padd_ic_watch.xml'), stroke(['M5 13a7 7 0 1 0 14 0a7 7 0 0 0 -14 0', 'M14.5 10.5l-2.5 2.5', 'M17 8l1 -1', 'M14 3h-4'], '#BFFFFFFF', 2.2));
  write(path.join(RES, 'drawable', 'padd_widget_bg.xml'), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F21B1712"/>
    <corners android:radius="22dp"/>
</shape>
`);
  write(path.join(RES, 'layout', 'padd_widget.xml'), `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/pw_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/padd_widget_bg"
    android:padding="12dp">

    <LinearLayout
        android:id="@+id/pw_walk"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:visibility="gone">

        <LinearLayout
            android:id="@+id/pw_info"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:gravity="center_vertical"
            android:orientation="horizontal"
            android:paddingStart="6dp"
            android:paddingEnd="6dp">

            <TextView
                android:id="@+id/pw_km"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:fontFamily="sans-serif-condensed"
                android:text="0.00"
                android:textColor="#FFFFFFFF"
                android:textSize="28sp"
                android:textStyle="bold" />

            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:paddingStart="5dp"
                android:text="km"
                android:textColor="#B3FFFFFF"
                android:textSize="13sp"
                android:textStyle="bold" />

            <ImageView
                android:layout_width="20dp"
                android:layout_height="20dp"
                android:layout_marginEnd="6dp"
                android:contentDescription="걸은 시간"
                android:src="@drawable/padd_ic_watch" />

            <Chronometer
                android:id="@+id/pw_time"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:fontFamily="sans-serif-condensed"
                android:textColor="#FFFFFFFF"
                android:textSize="28sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_marginTop="8dp"
            android:layout_weight="1"
            android:orientation="horizontal">

            <FrameLayout
                android:id="@+id/pw_poop"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:layout_weight="1"
                android:contentDescription="똥 기록"
                android:minHeight="48dp">

                <ImageView
                    android:id="@+id/pw_poop_bg"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:layout_marginTop="10dp"
                    android:importantForAccessibility="no"
                    android:scaleType="fitCenter"
                    android:src="@drawable/padd_pad_coral" />

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:layout_marginTop="10dp"
                    android:gravity="center"
                    android:orientation="vertical">

                    <ImageView
                        android:id="@+id/pw_poop_ic"
                        android:layout_width="28dp"
                        android:layout_height="28dp"
                        android:importantForAccessibility="no"
                        android:src="@drawable/padd_ic_bag_ink" />

                    <TextView
                        android:id="@+id/pw_poop_n"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:fontFamily="sans-serif-condensed"
                        android:maxLines="1"
                        android:text="0"
                        android:textColor="#FF1B1712"
                        android:textSize="24dp"
                        android:textStyle="bold" />
                </LinearLayout>
            </FrameLayout>

            <FrameLayout
                android:id="@+id/pw_sniff"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:layout_marginStart="7dp"
                android:layout_weight="1"
                android:contentDescription="킁킁 기록"
                android:minHeight="48dp">

                <ImageView
                    android:id="@+id/pw_sniff_bg"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:layout_marginBottom="10dp"
                    android:importantForAccessibility="no"
                    android:scaleType="fitCenter"
                    android:src="@drawable/padd_pad_yellow" />

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:layout_marginBottom="10dp"
                    android:gravity="center"
                    android:orientation="vertical">

                    <ImageView
                        android:id="@+id/pw_sniff_ic"
                        android:layout_width="28dp"
                        android:layout_height="28dp"
                        android:importantForAccessibility="no"
                        android:src="@drawable/padd_ic_nose" />

                    <TextView
                        android:id="@+id/pw_sniff_n"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:fontFamily="sans-serif-condensed"
                        android:maxLines="1"
                        android:text="0"
                        android:textColor="#FF1B1712"
                        android:textSize="24dp"
                        android:textStyle="bold" />
                </LinearLayout>
            </FrameLayout>

            <FrameLayout
                android:id="@+id/pw_pee"
                android:layout_width="0dp"
                android:layout_height="match_parent"
                android:layout_marginStart="7dp"
                android:layout_weight="1"
                android:contentDescription="꾹 기록"
                android:minHeight="48dp">

                <ImageView
                    android:id="@+id/pw_pee_bg"
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:layout_marginTop="10dp"
                    android:importantForAccessibility="no"
                    android:scaleType="fitCenter"
                    android:src="@drawable/padd_pad_blue" />

                <LinearLayout
                    android:layout_width="match_parent"
                    android:layout_height="match_parent"
                    android:layout_marginTop="10dp"
                    android:gravity="center"
                    android:orientation="vertical">

                    <ImageView
                        android:id="@+id/pw_pee_ic"
                        android:layout_width="28dp"
                        android:layout_height="28dp"
                        android:importantForAccessibility="no"
                        android:src="@drawable/padd_ic_dots_ink" />

                    <TextView
                        android:id="@+id/pw_pee_n"
                        android:layout_width="wrap_content"
                        android:layout_height="wrap_content"
                        android:fontFamily="sans-serif-condensed"
                        android:maxLines="1"
                        android:text="0"
                        android:textColor="#FF1B1712"
                        android:textSize="24dp"
                        android:textStyle="bold" />
                </LinearLayout>
            </FrameLayout>
        </LinearLayout>
    </LinearLayout>

    <LinearLayout
        android:id="@+id/pw_idle"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical">

        <LinearLayout
            android:id="@+id/pw_start"
            android:layout_width="match_parent"
            android:layout_height="match_parent"
            android:contentDescription="산책 시작"
            android:gravity="center"
            android:orientation="vertical">

            <ImageView
                android:id="@+id/pw_logo"
                android:layout_width="72dp"
                android:layout_height="72dp"
                android:importantForAccessibility="no"
                android:src="@drawable/padd_ic_dots_color" />

            <ImageView
                android:id="@+id/pw_logo_s"
                android:layout_width="48dp"
                android:layout_height="48dp"
                android:importantForAccessibility="no"
                android:src="@drawable/padd_ic_dots_color"
                android:visibility="gone" />

            <TextView
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:layout_marginTop="6dp"
                android:letterSpacing="0.04"
                android:text="산책 시작"
                android:textColor="#C7FFFFFF"
                android:textSize="14sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>
</FrameLayout>
`);
  write(path.join(RES, 'xml', 'padd_widget_info.xml'), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:description="@string/padd_widget_desc"
    android:initialLayout="@layout/padd_widget"
    android:minWidth="250dp"
    android:minHeight="110dp"
    android:minResizeWidth="250dp"
    android:minResizeHeight="110dp"
    android:previewLayout="@layout/padd_widget"
    android:resizeMode="horizontal|vertical"
    android:targetCellWidth="4"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:widgetCategory="home_screen" />
`);
  edit(path.join(RES, 'values', 'strings.xml'), s => mustReplace(s, '</resources>',
    '    <string name="padd_widget_label">꾹꾹이 산책</string>\n' +
    '    <string name="padd_widget_desc">산책 중 똥, 킁킁, 꾹을 앱을 안 열고 바로 기록해요</string>\n</resources>',
    'widget strings'));
  edit(path.join(APP, 'src', 'main', 'AndroidManifest.xml'), s => {
    s = mustReplace(s, '    </application>',
      '        <receiver\n            android:name=".PaddWidget"\n            android:exported="false"\n            android:label="@string/padd_widget_label">\n' +
      '            <intent-filter>\n                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />\n            </intent-filter>\n' +
      '            <meta-data\n                android:name="android.appwidget.provider"\n                android:resource="@xml/padd_widget_info" />\n        </receiver>\n    </application>',
      'widget receiver');
    s = mustReplace(s, '<uses-permission android:name="android.permission.CAMERA" />',
      '<uses-permission android:name="android.permission.CAMERA" />\n    <uses-permission android:name="android.permission.VIBRATE" />', 'vibrate permission');
    return s;
  });
}

// 7) 버전 · 릴리스 서명 (키는 워크플로가 저장소 비밀값에서 풀어 app/release.p12로 둔다)
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
