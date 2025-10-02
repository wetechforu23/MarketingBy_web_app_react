"""
Lead Scraping Service with Compliance
"""

import requests
import time
import logging
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import re
from datetime import datetime

logger = logging.getLogger(__name__)

class LeadScrapingService:
    """Compliance-first lead scraping service"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'WeTechForU-Healthcare-Marketing/1.0 (Healthcare Lead Research)',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
        
        # Compliance settings
        self.rate_limit_delay = 2  # seconds between requests
        self.max_requests_per_domain = 10
        self.request_count = {}
        
        # Blocked domains (healthcare compliance)
        self.blocked_domains = {
            'hipaa-protected-sites.com',
            'medical-records-portal.com',
            'patient-data-system.com'
        }
        
        # Allowed domains for testing
        self.allowed_domains = {
            'elite360health.com',
            'healthcare-marketing-demo.com',
            'medical-practice-example.com'
        }
    
    def check_compliance(self, url: str) -> Dict[str, any]:
        """Check if scraping is compliant for the given URL"""
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            # Check if domain is blocked
            if domain in self.blocked_domains:
                return {
                    'compliant': False,
                    'reason': 'Domain is blocked for HIPAA compliance',
                    'domain': domain
                }
            
            # Check if domain is in allowed list
            if domain not in self.allowed_domains:
                return {
                    'compliant': False,
                    'reason': 'Domain not in allowed list for testing',
                    'domain': domain
                }
            
            # Check robots.txt
            robots_result = self.check_robots_txt(url)
            if not robots_result['allowed']:
                return {
                    'compliant': False,
                    'reason': f"Robots.txt disallows scraping: {robots_result['reason']}",
                    'domain': domain
                }
            
            # Check rate limiting
            if self.request_count.get(domain, 0) >= self.max_requests_per_domain:
                return {
                    'compliant': False,
                    'reason': 'Rate limit exceeded for domain',
                    'domain': domain
                }
            
            return {
                'compliant': True,
                'reason': 'All compliance checks passed',
                'domain': domain,
                'robots_txt': robots_result
            }
            
        except Exception as e:
            logger.error(f"Compliance check error for {url}: {e}")
            return {
                'compliant': False,
                'reason': f'Compliance check failed: {str(e)}',
                'domain': 'unknown'
            }
    
    def check_robots_txt(self, url: str) -> Dict[str, any]:
        """Check robots.txt for scraping permissions"""
        try:
            parsed_url = urlparse(url)
            robots_url = f"{parsed_url.scheme}://{parsed_url.netloc}/robots.txt"
            
            response = self.session.get(robots_url, timeout=10)
            if response.status_code != 200:
                return {'allowed': True, 'reason': 'No robots.txt found'}
            
            robots_content = response.text.lower()
            
            # Check for common blocking patterns
            if 'disallow: /' in robots_content:
                return {'allowed': False, 'reason': 'Robots.txt disallows all scraping'}
            
            if 'disallow: /contact' in robots_content or 'disallow: /about' in robots_content:
                return {'allowed': False, 'reason': 'Contact/about pages blocked'}
            
            return {'allowed': True, 'reason': 'Robots.txt allows scraping'}
            
        except Exception as e:
            logger.warning(f"Could not check robots.txt for {url}: {e}")
            return {'allowed': True, 'reason': 'Could not access robots.txt'}
    
    def scrape_healthcare_website(self, url: str) -> Dict[str, any]:
        """Scrape healthcare website for lead information"""
        try:
            # Compliance check first
            compliance = self.check_compliance(url)
            if not compliance['compliant']:
                return {
                    'success': False,
                    'error': compliance['reason'],
                    'compliance': compliance
                }
            
            # Rate limiting
            domain = compliance['domain']
            self.request_count[domain] = self.request_count.get(domain, 0) + 1
            time.sleep(self.rate_limit_delay)
            
            # Scrape the website
            response = self.session.get(url, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract lead information
            lead_data = self.extract_lead_data(soup, url)
            
            return {
                'success': True,
                'lead_data': lead_data,
                'compliance': compliance,
                'scraped_at': datetime.utcnow().isoformat(),
                'source_url': url
            }
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Request error scraping {url}: {e}")
            return {
                'success': False,
                'error': f'Request failed: {str(e)}',
                'compliance': compliance
            }
        except Exception as e:
            logger.error(f"Unexpected error scraping {url}: {e}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'compliance': compliance
            }
    
    def extract_lead_data(self, soup: BeautifulSoup, url: str) -> Dict[str, any]:
        """Extract lead data from parsed HTML"""
        try:
            lead_data = {
                'website_url': url,
                'business_name': '',
                'email': '',
                'phone': '',
                'address': '',
                'services': [],
                'contact_person': '',
                'industry_category': 'Healthcare',
                'industry_subcategory': '',
                'lead_source': 'web_scraping',
                'status': 'new',
                'notes': f'Scraped from {url} on {datetime.utcnow().strftime("%Y-%m-%d %H:%M")}'
            }
            
            # Extract business name
            business_name = self.extract_business_name(soup)
            if business_name:
                lead_data['business_name'] = business_name
            
            # Extract contact information
            contact_info = self.extract_contact_info(soup)
            lead_data.update(contact_info)
            
            # Extract services
            services = self.extract_services(soup)
            lead_data['services'] = services
            
            # Determine healthcare subcategory
            subcategory = self.determine_healthcare_subcategory(services, soup)
            lead_data['industry_subcategory'] = subcategory
            
            return lead_data
            
        except Exception as e:
            logger.error(f"Error extracting lead data: {e}")
            return {
                'website_url': url,
                'business_name': 'Unknown',
                'error': f'Data extraction failed: {str(e)}'
            }
    
    def extract_business_name(self, soup: BeautifulSoup) -> str:
        """Extract business name from HTML"""
        try:
            # Try various selectors for business name
            selectors = [
                'h1',
                '.business-name',
                '.company-name',
                '.clinic-name',
                'title',
                '[class*="name"]',
                '[class*="title"]'
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                for element in elements:
                    text = element.get_text().strip()
                    if text and len(text) < 100:  # Reasonable business name length
                        return text
            
            return ''
            
        except Exception as e:
            logger.error(f"Error extracting business name: {e}")
            return ''
    
    def extract_contact_info(self, soup: BeautifulSoup) -> Dict[str, str]:
        """Extract contact information from HTML"""
        contact_info = {
            'email': '',
            'phone': '',
            'address': '',
            'contact_person': ''
        }
        
        try:
            text = soup.get_text()
            
            # Extract email
            email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
            emails = re.findall(email_pattern, text)
            if emails:
                contact_info['email'] = emails[0]
            
            # Extract phone
            phone_pattern = r'(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
            phones = re.findall(phone_pattern, text)
            if phones:
                phone = ''.join(phones[0])
                contact_info['phone'] = phone
            
            # Extract address (basic pattern)
            address_pattern = r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)'
            addresses = re.findall(address_pattern, text)
            if addresses:
                contact_info['address'] = addresses[0]
            
            return contact_info
            
        except Exception as e:
            logger.error(f"Error extracting contact info: {e}")
            return contact_info
    
    def extract_services(self, soup: BeautifulSoup) -> List[str]:
        """Extract healthcare services from HTML"""
        services = []
        
        try:
            # Common healthcare service keywords
            service_keywords = [
                'primary care', 'family medicine', 'internal medicine', 'pediatrics',
                'cardiology', 'dermatology', 'orthopedics', 'neurology', 'oncology',
                'radiology', 'emergency medicine', 'surgery', 'anesthesia',
                'physical therapy', 'occupational therapy', 'speech therapy',
                'mental health', 'psychiatry', 'psychology', 'counseling',
                'chiropractic', 'dental', 'vision', 'hearing', 'podiatry',
                'endocrinology', 'gastroenterology', 'urology', 'gynecology',
                'obstetrics', 'fertility', 'weight loss', 'cosmetic surgery',
                'urgent care', 'walk-in clinic', 'telemedicine', 'telehealth'
            ]
            
            text = soup.get_text().lower()
            
            for keyword in service_keywords:
                if keyword in text:
                    services.append(keyword.title())
            
            return list(set(services))  # Remove duplicates
            
        except Exception as e:
            logger.error(f"Error extracting services: {e}")
            return []
    
    def determine_healthcare_subcategory(self, services: List[str], soup: BeautifulSoup) -> str:
        """Determine healthcare subcategory based on services and content"""
        try:
            text = soup.get_text().lower()
            
            # Primary Care
            primary_care_keywords = ['primary care', 'family medicine', 'internal medicine', 'general practice']
            if any(keyword in text for keyword in primary_care_keywords):
                return 'Primary Care'
            
            # Specialized Medicine
            if 'cardiology' in text or 'heart' in text:
                return 'Cardiology'
            elif 'dermatology' in text or 'skin' in text:
                return 'Dermatology'
            elif 'orthopedics' in text or 'bone' in text or 'joint' in text:
                return 'Orthopedics'
            elif 'mental health' in text or 'psychiatry' in text or 'counseling' in text:
                return 'Mental Health'
            elif 'pediatrics' in text or 'children' in text or 'kids' in text:
                return 'Pediatrics'
            elif 'dental' in text or 'dentist' in text:
                return 'Dental'
            elif 'chiropractic' in text:
                return 'Chiropractic'
            elif 'physical therapy' in text or 'rehabilitation' in text:
                return 'Physical Therapy'
            
            # Default to General Healthcare
            return 'General Healthcare'
            
        except Exception as e:
            logger.error(f"Error determining subcategory: {e}")
            return 'General Healthcare'
    
    def get_scraping_report(self) -> Dict[str, any]:
        """Get scraping activity report"""
        return {
            'total_requests': sum(self.request_count.values()),
            'requests_by_domain': self.request_count.copy(),
            'rate_limit_delay': self.rate_limit_delay,
            'max_requests_per_domain': self.max_requests_per_domain,
            'allowed_domains': list(self.allowed_domains),
            'blocked_domains': list(self.blocked_domains)
        }
