# 아이폰 산책 카드(라이브 액티비티) 작업 계획, 2판

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 산책하는 동안 아이폰 잠금 화면, 다이내믹 아일랜드, 애플 워치에 산책 카드(걸은 시간, 거리, 강아지가 든 산책 링, 똥 | 킁킁 | 꾹 버튼)를 띄우고, 카드에서 누른 기록이 맞는 산책에 정확히 한 번 들어가게 한다(아이폰 0.5.2).

**Architecture:** 웹(index.html)에 이미 있는 `PaddWidget` 다리(update, drain, consumeLaunch)를 아이폰에서도 켜고 `ack`를 더한다. 앱 타깃의 Swift 플러그인 `PaddWidget`이 `update`로 카드를 시작, 갱신, 끝내고, 카드 버튼(되돌리기 포함)은 앱 프로세스에서 도는 `LiveActivityIntent`가 백업에서 뺀 앱 안 파일 큐에 쌓는다. 웹은 GPS 점이 올 때와 앱이 뜨고 깨어날 때 `drain`으로 가져가 기록과 눌림 아이디를 함께 저장한 뒤 `ack`로 지운다. 카드 화면은 위젯 익스텐션 `WalkCard`이고, 빌드에서 프로젝트를 만든 직후 Ruby `xcodeproj` 스크립트로 한 번 붙인다. 강아지는 익스텐션이 SwiftUI로 직접 그린다.

**Tech Stack:** HTML/JS(index.html 한 파일), Playwright(시험), Swift 5, SwiftUI, ActivityKit, WidgetKit, AppIntents, Capacitor 8.5.2(iOS), Ruby `xcodeproj` 젬, 깃허브 액션 macOS 러너(Xcode 26 이상)

**Spec:** `docs/superpowers/specs/2026-11-23-ios-walk-live-activity-design.md` (1판 06 승인 11/23, 2판은 회의와 06 답 반영)

## Global Constraints
- 아이폰 판 번호 `0.5.2`(ios-kit/version.json의 name, 빌드 번호 code는 5). 0.5.1(빌드 4)은 11/24 작은 판이 썼다. 앱의 최소 iOS는 바꾸지 않는다.
- 라이브 액티비티 코드는 `@available(iOS 16.2, *)`, 카드 버튼은 `@available(iOS 17.0, *)`, 워치용 모습(`.supplementalActivityFamilies([.small])`)은 iOS 18 이상에서만. 그보다 낮은 iOS에서 `update`는 아무것도 하지 않고 성공으로 끝낸다.
- 위젯 익스텐션: 제품 이름 `WalkCard`, 번들 아이디는 앱 번들 아이디 + `.walkcard`. 앱 그룹 없음. 익스텐션은 네트워크를 쓰지 않는다.
- 버튼 순서와 색: 왼쪽부터 똥 `#FF6B57`, 킁킁 `#EFB02F`, 꾹 `#3B9DF5`(앱 CSS의 --coral, --sun, --sky). 아이콘은 앱 산책 화면 버튼과 같은 모양. 버튼 한 칸(아이콘, 이름, 횟수)은 44pt 이상.
- 링은 숫자 없이. 값은 산책 화면 링과 같은 `gaugeDetail(W).score/100`(0~1), 기준을 배우는 중이면 `-1`(점선 링과 '평소 산책을 알아가는 중').
- 카드 횟수 = 웹이 보낸 횟수 + 아직 ack 안 된 눌림 − 아직 ack 안 된 되돌리기(종류별). 웹은 `ack`가 끝난 뒤 `update`를 보낸다.
- 되돌리기는 누른 뒤 5초. 오래된 카드는 마지막 갱신 + 30분. 끝난 카드는 끝난 시각 + 5분에 사라지고, 그 안에 새 산책을 시작하면 바로 지운다.
- 갱신: 시작, 끝, 횟수가 바뀔 때는 바로. 거리만 바뀔 때는 10초에 한 번까지.
- 카드와 위젯으로 누른 똥은 `f:0`(굳기 미확인). 묽은 변 연속은 건너뛰고 평균 굳기에서 뺀다.
- 화면 글: 한국어로 짧게, em dash와 en dash 문자 금지, 강아지를 '개'라고 쓰지 않음. 정해진 글: `산책 끝`, `앱에서 산책을 확인해 주세요`, `평소 산책을 알아가는 중`, `되돌리기`, `이 아이폰(iOS 16)에서는 앱에서 기록해요`, `굳기 미확인`.
- 기록은 폰 안에서만. 새 외부 요청 없음. 개인정보 답 바뀌지 않음. 큐 파일은 백업에서 뺀다.
- 일정: 2라운드 서류 마감(12/1 13:00)이 먼저다.
- 저장소 규칙: 한 작업 한 브랜치(`walkcard-0.5.2`, 11/24 main 9431815에서 새로 땀. 문서만 있던 `ios-live-activity`는 예전 main 위라 쓰지 않음), PR로 올리고 합치기는 06. 고친 뒤 Playwright 시험. 비밀값을 코드와 커밋에 넣지 않음. Codex(아스트라) 검토는 한 작업에 세 번까지. 묽은 변 경고가 바뀌는 것(P1)은 PR에 따로 적는다.
- 실행 방식(06, 11/23 밤 "추천으로 하되 아스트라랑 회의"): Claude가 이 세션에서 직접 만든다. Task마다 끝에 아스트라와 검토 회의(읽기 전용, 한 Task에 세 번까지)를 하고, 마지막에 새 검토자가 브랜치 전체를 한 번 본다.
- 올리기 제약: 이 클라우드 세션은 깃허브 push가 막혀 있다. 06의 '올려' 뒤 깃허브 웹으로 브랜치에 올린다. 아이폰 빌드는 깃허브 액션 'iOS 앱'을 수동 실행한다. 테스트플라이트에 올리는 것도 06의 '올려' 뒤에만.

