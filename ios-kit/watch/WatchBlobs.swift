// 워치 앱 산책 화면의 덩어리 셋(0.5.3, 06 11/27 손그림 "덩어리 3마리 뭉쳐 있는 것처럼, 칸만 3개").
// 손그림의 물결선 셋으로 네모를 나눈 뒤 사이를 띄우고 모서리를 둥글린 모양을 0~1 좌표의 점 64개로 적었다.
// 점은 손그림의 선 위치를 읽어 계산한 값이고, 그릴 때는 점을 부드러운 곡선(캣멀롬)으로 잇는다.
// 자리는 로고 점과 같다: 왼쪽 아래 코랄 똥, 위 노랑 킁킁, 오른쪽 파랑 꾹. 오른쪽 위 빈 곳은 워치 시계 자리.
import SwiftUI

/// 0~1 좌표의 닫힌 점들을 받은 칸 크기에 맞춰 부드럽게 잇는 모양
struct BlobShape: Shape {
    let pts: [CGPoint]

    func path(in r: CGRect) -> Path {
        let p = pts.map { CGPoint(x: r.minX + $0.x * r.width, y: r.minY + $0.y * r.height) }
        let n = p.count
        var path = Path()
        guard n > 2 else { return path }
        path.move(to: p[0])
        for i in 0..<n {
            let p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n]
            path.addCurve(to: p2,
                          control1: CGPoint(x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6),
                          control2: CGPoint(x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6))
        }
        path.closeSubpath()
        return path
    }
}

/// 덩어리 하나: 모양과 아이콘 자리(0~1)
struct Blob {
    let shape: BlobShape
    let icon: CGPoint

    init(_ v: [CGFloat], icon: CGPoint) {
        shape = BlobShape(pts: stride(from: 0, to: v.count - 1, by: 2).map { CGPoint(x: v[$0], y: v[$0 + 1]) })
        self.icon = icon
    }
}

// 똥(왼쪽 아래, 코랄)
private let poopPoints: [CGFloat] = [
        0.342, 0.469, 0.367, 0.474, 0.391, 0.482, 0.414, 0.493, 0.438, 0.503, 0.458, 0.518, 0.476, 0.537, 0.488, 0.559,
        0.495, 0.584, 0.497, 0.609, 0.496, 0.634, 0.490, 0.659, 0.479, 0.682, 0.462, 0.701, 0.442, 0.717, 0.426, 0.737,
        0.416, 0.760, 0.408, 0.784, 0.402, 0.809, 0.396, 0.834, 0.390, 0.859, 0.385, 0.884, 0.380, 0.909, 0.369, 0.932,
        0.354, 0.952, 0.334, 0.969, 0.311, 0.980, 0.286, 0.985, 0.261, 0.986, 0.235, 0.986, 0.210, 0.986, 0.184, 0.983,
        0.159, 0.977, 0.136, 0.968, 0.113, 0.956, 0.092, 0.941, 0.073, 0.924, 0.056, 0.905, 0.042, 0.884, 0.031, 0.861,
        0.022, 0.837, 0.017, 0.812, 0.014, 0.786, 0.014, 0.761, 0.014, 0.735, 0.014, 0.710, 0.014, 0.684, 0.014, 0.659,
        0.014, 0.633, 0.015, 0.608, 0.021, 0.583, 0.033, 0.560, 0.050, 0.541, 0.070, 0.526, 0.094, 0.516, 0.119, 0.512,
        0.145, 0.514, 0.170, 0.514, 0.195, 0.509, 0.220, 0.501, 0.244, 0.493, 0.267, 0.483, 0.291, 0.475, 0.316, 0.469
]

// 킁킁(위, 노랑)
private let sniffPoints: [CGFloat] = [
        0.150, 0.014, 0.187, 0.014, 0.223, 0.014, 0.259, 0.014, 0.295, 0.014, 0.331, 0.014, 0.368, 0.014, 0.404, 0.014,
        0.440, 0.014, 0.476, 0.014, 0.512, 0.014, 0.549, 0.014, 0.585, 0.014, 0.621, 0.014, 0.657, 0.014, 0.694, 0.014,
        0.730, 0.014, 0.766, 0.017, 0.799, 0.030, 0.827, 0.053, 0.845, 0.085, 0.852, 0.120, 0.849, 0.156, 0.837, 0.190,
        0.815, 0.218, 0.785, 0.238, 0.750, 0.247, 0.714, 0.244, 0.679, 0.237, 0.648, 0.254, 0.626, 0.283, 0.612, 0.316,
        0.599, 0.350, 0.579, 0.380, 0.559, 0.410, 0.537, 0.439, 0.508, 0.460, 0.474, 0.471, 0.438, 0.469, 0.404, 0.457,
        0.369, 0.445, 0.334, 0.441, 0.298, 0.444, 0.263, 0.455, 0.230, 0.469, 0.195, 0.480, 0.160, 0.486, 0.124, 0.482,
        0.089, 0.472, 0.058, 0.454, 0.033, 0.428, 0.018, 0.395, 0.014, 0.359, 0.014, 0.323, 0.014, 0.287, 0.014, 0.251,
        0.014, 0.215, 0.014, 0.178, 0.014, 0.142, 0.016, 0.106, 0.027, 0.072, 0.049, 0.043, 0.079, 0.024, 0.114, 0.015
]

