from datetime import datetime, timedelta, timezone
import os
import secrets
import random
import resend
from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from functools import wraps
from sqlalchemy import or_, text, extract
from flask_caching import Cache
from flask_migrate import Migrate
from dotenv import load_dotenv
from models import db, User, Contract, Message, TechnicianGallery, OTP, Review, Job, Booking

# Load environment variables from .env file (if it exists)
load_dotenv()

app = Flask(__name__)

# --- CONFIGURATION ---
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'techniserve_super_secret_key_2026')

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    if DATABASE_URL.startswith('postgres://'):
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
    print("✅ Using PostgreSQL database (Production)")
else:
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(basedir, 'techniserve.db')
    print("⚠️ Using SQLite database (Local Development)")

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,
    'pool_timeout': 30,
    'pool_recycle': 1800,
    'max_overflow': 20
}

# Caching configuration
app.config['CACHE_TYPE'] = 'SimpleCache'
app.config['CACHE_DEFAULT_TIMEOUT'] = 300
cache = Cache(app)

# File upload configuration
UPLOAD_FOLDER = os.path.join(basedir, 'static', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

os.makedirs(os.path.join(UPLOAD_FOLDER, 'contracts'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'profiles'), exist_ok=True)
os.makedirs(os.path.join(UPLOAD_FOLDER, 'gallery'), exist_ok=True)

# --- EMAIL CONFIGURATION (RESEND) ---
resend.api_key = os.environ.get("RESEND_API_KEY")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "noreply@techniserve.site")

def get_email_template(title, body_content, button_url=None, button_text="Go to Dashboard"):
    """
    MASTER EMAIL TEMPLATE: Ensures every email has the exact same professional layout.
    """
    button_html = ""
    if button_url and button_text:
        button_html = f'<a href="{button_url}" style="display: inline-block; padding: 12px 24px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">{button_text}</a>'

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 0;">
            <tr>
                <td align="center">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <!-- Header -->
                        <tr>
                            <td style="background-color: #2563EB; padding: 24px; text-align: center;">
                                <h1 style="color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px;">TECHNISERVE</h1>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px 30px;">
                                <h2 style="color: #111827; margin-top: 0; font-size: 22px;">{title}</h2>
                                <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                                    {body_content}
                                </div>
                                {button_html}
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                                <p style="color: #6b7280; font-size: 12px; margin: 0;">&copy; 2026 TECHNISERVE. All rights reserved.</p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

def send_email(recipient_email, subject, html_content):
    """Universal function to send HTML emails via Resend"""
    try:
        params = {
            "from": f"TECHNISERVE <{SENDER_EMAIL}>",
            "to": [recipient_email],
            "subject": subject,
            "html": html_content
        }
        email = resend.Emails.send(params)
        print(f"📧 Email sent successfully to {recipient_email}")
        return True
    except Exception as e:
        print(f"❌ Email Error: {e}")
        return False

# --- ALLOWED FILE EXTENSIONS ---
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# --- INITIALIZE EXTENSIONS ---
db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or current_user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        return f(*args, **kwargs)
    return decorated_function

@app.after_request
def add_header(response):
    if request.path.startswith('/static/'):
        response.headers['Cache-Control'] = 'public, max-age=604800'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

with app.app_context():
    db.create_all()
    admin = User.query.filter_by(role='admin').first()
    if not admin:
        admin = User(
            role='admin',
            email='admin@techniserve.com.ng',
            full_name='Super Admin',
            status='approved'
        )
        admin.set_password('Admin@Techniserve2026!')
        db.session.add(admin)
        db.session.commit()
        print("✅ Default Admin created: admin@techniserve.com.ng")

# ==========================================
# --- CLIENT ROUTES ---
# ==========================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/find-pro')
def find_pro():
    service = request.args.get('service', '')
    location = request.args.get('location', '')
    return render_template('find-pro.html', service=service, location=location)

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/success')
def success():
    success_type = request.args.get('type', 'generic')
    message = request.args.get('message', '')
    return render_template('success.html', success_type=success_type, custom_message=message)

@app.errorhandler(404)
def page_not_found(e):
    return render_template('404.html'), 404

# ==========================================
# --- TECHNICIAN ROUTES ---
# ==========================================

@app.route('/join-network')
def join_network():
    return render_template('join-network.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        data = request.get_json()
        if User.query.filter_by(phone=data.get('phone')).first():
            return jsonify({'success': False, 'message': 'This phone number is already registered.'}), 409
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'success': False, 'message': 'This email is already registered. Try logging in or use a different email.'}), 409
        
        new_user = User(
            role='technician',
            phone=data.get('phone'),
            email=data.get('email'),
            full_name=data.get('fullName'),
            nin=data.get('nin'),
            whatsapp=data.get('whatsapp'),
            skill=data.get('skill'),
            specialty=data.get('specialty'),
            experience=data.get('experience'),
            location=data.get('location'),
            status='pending'
        )
        new_user.set_password(data.get('password'))
        db.session.add(new_user)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Registration successful!'}), 201
    return render_template('signup.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.get_json()
        login_identifier = data.get('phone') or data.get('email')
        password = data.get('password')
        remember = data.get('rememberMe', False)

        print("\n" + "="*40)
        print(f"🔍 LOGIN ATTEMPT: '{login_identifier}'")
        print("="*40 + "\n")

        user = User.query.filter(or_(User.phone == login_identifier, User.email == login_identifier)).first()
        
        if user and user.check_password(password):
            if user.role == 'technician':
                if user.status != 'approved':
                    return jsonify({'success': False, 'message': 'Your account is pending approval. Please wait for admin verification.'}), 403
                if not user.is_active_account:
                    return jsonify({'success': False, 'message': 'Your account has been deactivated. Please contact support.'}), 403
                login_user(user, remember=remember)
                return jsonify({'success': True, 'redirect': url_for('dashboard')}), 200
            elif user.role == 'client':
                login_user(user, remember=remember)
                return jsonify({'success': True, 'redirect': url_for('client_dashboard')}), 200
            elif user.role == 'admin':
                login_user(user, remember=remember)
                return jsonify({'success': True, 'redirect': url_for('admin_dashboard')}), 200

        return jsonify({'success': False, 'message': 'Invalid credentials. Please check your phone number and password.'}), 401
    return render_template('login.html')

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'success': True}), 200

