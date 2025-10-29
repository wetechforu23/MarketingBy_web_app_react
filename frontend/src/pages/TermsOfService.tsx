import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2E86AB 0%, #4A90E2 100%)',
        padding: '40px 20px',
        color: 'white',
        textAlign: 'center'
      }}>
        <div className="container">
          <a 
            href="/"
            style={{
              display: 'inline-block',
              marginBottom: '20px',
              transition: 'transform 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <img src="/logo.png" alt="WeTechForU" style={{ height: '80px', width: 'auto' }} />
          </a>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '10px' }}>
            Terms of Service
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9 }}>
            Last Updated: January 2025
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ maxWidth: '900px', padding: '40px 20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          
          {/* Introduction */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              1. Agreement to Terms
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Welcome to <strong>WeTechForU AI Marketing</strong> (operated by WeTechForU, "we," "us," or "our"). 
              By accessing or using our healthcare marketing platform at <strong>www.marketingby.wetechforu.com</strong> 
              (the "Service"), you agree to be bound by these Terms of Service ("Terms").
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>IF YOU DO NOT AGREE TO THESE TERMS, YOU MAY NOT ACCESS OR USE THE SERVICE.</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              These Terms constitute a legally binding agreement between you and WeTechForU. We reserve the right 
              to modify these Terms at any time. Your continued use of the Service after changes are posted 
              constitutes acceptance of the modified Terms.
            </p>
          </section>

          {/* Services Provided */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              2. Services Provided
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              WeTechForU provides digital marketing services specifically for healthcare practices, including but not limited to:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Social media management (Facebook, Instagram)</li>
              <li>Paid advertising campaign management (Google Ads, Facebook Ads, Instagram Ads)</li>
              <li>Search engine optimization (SEO) and content marketing</li>
              <li>Analytics and performance reporting</li>
              <li>Website optimization and technical setup</li>
              <li>Email marketing campaigns</li>
              <li>Lead generation and management tools</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <strong>⚠️ Important:</strong> WeTechForU is a marketing service provider ONLY. We are NOT healthcare 
              providers, medical professionals, or HIPAA Business Associates. We do not provide medical advice, 
              diagnosis, or treatment services.
            </p>
          </section>

          {/* Eligibility */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              3. Eligibility and Account Requirements
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              To use our Service, you must:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Be at least 18 years of age</li>
              <li>Have the legal authority to enter into binding contracts</li>
              <li>Represent a legitimate healthcare practice or business</li>
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Comply with all applicable federal, state, and local laws</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              You are responsible for all activities that occur under your account. You must notify us immediately 
              of any unauthorized access or security breach.
            </p>
          </section>

          {/* Client Responsibilities */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              4. Client Responsibilities
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>4.1 Platform Access & Credentials</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Provide timely access to all necessary marketing platforms (Facebook, Instagram, Google, etc.)</li>
              <li>Grant appropriate permissions and administrative access to WeTechForU team members</li>
              <li>Maintain active accounts in good standing on all marketing platforms</li>
              <li>Provide accurate business information (address, hours, services, contact details)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>4.2 Advertising Budget & Payment</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Add your own credit card or payment method to Google Ads and Facebook Ads Manager</li>
              <li>YOU are responsible for all ad spend paid directly to Google and Facebook</li>
              <li>Monitor your advertising budgets and spending limits</li>
              <li>Pay WeTechForU's service fees separately from ad spend</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>4.3 Content Approval & Materials</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Review and approve all marketing content within 3 business days of submission</li>
              <li>Provide necessary brand materials (logos, photos, brand guidelines)</li>
              <li>Ensure all provided content complies with healthcare advertising regulations</li>
              <li>Notify us of any changes to services, hours, or business operations</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>4.4 Compliance & Legal Requirements</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px' }}>
              <li>Ensure your practice maintains all required licenses and certifications</li>
              <li>Comply with HIPAA, HITECH, and all healthcare privacy regulations</li>
              <li>Do NOT provide us with any Protected Health Information (PHI) or patient data</li>
              <li>Maintain your own HIPAA compliance program and policies</li>
            </ul>
          </section>

          {/* Prohibited Uses */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              5. Prohibited Uses
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              You agree NOT to use the Service to:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Violate any federal, state, or local laws or regulations</li>
              <li>Infringe on intellectual property rights of others</li>
              <li>Transmit false, misleading, or deceptive advertising claims</li>
              <li>Share Protected Health Information (PHI) or patient data with us</li>
              <li>Make unsubstantiated medical claims or guarantees</li>
              <li>Promote illegal substances or services</li>
              <li>Harass, threaten, or harm others</li>
              <li>Distribute spam, viruses, or malicious code</li>
              <li>Attempt to gain unauthorized access to our systems</li>
              <li>Reverse engineer or copy any part of our Service</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057', background: '#f8d7da', padding: '15px', borderRadius: '8px', border: '1px solid #dc3545' }}>
              <strong>⚠️ Violation Notice:</strong> We reserve the right to immediately suspend or terminate your 
              account for any violation of these prohibited uses without refund.
            </p>
          </section>

          {/* Payment Terms */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              6. Payment Terms & Billing
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>6.1 Service Fees</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>One-Time Setup Fee:</strong> $150 (50% discount from $300), due before work begins</li>
              <li><strong>Monthly Service Fee:</strong> Based on selected plan (Basic: $399, Professional: $799, Enterprise: $1,499), due on the 1st of each month</li>
              <li>All fees are in USD and processed through Stripe</li>
              <li>Fees are non-refundable except as required by law</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>6.2 Advertising Spend (Separate from Service Fees)</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Ad spend for Google Ads, Facebook Ads, and Instagram Ads is paid DIRECTLY by you to those platforms</li>
              <li>You maintain full control and ownership of your advertising accounts</li>
              <li>WeTechForU does NOT charge ad spend to our accounts or mark up advertising costs</li>
              <li>You set your own daily/monthly ad spend budgets on each platform</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>6.3 Additional Work</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Any work outside the agreed scope of your subscription plan will be charged at our hourly rate. 
              Hourly rates will be communicated and approved in writing before work begins.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>6.4 Late Payment</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              If payment is not received within 5 days of the due date, we reserve the right to suspend services 
              until payment is received. A late fee of 1.5% per month (18% APR) may be applied to overdue balances.
            </p>
          </section>

          {/* Cancellation */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              7. Cancellation & Termination
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>7.1 Cancellation by You</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>You may cancel your subscription at any time with 30 days' written notice</li>
              <li>Cancellation requests must be submitted in writing via email to info@wetechforu.com</li>
              <li>You remain responsible for payment through the end of your 30-day notice period</li>
              <li>No refunds will be provided for partial months or unused services</li>
              <li>One-time setup fees are non-refundable</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>7.2 Termination by WeTechForU</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We may suspend or terminate your account immediately if:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>You violate these Terms of Service</li>
              <li>Payment is more than 15 days overdue</li>
              <li>You provide false or misleading information</li>
              <li>Your actions harm our reputation or other clients</li>
              <li>We are required to do so by law or regulatory authority</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>7.3 Post-Termination</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              Upon termination, you will lose access to the Service. We will provide you with any completed work 
              or data within 30 days. You remain responsible for all fees incurred prior to termination.
            </p>
          </section>

          {/* Intellectual Property */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              8. Intellectual Property Rights
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.1 Your Content</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              You retain all ownership rights to content you provide (logos, photos, copy, etc.). By providing 
              content to us, you grant WeTechForU a non-exclusive, worldwide license to use, reproduce, modify, 
              and distribute your content solely for the purpose of providing the Service.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.2 Our Content</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Content we create for you (social posts, ads, blog posts, etc.) becomes your property upon full 
              payment. However, we retain the right to showcase this work in our portfolio and marketing materials.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.3 Platform & Technology</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              The WeTechForU platform, including all software, algorithms, designs, and technology, remains the 
              exclusive property of WeTechForU. You may not copy, modify, reverse engineer, or create derivative 
              works based on our platform.
            </p>
          </section>

          {/* Disclaimers */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              9. Disclaimers & Warranties
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', fontWeight: '600', textTransform: 'uppercase' }}>
              PLEASE READ THIS SECTION CAREFULLY AS IT LIMITS OUR LIABILITY
            </p>
            
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>9.1 No Guaranteed Results</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We do NOT guarantee specific marketing results, patient volume increases, revenue growth, or return 
              on investment (ROI). Marketing outcomes depend on many factors outside our control, including but 
              not limited to market conditions, competition, your practice's reputation, and advertising budgets.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>9.2 Service "AS IS"</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
              OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
              PURPOSE, OR NON-INFRINGEMENT.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>9.3 No Medical Advice</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              WeTechForU does NOT provide medical advice, diagnosis, or treatment. We are a marketing service 
              provider only. All medical decisions remain your responsibility.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>9.4 Third-Party Platforms</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              We are not responsible for outages, policy changes, or issues with third-party platforms (Google, 
              Facebook, Instagram, etc.). These platforms have their own terms and policies that you must comply with.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              10. Limitation of Liability
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', background: '#f8d7da', padding: '15px', borderRadius: '8px', border: '1px solid #dc3545' }}>
              <strong>⚠️ IMPORTANT LIMITATION:</strong> TO THE MAXIMUM EXTENT PERMITTED BY LAW, WETECHFORU SHALL 
              NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING 
              BUT NOT LIMITED TO LOST PROFITS, LOST REVENUE, LOST PATIENTS, OR BUSINESS INTERRUPTION, EVEN IF WE 
              HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              IN NO EVENT SHALL WETECHFORU'S TOTAL LIABILITY TO YOU FOR ALL CLAIMS EXCEED THE AMOUNT YOU PAID TO 
              US IN THE 12 MONTHS PRIOR TO THE EVENT GIVING RISE TO LIABILITY.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              Some jurisdictions do not allow the exclusion or limitation of certain damages, so some of the above 
              limitations may not apply to you.
            </p>
          </section>

          {/* Indemnification */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              11. Indemnification
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              You agree to indemnify, defend, and hold harmless WeTechForU, its officers, directors, employees, 
              and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney 
              fees) arising from:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px' }}>
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any laws or regulations</li>
              <li>Your violation of third-party rights (intellectual property, privacy, etc.)</li>
              <li>Content you provide to us</li>
              <li>Your healthcare practice operations (we are NOT responsible for medical malpractice)</li>
              <li>Patient complaints or claims related to your services</li>
            </ul>
          </section>

          {/* Dispute Resolution */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              12. Dispute Resolution & Governing Law
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>12.1 Informal Resolution</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Before filing any legal claim, you agree to first contact us at info@wetechforu.com to attempt to 
              resolve the dispute informally. We will work in good faith to resolve the matter within 30 days.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>12.2 Binding Arbitration</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Any dispute that cannot be resolved informally shall be resolved through binding arbitration in 
              accordance with the rules of the American Arbitration Association (AAA). The arbitration shall be 
              conducted in English, and the arbitrator's decision shall be final and binding.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>12.3 Governing Law</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              These Terms shall be governed by the laws of the State of California, without regard to its conflict 
              of law provisions.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>12.4 Class Action Waiver</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              You agree that any dispute resolution proceedings will be conducted only on an individual basis and 
              not in a class, consolidated, or representative action.
            </p>
          </section>

          {/* Miscellaneous */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              13. Miscellaneous Provisions
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>13.1 Entire Agreement:</strong> These Terms, together with our Privacy Policy, constitute 
              the entire agreement between you and WeTechForU regarding the Service.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>13.2 Severability:</strong> If any provision of these Terms is found to be unenforceable, 
              the remaining provisions shall remain in full force and effect.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>13.3 No Waiver:</strong> Our failure to enforce any right or provision of these Terms shall 
              not constitute a waiver of that right or provision.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>13.4 Assignment:</strong> You may not assign or transfer these Terms without our written 
              consent. We may assign these Terms without restriction.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>13.5 Force Majeure:</strong> We shall not be liable for any failure or delay in performance 
              due to circumstances beyond our reasonable control.
            </p>
          </section>

          {/* Contact */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              14. Contact Information
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              For questions about these Terms of Service, please contact us:
            </p>
            <div style={{ background: '#e7f3ff', padding: '20px', borderRadius: '8px', border: '1px solid #2E86AB' }}>
              <p style={{ margin: '5px 0', color: '#2E86AB', fontWeight: '600' }}>
                <strong>WeTechForU</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Email: info@wetechforu.com
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Website: www.marketingby.wetechforu.com
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Phone: Available upon request
              </p>
            </div>
          </section>

          {/* Back Button */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
              style={{
                padding: '14px 32px',
                fontSize: '1.1rem',
                fontWeight: '600',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #2E86AB 0%, #4A90E2 100%)',
                border: 'none',
                color: 'white',
                boxShadow: '0 4px 15px rgba(46, 134, 171, 0.3)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(46, 134, 171, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(46, 134, 171, 0.3)';
              }}
            >
              <i className="fas fa-home me-2"></i>
              Return to Home
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: '#2E86AB',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        marginTop: '40px'
      }}>
        <p style={{ margin: '0', fontSize: '0.9rem', opacity: 0.9 }}>
          © 2025 WeTechForU. All rights reserved. | <a href="/privacy-policy" style={{ color: 'white', textDecoration: 'underline' }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

