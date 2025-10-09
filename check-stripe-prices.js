const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

async function checkPrices() {
  console.log('🔍 Checking all prices for healthcare marketing products...\n');
  
  const productIds = [
    'prod_TCmDIkyMxIFBDY',  // Basic
    'prod_TCmDfWl3W67Lr6',  // Professional
    'prod_TCmDX2Wa0eiVKM',  // Enterprise
  ];
  
  for (const prodId of productIds) {
    const product = await stripe.products.retrieve(prodId);
    console.log(`📦 ${product.name}`);
    console.log(`   Default Price: ${product.default_price}`);
    
    const prices = await stripe.prices.list({ product: prodId });
    console.log(`   All Prices:`);
    for (const price of prices.data) {
      const amount = (price.unit_amount / 100).toFixed(2);
      const type = price.recurring ? `recurring (${price.recurring.interval})` : 'one-time';
      console.log(`     - ${price.id}: $${amount} ${type}`);
    }
    console.log('');
  }
}

checkPrices().catch(console.error);
