(function() {
    'use strict';

    // --- AUTH CHECK ---
    // Now using Flask-Login session, no localStorage check needed
    // If not authenticated, the API calls will return 403 and redirect

    // --- HELPERS ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    function formatDate(isoString) {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function formatDateTime(isoString) {
        if (!isoString) return '—';
        return new Date(isoString).toLocaleDateString('en-NG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function getTimeAgo(dateString) {
        if (!dateString) return '—';
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
        if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
        return Math.floor(seconds / 86400) + 'd ago';
    }

    function getStatusClass(status) {
        const map = {
            'pending': 'pending', 'approved': 'approved', 'rejected': 'rejected',
            'in-discussion': 'in-discussion', 'quote-sent': 'quote-sent', 
            'signed': 'signed', 'completed': 'completed', 'cancelled': 'cancelled'
        };
        return map[status] || 'pending';
    }

    function formatStatus(status) {
        if (!status) return 'Pending';
        return status.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    }

    // --- DATA FETCHERS (From Database via API) ---
    async function fetchTechnicians() {
        try {
            const response = await fetch('/api/admin/technicians');
            if (response.status === 403) {
                showWarning('Session expired. Please login again.', 'Unauthorized');
                setTimeout(() => window.location.href = '/admin/login', 1500);
                return [];
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching technicians:', error);
            return [];
        }
    }

    async function fetchContracts() {
        try {
            const response = await fetch('/api/admin/contracts');
            if (response.status === 403) return [];
            return await response.json();
        } catch (error) {
            console.error('Error fetching contracts:', error);
            return [];
        }
    }

    async function fetchMessages() {
        try {
            const response = await fetch('/api/admin/messages');
            if (response.status === 403) return [];
            return await response.json();
        } catch (error) {
            console.error('Error fetching messages:', error);
            return [];
        }
    }

    // --- UI STATE ---
    let currentTab = 'overview';
    let techFilter = 'all';
    let contractFilter = 'all';

    // --- INITIALIZATION ---
    function init() {
        setupNavigation();
        setupModals();
        renderCurrentTab();
        refreshIcons();
    }

    function setupNavigation() {
        document.querySelectorAll('.admin-nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(item.dataset.tab);
                closeMobileSidebar();
            });
        });

        document.querySelectorAll('.admin-mobile-tab').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                switchTab(item.dataset.tab);
            });
        });

        const menuBtn = document.getElementById('adminMenuBtn');
        const overlay = document.getElementById('adminSidebarOverlay');
        if (menuBtn) {
            menuBtn.addEventListener('click', () => {
                document.getElementById('adminSidebar').classList.add('mobile-open');
                overlay.classList.add('active');
            });
        }
        if (overlay) {
            overlay.addEventListener('click', closeMobileSidebar);
        }

        document.getElementById('adminLogoutBtn').addEventListener('click', () => {
            fetch('/admin/logout', { method: 'GET' })
                .then(() => {
                    showInfo('Logged out successfully.', 'Goodbye');
                    setTimeout(() => window.location.href = '/', 1200);
                });
        });
    }

    function closeMobileSidebar() {
        document.getElementById('adminSidebar').classList.remove('mobile-open');
        document.getElementById('adminSidebarOverlay').classList.remove('active');
    }

    function switchTab(tab) {
        currentTab = tab;
        document.querySelectorAll('.admin-nav-item, .admin-mobile-tab').forEach(n => {
            n.classList.toggle('active', n.dataset.tab === tab);
        });
        document.querySelectorAll('.admin-tab-content').forEach(c => {
            c.classList.toggle('active', c.dataset.tab === tab);
        });
        renderCurrentTab();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async function renderCurrentTab() {
        if (currentTab === 'overview') await renderOverview();
        if (currentTab === 'technicians') await renderTechnicians();
        if (currentTab === 'contracts') await renderContracts();
        if (currentTab === 'messages') await renderMessages();
    }

    // --- OVERVIEW TAB ---
    async function renderOverview() {
        const [techs, contracts, messages] = await Promise.all([
            fetchTechnicians(), fetchContracts(), fetchMessages()
        ]);

        document.getElementById('statTotalTechs').textContent = techs.length;
        document.getElementById('statPendingTechs').textContent = techs.filter(t => t.status !== 'approved').length;
        document.getElementById('statActiveContracts').textContent = contracts.filter(c => c.status !== 'completed' && c.status !== 'cancelled').length;
        document.getElementById('statMessages').textContent = messages.filter(m => !m.read).length;

        const setBadge = (id, count) => {
            const el = document.getElementById(id);
            if (el) { el.textContent = count; el.style.display = count > 0 ? 'inline-block' : 'none'; }
        };
        setBadge('techBadge', techs.filter(t => t.status !== 'approved').length);
        setBadge('contractBadge', contracts.filter(c => c.status === 'pending').length);
        setBadge('messageBadge', messages.filter(m => !m.read).length);

        
        // Activity Feed - Get MOST RECENT items (not oldest!)
        const activities = [];

        // Get the 5 most recent technicians (API returns newest first, so slice from beginning)
        techs.slice(0, 5).forEach(t => activities.push({ 
            type: 'tech', 
            title: `New Technician: ${t.fullName}`, 
            desc: `${t.skill} • ${t.location}`, 
            time: t.registeredAt, 
            color: 'blue' 
        }));

        // Get the 5 most recent contracts
        contracts.slice(0, 5).forEach(c => activities.push({ 
            type: 'contract', 
            title: `New Contract: ${c.projectType}`, 
            desc: `${c.clientName} • ${c.projectLocation}`, 
            time: c.createdAt, 
            color: 'green' 
        }));

        // Get the 5 most recent messages
        messages.slice(0, 5).forEach(m => activities.push({ 
            type: 'message', 
            title: `New Message: ${m.name}`, 
            desc: m.subject, 
            time: m.createdAt, 
            color: 'purple' 
        }));

        // Sort all activities by time (newest first)
        activities.sort((a, b) => new Date(b.time) - new Date(a.time));

        const list = document.getElementById('activityList');
        if (activities.length === 0) {
            list.innerHTML = `<div class="admin-empty"><i data-lucide="inbox"></i><h3>No Activity Yet</h3><p>Platform activity will appear here.</p></div>`;
        } else {
            list.innerHTML = activities.slice(0, 8).map(a => `
                <div class="activity-item">
                    <div class="activity-icon ${a.color}"><i data-lucide="${a.type === 'tech' ? 'user' : a.type === 'contract' ? 'file-signature' : 'mail'}"></i></div>
                    <div class="activity-content"><strong>${a.title}</strong><p>${a.desc}</p></div>
                    <span class="activity-time">${getTimeAgo(a.time)}</span>
                </div>
            `).join('');
        }
        refreshIcons();
    }

    // --- TECHNICIANS TAB ---
    async function renderTechnicians() {
        const filterContainer = document.querySelector('[data-tab="technicians"] .admin-filters');
        if (filterContainer && filterContainer.children.length === 0) {
            filterContainer.innerHTML = `
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="pending">Pending</button>
                <button class="filter-btn" data-filter="approved">Approved</button>
                <button class="filter-btn" data-filter="rejected">Rejected</button>
            `;
            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    techFilter = btn.dataset.filter;
                    renderTechnicians();
                });
            });
        } else if (filterContainer) {
            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === techFilter);
            });
        }

        const techs = await fetchTechnicians();
        let filtered = techs;
        if (techFilter !== 'all') filtered = techs.filter(t => t.status === techFilter);

        const list = document.getElementById('techniciansList');
        if (filtered.length === 0) {
            list.innerHTML = `<div class="admin-empty"><i data-lucide="users"></i><h3>No Technicians Found</h3><p>Technicians will appear here after registration.</p></div>`;
        } else {
            list.innerHTML = filtered.map(t => `
                <div class="admin-list-item" data-id="${t.id}">
                    <div class="list-item-header">
                        <div>
                            <div class="list-item-title">${t.fullName} ${!t.isActive ? '<span style="color:#EF4444;font-size:0.75rem;">(Inactive)</span>' : ''}</div>
                            <div class="list-item-subtitle">${t.specialty} • ${t.skill}</div>
                        </div>
                        <span class="status-badge ${getStatusClass(t.status)}">${formatStatus(t.status)}</span>
                    </div>
                    <div class="list-item-meta">
                        <span><i data-lucide="phone"></i> ${t.phone}</span>
                        <span><i data-lucide="map-pin"></i> ${t.location}</span>
                        <span><i data-lucide="calendar"></i> ${formatDate(t.registeredAt)}</span>
                    </div>
                </div>
            `).join('');
        }

        list.querySelectorAll('.admin-list-item').forEach(item => {
            item.addEventListener('click', () => openTechModal(item.dataset.id, techs));
        });
        refreshIcons();
    }

    async function openTechModal(id, techs) {
        const tech = techs.find(t => t.id == id);
        if (!tech) return;

        const body = document.getElementById('techModalBody');
        body.innerHTML = `
            <div class="modal-header">
                <div class="modal-icon blue"><i data-lucide="user"></i></div>
                <h2>${tech.fullName}</h2>
                <p>${tech.specialty} • ${tech.skill}</p>
            </div>
            <div class="detail-section">
                <h3>Personal Information</h3>
                <div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${tech.fullName}</span></div>
                <div class="detail-row"><span class="detail-label">NIN</span><span class="detail-value">${tech.nin || '—'}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${tech.phone}</span></div>
                <div class="detail-row"><span class="detail-label">WhatsApp</span><span class="detail-value">${tech.whatsapp}</span></div>
            </div>
            <div class="detail-section">
                <h3>Professional Information</h3>
                <div class="detail-row"><span class="detail-label">Main Skill</span><span class="detail-value">${tech.skill}</span></div>
                <div class="detail-row"><span class="detail-label">Specialty</span><span class="detail-value">${tech.specialty}</span></div>
                <div class="detail-row"><span class="detail-label">Experience</span><span class="detail-value">${tech.experience} years</span></div>
                <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${tech.location}</span></div>
                <div class="detail-row"><span class="detail-label">Registered</span><span class="detail-value">${formatDateTime(tech.registeredAt)}</span></div>
                <div class="detail-row"><span class="detail-label">Account Status</span><span class="detail-value"><span class="status-badge ${tech.isActive ? 'approved' : 'rejected'}">${tech.isActive ? 'Active' : 'Deactivated'}</span></span></div>
            </div>
            <div class="modal-actions">
                ${tech.status !== 'approved' ? `<button class="modal-btn success" id="btnApprove"><i data-lucide="check"></i> Approve</button>` : ''}
                ${tech.status !== 'rejected' ? `<button class="modal-btn danger" id="btnReject"><i data-lucide="x"></i> Reject</button>` : ''}
                <button class="modal-btn warning" id="btnToggleActive"><i data-lucide="${tech.isActive ? 'user-x' : 'user-check'}"></i> ${tech.isActive ? 'Deactivate' : 'Activate'}</button>
                <a href="https://wa.me/${tech.whatsapp.replace(/^0/, '234')}" target="_blank" class="modal-btn primary" style="text-decoration:none;background:#25D366;"><i data-lucide="message-circle"></i> WhatsApp</a>
            </div>
        `;

        document.getElementById('techModal').style.display = 'flex';
        refreshIcons();

        const btnApprove = document.getElementById('btnApprove');
        if (btnApprove) {
            btnApprove.addEventListener('click', async () => {
                const response = await fetch(`/api/admin/technicians/${id}/approve`, { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    showSuccess(`${tech.fullName} approved!`, 'Success');
                    document.getElementById('techModal').style.display = 'none';
                    renderTechnicians();
                    renderOverview();
                }
            });
        }

        const btnReject = document.getElementById('btnReject');
        if (btnReject) {
            btnReject.addEventListener('click', async () => {
                const response = await fetch(`/api/admin/technicians/${id}/reject`, { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    showWarning(`${tech.fullName} rejected.`, 'Rejected');
                    document.getElementById('techModal').style.display = 'none';
                    renderTechnicians();
                    renderOverview();
                }
            });
        }

        const btnToggle = document.getElementById('btnToggleActive');
        if (btnToggle) {
            btnToggle.addEventListener('click', async () => {
                const response = await fetch(`/api/admin/technicians/${id}/toggle-active`, { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                    showInfo(`${tech.fullName} ${data.isActive ? 'activated' : 'deactivated'}.`, 'Status Updated');
                    document.getElementById('techModal').style.display = 'none';
                    renderTechnicians();
                    renderOverview();
                }
            });
        }
    }

    // --- CONTRACTS TAB ---
    async function renderContracts() {
        const filterContainer = document.querySelector('[data-tab="contracts"] .admin-filters');
        if (filterContainer && filterContainer.children.length === 0) {
            filterContainer.innerHTML = `
                <button class="filter-btn active" data-filter="all">All</button>
                <button class="filter-btn" data-filter="pending">Pending</button>
                <button class="filter-btn" data-filter="in-discussion">In Discussion</button>
                <button class="filter-btn" data-filter="quote-sent">Quote Sent</button>
                <button class="filter-btn" data-filter="signed">Signed</button>
                <button class="filter-btn" data-filter="completed">Completed</button>
            `;
            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    filterContainer.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    contractFilter = btn.dataset.filter;
                    renderContracts();
                });
            });
        } else if (filterContainer) {
            filterContainer.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === contractFilter);
            });
        }

        const contracts = await fetchContracts();
        let filtered = contracts;
        if (contractFilter !== 'all') filtered = contracts.filter(c => c.status === contractFilter);

        const list = document.getElementById('contractsList');
        if (filtered.length === 0) {
            list.innerHTML = `<div class="admin-empty"><i data-lucide="file-signature"></i><h3>No Contracts Found</h3><p>Contract bookings will appear here.</p></div>`;
        } else {
            filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            list.innerHTML = filtered.map(c => `
                <div class="admin-list-item" data-id="${c.id}">
                    <div class="list-item-header">
                        <div>
                            <div class="list-item-title">${c.projectType}</div>
                            <div class="list-item-subtitle">${c.clientName} • ${c.clientCountry}</div>
                        </div>
                        <span class="status-badge ${getStatusClass(c.status)}">${formatStatus(c.status)}</span>
                    </div>
                    <div class="list-item-meta">
                        <span><i data-lucide="map-pin"></i> ${c.projectLocation}</span>
                        <span><i data-lucide="clock"></i> ${c.projectTimeline}</span>
                        <span><i data-lucide="calendar"></i> ${formatDate(c.createdAt)}</span>
                    </div>
                </div>
            `).join('');
        }

        list.querySelectorAll('.admin-list-item').forEach(item => {
            item.addEventListener('click', () => openContractModal(item.dataset.id, contracts));
        });
        refreshIcons();
    }

    async function openContractModal(id, contracts) {
        const contract = contracts.find(c => c.id == id);
        if (!contract) return;

        const body = document.getElementById('contractModalBody');
        const signingUrl = `${window.location.origin}/contract/sign?token=${contract.token}`;

        body.innerHTML = `
            <div class="modal-header">
                <div class="modal-icon green"><i data-lucide="file-signature"></i></div>
                <h2>${contract.projectType}</h2>
                <p>Ref: <strong style="font-family:monospace;">${contract.token}</strong></p>
            </div>
            <div class="detail-section">
                <h3>Client Information</h3>
                <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${contract.clientName}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${contract.clientEmail}</span></div>
                <div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${contract.clientPhone}</span></div>
                <div class="detail-row"><span class="detail-label">Country</span><span class="detail-value">${contract.clientCountry}</span></div>
            </div>
            <div class="detail-section">
                <h3>Project Details</h3>
                <div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${contract.projectLocation}</span></div>
                <div class="detail-row"><span class="detail-label">Timeline</span><span class="detail-value">${contract.projectTimeline}</span></div>
                <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${formatDateTime(contract.createdAt)}</span></div>
             ${contract.buildingPlan ? `
                    <div class="detail-row">
                        <span class="detail-label">Building Plan</span>
                        <span class="detail-value">
                            <a href="${contract.buildingPlan}" target="_blank" class="file-link">
                                <i data-lucide="file-text"></i>
                                View/Download File
                            </a>
                        </span>
                    </div>
                ` : ''}
            ${contract.projectDescription ? `<div class="detail-section"><h3>Description</h3><p class="detail-description">${contract.projectDescription}</p></div>` : ''}
            <div class="detail-section">
                <h3>Update Status</h3>
                <select class="status-select" id="statusSelect">
                    <option value="pending" ${contract.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="in-discussion" ${contract.status === 'in-discussion' ? 'selected' : ''}>In Discussion</option>
                    <option value="quote-sent" ${contract.status === 'quote-sent' ? 'selected' : ''}>Quote Sent</option>
                    <option value="signed" ${contract.status === 'signed' ? 'selected' : ''}>Signed</option>
                    <option value="completed" ${contract.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="cancelled" ${contract.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </div>
            <div class="modal-actions">
                <button class="modal-btn primary" id="btnGenerateLink"><i data-lucide="link"></i> Generate Signing Link</button>
                <a href="https://wa.me/${contract.clientPhone.replace(/^0/, '234').replace(/^\+/, '')}" target="_blank" class="modal-btn success" style="text-decoration:none;background:#25D366;"><i data-lucide="message-circle"></i> WhatsApp Client</a>
            </div>
        `;

        document.getElementById('contractModal').style.display = 'flex';
        refreshIcons();

        document.getElementById('statusSelect').addEventListener('change', async (e) => {
            const response = await fetch(`/api/admin/contracts/${id}/update-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: e.target.value })
            });
            const data = await response.json();
            if (data.success) {
                showSuccess(`Status updated to "${formatStatus(e.target.value)}"`, 'Updated');
                renderContracts();
                renderOverview();
            }
        });

        document.getElementById('btnGenerateLink').addEventListener('click', () => {
            openSigningLinkModal(signingUrl, contract);
        });
    }

    function openSigningLinkModal(url, contract) {
        const modal = document.getElementById('signingLinkModal');
        document.getElementById('signingLinkInput').value = url;
        
        const whatsappMsg = encodeURIComponent(`Hello ${contract.clientName},\n\nThank you for choosing TECHNISERVE Contracts for your ${contract.projectType} project.\n\nPlease review and sign your contract using the link below:\n${url}\n\nBest regards,\nTECHNISERVE Contracts Team`);
        const whatsappNumber = contract.clientPhone.replace(/^0/, '234').replace(/^\+/, '');
        document.getElementById('whatsappShareBtn').href = `https://wa.me/${whatsappNumber}?text=${whatsappMsg}`;
        
        const emailSubject = encodeURIComponent(`TECHNISERVE Contracts - Sign Your ${contract.projectType} Contract`);
        const emailBody = encodeURIComponent(`Hello ${contract.clientName},\n\nPlease sign your contract using this link:\n${url}\n\nBest regards,\nTECHNISERVE Contracts Team`);
        document.getElementById('emailShareBtn').href = `mailto:${contract.clientEmail}?subject=${emailSubject}&body=${emailBody}`;

        modal.style.display = 'flex';
        refreshIcons();

        document.getElementById('copyLinkBtn').addEventListener('click', () => {
            const input = document.getElementById('signingLinkInput');
            input.select();
            document.execCommand('copy');
            showSuccess('Signing link copied to clipboard!', 'Copied');
        });
    }

    // --- MESSAGES TAB ---
    async function renderMessages() {
        const messages = await fetchMessages();
        const list = document.getElementById('messagesList');

        if (messages.length === 0) {
            list.innerHTML = `<div class="admin-empty"><i data-lucide="mail"></i><h3>No Messages Yet</h3><p>Contact form messages will appear here.</p></div>`;
        } else {
            messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            list.innerHTML = messages.map(m => `
                <div class="admin-list-item" data-id="${m.id}">
                    <div class="list-item-header">
                        <div>
                            <div class="list-item-title">${m.name} ${!m.read ? '<span style="color:var(--primary);">●</span>' : ''}</div>
                            <div class="list-item-subtitle">${m.subject}</div>
                        </div>
                        <span class="status-badge ${m.read ? 'approved' : 'pending'}">${m.read ? 'Read' : 'New'}</span>
                    </div>
                    <div class="list-item-meta">
                        <span><i data-lucide="mail"></i> ${m.email}</span>
                        ${m.phone ? `<span><i data-lucide="phone"></i> ${m.phone}</span>` : ''}
                        <span><i data-lucide="calendar"></i> ${formatDate(m.createdAt)}</span>
                    </div>
                </div>
            `).join('');
        }

        list.querySelectorAll('.admin-list-item').forEach(item => {
            item.addEventListener('click', () => openMessageModal(item.dataset.id));
        });
        refreshIcons();
    }

    async function openMessageModal(id) {
        // Mark as read
        await fetch(`/api/admin/messages/${id}/read`, { method: 'POST' });

        const messages = await fetchMessages();
        const message = messages.find(m => m.id == id);
        if (!message) return;

        const body = document.getElementById('messageModalBody');
        body.innerHTML = `
            <div class="modal-header">
                <div class="modal-icon purple"><i data-lucide="mail"></i></div>
                <h2>${message.subject}</h2>
                <p>From ${message.name}</p>
            </div>
            <div class="detail-section">
                <h3>Sender Information</h3>
                <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${message.name}</span></div>
                <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${message.email}</span></div>
                ${message.phone ? `<div class="detail-row"><span class="detail-label">Phone</span><span class="detail-value">${message.phone}</span></div>` : ''}
                <div class="detail-row"><span class="detail-label">Received</span><span class="detail-value">${formatDateTime(message.createdAt)}</span></div>
            </div>
            <div class="detail-section">
                <h3>Message</h3>
                <p class="detail-description">${message.message}</p>
            </div>
            <div class="modal-actions">
                <a href="mailto:${message.email}?subject=Re: ${encodeURIComponent(message.subject)}" class="modal-btn primary" style="text-decoration:none;"><i data-lucide="mail"></i> Reply via Email</a>
                ${message.phone ? `<a href="https://wa.me/${message.phone.replace(/^0/, '234').replace(/^\+/, '')}" target="_blank" class="modal-btn success" style="text-decoration:none;background:#25D366;"><i data-lucide="message-circle"></i> WhatsApp</a>` : ''}
            </div>
        `;

        document.getElementById('messageModal').style.display = 'flex';
        refreshIcons();
        renderMessages();
        renderOverview();
    }

    // --- MODAL HANDLING ---
    function setupModals() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                document.getElementById(modalId).style.display = 'none';
            });
        });

        document.querySelectorAll('.admin-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        });
    }

    // --- START ---
    document.addEventListener('DOMContentLoaded', init);
})();