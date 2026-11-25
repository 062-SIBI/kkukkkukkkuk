// 산책 카드 모습: 잠금 화면, 다이내믹 아일랜드, 애플 워치(iOS 18 이상의 작은 모습). 시안 3(06 PC 21_위젯_1123/산책카드_시안3_1123.png).
// 버튼은 앱 산책 화면과 같은 순서와 색(왼쪽부터 똥 코랄, 킁킁 노랑, 꾹 파랑). 한 칸에 아이콘, 이름, 이번 산책 횟수(44pt 이상).
// 누른 칸은 5초 동안 체크와 '되돌리기'. iOS 17 미만은 버튼 대신 횟수 글. 끝난 카드와 오래된 카드에는 버튼이 없다.
// 링 안의 강아지는 Task 5에서 넣는다. 그 전에는 빈 링, 작은 아일랜드 왼쪽은 앱 색 점 셋(설계 '06이 정한 것' 3번).
import ActivityKit
import AppIntents   // Button(intent:)는 SwiftUI와 AppIntents를 함께 들여와야 쓸 수 있다
import SwiftUI
import WidgetKit

private struct Kind {
    let key: String
    let name: String
    let color: Color
    let icon: String
}

private let kinds = [
    Kind(key: "poop", name: "똥", color: Color(red: 1.0, green: 0x6B / 255.0, blue: 0x57 / 255.0), icon: "kk-poop"),
    Kind(key: "sniff", name: "킁킁", color: Color(red: 0xEF / 255.0, green: 0xB0 / 255.0, blue: 0x2F / 255.0), icon: "kk-nose"),
    Kind(key: "pee", name: "꾹", color: Color(red: 0x3B / 255.0, green: 0x9D / 255.0, blue: 0xF5 / 255.0), icon: "kk-pee")
]

/// 색 동그라미 위 그림 색(시안 3)
private let glyph = Color(red: 0.12, green: 0.12, blue: 0.12)

private func count(_ s: WalkActivityAttributes.ContentState, _ key: String) -> Int {
    switch key {
    case "poop": return s.poop
    case "sniff": return s.sniff
    default: return s.pee
    }
}

private func walkStartMs(_ c: ActivityViewContext<WalkActivityAttributes>) -> Double {
    c.attributes.startedAt.timeIntervalSince1970 * 1000
}

private func kmText(_ km: Double) -> String { String(format: "%.1fkm", km) }

/// 이 칸이 지금 '되돌리기'인가: 마지막으로 누른 칸이고 5초가 아직 안 지났다
private func undoId(_ s: WalkActivityAttributes.ContentState, _ key: String) -> String? {
    guard s.lastKind == key, let id = s.lastId, let until = s.lastUntil, until > Date() else { return nil }
    return id
}

/// 멈춘 걸은 시간(끝난 카드, 오래된 카드)
private func durationText(_ seconds: TimeInterval) -> String {
    let s = max(0, Int(seconds))
    let h = s / 3600, m = (s % 3600) / 60, sec = s % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, sec) : String(format: "%d:%02d", m, sec)
}

/// 걸은 시간. 걷는 중에는 아이폰이 스스로 흐르게 하고, 끝났거나 오래된 카드는 멈춘 값.
/// 흐르는 시간 글은 가장 긴 값 너비를 미리 잡으므로 부르는 쪽에서 너비를 정해 준다.
private struct Elapsed: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        let st = context.state, start = context.attributes.startedAt
        if st.ended {
            Text(durationText((st.endedAt ?? start).timeIntervalSince(start)))
        } else if context.isStale {
            Text(durationText((st.at ?? start).timeIntervalSince(start)))
        } else {
            Text(timerInterval: start...Date.distantFuture, countsDown: false)
                .multilineTextAlignment(.leading)
        }
    }
}

