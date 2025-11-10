/**
 * Industry-Based Default Form Questions
 * Returns default intro questions based on industry type
 */

export interface IntroQuestion {
  id: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'date';
  question: string;
  required: boolean;
  order: number;
  options?: string[]; // For select type
  placeholder?: string;
}

export function getIndustryDefaultQuestions(industry: string): IntroQuestion[] {
  const baseQuestions: IntroQuestion[] = [
    { id: 'first_name', type: 'text', question: 'What is your first name?', required: true, order: 1 },
    { id: 'last_name', type: 'text', question: 'What is your last name?', required: true, order: 2 },
    { id: 'email', type: 'email', question: 'What is your email address?', required: true, order: 3 },
    { id: 'phone', type: 'tel', question: 'What is your phone number?', required: false, order: 4 }
  ];

  switch (industry) {
    case 'healthcare':
      return [
        ...baseQuestions,
        { id: 'date_of_birth', type: 'date', question: 'What is your date of birth?', required: true, order: 5 },
        { id: 'insurance_provider', type: 'select', question: 'What is your insurance provider?', required: false, order: 6, options: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealthcare', 'Medicaid', 'Medicare', 'Other', 'No Insurance'] },
        { id: 'reason_for_visit', type: 'textarea', question: 'What is the reason for your visit?', required: false, order: 7 },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 8, options: ['Email', 'Phone', 'Text Message'] }
      ];

    case 'dental':
      return [
        ...baseQuestions,
        { id: 'date_of_birth', type: 'date', question: 'What is your date of birth?', required: true, order: 5 },
        { id: 'insurance_provider', type: 'select', question: 'What is your dental insurance provider?', required: false, order: 6, options: ['Delta Dental', 'Cigna', 'Aetna', 'MetLife', 'Guardian', 'Other', 'No Insurance'] },
        { id: 'last_dental_visit', type: 'date', question: 'When was your last dental visit?', required: false, order: 7 },
        { id: 'reason_for_visit', type: 'textarea', question: 'What is the reason for your visit?', required: false, order: 8 },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 9, options: ['Email', 'Phone', 'Text Message'] }
      ];

    case 'legal':
      return [
        ...baseQuestions,
        { id: 'case_type', type: 'select', question: 'What type of legal matter do you need help with?', required: false, order: 5, options: ['Family Law', 'Criminal Defense', 'Personal Injury', 'Business Law', 'Real Estate', 'Estate Planning', 'Other'] },
        { id: 'urgency', type: 'select', question: 'How urgent is your matter?', required: false, order: 6, options: ['Urgent (within 24 hours)', 'Soon (within a week)', 'Not urgent'] },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 7, options: ['Email', 'Phone', 'Text Message'] }
      ];

    case 'finance':
      return [
        ...baseQuestions,
        { id: 'service_interest', type: 'select', question: 'What service are you interested in?', required: false, order: 5, options: ['Investment Advisory', 'Tax Planning', 'Retirement Planning', 'Estate Planning', 'Business Financial Services', 'Other'] },
        { id: 'current_situation', type: 'textarea', question: 'Tell us about your current financial situation', required: false, order: 6 },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 7, options: ['Email', 'Phone', 'Text Message'] }
      ];

    case 'real_estate':
      return [
        ...baseQuestions,
        { id: 'property_interest', type: 'select', question: 'What are you looking for?', required: false, order: 5, options: ['Buying', 'Selling', 'Renting', 'Investment Property', 'Other'] },
        { id: 'budget_range', type: 'select', question: 'What is your budget range?', required: false, order: 6, options: ['Under $200k', '$200k - $500k', '$500k - $1M', '$1M - $2M', 'Over $2M', 'Prefer not to say'] },
        { id: 'location_preference', type: 'text', question: 'What location are you interested in?', required: false, order: 7 },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 8, options: ['Email', 'Phone', 'Text Message'] }
      ];

    case 'ecommerce':
      return [
        ...baseQuestions,
        { id: 'order_number', type: 'text', question: 'Order number (if applicable)', required: false, order: 5 },
        { id: 'inquiry_type', type: 'select', question: 'What is your inquiry about?', required: false, order: 6, options: ['Order Status', 'Product Question', 'Return/Exchange', 'Shipping', 'Payment Issue', 'Other'] },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 7, options: ['Email', 'Phone', 'Text Message'] }
      ];

    case 'education':
      return [
        ...baseQuestions,
        { id: 'program_interest', type: 'select', question: 'What program are you interested in?', required: false, order: 5, options: ['Undergraduate', 'Graduate', 'Certificate Program', 'Online Course', 'Other'] },
        { id: 'start_date', type: 'date', question: 'When would you like to start?', required: false, order: 6 },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 7, options: ['Email', 'Phone', 'Text Message'] }
      ];

    default: // general
      return [
        ...baseQuestions,
        { id: 'company_name', type: 'text', question: 'What is your company name?', required: false, order: 5 },
        { id: 'inquiry_type', type: 'select', question: 'What can we help you with?', required: false, order: 6, options: ['General Inquiry', 'Product/Service Question', 'Support', 'Sales', 'Partnership', 'Other'] },
        { id: 'preferred_contact', type: 'select', question: 'How would you prefer to be contacted?', required: false, order: 7, options: ['Email', 'Phone', 'Text Message'] }
      ];
  }
}

