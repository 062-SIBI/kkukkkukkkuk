// 카드 갱신(웹의 update, 카드 버튼, 되돌리기)을 한 줄로 세워 차례대로 돌린다.
// 각각 따로 돌면 활동을 두 번 시작하거나, 늦게 끝난 옛 값이 새 값을 덮을 수 있다.
import Foundation

final class CardChain {
    static let shared = CardChain()

    private let lock = NSLock()
    private var tail: Task<Void, Never>?

    init() {}

    @discardableResult
    func run(_ op: @escaping () async -> Void) -> Task<Void, Never> {
        lock.lock()
        defer { lock.unlock() }
        let prev = tail
        let next = Task {
            _ = await prev?.value
            await op()
        }
        tail = next
        return next
    }
}
