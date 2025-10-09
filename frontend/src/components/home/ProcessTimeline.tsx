import React from 'react';

const steps = [
  {
    number: '01',
    title: 'Discovery & Strategy',
    description: 'We analyze your practice, competitors, and target audience to create a custom marketing strategy.',
    icon: 'fa-lightbulb'
  },
  {
    number: '02',
    title: 'Setup & Integration',
    description: 'Quick onboarding with seamless integration of our AI tools into your workflow.',
    icon: 'fa-cogs'
  },
  {
    number: '03',
    title: 'Launch & Optimize',
    description: 'Deploy campaigns and continuously optimize with AI-driven insights and recommendations.',
    icon: 'fa-rocket'
  },
  {
    number: '04',
    title: 'Track & Scale',
    description: 'Monitor performance in real-time and scale successful strategies across channels.',
    icon: 'fa-chart-line'
  }
];

export const ProcessTimeline: React.FC = () => {
  return (
    <section id="process" className="process-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Our Proven Process</h2>
          <p className="section-description">
            Four simple steps to transform your healthcare marketing
          </p>
        </div>
        <div className="process-timeline">
          {steps.map((step, index) => (
            <div key={index} className="process-step">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">
                <i className={`fas ${step.icon}`}></i>
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
