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

    @objc func update(_ call: CAPPluginCall) {
        let u = WalkCardUpdate(
            walking: call.getBool("walking") ?? false,
            startedAt: call.getDouble("startedAt") ?? 0,
            km: Double(call.getString("km") ?? "") ?? 0,
            pee: call.getInt("pee") ?? 0,
            poop: call.getInt("poop") ?? 0,
            sniff: call.getInt("sniff") ?? 0,
            ring: call.getDouble("ring") ?? -1
        )
        print("[walkcard] update walking=\(u.walking) km=\(u.km)")
        if #available(iOS 16.2, *) {
            WalkCardController.shared.sync(u)
        }
        call.resolve()   // 실패로 끝내면 웹이 다리를 끈다. 카드를 못 띄워도 성공으로 답한다
    }

    @objc func drain(_ call: CAPPluginCall) {
        call.resolve(["events": TapQueue.shared.pending().map { $0.json }])
    }

    @objc func ack(_ call: CAPPluginCall) {
        let ids = (call.getArray("ids") ?? []).compactMap { $0 as? String }
        TapQueue.shared.remove(ids: ids)
        call.resolve()
    }

    @objc func consumeLaunch(_ call: CAPPluginCall) {
        call.resolve(["action": ""])   // 이번 판에는 시작 버튼이 없다
    }
}
