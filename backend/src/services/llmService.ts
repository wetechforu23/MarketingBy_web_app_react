import axios from 'axios';
import crypto from 'crypto';
import pool from '../config/database';

// ==========================================
// LLM SERVICE - Multi-Provider Support
// ==========================================
// Supports: Google Gemini (Primary), OpenAI, Groq, Claude
// Features: Credit tracking, rate limiting, fallback logic
// ==========================================

interface LLMConfig {
  provider: 'gemini' | 'openai' | 'groq' | 'claude';
  model: string;
  temperature: number;
  maxTokens: number;
}

interface LLMResponse {
  success: boolean;
  text: string;
  tokensUsed: number;
  provider: string;
  model: string;
  responseTimeMs: number;
  error?: string;
}

export class LLMService {
  private static instance: LLMService;
  private cachedKeys: Map<string, { key: string; timestamp: number }> = new Map();
  private CACHE_TTL = 3600000; // 1 hour cache

  private constructor() {}

  static getInstance(): LLMService {
    if (!LLMService.instance) {
      LLMService.instance = new LLMService();
    }
    return LLMService.instance;
  }

  // ==========================================
  // CREDENTIAL MANAGEMENT (Encrypted in DB)
  // ==========================================

  private decrypt(encryptedValue: string): string {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'your-32-character-secret-key!!';
    const key = Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').substring(0, 32));
    
    try {
      const parts = encryptedValue.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt API key');
    }
  }

  private async getApiKey(provider: string): Promise<string> {
    // Check cache first
    const cacheKey = `${provider}_api_key`;
    const cached = this.cachedKeys.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.key;
    }

