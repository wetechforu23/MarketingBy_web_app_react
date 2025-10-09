import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
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
            Privacy Policy
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
              1. Introduction & Your Privacy Rights
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>WeTechForU</strong> ("we," "us," or "our") respects your privacy and is committed to protecting 
              your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard 
              your information when you use our healthcare marketing platform at <strong>www.marketingby.wetechforu.com</strong>.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <strong>⚠️ IMPORTANT HIPAA NOTICE:</strong> WeTechForU is a marketing service provider and is NOT a 
              HIPAA Covered Entity or Business Associate. We do NOT handle, store, or process Protected Health 
              Information (PHI). You must NOT provide us with any patient information, medical records, or PHI.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              By using our Service, you agree to the collection and use of information in accordance with this policy. 
              If you do not agree with this policy, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              2. Information We Collect
            </h2>
            
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>2.1 Information You Provide Directly</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Account Registration:</strong> Name, email address, phone number, business name, address</li>
              <li><strong>Business Information:</strong> Practice details, services offered, operating hours, target audience</li>
              <li><strong>Payment Information:</strong> Processed securely through Stripe (we do not store full credit card numbers)</li>
              <li><strong>Marketing Materials:</strong> Logos, photos, brand guidelines, website content</li>
              <li><strong>Communications:</strong> Emails, support tickets, feedback, and correspondence with us</li>
              <li><strong>Platform Access Credentials:</strong> Access tokens for Facebook, Instagram, Google (stored encrypted)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>2.2 Information Collected Automatically</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system, device identifiers</li>
              <li><strong>Cookies & Similar Technologies:</strong> Session cookies, preference cookies, analytics cookies</li>
              <li><strong>Marketing Performance Data:</strong> Ad impressions, clicks, conversions, engagement metrics (aggregated)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>2.3 Information from Third-Party Platforms</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Data from Facebook, Instagram, Google Ads (campaign performance, audience insights - NO personal patient data)</li>
              <li>Google Analytics data (aggregated website traffic and behavior)</li>
              <li>Social media engagement metrics (likes, shares, comments - public data only)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', background: '#f8d7da', padding: '15px', borderRadius: '8px', border: '1px solid #dc3545' }}>
              <strong>🚫 WHAT WE DO NOT COLLECT:</strong> We do NOT collect, store, or process Protected Health 
              Information (PHI), patient names, medical records, diagnoses, treatment information, or any other 
              individually identifiable health information. You must never provide us with such information.
            </p>
          </section>

          {/* How We Use Information */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              3. How We Use Your Information
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We use the information we collect for the following purposes:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li><strong>Service Delivery:</strong> Provide, operate, and maintain our marketing services</li>
              <li><strong>Account Management:</strong> Create and manage your account, process payments, communicate with you</li>
              <li><strong>Marketing Campaigns:</strong> Create, manage, and optimize your social media and advertising campaigns</li>
              <li><strong>Performance Reporting:</strong> Generate analytics and performance reports</li>
              <li><strong>Customer Support:</strong> Respond to your inquiries, troubleshoot issues, provide technical assistance</li>
              <li><strong>Service Improvement:</strong> Analyze usage patterns to improve our platform and services</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations, prevent fraud, enforce our Terms</li>
              <li><strong>Communication:</strong> Send service updates, billing notices, and (with your consent) marketing communications</li>
            </ul>
          </section>

          {/* Legal Basis for Processing (GDPR/CCPA) */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              4. Legal Basis for Processing (GDPR & State Privacy Laws)
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We process your personal information based on the following legal grounds:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li><strong>Contract Performance:</strong> Processing necessary to provide our services under our agreement with you</li>
              <li><strong>Consent:</strong> You have given explicit consent for specific processing activities (e.g., marketing emails)</li>
              <li><strong>Legitimate Interests:</strong> Processing necessary for our legitimate business interests (service improvement, security)</li>
              <li><strong>Legal Obligations:</strong> Processing required to comply with laws and regulations</li>
            </ul>
          </section>

          {/* Information Sharing */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              5. How We Share Your Information
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We do NOT sell your personal information. We may share your information in the following circumstances:
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>5.1 Service Providers</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Payment Processors:</strong> Stripe (for secure payment processing)</li>
              <li><strong>Cloud Infrastructure:</strong> Heroku, AWS (for hosting and data storage)</li>
              <li><strong>Email Services:</strong> For transactional and service-related emails</li>
              <li><strong>Analytics:</strong> Google Analytics (aggregated data only)</li>
              <li>All service providers are contractually bound to protect your data and use it only for specified purposes</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>5.2 Marketing Platforms</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Facebook, Instagram, Google Ads - as necessary to manage your campaigns</li>
              <li>We only share information necessary to execute marketing activities (business details, ad content)</li>
              <li>Subject to each platform's own privacy policy and terms of service</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>5.3 Legal Requirements</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>When required by law, court order, or government regulation</li>
              <li>To protect our rights, property, or safety, or that of others</li>
              <li>To enforce our Terms of Service or investigate violations</li>
              <li>In connection with a merger, acquisition, or sale of assets (with notice to you)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>5.4 With Your Consent</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              We may share your information for any other purpose with your explicit consent.
            </p>
          </section>

          {/* Data Security */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              6. Data Security & Protection
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We implement industry-standard security measures to protect your information:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li><strong>Encryption:</strong> Data in transit (TLS/SSL) and at rest (AES-256)</li>
              <li><strong>Access Controls:</strong> Role-based access, multi-factor authentication for staff</li>
              <li><strong>Secure Infrastructure:</strong> SOC 2 certified hosting providers (Heroku, AWS)</li>
              <li><strong>Regular Audits:</strong> Security assessments and vulnerability testing</li>
              <li><strong>Employee Training:</strong> Regular security awareness training for all team members</li>
              <li><strong>Incident Response:</strong> Documented procedures for security breach response</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <strong>⚠️ No Absolute Security:</strong> While we strive to protect your information, no method of 
              transmission or storage is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              7. Data Retention
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We retain your personal information for as long as necessary to:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Provide our services to you</li>
              <li>Comply with legal obligations (tax records: 7 years, financial records: 7 years)</li>
              <li>Resolve disputes and enforce our agreements</li>
              <li>Maintain business records and backups</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>After Account Termination:</strong> We will delete or anonymize your personal information 
              within 30 days, except where required by law to retain it longer. Marketing content we created for 
              you may be retained in our portfolio (with identifying information removed if you request).
            </p>
          </section>

          {/* Your Privacy Rights */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              8. Your Privacy Rights
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Depending on your location, you may have the following rights:
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.1 All Users (General Rights)</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal information</li>
              <li><strong>Opt-Out:</strong> Opt-out of marketing communications (click "unsubscribe" in emails)</li>
              <li><strong>Account Closure:</strong> Close your account at any time</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.2 California Residents (CCPA/CPRA Rights)</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Right to Know:</strong> What personal information we collect, use, and share</li>
              <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
              <li><strong>Right to Opt-Out:</strong> Opt-out of the "sale" or "sharing" of personal information (Note: We do NOT sell your information)</li>
              <li><strong>Right to Non-Discrimination:</strong> We will not discriminate against you for exercising your rights</li>
              <li><strong>Right to Limit:</strong> Limit use of sensitive personal information</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.3 European Union Residents (GDPR Rights)</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Right of Access:</strong> Obtain confirmation and a copy of your data</li>
              <li><strong>Right to Rectification:</strong> Correct inaccurate data</li>
              <li><strong>Right to Erasure ("Right to be Forgotten"):</strong> Request deletion</li>
              <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
              <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
              <li><strong>Right to Withdraw Consent:</strong> Withdraw consent at any time (where processing is based on consent)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>8.4 Other U.S. State Residents</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Residents of Virginia (VCDPA), Colorado (CPA), Connecticut (CTDPA), and other states with privacy laws 
              have similar rights to access, correct, delete, and opt-out of data processing.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>To Exercise Your Rights:</strong>
            </p>
            <div style={{ background: '#e7f3ff', padding: '15px', borderRadius: '8px', border: '1px solid #2E86AB' }}>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Email us at: <strong style={{ color: '#2E86AB' }}>info@wetechforu.com</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Subject line: "Privacy Rights Request"
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                We will respond within 30 days (or as required by applicable law)
              </p>
            </div>
          </section>

          {/* Cookies */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              9. Cookies & Tracking Technologies
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We use cookies and similar technologies to enhance your experience:
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>9.1 Types of Cookies We Use</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Essential Cookies:</strong> Required for the Service to function (login sessions, security)</li>
              <li><strong>Performance Cookies:</strong> Help us understand how you use the Service (Google Analytics)</li>
              <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
              <li><strong>Advertising Cookies:</strong> Used to deliver relevant ads (if applicable)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>9.2 Managing Cookies</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              You can control cookies through your browser settings. However, disabling cookies may affect the 
              functionality of the Service. Most browsers allow you to:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>View and delete cookies</li>
              <li>Block third-party cookies</li>
              <li>Block all cookies (not recommended for our Service)</li>
              <li>Clear cookies when you close your browser</li>
            </ul>
          </section>

          {/* Marketing Communications */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              10. Marketing Communications & Opt-Out Rights
            </h2>
            
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>10.1 Types of Communications</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Transactional Emails:</strong> Service updates, billing notices, account notifications (you cannot opt-out of these)</li>
              <li><strong>Marketing Emails:</strong> Promotional offers, tips, newsletters (you CAN opt-out)</li>
              <li><strong>SMS/Text Messages:</strong> Only with your express consent (opt-in required)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>10.2 Opt-In for Marketing Communications</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', background: '#d4edda', padding: '15px', borderRadius: '8px', border: '1px solid #28a745' }}>
              <strong>✅ OPT-IN REQUIRED:</strong> We will only send you marketing emails and text messages if you 
              explicitly consent during registration or through a preference center. You can opt-in by:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Checking the "I agree to receive marketing communications" box during sign-up</li>
              <li>Subscribing through our website or preference center</li>
              <li>Texting a keyword to opt-in (for SMS marketing)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>10.3 Opt-Out / Unsubscribe</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              You can opt-out of marketing communications at any time:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li><strong>Email:</strong> Click the "Unsubscribe" link at the bottom of any marketing email</li>
              <li><strong>SMS:</strong> Reply "STOP" to any marketing text message</li>
              <li><strong>Account Settings:</strong> Update your communication preferences in your account dashboard</li>
              <li><strong>Email Us:</strong> Send a request to info@wetechforu.com</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              We will process opt-out requests within 10 business days. Note: Even after opting out of marketing, 
              you will still receive transactional emails related to your account and services.
            </p>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>10.4 CAN-SPAM & TCPA Compliance</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We comply with the CAN-SPAM Act (email) and TCPA (text messages):
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px' }}>
              <li>All marketing emails include our physical mailing address</li>
              <li>Subject lines accurately reflect email content (no deceptive headers)</li>
              <li>Marketing emails are clearly identified as advertisements</li>
              <li>Opt-out links are clear, conspicuous, and functional for 30 days after sending</li>
              <li>SMS marketing requires express written consent</li>
              <li>We honor opt-out requests within 10 business days</li>
            </ul>
          </section>

          {/* HIPAA Compliance Notice */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              11. HIPAA Compliance Notice for Healthcare Practices
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', background: '#f8d7da', padding: '20px', borderRadius: '8px', border: '2px solid #dc3545', fontWeight: '600' }}>
              <strong>🚫 CRITICAL NOTICE: WE ARE NOT A HIPAA BUSINESS ASSOCIATE</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>11.1 Our Role & Limitations</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>WeTechForU provides <strong>marketing services ONLY</strong></li>
              <li>We are <strong>NOT</strong> a HIPAA Covered Entity</li>
              <li>We are <strong>NOT</strong> a HIPAA Business Associate</li>
              <li>We do <strong>NOT</strong> enter into Business Associate Agreements (BAAs)</li>
              <li>We do <strong>NOT</strong> handle, access, store, or process Protected Health Information (PHI)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>11.2 What is PHI? (What You Must NEVER Share With Us)</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Protected Health Information (PHI) includes ANY individually identifiable health information, such as:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Patient names, addresses, phone numbers, email addresses</li>
              <li>Medical record numbers, account numbers, Social Security numbers</li>
              <li>Dates of birth, dates of service, admission/discharge dates</li>
              <li>Photos, fingerprints, or other biometric identifiers</li>
              <li>Diagnoses, treatment information, lab results, prescriptions</li>
              <li>Insurance information, payment history</li>
              <li>Any other information that could identify a patient</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>11.3 Your HIPAA Responsibilities</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', background: '#fff3cd', padding: '15px', borderRadius: '8px', border: '1px solid #ffc107' }}>
              <strong>⚠️ YOU (the healthcare provider) are solely responsible for:</strong>
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>Maintaining your own HIPAA compliance program</li>
              <li>Ensuring all marketing content we create complies with HIPAA</li>
              <li>Removing all PHI from materials you provide to us</li>
              <li>Obtaining proper patient authorizations for testimonials, photos, or case studies</li>
              <li>Securing your own patient data and communications</li>
              <li>Training your staff on HIPAA privacy and security rules</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>11.4 Marketing Content & HIPAA</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              When we create marketing content (social posts, ads, blog posts):
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '20px' }}>
              <li>✅ <strong>We CAN</strong> promote your services, specialties, and general health education</li>
              <li>✅ <strong>We CAN</strong> use stock photos and generic testimonials</li>
              <li>✅ <strong>We CAN</strong> advertise your practice location, hours, and contact information</li>
              <li>❌ <strong>We CANNOT</strong> use patient-specific information without proper authorization</li>
              <li>❌ <strong>We CANNOT</strong> guarantee HIPAA compliance of your internal practices</li>
              <li>❌ <strong>You MUST NOT</strong> provide us with PHI (even accidentally)</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              <strong>11.5 What Happens If You Accidentally Share PHI With Us?</strong>
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              If you accidentally provide us with PHI:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Notify us immediately at info@wetechforu.com</li>
              <li>We will delete/destroy the PHI upon notification</li>
              <li>We will confirm deletion in writing within 5 business days</li>
              <li>YOU remain responsible for any HIPAA breach notification requirements</li>
              <li>YOU must notify affected patients and the HHS Office for Civil Rights if required</li>
            </ul>

            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px', background: '#f8d7da', padding: '15px', borderRadius: '8px', border: '1px solid #dc3545' }}>
              <strong>⚠️ DISCLAIMER:</strong> WeTechForU assumes NO liability for HIPAA violations, patient data 
              breaches, or privacy incidents related to your healthcare practice. You must maintain your own HIPAA 
              compliance and cyber liability insurance.
            </p>
          </section>

          {/* Children's Privacy */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              12. Children's Privacy (COPPA)
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Our Service is not directed to individuals under the age of 18. We do not knowingly collect personal 
              information from children under 18. If you are a parent or guardian and believe your child has provided 
              us with personal information, please contact us immediately at info@wetechforu.com, and we will delete 
              the information.
            </p>
          </section>

          {/* International Users */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              13. International Users & Data Transfers
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              Our Service is based in the United States. If you access the Service from outside the U.S., your 
              information will be transferred to, stored in, and processed in the United States. By using the Service, 
              you consent to this transfer.
            </p>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              For EU/EEA users: We rely on Standard Contractual Clauses (SCCs) and adequacy decisions for international 
              data transfers. Your data is protected by appropriate safeguards.
            </p>
          </section>

          {/* Changes to Policy */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              14. Changes to This Privacy Policy
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              We may update this Privacy Policy from time to time. We will notify you of material changes by:
            </p>
            <ul style={{ lineHeight: '1.8', color: '#495057', paddingLeft: '30px', marginBottom: '15px' }}>
              <li>Posting the updated policy on this page with a new "Last Updated" date</li>
              <li>Sending an email notification to your registered email address</li>
              <li>Displaying a prominent notice on our website</li>
            </ul>
            <p style={{ lineHeight: '1.8', color: '#495057' }}>
              Your continued use of the Service after changes are posted constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact Us */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              15. Contact Us & Data Protection Officer
            </h2>
            <p style={{ lineHeight: '1.8', color: '#495057', marginBottom: '15px' }}>
              For questions, concerns, or requests regarding this Privacy Policy or your personal information:
            </p>
            <div style={{ background: '#e7f3ff', padding: '20px', borderRadius: '8px', border: '1px solid #2E86AB' }}>
              <p style={{ margin: '5px 0', color: '#2E86AB', fontWeight: '600' }}>
                <strong>WeTechForU - Privacy Team</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Email: <strong>info@wetechforu.com</strong>
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Subject: "Privacy Inquiry" or "Privacy Rights Request"
              </p>
              <p style={{ margin: '5px 0', color: '#495057' }}>
                Website: www.marketingby.wetechforu.com
              </p>
              <p style={{ margin: '5px 0', color: '#495057', marginTop: '10px', fontSize: '0.9rem', fontStyle: 'italic' }}>
                We will respond to all privacy requests within 30 days (or as required by applicable law)
              </p>
            </div>

            <p style={{ lineHeight: '1.8', color: '#495057', marginTop: '20px' }}>
              <strong>For EU/EEA Residents:</strong> You also have the right to lodge a complaint with your local 
              data protection authority if you believe your privacy rights have been violated.
            </p>
          </section>

          {/* Summary Table */}
          <section style={{ marginBottom: '40px' }}>
            <h2 style={{ color: '#2E86AB', fontSize: '1.8rem', marginBottom: '20px' }}>
              Quick Reference Summary
            </h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #dee2e6' }}>
                <thead>
                  <tr style={{ background: '#2E86AB', color: 'white' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>What We Do</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #dee2e6' }}>What We Don't Do</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                      ✅ Collect business contact information<br/>
                      ✅ Use data to provide marketing services<br/>
                      ✅ Protect your data with encryption<br/>
                      ✅ Honor opt-out requests<br/>
                      ✅ Comply with privacy laws (CCPA, GDPR, etc.)<br/>
                      ✅ Provide data access/deletion upon request
                    </td>
                    <td style={{ padding: '12px', border: '1px solid #dee2e6', verticalAlign: 'top' }}>
                      ❌ Sell your personal information<br/>
                      ❌ Handle Protected Health Information (PHI)<br/>
                      ❌ Act as a HIPAA Business Associate<br/>
                      ❌ Share data with unauthorized parties<br/>
                      ❌ Send marketing emails without consent<br/>
                      ❌ Collect information from children under 18
                    </td>
                  </tr>
                </tbody>
              </table>
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
          © 2025 WeTechForU. All rights reserved. | <a href="/terms-of-service" style={{ color: 'white', textDecoration: 'underline' }}>Terms of Service</a>
        </p>
      </div>
    </div>
  );
}

