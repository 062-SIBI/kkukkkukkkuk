// 카드의 버튼. 앱 프로세스에서 돌아(LiveActivityIntent) 앱 안 큐에 남기고 카드 숫자를 바로 올린다.
// 큐에 남기지 못하면 숫자도 올리지 않는다. 버튼이 보일 때 누른 것이므로, 그사이 카드가 끝났어도 큐에는 남긴다
// (웹이 시작 시각 ws로 끝난 산책에 붙인다). 오래된 카드(30분 넘게 갱신 없음)에서는 받지 않는다.
// 같은 칸이 아직 체크인데 또 온 눌림, 이 산책의 가장 최근 눌림이 2초 안 같은 종류인 눌림은 두 번 전달로 보고 버린다.
#if canImport(ActivityKit) && canImport(AppIntents)
import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct RecordTapIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "산책 기록"
    static let isDiscoverable: Bool = false

    @Parameter(title: "종류") var kind: String
    @Parameter(title: "산책 시작") var walkStart: Double

    init() {}

    init(kind: String, walkStart: Double) {
        self.kind = kind
        self.walkStart = walkStart
    }

    func perform() async throws -> some IntentResult {
        let at = Date(), kind = self.kind, ws = self.walkStart
        let made = TapIdBox()
        await CardChain.shared.run {
            let snap = CardActs.snapshot(ws)
            if snap.stale { return }   // 오래된 카드에서는 기록을 받지 않는다(워치에 옛 버튼이 남은 때)
            let card = snap.live
            if let st = card?.content.state,
               CardMath.isRepeat(lastKind: st.lastKind, lastUntil: st.lastUntil, kind: kind, at: at) { return }
            var seen = TapQueue.shared.pending() ?? []
            let ids = Set(seen.map { $0.id })
            seen += TapQueue.shared.recentTaps(now: at).filter { !ids.contains($0.id) }   // 웹이 이미 가져간 눌림까지
            if CardMath.queueRepeat(seen, kind: kind, walkStart: ws, at: at) { return }
            guard let id = TapQueue.shared.append(kind: kind, at: at, walkStart: ws) else { return }
            guard card != nil else { return }
            made.id = id
            await CardActs.bump(walkStart: ws, kind: kind, by: 1, lastId: id)
        }.value
        // 5초 뒤 되돌리기 칸을 비운다. 앱이 이 사이 잠들면 칸이 남아 다음 누름이 되돌리기가 되므로,
        // 따로 띄우지 않고 이 인텐트 안에서 기다린다(줄은 비워 둔 채라 그사이 다른 누름은 바로 돈다)
        if let id = made.id {
            try? await Task.sleep(nanoseconds: 5_200_000_000)
            await CardChain.shared.run { await CardActs.clearLast(walkStart: ws, id: id) }.value
        }
        return .result()
    }
}

/// 줄 안에서 만든 눌림 아이디를 줄 밖으로 꺼내는 상자
private final class TapIdBox: @unchecked Sendable {
    var id: String?
}
#endif
