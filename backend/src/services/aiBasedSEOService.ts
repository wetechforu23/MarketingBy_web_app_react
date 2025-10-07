import { pool } from './databaseService';

export interface AIQueryAnalysis {
  originalQuery: string;
  intent: string;
  entities: string[];
  location?: string;
  specialty?: string;
  urgency?: 'low' | 'medium' | 'high';
  semanticKeywords: string[];
  conversationalVariations: string[];
  contextClues: string[];
}

export interface AIOptimizedContent {
  title: string;
  description: string;
  content: string;
  faqSection: string;
  conversationalAnswers: string[];
  semanticKeywords: string[];
  entityMentions: string[];
}

export class AIBasedSEOService {
  private static instance: AIBasedSEOService;

  public static getInstance(): AIBasedSEOService {
    if (!AIBasedSEOService.instance) {
      AIBasedSEOService.instance = new AIBasedSEOService();
    }
    return AIBasedSEOService.instance;
  }

  /**
   * Analyze conversational queries like "near good doctor me"
   */
  analyzeConversationalQuery(query: string): AIQueryAnalysis {
    const normalizedQuery = query.toLowerCase().trim();
    
    // Extract intent
    const intent = this.extractIntent(normalizedQuery);
    
    // Extract entities
    const entities = this.extractEntities(normalizedQuery);
    
    // Extract location
    const location = this.extractLocation(normalizedQuery);
    
    // Extract medical specialty
    const specialty = this.extractSpecialty(normalizedQuery);
    
    // Determine urgency
    const urgency = this.determineUrgency(normalizedQuery);
    
    // Generate semantic keywords
    const semanticKeywords = this.generateSemanticKeywords(intent, entities, location, specialty);
    
    // Generate conversational variations
    const conversationalVariations = this.generateConversationalVariations(intent, entities, location, specialty);
    
    // Extract context clues
    const contextClues = this.extractContextClues(normalizedQuery);

    return {
      originalQuery: query,
      intent,
      entities,
      location,
      specialty,
      urgency,
      semanticKeywords,
      conversationalVariations,
      contextClues
    };
  }

  /**
   * Generate AI-optimized content for healthcare practices
   */
  generateAIOptimizedContent(
    practiceName: string,
    location: string,
    specialties: string[],
    queryAnalysis: AIQueryAnalysis
  ): AIOptimizedContent {
    
    // Generate conversational title
    const title = this.generateConversationalTitle(practiceName, location, specialties, queryAnalysis);
    
    // Generate natural description
    const description = this.generateNaturalDescription(practiceName, location, specialties, queryAnalysis);
    
    // Generate conversational content
    const content = this.generateConversationalContent(practiceName, location, specialties, queryAnalysis);
    
    // Generate FAQ section
    const faqSection = this.generateFAQSection(practiceName, location, specialties, queryAnalysis);
    
    // Generate conversational answers
    const conversationalAnswers = this.generateConversationalAnswers(practiceName, location, specialties, queryAnalysis);
    
    // Generate semantic keywords
    const semanticKeywords = this.generateSemanticKeywordsForContent(practiceName, location, specialties, queryAnalysis);
    
    // Generate entity mentions
    const entityMentions = this.generateEntityMentions(practiceName, location, specialties, queryAnalysis);

    return {
      title,
      description,
      content,
      faqSection,
      conversationalAnswers,
      semanticKeywords,
      entityMentions
    };
  }

  /**
   * Extract user intent from conversational query
   */
  private extractIntent(query: string): string {
    const intentPatterns = {
      'find_doctor': ['doctor', 'physician', 'medical', 'healthcare', 'clinic', 'practice'],
      'emergency_care': ['emergency', 'urgent', 'immediate', 'asap', 'now'],
      'routine_care': ['routine', 'checkup', 'annual', 'regular', 'preventive'],
      'specialty_care': ['specialist', 'cardiologist', 'dermatologist', 'pediatrician'],
      'location_based': ['near', 'close', 'local', 'area', 'around', 'nearby']
    };

    for (const [intent, keywords] of Object.entries(intentPatterns)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return intent;
      }
    }
    
