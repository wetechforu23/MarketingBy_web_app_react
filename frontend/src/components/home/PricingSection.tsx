import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
}

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPricingPlans();
  }, []);

  const fetchPricingPlans = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use axios directly without auth interceptor for public endpoint
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
      setPlans(data);
      
      console.log('✅ Fetched pricing plans from API:', data);
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
        id: 'fallback_starter',
        name: 'Starter',
        price: 499,
        currency: 'usd',
        interval: 'month',
        description: 'Perfect for small practices just getting started',
        priceId: '',
        popular: false,
        features: [
          'Basic SEO Optimization',
          'Social Media Management (2 platforms)',
          'Monthly Performance Reports',
          'Email Support',
          '1 Team Member',
        ],
      },
      {
        id: 'fallback_professional',
        name: 'Professional',
        price: 999,
        currency: 'usd',
        interval: 'month',
        description: 'For growing practices ready to scale',
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
      },
      {
        id: 'fallback_enterprise',
        name: 'Enterprise',
        price: 0,
        currency: 'usd',
        interval: 'month',
        description: 'For large healthcare organizations',
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
    <section id="pricing" className="pricing-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-description">
            Choose the plan that fits your practice. No hidden fees, cancel anytime.
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
              <p className="plan-description">{plan.description}</p>
              <ul className="plan-features">
                {plan.features.map((feature, idx) => (
                  <li key={idx}>
                    <i className="fas fa-check text-success me-2"></i>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/login')}
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-outline-primary'} btn-lg btn-block`}
              >
                Get Started
              </button>
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
  );
};
