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
    const collaboratorsList = document.getElementById('collaboratorsList');
    const themeToggle = document.getElementById('themeToggle');

    // Stats Elements (New PowerBI KPIs)
    const coverageKpi = document.getElementById('coverageKpi');
    const totalMonthDaysKpi = document.getElementById('totalMonthDaysKpi');
    const avgWeeklyKpi = document.getElementById('avgWeeklyKpi');
    const totalYearDaysKpi = document.getElementById('totalYearDaysKpi');
    const topDayKpi = document.getElementById('topDayKpi');
    const topDaysList = document.getElementById('topDaysList');
    const topRemoteList = document.getElementById('topRemoteList');

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
                loginError.style.display = 'block';
            }
        } catch (error) {
            console.error('Login error:', error);
            showNotification('Error de conexión con el servidor', 'error');
        }
    });

    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        localStorage.removeItem('user');
        location.reload();
    });

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
        fetchTeletrabajos();
        renderCalendar();
        updateUI();
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
    prevMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateUI();
    });

    // Navigation Logic
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const view = link.getAttribute('data-view');
            if (!view) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            if (view === 'dashboard') {
                if (viewDashboard) viewDashboard.style.display = 'block';
                if (viewCollaborators) viewCollaborators.style.display = 'none';
                if (viewStatistics) viewStatistics.style.display = 'none';
                updateStaticProfileInfo();
                updateUI();
            } else if (view === 'collaborators') {
                if (viewDashboard) viewDashboard.style.display = 'none';
                if (viewCollaborators) viewCollaborators.style.display = 'block';
                if (viewStatistics) viewStatistics.style.display = 'none';
                fetchCollaborators();
            } else if (view === 'statistics') {
                if (viewDashboard) viewDashboard.style.display = 'none';
                if (viewCollaborators) viewCollaborators.style.display = 'none';
                if (viewStatistics) viewStatistics.style.display = 'block';
                renderStatistics();
            }
        });
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateUI();
    });

    newRequestBtn.addEventListener('click', () => {
        requestModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        requestModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === requestModal) requestModal.style.display = 'none';
    });

    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(requestForm);
        const data = Object.fromEntries(formData.entries());

        const start = new Date(data.fecha_ini);
        const end = new Date(data.fecha_hasta);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            showNotification('Selecciona fechas válidas', 'error');
            return;
        }

        const requests = [];
        let current = new Date(start);

        while (current <= end) {
            // Check if it's a weekend (optional, but usually desired for telework)
            // If user wants ALL days, we send all.
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
            const responses = await Promise.all(requests);
            const allOk = responses.every(r => r.ok);

            if (allOk) {
                requestModal.style.display = 'none';
                requestForm.reset();
                fetchTeletrabajos();
                showNotification(`Solicitud(es) enviada(s): ${requests.length} día(s)`);
            } else {
                showNotification('Algunas solicitudes fallaron', 'error');
                fetchTeletrabajos();
            }
        } catch (error) {
            console.error('Error:', error);
            showNotification('Error de red al enviar la solicitud', 'error');
        }
    });

    async function fetchTeletrabajos() {
        try {
            const response = await fetch('/teletrabajos/');
            if (response.ok) {
                const allData = await response.json();
                teletrabajos = allData.filter(t => t.id_usuario === currentUser.id);

                // If currentUser is missing profile data, pick it up from first record
                if (teletrabajos.length > 0 && (!currentUser.departamento || !currentUser.deptonomi)) {
                    currentUser.departamento = teletrabajos[0].departamento;
                    currentUser.cod_dep = teletrabajos[0].cod_dep;
                    currentUser.deptonomi = teletrabajos[0].cod_dep; // Corrected: cod_dep is the raw deptonomi from CRUD
                    currentUser.nivel = teletrabajos[0].nivel;
                    localStorage.setItem('user', JSON.stringify(currentUser));

                    updateStaticProfileInfo();
                }

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
        const filtered = teletrabajos.filter(t => (t.periodo || getCurrentPeriod(new Date(t.fecha))) === selectedPeriod);
        statsRequested.textContent = filtered.length;
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

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const todayStr = now.toISOString().split('T')[0];

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
                        descripcion: typeof f === 'object' ? f.descripcion : '',
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

        // KPI: Total Days current Month (Team)
        const monthRecords = teamRecords.filter(r => r.dateObj.getMonth() === currentMonth && r.dateObj.getFullYear() === currentYear);
        if (totalMonthDaysKpi) totalMonthDaysKpi.textContent = monthRecords.length;

        // KPI: Top Requested Days List (Team)
        const dayCounts = {};
        teamRecords.forEach(r => {
            if (r.dateObj.getFullYear() === currentYear) {
                dayCounts[r.fecha] = (dayCounts[r.fecha] || 0) + 1;
            }
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

        // KPI: Avg Weekly Days per person (Team)
        // Hardcoded estimation: days / 4 weeks / team size
        const avgWeekly = (monthRecords.length / (totalTeam * 4)).toFixed(1);
        if (avgWeeklyKpi) avgWeeklyKpi.textContent = avgWeekly;

        // 2. Monthly Trend Chart
        const monthlyData = Array(12).fill(0);
        teamRecords.forEach(r => {
            if (r.dateObj.getFullYear() === currentYear) {
                monthlyData[r.dateObj.getMonth()]++;
            }
        });

        renderBarChart('monthlyChart', monthlyChart, monthlyData, ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'], 'Días del Equipo');

        // 3. Weekday Density Chart
        const weekdayData = Array(5).fill(0); // Mon-Fri
        teamRecords.forEach(r => {
            const day = r.dateObj.getDay(); // 0 is Sunday
            if (day >= 1 && day <= 5) {
                weekdayData[day - 1]++;
            }
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

        // 6. Top Remote Workers List (Quarterly)
        if (topRemoteList) {
            topRemoteList.innerHTML = '';
            const currentQuarter = Math.floor(currentMonth / 3);

            const ranking = collaborators
                .map(c => {
                    const quarterlyFechas = (c.fechas || []).filter(f => {
                        const d = new Date(typeof f === 'string' ? f : f.fecha);
                        return d.getFullYear() === currentYear && Math.floor(d.getMonth() / 3) === currentQuarter;
                    });
                    return { nombre: c.nombre, count: quarterlyFechas.length };
                })
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            ranking.forEach((r, idx) => {
                const li = document.createElement('li');
                li.className = 'ranking-item';
                li.innerHTML = `
                    <span class="ranking-name">${idx + 1}. ${r.nombre}</span>
                    <span class="ranking-value">${r.count} días</span>
                `;
                topRemoteList.appendChild(li);
            });
        }
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
