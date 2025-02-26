import ExpoModulesCore
import ActivityKit

public class LiveActivityControlModule: Module {
    public func definition() -> ModuleDefinition {
        Name("LiveActivityControl")
        
        Function("areActivitiesEnabled") { () -> Bool in
            NSLog("LiveActivityControl: areActivitiesEnabled()")
            
            if #available(iOS 16.2, *) {
                return ActivityAuthorizationInfo().areActivitiesEnabled
            } else {
                return false
            }
        }
        
        Function("startActivity") { (startTimeUnix: UInt64, endTimeUnix: UInt64, title: String, headline: String, widgetUrl: String) -> Bool in
            NSLog("LiveActivityControl: startActivity()")

            let startTime =  Date(timeIntervalSince1970: TimeInterval(startTimeUnix))
            let endTime =  Date(timeIntervalSince1970: TimeInterval(endTimeUnix))
            
            if #available(iOS 16.2, *) {
                let attributes = FizlAttributes()
                let contentState = FizlAttributes.ContentState(startTime: startTime, endTime: endTime, title: title, headline: headline, widgetUrl: widgetUrl)
                
                let activityContent = ActivityContent(state: contentState, staleDate: nil)
                
                do {
                    let activity = try Activity.request(attributes: attributes, content: activityContent)
                    NSLog("LiveActivityControl: Requested a Live Activity \(String(describing: activity.id)).")
                    return true
                } catch (let error) {
                    NSLog("LiveActivityControl: Error requesting Live Activity \(error.localizedDescription).")
                    return false
                }
            } else {
                NSLog("LiveActivityControl: iOS version is lower than 16.2. Live Activity is not available.")
                return false
            }
        }

        Function("endActivity") { (title: String, headline: String, widgetUrl: String) -> Void in
            NSLog("LiveActivityControl: endActivity()")
            
            if #available(iOS 16.2, *) {
                let contentState = FizlAttributes.ContentState(startTime: .now, endTime: .now, title: title, headline: headline, widgetUrl: widgetUrl)
                let finalContent = ActivityContent(state: contentState, staleDate: nil)
                
                Task {
                    for activity in Activity<FizlAttributes>.activities {
                        await activity.end(finalContent, dismissalPolicy: .immediate)
                        NSLog("LiveActivityControl: Ending the Live Activity: \(activity.id)")
                    }
                }
            }
        }
    }
}
