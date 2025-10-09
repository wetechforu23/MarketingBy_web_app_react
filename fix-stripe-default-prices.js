const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
});

async function fixDefaultPrices() {
  console.log('🔧 Fixing default prices for healthcare marketing products...\n');
  
  const products = [
    { id: 'prod_TCmDIkyMxIFBDY', name: 'Basic', monthlyPriceId: 'price_1SGMfBIf35Ig2fo8YiFJpqHU' },
    { id: 'prod_TCmDfWl3W67Lr6', name: 'Professional', monthlyPriceId: 'price_1SGMfCIf35Ig2fo8uFMNkDVo' },
    { id: 'prod_TCmDX2Wa0eiVKM', name: 'Enterprise', monthlyPriceId: 'price_1SGMfEIf35Ig2fo8Y2ixrEAG' },
  ];
  
  for (const product of products) {
    console.log(`📦 Updating ${product.name} Healthcare Marketing...`);
    await stripe.products.update(product.id, {
      default_price: product.monthlyPriceId,
    });
    console.log(`  ✅ Default price set to ${product.monthlyPriceId}\n`);
  }
  
  console.log('🎉 All default prices updated!\n');
}

fixDefaultPrices().catch(console.error);
