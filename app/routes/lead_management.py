from flask import Blueprint, request, jsonify, make_response, render_template
from flask_login import login_required, current_user
from app import db
from app.models.lead import Lead
from datetime import datetime, timedelta
from sqlalchemy import func
import csv
import io

lead_mgmt_bp = Blueprint('lead_mgmt', __name__)

@lead_mgmt_bp.route('/leads/export', methods=['POST'])
@login_required
def export_leads():
    """Export leads to CSV/Excel format"""
    try:
        data = request.get_json()
        export_format = data.get('format', 'csv')  # csv or excel
        lead_ids = data.get('lead_ids', [])  # Specific leads or all
        filters = data.get('filters', {})
        
        # Build query with filters
        query = Lead.query
        
        if lead_ids:
            query = query.filter(Lead.id.in_(lead_ids))
        
        # Apply filters
        if filters.get('status'):
            query = query.filter(Lead.status == filters['status'])
        if filters.get('industry'):
            query = query.filter(Lead.industry_category == filters['industry'])
        if filters.get('source'):
            query = query.filter(Lead.lead_source == filters['source'])
        if filters.get('date_from'):
            query = query.filter(Lead.created_at >= filters['date_from'])
        if filters.get('date_to'):
            query = query.filter(Lead.created_at <= filters['date_to'])
        
        leads = query.all()
        
        if export_format == 'csv':
            output = io.StringIO()
            writer = csv.writer(output)
            
            # Write header
            writer.writerow([
                'ID', 'Business Name', 'Website', 'Phone', 'Email', 
                'Address', 'Industry', 'Subcategory', 'Source', 'Status',
                'Contact Person', 'Contact Title', 'Created Date', 'Notes'
            ])
            
            # Write data
            for lead in leads:
                writer.writerow([
                    lead.id,
                    lead.clinic_name,
                    lead.website_url or '',
                    lead.phone or '',
                    lead.email or '',
                    lead.address or '',
                    lead.industry_category or '',
                    lead.industry_subcategory or '',
                    lead.lead_source or '',
                    lead.status or '',
                    lead.contact_person or '',
                    lead.contact_title or '',
                    lead.created_at.strftime('%Y-%m-%d %H:%M:%S') if lead.created_at else '',
                    lead.notes or ''
                ])
            
            output.seek(0)
            response = make_response(output.getvalue())
            response.headers['Content-Type'] = 'text/csv'
            response.headers['Content-Disposition'] = f'attachment; filename=leads_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            return response
        
        return jsonify({'success': False, 'message': 'Unsupported export format'}), 400
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@lead_mgmt_bp.route('/leads/bulk-actions', methods=['POST'])
@login_required
def bulk_lead_actions():
    """Perform bulk actions on selected leads"""
    try:
        data = request.get_json()
        action = data.get('action')
        lead_ids = data.get('lead_ids', [])
        
        if not lead_ids:
            return jsonify({'success': False, 'message': 'No leads selected'}), 400
        
        leads = Lead.query.filter(Lead.id.in_(lead_ids)).all()
        
        if action == 'update_status':
            new_status = data.get('status')
            for lead in leads:
                lead.status = new_status
                lead.notes = (lead.notes or '') + f'\n[{datetime.now().strftime("%Y-%m-%d %H:%M")}] Status updated to {new_status}'
        
        elif action == 'delete':
            for lead in leads:
                db.session.delete(lead)
        
        elif action == 'archive':
            for lead in leads:
                lead.status = 'archived'
                lead.notes = (lead.notes or '') + f'\n[{datetime.now().strftime("%Y-%m-%d %H:%M")}] Archived'
        
        elif action == 'assign_tags':
            tags = data.get('tags', [])
            for lead in leads:
                # Add tags to notes for now (can be enhanced with proper tag system)
                lead.notes = (lead.notes or '') + f'\n[{datetime.now().strftime("%Y-%m-%d %H:%M")}] Tags: {", ".join(tags)}'
        
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'Bulk action "{action}" completed for {len(leads)} leads'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@lead_mgmt_bp.route('/leads/analytics', methods=['GET'])
@login_required
def lead_analytics():
    """Get lead generation analytics and insights"""
    try:
        # Get date range (default: last 30 days)
        days = int(request.args.get('days', 30))
        start_date = datetime.now() - timedelta(days=days)
        
        # Lead generation stats
        total_leads = Lead.query.count()
        recent_leads = Lead.query.filter(Lead.created_at >= start_date).count()
        
        # Leads by source
        leads_by_source = db.session.query(
            Lead.lead_source, 
            func.count(Lead.id).label('count')
        ).group_by(Lead.lead_source).all()
        
        # Leads by status
        leads_by_status = db.session.query(
            Lead.status, 
            func.count(Lead.id).label('count')
        ).group_by(Lead.status).all()
        
        # Leads by industry
        leads_by_industry = db.session.query(
            Lead.industry_category, 
            func.count(Lead.id).label('count')
        ).group_by(Lead.industry_category).all()
        
        # Daily lead generation trend
        daily_leads = db.session.query(
            func.date(Lead.created_at).label('date'),
            func.count(Lead.id).label('count')
        ).filter(Lead.created_at >= start_date).group_by(
            func.date(Lead.created_at)
        ).order_by('date').all()
        
        # Conversion rate (leads to clients)
        converted_leads = Lead.query.filter(Lead.converted_to_client_id.isnot(None)).count()
        conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0
        
        return jsonify({
            'success': True,
            'analytics': {
                'total_leads': total_leads,
                'recent_leads': recent_leads,
                'conversion_rate': round(conversion_rate, 2),
                'leads_by_source': [{'source': item[0], 'count': item[1]} for item in leads_by_source],
                'leads_by_status': [{'status': item[0], 'count': item[1]} for item in leads_by_status],
                'leads_by_industry': [{'industry': item[0], 'count': item[1]} for item in leads_by_industry],
                'daily_trend': [{'date': str(item[0]), 'count': item[1]} for item in daily_leads]
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@lead_mgmt_bp.route('/leads/filter', methods=['POST'])
@login_required
def filter_leads():
    """Advanced lead filtering with multiple criteria"""
    try:
        data = request.get_json()
        filters = data.get('filters', {})
        page = data.get('page', 1)
        per_page = data.get('per_page', 50)
        sort_by = data.get('sort_by', 'created_at')
        sort_order = data.get('sort_order', 'desc')
        
        # Build query
        query = Lead.query
        
        # Apply filters
        if filters.get('status'):
            query = query.filter(Lead.status == filters['status'])
        
        if filters.get('industry'):
            query = query.filter(Lead.industry_category == filters['industry'])
        
        if filters.get('source'):
            query = query.filter(Lead.lead_source == filters['source'])
        
        if filters.get('has_website'):
            if filters['has_website']:
                query = query.filter(Lead.website_url.isnot(None), Lead.website_url != '')
            else:
                query = query.filter((Lead.website_url.is_(None)) | (Lead.website_url == ''))
        
        if filters.get('has_email'):
            if filters['has_email']:
                query = query.filter(Lead.email.isnot(None), Lead.email != '')
            else:
                query = query.filter((Lead.email.is_(None)) | (Lead.email == ''))
        
        if filters.get('has_phone'):
            if filters['has_phone']:
                query = query.filter(Lead.phone.isnot(None), Lead.phone != '')
            else:
                query = query.filter((Lead.phone.is_(None)) | (Lead.phone == ''))
        
        if filters.get('date_from'):
            query = query.filter(Lead.created_at >= filters['date_from'])
        
        if filters.get('date_to'):
            query = query.filter(Lead.created_at <= filters['date_to'])
        
        if filters.get('search_term'):
            search_term = f"%{filters['search_term']}%"
            query = query.filter(
                (Lead.clinic_name.ilike(search_term)) |
                (Lead.website_url.ilike(search_term)) |
                (Lead.email.ilike(search_term)) |
                (Lead.phone.ilike(search_term)) |
                (Lead.address.ilike(search_term))
            )
        
        # Apply sorting
        if sort_order == 'desc':
            query = query.order_by(getattr(Lead, sort_by).desc())
        else:
            query = query.order_by(getattr(Lead, sort_by).asc())
        
        # Pagination
        leads = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'leads': [{
                'id': lead.id,
                'clinic_name': lead.clinic_name,
                'website_url': lead.website_url,
                'phone': lead.phone,
                'email': lead.email,
                'address': lead.address,
                'industry_category': lead.industry_category,
                'industry_subcategory': lead.industry_subcategory,
                'lead_source': lead.lead_source,
                'status': lead.status,
                'contact_person': lead.contact_person,
                'contact_title': lead.contact_title,
                'created_at': lead.created_at.isoformat() if lead.created_at else None,
                'notes': lead.notes
            } for lead in leads.items],
            'pagination': {
                'page': leads.page,
                'pages': leads.pages,
                'per_page': leads.per_page,
                'total': leads.total,
                'has_next': leads.has_next,
                'has_prev': leads.has_prev
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@lead_mgmt_bp.route('/leads/duplicate-check', methods=['POST'])
@login_required
def check_duplicate_leads():
    """Check for potential duplicate leads"""
    try:
        data = request.get_json()
        lead_id = data.get('lead_id')  # Optional: exclude this lead from check
        
        # Find potential duplicates based on name, phone, email, or website
        query = Lead.query
        
        if lead_id:
            query = query.filter(Lead.id != lead_id)
        
        # Get all leads
        all_leads = query.all()
        duplicates = []
        
        for lead in all_leads:
            # Check for duplicates based on various criteria
            duplicate_criteria = []
            
            # Check by phone
            if lead.phone:
                phone_duplicates = [l for l in all_leads if l.id != lead.id and l.phone and l.phone == lead.phone]
                if phone_duplicates:
                    duplicate_criteria.append(f"Phone: {lead.phone}")
            
            # Check by email
            if lead.email:
                email_duplicates = [l for l in all_leads if l.id != lead.id and l.email and l.email == lead.email]
                if email_duplicates:
                    duplicate_criteria.append(f"Email: {lead.email}")
            
            # Check by website
            if lead.website_url:
                website_duplicates = [l for l in all_leads if l.id != lead.id and l.website_url and l.website_url == lead.website_url]
                if website_duplicates:
                    duplicate_criteria.append(f"Website: {lead.website_url}")
            
            # Check by similar name (fuzzy matching)
            if lead.clinic_name:
                name_duplicates = [l for l in all_leads if l.id != lead.id and l.clinic_name and 
                                 lead.clinic_name.lower().replace(' ', '') == l.clinic_name.lower().replace(' ', '')]
                if name_duplicates:
                    duplicate_criteria.append(f"Similar name: {lead.clinic_name}")
            
            if duplicate_criteria:
                duplicates.append({
                    'lead_id': lead.id,
                    'clinic_name': lead.clinic_name,
                    'duplicate_criteria': duplicate_criteria,
                    'created_at': lead.created_at.isoformat() if lead.created_at else None
                })
        
        return jsonify({
            'success': True,
            'duplicates': duplicates,
            'total_duplicates': len(duplicates)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
