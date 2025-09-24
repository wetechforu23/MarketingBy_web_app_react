"""
Subscription Plan Management Routes
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, session
from app import db
from app.models.subscription import SubscriptionPlan, Feature, PlanFeature, ClientSubscription
from app.models.client import Client
from app.services.subscription_service import SubscriptionService
from app.utils.feature_flags import require_feature
import json

subscription_bp = Blueprint('subscription', __name__, url_prefix='/admin/subscription')

@subscription_bp.route('/plans')
def manage_plans():
    """Manage subscription plans"""
    try:
        plans = SubscriptionPlan.query.filter_by(is_active=True).all()
        return render_template('subscription_plans.html', plans=plans)
    except Exception as e:
        flash(f'Error loading subscription plans: {e}', 'error')
        return redirect(url_for('admin.admin_portal'))

@subscription_bp.route('/plans/<int:plan_id>')
def view_plan(plan_id):
    """View plan details and features"""
    try:
        plan = SubscriptionPlan.query.get_or_404(plan_id)
        plan_features = PlanFeature.query.filter_by(plan_id=plan_id).all()
        all_features = Feature.query.all()
        
        # Organize features by category
        features_by_category = {}
        for feature in all_features:
            if feature.category not in features_by_category:
                features_by_category[feature.category] = []
            features_by_category[feature.category].append(feature)
        
        return render_template('admin/plan_details.html', 
                             plan=plan, 
                             plan_features=plan_features,
                             features_by_category=features_by_category)
    except Exception as e:
        flash(f'Error loading plan details: {e}', 'error')
        return redirect(url_for('subscription.manage_plans'))

@subscription_bp.route('/plans/<int:plan_id>/features', methods=['POST'])
def update_plan_features(plan_id):
    """Update features for a plan"""
    try:
        plan = SubscriptionPlan.query.get_or_404(plan_id)
        feature_ids = request.form.getlist('features')
        
        # Remove existing plan features
        PlanFeature.query.filter_by(plan_id=plan_id).delete()
        
        # Add new plan features
        for feature_id in feature_ids:
            plan_feature = PlanFeature(
                plan_id=plan_id,
                feature_id=int(feature_id),
                is_enabled=True
            )
            db.session.add(plan_feature)
        
        db.session.commit()
        flash('Plan features updated successfully!', 'success')
        
    except Exception as e:
        flash(f'Error updating plan features: {e}', 'error')
        db.session.rollback()
    
    return redirect(url_for('subscription.view_plan', plan_id=plan_id))

@subscription_bp.route('/clients')
def manage_client_subscriptions():
    """Manage client subscriptions"""
    try:
        # Get all clients with their subscription info
        clients = Client.query.all()
        client_subscriptions = {}
        
        for client in clients:
            subscription = ClientSubscription.query.filter_by(
                client_id=client.id,
                status='active'
            ).first()
            
            if subscription:
                client_subscriptions[client.id] = {
                    'subscription': subscription,
                    'plan': subscription.subscription_plan,
                    'features': SubscriptionService.get_client_features(client.id)
                }
            else:
                client_subscriptions[client.id] = {
                    'subscription': None,
                    'plan': None,
                    'features': []
                }
        
        plans = SubscriptionPlan.query.filter_by(is_active=True).all()
        
        return render_template('client_subscriptions.html', 
                             clients=clients,
                             client_subscriptions=client_subscriptions,
                             plans=plans)
    except Exception as e:
        flash(f'Error loading client subscriptions: {e}', 'error')
        return redirect(url_for('admin.admin_portal'))

@subscription_bp.route('/clients/<int:client_id>/assign-plan', methods=['POST'])
def assign_plan_to_client(client_id):
    """Assign a subscription plan to a client"""
    try:
        client = Client.query.get_or_404(client_id)
        plan_id = request.form.get('plan_id')
        
        if not plan_id:
            flash('Please select a plan', 'error')
            return redirect(url_for('subscription.manage_client_subscriptions'))
        
        subscription = SubscriptionService.assign_plan_to_client(client_id, int(plan_id))
        
        if subscription:
            flash(f'Plan assigned successfully to {client.clinic_name}!', 'success')
        else:
            flash('Error assigning plan to client', 'error')
        
    except Exception as e:
        flash(f'Error assigning plan: {e}', 'error')
    
    return redirect(url_for('subscription.manage_client_subscriptions'))

@subscription_bp.route('/clients/<int:client_id>/custom-features', methods=['POST'])
def update_custom_features(client_id):
    """Update custom features for a client"""
    try:
        client = Client.query.get_or_404(client_id)
        subscription = ClientSubscription.query.filter_by(
            client_id=client_id,
            status='active'
        ).first()
        
        if not subscription:
            flash('Client does not have an active subscription', 'error')
            return redirect(url_for('subscription.manage_client_subscriptions'))
        
        # Get custom features from form
        custom_features = {
            'enabled': request.form.getlist('custom_features'),
            'disabled': request.form.getlist('disabled_features')
        }
        
        subscription.custom_features = json.dumps(custom_features)
        db.session.commit()
        
        flash(f'Custom features updated for {client.clinic_name}!', 'success')
        
    except Exception as e:
        flash(f'Error updating custom features: {e}', 'error')
        db.session.rollback()
    
    return redirect(url_for('subscription.manage_client_subscriptions'))

@subscription_bp.route('/clients/<int:client_id>/usage')
def view_client_usage(client_id):
    """View usage statistics for a client"""
    try:
        client = Client.query.get_or_404(client_id)
        plan_info = SubscriptionService.get_client_plan_info(client_id)
        
        return render_template('admin/client_usage.html', 
                             client=client,
                             plan_info=plan_info)
    except Exception as e:
        flash(f'Error loading client usage: {e}', 'error')
        return redirect(url_for('subscription.manage_client_subscriptions'))

@subscription_bp.route('/features')
def manage_features():
    """Manage available features"""
    try:
        features = Feature.query.all()
        features_by_category = {}
        
        for feature in features:
            if feature.category not in features_by_category:
                features_by_category[feature.category] = []
            features_by_category[feature.category].append(feature)
        
        return render_template('admin/features.html', 
                             features=features,
                             features_by_category=features_by_category)
    except Exception as e:
        flash(f'Error loading features: {e}', 'error')
        return redirect(url_for('admin.admin_portal'))

@subscription_bp.route('/features', methods=['POST'])
def create_feature():
    """Create a new feature"""
    try:
        name = request.form.get('name')
        description = request.form.get('description')
        category = request.form.get('category')
        is_core = 'is_core' in request.form
        
        if not all([name, description, category]):
            flash('Please fill in all required fields', 'error')
            return redirect(url_for('subscription.manage_features'))
        
        # Check if feature already exists
        existing_feature = Feature.query.filter_by(name=name).first()
        if existing_feature:
            flash('Feature with this name already exists', 'error')
            return redirect(url_for('subscription.manage_features'))
        
        feature = Feature(
            name=name,
            description=description,
            category=category,
            is_core=is_core
        )
        
        db.session.add(feature)
        db.session.commit()
        
        flash('Feature created successfully!', 'success')
        
    except Exception as e:
        flash(f'Error creating feature: {e}', 'error')
        db.session.rollback()
    
    return redirect(url_for('subscription.manage_features'))

@subscription_bp.route('/api/plan-features/<int:plan_id>')
def get_plan_features_api(plan_id):
    """API endpoint to get features for a plan"""
    try:
        plan = SubscriptionPlan.query.get_or_404(plan_id)
        plan_features = PlanFeature.query.filter_by(plan_id=plan_id).all()
        
        features = []
        for plan_feature in plan_features:
            features.append({
                'id': plan_feature.feature.id,
                'name': plan_feature.feature.name,
                'description': plan_feature.feature.description,
                'category': plan_feature.feature.category,
                'is_enabled': plan_feature.is_enabled,
                'limit_value': plan_feature.limit_value,
                'limit_type': plan_feature.limit_type
            })
        
        return jsonify({
            'plan': {
                'id': plan.id,
                'name': plan.name,
                'description': plan.description,
                'price': plan.price
            },
            'features': features
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@subscription_bp.route('/api/client-features/<int:client_id>')
def get_client_features_api(client_id):
    """API endpoint to get features available to a client"""
    try:
        features = SubscriptionService.get_client_features(client_id)
        plan_info = SubscriptionService.get_client_plan_info(client_id)
        
        return jsonify({
            'features': features,
            'plan_info': plan_info
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
