// 카드에서 누른 것을 앱 안 파일에 쌓아 두는 큐. 웹이 drain으로 꺼내 가고, 저장한 뒤 ack로 지운다.
// 파일은 앱의 Application Support/walkcard 폴더 안 walkcard-taps.json이다. 폴더째 백업에서 뺀다(파일을 통째로 바꿔 써도 빠진 채로 남는다).
// UserDefaults는 쓰지 않는다.
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
    /// undo일 때 되돌린 눌림의 종류(카드 횟수 계산에만 쓰고 웹에는 보내지 않는다)
    let of: String?

    var json: [String: Any] {
        var o: [String: Any] = ["id": id, "type": type, "t": t, "ws": ws]
        if let ref = ref { o["ref"] = ref }
        return o
    }
}

/// 배열의 한 항목이 깨져도 나머지는 읽는다
private struct LenientTap: Decodable {
    let tap: Tap?
    init(from decoder: Decoder) throws { tap = try? Tap(from: decoder) }
}

final class TapQueue {
    static let shared = TapQueue(directory: TapQueue.defaultDirectory())

    static func defaultDirectory() -> URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        return base.appendingPathComponent("walkcard", isDirectory: true)
    }

    private let dir: URL
    private let queue = DispatchQueue(label: "app.padd.walk.walkcard.taps")
    /// 방금 남긴 눌림(5초). 웹이 가져가 지운(ack) 뒤에도 두 번 전달을 가리려고 앱 메모리에만 둔다
    private var lately: [(tap: Tap, added: Date)] = []

    init(directory: URL) { dir = directory }

    var fileURL: URL { dir.appendingPathComponent("walkcard-taps.json") }

    /// nil이면 읽지 못한 것이다(파일이 없다는 것까지 확인한 때만 빈 큐). 이때는 쓰지 않는다(남은 눌림을 덮어 지우지 않게).
    /// fileExists는 폴더에 닿지 못해도 false라서 쓰지 않고, 읽기 오류가 '파일 없음'일 때만 빈 큐로 본다.
    private func load() -> [Tap]? {
        let fm = FileManager.default
        let data: Data
        do {
            data = try Data(contentsOf: fileURL)
        } catch let e as CocoaError where e.code == .fileReadNoSuchFile {
            return []
        } catch {
            return nil
        }
        if data.isEmpty { return [] }
        if let items = try? JSONDecoder().decode([LenientTap].self, from: data) {
            return items.compactMap { $0.tap }
        }
        // 배열이 아닌 깨진 파일: 지우지 않고 옆으로 옮겨 두고 새로 시작한다
        let aside = dir.appendingPathComponent("walkcard-taps.bad-\(Int(Date().timeIntervalSince1970)).json")
        do { try fm.moveItem(at: fileURL, to: aside) } catch { return nil }
        return []
    }

    private func store(_ taps: [Tap]) -> Bool {
        do {
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            excludeFromBackup(dir)
            let data = try JSONEncoder().encode(taps)
            try data.write(to: fileURL, options: .atomic)
            excludeFromBackup(fileURL)
            return true
        } catch {
            return false
        }
    }

    private func excludeFromBackup(_ target: URL) {
        #if os(iOS)
        var url = target
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
        #endif
    }

    private func add(type: String, at: Date, walkStart: Double, ref: String?, of: String?) -> String? {
        let tap = Tap(id: UUID().uuidString, type: type, t: (at.timeIntervalSince1970 * 1000).rounded(),
                      ws: walkStart, ref: ref, of: of)
        return queue.sync { () -> String? in
            guard var all = load() else { return nil }
            all.append(tap)
            guard store(all) else { return nil }
            lately = lately.filter { at.timeIntervalSince($0.added) < 5 } + [(tap, at)]
            return tap.id
        }
    }

    /// 5초 안에 남긴 눌림(큐에서 지워졌어도)
    func recentTaps(now: Date = Date()) -> [Tap] {
        queue.sync { lately.filter { now.timeIntervalSince($0.added) < 5 }.map { $0.tap } }
    }

    /// 남기지 못하면 nil(카드 숫자를 올리지 않는다)
    @discardableResult
    func append(kind: String, at: Date, walkStart: Double) -> String? {
        add(type: kind, at: at, walkStart: walkStart, ref: nil, of: nil)
    }

    @discardableResult
    func appendUndo(ref: String, kind: String, at: Date, walkStart: Double) -> String? {
        add(type: "undo", at: at, walkStart: walkStart, ref: ref, of: kind)
    }

    /// nil이면 파일을 읽지 못한 것이다(drain은 거절해 웹이 빈 목록으로 오해하지 않게 한다)
    func pending() -> [Tap]? { queue.sync { load() } }

    func remove(ids: [String]) {
        let drop = Set(ids)
        queue.sync {
            guard let all = load() else { return }
            _ = store(all.filter { !drop.contains($0.id) })
        }
    }
}
