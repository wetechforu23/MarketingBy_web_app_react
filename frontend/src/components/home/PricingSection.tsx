import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SignUpModal, SignUpFormData } from './SignUpModal';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  description: string;
  features: string[];
  popular: boolean;
  priceId: string;
  metadata?: Record<string, any>;
  setupFee?: number;
  category?: string;
}

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);

  useEffect(() => {
    fetchPricingPlans();
  }, []);

  const fetchPricingPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use native fetch without auth interceptor for public endpoint
      const response = await fetch('/api/public/pricing-plans', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch pricing plans');
      }

      const data = await response.json();
      
      // Filter for healthcare_marketing category only
      const healthcarePlans = data.filter((plan: PricingPlan) => 
        plan.metadata?.category === 'healthcare_marketing' || 
        plan.category === 'healthcare_marketing'
      );
      
      setPlans(healthcarePlans.length > 0 ? healthcarePlans : data);
      
      console.log('✅ Fetched pricing plans from API:', healthcarePlans);
    } catch (err) {
      console.error('Error fetching pricing plans:', err);
      setError('Failed to load pricing plans');
      
      // Use fallback plans if API fails
      setPlans(getFallbackPlans());
    } finally {
      setLoading(false);
    }
  };

  const getFallbackPlans = (): PricingPlan[] => {
    return [
      {
        id: 'fallback_basic',
        name: 'Basic Healthcare Marketing',
        price: 399,
        currency: 'usd',
        interval: 'month',
        description: 'Essential marketing services for small healthcare practices',
        priceId: '',
        popular: false,
        setupFee: 150,
        category: 'healthcare_marketing',
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
        id: 'fallback_professional',
        name: 'Professional Healthcare Marketing',
        price: 799,
        currency: 'usd',
        interval: 'month',
        description: 'Comprehensive marketing for growing practices',
        priceId: '',
        popular: true,
        setupFee: 150,
        category: 'healthcare_marketing',
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
        id: 'fallback_enterprise',
        name: 'Enterprise Healthcare Marketing',
        price: 1499,
        currency: 'usd',
        interval: 'month',
        description: 'Full-service marketing for multi-location practices',
        priceId: '',
        popular: false,
        setupFee: 150,
        category: 'healthcare_marketing',
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
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return 'Custom';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatInterval = (interval: string) => {
    const intervalMap: Record<string, string> = {
      month: '/month',
      year: '/year',
      day: '/day',
      week: '/week',
    };
    return intervalMap[interval] || '';
  };

  const handleGetStarted = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setIsSignUpModalOpen(true);
  };

  const handleSignUpSubmit = async (formData: SignUpFormData) => {
    try {
      console.log('📝 Sign-up data:', formData);
      
      // TODO: Send to backend API
      const response = await fetch('/api/public/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Sign-up failed');
      }

      const result = await response.json();
      console.log('✅ Sign-up successful:', result);

      // Redirect to Stripe checkout
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
      } else {
        alert('Sign-up successful! Redirecting to payment...');
        setIsSignUpModalOpen(false);
        navigate('/login');
      }
    } catch (error) {
      console.error('❌ Sign-up error:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-description">Loading pricing plans...</p>
          </div>
          <div className="text-center">
            <i className="fas fa-spinner fa-spin fa-3x text-primary"></i>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Simple, Transparent Pricing</h2>
            <p className="section-description text-danger">{error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section id="pricing" className="pricing-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Healthcare Marketing Plans</h2>
            <p className="section-description">
              Choose the plan that fits your practice. Includes one-time setup fee of $150 (50% OFF - $300 value).
              <br />
              <strong>Ad spend paid separately by you directly to Google & Facebook.</strong>
            </p>
          </div>
          <div className="pricing-grid">
            {plans.map((plan) => (
              <div key={plan.id} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
                {plan.popular && <div className="popular-badge">Most Popular</div>}
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-price">
                  <span className="price">{formatPrice(plan.price, plan.currency)}</span>
                  <span className="period">{formatInterval(plan.interval)}</span>
                </div>
                {plan.setupFee && (
                  <div className="setup-fee-badge">
                    + ${plan.setupFee} setup <span className="strikethrough">$300</span> (50% OFF)
                  </div>
                )}
                <p className="plan-description">{plan.description}</p>
                <ul className="plan-features">
                  {plan.features.map((feature, idx) => (
                    <li key={idx}>
                      <i className="fas fa-check text-success me-2"></i>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          {plans.length === 0 && (
            <div className="text-center">
              <p className="text-muted">No pricing plans available at this time.</p>
            </div>
          )}
        </div>
      </section>

      {/* Sign-Up Modal */}
      <SignUpModal
        isOpen={isSignUpModalOpen}
        onClose={() => setIsSignUpModalOpen(false)}
        selectedPlan={selectedPlan}
        onSubmit={handleSignUpSubmit}
      />
    </>
  );
};
