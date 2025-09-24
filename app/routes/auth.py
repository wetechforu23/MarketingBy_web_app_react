"""
Authentication Routes
"""

from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from app.models.user import User
from app import db

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            session['user_id'] = user.id
            session['username'] = user.username
            session['role'] = user.role
            session['client_website'] = user.client_website
            
            # Update last login
            from datetime import datetime
            user.last_login = datetime.utcnow()
            db.session.commit()
            
            if user.role == 'admin':
                return redirect('/admin')
            elif user.role == 'customer':
                return redirect('/customer')
        else:
            flash('Invalid username or password', 'error')
    
    return '''
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login - WeTechForU AI Marketing Platform</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            body { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; }
            .login-container { max-width: 400px; margin: 100px auto; }
            .card { border: none; border-radius: 15px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
            .btn-login { background: linear-gradient(45deg, #667eea, #764ba2); border: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="login-container">
                <div class="card">
                    <div class="card-body p-5">
                        <h2 class="text-center mb-4">🤖 WeTechForU AI</h2>
                        <h4 class="text-center mb-4">Marketing Platform</h4>
                        <form method="POST">
                            <div class="mb-3">
                                <label class="form-label">Username</label>
                                <input type="text" class="form-control" name="username" required>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Password</label>
                                <input type="password" class="form-control" name="password" required>
                            </div>
                            <button type="submit" class="btn btn-primary btn-login w-100">Login</button>
                        </form>
                        <div class="text-center mt-3">
                            <small class="text-muted">
                                <strong>Working Credentials:</strong><br>
                                Admin: admin/admin123<br>
                                ProMed: promed/Promed123<br>
                                WeTechForU: wetechforu/Wetechforu123
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    '''

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect('/home')
