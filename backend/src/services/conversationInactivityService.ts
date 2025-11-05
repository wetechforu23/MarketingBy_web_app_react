import pool from '../config/database';
import { WhatsAppService } from './whatsappService';

export class ConversationInactivityService {
  private static instance: ConversationInactivityService;
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    // Start periodic checks
    this.startPeriodicChecks();
  }

  static getInstance(): ConversationInactivityService {
    if (!ConversationInactivityService.instance) {
      ConversationInactivityService.instance = new ConversationInactivityService();
    }
    return ConversationInactivityService.instance;
  }

  /**
   * Start periodic checks for inactive conversations (every 60 seconds)
   */
  private startPeriodicChecks() {
    // Check every 60 seconds
    this.checkInterval = setInterval(async () => {
      await this.checkInactiveConversations();
    }, 60000); // 60 seconds

    console.log('✅ Conversation inactivity monitoring started');
  }

  /**
   * Check for inactive conversations and send reminders
   */
  async checkInactiveConversations() {
    try {
      // Check if activity columns exist (for graceful handling)
      const columnCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'widget_conversations' 
          AND column_name IN ('last_agent_activity_at', 'last_visitor_activity_at', 'extension_reminders_count', 'visitor_extension_reminders_count', 'extension_granted_until')
      `);
      
      const hasAgentActivityColumn = columnCheck.rows.some(r => r.column_name === 'last_agent_activity_at');
      const hasVisitorActivityColumn = columnCheck.rows.some(r => r.column_name === 'last_visitor_activity_at');
      const hasExtensionRemindersCount = columnCheck.rows.some(r => r.column_name === 'extension_reminders_count');
      const hasVisitorExtensionRemindersCount = columnCheck.rows.some(r => r.column_name === 'visitor_extension_reminders_count');
      const hasExtensionGrantedUntil = columnCheck.rows.some(r => r.column_name === 'extension_granted_until');
      
      // Build SELECT clause based on available columns
      const activitySelect = hasAgentActivityColumn && hasVisitorActivityColumn
        ? `wc.last_agent_activity_at, wc.last_visitor_activity_at,`
        : `wc.last_activity_at as last_agent_activity_at, wc.last_activity_at as last_visitor_activity_at,`;
      
      const extensionSelect = hasExtensionRemindersCount && hasVisitorExtensionRemindersCount && hasExtensionGrantedUntil
        ? `wc.extension_reminders_count, wc.visitor_extension_reminders_count, wc.extension_granted_until,`
        : `0 as extension_reminders_count, 0 as visitor_extension_reminders_count, NULL::timestamp as extension_granted_until,`;
      
      // Get active conversations with agent handoff
      const conversations = await pool.query(`
        SELECT 
          wc.id as conversation_id,
          wc.widget_id,
          w.client_id,
          wc.last_activity_at,
          ${activitySelect}
          ${extensionSelect}
          w.handover_whatsapp_number,
          wc.visitor_email,
          wc.visitor_name,
          w.widget_name,
          c.client_name
        FROM widget_conversations wc
        JOIN widget_configs w ON w.id = wc.widget_id
        JOIN clients c ON c.id = w.client_id
        WHERE wc.status = 'active'
          AND wc.agent_handoff = true
          AND wc.last_activity_at IS NOT NULL
      `);

      const now = new Date();
      
      for (const conv of conversations.rows) {
        const lastActivity = conv.last_activity_at ? new Date(conv.last_activity_at) : null;
        const lastAgentActivity = conv.last_agent_activity_at ? new Date(conv.last_agent_activity_at) : null;
        const lastVisitorActivity = conv.last_visitor_activity_at ? new Date(conv.last_visitor_activity_at) : null;
        const extensionUntil = conv.extension_granted_until ? new Date(conv.extension_granted_until) : null;
        const remindersCount = conv.extension_reminders_count || 0;

        // Skip if extension is still valid
        if (extensionUntil && now < extensionUntil) {
          continue;
        }

        // Check agent inactivity (5 minutes)
        if (lastAgentActivity) {
          const agentInactiveMinutes = (now.getTime() - lastAgentActivity.getTime()) / (1000 * 60);
          
          if (agentInactiveMinutes >= 5 && agentInactiveMinutes < 10) {
            // First reminder (5-10 minutes)
            if (remindersCount === 0) {
              await this.sendAgentReminder(conv, 1);
              await pool.query(
                `UPDATE widget_conversations 
                 SET extension_reminders_count = 1, updated_at = NOW() 
                 WHERE id = $1`,
                [conv.conversation_id]
              );
            }
          } else if (agentInactiveMinutes >= 10 && agentInactiveMinutes < 12) {
            // Second reminder (10-12 minutes)
            if (remindersCount === 1) {
              await this.sendAgentReminder(conv, 2);
              await pool.query(
                `UPDATE widget_conversations 
                 SET extension_reminders_count = 2, updated_at = NOW() 
                 WHERE id = $1`,
                [conv.conversation_id]
              );
            }
          } else if (agentInactiveMinutes >= 12 && agentInactiveMinutes < 15) {
            // Ask for extension (12-15 minutes)
            if (remindersCount === 2) {
              await this.askAgentForExtension(conv);
              await pool.query(
                `UPDATE widget_conversations 
                 SET extension_reminders_count = 3, updated_at = NOW() 
                 WHERE id = $1`,
                [conv.conversation_id]
              );
            }
          } else if (agentInactiveMinutes >= 15 && remindersCount >= 3) {
            // Auto-end if no response (15+ minutes)
            await this.autoEndConversation(conv, 'agent_inactivity');
          }
        }

        // Check visitor inactivity (5 minutes)
        if (lastVisitorActivity) {
          const visitorInactiveMinutes = (now.getTime() - lastVisitorActivity.getTime()) / (1000 * 60);
          
          if (visitorInactiveMinutes >= 5 && visitorInactiveMinutes < 10) {
            // First reminder (5-10 minutes)
            const visitorRemindersCount = conv.visitor_extension_reminders_count || 0;
            if (visitorRemindersCount === 0) {
              await this.sendVisitorReminder(conv, 1);
              await pool.query(
                `UPDATE widget_conversations 
                 SET visitor_extension_reminders_count = 1, updated_at = NOW() 
                 WHERE id = $1`,
                [conv.conversation_id]
              );
            }
          } else if (visitorInactiveMinutes >= 10 && visitorInactiveMinutes < 12) {
            // Second reminder (10-12 minutes)
            const visitorRemindersCount = conv.visitor_extension_reminders_count || 0;
            if (visitorRemindersCount === 1) {
              await this.sendVisitorReminder(conv, 2);
              await pool.query(
                `UPDATE widget_conversations 
                 SET visitor_extension_reminders_count = 2, updated_at = NOW() 
                 WHERE id = $1`,
                [conv.conversation_id]
              );
            }
          } else if (visitorInactiveMinutes >= 12 && visitorInactiveMinutes < 15) {
            // Ask for extension (12-15 minutes)
            const visitorRemindersCount = conv.visitor_extension_reminders_count || 0;
            if (visitorRemindersCount === 2) {
              await this.askVisitorForExtension(conv);
              await pool.query(
                `UPDATE widget_conversations 
                 SET visitor_extension_reminders_count = 3, updated_at = NOW() 
                 WHERE id = $1`,
                [conv.conversation_id]
              );
            }
          } else if (visitorInactiveMinutes >= 15) {
            // Auto-end if no response (15+ minutes)
            const visitorRemindersCount = conv.visitor_extension_reminders_count || 0;
            if (visitorRemindersCount >= 3) {
              await this.autoEndConversation(conv, 'visitor_inactivity');
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking inactive conversations:', error);
    }
  }

  /**
   * Send reminder to agent via WhatsApp
   */
  private async sendAgentReminder(conv: any, reminderNumber: number) {
    if (!conv.handover_whatsapp_number) return;

    const whatsappService = WhatsAppService.getInstance();
    
    const visitorName = conv.visitor_name || 'Visitor';
    const conversationId = conv.conversation_id;
    const sessionIdDisplay = conv.visitor_session_id ? conv.visitor_session_id.substring(0, 25) : 'N/A';
    
    const message = reminderNumber === 1
      ? `⏰ *Reminder: Inactive Conversation*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *User:* ${visitorName}\n` +
        `🆔 *Conversation ID: #${conversationId}*\n` +
        `📱 *Session: \`${sessionIdDisplay}\`*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `This conversation has been inactive for 5+ minutes.\n\n` +
        `*HOW TO REPLY (REQUIRED):*\n\n` +
        `1️⃣ By Conversation ID:\n` +
        `\`#${conversationId}: your message\`\n\n` +
        `2️⃣ By User Name:\n` +
        `\`@${visitorName}: your message\`\n\n` +
        `3️⃣ By Session ID:\n` +
        `\`@${sessionIdDisplay}: your message\`\n\n` +
        `*To end this conversation:*\n` +
        `\`#${conversationId}: stop conversation\`\n\n` +
        `⚠️ *Always include the conversation ID or user identifier when replying!*`
      : `⏰ *Second Reminder: Inactive Conversation*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `👤 *User:* ${visitorName}\n` +
        `🆔 *Conversation ID: #${conversationId}*\n` +
        `📱 *Session: \`${sessionIdDisplay}\`*\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `This conversation has been inactive for 10+ minutes.\n\n` +
        `*HOW TO REPLY (REQUIRED):*\n\n` +
        `1️⃣ By Conversation ID:\n` +
        `\`#${conversationId}: your message\`\n\n` +
        `2️⃣ By User Name:\n` +
        `\`@${visitorName}: your message\`\n\n` +
        `3️⃣ By Session ID:\n` +
        `\`@${sessionIdDisplay}: your message\`\n\n` +
        `*To end this conversation:*\n` +
        `\`#${conversationId}: stop conversation\`\n\n` +
        `⚠️ *Please respond soon or end the conversation!*`;

    try {
      let cleanNumber = conv.handover_whatsapp_number.replace('whatsapp:', '').trim();
      if (!cleanNumber.startsWith('+')) {
        cleanNumber = '+' + cleanNumber.replace(/\D/g, '');
      } else {
        cleanNumber = '+' + cleanNumber.replace(/[^\d]/g, '');
      }

      await whatsappService.sendMessage({
        clientId: conv.client_id,
        widgetId: conv.widget_id,
        conversationId: conv.conversation_id,
        toNumber: `whatsapp:${cleanNumber}`,
        message: message,
        sentByAgentName: 'System',
        visitorName: conv.visitor_name || 'Visitor'
      });

      console.log(`📱 Sent agent reminder #${reminderNumber} for conversation ${conv.conversation_id}`);
    } catch (error) {
      console.error(`❌ Error sending agent reminder:`, error);
    }
  }

  /**
   * Ask agent if they need more time
   */
  private async askAgentForExtension(conv: any) {
    if (!conv.handover_whatsapp_number) return;

    const whatsappService = WhatsAppService.getInstance();
    const message = `⏰ *Time Extension Request*\n\nThis conversation has been inactive for 12+ minutes. Do you need more time to respond?\n\nReply with:\n• "yes" or "yes 10" (to extend by 10 minutes)\n• "yes 5" (to extend by 5 minutes)\n• "no" or "stop conversation" (to end the conversation)`;

    try {
      let cleanNumber = conv.handover_whatsapp_number.replace('whatsapp:', '').trim();
      if (!cleanNumber.startsWith('+')) {
        cleanNumber = '+' + cleanNumber.replace(/\D/g, '');
      } else {
        cleanNumber = '+' + cleanNumber.replace(/[^\d]/g, '');
      }

      await whatsappService.sendMessage({
        clientId: conv.client_id,
        widgetId: conv.widget_id,
        conversationId: conv.conversation_id,
        toNumber: `whatsapp:${cleanNumber}`,
        message: message,
        sentByAgentName: 'System',
        visitorName: conv.visitor_name || 'Visitor'
      });

      console.log(`📱 Asked agent for extension for conversation ${conv.conversation_id}`);
    } catch (error) {
      console.error(`❌ Error asking agent for extension:`, error);
    }
  }

  /**
   * Send reminder to visitor via widget message
   */
  private async sendVisitorReminder(conv: any, reminderNumber: number) {
    const message = reminderNumber === 1
      ? `⏰ This conversation has been inactive for 5+ minutes. Are you still there?`
      : `⏰ This conversation has been inactive for 10+ minutes. Do you need more time to respond?`;

    try {
      await pool.query(`
        INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
        VALUES ($1, 'system', $2, NOW())
      `, [conv.conversation_id, message]);

      console.log(`📱 Sent visitor reminder #${reminderNumber} for conversation ${conv.conversation_id}`);
    } catch (error) {
      console.error(`❌ Error sending visitor reminder:`, error);
    }
  }

  /**
   * Ask visitor if they need more time
   */
  private async askVisitorForExtension(conv: any) {
    const message = `⏰ *Time Extension Request*\n\nThis conversation has been inactive for 12+ minutes. Do you need more time to respond?\n\nType:\n• "yes" or "yes 10" (for 10 more minutes)\n• "yes 5" (for 5 more minutes)\n• "no" (to end the conversation)`;

    try {
      await pool.query(`
        INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
        VALUES ($1, 'system', $2, NOW())
      `, [conv.conversation_id, message]);

      console.log(`📱 Asked visitor for extension for conversation ${conv.conversation_id}`);
    } catch (error) {
      console.error(`❌ Error asking visitor for extension:`, error);
    }
  }

  /**
   * Auto-end conversation due to inactivity
   */
  private async autoEndConversation(conv: any, reason: string) {
    console.log(`🛑 Auto-ending conversation ${conv.conversation_id} due to ${reason}`);

    // Update conversation status
    await pool.query(`
      UPDATE widget_conversations
      SET 
        status = 'ended',
        agent_handoff = false,
        ended_at = NOW(),
        close_reason = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [`Auto-ended due to ${reason}`, conv.conversation_id]);

    // ✅ Add system message to chat widget (visible to user)
    await pool.query(`
      INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
      VALUES ($1, 'system', $2, NOW())
    `, [conv.conversation_id, '📞 This conversation has been automatically ended due to inactivity. A summary will be sent to you (if email available) and to our agent.']);

    // ✅ Send WhatsApp message to agent
    if (conv.handover_whatsapp_number) {
      try {
        const { WhatsAppService } = await import('./whatsappService');
        const whatsappService = WhatsAppService.getInstance();
        
        // Get widget config to find client_id
        const widgetConfig = await pool.query(`
          SELECT client_id, widget_name
          FROM widget_configs
          WHERE id = $1
        `, [conv.widget_id]);
        
        if (widgetConfig.rows.length > 0) {
          const clientId = widgetConfig.rows[0].client_id;
          const widgetName = widgetConfig.rows[0].widget_name || 'Chat Widget';
          
          const endMessage = `📞 *Conversation Ended*\n\n` +
            `*Conversation ID:* #${conv.conversation_id}\n` +
            `*Widget:* ${widgetName}\n` +
            `*Visitor:* ${conv.visitor_name || 'Anonymous'}\n` +
            `*Reason:* Automatically ended due to ${reason}\n\n` +
            `A summary has been sent to the visitor (if email provided).\n` +
            `You will receive a detailed summary via email.`;
          
          await whatsappService.sendMessage({
            clientId: clientId,
            widgetId: conv.widget_id,
            conversationId: conv.conversation_id,
            toNumber: `whatsapp:${conv.handover_whatsapp_number.replace(/^whatsapp:/, '')}`,
            message: endMessage,
            sentByAgentName: 'System',
            visitorName: conv.visitor_name || 'Visitor'
          });
          
          console.log(`✅ Sent WhatsApp end notification to agent for conversation ${conv.conversation_id}`);
        }
      } catch (whatsappError) {
        console.error('❌ Error sending WhatsApp end notification:', whatsappError);
      }
    }

    // Send summary email if visitor email exists
    if (conv.visitor_email) {
      await this.sendInactivitySummaryEmail(conv);
    }

    // Purge conversation messages to keep only high-level status (privacy + cost control)
    try {
      await pool.query(`
        DELETE FROM widget_messages
        WHERE conversation_id = $1
      `, [conv.conversation_id]);

      // Optionally leave a lightweight audit in conversation row
      await pool.query(`
        UPDATE widget_conversations
        SET last_message = 'Conversation purged after inactivity',
            message_count = 0,
            updated_at = NOW()
        WHERE id = $1
      `, [conv.conversation_id]);

      console.log(`🧹 Purged messages for conversation ${conv.conversation_id}`);
    } catch (purgeErr) {
      console.error('❌ Error purging conversation messages:', purgeErr);
    }

    console.log(`✅ Auto-ended conversation ${conv.conversation_id}`);
  }

  /**
   * Send summary email for auto-ended conversation
   */
  private async sendInactivitySummaryEmail(conv: any) {
    try {
      const { EmailService } = await import('./emailService');
      const emailService = new EmailService();

      await emailService.sendEmail({
        to: conv.visitor_email,
        from: '"WeTechForU Support" <info@wetechforu.com>',
        subject: `📋 Conversation Summary - ${conv.widget_name || 'Chat Support'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2E86AB;">📋 Conversation Summary</h2>
            <p>Hello ${conv.visitor_name || 'there'},</p>
            <p>Your conversation was automatically ended due to inactivity. Here's a summary:</p>
            <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Conversation ID:</strong> #${conv.conversation_id}</p>
              <p><strong>Reason:</strong> Automatically ended due to inactivity</p>
            </div>
            <p style="color: #666; font-size: 14px;">
              If you need further assistance, please start a new conversation.
            </p>
          </div>
        `,
        text: `Conversation Summary\n\nConversation ID: #${conv.conversation_id}\nReason: Automatically ended due to inactivity`
      });

      console.log(`✅ Inactivity summary email sent to ${conv.visitor_email}`);
    } catch (error) {
      console.error('❌ Error sending inactivity summary email:', error);
    }
  }

  /**
   * Handle extension request from agent or visitor
   */
  async handleExtensionRequest(conversationId: number, message: string, isAgent: boolean): Promise<{ extended: boolean; minutes?: number; message?: string }> {
    const messageLower = message.toLowerCase().trim();

    // Check if it's an extension request
    if (!messageLower.includes('yes') && !messageLower.match(/\d+\s*(min|minute|minutes)/i)) {
      return { extended: false };
    }

    // Extract minutes (default 10 if not specified)
    let minutes = 10;
    const minuteMatch = messageLower.match(/(\d+)\s*(?:min|minute|minutes)?/i);
    if (minuteMatch) {
      minutes = parseInt(minuteMatch[1], 10);
    }
    // Clamp between 1 and 60 minutes
    minutes = Math.max(1, Math.min(60, minutes));

    // Calculate extension until time
    const extensionUntil = new Date();
    extensionUntil.setMinutes(extensionUntil.getMinutes() + minutes);

    // Update conversation
    await pool.query(`
      UPDATE widget_conversations
      SET 
        extension_granted_until = $1,
        extension_reminders_count = CASE WHEN $2 THEN 0 ELSE extension_reminders_count END,
        visitor_extension_reminders_count = CASE WHEN $2 THEN visitor_extension_reminders_count ELSE 0 END,
        updated_at = NOW()
      WHERE id = $3
    `, [extensionUntil, isAgent, conversationId]);

    const responseMessage = `✅ Conversation extended by ${minutes} minute${minutes !== 1 ? 's' : ''}. You have until ${extensionUntil.toLocaleTimeString()} to respond.`;

    // Send confirmation message
    if (isAgent && await this.getAgentWhatsAppNumber(conversationId)) {
      const whatsappService = WhatsAppService.getInstance();
      const conv = await this.getConversationDetails(conversationId);
      if (conv) {
        let cleanNumber = conv.handover_whatsapp_number.replace('whatsapp:', '').trim();
        if (!cleanNumber.startsWith('+')) {
          cleanNumber = '+' + cleanNumber.replace(/\D/g, '');
        } else {
          cleanNumber = '+' + cleanNumber.replace(/[^\d]/g, '');
        }

        await whatsappService.sendMessage({
          clientId: conv.client_id,
          widgetId: conv.widget_id,
          conversationId: conversationId,
          toNumber: `whatsapp:${cleanNumber}`,
          message: responseMessage,
          sentByAgentName: 'System',
          visitorName: conv.visitor_name || 'Visitor'
        });
      }
    } else {
      // Add system message to widget
      await pool.query(`
        INSERT INTO widget_messages (conversation_id, message_type, message_text, created_at)
        VALUES ($1, 'system', $2, NOW())
      `, [conversationId, responseMessage]);
    }

    console.log(`✅ Extended conversation ${conversationId} by ${minutes} minutes (${isAgent ? 'agent' : 'visitor'})`);

    return { extended: true, minutes, message: responseMessage };
  }

  /**
   * Get agent WhatsApp number for conversation
   */
  private async getAgentWhatsAppNumber(conversationId: number): Promise<string | null> {
    const result = await pool.query(`
      SELECT wc.handover_whatsapp_number
      FROM widget_configs wc
      JOIN widget_conversations wconv ON wconv.widget_id = wc.id
      WHERE wconv.id = $1
    `, [conversationId]);

    return result.rows[0]?.handover_whatsapp_number || null;
  }

  /**
   * Get conversation details
   */
  private async getConversationDetails(conversationId: number) {
    const result = await pool.query(`
      SELECT 
        wc.handover_whatsapp_number,
        wc.client_id,
        wc.widget_id,
        wc.visitor_name
      FROM widget_configs wc
      JOIN widget_conversations wconv ON wconv.widget_id = wc.id
      WHERE wconv.id = $1
    `, [conversationId]);

    return result.rows[0] || null;
  }

  /**
   * Update activity timestamps when message is sent
   */
  async updateActivityTimestamp(conversationId: number, isAgent: boolean) {
    const field = isAgent ? 'last_agent_activity_at' : 'last_visitor_activity_at';
    
    await pool.query(`
      UPDATE widget_conversations
      SET 
        ${field} = NOW(),
        last_activity_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `, [conversationId]);
  }
}

