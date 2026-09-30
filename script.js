/* ============================================
   NEXORA - Core Application Logic
   ============================================ */

(() => {
    'use strict';

    // --- STATE ---
    const STATE = {
        currentPage: 'dashboard',
        tasks: [],
        settings: {
            theme: 'dark',
            accent: 'purple',
            timerFocus: 25,
            timerShort: 5,
            timerLong: 15
        },
        sidebarCollapsed: false,
        calendarDate: new Date(),
        selectedDate: null,
        timer: {
            mode: 'focus',
            timeLeft: 25 * 60,
            totalTime: 25 * 60,
            running: false,
            sessions: 0,
            interval: null
        },
        charts: {},
        confirmCallback: null
    };

    // --- DOM REFS ---
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const DOM = {
        sidebar: $('#sidebar'),
        sidebarToggle: $('#sidebarToggle'),
        mobileMenuBtn: $('#mobileMenuBtn'),
        mobileOverlay: $('#mobileOverlay'),
        mainContent: $('#mainContent'),
        pageContainer: $('#pageContainer'),
        topBarTitle: $('#topBarTitle'),
        themeToggleTop: $('#themeToggleTop'),
        taskModal: $('#taskModal'),
        taskForm: $('#taskForm'),
        modalClose: $('#modalClose'),
        modalCancel: $('#modalCancel'),
        modalTitle: $('#modalTitle'),
        confirmModal: $('#confirmModal'),
        confirmCancel: $('#confirmCancel'),
        confirmOk: $('#confirmOk'),
        confirmMessage: $('#confirmMessage'),
        toastContainer: $('#toastContainer')
    };

    // --- SAMPLE DATA ---
    function getSampleTasks() {
        const today = new Date();
        const fmt = (d) => d.toISOString().split('T')[0];
        const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmt(d); };
        return [
            { id: genId(), title: 'Design new landing page', description: 'Create wireframes and high-fidelity mockups for the marketing site.', dueDate: addDays(2), priority: 'high', category: 'work', completed: false, createdAt: fmt(today) },
            { id: genId(), title: 'Read chapter 5 of CS book', description: 'Focus on algorithms and data structures section.', dueDate: addDays(1), priority: 'medium', category: 'study', completed: false, createdAt: fmt(today) },
            { id: genId(), title: 'Morning workout routine', description: '30 minutes cardio + stretching.', dueDate: fmt(today), priority: 'low', category: 'personal', completed: true, createdAt: addDays(-1) },
            { id: genId(), title: 'Fix authentication bug', description: 'Users are getting logged out randomly on mobile devices.', dueDate: addDays(0), priority: 'high', category: 'projects', completed: false, createdAt: addDays(-2) },
            { id: genId(), title: 'Weekly team standup', description: 'Prepare updates and blockers for the meeting.', dueDate: addDays(3), priority: 'medium', category: 'work', completed: false, createdAt: fmt(today) },
            { id: genId(), title: 'Update portfolio website', description: 'Add recent projects and update bio section.', dueDate: addDays(5), priority: 'low', category: 'personal', completed: true, createdAt: addDays(-3) },
            { id: genId(), title: 'Write API documentation', description: 'Document all REST endpoints with examples.', dueDate: addDays(4), priority: 'medium', category: 'projects', completed: false, createdAt: addDays(-1) },
            { id: genId(), title: 'Buy groceries', description: 'Milk, eggs, bread, vegetables, fruits.', dueDate: fmt(today), priority: 'low', category: 'other', completed: false, createdAt: fmt(today) }
        ];
    }

    // --- UTILITIES ---
    function genId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 9); }

    function saveState() {
        try {
            localStorage.setItem('nexora_tasks', JSON.stringify(STATE.tasks));
            localStorage.setItem('nexora_settings', JSON.stringify(STATE.settings));
        } catch(e) { console.warn('LocalStorage save failed:', e); }
    }

    function loadState() {
        try {
            const tasks = localStorage.getItem('nexora_tasks');
            const settings = localStorage.getItem('nexora_settings');
            if (tasks) {
                STATE.tasks = JSON.parse(tasks);
            } else {
                STATE.tasks = getSampleTasks();
            }
            if (settings) {
                STATE.settings = { ...STATE.settings, ...JSON.parse(settings) };
            }
        } catch(e) {
            console.warn('LocalStorage load failed:', e);
            STATE.tasks = getSampleTasks();
        }
    }

    function applyTheme() {
        document.documentElement.setAttribute('data-theme', STATE.settings.theme);
        document.documentElement.setAttribute('data-accent', STATE.settings.accent);
    }

    function getGreeting() {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function isOverdue(dateStr) {
        if (!dateStr) return false;
        const today = new Date(); today.setHours(0,0,0,0);
        const due = new Date(dateStr + 'T00:00:00');
        return due < today;
    }

    function isToday(dateStr) {
        if (!dateStr) return false;
        return dateStr === new Date().toISOString().split('T')[0];
    }

    // --- TOAST ---
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        DOM.toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- CONFIRM DIALOG ---
    function showConfirm(message, callback) {
        DOM.confirmMessage.textContent = message;
        STATE.confirmCallback = callback;
        DOM.confirmModal.classList.add('active');
    }

    // --- NAVIGATION ---
    function navigateTo(page) {
        STATE.currentPage = page;
        $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
        
        const titles = { dashboard: 'Dashboard', tasks: 'My Tasks', calendar: 'Calendar', timer: 'Focus Timer', analytics: 'Analytics', settings: 'Settings' };
        DOM.topBarTitle.textContent = titles[page] || 'Dashboard';

        renderPage();

        // Close mobile sidebar
        DOM.sidebar.classList.remove('mobile-open');
        DOM.mobileOverlay.classList.remove('active');
    }

    function renderPage() {
        const page = STATE.currentPage;
        let html = '';
        switch(page) {
            case 'dashboard': html = renderDashboard(); break;
            case 'tasks': html = renderTasks(); break;
            case 'calendar': html = renderCalendar(); break;
            case 'timer': html = renderTimer(); break;
            case 'analytics': html = renderAnalytics(); break;
            case 'settings': html = renderSettings(); break;
        }
        DOM.pageContainer.innerHTML = `<div class="page active">${html}</div>`;
        
        // Post-render hooks
        requestAnimationFrame(() => {
            if (page === 'dashboard') initDashboardCharts();
            if (page === 'analytics') initAnalyticsCharts();
            if (page === 'timer') initTimerCircle();
            bindPageEvents();
        });
    }

    // --- DASHBOARD RENDER ---
    function renderDashboard() {
        const total = STATE.tasks.length;
        const completed = STATE.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
        const now = new Date();
        const circumference = 2 * Math.PI * 54;
        const offset = circumference - (pct / 100) * circumference;

        const recentTasks = [...STATE.tasks].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        const upcoming = STATE.tasks.filter(t => !t.completed && t.dueDate).sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5);

        return `
            <div class="greeting-section">
                <h1 class="greeting">${getGreeting()}, Mahir 👋</h1>
                <p class="greeting-sub">Let's make today productive.</p>
                <div class="datetime-row">
                    <div class="datetime-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                        ${now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div class="datetime-item" id="liveClock">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            <div class="grid-4">
                <div class="stat-card">
                    <div class="stat-icon purple">📋</div>
                    <div class="stat-value">${total}</div>
                    <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-value">${completed}</div>
                    <div class="stat-label">Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon amber">⏳</div>
                    <div class="stat-value">${pending}</div>
                    <div class="stat-label">Pending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">📈</div>
                    <div class="stat-value">${pct}%</div>
                    <div class="stat-label">Productivity</div>
                </div>
            </div>

            <div class="dashboard-grid">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Tasks</h3>
                        <button class="btn btn-sm btn-primary" onclick="window.NexApp.openTaskModal()">+ Add Task</button>
                    </div>
                    <div class="task-list-mini">
                        ${recentTasks.length === 0 ? '<div class="empty-state"><p>No tasks yet. Create one!</p></div>' : 
                        recentTasks.map(t => `
                            <div class="task-item-mini">
                                <div class="task-check ${t.completed ? 'checked' : ''}" data-id="${t.id}" data-action="toggle-task"></div>
                                <div class="task-mini-info">
                                    <div class="task-mini-title ${t.completed ? 'completed' : ''}">${escHtml(t.title)}</div>
                                    <div class="task-mini-meta">${t.dueDate ? formatDate(t.dueDate) : 'No date'} · <span class="badge badge-${t.priority}">${t.priority}</span></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Upcoming Deadlines</h3>
                    </div>
                    <div class="task-list-mini">
                        ${upcoming.length === 0 ? '<div class="empty-state"><p>No upcoming deadlines</p></div>' :
                        upcoming.map(t => `
                            <div class="task-item-mini">
                                <div class="task-check ${t.completed ? 'checked' : ''}" data-id="${t.id}" data-action="toggle-task"></div>
                                <div class="task-mini-info">
                                    <div class="task-mini-title ${t.completed ? 'completed' : ''}">${escHtml(t.title)}</div>
                                    <div class="task-mini-meta">${isToday(t.dueDate) ? '🔴 Today' : isOverdue(t.dueDate) ? '⚠️ Overdue' : formatDate(t.dueDate)} · <span class="badge badge-cat">${t.category}</span></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div class="card" style="grid-column: 1 / -1;">
                    <div class="card-header">
                        <h3 class="card-title">Weekly Productivity</h3>
                    </div>
                    <div class="chart-container" style="height: 250px;">
                        <canvas id="weeklyChart"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    function escHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- TASKS RENDER ---
    function renderTasks() {
        return `
            <div class="tasks-header">
                <div class="tasks-controls">
                    <div class="search-bar" style="flex:1; min-width: 200px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input type="text" id="taskSearch" placeholder="Search tasks...">
                    </div>
                    <select id="filterPriority" class="filter-chip" style="padding: 8px 12px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-family: inherit;">
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <select id="filterCategory" class="filter-chip" style="padding: 8px 12px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-family: inherit;">
                        <option value="all">All Categories</option>
                        <option value="personal">Personal</option>
                        <option value="study">Study</option>
                        <option value="work">Work</option>
                        <option value="projects">Projects</option>
                        <option value="other">Other</option>
                    </select>
                    <select id="filterStatus" class="filter-chip" style="padding: 8px 12px; border-radius: 8px; background: var(--bg-input); border: 1px solid var(--border-color); color: var(--text-primary); font-family: inherit;">
                        <option value="all">All Status</option>
                        <option value="pending">Pending</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="window.NexApp.openTaskModal()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Add Task
                </button>
            </div>
            <div class="tasks-list" id="tasksList"></div>
        `;
    }

    function renderTaskList() {
        const container = $('#tasksList');
        if (!container) return;

        const search = ($('#taskSearch')?.value || '').toLowerCase();
        const priority = $('#filterPriority')?.value || 'all';
        const category = $('#filterCategory')?.value || 'all';
        const status = $('#filterStatus')?.value || 'all';

        let filtered = STATE.tasks.filter(t => {
            if (search && !t.title.toLowerCase().includes(search) && !(t.description||'').toLowerCase().includes(search)) return false;
            if (priority !== 'all' && t.priority !== priority) return false;
            if (category !== 'all' && t.category !== category) return false;
            if (status === 'completed' && !t.completed) return false;
            if (status === 'pending' && t.completed) return false;
            return true;
        });

        // Sort: incomplete first, then by due date, then by creation
        filtered.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if (a.dueDate && b.dueDate) return new Date(a.dueDate) - new Date(b.dueDate);
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    <h3>No tasks found</h3>
                    <p>Create a new task or adjust your filters.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filtered.map(t => `
            <div class="task-card ${t.completed ? 'completed-card' : ''}">
                <div class="task-check ${t.completed ? 'checked' : ''}" data-id="${t.id}" data-action="toggle-task"></div>
                <div class="task-card-info">
                    <div class="task-card-title ${t.completed ? 'completed' : ''}">${escHtml(t.title)}</div>
                    ${t.description ? `<div class="task-card-desc">${escHtml(t.description)}</div>` : ''}
                    <div class="task-card-meta">
                        <span class="badge badge-${t.priority}">${t.priority}</span>
                        <span class="badge badge-cat">${t.category}</span>
                        ${t.dueDate ? `<span style="font-size:0.75rem;color:${isOverdue(t.dueDate) && !t.completed ? 'var(--danger)' : 'var(--text-muted)'}">${isOverdue(t.dueDate) && !t.completed ? '⚠️ ' : ''}${formatDate(t.dueDate)}</span>` : ''}
                    </div>
                </div>
                <div class="task-card-actions">
                    <button class="action-btn" data-id="${t.id}" data-action="edit-task" title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="action-btn delete" data-id="${t.id}" data-action="delete-task" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    // --- CALENDAR RENDER ---
    function renderCalendar() {
        const d = STATE.calendarDate;
        const year = d.getFullYear();
        const month = d.getMonth();
        const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrev = new Date(year, month, 0).getDate();
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        let cells = '';
        // Previous month days
        for (let i = firstDay - 1; i >= 0; i--) {
            cells += `<div class="calendar-day other-month">${daysInPrev - i}</div>`;
        }
        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const isT = dateStr === todayStr;
            const isSel = dateStr === STATE.selectedDate;
            const tasksOnDay = STATE.tasks.filter(t => t.dueDate === dateStr);
            cells += `<div class="calendar-day ${isT ? 'today' : ''} ${isSel ? 'selected' : ''}" data-date="${dateStr}">
                ${day}
                ${tasksOnDay.length > 0 ? '<div class="calendar-dot"></div>' : ''}
            </div>`;
        }
        // Next month days
        const totalCells = firstDay + daysInMonth;
        const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for (let i = 1; i <= remaining; i++) {
            cells += `<div class="calendar-day other-month">${i}</div>`;
        }

        const selTasks = STATE.selectedDate ? STATE.tasks.filter(t => t.dueDate === STATE.selectedDate) : [];

        return `
            <div class="card">
                <div class="calendar-header">
                    <div class="calendar-nav">
                        <button class="btn btn-sm btn-ghost" data-action="cal-prev">← Prev</button>
                        <button class="btn btn-sm btn-ghost" data-action="cal-today">Today</button>
                        <button class="btn btn-sm btn-ghost" data-action="cal-next">Next →</button>
                    </div>
                    <h2 class="calendar-title">${monthNames[month]} ${year}</h2>
                </div>
                <div class="calendar-grid">
                    ${dayNames.map(d => `<div class="calendar-day-name">${d}</div>`).join('')}
                    ${cells}
                </div>
            </div>
            ${STATE.selectedDate ? `
            <div class="card calendar-tasks-panel">
                <div class="card-header">
                    <h3 class="card-title">Tasks for ${formatDate(STATE.selectedDate)}</h3>
                </div>
                ${selTasks.length === 0 ? '<p style="color:var(--text-muted);font-size:0.9rem;">No tasks scheduled for this date.</p>' :
                `<div class="task-list-mini">
                    ${selTasks.map(t => `
                        <div class="task-item-mini">
                            <div class="task-check ${t.completed ? 'checked' : ''}" data-id="${t.id}" data-action="toggle-task"></div>
                            <div class="task-mini-info">
                                <div class="task-mini-title ${t.completed ? 'completed' : ''}">${escHtml(t.title)}</div>
                                <div class="task-mini-meta"><span class="badge badge-${t.priority}">${t.priority}</span> <span class="badge badge-cat">${t.category}</span></div>
                            </div>
                        </div>
                    `).join('')}
                </div>`}
            </div>` : ''}
        `;
    }

    // --- TIMER RENDER ---
    function renderTimer() {
        const mins = Math.floor(STATE.timer.timeLeft / 60);
        const secs = STATE.timer.timeLeft % 60;
        const timeStr = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
        const labels = { focus: 'Focus Time', short: 'Short Break', long: 'Long Break' };

        return `
            <div class="timer-container">
                <div class="timer-modes">
                    <button class="timer-mode-btn ${STATE.timer.mode==='focus'?'active':''}" data-mode="focus">Focus</button>
                    <button class="timer-mode-btn ${STATE.timer.mode==='short'?'active':''}" data-mode="short">Short Break</button>
                    <button class="timer-mode-btn ${STATE.timer.mode==='long'?'active':''}" data-mode="long">Long Break</button>
                </div>

                <div class="timer-circle">
                    <svg width="100%" height="100%" viewBox="0 0 280 280">
                        <circle class="timer-circle-bg" cx="140" cy="140" r="126" fill="none" stroke-width="6"/>
                        <circle class="timer-circle-progress" id="timerProgress" cx="140" cy="140" r="126" fill="none" stroke-width="6"
                            stroke-dasharray="${2 * Math.PI * 126}"
                            stroke-dashoffset="0"/>
                    </svg>
                    <div class="timer-display">
                        <div class="timer-time" id="timerDisplay">${timeStr}</div>
                        <div class="timer-label">${labels[STATE.timer.mode]}</div>
                    </div>
                </div>

                <div class="timer-controls">
                    <button class="timer-btn" data-action="timer-reset" title="Reset">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
                    </button>
                    <button class="timer-btn play" data-action="timer-toggle" title="${STATE.timer.running ? 'Pause' : 'Start'}">
                        ${STATE.timer.running ? 
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>' :
                            '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>'
                        }
                    </button>
                    <button class="timer-btn" data-action="timer-skip" title="Skip">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>
                    </button>
                </div>

                <div class="session-counter">Sessions completed: <span>${STATE.timer.sessions}</span></div>

                <div class="timer-settings card">
                    <h4 style="font-size:0.9rem;font-weight:700;margin-bottom:12px;">Customize Durations (minutes)</h4>
                    <div class="timer-setting-row">
                        <label>Focus Duration</label>
                        <input type="number" id="setTimerFocus" value="${STATE.settings.timerFocus}" min="1" max="120">
                    </div>
                    <div class="timer-setting-row">
                        <label>Short Break</label>
                        <input type="number" id="setTimerShort" value="${STATE.settings.timerShort}" min="1" max="30">
                    </div>
                    <div class="timer-setting-row">
                        <label>Long Break</label>
                        <input type="number" id="setTimerLong" value="${STATE.settings.timerLong}" min="1" max="60">
                    </div>
                </div>
            </div>
        `;
    }

    // --- ANALYTICS RENDER ---
    function renderAnalytics() {
        const total = STATE.tasks.length;
        const completed = STATE.tasks.filter(t => t.completed).length;
        const pending = total - completed;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        const cats = {};
        STATE.tasks.forEach(t => { cats[t.category] = (cats[t.category] || 0) + 1; });

        return `
            <div class="grid-4 analytics-stats">
                <div class="stat-card">
                    <div class="stat-icon green">✅</div>
                    <div class="stat-value">${completed}</div>
                    <div class="stat-label">Completed Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon amber">⏳</div>
                    <div class="stat-value">${pending}</div>
                    <div class="stat-label">Pending Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon purple">📊</div>
                    <div class="stat-value">${pct}%</div>
                    <div class="stat-label">Completion Rate</div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon blue">📁</div>
                    <div class="stat-value">${Object.keys(cats).length}</div>
                    <div class="stat-label">Categories Used</div>
                </div>
            </div>

            <div class="charts-grid">
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Weekly Activity</h3></div>
                    <div class="chart-container" style="height:280px;"><canvas id="analyticsWeeklyChart"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-header"><h3 class="card-title">Category Breakdown</h3></div>
                    <div class="chart-container" style="height:280px;display:flex;align-items:center;justify-content:center;"><canvas id="analyticsCatChart"></canvas></div>
                </div>
            </div>
        `;
    }

    // --- SETTINGS RENDER ---
    function renderSettings() {
        return `
            <div class="card" style="max-width: 700px;">
                <div class="settings-section">
                    <h3 class="settings-title">Appearance</h3>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>Dark Mode</h4>
                            <p>Toggle between dark and light themes</p>
                        </div>
                        <div class="toggle-switch ${STATE.settings.theme === 'dark' ? 'active' : ''}" data-action="toggle-theme-setting"></div>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>Accent Color</h4>
                            <p>Choose your preferred accent color</p>
                        </div>
                        <div class="color-options">
                            <div class="color-option ${STATE.settings.accent==='purple'?'active':''}" data-color="purple" data-action="set-accent"></div>
                            <div class="color-option ${STATE.settings.accent==='blue'?'active':''}" data-color="blue" data-action="set-accent"></div>
                            <div class="color-option ${STATE.settings.accent==='emerald'?'active':''}" data-color="emerald" data-action="set-accent"></div>
                            <div class="color-option ${STATE.settings.accent==='rose'?'active':''}" data-color="rose" data-action="set-accent"></div>
                            <div class="color-option ${STATE.settings.accent==='amber'?'active':''}" data-color="amber" data-action="set-accent"></div>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-title">Data Management</h3>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>Export Tasks</h4>
                            <p>Download all tasks as a JSON file</p>
                        </div>
                        <button class="btn btn-sm btn-ghost" data-action="export-tasks">Export</button>
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>Import Tasks</h4>
                            <p>Load tasks from a JSON file</p>
                        </div>
                        <button class="btn btn-sm btn-ghost" data-action="import-tasks-trigger">Import</button>
                        <input type="file" id="importFileInput" accept=".json" style="display:none;">
                    </div>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>Clear All Data</h4>
                            <p>Permanently delete all tasks and reset</p>
                        </div>
                        <button class="btn btn-sm btn-danger" data-action="clear-all-data">Clear Data</button>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 class="settings-title">Notifications</h3>
                    <div class="setting-row">
                        <div class="setting-info">
                            <h4>Browser Notifications</h4>
                            <p>Allow notifications when timer completes</p>
                        </div>
                        <button class="btn btn-sm btn-ghost" data-action="request-notifications">
                            ${Notification.permission === 'granted' ? 'Enabled' : 'Enable'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // --- CHARTS ---
    function getChartData() {
        const days = [];
        const counts = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            days.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
            counts.push(STATE.tasks.filter(t => t.completed && t.dueDate === ds).length + 
                        STATE.tasks.filter(t => t.completed && t.createdAt === ds).length);
        }
        // Deduplicate counts roughly
        const finalCounts = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const ds = d.toISOString().split('T')[0];
            finalCounts.push(STATE.tasks.filter(t => t.completed && (t.dueDate === ds || t.createdAt === ds)).length);
        }
        return { days, counts: finalCounts };
    }

    function getCategoryData() {
        const cats = { personal: 0, study: 0, work: 0, projects: 0, other: 0 };
        STATE.tasks.forEach(t => { if (cats.hasOwnProperty(t.category)) cats[t.category]++; });
        return {
            labels: Object.keys(cats).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
            values: Object.values(cats)
        };
    }

    function destroyChart(name) {
        if (STATE.charts[name]) {
            STATE.charts[name].destroy();
            delete STATE.charts[name];
        }
    }

    function getChartColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            text: style.getPropertyValue('--text-muted').trim() || '#64748b',
            grid: style.getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.06)',
            accent: style.getPropertyValue('--accent').trim() || '#7c3aed'
        };
    }

    function initDashboardCharts() {
        const canvas = $('#weeklyChart');
        if (!canvas || typeof Chart === 'undefined') return;
        destroyChart('weekly');
        const { days, counts } = getChartData();
        const colors = getChartColors();
        STATE.charts.weekly = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: days,
                datasets: [{
                    label: 'Tasks Completed',
                    data: counts,
                    backgroundColor: colors.accent + '40',
                    borderColor: colors.accent,
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: colors.text }, grid: { color: colors.grid } },
                    x: { ticks: { color: colors.text }, grid: { display: false } }
                }
            }
        });
    }

    function initAnalyticsCharts() {
        if (typeof Chart === 'undefined') return;
        const colors = getChartColors();

        const wCanvas = $('#analyticsWeeklyChart');
        if (wCanvas) {
            destroyChart('analyticsWeekly');
            const { days, counts } = getChartData();
            STATE.charts.analyticsWeekly = new Chart(wCanvas, {
                type: 'line',
                data: {
                    labels: days,
                    datasets: [{
                        label: 'Activity',
                        data: counts,
                        borderColor: colors.accent,
                        backgroundColor: colors.accent + '20',
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: colors.accent,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, color: colors.text }, grid: { color: colors.grid } },
                        x: { ticks: { color: colors.text }, grid: { display: false } }
                    }
                }
            });
        }

        const cCanvas = $('#analyticsCatChart');
        if (cCanvas) {
            destroyChart('analyticsCat');
            const catData = getCategoryData();
            const bgColors = ['#7c3aed','#3b82f6','#10b981','#f59e0b','#ef4444'];
            STATE.charts.analyticsCat = new Chart(cCanvas, {
                type: 'doughnut',
                data: {
                    labels: catData.labels,
                    datasets: [{
                        data: catData.values,
                        backgroundColor: bgColors,
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: colors.text, padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12 } } }
                    }
                }
            });
        }
    }

    // --- TIMER LOGIC ---
    function initTimerCircle() {
        updateTimerDisplay();
    }

    function updateTimerDisplay() {
        const display = $('#timerDisplay');
        const progress = $('#timerProgress');
        if (!display || !progress) return;

        const mins = Math.floor(STATE.timer.timeLeft / 60);
        const secs = STATE.timer.timeLeft % 60;
        display.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

        const circumference = 2 * Math.PI * 126;
        const pct = STATE.timer.totalTime > 0 ? STATE.timer.timeLeft / STATE.timer.totalTime : 1;
        progress.style.strokeDasharray = circumference;
        progress.style.strokeDashoffset = circumference * (1 - pct);
    }

    function setTimerMode(mode) {
        stopTimer();
        STATE.timer.mode = mode;
        const durations = { focus: STATE.settings.timerFocus, short: STATE.settings.timerShort, long: STATE.settings.timerLong };
        STATE.timer.totalTime = (durations[mode] || 25) * 60;
        STATE.timer.timeLeft = STATE.timer.totalTime;
        renderPage();
    }

    function toggleTimer() {
        if (STATE.timer.running) {
            stopTimer();
        } else {
            startTimer();
        }
        renderPage();
    }

    function startTimer() {
        if (STATE.timer.running) return;
        STATE.timer.running = true;
        STATE.timer.interval = setInterval(() => {
            STATE.timer.timeLeft--;
            if (STATE.timer.timeLeft <= 0) {
                timerComplete();
            }
            updateTimerDisplay();
        }, 1000);
    }

    function stopTimer() {
        STATE.timer.running = false;
        if (STATE.timer.interval) {
            clearInterval(STATE.timer.interval);
            STATE.timer.interval = null;
        }
    }

    function resetTimer() {
        stopTimer();
        STATE.timer.timeLeft = STATE.timer.totalTime;
        renderPage();
    }

    function timerComplete() {
        stopTimer();
        if (STATE.timer.mode === 'focus') {
            STATE.timer.sessions++;
            showToast('Focus session complete! Take a break.', 'success');
        } else {
            showToast('Break is over! Time to focus.', 'info');
        }
        
        if (Notification.permission === 'granted') {
            new Notification('NEXORA Timer', { body: STATE.timer.mode === 'focus' ? 'Focus session complete!' : 'Break is over!' });
        }

        STATE.timer.timeLeft = STATE.timer.totalTime;
        renderPage();
    }

    function updateTimerSettings() {
        const f = parseInt($('#setTimerFocus')?.value) || 25;
        const s = parseInt($('#setTimerShort')?.value) || 5;
        const l = parseInt($('#setTimerLong')?.value) || 15;
        STATE.settings.timerFocus = Math.max(1, Math.min(120, f));
        STATE.settings.timerShort = Math.max(1, Math.min(30, s));
        STATE.settings.timerLong = Math.max(1, Math.min(60, l));
        saveState();
        setTimerMode(STATE.timer.mode);
        showToast('Timer settings updated', 'success');
    }

    // --- TASK CRUD ---
    function openTaskModal(taskId = null) {
        const form = DOM.taskForm;
        form.reset();
        $('#taskId').value = '';

        if (taskId) {
            const task = STATE.tasks.find(t => t.id === taskId);
            if (!task) return;
            DOM.modalTitle.textContent = 'Edit Task';
            $('#taskId').value = task.id;
            $('#taskTitle').value = task.title;
            $('#taskDesc').value = task.description || '';
            $('#taskDue').value = task.dueDate || '';
            $('#taskPriority').value = task.priority;
            $('#taskCategory').value = task.category;
        } else {
            DOM.modalTitle.textContent = 'Add New Task';
        }

        DOM.taskModal.classList.add('active');
        setTimeout(() => $('#taskTitle').focus(), 100);
    }

    function closeTaskModal() {
        DOM.taskModal.classList.remove('active');
    }

    function handleTaskSubmit(e) {
        e.preventDefault();
        const id = $('#taskId').value;
        const title = $('#taskTitle').value.trim();
        const description = $('#taskDesc').value.trim();
        const dueDate = $('#taskDue').value;
        const priority = $('#taskPriority').value;
        const category = $('#taskCategory').value;

        if (!title) { showToast('Please enter a task title', 'warning'); return; }

        if (id) {
            // Edit
            const idx = STATE.tasks.findIndex(t => t.id === id);
            if (idx !== -1) {
                STATE.tasks[idx] = { ...STATE.tasks[idx], title, description, dueDate, priority, category };
                showToast('Task updated successfully', 'success');
            }
        } else {
            // Create
            STATE.tasks.push({
                id: genId(),
                title,
                description,
                dueDate,
                priority,
                category,
                completed: false,
                createdAt: new Date().toISOString().split('T')[0]
            });
            showToast('Task created successfully', 'success');
        }

        saveState();
        closeTaskModal();
        renderPage();
    }

    function toggleTask(id) {
        const task = STATE.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            saveState();
            renderPage();
            showToast(task.completed ? 'Task completed! 🎉' : 'Task marked pending', 'info');
        }
    }

    function deleteTask(id) {
        showConfirm('Are you sure you want to delete this task? This action cannot be undone.', () => {
            STATE.tasks = STATE.tasks.filter(t => t.id !== id);
            saveState();
            renderPage();
            showToast('Task deleted', 'error');
        });
    }

    // --- EVENT BINDING ---
    function bindGlobalEvents() {
        // Sidebar navigation
        $$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                navigateTo(item.dataset.page);
            });
        });

        // Sidebar toggle
        DOM.sidebarToggle.addEventListener('click', () => {
            STATE.sidebarCollapsed = !STATE.sidebarCollapsed;
            DOM.sidebar.classList.toggle('collapsed', STATE.sidebarCollapsed);
        });

        // Mobile menu
        DOM.mobileMenuBtn.addEventListener('click', () => {
            DOM.sidebar.classList.add('mobile-open');
            DOM.mobileOverlay.classList.add('active');
        });
        DOM.mobileOverlay.addEventListener('click', () => {
            DOM.sidebar.classList.remove('mobile-open');
            DOM.mobileOverlay.classList.remove('active');
        });

        // Theme toggle in top bar
        DOM.themeToggleTop.addEventListener('click', () => {
            STATE.settings.theme = STATE.settings.theme === 'dark' ? 'light' : 'dark';
            applyTheme();
            saveState();
            renderPage();
        });

        // Task modal
        DOM.modalClose.addEventListener('click', closeTaskModal);
        DOM.modalCancel.addEventListener('click', closeTaskModal);
        DOM.taskModal.addEventListener('click', (e) => { if (e.target === DOM.taskModal) closeTaskModal(); });
        DOM.taskForm.addEventListener('submit', handleTaskSubmit);

        // Confirm modal
        DOM.confirmCancel.addEventListener('click', () => DOM.confirmModal.classList.remove('active'));
        DOM.confirmOk.addEventListener('click', () => {
            DOM.confirmModal.classList.remove('active');
            if (STATE.confirmCallback) STATE.confirmCallback();
        });
        DOM.confirmModal.addEventListener('click', (e) => { if (e.target === DOM.confirmModal) DOM.confirmModal.classList.remove('active'); });

        // Clock updater
        setInterval(() => {
            const clock = $('#liveClock');
            if (clock) {
                const now = new Date();
                clock.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
            }
        }, 1000);
    }

    function bindPageEvents() {
        // Delegated click handler for dynamic elements
        DOM.pageContainer.onclick = (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            const action = target.dataset.action;
            const id = target.dataset.id;

            switch(action) {
                case 'toggle-task': toggleTask(id); break;
                case 'edit-task': openTaskModal(id); break;
                case 'delete-task': deleteTask(id); break;
                case 'cal-prev':
                    STATE.calendarDate.setMonth(STATE.calendarDate.getMonth() - 1);
                    renderPage();
                    break;
                case 'cal-next':
                    STATE.calendarDate.setMonth(STATE.calendarDate.getMonth() + 1);
                    renderPage();
                    break;
                case 'cal-today':
                    STATE.calendarDate = new Date();
                    STATE.selectedDate = new Date().toISOString().split('T')[0];
                    renderPage();
                    break;
                case 'timer-toggle': toggleTimer(); break;
                case 'timer-reset': resetTimer(); break;
                case 'timer-skip': timerComplete(); break;
                case 'toggle-theme-setting':
                    STATE.settings.theme = STATE.settings.theme === 'dark' ? 'light' : 'dark';
                    applyTheme();
                    saveState();
                    renderPage();
                    break;
                case 'set-accent':
                    STATE.settings.accent = target.dataset.color;
                    applyTheme();
                    saveState();
                    renderPage();
                    break;
                case 'export-tasks': exportTasks(); break;
                case 'import-tasks-trigger':
                    $('#importFileInput')?.click();
                    break;
                case 'clear-all-data':
                    showConfirm('This will permanently delete ALL your tasks. Continue?', () => {
                        STATE.tasks = [];
                        saveState();
                        renderPage();
                        showToast('All data cleared', 'error');
                    });
                    break;
                case 'request-notifications':
                    if ('Notification' in window) {
                        Notification.requestPermission().then(p => {
                            showToast(p === 'granted' ? 'Notifications enabled!' : 'Notifications denied', p === 'granted' ? 'success' : 'warning');
                            renderPage();
                        });
                    } else {
                        showToast('Notifications not supported', 'error');
                    }
                    break;
            }

            // Calendar day click
            if (target.classList.contains('calendar-day') && target.dataset.date) {
                STATE.selectedDate = target.dataset.date;
                renderPage();
            }

            // Timer mode buttons
            if (target.classList.contains('timer-mode-btn') && target.dataset.mode) {
                setTimerMode(target.dataset.mode);
            }
        };

        // Search & Filter inputs
        const searchInput = $('#taskSearch');
        if (searchInput) {
            searchInput.addEventListener('input', renderTaskList);
        }
        ['filterPriority', 'filterCategory', 'filterStatus'].forEach(id => {
            const el = $(`#${id}`);
            if (el) el.addEventListener('change', renderTaskList);
        });

        // Render task list if on tasks page
        if (STATE.currentPage === 'tasks') renderTaskList();

        // Import file listener
        const importInput = $('#importFileInput');
        if (importInput) {
            importInput.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    try {
                        const data = JSON.parse(ev.target.result);
                        if (Array.isArray(data)) {
                            STATE.tasks = data;
                            saveState();
                            renderPage();
                            showToast(`Imported ${data.length} tasks`, 'success');
                        } else {
                            showToast('Invalid file format', 'error');
                        }
                    } catch(err) {
                        showToast('Failed to parse file', 'error');
                    }
                };
                reader.readAsText(file);
                importInput.value = '';
            };
        }

        // Timer settings change
        ['setTimerFocus', 'setTimerShort', 'setTimerLong'].forEach(id => {
            const el = $(`#${id}`);
            if (el) el.addEventListener('change', updateTimerSettings);
        });
    }

    // --- EXPORT ---
    function exportTasks() {
        const blob = new Blob([JSON.stringify(STATE.tasks, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexora-tasks-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Tasks exported successfully', 'success');
    }

    // --- PUBLIC API ---
    window.NexApp = { openTaskModal };

    // --- INIT ---
    function init() {
        loadState();
        applyTheme();
        bindGlobalEvents();

        // Set initial timer state
        STATE.timer.totalTime = STATE.settings.timerFocus * 60;
        STATE.timer.timeLeft = STATE.timer.totalTime;

        navigateTo('dashboard');
    }

    // Start app when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();