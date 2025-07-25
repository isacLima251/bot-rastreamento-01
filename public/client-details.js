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

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (!id) { window.location.href = '/admin'; return; }

    const emailEl = document.getElementById('client-email');
    const subInfoEl = document.getElementById('subscription-info');
    const renewalEl = document.getElementById('renewal-date');
    const usageBar = document.getElementById('usage-bar');
    const toggleBtn = document.getElementById('toggle-active-btn');
    const planModal = document.getElementById('plan-modal');
    const planSelect = document.getElementById('plan-select');

    function loadDetails() {
        authFetch(`/api/admin/clients/${id}`)
            .then(r => r.json())
            .then(data => {
                emailEl.textContent = data.client.email;
                toggleBtn.textContent = data.client.is_active ? 'Desativar Conta' : 'Ativar Conta';
                if (data.subscription) {
                    const limite = data.subscription.monthly_limit || 0;
                    const uso = data.subscription.usage || 0;
                    const preco = data.subscription.price != null ? parseFloat(data.subscription.price).toFixed(2) : '0.00';
                    subInfoEl.textContent = `Plano: ${data.subscription.plan_name} - R$${preco} — Limite: ${limite} — Status: ${data.subscription.status} — Uso: ${uso}/${limite}`;
                    const perc = limite ? Math.min(100, (uso / limite) * 100) : 0;
                    usageBar.style.width = perc + '%';
                    renewalEl.textContent = data.subscription.renewal_date ? 'Renova em: ' + data.subscription.renewal_date : '';
                }

                const ordersBody = document.querySelector('#orders-table tbody');
                ordersBody.innerHTML = '';
                data.pedidos.forEach(p => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${p.codigoRastreio || ''}</td><td>${p.statusInterno || ''}</td>`;
                    ordersBody.appendChild(tr);
                });

                const logsBody = document.querySelector('#logs-table tbody');
                logsBody.innerHTML = '';
                data.logs.forEach(l => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `<td>${l.acao}</td><td>${l.data_criacao}</td>`;
                    logsBody.appendChild(tr);
                });
            });
    }

    document.getElementById('impersonate-btn').addEventListener('click', () => {
        authFetch(`/api/admin/login-as/${id}`)
            .then(r => r.json())
            .then(data => {
                if (data.token) {
                    localStorage.setItem('token', data.token);
                    window.location.href = '/painel';
                }
            });
    });

    toggleBtn.addEventListener('click', () => {
        const active = toggleBtn.textContent.includes('Desativar');
        authFetch(`/api/admin/clients/${id}/active`, { method: 'PUT', body: { active: active ? 0 : 1 } })
            .then(() => loadDetails());
    });

    document.getElementById('delete-btn').addEventListener('click', () => {
        if (!confirm('Deseja realmente excluir este cliente?')) return;
        authFetch(`/api/admin/clients/${id}`, { method: 'DELETE' })
            .then(() => { window.location.href = '/admin'; });
    });

    document.getElementById('change-plan-btn').addEventListener('click', () => {
        authFetch('/api/plans')
            .then(r => r.json())
            .then(data => {
                planSelect.innerHTML = '';
                (data.data || []).forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.textContent = `${p.name} - R$${p.price}`;
                    planSelect.appendChild(opt);
                });
                planModal.classList.add('active');
            });
    });

    document.getElementById('plan-cancel').addEventListener('click', () => {
        planModal.classList.remove('active');
    });

    document.getElementById('plan-save').addEventListener('click', () => {
        const planId = parseInt(planSelect.value);
        if (!planId) return;
        authFetch(`/api/admin/clients/${id}`, { method: 'PUT', body: { plan_id: planId } })
            .then(() => { planModal.classList.remove('active'); loadDetails(); });
    });

    document.getElementById('adjust-usage-btn').addEventListener('click', () => {
        const novo = prompt('Novo valor de uso:');
        if (novo === null) return;
        const val = parseInt(novo);
        if (isNaN(val)) return alert('Valor inválido');
        authFetch(`/api/admin/clients/${id}/usage`, { method: 'PUT', body: { usage: val } })
            .then(() => loadDetails());
    });

    loadDetails();
});
