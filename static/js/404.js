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

    // --- SEARCH FUNCTIONALITY ---
    const errorSearch = document.getElementById('errorSearch');
    const errorSearchInput = document.getElementById('errorSearchInput');

    if (errorSearch) {
        errorSearch.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const query = errorSearchInput.value.trim();
            
            if (!query) {
                showWarning('Please enter a service to search for.', 'Empty Search');
                errorSearchInput.focus();
                return;
            }
            
            // Map common search terms to our service categories
            const serviceMap = {
                'electric': 'Electrical & Solar',
                'electrical': 'Electrical & Solar',
                'solar': 'Electrical & Solar',
                'plumb': 'Plumbing',
                'plumbing': 'Plumbing',
                'pipe': 'Plumbing',
                'car': 'Automotive',
                'auto': 'Automotive',
                'mechanic': 'Automotive',
                'automotive': 'Automotive',
                'furniture': 'Furniture',
                'carpentry': 'Furniture',
                'wood': 'Furniture',
                'curtain': 'Curtains',
                'blinds': 'Curtains',
                'pop': 'POP & Painting',
                'paint': 'POP & Painting',
                'painting': 'POP & Painting',
                'ac': 'AC & Refrigerator',
                'refrigerator': 'AC & Refrigerator',
                'fridge': 'AC & Refrigerator',
                'cctv': 'CCTV',
                'camera': 'CCTV',
                'security': 'CCTV',
                'generator': 'Generator',
                'gen': 'Generator'
            };
            
            // Find matching service
            let matchedService = null;
            const lowerQuery = query.toLowerCase();
            
            for (const [keyword, service] of Object.entries(serviceMap)) {
                if (lowerQuery.includes(keyword)) {
                    matchedService = service;
                    break;
                }
            }
            
            if (matchedService) {
                const encodedService = encodeURIComponent(matchedService);
                showSuccess(`Redirecting to ${matchedService} specialists...`, 'Search Match Found');
                setTimeout(() => {
                    window.location.href = `/find-pro?service=${encodedService}`;
                }, 1200);
            } else {
                // No match - redirect to find-pro with location prompt
                showInfo('No exact match found. Redirecting to the search page where you can refine your search.', 'No Exact Match');
                setTimeout(() => {
                    window.location.href = '/find-pro';
                }, 1500);
            }
        });
    }

    // --- REPORT BROKEN LINK ---
    const reportBtn = document.getElementById('reportBtn');
    
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            const currentUrl = window.location.href;
            const referrer = document.referrer || 'Direct visit';
            
            // In production, this would send to backend
            // For now, show confirmation
            showSuccess(
                `Thanks for reporting! The broken link has been noted.\n\nURL: ${currentUrl}`,
                'Report Submitted'
            );
            
            // Disable button after click
            reportBtn.disabled = true;
            reportBtn.style.opacity = '0.5';
            reportBtn.style.cursor = 'not-allowed';
            reportBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>Reported - Thank You!</span>
            `;
        });
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
    });
})();