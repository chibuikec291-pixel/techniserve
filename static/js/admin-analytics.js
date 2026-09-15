(function() {
    'use strict';

    console.log('Admin Analytics JS loaded.');

    // --- HELPER: Safe Lucide Icons ---
    function refreshIcons() {
        if (typeof safeCreateIcons === 'function') safeCreateIcons();
        else if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    }

    // --- HELPER: Format Date ---
    function formatDate(isoString) {
        if (!isoString) return '—';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-NG', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }

    // --- FETCH OVERVIEW STATS ---
    async function loadOverviewStats() {
        try {
            const response = await fetch('/api/admin/analytics/overview');
            if (!response.ok) throw new Error('Failed to fetch stats');
            
            const data = await response.json();
            renderStats(data);
        } catch (error) {
            console.error('Stats error:', error);
        }
    }

    // --- RENDER STATS ---
    function renderStats(data) {
        const statsGrid = document.getElementById('statsGrid');
        if (!statsGrid) return;
        
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon blue"><i data-lucide="users"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${data.technicians.total}</div>
                    <div class="stat-label">Total Technicians</div>
                    <div class="stat-detail">${data.technicians.approved} approved • ${data.technicians.pending} pending</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><i data-lucide="briefcase"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${data.jobs.total}</div>
                    <div class="stat-label">Total Jobs</div>
                    <div class="stat-detail">${data.jobs.completed} completed • ${data.jobs.active} active</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon orange"><i data-lucide="file-text"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${data.contracts.total}</div>
                    <div class="stat-label">Total Contracts</div>
                    <div class="stat-detail">${data.contracts.signed} signed • ${data.contracts.pending} pending</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon purple"><i data-lucide="star"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${data.reviews.avgRating}</div>
                    <div class="stat-label">Average Rating</div>
                    <div class="stat-detail">${data.reviews.total} total reviews</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><i data-lucide="message-square"></i></div>
                <div class="stat-content">
                    <div class="stat-value">${data.messages.unread}</div>
                    <div class="stat-label">Unread Messages</div>
                    <div class="stat-detail">${data.messages.total} total messages</div>
                </div>
            </div>
        `;
        refreshIcons();
    }

    // --- LOAD CHARTS ---
    async function loadCharts() {
        try {
            const growthResponse = await fetch('/api/admin/analytics/technician-growth');
            renderGrowthChart(await growthResponse.json());
            
            const jobResponse = await fetch('/api/admin/analytics/job-completion');
            renderJobChart(await jobResponse.json());
            
            const skillsResponse = await fetch('/api/admin/analytics/popular-skills');
            renderSkillsChart(await skillsResponse.json());
        } catch (error) {
            console.error('Charts error:', error);
        }
    }

    function renderGrowthChart(data) {
        const ctx = document.getElementById('growthChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.month),
                datasets: [{
                    label: 'New Technicians',
                    data: data.map(d => d.count),
                    borderColor: '#2563EB',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    function renderJobChart(data) {
        const ctx = document.getElementById('jobChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['New', 'Active', 'Completed'],
                datasets: [{
                    data: [data.new, data.active, data.completed],
                    backgroundColor: ['#3B82F6', '#8B5CF6', '#10B981'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function renderSkillsChart(data) {
        const ctx = document.getElementById('skillsChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.skill),
                datasets: [{
                    label: 'Technicians',
                    data: data.map(d => d.count),
                    backgroundColor: '#2563EB',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // --- LOAD RECENT ACTIVITY ---
    async function loadRecentActivity() {
        try {
            const response = await fetch('/api/admin/analytics/recent-activity');
            if (!response.ok) throw new Error('Failed to fetch activity');
            renderRecentActivity(await response.json());
        } catch (error) {
            console.error('Activity error:', error);
        }
    }

    function renderRecentActivity(data) {
        const techList = document.getElementById('recentTechnicians');
        if (techList && data.technicians) {
            techList.innerHTML = data.technicians.map(t => `
                <div class="activity-item">
                    <div class="activity-icon"><i data-lucide="user"></i></div>
                    <div class="activity-content">
                        <h3 class="activity-title">${t.name}</h3>
                        <p class="activity-meta">${t.skill} • ${formatDate(t.registeredAt)}</p>
                    </div>
                    <span class="activity-badge ${t.status}">${t.status}</span>
                </div>
            `).join('');
        }
        
        const jobList = document.getElementById('recentJobs');
        if (jobList && data.jobs) {
            jobList.innerHTML = data.jobs.map(j => `
                <div class="activity-item">
                    <div class="activity-icon"><i data-lucide="briefcase"></i></div>
                    <div class="activity-content">
                        <h3 class="activity-title">${j.title}</h3>
                        <p class="activity-meta">${j.client} • ${formatDate(j.createdAt)}</p>
                    </div>
                    <span class="activity-badge ${j.status}">${j.status}</span>
                </div>
            `).join('');
        }
        
        const contractList = document.getElementById('recentContracts');
        if (contractList && data.contracts) {
            contractList.innerHTML = data.contracts.map(c => `
                <div class="activity-item">
                    <div class="activity-icon"><i data-lucide="file-text"></i></div>
                    <div class="activity-content">
                        <h3 class="activity-title">${c.token}</h3>
                        <p class="activity-meta">${c.client} • ${formatDate(c.createdAt)}</p>
                    </div>
                    <span class="activity-badge ${c.status}">${c.status}</span>
                </div>
            `).join('');
        }
        
        const reviewList = document.getElementById('recentReviews');
        if (reviewList && data.reviews) {
            reviewList.innerHTML = data.reviews.map(r => `
                <div class="activity-item">
                    <div class="activity-icon"><i data-lucide="star"></i></div>
                    <div class="activity-content">
                        <h3 class="activity-title">${r.clientName}</h3>
                        <p class="activity-meta">${formatDate(r.createdAt)}</p>
                    </div>
                    <div class="activity-stars">
                        ${'<svg viewBox="0 0 24 24" fill="#FBBF24" style="width:14px;height:14px;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(r.rating)}
                    </div>
                </div>
            `).join('');
        }
        refreshIcons();
    }

    // ==========================================
    // --- BOOKING CHARTS ---
    // ==========================================

    async function loadBookingCharts() {
        try {
            const trendsResponse = await fetch('/api/admin/analytics/booking-trends');
            renderBookingTrendsChart(await trendsResponse.json());
            
            const sourceResponse = await fetch('/api/admin/analytics/booking-source');
            renderBookingSourceChart(await sourceResponse.json());
            
            const performanceResponse = await fetch('/api/admin/analytics/technician-performance');
            renderTopTechnicians(await performanceResponse.json());
        } catch (error) {
            console.error('Booking charts error:', error);
        }
    }

    function renderBookingTrendsChart(data) {
        const ctx = document.getElementById('bookingTrendsChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.month),
                datasets: [{
                    label: 'Bookings',
                    data: data.map(d => d.count),
                    backgroundColor: '#10B981',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }
            }
        });
    }

    // ✅ UPDATED: Now handles all 4 contact methods
    function renderBookingSourceChart(data) {
        const ctx = document.getElementById('bookingSourceChart');
        if (!ctx) return;
        new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Job Board', 'Direct Booking', 'Direct Call', 'WhatsApp'],
                datasets: [{
                    data: [
                        data.jobBoard || 0, 
                        data.directBooking || 0, 
                        data.directCall || 0, 
                        data.directWhatsapp || 0
                    ],
                    backgroundColor: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'], // Blue, Orange, Green, Purple
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    function renderTopTechnicians(data) {
        const container = document.getElementById('topTechniciansList');
        if (!container) return;
        
        const top5 = data.slice(0, 5);
        if (top5.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No bookings yet</p>';
            return;
        }
        
        container.innerHTML = top5.map((tech, index) => {
            const profilePic = tech.profilePic 
                ? `<img src="${tech.profilePic}" alt="${tech.name}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">`
                : `<div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%);display:flex;align-items:center;justify-content:center;"><i data-lucide="user" style="width:20px;height:20px;color:#94a3b8;"></i></div>`;
            
            return `
                <div class="top-tech-item">
                    <div class="rank-badge">#${index + 1}</div>
                    ${profilePic}
                    <div class="top-tech-info">
                        <h4>${tech.name}</h4>
                        <p>${tech.skill} • ${tech.totalBookings} total bookings</p>
                    </div>
                    <div class="top-tech-stats">
                        <span class="stat-number">${tech.monthlyBookings}</span>
                        <span class="stat-label">this month</span>
                    </div>
                </div>
            `;
        }).join('');
        refreshIcons();
    }

    // --- INITIALIZE ---
    document.addEventListener('DOMContentLoaded', () => {
        refreshIcons();
        loadOverviewStats();
        loadCharts();
        loadBookingCharts();
        loadRecentActivity();
    });

})();