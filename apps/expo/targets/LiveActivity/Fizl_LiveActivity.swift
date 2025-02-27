import ActivityKit
import SwiftUI
import WidgetKit
import OneSignalLiveActivities

// Add Soonlist brand colors
extension Color {
    static let soonlistPurple = Color(hex: "#5A32FB") // Primary background/accent
    static let soonlistLightPurple = Color(hex: "#E0D9FF") // Secondary/accent
}

// Add hex color initializer
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

struct FizlActivityView: View {
    let context: ActivityViewContext<FizlAttributes>
    @Environment(\.colorScheme) var colorScheme
    @State private var isPulsing = false

    var body: some View {
        VStack(spacing: 10) {
            HStack {
                // Group logo and text together
                HStack(spacing: 8) {
                    Image(colorScheme == .dark ? "SoonlistIcon" : "SoonlistIcon")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 32, height: 32)
                    
                    Text(context.state.headline)
                        .font(.headline)
                        .foregroundColor(.soonlistPurple)
                        .fontWeight(.bold)
                }
                
                Spacer() // Maximum space between logo+text and pulsing circle
                
                // Pulsing circle
                Circle()
                .fill(Color.soonlistPurple)
                    .frame(width: 12, height: 12)
                    .scaleEffect(isPulsing ? 1.2 : 0.8)
                    .opacity(isPulsing ? 0.6 : 1.0)
                    .animation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isPulsing)
                    .onAppear {
                        isPulsing = true
                    }
            }
            .padding(.vertical)
        }
        .padding(.horizontal)
        .background(Color.soonlistLightPurple.opacity(1))
    }
}

struct FizlIslandBottom: View {
    let context: ActivityViewContext<FizlAttributes>

    var body: some View {
        VStack {
            HStack {
                VStack(spacing: 8) {
                    Spacer()

                    Text(context.state.title)
                    .font(.headline)
                    .foregroundColor(.white)
                    .fontWeight(.bold)

                    Spacer()
                }
            }
        }
    }
}

struct FizlWidget: Widget {
    @State private var isPulsing = false
    let kind: String = "Fizl_Widget"

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FizlAttributes.self) { context in
            FizlActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image("SoonlistIcon")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 36)
                        .padding(.leading)
                        .frame(maxHeight: .infinity)
                }
                DynamicIslandExpandedRegion(.trailing) {
                  Circle()
                    .fill(Color.soonlistPurple)
                        .frame(width: 36)
                        .scaleEffect(isPulsing ? 1.2 : 0.8)
                        .opacity(isPulsing ? 0.6 : 1.0)
                        .animation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isPulsing)
                        .onAppear {
                            isPulsing = true
                        }
                        .frame(maxHeight: .infinity)
                        .padding(.trailing)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    FizlIslandBottom(context: context)
                }
            } compactLeading: {
                Image("SoonlistIcon")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16)
                    .frame(maxHeight: .infinity)
            } compactTrailing: {
              Circle()
                .fill(Color.soonlistPurple)
                    .frame(width: 16)
                    .scaleEffect(isPulsing ? 1.2 : 0.8)
                    .opacity(isPulsing ? 0.6 : 1.0)
                    .animation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isPulsing)
                    .onAppear {
                        isPulsing = true
                    }
                    .frame(maxHeight: .infinity)
            } minimal: {
              Circle()
                .fill(Color.soonlistPurple)
                    .frame(width: 16)
                    .scaleEffect(isPulsing ? 1.2 : 0.8)
                    .opacity(isPulsing ? 0.6 : 1.0)
                    .animation(Animation.easeInOut(duration: 1.0).repeatForever(autoreverses: true), value: isPulsing)
                    .onAppear {
                        isPulsing = true
                    }
                    .frame(maxHeight: .infinity)
            }
            .widgetURL(URL(string: context.state.widgetUrl))
            .keylineTint(.soonlistPurple)
        }
    }
}

// Add a new widget that supports OneSignal DefaultLiveActivityAttributes
struct OneSignalLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DefaultLiveActivityAttributes.self) { context in
            // Lock screen/banner UI goes here
            VStack {
                Spacer()
                Text("Title: " + (context.attributes.data["title"]?.asString() ?? "")).font(.headline)
                Spacer()
                HStack {
                    Spacer()
                    Text(context.state.data["message"]?.asDict()?["en"]?.asString() ?? "Default Message")
                    Spacer()
                }
                Text("INT: " + String(context.state.data["intValue"]?.asInt() ?? 0))
                Text("DBL: " + String(context.state.data["doubleValue"]?.asDouble() ?? 0.0))
                Text("BOL: " + String(context.state.data["boolValue"]?.asBool() ?? false))
                Spacer()
            }
            .activitySystemActionForegroundColor(.black)
            .activityBackgroundTint(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI goes here.  Compose the expanded UI through
                // various regions, like leading/trailing/center/bottom
                DynamicIslandExpandedRegion(.leading) {
                    Text("Leading")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("Trailing")
                }
                DynamicIslandExpandedRegion(.bottom) {
                    Text("Bottom")
                    // more content
                }
            } compactLeading: {
                Text("L")
            } compactTrailing: {
                Text("T")
            } minimal: {
                Text("Min")
            }
            .widgetURL(URL(string: "http://www.apple.com"))
            .keylineTint(Color.red)
        }
    }
}

private extension FizlAttributes {
    static var preview: FizlAttributes {
        FizlAttributes()
    }
}

private extension FizlAttributes.ContentState {
    static var state: FizlAttributes.ContentState {
        FizlAttributes.ContentState(startTime: Date(timeIntervalSince1970: TimeInterval(1704300710)), endTime: Date(timeIntervalSince1970: TimeInterval(1704304310)), title: "Capturing event...", headline: "Capturing event...", widgetUrl: "https://www.apple.com")
    }
}

struct FizlActivityView_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            FizlAttributes.preview
                .previewContext(FizlAttributes.ContentState.state, viewKind: .content)
                .previewDisplayName("Content View")

            FizlAttributes.preview
                .previewContext(FizlAttributes.ContentState.state, viewKind: .dynamicIsland(.compact))
                .previewDisplayName("Dynamic Island Compact")

            FizlAttributes.preview
                .previewContext(FizlAttributes.ContentState.state, viewKind: .dynamicIsland(.expanded))
                .previewDisplayName("Dynamic Island Expanded")

            FizlAttributes.preview
                .previewContext(FizlAttributes.ContentState.state, viewKind: .dynamicIsland(.minimal))
                .previewDisplayName("Dynamic Island Minimal")
        }
    }
}
