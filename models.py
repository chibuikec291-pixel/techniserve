from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

db = SQLAlchemy()

# --- USER MODEL (Handles both Technicians and Admins) ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False, default='technician', index=True)
    
    # Auth fields
    phone = db.Column(db.String(20), unique=True, nullable=True, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    is_active_account = db.Column(db.Boolean, default=True)
    availability_status = db.Column(db.String(20), default='available', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Technician specific fields
    nin = db.Column(db.String(20), nullable=True)
    whatsapp = db.Column(db.String(20), nullable=True)
    skill = db.Column(db.String(100), nullable=True, index=True)      # Increased from 50
    specialty = db.Column(db.String(255), nullable=True)              # Increased from 50
    experience = db.Column(db.String(20), nullable=True)
    location = db.Column(db.String(150), nullable=True, index=True)   # Increased from 100
    status = db.Column(db.String(20), default='pending', index=True)
    profile_pic = db.Column(db.String(256), nullable=True)

    # Secure Password Methods
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    # Flask-Login requirement
    def get_id(self):
        return str(self.id)

# --- CONTRACT MODEL ---
class Contract(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(50), unique=True, nullable=False, index=True)  # Added index
    
    client_name = db.Column(db.String(100), nullable=False)
    client_email = db.Column(db.String(120), nullable=False)
    client_phone = db.Column(db.String(20), nullable=False)
    client_country = db.Column(db.String(50), nullable=False)
    
    project_type = db.Column(db.String(50), nullable=False)
    project_location = db.Column(db.String(100), nullable=False)
    project_timeline = db.Column(db.String(50), nullable=False)
    project_description = db.Column(db.Text, nullable=True)
    building_plan = db.Column(db.String(256), nullable=True)
    
    # Signature fields (added for digital signing)
    signature = db.Column(db.Text, nullable=True)
    signature_method = db.Column(db.String(20), nullable=True)
    
    status = db.Column(db.String(20), default='pending', index=True)  # Added index
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    signed_at = db.Column(db.DateTime, nullable=True)

# --- TECHNICIAN GALLERY MODEL ---
class TechnicianGallery(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)  # Added index
    image_path = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- MESSAGE MODEL ---
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    subject = db.Column(db.String(100), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, index=True)  # Added index
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # Added index

# --- OTP MODEL (For Password Reset) ---
class OTP(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False, index=True)  # Added index
    code = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False, index=True)  # Added index
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- REVIEW MODEL ---
class Review(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    technician_phone = db.Column(db.String(20), nullable=False, index=True)  # Added index
    client_name = db.Column(db.String(100), nullable=False)
    rating = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # Added index

# --- JOB MODEL ---
class Job(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    skill_required = db.Column(db.String(50), nullable=False, index=True)  # Added index
    location = db.Column(db.String(100), nullable=False)
    budget = db.Column(db.String(50), nullable=True)
    client_name = db.Column(db.String(100), nullable=False)
    client_phone = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='new', index=True)  # Added index
    technician_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True, index=True)  # Added index
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # Added index

# --- BOOKING MODEL (Track all completed jobs) ---
class Booking(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    technician_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, index=True)  # Added index
    client_name = db.Column(db.String(100), nullable=False)
    client_phone = db.Column(db.String(20), nullable=False)
    service_type = db.Column(db.String(100), nullable=False)
    source = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(20), default='completed', index=True)  # Added index
    booking_date = db.Column(db.DateTime, default=datetime.utcnow, index=True)  # Added index
    completion_date = db.Column(db.DateTime, nullable=True)
    amount = db.Column(db.Float, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    
    # Relationship to get technician details
    technician = db.relationship('User', foreign_keys=[technician_id])