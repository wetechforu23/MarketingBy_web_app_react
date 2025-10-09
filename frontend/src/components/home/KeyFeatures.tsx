import React from 'react';

const features = [
  { icon: 'fa-brain', title: 'AI-Powered Insights', description: 'Smart recommendations based on your data' },
  { icon: 'fa-shield-alt', title: 'HIPAA Compliant', description: 'Full compliance with healthcare regulations' },
  { icon: 'fa-mobile-alt', title: 'Mobile Optimized', description: 'Access your dashboard from anywhere' },
  { icon: 'fa-users', title: 'Dedicated Support', description: '24/7 expert support team ready to help' },
  { icon: 'fa-sync-alt', title: 'Real-time Updates', description: 'Live campaign performance tracking' },
  { icon: 'fa-dollar-sign', title: 'Transparent Pricing', description: 'No hidden fees, clear ROI metrics' }
];

export const KeyFeatures: React.FC = () => {
  return (
    <section className="features-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Why Choose WeTechForU?</h2>
          <p className="section-description">
            Built specifically for healthcare providers with your unique needs in mind
          </p>
        </div>
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon-wrapper">
                <div className="feature-icon">
                  <i className={`fas ${feature.icon}`}></i>
                </div>
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
