const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

async function test() {
  console.log('Testing Stripe API directly...\n');
  
  const products = await stripe.products.list({
    active: true,
    limit: 100,
    expand: ['data.default_price'],
  });
  
  const healthcareProducts = products.data.filter(p => p.metadata?.category === 'healthcare_marketing');
  
  for (const product of healthcareProducts) {
    console.log(`\n📦 ${product.name}`);
    console.log(`   Product ID: ${product.id}`);
    console.log(`   Default Price ID: ${product.default_price}`);
    
    if (typeof product.default_price === 'object' && product.default_price !== null) {
      const price = product.default_price;
      console.log(`   Price: $${(price.unit_amount / 100).toFixed(2)}`);
      console.log(`   Type: ${price.recurring ? `${price.recurring.interval}ly recurring` : 'one-time'}`);
    }
  }
}

test().catch(console.error);
