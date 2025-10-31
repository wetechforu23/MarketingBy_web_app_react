/**
 * Test file for UTM Tracking Service
 * Run this to verify UTM tracking works before integrating with Facebook posting
 * 
 * To run: npx ts-node backend/src/services/test_utm_tracking.ts
 */

import { UTMTrackingService } from './utmTrackingService';

console.log('🧪 Testing UTM Tracking Service\n');
console.log('='.repeat(80));

// Test Case 1: Single URL in message
console.log('\n📝 Test 1: Single URL in message');
console.log('-'.repeat(80));
const test1 = UTMTrackingService.processPostContent(
  'Check out our new services! https://wetechforu.com/services',
  123,
  'ProMed Healthcare',
  'text'
);
console.log('Original Content:');
console.log('  "Check out our new services! https://wetechforu.com/services"');
console.log('\nTracked Content:');
console.log(`  "${test1.trackedContent}"`);
console.log(`\nCampaign: ${test1.utmCampaign}`);
console.log(`Original URLs: ${test1.originalUrls.length}`);
console.log(`Tracked URLs: ${test1.trackedUrls.length}`);

// Test Case 2: Multiple URLs
console.log('\n\n📝 Test 2: Multiple URLs in message');
console.log('-'.repeat(80));
const test2 = UTMTrackingService.processPostContent(
  'Visit our website https://wetechforu.com and book online https://wetechforu.com/booking',
  123,
  'ProMed Healthcare',
  'text'
);
console.log('Original URLs:', test2.originalUrls);
console.log('Tracked URLs:', test2.trackedUrls);

// Test Case 3: No URLs
console.log('\n\n📝 Test 3: No URLs in message');
console.log('-'.repeat(80));
const test3 = UTMTrackingService.processPostContent(
  'Just a regular post with no links!',
  123,
  'ProMed Healthcare',
  'text'
);
console.log(`Original Content: "${test3.trackedContent}"`);
console.log(`URLs Found: ${test3.originalUrls.length}`);
console.log(`Campaign Generated: ${test3.utmCampaign}`);

// Test Case 4: URL with existing query parameters
console.log('\n\n📝 Test 4: URL with existing parameters');
console.log('-'.repeat(80));
const test4 = UTMTrackingService.processPostContent(
  'Book now: https://wetechforu.com/booking?service=checkup&location=miami',
  123,
  'ProMed Healthcare',
  'text'
);
console.log('Tracked URL:', test4.trackedUrls[0]);

// Test Case 5: Different post types
console.log('\n\n📝 Test 5: Different post types');
console.log('-'.repeat(80));
const imagePost = UTMTrackingService.processPostContent(
  'New photo! Visit: https://wetechforu.com',
  123,
  'ProMed Healthcare',
  'image'
);
const videoPost = UTMTrackingService.processPostContent(
  'Watch our video: https://wetechforu.com/videos',
  123,
  'ProMed Healthcare',
  'video'
);
console.log('Image Post Campaign:', imagePost.utmCampaign);
console.log('Video Post Campaign:', videoPost.utmCampaign);

// Test Case 6: Client name sanitization
console.log('\n\n📝 Test 6: Client name sanitization');
console.log('-'.repeat(80));
const test6 = UTMTrackingService.processPostContent(
  'Visit us! https://example.com',
  456,
  'Dr. Smith\'s Medical Center & Clinic',
  'text'
);
console.log('Client Name: "Dr. Smith\'s Medical Center & Clinic"');
console.log('Sanitized Campaign:', test6.utmCampaign);

// Test Case 7: URL validation
console.log('\n\n📝 Test 7: UTM URL Validation');
console.log('-'.repeat(80));
const validUrl = 'https://example.com?utm_source=facebook&utm_medium=social&utm_campaign=test';
const invalidUrl = 'https://example.com';
console.log('Valid UTM URL:', UTMTrackingService.validateUTMUrl(validUrl));
console.log('Invalid UTM URL:', UTMTrackingService.validateUTMUrl(invalidUrl));

// Test Case 8: Extract UTM params
console.log('\n\n📝 Test 8: Extract UTM Parameters');
console.log('-'.repeat(80));
const params = UTMTrackingService.extractUTMParams(test1.trackedUrls[0]);
console.log('Extracted UTM Parameters:', params);

console.log('\n' + '='.repeat(80));
console.log('✅ All tests completed!');
console.log('='.repeat(80));

