// 워치 앱과 주고받기(0.5.3, 06 "이번 업데이트 때 위젯이랑 워치"). 폰 앱 쪽.
// 1) 웹이 산책 상태를 보낼 때(PaddWidget.update) 워치에 산책 중인지, 시작 시각, 거리, 보이는 횟수를 보낸다(applicationContext, 가장 최근 것만 남음).
// 2) 워치에서 누른 똥, 킁킁, 꾹은 산책 카드 버튼과 같은 큐(TapQueue)에 남긴다. 웹은 걷는 동안 늘 그 큐를 가져가므로(widgetDrain)
//    앱 화면 코드는 바꾸지 않는다. 카드가 떠 있으면 카드 숫자도 바로 올린다.
// 워치는 메시지가 실패하거나 폰이 저장하지 못했다고 답하면 같은 눌림을 transferUserInfo로 다시 보낸다.
// PR #23 Codex 리뷰 P0 셋(11/27): 같은 아이디는 폰 앱이 다시 켜져도 한 번만 남기고(큐에도 워치 아이디를 그대로, WatchMemo),
// 폰이 저장하지 못하면 워치에 다시 보내라고 답하며 앱 메모리에서도 다시 넣어 보고,
// 끝난 산책에 그 뒤 누른 것은 받지 않는다(워치가 끊긴 사이 산책이 끝난 때. 워치에는 끝났다고 답한다).
import Foundation
import WatchConnectivity

final class WatchLink: NSObject, WCSessionDelegate {
    static let shared = WatchLink()

    /// 워치 눌림 기억(받은 아이디, 끝난 산책). 파일에 두어 폰 앱이 다시 켜져도 남는다. CardChain 안에서만 읽고 쓴다
    private let memo = WatchMemoStore()
    /// 폰이 저장하지 못한 워치 눌림(앱 메모리, 100개까지). 다음 산책 상태가 올 때 같은 아이디로 다시 넣어 본다. CardChain 안에서만
    private var held: [WatchTap] = []
    private var started = false

    private var session: WCSession? { WCSession.isSupported() ? WCSession.default : nil }

    /// 앱이 켜질 때 한 번(AppDelegate, patch-ios.js post). 화면 없이 뒤에서 깨어난 때도 워치 눌림을 받게
    func start() {
        guard !started, let s = session else { return }
        started = true
        s.delegate = self
        s.activate()
        print("[watch] session start")
    }

    /// 웹이 보낸 산책 상태를 워치로. 횟수는 산책 카드와 같은 셈(웹 횟수 + 큐에 남은 이 산책의 눌림 중 웹이 아직 세지 않은 것)
    func send(_ u: WalkCardUpdate) {
        // 산책 상태는 워치가 없어도 기억한다(끝난 산책에 늦은 워치 눌림이 붙지 않게)
        let walking = u.walking, start = u.startedAt
        let end = u.end.map { (startedAt: $0.startedAt, endedAt: $0.endedAt) }
        CardChain.shared.run {
            let now = Date().timeIntervalSince1970 * 1000
            self.memo.update { $0.note(walking: walking, startedAt: start, end: end, now: now) }
            await self.retryHeld()
        }
        guard let s = session, s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else { return }
        var ctx: [String: Any] = ["walking": u.walking, "at": Date().timeIntervalSince1970 * 1000]
        if u.walking {
            let queue = TapQueue.shared.pending() ?? []
            let shown = CardMath.shown(base: CardCounts(pee: u.pee, poop: u.poop, sniff: u.sniff),
                                       delta: CardMath.delta(queue, walkStart: u.startedAt, taken: Set(u.taken)))
            ctx["ws"] = u.startedAt
            ctx["km"] = u.km   // 워치 앱 덩어리 화면 구석의 거리(11/27)
            ctx["pee"] = shown.pee
            ctx["poop"] = shown.poop
            ctx["sniff"] = shown.sniff
        }
        do { try s.updateApplicationContext(ctx) } catch { print("[watch] context failed: \(error)") }
    }

    // MARK: 워치에서 온 눌림

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        record(message) { v in replyHandler(Self.reply(v)) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        record(message) { _ in }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        record(userInfo) { _ in }
    }

    private enum Verdict { case saved, retry, ended, bad }

    /// 워치에 보내는 답: ok(남겼거나 이미 남김), retry(폰이 저장하지 못함, 같은 아이디로 다시), ended(끝난 산책이라 받지 않음)
    private static func reply(_ v: Verdict) -> [String: Any] {
        ["ok": v == .saved, "retry": v == .retry, "ended": v == .ended]
    }

    private func record(_ m: [String: Any], done: @escaping (Verdict) -> Void) {
        guard let tap = WatchTap(m) else {
            done(.bad)
            return
        }
        CardChain.shared.run { done(await self.save(tap)) }
    }

    /// 워치 눌림 하나를 큐에 남긴다. CardChain 안에서만 부른다
    private func save(_ tap: WatchTap) async -> Verdict {
        if memo.value.knows(tap.id) { return .saved }   // 다시 보낸 같은 눌림(폰 앱이 다시 켜졌어도 파일에 남은 기억으로)
        if memo.value.isStale(ws: tap.ws, t: tap.t) {   // 워치가 끊긴 사이 끝난 산책에 그 뒤 누른 것
            print("[watch] stale tap \(tap.kind)")
            return .ended
        }
        // 워치 시계가 조금 달라도 산책 안으로 넣는다(웹은 산책 시작 1분 전부터 지금 1분 뒤까지만 받는다)
        let at = Date(timeIntervalSince1970: min(tap.t, Date().timeIntervalSince1970 * 1000) / 1000)
        guard let r = TapQueue.shared.appendWatch(id: tap.id, kind: tap.kind, at: at, walkStart: tap.ws) else {
            if !held.contains(where: { $0.id == tap.id }), held.count < 100 { held.append(tap) }   // 앱이 켜져 있는 동안 다시 넣어 본다
            return .retry
        }
        memo.update { m in
            m.remember(tap.id)
            return true
        }
        print("[watch] tap \(tap.kind)")
        if r.added, #available(iOS 16.2, *) {
            await CardActs.bump(walkStart: tap.ws, kind: tap.kind, by: 1, lastId: nil)
        }
        return .saved
    }

    /// 저장하지 못했던 워치 눌림을 다시 넣어 본다(또 못 하면 save가 다시 담는다). CardChain 안에서만 부른다
    private func retryHeld() async {
        guard !held.isEmpty else { return }
        let list = held
        held = []
        for tap in list { _ = await save(tap) }
    }

    // MARK: WCSessionDelegate(아이폰 쪽에서 꼭 있어야 하는 것)

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error { print("[watch] activate failed: \(error)") }
    }

    func sessionDidBecomeInactive(_ session: WCSession) {}

    func sessionDidDeactivate(_ session: WCSession) {
        session.activate()   // 워치를 바꿔 끼운 때 새 워치와 다시 잇는다(애플 안내)
    }
}

/// 워치가 보낸 눌림 하나(메시지나 userInfo를 읽은 것). 형식이 틀리면 nil
private struct WatchTap {
    let kind: String
    let ws: Double
    let t: Double
    let id: String

    init?(_ m: [String: Any]) {
        guard let kind = m["kind"] as? String, ["pee", "poop", "sniff"].contains(kind),
              let ws = m["ws"] as? Double, ws.isFinite, ws > 0,
              let t = m["t"] as? Double, t.isFinite,
              let id = m["id"] as? String, !id.isEmpty else { return nil }
        self.kind = kind
        self.ws = ws
        self.t = t
        self.id = id
    }
}
