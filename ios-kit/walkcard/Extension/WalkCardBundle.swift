// 꾹꾹이 위젯 익스텐션: 산책 카드(라이브 액티비티) 하나. iOS 18 이상은 워치 모습을 더한 판을 쓴다.
// WidgetBundleBuilder는 if #available에 else를 받지 않는다(iOS 26 SDK에 buildEither가 없다, 아스트라 Task 3, 4 회의).
// 그래서 고르기는 walkCardWidget()에서 하고, 빌더가 if #available을 풀 때 쓰는 두 함수로 감싸 한 타입으로 만든다.
// 같은 ActivityAttributes에 카드 모습이 둘 등록되지 않게 늘 하나만 돌려준다.
import SwiftUI
import WidgetKit

@main
struct WalkCardBundle: WidgetBundle {
    var body: some Widget {
        WidgetBundleBuilder.buildOptional(walkCardWidget())
    }
}

@MainActor
func walkCardWidget() -> (any Widget & _LimitedAvailabilityWidgetMarker)? {
    if #available(iOS 18.0, *) {
        return WidgetBundleBuilder.buildLimitedAvailability(WalkCardLiveActivityWatch())
    }
    return WidgetBundleBuilder.buildLimitedAvailability(WalkCardLiveActivity())
}
