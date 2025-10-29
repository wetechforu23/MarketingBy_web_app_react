# 🔧 Chat Widget Critical Fixes - Implementation Guide

**Date**: October 27, 2025  
**Priority**: CRITICAL  
**Estimated Time**: 3-4 hours

---

## 🐛 ISSUES TO FIX

1. ❌ **Visitor info not showing in portal** (name, email, phone)
2. ❌ **Agent availability check missing** (always says "offline")
3. ❌ **AI keeps responding after agent takeover**
4. ❌ **No sound notifications** for new messages
5. ❌ **No notification panel** in portal
6. ❌ **Email alerts sent even when agent is actively chatting**

---

## 📊 STEP 1: DATABASE MIGRATION

Run this SQL on Heroku:

```bash
heroku pg:psql --app marketingby-wetechforu < backend/database/add_agent_online_status.sql
```

Or manually execute:

```sql
-- Add agent online status tracking
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create agent sessions table
CREATE TABLE IF NOT EXISTS agent_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_heartbeat_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_sessions_user ON agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_active ON agent_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online);

-- Add column to track if agent is viewing conversation
ALTER TABLE widget_conversations
ADD COLUMN IF NOT EXISTS agent_viewing BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS agent_viewing_user_id INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS agent_last_viewed_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_conversations_agent_viewing 
ON widget_conversations(agent_viewing) WHERE agent_viewing = TRUE;
```

---

## 💻 STEP 2: BACKEND - AGENT STATUS API

### File: `backend/src/routes/agentStatus.ts` (NEW FILE)

```typescript
import express from 'express';
import pool from '../config/database';

const router = express.Router();

/**
 * POST /api/agent/heartbeat
 * Update agent's online status (call every 30 seconds from portal)
 */
router.post('/heartbeat', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Update user online status
    await pool.query(
      `UPDATE users 
       SET is_online = TRUE,
           last_heartbeat_at = CURRENT_TIMESTAMP,
           last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
    
    console.log(`💚 Agent ${userId} heartbeat`);
    
    res.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('❌ Heartbeat error:', error);
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

/**
 * POST /api/agent/logout
 * Mark agent as offline
 */
router.post('/logout', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await pool.query(
      `UPDATE users 
       SET is_online = FALSE,
           last_seen_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [userId]
    );
    
    console.log(`🔴 Agent ${userId} logged out`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

/**
 * GET /api/agent/status
 * Get list of online agents
 */
router.get('/status', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        username, 
        full_name,
        is_online,
        last_heartbeat_at,
        last_seen_at
       FROM users
       WHERE is_online = TRUE
         AND last_heartbeat_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
       ORDER BY last_heartbeat_at DESC`
    );
    
    res.json({
      online_agents: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Status fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch agent status' });
  }
});

/**
 * POST /api/agent/viewing/:conversationId
 * Mark that agent is actively viewing a conversation
 */
