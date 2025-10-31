import pool from '../config/database';
import { LLMService } from './llmService';

// ==========================================
// CONVERSATION FLOW SERVICE
// ==========================================
// Executes configurable conversation flow
// Tries cheaper methods first (KB → AI → Agent)
// Tracks performance and costs
// ==========================================

interface FlowStep {
  id: number;
  type: 'greeting' | 'knowledge_base' | 'ai_response' | 'agent_handoff';
  order: number;
  locked: boolean;
  enabled: boolean;
  removable: boolean;
  settings: any;
}

interface FlowContext {
  widgetId: number;
  conversationId: number;
  message: string;
  visitorId?: string;
  clientId: number;
}

interface StepResult {
  success: boolean;
  response?: string;
  confidence?: number;
  tokensUsed?: number;
  cost?: number;
  responseTimeMs?: number;
  reason?: string;
}

export class ConversationFlowService {
  private static instance: ConversationFlowService;
  private llmService: LLMService;

  private constructor() {
    this.llmService = LLMService.getInstance();
  }

  static getInstance(): ConversationFlowService {
    if (!ConversationFlowService.instance) {
      ConversationFlowService.instance = new ConversationFlowService();
    }
    return ConversationFlowService.instance;
  }

  // ==========================================
  // MAIN FLOW EXECUTION
  // ==========================================

  async executeFlow(context: FlowContext): Promise<StepResult> {
    try {
      // Get widget's conversation flow
      const flow = await this.getWidgetFlow(context.widgetId);
      
      if (!flow || flow.length === 0) {
        console.warn(`No flow configured for widget ${context.widgetId}, using default`);
        return this.executeFallbackFlow(context);
      }

      // Sort steps by order
      const sortedSteps = flow.sort((a, b) => a.order - b.order);

      // Execute each step in order
      for (const step of sortedSteps) {
        if (!step.enabled) {
          console.log(`⏭️  Step ${step.type} is disabled, skipping`);
          continue;
        }

        console.log(`🔄 Executing step: ${step.type} (order: ${step.order})`);
        const startTime = Date.now();
        
        const result = await this.executeStep(step, context);
        const responseTimeMs = Date.now() - startTime;
        result.responseTimeMs = responseTimeMs;

        // Track analytics
        await this.trackStepExecution(context, step, result);

        if (result.success) {
          console.log(`✅ Step ${step.type} resolved query (confidence: ${result.confidence || 'N/A'})`);
          return result;
        }

        console.log(`❌ Step ${step.type} failed: ${result.reason}`);
      }

      // If no step succeeded, fallback to agent handoff
      console.log('⚠️  All steps failed, falling back to agent handoff');
      return this.requestAgentHandoff(context);

    } catch (error) {
      console.error('Error executing conversation flow:', error);
      return {
        success: false,
        reason: 'flow_execution_error',
        response: 'I apologize, but I\'m having trouble processing your request. Please try again or connect with our team.'
      };
    }
  }

  // ==========================================
  // STEP EXECUTION LOGIC
  // ==========================================

  private async executeStep(step: FlowStep, context: FlowContext): Promise<StepResult> {
    switch (step.type) {
      case 'greeting':
        return this.handleGreeting(step, context);

      case 'knowledge_base':
        return this.searchKnowledgeBase(step, context);

      case 'ai_response':
        return this.getAIResponse(step, context);

      case 'agent_handoff':
        return this.requestAgentHandoff(context);

      default:
        return {
          success: false,
          reason: 'unknown_step_type'
        };
    }
  }

  // ==========================================
  // STEP 1: GREETING
  // ==========================================

  private async handleGreeting(step: FlowStep, context: FlowContext): Promise<StepResult> {
    // Greeting is typically shown at conversation start, not for every message
    // This step is more of a configuration than an execution step
    return {
      success: false,
      reason: 'greeting_not_applicable_for_message'
    };
  }

  // ==========================================
  // STEP 2: KNOWLEDGE BASE SEARCH
  // ==========================================

