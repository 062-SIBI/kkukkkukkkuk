// 홈 화면과 잠금 화면 위젯(0.5.3, 06 "이번 업데이트 때 위젯이랑 워치"). 누르면 앱이 열리고 바로 산책을 시작한다.
// 앱 그룹 없이 만든다: 위젯은 앱의 기록을 읽지 못하므로 숫자는 보이지 않는다(11/19 '위젯은 숫자 없이 링만'과도 맞음).
// 큰 위젯에는 앱의 '그거 아세요?' 한 줄을 날마다 바꿔 보인다. 문장은 빌드 때 index.html의 TIPS에서 옮긴다(WidgetTipData.swift).
// 산책 중에는 잠금 화면 산책 카드(WalkCardLiveActivity)가 버튼을 맡는다.
import SwiftUI
import WidgetKit

private let coral = Color(red: 1.0, green: 0x6B / 255.0, blue: 0x57 / 255.0)
private let yellow = Color(red: 0xEF / 255.0, green: 0xB0 / 255.0, blue: 0x2F / 255.0)
private let blue = Color(red: 0x3B / 255.0, green: 0x9D / 255.0, blue: 0xF5 / 255.0)
/// 앱 바탕(밝은 화면은 크림, 어두운 화면은 먹색)
private let paper = Color(UIColor { $0.userInterfaceStyle == .dark
    ? UIColor(red: 0.12, green: 0.115, blue: 0.11, alpha: 1)
    : UIColor(red: 0.965, green: 0.952, blue: 0.925, alpha: 1) })
private let ink = Color(UIColor { $0.userInterfaceStyle == .dark ? .white : UIColor(red: 0.12, green: 0.12, blue: 0.12, alpha: 1) })

// MARK: - 문장 고르기

enum WidgetTips {
    /// 그 달에 보일 수 있는 줄인가(from, to가 0이면 늘. 12월에서 2월처럼 해를 넘는 범위도 받는다)
    static func inMonth(_ m: Int, from: Int, to: Int) -> Bool {
        if from == 0 || to == 0 { return true }
        return from <= to ? (m >= from && m <= to) : (m >= from || m <= to)
    }

    /// 그날의 한 줄. 같은 날에는 늘 같은 줄이다
    static func pick(_ date: Date) -> String {
        let cal = Calendar(identifier: .gregorian)
        let m = cal.component(.month, from: date)
        let ok = WidgetTipData.rows.filter { inMonth(m, from: $0.1, to: $0.2) }
        guard !ok.isEmpty else { return "오늘 산책도 우리만의 기준으로" }
        let day = cal.ordinality(of: .day, in: .era, for: date) ?? 0
        return ok[day % ok.count].0
    }
}

// MARK: - 타임라인(날마다 0시에 한 줄씩, 7일 치)

struct StartEntry: TimelineEntry {
    let date: Date
    let tip: String
}

struct StartProvider: TimelineProvider {
    func placeholder(in context: Context) -> StartEntry {
        StartEntry(date: Date(), tip: WidgetTips.pick(Date()))
    }

    func getSnapshot(in context: Context, completion: @escaping (StartEntry) -> Void) {
        completion(placeholder(in: context))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StartEntry>) -> Void) {
        let cal = Calendar.current
        let now = Date()
        let today = cal.startOfDay(for: now)
        var entries = [StartEntry(date: now, tip: WidgetTips.pick(now))]
        for d in 1..<7 {
            if let day = cal.date(byAdding: .day, value: d, to: today) {
                entries.append(StartEntry(date: day, tip: WidgetTips.pick(day)))
            }
        }
        completion(Timeline(entries: entries, policy: .atEnd))
    }
}

// MARK: - 모습

/// 로고 점 셋(코랄 왼쪽 아래, 노랑 위, 파랑 오른쪽 아래)
private struct Dots: View {
    let size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(coral).frame(width: size, height: size).offset(x: -size * 0.62, y: size * 0.28)
            Circle().fill(yellow).frame(width: size, height: size).offset(x: 0, y: -size * 0.28)
            Circle().fill(blue).frame(width: size, height: size).offset(x: size * 0.62, y: size * 0.28)
        }
        .frame(width: size * 2.3, height: size * 1.6)
        .accessibilityHidden(true)
    }
}

/// 검은 동그라미 '산책 시작'(앱 홈의 시작 버튼과 같은 모양)
private struct StartCircle: View {
    let size: CGFloat
    var body: some View {
        ZStack {
            Circle().fill(Color(red: 0.12, green: 0.12, blue: 0.12))
            VStack(spacing: size * 0.05) {
                Dots(size: size * 0.11)
                Text("산책 시작")
                    .font(.system(size: size * 0.15, weight: .bold))
                    .foregroundColor(.white)
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
            }
        }
        .frame(width: size, height: size)
    }
}

private extension View {
    /// iOS 17부터는 위젯 바탕을 containerBackground로 줘야 한다(안 주면 '바탕을 정해 주세요' 화면)
    @ViewBuilder func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { color }
        } else {
            background(color)
        }
    }
}

struct StartView: View {
    @Environment(\.widgetFamily) private var family
    let entry: StartEntry

    var body: some View {
        switch family {
        case .accessoryCircular:
            ZStack {
                AccessoryWidgetBackground()
                VStack(spacing: 1) {
                    Dots(size: 7)
                    Text("산책").font(.system(size: 12, weight: .bold))
                }
            }
            .widgetBackground(.clear)
            .accessibilityLabel("꾹꾹이 산책 시작")
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("꾹꾹이").font(.system(size: 13, weight: .semibold)).foregroundStyle(.secondary)
                Text("눌러서 산책 시작").font(.system(size: 15, weight: .bold))
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .widgetBackground(.clear)
        case .accessoryInline:
            Text("꾹꾹이 산책 시작")
                .widgetBackground(.clear)
        case .systemMedium:
            HStack(spacing: 14) {
                StartCircle(size: 104)
                VStack(alignment: .leading, spacing: 5) {
                    Text("그거 아세요?")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(ink.opacity(0.55))
                    Text(entry.tip)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(ink)
                        .lineLimit(3)
                        .minimumScaleFactor(0.85)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    Text("누르면 바로 산책을 시작해요")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(ink.opacity(0.55))
                }
                Spacer(minLength: 0)
            }
            .widgetBackground(paper)
        default:   // .systemSmall
            VStack(spacing: 6) {
                StartCircle(size: 104)
                Text("꾹꾹이")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(ink.opacity(0.6))
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .widgetBackground(paper)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel("꾹꾹이 산책 시작")
        }
    }
}

struct WalkStartWidget: Widget {
    let kind = "WalkStart"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StartProvider()) { entry in
            StartView(entry: entry).widgetURL(WalkLink.start)
        }
        .configurationDisplayName("산책 시작")
        .description("누르면 꾹꾹이가 열리고 바로 산책을 시작해요.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryCircular, .accessoryRectangular, .accessoryInline])
    }
}