## Review Focus
1. 앱이 꺼져 있을 때 카드 버튼을 누름: 인텐트가 앱을 뒤에서 깨워 큐에 남기고, 다음에 웹이 뜨면 진행 중 산책이 있든 없든 그 눌림이 누를 때의 산책에 들어간다. (Task 2 `L4`, `L8`)
2. 저장 직후 ack 전에 앱이 꺼짐: 다시 켜도 한 건이다. (Task 2 `L3`)
3. 앞 산책에서 누른 것이 새 산책을 시작한 뒤에 옴, 또는 자정을 넘겨 다음 날 가져감: 앞 산책에, 누른 시각으로 붙는다. (Task 2 `L5`, `L10`)
4. 카드로 누른 똥이 묽은 변 연속 경고를 끊음: 끊지 않는다. (Task 2 `L13`)
5. 실시간 현황을 껐거나 iOS 16.2 미만: `update`가 실패하지 않아 다리가 꺼지지 않는다. (Task 2 `L7`, Task 6 확인 8번)

---

### Task 1: 뼈대로 빌드와 서명 먼저 확인 (버튼 하나)

회의 4: 플러그인 등록, 인텐트, 큐, `.appex` 넣기, 앱과 익스텐션 서명을 화면 일보다 먼저 확인한다.

**Files:**
- Create: `ios-kit/walkcard/Shared/WalkActivityAttributes.swift`, `ios-kit/walkcard/Shared/DogLook.swift`, `ios-kit/walkcard/Shared/TapQueue.swift`, `ios-kit/walkcard/Shared/RecordTapIntent.swift`(앱과 익스텐션 둘 다)
- Create: `ios-kit/walkcard/App/PaddWidgetPlugin.swift`, `ios-kit/walkcard/App/WalkCardController.swift`, `ios-kit/walkcard/App/MainViewController.swift`(앱만)
- Create: `ios-kit/walkcard/Extension/WalkCardBundle.swift`, `WalkCardLiveActivity.swift`, `Info.plist`, `PrivacyInfo.xcprivacy`(추적 없음, 수집 없음, 사유 API 없음)
- Create: `ios-kit/add-walkcard.rb`
- Modify: `ios-kit/patch-ios.js`(post: Info.plist에 `NSSupportsLiveActivities` true, Main.storyboard의 뷰 컨트롤러를 `MainViewController`/모듈 `App`으로), `.github/workflows/ios.yml`, `ios-kit/version.json`(name `0.5.2`), `index.html`(아이폰 플러그인 목록 3027에 `"PaddWidget"`)

