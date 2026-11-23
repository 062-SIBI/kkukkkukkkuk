// 산책 카드 모습(뼈대: 걸은 시간과 꾹 버튼 하나). 모습 전체는 Task 4.
import ActivityKit
import AppIntents   // Button(intent:)는 SwiftUI와 AppIntents를 함께 들여와야 쓸 수 있다
import SwiftUI
import WidgetKit

private let sky = Color(red: 0x3B / 255.0, green: 0x9D / 255.0, blue: 0xF5 / 255.0)

private func walkStartMs(_ c: ActivityViewContext<WalkActivityAttributes>) -> Double {
    c.attributes.startedAt.timeIntervalSince1970 * 1000
}

private struct PeeButton: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        if #available(iOS 17.0, *) {
            Button(intent: RecordTapIntent(kind: "pee", walkStart: walkStartMs(context))) {
                Text("꾹 \(context.state.pee)").font(.headline).frame(minWidth: 64, minHeight: 44)
            }
            .tint(sky)
        } else {
            Text("꾹 \(context.state.pee)").font(.headline)
        }
    }
}

struct WalkCardLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WalkActivityAttributes.self) { context in
            HStack {
                Text(timerInterval: context.attributes.startedAt...Date.distantFuture, countsDown: false)
                    .font(.title2.bold()).monospacedDigit()
                Spacer()
                PeeButton(context: context)
            }
            .padding(16)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Text(timerInterval: context.attributes.startedAt...Date.distantFuture, countsDown: false)
                        .monospacedDigit()
                }
                DynamicIslandExpandedRegion(.trailing) {
                    PeeButton(context: context)
                }
            } compactLeading: {
                Text(timerInterval: context.attributes.startedAt...Date.distantFuture, countsDown: false)
                    .monospacedDigit().frame(maxWidth: 52)
            } compactTrailing: {
                Text("\(context.state.pee)")
            } minimal: {
                Text("\(context.state.pee)")
            }
        }
    }
}