@app.route('/dashboard/profile')
def dashboard_profile():
    return redirect(url_for('dashboard'))

@app.route('/dashboard/jobs')
def dashboard_jobs():
    return redirect(url_for('dashboard'))

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    return render_template('forgot-password.html')

@app.route('/technician')
def technician_profile():
    phone = request.args.get('phone', '')
    return render_template('technician.html', phone=phone)

# ==========================================
# --- CONTRACT ROUTES ---
# ==========================================

@app.route('/contract')
def contract():
    return render_template('contract.html')

@app.route('/contract/sign')
def contract_sign():
    token = request.args.get('token', '')
    return render_template('contract-sign.html', token=token)

# ==========================================
# --- ADMIN ROUTES ---
# ==========================================

@app.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        admin = User.query.filter_by(email=email, role='admin').first()
        if admin and admin.check_password(password):
            login_user(admin)
            return jsonify({'success': True, 'redirect': url_for('admin_dashboard')}), 200
        else:
            return jsonify({'success': False, 'message': 'Invalid admin credentials.'}), 401
    return render_template('admin-login.html')

@app.route('/admin')
@login_required
def admin_dashboard():
    if current_user.role != 'admin':
        return redirect(url_for('index'))
    return render_template('admin.html')

@app.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    return jsonify({'success': True}), 200

# ==========================================
# --- ADMIN API ROUTES ---
# ==========================================

@app.route('/api/admin/technicians')
@admin_required
def api_get_technicians():
    technicians = User.query.filter_by(role='technician').order_by(User.created_at.desc()).all()
    result = []
    for t in technicians:
        result.append({
            'id': t.id, 'fullName': t.full_name, 'phone': t.phone, 'email': t.email, 'nin': t.nin,
            'whatsapp': t.whatsapp, 'skill': t.skill, 'specialty': t.specialty, 'experience': t.experience,
            'location': t.location, 'status': t.status, 'isActive': t.is_active_account,
            'registeredAt': t.created_at.isoformat() if t.created_at else None
        })
    return jsonify(result), 200

@app.route('/api/admin/technicians/<int:user_id>/approve', methods=['POST'])
@admin_required
def api_approve_technician(user_id):
    tech = User.query.get_or_404(user_id)
    tech.status = 'approved'
    db.session.commit()
    
    if tech.email:
        body = f"""
        <p>Hi <strong>{tech.full_name}</strong>,</p>
        <p>Your account has been <strong style="color: #10B981;">approved</strong> and you are now officially part of our network of verified professionals.</p>
        <p>You can now log in to your dashboard, update your portfolio, and start receiving job requests from clients across Owerri and Imo State.</p>
        """
        html_content = get_email_template("Welcome to TECHNISERVE! 🎉", body, url_for('login', _external=True), "Login to Dashboard")
        send_email(tech.email, "Welcome to TECHNISERVE! Your Account is Approved 🎉", html_content)
        
    return jsonify({'success': True, 'message': f'{tech.full_name} approved'}), 200

@app.route('/api/admin/technicians/<int:user_id>/reject', methods=['POST'])
@admin_required
def api_reject_technician(user_id):
    tech = User.query.get_or_404(user_id)
    tech.status = 'rejected'
    db.session.commit()
    return jsonify({'success': True, 'message': f'{tech.full_name} rejected'}), 200

@app.route('/api/admin/technicians/<int:user_id>/toggle-active', methods=['POST'])
@admin_required
def api_toggle_active(user_id):
    tech = User.query.get_or_404(user_id)
    tech.is_active_account = not tech.is_active_account
    db.session.commit()
    status = 'activated' if tech.is_active_account else 'deactivated'
    return jsonify({'success': True, 'message': f'{tech.full_name} {status}', 'isActive': tech.is_active_account}), 200

@app.route('/api/admin/contracts')
@admin_required
def api_get_contracts():
    contracts = Contract.query.order_by(Contract.created_at.desc()).all()
    result = []
    for c in contracts:
        result.append({
            'id': c.id, 'token': c.token, 'clientName': c.client_name, 'clientEmail': c.client_email,
            'clientPhone': c.client_phone, 'clientCountry': c.client_country, 'projectType': c.project_type,
            'projectLocation': c.project_location, 'projectTimeline': c.project_timeline,
            'projectDescription': c.project_description, 'buildingPlan': c.building_plan, 'status': c.status,
            'signature': c.signature, 'signatureMethod': c.signature_method,
            'createdAt': c.created_at.isoformat() if c.created_at else None,
            'signedAt': c.signed_at.isoformat() if c.signed_at else None
        })
    return jsonify(result), 200

@app.route('/api/admin/contracts/<int:contract_id>/update-status', methods=['POST'])
@admin_required
def api_update_contract_status(contract_id):
    data = request.get_json()
    contract = Contract.query.get_or_404(contract_id)
    contract.status = data.get('status', contract.status)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Status updated'}), 200

@app.route('/api/admin/messages')
@admin_required
def api_get_messages():
    messages = Message.query.order_by(Message.created_at.desc()).all()
    result = []
    for m in messages:
        result.append({
            'id': m.id, 'name': m.name, 'email': m.email, 'phone': m.phone, 'subject': m.subject,
            'message': m.message, 'read': m.is_read, 'createdAt': m.created_at.isoformat() if m.created_at else None
        })
    return jsonify(result), 200

