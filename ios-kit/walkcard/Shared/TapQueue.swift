// 카드에서 누른 것을 앱 안 파일에 쌓아 두는 큐. 웹이 drain으로 꺼내 가고, 저장한 뒤 ack로 지운다.
// 파일은 앱의 Application Support 안 walkcard-taps.json이고 백업에서 뺀다. UserDefaults는 쓰지 않는다.
import Foundation

struct Tap: Codable, Equatable {
    let id: String
    /// pee, poop, sniff, undo
    let type: String
    /// 누른 시각(ms)
    let t: Double
    /// 누를 때 카드가 보여 준 산책의 시작 시각(ms)
    let ws: Double
    /// undo일 때 되돌릴 눌림의 아이디
    let ref: String?

    var json: [String: Any] {
        var o: [String: Any] = ["id": id, "type": type, "t": t, "ws": ws]
        if let ref = ref { o["ref"] = ref }
        return o
    }
}

final class TapQueue {
    static let shared = TapQueue()
    private let queue = DispatchQueue(label: "app.padd.walk.walkcard.taps")

    private var fileURL: URL {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir.appendingPathComponent("walkcard-taps.json")
    }

    private func load() -> [Tap] {
        guard let data = try? Data(contentsOf: fileURL) else { return [] }
        return (try? JSONDecoder().decode([Tap].self, from: data)) ?? []
    }

    private func store(_ taps: [Tap]) {
        guard let data = try? JSONEncoder().encode(taps) else { return }
        var url = fileURL
        try? data.write(to: url, options: .atomic)
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }

    @discardableResult
    func append(kind: String, at: Date, walkStart: Double) -> String {
        let tap = Tap(id: UUID().uuidString, type: kind, t: (at.timeIntervalSince1970 * 1000).rounded(), ws: walkStart, ref: nil)
        queue.sync { var all = load(); all.append(tap); store(all) }
        return tap.id
    }

    @discardableResult
    func appendUndo(ref: String, at: Date, walkStart: Double) -> String {
        let tap = Tap(id: UUID().uuidString, type: "undo", t: (at.timeIntervalSince1970 * 1000).rounded(), ws: walkStart, ref: ref)
        queue.sync { var all = load(); all.append(tap); store(all) }
        return tap.id
    }

    func pending() -> [Tap] { queue.sync { load() } }

    func remove(ids: [String]) {
        let drop = Set(ids)
        queue.sync { store(load().filter { !drop.contains($0.id) }) }
    }
}
