import Stripe from 'stripe';
import pool from '../config/database';

// Initialize Stripe (will be loaded from encrypted_credentials)
let stripeInstance: Stripe | null = null;

interface SignUpData {
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Business Information
  businessName: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessWebsite: string;
  
  // Business Details
  servicesOffered: string;
  businessHours: string;
  targetAudience: string;
  competitorWebsites: string;
  
  // Access & Credentials
  hasWebsiteAccess: boolean;
  hasFacebookPage: boolean;
  hasInstagram: boolean;
  hasGoogleBusiness: boolean;
  hasGoogleAds: boolean;
  
  // Budget Information
  adSpendBudgetGoogle: number;
  adSpendBudgetFacebook: number;
  
  // Preferences
  contentApprovalRequired: boolean;
  blogTopicPreferences: string;
  
  // Agreement
  agreeToTerms: boolean;
  agreeToServiceAgreement: boolean;
  
  // Selected Plan
  planId: string;
  planName: string;
  planPrice: number;
  setupFee: number;
}

export class SubscriptionService {
  private async getStripeKey(): Promise<string> {
    try {
      const result = await pool.query(
        `SELECT decrypt_credential('stripe_secret_key') AS key`
      );
      
      if (result.rows.length === 0 || !result.rows[0].key) {
        // Fallback to environment variable
        if (process.env.STRIPE_SECRET_KEY) {
          return process.env.STRIPE_SECRET_KEY;
        }
        throw new Error('Stripe key not found in database or environment');
      }
      
      return result.rows[0].key;
    } catch (error) {
      console.warn('Failed to get Stripe key from database, using env:', error);
      if (process.env.STRIPE_SECRET_KEY) {
        return process.env.STRIPE_SECRET_KEY;
      }
      throw new Error('Stripe key not configured');
    }
  }

