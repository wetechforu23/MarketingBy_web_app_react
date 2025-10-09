import React from 'react';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="home-footer">
      <div className="container">
        <div className="footer-grid">
          {/* Company Info */}
          <div className="footer-column">
            <div className="footer-logo">
              <img src="/wetechforu_Ai_Marketing_logo_transparent.png" alt="WeTechForU" />
              <div className="footer-logo-text">
                <span className="footer-logo-title">WeTechForU</span>
                <span className="footer-logo-subtitle">AI MARKETING</span>
              </div>
            </div>
            <p className="footer-description">
              AI-powered marketing solutions for healthcare providers. Grow your practice with
              confidence.
            </p>
            <div className="footer-social">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                <i className="fab fa-twitter"></i>
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <i className="fab fa-linkedin"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>

          {/* Services */}
          <div className="footer-column">
            <h4 className="footer-title">Services</h4>
            <ul className="footer-links">
              <li><a href="#services">SEO Optimization</a></li>
              <li><a href="#services">Lead Generation</a></li>
              <li><a href="#services">Social Media Marketing</a></li>
              <li><a href="#services">Email Marketing</a></li>
              <li><a href="#services">Analytics & Reporting</a></li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-column">
            <h4 className="footer-title">Company</h4>
            <ul className="footer-links">
              <li><a href="#about">About Us</a></li>
              <li><a href="#process">Our Process</a></li>
              <li><a href="#pricing">Pricing</a></li>
              <li><a href="/login">Login</a></li>
              <li><a href="#contact">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="footer-column">
            <h4 className="footer-title">Get in Touch</h4>
            <ul className="footer-contact">
              <li>
                <i className="fas fa-envelope me-2"></i>
                <a href="mailto:info@wetechforu.com">info@wetechforu.com</a>
              </li>
              <li>
                <i className="fas fa-phone me-2"></i>
                <a href="tel:+1234567890">+1 (234) 567-890</a>
              </li>
              <li>
                <i className="fas fa-map-marker-alt me-2"></i>
                <span>San Francisco, CA</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {currentYear} WeTechForU. All rights reserved.
          </p>
          <div className="footer-legal">
            <a href="#privacy">Privacy Policy</a>
            <span className="mx-2">•</span>
            <a href="#terms">Terms of Service</a>
            <span className="mx-2">•</span>
            <a href="#hipaa">HIPAA Compliance</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
