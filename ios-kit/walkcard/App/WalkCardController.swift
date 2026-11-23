// 웹이 보낸 산책 상태로 라이브 액티비티를 시작, 갱신, 끝낸다(뼈대: 시작과 갱신, 끝나면 바로 지움).
import Foundation
#if canImport(ActivityKit)
import ActivityKit
#endif

struct WalkCardUpdate {
    let walking: Bool
    /// ms
    let startedAt: Double
    let km: Double
    let pee: Int
    let poop: Int
    let sniff: Int
    let ring: Double
}

#if canImport(ActivityKit)
@available(iOS 16.2, *)
final class WalkCardController {
    static let shared = WalkCardController()

    func sync(_ u: WalkCardUpdate) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("[walkcard] live activities off")
            return
        }
        Task {
            if u.walking {
                let start = Date(timeIntervalSince1970: u.startedAt / 1000)
                let state = WalkActivityAttributes.ContentState(
                    km: u.km, ring: u.ring, pee: u.pee, poop: u.poop, sniff: u.sniff,
                    ended: false, endedAt: nil, lastKind: nil, lastId: nil, lastUntil: nil)
                let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(30 * 60))
                if let current = Activity<WalkActivityAttributes>.activities.first(where: {
                    abs($0.attributes.startedAt.timeIntervalSince(start)) < 1
                }) {
                    await current.update(content)
                } else {
                    do {
                        let a = try Activity.request(
                            attributes: WalkActivityAttributes(startedAt: start, look: nil),
                            content: content, pushType: nil)
                        print("[walkcard] started \(a.id)")
                    } catch {
                        print("[walkcard] start failed: \(error)")
                    }
                }
            } else {
                for a in Activity<WalkActivityAttributes>.activities {
                    await a.end(nil, dismissalPolicy: .immediate)
                }
            }
        }
    }
}
#endif
