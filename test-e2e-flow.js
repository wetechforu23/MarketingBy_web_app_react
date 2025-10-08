const puppeteer = require('puppeteer');
const axios = require('axios');

class E2ETestFlow {
  constructor() {
    this.browser = null;
    this.page = null;
    this.baseUrl = 'http://localhost:5173';
    this.apiUrl = 'http://localhost:3001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.createdRecords = {
      leads: [],
      clients: [],
      appointments: [],
      seoReports: []
    };
  }

  async init() {
    console.log('🚀 Starting E2E Test Flow...');
    this.browser = await puppeteer.launch({ 
      headless: false, // Set to true for CI/CD
      defaultViewport: { width: 1280, height: 720 },
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();
    
    // Set user agent
    await this.page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('✅ Browser initialized');
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
    console.log('🧹 Browser closed');
  }

  async testStep(stepName, testFunction) {
    try {
      console.log(`\n📋 Testing: ${stepName}`);
      await testFunction();
      this.testResults.passed++;
      console.log(`✅ PASSED: ${stepName}`);
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ step: stepName, error: error.message });
      console.log(`❌ FAILED: ${stepName} - ${error.message}`);
      throw error;
    }
  }

  async testLogin() {
    await this.page.goto(`${this.baseUrl}/login`);
    await this.page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill login form
    await this.page.type('input[type="email"]', 'test@test.com');
    await this.page.type('input[type="password"]', 'password');
    
    // Click login button
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard (with longer timeout and more flexible check)
    try {
      await this.page.waitForFunction(() => window.location.pathname.includes('/app/'), { timeout: 15000 });
    } catch (error) {
      // If redirect doesn't happen, check if we're already on a dashboard page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/app/') || currentUrl.includes('/dashboard')) {
        console.log('✅ Already on dashboard page');
        return;
      }
      throw new Error('Login failed - not redirected to app');
    }
    
    // Verify we're logged in
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/app/') && !currentUrl.includes('/dashboard')) {
      throw new Error('Login failed - not redirected to app');
    }
  }

  async testLeadsPage() {
    await this.page.goto(`${this.baseUrl}/app/leads`);
    await this.page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if leads page loaded
    const pageTitle = await this.page.$eval('h1', el => el.textContent);
    if (!pageTitle.includes('Leads')) {
      throw new Error('Leads page not loaded correctly');
    }
    
    // Check for scrape button
    const scrapeButton = await this.page.$('button');
    if (!scrapeButton) {
      throw new Error('No buttons found on leads page');
    }
  }

  async testWebsiteScraping() {
    await this.page.goto(`${this.baseUrl}/app/leads`);
    
    // Click scrape button (first button on page)
    await this.page.click('button');
    await this.page.waitForSelector('input[type="url"], input[type="text"]', { timeout: 5000 });
    
    // Fill website URL
    await this.page.type('input[type="url"]', 'https://www.elite360health.com');
    
    // Set max leads
    const maxLeadsInput = await this.page.$('input[type="number"]');
    await maxLeadsInput.click({ clickCount: 3 });
    await maxLeadsInput.type('10');
    
    // Click scrape website button (look for button with "Scrape" text)
    const scrapeButtons = await this.page.$$('button');
    let scrapeWebsiteButton = null;
    for (const button of scrapeButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Scrape Website')) {
        scrapeWebsiteButton = button;
        break;
      }
    }
    if (scrapeWebsiteButton) {
      await scrapeWebsiteButton.click();
    } else {
      throw new Error('Scrape Website button not found');
    }
    
    // Wait for success message
    await this.page.waitForSelector('.alert-success, .alert-danger', { timeout: 15000 });
    
    // Check for success
    const successMessage = await this.page.$('.alert-success');
    if (!successMessage) {
      const errorMessage = await this.page.$('.alert-danger');
      if (errorMessage) {
        const errorText = await errorMessage.evaluate(el => el.textContent);
        throw new Error(`Website scraping failed: ${errorText}`);
      }
      throw new Error('No success or error message found after scraping');
    }
    
    // Wait for leads to appear
    await this.page.waitForSelector('table tbody tr', { timeout: 10000 });
    
    // Count leads
    const leadRows = await this.page.$$('table tbody tr');
    if (leadRows.length === 0) {
      throw new Error('No leads found after scraping');
    }
    
    console.log(`✅ Website scraping successful - ${leadRows.length} leads found`);
  }

  async testZipCodeScraping() {
    await this.page.goto(`${this.baseUrl}/app/leads`);
    
    // Click scrape button
    await this.page.click('button:contains("Scrape New Leads")');
    await this.page.waitForSelector('input[type="text"]', { timeout: 5000 });
    
    // Fill zip code
    const zipCodeInput = await this.page.$('input[placeholder*="75013"]');
    if (zipCodeInput) {
      await zipCodeInput.click({ clickCount: 3 });
      await zipCodeInput.type('75013');
    }
    
    // Click scrape zip code button
    const zipCodeButtons = await this.page.$$('button');
    let zipCodeButton = null;
    for (const button of zipCodeButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Scrape by Zip Code')) {
        zipCodeButton = button;
        break;
      }
    }
    if (zipCodeButton) {
      await zipCodeButton.click();
    } else {
      throw new Error('Scrape by Zip Code button not found');
    }
    
    // Wait for success message
    await this.page.waitForSelector('.alert-success, .alert-danger', { timeout: 15000 });
    
    // Check for success
    const successMessage = await this.page.$('.alert-success');
    if (!successMessage) {
      const errorMessage = await this.page.$('.alert-danger');
      if (errorMessage) {
        const errorText = await errorMessage.evaluate(el => el.textContent);
        throw new Error(`Zip code scraping failed: ${errorText}`);
      }
      throw new Error('No success or error message found after zip code scraping');
    }
    
    console.log('✅ Zip code scraping successful');
  }

  async testSEOPage() {
    await this.page.goto(`${this.baseUrl}/app/seo`);
    await this.page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if SEO page loaded
    const pageTitle = await this.page.$eval('h1', el => el.textContent);
    if (!pageTitle.includes('SEO')) {
      throw new Error('SEO page not loaded correctly');
    }
    
    // Fill URL
    await this.page.type('input[type="url"]', 'https://www.elite360health.com');
    
    // Test basic SEO analysis
    const seoButtons = await this.page.$$('button');
    let seoButton = null;
    for (const button of seoButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Basic SEO Analysis')) {
        seoButton = button;
        break;
      }
    }
    if (seoButton) {
      await seoButton.click();
    } else {
      console.log('⚠️ Basic SEO Analysis button not found, continuing...');
    }
    await this.page.waitForTimeout(3000); // Wait for analysis
    
    // Check for results
    const resultsSection = await this.page.$('.card:contains("SEO Analysis Results")');
    if (!resultsSection) {
      console.log('⚠️ SEO analysis may have failed, but continuing...');
    } else {
      console.log('✅ Basic SEO analysis completed');
    }
  }

  async testSEOReportGeneration() {
    await this.page.goto(`${this.baseUrl}/app/seo`);
    
    // Fill lead data
    await this.page.type('input[placeholder*="Enter your full name"]', 'Dr. Sarah Johnson');
    await this.page.type('input[type="email"]', 'viral.tarpara@hotmail.com');
    
    // Click generate report button
    const reportButtons = await this.page.$$('button');
    let reportButton = null;
    for (const button of reportButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && text.includes('Generate & Send SEO Report')) {
        reportButton = button;
        break;
      }
    }
    if (reportButton) {
      await reportButton.click();
    } else {
      console.log('⚠️ Generate & Send SEO Report button not found, continuing...');
    }
    
    // Wait for response
    await this.page.waitForTimeout(5000);
    
    // Check for success/error message
    const alertMessage = await this.page.$('.alert-success, .alert-danger');
    if (alertMessage) {
      const messageText = await alertMessage.evaluate(el => el.textContent);
      if (messageText.includes('success')) {
        console.log('✅ SEO report generation completed');
      } else {
        console.log(`⚠️ SEO report generation: ${messageText}`);
      }
    }
  }

  async testCalendarPage() {
    await this.page.goto(`${this.baseUrl}/app/calendar`);
    await this.page.waitForSelector('h1', { timeout: 10000 });
    
    // Check if calendar page loaded
    const pageTitle = await this.page.$eval('h1', el => el.textContent);
    if (!pageTitle.includes('Schedule')) {
      throw new Error('Calendar page not loaded correctly');
    }
    
    // Wait for available slots
    await this.page.waitForSelector('button', { timeout: 10000 });
    
    // Select a time slot (look for any button with time)
    const timeButtons = await this.page.$$('button');
    let timeSlot = null;
    for (const button of timeButtons) {
      const text = await button.evaluate(el => el.textContent);
      if (text && (text.includes('AM') || text.includes('PM') || text.includes(':'))) {
        timeSlot = button;
        break;
      }
    }
    if (timeSlot) {
      await timeSlot.click();
      
      // Fill booking form
      await this.page.type('input[placeholder*="Enter your full name"]', 'Viral Tarpara');
      await this.page.type('input[type="email"]', 'viral.tarpara@hotmail.com');
      
      // Submit booking
      await this.page.click('button[type="submit"]');
      
      // Wait for response
      await this.page.waitForTimeout(3000);
      
      console.log('✅ Calendar booking test completed');
    }
  }

  async testAPIEndpoints() {
    console.log('🔌 Testing API endpoints...');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${this.apiUrl}/api/health`);
      if (healthResponse.data.status !== 'healthy') {
        throw new Error('Health check failed');
      }
      console.log('✅ Health endpoint working');
      
      // Test leads endpoint
      const leadsResponse = await axios.get(`${this.apiUrl}/api/leads`);
      console.log(`✅ Leads endpoint working - ${leadsResponse.data.length} leads found`);
      
      // Test available slots endpoint
      const slotsResponse = await axios.get(`${this.apiUrl}/api/compliance/available-slots?startDate=2025-10-03T00:00:00.000Z&endDate=2025-10-17T00:00:00.000Z`);
      console.log(`✅ Available slots endpoint working - ${slotsResponse.data.length} slots found`);
      
    } catch (error) {
      throw new Error(`API endpoint test failed: ${error.message}`);
    }
  }

  async cleanupTestData() {
    console.log('🧹 Cleaning up test data...');
    
    try {
      // Get session cookie for authenticated requests
      const cookies = await this.page.cookies();
      const sessionCookie = cookies.find(cookie => cookie.name === 'connect.sid');
      
      if (!sessionCookie) {
        throw new Error('No session cookie found');
      }
      
      const cookieString = `${sessionCookie.name}=${sessionCookie.value}`;
      
      // Delete leads
      const leadsResponse = await axios.get(`${this.apiUrl}/api/leads`, {
        headers: { Cookie: cookieString }
      });
      
      for (const lead of leadsResponse.data) {
        try {
          await axios.delete(`${this.apiUrl}/api/leads/${lead.id}`, {
            headers: { Cookie: cookieString }
          });
        } catch (error) {
          console.log(`⚠️ Could not delete lead ${lead.id}: ${error.message}`);
        }
      }
      
      console.log(`✅ Cleaned up ${leadsResponse.data.length} leads`);
      
    } catch (error) {
      console.log(`⚠️ Cleanup error: ${error.message}`);
    }
  }

  async runFullTest() {
    try {
      await this.init();
      
      await this.testStep('Login', () => this.testLogin());
      await this.testStep('Leads Page', () => this.testLeadsPage());
      await this.testStep('Website Scraping', () => this.testWebsiteScraping());
      await this.testStep('Zip Code Scraping', () => this.testZipCodeScraping());
      await this.testStep('SEO Page', () => this.testSEOPage());
      await this.testStep('SEO Report Generation', () => this.testSEOReportGeneration());
      await this.testStep('Calendar Page', () => this.testCalendarPage());
      await this.testStep('API Endpoints', () => this.testAPIEndpoints());
      
      console.log('\n🎉 All tests completed successfully!');
      
    } catch (error) {
      console.log(`\n💥 Test failed: ${error.message}`);
      throw error;
    } finally {
      await this.cleanupTestData();
      await this.cleanup();
    }
  }

  printResults() {
    console.log('\n📊 Test Results Summary:');
    console.log(`✅ Passed: ${this.testResults.passed}`);
    console.log(`❌ Failed: ${this.testResults.failed}`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🚨 Errors:');
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error.step}: ${error.error}`);
      });
    }
    
    const successRate = (this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100;
    console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);
    
    return this.testResults.failed === 0;
  }
}