**Interfaces:**
- Produces:
  - `struct WalkActivityAttributes: ActivityAttributes { let startedAt: Date; let look: DogLook?; struct ContentState: Codable, Hashable { var km: Double; var ring: Double; var pee: Int; var poop: Int; var sniff: Int; var ended: Bool; var endedAt: Date?; var lastKind: String?; var lastId: String?; var lastUntil: Date? } }`. `DogLook.swift`에는 `struct DogLook: Codable, Hashable { var coat: String; var snout: Int; var leg: Int; var ear: String; var tail: String; var fur: String; var waist: Int }`만 둔다(그림은 Task 5).
  - `struct Tap: Codable { let id: String; let type: String; let t: Double; let ws: Double; let ref: String? }`, `type`은 `pee`, `poop`, `sniff`, `undo`.
  - `final class TapQueue { static let shared; func append(kind: String, at: Date, walkStart: Double) -> String; func appendUndo(ref: String, at: Date, walkStart: Double) -> String; func pending() -> [Tap]; func remove(ids: [String]) }`. 파일은 Application Support의 `walkcard-taps.json`(`isExcludedFromBackup = true`), 직렬 큐로 감싼다. UserDefaults는 쓰지 않는다.
  - `struct RecordTapIntent: LiveActivityIntent { @Parameter var kind: String; @Parameter var walkStart: Double }`: `append` 뒤 카드 횟수를 올리고 `lastKind`, `lastId`, `lastUntil = 지금 + 5초`로 갱신한다.
  - `@objc(PaddWidgetPlugin) class PaddWidgetPlugin: CAPPlugin, CAPBridgedPlugin`: `jsName = "PaddWidget"`, 메서드 `update`, `drain`, `ack`, `consumeLaunch`.
  - `class MainViewController: CAPBridgeViewController`: `capacitorDidLoad()`에서 `bridge?.registerPluginInstance(PaddWidgetPlugin())`.
  - `ruby ios-kit/add-walkcard.rb <ios/App 경로>`: 앱 확장 타깃 `WalkCard`를 더하고 Shared는 두 타깃, App은 앱, Extension은 확장 타깃에 넣는다. 앱 타깃에 확장 의존과 'Embed Foundation Extensions'. 확장의 번들 아이디는 앱 값 + `.walkcard`, 판과 빌드 번호와 `DEVELOPMENT_TEAM`은 앱 값 그대로, `IPHONEOS_DEPLOYMENT_TARGET` `16.2`. 이미 붙어 있으면 바꾸지 않고 `walkcard: 이미 있음`을 찍고 끝낸다.

