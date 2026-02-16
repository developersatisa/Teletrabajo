document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginScreen = document.getElementById('loginScreen');
    const appContainer = document.getElementById('appContainer');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userRoleDisplay = document.getElementById('userRoleDisplay');
    const userDeptDisplay = document.getElementById('userDeptDisplay');
    const userAvatar = document.getElementById('userAvatar');

    const calendar = document.getElementById('calendar');
    const monthDisplay = document.getElementById('monthDisplay');
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const newRequestBtn = document.getElementById('newRequestBtn');
    const requestModal = document.getElementById('requestModal');
    const closeModal = document.querySelector('.close-modal');
    const requestForm = document.getElementById('requestForm');
    const statsRequested = document.getElementById('statsRequested');
    const statsDept = document.getElementById('statsDept');
    const statsDeptCode = document.getElementById('statsDeptCode');
    const statsCollaborators = document.getElementById('statsCollaborators');
    const collabBadge = document.getElementById('collabBadge');
    const activePeriodDisplay = document.getElementById('activePeriodDisplay');
    const navLinks = document.querySelectorAll('.nav-links li');
    const viewDashboard = document.getElementById('dashboardView');
    const viewCollaborators = document.getElementById('collaboratorsView');
    const viewStatistics = document.getElementById('statisticsView');
    const viewSettings = document.getElementById('settingsView');
    const collaboratorsList = document.getElementById('collaboratorsList');
    const themeToggle = document.getElementById('themeToggle');

    // Stats Elements (New PowerBI KPIs)
    const coverageKpi = document.getElementById('coverageKpi');
    const totalMonthDaysKpi = document.getElementById('totalMonthDaysKpi');
    const avgWeeklyKpi = document.getElementById('avgWeeklyKpi');
    const totalYearDaysKpi = document.getElementById('totalYearDaysKpi');
    const topDayKpi = document.getElementById('topDayKpi');
    const topDaysList = document.getElementById('topDaysList');

    // Settings elements
    const maxQuarterlyDaysInput = document.getElementById('maxQuarterlyDays');
    const minPresenceDailyInput = document.getElementById('minPresenceDaily');
    const blockMaxDaysCheck = document.getElementById('blockMaxDays');
    const blockMinPresenceCheck = document.getElementById('blockMinPresence');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');

    let monthlyChart = null;
    let weekdayChart = null;
    let presenceChart = null;
    let forecastChart = null;

    // Global State
    let currentUser = JSON.parse(localStorage.getItem('user')) || null;
    let currentDate = new Date();
    let teletrabajos = [];
    let collaborators = [];
    let selectedPeriod = getCurrentPeriod();

    // Default Settings
    let appSettings = {
        maxQuarterlyDays: 30,
        minPresenceDaily: 50,
        blockMaxDays: false,
        blockMinPresence: false
    };

    try {
        const saved = localStorage.getItem('teletrabajoSettings');
        if (saved) appSettings = { ...appSettings, ...JSON.parse(saved) };
    } catch (e) {
        console.error("Error loading settings:", e);
    }

    // Check Auth on Load
    if (currentUser) {
        showApp();
    } else {
        showLogin();
    }

    // --- Notification System ---
    const notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);

    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';

        notification.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        notificationContainer.appendChild(notification);

        // Show with small delay for animation
        setTimeout(() => notification.classList.add('show'), 10);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 400);
        }, 3000);
    }

    // --- Auth Logic ---

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const loginError = document.getElementById('loginError');

            try {
                const response = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                if (response.ok) {
                    const user = await response.json();
                    currentUser = user;
                    localStorage.setItem('user', JSON.stringify(user));
                    showApp();
                } else {
                    if (loginError) loginError.style.display = 'block';
                }
            } catch (error) {
                console.error('Login error:', error);
                showNotification('Error de conexión con el servidor', 'error');
            }
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('user');
            location.reload();
        });
    }

    function showApp() {
        loginScreen.style.display = 'none';
        appContainer.style.display = 'flex';
        userNameDisplay.textContent = currentUser.nombre;
        if (userRoleDisplay) userRoleDisplay.textContent = currentUser.nivel || 'Empleado';
        if (userDeptDisplay) userDeptDisplay.textContent = currentUser.departamento || '-';
        if (statsDept) statsDept.textContent = currentUser.departamento || '-';
        if (statsDeptCode) statsDeptCode.textContent = formatDeptCode(currentUser.cod_dep);

        updateStaticProfileInfo();
        userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.nombre)}&background=9CBA39&color=fff`;
        loadSettingsToUI();
        fetchTeletrabajos();
        renderCalendar();
        updateUI();
    }

    function loadSettingsToUI() {
        if (!maxQuarterlyDaysInput) return;
        maxQuarterlyDaysInput.value = appSettings.maxQuarterlyDays;
        minPresenceDailyInput.value = appSettings.minPresenceDaily;
        blockMaxDaysCheck.checked = appSettings.blockMaxDays;
        blockMinPresenceCheck.checked = appSettings.blockMinPresence;
    }

    if (saveSettingsBtn) {
        saveSettingsBtn.addEventListener('click', () => {
            appSettings = {
                maxQuarterlyDays: parseInt(maxQuarterlyDaysInput.value) || 30,
                minPresenceDaily: parseInt(minPresenceDailyInput.value) || 50,
                blockMaxDays: blockMaxDaysCheck.checked,
                blockMinPresence: blockMinPresenceCheck.checked
            };
            localStorage.setItem('teletrabajoSettings', JSON.stringify(appSettings));
            showNotification('Configuración guardada correctamente');

            // Re-render statistics to update "Total Days" and other things
            const activeNav = document.querySelector('.nav-links li.active');
            if (activeNav && activeNav.getAttribute('data-view') === 'statistics') {
                renderStatistics();
            }
        });
    }

    function updateStaticProfileInfo() {
        if (!currentUser) return;
        userNameDisplay.textContent = currentUser.nombre;
        if (userRoleDisplay) userRoleDisplay.textContent = currentUser.nivel || 'Empleado';
        if (userDeptDisplay) userDeptDisplay.textContent = currentUser.departamento || '-';
        if (statsDept) statsDept.textContent = currentUser.departamento || '-';
        if (statsDeptCode) statsDeptCode.textContent = formatDeptCode(currentUser.cod_dep);
    }

    function showLogin() {
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
    }

    // --- Core Functionality ---

    function getCurrentPeriod(dateObj = new Date()) {
        const quarter = Math.floor(dateObj.getMonth() / 3) + 1;
        return `T${quarter} ${dateObj.getFullYear()}`;
    }

    // Theme Logic
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        updateThemeIcon();
    }

    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDark = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon();

        // Refresh statistics if active to update chart colors
        const activeNav = document.querySelector('.nav-links li.active');
        if (activeNav && activeNav.getAttribute('data-view') === 'statistics') {
            renderStatistics();
        }
    });

    function updateThemeIcon() {
        const icon = themeToggle.querySelector('i');
        if (document.body.classList.contains('dark-mode')) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // Event Listeners
    if (prevMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            updateUI();
        });
    }

    // Navigation Logic
    function switchView(viewName) {
        const views = {
            'dashboard': viewDashboard,
            'collaborators': viewCollaborators,
            'statistics': viewStatistics,
            'settings': viewSettings
        };

        // Hide all views
        Object.values(views).forEach(v => {
            if (v) v.style.display = 'none';
        });

        // Show target view
        const target = views[viewName];
        if (target) target.style.display = 'block';

        // Update Nav UI
        navLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Run view-specific logic
        if (viewName === 'dashboard') {
            updateStaticProfileInfo();
            updateUI();
        } else if (viewName === 'collaborators') {
            fetchCollaborators();
        } else if (viewName === 'statistics') {
            renderStatistics();
        } else if (viewName === 'settings') {
            loadSettingsToUI();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const view = link.getAttribute('data-view');
            if (view) switchView(view);
        });
    });

    if (nextMonthBtn) {
        nextMonthBtn.addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            updateUI();
        });
    }

    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', () => {
            requestModal.style.display = 'block';
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (requestModal) requestModal.style.display = 'none';
        });
    }

    if (window) {
        window.addEventListener('click', (e) => {
            if (e.target === requestModal) requestModal.style.display = 'none';
        });
    }

    if (requestForm) {
        requestForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(requestForm);
            const data = Object.fromEntries(formData.entries());

            const start = new Date(data.fecha_ini);
            const end = new Date(data.fecha_hasta);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                showNotification('Fechas no válidas', 'error');
                return;
            }

            // --- SETTINGS VALIDATION ---
            let potentialRequests = [];
            let currentCheck = new Date(start);
            while (currentCheck <= end) {
                potentialRequests.push(currentCheck.toISOString().split('T')[0]);
                currentCheck.setDate(currentCheck.getDate() + 1);
            }

            // 1. Check Max Quarterly Days
            const requestedByQuarter = {};
            potentialRequests.forEach(dateStr => {
                const d = new Date(dateStr);
                const q = `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
                requestedByQuarter[q] = (requestedByQuarter[q] || 0) + 1;
            });

            for (const qKey in requestedByQuarter) {
                const existingInQuarter = teletrabajos.filter(t => {
                    const d = new Date(t.fecha);
                    const tPeriod = `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
                    return tPeriod === qKey;
                }).length;

                const totalInQuarter = existingInQuarter + requestedByQuarter[qKey];
                const limit = appSettings.maxQuarterlyDays || 30;

                if (totalInQuarter > limit) {
                    const msg = `Máximo trimestral excedido para ${qKey} (${existingInQuarter} guardados + ${requestedByQuarter[qKey]} nuevos > ${limit} permitidos).`;
                    if (appSettings.blockMaxDays) {
                        showNotification(msg + ' Bloqueado por ajustes.', 'error');
                        return;
                    } else {
                        showNotification(msg + ' Ignorando política por configuración.', 'error');
                    }
                }
            }

            // 2. Check Min Presence Daily
            const totalTeamSize = collaborators.length || 1;
            const minOfficePeople = Math.ceil((appSettings.minPresenceDaily / 100) * totalTeamSize);

            for (const dateStr of potentialRequests) {
                const alreadyRemote = collaborators.filter(c =>
                    c.id_usuario !== currentUser.id &&
                    c.fechas && c.fechas.some(f => (typeof f === 'string' ? f : f.fecha) === dateStr)
                ).length;

                const officePeopleIfRequested = totalTeamSize - (alreadyRemote + 1);

                if (officePeopleIfRequested < minOfficePeople) {
                    const msg = `Falta de presencialidad el día ${dateStr}.`;
                    if (appSettings.blockMinPresence) {
                        showNotification(msg + ' Bloqueado por ajustes.', 'error');
                        return;
                    } else {
                        showNotification(msg + ' Alerta de baja presencialidad.', 'error');
                    }
                }
            }
            // --- END SETTINGS VALIDATION ---

            const requests = [];
            let current = new Date(start);

            while (current <= end) {
                const singleRequestData = {
                    id_usuario: currentUser.id,
                    fecha: current.toISOString().split('T')[0],
                    descripcion: data.descripcion,
                    periodo: getCurrentPeriod(current)
                };

                requests.push(
                    fetch('/teletrabajos/', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(singleRequestData),
                    })
                );

                current.setDate(current.getDate() + 1);
            }

            try {
                const results = await Promise.all(requests);
                const allOk = results.every(res => res.ok);

                if (allOk) {
                    if (requestModal) requestModal.style.display = 'none';
                    requestForm.reset();
                    fetchTeletrabajos();
                    showNotification('Solicitud(es) enviada(s) correctamente');
                } else {
                    showNotification('Error al enviar algunas solicitudes', 'error');
                    fetchTeletrabajos();
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('Error de red al enviar la solicitud', 'error');
            }
        });
    }

    async function fetchTeletrabajos() {
        try {
            // Optimized: Fetch only current user's records
            const response = await fetch(`/teletrabajos/${currentUser.id}`);
            if (response.ok) {
                teletrabajos = await response.json();

                fetchCollaborators(); // Update collaborators count after loading teletrabajos
                updateUI();
                const activeNav = document.querySelector('.nav-links li.active');
                if (activeNav && activeNav.getAttribute('data-view') === 'statistics') {
                    renderStatistics();
                }
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    async function fetchCollaborators() {
        if (!currentUser || !currentUser.deptonomi) return;

        try {
            const response = await fetch(`/collaborators?deptonomi=${encodeURIComponent(currentUser.deptonomi)}`);
            if (response.ok) {
                collaborators = await response.json();
                renderCollaborators(collaborators);
                updateCollaboratorStats(collaborators);
                renderCalendar(); // Re-render calendar to show counts
            }
        } catch (error) {
            console.error('Error fetching collaborators:', error);
        }
    }

    function renderCollaborators(collaborators) {
        if (!collaboratorsList) return;
        collaboratorsList.innerHTML = '';

        if (!collaborators || collaborators.length === 0) {
            collaboratorsList.innerHTML = '<p style="color: var(--text-secondary);">No se encontraron colaboradores en tu departamento.</p>';
            return;
        }

        collaborators.forEach(c => {
            const card = document.createElement('div');
            card.className = 'collaborator-card';
            // Highlight current user
            if (c.id_usuario === currentUser.id) {
                card.style.borderColor = 'var(--atisa-azul)';
            }

            const hasTelework = c.fechas && c.fechas.length > 0;

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <strong class="collaborator-name font-aleo">${c.nombre} ${c.id_usuario === currentUser.id ? '(Tú)' : ''}</strong>
                        <small style="color: var(--text-secondary);">
                            ${hasTelework ? `Días solicitados: ${c.fechas.length}` : 'Sin teletrabajo solicitado'}
                        </small>
                    </div>
                </div>
                <div class="collaborator-days">
                    ${hasTelework ? c.fechas.map(f => `
                        <div class="day-tag-container" style="margin-bottom: 5px;">
                            <span class="day-tag">${formatDate(f.fecha)}</span>
                            ${f.descripcion ? `<span class="day-desc" style="font-size: 0.8rem; opacity: 0.7; margin-left: 5px;">- ${f.descripcion}</span>` : ''}
                        </div>
                    `).join('') : ''}
                </div>
            `;
            collaboratorsList.appendChild(card);
        });
    }

    function updateCollaboratorStats(collaborators) {
        if (!collaborators) return;
        const todayStr = new Date().toISOString().split('T')[0];
        // Count how many people (excluding current user if desired, or all) have telework today
        const todayCount = collaborators.filter(c =>
            c.id_usuario !== currentUser.id && // Only show +N for OTHERS
            c.fechas && c.fechas.some(f => (typeof f === 'string' ? f : f.fecha) === todayStr)
        ).length;

        if (statsCollaborators) statsCollaborators.textContent = todayCount;

        if (collabBadge) {
            if (todayCount > 0) {
                collabBadge.textContent = `+${todayCount}`;
                collabBadge.style.display = 'inline-flex';
            } else {
                collabBadge.style.display = 'none';
            }
        }
    }

    function updateUI() {
        selectedPeriod = getCurrentPeriod(currentDate);
        updateStats();
        renderCalendar();
        if (activePeriodDisplay) activePeriodDisplay.textContent = selectedPeriod;
    }

    function updateStats() {
        // Revert to QUARTERLY stats as requested by user
        const quarter = Math.floor(currentDate.getMonth() / 3) + 1;
        const year = currentDate.getFullYear();
        const activePeriod = `T${quarter} ${year}`;

        const filtered = teletrabajos.filter(t => {
            const d = new Date(t.fecha);
            const tPeriod = `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
            return tPeriod === activePeriod;
        });

        if (statsRequested) {
            const limit = appSettings.maxQuarterlyDays || 30;
            statsRequested.innerHTML = `${filtered.length} <small style="font-size: 0.8rem; opacity: 0.6;">/ ${limit}</small>`;
        }

        if (activePeriodDisplay) {
            activePeriodDisplay.textContent = activePeriod;
        }
    }


    async function deleteTeletrabajo(id) {
        try {
            const response = await fetch(`/teletrabajos/${id}`, { method: 'DELETE' });
            if (response.ok) fetchTeletrabajos();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    }

    function formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }

    function formatDeptCode(code) {
        if (!code) return '-';
        // "6 dígitos los últimos sin contar el último" -> slice(-7, -1)
        if (code.length < 7) return code;
        return code.slice(-7, -1);
    }

    function renderCalendar() {
        calendar.innerHTML = '';
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        monthDisplay.textContent = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(currentDate);

        const firstDayOfMonth = new Date(year, month, 1).getDay();
        // Convert Sunday (0) to 7, so Monday is 1
        const firstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();

        const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
        days.forEach(day => {
            const div = document.createElement('div');
            div.className = 'calendar-day-header';
            div.textContent = day;
            calendar.appendChild(div);
        });

        // Fill previous month days (starting from Monday)
        for (let i = firstDay - 1; i > 0; i--) {
            const div = document.createElement('div');
            div.className = 'calendar-day not-current';
            div.textContent = prevMonthDays - i + 1;
            calendar.appendChild(div);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day';
            div.textContent = i;
            const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            if (teletrabajos.some(t => t.fecha === fullDate)) {
                div.classList.add('selected');

                // Add delete button
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'day-delete-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.title = 'Eliminar solicitud';

                deleteBtn.addEventListener('click', async (e) => {
                    e.stopPropagation(); // Prevent opening modal
                    const record = teletrabajos.find(t => t.fecha === fullDate);
                    if (record) {
                        await deleteTeletrabajo(record.id);
                        showNotification('Día eliminado', 'success');
                    }
                });
                div.appendChild(deleteBtn);
            }

            // Show count of people teleworking this day
            const collaboratingPeople = collaborators.filter(c =>
                c.fechas && c.fechas.some(f => (typeof f === 'string' ? f : f.fecha) === fullDate)
            );

            const count = collaboratingPeople.length;
            if (count > 0) {
                const badge = document.createElement('span');
                badge.className = 'day-count';
                badge.textContent = count;
                div.appendChild(badge);

                // Add tooltip with names and descriptions
                const names = collaboratingPeople.map(c => {
                    const rec = c.fechas.find(f => (typeof f === 'string' ? f : f.fecha) === fullDate);
                    const desc = (rec && typeof rec === 'object' && rec.descripcion) ? ` (${rec.descripcion})` : '';
                    return `${c.nombre}${desc}`;
                }).join(', ');
                div.title = `${count} personas: ${names}`;
            }

            const today = new Date();
            if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) div.classList.add('today');

            div.addEventListener('click', () => {
                document.getElementById('fecha_ini').value = fullDate;
                document.getElementById('fecha_hasta').value = fullDate;
                requestModal.style.display = 'block';
            });
            calendar.appendChild(div);
        }
    }

    function renderStatistics() {
        if (!viewStatistics || viewStatistics.style.display === 'none') return;

        const viewYear = currentDate.getFullYear();
        const viewMonth = currentDate.getMonth();
        const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Calculations from ALL collaborators (Team View)
        const teamRecords = [];
        collaborators.forEach(collab => {
            if (collab.fechas) {
                collab.fechas.forEach(f => {
                    const dateStr = typeof f === 'string' ? f : f.fecha;
                    teamRecords.push({
                        id_usuario: collab.id_usuario,
                        nombre: collab.nombre,
                        fecha: dateStr,
                        dateObj: new Date(dateStr)
                    });
                });
            }
        });

        // KPI: Team Presence Today (In Office)
        const peopleRemoteToday = collaborators.filter(c =>
            c.fechas && c.fechas.some(f => (typeof f === 'string' ? f : f.fecha) === todayStr)
        ).length;
        const totalTeam = collaborators.length || 1;
        const peopleOfficeToday = totalTeam - peopleRemoteToday;
        const presencePercent = Math.round((peopleOfficeToday / totalTeam) * 100);

        if (coverageKpi) coverageKpi.textContent = `${presencePercent}%`;

        // KPI: Total Days current VIEWED Quarter (Team)
        // Calculate based on the viewed month's quarter
        const currentQuarterIndex = Math.floor(viewMonth / 3);
        const quarterRecords = teamRecords.filter(r => {
            return r.dateObj.getFullYear() === viewYear && Math.floor(r.dateObj.getMonth() / 3) === currentQuarterIndex;
        });

        const limitPerPerson = appSettings.maxQuarterlyDays || 30;
        const totalTeamLimit = limitPerPerson * totalTeam;

        if (totalMonthDaysKpi) totalMonthDaysKpi.textContent = `${quarterRecords.length} / ${totalTeamLimit}`;

        // KPI: Top Requested Days List (Monthly for the viewed month)
        // We still need monthRecords for other stats like Density and Top Days
        const monthRecords = teamRecords.filter(r => r.fecha.startsWith(monthKey));
        const dayCounts = {};
        monthRecords.forEach(r => {
            dayCounts[r.fecha] = (dayCounts[r.fecha] || 0) + 1;
        });

        const sortedDays = Object.entries(dayCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        if (topDayKpi) {
            topDayKpi.textContent = sortedDays.length > 0 ? `${formatDate(sortedDays[0][0])}` : '-';
        }

        if (topDaysList) {
            topDaysList.innerHTML = '';
            sortedDays.forEach((d, idx) => {
                const li = document.createElement('li');
                li.className = 'ranking-item';
                li.innerHTML = `
                    <span class="ranking-name">${idx + 1}. ${formatDate(d[0])}</span>
                    <span class="ranking-value">${d[1]} personas</span>
                `;
                topDaysList.appendChild(li);
            });
        }

        // New KPI: Top Remote Workers (Monthly for consistent matching)
        const topMonthlyList = document.getElementById('topRemoteListMonth');
        if (topMonthlyList) {
            topMonthlyList.innerHTML = '';
            const ranking = collaborators
                .map(c => {
                    const monthlyFechas = (c.fechas || []).filter(f => {
                        const dateStr = typeof f === 'string' ? f : f.fecha;
                        return dateStr.startsWith(monthKey);
                    });
                    return { nombre: c.nombre, count: monthlyFechas.length };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 5)
                .filter(r => r.count > 0);

            if (ranking.length === 0) {
                topMonthlyList.innerHTML = '<li class="ranking-item" style="opacity: 0.5; font-size: 0.8rem; justify-content: center;">Sin registros este mes</li>';
            } else {
                ranking.forEach((r, idx) => {
                    const li = document.createElement('li');
                    li.className = 'ranking-item';
                    li.innerHTML = `
                        <span class="ranking-name">${idx + 1}. ${r.nombre}</span>
                        <span class="ranking-value">${r.count} <small>días</small></span>
                    `;
                    topMonthlyList.appendChild(li);
                });
            }
        }

        // KPI: Avg Weekly Days per person (Team)
        const avgWeekly = (monthRecords.length / (totalTeam * 4)).toFixed(1);
        if (avgWeeklyKpi) avgWeeklyKpi.textContent = avgWeekly;

        // 2. Monthly Trend Chart (Yearly Context)
        const monthlyData = Array(12).fill(0);
        teamRecords.forEach(r => {
            if (r.dateObj.getFullYear() === viewYear) {
                monthlyData[r.dateObj.getMonth()]++;
            }
        });

        renderBarChart('monthlyChart', monthlyChart, monthlyData, ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], 'Días del Equipo');

        // 3. Weekday Density Chart
        const weekdayData = Array(5).fill(0); // Mon-Fri
        monthRecords.forEach(r => {
            const day = r.dateObj.getDay();
            if (day >= 1 && day <= 5) weekdayData[day - 1]++;
        });

        renderHorizontalBarChart('weekdayChart', weekdayChart, weekdayData, ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']);

        // 4. Presence Chart (Donut)
        renderDonutChart('presenceChart', presenceChart, [peopleRemoteToday, peopleOfficeToday], ['Remoto', 'Presencial']);

        // 5. Forecast Chart (Next 7 Days)
        const forecastLabels = [];
        const forecastData = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() + i);
            const dStr = d.toISOString().split('T')[0];

            // Format label as "Mon 15", "Tue 16", etc.
            const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
            forecastLabels.push(label);

            const count = collaborators.filter(c =>
                c.fechas && c.fechas.some(f => (typeof f === 'string' ? f : f.fecha) === dStr)
            ).length;
            forecastData.push(count);
        }

        renderAreaChart('forecastChart', forecastChart, forecastData, forecastLabels);

        // 6. Top Remote Workers List (By Quarter)
        const quarters = [
            { id: 'topRemoteListQ1', index: 0 },
            { id: 'topRemoteListQ2', index: 1 },
            { id: 'topRemoteListQ3', index: 2 },
            { id: 'topRemoteListQ4', index: 3 }
        ];

        quarters.forEach(q => {
            const listEl = document.getElementById(q.id);
            if (listEl) {
                listEl.innerHTML = '';
                const ranking = collaborators
                    .map(c => {
                        const quarterlyFechas = (c.fechas || []).filter(f => {
                            const d = new Date(typeof f === 'string' ? f : f.fecha);
                            return d.getFullYear() === viewYear && Math.floor(d.getMonth() / 3) === q.index;
                        });
                        return { nombre: c.nombre, count: quarterlyFechas.length };
                    })
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .filter(r => r.count > 0);

                if (ranking.length === 0) {
                    listEl.innerHTML = '<li class="ranking-item" style="opacity: 0.5; font-size: 0.8rem; justify-content: center;">Sin registros</li>';
                } else {
                    ranking.forEach((r, idx) => {
                        const limit = appSettings.maxQuarterlyDays || 30;
                        const isOverLimit = r.count > limit;
                        const colorStyle = isOverLimit ? 'color: #dc2626; font-weight: bold;' : '';

                        const li = document.createElement('li');
                        li.className = 'ranking-item';
                        if (isOverLimit) li.style.borderLeft = '4px solid #dc2626';

                        li.innerHTML = `
                            <span class="ranking-name" style="${colorStyle}">${idx + 1}. ${r.nombre}</span>
                            <span class="ranking-value" style="${colorStyle}">${r.count} <small>días</small></span>
                        `;
                        listEl.appendChild(li);
                    });
                }
            }
        });
    }

    function renderBarChart(id, chartVar, data, labels, label) {
        const ctx = document.getElementById(id).getContext('2d');
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#FFFFFF' : '#002D34';

        if (id === 'monthlyChart' && monthlyChart) monthlyChart.destroy();

        const newChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: '#00A1DE',
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: textColor,
                        borderColor: '#00A1DE',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { color: textColor, font: { family: 'Lato' } }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Lato' } }
                    }
                }
            }
        });

        if (id === 'monthlyChart') monthlyChart = newChart;
    }

    function renderHorizontalBarChart(id, chartVar, data, labels) {
        const ctx = document.getElementById(id).getContext('2d');
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#FFFFFF' : '#002D34';

        if (weekdayChart) weekdayChart.destroy();

        weekdayChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: '#9CBA39',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: textColor
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { color: textColor, font: { family: 'Lato' } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { family: 'Lato' } }
                    }
                }
            }
        });
    }

    function renderDonutChart(id, chartVar, data, labels) {
        const ctx = document.getElementById(id).getContext('2d');
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#FFFFFF' : '#002D34';

        if (presenceChart) presenceChart.destroy();

        presenceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#00A1DE', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0, 161, 222, 0.1)'],
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0, 161, 222, 0.2)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: textColor,
                            padding: 20,
                            usePointStyle: true,
                            font: {
                                family: 'Lato',
                                size: 12,
                                weight: '600'
                            }
                        }
                    }
                }
            }
        });
    }

    function renderAreaChart(id, chartVar, data, labels) {
        const ctx = document.getElementById(id).getContext('2d');
        const isDark = document.body.classList.contains('dark-mode');
        const textColor = isDark ? '#FFFFFF' : '#002D34';

        if (forecastChart) forecastChart.destroy();

        forecastChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Personas en Remoto',
                    data: data,
                    borderColor: '#8E44AD',
                    backgroundColor: 'rgba(142, 68, 173, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#8E44AD',
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
                        titleColor: textColor,
                        bodyColor: textColor
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        ticks: { color: textColor, stepSize: 1 }
                    },
                    x: {
                        ticks: { color: textColor, font: { size: 10 } }
                    }
                }
            }
        });
    }
});
