import React, { useState } from 'react';
import './SignUpModal.css';

interface SignUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: {
    id: string;
    name: string;
    price: number;
    currency: string;
    priceId: string;
    setupFee?: number;
  } | null;
  onSubmit: (data: SignUpFormData) => Promise<void>;
}

export interface SignUpFormData {
  // Contact Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  
  // Business Information
  businessName: string;
  businessAddress: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  businessPhone: string;
  businessWebsite: string;
  
  // Business Details
  servicesOffered: string;
  businessHours: string;
  targetAudience: string;
  competitorWebsites: string;
  
  // Access & Credentials
  hasWebsiteAccess: boolean;
  hasFacebookPage: boolean;
  hasInstagram: boolean;
  hasGoogleBusiness: boolean;
  hasGoogleAds: boolean;
  
  // Budget Information
  adSpendBudgetGoogle: number;
  adSpendBudgetFacebook: number;
  
  // Preferences
  contentApprovalRequired: boolean;
  blogTopicPreferences: string;
  
  // Agreement
  agreeToTerms: boolean;
  agreeToServiceAgreement: boolean;
  
  // Selected Plan
  planId: string;
  planName: string;
  planPrice: number;
  setupFee: number;
}

export const SignUpModal: React.FC<SignUpModalProps> = ({ isOpen, onClose, selectedPlan, onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    businessName: '',
    businessAddress: '',
    businessCity: '',
    businessState: '',
    businessZip: '',
    businessPhone: '',
    businessWebsite: '',
    servicesOffered: '',
    businessHours: '',
    targetAudience: '',
    competitorWebsites: '',
    hasWebsiteAccess: false,
    hasFacebookPage: false,
    hasInstagram: false,
    hasGoogleBusiness: false,
    hasGoogleAds: false,
    adSpendBudgetGoogle: 500,
    adSpendBudgetFacebook: 500,
    contentApprovalRequired: true,
    blogTopicPreferences: '',
    agreeToTerms: false,
    agreeToServiceAgreement: false,
    planId: selectedPlan?.id || '',
    planName: selectedPlan?.name || '',
    planPrice: selectedPlan?.price || 0,
    setupFee: selectedPlan?.setupFee || 150,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Sign-up error:', error);
      alert('Failed to process sign-up. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  if (!isOpen || !selectedPlan) return null;

  const totalFirstPayment = (selectedPlan.setupFee || 150) + selectedPlan.price;

  return (
    <div className="signup-modal-overlay" onClick={onClose}>
      <div className="signup-modal" onClick={(e) => e.stopPropagation()}>
        <div className="signup-modal-header">
          <h2>Sign Up for {selectedPlan.name}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="signup-progress">
          <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Contact Info</div>
          </div>
          <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Business Details</div>
          </div>
          <div className={`progress-step ${currentStep >= 3 ? 'active' : ''} ${currentStep > 3 ? 'completed' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Access & Budget</div>
          </div>
          <div className={`progress-step ${currentStep >= 4 ? 'active' : ''}`}>
            <div className="step-number">4</div>
            <div className="step-label">Review & Agreement</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          <div className="signup-modal-body">
            {/* Step 1: Contact Information */}
            {currentStep === 1 && (
              <div className="form-step">
                <h3>Contact Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      placeholder="John"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name <span className="required">*</span></label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email <span className="required">*</span></label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="john@practice.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone <span className="required">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      required
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <div className="form-step">
                <h3>Business Details</h3>
                <div className="form-group">
                  <label>Business Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    required
                    placeholder="ABC Healthcare Clinic"
                  />
                </div>
                <div className="form-group">
                  <label>Business Address <span className="required">*</span></label>
                  <input
                    type="text"
                    name="businessAddress"
                    value={formData.businessAddress}
                    onChange={handleInputChange}
                    required
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>City <span className="required">*</span></label>
                    <input
                      type="text"
                      name="businessCity"
                      value={formData.businessCity}
                      onChange={handleInputChange}
                      required
                      placeholder="San Francisco"
                    />
                  </div>
                  <div className="form-group">
                    <label>State <span className="required">*</span></label>
                    <input
                      type="text"
                      name="businessState"
                      value={formData.businessState}
                      onChange={handleInputChange}
                      required
                      placeholder="CA"
                    />
                  </div>
                  <div className="form-group">
                    <label>Zip Code <span className="required">*</span></label>
                    <input
                      type="text"
                      name="businessZip"
                      value={formData.businessZip}
                      onChange={handleInputChange}
                      required
                      placeholder="94102"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Business Phone <span className="required">*</span></label>
                    <input
                      type="tel"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleInputChange}
                      required
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="form-group">
                    <label>Website URL</label>
                    <input
                      type="url"
                      name="businessWebsite"
                      value={formData.businessWebsite}
                      onChange={handleInputChange}
                      placeholder="https://www.yourpractice.com"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Services Offered <span className="required">*</span></label>
                  <textarea
                    name="servicesOffered"
                    value={formData.servicesOffered}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    placeholder="Primary care, urgent care, family medicine..."
                  />
                </div>
                <div className="form-group">
                  <label>Business Hours <span className="required">*</span></label>
                  <textarea
                    name="businessHours"
                    value={formData.businessHours}
                    onChange={handleInputChange}
                    required
                    rows={2}
                    placeholder="Mon-Fri: 9AM-5PM, Sat: 10AM-2PM"
                  />
                </div>
                <div className="form-group">
                  <label>Target Audience</label>
                  <textarea
                    name="targetAudience"
                    value={formData.targetAudience}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="Families, seniors, working professionals..."
                  />
                </div>
                <div className="form-group">
                  <label>Competitor Websites (Optional)</label>
                  <textarea
                    name="competitorWebsites"
                    value={formData.competitorWebsites}
                    onChange={handleInputChange}
                    rows={2}
                    placeholder="https://competitor1.com, https://competitor2.com"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Access & Budget */}
            {currentStep === 3 && (
              <div className="form-step">
                <h3>Platform Access & Budget</h3>
                
                <div className="info-box">
                  <i className="fas fa-info-circle"></i>
                  <p>We'll need access to these platforms to set up and manage your marketing campaigns. You'll provide access after sign-up during onboarding.</p>
                </div>

                <div className="access-checklist">
                  <h4>Platform Access (Check what you have):</h4>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="hasWebsiteAccess"
                      checked={formData.hasWebsiteAccess}
                      onChange={handleInputChange}
                    />
                    <span>I have website backend access (for pixel & SEO setup)</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="hasFacebookPage"
                      checked={formData.hasFacebookPage}
                      onChange={handleInputChange}
                    />
                    <span>I have a Facebook Business Page</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="hasInstagram"
                      checked={formData.hasInstagram}
                      onChange={handleInputChange}
                    />
                    <span>I have an Instagram Professional Account</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="hasGoogleBusiness"
                      checked={formData.hasGoogleBusiness}
                      onChange={handleInputChange}
                    />
                    <span>I have a Google Business Profile</span>
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="hasGoogleAds"
                      checked={formData.hasGoogleAds}
                      onChange={handleInputChange}
                    />
                    <span>I have a Google Ads account</span>
                  </label>
                </div>

                <div className="budget-section">
                  <h4>Monthly Ad Spend Budget:</h4>
                  <p className="budget-note">
                    <i className="fas fa-credit-card"></i>
                    You'll add your own credit card to Google Ads and Facebook Ads. We manage the campaigns, you pay the platforms directly.
                  </p>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Google Ads Budget (per month)</label>
                      <input
                        type="number"
                        name="adSpendBudgetGoogle"
                        value={formData.adSpendBudgetGoogle}
                        onChange={handleInputChange}
                        min="0"
                        step="50"
                        placeholder="500"
                      />
                      <small>Recommended: $500-$2,000/month</small>
                    </div>
                    <div className="form-group">
                      <label>Facebook/Instagram Ads Budget (per month)</label>
                      <input
                        type="number"
                        name="adSpendBudgetFacebook"
                        value={formData.adSpendBudgetFacebook}
                        onChange={handleInputChange}
                        min="0"
                        step="50"
                        placeholder="500"
                      />
                      <small>Recommended: $500-$2,000/month</small>
                    </div>
                  </div>
                </div>

                <div className="preferences-section">
                  <h4>Content Preferences:</h4>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="contentApprovalRequired"
                      checked={formData.contentApprovalRequired}
                      onChange={handleInputChange}
                    />
                    <span>I want to approve content before it's published (3-day approval window)</span>
                  </label>
                  <div className="form-group">
                    <label>Blog Topic Preferences (Optional)</label>
                    <textarea
                      name="blogTopicPreferences"
                      value={formData.blogTopicPreferences}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder="Diabetes care, preventive medicine, wellness tips..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review & Agreement */}
            {currentStep === 4 && (
              <div className="form-step">
                <h3>Review & Agreement</h3>
                
                <div className="order-summary">
                  <h4>Order Summary</h4>
                  <div className="summary-item">
                    <span>Plan:</span>
                    <strong>{selectedPlan.name}</strong>
                  </div>
                  <div className="summary-item">
                    <span>Monthly Fee:</span>
                    <strong>${selectedPlan.price}/month</strong>
                  </div>
                  <div className="summary-item promo">
                    <span>One-Time Setup Fee:</span>
                    <div>
                      <strong>${formData.setupFee}</strong>
                      <span className="original-price">$300</span>
                      <span className="discount-badge">50% OFF</span>
                    </div>
                  </div>
                  <div className="summary-item total">
                    <span>Total Due Today:</span>
                    <strong>${totalFirstPayment}</strong>
                  </div>
                  <div className="summary-note">
                    <i className="fas fa-calendar-alt"></i>
                    Next billing: ${selectedPlan.price} on the 1st of next month
                  </div>
                </div>

                <div className="agreement-section">
                  <h4>Service Agreement</h4>
                <div className="agreement-box">
                  <h5>Scope of Work:</h5>
                  <ul>
                    <li>✅ Social Media Management (Organic) – Facebook & Instagram</li>
                    <li>✅ Facebook & Instagram Ads Management</li>
                    <li>✅ Google Ads Management (Search + Display)</li>
                    <li>✅ Basic SEO & Content Marketing</li>
                    <li>✅ Monthly Performance Reporting</li>
                    <li>✅ One-Time Setup (Google Business, Analytics, Pixels, etc.)</li>
                  </ul>
                  <h5>Your Responsibilities:</h5>
                  <ul>
                    <li>📌 Provide all necessary platform access as early as possible</li>
                    <li>📌 Add your credit card to Google Ads and Facebook Ads</li>
                    <li>📌 Approve content within 3 days of submission</li>
                    <li>📌 Provide business materials (logo, photos, etc.)</li>
                    <li>📌 Maintain active accounts on all marketing platforms</li>
                  </ul>
                  <h5>Payment Terms:</h5>
                  <ul>
                    <li>💳 Setup fee due before work begins</li>
                    <li>💳 Monthly fee due on the 1st of each month</li>
                    <li>💳 Ad spend paid directly to Google/Facebook (your card)</li>
                    <li>💳 30-day notice required for cancellation</li>
                  </ul>
                  <h5>Additional Work:</h5>
                  <ul>
                    <li>⚠️ Any additional work outside of the agreed scope will be charged hourly based on client requirements</li>
                    <li>⚠️ Hourly rates will be communicated and approved before work begins</li>
                  </ul>
                </div>

                  <label className="checkbox-label agreement-checkbox">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      required
                    />
                    <span>I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a></span>
                  </label>

                  <label className="checkbox-label agreement-checkbox">
                    <input
                      type="checkbox"
                      name="agreeToServiceAgreement"
                      checked={formData.agreeToServiceAgreement}
                      onChange={handleInputChange}
                      required
                    />
                    <span>I agree to the Service Agreement and understand my responsibilities as outlined above</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="signup-modal-footer">
            <div className="footer-buttons">
              {currentStep > 1 && (
                <button type="button" onClick={handlePrevious} className="btn btn-secondary">
                  <i className="fas fa-arrow-left me-2"></i>
                  Previous
                </button>
              )}
              {currentStep < 4 ? (
                <button type="submit" className="btn btn-primary">
                  Next
                  <i className="fas fa-arrow-right ms-2"></i>
                </button>
              ) : (
                <button 
                  type="submit" 
                  className="btn btn-success btn-lg"
                  disabled={isSubmitting || !formData.agreeToTerms || !formData.agreeToServiceAgreement}
                >
                  {isSubmitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin me-2"></i>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-check me-2"></i>
                      Complete Sign-Up & Pay ${totalFirstPayment}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

