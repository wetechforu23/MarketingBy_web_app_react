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
          <button
            onClick={() =>
              document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="btn btn-primary btn-lg"
          >
            <i className="fas fa-info-circle me-2"></i>
            Learn More
          </button>
          <button
            onClick={() =>
              document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
            }
            className="btn btn-outline-primary btn-lg"
          >
            <i className="fas fa-tag me-2"></i>
            View Pricing
          </button>
        </div>
      </div>
    </section>
  );
};

