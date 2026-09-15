(function() {
    'use strict';

    // --- DOM ELEMENTS ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    const tocNav = document.getElementById('tocNav');
    const tocSidebar = document.getElementById('tocSidebar');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') {
            safeCreateIcons();
        } else if (typeof lucide !== 'undefined' && lucide.createIcons) {
            lucide.createIcons();
        }
    }

    // --- TAB SWITCHING ---
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.dataset.tab;
            
            // Update buttons
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Update content
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
            
            // Rebuild TOC for new tab
            buildTOC(targetTab);
            
            // Scroll to top of content
            document.querySelector('.terms-section').scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            refreshIcons();
        });
    });

    // --- BUILD TABLE OF CONTENTS ---
    function buildTOC(activeTabId) {
        if (!tocNav) return;
        
        const activeTab = document.getElementById(activeTabId);
        if (!activeTab) return;
        
        const sections = activeTab.querySelectorAll('section[id]');
        tocNav.innerHTML = '';
        
        sections.forEach(section => {
            const heading = section.querySelector('h3');
            if (!heading) return;
            
            const link = document.createElement('a');
            link.href = '#' + section.id;
            link.className = 'toc-link';
            link.textContent = heading.textContent.trim();
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                section.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                // Update active state
                tocNav.querySelectorAll('.toc-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
            
            tocNav.appendChild(link);
        });
        
        // Set first link as active
        const firstLink = tocNav.querySelector('.toc-link');
        if (firstLink) firstLink.classList.add('active');
    }

    // --- SCROLL SPY (Highlight TOC link as user scrolls) ---
    function setupScrollSpy() {
        const activeTab = document.querySelector('.tab-content.active');
        if (!activeTab) return;
        
        const sections = activeTab.querySelectorAll('section[id]');
        if (sections.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;
                    tocNav.querySelectorAll('.toc-link').forEach(link => {
                        link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                    });
                }
            });
        }, {
            rootMargin: '-20% 0px -70% 0px',
            threshold: 0
        });
        
        sections.forEach(section => observer.observe(section));
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        buildTOC('terms-content');
        setupScrollSpy();
        refreshIcons();
    });

    // Re-setup scroll spy when tab changes
    const observer = new MutationObserver(() => {
        setupScrollSpy();
    });
    
    if (tocNav) {
        observer.observe(tocNav, { childList: true });
    }
})();