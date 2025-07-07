# Convex Migration Critical Tests

## Quick Validation Checklist for Convex Backend

### 1. Data Migration Verification
- [ ] All existing users can sign in
- [ ] Historical events are present and correct
- [ ] User settings preserved
- [ ] Subscription status accurate

### 2. Real-time Sync Testing
- [ ] Create event on Device A → appears on Device B instantly
- [ ] Edit event on web → updates in iOS immediately
- [ ] Delete event → removed everywhere
- [ ] No duplicate events appearing

### 3. Workflow (AI) Testing
- [ ] Screenshot → AI extraction → event creation pipeline works
- [ ] URL processing completes successfully
- [ ] Workflow status updates in real-time
- [ ] Failure notifications delivered

### 4. Authentication Flow
- [ ] Clerk + Convex integration works
- [ ] Token sync between app launches
- [ ] Share extension maintains auth
- [ ] Session expiry handled gracefully

### 5. Critical Backend Endpoints
- [ ] getPossibilities query returns correct data
- [ ] createPossibility mutation works
- [ ] updatePossibility updates immediately
- [ ] deletePossibility removes completely
- [ ] User profile queries/mutations work

### 6. Performance Benchmarks
- [ ] Feed loads in < 2 seconds
- [ ] Event creation completes in < 5 seconds
- [ ] No noticeable lag vs tRPC version
- [ ] Pagination performs well

### 7. Error Scenarios
- [ ] Network timeout → graceful error
- [ ] Invalid data → validation errors shown
- [ ] Rate limiting → appropriate message
- [ ] Backend down → offline mode works

### 8. Guest to User Migration
- [ ] Guest can create events
- [ ] Sign up preserves guest events
- [ ] No data loss during transition

### 9. Push Notification Integration
- [ ] OneSignal + Convex webhooks work
- [ ] Notifications delivered for events
- [ ] Deep links open correct screens

### 10. Production Readiness
- [ ] No console errors in Xcode
- [ ] Convex dashboard shows healthy
- [ ] All API keys are production
- [ ] No dev/test endpoints active

## Red Flags to Watch For
- 🚨 "Network request failed" errors
- 🚨 Events not syncing between devices
- 🚨 Authentication loops
- 🚨 Missing historical data
- 🚨 Slow performance vs previous version
- 🚨 Push notifications not arriving
- 🚨 Workflow status stuck in "processing"

## Rollback Criteria
Consider rolling back if:
- Authentication is broken for > 5% of users
- Event creation fails > 10% of the time
- Real-time sync is not working
- Critical data loss detected
- Performance degraded > 50%