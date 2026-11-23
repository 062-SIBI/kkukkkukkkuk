// 앱의 강아지 생김새(index.html kcLook과 같은 7값). 그림은 Task 5에서 위젯이 직접 그린다.
import Foundation

struct DogLook: Codable, Hashable {
    var coat: String
    var snout: Int
    var leg: Int
    var ear: String
    var tail: String
    var fur: String
    var waist: Int
}