// 꾹(오른쪽, 파랑)
private let peePoints: [CGFloat] = [
        0.911, 0.251, 0.942, 0.267, 0.966, 0.292, 0.981, 0.323, 0.986, 0.357, 0.986, 0.392, 0.986, 0.426, 0.986, 0.461,
        0.986, 0.496, 0.986, 0.530, 0.986, 0.565, 0.986, 0.600, 0.986, 0.634, 0.986, 0.669, 0.986, 0.704, 0.986, 0.738,
        0.986, 0.773, 0.984, 0.807, 0.977, 0.841, 0.964, 0.873, 0.945, 0.903, 0.922, 0.929, 0.895, 0.951, 0.865, 0.967,
        0.833, 0.979, 0.798, 0.985, 0.764, 0.986, 0.729, 0.986, 0.695, 0.986, 0.660, 0.986, 0.625, 0.986, 0.591, 0.986,
        0.556, 0.986, 0.521, 0.986, 0.488, 0.978, 0.458, 0.961, 0.435, 0.935, 0.421, 0.903, 0.418, 0.869, 0.425, 0.835,
        0.432, 0.801, 0.444, 0.768, 0.463, 0.740, 0.490, 0.718, 0.513, 0.693, 0.525, 0.661, 0.526, 0.626, 0.524, 0.591,
        0.522, 0.557, 0.523, 0.522, 0.534, 0.490, 0.555, 0.462, 0.576, 0.435, 0.595, 0.406, 0.614, 0.377, 0.632, 0.347,
        0.652, 0.319, 0.680, 0.298, 0.712, 0.287, 0.747, 0.287, 0.781, 0.281, 0.812, 0.266, 0.843, 0.250, 0.877, 0.245
]

enum Blobs {
    static let poop = Blob(poopPoints, icon: CGPoint(x: 0.23, y: 0.72))
    static let sniff = Blob(sniffPoints, icon: CGPoint(x: 0.46, y: 0.26))
    static let pee = Blob(peePoints, icon: CGPoint(x: 0.74, y: 0.66))
}

/// 덩어리 위 아이콘(산책 카드의 kk-poop, kk-nose, kk-pee와 같은 그림). 워치 앱에는 그림 파일 대신 선으로 그린다.
/// 24×24 칸 기준 조각을 칸 크기에 맞춰 키우고, 조각마다 따로 칠해 겹친 곳이 비지 않게 한다
struct KkIcon: View {
    let kind: String

    var body: some View {
        GeometryReader { g in
            let s = min(g.size.width, g.size.height) / 24
            ZStack(alignment: .topLeading) {
                ForEach(Array(KkIcon.parts(kind).enumerated()), id: \.offset) { _, p in
                    p.applying(CGAffineTransform(scaleX: s, y: s)).fill()
                }
            }
        }
        .accessibilityHidden(true)
    }

    private static func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x, y: y) }

    static func parts(_ kind: String) -> [Path] {
        switch kind {
        case "poop":
            var tip = Path()
            tip.move(to: pt(9.7, 7.7))
            tip.addCurve(to: pt(13.5, 2.6), control1: pt(9.9, 5.3), control2: pt(11.9, 5))
            tip.addCurve(to: pt(13.5, 8.4), control1: pt(14.9, 4.9), control2: pt(14.5, 7))
            tip.closeSubpath()
            return [Path(ellipseIn: CGRect(x: 3.1, y: 13.8, width: 17.8, height: 7.4)),
                    Path(ellipseIn: CGRect(x: 5.5, y: 9.5, width: 13, height: 6.8)),
                    Path(ellipseIn: CGRect(x: 7.8, y: 5.8, width: 8.4, height: 6)),
                    tip]
        case "sniff":
            var nose = Path()
            nose.move(to: pt(12, 19.6))
            nose.addCurve(to: pt(2.8, 10.8), control1: pt(9, 19.6), control2: pt(2.8, 16.4))
            nose.addCurve(to: pt(12, 4.8), control1: pt(2.8, 7.2), control2: pt(6.6, 4.8))
            nose.addCurve(to: pt(21.2, 10.8), control1: pt(17.4, 4.8), control2: pt(21.2, 7.2))
            nose.addCurve(to: pt(12, 19.6), control1: pt(21.2, 16.4), control2: pt(15, 19.6))
            nose.closeSubpath()
            return [nose]
        default:
            // 큰 방울(아래는 반지름 6.1 반원)과 작은 방울(반지름 2.5 반원). 반원은 4분원 곡선 둘로 그린다
            var big = Path()
            big.move(to: pt(10.4, 3))
            big.addCurve(to: pt(4.3, 15.1), control1: pt(10.4, 3), control2: pt(4.3, 10.02))
            big.addCurve(to: pt(10.4, 21.2), control1: pt(4.3, 18.469), control2: pt(7.031, 21.2))
            big.addCurve(to: pt(16.5, 15.1), control1: pt(13.769, 21.2), control2: pt(16.5, 18.469))
            big.addCurve(to: pt(10.4, 3), control1: pt(16.5, 10.02), control2: pt(10.4, 3))
            big.closeSubpath()
            var small = Path()
            small.move(to: pt(19, 3.6))
            small.addCurve(to: pt(16.5, 8.5), control1: pt(19, 3.6), control2: pt(16.5, 6.44))
            small.addCurve(to: pt(19, 11), control1: pt(16.5, 9.881), control2: pt(17.619, 11))
            small.addCurve(to: pt(21.5, 8.5), control1: pt(20.381, 11), control2: pt(21.5, 9.881))
            small.addCurve(to: pt(19, 3.6), control1: pt(21.5, 6.44), control2: pt(19, 3.6))
            small.closeSubpath()
            return [big, small]
        }
    }
}