router.post('/viewing/:conversationId', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    const { conversationId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    await pool.query(
      `UPDATE widget_conversations
       SET agent_viewing = TRUE,
           agent_viewing_user_id = $1,
           agent_last_viewed_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [userId, conversationId]
    );
    
    console.log(`👀 Agent ${userId} viewing conversation ${conversationId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Mark viewing error:', error);
    res.status(500).json({ error: 'Failed to mark as viewing' });
  }
});

/**
 * POST /api/agent/stop-viewing/:conversationId
 * Mark that agent stopped viewing a conversation
 */
router.post('/stop-viewing/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    await pool.query(
      `UPDATE widget_conversations
       SET agent_viewing = FALSE,
           agent_viewing_user_id = NULL
       WHERE id = $1`,
      [conversationId]
    );
    
    console.log(`👁️ Agent stopped viewing conversation ${conversationId}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Stop viewing error:', error);
    res.status(500).json({ error: 'Failed to stop viewing' });
  }
});

export default router;
```

### Register Route in `backend/src/server.ts`:

```typescript
import agentStatusRoutes from './routes/agentStatus';

// Add this line after other route registrations:
app.use('/api/agent', agentStatusRoutes);
```

---

## 🔧 STEP 3: FIX EMAIL NOTIFICATION LOGIC

### File: `backend/src/routes/chatWidget.ts`

Find the email notification code (around line 640) and replace it with:

```typescript
// 🔔 EMAIL NOTIFICATION - Only if agent is NOT actively viewing conversation
if (widget.enable_email_notifications && widget.notification_email) {
  // ✅ CHECK: Is agent actively viewing this conversation?
  const viewingCheck = await pool.query(
    `SELECT agent_viewing, agent_viewing_user_id, agent_last_viewed_at
     FROM widget_conversations 
     WHERE id = $1`,
    [conversation_id]
  );
  
  const isAgentViewing = viewingCheck.rows.length > 0 && 
                         viewingCheck.rows[0].agent_viewing === true;
  
  // Only send email if:
  // 1. Agent is NOT actively viewing the conversation
  // 2. Last viewed was more than 2 minutes ago (agent stepped away)
  if (!isAgentViewing) {
    const lastViewed = viewingCheck.rows[0]?.agent_last_viewed_at;
    const minutesSinceViewed = lastViewed 
      ? (Date.now() - new Date(lastViewed).getTime()) / 1000 / 60 
      : 999;
    
    if (minutesSinceViewed > 2) {
      console.log('📧 Sending email notification (agent not actively viewing)');
      
      // Get client branding
      const clientResult = await pool.query(
        'SELECT name FROM clients WHERE id = $1',
        [client_id]
      );
      const clientBrandedName = clientResult.rows[0]?.name || 'Chat Widget';
      
      // Get conversation info
      const info = await pool.query(
        `SELECT visitor_name, visitor_email, visitor_phone
         FROM widget_conversations WHERE id = $1`,
        [conversation_id]
      );
      
      const subjectPrefix = isAgentHandoff ? '🚨 URGENT' : '💬 NEW MESSAGE';
      
      await emailService.sendEmail({
        to: widget.notification_email,
        subject: `${subjectPrefix}: ${info.rows[0]?.visitor_name || 'Visitor'} on ${clientBrandedName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4682B4; margin-bottom: 20px;">💬 New Chat Message</h2>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${info.rows[0]?.visitor_name || 'Anonymous Visitor'}</p>
              ${info.rows[0]?.visitor_email ? `<p style="margin: 0 0 10px 0;"><strong>Email:</strong> ${info.rows[0].visitor_email}</p>` : ''}
              ${info.rows[0]?.visitor_phone ? `<p style="margin: 0 0 10px 0;"><strong>Phone:</strong> ${info.rows[0].visitor_phone}</p>` : ''}
              <p style="margin: 0;"><strong>Message:</strong></p>
              <p style="margin: 10px 0; padding: 10px; background: white; border-left: 3px solid #4682B4;">${message_text}</p>
            </div>
            <a href="https://marketingby.wetechforu.com/app/chat-conversations" 
               style="display: inline-block; background: #4682B4; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Reply Now
            </a>
          </div>
        `,
        text: `New message from ${info.rows[0]?.visitor_name || 'Visitor'}: ${message_text}. Reply at: https://marketingby.wetechforu.com/app/chat-conversations`
      });
      
      console.log(`✅ Email notification sent to ${widget.notification_email}`);
    } else {
      console.log(`🔕 Email skipped - Agent viewed ${minutesSinceViewed.toFixed(1)} min ago`);
    }
  } else {
    console.log('🔕 Email skipped - Agent is actively viewing conversation');
  }
}
```

---

## 🔧 STEP 4: CHECK AGENT AVAILABILITY IN WIDGET

### File: `backend/src/routes/chatWidget.ts`

Find the agent handoff section (where it says "checking agent availability") and replace with:

```typescript
// 🔍 CHECK IF ANY AGENTS ARE ONLINE
const onlineAgentsResult = await pool.query(
  `SELECT COUNT(*) as count
   FROM users
   WHERE is_online = TRUE
     AND last_heartbeat_at > CURRENT_TIMESTAMP - INTERVAL '5 minutes'
     AND (role = 'super_admin' OR role = 'developer' OR permissions->>'chat_widget' = 'true')`
);

