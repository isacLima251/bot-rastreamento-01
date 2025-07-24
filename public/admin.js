document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) { window.location.href = '/login'; return; }

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
                window.location.href = '/login';
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
        if (views[view]) {
            views[view].classList.remove('hidden');
        }
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        const nav = document.getElementById('nav-' + view);
        if (nav) nav.classList.add('active');
    }

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.id.replace('nav-', '');
            show(target);
        });
    });

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
                    const card = document.createElement('div');
                    card.className = 'dashboard-card';
                    card.innerHTML = `<h3>${p.name}</h3><p>${p.count}</p>`;
                    plansDiv.appendChild(card);
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
                    const detailsBtn = document.createElement('button');
                    detailsBtn.textContent = 'Ver Detalhes';
                    detailsBtn.addEventListener('click', () => viewDetails(c.id));
                    const loginAsBtn = document.createElement('button');
                    loginAsBtn.textContent = 'Entrar como';
                    loginAsBtn.addEventListener('click', () => loginAs(c.id));
                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Excluir';
                    deleteBtn.addEventListener('click', () => deleteClient(c.id));
                    actionsTd.appendChild(toggleBtn);
                    actionsTd.appendChild(editBtn);
                    actionsTd.appendChild(detailsBtn);
                    actionsTd.appendChild(loginAsBtn);
                    actionsTd.appendChild(deleteBtn);
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

    function deleteClient(id) {
        if (!confirm('Deseja realmente excluir este cliente?')) return;
        authFetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
            .then(() => loadClients());
    }

    function viewDetails(id) {
        alert('Funcionalidade em desenvolvimento.');
    }

    function loginAs(id) {
        authFetch(`/api/admin/login-as/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    window.location.href = '/painel';
                }
            });
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

    // Função utilitária para adicionar mensagens no chat
    window.appendMessage = function({ remetente, mensagem, mediaUrl, mediaType }) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        if (remetente) messageElement.classList.add(remetente);

        if (mediaUrl) {
            if (mediaType && mediaType.startsWith('image')) {
                const img = document.createElement('img');
                img.src = mediaUrl;
                img.classList.add('chat-media');
                messageElement.appendChild(img);
            } else if (mediaType && mediaType.startsWith('audio')) {
                const audio = document.createElement('audio');
                audio.controls = true;
                audio.src = mediaUrl;
                messageElement.appendChild(audio);
            } else if (mediaType && mediaType.startsWith('video')) {
                const video = document.createElement('video');
                video.controls = true;
                video.src = mediaUrl;
                video.classList.add('chat-media');
                messageElement.appendChild(video);
            } else {
                const link = document.createElement('a');
                link.href = mediaUrl;
                link.textContent = 'Download';
                link.target = '_blank';
                messageElement.appendChild(link);
            }
        }

        if (mensagem) {
            const p = document.createElement('p');
            p.textContent = mensagem;
            messageElement.appendChild(p);
        }

        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

});


