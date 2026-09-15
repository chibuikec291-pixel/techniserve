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

    // --- HELPER: Format Date ---
    function formatDate(isoString) {
        if (!isoString) return '—';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-NG', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // --- STATE ---
    let contractData = null;
    let signatureData = null;
    let signatureMethod = 'draw';

    // --- LOAD CONTRACT FROM BACKEND ---
    async function loadContract() {
        const token = window.CONTRACT_TOKEN;
        
        if (!token) {
            showInvalidState();
            return;
        }

        try {
            // Fetch contract from backend
            const response = await fetch(`/api/contract/${token}`);
            
            if (!response.ok) {
                if (response.status === 404) {
                    showInvalidState();
                } else {
                    throw new Error('Failed to load contract');
                }
                return;
            }
            
            const contract = await response.json();
            
            // Check if already signed
            if (contract.status === 'signed') {
                showAlreadySignedState();
                return;
            }

            contractData = contract;
            populateContractDetails();
            showSigningInterface();
        } catch (error) {
            console.error('Error loading contract:', error);
            showInvalidState();
        }
    }

    function showInvalidState() {
        document.getElementById('signLoading').style.display = 'none';
        document.getElementById('signInvalid').style.display = 'flex';
        refreshIcons();
    }

    function showAlreadySignedState() {
        document.getElementById('signLoading').style.display = 'none';
        document.getElementById('signAlreadySigned').style.display = 'flex';
        refreshIcons();
    }

    function showSigningInterface() {
        document.getElementById('signLoading').style.display = 'none';
        document.getElementById('signWrapper').style.display = 'block';
        
        // Set today's date
        document.getElementById('signDate').textContent = formatDate(new Date().toISOString());
        
        // Initialize signature pad
        initSignaturePad();
        refreshIcons();
    }

    // --- POPULATE CONTRACT DETAILS ---
    function populateContractDetails() {
        document.getElementById('contractRefDisplay').textContent = contractData.token;
        document.getElementById('detailName').textContent = contractData.clientName;
        document.getElementById('detailEmail').textContent = contractData.clientEmail;
        document.getElementById('detailPhone').textContent = contractData.clientPhone;
        document.getElementById('detailCountry').textContent = contractData.clientCountry;
        document.getElementById('detailType').textContent = contractData.projectType;
        document.getElementById('detailLocation').textContent = contractData.projectLocation;
        document.getElementById('detailTimeline').textContent = contractData.projectTimeline;
        document.getElementById('detailDate').textContent = formatDate(contractData.createdAt);
        
        const description = contractData.projectDescription || 'No description provided.';
        document.getElementById('detailDescription').textContent = description;
        
        if (contractData.buildingPlan) {
            document.getElementById('buildingPlanSection').style.display = 'block';
            document.getElementById('detailPlan').textContent = contractData.buildingPlan;
        }
    }

    // --- SIGNATURE PAD ---
    function initSignaturePad() {
        const canvas = document.getElementById('signaturePad');
        const ctx = canvas.getContext('2d');
        const placeholder = document.getElementById('signaturePlaceholder');
        
        // Set canvas size properly
        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
            ctx.strokeStyle = '#1E293B';
            ctx.lineWidth = 2.5;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        let isDrawing = false;
        let lastX = 0;
        let lastY = 0;
        let hasDrawn = false;
        
        function getCoords(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        }
        
        function startDrawing(e) {
            e.preventDefault();
            isDrawing = true;
            const coords = getCoords(e);
            lastX = coords.x;
            lastY = coords.y;
            
            if (!hasDrawn) {
                hasDrawn = true;
                placeholder.classList.add('hidden');
            }
        }
        
        function draw(e) {
            if (!isDrawing) return;
            e.preventDefault();
            
            const coords = getCoords(e);
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(coords.x, coords.y);
            ctx.stroke();
            lastX = coords.x;
            lastY = coords.y;
        }
        
        function stopDrawing() {
            if (isDrawing) {
                isDrawing = false;
                signatureData = canvas.toDataURL('image/png');
            }
        }
        
        // Mouse events
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);
        
        // Touch events
        canvas.addEventListener('touchstart', startDrawing, { passive: false });
        canvas.addEventListener('touchmove', draw, { passive: false });
        canvas.addEventListener('touchend', stopDrawing);
        canvas.addEventListener('touchcancel', stopDrawing);
        
        // Clear button
        document.getElementById('clearSignature').addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            hasDrawn = false;
            signatureData = null;
            placeholder.classList.remove('hidden');
        });
    }

    // --- SIGNATURE METHOD TOGGLE ---
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const method = btn.dataset.method;
            signatureMethod = method;
            
            document.querySelectorAll('.method-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (method === 'draw') {
                document.getElementById('drawArea').style.display = 'block';
                document.getElementById('typeArea').style.display = 'none';
            } else {
                document.getElementById('drawArea').style.display = 'none';
                document.getElementById('typeArea').style.display = 'block';
            }
        });
    });

    // --- TYPED SIGNATURE PREVIEW ---
    const typedInput = document.getElementById('typedSignature');
    const previewContainer = document.getElementById('signaturePreview');
    const previewSignature = document.getElementById('previewSignature');
    
    if (typedInput) {
        typedInput.addEventListener('input', (e) => {
            const value = e.target.value.trim();
            if (value) {
                previewSignature.textContent = value;
                previewContainer.style.display = 'block';
                signatureData = 'typed:' + value;
            } else {
                previewContainer.style.display = 'none';
                signatureData = null;
            }
        });
    }

    // --- FORM SUBMISSION ---
    const signForm = document.getElementById('signForm');
    const submitBtn = document.getElementById('submitContractBtn');
    
    if (signForm) {
        signForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Check all terms are accepted
            const termCheckboxes = document.querySelectorAll('.term-checkbox');
            let allTermsAccepted = true;
            termCheckboxes.forEach(cb => {
                if (!cb.checked) allTermsAccepted = false;
            });
            
            if (!allTermsAccepted) {
                showWarning('Please accept all terms and conditions to proceed.', 'Terms Required');
                return;
            }
            
            // Check declaration
            const declaration = document.getElementById('declarationCheck');
            if (!declaration.checked) {
                showWarning('Please confirm the declaration to proceed.', 'Declaration Required');
                return;
            }
            
            // Check signature
            if (!signatureData) {
                showWarning('Please provide your signature to complete the contract.', 'Signature Required');
                return;
            }
            
            // Show loading
            const btnText = submitBtn.querySelector('.btn-text');
            const btnLoader = submitBtn.querySelector('.btn-loader');
            const btnIcon = submitBtn.querySelector('.btn-icon');
            
            submitBtn.disabled = true;
            btnText.style.display = 'none';
            btnIcon.style.display = 'none';
            btnLoader.style.display = 'flex';
            
            try {
                // Send signature to backend
                const response = await fetch(`/api/contract/${contractData.token}/sign`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        signature: signatureData,
                        signatureMethod: signatureMethod
                    })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    // Show success state
                    document.getElementById('signWrapper').style.display = 'none';
                    document.getElementById('signSuccess').style.display = 'flex';
                    document.getElementById('successRef').textContent = contractData.token;
                    document.getElementById('successDate').textContent = formatDate(new Date().toISOString());
                    
                    refreshIcons();
                    
                    showSuccess('Contract signed successfully! A confirmation has been recorded.', 'Contract Signed!');
                    
                    // Scroll to top
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    throw new Error(data.message || 'Signing failed');
                }
            } catch (error) {
                console.error('Signing error:', error);
                showWarning('An error occurred. Please try again.', 'Signing Failed');
                
                submitBtn.disabled = false;
                btnText.style.display = 'inline';
                btnIcon.style.display = 'inline';
                btnLoader.style.display = 'none';
            }
        });
    }

        // --- DOWNLOAD CONTRACT ---
    const downloadBtn = document.getElementById('downloadContractBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            if (!contractData) {
                showWarning('Contract data not available.', 'Error');
                return;
            }

            // Create a printable version of the contract
            const contractHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>TECHNISERVE Contract - ${contractData.token}</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
                        .header { text-align: center; border-bottom: 3px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
                        .header h1 { color: #2563EB; margin: 0; }
                        .header p { color: #64748B; margin: 10px 0 0; }
                        .section { margin-bottom: 30px; }
                        .section h2 { color: #1E293B; border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
                        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
                        .detail-label { color: #64748B; font-weight: 500; }
                        .detail-value { color: #1E293B; font-weight: 600; }
                        .signature-section { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px solid #E2E8F0; }
                        .signature-image { max-width: 300px; margin: 20px auto; }
                        .footer { text-align: center; margin-top: 50px; padding-top: 20px; border-top: 1px solid #E2E8F0; color: #64748B; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>TECHNISERVE CONTRACTS</h1>
                        <p>Project Agreement</p>
                    </div>
                    
                    <div class="section">
                        <h2>Contract Reference</h2>
                        <div class="detail-row">
                            <span class="detail-label">Reference Number</span>
                            <span class="detail-value">${contractData.token}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Signed On</span>
                            <span class="detail-value">${new Date().toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Client Information</h2>
                        <div class="detail-row">
                            <span class="detail-label">Full Name</span>
                            <span class="detail-value">${contractData.clientName}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Email</span>
                            <span class="detail-value">${contractData.clientEmail}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Phone</span>
                            <span class="detail-value">${contractData.clientPhone}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Country</span>
                            <span class="detail-value">${contractData.clientCountry}</span>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>Project Details</h2>
                        <div class="detail-row">
                            <span class="detail-label">Project Type</span>
                            <span class="detail-value">${contractData.projectType}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Location</span>
                            <span class="detail-value">${contractData.projectLocation}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Timeline</span>
                            <span class="detail-value">${contractData.projectTimeline}</span>
                        </div>
                        ${contractData.projectDescription ? `
                            <div style="margin-top: 15px;">
                                <span class="detail-label">Description:</span>
                                <p style="margin-top: 8px; line-height: 1.6;">${contractData.projectDescription}</p>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="signature-section">
                        <h2>Client Signature</h2>
                        ${signatureData && signatureData.startsWith('data:image') ? `
                            <img src="${signatureData}" alt="Signature" class="signature-image">
                        ` : signatureData && signatureData.startsWith('typed:') ? `
                            <p style="font-family: 'Brush Script MT', cursive; font-size: 48px; color: #2563EB; margin: 20px 0;">
                                ${signatureData.replace('typed:', '')}
                            </p>
                        ` : '<p style="color: #64748B;">No signature provided</p>'}
                        <p style="margin-top: 10px; color: #64748B; font-size: 14px;">
                            Signed by ${contractData.clientName} on ${new Date().toLocaleDateString('en-NG')}
                        </p>
                    </div>
                    
                    <div class="footer">
                        <p>This is a legally binding digital contract.</p>
                        <p>TECHNISERVE Contracts | support@techniserve.com.ng | +234 800 TECHNISERV</p>
                    </div>
                </body>
                </html>
            `;
            
            // Create download link
            const blob = new Blob([contractHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `TECHNISERVE_Contract_${contractData.token}.html`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showSuccess('Contract downloaded successfully!', 'Download Complete');
        });
    }

    // --- PRINT CONTRACT ---
    const printBtn = document.getElementById('printContractBtn');
    if (printBtn) {
        printBtn.addEventListener('click', () => {
            if (!contractData) {
                showWarning('Contract data not available.', 'Error');
                return;
            }

            // Create print-friendly content
            const printContent = `
                <html>
                <head>
                    <title>TECHNISERVE Contract - ${contractData.token}</title>
                    <style>
                        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
                        .header { text-align: center; border-bottom: 3px solid #2563EB; padding-bottom: 20px; margin-bottom: 30px; }
                        .header h1 { color: #2563EB; }
                        .section { margin-bottom: 30px; }
                        .section h2 { border-bottom: 2px solid #E2E8F0; padding-bottom: 10px; }
                        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #F1F5F9; }
                        .signature-section { text-align: center; margin-top: 50px; padding-top: 30px; border-top: 2px solid #E2E8F0; }
                        .signature-image { max-width: 300px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>TECHNISERVE CONTRACTS</h1>
                        <p>Contract Reference: ${contractData.token}</p>
                    </div>
                    <div class="section">
                        <h2>Client: ${contractData.clientName}</h2>
                        <div class="detail-row"><span>Project:</span><span>${contractData.projectType}</span></div>
                        <div class="detail-row"><span>Location:</span><span>${contractData.projectLocation}</span></div>
                        <div class="detail-row"><span>Timeline:</span><span>${contractData.projectTimeline}</span></div>
                    </div>
                    <div class="signature-section">
                        <h2>Signature</h2>
                        ${signatureData && signatureData.startsWith('data:image') ? `<img src="${signatureData}" class="signature-image">` : ''}
                        ${signatureData && signatureData.startsWith('typed:') ? `<p style="font-family: cursive; font-size: 48px; color: #2563EB;">${signatureData.replace('typed:', '')}</p>` : ''}
                    </div>
                </body>
                </html>
            `;

            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
            }, 500);
        });
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        // Load contract from backend
        loadContract();
    });
})();
    