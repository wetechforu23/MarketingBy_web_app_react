/**
 * Stripe Products Setup Script
 * Creates 3 healthcare marketing products in Stripe
 * Run this with: node setup-stripe-products.js
 */

const Stripe = require('stripe');
const { Pool } = require('pg');

// Initialize Stripe (you need to provide your API key)
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_YOUR_KEY_HERE';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

const products = [
  {
    name: 'Basic Healthcare Marketing',
    description: 'Essential marketing services for small healthcare practices',
    monthlyPrice: 39900, // $399.00 in cents
    setupPrice: 15000,   // $150.00 in cents
    metadata: {
      category: 'healthcare_marketing',
      setup_fee: '150',
      setup_fee_original: '300',
      setup_fee_discount: '50',
      popular: 'false',
    },
    features: [
      'Social Media Management (Organic)',
      '6–8 posts/month + 1 AI video',
      '8–10 stories/month',
      'Facebook & Instagram Ads',
      'Google Ads Management',
      'Basic SEO & Content Marketing',
      '2 blog posts per month',
      'Monthly Performance Reports',
    ],
  },
  {
    name: 'Professional Healthcare Marketing',
    description: 'Comprehensive marketing for growing practices',
    monthlyPrice: 79900, // $799.00 in cents
    setupPrice: 15000,   // $150.00 in cents
    metadata: {
      category: 'healthcare_marketing',
      setup_fee: '150',
      setup_fee_original: '300',
      setup_fee_discount: '50',
      popular: 'true',
    },
    features: [
      'All Basic Features',
      '12–15 posts/month + 2 AI videos',
      '15–20 stories/month',
      'Advanced SEO optimization',
      '4 blog posts per month',
      'Video content (2 per month)',
      'Weekly performance reports',
      'Dedicated account manager',
    ],
  },
  {
    name: 'Enterprise Healthcare Marketing',
    description: 'Full-service marketing for multi-location practices',
    monthlyPrice: 149900, // $1,499.00 in cents
    setupPrice: 15000,    // $150.00 in cents
    metadata: {
      category: 'healthcare_marketing',
      setup_fee: '150',
      setup_fee_original: '300',
      setup_fee_discount: '50',
      popular: 'false',
    },
    features: [
      'All Professional Features',
      'Unlimited social media posts',
      'Custom video production',
      'White-label reports',
      'Multi-location support',
      '24/7 priority support',
      'Custom landing pages',
      'Dedicated marketing team',
    ],
  },
];

async function createStripeProduct(productData) {
  console.log(`\n🔹 Creating product: ${productData.name}`);
  
  try {
    // Create the product
    const product = await stripe.products.create({
      name: productData.name,
      description: productData.description,
      metadata: {
        ...productData.metadata,
        features: JSON.stringify(productData.features),
      },
    });
    
    console.log(`  ✅ Product created: ${product.id}`);
    
    // Create monthly recurring price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: productData.monthlyPrice,
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        type: 'monthly_subscription',
      },
    });
    
    console.log(`  ✅ Monthly price created: ${monthlyPrice.id} ($${productData.monthlyPrice / 100}/month)`);
    
    // Create one-time setup fee price
    const setupPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: productData.setupPrice,
      currency: 'usd',
      metadata: {
        type: 'setup_fee',
        discount_percent: productData.metadata.setup_fee_discount,
        original_price: productData.metadata.setup_fee_original,
      },
    });
    
    console.log(`  ✅ Setup price created: ${setupPrice.id} ($${productData.setupPrice / 100} one-time)`);
    
    // Set the monthly price as default
    await stripe.products.update(product.id, {
      default_price: monthlyPrice.id,
    });
    
    return {
      productId: product.id,
      monthlyPriceId: monthlyPrice.id,
      setupPriceId: setupPrice.id,
      name: productData.name,
    };
  } catch (error) {
    console.error(`  ❌ Error creating product: ${error.message}`);
    throw error;
  }
}