  private async initializeStripe(): Promise<Stripe> {
    if (stripeInstance) {
      return stripeInstance;
    }

    const apiKey = await this.getStripeKey();
    stripeInstance = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
    });

    return stripeInstance;
  }

  async handleSignUp(signUpData: SignUpData, clientIp: string): Promise<{ checkoutUrl: string; customerId: string }> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. Create client record
      const clientResult = await client.query(
        `INSERT INTO clients (
          client_name, email, phone, website, address, city, state, zip_code, 
          contact_name, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          signUpData.businessName, 
          signUpData.email, 
          signUpData.businessPhone,
          signUpData.businessWebsite || '',
          signUpData.businessAddress || '',
          signUpData.businessCity || '',
          signUpData.businessState || '',
          signUpData.businessZip || '',
          `${signUpData.firstName} ${signUpData.lastName}`,
          true
        ]
      );
      const clientId = clientResult.rows[0].id;

      // 2. Create user account (for login)
      const bcrypt = require('bcryptjs');
      const tempPassword = Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      await client.query(
        `INSERT INTO users (
          username, email, password_hash, role, client_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [signUpData.email, signUpData.email, hashedPassword, 'admin', clientId]
      );

      // 3. Create onboarding record
      const onboardingResult = await client.query(
        `INSERT INTO customer_onboarding (
          client_id,
          primary_contact_name,
          primary_contact_email,
          primary_contact_phone,
          business_name,
          business_address,
          business_phone,
          services_offered,
          business_hours,
          target_audience,
          competitor_websites,
          website_access_provided,
          facebook_page_access_provided,
          facebook_ad_account_access_provided,
          instagram_access_provided,
          google_business_access_provided,
          google_ads_access_provided,
          ad_spend_budget_google,
          ad_spend_budget_facebook,
          content_approval_required,
          blog_topic_preferences,
          onboarding_status,
          onboarding_started_at,
          created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id`,
        [
          clientId,
          `${signUpData.firstName} ${signUpData.lastName}`,
          signUpData.email,
          signUpData.phone,
          signUpData.businessName,
          `${signUpData.businessAddress}, ${signUpData.businessCity}, ${signUpData.businessState} ${signUpData.businessZip}`,
          signUpData.businessPhone,
          signUpData.servicesOffered,
          signUpData.businessHours,
          signUpData.targetAudience,
          signUpData.competitorWebsites,
          signUpData.hasWebsiteAccess,
          signUpData.hasFacebookPage,
          signUpData.hasFacebookPage, // Ad account access
          signUpData.hasInstagram,
          signUpData.hasGoogleBusiness,
          signUpData.hasGoogleAds,
          signUpData.adSpendBudgetGoogle,
          signUpData.adSpendBudgetFacebook,
          signUpData.contentApprovalRequired,
          signUpData.blogTopicPreferences,
          'pending',
        ]
      );
      const onboardingId = onboardingResult.rows[0].id;

      // 4. Store signed agreement
      await client.query(
        `INSERT INTO customer_agreements (
          client_id,
          agreement_type,
          agreement_version,
          agreement_content,
          signed_by_name,
          signed_by_email,
          signed_by_ip,
          signed_at,
          status,
          effective_date,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, $8, CURRENT_DATE, CURRENT_TIMESTAMP)`,
        [
          clientId,
          'service_agreement',
          '1.0',
          'Service Agreement for Healthcare Marketing Services', // TODO: Store full agreement text
          `${signUpData.firstName} ${signUpData.lastName}`,
          signUpData.email,
          clientIp,
          'active',
        ]
      );

      // 5. Create Stripe customer and checkout session
      const stripe = await this.initializeStripe();
      
      const customer = await stripe.customers.create({
        email: signUpData.email,
        name: signUpData.businessName,
        phone: signUpData.businessPhone,
        metadata: {
          client_id: clientId.toString(),
          onboarding_id: onboardingId.toString(),
          business_name: signUpData.businessName,
        },
      });

      // Get plan details from database
      const planResult = await client.query(
        `SELECT * FROM subscription_plans WHERE id = $1`,
        [signUpData.planId]
      );

      if (planResult.rows.length === 0) {
        throw new Error('Plan not found');
      }

      const plan = planResult.rows[0];

      // Create checkout session with both setup fee and subscription
      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card', 'us_bank_account'], // Credit Card and ACH
        mode: 'subscription',
        line_items: [
          // Monthly subscription (if we have a Stripe price ID)
          ...(plan.stripe_price_id ? [{
            price: plan.stripe_price_id,
            quantity: 1,
          }] : [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: signUpData.planName,
                description: plan.description,
              },
              unit_amount: Math.round(signUpData.planPrice * 100), // Convert to cents
              recurring: {
                interval: 'month' as const,
              },
            },
            quantity: 1,
          }]),
        ],
        subscription_data: {
          metadata: {
            setup_fee: signUpData.setupFee.toString(),
            setup_fee_paid: 'false',
          },
        },
        success_url: `https://www.marketingby.wetechforu.com/signup-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `https://www.marketingby.wetechforu.com/#pricing`,
        metadata: {
          client_id: clientId.toString(),
          onboarding_id: onboardingId.toString(),
          plan_id: signUpData.planId,
          setup_fee: signUpData.setupFee.toString(),
        },
      });

      // 6. Create subscription record (pending payment)
      await client.query(
        `INSERT INTO client_subscriptions (
          client_id,
          plan_id,
          stripe_customer_id,
          stripe_subscription_id,
          setup_fee_paid,
          setup_fee_amount,
          monthly_fee,
          status,
          start_date,
          billing_cycle_start,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE, CURRENT_DATE, CURRENT_TIMESTAMP)`,
        [
          clientId,
          signUpData.planId,
          customer.id,
          null, // Will be updated by webhook
          false,
          signUpData.setupFee,
          signUpData.planPrice,
          'pending',
        ]
      );

      // 7. Create setup tasks from template
      await this.createSetupTasks(client, onboardingId);

      await client.query('COMMIT');

      return {
        checkoutUrl: checkoutSession.url || '',
        customerId: customer.id,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Sign-up error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  private async createSetupTasks(client: any, onboardingId: number): Promise<void> {
    const templateTasks = await client.query(
      `SELECT * FROM setup_tasks_template WHERE required_for_plan IN ('all', 'basic') ORDER BY task_order`
    );

    for (const task of templateTasks.rows) {
      await client.query(
        `INSERT INTO setup_tasks (
          onboarding_id,
          task_name,
          task_category,
          task_description,
          task_order,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
        [
          onboardingId,
          task.task_name,
          task.task_category,
          task.task_description,
          task.task_order,
          'pending',
        ]
      );
    }
  }

  async handleStripeWebhook(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSuccess(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutComplete(session: Stripe.Checkout.Session): Promise<void> {
    const clientId = session.metadata?.client_id;
    
    if (!clientId) {
      console.error('No client_id in session metadata');
      return;
    }

    // Update subscription with Stripe subscription ID
    await pool.query(
      `UPDATE client_subscriptions 
       SET stripe_subscription_id = $1, 
           setup_fee_paid = true,
           status = 'active',
           updated_at = CURRENT_TIMESTAMP
       WHERE client_id = $2 AND status = 'pending'`,
      [session.subscription, clientId]
    );

    // Record payment
    await pool.query(
      `INSERT INTO payment_history (
        client_id,
        stripe_payment_intent_id,
        payment_type,
        amount,
        status,
        payment_date,
        description
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)`,
      [
        clientId,
        session.payment_intent,
        'setup_fee',
        parseFloat(session.metadata?.setup_fee || '150'),
        'succeeded',
        'One-time setup fee payment',
      ]
    );

    console.log(`✅ Checkout completed for client ${clientId}`);
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    await pool.query(
      `UPDATE client_subscriptions 
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = $2`,
      [subscription.status, subscription.id]
    );
  }

  private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
    await pool.query(
      `UPDATE client_subscriptions 
       SET status = 'cancelled',
           cancellation_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE stripe_subscription_id = $1`,
      [subscription.id]
    );
  }

  private async handlePaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription;
    if (!invoice.customer || !subscriptionId) return;

    const subscriptionResult = await pool.query(
      `SELECT client_id, id FROM client_subscriptions WHERE stripe_subscription_id = $1`,
      [typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id]
    );

    if (subscriptionResult.rows.length === 0) return;

    const { client_id, id: subscription_id } = subscriptionResult.rows[0];

    await pool.query(
      `INSERT INTO payment_history (
        client_id,
        subscription_id,
        stripe_invoice_id,
        payment_type,
        amount,
        status,
        payment_date,
        description,
        receipt_url
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)`,
      [
        client_id,
        subscription_id,
        invoice.id,
        'monthly_subscription',
        (invoice.amount_paid / 100).toFixed(2),
        'succeeded',
        'Monthly subscription payment',
        invoice.hosted_invoice_url,
      ]
    );
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = (invoice as any).subscription;
    if (!invoice.customer || !subscriptionId) return;

    const subscriptionResult = await pool.query(
      `SELECT client_id, id FROM client_subscriptions WHERE stripe_subscription_id = $1`,
      [typeof subscriptionId === 'string' ? subscriptionId : subscriptionId.id]
    );

    if (subscriptionResult.rows.length === 0) return;

    const { client_id, id: subscription_id } = subscriptionResult.rows[0];

    await pool.query(
      `INSERT INTO payment_history (
        client_id,
        subscription_id,
        stripe_invoice_id,
        payment_type,
        amount,
        status,
        payment_date,
        description
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7)`,
      [
        client_id,
        subscription_id,
        invoice.id,
        'monthly_subscription',
        (invoice.amount_due / 100).toFixed(2),
        'failed',
        'Monthly subscription payment failed',
      ]
    );

    // TODO: Send notification email to customer
  }
}

export default new SubscriptionService();

