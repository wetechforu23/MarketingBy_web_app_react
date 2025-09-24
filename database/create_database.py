#!/usr/bin/env python3
"""
Create PostgreSQL database and tables for Health Clinic Marketing System
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv
import logging

load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_database():
    """Create the health_clinic_marketing database if it doesn't exist"""
    
    # Connection parameters for default postgres database
    conn_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': 'postgres'  # Connect to default database first
    }
    
    try:
        # Connect to PostgreSQL server
        conn = psycopg2.connect(**conn_params)
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute("SELECT 1 FROM pg_catalog.pg_database WHERE datname = 'health_clinic_marketing'")
        exists = cursor.fetchone()
        
        if not exists:
            # Create database
            cursor.execute('CREATE DATABASE health_clinic_marketing')
            logger.info("✅ Database 'health_clinic_marketing' created successfully!")
        else:
            logger.info("✅ Database 'health_clinic_marketing' already exists")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating database: {str(e)}")
        return False

def create_tables():
    """Create all tables in the health_clinic_marketing database"""
    
    # Connection parameters for our database
    conn_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': 'health_clinic_marketing'
    }
    
    try:
        # Read SQL file
        sql_file_path = os.path.join(os.path.dirname(__file__), 'init_postgresql.sql')
        with open(sql_file_path, 'r') as file:
            sql_commands = file.read()
        
        # Connect to our database
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        
        # Execute SQL commands
        cursor.execute(sql_commands)
        conn.commit()
        
        logger.info("✅ All tables created successfully!")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        logger.info(f"✅ Created {len(tables)} tables:")
        for table in tables:
            logger.info(f"  - {table[0]}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error creating tables: {str(e)}")
        return False

def test_connection():
    """Test database connection and show sample data"""
    
    conn_params = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5432'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', ''),
        'database': 'health_clinic_marketing'
    }
    
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()
        
        # Test query
        cursor.execute("SELECT COUNT(*) FROM companies")
        company_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM lead_sources")
        source_count = cursor.fetchone()[0]
        
        logger.info(f"✅ Database connection successful!")
        logger.info(f"✅ Companies: {company_count}")
        logger.info(f"✅ Lead sources: {source_count}")
        
        cursor.close()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        return False

def main():
    """Main function to set up the database"""
    
    print("🏥 Health Clinic Marketing Database Setup")
    print("=" * 50)
    
    # Step 1: Create database
    print("\n📊 Step 1: Creating database...")
    if not create_database():
        print("❌ Failed to create database. Please check your PostgreSQL connection.")
        return False
    
    # Step 2: Create tables
    print("\n📋 Step 2: Creating tables...")
    if not create_tables():
        print("❌ Failed to create tables.")
        return False
    
    # Step 3: Test connection
    print("\n🔌 Step 3: Testing connection...")
    if not test_connection():
        print("❌ Database connection test failed.")
        return False
    
    print("\n🎉 Database setup completed successfully!")
    print("\n📝 Next steps:")
    print("1. Update your .env file with database connection details:")
    print("   DATABASE_URL=postgresql://username:password@localhost:5432/health_clinic_marketing")
    print("2. Restart your application")
    print("3. The system will now use PostgreSQL instead of SQLite")
    
    return True

if __name__ == "__main__":
    # Check for required environment variables
    required_vars = ['DB_USER']
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        print("⚠️  Please set the following environment variables:")
        for var in missing_vars:
            if var == 'DB_USER':
                print(f"  export {var}=your_postgres_username")
            elif var == 'DB_PASSWORD':
                print(f"  export {var}=your_postgres_password")
        print("\nOr add them to your .env file")
        exit(1)
    
    success = main()
    exit(0 if success else 1)


