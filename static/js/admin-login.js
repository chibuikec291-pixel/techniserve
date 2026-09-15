(function() {
    'use strict';

    const loginForm = document.getElementById('adminLoginForm');
    const submitBtn = loginForm.querySelector('.btn-admin-login');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;

        // Show loading
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');
        const btnIcon = submitBtn.querySelector('.btn-icon');

        submitBtn.disabled = true;
        btnText.style.display = 'none';
        btnIcon.style.display = 'none';
        btnLoader.style.display = 'flex';

        // Send to backend
        fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Clear old localStorage admin flag
                localStorage.removeItem('adminLoggedIn');
                localStorage.removeItem('adminEmail');
                
                showSuccess('Welcome, Administrator! Redirecting to dashboard...', 'Login Successful');
                
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 1500);
            } else {
                showWarning(data.message || 'Invalid credentials.', 'Login Failed');
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnIcon.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Admin login error:', error);
            showWarning('An error occurred. Please try again.', 'Connection Error');
            submitBtn.disabled = false;
            btnText.style.display = 'inline';
            btnIcon.style.display = 'inline';
            btnLoader.style.display = 'none';
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined') lucide.createIcons();
    });
})();