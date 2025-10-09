import React from 'react';
import { useNavigate } from 'react-router-dom';

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="hero-section">
      <div className="hero-content">
        <div className="hero-badge">
          <i className="fas fa-star me-2"></i>
          AI-Powered Healthcare Marketing Solutions
        </div>
        <h1 className="hero-title">
          Transform Your Healthcare Practice with{' '}
          <span className="text-gradient">Smart Marketing</span>
        </h1>
        <p className="hero-description">
          Leverage cutting-edge AI technology and comprehensive marketing services to grow your
          healthcare practice. From SEO and social media to lead generation and analytics—we handle
          it all.
        </p>
        <div className="hero-buttons">
          <button onClick={() => navigate('/login')} className="btn btn-primary btn-lg">
            <i className="fas fa-rocket me-2"></i>
            Get Started
          </button>
          <button
            onClick={() =>
              document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="btn btn-outline-primary btn-lg"
          >
            <i className="fas fa-info-circle me-2"></i>
            Learn More
          </button>
        </div>
        <div className="hero-stats">
          <div className="stat">
            <div className="stat-value">500+</div>
            <div className="stat-label">Healthcare Clients</div>
          </div>
          <div className="stat">
            <div className="stat-value">95%</div>
            <div className="stat-label">Client Satisfaction</div>
          </div>
          <div className="stat">
            <div className="stat-value">24/7</div>
            <div className="stat-label">AI-Powered Support</div>
          </div>
        </div>
      </div>
    </section>
  );
};

