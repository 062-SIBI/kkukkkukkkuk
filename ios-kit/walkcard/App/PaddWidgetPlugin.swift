// 웹(index.html)의 PaddWidget 다리를 아이폰에서 받는 플러그인. MainViewController가 등록한다.
// update: 산책 상태로 카드를 시작, 갱신, 끝낸다. drain: 카드에서 누른 것을 꺼내 준다(지우지 않음). ack: 저장한 것을 지운다.
import Capacitor
import Foundation

@objc(PaddWidgetPlugin)
public class PaddWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PaddWidgetPlugin"
    public let jsName = "PaddWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drain", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "ack", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "consumeLaunch", returnType: CAPPluginReturnPromise)
    ]

    override public func load() {
        print("[walkcard] plugin loaded")
    }

    private static func number(_ v: JSValue?) -> Double? {
        if let n = v as? NSNumber { return n.doubleValue }
        if let d = v as? Double { return d }
        if let i = v as? Int { return Double(i) }
        if let s = v as? String { return Double(s) }
        return nil
    }

    private static func ids(_ v: JSValue?) -> [String] {
        ((v as? JSArray) ?? []).compactMap { $0 as? String }
    }

    private static func look(_ o: JSObject?) -> DogLook? {
        guard let o = o, let coat = o["coat"] as? String, let ear = o["ear"] as? String,
              let tail = o["tail"] as? String, let fur = o["fur"] as? String else { return nil }
        return DogLook(coat: coat, snout: Int(number(o["snout"]) ?? 50), leg: Int(number(o["leg"]) ?? 50),
                       ear: ear, tail: tail, fur: fur, waist: Int(number(o["waist"]) ?? 0))
    }

    private static func end(_ o: JSObject?) -> WalkCardEnd? {
        guard let o = o, let start = number(o["startedAt"]), start > 0 else { return nil }
        return WalkCardEnd(startedAt: start, endedAt: number(o["endedAt"]) ?? start, km: number(o["km"]) ?? 0,
                           ring: number(o["ring"]) ?? -1, pee: Int(number(o["pee"]) ?? 0),
                           poop: Int(number(o["poop"]) ?? 0), sniff: Int(number(o["sniff"]) ?? 0),
                           taken: ids(o["taken"]))
    }

    @objc func update(_ call: CAPPluginCall) {
        let u = WalkCardUpdate(
            walking: call.getBool("walking") ?? false,
            startedAt: call.getDouble("startedAt") ?? 0,
            km: Double(call.getString("km") ?? "") ?? 0,
            pee: call.getInt("pee") ?? 0,
            poop: call.getInt("poop") ?? 0,
            sniff: call.getInt("sniff") ?? 0,
            ring: call.getDouble("ring") ?? -1,
            look: Self.look(call.getObject("look")),
            taken: (call.getArray("taken") ?? []).compactMap { $0 as? String },
            end: Self.end(call.getObject("end"))
        )
        print("[walkcard] update walking=\(u.walking) km=\(u.km) end=\(u.end != nil)")
        if #available(iOS 16.2, *) {
            WalkCardController.shared.sync(u)
        }
        call.resolve()   // 실패로 끝내면 웹이 다리를 끈다. 카드를 못 띄워도 성공으로 답한다
    }

    @objc func drain(_ call: CAPPluginCall) {
        // 큐 파일을 읽지 못하면 거절한다. 빈 목록으로 답하면 웹이 기다리던 산책을 빈 산책으로 정리한다
        guard let taps = TapQueue.shared.pending() else {
            call.reject("walkcard queue unreadable")
            return
        }
        call.resolve(["events": taps.map { $0.json }])
    }

    @objc func ack(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") ?? []).compactMap { $0 as? String }
        // 카드 갱신과 같은 줄에서 지운다. 먼저 들어온 갱신이 지운 뒤의 큐로 횟수를 세지 않게
        CardChain.shared.run {
            TapQueue.shared.remove(ids: ids)
            call.resolve()
        }
    }

    @objc func consumeLaunch(_ call: CAPPluginCall) {
        call.resolve(["action": ""])   // 이번 판에는 시작 버튼이 없다
    }
}
