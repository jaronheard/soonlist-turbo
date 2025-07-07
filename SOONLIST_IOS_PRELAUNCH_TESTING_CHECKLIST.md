# Soonlist iOS Pre-Launch Testing Checklist

## Pre-Testing Setup

### Environment Preparation
- [ ] Fresh install the app on multiple iOS devices (different iOS versions 15.1+)
- [ ] Verify correct production Convex backend connection
- [ ] Confirm all environment variables are set for production
- [ ] Test on both WiFi and cellular connections
- [ ] Clear all app data and caches
- [ ] Disable any VPNs or proxies
- [ ] Have test accounts ready (new user, existing user, guest)

### Test Data Preparation
- [ ] Prepare test images with events
- [ ] Have test URLs with events ready
- [ ] Prepare test text snippets with event information
- [ ] Have calendar events ready for testing

## Critical Path Testing (Priority 1)

### 1. New User Flow
- [ ] **Fresh Install → First Launch**
  - [ ] App launches without crashes
  - [ ] Splash screen displays correctly
  - [ ] No authentication errors on first launch

- [ ] **Complete Onboarding**
  - [ ] Welcome screen loads
  - [ ] Can navigate through all 8 onboarding steps
  - [ ] Goals selection saves properly
  - [ ] Discovery channels selection works
  - [ ] Age/demographic questions submit
  - [ ] Push notification permission prompt appears
  - [ ] Demo video plays (if configured)
  - [ ] Paywall appears for non-subscribers
  - [ ] Can skip or complete subscription
  - [ ] Lands on main feed after onboarding

### 2. Core Event Creation
- [ ] **Screenshot Event Creation**
  - [ ] Take screenshot of event
  - [ ] Open app and tap add button
  - [ ] Select screenshot from recent photos
  - [ ] AI extraction completes successfully
  - [ ] Event details are correctly extracted
  - [ ] Can save event
  - [ ] Event appears in feed immediately
  - [ ] Push notification confirms creation

- [ ] **URL Event Creation**
  - [ ] Copy event URL
  - [ ] Paste URL in add screen
  - [ ] Link preview generates
  - [ ] AI extraction works
  - [ ] Event saves successfully
  - [ ] Appears in feed with correct details

- [ ] **Manual Event Creation**
  - [ ] Type event details manually
  - [ ] Date/time picker works
  - [ ] Location field accepts input
  - [ ] Can save without AI extraction
  - [ ] Event appears correctly

### 3. Authentication Critical Path
- [ ] **Sign Out → Sign In**
  - [ ] Can sign out successfully
  - [ ] Sign in with email works
  - [ ] OAuth sign-in works (Google/Apple)
  - [ ] Previous events are restored
  - [ ] Settings are preserved

## Feature-by-Feature Testing

### 4. Event Management
- [ ] **View Event Details**
  - [ ] Tap event to view full details
  - [ ] All information displays correctly
  - [ ] Images load properly
  - [ ] Creator attribution shows
  - [ ] Privacy status is accurate

- [ ] **Edit Your Events**
  - [ ] Edit button appears for owned events
  - [ ] Can modify title, date, location, description
  - [ ] Changes save and sync immediately
  - [ ] Feed updates with changes

- [ ] **Delete Events**
  - [ ] Delete confirmation appears
  - [ ] Event removed from feed
  - [ ] Cannot delete others' events

- [ ] **Share Events**
  - [ ] Native share sheet opens
  - [ ] QR code generates
  - [ ] Share link works when opened

### 5. Feed & Discovery
- [ ] **Main Feed (Upcoming)**
  - [ ] Shows your created events
  - [ ] Shows saved events from others
  - [ ] Pull to refresh works
  - [ ] Pagination loads more events
  - [ ] Empty state appears when no events

- [ ] **Past Events**
  - [ ] Shows only past events
  - [ ] Correct date sorting
  - [ ] Can still view details

- [ ] **Discover Tab**
  - [ ] Shows public events from others
  - [ ] Can save events
  - [ ] Infinite scroll works
  - [ ] Saved events appear in main feed

### 6. Share Extension
- [ ] **From Safari**
  - [ ] Share event URL to Soonlist
  - [ ] App opens with event creation
  - [ ] Event details pre-filled

- [ ] **From Photos**
  - [ ] Share photo to Soonlist
  - [ ] AI extraction runs
  - [ ] Event created successfully

- [ ] **App Closed State**
  - [ ] Share when app is closed
  - [ ] App launches and handles share
  - [ ] No data loss

### 7. Profile & Settings
- [ ] **Profile Editing**
  - [ ] Change username
  - [ ] Upload profile photo
  - [ ] Edit bio (150 char limit enforced)
  - [ ] Add contact information
  - [ ] Changes sync immediately