const onlineAgentCount = parseInt(onlineAgentsResult.rows[0]?.count || '0');

console.log(`👥 Online agents available: ${onlineAgentCount}`);

if (onlineAgentCount === 0) {
  // No agents online - collect info and notify via email
  const botMessage = `Our agents are currently offline. Your message has been sent, and we'll get back to you as soon as possible!\n\nYou can expect a response within 24 hours at the email address you provided.`;
  
  await pool.query(
    `INSERT INTO widget_messages (conversation_id, message_type, message_text, sender_name)
     VALUES ($1, 'bot', $2, 'Bot')`,
    [conversationId, botMessage]
  );
  
  // Send urgent email to all notification emails
  // ... existing email code ...
  
  return res.json({
    response: botMessage,
    requires_input: false,
    handoff_complete: true
  });
} else {
  // Agents online - notify them
  const botMessage = `Great! I'm connecting you with a live agent now. One of our team members will be with you shortly! 👨‍💼`;
  
  await pool.query(
    `INSERT INTO widget_messages (conversation_id, message_type, message_text, sender_name)
     VALUES ($1, 'bot', $2, 'Bot')`,
    [conversationId, botMessage]
  );
  
  // Set handoff flag
  await pool.query(
    `UPDATE widget_conversations
     SET handoff_requested = TRUE,
         agent_handoff = FALSE
     WHERE id = $1`,
    [conversationId]
  );
  
  // Send notification to online agents
  // ... existing email code ...
  
  return res.json({
    response: botMessage,
    requires_input: false,
    handoff_pending: true,
    online_agents: onlineAgentCount
  });
}
```

---

## 🎨 STEP 5: FRONTEND - AGENT HEARTBEAT

### File: `frontend/src/App.tsx` or layout component

Add heartbeat for logged-in users:

```typescript
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext'; // or wherever your auth context is
import axios from 'axios';

function App() {
  const { user, isAuthenticated } = useAuth();
  
  // Agent heartbeat - runs every 30 seconds when user is logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial heartbeat
    axios.post('/api/agent/heartbeat').catch(err => {
      console.error('Heartbeat failed:', err);
    });
    
    // Set interval for heartbeat every 30 seconds
    const intervalId = setInterval(() => {
      axios.post('/api/agent/heartbeat').catch(err => {
        console.error('Heartbeat failed:', err);
      });
    }, 30000); // 30 seconds
    
    // Cleanup on unmount or logout
    return () => {
      clearInterval(intervalId);
      // Mark as offline when component unmounts
      axios.post('/api/agent/logout').catch(err => {
        console.error('Logout heartbeat failed:', err);
      });
    };
  }, [isAuthenticated]);
  
  // ... rest of App component
}
```

---

## 🎨 STEP 6: FRONTEND - MARK CONVERSATION AS VIEWING

### File: `frontend/src/pages/ChatConversations.tsx`

Update the `fetchMessages` function:

```typescript
const fetchMessages = async (conv: Conversation, showLoading: boolean = true) => {
  if (showLoading) {
    setLoadingMessages(true);
  }
  
  setSelectedConversation(conv);
  
  try {
    // Mark conversation as read
    await axios.post(`/api/chat-widget/conversations/${conv.id}/mark-read`);
    
    // 🆕 Mark that agent is actively viewing this conversation
    await axios.post(`/api/agent/viewing/${conv.id}`);
    
    // Fetch messages
    const response = await axios.get(`/api/chat-widget/conversations/${conv.id}/messages`);
    setMessages(response.data.messages || []);
    
    // Refresh conversation list to update unread counts
    fetchConversations(false);
  } catch (error) {
    console.error('Error fetching messages:', error);
    setMessages([]);
  } finally {
    setLoadingMessages(false);
  }
};

