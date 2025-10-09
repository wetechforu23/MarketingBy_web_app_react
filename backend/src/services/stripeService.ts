import pool from '../config/database';
import crypto from 'crypto';
import Stripe from 'stripe';

/**
 * StripeService - Handles Stripe API integration with credentials from database
 */
export class StripeService {
  private stripe: Stripe | null = null;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-cbc';

  /**
   * Get encryption key from environment or database
   */
  private getEncryptionKey(): string {
    // For now, use environment variable. In production, this should be from a secure key management service
    const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-chars!!';
    return crypto.createHash('sha256').update(key).digest('base64').substring(0, 32);
  }

  /**
   * Decrypt credential value
   */
  private decrypt(encryptedValue: string): string {
    try {
      const parts = encryptedValue.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted value format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encryptedText = Buffer.from(parts[1], 'hex');
      const key = this.getEncryptionKey();

      const decipher = crypto.createDecipheriv(this.ENCRYPTION_ALGORITHM, Buffer.from(key), iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString();
    } catch (error) {
      console.error('Error decrypting credential:', error);
      throw new Error('Failed to decrypt credential');
    }
  }

  /**
   * Get Stripe API key from database or environment
   */
  private async getStripeApiKey(): Promise<string> {
    try {
      // Use environment variable directly (database credentials table not yet created)
      if (process.env.STRIPE_SECRET_KEY) {
        console.log('✅ Using Stripe API key from environment variable');
        return process.env.STRIPE_SECRET_KEY;
      }

      // Future: Try to get from database when encrypted_credentials table is created
      try {
        const result = await pool.query(
          `SELECT encrypted_value 
           FROM encrypted_credentials 
           WHERE service_name = $1 
           AND credential_type = $2 
           AND environment = $3 
           AND is_active = true
           ORDER BY created_at DESC
           LIMIT 1`,
          ['stripe', 'secret_key', process.env.NODE_ENV || 'production']
        );

        if (result.rows.length > 0) {
          console.log('✅ Found Stripe API key in database (overriding environment)');
          return this.decrypt(result.rows[0].encrypted_value);
        }
      } catch (dbError) {
        // Table doesn't exist yet, that's okay
        console.log('ℹ️  encrypted_credentials table not found, using environment variable');
      }

      throw new Error('Stripe API key not found in environment');
    } catch (error) {
      console.error('❌ Error getting Stripe API key:', error);
      throw error;
    }
  }

  /**
   * Initialize Stripe client with API key from database
   */
  private async initializeStripe(): Promise<Stripe> {
    if (this.stripe) {
      return this.stripe;
    }

    try {
      const apiKey = await this.getStripeApiKey();
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2025-09-30.clover' as any,
        typescript: true,
      });
      console.log('✅ Stripe client initialized');
      return this.stripe;
    } catch (error) {
      console.error('Error initializing Stripe:', error);
      throw new Error('Failed to initialize Stripe client');
    }
  }

  /**
   * Get all active pricing plans from Stripe
   */
  async getPricingPlans() {
    try {
      const stripe = await this.initializeStripe();

      // Fetch all active products with their prices
      const products = await stripe.products.list({
        active: true,
        limit: 100,
        expand: ['data.default_price'],
      });

      // Fetch all active prices
      const prices = await stripe.prices.list({
        active: true,
        limit: 100,
        expand: ['data.product'],
      });

      // Group prices by product
      const pricesByProduct = prices.data.reduce((acc, price) => {
        const productId = typeof price.product === 'string' ? price.product : price.product.id;
        if (!acc[productId]) {
          acc[productId] = [];
        }
        acc[productId].push(price);
        return acc;
      }, {} as Record<string, Stripe.Price[]>);

      // Transform to our format
      const plans = products.data.map((product) => {
        const productPrices = pricesByProduct[product.id] || [];
        
        // Get the default price or the first price
        const defaultPrice = productPrices.find((p) => p.id === product.default_price) || productPrices[0];

        return {
          id: product.id,
          name: product.name,
          description: product.description || '',
          price: defaultPrice ? (defaultPrice.unit_amount || 0) / 100 : 0,
          currency: defaultPrice?.currency || 'usd',
          interval: defaultPrice?.recurring?.interval || 'month',
          features: product.metadata?.features ? JSON.parse(product.metadata.features) : [],
          popular: product.metadata?.popular === 'true',
          priceId: defaultPrice?.id || '',
          metadata: product.metadata,
        };
      });

      // Sort by price (ascending)
      plans.sort((a, b) => a.price - b.price);

      console.log(`✅ Fetched ${plans.length} pricing plans from Stripe`);
      return plans;
    } catch (error) {
      console.error('Error fetching pricing plans from Stripe:', error);
      
      // Return fallback plans if Stripe fails
      console.log('⚠️ Returning fallback pricing plans');
      return this.getFallbackPlans();
    }
  }

  /**
   * Fallback pricing plans if Stripe is not available
   */
  private getFallbackPlans() {
    return [
      {
        id: 'fallback_starter',
        name: 'Starter',
        description: 'Perfect for small practices just getting started',
        price: 499,
        currency: 'usd',
        interval: 'month',
        priceId: '',
        popular: false,
        features: [
          'Basic SEO Optimization',
          'Social Media Management (2 platforms)',
          'Monthly Performance Reports',
          'Email Support',
          '1 Team Member',
        ],
        metadata: {},
      },
      {
        id: 'fallback_professional',
        name: 'Professional',
        description: 'For growing practices ready to scale',
        price: 999,
        currency: 'usd',
        interval: 'month',
        priceId: '',
        popular: true,
        features: [
          'Advanced SEO & Content Marketing',
          'Social Media Management (All platforms)',
          'Lead Generation & Nurturing',
          'Weekly Reports & Insights',
          'Priority Support',
          '5 Team Members',
          'Custom Campaigns',
        ],
        metadata: {},
      },
      {
        id: 'fallback_enterprise',
        name: 'Enterprise',
        description: 'For large healthcare organizations',
        price: 0,
        currency: 'usd',
        interval: 'month',
        priceId: '',
        popular: false,
        features: [
          'Everything in Professional',
          'Dedicated Account Manager',
          'Custom AI Model Training',
          'White-label Options',
          'Unlimited Team Members',
          'API Access',
          'Custom Integrations',
        ],
        metadata: { custom_pricing: 'true' },
      },
    ];
  }

  /**
   * Create a checkout session for a pricing plan
   */
  async createCheckoutSession(priceId: string, customerEmail: string, successUrl: string, cancelUrl: string) {
    try {
      const stripe = await this.initializeStripe();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: customerEmail,
      });

      return session;
    } catch (error) {
      console.error('Error creating Stripe checkout session:', error);
      throw new Error('Failed to create checkout session');
    }
  }
}

export const stripeService = new StripeService();

