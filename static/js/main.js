(function() {
    'use strict';

    // Wait for DOM to be fully loaded
    document.addEventListener('DOMContentLoaded', () => {
        // --- PRELOADER ---
        const preloader = document.getElementById('preloader');
        if (preloader) {
            // Small delay to ensure smooth transition
            setTimeout(() => {
                preloader.classList.add('fade-out');
                setTimeout(() => preloader.remove(), 500);
            }, 100);
        }

        // --- MOBILE MENU ---
        const mainMenuToggle = document.getElementById('menu-toggle');
        const mainNavLinks = document.getElementById('nav-links');

        if (mainMenuToggle && mainNavLinks) {
            mainMenuToggle.addEventListener('click', () => {
                mainNavLinks.classList.toggle('active');
                
                // Change icon between menu and X
                const icon = mainMenuToggle.querySelector('[data-lucide]');
                if (icon) {
                    if (mainNavLinks.classList.contains('active')) {
                        icon.setAttribute('data-lucide', 'x');
                    } else {
                        icon.setAttribute('data-lucide', 'menu');
                    }
                    lucide.createIcons();
                }
            });

            // Close menu when clicking a nav link (mobile)
            mainNavLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    if (window.innerWidth <= 768) {
                        mainNavLinks.classList.remove('active');
                        const icon = mainMenuToggle.querySelector('[data-lucide]');
                        if (icon) {
                            icon.setAttribute('data-lucide', 'menu');
                            lucide.createIcons();
                        }
                    }
                });
            });
        }

        // --- CLOSE MENU ON WINDOW RESIZE ---
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768 && mainNavLinks) {
                mainNavLinks.classList.remove('active');
            }
        });
    });
})();