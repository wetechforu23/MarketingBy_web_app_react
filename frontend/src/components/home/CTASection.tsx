import React from 'react';
import { useNavigate } from 'react-router-dom';

export const CTASection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section id="contact" className="cta-section">
      <div className="container">
        <div className="cta-content">
          <h2 className="cta-title">Ready to Transform Your Healthcare Marketing?</h2>
          <p className="cta-description">
            Join hundreds of healthcare providers who trust WeTechForU to grow their practice.
            Start your free trial today—no credit card required.
          </p>
          <div className="cta-buttons">
            <button onClick={() => navigate('/login')} className="btn btn-light btn-lg">
              <i className="fas fa-rocket me-2"></i>
              Start Free Trial
            </button>
            <button onClick={() => window.location.href = 'mailto:info@wetechforu.com'} className="btn btn-outline-light btn-lg">
              <i className="fas fa-envelope me-2"></i>
              Contact Sales
            </button>
          </div>
          <div className="cta-trust">
            <i className="fas fa-shield-alt me-2"></i>
            <span>HIPAA Compliant • Secure • Trusted by 500+ Practices</span>
          </div>
        </div>
      </div>
    </section>
  );
};
