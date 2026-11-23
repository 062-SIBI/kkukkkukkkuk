// 아이폰 산책 카드(라이브 액티비티)의 값. 앱과 위젯 익스텐션이 함께 쓴다.
// 갱신 한 번의 값은 4KB를 넘을 수 없다(애플). 그래서 그림은 넣지 않고 숫자와 짧은 글만 둔다.
#if canImport(ActivityKit)
import ActivityKit
import Foundation

@available(iOS 16.1, *)
struct WalkActivityAttributes: ActivityAttributes {
    /// 이 산책의 시작 시각. 카드가 어느 산책의 것인지 이것으로 가린다.
    let startedAt: Date
    /// 앱에서 꾸민 강아지 생김새(없으면 기본형). 산책을 시작할 때 한 번 정한다.
    let look: DogLook?

    struct ContentState: Codable, Hashable {
        var km: Double
        /// 산책 화면 링과 같은 값(0~1). 기준을 배우는 중이면 -1. 숫자로 보이지 않는다.
        var ring: Double
        var pee: Int
        var poop: Int
        var sniff: Int
        var ended: Bool
        var endedAt: Date?
        /// 마지막으로 누른 칸(되돌리기를 5초 보이려고)
        var lastKind: String?
        var lastId: String?
        var lastUntil: Date?
    }
}
#endif