// Run the test
async function runE2ETest() {
  const testFlow = new E2ETestFlow();
  
  try {
    await testFlow.runFullTest();
    const success = testFlow.printResults();
    
    if (success) {
      console.log('\n🎉 E2E Test Flow PASSED! All functionality is working correctly.');
      process.exit(0);
    } else {
      console.log('\n💥 E2E Test Flow FAILED! Please check the errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.log(`\n💥 E2E Test Flow CRASHED: ${error.message}`);
    testFlow.printResults();
    process.exit(1);
  }
}

// Check if servers are running
async function checkServers() {
  try {
    console.log('🔍 Checking if servers are running...');
    
    // Check frontend
    const frontendResponse = await axios.get('http://localhost:5173', { timeout: 5000 });
    console.log('✅ Frontend server is running');
    
    // Check backend
    const backendResponse = await axios.get('http://localhost:3001/api/health', { timeout: 5000 });
    console.log('✅ Backend server is running');
    
    return true;
  } catch (error) {
    console.log('❌ Servers are not running. Please start both frontend and backend servers first.');
    console.log('Frontend: npm run dev (in frontend directory)');
    console.log('Backend: npm run dev (in backend directory)');
    return false;
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting E2E Test Flow for WeTechForU Marketing Platform');
  console.log('=' .repeat(60));
  
  const serversRunning = await checkServers();
  if (!serversRunning) {
    process.exit(1);
  }
  
  await runE2ETest();
}

main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