@app.route('/api/admin/messages/<int:message_id>/read', methods=['POST'])
@admin_required
def api_mark_message_read(message_id):
    message = Message.query.get_or_404(message_id)
    message.is_read = True
    db.session.commit()
    return jsonify({'success': True}), 200

@app.route('/api/admin/jobs', methods=['POST'])
@admin_required
def api_create_job():
    data = request.get_json()
    new_job = Job(
        title=data.get('title'), description=data.get('description'), skill_required=data.get('skill_required'),
        location=data.get('location'), budget=data.get('budget'), client_name=data.get('client_name'),
        client_phone=data.get('client_phone')
    )
    db.session.add(new_job)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Job created successfully'}), 201

@app.route('/api/contact', methods=['POST'])
def api_submit_contact():
    data = request.get_json()
    new_message = Message(
        name=data.get('name'), email=data.get('email'), phone=data.get('phone'),
        subject=data.get('subject'), message=data.get('message')
    )
    db.session.add(new_message)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Message sent successfully'}), 201

# ==========================================
# --- TECHNICIAN API ROUTES ---
# ==========================================

@app.route('/api/technician/profile')
@login_required
def api_get_technician_profile():
    if current_user.role != 'technician':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    gallery_images = TechnicianGallery.query.filter_by(user_id=current_user.id).order_by(TechnicianGallery.created_at.desc()).all()
    gallery_urls = [{'id': img.id, 'url': img.image_path} for img in gallery_images]
    return jsonify({
        'id': current_user.id, 'fullName': current_user.full_name, 'phone': current_user.phone, 'email': current_user.email,
        'nin': current_user.nin, 'whatsapp': current_user.whatsapp, 'skill': current_user.skill, 'specialty': current_user.specialty,
        'experience': current_user.experience, 'location': current_user.location, 'status': current_user.status,
        'isActive': current_user.is_active_account, 'availabilityStatus': current_user.availability_status or 'available',
        'registeredAt': current_user.created_at.isoformat() if current_user.created_at else None,
        'profilePic': current_user.profile_pic, 'gallery': gallery_urls
    }), 200

@app.route('/api/technician/profile', methods=['PUT'])
@login_required
def api_update_technician_profile():
    if current_user.role != 'technician':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    if 'profilePic' in request.files:
        file = request.files['profilePic']
        if file and file.filename != '' and allowed_file(file.filename):
            if current_user.profile_pic:
                old_file_path = os.path.join(basedir, 'static', current_user.profile_pic.lstrip('/'))
                if os.path.exists(old_file_path): os.remove(old_file_path)
            ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"profile_{current_user.id}_{secrets.token_hex(8)}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, 'profiles', unique_filename)
            file.save(filepath)
            current_user.profile_pic = f"/static/uploads/profiles/{unique_filename}"
    if request.form.get('fullName'): current_user.full_name = request.form.get('fullName')
    if request.form.get('whatsapp'): current_user.whatsapp = request.form.get('whatsapp')
    db.session.commit()
    return jsonify({'success': True, 'message': 'Profile updated', 'profilePic': current_user.profile_pic}), 200

@app.route('/api/technician/availability', methods=['POST'])
@login_required
def api_update_availability():
    if current_user.role != 'technician':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    data = request.get_json()
    status = data.get('status', '').strip()
    if status not in ['available', 'busy', 'offline']:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400
    current_user.availability_status = status
    db.session.commit()
    return jsonify({'success': True, 'message': f'Status updated to {status}', 'status': status}), 200

# ==========================================
# --- GALLERY API ROUTES ---
# ==========================================

@app.route('/api/technician/gallery', methods=['POST'])
@login_required
def api_upload_gallery():
    if current_user.role != 'technician':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    files = request.files.getlist('galleryImages')
    uploaded_images = []
    for file in files:
        if file and file.filename != '' and allowed_file(file.filename):
            ext = file.filename.rsplit('.', 1)[1].lower()
            unique_filename = f"gallery_{current_user.id}_{secrets.token_hex(8)}.{ext}"
            filepath = os.path.join(UPLOAD_FOLDER, 'gallery', unique_filename)
            file.save(filepath)
            new_image = TechnicianGallery(user_id=current_user.id, image_path=f"/static/uploads/gallery/{unique_filename}")
            db.session.add(new_image)
            db.session.commit()
            uploaded_images.append({'id': new_image.id, 'url': new_image.image_path})
    return jsonify({'success': True, 'images': uploaded_images}), 201

@app.route('/api/technician/gallery/<int:image_id>', methods=['DELETE'])
@login_required
def api_delete_gallery(image_id):
    if current_user.role != 'technician':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    image = TechnicianGallery.query.filter_by(id=image_id, user_id=current_user.id).first()
    if not image:
        return jsonify({'success': False, 'message': 'Image not found'}), 404
    file_path = os.path.join(basedir, 'static', image.image_path.lstrip('/'))
    if os.path.exists(file_path): os.remove(file_path)
    db.session.delete(image)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Image deleted'}), 200

# ==========================================
# --- CONTRACT API ROUTES ---
# ==========================================

