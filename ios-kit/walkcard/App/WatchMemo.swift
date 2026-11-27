// 워치 눌림을 받을 때 쓰는 작은 기억(0.5.3, PR #23 Codex 리뷰 P0 셋, 11/27). 앱 안 파일 walkcard/watch-link.json에 두고 백업에서 뺀다.
// 1) 받은 워치 눌림 아이디(최근 200개): 폰 앱이 다시 켜진 뒤 같은 눌림이 또 와도 한 번만 남긴다.
//    큐에는 워치가 만든 아이디를 그대로 쓰므로(TapQueue.appendWatch) 웹(산책마다 받은 아이디 wgIds)도 같은 눌림을 한 번만 저장한다.
// 2) 끝난 산책의 시작과 끝 시각(최근 20개)과 지금 걷는 산책: 워치가 끊긴 사이 끝난 산책에 그 뒤 눌림이 붙지 않게 한다.
//    끝 시각보다 1분 넘게 뒤에 누른 것, 새 산책을 시작한 뒤에 누른 옛 산책 눌림은 받지 않는다. 산책 중에 누르고 늦게 닿은 것은 받는다.
import Foundation

struct WatchMemo: Codable, Equatable {
    /// 받은 워치 눌림 아이디(오래된 것부터)
    var seen: [String] = []
    /// 끝난 산책: 시작 ms(반올림한 글자) → 끝 ms
    var ends: [String: Double] = [:]
    /// 끝난 산책을 적은 차례(오래된 것부터). ends를 20개로 줄일 때 쓴다
    var order: [String] = []
    /// 지금 걷는 산책의 시작 ms
    var current: Double?

    /// 워치와 폰 시계 차이를 봐 주는 여유(ms)
    static let grace: Double = 60_000
    static let seenMax = 200
    static let endsMax = 20

    static func key(_ ws: Double) -> String {
        guard ws.isFinite, abs(ws) < 1e15 else { return "x" }   // 깨진 값으로 Int64 바꾸기가 멈추지 않게
        return String(Int64(ws.rounded()))
    }

    func knows(_ id: String) -> Bool { seen.contains(id) }

    mutating func remember(_ id: String) {
        guard !seen.contains(id) else { return }
        seen.append(id)
        if seen.count > Self.seenMax { seen.removeFirst(seen.count - Self.seenMax) }
    }

    mutating func ended(ws: Double, at end: Double) {
        let k = Self.key(ws)
        if ends[k] == nil { order.append(k) }
        ends[k] = end
        if order.count > Self.endsMax {
            let drop = order.count - Self.endsMax
            for old in order.prefix(drop) { ends[old] = nil }
            order.removeFirst(drop)
        }
        if let c = current, CardMath.sameWalk(c, ws) { current = nil }
    }

    /// 웹이 보낸 산책 상태(PaddWidget.update)로 기억을 고친다. 바뀐 것이 있으면 true(그때만 파일에 쓴다)
    mutating func note(walking: Bool, startedAt: Double, end: (startedAt: Double, endedAt: Double)?, now: Double) -> Bool {
        let before = self
        if let e = end { ended(ws: e.startedAt, at: e.endedAt) }
        if walking && startedAt > 0 {
            if let c = current, !CardMath.sameWalk(c, startedAt) { ended(ws: c, at: startedAt) }   // 끝 모습 없이 새 산책이 시작됐다
            let k = Self.key(startedAt)
            if ends[k] != nil {   // 이어 걷기: 끝났던 산책이 다시 걷는 중
                ends[k] = nil
                order.removeAll { $0 == k }
            }
            current = startedAt
        } else if !walking, end == nil, let c = current {
            ended(ws: c, at: now)   // 끝 모습 없이 걷기가 멈췄다(끝 시각은 지금)
        }
        return self != before
    }

    /// 이 워치 눌림이 끝난 산책에 늦게 붙는 것인가(받지 않는다). t는 워치에서 누른 시각(ms)
    func isStale(ws: Double, t: Double) -> Bool {
        if let end = ends[Self.key(ws)] { return t > end + Self.grace }
        if let c = current, !CardMath.sameWalk(c, ws), t >= c { return true }   // 새 산책을 시작한 뒤에 누른 옛 산책 눌림
        return false
    }
}

/// 파일에 두는 워치 눌림 기억. CardChain 안에서만 읽고 쓴다
final class WatchMemoStore {
    private let url: URL
    private(set) var value: WatchMemo

    init(directory: URL = TapQueue.defaultDirectory()) {
        url = directory.appendingPathComponent("watch-link.json")
        value = (try? JSONDecoder().decode(WatchMemo.self, from: Data(contentsOf: url))) ?? WatchMemo()
    }

    /// change가 true를 돌려줄 때만 파일에 쓴다
    func update(_ change: (inout WatchMemo) -> Bool) {
        var m = value
        guard change(&m) else { return }
        value = m
        save()
    }

    private func save() {
        do {
            try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
            try JSONEncoder().encode(value).write(to: url, options: .atomic)
            #if os(iOS)
            var u = url
            var v = URLResourceValues()
            v.isExcludedFromBackup = true
            try? u.setResourceValues(v)
            #endif
        } catch {
            print("[watch] memo save failed: \(error)")
        }
    }
}