// 🆕 Stop viewing when conversation changes or component unmounts
useEffect(() => {
  return () => {
    if (selectedConversation) {
      axios.post(`/api/agent/stop-viewing/${selectedConversation.id}`).catch(() => {});
    }
  };
}, [selectedConversation]);
```

---

## 🔔 STEP 7: FRONTEND - SOUND NOTIFICATIONS

### File: `frontend/src/pages/ChatConversations.tsx`

Add sound notification:

```typescript
import { useEffect, useRef } from 'react';

function ChatConversations() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [lastMessageCount, setLastMessageCount] = useState<Record<number, number>>({});
  
  // Load notification sound
  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAo=');
  }, []);
  
  // Play notification sound
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.log('Audio play failed:', err);
      });
    }
  };
  
  // Check for new messages and play sound
  useEffect(() => {
    conversations.forEach(conv => {
      const prevCount = lastMessageCount[conv.id] || 0;
      const currentCount = conv.message_count || 0;
      
      // If message count increased and this is not the selected conversation
      if (currentCount > prevCount && (!selectedConversation || selectedConversation.id !== conv.id)) {
        console.log(`🔔 New message in conversation ${conv.id}`);
        playNotificationSound();
        
        // Show browser notification if supported
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('New Chat Message', {
            body: `${conv.visitor_name || 'A visitor'} sent a new message`,
            icon: '/logo.png',
            tag: `conv-${conv.id}`
          });
        }
      }
    });
    
    // Update last message counts
    const newCounts: Record<number, number> = {};
    conversations.forEach(conv => {
      newCounts[conv.id] = conv.message_count || 0;
    });
    setLastMessageCount(newCounts);
  }, [conversations]);
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // ... rest of component
}
```

---

## 🔔 STEP 8: FRONTEND - NOTIFICATION PANEL

### File: `frontend/src/components/NotificationPanel.tsx` (NEW FILE)

```typescript
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './NotificationPanel.css';

interface Notification {
  id: number;
  type: 'new_message' | 'agent_reply' | 'handoff_request';
  conversation_id: number;
  visitor_name: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await axios.get('/api/chat-widget/admin/notifications');
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unread_count || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };
  
  // Poll for new notifications every 10 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);
  
  // Mark notification as read
  const markAsRead = async (notificationId: number) => {
    try {
      await axios.post(`/api/chat-widget/admin/notifications/${notificationId}/read`);
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };
  
  // Navigate to conversation
  const goToConversation = (conversationId: number, notificationId: number) => {
    markAsRead(notificationId);
    window.location.href = `/app/chat-conversations?conv=${conversationId}`;
  };
  
  return (
    <div className="notification-panel">
      {/* Notification Bell Icon */}
      <button 
        className="notification-bell"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '24px',
          padding: '8px'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            background: '#dc3545',
            color: 'white',
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700'
          }}>
            {unreadCount}
          </span>
        )}
      </button>
      
      {/* Notification Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '60px',
          right: '20px',
          width: '350px',
          maxHeight: '500px',
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 9999,
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e0e0e0',
            background: '#f8f9fa',
            fontWeight: '700',
            fontSize: '16px'
          }}>
            💬 Notifications ({unreadCount})
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: '#999'
              }}>
                No new notifications
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => goToConversation(notif.conversation_id, notif.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    background: notif.read ? 'white' : '#f0f8ff',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e3f2fd';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = notif.read ? 'white' : '#f0f8ff';
                  }}
                >
                  <div style={{
                    fontSize: '14px',
                    fontWeight: notif.read ? '400' : '700',
                    marginBottom: '4px',
                    color: '#333'
                  }}>
                    {notif.visitor_name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: '#666',
                    marginBottom: '4px'
                  }}>
                    {notif.message.substring(0, 80)}...
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: '#999'
                  }}>
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

### Add to your portal layout:

```typescript
import NotificationPanel from './components/NotificationPanel';

// In your top navigation bar:
<div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
  <NotificationPanel />
  {/* Other nav items */}