@app.route('/api/contract', methods=['POST'])
def api_submit_contract():
    try:
        client_name = request.form.get('clientName')
        client_email = request.form.get('clientEmail')
        client_phone = request.form.get('clientPhone')
        client_country = request.form.get('clientCountry')
        project_type = request.form.get('projectType')
        project_location = request.form.get('projectLocation')
        project_timeline = request.form.get('projectTimeline')
        project_description = request.form.get('projectDescription')
        
        if not all([client_name, client_email, client_phone, client_country, project_type, project_location, project_timeline]):
            return jsonify({'success': False, 'message': 'Missing required fields'}), 400
        
        token = 'TS-' + secrets.token_urlsafe(16)
        building_plan_path = None
        if 'buildingPlan' in request.files:
            file = request.files['buildingPlan']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                unique_filename = f"{token}_{filename}"
                file_path = os.path.join(UPLOAD_FOLDER, 'contracts', unique_filename)
                file.save(file_path)
                building_plan_path = f"/static/uploads/contracts/{unique_filename}"
        
        new_contract = Contract(
            token=token, client_name=client_name, client_email=client_email, client_phone=client_phone,
            client_country=client_country, project_type=project_type, project_location=project_location,
            project_timeline=project_timeline, project_description=project_description,
            building_plan=building_plan_path, status='pending'
        )
        db.session.add(new_contract)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Contract submitted successfully', 'token': token}), 201
    except Exception as e:
        db.session.rollback()
        print(f"❌ Contract submission error: {str(e)}")
        return jsonify({'success': False, 'message': f'Server error: {str(e)}'}), 500

@app.route('/api/contract/<token>')
def api_get_contract(token):
    contract = Contract.query.filter_by(token=token).first()
    if not contract:
        return jsonify({'success': False, 'message': 'Contract not found'}), 404
    return jsonify({
        'id': contract.id, 'token': contract.token, 'clientName': contract.client_name, 'clientEmail': contract.client_email,
        'clientPhone': contract.client_phone, 'clientCountry': contract.client_country, 'projectType': contract.project_type,
        'projectLocation': contract.project_location, 'projectTimeline': contract.project_timeline,
        'projectDescription': contract.project_description, 'buildingPlan': contract.building_plan, 'status': contract.status,
        'signature': contract.signature, 'signatureMethod': contract.signature_method,
        'createdAt': contract.created_at.isoformat() if contract.created_at else None,
        'signedAt': contract.signed_at.isoformat() if contract.signed_at else None
    }), 200

@app.route('/api/contract/<token>/sign', methods=['POST'])
def api_sign_contract(token):
    contract = Contract.query.filter_by(token=token).first()
    if not contract:
        return jsonify({'success': False, 'message': 'Contract not found'}), 404
    if contract.status == 'signed':
        return jsonify({'success': False, 'message': 'Contract already signed'}), 400
    data = request.get_json()
    contract.status = 'signed'
    contract.signed_at = datetime.now(timezone.utc)
    contract.signature = data.get('signature')
    contract.signature_method = data.get('signatureMethod')
    db.session.commit()
    
    if contract.client_email:
        body = f"""
        <p>Dear <strong>{contract.client_name}</strong>,</p>
        <p>Your contract for <strong>{contract.project_type}</strong> in <strong>{contract.project_location}</strong> has been successfully signed and received by our team.</p>
        <p>Our technicians will review your project details and reach out to you shortly to schedule the work.</p>
        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Contract Reference: <strong>{contract.token}</strong></p>
        """
        html_content = get_email_template("Contract Signed Successfully! ✍️", body)
        send_email(contract.client_email, f"Contract {contract.token} Signed Successfully ✍️", html_content)
        
    return jsonify({'success': True, 'message': 'Contract signed successfully'}), 200

# ==========================================
# --- SEARCH API ROUTE ---
# ==========================================

@app.route('/api/search-technicians')
@cache.cached(timeout=60, query_string=True)
def api_search_technicians():
    skill = request.args.get('skill', '').strip()
    location = request.args.get('location', '').strip()
    query = request.args.get('query', '').strip()
    q = User.query.filter_by(role='technician', status='approved', is_active_account=True)
    is_automation_search = skill.lower() == 'automation' or 'automation' in skill.lower()
    if skill: q = q.filter(User.skill == skill)
    if location and not is_automation_search:
        search_term = f"%{location}%"
        q = q.filter(User.location.ilike(search_term))
    if query:
        search_term = f"%{query}%"
        q = q.filter(or_(User.full_name.ilike(search_term), User.skill.ilike(search_term), User.specialty.ilike(search_term), User.location.ilike(search_term)))
    technicians = q.order_by(User.created_at.desc()).limit(50).all()
    result = []
    for t in technicians:
        result.append({
            'id': t.id, 'fullName': t.full_name, 'skill': t.skill, 'specialty': t.specialty, 'location': t.location,
            'experience': t.experience, 'profilePic': t.profile_pic, 'profileUrl': url_for('technician_profile', phone=t.phone),
            'isAutomation': is_automation_search, 'availabilityStatus': t.availability_status or 'available'
        })
    return jsonify({'technicians': result, 'isAutomationSearch': is_automation_search, 'totalResults': len(result)}), 200

# ==========================================
# --- PUBLIC TECHNICIAN PROFILE API ---
# ==========================================

@app.route('/api/technician/public')
@cache.cached(timeout=120, query_string=True)
def api_get_public_technician():
    phone = request.args.get('phone', '').strip()
    if not phone:
        return jsonify({'success': False, 'message': 'Phone number required'}), 400
    tech = User.query.filter_by(phone=phone, role='technician', status='approved', is_active_account=True).first()
    if not tech:
        return jsonify({'success': False, 'message': 'Technician not found'}), 404
    gallery_images = TechnicianGallery.query.filter_by(user_id=tech.id).order_by(TechnicianGallery.created_at.desc()).limit(20).all()
    gallery_urls = [{'id': img.id, 'url': img.image_path} for img in gallery_images]
    reviews = Review.query.filter_by(technician_phone=phone).order_by(Review.created_at.desc()).limit(10).all()
    total_reviews = Review.query.filter_by(technician_phone=phone).count()
    avg_rating = db.session.query(db.func.avg(Review.rating)).filter_by(technician_phone=phone).scalar() or 0
    reviews_data = [{'id': r.id, 'clientName': r.client_name, 'rating': r.rating, 'comment': r.comment, 'createdAt': r.created_at.strftime('%b %d, %Y')} for r in reviews]
    return jsonify({
        'id': tech.id, 'fullName': tech.full_name, 'phone': tech.phone, 'whatsapp': tech.whatsapp, 'skill': tech.skill,
        'specialty': tech.specialty, 'experience': tech.experience, 'location': tech.location, 'profilePic': tech.profile_pic,
        'registeredAt': tech.created_at.isoformat() if tech.created_at else None, 'gallery': gallery_urls,
        'averageRating': round(float(avg_rating), 1), 'totalReviews': total_reviews, 'reviews': reviews_data,
        'availabilityStatus': tech.availability_status or 'available'
    }), 200

