(function() {
    'use strict';

    console.log('Post Job JS loaded.');

    const postJobForm = document.getElementById('postJobForm');
    const postSuccess = document.getElementById('postSuccess');
    const submitBtn = document.getElementById('submitJobBtn');
    const postAnotherBtn = document.getElementById('postAnotherBtn');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // --- VALIDATE NIGERIAN PHONE ---
    function isValidNigerianPhone(phone) {
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length === 11 && 
               (cleaned.startsWith('070') || cleaned.startsWith('080') || 
                cleaned.startsWith('081') || cleaned.startsWith('090') || 
                cleaned.startsWith('091'));
    }

    // --- FORM SUBMISSION ---
    if (postJobForm) {
        postJobForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const jobData = {
                title: document.getElementById('jobTitle').value.trim(),
                description: document.getElementById('jobDescription').value.trim(),
                skill: document.getElementById('jobSkill').value,
                location: document.getElementById('jobLocation').value.trim(),
                budget: document.getElementById('jobBudget').value.trim(),
                clientName: document.getElementById('clientName').value.trim(),
                clientPhone: document.getElementById('clientPhone').value.trim(),
                clientEmail: document.getElementById('clientEmail').value.trim()
            };

            // Validation
            if (!jobData.title || !jobData.description || !jobData.skill || 
                !jobData.location || !jobData.clientName || !jobData.clientPhone) {
                showWarning('Please fill in all required fields.', 'Missing Information');
                return;
            }

            if (!isValidNigerianPhone(jobData.clientPhone)) {
                showWarning('Please enter a valid Nigerian phone number (11 digits).', 'Invalid Phone');
                return;
            }

            if (jobData.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(jobData.clientEmail)) {
                showWarning('Please enter a valid email address.', 'Invalid Email');
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            submitBtn.querySelector('.btn-text').style.display = 'none';
            submitBtn.querySelector('.btn-loader').style.display = 'inline-flex';

            try {
                const response = await fetch('/api/jobs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(jobData)
                });

                const data = await response.json();

                if (data.success) {
                    // Show success state
                    postJobForm.style.display = 'none';
                    postSuccess.style.display = 'block';

                    // Populate success details
                    document.getElementById('jobToken').textContent = data.jobToken;
                    document.getElementById('matchCount').textContent = data.matchingTechnicians;

                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });

                    showSuccess('Your job has been posted successfully!', 'Job Posted');
                    refreshIcons();
                } else {
                    showWarning(data.message || 'Failed to post job.', 'Error');
                }
            } catch (error) {
                console.error('Post job error:', error);
                showWarning('Network error. Please try again.', 'Error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.querySelector('.btn-text').style.display = 'inline-flex';
                submitBtn.querySelector('.btn-loader').style.display = 'none';
            }
        });
    }

    // --- POST ANOTHER JOB ---
    if (postAnotherBtn) {
        postAnotherBtn.addEventListener('click', () => {
            postSuccess.style.display = 'none';
            postJobForm.style.display = 'block';
            postJobForm.reset();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
    });

})();