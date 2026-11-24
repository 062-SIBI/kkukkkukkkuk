// 카드에 보이는 횟수 = 웹이 보낸 횟수 + 큐에 남은 이 산책의 눌림 중 웹이 아직 세지 않은 것(taken에 없는 것)
// 눌림은 그 종류에 +1, 되돌리기는 되돌린 종류에 -1. 0 아래로는 내려가지 않는다.
import Foundation

struct CardCounts: Equatable {
    var pee = 0
    var poop = 0
    var sniff = 0

    subscript(kind: String) -> Int {
        get {
            switch kind {
            case "pee": return pee
            case "poop": return poop
            case "sniff": return sniff
            default: return 0
            }
        }
        set {
            switch kind {
            case "pee": pee = newValue
            case "poop": poop = newValue
            case "sniff": sniff = newValue
            default: break
            }
        }
    }
}

/// 5초가 지나 체크를 비운 눌림(그 직후 닿은 되돌리기를 받으려고 앱 메모리에만 둔다)
struct RecentTap: Equatable {
    let id: String
    let kind: String
    let until: Date
}

enum CardMath {
    /// 같은 산책인가: 시작 시각(ms)을 반올림해 같을 때(웹 walkByStart와 같은 규칙. Date를 거친 작은 오차는 반올림이 지운다)
    static func sameWalk(_ a: Double, _ b: Double) -> Bool { a.rounded() == b.rounded() }

    /// 같은 칸이 아직 체크(5초)인데 또 눌림이 왔다: 두 번 전달된 것으로 보고 한 번만 남긴다
    static func isRepeat(lastKind: String?, lastUntil: Date?, kind: String, at: Date) -> Bool {
        guard lastKind == kind, let until = lastUntil else { return false }
        return until > at
    }

    /// 이 산책의 가장 최근 눌림(되돌린 것은 빼고)이 같은 종류이고 2초 안이다: 두 번 전달된 것으로 본다.
    /// 카드 체크로 못 가리는 경우(그사이 산책이 끝남)를 막는다. 사이에 다른 칸을 눌렀으면 새 기록이다(꾹, 킁킁, 꾹)
    static func queueRepeat(_ taps: [Tap], kind: String, walkStart: Double, at: Date) -> Bool {
        let atMs = at.timeIntervalSince1970 * 1000
        let undone = Set(taps.compactMap { $0.type == "undo" ? $0.ref : nil })
        let last = taps
            .filter { $0.type != "undo" && sameWalk($0.ws, walkStart) && !undone.contains($0.id) && $0.t <= atMs }
            .max { $0.t < $1.t }
        guard let l = last else { return false }
        return l.type == kind && atMs - l.t < 2000
    }

    /// 되돌리기는 카드가 지금 그 눌림의 체크를 보일 때만 받는다(늦게 닿은 되돌리기는 2초 여유).
    /// 5초 정리가 먼저 끝났으면 방금 비운 눌림(recent)으로 2초 안에서 받는다.
    /// 다른 눌림으로 바뀌었거나 이미 되돌린 눌림(같은 눌림을 두 번 되돌림)은 받지 않는다
    static func undoAllowed(lastKind: String?, lastId: String?, lastUntil: Date?, recent: RecentTap?,
                            ref: String, kind: String, now: Date) -> Bool {
        if lastId == ref, lastKind == kind, let until = lastUntil {
            return until.addingTimeInterval(2) > now
        }
        if let r = recent, r.id == ref, r.kind == kind {
            return r.until.addingTimeInterval(2) > now
        }
        return false
    }

    static func delta(_ taps: [Tap], walkStart: Double, taken: Set<String>) -> CardCounts {
        var d = CardCounts()
        for tap in taps where sameWalk(tap.ws, walkStart) && !taken.contains(tap.id) {
            if tap.type == "undo" {
                if let kind = tap.of { d[kind] -= 1 }
            } else {
                d[tap.type] += 1
            }
        }
        return d
    }

    static func shown(base: CardCounts, delta: CardCounts) -> CardCounts {
        CardCounts(pee: max(0, base.pee + delta.pee),
                   poop: max(0, base.poop + delta.poop),
                   sniff: max(0, base.sniff + delta.sniff))
    }
}