- [ ] **Step 1: 뼈대를 쓴다.** 카드는 잠금 화면에 걸은 시간과 꾹 버튼 하나만. `update`는 iOS 16.2 미만이거나 `areActivitiesEnabled`가 false면 아무것도 하지 않고 `call.resolve()`, 그 밖의 오류도 `resolve()`.
- [ ] **Step 2: ios.yml을 고친다.** '앱 껍데기 만들기'에서 `patch-ios.js post` 바로 다음에 한 번만 `ruby ../ios-kit/add-walkcard.rb ios/App`(출시 단계는 그 프로젝트를 다시 쓰므로 붙이지 않는다). 젬은 정확한 버전으로 설치하고 그 버전을 스크립트 머리에 적는다. 보관 빌드 뒤 `test -d build/App.xcarchive/Products/Applications/App.app/PlugIns/WalkCard.appex`. 내보낸 IPA의 `App.app`과 `PlugIns/WalkCard.appex` 각각 `codesign -d --entitlements :-`와 `security cms -D -i embedded.mobileprovision`으로 번들 아이디와 프로파일을 찍고, 하나라도 없으면 올리지 않고 멈춘다.
- [ ] **Step 3: 깃허브 액션을 올리기 끄고 돌린다.** Expected: 시뮬레이터 빌드 통과, `.appex` 있음, 두 서명 찍힘. 위젯 번들 아이디 자동 등록에서 막히면 06에게 애플 개발자 사이트 등록 순서를 적어 드리고 멈춘다.
- [ ] **Step 4: (06 '올려' 뒤) 뼈대를 테스트플라이트에 올려 06이 잠금 화면에서 꾹 하나를 누른다.** Expected: 앱 기록에 꾹 1(10분).
- [ ] **Step 5: 커밋** `git commit -m "아이폰 산책 카드: 뼈대(버튼 하나)로 빌드와 서명 확인, 0.5.2"`

### Task 2: 웹 다리 (index.html)

**Files:**
- Modify: `index.html`(3077~3141 위젯 다리, `endWalk` 5395~5406 근처, 똥 굳기 5785, 5790, 5795, 5801, 5880, 위젯 똥 3097, 3115)
- Test: 시험 폴더에 `test_walkcard.js` 새로. 기존 `test_widget.js`, `test_ios.js`, `test_317.js`도 다시 돈다.

**Interfaces:**
- Consumes: Task 1의 플러그인 이름과 메서드.
- Produces(Task 3이 따를 약속):
  - `PaddWidget.update(o)`: `o = {walking:boolean, startedAt:number(ms), km:string("0.00"), pee:int, poop:int, sniff:int, ring:number(0~1 또는 -1), look?:{coat,snout,leg,ear,tail,fur,waist}(시작할 때), end?:{startedAt, endedAt, km, ring, pee, poop, sniff}}` → `{}`. 언제나 성공.
  - `PaddWidget.drain()` → `{events:[{id, type:"pee"|"poop"|"sniff"|"undo", t:number(ms), ws:number(ms), ref?:string}]}`. 꺼내 주기만 하고 지우지 않는다.
  - `PaddWidget.ack({ids:string[]})` → `{}`.
  - `PaddWidget.consumeLaunch()` → `{action:""}`.
- 웹 안에서 새로 생기는 것: `cardRing(w): number`, `walkByStart(ms): object|null`, 산책 기록마다 `wgIds: string[]`, 카드에서 온 기록마다 `wid: string`, `WG.end: object|null`, `firmKnown(p): boolean`(1~5만 참).