# ==========================================
# --- JOB BOARD API ROUTES ---
# ==========================================

@app.route('/api/technician/jobs')
@login_required
def api_get_technician_jobs():
    tech = current_user
    jobs = Job.query.filter(or_((Job.technician_id == tech.id) & (Job.status.in_(['active', 'completed'])), (Job.status == 'new') & (Job.skill_required.ilike(f"%{tech.skill}%")))).order_by(Job.created_at.desc()).all()
    bookings = Booking.query.filter(Booking.technician_id == tech.id, Booking.source.notin_(['direct_call', 'direct_whatsapp'])).order_by(Booking.booking_date.desc()).all()
    result = []
    for j in jobs:
        if j.status == 'declined': continue
        result.append({'id': j.id, 'item_type': 'job', 'title': j.title, 'client': j.client_name, 'clientPhone': j.client_phone, 'location': j.location, 'budget': j.budget or 'Negotiable', 'description': j.description, 'status': j.status, 'createdAt': j.created_at.isoformat()})
    for b in bookings:
        result.append({'id': b.id, 'item_type': 'booking', 'title': b.service_type, 'client': b.client_name, 'clientPhone': b.client_phone, 'location': 'Direct Profile Booking', 'budget': 'Direct Booking', 'description': b.notes or 'Client booked this service directly from your public profile.', 'status': b.status, 'createdAt': b.booking_date.isoformat()})
    result.sort(key=lambda x: x['createdAt'], reverse=True)
    return jsonify(result), 200

@app.route('/api/technician/jobs/<int:item_id>/accept', methods=['POST'])
@login_required
def api_accept_item(item_id):
    booking = Booking.query.filter_by(id=item_id, technician_id=current_user.id).first()
    if booking:
        booking.status = 'active'
        db.session.commit()
        return jsonify({'success': True, 'message': 'Booking accepted'}), 200
    job = Job.query.get_or_404(item_id)
    is_assigned = (job.technician_id == current_user.id)
    is_new_and_matching = (job.status == 'new' and current_user.skill and job.skill_required.ilike(f"%{current_user.skill}%"))
    if not (is_assigned or is_new_and_matching):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    job.status = 'active'
    job.technician_id = current_user.id
    db.session.commit()
    return jsonify({'success': True, 'message': 'Job accepted'}), 200

@app.route('/api/technician/jobs/<int:item_id>/complete', methods=['POST'])
@login_required
def api_complete_item(item_id):
    booking = Booking.query.filter_by(id=item_id, technician_id=current_user.id).first()
    if booking:
        booking.status = 'completed'
        booking.completion_date = datetime.now(timezone.utc)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Booking completed'}), 200
    job = Job.query.get_or_404(item_id)
    if job.technician_id != current_user.id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    job.status = 'completed'
    db.session.commit()
    return jsonify({'success': True, 'message': 'Job completed'}), 200

@app.route('/api/technician/jobs/<int:item_id>/decline', methods=['POST'])
@login_required
def api_decline_item(item_id):
    booking = Booking.query.filter_by(id=item_id, technician_id=current_user.id).first()
    if booking:
        booking.status = 'declined'
        db.session.commit()
        return jsonify({'success': True, 'message': 'Booking declined'}), 200
    job = Job.query.get_or_404(item_id)
    is_assigned = (job.technician_id == current_user.id)
    is_new_and_matching = (job.status == 'new' and current_user.skill and job.skill_required.ilike(f"%{current_user.skill}%"))
    if not (is_assigned or is_new_and_matching):
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    if job.status == 'new':
        job.status = 'declined'
        db.session.commit()
    return jsonify({'success': True, 'message': 'Job declined'}), 200

