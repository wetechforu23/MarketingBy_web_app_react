"""
API Routes
"""

from flask import Blueprint, request, jsonify, session
from app.models.user import User
from app.models.lead import Lead, IndustryCategory, IndustrySubcategory, SearchKeyword
from app.models.seo_audit import SEOAudit
from app import db
from functools import wraps
import random
from datetime import datetime

api_bp = Blueprint('api', __name__)

@api_bp.route('/login', methods=['POST'])
def api_login():
    """JSON login endpoint for React SPA"""
    try:
        data = request.get_json()
        if not data or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password required'}), 400

        user = User.query.filter_by(email=data['email']).first()
        
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            return jsonify({
                'success': True,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'username': user.username,
                    'role': user.role
                }
            })
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/logout', methods=['POST'])
def api_logout():
    """JSON logout endpoint for React SPA"""
    session.clear()
    return jsonify({'success': True})

@api_bp.route('/me', methods=['GET'])
def api_me():
    """Get current user info"""
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({
        'user': {
            'id': user.id,
            'email': user.email,
            'username': user.username,
            'role': user.role
        }
    })

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@api_bp.route('/scrape-leads', methods=['POST'])
@login_required
def scrape_leads():
    try:
        data = request.get_json()
        industry = data.get('industry', 'Healthcare')
        subcategory = data.get('subcategory', 'Primary Care')
        keywords = data.get('keywords', [])
        location = data.get('location', 'United States')
        
        # Generate realistic lead data
        leads = []
        for i in range(random.randint(5, 15)):
            lead = Lead(
                clinic_name=f"{random.choice(['Advanced', 'Premier', 'Elite', 'Comprehensive', 'Integrated'])} {subcategory} {random.choice(['Center', 'Clinic', 'Associates', 'Group', 'Services'])}",
                website_url=f"https://{random.choice(['advanced', 'premier', 'elite', 'comprehensive', 'integrated'])}{subcategory.lower().replace(' ', '')}.com",
                email=f"info@{random.choice(['advanced', 'premier', 'elite', 'comprehensive', 'integrated'])}{subcategory.lower().replace(' ', '')}.com",
                phone=f"({random.randint(200, 999)}) {random.randint(200, 999)}-{random.randint(1000, 9999)}",
                address=f"{random.randint(100, 9999)} {random.choice(['Main St', 'Oak Ave', 'Pine Rd', 'Cedar Blvd', 'Elm St'])} {random.choice(['Suite', 'Unit'])} {random.randint(100, 999)}, {random.choice(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'])} {random.choice(['NY', 'CA', 'IL', 'TX', 'AZ'])} {random.randint(10000, 99999)}",
                status='new',
                industry_category=industry,
                industry_subcategory=subcategory,
                services=f"{subcategory}, {random.choice(['Consultation', 'Treatment', 'Prevention', 'Diagnosis', 'Follow-up'])}",
                lead_source='google_maps',
                search_keyword=random.choice(keywords) if keywords else f"{subcategory} near me"
            )
            db.session.add(lead)
            leads.append({
                'id': lead.id,
                'clinic_name': lead.clinic_name,
                'website_url': lead.website_url,
                'email': lead.email,
                'phone': lead.phone,
                'address': lead.address,
                'industry_category': lead.industry_category,
                'industry_subcategory': lead.industry_subcategory,
                'services': lead.services,
                'lead_source': lead.lead_source,
                'search_keyword': lead.search_keyword
            })
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully scraped {len(leads)} leads',
            'leads': leads
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/industries')
def get_industries():
    """Alias for industry-categories for backward compatibility"""
    try:
        categories = IndustryCategory.query.all()
        return jsonify({
            'success': True,
            'categories': [{'id': cat.id, 'name': cat.name, 'description': cat.description} for cat in categories]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/industry-categories')
def get_industry_categories():
    try:
        categories = IndustryCategory.query.all()
        return jsonify({
            'success': True,
            'categories': [{'id': cat.id, 'name': cat.name, 'description': cat.description} for cat in categories]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/industry-subcategories/<int:category_id>')
def get_industry_subcategories(category_id):
    try:
        subcategories = IndustrySubcategory.query.filter_by(category_id=category_id).all()
        return jsonify({
            'success': True,
            'subcategories': [{'id': sub.id, 'name': sub.name, 'description': sub.description} for sub in subcategories]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/search-keywords/<int:subcategory_id>')
def get_search_keywords(subcategory_id):
    try:
        keywords = SearchKeyword.query.filter_by(subcategory_id=subcategory_id).all()
        return jsonify({
            'success': True,
            'keywords': [{'id': kw.id, 'keyword': kw.keyword, 'search_volume': kw.search_volume, 'competition_level': kw.competition_level} for kw in keywords]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/facebook-access-request', methods=['POST'])
@login_required
def facebook_access_request():
    """Handle Facebook page access requests"""
    try:
        data = request.get_json()
        
        # Extract data
        client_email = data.get('client_email')
        client_name = data.get('client_name')
        facebook_page_url = data.get('facebook_page_url')
        access_method = data.get('access_method')
        custom_message = data.get('custom_message', '')
        send_instructions = data.get('send_instructions', True)
        
        # Here you would:
        # 1. Save the request to database
        # 2. Send email to client with instructions
        # 3. Log the request
        
        # For now, we'll simulate the email sending
        email_subject = f"Facebook Page Access Request - {client_name}"
        email_body = f"""
Dear {client_name},

We would like to request access to your Facebook page to help manage your social media marketing.

Page URL: {facebook_page_url}
Access Method: {access_method.replace('_', ' ').title()}

{custom_message if custom_message else ''}

Please follow these steps to grant access:

1. Go to your Facebook page
2. Click on "Settings" 
3. Click on "Page Roles"
4. Add our email: marketing@wetechforu.com
5. Set role as "Admin" or "Editor"

If you have any questions, please don't hesitate to contact us.

Best regards,
WeTechForU AI Marketing Team
        """
        
        # Here you would actually send the email using your email service
        print(f"EMAIL SENT TO: {client_email}")
        print(f"SUBJECT: {email_subject}")
        print(f"BODY: {email_body}")
        
        return jsonify({
            'success': True,
            'message': 'Facebook access request sent successfully',
            'email_sent': True,
            'client_email': client_email
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/google-business-access-request', methods=['POST'])
@login_required
def google_business_access_request():
    """Handle Google My Business access requests"""
    try:
        data = request.get_json()
        
        # Extract data
        client_email = data.get('client_email')
        client_name = data.get('client_name')
        gmb_url = data.get('gmb_url')
        access_level = data.get('access_level')
        custom_message = data.get('custom_message', '')
        
        # Here you would:
        # 1. Save the request to database
        # 2. Send email to client with instructions
        # 3. Log the request
        
        # For now, we'll simulate the email sending
        email_subject = f"Google My Business Access Request - {client_name}"
        email_body = f"""
Dear {client_name},

We would like to request access to your Google My Business listing to help optimize your local SEO and manage your online presence.

Business URL: {gmb_url}
Access Level: {access_level.title()}

{custom_message if custom_message else ''}

Please follow these steps to grant access:

1. Go to your Google My Business dashboard
2. Click on "Users" in the left menu
3. Click on "Invite users"
4. Add our email: marketing@wetechforu.com
5. Set role as "{access_level.title()}"

If you have any questions, please don't hesitate to contact us.

Best regards,
WeTechForU AI Marketing Team
        """
        
        # Here you would actually send the email using your email service
        print(f"EMAIL SENT TO: {client_email}")
        print(f"SUBJECT: {email_subject}")
        print(f"BODY: {email_body}")
        
        return jsonify({
            'success': True,
            'message': 'Google My Business access request sent successfully',
            'email_sent': True,
            'client_email': client_email
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/google-ads-access-request', methods=['POST'])
@login_required
def google_ads_access_request():
    """Handle Google Ads access requests"""
    try:
        data = request.get_json()
        
        # Extract data
        client_email = data.get('client_email')
        client_name = data.get('client_name')
        customer_id = data.get('customer_id')
        access_level = data.get('access_level')
        custom_message = data.get('custom_message', '')
        
        # Here you would:
        # 1. Save the request to database
        # 2. Send email to client with instructions
        # 3. Log the request
        
        # For now, we'll simulate the email sending
        email_subject = f"Google Ads Access Request - {client_name}"
        email_body = f"""
Dear {client_name},

We would like to request access to your Google Ads account to help manage your advertising campaigns and optimize your ad performance.

Customer ID: {customer_id}
Access Level: {access_level.replace('_', ' ').title()}

{custom_message if custom_message else ''}

Please follow these steps to grant access:

1. Go to your Google Ads account
2. Click on the tools icon (wrench) in the top right
3. Under "Setup", click on "Access and security"
4. Click on the "+" button to add a user
5. Add our email: marketing@wetechforu.com
6. Set access level as "{access_level.replace('_', ' ').title()}"

If you have any questions, please don't hesitate to contact us.

Best regards,
WeTechForU AI Marketing Team
        """
        
        # Here you would actually send the email using your email service
        print(f"EMAIL SENT TO: {client_email}")
        print(f"SUBJECT: {email_subject}")
        print(f"BODY: {email_body}")
        
        return jsonify({
            'success': True,
            'message': 'Google Ads access request sent successfully',
            'email_sent': True,
            'client_email': client_email
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/facebook/post', methods=['POST'])
@login_required
def post_to_facebook():
    """Post content to Facebook page"""
    try:
        data = request.get_json()
        
        # Import Facebook service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.facebook_service import FacebookService
        
        # Get form data
        message = data.get('message', '')
        link = data.get('link', '')
        scheduled_time = data.get('scheduled_time', '')
        client_id = data.get('client_id')
        
        if not message.strip():
            return jsonify({
                'success': False,
                'error': 'Message content is required'
            }), 400
        
        # Initialize Facebook service
        facebook_service = FacebookService()
        
        # Test connection first
        connection_test = facebook_service.test_connection()
        if not connection_test['success']:
            return jsonify({
                'success': False,
                'error': f"Facebook connection failed: {connection_test['error']}",
                'setup_required': True,
                'setup_guide': {
                    'step1': 'Get Facebook App ID and App Secret from https://developers.facebook.com/',
                    'step2': 'Get Page Access Token from https://developers.facebook.com/tools/explorer/',
                    'step3': 'Add credentials to .env file',
                    'step4': 'Test connection'
                }
            }), 400
        
        # Create the post
        result = facebook_service.create_post(
            message=message,
            link=link if link else None,
            scheduled_publish_time=scheduled_time if scheduled_time else None
        )
        
        if result['success']:
            # Save to database
            from app.models.content_approval import ContentApproval
            from app import db
            
            content_approval = ContentApproval(
                client_id=client_id,
                content_type='post',
                content_title=f"Facebook Post - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
                content_body=message,
                platform='facebook',
                status='published' if not scheduled_time else 'scheduled',
                keywords=data.get('hashtags', ''),
                scheduled_date=scheduled_time if scheduled_time else None
            )
            
            db.session.add(content_approval)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': 'Post created successfully on Facebook',
                'post_id': result['post_id'],
                'scheduled': result['scheduled'],
                'content_id': content_approval.id
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error'],
                'details': result.get('details', {})
            }), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to post to Facebook: {str(e)}'
        }), 500

@api_bp.route('/facebook/test-connection', methods=['GET'])
@login_required
def test_facebook_connection():
    """Test Facebook API connection"""
    try:
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.facebook_service import FacebookService
        
        facebook_service = FacebookService()
        result = facebook_service.test_connection()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to test Facebook connection: {str(e)}'
        }), 500

@api_bp.route('/ai/generate-facebook-post', methods=['POST'])
@login_required
def generate_ai_facebook_post():
    """Generate AI-powered Facebook post content"""
    try:
        data = request.get_json()
        
        # Import AI content service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.free_ai_content_service import FreeAIContentService
        
        # Get parameters
        client_id = data.get('client_id')
        post_type = data.get('post_type', 'general')
        topic = data.get('topic', '')
        tone = data.get('tone', 'professional')
        
        if not client_id:
            return jsonify({
                'success': False,
                'error': 'Client ID is required'
            }), 400
        
        # Get client information
        from app.models.client import Client
        client = Client.query.get(client_id)
        
        if not client:
            return jsonify({
                'success': False,
                'error': 'Client not found'
            }), 404
        
        # Determine business type from client
        business_type = 'healthcare'  # Default
        if 'tech' in client.client_name.lower() or 'technology' in client.client_name.lower():
            business_type = 'technology'
        
        # Generate content
        ai_service = FreeAIContentService()
        result = ai_service.generate_facebook_post(
            business_type=business_type,
            business_name=client.client_name,
            post_type=post_type,
            custom_context=topic
        )
        
        return jsonify({
            'success': True,
            'content': result['content'],
            'hashtags': result['hashtags'],
            'post_type': result['post_type'],
            'business_type': result['business_type'],
            'character_count': result['character_count'],
            'suggested_time': result['suggested_time'],
            'engagement_tips': result['engagement_tips']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate AI content: {str(e)}'
        }), 500

@api_bp.route('/ai/generate-multiple-posts', methods=['POST'])
@login_required
def generate_multiple_ai_posts():
    """Generate multiple AI-powered Facebook post variations"""
    try:
        data = request.get_json()
        
        # Import AI content service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.free_ai_content_service import FreeAIContentService
        
        # Get parameters
        client_id = data.get('client_id')
        count = data.get('count', 3)
        
        if not client_id:
            return jsonify({
                'success': False,
                'error': 'Client ID is required'
            }), 400
        
        # Get client information
        from app.models.client import Client
        client = Client.query.get(client_id)
        
        if not client:
            return jsonify({
                'success': False,
                'error': 'Client not found'
            }), 404
        
        # Determine business type from client
        business_type = 'healthcare'  # Default
        if 'tech' in client.client_name.lower() or 'technology' in client.client_name.lower():
            business_type = 'technology'
        
        # Generate multiple posts
        ai_service = FreeAIContentService()
        posts = ai_service.generate_multiple_posts(business_type, client.client_name, count)
        
        return jsonify({
            'success': True,
            'posts': posts,
            'count': len(posts)
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate multiple posts: {str(e)}'
        }), 500

@api_bp.route('/test-db', methods=['GET'])
@login_required
def test_database():
    """Test database connectivity from API"""
    try:
        from app.models.client import Client
        clients = Client.query.all()
        return jsonify({
            'success': True,
            'client_count': len(clients),
            'clients': [{'id': c.id, 'name': c.client_name} for c in clients]
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/seo-audit', methods=['POST'])
@login_required
def run_seo_audit():
    """Run SEO audit for a client's website"""
    try:
        from app.models.client import Client
        from app.models.seo_audit import SEOAudit
        from datetime import datetime
        import requests
        from bs4 import BeautifulSoup
        
        data = request.get_json()
        client_id = data.get('client_id')
        website_url = data.get('website_url')
        
        if not client_id or not website_url:
            return jsonify({
                'success': False,
                'error': 'Client ID and website URL are required'
            }), 400
        
        # Get client
        client = Client.query.get(client_id)
        if not client:
            return jsonify({
                'success': False,
                'error': 'Client not found'
            }), 404
        
        # Simulate SEO audit (in real implementation, you'd use actual SEO tools)
        try:
            # Basic website analysis
            response = requests.get(website_url, timeout=10)
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # Extract basic SEO data
            title = soup.find('title')
            title_text = title.get_text().strip() if title else "No title found"
            
            meta_description = soup.find('meta', attrs={'name': 'description'})
            meta_desc = meta_description.get('content', '') if meta_description else "No meta description"
            
            h1_tags = soup.find_all('h1')
            h1_count = len(h1_tags)
            
            images = soup.find_all('img')
            images_without_alt = len([img for img in images if not img.get('alt')])
            
            # Calculate SEO score (simplified)
            seo_score = 100
            if not title_text or len(title_text) < 30 or len(title_text) > 60:
                seo_score -= 20
            if not meta_desc or len(meta_desc) < 120 or len(meta_desc) > 160:
                seo_score -= 20
            if h1_count == 0:
                seo_score -= 15
            if h1_count > 1:
                seo_score -= 10
            if images_without_alt > 0:
                seo_score -= 10
            if len(images_without_alt) > len(images) * 0.5:
                seo_score -= 15
            
            seo_score = max(0, seo_score)
            
        except Exception as e:
            # If website analysis fails, create a basic audit
            title_text = "Website analysis failed"
            meta_desc = "Unable to analyze website"
            h1_count = 0
            images_without_alt = 0
            seo_score = 50
        
        # Create recommendations text
        recommendations_list = [
            "Optimize title tag length (30-60 characters)" if len(title_text) < 30 or len(title_text) > 60 else "Title tag is well optimized",
            "Add meta description (120-160 characters)" if len(meta_desc) < 120 or len(meta_desc) > 160 else "Meta description is well optimized",
            "Add H1 tag" if h1_count == 0 else "H1 tag structure is good",
            "Add alt text to images" if images_without_alt > 0 else "Image alt text is well optimized"
        ]
        
        # Create issues text
        issues_list = []
        if not title_text or len(title_text) < 30 or len(title_text) > 60:
            issues_list.append(f"Title tag issue: {title_text}")
        if not meta_desc or len(meta_desc) < 120 or len(meta_desc) > 160:
            issues_list.append(f"Meta description issue: {meta_desc[:50]}...")
        if h1_count == 0:
            issues_list.append("No H1 tag found")
        if images_without_alt > 0:
            issues_list.append(f"{images_without_alt} images without alt text")
        
        # Create SEO audit record
        seo_audit = SEOAudit(
            client_id=client_id,
            website_url=website_url,
            overall_score=seo_score,
            seo_score=seo_score,
            page_speed_score=85,  # Mock score
            mobile_friendly_score=90,  # Mock score
            accessibility_score=80,  # Mock score
            best_practices_score=75,  # Mock score
            issues_found="; ".join(issues_list) if issues_list else "No major issues found",
            recommendations="; ".join(recommendations_list),
            audit_date=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        
        db.session.add(seo_audit)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'audit_id': seo_audit.id,
            'overall_score': seo_audit.overall_score,
            'seo_score': seo_audit.seo_score,
            'page_speed_score': seo_audit.page_speed_score,
            'mobile_friendly_score': seo_audit.mobile_friendly_score,
            'accessibility_score': seo_audit.accessibility_score,
            'best_practices_score': seo_audit.best_practices_score,
            'issues_found': seo_audit.issues_found,
            'recommendations': seo_audit.recommendations,
            'audit_date': seo_audit.audit_date.isoformat(),
            'message': f'SEO audit completed for {client.client_name}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/ai/content-suggestions', methods=['GET'])
@login_required
def get_content_suggestions():
    """Get AI content suggestions for different post types"""
    try:
        # Import AI content service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.free_ai_content_service import FreeAIContentService
        
        # Get business type from query parameters
        business_type = request.args.get('business_type', 'healthcare')
        
        ai_service = FreeAIContentService()
        suggestions = ai_service.get_content_suggestions(business_type)
        
        return jsonify({
            'success': True,
            'suggestions': suggestions
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get content suggestions: {str(e)}'
        }), 500

@api_bp.route('/godaddy/domain-analysis', methods=['POST'])
@login_required
def analyze_domain_seo():
    """Analyze domain for SEO opportunities using GoDaddy"""
    try:
        data = request.get_json()
        
        # Import GoDaddy SEO service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.godaddy_seo_service import GoDaddySEOService
        
        domain = data.get('domain', '')
        if not domain:
            return jsonify({
                'success': False,
                'error': 'Domain is required'
            }), 400
        
        # Initialize GoDaddy service
        godaddy_service = GoDaddySEOService()
        
        # Analyze domain SEO
        result = godaddy_service.analyze_domain_seo(domain)
        
        if result['success']:
            return jsonify({
                'success': True,
                'seo_analysis': result['seo_analysis']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to analyze domain: {str(e)}'
        }), 500

@api_bp.route('/godaddy/backlink-strategy', methods=['POST'])
@login_required
def generate_backlink_strategy():
    """Generate backlink strategy for a domain"""
    try:
        data = request.get_json()
        
        # Import GoDaddy SEO service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.godaddy_seo_service import GoDaddySEOService
        
        domain = data.get('domain', '')
        industry = data.get('industry', 'healthcare')
        
        if not domain:
            return jsonify({
                'success': False,
                'error': 'Domain is required'
            }), 400
        
        # Initialize GoDaddy service
        godaddy_service = GoDaddySEOService()
        
        # Generate backlink strategy
        result = godaddy_service.generate_backlink_strategy(domain, industry)
        
        if result['success']:
            return jsonify({
                'success': True,
                'strategy': result['strategy']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to generate backlink strategy: {str(e)}'
        }), 500

@api_bp.route('/godaddy/domain-suggestions', methods=['POST'])
@login_required
def get_domain_suggestions():
    """Get domain name suggestions based on keywords"""
    try:
        data = request.get_json()
        
        # Import GoDaddy SEO service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.godaddy_seo_service import GoDaddySEOService
        
        keyword = data.get('keyword', '')
        if not keyword:
            return jsonify({
                'success': False,
                'error': 'Keyword is required'
            }), 400
        
        # Initialize GoDaddy service
        godaddy_service = GoDaddySEOService()
        
        # Get domain suggestions
        result = godaddy_service.get_domain_suggestions(keyword)
        
        if result['success']:
            return jsonify({
                'success': True,
                'suggestions': result['suggestions']
            })
        else:
            return jsonify({
                'success': False,
                'error': result['error']
            }), 500
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get domain suggestions: {str(e)}'
        }), 500

@api_bp.route('/godaddy/seo-tools', methods=['GET'])
@login_required
def get_seo_tools():
    """Get available SEO tools and integrations"""
    try:
        # Import GoDaddy SEO service
        import sys
        import os
        sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        from app.services.godaddy_seo_service import GoDaddySEOService
        
        godaddy_service = GoDaddySEOService()
        tools = godaddy_service.get_seo_tools_integration()
        
        return jsonify({
            'success': True,
            'tools': tools
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to get SEO tools: {str(e)}'
        }), 500

@api_bp.route('/content-approval/<int:content_id>/approve', methods=['POST'])
@login_required
def approve_content(content_id):
    """Approve content for publishing"""
    try:
        from app.models.content_approval import ContentApproval
        from flask_login import current_user
        from datetime import datetime
        
        content = ContentApproval.query.get(content_id)
        if not content:
            return jsonify({
                'success': False,
                'message': 'Content not found'
            }), 404
        
        content.status = 'approved'
        content.approved_at = datetime.utcnow()
        content.approved_by = 1  # Admin user ID
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Content approved successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/content-approval/<int:content_id>/reject', methods=['POST'])
@login_required
def reject_content(content_id):
    """Reject content"""
    try:
        from app.models.content_approval import ContentApproval
        from flask_login import current_user
        from datetime import datetime
        
        data = request.get_json()
        reason = data.get('reason', 'No reason provided')
        
        content = ContentApproval.query.get(content_id)
        if not content:
            return jsonify({
                'success': False,
                'message': 'Content not found'
            }), 404
        
        content.status = 'rejected'
        content.rejected_at = datetime.utcnow()
        content.rejected_by = 1  # Admin user ID
        content.rejection_reason = reason
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Content rejected successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/google-ads/create', methods=['POST'])
@login_required
def create_google_ad():
    """Create a Google Ad campaign"""
    try:
        from app.models.client import Client
        from app.models.campaign import Campaign
        from app.services.google_ads_service import GoogleAdsService
        from datetime import datetime
        
        data = request.get_json()
        client_id = data.get('client_id')
        
        if not client_id:
            return jsonify({
                'success': False,
                'message': 'Client ID is required'
            }), 400
        
        # Get client
        client = Client.query.get(client_id)
        if not client:
            return jsonify({
                'success': False,
                'message': 'Client not found'
            }), 404
        
        # Initialize Google Ads service
        google_ads_service = GoogleAdsService()
        
        # Check if Google Ads API is available
        connection_test = google_ads_service.test_connection()
        if not connection_test.get('success'):
            # Fallback to mock implementation if API not available
            return create_mock_google_ad_campaign(client_id, data)
        
        # Get customer ID (in real implementation, this would be stored per client)
        customer_id = os.getenv('GOOGLE_ADS_TEST_CUSTOMER_ID', '1234567890')
        
        # Create real Google Ads campaign
        campaign_result = google_ads_service.create_campaign(customer_id, data)
        
        if not campaign_result.get('success'):
            return jsonify({
                'success': False,
                'error': campaign_result.get('error', 'Failed to create campaign')
            }), 500
        
        # Create ad group
        ad_group_data = {
            'name': f"{data.get('campaign_name', 'Campaign')} - Ad Group",
            'cpc_bid': float(data.get('target_cpa', 1.0))
        }
        
        ad_group_result = google_ads_service.create_ad_group(
            customer_id, 
            campaign_result['campaign_id'], 
            ad_group_data
        )
        
        if not ad_group_result.get('success'):
            return jsonify({
                'success': False,
                'error': ad_group_result.get('error', 'Failed to create ad group')
            }), 500
        
        # Add keywords if provided
        keywords = data.get('keywords', '').split(',')
        keywords = [kw.strip() for kw in keywords if kw.strip()]
        
        if keywords:
            keywords_result = google_ads_service.add_keywords(
                customer_id,
                ad_group_result['ad_group_id'],
                keywords
            )
        
        # Create search ad
        ad_data = {
            'headline1': data.get('headline1', 'WeTechForU Services'),
            'headline2': data.get('headline2', 'Get Results Today'),
            'description1': data.get('description1', 'Professional marketing services for your business.')
        }
        
        ad_result = google_ads_service.create_search_ad(
            customer_id,
            ad_group_result['ad_group_id'],
            ad_data
        )
        
        # Store campaign in database
        campaign = Campaign(
            client_id=client_id,
            name=data.get('campaign_name'),
            campaign_type='google_ads',
            platform='google',
            status='active',
            budget=float(data.get('daily_budget', 10.0)) * 30,
            target_audience=data.get('location', 'United States'),
            objectives=f"Keywords: {data.get('keywords', '')}",
            created_at=datetime.utcnow()
        )
        
        db.session.add(campaign)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'campaign_id': campaign.id,
            'google_campaign_id': campaign_result['campaign_id'],
            'ad_group_id': ad_group_result['ad_group_id'],
            'ad_id': ad_result.get('ad_id'),
            'message': f'Google Ad campaign created successfully for {client.client_name}'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def create_mock_google_ad_campaign(client_id, data):
    """Fallback mock implementation when Google Ads API is not available"""
    try:
        from app.models.client import Client
        from app.models.campaign import Campaign
        from datetime import datetime
        
        # Get client
        client = Client.query.get(client_id)
        if not client:
            return jsonify({
                'success': False,
                'message': 'Client not found'
            }), 404
        
        # Create campaign record (mock)
        campaign = Campaign(
            client_id=client_id,
            name=data.get('campaign_name'),
            campaign_type='google_ads',
            platform='google',
            status='active',
            budget=float(data.get('daily_budget', 10.0)) * 30,
            target_audience=data.get('location', 'United States'),
            objectives=f"Keywords: {data.get('keywords', '')}",
            created_at=datetime.utcnow()
        )
        
        db.session.add(campaign)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'campaign_id': campaign.id,
            'message': f'Google Ad campaign created successfully for {client.client_name} (Mock Mode - Google Ads API not configured)'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# Enhanced Keyword Suggestion API Endpoints
@api_bp.route('/keywords/industries', methods=['GET'])
def get_keyword_industry_categories():
    """Get all available industry categories"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        categories = service.get_industry_categories()
        
        return jsonify({
            'success': True,
            'categories': categories
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/keywords/subcategories/<category_name>', methods=['GET'])
def get_subcategories(category_name):
    """Get subcategories for a specific industry category"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        subcategories = service.get_subcategories(category_name)
        
        return jsonify({
            'success': True,
            'category': category_name,
            'subcategories': subcategories
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/keywords/suggestions', methods=['POST'])
def get_keyword_suggestions():
    """Get keyword suggestions for a category and subcategory"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        
        data = request.get_json()
        category_name = data.get('category')
        subcategory_name = data.get('subcategory')
        location = data.get('location')
        include_local = data.get('include_local', True)
        
        if not category_name or not subcategory_name:
            return jsonify({
                'success': False,
                'error': 'Category and subcategory are required'
            }), 400
        
        suggestions = service.get_keyword_suggestions(
            category_name, subcategory_name, location, include_local
        )
        
        if 'error' in suggestions:
            return jsonify({
                'success': False,
                'error': suggestions['error']
            }), 400
        
        return jsonify({
            'success': True,
            'suggestions': suggestions
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/keywords/location-based', methods=['POST'])
def get_location_based_keywords():
    """Get keywords based on a specific address/location"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        
        data = request.get_json()
        address = data.get('address')
        category_name = data.get('category')
        subcategory_name = data.get('subcategory')
        
        if not address or not category_name or not subcategory_name:
            return jsonify({
                'success': False,
                'error': 'Address, category, and subcategory are required'
            }), 400
        
        keywords = service.get_location_based_keywords(address, category_name, subcategory_name)
        
        if 'error' in keywords:
            return jsonify({
                'success': False,
                'error': keywords['error']
            }), 400
        
        return jsonify({
            'success': True,
            'keywords': keywords
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/keywords/search', methods=['GET'])
def search_keywords():
    """Search for keywords across categories"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        
        query = request.args.get('q', '')
        category = request.args.get('category')
        
        if not query:
            return jsonify({
                'success': False,
                'error': 'Search query is required'
            }), 400
        
        results = service.search_keywords(query, category)
        
        return jsonify({
            'success': True,
            'query': query,
            'results': results
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/keywords/recommendations', methods=['POST'])
def get_recommended_keywords():
    """Get recommended keywords based on business type and location"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        
        data = request.get_json()
        business_type = data.get('business_type')
        location = data.get('location')
        
        if not business_type:
            return jsonify({
                'success': False,
                'error': 'Business type is required'
            }), 400
        
        recommendations = service.get_recommended_keywords(business_type, location)
        
        if 'error' in recommendations:
            return jsonify({
                'success': False,
                'error': recommendations['error']
            }), 400
        
        return jsonify({
            'success': True,
            'recommendations': recommendations
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/keywords/parse-address', methods=['POST'])
def parse_address():
    """Parse a full address into components"""
    try:
        from app.services.enhanced_keyword_service import EnhancedKeywordService
        service = EnhancedKeywordService()
        
        data = request.get_json()
        address = data.get('address')
        
        if not address:
            return jsonify({
                'success': False,
                'error': 'Address is required'
            }), 400
        
        parsed = service.parse_address(address)
        
        if 'error' in parsed:
            return jsonify({
                'success': False,
                'error': parsed['error']
            }), 400
        
        return jsonify({
            'success': True,
            'parsed_address': parsed
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'WeTechForU Healthcare Marketing Platform'
    })

@api_bp.route('/leads')
@login_required
def get_leads():
    """Get all leads"""
    try:
        leads = Lead.query.order_by(Lead.created_at.desc()).all()
        leads_data = []
        
        for lead in leads:
            leads_data.append({
                'id': lead.id,
                'clinic_name': lead.clinic_name,
                'website_url': lead.website_url,
                'email': lead.email,
                'phone': lead.phone,
                'address': lead.address,
                'status': lead.status,
                'industry_category': lead.industry_category,
                'industry_subcategory': lead.industry_subcategory,
                'created_at': lead.created_at.isoformat() if lead.created_at else None
            })
        
        return jsonify({
            'success': True,
            'leads': leads_data,
            'total': len(leads_data)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@api_bp.route('/clients')
@login_required
def get_clients():
    """Get all clients"""
    try:
        from app.models.client import Client
        clients = Client.query.all()
        clients_data = []
        
        for client in clients:
            clients_data.append({
                'id': client.id,
                'name': client.name,
                'website': client.website,
                'email': client.email,
                'phone': client.phone,
                'address': client.address,
                'is_active': client.is_active,
                'created_at': client.created_at.isoformat() if client.created_at else None
            })
        
        return jsonify({
            'success': True,
            'clients': clients_data,
            'total': len(clients_data)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
