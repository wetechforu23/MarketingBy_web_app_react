import axios from 'axios';

export interface ComplianceCheck {
  hipaa: boolean;
  texasState: boolean;
  healthcareMarketing: boolean;
  dataPrivacy: boolean;
  accessibility: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

export interface LeadData {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  website?: string;
  industry?: string;
  source: string;
  notes?: string;
  complianceStatus?: string;
}

export class ComplianceService {
  static async checkTexasCompliance(websiteData: any): Promise<ComplianceCheck> {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // HIPAA Compliance Check
    const hipaaCompliant = this.checkHIPAACompliance(websiteData);
    if (!hipaaCompliant) {
      issues.push('HIPAA compliance issues detected');
      recommendations.push('Implement HIPAA-compliant data handling procedures');
      score -= 20;
    }

    // Texas State Healthcare Marketing Compliance
    const texasCompliant = this.checkTexasHealthcareMarketing(websiteData);
    if (!texasCompliant) {
      issues.push('Texas healthcare marketing compliance issues');
      recommendations.push('Review Texas healthcare marketing regulations');
      score -= 15;
    }

    // Data Privacy Compliance
    const privacyCompliant = this.checkDataPrivacy(websiteData);
    if (!privacyCompliant) {
      issues.push('Data privacy compliance issues');
      recommendations.push('Implement GDPR/CCPA compliant privacy policies');
      score -= 15;
    }

    // Accessibility Compliance
    const accessibilityCompliant = this.checkAccessibility(websiteData);
    if (!accessibilityCompliant) {
      issues.push('Accessibility compliance issues');
      recommendations.push('Implement WCAG 2.1 AA accessibility standards');
      score -= 10;
    }

    // Healthcare Marketing Specific Checks
    const healthcareMarketingCompliant = this.checkHealthcareMarketing(websiteData);
    if (!healthcareMarketingCompliant) {
      issues.push('Healthcare marketing compliance issues');
      recommendations.push('Review FDA guidelines for healthcare marketing');
      score -= 10;
    }

    return {
      hipaa: hipaaCompliant,
      texasState: texasCompliant,
      healthcareMarketing: healthcareMarketingCompliant,
      dataPrivacy: privacyCompliant,
      accessibility: accessibilityCompliant,
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }

  private static checkHIPAACompliance(websiteData: any): boolean {
    // Check for HIPAA compliance indicators
    const hasPrivacyPolicy = websiteData.metaTags?.some((tag: any) => 
      tag.name === 'privacy-policy' || tag.content?.toLowerCase().includes('privacy')
    );
    
    const hasSecureConnection = websiteData.url?.startsWith('https://');
    
    const hasDataProtection = websiteData.content?.totalText?.includes('data protection') ||
                             websiteData.content?.totalText?.includes('HIPAA') ||
                             websiteData.content?.totalText?.includes('patient privacy');

    return !!(hasPrivacyPolicy && hasSecureConnection && hasDataProtection);
  }

  private static checkTexasHealthcareMarketing(websiteData: any): boolean {
    // Check Texas-specific healthcare marketing compliance
    const hasTexasCompliance = websiteData.content?.totalText?.includes('Texas') ||
                              websiteData.content?.totalText?.includes('state regulations') ||
                              websiteData.content?.totalText?.includes('healthcare marketing');

    const hasProperDisclaimers = websiteData.content?.totalText?.includes('disclaimer') ||
                                websiteData.content?.totalText?.includes('not medical advice');

    return !!(hasTexasCompliance && hasProperDisclaimers);
  }

  private static checkDataPrivacy(websiteData: any): boolean {
    // Check for data privacy compliance
    const hasPrivacyPolicy = websiteData.metaTags?.some((tag: any) => 
      tag.name === 'privacy-policy' || tag.content?.toLowerCase().includes('privacy')
    );
    
    const hasCookiePolicy = websiteData.content?.totalText?.includes('cookie policy') ||
                           websiteData.content?.totalText?.includes('cookies');

    const hasDataProcessing = websiteData.content?.totalText?.includes('data processing') ||
                             websiteData.content?.totalText?.includes('personal data');

    return !!(hasPrivacyPolicy && hasCookiePolicy && hasDataProcessing);
  }

  private static checkAccessibility(websiteData: any): boolean {
    // Check for accessibility compliance
    const hasAltText = websiteData.images?.some((img: any) => img.alt);
    const hasProperHeadings = websiteData.headings?.h1?.length > 0;
    const hasAccessibilityMeta = websiteData.metaTags?.some((tag: any) => 
      tag.name === 'accessibility' || tag.content?.toLowerCase().includes('accessible')
    );

    return !!(hasAltText && hasProperHeadings && hasAccessibilityMeta);
  }

  private static checkHealthcareMarketing(websiteData: any): boolean {
    // Check healthcare marketing compliance
    const hasMedicalDisclaimers = websiteData.content?.totalText?.includes('medical advice') ||
                                 websiteData.content?.totalText?.includes('consult your doctor');

    const hasFDACompliance = websiteData.content?.totalText?.includes('FDA') ||
                            websiteData.content?.totalText?.includes('approved');

    const hasProfessionalLicensing = websiteData.content?.totalText?.includes('licensed') ||
                                    websiteData.content?.totalText?.includes('certified');

    return !!(hasMedicalDisclaimers && hasFDACompliance && hasProfessionalLicensing);
  }

  static async captureLead(leadData: LeadData): Promise<boolean> {
    try {
      // Save lead to database
      const pool = require('../config/database').default;
      
      const result = await pool.query(
        `INSERT INTO leads (
          clinic_name, contact_email, contact_phone, website_url, 
          industry_category, lead_source, notes, compliance_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING id`,
        [
          leadData.name,
          leadData.email,
          leadData.phone,
          leadData.website,
          leadData.industry,
          leadData.source,
          leadData.notes,
          leadData.complianceStatus || 'pending'
        ]
      );

      console.log('Lead captured successfully:', result.rows[0].id);
      return true;
    } catch (error) {
      console.error('Lead capture error:', error);
      return false;
    }
  }

  static async sendComplianceReport(email: string, complianceCheck: ComplianceCheck, websiteUrl: string): Promise<boolean> {
    try {
      const { EmailService } = require('./emailService');
      const emailService = new EmailService();

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2E86AB;">Texas Compliance Report</h2>
          <p>Compliance analysis for <strong>${websiteUrl}</strong></p>
          
          <div style="background: ${complianceCheck.score >= 80 ? '#d4edda' : complianceCheck.score >= 60 ? '#fff3cd' : '#f8d7da'}; 
                      padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${complianceCheck.score >= 80 ? '#28a745' : complianceCheck.score >= 60 ? '#ffc107' : '#dc3545'};">
            <h3 style="margin: 0 0 10px 0;">Compliance Score: ${complianceCheck.score}/100</h3>
            <p style="margin: 0;">${complianceCheck.score >= 80 ? 'Compliant' : complianceCheck.score >= 60 ? 'Needs Improvement' : 'Non-Compliant'}</p>
          </div>

          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Compliance Status:</h3>
            <ul>
              <li>HIPAA: ${complianceCheck.hipaa ? '✅ Compliant' : '❌ Non-Compliant'}</li>
              <li>Texas State: ${complianceCheck.texasState ? '✅ Compliant' : '❌ Non-Compliant'}</li>
              <li>Healthcare Marketing: ${complianceCheck.healthcareMarketing ? '✅ Compliant' : '❌ Non-Compliant'}</li>
              <li>Data Privacy: ${complianceCheck.dataPrivacy ? '✅ Compliant' : '❌ Non-Compliant'}</li>
              <li>Accessibility: ${complianceCheck.accessibility ? '✅ Compliant' : '❌ Non-Compliant'}</li>
            </ul>
          </div>

          ${complianceCheck.issues.length > 0 ? `
            <div style="background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Issues Found:</h3>
              <ul>
                ${complianceCheck.issues.map(issue => `<li>${issue}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${complianceCheck.recommendations.length > 0 ? `
            <div style="background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3>Recommendations:</h3>
              <ul>
                ${complianceCheck.recommendations.map(rec => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <p>This report was generated by WeTechForU Compliance Checker.</p>
          <p>Best regards,<br>The WeTechForU Team</p>
        </div>
      `;

      return await emailService.sendEmail({
        to: email,
        subject: `Texas Compliance Report for ${websiteUrl}`,
        html
      });
    } catch (error) {
      console.error('Send compliance report error:', error);
      return false;
    }
  }
}
