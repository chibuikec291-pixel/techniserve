(function() {
    'use strict';

    console.log('Technician Profile JS loaded.');

    // --- DOM ELEMENTS (Mapped to your exact HTML IDs) ---
    const loadingState = document.getElementById('profileLoading');
    const notFoundState = document.getElementById('profileNotFound');
    const profileWrapper = document.getElementById('profileWrapper');
    
    const elName = document.getElementById('profileName');
    const elSkill = document.getElementById('tagSkill');
    const elSpecialty = document.getElementById('tagSpecialty');
    const elLocation = document.getElementById('profileLocation');
    const elExperience = document.getElementById('profileExperience');
    const elRegistered = document.getElementById('statMemberSince');
    const elStatSkill = document.getElementById('statSkill');
    const elStatSpecialty = document.getElementById('statSpecialty');
    
    const elProfilePic = document.getElementById('profilePic');
    const elPlaceholder = document.getElementById('profilePlaceholder');
    
    // Contact buttons (Selects ALL instances: Desktop, Sidebar, and Mobile)
    const whatsappBtns = document.querySelectorAll('.btn-whatsapp, .btn-whatsapp-large, .mobile-btn-whatsapp');
    const callBtns = document.querySelectorAll('.btn-call, .mobile-btn-call');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // --- HELPER: Format Date ---
    function formatDate(isoString) {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    // --- FETCH PROFILE ---
    async function loadProfile() {
        const phone = window.TECHNICIAN_PHONE;

        if (!phone) {
            showNotFound();
            return;
        }

        try {
            console.log(`Fetching profile for phone: ${phone}`);
            const response = await fetch(`/api/technician/public?phone=${encodeURIComponent(phone)}`);
            
            // Safety check: Ensure backend returned JSON, not an HTML 404 page
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                console.error('Backend did not return JSON. Check app.py route.');
                showNotFound();
                return;
            }

            if (response.status === 404) {
                showNotFound();
                return;
            }
            
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const tech = await response.json();
            console.log('Profile data received:', tech);
            
            populateProfile(tech);
            showProfile();

        } catch (error) {
            console.error('Profile load error:', error);
            showNotFound();
        }
    }

    function showProfile() {
        if (loadingState) loadingState.style.display = 'none';
        if (notFoundState) notFoundState.style.display = 'none';
        if (profileWrapper) profileWrapper.style.display = 'block';
        refreshIcons();
    }

    function showNotFound() {
        if (loadingState) loadingState.style.display = 'none';
        if (profileWrapper) profileWrapper.style.display = 'none';
        if (notFoundState) notFoundState.style.display = 'flex';
        refreshIcons();
    }

    function populateProfile(tech) {
        if (!tech) return;

        // 1. Hero Section
        const profileName = document.getElementById('profileName');
        const tagSkill = document.getElementById('tagSkill');
        const tagSpecialty = document.getElementById('tagSpecialty');
        const profileLocation = document.getElementById('profileLocation');
        const profileExperience = document.getElementById('profileExperience');

        if (profileName) profileName.textContent = tech.fullName;
        if (tagSkill) tagSkill.textContent = tech.skill;
        if (tagSpecialty) tagSpecialty.textContent = tech.specialty || tech.skill;
        if (profileLocation) profileLocation.textContent = tech.location;
        if (profileExperience) profileExperience.textContent = `${tech.experience} years`;

        // 2. About Section Stats
        const statSkill = document.getElementById('statSkill');
        const statSpecialty = document.getElementById('statSpecialty');
        const statMemberSince = document.getElementById('statMemberSince');

        if (statSkill) statSkill.textContent = tech.skill;
        if (statSpecialty) statSpecialty.textContent = tech.specialty || tech.skill;
        if (statMemberSince) statMemberSince.textContent = formatDate(tech.registeredAt);

        // 3. WhatsApp Buttons (Desktop, Sidebar, and Mobile) + ✅ SILENT LOGGING
        if (tech.whatsapp) {
            const waNumber = tech.whatsapp.replace(/^0/, '234').replace(/^\+/, '');
            whatsappBtns.forEach(btn => {
                btn.href = `https://wa.me/${waNumber}`;
                
                // ✅ SILENT LOGGING: WhatsApp Click
                btn.addEventListener('click', function() {
                    fetch('/api/technician/log-contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            technicianPhone: tech.phone,
                            method: 'direct_whatsapp'
                        })
                    }).catch(err => console.log('Silent log failed:', err));
                });
            });
        }

        // 4. Call Buttons (Desktop, Sidebar, and Mobile) + ✅ SILENT LOGGING
        if (tech.phone) {
            callBtns.forEach(btn => {
                btn.href = `tel:${tech.phone}`;
                
                // ✅ SILENT LOGGING: Call Click
                btn.addEventListener('click', function() {
                    fetch('/api/technician/log-contact', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            technicianPhone: tech.phone,
                            method: 'direct_call'
                        })
                    }).catch(err => console.log('Silent log failed:', err));
                });
            });
        }

        // 5. Profile Picture
        const profilePic = document.getElementById('profilePic');
        const profilePlaceholder = document.getElementById('profilePlaceholder');
        
        if (tech.profilePic) {
            if (profilePic) {
                profilePic.src = tech.profilePic;
                profilePic.style.display = 'block';
            }
            if (profilePlaceholder) profilePlaceholder.style.display = 'none';
        } else {
            if (profilePic) profilePic.style.display = 'none';
            if (profilePlaceholder) profilePlaceholder.style.display = 'flex';
        }

        // 6. Gallery / Portfolio
        const portfolioGrid = document.getElementById('portfolioGrid');
        const portfolioCount = document.getElementById('portfolioCount');
        
        if (portfolioGrid && tech.gallery && tech.gallery.length > 0) {
            portfolioGrid.innerHTML = ''; // Clear the "No photos" empty state
            
            tech.gallery.forEach(img => {
                const item = document.createElement('div');
                item.className = 'portfolio-item';
                item.innerHTML = `<img src="${img.url}" alt="Portfolio photo">`;
                portfolioGrid.appendChild(item);
            });
            
            if (portfolioCount) {
                portfolioCount.textContent = `${tech.gallery.length} photos`;
            }
        }

        // 7. --- POPULATE REVIEWS ---
        const reviewsSummary = document.getElementById('reviewsSummary');
        const reviewsSection = document.getElementById('reviewsSection');
        const reviewsEmpty = document.getElementById('reviewsEmpty');

        // Update Summary (Average Rating)
        if (reviewsSummary) {
            if (tech.totalReviews > 0) {
                reviewsSummary.innerHTML = `
                    <div style="display:flex; align-items:center; gap:4px;">
                        <svg class="star filled" viewBox="0 0 24 24" fill="#FBBF24" style="width:18px; height:18px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <strong style="color:var(--text-dark); font-size:1.1rem;">${tech.averageRating}</strong>
                    </div>
                    <span style="color:var(--text-muted); font-size:0.875rem;">(${tech.totalReviews} reviews)</span>
                `;
            } else {
                reviewsSummary.innerHTML = `<span style="color:var(--text-muted); font-size:0.875rem;">No ratings yet</span>`;
            }
        }

        // Render Reviews List
        if (reviewsSection && tech.reviews && tech.reviews.length > 0) {
            if (reviewsEmpty) reviewsEmpty.style.display = 'none';
            
            // Clear existing reviews (except empty state)
            reviewsSection.querySelectorAll('.review-item').forEach(el => el.remove());

            tech.reviews.forEach(review => {
                const reviewEl = document.createElement('div');
                reviewEl.className = 'review-item';
                reviewEl.style.cssText = 'padding:15px 0; border-bottom:1px solid var(--border-light);';
                
                // Generate Stars
                let starsHTML = '';
                for (let i = 1; i <= 5; i++) {
                    starsHTML += `<svg viewBox="0 0 24 24" fill="${i <= review.rating ? '#FBBF24' : '#E2E8F0'}" style="width:14px; height:14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
                }

                reviewEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <strong style="color:var(--text-dark); font-size:0.938rem;">${review.clientName}</strong>
                        <span style="color:var(--text-muted); font-size:0.75rem;">${review.createdAt}</span>
                    </div>
                    <div style="display:flex; gap:2px; margin-bottom:8px;">${starsHTML}</div>
                    ${review.comment ? `<p style="color:var(--text); font-size:0.875rem; line-height:1.5; margin:0;">${review.comment}</p>` : ''}
                `;
                reviewsSection.appendChild(reviewEl);
            });
        }

        // 8. AVAILABILITY STATUS
        const availabilityBadge = document.getElementById('publicAvailabilityBadge');
        if (availabilityBadge && tech.availabilityStatus) {
            availabilityBadge.className = `availability-badge ${tech.availabilityStatus}`;
            availabilityBadge.innerHTML = `
                <span class="status-dot"></span>
                ${tech.availabilityStatus.charAt(0).toUpperCase() + tech.availabilityStatus.slice(1)}
            `;
            availabilityBadge.style.display = 'inline-flex';
            console.log('✅ Availability badge shown:', tech.availabilityStatus);
        } else {
            console.log('❌ Availability badge not found or no status:', {
                badgeExists: !!availabilityBadge,
                status: tech.availabilityStatus
            });
        }

        refreshIcons();
    }

    // --- REVIEW FORM LOGIC ---
    const starIcons = document.querySelectorAll('.star-icon');
    const reviewRatingInput = document.getElementById('reviewRating');
    const reviewForm = document.getElementById('reviewForm');

    // Handle Star Selection
    if (starIcons.length > 0) {
        starIcons.forEach(icon => {
            icon.addEventListener('click', () => {
                const value = parseInt(icon.dataset.value);
                reviewRatingInput.value = value;
                
                starIcons.forEach((s, index) => {
                    s.setAttribute('fill', index < value ? '#FBBF24' : '#E2E8F0');
                });
            });
        });
    }

    // Handle Form Submission
    if (reviewForm) {
        reviewForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const clientName = document.getElementById('reviewerName').value.trim();
            const rating = parseInt(reviewRatingInput.value);
            const comment = document.getElementById('reviewComment').value.trim();
            const submitBtn = document.getElementById('submitReviewBtn');

            if (rating === 0) {
                showWarning('Please select a star rating.', 'Rating Required');
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').style.display = 'none';
            submitBtn.querySelector('.btn-loader').style.display = 'inline-flex';

            try {
                const response = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: window.TECHNICIAN_PHONE,
                        clientName: clientName,
                        rating: rating,
                        comment: comment
                    })
                });

                const data = await response.json();

                if (data.success) {
                    showSuccess('Thank you! Your review has been submitted.', 'Review Submitted');
                    reviewForm.reset();
                    reviewRatingInput.value = 0;
                    starIcons.forEach(s => s.setAttribute('fill', '#E2E8F0'));
                    
                    // Reload profile to show new review
                    setTimeout(() => loadProfile(), 1000);
                } else {
                    showWarning(data.message || 'Failed to submit review.', 'Error');
                }
            } catch (error) {
                console.error('Review error:', error);
                showWarning('Network error. Please try again.', 'Error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').style.display = 'inline';
                submitBtn.querySelector('.btn-loader').style.display = 'none';
            }
        });
    }

    // --- BOOK NOW MODAL ---
    const bookNowBtn = document.getElementById('bookNowBtn');
    const bookingModal = document.getElementById('bookingModal');
    const bookingForm = document.getElementById('bookingForm');
    const closeModalBtn = bookingModal?.querySelector('.close-modal');

    if (bookNowBtn && bookingModal) {
        bookNowBtn.addEventListener('click', () => {
            const techName = document.getElementById('profileName')?.textContent || 'Technician';
            document.getElementById('bookingTechName').textContent = techName;
            bookingModal.style.display = 'flex';
        });

        closeModalBtn?.addEventListener('click', () => {
            bookingModal.style.display = 'none';
        });

        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) {
                bookingModal.style.display = 'none';
            }
        });

        bookingForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const bookingData = {
                technicianPhone: window.TECHNICIAN_PHONE,
                clientName: document.getElementById('bookingClientName').value.trim(),
                clientPhone: document.getElementById('bookingClientPhone').value.trim(),
                serviceType: document.getElementById('bookingServiceType').value.trim(),
                notes: document.getElementById('bookingNotes').value.trim()
            };

            try {
                const response = await fetch('/api/booking', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(bookingData)
                });

                const data = await response.json();

                if (data.success) {
                    showSuccess('Booking recorded! The technician will contact you soon.', 'Booking Confirmed');
                    bookingModal.style.display = 'none';
                    bookingForm.reset();
                } else {
                    showWarning(data.message || 'Failed to create booking', 'Error');
                }
            } catch (error) {
                console.error('Booking error:', error);
                showWarning('Network error. Please try again.', 'Error');
            }
        });
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        loadProfile();
    });

})();