    return 'general_healthcare';
  }

  /**
   * Extract entities from query
   */
  private extractEntities(query: string): string[] {
    const entities: string[] = [];
    
    // Medical entities
    const medicalTerms = ['doctor', 'physician', 'nurse', 'clinic', 'hospital', 'medical', 'healthcare'];
    medicalTerms.forEach(term => {
      if (query.includes(term)) entities.push(term);
    });
    
    // Quality indicators
    const qualityTerms = ['good', 'best', 'top', 'excellent', 'reliable', 'trusted', 'experienced'];
    qualityTerms.forEach(term => {
      if (query.includes(term)) entities.push(term);
    });
    
    // Service types
    const serviceTerms = ['primary care', 'family medicine', 'internal medicine', 'pediatrics', 'women health'];
    serviceTerms.forEach(term => {
      if (query.includes(term)) entities.push(term);
    });
    
    return entities;
  }

  /**
   * Extract location from query
   */
  private extractLocation(query: string): string | undefined {
    // Common location indicators
    const locationIndicators = ['near', 'in', 'at', 'around', 'close to', 'nearby'];
    
    for (const indicator of locationIndicators) {
      const index = query.indexOf(indicator);
      if (index !== -1) {
        const afterIndicator = query.substring(index + indicator.length).trim();
        // Extract potential location (simplified)
        const words = afterIndicator.split(' ');
        if (words.length > 0 && words[0].length > 2) {
          return words[0];
        }
      }
    }
    
    return undefined;
  }

  /**
   * Extract medical specialty from query
   */
  private extractSpecialty(query: string): string | undefined {
    const specialties = {
      'primary_care': ['primary care', 'family doctor', 'general practitioner', 'gp'],
      'cardiology': ['heart', 'cardiac', 'cardiologist'],
      'dermatology': ['skin', 'dermatologist', 'dermatology'],
      'pediatrics': ['children', 'kids', 'pediatrician', 'pediatric'],
      'womens_health': ['women', 'female', 'gynecology', 'obgyn'],
      'internal_medicine': ['internal medicine', 'internist'],
      'emergency_medicine': ['emergency', 'urgent care', 'er']
    };

    for (const [specialty, keywords] of Object.entries(specialties)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return specialty;
      }
    }
    
    return undefined;
  }

  /**
   * Determine urgency level
   */
  private determineUrgency(query: string): 'low' | 'medium' | 'high' {
    const highUrgencyWords = ['emergency', 'urgent', 'immediate', 'asap', 'now', 'critical'];
    const mediumUrgencyWords = ['soon', 'quickly', 'fast', 'prompt'];
    
    if (highUrgencyWords.some(word => query.includes(word))) {
      return 'high';
    } else if (mediumUrgencyWords.some(word => query.includes(word))) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Generate semantic keywords based on analysis
   */
  private generateSemanticKeywords(intent: string, entities: string[], location?: string, specialty?: string): string[] {
    const keywords: string[] = [];
    
    // Base keywords based on intent
    switch (intent) {
      case 'find_doctor':
        keywords.push('find doctor', 'locate physician', 'medical provider search', 'healthcare provider');
        break;
      case 'emergency_care':
        keywords.push('emergency medical care', 'urgent care', 'immediate medical attention');
        break;
      case 'routine_care':
        keywords.push('routine medical care', 'preventive healthcare', 'annual checkup');
        break;
    }
    
    // Add location-based keywords
    if (location) {
      keywords.push(`${location} doctor`, `medical care ${location}`, `healthcare ${location}`);
    }
    
    // Add specialty-based keywords
    if (specialty) {
      keywords.push(`${specialty} specialist`, `${specialty} care`, `${specialty} services`);
    }
    
    // Add entity-based keywords
    entities.forEach(entity => {
      keywords.push(`${entity} services`, `${entity} care`, `${entity} provider`);
    });
    
    return keywords;
  }

  /**
   * Generate conversational variations
   */
  private generateConversationalVariations(intent: string, entities: string[], location?: string, specialty?: string): string[] {
    const variations: string[] = [];
    
    // Natural language variations
    variations.push('Where can I find a good doctor?');
    variations.push('I need to see a doctor near me');
    variations.push('Looking for medical care in my area');
    variations.push('Need a healthcare provider nearby');
    variations.push('Where is the closest doctor?');
    
    if (location) {
      variations.push(`Doctor near ${location}`);
      variations.push(`Medical care in ${location}`);
      variations.push(`Healthcare provider ${location}`);
    }
    
    if (specialty) {
      variations.push(`${specialty} doctor near me`);
      variations.push(`Need a ${specialty} specialist`);
      variations.push(`${specialty} care in my area`);
    }
    
    return variations;
  }

  /**
   * Extract context clues
   */
  private extractContextClues(query: string): string[] {
    const clues: string[] = [];
    
    // Time indicators
    if (query.includes('now') || query.includes('today')) clues.push('immediate_need');
    if (query.includes('soon') || query.includes('this week')) clues.push('near_term_need');
    
    // Quality indicators
    if (query.includes('good') || query.includes('best')) clues.push('quality_focused');
    if (query.includes('experienced') || query.includes('trusted')) clues.push('experience_important');
    
    // Convenience indicators
    if (query.includes('near') || query.includes('close')) clues.push('convenience_focused');
    if (query.includes('walking') || query.includes('driving')) clues.push('transportation_consideration');
    
    return clues;
  }

  /**
   * Generate conversational title
   */
  private generateConversationalTitle(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string {
    const specialtyText = specialties.length > 0 ? specialties[0] : 'Primary Care';
    const locationText = location ? ` in ${location}` : ' Near You';
    
    return `${specialtyText} Doctor${locationText} | ${practiceName} - Quality Healthcare Services`;
  }

  /**
   * Generate natural description
   */
  private generateNaturalDescription(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string {
    const specialtyText = specialties.length > 0 ? specialties.join(', ') : 'primary care';
    const locationText = location ? ` in ${location}` : ' in your area';
    
    return `Find quality ${specialtyText} services${locationText} at ${practiceName}. Our experienced healthcare providers offer comprehensive medical care with a patient-centered approach. Schedule your appointment today for personalized healthcare solutions.`;
  }

  /**
   * Generate conversational content
   */
  private generateConversationalContent(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string {
    return `
      <h2>Finding Quality Healthcare Near You</h2>
      <p>When you're looking for a good doctor near you, ${practiceName} provides comprehensive healthcare services with a focus on patient care and convenience.</p>
      
      <h3>Why Choose ${practiceName}?</h3>
      <ul>
        <li><strong>Experienced Providers:</strong> Our team of qualified healthcare professionals brings years of experience to every patient interaction.</li>
        <li><strong>Convenient Location:</strong> Located ${location ? `in ${location}` : 'in your area'} for easy access to quality healthcare.</li>
        <li><strong>Comprehensive Services:</strong> We offer ${specialties.length > 0 ? specialties.join(', ') : 'primary care and specialized medical services'}.</li>
        <li><strong>Patient-Centered Care:</strong> Your health and comfort are our top priorities.</li>
      </ul>
      
      <h3>Services We Provide</h3>
      <p>Our practice offers a full range of medical services to meet your healthcare needs, from routine checkups to specialized care.</p>
      
      <h3>Schedule Your Appointment</h3>
      <p>Ready to find quality healthcare? Contact ${practiceName} today to schedule your appointment with our experienced medical team.</p>
    `;
  }

  /**
   * Generate FAQ section
   */
  private generateFAQSection(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string {
    return `
      <h3>Frequently Asked Questions</h3>
      
      <div class="faq-item">
        <h4>How do I find a good doctor near me?</h4>
        <p>${practiceName} is conveniently located ${location ? `in ${location}` : 'in your area'} and offers quality healthcare services. You can schedule an appointment by calling our office or using our online booking system.</p>
      </div>
      
      <div class="faq-item">
        <h4>What services do you provide?</h4>
        <p>We offer comprehensive healthcare services including ${specialties.length > 0 ? specialties.join(', ') : 'primary care, preventive medicine, and specialized treatments'}.</p>
      </div>
      
      <div class="faq-item">
        <h4>Do you accept new patients?</h4>
        <p>Yes, we welcome new patients and are currently accepting appointments. Contact us today to schedule your first visit.</p>
      </div>
      
      <div class="faq-item">
        <h4>What insurance do you accept?</h4>
        <p>We accept most major insurance plans. Please contact our office to verify your specific insurance coverage.</p>
      </div>
    `;
  }

  /**
   * Generate conversational answers
   */
  private generateConversationalAnswers(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string[] {
    return [
      `${practiceName} is a quality healthcare provider ${location ? `in ${location}` : 'in your area'} offering comprehensive medical services.`,
      `When looking for a good doctor near you, ${practiceName} provides experienced healthcare professionals with a patient-centered approach.`,
      `Our practice offers ${specialties.length > 0 ? specialties.join(', ') : 'primary care and specialized medical services'} to meet your healthcare needs.`,
      `Located ${location ? `in ${location}` : 'in your area'}, ${practiceName} makes quality healthcare convenient and accessible.`,
      `Schedule an appointment with ${practiceName} for personalized healthcare services from experienced medical professionals.`
    ];
  }

  /**
   * Generate semantic keywords for content
   */
  private generateSemanticKeywordsForContent(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string[] {
    const keywords: string[] = [];
    
    // Base keywords
    keywords.push('doctor near me', 'healthcare provider', 'medical care', 'quality healthcare');
    
    // Location-based
    if (location) {
      keywords.push(`${location} doctor`, `medical care ${location}`, `healthcare ${location}`);
    }
    
    // Specialty-based
    specialties.forEach(specialty => {
      keywords.push(`${specialty} doctor`, `${specialty} care`, `${specialty} services`);
    });
    
    // Conversational keywords
    keywords.push('find doctor', 'locate physician', 'good doctor', 'experienced doctor', 'trusted healthcare');
    
    return keywords;
  }

  /**
   * Generate entity mentions
   */
  private generateEntityMentions(practiceName: string, location: string, specialties: string[], queryAnalysis: AIQueryAnalysis): string[] {
    const mentions: string[] = [];
    
    // Practice mentions
    mentions.push(practiceName);
    
    // Location mentions
    if (location) {
      mentions.push(location);
    }
    
    // Specialty mentions
    specialties.forEach(specialty => {
      mentions.push(specialty);
    });
    
    // Medical entity mentions
    mentions.push('doctor', 'physician', 'healthcare provider', 'medical practice', 'clinic');
    
    return mentions;
  }

  /**
   * Save AI-optimized content to database
   */
  async saveAIOptimizedContent(leadId: number, content: AIOptimizedContent): Promise<void> {
    try {
      const query = `
        INSERT INTO ai_seo_content (
          lead_id, title, description, content, faq_section, 
          conversational_answers, semantic_keywords, entity_mentions, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        ON CONFLICT (lead_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          content = EXCLUDED.content,
          faq_section = EXCLUDED.faq_section,
          conversational_answers = EXCLUDED.conversational_answers,
          semantic_keywords = EXCLUDED.semantic_keywords,
          entity_mentions = EXCLUDED.entity_mentions,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      await pool.query(query, [
        leadId,
        content.title,
        content.description,
        content.content,
        content.faqSection,
        JSON.stringify(content.conversationalAnswers),
        JSON.stringify(content.semanticKeywords),
        JSON.stringify(content.entityMentions)
      ]);
    } catch (error) {
      console.error('Error saving AI-optimized content:', error);
      throw error;
    }
  }
}