/**
 * Get appointment-related questions based on industry
 */
export function getAppointmentQuestions(industry: string): IntroQuestion[] {
  const baseAppointmentQuestions: IntroQuestion[] = [
    { id: 'appointment_type', type: 'select', question: 'What type of appointment do you need?', required: true, order: 1, options: ['Consultation', 'Follow-up', 'Check-up', 'Other'] },
    { id: 'preferred_date', type: 'date', question: 'What is your preferred date?', required: true, order: 2 },
    { id: 'preferred_time', type: 'select', question: 'What time works best for you?', required: true, order: 3, options: ['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 5 PM)', 'Evening (5 PM - 8 PM)', 'Flexible'] },
    { id: 'reason', type: 'textarea', question: 'What is the reason for your appointment?', required: false, order: 4 },
    { id: 'location_preference', type: 'select', question: 'How would you like to meet?', required: false, order: 5, options: ['In-Person', 'Virtual/Video Call', 'Phone Call'] }
  ];

  switch (industry) {
    case 'healthcare':
    case 'dental':
      return [
        ...baseAppointmentQuestions,
        { id: 'insurance_provider', type: 'select', question: 'What is your insurance provider?', required: false, order: 6, options: ['Blue Cross Blue Shield', 'Aetna', 'Cigna', 'UnitedHealthcare', 'Medicaid', 'Medicare', 'Other', 'No Insurance'] },
        { id: 'insurance_member_id', type: 'text', question: 'Insurance Member ID (if available)', required: false, order: 7 },
        { id: 'symptoms', type: 'textarea', question: 'Please describe any symptoms or concerns', required: false, order: 8 },
        { id: 'special_requirements', type: 'textarea', question: 'Any special requirements or accommodations needed?', required: false, order: 9 }
      ];

    case 'legal':
      return [
        ...baseAppointmentQuestions,
        { id: 'case_type', type: 'select', question: 'What type of legal matter?', required: false, order: 6, options: ['Family Law', 'Criminal Defense', 'Personal Injury', 'Business Law', 'Real Estate', 'Estate Planning', 'Other'] },
        { id: 'urgency', type: 'select', question: 'How urgent is this matter?', required: false, order: 7, options: ['Urgent (within 24 hours)', 'Soon (within a week)', 'Not urgent'] },
        { id: 'case_details', type: 'textarea', question: 'Brief description of your legal matter', required: false, order: 8 }
      ];

    case 'finance':
      return [
        ...baseAppointmentQuestions,
        { id: 'service_interest', type: 'select', question: 'What service are you interested in?', required: false, order: 6, options: ['Investment Advisory', 'Tax Planning', 'Retirement Planning', 'Estate Planning', 'Business Financial Services', 'Other'] },
        { id: 'assets_range', type: 'select', question: 'Approximate assets under management?', required: false, order: 7, options: ['Under $100k', '$100k - $500k', '$500k - $1M', '$1M - $5M', 'Over $5M', 'Prefer not to say'] }
      ];

    case 'real_estate':
      return [
        ...baseAppointmentQuestions,
        { id: 'property_interest', type: 'select', question: 'What are you looking for?', required: false, order: 6, options: ['Buying', 'Selling', 'Renting', 'Investment Property', 'Other'] },
        { id: 'budget_range', type: 'select', question: 'What is your budget range?', required: false, order: 7, options: ['Under $200k', '$200k - $500k', '$500k - $1M', '$1M - $2M', 'Over $2M', 'Prefer not to say'] },
        { id: 'location_preference', type: 'text', question: 'Preferred location?', required: false, order: 8 }
      ];

    default:
      return baseAppointmentQuestions;
  }
}

