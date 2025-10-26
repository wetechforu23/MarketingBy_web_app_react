# 🔧 QUICK FIXES NEEDED (v362)

## Issues Reported:
1. ❌ Feedback messages not showing in portal ("Yes, that helped!", "No, I'm all set")
2. ❌ No notification badge in portal navigation
3. ❌ No email alerts for new visitors (5+ min)

## Root Causes:
1. **Missing Messages**: `addUserMessage()` displays in widget UI but doesn't send to backend
2. **No Badge**: Haven't added visual notification counter to portal nav yet
3. **Email Not Sending**: Visitor tracking email might not be triggering

## Fixes to Implement:
1. Replace `addUserMessage()` with proper backend message sending
2. Add notification badge component to portal
3. Verify visitor engagement email is working
4. Add real-time polling (every 10 sec) to update counts

## Priority:
HIGH - These are blocking user experience
