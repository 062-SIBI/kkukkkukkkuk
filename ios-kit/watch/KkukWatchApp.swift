// 꾹꾹이 워치 앱(0.5.3, 06 "이번 업데이트 때 위젯이랑 워치", 11/23 '워치용 버튼').
// 폰에서 시작한 산책에 손목에서 똥, 킁킁, 꾹을 남긴다. 산책 시작과 끝은 폰에서 한다(애플워치 2단계 계획 11/11).
// 버튼 색은 앱 산책 화면, 산책 카드와 같다(똥 코랄, 킁킁 노랑, 꾹 파랑). 산책 중 화면은 06 손그림(11/27)대로
// 덩어리 셋이 화면을 채우고(WatchBlobs.swift), 걸은 시간과 거리는 노랑 덩어리 왼쪽 위 구석에 작게 둔다.
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
    /// 걸은 거리(km). 폰이 산책 상태와 함께 보낸다
    @Published var km: Double = 0
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
        km = (c["km"] as? Double) ?? 0
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

/// 덩어리 버튼 하나. 화면 전체 크기로 겹쳐 두고, 누르는 자리는 덩어리 모양으로만 받는다(사이 틈은 아무것도 아님).
/// 아이콘만 둔다(산책 카드 B안과 같이 글자 없음). 누르면 0.8초 동안 체크와 밝아짐, 짧은 진동
private struct BlobButton: View {
    @EnvironmentObject var link: PhoneLink
    let kind: String
    let name: String
    let color: Color
    let blob: Blob
    let size: CGSize

    var body: some View {
        let n = link.counts[kind] ?? 0
        let on = link.flash == kind
        let s = size.width * 0.17
        Button { link.tap(kind) } label: {
            ZStack {
                blob.shape.fill(color)
                if on { blob.shape.fill(Color.white.opacity(0.22)) }
                Group {
                    if on {
                        Image(systemName: "checkmark").font(.system(size: s * 0.7, weight: .heavy))
                    } else {
                        KkIcon(kind: kind)
                    }
                }
                .foregroundColor(glyph)
                .frame(width: s, height: s)
                .position(x: blob.icon.x * size.width, y: blob.icon.y * size.height)
            }
            .frame(width: size.width, height: size.height)
            .contentShape(blob.shape)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(name) 기록, 지금 \(n)번")
    }
}

/// 산책 중 화면: 덩어리 셋(왼쪽 아래 똥, 위 킁킁, 오른쪽 꾹)과 노랑 덩어리 구석의 걸은 시간, 거리
private struct BlobPad: View {
    @EnvironmentObject var link: PhoneLink

    var body: some View {
        GeometryReader { geo in
            let size = geo.size, big = size.width > 180
            ZStack(alignment: .topLeading) {
                BlobButton(kind: "sniff", name: "킁킁", color: yellow, blob: Blobs.sniff, size: size)
                BlobButton(kind: "pee", name: "꾹", color: blue, blob: Blobs.pee, size: size)
                BlobButton(kind: "poop", name: "똥", color: coral, blob: Blobs.poop, size: size)
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    // 흐르는 시간 글은 가장 긴 값 너비를 잡으므로 너비를 정해 준다(한 시간이 넘으면 줄여 맞춤)
                    Text(timerInterval: Date(timeIntervalSince1970: link.ws / 1000)...Date.distantFuture, countsDown: false)
                        .font(.system(size: big ? 15 : 14, weight: .bold))
                        .monospacedDigit()
                        .minimumScaleFactor(0.7)
                        .frame(width: big ? 46 : 43, alignment: .leading)
                    Text(String(format: "%.1fkm", link.km))
                        .font(.system(size: big ? 13 : 12, weight: .semibold))
                        .monospacedDigit()
                }
                .lineLimit(1)
                .foregroundColor(glyph)
                .padding(.leading, size.width * 0.075)
                .padding(.top, size.height * 0.05)
                .allowsHitTesting(false)   // 글 위를 눌러도 킁킁 덩어리가 받게
                .accessibilityElement(children: .combine)
            }
            .frame(width: size.width, height: size.height)
        }
        .padding(.horizontal, 4)
        .padding(.bottom, 4)
    }
}

struct WatchHome: View {
    @EnvironmentObject var link: PhoneLink

    var body: some View {
        if link.walking && link.ws > 0 {
            BlobPad()
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
