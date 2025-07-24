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

    function loadDetails() {
        authFetch(`/api/admin/clients/${id}`)
            .then(r => r.json())
            .then(data => {
                emailEl.textContent = data.client.email;
                toggleBtn.textContent = data.client.is_active ? 'Desativar Conta' : 'Ativar Conta';
                if (data.subscription) {
                    const limite = data.subscription.monthly_limit || 0;
                    const uso = data.subscription.usage || 0;
                    subInfoEl.textContent = `Plano: ${data.subscription.plan_name} — Status: ${data.subscription.status} — Uso: ${uso} / ${limite}`;
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

    loadDetails();
});
