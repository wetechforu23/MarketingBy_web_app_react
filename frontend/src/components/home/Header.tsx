import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const Header: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLoginClick = () => {
    navigate('/login');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className={`home-header ${isScrolled ? 'scrolled' : ''}`}>
      <div className="container">
        <div className="header-content">
          {/* Logo */}
          <a href="/" className="logo">
            <div className="logo-image">
              <img
                src="/wetechforu_Ai_Marketing_logo_transparent.png"
                alt="WeTechForU Logo"
              />
            </div>
            <div className="logo-text">
              <span className="logo-title">WeTechForU</span>
              <span className="logo-subtitle">AI MARKETING</span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="desktop-nav">
            <button onClick={() => scrollToSection('services')} className="nav-link">
              Services
            </button>
            <button onClick={() => scrollToSection('process')} className="nav-link">
              Process
            </button>
            <button onClick={() => scrollToSection('pricing')} className="nav-link">
              Pricing
            </button>
            <button onClick={() => scrollToSection('contact')} className="nav-link">
              Contact
            </button>
          </nav>

          {/* Login Button */}
          <div className="header-cta">
            <button onClick={handleLoginClick} className="btn btn-primary btn-lg">
              <i className="fas fa-sign-in-alt me-2"></i>
              Login
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <i className={`fas fa-${isMobileMenuOpen ? 'times' : 'bars'}`}></i>
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="mobile-menu">
            <nav className="mobile-nav">
              <button onClick={() => scrollToSection('services')} className="nav-link">
                Services
              </button>
              <button onClick={() => scrollToSection('process')} className="nav-link">
                Process
              </button>
              <button onClick={() => scrollToSection('pricing')} className="nav-link">
                Pricing
              </button>
              <button onClick={() => scrollToSection('contact')} className="nav-link">
                Contact
              </button>
              <button onClick={handleLoginClick} className="btn btn-primary btn-block mt-4">
                <i className="fas fa-sign-in-alt me-2"></i>
                Login
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

