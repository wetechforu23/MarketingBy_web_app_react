"""
API Quota Management System
Prevents charges by tracking and limiting API usage
"""

import os
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class QuotaUsage:
    """Track API usage for a specific period"""
    date: str
    requests_made: int
    requests_limit: int
    last_reset: str
    cost_estimate: float = 0.0

class APIQuotaManager:
    """Manages API quotas to prevent charges"""
    
    def __init__(self, quota_file: str = "temp/api_quota.json"):
        self.quota_file = Path(quota_file)
        self.quota_file.parent.mkdir(exist_ok=True)
        
        # Google Places API limits (Updated 2024-2025 pricing)
        # $200 monthly free credit = ~100,000 requests per month
        # Daily average: ~3,333 requests per day
        self.daily_limit = 3333  # 100,000 / 30 days = ~3,333 per day
        self.monthly_limit = 100000  # 100,000 free requests per month
        self.cost_per_request = 0.002  # Average cost per request (varies by type)
        
        # Safety limits (stop before hitting actual limits)
        self.safety_daily_limit = 3000  # Stop at 3,000 to be safe (90% of daily limit)
        self.safety_monthly_limit = 90000  # Stop at 90k to be safe (90% of monthly limit)
        
        # Warning thresholds (alert when approaching limits)
        self.warning_daily_threshold = 2700  # 90% of daily limit (3,000)
        self.warning_monthly_threshold = 81000  # 90% of monthly limit (90,000)
        
        # Critical thresholds (stop API calls)
        self.critical_daily_threshold = 3000  # 100% of daily limit
        self.critical_monthly_threshold = 90000  # 100% of monthly limit
        
        # Monthly reset day
        self.monthly_reset_day = 22
        
        self.usage = self._load_usage()
    
    def _load_usage(self) -> Dict[str, QuotaUsage]:
        """Load usage data from file"""
        if not self.quota_file.exists():
            return {}
        
        try:
            with open(self.quota_file, 'r') as f:
                data = json.load(f)
                return {
                    date: QuotaUsage(**usage) 
                    for date, usage in data.items()
                }
        except Exception as e:
            print(f"Error loading quota data: {e}")
            return {}
    
    def _save_usage(self):
        """Save usage data to file"""
        try:
            data = {
                date: asdict(usage) 
                for date, usage in self.usage.items()
            }
            with open(self.quota_file, 'w') as f:
                json.dump(data, f, indent=2)
        except Exception as e:
            print(f"Error saving quota data: {e}")
    
    def _get_today_key(self) -> str:
        """Get today's date key"""
        return datetime.now().strftime('%Y-%m-%d')
    
    def _get_month_key(self) -> str:
        """Get current month key"""
        return datetime.now().strftime('%Y-%m')
    
    def can_make_request(self, request_count: int = 1) -> Tuple[bool, str]:
        """
        Check if we can make API requests without exceeding limits
        
        Returns:
            (can_make_request, reason)
        """
        today = self._get_today_key()
        month = self._get_month_key()
        
        # Check if monthly reset is needed
        self._check_monthly_reset()
        
        # Get today's usage
        today_usage = self.usage.get(today, QuotaUsage(
            date=today,
            requests_made=0,
            requests_limit=self.daily_limit,
            last_reset=today
        ))
        
        # Check monthly limit first
        monthly_requests = sum(
            usage.requests_made for date, usage in self.usage.items()
            if date.startswith(month)
        )
        
        # Critical monthly limit check (100% - STOP API CALLS)
        if monthly_requests + request_count > self.critical_monthly_threshold:
            return False, f"CRITICAL: Monthly limit reached ({monthly_requests}/{self.critical_monthly_threshold}) - API calls stopped until next month"
        
        # Critical daily limit check (100% - STOP API CALLS)
        if today_usage.requests_made + request_count > self.critical_daily_threshold:
            return False, f"CRITICAL: Daily limit reached ({today_usage.requests_made}/{self.critical_daily_threshold}) - API calls stopped until tomorrow"
        
        # Safety monthly limit check (90% - WARNING)
        if monthly_requests + request_count > self.safety_monthly_limit:
            return False, f"WARNING: Monthly limit approaching ({monthly_requests}/{self.safety_monthly_limit}) - API calls stopped for safety"
        
        # Safety daily limit check (90% - WARNING)
        if today_usage.requests_made + request_count > self.safety_daily_limit:
            return False, f"WARNING: Daily limit approaching ({today_usage.requests_made}/{self.safety_daily_limit}) - API calls stopped for safety"
        
        return True, "OK"
    
    def record_request(self, request_count: int = 1, cost: float = 0.0):
        """Record API request usage"""
        today = self._get_today_key()
        
        if today not in self.usage:
            self.usage[today] = QuotaUsage(
                date=today,
                requests_made=0,
                requests_limit=self.daily_limit,
                last_reset=today
            )
        
        self.usage[today].requests_made += request_count
        self.usage[today].cost_estimate += cost
        self.usage[today].last_reset = datetime.now().isoformat()
        
        self._save_usage()
    
    def get_usage_stats(self) -> Dict:
        """Get current usage statistics"""
        today = self._get_today_key()
        month = self._get_month_key()
        
        today_usage = self.usage.get(today, QuotaUsage(
            date=today,
            requests_made=0,
            requests_limit=self.daily_limit,
            last_reset=today
        ))
        
        monthly_requests = sum(
            usage.requests_made for date, usage in self.usage.items()
            if date.startswith(month)
        )
        
        monthly_cost = sum(
            usage.cost_estimate for date, usage in self.usage.items()
            if date.startswith(month)
        )
        
        return {
            'today': {
                'requests_made': today_usage.requests_made,
                'requests_limit': self.safety_daily_limit,
                'percentage': (today_usage.requests_made / self.safety_daily_limit) * 100,
                'remaining': self.safety_daily_limit - today_usage.requests_made
            },
            'monthly': {
                'requests_made': monthly_requests,
                'requests_limit': self.safety_monthly_limit,
                'percentage': (monthly_requests / self.safety_monthly_limit) * 100,
                'remaining': self.safety_monthly_limit - monthly_requests
            },
            'cost_estimate': monthly_cost,
            'status': 'SAFE' if today_usage.requests_made < self.safety_daily_limit * 0.8 else 'WARNING'
        }
    
    def reset_daily_usage(self):
        """Reset daily usage (called automatically at midnight)"""
        today = self._get_today_key()
        if today in self.usage:
            self.usage[today].requests_made = 0
            self.usage[today].cost_estimate = 0
            self.usage[today].last_reset = datetime.now().isoformat()
            self._save_usage()
    
    def cleanup_old_data(self, days_to_keep: int = 30):
        """Clean up old usage data"""
        cutoff_date = datetime.now() - timedelta(days=days_to_keep)
        cutoff_key = cutoff_date.strftime('%Y-%m-%d')
        
        self.usage = {
            date: usage for date, usage in self.usage.items()
            if date >= cutoff_key
        }
        self._save_usage()
    
    def _check_monthly_reset(self):
        """Check if monthly reset is needed (on the 22nd of each month)"""
        today = datetime.now()
        
        # Check if today is the 22nd and we haven't reset this month
        if today.day == self.monthly_reset_day:
            month_key = self._get_month_key()
            
            # Check if we've already reset this month
            reset_key = f"reset_{month_key}"
            if reset_key not in self.usage:
                # Perform monthly reset
                self._perform_monthly_reset()
                # Mark this month as reset
                self.usage[reset_key] = QuotaUsage(
                    date=reset_key,
                    requests_made=0,
                    requests_limit=0,
                    last_reset=today.isoformat()
                )
                self._save_usage()
    
    def _perform_monthly_reset(self):
        """Perform monthly reset of all usage data"""
        current_month = self._get_month_key()
        
        # Remove all usage data from previous months
        self.usage = {
            date: usage for date, usage in self.usage.items()
            if date.startswith(current_month) or date.startswith('reset_')
        }
        
        # Log the reset
        print(f"🔄 Monthly quota reset performed on {datetime.now().strftime('%Y-%m-%d')}")
    
    def get_quota_warning(self) -> Optional[str]:
        """Get quota warning message if approaching limits"""
        stats = self.get_usage_stats()
        
        # Critical warnings (100% - API calls stopped)
        if stats['today']['percentage'] >= 100:
            return f"🚨 CRITICAL: Daily quota reached ({stats['today']['requests_made']}/{stats['today']['requests_limit']}) - API calls stopped until tomorrow"
        elif stats['monthly']['percentage'] >= 100:
            return f"🚨 CRITICAL: Monthly quota reached ({stats['monthly']['requests_made']}/{stats['monthly']['requests_limit']}) - API calls stopped until next month"
        
        # Warning thresholds (90% - approaching limits)
        elif stats['today']['percentage'] >= 90:
            return f"⚠️ WARNING: Daily quota almost reached ({stats['today']['requests_made']}/{stats['today']['requests_limit']}) - API calls will stop soon"
        elif stats['monthly']['percentage'] >= 90:
            return f"⚠️ WARNING: Monthly quota almost reached ({stats['monthly']['requests_made']}/{stats['monthly']['requests_limit']}) - API calls will stop soon"
        
        # Caution thresholds (70% - getting close)
        elif stats['today']['percentage'] >= 70:
            return f"⚠️ CAUTION: Daily quota at {stats['today']['percentage']:.1f}% ({stats['today']['requests_made']}/{stats['today']['requests_limit']})"
        elif stats['monthly']['percentage'] >= 70:
            return f"⚠️ CAUTION: Monthly quota at {stats['monthly']['percentage']:.1f}% ({stats['monthly']['requests_made']}/{stats['monthly']['requests_limit']})"
        
        return None
    
    def force_monthly_reset(self):
        """Force a monthly reset (manual override)"""
        self._perform_monthly_reset()
        current_month = self._get_month_key()
        reset_key = f"reset_{current_month}"
        self.usage[reset_key] = QuotaUsage(
            date=reset_key,
            requests_made=0,
            requests_limit=0,
            last_reset=datetime.now().isoformat()
        )
        self._save_usage()
        return f"Monthly quota reset performed manually on {datetime.now().strftime('%Y-%m-%d')}"

# Global quota manager instance
quota_manager = APIQuotaManager()

def check_api_quota(request_count: int = 1) -> Tuple[bool, str]:
    """Check if we can make API requests"""
    return quota_manager.can_make_request(request_count)

def record_api_usage(request_count: int = 1, cost: float = 0.0):
    """Record API usage"""
    quota_manager.record_request(request_count, cost)

def get_quota_stats() -> Dict:
    """Get quota statistics"""
    return quota_manager.get_usage_stats()

def get_quota_warning() -> Optional[str]:
    """Get quota warning"""
    return quota_manager.get_quota_warning()
