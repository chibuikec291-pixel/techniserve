(function() {
    'use strict';

    console.log('Find-Pro JS loaded successfully.');

    // --- DOM ELEMENTS ---
    const techGrid = document.getElementById('techGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const techCountEl = document.getElementById('techCount');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // --- CHECK FOR URL PARAMETERS ON LOAD ---
    function checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const skillParam = urlParams.get('service');
        const locationParam = urlParams.get('location');

        if (skillParam || locationParam) {
            performSearch(skillParam, locationParam);
        } else {
            performSearch('', '');
        }
    }

    // --- PERFORM SEARCH ---
    async function performSearch(skill, location) {
        if (loadingState) loadingState.style.display = 'block';
        if (techGrid) techGrid.innerHTML = '';
        if (emptyState) emptyState.style.display = 'none';

        try {
            const params = new URLSearchParams();
            if (skill) params.append('skill', skill);
            if (location) params.append('location', location);

            const response = await fetch(`/api/search-technicians?${params.toString()}`);
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            renderResults(data);

        } catch (error) {
            console.error('Search error:', error);
            if (typeof showWarning === 'function') {
                showWarning('An error occurred while searching.', 'Search Error');
            }
        } finally {
            if (loadingState) loadingState.style.display = 'none';
        }
    }

    // --- RENDER RESULTS ---
    function renderResults(data) {
        // Handle both old and new API response formats
        const technicians = data.technicians || data;
        const isAutomationSearch = data.isAutomationSearch || false;
        const totalResults = data.totalResults || technicians.length;

        if (techCountEl) techCountEl.textContent = totalResults;

        if (!technicians || technicians.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            return;
        }

        if (emptyState) emptyState.style.display = 'none';

        // Show automation notice banner if this is an automation search
        if (isAutomationSearch && techGrid) {
            const notice = document.createElement('div');
            notice.className = 'automation-notice';
            notice.style.cssText = `
                grid-column: 1 / -1;
                padding: 16px 20px;
                background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                border: 2px solid #F59E0B;
                border-radius: 12px;
                margin-bottom: 20px;
                display: flex;
                align-items: center;
                gap: 12px;
            `;
            notice.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <div>
                    <strong style="color:#92400E; display:block; margin-bottom:4px;">Showing All Automation Engineers in Imo State</strong>
                    <span style="color:#78350F; font-size:0.875rem;">Since automation is a specialized skill, we're showing all available engineers across the state, not just your area.</span>
                </div>
            `;
            techGrid.appendChild(notice);
        }

        technicians.forEach(tech => {
            const card = document.createElement('div');
            card.className = 'tech-card'; 
            
            // Use profile pic for the card image, or a fallback gradient
            const imgSrc = tech.profilePic || '';
            const imgHTML = imgSrc 
                ? `<img src="${imgSrc}" alt="${tech.fullName}">` 
                : `<div style="width:100%;height:100%;background:linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%);display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:3rem;"><i data-lucide="user"></i></div>`;

            card.innerHTML = `
                <div class="tech-card-image">
                    ${imgHTML}
                    <div class="tech-badge">
                        <i data-lucide="shield-check"></i> Verified
                    </div>
                </div>
                <div class="tech-card-content">
                    <div class="tech-card-header">
                        <h3 class="tech-name">${tech.fullName}</h3>
                        <p class="tech-specialty">${tech.specialty || tech.skill}</p>
                        <div class="tech-location">
                            <i data-lucide="map-pin"></i> ${tech.location}
                        </div>
                        <div class="tech-rating">
                            <div class="stars">
                                <svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                                <svg class="star filled" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                            </div>
                            <span class="rating-text">5.0 (New)</span>
                        </div>
                    </div>
                    <div class="tech-card-footer">
                        <a href="${tech.profileUrl || '#'}" class="btn-whatsapp">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
                            <span>View Profile</span>
                        </a>
                    </div>
                </div>
            `;

            if (techGrid) techGrid.appendChild(card);
        });

        refreshIcons();
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
        checkUrlParams();
    });

})();