  private async searchKnowledgeBase(step: FlowStep, context: FlowContext): Promise<StepResult> {
    try {
      const { message, widgetId } = context;
      const settings = step.settings || {};
      const minConfidence = settings.min_confidence || 0.7;
      const maxResults = settings.max_results || 3;

      // Search knowledge base
      const searchQuery = `
        SELECT 
          id,
          question,
          answer,
          category,
          similarity(question, $1) as confidence
        FROM knowledge_base
        WHERE widget_id = $2
          AND is_active = true
          AND similarity(question, $1) > $3
        ORDER BY confidence DESC
        LIMIT $4
      `;

      const result = await pool.query(searchQuery, [
        message,
        widgetId,
        minConfidence,
        maxResults
      ]);

      if (result.rows.length > 0) {
        const bestMatch = result.rows[0];
        
        return {
          success: true,
          response: bestMatch.answer,
          confidence: parseFloat(bestMatch.confidence),
          tokensUsed: 0,
          cost: 0 // KB search is free
        };
      }

      // If show_similar is enabled and we have results with lower confidence
      if (settings.show_similar && result.rows.length > 0) {
        const similarQuestions = result.rows
          .map((r: any, i: number) => `${i + 1}. ${r.question}`)
          .join('\n');

        return {
          success: true,
          response: `${settings.fallback_message || "I couldn't find an exact answer, but here are some similar topics:"}\n\n${similarQuestions}`,
          confidence: 0.5,
          tokensUsed: 0,
          cost: 0
        };
      }

      return {
        success: false,
        reason: 'no_knowledge_base_match'
      };

    } catch (error) {
      console.error('Knowledge base search error:', error);
      return {
        success: false,
        reason: 'knowledge_base_error'
      };
    }
  }

  // ==========================================
  // STEP 3: AI RESPONSE
  // ==========================================

  private async getAIResponse(step: FlowStep, context: FlowContext): Promise<StepResult> {
    try {
      const { message, widgetId, clientId, conversationId } = context;

      // Check if AI is available (credits not exhausted)
      const canUseAI = await this.checkAIAvailability(widgetId, clientId);
      if (!canUseAI) {
        console.log('⚠️  AI credits exhausted or disabled');
        return {
          success: false,
          reason: 'ai_credits_exhausted'
        };
      }

      // Get conversation context (last few messages)
      const contextMessages = await this.getConversationContext(conversationId, 5);

      // Build prompt
      const systemPrompt = await this.buildSystemPrompt(widgetId);
      const contextWithPrompt = `${systemPrompt}\n\n${contextMessages}`;

      // Call AI service with proper config
      const aiResponse = await this.llmService.generateSmartResponse(
        clientId,
        widgetId,
        conversationId,
        message,
        contextWithPrompt,
        {
          provider: 'gemini',
          model: 'gemini-pro',
          temperature: 0.7,
          maxTokens: 500
        }
      );

      if (aiResponse.success && aiResponse.text) {
        // Calculate cost
        const inputCost = 0.000075; // $0.075 per 1M input tokens
        const outputCost = 0.0003;  // $0.30 per 1M output tokens
        const estimatedCost = (aiResponse.tokensUsed / 1000) * ((inputCost + outputCost) / 2);

        return {
          success: true,
          response: aiResponse.text,
          confidence: 0.8, // AI responses have high confidence
          tokensUsed: aiResponse.tokensUsed,
          cost: estimatedCost
        };
      }

      return {
        success: false,
        reason: 'ai_generation_failed'
      };

    } catch (error) {
      console.error('AI response error:', error);
      return {
        success: false,
        reason: 'ai_error'
      };
    }
  }

  // ==========================================
  // STEP 4: AGENT HANDOFF
  // ==========================================

