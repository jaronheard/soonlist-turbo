import WidgetKit
import SwiftUI
import OneSignalLiveActivities

@main
struct ExportWidgets: WidgetBundle {
    init() {
        // Start the activity monitor when the extension initializes
        _ = LiveActivityMonitor.shared
    }
    
    var body: some Widget {
        OneSignalLiveActivityCaptureWidget()
    }
}
