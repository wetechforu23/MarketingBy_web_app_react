"""
Subscription Service for WeTechForU Healthcare Marketing Platform
Handles subscription plan management and feature access control
"""

from app.models import db, SubscriptionPlan, Feature, PlanFeature, ClientSubscription, FeatureUsage
from app.models.client import Client
from app.models.user import User
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class SubscriptionService:
    """Service for managing client subscriptions and feature access"""
    
    def __init__(self):
        self.logger = logger
    
    def get_all_plans(self) -> List[SubscriptionPlan]:
        """Get all available subscription plans"""
        try:
            return SubscriptionPlan.query.filter_by(is_active=True).all()
        except Exception as e:
            self.logger.error(f"Error fetching subscription plans: {e}")
            return []
    
    def get_plan_by_id(self, plan_id: int) -> Optional[SubscriptionPlan]:
        """Get subscription plan by ID"""
        try:
            return SubscriptionPlan.query.get(plan_id)
        except Exception as e:
            self.logger.error(f"Error fetching plan {plan_id}: {e}")
            return None
    
    def get_client_subscription(self, client_id: int) -> Optional[ClientSubscription]:
        """Get client's current subscription"""
        try:
            return ClientSubscription.query.filter_by(
                client_id=client_id,
                is_active=True
            ).first()
        except Exception as e:
            self.logger.error(f"Error fetching client subscription for client {client_id}: {e}")
            return None
    
    def create_client_subscription(self, client_id: int, plan_id: int, 
                                 start_date: datetime = None) -> Optional[ClientSubscription]:
        """Create a new client subscription"""
        try:
            if start_date is None:
                start_date = datetime.utcnow()
            
            # Get the plan to calculate end date
            plan = self.get_plan_by_id(plan_id)
            if not plan:
                return None
            
            # Calculate end date based on billing cycle
            if plan.billing_cycle == 'monthly':
                end_date = start_date + timedelta(days=30)
            elif plan.billing_cycle == 'yearly':
                end_date = start_date + timedelta(days=365)
            else:
                end_date = start_date + timedelta(days=30)  # Default to monthly
            
            subscription = ClientSubscription(
                client_id=client_id,
                plan_id=plan_id,
                start_date=start_date,
                end_date=end_date,
                is_active=True,
                auto_renew=True
            )
            
            db.session.add(subscription)
            db.session.commit()
            
            self.logger.info(f"Created subscription for client {client_id} with plan {plan_id}")
            return subscription
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error creating subscription for client {client_id}: {e}")
            return None
    
    def update_client_subscription(self, client_id: int, plan_id: int) -> bool:
        """Update client's subscription plan"""
        try:
            subscription = self.get_client_subscription(client_id)
            if not subscription:
                return False
            
            # Deactivate current subscription
            subscription.is_active = False
            subscription.end_date = datetime.utcnow()
            
            # Create new subscription
            new_subscription = self.create_client_subscription(client_id, plan_id)
            
            if new_subscription:
                db.session.commit()
                self.logger.info(f"Updated subscription for client {client_id} to plan {plan_id}")
                return True
            else:
                db.session.rollback()
                return False
                
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error updating subscription for client {client_id}: {e}")
            return False
    
    def cancel_client_subscription(self, client_id: int) -> bool:
        """Cancel client's subscription"""
        try:
            subscription = self.get_client_subscription(client_id)
            if not subscription:
                return False
            
            subscription.is_active = False
            subscription.auto_renew = False
            subscription.end_date = datetime.utcnow()
            
            db.session.commit()
            self.logger.info(f"Cancelled subscription for client {client_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error cancelling subscription for client {client_id}: {e}")
            return False
    
    def get_client_features(self, client_id: int) -> List[Feature]:
        """Get all features available to a client based on their subscription"""
        try:
            subscription = self.get_client_subscription(client_id)
            if not subscription:
                return []
            
            # Get features from the subscription plan
            plan_features = PlanFeature.query.filter_by(plan_id=subscription.plan_id).all()
            features = [pf.feature for pf in plan_features if pf.feature.is_active]
            
            return features
            
        except Exception as e:
            self.logger.error(f"Error fetching features for client {client_id}: {e}")
            return []
    
    def has_feature_access(self, client_id: int, feature_name: str) -> bool:
        """Check if client has access to a specific feature"""
        try:
            features = self.get_client_features(client_id)
            return any(feature.name == feature_name and feature.is_active for feature in features)
            
        except Exception as e:
            self.logger.error(f"Error checking feature access for client {client_id}: {e}")
            return False
    
    def record_feature_usage(self, client_id: int, feature_name: str, 
                           usage_data: Dict = None) -> bool:
        """Record feature usage for analytics"""
        try:
            feature = Feature.query.filter_by(name=feature_name).first()
            if not feature:
                return False
            
            usage = FeatureUsage(
                client_id=client_id,
                feature_id=feature.id,
                usage_date=datetime.utcnow(),
                usage_data=usage_data or {}
            )
            
            db.session.add(usage)
            db.session.commit()
            
            return True
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error recording feature usage for client {client_id}: {e}")
            return False
    
    def get_subscription_analytics(self) -> Dict:
        """Get subscription analytics for admin dashboard"""
        try:
            total_subscriptions = ClientSubscription.query.count()
            active_subscriptions = ClientSubscription.query.filter_by(is_active=True).count()
            
            # Get plan distribution
            plan_stats = db.session.query(
                SubscriptionPlan.name,
                db.func.count(ClientSubscription.id)
            ).join(ClientSubscription).filter(
                ClientSubscription.is_active == True
            ).group_by(SubscriptionPlan.name).all()
            
            return {
                'total_subscriptions': total_subscriptions,
                'active_subscriptions': active_subscriptions,
                'plan_distribution': dict(plan_stats),
                'revenue': self._calculate_monthly_revenue()
            }
            
        except Exception as e:
            self.logger.error(f"Error fetching subscription analytics: {e}")
            return {}
    
    def _calculate_monthly_revenue(self) -> float:
        """Calculate monthly recurring revenue"""
        try:
            active_subscriptions = ClientSubscription.query.filter_by(is_active=True).all()
            total_revenue = 0.0
            
            for subscription in active_subscriptions:
                if subscription.plan:
                    total_revenue += subscription.plan.price
            
            return total_revenue
            
        except Exception as e:
            self.logger.error(f"Error calculating revenue: {e}")
            return 0.0
    
    def get_expiring_subscriptions(self, days_ahead: int = 7) -> List[ClientSubscription]:
        """Get subscriptions expiring within specified days"""
        try:
            expiry_date = datetime.utcnow() + timedelta(days=days_ahead)
            return ClientSubscription.query.filter(
                ClientSubscription.is_active == True,
                ClientSubscription.end_date <= expiry_date,
                ClientSubscription.end_date >= datetime.utcnow()
            ).all()
            
        except Exception as e:
            self.logger.error(f"Error fetching expiring subscriptions: {e}")
            return []
    
    def renew_subscription(self, subscription_id: int) -> bool:
        """Renew a subscription"""
        try:
            subscription = ClientSubscription.query.get(subscription_id)
            if not subscription or not subscription.auto_renew:
                return False
            
            # Extend the subscription
            if subscription.plan.billing_cycle == 'monthly':
                subscription.end_date += timedelta(days=30)
            elif subscription.plan.billing_cycle == 'yearly':
                subscription.end_date += timedelta(days=365)
            
            db.session.commit()
            self.logger.info(f"Renewed subscription {subscription_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error renewing subscription {subscription_id}: {e}")
            return False
    
    @staticmethod
    def create_default_plans():
        """Create default subscription plans if they don't exist"""
        try:
            # Check if plans already exist
            if SubscriptionPlan.query.count() > 0:
                return
            
            # Create basic plan
            basic_plan = SubscriptionPlan(
                name='Basic',
                description='Basic healthcare marketing features',
                price=99.00,
                billing_cycle='monthly',
                is_active=True
            )
            db.session.add(basic_plan)
            
            # Create professional plan
            pro_plan = SubscriptionPlan(
                name='Professional',
                description='Professional healthcare marketing with advanced features',
                price=199.00,
                billing_cycle='monthly',
                is_active=True
            )
            db.session.add(pro_plan)
            
            # Create enterprise plan
            enterprise_plan = SubscriptionPlan(
                name='Enterprise',
                description='Enterprise healthcare marketing with all features',
                price=399.00,
                billing_cycle='monthly',
                is_active=True
            )
            db.session.add(enterprise_plan)
            
            db.session.commit()
            print("✅ Default subscription plans created successfully")
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error creating default plans: {e}")
