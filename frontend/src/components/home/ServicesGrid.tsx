import React from 'react';

const services = [
  {
    icon: 'fa-search',
    title: 'SEO Optimization',
    description:
      'Improve your search rankings with AI-powered SEO strategies tailored for healthcare practices.',
    features: ['Keyword Research', 'On-Page SEO', 'Technical Audit', 'Link Building'],
  },
  {
    icon: 'fa-chart-line',
    title: 'Lead Generation',
    description:
      'Generate qualified leads through targeted campaigns and intelligent lead scoring systems.',
    features: ['Web Scraping', 'Lead Scoring', 'Email Campaigns', 'CRM Integration'],
  },
  {
    icon: 'fa-share-alt',
    title: 'Social Media Marketing',
    description:
      'Engage with patients on Facebook, Instagram, and other platforms with AI-assisted content.',
    features: ['Content Creation', 'Social Scheduling', 'Community Management', 'Analytics'],
  },
  {
    icon: 'fa-envelope',
    title: 'Email Marketing',
    description:
      'Nurture relationships with personalized email campaigns powered by AI insights.',
    features: ['Campaign Design', 'A/B Testing', 'Automation', 'Performance Tracking'],
  },
  {
    icon: 'fa-chart-bar',
    title: 'Analytics & Reporting',
    description:
      'Track your marketing ROI with comprehensive dashboards and AI-generated insights.',
    features: ['Real-time Dashboards', 'Custom Reports', 'Competitor Analysis', 'Goal Tracking'],
  },
  {
    icon: 'fa-robot',
    title: 'AI-Powered Content',
    description:
      'Create high-quality, compliant healthcare content with our AI writing assistants.',
    features: ['Blog Writing', 'Meta Descriptions', 'Ad Copy', 'HIPAA Compliance'],
  },
];

export const ServicesGrid: React.FC = () => {
  return (
    <section id="services" className="services-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Comprehensive Marketing Services</h2>
          <p className="section-description">
            Everything you need to grow your healthcare practice in one powerful platform
          </p>
        </div>
        <div className="services-grid">
          {services.map((service, index) => (
            <div key={index} className="service-card">
              <div className="service-icon">
                <i className={`fas ${service.icon}`}></i>
              </div>
              <h3 className="service-title">{service.title}</h3>
              <p className="service-description">{service.description}</p>
              <ul className="service-features">
                {service.features.map((feature, idx) => (
                  <li key={idx}>
                    <i className="fas fa-check text-success me-2"></i>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

