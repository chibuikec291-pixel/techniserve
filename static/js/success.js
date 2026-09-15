(function() {
    'use strict';

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') {
            safeCreateIcons();
        } else if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // --- CONFETTI GENERATOR ---
    function createConfetti() {
        const container = document.getElementById('confettiContainer');
        if (!container) return;

        const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
        const shapes = ['square', 'circle'];
        const confettiCount = 60;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 8 + 6;
            const left = Math.random() * 100;
            const duration = Math.random() * 3 + 2;
            const delay = Math.random() * 2;

            confetti.className = `confetti ${shape}`;
            confetti.style.cssText = `
                left: ${left}%;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                animation-duration: ${duration}s;
                animation-delay: ${delay}s;
            `;

            container.appendChild(confetti);

            // Remove after animation
            setTimeout(() => {
                confetti.remove();
            }, (duration + delay) * 1000);
        }
    }

    // --- AUTO-REDIRECT COUNTDOWN ---
    function setupCountdown() {
        const successType = window.SUCCESS_TYPE;
        const countdownEl = document.getElementById('countdownNumber');
        const cancelBtn = document.getElementById('cancelRedirect');
        const countdownContainer = document.getElementById('redirectCountdown');

        if (!countdownEl || !countdownContainer) return;

        // Determine redirect target based on type
        let redirectUrl = '/';
        switch (successType) {
            case 'registration':
            case 'password-reset':
                redirectUrl = '/login';
                break;
            case 'contract':
                redirectUrl = '/';
                break;
            case 'contact':
                redirectUrl = '/';
                break;
            case 'job-accepted':
            case 'profile-updated':
                redirectUrl = '/dashboard';
                break;
            default:
                redirectUrl = '/';
        }

        let seconds = 10;
        countdownEl.textContent = seconds;

        const interval = setInterval(() => {
            seconds--;
            countdownEl.textContent = seconds;

            if (seconds <= 0) {
                clearInterval(interval);
                window.location.href = redirectUrl;
            }
        }, 1000);

        // Cancel redirect
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                clearInterval(interval);
                countdownContainer.style.opacity = '0.5';
                cancelBtn.textContent = 'Cancelled';
                cancelBtn.disabled = true;
                cancelBtn.style.cursor = 'not-allowed';
                showInfo('Auto-redirect cancelled. You can navigate manually.', 'Redirect Cancelled');
            });
        }
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
        
        // Trigger confetti after a short delay
        setTimeout(() => {
            createConfetti();
        }, 500);

        // Start countdown
        setupCountdown();
    });
})();