# Soonlist iOS Testing Execution Plan

## Recommended Testing Order for Maximum Efficiency

### Phase 1: Smoke Tests (30 minutes)
**Goal: Ensure basic functionality works**

1. **Fresh Install Launch**
   - Install on primary test device
   - Verify no immediate crashes
   - Confirm connects to production Convex

2. **New User Critical Path**
   - Complete onboarding flow
   - Create account with email
   - Take screenshot of test event
   - Create event from screenshot
   - Verify event appears in feed

3. **Existing User Path**
   - Sign out
   - Sign in with existing account
   - Verify historical events load
   - Create new event
   - Verify real-time sync

### Phase 2: Core Features (1 hour)
**Goal: Validate all primary user actions**

4. **Event Creation Methods**
   - URL paste → event
   - Text input → event
   - Photo from gallery → event
   - Manual entry → event

5. **Event Management**
   - Edit own event
   - Delete own event
   - Share event (QR + link)
   - Save someone else's event

6. **Feed Navigation**
   - Upcoming tab functionality
   - Past events tab
   - Discover public events
   - Pull to refresh
   - Pagination

### Phase 3: Convex-Specific Validation (45 minutes)
**Goal: Ensure backend migration successful**

7. **Multi-Device Sync**
   - Sign in on second device
   - Create event on Device 1
   - Verify appears on Device 2
   - Edit on web app
   - Verify updates on both devices

8. **Data Integrity**
   - Check existing user data
   - Verify subscriptions
   - Confirm user settings
   - Test guest → user flow

9. **Real-time Features**
   - Workflow status updates
   - Instant event updates
   - Push notification delivery

### Phase 4: Integration Testing (45 minutes)
**Goal: Verify third-party services**

10. **Share Extension**
    - Share from Safari (closed app)
    - Share from Photos
    - Verify deep link handling

11. **Calendar Integration**
    - Add event to calendar
    - Handle permission denial

12. **Push Notifications**
    - Event creation notification
    - Tap to open event
    - Background delivery

### Phase 5: Edge Cases (1 hour)
**Goal: Test failure scenarios**

13. **Network Conditions**
    - Airplane mode behavior
    - Slow 3G performance
    - Timeout handling

14. **Error Handling**
    - Invalid image for AI
    - Broken URL
    - Large image upload
    - API failures

15. **Permissions**
    - Photo access denied
    - Notification denied
    - Recovery flows

### Phase 6: Performance Testing (30 minutes)
**Goal: Ensure acceptable performance**

16. **Load Testing**
    - Account with many events
    - Rapid scrolling
    - Multiple images

17. **Memory Testing**
    - Extended usage session
    - Background/foreground cycles
    - No memory leaks

### Phase 7: Final Verification (30 minutes)
**Goal: Production readiness check**

18. **Configuration Audit**
    - Verify all production endpoints
    - Check for debug code
    - Confirm analytics working

19. **Regression Check**
    - Compare with previous version
    - Verify nothing broken

20. **Documentation**
    - Screenshot any issues
    - Note performance metrics
    - Document workarounds

## Total Time: ~5.5 hours

## Testing Tips

### Device Setup
- Use at least 2 different iPhone models
- Test on oldest supported iOS (15.1)
- Test on latest iOS version
- Have one device on WiFi, one on cellular

### Account Preparation
- Existing user with lots of events
- New user account
- Guest testing capability
- Test event sources ready

### Monitoring During Testing
- Keep Convex dashboard open
- Watch for console errors in Xcode
- Monitor Sentry for new issues
- Check OneSignal delivery

### Issue Tracking
Create tickets for:
- 🔴 Critical: Blocks core functionality
- 🟡 Major: Significant UX impact
- 🟢 Minor: Polish issues

### When to Stop Testing
Stop and fix if you find:
- Authentication failures
- Data loss
- Sync not working
- Consistent crashes
- Major performance regression

## Quick Rollback Decision Matrix

| Issue | Impact | Rollback? |
|-------|---------|-----------|
| Auth broken | All users | Yes - Immediate |
| Sync failing | All users | Yes - Immediate |
| AI extraction down | New events only | No - Can fix live |
| Push notifications down | Engagement | No - Can fix live |
| Share extension broken | Convenience | No - Can fix in update |
| Performance 2x slower | UX | Maybe - Monitor |
| Specific crash scenario | Some users | No - Hotfix ready |

## Post-Testing Actions
1. Document all issues found
2. Prioritize fixes
3. Re-test critical fixes
4. Prepare hotfix branch
5. Brief support team
6. Monitor early adopters