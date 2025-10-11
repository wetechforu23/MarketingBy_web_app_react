import { pool } from './databaseService';
import * as crypto from 'crypto';

export interface EncryptedCredential {
  id: number;
  service_name: string;
  environment: string;
  credential_type: string;
  encrypted_value: string;
  encryption_key_id: string;
  created_at: Date;
  updated_at: Date;
  expires_at?: Date;
  is_active: boolean;
}

export interface CredentialAccessLog {
  id: number;
  credential_id: number;
  user_id?: number;
  access_type: string;
  ip_address: string;
  user_agent: string;
  accessed_at: Date;
  success: boolean;
  error_message?: string;
}

export interface CreateCredentialData {
  service_name: string;
  environment: string;
  credential_type: string;
  credential_value: string;
  expires_at?: Date;
}

export class CredentialManagementService {
  private static instance: CredentialManagementService;
  private encryptionKey: string;
  private algorithm = 'aes-256-gcm';

  public static getInstance(): CredentialManagementService {
    if (!CredentialManagementService.instance) {
      CredentialManagementService.instance = new CredentialManagementService();
    }
    return CredentialManagementService.instance;
  }

  constructor() {
    // In production, this should come from a secure key management system
    this.encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
  }

  /**
   * Encrypt a credential value
   */
  private encrypt(plaintext: string): { encrypted: string; iv: string; tag: string } {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const cipher = crypto.createCipherGCM('aes-256-gcm', key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  /**
   * Decrypt a credential value
   */
  private decrypt(encrypted: string, iv: string, tag: string): string {
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const decipher = crypto.createDecipherGCM('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Create a new encrypted credential
   */
  async createCredential(data: CreateCredentialData): Promise<EncryptedCredential> {
    try {
      const { encrypted, iv, tag } = this.encrypt(data.credential_value);
      const encryptedValue = JSON.stringify({ encrypted, iv, tag });
      const encryptionKeyId = crypto.createHash('sha256').update(this.encryptionKey).digest('hex').substring(0, 16);

      const query = `
        INSERT INTO encrypted_credentials (
          service_name, environment, credential_type, encrypted_value, 
          encryption_key_id, expires_at, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `;

      const result = await pool.query(query, [
        data.service_name,
        data.environment,
        data.credential_type,
        encryptedValue,
        encryptionKeyId,
        data.expires_at,
        true
      ]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating encrypted credential:', error);
      throw error;
    }
  }

  /**
   * Get and decrypt a credential
   */
  async getCredential(serviceName: string, environment: string, credentialType: string): Promise<string | null> {
    try {
      const query = `
        SELECT * FROM encrypted_credentials 
        WHERE service_name = $1 AND environment = $2 AND credential_type = $3 AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [serviceName, environment, credentialType]);

      if (result.rows.length === 0) {
        return null;
      }

      const credential = result.rows[0];
      const { encrypted, iv, tag } = JSON.parse(credential.encrypted_value);
      
      return this.decrypt(encrypted, iv, tag);
    } catch (error) {
      console.error('Error retrieving credential:', error);
      throw error;
    }
  }

  /**
   * Get credential with access logging
   */
  async getCredentialWithLogging(
    serviceName: string, 
    environment: string, 
    credentialType: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<string | null> {
    try {
      const credential = await this.getCredential(serviceName, environment, credentialType);
      
      // Log the access
      await this.logCredentialAccess(
        serviceName,
        environment,
        credentialType,
        'read',
        userId,
        ipAddress,
        userAgent,
        credential !== null
      );

      return credential;
    } catch (error) {
      // Log failed access
      await this.logCredentialAccess(
        serviceName,
        environment,
        credentialType,
        'read',
        userId,
        ipAddress,
        userAgent,
        false,
        error.message
      );
      throw error;
    }
  }

  /**
   * Update a credential
   */
  async updateCredential(
    id: number, 
    credentialValue: string, 
    expiresAt?: Date
  ): Promise<EncryptedCredential> {
    try {
      const { encrypted, iv, tag } = this.encrypt(credentialValue);
      const encryptedValue = JSON.stringify({ encrypted, iv, tag });

      const query = `
        UPDATE encrypted_credentials 
        SET encrypted_value = $2, expires_at = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [id, encryptedValue, expiresAt]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating credential:', error);
      throw error;
    }
  }

  /**
   * Deactivate a credential
   */
  async deactivateCredential(id: number): Promise<void> {
    try {
      const query = `
        UPDATE encrypted_credentials 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `;

      await pool.query(query, [id]);
    } catch (error) {
      console.error('Error deactivating credential:', error);
      throw error;
    }
  }

  /**
   * List all credentials (without decrypted values)
   */
  async listCredentials(environment?: string): Promise<EncryptedCredential[]> {
    try {
      let query = `
        SELECT id, service_name, environment, credential_type, encryption_key_id,
               created_at, updated_at, expires_at, is_active
        FROM encrypted_credentials
      `;
      const params: any[] = [];

      if (environment) {
        query += ' WHERE environment = $1';
        params.push(environment);
      }

      query += ' ORDER BY service_name, environment, credential_type';

      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error listing credentials:', error);
      throw error;
    }
  }

  /**
   * Log credential access
   */
  async logCredentialAccess(
    serviceName: string,
    environment: string,
    credentialType: string,
    accessType: string,
    userId?: number,
    ipAddress?: string,
    userAgent?: string,
    success: boolean = true,
    errorMessage?: string
  ): Promise<void> {
    try {
      // First get the credential ID
      const credentialQuery = `
        SELECT id FROM encrypted_credentials 
        WHERE service_name = $1 AND environment = $2 AND credential_type = $3
        ORDER BY created_at DESC
        LIMIT 1
      `;

      const credentialResult = await pool.query(credentialQuery, [serviceName, environment, credentialType]);
      
      if (credentialResult.rows.length === 0) {
        return;
      }

      const credentialId = credentialResult.rows[0].id;

      const logQuery = `
        INSERT INTO credential_access_logs (
          credential_id, user_id, access_type, ip_address, user_agent,
          accessed_at, success, error_message
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6, $7)
      `;

      await pool.query(logQuery, [
        credentialId,
        userId,
        accessType,
        ipAddress || 'unknown',
        userAgent || 'unknown',
        success,
        errorMessage
      ]);
    } catch (error) {
      console.error('Error logging credential access:', error);
      // Don't throw here as this is just logging
    }
  }

  /**
   * Get access logs for a credential
   */
  async getAccessLogs(credentialId: number, limit: number = 100): Promise<CredentialAccessLog[]> {
    try {
      const query = `
        SELECT * FROM credential_access_logs 
        WHERE credential_id = $1
        ORDER BY accessed_at DESC
        LIMIT $2
      `;

      const result = await pool.query(query, [credentialId, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting access logs:', error);
      throw error;
    }
  }

  /**
   * Test a credential by attempting to use it
   */
  async testCredential(
    serviceName: string,
    environment: string,
    credentialType: string,
    testFunction: (credential: string) => Promise<boolean>
  ): Promise<{ success: boolean; message: string }> {
    try {
      const credential = await this.getCredential(serviceName, environment, credentialType);
      
      if (!credential) {
        return { success: false, message: 'Credential not found' };
      }

      const testResult = await testFunction(credential);
      
      // Log the test
      await this.logCredentialAccess(
        serviceName,
        environment,
        credentialType,
        'test',
        undefined,
        'system',
        'credential-test',
        testResult
      );

      return {
        success: testResult,
        message: testResult ? 'Credential test successful' : 'Credential test failed'
      };
    } catch (error) {
      await this.logCredentialAccess(
        serviceName,
        environment,
        credentialType,
        'test',
        undefined,
        'system',
        'credential-test',
        false,
        error.message
      );

      return {
        success: false,
        message: `Credential test failed: ${error.message}`
      };
    }
  }

  /**
   * Get available services
   */
  getAvailableServices(): string[] {
    return [
      'google_maps',
      'google_search_console',
      'google_analytics',
      'google_calendar',
      'microsoft_graph',
      'azure_email',
      'yelp',
      'moz',
      'seranking',
      'facebook',
      'instagram',
      'twitter',
      'linkedin'
    ];
  }

  /**
   * Get available environments
   */
  getAvailableEnvironments(): string[] {
    return ['development', 'staging', 'production'];
  }

  /**
   * Get available credential types
   */
  getAvailableCredentialTypes(): string[] {
    return [
      'api_key',
      'access_token',
      'refresh_token',
      'client_id',
      'client_secret',
      'connection_string',
      'username',
      'password'
    ];
  }
}
