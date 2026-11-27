// 홈 화면 위젯에서 앱을 열 때 쓰는 주소(0.5.3). 앱(PaddWidgetPlugin)과 위젯 익스텐션이 같이 쓴다.
// Info.plist의 URL 스킴(ios-kit/patch-ios.js ④)과 이름이 같아야 한다.
import Foundation

enum WalkLink {
    static let scheme = "kkukkkukkkuk"
    static let start = URL(string: "kkukkkukkkuk://walk/start")!

    /// 산책 시작 주소인가(대소문자와 끝 슬래시 차이는 받아 준다)
    static func isStart(_ url: URL) -> Bool {
        guard url.scheme?.lowercased() == scheme else { return false }
        let host = url.host?.lowercased() ?? ""
        let path = url.path.lowercased().trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        return host == "walk" && path == "start"
    }
}
