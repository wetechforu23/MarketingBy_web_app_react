import React from 'react';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Starter',
    price: '$499',
    period: '/month',
    description: 'Perfect for small practices just getting started',
    features: [
      'Basic SEO Optimization',
      'Social Media Management (2 platforms)',
      'Monthly Performance Reports',
      'Email Support',
      '1 Team Member'
    ],
    popular: false
  },
  {
    name: 'Professional',
    price: '$999',
    period: '/month',
    description: 'For growing practices ready to scale',
    features: [
      'Advanced SEO & Content Marketing',
      'Social Media Management (All platforms)',
      'Lead Generation & Nurturing',
      'Weekly Reports & Insights',
      'Priority Support',
      '5 Team Members',
      'Custom Campaigns'
    ],
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large healthcare organizations',
    features: [
      'Everything in Professional',
      'Dedicated Account Manager',
      'Custom AI Model Training',
      'White-label Options',
      'Unlimited Team Members',
      'API Access',
      'Custom Integrations'
    ],
    popular: false
  }
];

export const PricingSection: React.FC = () => {
  const navigate = useNavigate();

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
          {plans.map((plan, index) => (
            <div key={index} className={`pricing-card ${plan.popular ? 'popular' : ''}`}>
              {plan.popular && <div className="popular-badge">Most Popular</div>}
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="price">{plan.price}</span>
                <span className="period">{plan.period}</span>
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
      </div>
    </section>
  );
};
