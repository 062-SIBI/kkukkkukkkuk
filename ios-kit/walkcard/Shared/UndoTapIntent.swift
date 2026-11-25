// 카드의 되돌리기(누른 뒤 5초 동안 그 칸에 보인다). 큐에 되돌리기를 남기고 카드 숫자를 하나 내린다.
// 웹은 이 되돌리기를 받아 그 눌림으로 남긴 기록 하나만 지운다(아직 안 가져간 눌림이면 둘 다 버린다).
// 카드가 지금 그 눌림의 체크를 보일 때만 받는다(5초 정리 직후 2초는 방금 비운 눌림도). 워치처럼 늦게 그려진 화면의
// 옛 체크나 같은 눌림의 두 번째 되돌리기는 버린다.
#if canImport(ActivityKit) && canImport(AppIntents)
import ActivityKit
import AppIntents
import Foundation

@available(iOS 17.0, *)
struct UndoTapIntent: LiveActivityIntent {
    static let title: LocalizedStringResource = "되돌리기"
    static let isDiscoverable: Bool = false

    @Parameter(title: "눌림") var tapId: String
    @Parameter(title: "종류") var kind: String
    @Parameter(title: "산책 시작") var walkStart: Double

    init() {}

    init(tapId: String, kind: String, walkStart: Double) {
        self.tapId = tapId
        self.kind = kind
        self.walkStart = walkStart
    }

    func perform() async throws -> some IntentResult {
        let at = Date(), ref = self.tapId, kind = self.kind, ws = self.walkStart
        await CardChain.shared.run {
            guard let st = CardActs.live(ws)?.content.state,
                  CardMath.undoAllowed(lastKind: st.lastKind, lastId: st.lastId, lastUntil: st.lastUntil,
                                       recent: CardActs.recent, ref: ref, kind: kind, now: at),   // 앱에 닿은 때로 본다(줄에서 기다린 시간 빼고)
                  TapQueue.shared.appendUndo(ref: ref, kind: kind, at: at, walkStart: ws) != nil else { return }
            await CardActs.bump(walkStart: ws, kind: kind, by: -1, lastId: nil)
        }.value
        return .result()
    }
}
#endif
