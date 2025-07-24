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

    const icons = {
        edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zM5.386 13.368a.5.5 0 0 1 .211-.315l5-2a.5.5 0 0 1 .683.683l-2 5a.5.5 0 0 1-.315.211l-5 2a.5.5 0 0 1-.683-.683l2-5z"/></svg>`,
        delete: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>`
    };

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

                const plansBody = document.getElementById('plans-stats-body');
                plansBody.innerHTML = '';
                data.activeByPlan.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${p.name}</td><td>${p.count}</td>`;
                    plansBody.appendChild(tr);
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
                    tr.innerHTML = `
                        <td>${c.email}</td>
                        <td><span class="status-badge ${c.is_active ? 'active' : 'inactive'}">${c.is_active ? 'Ativo' : 'Inativo'}</span></td>
                        <td>${c.requests}</td>
                    `;

                    const actionsTd = document.createElement('td');
                    actionsTd.classList.add('actions-cell');
                    actionsTd.innerHTML = `
                        <button class="btn-icon btn-edit" title="Editar">${icons.edit}</button>
                        <button class="btn-icon btn-delete" title="Excluir">${icons.delete}</button>
                    `;

                    actionsTd.querySelector('.btn-edit').addEventListener('click', () => openModal(c));
                    actionsTd.querySelector('.btn-delete').addEventListener('click', () => deleteClient(c.id));

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