@app.route('/api/booking', methods=['POST'])
def api_create_booking():
    data = request.get_json()
    technician_phone = data.get('technicianPhone', '').strip()
    client_name = data.get('clientName', '').strip()
    client_phone = data.get('clientPhone', '').strip()
    service_type = data.get('serviceType', '').strip()
    notes = data.get('notes', '').strip()
    if not all([technician_phone, client_name, client_phone, service_type]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    tech = User.query.filter_by(phone=technician_phone, role='technician').first()
    if not tech:
        return jsonify({'success': False, 'message': 'Technician not found'}), 404
    new_booking = Booking(technician_id=tech.id, client_name=client_name, client_phone=client_phone, service_type=service_type, source='direct_booking', status='new', booking_date=datetime.now(timezone.utc), notes=notes)
    db.session.add(new_booking)
    db.session.commit()
    
    if tech.email:
        body = f"""
        <p>Hi <strong>{tech.full_name}</strong>,</p>
        <p>A client has booked your services directly from your TECHNISERVE profile:</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 8px 0;"><strong>Service:</strong> {service_type}</p>
            <p style="margin: 8px 0;"><strong>Client:</strong> {client_name}</p>
            {f'<p style="margin: 8px 0;"><strong>Notes:</strong> {notes}</p>' if notes else ''}
        </div>
        <p>Please log in to your dashboard to accept this booking and contact the client.</p>
        """
        html_content = get_email_template("🎯 New Booking Request!", body, url_for('login', _external=True), "View Booking in Dashboard")
        send_email(tech.email, f" New Booking: {service_type} from {client_name}", html_content)
    
    return jsonify({'success': True, 'message': 'Booking request sent to technician!', 'bookingId': new_booking.id}), 201

# ==========================================
# --- POST A JOB ROUTES ---
# ==========================================

@app.route('/post-job')
def post_job():
    return render_template('post-job.html')

@app.route('/api/jobs', methods=['POST'])
def api_create_public_job():
    data = request.get_json()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    skill_required = data.get('skill', '').strip()
    location = data.get('location', '').strip()
    budget = data.get('budget', '').strip()
    if current_user.is_authenticated and current_user.role == 'client':
        client_name = current_user.full_name
        client_phone = current_user.phone
        client_email = current_user.email
    else:
        client_name = data.get('clientName', '').strip()
        client_phone = data.get('clientPhone', '').strip()
        client_email = data.get('clientEmail', '').strip()
    if not all([title, description, skill_required, location, client_name, client_phone]):
        return jsonify({'success': False, 'message': 'Please fill in all required fields'}), 400
    new_job = Job(title=title, description=description, skill_required=skill_required, location=location, budget=budget if budget else 'Negotiable', client_name=client_name, client_phone=client_phone, status='new')
    db.session.add(new_job)
    db.session.commit()
    matching_techs = User.query.filter_by(role='technician', skill=skill_required, status='approved', is_active_account=True).all()
    
    for tech in matching_techs:
        if tech.email:
            body = f"""
            <p>Hi <strong>{tech.full_name}</strong>,</p>
            <p>A new job matching your skills has been posted on TECHNISERVE:</p>
            <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
                <h3 style="margin: 0 0 8px 0; color: #111;">{title}</h3>
                <p style="margin: 4px 0;"><strong>Location:</strong> {location}</p>
                <p style="margin: 4px 0;"><strong>Budget:</strong> {budget or 'Negotiable'}</p>
            </div>
            <p>Log in to your dashboard to accept this job.</p>
            """
            html_content = get_email_template("🎯 New Job Match for You!", body, url_for('login', _external=True), "View Job")
            send_email(tech.email, f"🎯 New Job Alert: {title}", html_content)
    
    job_token = f"JOB-{new_job.id:04d}"
    return jsonify({'success': True, 'message': 'Job posted successfully! Technicians in your area will be notified.', 'jobToken': job_token, 'matchingTechnicians': len(matching_techs)}), 201

# ==========================================
# --- REVIEW API ROUTES ---
# ==========================================

@app.route('/api/reviews', methods=['POST'])
def api_create_review():
    data = request.get_json()
    phone = data.get('phone', '').strip()
    client_name = data.get('clientName', '').strip()
    rating = data.get('rating')
    comment = data.get('comment', '').strip()
    if not phone or not client_name or not rating:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    if not (1 <= int(rating) <= 5):
        return jsonify({'success': False, 'message': 'Rating must be between 1 and 5'}), 400
    tech = User.query.filter_by(phone=phone, role='technician').first()
    if not tech:
        return jsonify({'success': False, 'message': 'Technician not found'}), 404
    new_review = Review(technician_phone=phone, client_name=client_name, rating=int(rating), comment=comment)
    db.session.add(new_review)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Review submitted successfully!'}), 201

# ==========================================
# --- AUTH & OTP ROUTES ---
# ==========================================

@app.route('/api/auth/forgot-password', methods=['POST'])
def api_forgot_password():
    data = request.get_json()
    email = data.get('email', '').strip()
    if not email:
        return jsonify({'success': False, 'message': 'Email is required'}), 400
    user = User.query.filter_by(email=email, role='technician').first()
    if not user:
        return jsonify({'success': True, 'message': 'If this email is registered, an OTP has been sent.'}), 200
    otp_code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=5)
    OTP.query.filter_by(email=email, is_used=False).update({'is_used': True})
    new_otp = OTP(email=email, code=otp_code, expires_at=expires_at)
    db.session.add(new_otp)
    db.session.commit()
    
    body = f"""
    <p>Hello,</p>
    <p>Your verification code is:</p>
    <h1 style="background: #f3f4f6; padding: 15px; text-align: center; letter-spacing: 5px; color: #111; border-radius: 8px; margin: 20px 0;">{otp_code}</h1>
    <p>This code expires in <strong>5 minutes</strong>. Do not share this code with anyone.</p>
    """
    html_content = get_email_template("TECHNISERVE Password Reset", body)
    email_sent = send_email(email, "TECHNISERVE Password Reset Code", html_content)
    
    if email_sent:
        print(f"✅ OTP {otp_code} sent to {email}")
        return jsonify({'success': True, 'message': 'OTP sent successfully! Check your email.'}), 200
    else:
        return jsonify({'success': False, 'message': 'Failed to send email. Please try again.'}), 500

@app.route('/api/auth/verify-otp', methods=['POST'])
def api_verify_otp():
    data = request.get_json()
    email = data.get('email', '').strip()
    code = data.get('code', '').strip()
    if not email or not code:
        return jsonify({'success': False, 'message': 'Email and OTP are required'}), 400
    otp = OTP.query.filter_by(email=email, code=code, is_used=False).order_by(OTP.created_at.desc()).first()
    if not otp:
        return jsonify({'success': False, 'message': 'Invalid OTP code'}), 400
    if otp.expires_at < datetime.utcnow():
        return jsonify({'success': False, 'message': 'OTP has expired. Please request a new one.'}), 400
    return jsonify({'success': True, 'message': 'OTP verified successfully'}), 200