/// 산책 링(숫자 없음). -1이면 점선(평소 산책을 알아가는 중)
private struct Ring: View {
    let value: Double
    let size: CGFloat
    let width: CGFloat
    var ended = false
    var body: some View {
        ZStack {
            Circle().stroke(Color.primary.opacity(0.15), lineWidth: width)
            if value < 0 {
                Circle().stroke(Color.primary.opacity(0.45), style: StrokeStyle(lineWidth: width, dash: [width * 0.7, width * 1.1]))
            } else {
                Circle()
                    .trim(from: 0, to: CGFloat(max(0.001, min(1, value))))
                    .stroke(Color.primary, style: StrokeStyle(lineWidth: width, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
        }
        .frame(width: size, height: size)
        .accessibilityElement()
        .accessibilityLabel(ended ? "산책 끝" : "산책 중")
    }
}

/// 버튼 한 칸: 색 동그라미 안 아이콘, 아래 '똥 1'. 누른 칸이면 체크와 '되돌리기'.
/// 큰 글씨(접근성 크기)에서는 아이콘을 빼고 이름과 횟수를 지킨다
@available(iOS 17.0, *)
private struct TapCell: View {
    @Environment(\.dynamicTypeSize) private var typeSize
    let kind: Kind
    let context: ActivityViewContext<WalkActivityAttributes>
    let small: Bool

    var body: some View {
        let st = context.state, n = count(st, kind.key), ws = walkStartMs(context)
        if let id = undoId(st, kind.key) {
            Button(intent: UndoTapIntent(tapId: id, kind: kind.key, walkStart: ws)) {
                cell(label: "되돌리기", marked: true) {
                    Image(systemName: "checkmark").font(.system(size: small ? 10 : 14, weight: .heavy)).foregroundStyle(glyph)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(kind.name) 기록 되돌리기")
        } else {
            Button(intent: RecordTapIntent(kind: kind.key, walkStart: ws)) {
                cell(label: "\(kind.name) \(n)", marked: false) {
                    Image(kind.icon).renderingMode(.template).resizable().scaledToFit()
                        .foregroundStyle(glyph)
                        .frame(width: small ? 12 : 17, height: small ? 12 : 17)
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(kind.name) 기록, 이번 산책 \(n)번")
        }
    }

    private func cell<G: View>(label: String, marked: Bool, @ViewBuilder glyphView: () -> G) -> some View {
        let dot: CGFloat = small ? 20 : 26
        return VStack(spacing: small ? 2 : 3) {
            if !typeSize.isAccessibilitySize {
                ZStack {
                    Circle().fill(kind.color)
                    glyphView()
                }
                .frame(width: dot, height: dot)
            }
            Text(label)
                .font((small ? Font.system(size: 10) : Font.caption).weight(.semibold).monospacedDigit())
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .layoutPriority(1)
        }
        .frame(maxWidth: .infinity, minHeight: small ? 30 : 46, maxHeight: small ? CGFloat.infinity : nil)
        .padding(.vertical, small ? 1 : 3)
        .background(RoundedRectangle(cornerRadius: small ? 10 : 14, style: .continuous).fill(Color.primary.opacity(0.07)))
        .overlay(RoundedRectangle(cornerRadius: small ? 10 : 14, style: .continuous)
            .stroke(marked ? kind.color : Color.clear, lineWidth: 2))
        .contentShape(Rectangle())
    }
}

/// 이번 산책 횟수 글(끝난 카드, iOS 16)
private func countsLine(_ s: WalkActivityAttributes.ContentState) -> String {
    kinds.map { "\($0.name) \(count(s, $0.key))" }.joined(separator: "   ")
}

/// 버튼 셋(iOS 17 이상). 그보다 낮으면 횟수 글과 안내
private struct Buttons: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var small = false
    var body: some View {
        if #available(iOS 17.0, *) {
            HStack(spacing: small ? 4 : 8) {
                ForEach(kinds, id: \.key) { k in TapCell(kind: k, context: context, small: small) }
            }
        } else {
            VStack(alignment: .leading, spacing: 2) {
                Text(countsLine(context.state))
                    .font(.headline.monospacedDigit())
                Text("이 아이폰(iOS 16)에서는 앱에서 기록해요").font(.caption2).foregroundStyle(.secondary)
            }
        }
    }
}

/// 잠금 화면(그리고 iOS 18 미만 워치)
private struct LockView: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        let st = context.state, stale = context.isStale && !st.ended
        VStack(alignment: .leading, spacing: 6) {
            if st.ended {
                Text("산책 끝").font(.headline)
            } else if stale {
                Text("앱에서 산책을 확인해 주세요").font(.headline).lineLimit(1).minimumScaleFactor(0.8)
            }
            HStack(alignment: .center, spacing: 10) {
                Elapsed(context: context)
                    .font(.system(size: 28, weight: .bold).monospacedDigit())
                    .lineLimit(1).minimumScaleFactor(0.6)
                    .frame(width: 118, alignment: .leading)
                Text(kmText(st.km)).font(.title3.weight(.semibold).monospacedDigit()).lineLimit(1)
                Spacer(minLength: 4)
                Ring(value: st.ring, size: 48, width: 5, ended: st.ended)
            }
            .opacity(stale ? 0.55 : 1)
            if st.ring < 0 && !st.ended && !stale {
                Text("평소 산책을 알아가는 중").font(.caption2).foregroundStyle(.secondary)
            }
            if st.ended {
                Text(countsLine(st)).font(.headline.monospacedDigit())
            } else if !stale {
                Buttons(context: context).padding(.top, 2)
            }
        }
        .padding(12)
    }
}

/// 애플 워치 스마트 스택(iOS 18 이상의 작은 모습): 위에 시간과 링, 아래 작은 버튼 셋
private struct SmallView: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        let st = context.state, stale = context.isStale && !st.ended
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Elapsed(context: context).font(.system(size: 15, weight: .bold).monospacedDigit()).lineLimit(1).minimumScaleFactor(0.7)
                    .frame(width: 66, alignment: .leading)
                Spacer(minLength: 2)
                Ring(value: st.ring, size: 20, width: 3, ended: st.ended)
            }
            if st.ended {
                Text("산책 끝  " + countsLine(st)).font(.caption2.weight(.semibold)).lineLimit(1).minimumScaleFactor(0.7)
            } else if stale {
                Text("앱에서 산책을 확인해 주세요").font(.caption2).lineLimit(2)
            } else {
                Buttons(context: context, small: true)
            }
        }
        .padding(6)
    }
}

