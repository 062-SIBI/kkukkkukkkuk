// 웹이 보낸 산책 상태로 라이브 액티비티를 시작, 갱신, 끝낸다. 카드 버튼과 같은 줄(CardChain)에서 차례로 돈다.
// 보이는 횟수 = 웹 횟수 + 큐에 남은 이 산책의 눌림 중 웹이 아직 세지 않은 것(taken에 없는 것) (CardMath)
// 생김새는 산책 동안 기억해 두고(LookMemo), 사용자가 잠금 화면에서 지운 카드는 그 산책 동안 다시 띄우지 않는다(CardOwn).
import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

struct WalkCardEnd {
    /// ms
    let startedAt: Double
    /// ms
    let endedAt: Double
    let km: Double
    let ring: Double
    let pee: Int
    let poop: Int
    let sniff: Int
    let taken: [String]
}

struct WalkCardUpdate {
    let walking: Bool
    /// ms
    let startedAt: Double
    let km: Double
    let pee: Int
    let poop: Int
    let sniff: Int
    let ring: Double
    /// 이 산책을 처음 보낼 때만 온다
    let look: DogLook?
    let taken: [String]
    /// 끝낸 뒤 한 번 온다
    let end: WalkCardEnd?
}

#if canImport(ActivityKit)
@available(iOS 16.2, *)
final class WalkCardController {
    static let shared = WalkCardController()

    /// CardChain 안에서만 읽고 쓴다(한 번에 하나씩 돈다)
    private var looks = LookMemo()
    private var own = CardOwn()

    func sync(_ u: WalkCardUpdate) {
        CardChain.shared.run { await self.apply(u) }
    }

    private func apply(_ u: WalkCardUpdate) async {
        if u.walking { looks.note(ws: u.startedAt, look: u.look) }   // 카드를 못 띄워도 생김새는 기억한다(권한을 나중에 켤 때)
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("[walkcard] live activities off")
            return
        }
        let all = Activity<WalkActivityAttributes>.activities
        let queue = TapQueue.shared.pending() ?? []   // 큐를 못 읽으면 웹 횟수만 보인다
        let now = Date()
        let stale = now.addingTimeInterval(30 * 60)

        if u.walking {
            let ws = u.startedAt
            let shown = CardMath.shown(base: CardCounts(pee: u.pee, poop: u.poop, sniff: u.sniff),
                                       delta: CardMath.delta(queue, walkStart: ws, taken: Set(u.taken)))
            // 다른 산책의 카드(끝난 카드 포함)는 바로 지운다
            for a in all where !CardMath.sameWalk(CardActs.startMs(a), ws) {
                await a.end(nil, dismissalPolicy: .immediate)
            }
            if let cur = all.first(where: { CardMath.sameWalk(CardActs.startMs($0), ws) && $0.activityState != .ended && $0.activityState != .dismissed }) {
                var st = cur.content.state
                st.km = u.km
                st.ring = u.ring
                st.pee = shown.pee
                st.poop = shown.poop
                st.sniff = shown.sniff
                st.ended = false
                st.endedAt = nil
                if let until = st.lastUntil, until <= now {
                    if let id = st.lastId, let kind = st.lastKind { CardActs.recent = RecentTap(id: id, kind: kind, until: until) }
                    st.lastKind = nil
                    st.lastId = nil
                    st.lastUntil = nil
                }
                st.at = now
                own.started(ws: ws, id: cur.id)   // 앱이 다시 켜진 뒤 만난 카드도 우리 카드로 둔다(사용자가 지우면 다시 안 띄움)
                await cur.update(ActivityContent(state: st, staleDate: stale))
            } else {
                // 이 산책에 띄운 카드를 사용자가 지웠으면 다시 띄우지 않는다
                let liveIds = Set(all.filter { $0.activityState == .active || $0.activityState == .stale }.map { $0.id })
                guard own.mayStart(ws: ws, liveIds: liveIds) else { return }
                // 같은 산책의 끝 모습이 남아 있으면(5분 안에 이어 걷기) 지우고 새로 띄운다
                for a in all where CardMath.sameWalk(CardActs.startMs(a), ws) {
                    await a.end(nil, dismissalPolicy: .immediate)
                }
                let st = WalkActivityAttributes.ContentState(
                    km: u.km, ring: u.ring, pee: shown.pee, poop: shown.poop, sniff: shown.sniff,
                    ended: false, endedAt: nil, lastKind: nil, lastId: nil, lastUntil: nil, at: now)
                do {
                    let a = try Activity.request(
                        attributes: WalkActivityAttributes(startedAt: Date(timeIntervalSince1970: ws / 1000), look: looks.look(for: ws)),
                        content: ActivityContent(state: st, staleDate: stale), pushType: nil)
                    own.started(ws: ws, id: a.id)
                    print("[walkcard] started \(a.id)")
                } catch {
                    print("[walkcard] start failed: \(error)")
                }
            }
        } else if let e = u.end {
            let shown = CardMath.shown(base: CardCounts(pee: e.pee, poop: e.poop, sniff: e.sniff),
                                       delta: CardMath.delta(queue, walkStart: e.startedAt, taken: Set(e.taken)))
            let endedAt = Date(timeIntervalSince1970: e.endedAt / 1000)
            let st = WalkActivityAttributes.ContentState(
                km: e.km, ring: e.ring, pee: shown.pee, poop: shown.poop, sniff: shown.sniff,
                ended: true, endedAt: endedAt, lastKind: nil, lastId: nil, lastUntil: nil, at: now)
            let until = max(endedAt, now).addingTimeInterval(5 * 60)
            own.ended(ws: e.startedAt)
            for a in all {
                if CardMath.sameWalk(CardActs.startMs(a), e.startedAt) {
                    await a.end(ActivityContent(state: st, staleDate: nil), dismissalPolicy: .after(until))
                } else if a.activityState == .active || a.activityState == .stale {
                    await a.end(nil, dismissalPolicy: .immediate)
                }
            }
        } else {
            // 걷는 중이 아니고 끝 값도 없음: 걷는 중으로 남은 카드만 바로 지운다. 끝 모습은 5분 동안 그대로 둔다
            for a in all where a.activityState == .active || a.activityState == .stale {
                await a.end(nil, dismissalPolicy: .immediate)
            }
            own.clear()
        }
    }
}
#endif