- [ ] **Step 1: 실패하는 시험 `test_walkcard.js`를 쓴다.** `test_ios.js`의 아이폰 Capacitor 흉내에 `update`, `drain`, `ack`, `consumeLaunch`, `addListener`를 넣는다. 흉내 큐는 `drain`에서 지우지 않고 `ack`에서만 지운다.
  - `L1 시작 update`: `walking===true`, `startedAt===W.start`, `ring`이 -1~1, `look`에 7값.
  - `L2 카드 눌림이 한 번 들어가고 저장 뒤 ack`: `{id:'a1',type:'poop',t:now,ws:W.start}` → GPS 점 한 번 → 똥 1, 저장된 `W.wgIds`에 `a1`, ack `['a1']`.
  - `L3 같은 아이디가 다시 와도 한 건`: ack를 무시하는 흉내로 `a2`(pee)를 두 번 drain, 그리고 저장 직후 페이지를 다시 연 뒤 한 번 더 → 꾹 1.
  - `L4 되살린 진행 중 산책에 꺼져 있던 동안의 눌림`: `S.live`가 있는 채로 열고 `ws=S.live.start`인 sniff → 킁킁 1.
  - `L5 앞 산책의 눌림은 앞 산책에`: A를 끝내고 B 시작 뒤 `ws=A.start` pee → A 꾹 +1, B 꾹 0.
  - `L6 끝 update`: `walking===false`, `end.startedAt===A.start`, `end.pee===A.kkuks.length`, `end.km===(A.dist/1000).toFixed(2)`.
  - `L7 update가 실패하지 않으면 다리가 꺼지지 않음`: 50번 갱신 뒤 `WG.on===true`(`window.__kk.WG`).
  - `L8 진행 중 산책 없이 연 앱`: `S.live` 없음, 저장된 A에 `ws=A.start` 눌림 → A에 붙고 ack.
  - `L9 7일`: 맞는 산책이 없는 눌림이 8일 전이면 버리고 ack, 1일 전이면 남김(ack 안 함).
  - `L10 자정`: 23:59에 누른 눌림을 다음 날 가져감 → 기록 시각이 누른 시각.
  - `L11 가져가는 사이 들어온 눌림`: drain이 `[a]`를 준 뒤 저장 전에 `b`가 들어옴 → ack는 `['a']`만, 다음 drain에 `b`.
  - `L12 되돌리기`: 저장된 눌림의 undo는 그 기록(`wid`)만 지움. 같은 묶음 안의 눌림과 undo는 둘 다 버리고 둘 다 ack.
  - `L13 굳기 미확인`: 카드 똥은 `f:0`. 똥 `[f2, f0, f2]`의 묽은 변 연속은 2, 평균에서 `f0`을 뺌, 똥 목록에 `굳기 미확인`.
- [ ] **Step 2: 실패를 본다.** Run: `(python3 -m http.server 8746 &) && NODE_PATH=$(npm root -g) node test_walkcard.js` Expected: L1부터 실패.
- [ ] **Step 3: index.html을 고친다.** `cardRing`: ready면 `score/100`을 0~1로, 아니면 -1. `widgetPush`: `ring`, 시작 때 `look:kcLook(S.dog&&S.dog.look)`, `!W && WG.end`면 `end`를 넣고 `WG.end=null`. `endWalk`: `W=null` 앞에서 `WG.end`를 채운다. `widgetDrain`: 앱이 뜰 때와 깨어날 때는 `W`가 없어도 돈다. 눌림마다 `walkByStart(ws)`로 산책을 찾고(없으면 7일 규칙), 그 산책의 `wgIds`에 있는 아이디는 건너뛰되 ack 목록에는 넣는다. 기록의 `t`는 눌림의 `t`, `wid`는 눌림 아이디. 저장이 성공하면 `IOS`일 때만 `await NP.PaddWidget.ack({ids})`, 그다음 `widgetPush()`. 아이디 없는 눌림(안드로이드)은 지금처럼. 똥 굳기 다섯 곳은 `firmKnown`으로 거르고 `f:0`은 `굳기 미확인`으로 보인다.
- [ ] **Step 4: 통과를 본다.** Run: `node test_walkcard.js && node test_widget.js && node test_ios.js && node test_317.js` Expected: test_walkcard 13/13, test_widget은 알려진 실패 W8 하나만, 나머지 전부 통과.
- [ ] **Step 5: 전체 시험.** 시험 폴더의 모든 `test_*.js` Expected: 새 실패 없음(알려진 실패 4개: 지도 파일 3, 위젯 W8).
- [ ] **Step 6: 커밋** `git commit -m "아이폰 산책 카드: 웹 다리(링, 생김새, 눌림 아이디, ack, 되돌리기, 굳기 미확인)"`

### Task 3: 앱 쪽 플러그인과 큐 완성 (Swift, 앱 타깃)

**Files:**
- Modify: Task 1의 `Shared/*`, `App/*`
- Create: `ios-kit/walkcard/Shared/UndoTapIntent.swift`(둘 다)

