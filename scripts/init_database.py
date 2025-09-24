#!/usr/bin/env python3
"""
Database Initialization Script
Sets up the complete PostgreSQL database with proper schema
"""

import os
import sys
import psycopg2
from pathlib import Path

# Add parent directory to path
parent_dir = Path(__file__).parent.parent
sys.path.append(str(parent_dir))

from dotenv import load_dotenv

def main():
    """Initialize the database with proper schema"""
    load_dotenv()
    
    # Database connection parameters
    POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'localhost')
    POSTGRES_PORT = os.getenv('POSTGRES_PORT', 5432)
    POSTGRES_DB = os.getenv('POSTGRES_DB', 'health_clinic_marketing')
    POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
    POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', 'password')
    
    try:
        # Connect to PostgreSQL
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            port=POSTGRES_PORT,
            database=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD
        )
        
        print(f"✅ Connected to PostgreSQL: {POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}")
        
        # Read and execute schema
        schema_path = parent_dir / 'database' / 'schema.sql'
        
        if not schema_path.exists():
            print(f"❌ Schema file not found: {schema_path}")
            return False
        
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        cursor = conn.cursor()
        
        # Execute schema
        print("🔧 Executing database schema...")
        cursor.execute(schema_sql)
        conn.commit()
        
        print("✅ Database schema created successfully!")
        
        # Verify tables were created
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        """)
        
        tables = cursor.fetchall()
        print(f"📊 Created {len(tables)} tables:")
        for table in tables:
            print(f"   • {table[0]}")
        
        # Get table counts
        print("\n📈 Table Statistics:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table[0]}")
            count = cursor.fetchone()[0]
            print(f"   • {table[0]}: {count} rows")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Database initialization completed successfully!")
        print("🚀 Ready to start the application!")
        
        return True
        
    except psycopg2.Error as e:
        print(f"❌ PostgreSQL Error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)