    try {
      // Try new schema first (service_name, credential_type, environment)
      let result = await pool.query(
        `SELECT encrypted_value FROM encrypted_credentials 
         WHERE service_name = $1 
           AND credential_type = 'api_key' 
           AND environment = $2
           AND is_active = true
         LIMIT 1`,
        [provider, process.env.NODE_ENV || 'production']
      );

      // Fallback to old schema (service, key_name) - used on Heroku production
      if (result.rows.length === 0) {
        result = await pool.query(
          `SELECT encrypted_value FROM encrypted_credentials 
           WHERE service = $1 AND key_name = 'api_key'
           LIMIT 1`,
          [provider]
        );
      }

      if (result.rows.length === 0) {
        // Fallback to environment variable (for backward compatibility)
        const envKey = provider.toUpperCase() + '_API_KEY';
        const apiKey = process.env[envKey];
        
        if (!apiKey) {
          throw new Error(`${provider} API key not found in database or environment`);
        }
        
        console.log(`⚠️  Using ${provider} API key from environment variable (consider storing in database)`);
        return apiKey;
      }

      // Decrypt the key
      const encryptedValue = result.rows[0].encrypted_value;
      const decryptedKey = this.decrypt(encryptedValue);

      // Cache it
      this.cachedKeys.set(cacheKey, {
        key: decryptedKey,
        timestamp: Date.now()
      });

      console.log(`✅ Retrieved ${provider} API key from encrypted database`);
      return decryptedKey;

    } catch (error) {
      console.error(`Error getting ${provider} API key:`, error);
      throw error;
    }
  }

  // ==========================================
  // SENSITIVE DATA DETECTION
  // ==========================================
  
  private detectSensitiveData(message: string): { hasSensitive: boolean; detectedTypes: string[] } {
    const sensitive = {
      hasSensitive: false,
      detectedTypes: [] as string[]
    };

    const patterns = {
      // SSN patterns
      ssn: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/,
      
      // Credit card patterns (simple check)
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      
      // Medical record numbers
      medicalRecord: /\b(MR|MRN|Medical Record|Patient ID)[\s#:]+[A-Z0-9-]+\b/i,
      
      // Insurance info
      insurance: /\b(insurance|policy|member|subscriber)[\s#:]+[A-Z0-9-]+\b/i,
      
      // Date of birth (various formats)
      dob: /\b(DOB|date of birth|birthday)[\s:]+\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i,
      
      // Diagnosis codes (ICD)
      diagnosisCodes: /\b[A-Z]\d{2}\.\d{1,2}\b/,
      
      // Common sensitive phrases
      sensitivePhrases: /\b(diagnosed with|prescription for|medication|symptoms|medical condition|health condition|test results)\b/i,
      
      // Bank account
      bankAccount: /\b(account|routing)[\s#:]+\d{8,17}\b/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(message)) {
        sensitive.hasSensitive = true;
        sensitive.detectedTypes.push(type);
      }
    }

    return sensitive;
  }

  // ==========================================
  // MAIN METHOD: Generate Smart Response
  // ==========================================
  async generateSmartResponse(
    clientId: number,
    widgetId: number,
    conversationId: number,
    userMessage: string,
    context: string = '',
    config: LLMConfig
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // 1. Check for sensitive/HIPAA data FIRST
      const sensitiveCheck = this.detectSensitiveData(userMessage);
      
      if (sensitiveCheck.hasSensitive) {
        console.log(`🚨 SENSITIVE DATA DETECTED in conversation ${conversationId}: ${sensitiveCheck.detectedTypes.join(', ')}`);
        
        // Log the blocked attempt
        await pool.query(
          `INSERT INTO llm_request_logs (
            client_id, widget_id, conversation_id,
            llm_provider, llm_model, prompt_text,
            status, error_message
          ) VALUES ($1, $2, $3, 'security_block', 'sensitive_data_filter', $4, 'blocked', $5)`,
          [
            clientId,
            widgetId,
            conversationId,
            userMessage.substring(0, 100),
            `Sensitive data detected: ${sensitiveCheck.detectedTypes.join(', ')}`
          ]
        );
        
        return {
          success: true,
          text: `⚠️ **Security Notice**: For your privacy and security, we cannot handle sensitive information like ${sensitiveCheck.detectedTypes.join(', ')} through this chat.\n\n🔒 **Please:**\n• Call us directly at [PRACTICE_PHONE]\n• Or request to speak with an agent who can handle your inquiry securely\n\nWe take your privacy seriously and comply with all HIPAA regulations.`,
          tokensUsed: 0,
          provider: 'security_filter',
          model: 'sensitive_data_detection',
          responseTimeMs: Date.now() - startTime
        };
      }

      // 2. Check if client has credits
      const hasCredits = await this.checkClientCredits(clientId, widgetId);
      
      if (!hasCredits) {
        console.log(`❌ Client ${clientId} exhausted LLM credits`);
        return {
          success: false,
          text: '',
          tokensUsed: 0,
          provider: config.provider,
          model: config.model,
          responseTimeMs: 0,
          error: 'credits_exhausted'
        };
      }

      // 2. Call LLM provider
      let response: LLMResponse;
      
      switch (config.provider) {
        case 'gemini':
          response = await this.callGemini(userMessage, context, config);
          break;
        case 'openai':
          response = await this.callOpenAI(userMessage, context, config);
          break;
        case 'groq':
          response = await this.callGroq(userMessage, context, config);
          break;
        case 'claude':
          response = await this.callClaude(userMessage, context, config);
          break;
        default:
          throw new Error(`Unknown LLM provider: ${config.provider}`);
      }

      response.responseTimeMs = Date.now() - startTime;

      // 3. Update usage counters
      if (response.success) {
        await this.updateUsageCounters(clientId, widgetId, response.tokensUsed);
      }

      // 4. Log request
      await this.logLLMRequest(
        clientId,
        widgetId,
        conversationId,
        userMessage,
        response
      );

      return response;

    } catch (error) {
      console.error('LLM Service error:', error);
      
      // Log failed request
      await this.logLLMRequest(
        clientId,
        widgetId,
        conversationId,
        userMessage,
        {
          success: false,
          text: '',
          tokensUsed: 0,
          provider: config.provider,
          model: config.model,
          responseTimeMs: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );

      throw error;
    }
  }

  // ==========================================
  // GOOGLE GEMINI API (FREE - 1M tokens/day)
  // ==========================================
  private async callGemini(
    userMessage: string,
    context: string,
    config: LLMConfig
  ): Promise<LLMResponse> {
    try {
      // Get API key from encrypted database
      const apiKey = await this.getApiKey('gemini');

      // Build prompt with context
      const systemPrompt = `You are a helpful customer service assistant for a business. Be friendly, concise, and professional. Keep responses under 3 sentences unless more detail is needed.

${context ? `Business Context:\n${context}\n` : ''}

Answer the customer's question based on the context above.`;

      const prompt = `${systemPrompt}\n\nCustomer: ${userMessage}\n\nAssistant:`;

      // Call Gemini API
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${apiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: config.temperature,
            maxOutputTokens: config.maxTokens,
            topP: 0.8,
            topK: 10
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000 // 15 second timeout
        }
      );

      const generatedText = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Estimate tokens (Gemini doesn't return exact counts)
      const estimatedTokens = Math.ceil((prompt.length + generatedText.length) / 4);

      return {
        success: true,
        text: generatedText.trim(),
        tokensUsed: estimatedTokens,
        provider: 'gemini',
        model: config.model
      } as LLMResponse;

    } catch (error: any) {
      console.error('Gemini API error:', error.response?.data || error.message);
      
      return {
        success: false,
        text: '',
        tokensUsed: 0,
        provider: 'gemini',
        model: config.model,
        error: error.response?.data?.error?.message || error.message
      } as LLMResponse;
    }
  }

  // ==========================================
  // OPENAI API (Requires API Key)
  // ==========================================
  private async callOpenAI(
    userMessage: string,
    context: string,
    config: LLMConfig
  ): Promise<LLMResponse> {
    try {
      // Get API key from encrypted database
      const apiKey = await this.getApiKey('openai');

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: config.model || 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a helpful customer service assistant. Be friendly and concise.\n\n${context}`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        text: response.data.choices[0].message.content,
        tokensUsed: response.data.usage.total_tokens,
        provider: 'openai',
        model: config.model
      } as LLMResponse;

    } catch (error: any) {
      return {
        success: false,
        text: '',
        tokensUsed: 0,
        provider: 'openai',
        model: config.model,
        error: error.message
      } as LLMResponse;
    }
  }

  // ==========================================
  // GROQ API (Fast & Free)
  // ==========================================
  private async callGroq(
    userMessage: string,
    context: string,
    config: LLMConfig
  ): Promise<LLMResponse> {
    try {
      // Get API key from encrypted database
      const apiKey = await this.getApiKey('groq');

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: config.model || 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant.\n\n${context}`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        text: response.data.choices[0].message.content,
        tokensUsed: response.data.usage?.total_tokens || 500,
        provider: 'groq',
        model: config.model
      } as LLMResponse;

    } catch (error: any) {
      return {
        success: false,
        text: '',
        tokensUsed: 0,
        provider: 'groq',
        model: config.model,
        error: error.message
      } as LLMResponse;
    }
  }

  // ==========================================
  // CLAUDE API (Anthropic)
  // ==========================================
  private async callClaude(
    userMessage: string,
    context: string,
    config: LLMConfig
  ): Promise<LLMResponse> {
    try {
      // Get API key from encrypted database
      const apiKey = await this.getApiKey('claude');

      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: config.model || 'claude-3-haiku-20240307',
          max_tokens: config.maxTokens,
          messages: [
            {
              role: 'user',
              content: `${context}\n\nUser question: ${userMessage}`
            }
          ]
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        text: response.data.content[0].text,
        tokensUsed: response.data.usage.input_tokens + response.data.usage.output_tokens,
        provider: 'claude',
        model: config.model
      } as LLMResponse;

    } catch (error: any) {
      return {
        success: false,
        text: '',
        tokensUsed: 0,
        provider: 'claude',
        model: config.model,
        error: error.message
      } as LLMResponse;
    }
  }

  // ==========================================
  // CREDIT MANAGEMENT
  // ==========================================
  
  async checkClientCredits(clientId: number, widgetId: number): Promise<boolean> {
    try {
      // Reset counters if needed (daily/monthly)
      await pool.query('SELECT reset_daily_llm_usage()');
      await pool.query('SELECT reset_monthly_llm_usage()');

      // Check if credits available
      const result = await pool.query(
        'SELECT check_client_llm_credits($1, $2, $3) as has_credits',
        [clientId, widgetId, 500] // Estimate 500 tokens
      );

      return result.rows[0]?.has_credits || false;
    } catch (error) {
      console.error('Error checking credits:', error);
      return false;
    }
  }

  async updateUsageCounters(
    clientId: number,
    widgetId: number,
    tokensUsed: number
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO client_llm_usage (
          client_id, widget_id, 
          tokens_used_today, tokens_used_this_month,
          requests_made_today, requests_made_this_month,
          total_tokens_used, total_requests_made
        ) VALUES ($1, $2, $3, $3, 1, 1, $3, 1)
        ON CONFLICT (client_id, widget_id) 
        DO UPDATE SET
          tokens_used_today = client_llm_usage.tokens_used_today + $3,
          tokens_used_this_month = client_llm_usage.tokens_used_this_month + $3,
          requests_made_today = client_llm_usage.requests_made_today + 1,
          requests_made_this_month = client_llm_usage.requests_made_this_month + 1,
          total_tokens_used = client_llm_usage.total_tokens_used + $3,
          total_requests_made = client_llm_usage.total_requests_made + 1,
          updated_at = CURRENT_TIMESTAMP`,
        [clientId, widgetId, tokensUsed]
      );

      console.log(`✅ Updated LLM usage: Client ${clientId}, Tokens: ${tokensUsed}`);
    } catch (error) {
      console.error('Error updating usage counters:', error);
    }
  }

  async logLLMRequest(
    clientId: number,
    widgetId: number,
    conversationId: number,
    prompt: string,
    response: LLMResponse
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO llm_request_logs (
          client_id, widget_id, conversation_id,
          llm_provider, llm_model, prompt_text, response_text,
          total_tokens, response_time_ms, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          clientId,
          widgetId,
          conversationId,
          response.provider,
          response.model,
          prompt,
          response.text || null,
          response.tokensUsed,
          response.responseTimeMs || 0,
          response.success ? 'success' : 'failed',
          response.error || null
        ]
      );
    } catch (error) {
      console.error('Error logging LLM request:', error);
    }
  }

  // ==========================================
  // ADMIN METHODS
  // ==========================================

  async getClientUsage(clientId: number): Promise<any> {
    const result = await pool.query(
      `SELECT * FROM client_llm_usage WHERE client_id = $1`,
      [clientId]
    );
    return result.rows[0] || null;
  }

  async updateClientLimits(
    clientId: number,
    widgetId: number,
    limits: {
      monthlyTokenLimit?: number;
      dailyTokenLimit?: number;
      monthlyRequestLimit?: number;
      dailyRequestLimit?: number;
    }
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (limits.monthlyTokenLimit !== undefined) {
      updates.push(`monthly_token_limit = $${paramCount++}`);
      values.push(limits.monthlyTokenLimit);
    }
    if (limits.dailyTokenLimit !== undefined) {
      updates.push(`daily_token_limit = $${paramCount++}`);
      values.push(limits.dailyTokenLimit);
    }
    if (limits.monthlyRequestLimit !== undefined) {
      updates.push(`monthly_request_limit = $${paramCount++}`);
      values.push(limits.monthlyRequestLimit);
    }
    if (limits.dailyRequestLimit !== undefined) {
      updates.push(`daily_request_limit = $${paramCount++}`);
      values.push(limits.dailyRequestLimit);
    }

    if (updates.length > 0) {
      values.push(clientId, widgetId);
      await pool.query(
        `UPDATE client_llm_usage 
         SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
         WHERE client_id = $${paramCount} AND widget_id = $${paramCount + 1}`,
        values
      );
    }
  }
}

export default LLMService.getInstance();