**Interfaces:**
- Consumes: Task 2의 `update`, `drain`, `ack` 값 모양.
- Produces: `struct UndoTapIntent: LiveActivityIntent { @Parameter var tapId: String; @Parameter var walkStart: Double }`: `appendUndo(ref: tapId)` 뒤 카드 횟수를 내리고 `last*`를 비운다. `@available(iOS 16.2, *) final class WalkCardController { func sync(_ o: JSObject) }`: 같은 `startedAt`의 활동을 갱신하거나 시작(시작할 때 `look`을 고정 값으로), 끝난 카드가 있으면 바로 지움. 횟수는 Global Constraints의 식대로. `lastUntil`이 지났으면 `last*`를 비우고, 눌림 5초 뒤 한 번 더 갱신해 비운다. `staleDate`는 지금 + 30분. walking이 아니면 `end` 값으로 끝 모습을 넣고 `dismissalPolicy: .after(endedAt + 5분)`, `end`가 없으면 남은 활동을 모두 바로 끝낸다.

- [ ] **Step 1: 위 모양대로 고치고 만든다.**
- [ ] **Step 2: 깃허브 액션 시뮬레이터 빌드.** Expected: 통과, 이 파일들에서 나온 오류 없음.
- [ ] **Step 3: 커밋** `git commit -m "아이폰 산책 카드: 되돌리기, 횟수 식, 끝과 오래된 카드"`

### Task 4: 카드 모습 (위젯 익스텐션)

**Files:**
- Modify: `ios-kit/walkcard/Extension/WalkCardLiveActivity.swift`
- Create: `ios-kit/walkcard/Extension/Assets.xcassets`(버튼 아이콘 셋, 앱 산책 화면 아이콘에서 가져옴)

**Interfaces:**
- Consumes: Task 1과 3의 `WalkActivityAttributes`, `RecordTapIntent(kind:walkStart:)`, `UndoTapIntent(tapId:walkStart:)`.

- [ ] **Step 1: 모습을 만든다(시안 3, 06 PC `21_위젯_1123/산책카드_시안3_1123.png`).**
  - 잠금 화면: 위 줄 걸은 시간(`Text(timerInterval:...)`), 거리(`%.1fkm`), 링. 아래 줄 버튼 셋. 링이 -1이면 점선 링과 `평소 산책을 알아가는 중`.
  - 다이내믹 아일랜드: 작은 모습은 왼쪽 앱 색 점 셋과 걸은 시간, 오른쪽 작은 링. 가장 작은 모습은 링만. 펼친 모습은 시간과 링을 양옆에, 거리와 버튼을 아래에(가운데 위는 비움).
  - 워치(iOS 18 이상에서 `.supplementalActivityFamilies([.small])`, `activityFamily == .small`): 위에 시간과 링, 아래 작은 버튼 셋.
  - iOS 17 미만: 버튼 대신 `똥 1   킁킁 0   꾹 3`과 `이 아이폰(iOS 16)에서는 앱에서 기록해요`.
  - 누른 칸: `lastUntil`이 지나지 않았고 `lastKind`가 같으면 체크와 `되돌리기`, 버튼은 `UndoTapIntent(tapId: lastId)`.
  - `ended`: 버튼 없이 `산책 끝`, 끝난 시간(고정 글), 거리, 링. `context.isStale`: 버튼 없이 `앱에서 산책을 확인해 주세요`, 시간은 마지막 값에서 멈춘 글.
  - 보이스오버: 버튼 `똥 기록, 이번 산책 1번`, 링 `산책 중`. 큰 글씨에서는 이름과 횟수를 먼저 지킨다.
- [ ] **Step 2: 깃허브 액션 시뮬레이터 빌드.** Expected: 통과, `.appex` 있음.
- [ ] **Step 3: 커밋** `git commit -m "아이폰 산책 카드: 잠금 화면, 다이내믹 아일랜드, 워치 모습"`

### Task 5: 강아지 그림 (늦어지면 0.5.3으로)

**Files:**
- Create: `ios-kit/walkcard/Extension/DogView.swift`
- Create: `ios-kit/walkcard/DogKit/`(맥에서 도는 작은 Swift 패키지: DogView 파일을 같이 쓰고 `swift test`로 PNG를 찍음)
- Create: 시험 폴더에 `kc_dump.js`(같은 생김새를 웹 `kcSvg`와 자세 규칙으로 PNG로 찍음)

