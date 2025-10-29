import React from 'react';
import { Header } from '../../components/home/Header';
import { HeroSection } from '../../components/home/HeroSection';
import { ServicesGrid } from '../../components/home/ServicesGrid';
import { ProcessTimeline } from '../../components/home/ProcessTimeline';
import { KeyFeatures } from '../../components/home/KeyFeatures';
import { PricingSection } from '../../components/home/PricingSection';
import { TestimonialsSection } from '../../components/home/TestimonialsSection';
import { CTASection } from '../../components/home/CTASection';
import { Footer } from '../../components/home/Footer';
import './home.css';

export const HomePage: React.FC = () => {
  return (
    <div className="home-page">
      <Header />
      <main>
        <HeroSection />
        <ServicesGrid />
        <ProcessTimeline />
        <KeyFeatures />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default HomePage;

