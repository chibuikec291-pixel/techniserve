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

   // --- MOCK PAST PROJECTS ---
const pastProjects = [
    {
        title: "Luxury 5-Bedroom Duplex",
        type: "New Building",
        location: "World Bank, Owerri",
        duration: "8 months",
        image: "/static/img/duplex.jpeg",  // ✅ Use direct path instead of url_for
        description: "Complete construction of a luxury duplex from foundation to premium finishing, including electrical, plumbing,POP ceiling work, etc."
    },
    {
        title: "Modern Bungalow Finishing",
        type: "Finishing Only",
        location: "Works Layout, Owerri",
        duration: "3 months",
        image: "/static/img/bungalow2.jpeg",  // ✅ Use direct path
        description: "Premium interior finishing including POP ceilings, screeding, painting, and custom furniture installation."
    },
    {
        title: "Residential Solar Power System",
        type: "Solar Contract",
        location: "Orlu, Imo State",
        duration: "2 months",
        image: "/static/img/solar.jpeg",  // ✅ Use direct path
        description: "Design and installation of a 15KVA solar power system with lithium battery backup for a residential apartment."
    },
    {
        title: "Residential Estate Plumbing",
        type: "Plumbing Contract",
        location: "Avu, Owerri",
        duration: "6 months",
        image: "/static/img/bathroom.jpeg",  // ✅ Use direct path
        description: "Comprehensive plumbing for a 12-unit residential estate including borehole, water treatment, and distribution systems."
    },
    {
        title: "Luxury Apartment Interior",
        type: "Interior Decoration",
        location: "Aladinma, Owerri",
        duration: "2 months",
        image: "/static/img/apartment.jpeg",  // ✅ Use direct path
        description: "Complete interior design and decoration of a luxury 4-bedroom apartment including furniture selection, lighting design, color consultation, and accessory styling."
    },
    {
        title: "Luxury Villa Landscaping",
        type: "Landscaping & Increte Paving",
        location: "Uratta, Owerri",
        duration: "3 months",
        image: "/static/img/landscaping.jpeg",  // ✅ Use direct path
        description: "Complete compound finishing including increte paving, landscaping, perimeter fencing, gate installation, and garden design for a luxury villa."
    }
];

    // --- RENDER PAST PROJECTS ---
    function renderPastProjects() {
        const grid = document.getElementById('projectsGrid');
        if (!grid) return;

        grid.innerHTML = '';
        pastProjects.forEach(project => {
            const card = document.createElement('div');
            card.className = 'project-card';
            card.innerHTML = `
                <div class="project-image">
                    <img src="${project.image}" alt="${project.title}" loading="lazy">
                    <span class="project-type-badge">${project.type}</span>
                    <span class="project-duration">
                        <i data-lucide="clock"></i>
                        ${project.duration}
                    </span>
                </div>
                <div class="project-info">
                    <h3>${project.title}</h3>
                    <div class="project-location">
                        <i data-lucide="map-pin"></i>
                        <span>${project.location}</span>
                    </div>
                    <p class="project-description">${project.description}</p>
                </div>
            `;
            grid.appendChild(card);
        });
        refreshIcons();
    }

    // --- FILE UPLOAD ---
    const fileUpload = document.getElementById('fileUpload');
    const buildingPlanInput = document.getElementById('buildingPlan');
    const fileUploadContent = document.getElementById('fileUploadContent');
    const filePreview = document.getElementById('filePreview');
    const fileName = document.getElementById('fileName');
    const removeFile = document.getElementById('removeFile');
    let selectedFile = null;

    if (fileUpload && buildingPlanInput) {
        fileUpload.addEventListener('click', (e) => {
            if (e.target !== removeFile && !removeFile.contains(e.target)) {
                buildingPlanInput.click();
            }
        });

        buildingPlanInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // Validate file size (10MB max)
            if (file.size > 10 * 1024 * 1024) {
                showWarning('File must be less than 10MB.', 'File Too Large');
                buildingPlanInput.value = '';
                return;
            }

            // Validate file type
            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(file.type)) {
                showWarning('Only PDF, JPG, and PNG files are allowed.', 'Invalid File Type');
                buildingPlanInput.value = '';
                return;
            }

            selectedFile = file;
            fileName.textContent = file.name;
            fileUploadContent.style.display = 'none';
            filePreview.style.display = 'flex';
        });

        removeFile.addEventListener('click', (e) => {
            e.stopPropagation();
            buildingPlanInput.value = '';
            selectedFile = null;
            fileUploadContent.style.display = 'flex';
            filePreview.style.display = 'none';
        });
    }

    // --- FORM VALIDATION ---
    function validateForm() {
        const form = document.getElementById('contractForm');
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        const errors = [];

        // Clear previous errors
        form.querySelectorAll('.form-group.error').forEach(group => {
            group.classList.remove('error');
            const errorEl = group.querySelector('.field-error');
            if (errorEl) errorEl.remove();
        });

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                isValid = false;
                const formGroup = field.closest('.form-group');
                formGroup.classList.add('error');
                
                const label = formGroup.querySelector('label');
                const fieldName = label ? label.textContent.replace('*', '').trim() : 'This field';
                
                const errorEl = document.createElement('div');
                errorEl.className = 'field-error';
                errorEl.innerHTML = `
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    ${fieldName} is required
                `;
                formGroup.appendChild(errorEl);
                errors.push(fieldName);
            }
        });

        // Email validation
        const email = document.getElementById('clientEmail');
        if (email.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
            isValid = false;
            email.closest('.form-group').classList.add('error');
            errors.push('Valid email');
        }

        // Phone validation (basic Nigerian format)
        const phone = document.getElementById('clientPhone');
        if (phone.value) {
            const cleanPhone = phone.value.replace(/[\s\-\(\)]/g, '');
            if (!/^(\+?234|0)[789][01]\d{8}$/.test(cleanPhone)) {
                isValid = false;
                phone.closest('.form-group').classList.add('error');
                errors.push('Valid phone number');
            }
        }

        if (!isValid) {
            showWarning(`Please complete: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`, 'Missing Information');
            const firstError = form.querySelector('.form-group.error input, .form-group.error select, .form-group.error textarea');
            if (firstError) {
                firstError.focus();
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        return isValid;
    }

    // --- CLEAR ERRORS ON INPUT ---
    document.querySelectorAll('#contractForm input, #contractForm select, #contractForm textarea').forEach(field => {
        field.addEventListener('input', () => {
            const formGroup = field.closest('.form-group');
            if (formGroup.classList.contains('error')) {
                formGroup.classList.remove('error');
                const errorEl = formGroup.querySelector('.field-error');
                if (errorEl) errorEl.remove();
            }
        });
    });

        // --- FORM SUBMISSION ---
    const contractForm = document.getElementById('contractForm');
    const submitBtn = document.getElementById('submitBtn');

    if (contractForm) {
        contractForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            if (!validateForm()) return;

            // Show loading state
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            const btnIcon = submitBtn.querySelector('.btn-icon');
            
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnIcon.style.display = 'none';
            btnLoader.style.display = 'flex';

            try {
                // Create FormData object
                const formData = new FormData();
                
                // Append all form fields
                formData.append('clientName', document.getElementById('clientName').value.trim());
                formData.append('clientEmail', document.getElementById('clientEmail').value.trim());
                formData.append('clientPhone', document.getElementById('clientPhone').value.trim());
                formData.append('clientCountry', document.getElementById('clientCountry').value);
                formData.append('projectType', document.getElementById('projectType').value);
                formData.append('projectTimeline', document.getElementById('projectTimeline').value);
                formData.append('projectLocation', document.getElementById('projectLocation').value.trim());
                formData.append('projectDescription', document.getElementById('projectDescription').value.trim());
                
                // Append file if selected
                if (selectedFile) {
                    formData.append('buildingPlan', selectedFile);
                }

                // Send to backend - DO NOT set Content-Type header!
                // Browser will automatically set it with the correct boundary for multipart/form-data
                const response = await fetch('/api/contract', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Submission failed');
                }

                if (data.success) {
                    showSuccess(
                        'Your project request has been submitted successfully! Our team will contact you within 24 hours to discuss your project in detail.',
                        'Project Request Submitted!'
                    );

                    setTimeout(() => {
                        window.location.href = '/success?type=contract';
                    }, 2500);
                } else {
                    throw new Error(data.message || 'Submission failed');
                }

            } catch (error) {
                console.error('Contract submission error:', error);
                showWarning(error.message || 'An error occurred. Please try again.', 'Submission Failed');
                
                // Reset button state
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnIcon.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        renderPastProjects();
        refreshIcons();
    });
})();