**Interfaces:**
- Consumes: Task 1의 `DogLook`, `look`(update의 시작 값).
- Produces: `enum DogPose { stand, sniff, walk, sit, lie; static func from(ring: Double) -> DogPose }`(-1은 stand, 0~29 stand, 30~59 sniff, 60~84 walk, 85~99 sit, 100 lie). `struct DogView: View { let look: DogLook; let pose: DogPose; let dark: Bool }`: SwiftUI 도형만 써서 `kcSvg`(index.html 4425~4510)의 도형, 테두리 먼저 그리고 털 색을 위에 그리는 방식, 자세별 돌리는 축과 각도(1883~1903)를 그대로 옮긴다. 움직임 없음.

- [ ] **Step 1: `kc_dump.js`로 생김새 3가지(기본형, 밤색 늘어진 귀 말린 꼬리, 검정 반쯤 선 귀 내린 꼬리) × 자세 5가지를 웹 그림 PNG로 찍는다.**
- [ ] **Step 2: DogView를 쓰고, 깃허브 액션 맥 러너에서 `swift test`가 ImageRenderer로 같은 15장을 PNG로 찍어 산출물로 올린다.**
- [ ] **Step 3: 두 묶음을 나란히 붙여 눈으로 본다.** Expected: 귀, 꼬리, 다리 길이, 자세가 같아 보인다(06에게도 보여 줌).
- [ ] **Step 4: 링 안(잠금 화면, 펼친 모습, 워치, 끝 카드는 lie)과 작은 아일랜드 왼쪽(점 셋 대신)에 넣는다. `look`이 없으면(예전 산책) 기본형.**
- [ ] **Step 5: 커밋** `git commit -m "아이폰 산책 카드: 링 안 강아지(앱과 같은 그림)"`

### Task 6: 테스트플라이트, 06 아이폰과 워치 확인, 검토, PR

**Files:**
- Create: PR 본문(`PR_본문.md`, PC 꾹꾹이_최종/21_위젯_1123)

- [ ] **Step 1: 아스트라(Codex) 검토**: 브랜치 변경분 전체를 읽기 전용으로. 지적은 재현해 본 뒤 고친다(세 번까지).
- [ ] **Step 2: 06 '올려' 뒤 PR을 연다**(본문 끝에 `@codex review`, 한 일 / 바꾼 파일 / 확인 못 한 것 / 다음 할 일, P1인 묽은 변 계산 변경을 따로 적음).
- [ ] **Step 3: 깃허브 액션 'iOS 앱'을 올리기 켜고 돈다.**
- [ ] **Step 4: 06 아이폰과 워치(테스트플라이트)에서 확인한다**
  1. 산책 시작 → 잠금 화면 카드와 다이내믹 아일랜드(시간이 흐름, 링 안 강아지가 앱과 같음)
  2. 폰을 들어 똥을 눌러 체크가 보이기까지 3초 안. 양손을 바꿔 한 번 더, 인증에 실패한 뒤 다시 눌러도 한 건
  3. 체크가 보이는 5초 안에 되돌리기 → 앱 기록에서 빠짐
  4. 다이내믹 아일랜드를 길게 눌러 꾹 → 숫자 오름, 앱 기록 꾹 1
  5. 워치 스마트 스택에서 킁킁 → 앱 기록 킁킁 1(워치 버튼이 안 되면 그대로 적고 다음 판에서 워치 앱으로)
  6. 산책 끝 → `산책 끝`과 누운 강아지, 5분 뒤 사라짐
  7. 산책 중 앱을 강제로 끔 → 30분 뒤 `앱에서 산책을 확인해 주세요`, 앱을 다시 열면 맞게 바뀜
  8. 아이폰 설정 > 앱 > 꾹꾹이 > 실시간 현황을 끔 → 산책 기록은 지금처럼
- [ ] **Step 5: 06이 합치고 심사를 낸다**(심사 제출은 06의 말 뒤).
