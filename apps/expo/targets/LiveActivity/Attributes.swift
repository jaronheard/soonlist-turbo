//
//  FizlAttributes.swift
//  Fizl
//
//  Created by Dominic on 2023-12-27.
//

import ActivityKit
import SwiftUI
import OneSignalLiveActivities

struct FizlAttributes: ActivityAttributes {
    public typealias FizlStatus = ContentState
    
    public struct ContentState: Codable, Hashable {
        var startTime: Date
        var endTime: Date
        var title: String
        var headline: String
        var widgetUrl: String
    }
}

// Add DefaultLiveActivityAttributes extension to ensure it's available when importing
// This will enable OneSignal to manage the Live Activity lifecycle