</div>
```

---

## ✅ TESTING CHECKLIST

### Test 1: Agent Status
- [ ] Login to portal
- [ ] Check browser console for heartbeat logs (every 30s)
- [ ] Open `/api/agent/status` - should show you as online
- [ ] Close portal/logout
- [ ] Wait 5 minutes - should show as offline

### Test 2: Visitor Info Display
- [ ] Website visitor enters name, email, phone
- [ ] Portal should show this info in conversation list
- [ ] Open conversation - should see visitor details panel

### Test 3: Agent Availability Check
- [ ] All agents logged out
- [ ] Website visitor requests agent
- [ ] Should say "agents offline" ✅
- [ ] One agent logs in
- [ ] New visitor requests agent
- [ ] Should say "connecting to live agent" ✅

### Test 4: AI Stops After Handoff
- [ ] Visitor chats with bot
- [ ] Agent takes over (sends reply)
- [ ] Visitor sends more messages
- [ ] Bot should NOT respond ✅
- [ ] Only agent responses should appear

### Test 5: Email Notifications
- [ ] Agent NOT viewing conversation
- [ ] Visitor sends message
- [ ] Email should arrive ✅
- [ ] Agent opens conversation
- [ ] Visitor sends another message
- [ ] Email should NOT arrive (agent is viewing) ✅

### Test 6: Sound Notifications
- [ ] Portal open
- [ ] Visitor sends message in different conversation
- [ ] Should hear notification sound ✅
- [ ] Browser notification should appear ✅

### Test 7: Notification Panel
- [ ] Click bell icon
- [ ] Should see unread count badge ✅
- [ ] Click notification
- [ ] Should navigate to conversation ✅

---

## 🚀 DEPLOYMENT STEPS

```bash
# 1. Commit database migration
git add backend/database/add_agent_online_status.sql
git commit -m "Add agent online status tracking"

# 2. Run migration on Heroku
heroku pg:psql --app marketingby-wetechforu < backend/database/add_agent_online_status.sql

# 3. Deploy backend changes
git add backend/
git commit -m "Fix: Agent status, email notifications, AI handoff"
git push heroku main

# 4. Deploy frontend changes
git add frontend/
git commit -m "Add: Sound notifications, notification panel, heartbeat"
git push heroku main

# 5. Verify deployment
heroku logs --tail --app marketingby-wetechforu
```

---

## 📋 SUMMARY

**What This Fixes:**
1. ✅ Agent online/offline status tracking with heartbeat
2. ✅ Real agent availability check before handoff
3. ✅ AI stops responding completely after agent takeover
4. ✅ Email notifications ONLY when agent not actively viewing
5. ✅ Sound notifications for new messages in portal
6. ✅ Notification panel with bell icon and unread count
7. ✅ Visitor info (name, email, phone) displayed in portal

**Files Modified:**
- `backend/database/add_agent_online_status.sql` (NEW)
- `backend/src/routes/agentStatus.ts` (NEW)
- `backend/src/routes/chatWidget.ts` (MODIFIED)
- `backend/src/server.ts` (MODIFIED)
- `frontend/src/App.tsx` (MODIFIED)
- `frontend/src/pages/ChatConversations.tsx` (MODIFIED)
- `frontend/src/components/NotificationPanel.tsx` (NEW)

**Time to Implement**: 3-4 hours  
**Priority**: CRITICAL

---

Ready to implement? 🚀