async function updateDatabase(products) {
  console.log('\n📊 Updating database with Stripe IDs...');
  
  const client = await pool.connect();
  
  try {
    for (const product of products) {
      console.log(`\n🔹 Updating: ${product.name}`);
      
      const result = await client.query(
        `UPDATE subscription_plans 
         SET stripe_product_id = $1, 
             stripe_price_id = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE name = $3
         RETURNING id, name, stripe_product_id, stripe_price_id`,
        [product.productId, product.monthlyPriceId, product.name]
      );
      
      if (result.rows.length > 0) {
        console.log(`  ✅ Database updated for plan ID: ${result.rows[0].id}`);
      } else {
        console.log(`  ⚠️  No matching plan found in database`);
      }
    }
    
    // Verify all plans
    console.log('\n📋 Verifying all subscription plans:');
    const allPlans = await client.query(
      `SELECT id, name, price, setup_fee, stripe_product_id, stripe_price_id, category 
       FROM subscription_plans 
       WHERE category = 'healthcare_marketing'
       ORDER BY price`
    );
    
    console.log('\n┌─────┬─────────────────────────────────────┬────────┬──────────┬─────────────────┬────────────────────┐');
    console.log('│ ID  │ Name                                │ Price  │ Setup    │ Product ID      │ Price ID           │');
    console.log('├─────┼─────────────────────────────────────┼────────┼──────────┼─────────────────┼────────────────────┤');
    
    allPlans.rows.forEach(plan => {
      const id = String(plan.id).padEnd(3);
      const name = plan.name.substring(0, 35).padEnd(35);
      const price = `$${plan.price}`.padEnd(6);
      const setup = `$${plan.setup_fee}`.padEnd(8);
      const prodId = (plan.stripe_product_id || 'N/A').padEnd(15);
      const priceId = (plan.stripe_price_id || 'N/A').substring(0, 18).padEnd(18);
      console.log(`│ ${id} │ ${name} │ ${price} │ ${setup} │ ${prodId} │ ${priceId} │`);
    });
    
    console.log('└─────┴─────────────────────────────────────┴────────┴──────────┴─────────────────┴────────────────────┘');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

async function setupWebhook() {
  console.log('\n🔔 Setting up webhook endpoint...');
  
  try {
    // List existing webhooks
    const existingWebhooks = await stripe.webhookEndpoints.list();
    const webhookUrl = 'https://www.marketingby.wetechforu.com/api/webhooks/stripe';
    
    // Check if webhook already exists
    const existing = existingWebhooks.data.find(wh => wh.url === webhookUrl);
    
    if (existing) {
      console.log(`  ℹ️  Webhook already exists: ${existing.id}`);
      console.log(`  🔑 Signing Secret: ${existing.secret}`);
      return existing;
    }
    
    // Create new webhook
    const webhook = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: [
        'checkout.session.completed',
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed',
      ],
      description: 'Healthcare Marketing Platform - Subscription Events',
    });
    
    console.log(`  ✅ Webhook created: ${webhook.id}`);
    console.log(`  🔑 Signing Secret: ${webhook.secret}`);
    console.log('\n  ⚠️  IMPORTANT: Save this webhook secret!');
    console.log(`  Run: heroku config:set STRIPE_WEBHOOK_SECRET=${webhook.secret} --app marketingby-wetechforu`);
    
    return webhook;
  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Setting up Stripe products for Healthcare Marketing Platform\n');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    // Verify Stripe connection
    console.log('\n🔐 Verifying Stripe API connection...');
    const account = await stripe.accounts.retrieve();
    console.log(`  ✅ Connected to Stripe account: ${account.id}`);
    console.log(`  📧 Business email: ${account.email || 'N/A'}`);
    
    // Create all products
    console.log('\n📦 Creating products...');
    const createdProducts = [];
    
    for (const productData of products) {
      const result = await createStripeProduct(productData);
      createdProducts.push(result);
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Update database
    await updateDatabase(createdProducts);
    
    // Setup webhook
    await setupWebhook();
    
    console.log('\n\n🎉 SUCCESS! All products created and configured!\n');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\n📝 Next Steps:');
    console.log('  1. Copy the webhook secret above');
    console.log('  2. Run: heroku config:set STRIPE_WEBHOOK_SECRET=whsec_xxx --app marketingby-wetechforu');
    console.log('  3. Restart Heroku: heroku restart --app marketingby-wetechforu');
    console.log('  4. Test sign-up: https://www.marketingby.wetechforu.com/\n');
    
    console.log('✅ Your subscription system is now LIVE and ready to accept payments!\n');
    
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the setup
if (require.main === module) {
  main();
}

module.exports = { createStripeProduct, updateDatabase, setupWebhook };

