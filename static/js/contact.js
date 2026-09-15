(function() {
    'use strict';

    // --- FAQ ACCORDION ---
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        
        question.addEventListener('click', () => {
            const isActive = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

        // --- CONTACT FORM SUBMISSION ---
    const contactForm = document.getElementById('contactForm');

    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value.trim();
            
            if (!name || !email || !subject || !message) {
                showWarning('Please fill in all required fields.', 'Missing Information');
                return;
            }
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                showWarning('Please enter a valid email address.', 'Invalid Email');
                return;
            }
            
            // Send to backend
            fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, subject, message })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showSuccess('Your message has been sent successfully! We\'ll get back to you within 24 hours.', 'Message Sent!');
                    contactForm.reset();
                } else {
                    showWarning(data.message || 'Failed to send message.', 'Error');
                }
            })
            .catch(error => {
                console.error('Contact error:', error);
                showWarning('An error occurred. Please try again.', 'Connection Error');
            });
        });
    }

    // --- INITIALIZE LUCIDE ICONS ---
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof safeCreateIcons === 'function') {
            safeCreateIcons();
        } else if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });
})();