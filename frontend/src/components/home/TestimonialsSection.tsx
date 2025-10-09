import React from 'react';

const testimonials = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'Family Medicine, Chicago',
    image: '👩‍⚕️',
    quote: 'WeTechForU transformed our online presence. We\'ve seen a 200% increase in new patient inquiries in just 3 months!',
    rating: 5
  },
  {
    name: 'Dr. Michael Chen',
    role: 'Dental Practice, San Francisco',
    image: '👨‍⚕️',
    quote: 'The AI-powered lead generation is incredible. We no longer waste time on unqualified leads.',
    rating: 5
  },
  {
    name: 'Dr. Emily Rodriguez',
    role: 'Pediatrics, Miami',
    image: '👩‍⚕️',
    quote: 'Best investment we\'ve made. The platform is intuitive and the support team is outstanding!',
    rating: 5
  }
];

export const TestimonialsSection: React.FC = () => {
  return (
    <section className="testimonials-section">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Trusted by Healthcare Professionals</h2>
          <p className="section-description">
            See what our clients have to say about their experience
          </p>
        </div>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <div className="testimonial-header">
                <div className="testimonial-avatar">{testimonial.image}</div>
                <div className="testimonial-info">
                  <h4 className="testimonial-name">{testimonial.name}</h4>
                  <p className="testimonial-role">{testimonial.role}</p>
                </div>
              </div>
              <div className="testimonial-rating">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <i key={i} className="fas fa-star text-warning"></i>
                ))}
              </div>
              <p className="testimonial-quote">"{testimonial.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
