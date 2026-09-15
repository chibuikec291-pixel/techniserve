(function() {
    'use strict';

    let technician = null;
    let technicianPhone = null;
    let galleryImages = []; // Will store objects with {id, url}

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') {
            safeCreateIcons();
        } else if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // --- FETCH TECHNICIAN DATA FROM BACKEND ---
    async function loadTechnicianProfile() {
        try {
            const response = await fetch('/api/technician/profile');
            
            if (response.status === 403 || response.status === 401) {
                showWarning('Please login to access your dashboard.', 'Authentication Required');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 1500);
                return false;
            }
            
            if (!response.ok) {
                throw new Error('Failed to load profile');
            }
            
            technician = await response.json();
            technicianPhone = technician.phone;
            
            // Load gallery from backend response
            if (technician.gallery) {
                galleryImages = technician.gallery;
            }
            
            return true;
        } catch (error) {
            console.error('Error loading profile:', error);
            showWarning('Failed to load your profile. Please try again.', 'Error');
            return false;
        }
    }

    // --- DATA HELPERS ---
    function formatDate(isoString) {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-NG', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    function maskNIN(nin) {
        if (!nin || nin.length < 4) return '—';
        return '•••••••' + nin.slice(-4);
    }

    // --- POPULATE PROFILE ---
    function populateProfile() {
        if (!technician) return;
        
        document.getElementById('sidebarName').textContent = technician.fullName;
        
        document.getElementById('info-fullName').textContent = technician.fullName;
        document.getElementById('info-nin').textContent = maskNIN(technician.nin);
        document.getElementById('info-phone').textContent = technician.phone;
        document.getElementById('info-whatsapp').textContent = technician.whatsapp;
        
        document.getElementById('info-skill').textContent = technician.skill;
        document.getElementById('info-specialty').textContent = technician.specialty;
        document.getElementById('info-experience').textContent = technician.experience + ' years';
        document.getElementById('info-location').querySelector('span').textContent = technician.location;
        
        document.getElementById('info-registeredAt').textContent = formatDate(technician.registeredAt);
        
        // Display profile pic from backend
        if (technician.profilePic) {
            displayProfilePic(technician.profilePic);
        }
        updateAvailabilityUI(technician.availabilityStatus);
    }

    function displayProfilePic(imageUrl) {
        const profilePreview = document.getElementById('profilePreview');
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        const removeBtn = document.getElementById('removeProfilePic');
        const sidebarAvatar = document.getElementById('sidebarAvatar');
        const mobileAvatar = document.getElementById('mobileAvatar');
        
        profilePreview.src = imageUrl;
        profilePreview.style.display = 'block';
        profilePlaceholder.style.display = 'none';
        removeBtn.style.display = 'inline-flex';
        
        sidebarAvatar.innerHTML = `<img src="${imageUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;">`;
        mobileAvatar.innerHTML = `<img src="${imageUrl}" alt="Profile" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
    }

    // ==========================================
    // --- JOBS MANAGEMENT (BACKEND INTEGRATION) ---
    // ==========================================

    async function fetchTechnicianJobs() {
        try {
            const response = await fetch('/api/technician/jobs');
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
        return [];
    }

    function updateJobStats(jobs) {
        const newJobs = jobs.filter(j => j.status === 'new').length;
        const activeJobs = jobs.filter(j => j.status === 'active').length;
        const completedJobs = jobs.filter(j => j.status === 'completed').length;
        
        document.getElementById('stat-new').textContent = newJobs;
        document.getElementById('stat-active').textContent = activeJobs;
        document.getElementById('stat-completed').textContent = completedJobs;
        
        const badge = document.getElementById('jobsBadge');
        if (newJobs > 0) {
            badge.textContent = newJobs;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    async function renderJobs() {
        const jobsList = document.getElementById('jobsList');
        const emptyState = document.getElementById('jobsEmptyState');
        const jobs = await fetchTechnicianJobs();
        
        jobsList.querySelectorAll('.job-card').forEach(card => card.remove());
        
        if (jobs.length === 0) {
            emptyState.style.display = 'block';
            updateJobStats([]);
            return;
        }
        
        emptyState.style.display = 'none';
        updateJobStats(jobs);
        
        const sortedJobs = [...jobs].sort((a, b) => {
            const order = { new: 0, active: 1, completed: 2, declined: 3 };
            return (order[a.status] || 0) - (order[b.status] || 0);
        });
        
        sortedJobs.forEach(job => {
            if (job.status === 'declined') return; // Hide declined jobs
            const card = createJobCard(job);
            jobsList.appendChild(card);
        });
        
        refreshIcons();
    }

function createJobCard(job) {
    const card = document.createElement('div');
    card.className = 'job-card';
    card.dataset.jobId = job.id;
    card.dataset.itemType = job.item_type || 'job'; // <-- ADDED THIS LINE
    
    const postedTime = getTimeAgo(job.createdAt);
    const isBooking = job.item_type === 'booking';
    const actionText = isBooking ? 'Request' : 'Job'; // Dynamic text for better UX
    
    let actionsHTML = '';
    
    if (job.status === 'new') {
        // NEW: Show Accept and Decline buttons
        actionsHTML = `
            <div class="job-actions">
                <button class="btn-accept" data-action="accept">
                    <i data-lucide="check-circle"></i> Accept ${actionText}
                </button>
                <button class="btn-decline" data-action="decline">
                    <i data-lucide="x-circle"></i> Decline
                </button>
            </div>
        `;
    } else if (job.status === 'active') {
        // ACTIVE: Show Contact Client button (hides phone number initially)
        actionsHTML = `
            <div class="job-actions">
                <button class="btn-accept" data-action="contact" style="background:#25D366;">
                    <i data-lucide="message-circle"></i> Contact Client
                </button>
                <button class="btn-accept" data-action="complete" style="background:var(--secondary);">
                    <i data-lucide="check-circle"></i> Mark as Completed
                </button>
            </div>
            <div class="client-contact-info" style="display:none; margin-top:12px; padding:12px; background:var(--bg-light); border-radius:var(--radius-md); border:1px solid var(--border-light);">
                <p style="margin:0 0 8px 0; font-size:0.875rem; color:var(--text-muted);"><strong>Client Phone:</strong></p>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <a href="tel:${job.clientPhone}" style="flex:1; min-width:120px; padding:10px 16px; background:white; border:1px solid var(--border-light); border-radius:var(--radius-md); text-decoration:none; color:var(--text-dark); font-size:0.875rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; transition:var(--transition-fast);">
                        <i data-lucide="phone" style="width:16px; height:16px;"></i>
                        ${job.clientPhone}
                    </a>
                    <a href="https://wa.me/${job.clientPhone}" target="_blank" style="flex:1; min-width:120px; padding:10px 16px; background:#25D366; border-radius:var(--radius-md); text-decoration:none; color:white; font-size:0.875rem; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px; transition:var(--transition-fast);">
                        <i data-lucide="message-circle" style="width:16px; height:16px;"></i>
                        WhatsApp
                    </a>
                </div>
            </div>
        `;
    } else if (job.status === 'completed') {
        // COMPLETED: Show completion message
        actionsHTML = `
            <div class="job-actions">
                <span style="color:var(--text-muted);font-size:0.875rem;font-style:italic;">
                    <i data-lucide="check-circle" style="width:16px;height:16px;display:inline;vertical-align:middle;"></i>
                    This ${isBooking ? 'booking' : 'job'} has been completed
                </span>
            </div>
        `;
    }
    
    card.innerHTML = `
        <div class="job-card-header">
            <div>
                <h3 class="job-title">${job.title}</h3>
                <p class="job-client">From ${job.client} • ${postedTime}</p>
            </div>
            <span class="job-status ${job.status}">${job.status.charAt(0).toUpperCase() + job.status.slice(1)}</span>
        </div>
        <div class="job-details">
            <div class="job-detail">
                <i data-lucide="map-pin"></i>
                <span>${job.location}</span>
            </div>
            <div class="job-detail">
                <i data-lucide="wallet"></i>
                <span>${job.budget}</span>
            </div>
        </div>
        <p class="job-description">${job.description}</p>
        ${actionsHTML}
    `;
    
    return card;
}

    function getTimeAgo(dateString) {
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
        return formatDate(dateString);
    }

    // --- JOB ACTIONS (BACKEND INTEGRATION) ---
document.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (!actionBtn) return;
    
    const jobCard = actionBtn.closest('.job-card');
    if (!jobCard) return;
    
    const jobId = jobCard.dataset.jobId;
    const action = actionBtn.dataset.action;
    
    // NEW: Handle Contact Client button
    if (action === 'contact') {
        const contactInfo = jobCard.querySelector('.client-contact-info');
        if (contactInfo) {
            // Toggle visibility
            if (contactInfo.style.display === 'none') {
                contactInfo.style.display = 'block';
                actionBtn.innerHTML = '<i data-lucide="eye-off"></i> Hide Contact Info';
                refreshIcons();
            } else {
                contactInfo.style.display = 'none';
                actionBtn.innerHTML = '<i data-lucide="message-circle"></i> Contact Client';
                refreshIcons();
            }
        }
        return; // Don't proceed to other actions
    }
    
    if (action === 'accept') {
        showConfirmModal(
            'Accept Job Request?',
            'Are you sure you want to accept this job? You will be able to contact the client directly.',
            async () => {
                try {
                    const response = await fetch(`/api/technician/jobs/${jobId}/accept`, { 
                        method: 'POST' 
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        showSuccess('Job accepted! You can now contact the client.', 'Job Accepted');
                        renderJobs();
                    } else {
                        showWarning(data.message || 'Failed to accept job.', 'Error');
                    }
                } catch (error) {
                    console.error('Accept job error:', error);
                    showWarning('Network error. Please try again.', 'Error');
                }
            }
        );
    } else if (action === 'decline') {
        showConfirmModal(
            'Decline Job Request?',
            'Are you sure you want to decline this job? This action cannot be undone.',
            async () => {
                try {
                    const response = await fetch(`/api/technician/jobs/${jobId}/decline`, { 
                        method: 'POST' 
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        showSuccess('Job request declined.', 'Job Declined');
                        renderJobs();
                    } else {
                        showWarning(data.message || 'Failed to decline job.', 'Error');
                    }
                } catch (error) {
                    console.error('Decline job error:', error);
                    showWarning('Network error. Please try again.', 'Error');
                }
            }
        );
    } else if (action === 'complete') {
        showConfirmModal(
            'Mark as Completed?',
            'Confirm that this job has been completed successfully?',
            async () => {
                try {
                    const response = await fetch(`/api/technician/jobs/${jobId}/complete`, { 
                        method: 'POST' 
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                        showSuccess('Job marked as completed. Great work!', 'Job Completed');
                        renderJobs();
                    } else {
                        showWarning(data.message || 'Failed to complete job.', 'Error');
                    }
                } catch (error) {
                    console.error('Complete job error:', error);
                    showWarning('Network error. Please try again.', 'Error');
                }
            }
        );
    }
});

    // ==========================================
    // --- CONFIRMATION MODAL ---
    // ==========================================
    function showConfirmModal(title, message, onConfirm) {
        const modal = document.createElement('div');
        modal.className = 'confirmation-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-icon">
                    <i data-lucide="alert-triangle"></i>
                </div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="modal-actions">
                    <button class="modal-btn cancel">Cancel</button>
                    <button class="modal-btn confirm">Confirm</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        refreshIcons();
        
        modal.querySelector('.cancel').addEventListener('click', () => modal.remove());
        modal.querySelector('.confirm').addEventListener('click', () => {
            onConfirm();
            modal.remove();
        });
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    // ==========================================
    // --- PROFILE PICTURE (SERVER-SIDE UPLOAD) ---
    // ==========================================
    const profilePicContainer = document.getElementById('profilePicContainer');
    const profilePicInput = document.getElementById('profilePicInput');
    const removeProfilePicBtn = document.getElementById('removeProfilePic');
    
    if (profilePicContainer) {
        profilePicContainer.addEventListener('click', (e) => {
            if (e.target !== removeProfilePicBtn && !removeProfilePicBtn.contains(e.target)) {
                profilePicInput.click();
            }
        });
    }
    
    if (profilePicInput) {
        profilePicInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            if (file.size > 5 * 1024 * 1024) {
                showWarning('Profile picture must be less than 5MB.', 'File Too Large');
                return;
            }
            
            if (profilePicContainer) profilePicContainer.style.opacity = '0.5';
            
            try {
                const formData = new FormData();
                formData.append('profilePic', file);
                
                const response = await fetch('/api/technician/profile', {
                    method: 'PUT',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    displayProfilePic(data.profilePic);
                    showSuccess('Profile picture updated successfully!', 'Photo Updated');
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } catch (error) {
                console.error('Error updating profile pic:', error);
                showWarning('Failed to upload profile picture.', 'Error');
            } finally {
                if (profilePicContainer) profilePicContainer.style.opacity = '1';
                profilePicInput.value = '';
            }
        });
    }
    
    if (removeProfilePicBtn) {
        removeProfilePicBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            
            try {
                const formData = new FormData();
                formData.append('profilePic', '');
                
                const response = await fetch('/api/technician/profile', {
                    method: 'PUT',
                    body: formData
                });
                
                if (response.ok) {
                    document.getElementById('profilePreview').style.display = 'none';
                    document.getElementById('profilePlaceholder').style.display = 'flex';
                    removeProfilePicBtn.style.display = 'none';
                    
                    document.getElementById('sidebarAvatar').innerHTML = '<i data-lucide="user"></i>';
                    document.getElementById('mobileAvatar').innerHTML = '<i data-lucide="user"></i>';
                    
                    refreshIcons();
                    showSuccess('Profile picture removed.', 'Photo Removed');
                }
            } catch (error) {
                console.error('Error removing profile pic:', error);
                showWarning('Failed to remove profile picture.', 'Error');
            }
        });
    }

        // --- AVAILABILITY STATUS ---
    function updateAvailabilityUI(status) {
        const statusBadge = document.getElementById('availabilityBadge');
        const statusToggle = document.getElementById('availabilityToggle');
        
        if (statusBadge) {
            statusBadge.className = `availability-badge ${status}`;
            statusBadge.innerHTML = `
                <span class="status-dot"></span>
                ${status.charAt(0).toUpperCase() + status.slice(1)}
            `;
        }
        
        if (statusToggle) {
            statusToggle.value = status;
        }
    }

    // Initialize availability toggle
    const availabilityToggle = document.getElementById('availabilityToggle');
    if (availabilityToggle) {
        availabilityToggle.addEventListener('change', async (e) => {
            const newStatus = e.target.value;
            
            try {
                const response = await fetch('/api/technician/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    updateAvailabilityUI(newStatus);
                    showSuccess(`Status updated to ${newStatus}`, 'Status Changed');
                } else {
                    showWarning(data.message || 'Failed to update status', 'Error');
                }
            } catch (error) {
                console.error('Availability error:', error);
                showWarning('Network error. Please try again.', 'Error');
            }
        });
    }

    // ==========================================
    // --- GALLERY (SERVER-SIDE UPLOAD) ---
    // ==========================================
    const MAX_GALLERY = 5;
    const galleryInput = document.getElementById('galleryInput');
    const galleryGrid = document.getElementById('galleryGrid');
    const galleryAddBtn = document.getElementById('galleryAddBtn');
    const galleryCount = document.getElementById('galleryCount');
    
    function renderGallery() {
        galleryGrid.querySelectorAll('.gallery-item').forEach(item => item.remove());
        
        galleryImages.forEach((img) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${img.url}" alt="Gallery photo">
                <button type="button" class="remove-btn" data-id="${img.id}">
                    <i data-lucide="x"></i>
                </button>
            `;
            galleryGrid.insertBefore(item, galleryAddBtn);
        });
        
        if (galleryCount) galleryCount.textContent = galleryImages.length;
        
        if (galleryImages.length >= MAX_GALLERY) {
            galleryAddBtn.style.display = 'none';
        } else {
            galleryAddBtn.style.display = 'flex';
        }
        
        refreshIcons();
    }
    
    if (galleryAddBtn) {
        galleryAddBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (galleryImages.length >= MAX_GALLERY) {
                showWarning(`You can upload a maximum of ${MAX_GALLERY} photos.`, 'Limit Reached');
                return;
            }
            galleryInput.click();
        });
    }
    
    if (galleryInput) {
        galleryInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            const remainingSlots = MAX_GALLERY - galleryImages.length;
            
            if (files.length > remainingSlots) {
                showWarning(`You can only add ${remainingSlots} more photo(s).`, 'Limit Reached');
                return;
            }
            
            if (galleryAddBtn) galleryAddBtn.style.opacity = '0.5';
            
            const formData = new FormData();
            let validFiles = 0;
            
            files.forEach(file => {
                if (file.size <= 5 * 1024 * 1024) {
                    formData.append('galleryImages', file);
                    validFiles++;
                }
            });
            
            if (validFiles === 0) {
                showWarning('No valid files to upload.', 'Error');
                if (galleryAddBtn) galleryAddBtn.style.opacity = '1';
                return;
            }
            
            try {
                const response = await fetch('/api/technician/gallery', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (data.success) {
                    data.images.forEach(img => {
                        galleryImages.push(img);
                    });
                    renderGallery();
                    showSuccess(`${data.images.length} photo(s) added to your portfolio!`, 'Portfolio Updated');
                } else {
                    throw new Error(data.message || 'Upload failed');
                }
            } catch (error) {
                console.error('Gallery upload error:', error);
                showWarning('Failed to upload photos.', 'Error');
            } finally {
                if (galleryAddBtn) galleryAddBtn.style.opacity = '1';
                galleryInput.value = '';
            }
        });
    }
    
    if (galleryGrid) {
        galleryGrid.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-btn');
            if (!removeBtn) return;
            
            const imageId = removeBtn.dataset.id;
            
            showConfirmModal(
                'Remove Photo?',
                'Are you sure you want to remove this photo from your portfolio?',
                async () => {
                    try {
                        const response = await fetch(`/api/technician/gallery/${imageId}`, {
                            method: 'DELETE'
                        });
                        
                        const data = await response.json();
                        
                        if (data.success) {
                            galleryImages = galleryImages.filter(img => img.id != imageId);
                            renderGallery();
                            showSuccess('Photo removed from portfolio.', 'Photo Removed');
                        } else {
                            throw new Error(data.message || 'Delete failed');
                        }
                    } catch (error) {
                        console.error('Delete error:', error);
                        showWarning('Failed to remove photo.', 'Error');
                    }
                }
            );
        });
    }

    // ==========================================
    // --- TAB NAVIGATION ---
    // ==========================================
    const navItems = document.querySelectorAll('.nav-item, .mobile-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const sidebar = document.getElementById('sidebar');
    
    function switchTab(tab) {
        navItems.forEach(n => {
            n.classList.remove('active');
            if (n.dataset.tab === tab) n.classList.add('active');
        });
        
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.dataset.tab === tab) content.classList.add('active');
        });
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        refreshIcons();
    }
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.dataset.tab;
            switchTab(tab);
            
            if (sidebar.classList.contains('mobile-open')) {
                closeMobileSidebar();
            }
        });
    });

    // ==========================================
    // --- MOBILE SIDEBAR ---
    // ==========================================
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    function closeMobileSidebar() {
        sidebar.classList.remove('mobile-open');
        sidebarOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            sidebarOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }
    
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', closeMobileSidebar);
    }

    // ==========================================
    // --- LOGOUT ---
    // ==========================================
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showConfirmModal(
                'Logout Confirmation',
                'Are you sure you want to logout from your dashboard?',
                async () => {
                    try {
                        await fetch('/logout', { method: 'POST' });
                        showInfo('You have been logged out successfully.', 'Goodbye!');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1500);
                    } catch (error) {
                        console.error('Logout error:', error);
                        showWarning('Failed to logout. Please try again.', 'Error');
                    }
                }
            );
        });
    }

    // ==========================================
    // --- DEACTIVATE ACCOUNT ---
    // ==========================================
    const deactivateBtn = document.getElementById('deactivateBtn');
    if (deactivateBtn) {
        deactivateBtn.addEventListener('click', () => {
            showConfirmModal(
                'Deactivate Account?',
                'This will permanently deactivate your account. You will no longer receive job requests. This action cannot be undone easily.',
                () => {
                    showWarning('Account deactivation will be available once backend is connected.', 'Feature Coming Soon');
                }
            );
        });
    }

        // --- FETCH GALLERY FROM BACKEND ---
    async function fetchGallery() {
        try {
            const response = await fetch('/api/technician/profile');
            if (response.ok) {
                const data = await response.json();
                if (data.gallery) {
                    galleryImages = data.gallery;
                    renderGallery();
                }
            }
        } catch (error) {
            console.error('Error fetching gallery:', error);
        }
    }

    // ==========================================
    // --- INITIALIZE ---
    // ==========================================
    document.addEventListener('DOMContentLoaded', async () => {
        const success = await loadTechnicianProfile();
        
        if (success) {
            populateProfile();
            await renderJobs();
            await fetchGallery();
            refreshIcons();
        }
    });

    // Mobile sidebar styles
    if (!document.getElementById('mobile-sidebar-styles')) {
        const style = document.createElement('style');
        style.id = 'mobile-sidebar-styles';
        style.textContent = `
            @media (max-width: 1023px) {
                .dashboard-sidebar.mobile-open {
                    display: flex;
                    position: fixed;
                    top: var(--nav-height);
                    left: 0;
                    height: calc(100vh - var(--nav-height));
                    z-index: 999;
                    animation: slideIn 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from { transform: translateX(-100%); }
                    to { transform: translateX(0); }
                }
                
                .confirmation-modal {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 10001;
                    padding: 20px;
                    animation: fadeIn 0.2s ease-out;
                }
            }
        `;
        document.head.appendChild(style);
    }

})();