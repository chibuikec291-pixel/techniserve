(function() {
    'use strict';

    // --- DOM ELEMENTS ---
    const loginForm = document.getElementById('loginForm');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.getElementById('passwordToggle');
    const eyeIcon = document.getElementById('eyeIcon');
    const loginBtn = document.getElementById('loginBtn');
    const forgotLink = document.getElementById('forgotLink');

    // --- PASSWORD SHOW/HIDE TOGGLE ---
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            
            if (eyeIcon) {
                eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                lucide.createIcons();
            }
        });
    }

    // --- PHONE INPUT FORMATTING ---
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    // --- CLEAR ERRORS ON INPUT ---
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => {
            const formGroup = input.closest('.form-group');
            if (formGroup && formGroup.classList.contains('error')) {
                formGroup.classList.remove('error');
                const errorEl = formGroup.querySelector('.field-error');
                if (errorEl) errorEl.remove();
            }
        });
    });

    // --- FORM VALIDATION ---
    function validateLoginForm() {
        let isValid = true;
        const errors = [];

        document.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
            const errorEl = group.querySelector('.field-error');
            if (errorEl) errorEl.remove();
        });

        const phone = phoneInput.value.trim();
        if (!phone) {
            showFieldError(phoneInput, 'Phone number is required');
            errors.push('Phone number');
            isValid = false;
        } else if (!isValidNigerianPhone(phone)) {
            showFieldError(phoneInput, 'Enter a valid Nigerian phone number (11 digits)');
            errors.push('Valid phone number');
            isValid = false;
        }

        const password = passwordInput.value;
        if (!password) {
            showFieldError(passwordInput, 'Password is required');
            errors.push('Password');
            isValid = false;
        } else if (password.length < 6) {
            showFieldError(passwordInput, 'Password must be at least 6 characters');
            errors.push('Password length');
            isValid = false;
        }

        if (!isValid) {
            showWarning(`Please fix: ${errors.join(', ')}`, 'Login Failed');
            
            const firstError = document.querySelector('.form-group.error input');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
    }

    function showFieldError(input, message) {
        const formGroup = input.closest('.form-group');
        if (!formGroup) return;
        
        formGroup.classList.add('error');
        
        const errorEl = document.createElement('div');
        errorEl.className = 'field-error';
        errorEl.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            ${message}
        `;
        formGroup.appendChild(errorEl);
    }

    // --- FORM SUBMISSION ---
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        if (!validateLoginForm()) return;

        // Show loading
        setLoadingState(true);

        const phone = phoneInput.value.trim();
        const password = passwordInput.value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Send to backend
        fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                phone: phone,
                password: password,
                rememberMe: rememberMe
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showSuccess(`Welcome back! Redirecting to your dashboard...`, 'Login Successful');
                setTimeout(() => {
                    // ✅ THIS IS THE FIX: Use the backend's redirect URL, or default to dashboard
                    window.location.href = data.redirect || '/client/dashboard';
                }, 1500);
            } else {
                showWarning(data.message || 'Login failed. Please try again.', 'Login Failed');
                setLoadingState(false);
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            showWarning('An unexpected error occurred. Please try again.', 'Connection Error');
            setLoadingState(false);
        });
    });
}

    function setLoadingState(isLoading) {
        if (!loginBtn) return;
        
        const btnText = loginBtn.querySelector('.btn-text');
        const btnLoader = loginBtn.querySelector('.btn-loader');
        const btnIcon = loginBtn.querySelector('.btn-icon');
        
        if (isLoading) {
            loginBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnIcon) btnIcon.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'flex';
        } else {
            loginBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnIcon) btnIcon.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    // if (forgotLink) {
    //     forgotLink.addEventListener('click', (e) => {
    //         e.preventDefault();
    //         showInfo('The password reset feature is coming soon. Please contact support for now.', 'Forgot Password');
    //     });
    // }

    document.addEventListener('DOMContentLoaded', () => {
        lucide.createIcons();
    });
})();