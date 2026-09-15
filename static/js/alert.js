// --- CUSTOM ALERT SYSTEM ---
function showAlert(message, type = 'info', title = null, duration = 4000) {
    const alertEl = document.getElementById('customAlert');
    const alertIcon = document.getElementById('alertIcon');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertProgress = document.getElementById('alertProgress');
    const alertClose = document.getElementById('alertClose');
    
    // Set default titles based on type
    const defaultTitles = {
        success: 'Success!',
        error: 'Error!',
        warning: 'Warning!',
        info: 'Information'
    };
    
    // Set icon based on type
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    // Update content
    alertTitle.textContent = title || defaultTitles[type];
    alertMessage.textContent = message;
    
    // Update icon
    alertIcon.className = `alert-icon ${type}`;
    alertIcon.innerHTML = `<i data-lucide="${icons[type]}"></i>`;
    
    // Update progress bar
    alertProgress.className = `alert-progress ${type}`;
    alertProgress.style.animationDuration = `${duration}ms`;
    
    // Show alert
    alertEl.classList.add('active');
    
    // Re-initialize Lucide icons
    lucide.createIcons();
    
    // Auto-dismiss after duration
    const timeoutId = setTimeout(() => {
        hideAlert();
    }, duration);
    
    // Close button
    alertClose.onclick = () => {
        clearTimeout(timeoutId);
        hideAlert();
    };
    
    // Click outside to close
    alertEl.onclick = (e) => {
        if (e.target === alertEl) {
            clearTimeout(timeoutId);
            hideAlert();
        }
    };
}

function hideAlert() {
    const alertEl = document.getElementById('customAlert');
    alertEl.classList.remove('active');
}

// --- HELPER FUNCTIONS FOR COMMON ALERTS ---
function showSuccess(message, title = 'Success!') {
    showAlert(message, 'success', title);
}

function showError(message, title = 'Error!') {
    showAlert(message, 'error', title, 5000); // Longer duration for errors
}

function showWarning(message, title = 'Warning!') {
    showAlert(message, 'warning', title, 4000);
}

function showInfo(message, title = 'Information') {
    showAlert(message, 'info', title);
}