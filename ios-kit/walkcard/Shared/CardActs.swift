// 카드 버튼(꾹, 똥, 킁킁, 되돌리기)이 눌렸을 때 카드 모습을 바로 바꾼다. 앱과 위젯이 함께 쓰지만, 버튼의 인텐트는 앱 프로세스에서 돈다.
// 웹이 보낸 횟수로 다시 맞추는 것은 WalkCardController(앱)가 한다. 둘 다 CardChain 한 줄에서 차례로 돈다.
#if canImport(ActivityKit)
import ActivityKit
import Foundation

@available(iOS 16.2, *)
enum CardActs {
    /// 5초가 지나 체크를 비운 눌림(그 직후 닿은 되돌리기용). CardChain 안에서만 읽고 쓴다
    static var recent: RecentTap?

    static func startMs(_ a: Activity<WalkActivityAttributes>) -> Double {
        a.attributes.startedAt.timeIntervalSince1970 * 1000
    }

    /// 지금 버튼을 받는 카드(산책 중이고 오래되지 않은 카드)
    static func live(_ walkStart: Double) -> Activity<WalkActivityAttributes>? {
        Activity<WalkActivityAttributes>.activities.first {
            CardMath.sameWalk(startMs($0), walkStart) && $0.activityState == .active && !$0.content.state.ended
        }
    }

    /// 이 산책의 카드 둘(버튼을 받는 카드, 오래된 카드인지)을 한 번에 본다. 두 번 나눠 보면 그사이 상태가 바뀔 수 있다.
    /// 오래된 카드(30분 넘게 갱신 없음)는 기록을 받지 않는다(설계 '오래된 카드')
    static func snapshot(_ walkStart: Double) -> (live: Activity<WalkActivityAttributes>?, stale: Bool) {
        let mine = Activity<WalkActivityAttributes>.activities.filter { CardMath.sameWalk(startMs($0), walkStart) }
        let live = mine.first { $0.activityState == .active && !$0.content.state.ended }
        return (live, mine.contains { $0.activityState == .stale })
    }

    /// 보이는 횟수를 바로 by만큼 바꾼다. lastId가 있으면 그 칸을 5초 동안 체크와 되돌리기로 보이고, 없으면 비운다.
    /// 어느 쪽이든 앞 눌림의 되돌리기 여유(recent)는 끝난다
    static func bump(walkStart: Double, kind: String, by: Int, lastId: String?) async {
        guard let a = live(walkStart) else { return }
        recent = nil
        var st = a.content.state
        var c = CardCounts(pee: st.pee, poop: st.poop, sniff: st.sniff)
        c[kind] = max(0, c[kind] + by)
        st.pee = c.pee
        st.poop = c.poop
        st.sniff = c.sniff
        if let id = lastId {
            st.lastKind = kind
            st.lastId = id
            st.lastUntil = Date().addingTimeInterval(5)
        } else {
            st.lastKind = nil
            st.lastId = nil
            st.lastUntil = nil
        }
        st.at = Date()
        await a.update(ActivityContent(state: st, staleDate: Date().addingTimeInterval(30 * 60)))
    }

    /// 되돌리기 칸이 아직 그 눌림의 것이면 비운다(눌림 5초 뒤). 비운 눌림은 2초 동안 recent로 기억한다
    static func clearLast(walkStart: Double, id: String) async {
        guard let a = live(walkStart), a.content.state.lastId == id else { return }
        var st = a.content.state
        if let kind = st.lastKind { recent = RecentTap(id: id, kind: kind, until: st.lastUntil ?? Date()) }
        st.lastKind = nil
        st.lastId = nil
        st.lastUntil = nil
        st.at = Date()
        await a.update(ActivityContent(state: st, staleDate: Date().addingTimeInterval(30 * 60)))
    }
}
#endif
