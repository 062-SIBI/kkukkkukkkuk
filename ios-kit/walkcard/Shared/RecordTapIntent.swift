// 카드의 버튼. 앱 프로세스에서 돌아(LiveActivityIntent) 앱 안 큐에 남기고 카드 숫자를 바로 올린다.
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
        let id = TapQueue.shared.append(kind: kind, at: Date(), walkStart: walkStart)
        for activity in Activity<WalkActivityAttributes>.activities
        where abs(activity.attributes.startedAt.timeIntervalSince1970 * 1000 - walkStart) < 1000 {
            var state = activity.content.state
            switch kind {
            case "pee": state.pee += 1
            case "poop": state.poop += 1
            case "sniff": state.sniff += 1
            default: break
            }
            state.lastKind = kind
            state.lastId = id
            state.lastUntil = Date().addingTimeInterval(5)
            await activity.update(ActivityContent(state: state, staleDate: Date().addingTimeInterval(30 * 60)))
        }
        return .result()
    }
}
#endif