  private async requestAgentHandoff(context: FlowContext): Promise<StepResult> {
    try {
      const { conversationId } = context;

      // Update conversation status to indicate agent is needed
      await pool.query(
        `UPDATE widget_conversations 
         SET status = 'waiting_for_agent', 
             agent_requested_at = NOW()
         WHERE id = $1`,
        [conversationId]
      );

      // Check if any agents are online
      const agentsOnline = await this.checkAgentAvailability(context.clientId);

      if (agentsOnline) {
        return {
          success: true,
          response: 'Let me connect you with one of our team members who can help you better. They\'ll be with you shortly!',
          confidence: 1.0,
          tokensUsed: 0,
          cost: 0
        };
      } else {
        return {
          success: true,
          response: 'Our team is currently offline. Please leave your contact details and we\'ll get back to you as soon as possible!',
          confidence: 1.0,
          tokensUsed: 0,
          cost: 0
        };
      }

    } catch (error) {
      console.error('Agent handoff error:', error);
      return {
        success: true, // Always succeed for agent handoff
        response: 'Let me connect you with our team for assistance.',
        confidence: 1.0,
        tokensUsed: 0,
        cost: 0
      };
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async getWidgetFlow(widgetId: number): Promise<FlowStep[]> {
    try {
      const result = await pool.query(
        'SELECT conversation_flow FROM widget_configs WHERE id = $1',
        [widgetId]
      );

      if (result.rows.length > 0 && result.rows[0].conversation_flow) {
        return result.rows[0].conversation_flow;
      }

      return [];
    } catch (error) {
      console.error('Error getting widget flow:', error);
      return [];
    }
  }

  private async checkAIAvailability(widgetId: number, clientId: number): Promise<boolean> {
    try {
      // Check if client has AI credits available
      const result = await pool.query(
        `SELECT 
          ai_responses_used,
          ai_responses_limit
         FROM widget_billing
         WHERE widget_id = $1 AND client_id = $2`,
        [widgetId, clientId]
      );

      if (result.rows.length === 0) {
        // No billing record, assume AI is available (legacy widgets)
        return true;
      }

      const { ai_responses_used, ai_responses_limit } = result.rows[0];
      return ai_responses_used < ai_responses_limit;

    } catch (error) {
      // If widget_billing table doesn't exist yet, assume AI is available
      console.log('Billing check skipped (table may not exist yet)');
      return true;
    }
  }

  private async getConversationContext(conversationId: number, limit: number = 5): Promise<string> {
    try {
      const result = await pool.query(
        `SELECT sender, message, created_at
         FROM widget_messages
         WHERE conversation_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [conversationId, limit]
      );

      if (result.rows.length === 0) return '';

      // Reverse to get chronological order
      const messages = result.rows.reverse();
      return messages
        .map((m: any) => `${m.sender === 'user' ? 'User' : 'Bot'}: ${m.message}`)
        .join('\n');

    } catch (error) {
      console.error('Error getting conversation context:', error);
      return '';
    }
  }

  private async buildSystemPrompt(widgetId: number): Promise<string> {
    try {
      const result = await pool.query(
        `SELECT 
          w.bot_name,
          w.welcome_message,
          c.client_name,
          c.specialties
         FROM widget_configs w
         JOIN clients c ON w.client_id = c.id
         WHERE w.id = $1`,
        [widgetId]
      );

      if (result.rows.length === 0) {
        return 'You are a helpful assistant.';
      }

      const { bot_name, client_name, specialties } = result.rows[0];

      return `You are ${bot_name}, an AI assistant for ${client_name}.
${specialties ? `Business focus: ${specialties}` : ''}

Guidelines:
- Be helpful, friendly, and professional
- Keep responses concise (2-3 sentences max)
- Never share sensitive information (SSN, credit cards, etc.)
- If asked for medical advice, remind them to consult a healthcare professional
- If you cannot answer, acknowledge it and suggest connecting with a team member

Answer the user's question based on the conversation context provided.`;

    } catch (error) {
      console.error('Error building system prompt:', error);
      return 'You are a helpful assistant.';
    }
  }

  private async checkAgentAvailability(clientId: number): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as online_agents
         FROM users
         WHERE client_id = $1
           AND is_active = true
           AND last_seen_at > NOW() - INTERVAL '10 minutes'`,
        [clientId]
      );

      return result.rows[0].online_agents > 0;

    } catch (error) {
      console.error('Error checking agent availability:', error);
      return false;
    }
  }

  private async trackStepExecution(
    context: FlowContext,
    step: FlowStep,
    result: StepResult
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO conversation_flow_analytics (
          widget_id,
          conversation_id,
          step_type,
          step_order,
          resolved,
          resolution_message,
          confidence_score,
          tokens_used,
          estimated_cost,
          response_time_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          context.widgetId,
          context.conversationId,
          step.type,
          step.order,
          result.success,
          result.response || null,
          result.confidence || null,
          result.tokensUsed || 0,
          result.cost || 0,
          result.responseTimeMs || 0
        ]
      );
    } catch (error) {
      // Don't fail the flow if analytics tracking fails
      console.error('Error tracking step execution:', error);
    }
  }

  private async executeFallbackFlow(context: FlowContext): Promise<StepResult> {
    // Default flow: KB → AI → Agent
    
    // Try KB first
    const kbResult = await this.searchKnowledgeBase({
      id: 2,
      type: 'knowledge_base',
      order: 2,
      locked: false,
      enabled: true,
      removable: false,
      settings: { min_confidence: 0.7 }
    }, context);

    if (kbResult.success) return kbResult;

    // Try AI
    const aiResult = await this.getAIResponse({
      id: 3,
      type: 'ai_response',
      order: 3,
      locked: false,
      enabled: true,
      removable: true,
      settings: {}
    }, context);

    if (aiResult.success) return aiResult;

    // Fallback to agent
    return this.requestAgentHandoff(context);
  }
}

export default ConversationFlowService;

