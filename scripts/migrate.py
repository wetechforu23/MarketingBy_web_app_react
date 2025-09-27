"""
Database migration script for Heroku deployment
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def migrate():
    """Run database migrations"""
    try:
        from app import create_app, db
        
        # Create app
        app = create_app()
        
        with app.app_context():
            # Import models after app context is created
            from app.models import *
            
            # Create all tables
            db.create_all()
            print("✅ Database tables created successfully")
            
            print("🎉 Migration completed successfully!")
            
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        raise

if __name__ == '__main__':
    migrate()
