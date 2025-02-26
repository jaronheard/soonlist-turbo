//
//  Fizl_ActivityLiveActivity.swift
//  Fizl Activity
//
//  Created by Dominic on 2023-12-27.
//

import ActivityKit
import SwiftUI
import WidgetKit
import OneSignalLiveActivities

struct FizlActivityView: View {
    let context: ActivityViewContext<FizlAttributes>
    @Environment(\.colorScheme) var colorScheme

    var body: some View {
        HStack {
            VStack(spacing: 10) {
                HStack {
                    Image(colorScheme == .dark ? "FizlIconWhite" : "FizlIcon")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 32, height: 32)
                    Text(context.state.headline)
                        .font(.headline)
                    Spacer()
                }
                .padding(.top)

                HStack {
                    Text(context.state.title)
                        .font(.title2)
                        .padding(.top, 5)
                    Spacer()
                }

                Spacer()

                ProgressView(timerInterval: context.state.startTime...context.state.endTime, countsDown: false)
                    .progressViewStyle(LinearProgressViewStyle())

                Spacer()
            }
            .padding(.horizontal)

            Image("SmallListing")
                .resizable()
                .aspectRatio(contentMode: .fit)
                .cornerRadius(10)
                .frame(width: 100)
                .padding()
        }
    }
}

struct FizlIslandBottom: View {
    let context: ActivityViewContext<FizlAttributes>

    var body: some View {
        VStack {
            HStack {
                VStack(spacing: 10) {
                    Spacer()

                    Text(context.state.title)
                        .font(.title3)

                    ProgressView(timerInterval: context.state.startTime...context.state.endTime, countsDown: false)
                        .progressViewStyle(LinearProgressViewStyle())

                    Spacer()
                }
                .padding(.horizontal)

                Image("SmallListing")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .cornerRadius(10)
                    .frame(width: 100)
            }
        }
    }
}

struct FizlWidget: Widget {
    let kind: String = "Fizl_Widget"

    var body: some WidgetConfiguration {
        ActivityConfiguration(for: FizlAttributes.self) { context in
            FizlActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image("FizlIconWhite")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 36)
                        .padding(.leading)
                }
                DynamicIslandExpandedRegion(.trailing) {}
                DynamicIslandExpandedRegion(.bottom) {
                    FizlIslandBottom(context: context)
                }
            } compactLeading: {
                Image("FizlIconWhite")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16)
            } compactTrailing: {} minimal: {
                Image("FizlIconWhite")
                    .resizable()
                    .aspectRatio(contentMode: .fit)
                    .frame(width: 16)
            }
            .widgetURL(URL(string: context.state.widgetUrl))
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
        FizlAttributes.ContentState(startTime: Date(timeIntervalSince1970: TimeInterval(1704300710)), endTime: Date(timeIntervalSince1970: TimeInterval(1704304310)), title: "Started at 11:54AM", headline: "Fizl in Progress", widgetUrl: "https://www.apple.com")
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
