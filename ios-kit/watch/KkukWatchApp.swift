// 꾹꾹이 워치 앱(0.5.3, 06 "이번 업데이트 때 위젯이랑 워치", 11/23 '워치용 버튼').
// 폰에서 시작한 산책에 손목에서 똥, 킁킁, 꾹을 남긴다. 산책 시작과 끝은 폰에서 한다(애플워치 2단계 계획 11/11).
// 버튼 순서와 색은 앱 산책 화면, 산책 카드와 같다(왼쪽부터 똥 코랄, 킁킁 노랑, 꾹 파랑).
// 누른 것은 폰의 WatchLink가 산책 카드와 같은 큐에 남기고, 폰 앱 화면이 걷는 동안 가져간다.
import SwiftUI
import WatchConnectivity
import WatchKit

private let coral = Color(red: 1.0, green: 0x6B / 255.0, blue: 0x57 / 255.0)
private let yellow = Color(red: 0xEF / 255.0, green: 0xB0 / 255.0, blue: 0x2F / 255.0)
private let blue = Color(red: 0x3B / 255.0, green: 0x9D / 255.0, blue: 0xF5 / 255.0)
private let glyph = Color(red: 0.12, green: 0.12, blue: 0.12)

@main
struct KkukWatchApp: App {
    @StateObject private var link = PhoneLink.shared
    var body: some Scene {
        WindowGroup {
            WatchHome().environmentObject(link)
        }
    }
}

/// 폰과 주고받기. 폰은 산책 상태를 applicationContext로 보내고(가장 최근 것만), 워치는 누른 것을 메시지로 보낸다.
/// 폰이 닿지 않거나 메시지가 실패하면 transferUserInfo로 맡겨 두었다가 닿을 때 보낸다(순서대로, 잃지 않게).
final class PhoneLink: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = PhoneLink()

    @Published var walking = false
    /// 산책 시작 시각(ms)
    @Published var ws: Double = 0
    @Published var counts: [String: Int] = [:]
    /// 방금 누른 칸(잠깐 체크 표시)
    @Published var flash: String?
    private var lastAt: Double = 0

    override init() {
        super.init()
        if WCSession.isSupported() {
            WCSession.default.delegate = self
            WCSession.default.activate()
        }
    }

    @MainActor func apply(_ c: [String: Any]) {
        let at = (c["at"] as? Double) ?? 0
        if at > 0 && at < lastAt { return }   // 늦게 온 옛 상태
        lastAt = max(lastAt, at)
        walking = (c["walking"] as? Bool) ?? false
        ws = (c["ws"] as? Double) ?? 0
        counts = ["poop": (c["poop"] as? Int) ?? 0, "sniff": (c["sniff"] as? Int) ?? 0, "pee": (c["pee"] as? Int) ?? 0]
    }

    @MainActor func tap(_ kind: String) {
        guard walking, ws > 0 else { return }
        let m: [String: Any] = ["kind": kind, "ws": ws, "t": Date().timeIntervalSince1970 * 1000, "id": UUID().uuidString]
        counts[kind, default: 0] += 1   // 폰의 답을 기다리지 않고 바로 올린다(폰이 다음 상태로 맞춘다)
        flash = kind
        WKInterfaceDevice.current().play(.click)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { [weak self] in
            if self?.flash == kind { self?.flash = nil }
        }
        let s = WCSession.default
        if s.activationState == .activated && s.isReachable {
            s.sendMessage(m, replyHandler: { _ in }, errorHandler: { _ in s.transferUserInfo(m) })
        } else {
            s.transferUserInfo(m)
        }
    }

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        let c = session.receivedApplicationContext
        Task { @MainActor in self.apply(c) }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        Task { @MainActor in self.apply(applicationContext) }
    }
}

/// 로고 점 셋
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

private struct TapButton: View {
    @EnvironmentObject var link: PhoneLink
    let kind: String
    let name: String
    let color: Color

    var body: some View {
        let n = link.counts[kind] ?? 0
        Button { link.tap(kind) } label: {
            VStack(spacing: 2) {
                Text(link.flash == kind ? "✓" : name)
                    .font(.system(size: 15, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.7)
                Text("\(n)")
                    .font(.system(size: 14, weight: .semibold))
                    .monospacedDigit()
            }
            .foregroundColor(glyph)
            .frame(maxWidth: .infinity, minHeight: 66)
            .background(RoundedRectangle(cornerRadius: 14).fill(color))
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(name) 기록, 지금 \(n)번")
    }
}

struct WatchHome: View {
    @EnvironmentObject var link: PhoneLink

    var body: some View {
        if link.walking && link.ws > 0 {
            VStack(spacing: 8) {
                Text(timerInterval: Date(timeIntervalSince1970: link.ws / 1000)...Date.distantFuture, countsDown: false)
                    .font(.system(size: 18, weight: .semibold))
                    .monospacedDigit()
                HStack(spacing: 5) {
                    TapButton(kind: "poop", name: "똥", color: coral)
                    TapButton(kind: "sniff", name: "킁킁", color: yellow)
                    TapButton(kind: "pee", name: "꾹", color: blue)
                }
            }
            .padding(.horizontal, 2)
        } else {
            VStack(spacing: 10) {
                Dots(size: 12)
                Text("폰에서 산책을 시작하면\n여기서 눌러 기록해요")
                    .font(.system(size: 14, weight: .medium))
                    .multilineTextAlignment(.center)
            }
        }
    }
}