@app.route('/api/auth/reset-password', methods=['POST'])
def api_reset_password():
    data = request.get_json()
    email = data.get('email', '').strip()
    code = data.get('code', '').strip()
    new_password = data.get('password', '').strip()
    if not all([email, code, new_password]):
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    if len(new_password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400
    otp = OTP.query.filter_by(email=email, code=code, is_used=False).order_by(OTP.created_at.desc()).first()
    if not otp or otp.expires_at < datetime.utcnow():
        return jsonify({'success': False, 'message': 'Invalid or expired OTP'}), 400
    user = User.query.filter_by(email=email).first()
    if user:
        user.set_password(new_password)
        otp.is_used = True
        db.session.commit()
        print(f"✅ Password reset for {email}")
        return jsonify({'success': True, 'message': 'Password reset successfully!'}), 200
    return jsonify({'success': False, 'message': 'User not found'}), 404

# ==========================================
# --- ADMIN ANALYTICS API ROUTES ---
# ==========================================

@app.route('/admin/analytics')
@admin_required
def admin_analytics():
    return render_template('admin-analytics.html')

@app.route('/api/admin/analytics/overview')
@admin_required
def api_admin_analytics_overview():
    total_technicians = User.query.filter_by(role='technician').count()
    approved_technicians = User.query.filter_by(role='technician', status='approved').count()
    pending_technicians = User.query.filter_by(role='technician', status='pending').count()
    total_jobs = Job.query.count() + Booking.query.count()
    new_items = Job.query.filter_by(status='new').count() + Booking.query.filter_by(status='new').count()
    active_items = Job.query.filter_by(status='active').count() + Booking.query.filter_by(status='active').count()
    completed_items = Job.query.filter_by(status='completed').count() + Booking.query.filter_by(status='completed').count()
    total_contracts = Contract.query.count()
    signed_contracts = Contract.query.filter_by(status='signed').count()
    pending_contracts = Contract.query.filter_by(status='pending').count()
    total_reviews = Review.query.count()
    avg_rating = db.session.query(db.func.avg(Review.rating)).scalar() or 0
    total_messages = Message.query.count()
    unread_messages = Message.query.filter_by(is_read=False).count()
    return jsonify({
        'technicians': {'total': total_technicians, 'approved': approved_technicians, 'pending': pending_technicians},
        'jobs': {'total': total_jobs, 'new': new_items, 'active': active_items, 'completed': completed_items},
        'contracts': {'total': total_contracts, 'signed': signed_contracts, 'pending': pending_contracts},
        'reviews': {'total': total_reviews, 'avgRating': round(float(avg_rating), 1)},
        'messages': {'total': total_messages, 'unread': unread_messages}
    }), 200

@app.route('/api/admin/analytics/technician-growth')
@admin_required
def api_admin_analytics_technician_growth():
    current_year = datetime.now(timezone.utc).year
    monthly_data = []
    for month in range(1, 13):
        count = User.query.filter(User.role == 'technician', extract('year', User.created_at) == current_year, extract('month', User.created_at) == month).count()
        monthly_data.append({'month': datetime(current_year, month, 1).strftime('%b'), 'count': count})
    return jsonify(monthly_data), 200

@app.route('/api/admin/analytics/popular-skills')
@admin_required
def api_admin_analytics_popular_skills():
    skills = db.session.query(User.skill, db.func.count(User.id).label('count')).filter(User.role == 'technician', User.status == 'approved').group_by(User.skill).order_by(db.desc('count')).limit(10).all()
    return jsonify([{'skill': skill, 'count': count} for skill, count in skills]), 200

@app.route('/api/admin/analytics/job-completion')
@admin_required
def api_admin_analytics_job_completion():
    new_items = Job.query.filter_by(status='new').count() + Booking.query.filter_by(status='new').count()
    active_items = Job.query.filter_by(status='active').count() + Booking.query.filter_by(status='active').count()
    completed_items = Job.query.filter_by(status='completed').count() + Booking.query.filter_by(status='completed').count()
    return jsonify({'new': new_items, 'active': active_items, 'completed': completed_items}), 200

@app.route('/api/admin/analytics/recent-activity')
@admin_required
def api_admin_analytics_recent_activity():
    recent_technicians = User.query.filter_by(role='technician').order_by(User.created_at.desc()).limit(5).all()
    recent_jobs = Job.query.order_by(Job.created_at.desc()).limit(5).all()
    recent_contracts = Contract.query.order_by(Contract.created_at.desc()).limit(5).all()
    recent_reviews = Review.query.order_by(Review.created_at.desc()).limit(5).all()
    return jsonify({
        'technicians': [{'id': t.id, 'name': t.full_name, 'skill': t.skill, 'status': t.status, 'registeredAt': t.created_at.isoformat()} for t in recent_technicians],
        'jobs': [{'id': j.id, 'title': j.title, 'client': j.client_name, 'status': j.status, 'createdAt': j.created_at.isoformat()} for j in recent_jobs],
        'contracts': [{'id': c.id, 'token': c.token, 'client': c.client_name, 'status': c.status, 'createdAt': c.created_at.isoformat()} for c in recent_contracts],
        'reviews': [{'id': r.id, 'technicianPhone': r.technician_phone, 'clientName': r.client_name, 'rating': r.rating, 'createdAt': r.created_at.isoformat()} for r in recent_reviews]
    }), 200

@app.route('/api/admin/analytics/technician-performance')
@admin_required
def api_admin_analytics_technician_performance():
    technicians = User.query.filter_by(role='technician', status='approved').all()
    result = []
    for tech in technicians:
        direct_bookings = Booking.query.filter_by(technician_id=tech.id).count()
        assigned_jobs = Job.query.filter(Job.technician_id == tech.id, Job.status.in_(['active', 'completed'])).count()
        total_work = direct_bookings + assigned_jobs
        completed_bookings = Booking.query.filter_by(technician_id=tech.id, status='completed').count()
        completed_jobs = Job.query.filter_by(technician_id=tech.id, status='completed').count()
        completed_work = completed_bookings + completed_jobs
        current_month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_bookings = Booking.query.filter(Booking.technician_id == tech.id, Booking.booking_date >= current_month_start).count()
        monthly_jobs = Job.query.filter(Job.technician_id == tech.id, Job.status.in_(['active', 'completed']), Job.created_at >= current_month_start).count()
        monthly_work = monthly_bookings + monthly_jobs
        result.append({'id': tech.id, 'name': tech.full_name, 'skill': tech.skill, 'location': tech.location, 'totalBookings': total_work, 'completedBookings': completed_work, 'monthlyBookings': monthly_work, 'profilePic': tech.profile_pic})
    result.sort(key=lambda x: x['totalBookings'], reverse=True)
    return jsonify(result), 200

@app.route('/api/admin/analytics/booking-trends')
@admin_required
def api_admin_analytics_booking_trends():
    current_year = datetime.now(timezone.utc).year
    monthly_data = []
    for month in range(1, 13):
        month_start = datetime(current_year, month, 1)
        month_end = datetime(current_year + 1, 1, 1) if month == 12 else datetime(current_year, month + 1, 1)
        count = Booking.query.filter(Booking.booking_date >= month_start, Booking.booking_date < month_end).count()
        monthly_data.append({'month': month_start.strftime('%b'), 'count': count})
    return jsonify(monthly_data), 200

@app.route('/api/admin/analytics/booking-source')
@admin_required
def api_admin_analytics_booking_source():
    job_board_count = Booking.query.filter_by(source='job_board').count()
    direct_booking_count = Booking.query.filter_by(source='direct_booking').count()
    direct_call_count = Booking.query.filter_by(source='direct_call').count()
    direct_whatsapp_count = Booking.query.filter_by(source='direct_whatsapp').count()
    return jsonify({'jobBoard': job_board_count, 'directBooking': direct_booking_count, 'directCall': direct_call_count, 'directWhatsapp': direct_whatsapp_count}), 200

# ==========================================
# --- SILENT CONTACT LOGGING ---
# ==========================================

@app.route('/api/technician/log-contact', methods=['POST'])
def api_log_contact():
    data = request.get_json()
    technician_phone = data.get('technicianPhone', '').strip()
    contact_method = data.get('method', '').strip()
    if not technician_phone or contact_method not in ['direct_call', 'direct_whatsapp']:
        return jsonify({'success': False, 'message': 'Invalid request'}), 400
    tech = User.query.filter_by(phone=technician_phone, role='technician').first()
    if not tech:
        return jsonify({'success': False, 'message': 'Technician not found'}), 404
    new_log = Booking(technician_id=tech.id, client_name='Anonymous Visitor', client_phone='N/A', service_type='Profile Contact', source=contact_method, status='completed', booking_date=datetime.now(timezone.utc), notes=f'Client contacted technician via {"phone call" if contact_method == "direct_call" else "WhatsApp"} from profile page.')
    db.session.add(new_log)
    db.session.commit()
    return jsonify({'success': True}), 201

# ==========================================
# --- CLIENT AUTH & DASHBOARD ROUTES ---
# ==========================================

@app.route('/client/signup', methods=['GET', 'POST'])
def client_signup():
    if current_user.is_authenticated and current_user.role == 'client':
        return redirect(url_for('client_dashboard'))
    if request.method == 'POST':
        data = request.get_json()
        if User.query.filter_by(email=data.get('email')).first():
            return jsonify({'success': False, 'message': 'This email is already registered.'}), 409
        if User.query.filter_by(phone=data.get('phone')).first():
            return jsonify({'success': False, 'message': 'This phone number is already registered.'}), 409
        new_client = User(role='client', full_name=data.get('fullName'), email=data.get('email'), phone=data.get('phone'), status='approved')
        new_client.set_password(data.get('password'))
        db.session.add(new_client)
        db.session.commit()
        login_user(new_client) 
        return jsonify({'success': True, 'redirect': url_for('client_dashboard')}), 201
    return render_template('client-signup.html')

@app.route('/client/dashboard')
@login_required
def client_dashboard():
    if current_user.role != 'client':
        return redirect(url_for('index'))
    return render_template('client-dashboard.html')

@app.route('/api/client/data')
@login_required
def api_client_data():
    if current_user.role != 'client':
        return jsonify({'error': 'Unauthorized'}), 403
    my_jobs = Job.query.filter_by(client_phone=current_user.phone).order_by(Job.created_at.desc()).all()
    my_bookings = Booking.query.filter_by(client_phone=current_user.phone).order_by(Booking.booking_date.desc()).all()
    my_contracts = Contract.query.filter_by(client_email=current_user.email).order_by(Contract.created_at.desc()).all()
    return jsonify({
        'user': {'name': current_user.full_name, 'email': current_user.email, 'phone': current_user.phone},
        'jobs': [{'id': j.id, 'title': j.title, 'status': j.status, 'createdAt': j.created_at.strftime('%b %d, %Y')} for j in my_jobs],
        'bookings': [{'id': b.id, 'service': b.service_type, 'technician': b.technician.full_name if b.technician else 'Pending', 'status': b.status, 'date': b.booking_date.strftime('%b %d, %Y')} for b in my_bookings],
        'contracts': [{'id': c.id, 'token': c.token, 'project': c.project_type, 'status': c.status, 'createdAt': c.created_at.strftime('%b %d, %Y')} for c in my_contracts]
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)