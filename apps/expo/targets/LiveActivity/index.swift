import WidgetKit
import SwiftUI
import OneSignalLiveActivities

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        OneSignalLiveActivityCaptureWidget()
    }
}