@available(iOS 18.0, *)
private struct FamilyView: View {
    @Environment(\.activityFamily) private var family
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        if family == .small { SmallView(context: context) } else { LockView(context: context) }
    }
}

private struct CardView: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        if #available(iOS 18.0, *) { FamilyView(context: context) } else { LockView(context: context) }
    }
}

/// 다이내믹 아일랜드 펼친 모습 아래: 거리, 그리고 버튼(끝났거나 오래됐으면 글)
private struct IslandBottom: View {
    let context: ActivityViewContext<WalkActivityAttributes>
    var body: some View {
        let st = context.state
        VStack(spacing: 6) {
            Text(kmText(st.km)).font(.headline.monospacedDigit()).frame(maxWidth: .infinity)
            if st.ended {
                Text("산책 끝   " + countsLine(st)).font(.footnote.weight(.semibold))
            } else if context.isStale {
                Text("앱에서 산책을 확인해 주세요").font(.footnote)
            } else {
                Buttons(context: context)
            }
        }
    }
}

/// 다이내믹 아일랜드 작은 모습 왼쪽의 앱 색 점 셋(강아지를 넣기 전). 좁은 자리라 세로로 쌓는다
private struct Dots: View {
    var body: some View {
        VStack(spacing: 1.5) {
            ForEach(kinds, id: \.key) { k in Circle().fill(k.color).frame(width: 4, height: 4) }
        }
        .accessibilityHidden(true)
    }
}

@MainActor
func walkCardConfiguration() -> some WidgetConfiguration {
    ActivityConfiguration(for: WalkActivityAttributes.self) { context in
        CardView(context: context)
    } dynamicIsland: { context in
        DynamicIsland {
            DynamicIslandExpandedRegion(.leading) {
                Elapsed(context: context).font(.title2.bold().monospacedDigit()).lineLimit(1).minimumScaleFactor(0.7)
                    .frame(width: 110, alignment: .leading).padding(.leading, 6)
            }
            DynamicIslandExpandedRegion(.trailing) {
                Ring(value: context.state.ring, size: 40, width: 5, ended: context.state.ended).padding(.trailing, 6)
            }
            DynamicIslandExpandedRegion(.bottom) {
                IslandBottom(context: context)
            }
        } compactLeading: {
            HStack(spacing: 3) {
                Dots()
                Elapsed(context: context).font(.caption2.weight(.semibold).monospacedDigit()).lineLimit(1)
                    .frame(width: 40, alignment: .leading)
            }
        } compactTrailing: {
            Ring(value: context.state.ring, size: 16, width: 3, ended: context.state.ended)
        } minimal: {
            Ring(value: context.state.ring, size: 16, width: 3, ended: context.state.ended)
        }
    }
}

struct WalkCardLiveActivity: Widget {
    var body: some WidgetConfiguration { walkCardConfiguration() }
}

/// iOS 18 이상: 애플 워치 스마트 스택에도 작은 모습으로 보인다
@available(iOS 18.0, *)
struct WalkCardLiveActivityWatch: Widget {
    var body: some WidgetConfiguration { walkCardConfiguration().supplementalActivityFamilies([.small]) }
}
