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
        automation: document.getElementById('view-automation'),
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
    document.getElementById('nav-automation').addEventListener('click', () => show('automation'));
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
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Excluir';
                deleteBtn.addEventListener('click', () => deleteClient(c.id));
                actionsTd.appendChild(toggleBtn);
                actionsTd.appendChild(editBtn);
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

    document.querySelectorAll('.btn-add-step').forEach(btn => {
        btn.addEventListener('click', () => addStep(btn.dataset.stepType));
    });

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

// ----- Automation Builder Functions (global) -----
let stepCounter = 0;

function addStep(type) {
    stepCounter++;
    const container = document.getElementById('steps-container');
    const stepCard = document.createElement('div');
    stepCard.className = 'automation-step';
    stepCard.id = `step-${stepCounter}`;
    stepCard.dataset.type = type;
    stepCard.innerHTML = `
        <div class="step-header">
            <h5>Passo <span class="step-order-number"></span>: ${capitalize(type)}</h5>
            <div class="step-controls">
                <button type="button" class="btn btn-light btn-sm btn-move-up">▲</button>
                <button type="button" class="btn btn-light btn-sm btn-move-down">▼</button>
                <button type="button" class="btn btn-danger btn-sm btn-remove">×</button>
            </div>
        </div>
        <div class="form-group">
            <label>${type === 'texto' ? 'Mensagem de Texto' : 'Legenda (opcional)'}</label>
            <textarea class="form-control step-text-content" rows="3"></textarea>
        </div>
        <div class="form-group step-file-content" style="display: ${type === 'texto' ? 'none' : 'block'};">
            <label>Selecione o arquivo</label>
            <input type="file" class="form-control-file step-file-input">
            <div class="file-name-display"></div>
        </div>
    `;
    container.appendChild(stepCard);

    const btnUp = stepCard.querySelector('.btn-move-up');
    if (btnUp) btnUp.addEventListener('click', () => moveStep(btnUp, 'up'));
    const btnDown = stepCard.querySelector('.btn-move-down');
    if (btnDown) btnDown.addEventListener('click', () => moveStep(btnDown, 'down'));
    const btnRemove = stepCard.querySelector('.btn-remove');
    if (btnRemove) btnRemove.addEventListener('click', () => removeStep(btnRemove));
    const fileInput = stepCard.querySelector('.step-file-input');
    if (fileInput) fileInput.addEventListener('change', () => displayFileName(fileInput));

    updateStepNumbers();
}

function removeStep(buttonElement) {
    buttonElement.closest('.automation-step').remove();
    updateStepNumbers();
}

function moveStep(buttonElement, direction) {
    const stepCard = buttonElement.closest('.automation-step');
    const container = stepCard.parentNode;
    if (direction === 'up') {
        const previousSibling = stepCard.previousElementSibling;
        if (previousSibling) container.insertBefore(stepCard, previousSibling);
    } else {
        const nextSibling = stepCard.nextElementSibling;
        if (nextSibling) container.insertBefore(nextSibling, stepCard);
    }
    updateStepNumbers();
}

function displayFileName(inputElement) {
    const fileNameDisplay = inputElement.nextElementSibling;
    if (inputElement.files.length > 0) {
        fileNameDisplay.textContent = `Arquivo selecionado: ${inputElement.files[0].name}`;
    } else {
        fileNameDisplay.textContent = '';
    }
}

function updateStepNumbers() {
    const allSteps = document.querySelectorAll('#steps-container .automation-step');
    allSteps.forEach((step, index) => {
        const orderSpan = step.querySelector('.step-order-number');
        if (orderSpan) {
            orderSpan.textContent = index + 1;
        }
        step.dataset.order = index + 1;
    });
}

function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
}