- [ ] **Subscription Management**
  - [ ] Current status displays correctly
  - [ ] Upgrade flow works
  - [ ] RevenueCat integration functions
  - [ ] Subscription benefits apply

- [ ] **Account Actions**
  - [ ] Can restart onboarding
  - [ ] Timezone changes apply
  - [ ] Account deletion works (test carefully!)

### 8. Push Notifications
- [ ] **Permission Flow**
  - [ ] Asked during onboarding
  - [ ] Can enable later in settings

- [ ] **Notification Types**
  - [ ] Event creation success
  - [ ] Workflow failures (if any)
  - [ ] Tap to open relevant screen

### 9. Calendar Integration
- [ ] **Add to Calendar**
  - [ ] Calendar permission requested
  - [ ] Calendar picker shows available calendars
  - [ ] Event adds to selected calendar
  - [ ] Event details transfer correctly

### 10. Guest Mode
- [ ] **Use as Guest**
  - [ ] Can create events without account
  - [ ] Events saved locally
  - [ ] Prompted to create account
  - [ ] Guest events transfer to account

## Edge Cases & Error Handling

### 11. Network & Sync Issues
- [ ] **Offline Behavior**
  - [ ] Switch to airplane mode
  - [ ] Try creating event (should queue)
  - [ ] Re-enable network
  - [ ] Queued actions complete

- [ ] **Poor Network**
  - [ ] Test on slow 3G
  - [ ] Loading states appear
  - [ ] No crashes or freezes
  - [ ] Retries work

### 12. Data Integrity
- [ ] **Cross-Device Sync**
  - [ ] Sign in on second device
  - [ ] All events appear
  - [ ] Create event on device 1
  - [ ] Appears on device 2 immediately

- [ ] **Real-time Updates**
  - [ ] Edit event on web
  - [ ] Changes appear in iOS app
  - [ ] No duplicate events

### 13. AI Extraction Edge Cases
- [ ] **Complex Images**
  - [ ] Multiple events in one image
  - [ ] Non-event images (should handle gracefully)
  - [ ] Blurry or low-quality images

- [ ] **Invalid URLs**
  - [ ] Non-event URLs
  - [ ] Broken links
  - [ ] Rate limiting handling

### 14. Permission Denials
- [ ] **Photo Access Denied**
  - [ ] Appropriate message shown
  - [ ] Can still create events other ways

- [ ] **Notification Denied**
  - [ ] App continues to function
  - [ ] No crashes

- [ ] **Calendar Denied**
  - [ ] Add to calendar disabled gracefully

## Performance Testing

### 15. Load Testing
- [ ] **Large Data Sets**
  - [ ] Account with 100+ events
  - [ ] Scroll performance smooth
  - [ ] Search/filter responsive

- [ ] **Memory Usage**
  - [ ] Browse many images
  - [ ] No memory warnings
  - [ ] No crashes

### 16. App Lifecycle
- [ ] **Background/Foreground**
  - [ ] Background app during event creation
  - [ ] Return and state preserved
  - [ ] Notifications received in background

- [ ] **Force Quit Recovery**
  - [ ] Force quit during operation
  - [ ] Relaunch without data loss
  - [ ] No corrupted state

## Final Production Verification

### 17. Backend Integration
- [ ] **Convex Specific**
  - [ ] All queries use Convex (not tRPC)
  - [ ] Real-time subscriptions work
  - [ ] Optimistic updates function
  - [ ] Error messages are user-friendly

### 18. Analytics & Monitoring
- [ ] **Verify Integrations**
  - [ ] PostHog events firing
  - [ ] Sentry catching errors
  - [ ] OneSignal user tags set
  - [ ] RevenueCat purchases tracked

### 19. Production Configuration
- [ ] **API Endpoints**
  - [ ] All pointing to production
  - [ ] No localhost references
  - [ ] Correct Convex deployment

- [ ] **App Store Requirements**
  - [ ] No debug UI visible
  - [ ] No test accounts hardcoded
  - [ ] Privacy policy accessible
  - [ ] Terms of service accessible

### 20. Regression Testing
- [ ] **Previous Features**
  - [ ] All features from previous version work
  - [ ] No functionality lost in migration
  - [ ] Performance not degraded

## Post-Launch Monitoring Plan

### First 24 Hours
- [ ] Monitor Sentry for new errors
- [ ] Check Convex logs for failures
- [ ] Monitor user feedback channels
- [ ] Track key metrics in PostHog
- [ ] RevenueCat webhook functioning

### First Week
- [ ] User retention metrics
- [ ] Workflow success rates
- [ ] Performance metrics
- [ ] User feedback patterns
- [ ] App Store reviews

## Notes
- Test each item on multiple iOS versions (15.1, 16.x, 17.x, 18.x)
- Test on different device sizes (iPhone SE, standard, Pro Max)
- Document any issues with screenshots
- Keep production Convex dashboard open during testing
- Have rollback plan ready if critical issues found