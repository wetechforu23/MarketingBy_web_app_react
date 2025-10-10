import pool from '../config/database';
import * as crypto from 'crypto';
import axios from 'axios';

interface AzureEmailConfig {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  fromEmail: string;
}

export class MicrosoftGraphEmailService {
  private static instance: MicrosoftGraphEmailService;
  private config: AzureEmailConfig | null = null;
  private accessToken: string = '';
  private tokenExpiry: number = 0;

  private constructor() {
    this.initializeConfig();
  }

  public static getInstance(): MicrosoftGraphEmailService {
    if (!MicrosoftGraphEmailService.instance) {
      MicrosoftGraphEmailService.instance = new MicrosoftGraphEmailService();
    }
    return MicrosoftGraphEmailService.instance;
  }

  private async initializeConfig() {
    try {
      const result = await pool.query(`
        SELECT service, key_name, encrypted_value 
        FROM encrypted_credentials 
        WHERE service = 'azure' OR service = 'azure_communication'
        AND key_name IN ('client_id', 'client_secret', 'tenant_id', 'email_from_address')
      `);

      const credentials: any = {};
      
      for (const row of result.rows) {
        const decrypted = this.decrypt(row.encrypted_value);
        
        if (row.key_name === 'client_id') {
          credentials.clientId = decrypted;
        } else if (row.key_name === 'client_secret') {
          credentials.clientSecret = decrypted;
        } else if (row.key_name === 'tenant_id') {
          credentials.tenantId = decrypted;
        } else if (row.key_name === 'email_from_address') {
          credentials.fromEmail = decrypted;
        }
      }

      // Fallback to info@wetechforu.com if not set
      if (!credentials.fromEmail) {
        credentials.fromEmail = 'info@wetechforu.com';
      }

      this.config = credentials;
      console.log('✅ Microsoft Graph Email Service initialized:', credentials.fromEmail);
    } catch (error) {
      console.error('Error initializing Microsoft Graph config:', error);
    }
  }

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
      return '';
    }
  }

  private async getAccessToken(): Promise<string> {
    // Check if token is still valid (with 5 minute buffer)
    if (this.accessToken && Date.now() < (this.tokenExpiry - 300000)) {
      return this.accessToken;
    }

    try {
      if (!this.config?.clientId || !this.config?.clientSecret || !this.config?.tenantId) {
        throw new Error('Azure credentials not configured');
      }

      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      
      const params = new URLSearchParams();
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', 'https://graph.microsoft.com/.default');
      params.append('grant_type', 'client_credentials');

      const response = await axios.post(tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000);
      
      console.log('✅ Microsoft Graph access token obtained');
      return this.accessToken;
    } catch (error: any) {
      console.error('Error getting Microsoft Graph access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Microsoft Graph');
    }
  }

  /**
   * Send email via Microsoft Graph API
   */
  async sendEmail(
    toEmail: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      if (!this.config?.fromEmail) {
        throw new Error('From email not configured');
      }

      const message = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: htmlContent
          },
          toRecipients: [
            {
              emailAddress: {
                address: toEmail
              }
            }
          ],
          from: {
            emailAddress: {
              address: this.config.fromEmail
            }
          }
        },
        saveToSentItems: true
      };

      // Send email using Microsoft Graph API
      // Using /users/{userId}/sendMail endpoint
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${this.config.fromEmail}/sendMail`;

      await axios.post(graphUrl, message, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Email sent via Microsoft Graph to ${toEmail}`);
      return true;
    } catch (error: any) {
      console.error('Error sending email via Microsoft Graph:', error.response?.data || error.message);
      
      // If the error is about permissions, log helpful information
      if (error.response?.status === 403) {
        console.error('❌ Permission error: Make sure the Azure app has Mail.Send permission');
      }
      
      throw error;
    }
  }

  /**
   * Get available calendar slots (for booking link)
   */
  async getAvailableCalendarSlots(
    email: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    try {
      const token = await this.getAccessToken();

      // Get calendar events
      const graphUrl = `https://graph.microsoft.com/v1.0/users/${email}/calendar/events`;
      
      const params = {
        $filter: `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`,
        $select: 'subject,start,end,showAs',
        $orderby: 'start/dateTime'
      };

      const response = await axios.get(graphUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params
      });

      console.log(`✅ Retrieved ${response.data.value.length} calendar events`);
      return response.data.value;
    } catch (error: any) {
      console.error('Error getting calendar slots:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Create calendar booking
   */
  async createCalendarBooking(
    email: string,
    subject: string,
    startTime: Date,
    endTime: Date,
    attendees: string[],
    body?: string
  ): Promise<any> {
    try {
      const token = await this.getAccessToken();

      const event = {
        subject: subject,
        body: {
          contentType: 'HTML',
          content: body || 'Meeting scheduled via MarketingBy WeTechForU'
        },
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'UTC'
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC'
        },
        attendees: attendees.map(email => ({
          emailAddress: {
            address: email
          },
          type: 'required'
        })),
        isOnlineMeeting: true,
        onlineMeetingProvider: 'teamsForBusiness'
      };

      const graphUrl = `https://graph.microsoft.com/v1.0/users/${email}/calendar/events`;

      const response = await axios.post(graphUrl, event, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`✅ Calendar booking created:`, response.data.webLink);
      return response.data;
    } catch (error: any) {
      console.error('Error creating calendar booking:', error.response?.data || error.message);
      throw error;
    }
  }
}

export default MicrosoftGraphEmailService;

