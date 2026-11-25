// 앱 쪽 카드 관리가 산책 동안 기억하는 두 가지(앱 프로세스 메모리. 앱이 다시 켜지면 비어서 시작한다)
// LookMemo: 웹이 산책 첫 갱신에만 보내는 강아지 생김새. 카드 시작이 배경에서 실패해도 다음 시작에 쓴다.
// CardOwn: 우리가 띄운 카드. 사용자가 잠금 화면에서 지웠으면 그 산책 동안 다시 띄우지 않는다.
import Foundation

struct LookMemo {
    private var ws: Double?
    private var saved: DogLook?

    init() {}

    mutating func note(ws: Double, look: DogLook?) {
        if let cur = self.ws, CardMath.sameWalk(cur, ws) {
            if let look = look { saved = look }
        } else {
            self.ws = ws
            saved = look
        }
    }

    func look(for ws: Double) -> DogLook? {
        guard let cur = self.ws, CardMath.sameWalk(cur, ws) else { return nil }
        return saved
    }
}

struct CardOwn {
    private var ws: Double?
    private var id: String?

    init() {}

    mutating func started(ws: Double, id: String) {
        self.ws = ws
        self.id = id
    }

    /// 우리가 끝냈다(산책 끝). 5분 안에 이어 걸으면 새로 띄워도 된다
    mutating func ended(ws: Double) {
        if let cur = self.ws, CardMath.sameWalk(cur, ws) {
            self.ws = nil
            id = nil
        }
    }

    mutating func clear() {
        ws = nil
        id = nil
    }

    /// 이 산책에 띄운 우리 카드가 살아 있는 목록에 없으면(사용자나 시스템이 지움) 다시 띄우지 않는다
    func mayStart(ws: Double, liveIds: Set<String>) -> Bool {
        guard let cur = self.ws, let id = id, CardMath.sameWalk(cur, ws) else { return true }
        return liveIds.contains(id)
    }
}
