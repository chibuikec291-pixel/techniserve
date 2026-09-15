(function() {
    'use strict';

    let currentEmail = '';
    let currentOtp = '';
    let currentStep = 1;
    let resendTimer = null;

    // --- DOM ELEMENTS ---
    const forgotForm = document.getElementById('forgotForm');
    const formSteps = forgotForm.querySelectorAll('.form-step');
    const progressSteps = document.querySelectorAll('.progress-step');
    
    const resetEmail = document.getElementById('resetEmail');
    const sendCodeBtn = document.getElementById('sendCodeBtn');
    
    const otpInputs = document.querySelectorAll('.otp-input');
    const maskedEmail = document.getElementById('maskedEmail'); // Note: Make sure to add id="maskedEmail" to your HTML Step 2 <strong> tag
    const verifyCodeBtn = document.getElementById('verifyCodeBtn');
    const resendBtn = document.getElementById('resendBtn');
    const resendTimerEl = document.getElementById('resendTimer');
    
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const resetPasswordBtn = document.getElementById('resetPasswordBtn');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // --- STEP NAVIGATION ---
    function goToStep(step) {
        currentStep = step;
        formSteps.forEach(s => s.classList.remove('active'));
        document.querySelector(`.form-step[data-step="${step}"]`).classList.add('active');
        
        progressSteps.forEach(p => {
            const pStep = parseInt(p.dataset.step);
            p.classList.remove('active', 'completed');
            if (pStep < step) p.classList.add('completed');
            if (pStep === step) p.classList.add('active');
        });
        refreshIcons();
    }

    document.querySelectorAll('[data-back]').forEach(btn => {
        btn.addEventListener('click', () => goToStep(parseInt(btn.dataset.back)));
    });

    function setLoading(btn, isLoading) {
        const text = btn.querySelector('.btn-text');
        const loader = btn.querySelector('.btn-loader');
        const icon = btn.querySelector('.btn-icon');
        btn.disabled = isLoading;
        if (text) text.style.display = isLoading ? 'none' : 'inline';
        if (loader) loader.style.display = isLoading ? 'inline-flex' : 'none';
        if (icon) icon.style.display = isLoading ? 'none' : 'inline';
    }

    function maskEmail(email) {
        const [name, domain] = email.split('@');
        if (!domain) return email;
        const maskedName = name.substring(0, 2) + '***';
        return `${maskedName}@${domain}`;
    }

    // --- STEP 1: SEND OTP ---
    if (sendCodeBtn) {
        sendCodeBtn.addEventListener('click', async () => {
            const email = resetEmail.value.trim();
            
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                showWarning('Please enter a valid email address.', 'Invalid Email');
                return;
            }
            
            currentEmail = email;
            setLoading(sendCodeBtn, true);
            
            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentEmail })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (maskedEmail) maskedEmail.textContent = maskEmail(currentEmail);
                    goToStep(2);
                    setTimeout(() => otpInputs[0].focus(), 300);
                    startResendTimer();
                    showSuccess('Verification code sent to your email!', 'Code Sent');
                } else {
                    showWarning(data.message || 'Failed to send code.', 'Error');
                }
            } catch (error) {
                showWarning('Network error. Please try again.', 'Error');
            } finally {
                setLoading(sendCodeBtn, false);
            }
        });
    }

    // --- STEP 2: OTP INPUT ---
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (!/^\d$/.test(e.target.value)) { e.target.value = ''; return; }
            if (index < otpInputs.length - 1) otpInputs[index + 1].focus();
            
            const fullOtp = Array.from(otpInputs).map(i => i.value).join('');
            if (fullOtp.length === 6) {
                currentOtp = fullOtp;
                setTimeout(() => verifyOtp(), 200);
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) otpInputs[index - 1].focus();
            if (e.key === 'Enter') {
                e.preventDefault();
                const fullOtp = Array.from(otpInputs).map(i => i.value).join('');
                if (fullOtp.length === 6) { currentOtp = fullOtp; verifyOtp(); }
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').substring(0, 6);
            if (pastedData.length === 6) {
                otpInputs.forEach((inp, i) => inp.value = pastedData[i]);
                currentOtp = pastedData;
                otpInputs[5].focus();
                setTimeout(() => verifyOtp(), 200);
            }
        });
    });

    async function verifyOtp() {
        setLoading(verifyCodeBtn, true);
        try {
            const response = await fetch('/api/auth/verify-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentEmail, code: currentOtp })
            });
            const data = await response.json();
            if (data.success) {
                goToStep(3);
                showSuccess('Code verified! Create your new password.', 'Verified');
            } else {
                showWarning(data.message || 'Invalid code.', 'Verification Failed');
                otpInputs.forEach(inp => inp.value = '');
                otpInputs[0].focus();
            }
        } catch (error) {
            showWarning('Network error.', 'Error');
        } finally {
            setLoading(verifyCodeBtn, false);
        }
    }

    if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener('click', () => {
            const fullOtp = Array.from(otpInputs).map(i => i.value).join('');
            if (fullOtp.length !== 6) { showWarning('Please enter the complete 6-digit code.', 'Incomplete'); return; }
            currentOtp = fullOtp;
            verifyOtp();
        });
    }

    function startResendTimer() {
        let seconds = 60;
        resendBtn.disabled = true;
        resendBtn.style.opacity = '0.5';
        resendTimerEl.textContent = ` (${seconds}s)`;
        if (resendTimer) clearInterval(resendTimer);
        
        resendTimer = setInterval(() => {
            seconds--;
            resendTimerEl.textContent = ` (${seconds}s)`;
            if (seconds <= 0) {
                clearInterval(resendTimer);
                resendBtn.disabled = false;
                resendBtn.style.opacity = '1';
                resendTimerEl.textContent = '';
            }
        }, 1000);
    }

    if (resendBtn) {
        resendBtn.addEventListener('click', async () => {
            resendBtn.disabled = true;
            resendBtn.textContent = 'Sending...';
            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentEmail })
                });
                const data = await response.json();
                if (data.success) {
                    showSuccess('New code sent!', 'Code Resent');
                    otpInputs.forEach(inp => inp.value = '');
                    otpInputs[0].focus();
                    startResendTimer();
                } else { showWarning(data.message, 'Error'); }
            } catch (error) { showWarning('Network error.', 'Error'); }
            finally { resendBtn.disabled = false; resendBtn.textContent = 'Resend Code'; }
        });
    }

    // --- STEP 3: RESET PASSWORD ---
    if (forgotForm) {
        forgotForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = newPassword.value.trim();
            const confirm = confirmNewPassword.value.trim();
            
            if (!password || !confirm) { showWarning('Please fill in both fields.', 'Required'); return; }
            if (password.length < 6) { showWarning('Password must be at least 6 characters.', 'Too Short'); return; }
            if (password !== confirm) { showWarning('Passwords do not match.', 'Mismatch'); return; }
            
            setLoading(resetPasswordBtn, true);
            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: currentEmail, code: currentOtp, password: password })
                });
                const data = await response.json();
                if (data.success) {
                    showSuccess('Password reset successfully! Redirecting...', 'Success');
                    setTimeout(() => window.location.href = '/login', 2500);
                } else { showWarning(data.message, 'Error'); }
            } catch (error) { showWarning('Network error.', 'Error'); }
            finally { setLoading(resetPasswordBtn, false); }
        });
    }

    document.addEventListener('DOMContentLoaded', () => { goToStep(1); refreshIcons(); });
})();