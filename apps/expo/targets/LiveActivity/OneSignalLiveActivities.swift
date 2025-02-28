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

// Capture Activity View for lock screen/banner UI
struct CaptureActivityView: View {
    let context: ActivityViewContext<DefaultLiveActivityAttributes>
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
                    
                    Text(context.state.data["headline"]?.asString() ?? "Capturing event...")
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

// Bottom region of Dynamic Island expanded view
struct CaptureIslandBottom: View {
    let context: ActivityViewContext<DefaultLiveActivityAttributes>

    var body: some View {
        VStack {
            HStack {
                VStack(spacing: 8) {
                    Spacer()

                    Text(context.state.data["headline"]?.asString() ?? "Capturing event...")
                    .font(.headline)
                    .foregroundColor(.white)
                    .fontWeight(.bold)

                    Spacer()
                }
            }
        }
    }
}

// OneSignal Live Activity Capture Widget
struct OneSignalLiveActivityCaptureWidget: Widget {
    @State private var isPulsing = false
    let kind: String = "capture"

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DefaultLiveActivityAttributes.self) { context in
            CaptureActivityView(context: context)
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
                    CaptureIslandBottom(context: context)
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
            .widgetURL(URL(string: context.state.data["widgetUrl"]?.asString() ?? "soonlist://feed"))
            .keylineTint(.soonlistPurple)
        }
    }
}

// MARK: - Global Activity State Monitor
// This automatically attaches observers to all live activities
class LiveActivityMonitor {
    static let shared = LiveActivityMonitor()
    
    private init() {
        startMonitoring()
    }
    
    func startMonitoring() {
        Task {
            // Monitor all activities of this type
            for await activity in Activity<DefaultLiveActivityAttributes>.activityUpdates {
                // For each new or updated activity, start observing its state
                observeActivity(activity)
            }
        }
    }
    
    private func observeActivity(_ activity: Activity<DefaultLiveActivityAttributes>) {
        Task {
            print("Monitoring activity with ID: \(activity.id)")
            for await state in activity.activityStateUpdates {
                print("Activity \(activity.id) state update: \(state)")
                if state != .active {
                    do {
                        // Create ActivityContent with the current state and immediate stale date
                        let content = ActivityContent(state: activity.content.state, staleDate: .now)
                        try await activity.end(content, dismissalPolicy: .immediate)
                        print("Activity \(activity.id) ended with immediate dismissal")
                    } catch {
                        print("Failed to end activity \(activity.id): \(error)")
                    }
                }
            }
        }
    }
}

// MARK: - App Extension Lifecycle
// Called when the extension is initialized
@main
struct OneSignalLiveActivitiesBundle: WidgetBundle {
    init() {
        // Start the activity monitor when the extension initializes
        _ = LiveActivityMonitor.shared
    }
    
    var body: some Widget {
        OneSignalLiveActivityCaptureWidget()
    }
}

