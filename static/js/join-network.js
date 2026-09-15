(function() {
    'use strict';

// --- SPECIALTY OPTIONS BY SKILL ---
const specialtyOptions = {
    "Electrical": [
        "Domestic and industrial wiring", 
        "Conduit Piping", 
        "Electrical Fittings", 
        "General electrical installations & maintenance services", 
        "Electrical troubleshooting & repairs"
    ],
    "Solar": [
        "Solar Inverter Setup", 
        "Solar Panel Installation", 
        "Battery Bank Configuration", 
        "Solar System Maintenance", 
        "Off-grid & Hybrid Solar Systems"
    ],
    "Electrical & Solar": [
        "Domestic and industrial wiring", 
        "Industrial Power Systems", 
        "Solar Inverter Setup", 
        "Conduit Piping", 
        "Electrical Fittings", 
        "General electrical & solar installations"
    ],
    "Plumbing": [
        "Industrial Fittings", 
        "Borehole & Pipe Laying", 
        "General Plumbing installations & Repair", 
        "Drainage Systems"
    ],
    "Automotive": [
        "Engine Repair & Overhaul", 
        "Diagnostics & Gearbox", 
        "Suspension & Brakes", 
        "Bodywork & Painting", 
        "Japanese Vehicle Specialist"
    ],
    "Furniture": [
        "Custom Home Furniture", 
        "Office Desks & Cabinetry", 
        "Bed Frames & Wardrobes", 
        "TV Consoles", 
        "General Modern furniture works"
    ],
    "Curtains": [
        "Curtain Installation", 
        "Window Blinds & Rods", 
        "Motorized Curtains", 
        "General modern curtain installation services"
    ],
    "POP & Screeding": [
        "Premium Wall Finishing", 
        "Ceiling Design & Screeding", 
        "General POP & screeding"
    ],
    "Painting": [
        "Exterior Painting", 
        "Interior Painting & Decoration"
    ],
    "AC & Refrigerator": [
        "AC Repair & Gas Refill", 
        "AC Installation", 
        "Industrial Chiller Repair", 
        "Fridge & Freezer Repair"
    ],
    "CCTV": [
        "IP Camera Setup", 
        "Analog Camera Installation", 
        "Surveillance Maintenance", 
        "Remote Viewing Configuration"
    ],
    "Generator": [
        "Diesel Generator Maintenance", 
        "Small Generator Repair", 
        "Mikano Service Specialist", 
        "Automatic start system Installation"
    ],
    "Alumnium glass window (Almaco)": [
        "Window installation services", 
        "Sliding glass doors"
    ],
    "Welding": [
        "Gate construction", 
        "Hand rail construction", 
        "Burglary proof construction", 
        "Iron door expert", 
        "Container construction", 
        "General welding services"
    ],
    "Automation": [
        "PLC Programming", 
        "SCADA Systems", 
        "Industrial Automation", 
        "Home Automation", 
        "Motor Control Systems", 
        "Sensor Integration", 
        "HMI Programming", 
        "Process Automation"
    ]
};

    let currentStep = 1;

    const form = document.getElementById('registrationForm');
    const progressSteps = document.querySelectorAll('.progress-step');
    const skillSelect = document.getElementById('skill');
    const specialtySelect = document.getElementById('specialty');
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email'); // ADDED
    const whatsappInput = document.getElementById('whatsapp');
    const sameAsPhoneCheckbox = document.getElementById('sameAsPhone');

    // --- STEP NAVIGATION ---
    document.querySelectorAll('.btn-next').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextStep = parseInt(btn.dataset.next);
            if (validateStep(currentStep)) {
                goToStep(nextStep);
            }
        });
    });

    document.querySelectorAll('.btn-back').forEach(btn => {
        btn.addEventListener('click', () => {
            const backStep = parseInt(btn.dataset.back);
            goToStep(backStep);
        });
    });

    function goToStep(step) {
        document.querySelector(`.form-step[data-step="${currentStep}"]`).classList.remove('active');
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
        
        progressSteps.forEach((ps, index) => {
            const stepNum = index + 1;
            ps.classList.remove('active', 'completed');
            
            if (stepNum < step) {
                ps.classList.add('completed');
            } else if (stepNum === step) {
                ps.classList.add('active');
            }
        });
        
        currentStep = step;
        
        document.querySelector('.reg-container').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
        
        lucide.createIcons();
    }

    function validateStep(step) {
        const currentStepEl = document.querySelector(`.form-step[data-step="${step}"]`);
        const requiredInputs = currentStepEl.querySelectorAll('[required]');
        let isValid = true;
        let firstInvalidField = null;
        let errorMessages = [];
        
        clearErrors(currentStepEl);
        
        requiredInputs.forEach(input => {
            const value = input.value.trim();
            const fieldName = getFieldName(input);
            
            if (!value) {
                isValid = false;
                showFieldError(input, `${fieldName} is required`);
                errorMessages.push(fieldName);
                
                if (!firstInvalidField) {
                    firstInvalidField = input;
                }
            } else {
                if (input.id === 'nin') {
                    if (!/^\d{11}$/.test(value)) {
                        isValid = false;
                        showFieldError(input, 'NIN must be exactly 11 digits');
                        errorMessages.push('NIN (must be 11 digits)');
                        if (!firstInvalidField) firstInvalidField = input;
                    }
                }
                
                if (input.id === 'phone' || input.id === 'whatsapp') {
                    if (!isValidNigerianPhone(value)) {
                        isValid = false;
                        showFieldError(input, 'Enter a valid Nigerian phone number (11 digits)');
                        errorMessages.push(`${fieldName} (invalid format)`);
                        if (!firstInvalidField) firstInvalidField = input;
                    }
                }
                
                // ADDED: Email validation
                if (input.id === 'email') {
                    if (!isValidEmail(value)) {
                        isValid = false;
                        showFieldError(input, 'Enter a valid email address');
                        errorMessages.push('Email (invalid format)');
                        if (!firstInvalidField) firstInvalidField = input;
                    }
                }
            }
        });
        
        if (!isValid) {
            let alertMessage = 'Please complete: ';
            
            if (errorMessages.length <= 3) {
                alertMessage += errorMessages.join(', ');
            } else {
                alertMessage += errorMessages.slice(0, 3).join(', ') + `, and ${errorMessages.length - 3} more`;
            }
            
            showWarning(alertMessage, 'Please fill in all required fields');
            
            if (firstInvalidField) {
                firstInvalidField.focus();
                firstInvalidField.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
            
            return false;
        }
        
        return true;
    }

    // ADDED: Email validation function
    function isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    function isValidNigerianPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 11 && (cleaned.startsWith('070') || cleaned.startsWith('080') || cleaned.startsWith('081') || cleaned.startsWith('090') || cleaned.startsWith('091'));
    }

    function formatPhone(phone) {
        return phone.replace(/\D/g, '');
    }

    function getFieldName(input) {
        const label = input.closest('.form-group')?.querySelector('label');
        if (label) {
            return label.textContent.replace('*', '').replace(/\s+/g, ' ').trim();
        }
        
        if (input.placeholder) return input.placeholder;
        if (input.id) return input.id.charAt(0).toUpperCase() + input.id.slice(1);
        return 'This field';
    }

    function showFieldError(input, message) {
        input.style.borderColor = '#EF4444';
        input.style.backgroundColor = 'rgba(239, 68, 68, 0.05)';
        
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        
        let errorEl = formGroup.querySelector('.field-error');
        
        if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'field-error';
            errorEl.style.cssText = `
                color: #EF4444;
                font-size: 0.75rem;
                margin-top: 6px;
                display: flex;
                align-items: center;
                gap: 4px;
                animation: shake 0.4s ease-in-out;
            `;
            formGroup.appendChild(errorEl);
        }
        
        errorEl.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            ${message}
        `;
        
        if (!document.getElementById('shake-animation')) {
            const style = document.createElement('style');
            style.id = 'shake-animation';
            style.textContent = `
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    function clearErrors(container) {
        const inputs = container.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.style.borderColor = '';
            input.style.backgroundColor = '';
        });
        
        const errors = container.querySelectorAll('.field-error');
        errors.forEach(error => error.remove());
    }

    document.querySelectorAll('input[required], select[required]').forEach(input => {
        input.addEventListener('blur', () => {
            const value = input.value.trim();
            const formGroup = input.closest('.form-group');
            const errorEl = formGroup ? formGroup.querySelector('.field-error') : null;
            
            if (value) {
                input.style.borderColor = '';
                input.style.backgroundColor = '';
                if (errorEl) errorEl.remove();
            }
        });
        
        input.addEventListener('input', () => {
            const formGroup = input.closest('.form-group');
            const errorEl = formGroup ? formGroup.querySelector('.field-error') : null;
            
            if (errorEl && input.value.trim()) {
                input.style.borderColor = '';
                input.style.backgroundColor = '';
                errorEl.remove();
            }
        });
    });

    if (skillSelect) {
        skillSelect.addEventListener('change', (e) => {
            const skill = e.target.value;
            specialtySelect.innerHTML = '<option value="">Select your specialty...</option>';
            
            if (skill && specialtyOptions[skill]) {
                specialtyOptions[skill].forEach(specialty => {
                    const option = document.createElement('option');
                    option.value = specialty;
                    option.textContent = specialty;
                    specialtySelect.appendChild(option);
                });
                specialtySelect.disabled = false;
            } else {
                specialtySelect.disabled = true;
            }
        });
    }

    if (sameAsPhoneCheckbox && whatsappInput && phoneInput) {
        sameAsPhoneCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                whatsappInput.value = phoneInput.value;
                whatsappInput.readOnly = true;
                whatsappInput.style.opacity = '0.7';
            } else {
                whatsappInput.value = '';
                whatsappInput.readOnly = false;
                whatsappInput.style.opacity = '1';
            }
        });

        phoneInput.addEventListener('input', () => {
            if (sameAsPhoneCheckbox.checked) {
                whatsappInput.value = phoneInput.value;
            }
        });
    }

    const ninInput = document.getElementById('nin');
    if (ninInput) {
        ninInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
        });
    }

    // ADDED: Email input formatting
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toLowerCase().trim();
        });
    }

    // --- FORM SUBMISSION (Save data, redirect to signup) ---
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            if (!validateStep(2)) return;
            
            const termsCheckbox = document.getElementById('terms');
            if (!termsCheckbox.checked) {
                showWarning('Please agree to the Terms of Service to continue.', 'Terms Required');
                return;
            }
            
            const formData = {
                fullName: document.getElementById('fullName').value.trim(),
                nin: document.getElementById('nin').value.trim(),
                phone: formatPhone(document.getElementById('phone').value.trim()),
                email: document.getElementById('email').value.trim().toLowerCase(), // ADDED
                whatsapp: formatPhone(document.getElementById('whatsapp').value.trim()),
                skill: document.getElementById('skill').value,
                specialty: document.getElementById('specialty').value,
                experience: document.getElementById('experience').value,
                location: document.getElementById('location').value.trim(),
                registeredAt: new Date().toISOString()
            };
            
            if (isPhoneRegistered(formData.phone)) {
                showWarning('This phone number is already registered. Please login instead.', 'Already Registered');
                return;
            }
            
            // ADDED: Check if email is already registered
            if (isEmailRegistered(formData.email)) {
                showWarning('This email address is already registered. Please use a different email or login instead.', 'Already Registered');
                return;
            }
            
            // Save registration data WITHOUT password
            localStorage.setItem('pendingRegistration', JSON.stringify(formData));
            
            showSuccess('Great! Now let\'s create your password to complete registration.', 'Step 1 Complete!');
            
            // Redirect to signup page
            setTimeout(() => {
                window.location.href = '/signup';
            }, 2000);
        });
    }

    // ADDED: Check if email is already registered
    function isEmailRegistered(email) {
        const technicians = JSON.parse(localStorage.getItem('technicians') || '[]');
        return technicians.some(t => t.email && t.email.toLowerCase() === email.toLowerCase());
    }

    function isPhoneRegistered(phone) {
        const technicians = JSON.parse(localStorage.getItem('technicians') || '[]');
        return technicians.some(t => t.phone === phone);
    }

    document.addEventListener('DOMContentLoaded', () => {
        lucide.createIcons();
    });
})();