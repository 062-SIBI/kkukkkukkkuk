// 워치 앱과 주고받기(0.5.3, 06 "이번 업데이트 때 위젯이랑 워치"). 폰 앱 쪽.
// 1) 웹이 산책 상태를 보낼 때(PaddWidget.update) 워치에 산책 중인지, 시작 시각, 보이는 횟수를 보낸다(applicationContext, 가장 최근 것만 남음).
// 2) 워치에서 누른 똥, 킁킁, 꾹은 산책 카드 버튼과 같은 큐(TapQueue)에 남긴다. 웹은 걷는 동안 늘 그 큐를 가져가므로(widgetDrain)
//    앱 화면 코드는 바꾸지 않는다. 카드가 떠 있으면 카드 숫자도 바로 올린다.
// 워치는 메시지가 실패하면 같은 눌림을 transferUserInfo로 다시 보낸다. 같은 아이디가 두 번 오면 한 번만 남긴다.
import Foundation
import WatchConnectivity

final class WatchLink: NSObject, WCSessionDelegate {
    static let shared = WatchLink()

    /// 최근에 받은 워치 눌림 아이디(두 번 전달 가리기). CardChain 안에서만 읽고 쓴다
    private var seen: [String] = []
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
        guard let s = session, s.activationState == .activated, s.isPaired, s.isWatchAppInstalled else { return }
        var ctx: [String: Any] = ["walking": u.walking, "at": Date().timeIntervalSince1970 * 1000]
        if u.walking {
            let queue = TapQueue.shared.pending() ?? []
            let shown = CardMath.shown(base: CardCounts(pee: u.pee, poop: u.poop, sniff: u.sniff),
                                       delta: CardMath.delta(queue, walkStart: u.startedAt, taken: Set(u.taken)))
            ctx["ws"] = u.startedAt
            ctx["pee"] = shown.pee
            ctx["poop"] = shown.poop
            ctx["sniff"] = shown.sniff
        }
        do { try s.updateApplicationContext(ctx) } catch { print("[watch] context failed: \(error)") }
    }

    // MARK: 워치에서 온 눌림

    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        record(message) { ok in replyHandler(["ok": ok]) }
    }

    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        record(message) { _ in }
    }

    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        record(userInfo) { _ in }
    }

    private func record(_ m: [String: Any], done: @escaping (Bool) -> Void) {
        guard let kind = m["kind"] as? String, ["pee", "poop", "sniff"].contains(kind),
              let ws = m["ws"] as? Double, ws > 0, let t = m["t"] as? Double, let wid = m["id"] as? String else {
            done(false)
            return
        }
        // 워치 시계가 조금 달라도 산책 안으로 넣는다(웹은 산책 시작 1분 전부터 지금 1분 뒤까지만 받는다)
        let at = Date(timeIntervalSince1970: min(t, Date().timeIntervalSince1970 * 1000) / 1000)
        CardChain.shared.run {
            if self.seen.contains(wid) { done(true); return }   // 다시 보낸 같은 눌림
            guard let id = TapQueue.shared.append(kind: kind, at: at, walkStart: ws) else { done(false); return }
            self.seen.append(wid)
            if self.seen.count > 200 { self.seen.removeFirst(self.seen.count - 200) }
            print("[watch] tap \(kind)")
            if #available(iOS 16.2, *) {
                await CardActs.bump(walkStart: ws, kind: kind, by: 1, lastId: nil)
            }
            _ = id
            done(true)
        }
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
