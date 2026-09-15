(function() {
    'use strict';

    const signupForm = document.getElementById('signupForm');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordToggle = document.getElementById('passwordToggle');
    const confirmPasswordToggle = document.getElementById('confirmPasswordToggle');
    const eyeIcon = document.getElementById('eyeIcon');
    const confirmEyeIcon = document.getElementById('confirmEyeIcon');
    const signupBtn = document.getElementById('signupBtn');
    const strengthFill = document.getElementById('strengthFill');
    const strengthText = document.getElementById('strengthText');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // Check if pending registration exists
    const pendingRegistration = localStorage.getItem('pendingRegistration');
    if (!pendingRegistration) {
        showWarning('Please complete the registration form first.', 'Registration Required');
        setTimeout(() => {
            window.location.href = '/join-network';
        }, 2000);
        return;
    }

    // Password toggle
    if (passwordToggle && passwordInput) {
        passwordToggle.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            if (eyeIcon) {
                eyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                refreshIcons();
            }
        });
    }

    if (confirmPasswordToggle && confirmPasswordInput) {
        confirmPasswordToggle.addEventListener('click', () => {
            const isPassword = confirmPasswordInput.type === 'password';
            confirmPasswordInput.type = isPassword ? 'text' : 'password';
            if (confirmEyeIcon) {
                confirmEyeIcon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
                refreshIcons();
            }
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            checkPasswordStrength(password);
            updateRequirements(password);
        });
    }

    function checkPasswordStrength(password) {
        let strength = 0;
        
        if (password.length >= 6) strength++;
        if (password.length >= 10) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/[0-9]/.test(password)) strength++;
        if (/[^A-Za-z0-9]/.test(password)) strength++;

        if (strengthFill && strengthText) {
            strengthFill.className = 'strength-fill';
            
            if (password.length === 0) {
                strengthText.textContent = 'Password strength';
                strengthText.style.color = 'var(--text-muted)';
                return;
            }
            
            if (strength <= 2) {
                strengthFill.classList.add('weak');
                strengthText.textContent = 'Weak password';
                strengthText.style.color = '#EF4444';
            } else if (strength <= 3) {
                strengthFill.classList.add('medium');
                strengthText.textContent = 'Medium password';
                strengthText.style.color = '#F59E0B';
            } else {
                strengthFill.classList.add('strong');
                strengthText.textContent = 'Strong password';
                strengthText.style.color = 'var(--secondary)';
            }
        }
    }

    function updateRequirements(password) {
        const reqLength = document.getElementById('req-length');
        const reqUppercase = document.getElementById('req-uppercase');
        const reqNumber = document.getElementById('req-number');

        if (reqLength) reqLength.classList.toggle('met', password.length >= 6);
        if (reqUppercase) reqUppercase.classList.toggle('met', /[A-Z]/.test(password));
        if (reqNumber) reqNumber.classList.toggle('met', /[0-9]/.test(password));
    }

    // Form submission
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            // Validation
            if (!password || !confirmPassword) {
                showWarning('Please fill in both password fields.', 'Missing Fields');
                return;
            }

            if (password.length < 6) {
                showWarning('Password must be at least 6 characters long.', 'Weak Password');
                return;
            }

            if (password !== confirmPassword) {
                showWarning('Passwords do not match. Please try again.', 'Password Mismatch');
                return;
            }

            // Show loading
            setLoadingState(true);

            try {
                // Get pending registration data from localStorage
                const pendingData = JSON.parse(pendingRegistration);
                
                // Combine data with password
                const registrationData = {
                    ...pendingData,
                    password: password
                };

                // Send to backend
                fetch('/signup', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(registrationData)
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Clear pending data from localStorage
                        localStorage.removeItem('pendingRegistration');
                        
                        showSuccess('Your account has been created successfully! Please login to continue.', 'Registration Complete!');
                        
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    } else {
                        showWarning(data.message || 'Registration failed. Please try again.', 'Registration Error');
                        setLoadingState(false);
                    }
                })
                .catch(error => {
                    console.error('Signup error:', error);
                    showWarning('An error occurred. Please try again.', 'Connection Error');
                    setLoadingState(false);
                });

            } catch (error) {
                console.error('Signup error:', error);
                showWarning('An error occurred. Please try again.', 'Registration Error');
                setLoadingState(false);
            }
        });
    }

    function setLoadingState(isLoading) {
        if (!signupBtn) return;
        
        const btnText = signupBtn.querySelector('.btn-text');
        const btnLoader = signupBtn.querySelector('.btn-loader');
        const btnIcon = signupBtn.querySelector('.btn-icon');
        
        if (isLoading) {
            signupBtn.disabled = true;
            if (btnText) btnText.style.display = 'none';
            if (btnIcon) btnIcon.style.display = 'none';
            if (btnLoader) btnLoader.style.display = 'flex';
        } else {
            signupBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnIcon) btnIcon.style.display = 'inline';
            if (btnLoader) btnLoader.style.display = 'none';
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
    });
})();