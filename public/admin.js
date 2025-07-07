document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login.html'; return; }

    const authFetch = (url, options = {}) => {
        options.headers = options.headers || {};
        options.headers['Authorization'] = `Bearer ${token}`;
        if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(options.body);
        }
        return fetch(url, options).then(resp => {
            if (resp.status === 401) {
                localStorage.removeItem('token');
                window.location.href = '/login.html';
            }
            return resp;
        });
    };

    const views = {
        dashboard: document.getElementById('view-dashboard'),
        clients: document.getElementById('view-clients'),
        config: document.getElementById('view-config')
    };

    function show(view) {
        Object.values(views).forEach(v => v.classList.add('hidden'));
        views[view].classList.remove('hidden');
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('nav-' + view).classList.add('active');
    }

    document.getElementById('nav-dashboard').addEventListener('click', () => show('dashboard'));
    document.getElementById('nav-clients').addEventListener('click', () => show('clients'));
    document.getElementById('nav-config').addEventListener('click', () => show('config'));

    const plansSelect = document.getElementById('client-plan');
    let plans = [];
    let editingId = null;

    function loadPlans() {
        authFetch('/api/plans')
            .then(r => r.json())
            .then(data => {
                plans = data.data || [];
                plansSelect.innerHTML = '';
                plans.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = p.name + ' - R$' + p.price;
                    plansSelect.appendChild(opt);
                });
            });
    }

    function fetchStats() {
        authFetch('/api/admin/stats')
            .then(r => r.json())
            .then(data => {
                document.getElementById('total-users').textContent = data.totalUsers;
                document.getElementById('mrr').textContent = data.mrr.toFixed(2);
                const plansDiv = document.getElementById('plans-stats');
                plansDiv.innerHTML = '';
                data.activeByPlan.forEach(p => {
                    const div = document.createElement('div');
                    div.textContent = `${p.name}: ${p.count}`;
                    plansDiv.appendChild(div);
                });
            });
    }

    function loadClients() {
        authFetch('/api/admin/clients')
            .then(r => r.json())
            .then(data => {
                const tbody = document.querySelector('#clients-table tbody');
                tbody.innerHTML = '';
                data.clients.forEach(c => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${c.email}</td><td>${c.is_active ? 'Sim' : 'Não'}</td><td>${c.requests}</td>`;
                    const actionsTd = document.createElement('td');
                    const toggleBtn = document.createElement('button');
                    toggleBtn.textContent = c.is_active ? 'Desativar' : 'Ativar';
                    toggleBtn.addEventListener('click', () => toggleActive(c.id, !c.is_active));
                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Editar';
                    editBtn.addEventListener('click', () => openModal(c));
                    actionsTd.appendChild(toggleBtn);
                    actionsTd.appendChild(editBtn);
                    tr.appendChild(actionsTd);
                    tbody.appendChild(tr);
                });
            });
    }

    function toggleActive(id, active) {
        authFetch(`/api/admin/clients/${id}/active`, { method: 'PUT', body: { active } })
            .then(() => loadClients());
    }

    function openModal(client) {
        editingId = client ? client.id : null;
        document.getElementById('modal-title').textContent = client ? 'Editar Cliente' : 'Novo Cliente';
        document.getElementById('client-email').value = client ? client.email : '';
        document.getElementById('client-password').value = '';
        if (client && client.plan_id) plansSelect.value = client.plan_id;
        document.getElementById('client-modal').classList.add('active');
    }

    document.getElementById('btn-new-client').addEventListener('click', () => openModal(null));
    document.getElementById('modal-cancel').addEventListener('click', () => {
        document.getElementById('client-modal').classList.remove('active');
    });

    document.getElementById('client-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const body = {
            email: document.getElementById('client-email').value,
            password: document.getElementById('client-password').value,
            plan_id: parseInt(plansSelect.value)
        };
        if (editingId) {
            authFetch(`/api/admin/clients/${editingId}`, { method: 'PUT', body })
                .then(() => { loadClients(); document.getElementById('client-modal').classList.remove('active'); });
        } else {
            authFetch('/api/admin/clients', { method: 'POST', body })
                .then(() => { loadClients(); document.getElementById('client-modal').classList.remove('active'); });
        }
    });

    loadPlans();
    fetchStats();
    loadClients();
});
