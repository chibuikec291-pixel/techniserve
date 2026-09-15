(function() {
    'use strict';

    console.log('Search JS loaded.');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // ==========================================
    // --- HOMEPAGE: SEARCH FORM HANDLER ---
    // ==========================================
    const searchForm = document.getElementById('searchForm');

    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const service = document.getElementById('serviceSelect').value;
            const location = document.getElementById('locationInput').value.trim();
            
            if (!service || !location) {
                showWarning('Please select a service and enter your location!', 'Missing Information');
                return;
            }

            // Encode parameters for URL
            const encodedService = encodeURIComponent(service);
            const encodedLocation = encodeURIComponent(location);
            
            // Redirect to results page
            window.location.href = `/find-pro?service=${encodedService}&location=${encodedLocation}`;
        });
    }

    // ==========================================
    // --- HOMEPAGE: QUICK SERVICE TAGS ---
    // ==========================================
    const quickTags = document.querySelectorAll('.quick-tag');

    quickTags.forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            
            const service = tag.getAttribute('data-service');
            const serviceSelect = document.getElementById('serviceSelect');
            
            if (serviceSelect) {
                serviceSelect.value = service;
                
                // Smooth scroll to search box
                document.querySelector('.search-container').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // Focus on location input
                setTimeout(() => {
                    document.getElementById('locationInput').focus();
                }, 500);
            }
        });
    });

    // ==========================================
    // --- FIND-PRO PAGE: SEARCH RESULTS ---
    // ==========================================
    const searchResultsContainer = document.getElementById('searchResults');
    const emptyState = document.getElementById('emptyState');
    const resultsCount = document.getElementById('resultsCount');
    const searchSummary = document.getElementById('searchSummary');

    // Only run this on the find-pro page
    if (searchResultsContainer) {
        
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const service = urlParams.get('service') || '';
        const location = urlParams.get('location') || '';

        // Update search summary if it exists
        if (searchSummary) {
            searchSummary.innerHTML = `
                <span>Showing results for <strong>${service}</strong> in <strong>${location}</strong></span>
            `;
        }

        // Fetch and render results
        async function loadSearchResults() {
            try {
                const response = await fetch(`/api/search-technicians?skill=${encodeURIComponent(service)}&location=${encodeURIComponent(location)}`);
                
                if (!response.ok) throw new Error('Failed to fetch results');
                
                const data = await response.json();
                renderResults(data);
                
            } catch (error) {
                console.error('Search error:', error);
                showWarning('Failed to load search results. Please try again.', 'Error');
            }
        }

        // --- RENDER SEARCH RESULTS ---
        function renderResults(data) {
            // Clear previous results
            searchResultsContainer.innerHTML = '';
            
            // Handle the response format (supports both old and new format)
            const technicians = data.technicians || data;
            const isAutomationSearch = data.isAutomationSearch || false;
            const totalResults = data.totalResults || technicians.length;
            
            // Update results count
            if (resultsCount) {
                resultsCount.textContent = totalResults;
            }
            
            if (totalResults === 0) {
                if (emptyState) emptyState.style.display = 'block';
                searchResultsContainer.style.display = 'none';
                return;
            }
            
            if (emptyState) emptyState.style.display = 'none';
            searchResultsContainer.style.display = 'grid';
            
            // Show special notice for Automation search
            if (isAutomationSearch) {
                const notice = document.createElement('div');
                notice.className = 'automation-notice';
                notice.style.cssText = `
                    grid-column: 1 / -1;
                    padding: 16px 20px;
                    background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%);
                    border: 2px solid #F59E0B;
                    border-radius: var(--radius-lg);
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                `;
                notice.innerHTML = `
                    <i data-lucide="info" style="width:24px; height:24px; color:#F59E0B; flex-shrink:0;"></i>
                    <div>
                        <strong style="color:#92400E; display:block; margin-bottom:4px;">Showing All Automation Engineers in Imo State</strong>
                        <span style="color:#78350F; font-size:0.875rem;">Since automation is a specialized skill, we're showing all available engineers across the state, not just your area.</span>
                    </div>
                `;
                searchResultsContainer.appendChild(notice);
            }
            
            // Render technician cards
            technicians.forEach(tech => {
                const card = document.createElement('div');
                card.className = 'tech-card';
                
                const profilePic = tech.profilePic 
                    ? `<img src="${tech.profilePic}" alt="${tech.fullName}">`
                    : `<div class="tech-card-placeholder"><i data-lucide="user"></i></div>`;
                
                card.innerHTML = `
                    <div class="tech-card-image">
                        ${profilePic}

                        ${tech.availabilityStatus === 'available' ? `
                    <div class="availability-indicator available" title="Available">
                        <span class="status-dot"></span>
                    </div>
                ` : ''}
                    </div>
                    <div class="tech-card-content">
                        <h3 class="tech-card-name">${tech.fullName}</h3>
                        <div class="tech-card-meta">
                            <span class="tech-card-skill">
                                <i data-lucide="wrench"></i>
                                ${tech.skill}
                            </span>
                            <span class="tech-card-location">
                                <i data-lucide="map-pin"></i>
                                ${tech.location}
                            </span>
                        </div>
                        <p class="tech-card-specialty">${tech.specialty || 'General Specialist'}</p>
                        <div class="tech-card-footer">
                            <span class="tech-card-experience">
                                <i data-lucide="award"></i>
                                ${tech.experience} years
                            </span>
                            <a href="${tech.profileUrl}" class="tech-card-btn">
                                View Profile
                                <i data-lucide="arrow-right"></i>
                            </a>
                        </div>
                    </div>
                `;
                
                searchResultsContainer.appendChild(card);
            });
            
            refreshIcons();
        }

        // Load results when page loads
        loadSearchResults();
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
    });

})();
