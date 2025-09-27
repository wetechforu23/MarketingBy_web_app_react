"""
Simple database migration script for Heroku deployment
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def simple_migrate():
    """Run simple database migrations"""
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # Get database URL from environment
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ No DATABASE_URL found in environment")
            return False
            
        print(f"📊 Database URL found: {database_url[:50]}...")
        
        # Parse the URL
        parsed = urlparse(database_url)
        
        # Connect to database
        conn = psycopg2.connect(
            host=parsed.hostname,
            port=parsed.port,
            database=parsed.path[1:],  # Remove leading slash
            user=parsed.username,
            password=parsed.password
        )
        
        conn.autocommit = True
        cursor = conn.cursor()
        
        print("✅ Connected to PostgreSQL database successfully")
        
        # Create a simple test table to verify connection
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS test_table (
                id SERIAL PRIMARY KEY,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        print("✅ Test table created successfully")
        
        # Insert a test record
        cursor.execute("INSERT INTO test_table (message) VALUES (%s)", ("Migration test",))
        
        print("✅ Test record inserted successfully")
        
        cursor.close()
        conn.close()
        
        print("🎉 Simple migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Simple migration failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = simple_migrate()
    sys.exit(0 if success else 1)
