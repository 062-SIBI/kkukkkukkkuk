// Capacitor 화면에 꾹꾹이 플러그인(PaddWidget)을 등록한다. Main.storyboard가 이 클래스를 쓴다(patch-ios.js post).
import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(PaddWidgetPlugin())
    }
}
