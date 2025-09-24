#!/usr/bin/env python3
"""
Database initialization script for Health Clinic Marketing System
"""

import os
import sys
from pathlib import Path

# Add the parent directory to the Python path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

from app import app, db
from dotenv import load_dotenv

def init_database():
    """
    Initialize the database with tables
    """
    load_dotenv()
    
    print("Initializing database...")
    
    with app.app_context():
        try:
            # Create all tables
            db.create_all()
            print("✓ Database tables created successfully!")
            
            # You can add sample data here if needed
            print("✓ Database initialization complete!")
            
        except Exception as e:
            print(f"✗ Error initializing database: {str(e)}")
            return False
    
    return True

if __name__ == "__main__":
    success = init_database()
    sys.exit(0 if success else 1)

