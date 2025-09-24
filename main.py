"""
WeTechForU AI Marketing Platform
Main Application Entry Point
"""

import os
import socket
from app import create_app

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Create Flask app
app = create_app()

# Get dedicated port from environment or default
DEDICATED_PORT = int(os.getenv('FLASK_PORT', 9000))

if __name__ == '__main__':
    print("🤖 WeTechForU AI Marketing Platform")
    print("=" * 60)
    print(f"🌐 Server running on http://localhost:{DEDICATED_PORT}")
    print(f"🔧 Debug mode: {app.debug}")
    print("=" * 60)
    print("📊 Available Features:")
    print("• AI-Powered Client Management & CRM")
    print("• Intelligent SEO Audit & Optimization")
    print("• Multi-Industry Lead Discovery")
    print("• Automated Campaign Management")
    print("• Content Approval Workflow")
    print("• Real-time Analytics Dashboard")
    print("• Keyword Research & Competitor Analysis")
    print("\n🚀 Starting WeTechForU AI Marketing Platform...")
    
    try:
        app.run(debug=True, host='0.0.0.0', port=DEDICATED_PORT)
    except OSError as e:
        if "Address already in use" in str(e):
            print(f"❌ Port {DEDICATED_PORT} is already in use!")
            print(f"🔧 Please stop the other application using port {DEDICATED_PORT}")
            print(f"💡 Or kill the process: lsof -ti:{DEDICATED_PORT} | xargs kill -9")
        else:
            print(f"❌ Error starting server: {e}")
        exit(1)

