document.addEventListener('DOMContentLoaded', () => {
const token = localStorage.getItem('token');
if (!token) { window.location.href = '/login.html'; return; }
function parseJwt(t){try{return JSON.parse(atob(t.split('.')[1]));}catch(e){return {};}}
const userData = parseJwt(token);
if (userData.precisa_trocar_senha) {
    window.location.href = '/change-password.html';
    return;
}
const showUpgradeModal = () => { if(modalUpgradeEl) modalUpgradeEl.classList.add('active'); };
const authFetch = async (url, options = {}) => {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, options);
    if (resp.status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login.html';
    }
    if (resp.status === 403) {
        try {
            const data = await resp.clone().json();
            if (data.error && data.error.includes('Limite do plano excedido')) {
                showUpgradeModal();
            }
        } catch (e) { /* ignore */ }
    }
    return resp;
};
    // --- 1. Seletores de Elementos ---
    const mainNavEl = document.querySelector('.main-nav');
    const viewContainers = document.querySelectorAll('.view-container');
    const listaContactosEl = document.getElementById('lista-contactos');
    const listaContactosCompletaEl = document.getElementById('lista-contactos-completa');
    const totalContactsCountEl = document.getElementById('total-contacts-count');
    const barraBuscaContatosEl = document.getElementById('barra-busca-contatos');
    const contactsPaginationEl = document.getElementById('contacts-pagination');
    const mainContentAreaEl = document.getElementById('main-content-area');
    const chatWindowEl = document.getElementById('chat-window');
    const chatFooterEl = document.getElementById('chat-footer');
    const detailsPanelEl = document.getElementById('details-panel');
    const barraBuscaEl = document.getElementById('barra-busca');
    const btnAdicionarNovoEl = document.getElementById('btn-adicionar-novo');
    const modalPedidoEl = document.getElementById('modal-pedido');
    const formPedidoEl = document.getElementById('form-pedido');
    const modalTituloEl = document.getElementById('modal-titulo');
    const btnModalCancelarEl = document.getElementById('btn-modal-cancelar');
    const formEnviarMensagemEl = document.getElementById('form-enviar-mensagem');
    const notificacaoEl = document.getElementById('notificacao');
    const notificacaoTextoEl = document.getElementById('notificacao-texto');
    const notificacaoIconEl = document.getElementById('notificacao-icon');
    const notificacaoCloseBtnEl = document.getElementById('notificacao-close-btn');
    const filterContainerEl = document.getElementById('filter-container');
    const btnSalvarAutomacoesEl = document.getElementById('btn-salvar-automacoes');
    const connectionStatusEl = document.getElementById('connection-status');
    const connectionStatusTextEl = document.getElementById('connection-status-text');
    const statusBotInfoEl = document.getElementById('status-bot-info');
    const botAvatarImgEl = document.getElementById('bot-avatar-img');
    const botAvatarContainerEl = document.getElementById('bot-avatar-container');
    const loggedUserEl = document.getElementById('logged-user');
    const qrCodeContainerEl = document.getElementById('qr-code-container');
    const btnConectarEl = document.getElementById('btn-conectar');
    const btnDesconectarEl = document.getElementById('btn-desconectar');
    const settingsProfileInfoEl = document.getElementById('settings-profile-info');
    const settingsBotAvatarEl = document.getElementById('settings-bot-avatar');
    const settingsBotNameEl = document.getElementById('settings-bot-name');
    const settingsBotNumberEl = document.getElementById('settings-bot-number');
    const settingsConnectionStatusEl = document.getElementById('settings-connection-status');
    const settingsStatusTextEl = document.getElementById('settings-status-text');
    const webhookUrlDisplayEl = document.getElementById('webhook-url-display');
    const btnCopyWebhookEl = document.getElementById('btn-copy-webhook');
    const btnRegenerateWebhookEl = document.getElementById('btn-regenerate-webhook');
    const inputPostbackSecretEl = document.getElementById('input-postback-secret');
    const btnSavePostbackSecretEl = document.getElementById('btn-save-postback-secret');
    const logoutBtnEl = document.getElementById('logout-btn');
    const modalConfirmacaoEl = document.getElementById('modal-confirmacao');
    const modalConfirmacaoTextoEl = document.getElementById('modal-confirmacao-texto');
    const btnConfirmacaoCancelarEl = document.getElementById('btn-confirmacao-cancelar');
    const btnConfirmacaoConfirmarEl = document.getElementById('btn-confirmacao-confirmar');
    const newContactsChartCanvas = document.getElementById('new-contacts-chart');
    const statusPieChartCanvas = document.getElementById('status-pie-chart');
    const billingTableBodyEl = document.getElementById('billing-table-body');
    const billingSummaryEl = document.getElementById('billing-summary');
    const integrationHistoryBodyEl = document.getElementById('integration-history-body');
    const integrationPaginationEl = document.getElementById('integration-pagination');
    const toggleCreateContactEl = document.getElementById('toggle-create-contact');
    const toggleCreateContactLabelEl = document.getElementById('toggle-create-contact-label');
    const plansListEl = document.getElementById('plans-list');
const modalUpgradeEl = document.getElementById('modal-upgrade');
const btnUpgradePlansEl = document.getElementById('btn-upgrade-plans');
const planStatusEl = document.getElementById('plan-status');
const btnImportarCsv = document.getElementById('btn-importar-csv');
const csvFileInput = document.getElementById('csv-file-input');
const btnAddIntegration = document.getElementById('btn-add-integration');
const modalPlatformSelect = document.getElementById('modal-platform-select');
const btnClosePlatformModal = document.getElementById('btn-close-platform-modal');
const platformGrid = document.getElementById('platform-grid');
const btnCopySetupWebhook = document.getElementById('btn-copy-setup-webhook');
    if (loggedUserEl) loggedUserEl.textContent = userData.email || 'Usuário';

    const variableTooltips = {
        '{{link_rastreio}}': 'Insere o link completo e clicável para a página de rastreamento dos Correios.',
        '{{status_rastreio}}': "Mostra o status resumido do rastreamento (Ex: 'A caminho', 'Entregue', 'Postado').",
        '{{cidade_etapa_origem}}': 'Mostra a cidade de ONDE o pacote saiu na última movimentação registrada pelos Correios.',
        '{{cidade_etapa_destino}}': 'Mostra a cidade para ONDE o pacote está indo na última movimentação registrada.',
        '{{data_postagem_formatada}}': 'A data em que o pedido foi postado, no formato dd/mm/aaaa.',
        '{{data_atualizacao_formatada}}': 'A data e a hora da última atualização do rastreio, no formato dd/mm/aaaa HH:mm.'
    };

    // --- 2. Estado da Aplicação ---
    let todosOsPedidos = [];
    let pedidoAtivoId = null;
    let debounceTimer;
    let notificacaoTimer;
    let currentWhatsappStatus = 'DISCONNECTED';
    let qrCodeTimer = null;
    let filtroAtivo = 'todos';
    let contactsChart = null;
    let statusChart = null;
    let integrationCurrentPage = 1;
    const integrationLimit = 5;
    let contactsCurrentPage = 1;
    const contactsLimit = 10;
    let contactsTotal = 0;
    let integrationsCache = [];


     const accordionHeaders = document.querySelectorAll('.accordion-header');
    if (accordionHeaders.length > 0) {
        accordionHeaders.forEach(header => {
            header.addEventListener('click', () => {
                header.classList.toggle('active');
                const content = header.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });
    }
     const variablesToCopy = document.querySelectorAll('.variable-highlight');
    if (variablesToCopy.length > 0) {
        variablesToCopy.forEach(variable => {
            variable.addEventListener('click', (e) => {
                e.stopPropagation(); // Impede que o clique na variável feche o menu
                
                const valueToCopy = variable.dataset.value;
                if(valueToCopy && navigator.clipboard) {
                     navigator.clipboard.writeText(valueToCopy).then(() => {
                        // Opcional: Adicionar um feedback visual "Copiado!"
                        const originalText = variable.querySelector('span').textContent;
                        variable.querySelector('span').textContent = 'Copiado!';
                        setTimeout(() => {
                             variable.querySelector('span').textContent = originalText;
                        }, 1500);
                     });
                }
            });
        });
    }


    


    // --- 3. Funções de UI e Notificação ---
    const showNotification = (message, type = 'success') => {
        if (!notificacaoEl) return;
        clearTimeout(notificacaoTimer);
        const iconMap = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`
        };
        notificacaoEl.classList.remove('show', 'error', 'success');
        if (notificacaoIconEl) notificacaoIconEl.innerHTML = iconMap[type] || '';
        if (notificacaoTextoEl) notificacaoTextoEl.textContent = message;
        notificacaoEl.classList.add(type);
        void notificacaoEl.offsetWidth; 
        notificacaoEl.classList.add('show');
        notificacaoTimer = setTimeout(() => {
            notificacaoEl.classList.remove('show');
        }, 5000);
    };
   
    function showView(viewId) {
        if (!viewContainers || !mainNavEl) return;
        viewContainers.forEach(view => view.classList.add('hidden'));
        const activeView = document.getElementById(viewId);
        if (activeView) activeView.classList.remove('hidden');

        mainNavEl.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.view === viewId) btn.classList.add('active');
        });

        if (viewId === 'contacts-view') loadContacts();
        if (viewId === 'automations-view') loadAutomations();
        if (viewId === 'integrations-view') {
            showIntegrationsList();
            loadIntegrationInfo();
            loadIntegrationHistory();
            loadAndRenderIntegrations();
        }
        if (viewId === 'settings-view') loadUserSettings();
        if (viewId === 'reports-view') loadReportData();
        if (viewId === 'logs-view') loadBillingHistory();
        if (viewId === 'plans-view') loadPlans();
    }

    const showConfirmationModal = (message, onConfirm) => {
        if (!modalConfirmacaoEl || !modalConfirmacaoTextoEl || !btnConfirmacaoConfirmarEl || !btnConfirmacaoCancelarEl) return;
        
        modalConfirmacaoTextoEl.textContent = message;
        modalConfirmacaoEl.classList.add('active');
        
        const handleConfirm = () => {
            onConfirm();
            closeConfirmationModal();
        };

        const closeConfirmationModal = () => {
            modalConfirmacaoEl.classList.remove('active');
            btnConfirmacaoConfirmarEl.removeEventListener('click', handleConfirm);
            btnConfirmacaoCancelarEl.removeEventListener('click', closeConfirmationModal);
        };

        btnConfirmacaoConfirmarEl.addEventListener('click', handleConfirm, { once: true });
        btnConfirmacaoCancelarEl.addEventListener('click', closeConfirmationModal, { once: true });
    };

    function highlightVariables(textarea) {
        if (!textarea) return;
        const text = textarea.value;
        const backdrop = textarea.previousElementSibling;
        if (!backdrop) return;
        
        const highlightedText = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/{{(.*?)}}/g, (match, p1) => {
                const key = `{{${p1}}}`;
                const tooltip = variableTooltips[key];
                const tooltipAttr = tooltip ? ` data-tooltip="${tooltip.replace(/"/g, '&quot;')}"` : '';
                return `<span class="variable-highlight"${tooltipAttr}>{{${p1}}}</span>`;
            });
        
        backdrop.innerHTML = highlightedText; 
        backdrop.scrollTop = textarea.scrollTop;
    }

    function updateStatusUI(status, data = {}) {
        clearTimeout(qrCodeTimer);
        currentWhatsappStatus = status;
        const statusMap = { DISCONNECTED: 'Desconectado', CONNECTING: 'A conectar...', CONNECTED: 'Conectado', QR_CODE: 'Aguardando QR Code' };
        const statusText = statusMap[status] || 'Desconhecido';
        
        if (settingsProfileInfoEl) settingsProfileInfoEl.classList.add('hidden');
        if (settingsConnectionStatusEl) settingsConnectionStatusEl.classList.add('hidden');
        if (qrCodeContainerEl) qrCodeContainerEl.innerHTML = '';
        if (connectionStatusEl) {
            connectionStatusEl.className = 'status-indicator';
            connectionStatusEl.classList.add(status.toLowerCase());
        }
        if (connectionStatusTextEl) connectionStatusTextEl.textContent = statusText;
        if (statusBotInfoEl) statusBotInfoEl.textContent = '';
        if (botAvatarImgEl) botAvatarImgEl.src = 'https://i.imgur.com/z28n3Nz.png';
        if (botAvatarContainerEl) botAvatarContainerEl.classList.add('hidden');
        if (status === 'CONNECTED' && data.botInfo) {
            if (statusBotInfoEl) statusBotInfoEl.textContent = `${data.botInfo.nome} - ${data.botInfo.numero}`;
            if (botAvatarImgEl && data.botInfo.fotoUrl) botAvatarImgEl.src = data.botInfo.fotoUrl;
            if (botAvatarContainerEl) botAvatarContainerEl.classList.remove('hidden');
        }

        if (status === 'QR_CODE' && data.qrCode) {
            if (settingsConnectionStatusEl) settingsConnectionStatusEl.classList.remove('hidden');
            if (settingsStatusTextEl) settingsStatusTextEl.textContent = 'Aguardando QR Code';
            if (qrCodeContainerEl) qrCodeContainerEl.innerHTML = `<p>Escaneie o QR Code com seu celular:</p><img src="${data.qrCode}" alt="QR Code do WhatsApp">`;
            qrCodeTimer = setTimeout(() => {
                if (currentWhatsappStatus === 'QR_CODE' && qrCodeContainerEl) {
                    qrCodeContainerEl.innerHTML = `<div class="qr-expired"><p>O QR Code expirou!</p><button id="btn-regenerate-qr" class="btn-settings-action connect">Gerar Novo QR Code</button></div>`;
                }
            }, 45000);
        } else if (status === 'CONNECTED' && data.botInfo) {
            if (settingsProfileInfoEl) settingsProfileInfoEl.classList.remove('hidden');
            if (settingsBotAvatarEl) {
                settingsBotAvatarEl.src = data.botInfo.fotoUrl || 'https://i.imgur.com/z28n3Nz.png';
                settingsBotAvatarEl.onerror = () => { settingsBotAvatarEl.src = 'https://i.imgur.com/z28n3Nz.png'; };
            }
            if (settingsBotNameEl) settingsBotNameEl.textContent = data.botInfo.nome || 'Nome não encontrado';
            if (settingsBotNumberEl) settingsBotNumberEl.textContent = data.botInfo.numero;
        } else {
            if (settingsConnectionStatusEl) settingsConnectionStatusEl.classList.remove('hidden');
            if (settingsStatusTextEl) settingsStatusTextEl.textContent = statusText;
        }
        if (btnConectarEl) btnConectarEl.style.display = (status === 'DISCONNECTED') ? 'inline-block' : 'none';
        if (btnDesconectarEl) btnDesconectarEl.style.display = (status === 'CONNECTED') ? 'inline-block' : 'none';
    }

    const connectWebSocket = () => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const ws = new WebSocket(`${wsProtocol}://${window.location.host}`);
        ws.onopen = () => console.log('🔗 Conexão WebSocket estabelecida.');
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'nova_mensagem' || data.type === 'novo_contato' || data.type === 'pedido_atualizado') {
                fetchErenderizarTudo();
                if (data.type === 'nova_mensagem' && pedidoAtivoId && data.pedidoId === pedidoAtivoId) {
                    const pedido = todosOsPedidos.find(p => p.id === pedidoAtivoId);
                    if (pedido) selecionarPedidoErenderizarDetalhes(pedido);
                }
            } else if (data.type === 'status_update') {
                updateStatusUI(data.status, data);
            }
        };
        ws.onclose = () => {
            console.log('🔌 Conexão WebSocket fechada. A tentar reconectar...');
            setTimeout(connectWebSocket, 5000);
        };
    };

    // --- LÓGICA DO MODAL DE AVISO GENÉRICO ---
    const modalAvisoEl = document.getElementById('modal-aviso');
    const modalAvisoTituloEl = document.getElementById('modal-aviso-titulo');
    const modalAvisoTextoEl = document.getElementById('modal-aviso-texto');
    const btnModalAvisoOkEl = document.getElementById('btn-modal-aviso-ok');

    function mostrarAviso(titulo, texto) {
        if (modalAvisoEl) {
            modalAvisoTituloEl.textContent = titulo;
            modalAvisoTextoEl.textContent = texto;
            modalAvisoEl.classList.add('active');
        }
    }

    function fecharAviso() {
        if (modalAvisoEl) modalAvisoEl.classList.remove('active');
    }

    if (btnModalAvisoOkEl) btnModalAvisoOkEl.onclick = fecharAviso;
    if (modalAvisoEl) modalAvisoEl.addEventListener('click', e => { if (e.target === modalAvisoEl) fecharAviso(); });

    // --- MENSAGEM DE BOAS-VINDAS (BETA) ---
    window.addEventListener('DOMContentLoaded', () => {
        const BEM_VINDO_BETA_KEY = 'bemVindoBetaMostrado';

        if (!sessionStorage.getItem(BEM_VINDO_BETA_KEY)) {
            setTimeout(() => {
                mostrarAviso(
                    'Bem-vindo(a) à Fase Beta!',
                    'Obrigado pela sua confiança! Este sistema ainda está em desenvolvimento. Seu feedback é muito importante para nós. Aproveite a experiência!'
                );
                sessionStorage.setItem(BEM_VINDO_BETA_KEY, 'true');
            }, 1500);
        }
    });

    // --- 4. Funções de Lógica e Renderização ---
    function formatarDataContato(dataISO) {
        if (!dataISO) return '';
        const dataUtc = new Date(dataISO.includes('Z') ? dataISO : dataISO.replace(' ', 'T') + 'Z');
        const agora = new Date();
        const dataLocal = new Date(dataUtc.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
        const mesmoDia = agora.toDateString() === dataLocal.toDateString();
        const ontem = new Date();
        ontem.setDate(agora.getDate() - 1);
        const foiOntem = ontem.toDateString() === dataLocal.toDateString();
        if (mesmoDia) {
            return dataUtc.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        }
        if (foiOntem) {
            return 'Ontem';
        }
        return dataUtc.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    }

    function corAvatar(nome) {
        let hash = 0;
        for (let i = 0; i < nome.length; i++) {
            hash = nome.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 60%)`;
    }
    
    const renderizarListaDeContactos = () => {
        if(!listaContactosEl) return;
        listaContactosEl.innerHTML = '';
        if (todosOsPedidos.length === 0) {
            listaContactosEl.innerHTML = `<p class="info-mensagem">Nenhum contacto encontrado.</p>`;
            return;
        }
        todosOsPedidos.forEach(pedido => {
            const item = document.createElement('div');
            item.className = 'contact-item contact-item-clickable';
            item.dataset.id = pedido.id;
            if (pedido.id === pedidoAtivoId) item.classList.add('active');
            if (pedido.statusInterno) {
                if (pedido.statusInterno === 'entregue') item.dataset.status = 'entregue';
                else item.dataset.status = 'caminho';
            }
            const primeiraLetra = pedido.nome ? pedido.nome.charAt(0).toUpperCase() : '?';
            const cor = corAvatar(pedido.nome || '');
            const fotoHtml = pedido.fotoPerfilUrl
                ? `<img src="${pedido.fotoPerfilUrl}" alt="Foto de ${pedido.nome}" onerror="this.parentElement.innerHTML = '<div class=\\'avatar-fallback\\' style=\\'background-color:${cor};\\'>${primeiraLetra}</div>';">`
                : `<div class="avatar-fallback" style="background-color:${cor};">${primeiraLetra}</div>`;
            const contadorHtml = pedido.mensagensNaoLidas > 0 ? `<div class="unread-counter">${pedido.mensagensNaoLidas}</div>` : '';
            const timestampHtml = `<span class="contact-timestamp">${formatarDataContato(pedido.dataUltimaMensagem)}</span>`;
            const previewMensagem = pedido.ultimaMensagem ? pedido.ultimaMensagem.substring(0, 35) + (pedido.ultimaMensagem.length > 35 ? '...' : '') : 'Novo Pedido';
            item.innerHTML = `${timestampHtml}<div class="avatar-container">${fotoHtml}</div><div class="info"><h4>${pedido.nome}</h4><p>${previewMensagem}</p></div>${contadorHtml}`;
            listaContactosEl.appendChild(item);
        });
    };

    const renderizarContatosPaginaCompleta = () => {
        if (!listaContactosCompletaEl || !totalContactsCountEl) return;
        listaContactosCompletaEl.innerHTML = '';
        totalContactsCountEl.textContent = contactsTotal;
        if (todosOsPedidos.length === 0) {
            listaContactosCompletaEl.innerHTML = `<p class="info-mensagem">Nenhum contacto para exibir.</p>`;
            return;
        }
        todosOsPedidos.forEach(pedido => {
            const item = document.createElement('div');
            item.className = 'contact-row contact-item-clickable';
            item.dataset.id = pedido.id;
            const primeiraLetra = pedido.nome ? pedido.nome.charAt(0).toUpperCase() : '?';
            const cor = corAvatar(pedido.nome || '');
            const fotoHtml = pedido.fotoPerfilUrl
                ? `<img src="${pedido.fotoPerfilUrl}" alt="Foto de ${pedido.nome}" onerror="this.parentElement.innerHTML = '<div class=\\'avatar-fallback\\' style=\\'background-color:${cor};\\'>${primeiraLetra}</div>';">`
                : `<div class="avatar-fallback" style="background-color:${cor};">${primeiraLetra}</div>`;
            item.innerHTML = `<div class="avatar-container">${fotoHtml}</div><div class="info"><h4>${pedido.nome || 'Nome não disponível'}</h4><p>${pedido.telefone}</p></div><div class="contact-tag">cliente</div><div class="arrow-icon"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></div>`;
            listaContactosCompletaEl.appendChild(item);
        });
    };

    const selecionarPedidoErenderizarDetalhes = async (pedido) => {
        if (!pedido) return;

        const chatWindowEl = document.getElementById('chat-window');
        const chatFooterEl = document.getElementById('chat-footer');
        const formEnviarMensagemEl = document.getElementById('form-enviar-mensagem');
        const detailsPanelEl = document.getElementById('details-panel');

        if (pedido.mensagensNaoLidas > 0) {
            try {
                await authFetch(`/api/pedidos/${pedido.id}/marcar-como-lido`, { method: 'PUT' });
                pedido.mensagensNaoLidas = 0;
            } catch (error) { console.error("Falha ao marcar como lido:", error); }
        }
        pedidoAtivoId = pedido.id;
        renderizarListaDeContactos();

        // 1. PREENCHER A COLUNA 2: JANELA DE CHAT
        const chatHeaderHtml = `
            <div class="chat-header-main">
                <div class="contact-info-main">
                    <div class="avatar-container small">
                        <img src="${pedido.fotoPerfilUrl || 'https://i.imgur.com/z28n3Nz.png'}" alt="Foto de ${pedido.nome}" onerror="this.src='https://i.imgur.com/z28n3Nz.png';">
                    </div>
                    <h3>${pedido.nome}</h3>
                </div>
            </div>
        `;
        const chatFeedHtml = `<div class="chat-feed" id="chat-feed"><div class="loader-container"><div class="loader"></div></div></div>`;
        chatWindowEl.innerHTML = chatHeaderHtml + chatFeedHtml;
        
        chatFooterEl.classList.add('active');
        formEnviarMensagemEl.querySelector('input').disabled = false;
        formEnviarMensagemEl.querySelector('button').disabled = false;

        // 2. PREENCHER A COLUNA 3: PAINEL DE DETALHES
        detailsPanelEl.innerHTML = `
            <div class="details-header">
                <h3>Detalhes do Contato</h3>
                <div>
                    <button class="btn-icon" id="btn-editar-contato" title="Editar"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/></svg></button>
                    <button class="btn-icon" id="btn-excluir-contato" title="Excluir"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg></button>
                </div>
            </div>
            <div class="details-body">
                <div class="detail-item">
                    <label>Telefone</label>
                    <span>${pedido.telefone}</span>
                </div>
                <div class="detail-item">
                    <label>Produto</label>
                    <span>${pedido.produto || 'Não informado'}</span>
                </div>
                <div class="detail-item">
                    <label>Código de Rastreio</label>
                    <span>${pedido.codigoRastreio || 'Nenhum'}</span>
                </div>
                <div class="detail-item-divider"></div>
                <div class="detail-item-notes">
                    <div class="notes-header">
                        <svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 12.5A.5.5 0 0 1 5 12h3a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5m-2-3A.5.5 0 0 1 3 9h6a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m-2-3A.5.5 0 0 1 1 6h9a.5.5 0 0 1 0 1H1a.5.5 0 0 1-.5-.5M1.5 3a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-10a.5.5 0 0 0-.5-.5z"/></svg>
                        <h4>Notas</h4>
                    </div>
                    <div id="notes-content" class="editable-notes" tabindex="0">
                        ${pedido.notas ? pedido.notas.replace(/\n/g, '<br>') : '<span class="placeholder-text">Clique para adicionar uma nota...</span>'}
                    </div>
                </div>
            </div>
        `;

        // 3. BUSCAR E RENDERIZAR O HISTÓRICO
        try {
            const response = await authFetch(`/api/pedidos/${pedido.id}/historico`);
            const { data: historico } = await response.json();
            const chatFeedEl = document.getElementById('chat-feed');
            if(chatFeedEl) {
                chatFeedEl.innerHTML = ''; // Limpa o loader
                if (!historico || historico.length === 0) {
                    chatFeedEl.innerHTML = '<div class="date-separator"><span>Sem mensagens ainda</span></div>';
                } else {
                    historico.forEach(msg => {
                        const msgDiv = document.createElement('div');
                        msgDiv.className = `chat-message ${msg.origem === 'cliente' ? 'recebido' : 'enviado'}`;
                        const dataUtc = new Date(msg.data_envio.includes('Z') ? msg.data_envio : msg.data_envio.replace(' ', 'T') + 'Z');
                        const horaFormatada = dataUtc.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
                        const statusIcon = msg.origem === 'bot' ? `<span class="message-status"><svg width="16" height="16" viewBox="0 0 16 16"><path fill="currentColor" d="m11.354 4.646l-4.5 4.5l-1.5-1.5a.5.5 0 0 0-.708.708l2 2a.5.5 0 0 0 .708 0l5-5a.5.5 0 0 0-.708-.708M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0"/></svg></span>` : '';
                        msgDiv.innerHTML = `<p>${msg.mensagem.replace(/\n/g, '<br>')}</p><div class="message-meta"><span class="timestamp">${horaFormatada}</span>${statusIcon}</div>`;
                        chatFeedEl.appendChild(msgDiv);
                    });
                    chatFeedEl.scrollTop = chatFeedEl.scrollHeight;
                }
            }
        } catch (error) {
            const chatFeedEl = document.getElementById('chat-feed');
            if(chatFeedEl) chatFeedEl.innerHTML = '<p class="info-mensagem" style="color: red;">Erro ao carregar histórico.</p>';
        }
    };

    const fetchErenderizarTudo = async () => {
        const termoBusca = barraBuscaEl ? barraBuscaEl.value : '';
        const url = new URL('/api/pedidos', window.location.origin);
        url.searchParams.append('filtroStatus', filtroAtivo);
        if (termoBusca) url.searchParams.append('busca', termoBusca);
        try {
            const response = await authFetch(url);
            if (!response.ok) throw new Error('Falha ao buscar pedidos.');
            todosOsPedidos = (await response.json()).data || [];
            renderizarListaDeContactos();
            if (pedidoAtivoId) {
                const pedidoAtivoAindaExiste = todosOsPedidos.some(p => p.id === pedidoAtivoId);
                if (!pedidoAtivoAindaExiste && chatWindowEl && chatFooterEl && formEnviarMensagemEl) {
                    pedidoAtivoId = null;
                    chatWindowEl.innerHTML = `<div class="placeholder"><h3>Selecione um contacto</h3><p>O contacto anterior não foi encontrado no filtro atual.</p></div>`;
                    chatFooterEl.classList.remove('active');
                    formEnviarMensagemEl.querySelector('input').disabled = true;
                    formEnviarMensagemEl.querySelector('button').disabled = true;
                }
            }
        } catch (e) {
            console.error("Falha ao buscar e renderizar:", e);
            showNotification('Erro ao carregar os dados. Verifique a consola.', 'error');
        }
    };

    const abrirModal = (pedido = null) => {
        if (!pedido && currentWhatsappStatus !== 'CONNECTED') {
            showNotification('É preciso estar conectado ao WhatsApp para adicionar um novo contato.', 'error');
            return;
        }
        if(!formPedidoEl || !modalTituloEl || !modalPedidoEl) return;
        formPedidoEl.reset();
        modalTituloEl.textContent = 'Adicionar Novo Pedido';
        formPedidoEl.querySelector('#pedido-id').value = '';
        if (pedido) {
            modalTituloEl.textContent = 'Editar Pedido';
            formPedidoEl.querySelector('#pedido-id').value = pedido.id;
            Object.keys(pedido).forEach(key => {
                const input = formPedidoEl.querySelector(`[name="${key}"]`);
                if (input) input.value = pedido[key] || '';
            });
        }
        modalPedidoEl.classList.add('active');
    };
    const fecharModal = () => { if(modalPedidoEl) modalPedidoEl.classList.remove('active'); };

    async function loadIntegrationInfo() {
        if (!webhookUrlDisplayEl) return;
        try {
            const response = await authFetch('/api/integrations/info');
            if (!response.ok) throw new Error('Falha ao buscar chave de API.');
            const data = await response.json();
            const baseUrl = `${window.location.protocol}//${window.location.host}`;
            const webhookUrl = `${baseUrl}/api/postback?key=${data.apiKey}`;
            webhookUrlDisplayEl.textContent = webhookUrl;
            if (inputPostbackSecretEl) inputPostbackSecretEl.value = data.settings && data.settings.postback_secret ? data.settings.postback_secret : '';
        } catch (error) {
            webhookUrlDisplayEl.textContent = "Erro ao carregar o link.";
            showNotification(error.message, 'error');
        }
    }

    async function loadUserSettings() {
        if (!toggleCreateContactEl) return;
        try {
            const response = await authFetch('/api/settings/contact-creation');
            if (!response.ok) throw new Error('Falha ao carregar configuração.');
            const data = await response.json();
            toggleCreateContactEl.checked = data.create_contact_on_message;
            if (toggleCreateContactLabelEl) toggleCreateContactLabelEl.textContent = data.create_contact_on_message ? 'Ativado' : 'Desativado';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function loadAutomations() {
        try {
            const response = await authFetch('/api/automations');
            if (!response.ok) throw new Error('Falha ao carregar automações.');
            const configuracoesAutomacao = await response.json();
            document.querySelectorAll('.automation-card').forEach(card => {
                const automationId = card.dataset.automationId;
                const config = configuracoesAutomacao[automationId];
                if (config) {
                    const textarea = card.querySelector('.automation-message');
                    const toggle = card.querySelector('.automation-toggle');
                    const toggleLabel = card.querySelector('.toggle-label');
                    if(toggle) toggle.checked = config.ativo;
                    if(textarea) {
                        textarea.value = config.mensagem;
                        textarea.disabled = !config.ativo;
                        highlightVariables(textarea);
                    }
                    if(toggleLabel) toggleLabel.textContent = config.ativo ? 'Ativado' : 'Desativado';
                }
            });
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function saveAutomations() {
        if (!btnSalvarAutomacoesEl) return;
        const originalText = btnSalvarAutomacoesEl.textContent;
        btnSalvarAutomacoesEl.disabled = true;
        btnSalvarAutomacoesEl.textContent = 'A guardar...';
        const novasConfiguracoes = {};
        document.querySelectorAll('.automation-card').forEach(card => {
            const automationId = card.dataset.automationId;
            const toggle = card.querySelector('.automation-toggle');
            const messageTextarea = card.querySelector('.automation-message');
            novasConfiguracoes[automationId] = {
                ativo: toggle.checked,
                mensagem: messageTextarea.value
            };
        });
        try {
            const response = await authFetch('/api/automations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(novasConfiguracoes)
            });
            if (!response.ok) throw new Error('Falha ao salvar as configurações.');
            const resultado = await response.json();
            showNotification(resultado.message, 'success');
        } catch (error) {
            showNotification(error.message, 'error');
        } finally {
            btnSalvarAutomacoesEl.disabled = false;
            btnSalvarAutomacoesEl.textContent = originalText;
        }
    }

    function createContactsChart(data) {
        if (!newContactsChartCanvas || typeof Chart === 'undefined') return;
        if (contactsChart) contactsChart.destroy();
        const labels = [];
        const counts = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const dayString = d.toISOString().split('T')[0];
            const dateParts = dayString.split('-');
            labels.push(`${dateParts[2]}/${dateParts[1]}`);
            const dayData = data.find(item => item.dia === dayString);
            counts.push(dayData ? dayData.count : 0);
        }
        contactsChart = new Chart(newContactsChartCanvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Novos Contatos',
                    data: counts,
                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: { responsive: true, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, plugins: { legend: { display: false } } }
        });
    }


    function createStatusChart(data) {
        if (!statusPieChartCanvas || typeof Chart === 'undefined') return;
        if (statusChart) statusChart.destroy();

        const labels = data.map(item => item.statusInterno ? (item.statusInterno.charAt(0).toUpperCase() + item.statusInterno.slice(1).replace(/_/g, ' ')) : 'Não definido');
        const counts = data.map(item => item.count);

        const backgroundColors = [
            '#3b82f6',
            '#22c55e',
            '#eab308',
            '#ef4444',
            '#6b7280',
            '#8b5cf6',
        ];

        statusChart = new Chart(statusPieChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Distribuição de Status',
                    data: counts,
                    backgroundColor: backgroundColors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }
    async function loadReportData() {
        try {
            const response = await authFetch('/api/reports/summary');
            if (!response.ok) throw new Error('Falha ao carregar dados do relatório.');
            const data = await response.json();

            const ordersInTransitCardEl = document.getElementById('orders-in-transit-card');
            const averageDeliveryTimeCardEl = document.getElementById('average-delivery-time-card');
            const delayedOrdersCardEl = document.getElementById('delayed-orders-card');
            const cancelledOrdersCardEl = document.getElementById('cancelled-orders-card');

            if(ordersInTransitCardEl) ordersInTransitCardEl.textContent = data.ordersInTransit;
            if(averageDeliveryTimeCardEl) averageDeliveryTimeCardEl.textContent = data.averageDeliveryTime + ' dias';
            if(delayedOrdersCardEl) delayedOrdersCardEl.textContent = data.delayedOrders;
            if(cancelledOrdersCardEl) cancelledOrdersCardEl.textContent = data.cancelledOrders;

            createContactsChart(data.newContactsLast7Days);
            createStatusChart(data.statusDistribution);
        } catch (error) {
            console.error("Erro ao carregar dados do relatório:", error);
            showNotification(error.message, 'error');
        }
    }

    async function loadBillingHistory() {
        const billingListContainerEl = document.getElementById('billing-list-container');
        if (!billingListContainerEl) return;

        billingListContainerEl.innerHTML = '<p class="info-mensagem">A carregar...</p>';

        try {
            const resp = await authFetch('/api/billing/history');
            if (!resp.ok) throw new Error('Falha ao carregar histórico.');

            const { pedidos } = await resp.json();

            billingListContainerEl.innerHTML = '';

            if (billingSummaryEl) {
                const count = pedidos ? pedidos.length : 0;
                billingSummaryEl.textContent = `Exibindo ${count} pedidos com rastreio ativo que estão contando para o seu ciclo atual.`;
            }

            if (!pedidos || pedidos.length === 0) {
                billingListContainerEl.innerHTML = '<div class="placeholder-view"><div style="font-size:2rem">📦</div><h1>Nenhum Rastreio Ativo</h1><p>Adicione um código de rastreio a um dos seus contatos para começar a acompanhar e ver seu consumo aqui.</p></div>';
                return;
            }

            const statusMap = {
                'entregue': { text: 'Entregue', class: 'success' },
                'pedido_a_caminho': { text: 'Em Trânsito', class: 'info' },
                'pedido_atrasado': { text: 'Atrasado', class: 'danger' },
                'pedido_devolvido': { text: 'Devolvido', class: 'danger' },
                'pedido_a_espera': { text: 'Aguardando Retirada', class: 'warning' },
                'postado': { text: 'Postado', class: 'default' },
                'default': { text: 'Indefinido', class: 'default' }
            };

            pedidos.forEach(p => {
                const item = document.createElement('div');
                item.className = 'billing-item';

                const statusInfo = statusMap[p.statusInterno] || statusMap['default'];
                const link = p.codigoRastreio ? `https://www.linkcorreios.com.br/${p.codigoRastreio}` : '#';
                const dataFormatada = new Date(p.dataCriacao).toLocaleDateString('pt-BR');

                item.innerHTML = `
                    <div class="billing-status-dot status-${statusInfo.class}"></div>
                    <div class="billing-info">
                        <div class="billing-info-main">
                            <a href="${link}" target="_blank" class="billing-code">${p.codigoRastreio}</a>
                            <span class="billing-customer">${p.nome}</span>
                        </div>
                        <div class="billing-info-meta">
                            <span>Produto: <strong>${p.produto || 'Não informado'}</strong></span>
                            <span class="meta-divider">|</span>
                            <span>Data: <strong>${dataFormatada}</strong></span>
                        </div>
                    </div>
                    <div class="billing-status-tag tag-${statusInfo.class}">${statusInfo.text}</div>
                `;

                billingListContainerEl.appendChild(item);
            });
        } catch (err) {
            console.error('Erro ao carregar histórico de faturamento:', err);
            billingListContainerEl.innerHTML = '<p class="info-mensagem" style="color: red">Erro ao carregar o histórico.</p>';
        }
    }

    async function loadSubscriptionStatus() {
        if (!planStatusEl) return;
        planStatusEl.textContent = 'Carregando...';
        try {
            const resp = await authFetch('/api/subscription');
            if (!resp.ok) throw new Error('Falha ao carregar assinatura');
            const { subscription } = await resp.json();
            const limite = subscription.monthly_limit === -1 ? 'Ilimitado' : subscription.monthly_limit;
            const percent = subscription.monthly_limit === -1 ? 0 : Math.min(100, Math.round((subscription.usage / subscription.monthly_limit) * 100));
            planStatusEl.innerHTML = `<div>Plano Atual: ${subscription.plan_name} — Uso este mês: ${subscription.usage} / ${limite} pedidos</div><div class="plan-progress"><div class="plan-progress-bar" style="width:${percent}%"></div></div>`;
        } catch (err) {
            planStatusEl.textContent = 'Erro ao carregar plano';
        }
    }

    async function loadPlans() {
        const plansListEl = document.getElementById('plans-list');
        const currentPlanDisplayEl = document.getElementById('current-plan-display');
        if (!plansListEl || !currentPlanDisplayEl) return;

        plansListEl.innerHTML = '<p class="info-mensagem">A carregar planos...</p>';
        currentPlanDisplayEl.classList.add('hidden');

        try {
            const [plansResp, subResp] = await Promise.all([
                authFetch('/api/plans'),
                authFetch('/api/subscription')
            ]);

            if (!plansResp.ok || !subResp.ok) {
                throw new Error('Falha ao carregar dados de planos ou assinatura.');
            }

            const { data: allPlans } = await plansResp.json();
            const { subscription } = await subResp.json();
            const activePlanId = subscription ? subscription.plan_id : null;
            const currentPlan = allPlans.find(p => p.id === activePlanId);

            if (currentPlan) {
                currentPlanDisplayEl.classList.remove('hidden');
                const usage = subscription.usage || 0;
                const limit = currentPlan.monthly_limit === -1 ? 'Ilimitado' : currentPlan.monthly_limit;
                const usagePercent = limit === 'Ilimitado' ? 0 : Math.min(100, (usage / limit) * 100);

                currentPlanDisplayEl.innerHTML = `
                    <div class="current-plan-header">
                        <h4>Seu Plano Atual</h4>
                        <h2>${currentPlan.name}</h2>
                    </div>
                    <div class="current-plan-usage">
                        <div class="usage-text">
                            <strong>Uso do Mês:</strong>
                            <span>${usage} / ${limit} pedidos com rastreio</span>
                        </div>
                        <div class="usage-bar">
                            <div class="usage-bar-fill" style="width: ${usagePercent}%;"></div>
                        </div>
                    </div>
                `;
            }

            plansListEl.innerHTML = '';

            const upgradeablePlans = allPlans.filter(p =>
                p.id !== activePlanId &&
                p.name !== 'Grátis' &&
                p.name !== 'Pro Plus'
            );

            upgradeablePlans.forEach(p => {
                const card = document.createElement('div');
                card.className = 'plan-card';
                if (p.name === 'Basic') card.classList.add('popular');

                const features = {
                    'Start': ['50 pedidos/mês', 'Integrações Básicas', 'Relatórios Simples'],
                    'Basic': ['100 pedidos/mês', 'Relatórios Padrão', 'Suporte via Email'],
                    'Pro': ['250 pedidos/mês', 'Relatórios Avançados', 'Suporte Prioritário']
                }[p.name] || [];

                const featuresHtml = features.map(f => `
                    <li>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
                        <span>${f}</span>
                    </li>
                `).join('');

                const badgeHtml = p.name === 'Basic' ? '<span class="badge popular">Mais Popular</span>' : '';
                const checkoutUrlWithEmail = p.checkout_url ? `${p.checkout_url}?email=${userData.email}` : '#';
                const actionButton = `<a href="${checkoutUrlWithEmail}" target="_blank" class="btn-plan ${p.name === 'Basic' ? 'btn-primary' : 'btn-outline'}">Fazer Upgrade</a>`;

                card.innerHTML = `
                    ${badgeHtml}
                    <div class="plan-header">
                        <h3>${p.name}</h3>
                        <p>${p.name === 'Basic' ? 'Para negócios em crescimento' : 'Para escalar sua operação'}</p>
                    </div>
                    <div class="plan-price">
                        <span class="price-currency">R$</span>
                        <span class="price-amount">${p.price.toFixed(2).replace('.', ',')}</span>
                        <span class="price-period">/mês</span>
                    </div>
                    <ul class="plan-features">${featuresHtml}</ul>
                    <div class="plan-footer">${actionButton}</div>
                `;
                plansListEl.appendChild(card);
            });

            const contactCard = document.createElement('div');
            contactCard.className = 'custom-plan-card';
            contactCard.innerHTML = `
                <div class="custom-plan-content">
                    <div class="custom-plan-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M14 1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-2.5a2 2 0 0 0-1.6.8L8 14.333 6.1 11.8a2 2 0 0 0-1.6-.8H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2.5a1 1 0 0 1 .8.4l1.9 2.533a1 1 0 0 0 1.6 0l1.9-2.533a1 1 0 0 1 .8-.4H14a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"/>
                            <path d="M5 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0m4 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                        </svg>
                    </div>
                    <div class="custom-plan-text">
                        <h4>Precisa de um plano empresarial?</h4>
                        <p>Oferecemos limites personalizados e suporte dedicado. Vamos conversar?</p>
                    </div>
                </div>
                <div class="custom-plan-action">
                    <a href="#" class="btn-plan btn-secondary">Entrar em Contato</a>
                </div>
            `;
            plansListEl.appendChild(contactCard);

        } catch (err) {
            plansListEl.innerHTML = '<p class="info-mensagem" style="color: red;">Erro ao carregar os planos. Tente novamente mais tarde.</p>';
            console.error(err);
        }
    }

    function renderContactsPagination(total) {
        if (!contactsPaginationEl) return;
        const totalPages = Math.max(1, Math.ceil(total / contactsLimit));
        contactsPaginationEl.innerHTML = '';
        if (totalPages <= 1) return;
        const prev = document.createElement('button');
        prev.textContent = 'Anterior';
        prev.disabled = contactsCurrentPage === 1;
        prev.addEventListener('click', () => loadContacts(contactsCurrentPage - 1));
        contactsPaginationEl.appendChild(prev);
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === contactsCurrentPage) btn.classList.add('active');
            btn.addEventListener('click', () => loadContacts(i));
            contactsPaginationEl.appendChild(btn);
        }
        const next = document.createElement('button');
        next.textContent = 'Próximo';
        next.disabled = contactsCurrentPage === totalPages;
        next.addEventListener('click', () => loadContacts(contactsCurrentPage + 1));
        contactsPaginationEl.appendChild(next);
    }

    async function loadContacts(page = 1) {
        if (!listaContactosCompletaEl) return;
        contactsCurrentPage = page;
        listaContactosCompletaEl.innerHTML = '<p class="info-mensagem">A carregar...</p>';
        const url = new URL('/api/pedidos', window.location.origin);
        url.searchParams.append('page', page);
        url.searchParams.append('limit', contactsLimit);
        url.searchParams.append('filtroStatus', filtroAtivo);
        const termo = barraBuscaContatosEl ? barraBuscaContatosEl.value : '';
        if (termo) url.searchParams.append('busca', termo);
        try {
            const resp = await authFetch(url);
            if (!resp.ok) throw new Error('Falha ao buscar pedidos.');
            const { data, total } = await resp.json();
            todosOsPedidos = data || [];
            contactsTotal = total;
            renderizarContatosPaginaCompleta();
            renderContactsPagination(total);
        } catch (err) {
            listaContactosCompletaEl.innerHTML = '<p class="info-mensagem">Erro ao carregar.</p>';
        }
    }

    function renderIntegrationPagination(total) {
        if (!integrationPaginationEl) return;
        const totalPages = Math.max(1, Math.ceil(total / integrationLimit));
        integrationPaginationEl.innerHTML = '';
        if (totalPages <= 1) return;
        const prev = document.createElement('button');
        prev.textContent = 'Anterior';
        prev.disabled = integrationCurrentPage === 1;
        prev.addEventListener('click', () => loadIntegrationHistory(integrationCurrentPage - 1));
        integrationPaginationEl.appendChild(prev);
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('button');
            btn.textContent = i;
            if (i === integrationCurrentPage) btn.classList.add('active');
            btn.addEventListener('click', () => loadIntegrationHistory(i));
            integrationPaginationEl.appendChild(btn);
        }
        const next = document.createElement('button');
        next.textContent = 'Próximo';
        next.disabled = integrationCurrentPage === totalPages;
        next.addEventListener('click', () => loadIntegrationHistory(integrationCurrentPage + 1));
        integrationPaginationEl.appendChild(next);
    }

    async function loadIntegrationHistory(page = 1) {
        if (!integrationHistoryBodyEl) return;
        integrationCurrentPage = page;
        integrationHistoryBodyEl.innerHTML = '<tr><td colspan="4">A carregar...</td></tr>';
        try {
            const resp = await authFetch(`/api/integrations/history?page=${page}&limit=${integrationLimit}`);
            if (!resp.ok) throw new Error('Falha ao carregar histórico.');
            const { data, total } = await resp.json();
            integrationHistoryBodyEl.innerHTML = '';
            if (!data || data.length === 0) {
                integrationHistoryBodyEl.innerHTML = '<tr><td colspan="4">Nenhum registro.</td></tr>';
            } else {
                data.forEach(item => {
                    const tr = document.createElement('tr');
                    const dt = new Date(item.created_at);
                    tr.innerHTML = `<td>${dt.toLocaleString('pt-BR')}</td><td>${item.client_name || '-'}</td><td>${item.product_name || '-'}</td><td><span class="status-badge ${item.status === 'sucesso' ? 'success' : 'error'}">${item.status === 'sucesso' ? 'Recebido' : 'Falhou'}</span></td>`;
                    integrationHistoryBodyEl.appendChild(tr);
                });
            }
            renderIntegrationPagination(total);
        } catch (err) {
            integrationHistoryBodyEl.innerHTML = '<tr><td colspan="4">Erro ao carregar.</td></tr>';
        }
    }

    // --- 6. Event Listeners ---
    if(mainNavEl) mainNavEl.addEventListener('click', (e) => {
        const navBtn = e.target.closest('.nav-btn');
        if (navBtn) showView(navBtn.dataset.view);
    });

    document.addEventListener('click', async (e) => {
        const item = e.target.closest('.contact-item-clickable');
        if (item) {
            showView('chat-view'); 
            const pedidoId = parseInt(item.dataset.id, 10);
            const pedido = todosOsPedidos.find(p => p.id === pedidoId);
            if (pedido) await selecionarPedidoErenderizarDetalhes(pedido);
        }
    });
    
    if (btnSalvarAutomacoesEl) btnSalvarAutomacoesEl.addEventListener('click', saveAutomations);
    
    const btnNovoContatoPage = document.getElementById('btn-novo-contato-page');
    if (btnNovoContatoPage) btnNovoContatoPage.addEventListener('click', () => abrirModal());

    if (btnAdicionarNovoEl) btnAdicionarNovoEl.addEventListener('click', () => abrirModal());
    if (btnModalCancelarEl) btnModalCancelarEl.addEventListener('click', fecharModal);
    if (modalPedidoEl) modalPedidoEl.addEventListener('click', e => { if (e.target === modalPedidoEl) fecharModal(); });
    
    const automationsView = document.querySelector('#automations-view');
    if (automationsView) {
        automationsView.addEventListener('change', (e) => {
            if (e.target.classList.contains('automation-toggle')) {
                const card = e.target.closest('.automation-card');
                const messageTextarea = card.querySelector('.automation-message');
                const toggleLabel = card.querySelector('.toggle-label');
                if(messageTextarea && toggleLabel) {
                    const isAtivo = e.target.checked;
                    messageTextarea.disabled = !isAtivo;
                    toggleLabel.textContent = isAtivo ? 'Ativado' : 'Desativado';
                }
            }
        });
        automationsView.addEventListener('input', (e) => {
            if (e.target.classList.contains('automation-message')) {
                highlightVariables(e.target);
            }
        });
        automationsView.addEventListener('scroll', (e) => {
            if (e.target.classList.contains('automation-message')) {
                const backdrop = e.target.previousElementSibling;
                if(backdrop) backdrop.scrollTop = e.target.scrollTop;
            }
        }, true);
    }

    if (btnCopyWebhookEl) {
        btnCopyWebhookEl.addEventListener('click', () => {
            const urlToCopy = webhookUrlDisplayEl ? webhookUrlDisplayEl.textContent : '';
            if (navigator.clipboard && urlToCopy && urlToCopy !== "A carregar...") {
                navigator.clipboard.writeText(urlToCopy)
                    .then(() => showNotification('Link copiado para a área de transferência!', 'success'))
                    .catch(() => showNotification('Falha ao copiar o link.', 'error'));
            }
        });
    }

    if (btnCopySetupWebhook) {
        btnCopySetupWebhook.addEventListener('click', () => {
            const url = document.getElementById('integration-webhook-url');
            const text = url ? url.textContent : '';
            if (navigator.clipboard && text && text !== 'A gerar URL...' && text !== 'Erro ao gerar URL.') {
                navigator.clipboard.writeText(text)
                    .then(() => showNotification('Link copiado para a área de transferência!', 'success'))
                    .catch(() => showNotification('Falha ao copiar o link.', 'error'));
            }
        });
    }

    if (btnRegenerateWebhookEl) {
        btnRegenerateWebhookEl.addEventListener('click', () => {
            const message = 'Tem a certeza que deseja gerar um novo link? O link antigo deixará de funcionar.';
            showConfirmationModal(message, async () => {
                try {
                    const response = await authFetch('/api/integrations/regenerate', { method: 'POST' });
                    if (!response.ok) throw new Error('Falha ao regenerar o link.');
                    const resultado = await response.json();
                    showNotification(resultado.message, 'success');
                    await loadIntegrationInfo();
                } catch (error) {
                    showNotification(error.message, 'error');
                }
            });
        });
    }

    if (btnSavePostbackSecretEl) {
        btnSavePostbackSecretEl.addEventListener('click', async () => {
            const secretValue = inputPostbackSecretEl ? inputPostbackSecretEl.value.trim() : '';
            try {
                const resp = await authFetch('/api/integrations/settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ postback_secret: secretValue })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || 'Falha ao salvar.');
                showNotification(data.message || 'Configurações atualizadas', 'success');
            } catch (err) {
                showNotification(err.message, 'error');
            }
        });
    }

    if (toggleCreateContactEl) {
        toggleCreateContactEl.addEventListener('change', async () => {
            try {
                const resp = await authFetch('/api/settings/contact-creation', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ enabled: toggleCreateContactEl.checked })
                });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.error || 'Falha ao salvar.');
                if (toggleCreateContactLabelEl) toggleCreateContactLabelEl.textContent = toggleCreateContactEl.checked ? 'Ativado' : 'Desativado';
                showNotification(data.message, 'success');
            } catch (err) {
                showNotification(err.message, 'error');
            }
        });
    }

    if (formPedidoEl) formPedidoEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = formPedidoEl.querySelector('#pedido-id').value;
        const dados = Object.fromEntries(new FormData(e.target).entries());
        const url = id ? `/api/pedidos/${id}` : '/api/pedidos';
        const method = id ? 'PUT' : 'POST';
        delete dados.id;
        try {
            const response = await authFetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
            const resultado = await response.json();
            if (!response.ok) throw new Error(resultado.error || 'Falha ao salvar.');
            fecharModal();
            showNotification(resultado.message, 'success');
            await fetchErenderizarTudo();
            loadSubscriptionStatus();
        } catch (error) { 
            showNotification(error.message, 'error');
        }
    });
    
    if (barraBuscaEl) barraBuscaEl.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchErenderizarTudo, 300);
    });

    if (barraBuscaContatosEl) barraBuscaContatosEl.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => loadContacts(1), 300);
    });

    if(filterContainerEl) filterContainerEl.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-btn');
        if (!target) return;
        filtroAtivo = target.dataset.filtro;
        filterContainerEl.querySelector('.active').classList.remove('active');
        target.classList.add('active');
        fetchErenderizarTudo();
    });

    if (btnConectarEl) btnConectarEl.addEventListener('click', () => { authFetch('/api/whatsapp/connect', { method: 'POST' }); });
    if (btnDesconectarEl) btnDesconectarEl.addEventListener('click', () => {
        showConfirmationModal('Tem a certeza que deseja desconectar a sessão do WhatsApp?', () => {
            authFetch('/api/whatsapp/disconnect', { method: 'POST' });
        });
    });

    if (plansListEl) {
        plansListEl.addEventListener('click', (e) => {
            if (!e.target.closest('a.btn-plan')) {
                e.preventDefault();
            }
        });
    }

    if (btnUpgradePlansEl) btnUpgradePlansEl.addEventListener('click', () => {
        if(modalUpgradeEl) modalUpgradeEl.classList.remove('active');
        showView('plans-view');
    });
    if(modalUpgradeEl) modalUpgradeEl.addEventListener('click', (e) => { if(e.target === modalUpgradeEl) modalUpgradeEl.classList.remove('active'); });

    if (btnImportarCsv) {
        btnImportarCsv.addEventListener('click', () => {
            if (csvFileInput) csvFileInput.click();
        });
    }

    if (csvFileInput) {
        csvFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    showNotification('Arquivo CSV vazio ou inválido.', 'error');
                    return;
                }
                const headers = lines[0].split(',').map(h => h.trim());
                const pedidos = lines.slice(1).map(line => {
                    const data = line.split(',');
                    const pedido = {};
                    headers.forEach((header, index) => {
                        pedido[header] = data[index] ? data[index].trim() : '';
                    });
                    return pedido;
                });

                try {
                    showNotification('A processar importação...', 'success');
                    const response = await authFetch('/api/pedidos/importar', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ pedidos })
                    });
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error);

                    showNotification(`${result.sucessos} contatos importados! ${result.falhas} falharam.`, 'success');
                    if (result.erros && result.erros.length > 0) {
                        console.warn('Erros na importação:', result.erros);
                    }
                    loadContacts();
                } catch (err) {
                    showNotification(`Erro na importação: ${err.message}`, 'error');
                }
            };
            reader.readAsText(file);
        });
    }
    
    const settingsView = document.getElementById('settings-view');
    if(settingsView) settingsView.addEventListener('click', (e) => {
        if (e.target.id === 'btn-regenerate-qr') {
            authFetch('/api/whatsapp/connect', { method: 'POST' });
        }
        if (e.target.id === 'btn-delete-account') {
            showConfirmationModal('Você tem certeza? Esta ação é irreversível e todos os seus dados serão apagados permanentemente.', async () => {
                try {
                    const resp = await authFetch('/api/users/me', { method: 'DELETE' });
                    const data = await resp.json();
                    if (!resp.ok) throw new Error(data.error || 'Falha ao excluir conta.');
                    localStorage.removeItem('token');
                    alert('Conta excluída com sucesso.');
                    window.location.href = '/login.html';
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            });
        }
    });
    
    if(mainContentAreaEl) mainContentAreaEl.addEventListener('click', async (e) => {
        const btnEditar = e.target.closest('.btn-editar-main');
        if (btnEditar) {
            const pedido = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            if (pedido) abrirModal(pedido);
        }
        const btnExcluir = e.target.closest('.btn-excluir-main');
        if (btnExcluir) {
            const pedido = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            if (!pedido) return;
            const executarExclusao = async () => {
                try {
                    const resp = await authFetch(`/api/pedidos/${pedido.id}`, { method: 'DELETE' });
                    const resultado = await resp.json();
                    if (!resp.ok) throw new Error(resultado.error || 'Falha ao excluir.');
                    showNotification(resultado.message, 'success');
                    pedidoAtivoId = null;
                    await fetchErenderizarTudo();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            };
            if (pedido.codigoRastreio) {
                showConfirmationModal('Atenção: Este contato possui um código de rastreio ativo e já está consumindo um uso do seu plano este mês. Ao apagar, ele não poderá mais receber mensagens automáticas, mas o uso não será devolvido. Deseja continuar?', executarExclusao);
            } else {
                executarExclusao();
            }
        }
    });

    if(detailsPanelEl) detailsPanelEl.addEventListener('click', (e) => {
        const pedidoId = pedidoAtivoId;
        if (!pedidoId) return;

        const notesContent = document.getElementById('notes-content');
        if (e.target.closest('#notes-content') && !notesContent.querySelector('textarea')) {
            const pedidoAtual = todosOsPedidos.find(p => p.id === pedidoId);
            const currentNotes = pedidoAtual ? pedidoAtual.notas || '' : '';
            notesContent.innerHTML = `<textarea id="notes-textarea" class="notes-editor">${currentNotes}</textarea>`;
            const textarea = document.getElementById('notes-textarea');
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);

            textarea.addEventListener('blur', async () => {
                const newNotes = textarea.value.trim();
                try {
                    await authFetch(`/api/pedidos/${pedidoId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ notas: newNotes })
                    });
                    if (pedidoAtual) pedidoAtual.notas = newNotes;
                    notesContent.innerHTML = newNotes.replace(/\n/g, '<br>') || '<span class="placeholder-text">Clique para adicionar uma nota...</span>';
                } catch (err) {
                    showNotification('Falha ao salvar a nota.', 'error');
                    notesContent.innerHTML = currentNotes.replace(/\n/g, '<br>') || '<span class="placeholder-text">Clique para adicionar uma nota...</span>';
                }
            });
        }

        if (e.target.closest('#btn-editar-contato')) {
            const pedido = todosOsPedidos.find(p => p.id === pedidoId);
            if (pedido) abrirModal(pedido);
        }

        if (e.target.closest('#btn-excluir-contato')) {
            const pedido = todosOsPedidos.find(p => p.id === pedidoId);
            if (!pedido) return;
            
            const executarExclusao = async () => {
                try {
                    const resp = await authFetch(`/api/pedidos/${pedido.id}`, { method: 'DELETE' });
                    const resultado = await resp.json();
                    if (!resp.ok) throw new Error(resultado.error || 'Falha ao excluir.');
                    showNotification(resultado.message, 'success');
                    pedidoAtivoId = null;
                    detailsPanelEl.innerHTML = '<div class="placeholder-details"><p>Contato excluído.</p></div>';
                    await fetchErenderizarTudo();
                } catch (err) {
                    showNotification(err.message, 'error');
                }
            };

            const confirmMessage = pedido.codigoRastreio 
                ? 'Atenção: Este contato possui um código de rastreio ativo. Ao apagar, ele não poderá mais receber mensagens automáticas. Deseja continuar?'
                : 'Tem certeza que deseja excluir este contato? Esta ação é irreversível.';
            
            showConfirmationModal(confirmMessage, executarExclusao);
        }
    });

    if(formEnviarMensagemEl) formEnviarMensagemEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (currentWhatsappStatus !== 'CONNECTED') {
            showNotification('O WhatsApp precisa estar conectado para enviar mensagens.', 'error');
            return;
        }
        const inputMensagem = e.target.querySelector('#input-mensagem');
        const mensagem = inputMensagem.value.trim();
        if (!mensagem || !pedidoAtivoId) return;
        try {
            const response = await authFetch(`/api/pedidos/${pedidoAtivoId}/enviar-mensagem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mensagem }) });
            if (!response.ok) throw new Error('Falha ao enviar mensagem.');
            inputMensagem.value = '';
            const pedidoAtivo = todosOsPedidos.find(p => p.id === pedidoAtivoId);
            await selecionarPedidoErenderizarDetalhes(pedidoAtivo);
            loadSubscriptionStatus();
        } catch (error) { 
            showNotification(error.message, 'error');
        }
    });

    if (notificacaoCloseBtnEl) {
        notificacaoCloseBtnEl.addEventListener('click', () => {
            clearTimeout(notificacaoTimer);
            if(notificacaoEl) notificacaoEl.classList.remove('show');
        });
    }

    if (logoutBtnEl) {
        logoutBtnEl.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '/login.html';
        });
    }

    // ---- Integrações ----
    const supportedPlatforms = [
        { id: 'kiwify', name: 'Kiwify', logo: '/logos/kiwify.jpg' },
        { id: 'hotmart', name: 'Hotmart', logo: '/logos/hotmart.png' },
        { id: 'monetizze', name: 'Monetizze', logo: '/logos/monetizze.png' },
        { id: 'braip', name: 'Braip', logo: '/logos/braip.png' },
        { id: 'perfectpay', name: 'Perfect Pay', logo: '/logos/perfect pay.png' },
        { id: 'logzz', name: 'Logzz', logo: '/logos/logozz.png' },
        { id: 'payt', name: 'Payt', logo: '/logos/payt.png' },
        { id: 'keedpay', name: 'Keedpay', logo: '/logos/keendpay.png' }
    ];

    // Novas variáveis para a tela de setup
    const integrationsListView = document.getElementById('integrations-list').parentElement;
    const integrationSetupView = document.getElementById('integration-setup-view');
    const btnCancelSetup = document.getElementById('btn-cancel-setup');
    const btnSaveIntegration = document.getElementById('btn-save-integration');

    // Garanta que esta lógica esteja associada ao clique do botão 'btn-save-integration'
    if (btnSaveIntegration) {
        btnSaveIntegration.onclick = async () => {
            const integrationNameInput = document.getElementById('integration-name');
            const integrationSecretInput = document.getElementById('integration-secret');

            const integrationName = integrationNameInput.value.trim();
            const secretKey = integrationSecretInput.value.trim();

            // Pega o ID da integração que foi criada quando a tela abriu
            // Esta parte depende de como a ID está a ser armazenada. Exemplo:
            const integrationId = integrationSetupView.dataset.editingId;

            if (!integrationName) {
                alert('Por favor, dê um apelido à sua integração.');
                return;
            }

            try {
                // Lógica para enviar os dados para o backend (PUT para atualizar)
                await authFetch(`/api/integrations/${integrationId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: integrationName,
                        secret_key: secretKey
                    })
                });

                // FEEDBACK + AÇÕES DE REDIRECIONAMENTO E ATUALIZAÇÃO
                showNotification('Integração salva com sucesso!', 'success');

                // PASSO 1: VOLTA PARA A TELA DA LISTA
                showIntegrationsList();

                // PASSO 2: RECARREGA OS DADOS DA LISTA DO SERVIDOR
                loadAndRenderIntegrations();

            } catch (err) {
                showNotification(`Erro ao salvar: ${err.message}`, 'error');
            }
        };
    }
    const setupTitle = document.getElementById('setup-title');
    const platformInstructions = document.getElementById('platform-instructions');
    const inputIntegrationName = document.getElementById('integration-name');
    const inputIntegrationSecret = document.getElementById('integration-secret');
    const webhookDisplay = document.getElementById('integration-webhook-url');

    const instructions = {
        braip: `<p>1. No painel da Braip, vá para Ferramentas > Postback.</p><p>2. Clique em "Nova Configuração".</p><p>3. Cole a URL de Webhook acima.</p><p>4. Selecione os eventos: <strong>Pagamento Aprovado, Agendado, Cancelada, Chargeback, Devolvida, e TRACKING_CODE_ADDED</strong>.</p><p>5. Salve a configuração.</p>`,
        kiwify: `<p>1. Na Kiwify, vá em Apps > Webhooks.</p><p>2. Crie um novo webhook, cole a URL acima e selecione os eventos de Venda e de Rastreio.</p>`,
        default: `<p>Consulte a documentação da sua plataforma sobre como configurar um Webhook ou Postback. Use a URL acima e configure para os eventos de venda e rastreio.</p>`
    };

    async function loadAndRenderIntegrations() {
        const integrationsListEl = document.getElementById('integrations-list');
        if (!integrationsListEl) return;
        integrationsListEl.innerHTML = '<p class="info-mensagem">A carregar integrações...</p>';
        try {
            const response = await authFetch('/api/integrations');
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Falha ao carregar os dados.');

            integrationsCache = result.data || [];
            integrationsListEl.innerHTML = '';
            if (!integrationsCache.length) {
                integrationsListEl.innerHTML = '<div class="placeholder-view"><p>Nenhuma integração configurada ainda.</p></div>';
                return;
            }

            integrationsCache.forEach(integration => {
                const card = document.createElement('div');
                card.className = 'integration-card-item';
                card.dataset.integrationId = integration.id;

                const logoFilename = integration.platform === 'perfectpay' ? 'perfect pay.png' : `${integration.platform}.png`;
                const logoUrl = `/logos/${logoFilename}`;

                card.innerHTML = `
                    <div class="integration-item-header">
                        <img src="${logoUrl}" alt="${integration.platform}" class="platform-logo-small" onerror="this.style.display='none'">
                        <h4>${integration.name}</h4>
                    </div>
                    <div class="integration-item-body">
                        <span class="status-badge ${integration.status === 'active' ? 'success' : 'default'}">${integration.status === 'active' ? 'Ativado' : 'Desativado'}</span>
                    </div>
                    <div class="integration-item-footer">
                        <button class="btn-icon btn-edit-integration" title="Configurar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 1.987l.169.311a1.464 1.464 0 0 1-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 .872-2.105l.34-.1c1.4-.413-1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z"/></svg>
                        </button>
                        <button class="btn-icon btn-delete-integration" title="Excluir">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg>
                        </button>
                    </div>
                `;
                integrationsListEl.appendChild(card);
            });
        } catch (err) {
            integrationsListEl.innerHTML = `<div class="placeholder-view"><p style="color: red;">${err.message}</p></div>`;
        }
    }

    async function showIntegrationSetup(platform) {
        // Esconde a lista e mostra a tela de configuração
        integrationsListView.classList.add('hidden');
        integrationSetupView.classList.remove('hidden');

        // Seleciona os elementos da tela de setup
        const setupTitleEl = document.getElementById('setup-title');
        const platformInstructionsEl = document.getElementById('platform-instructions');
        const webhookUrlDisplayEl = document.getElementById('integration-webhook-url');
        const integrationNameInput = document.getElementById('integration-name');
        const btnSaveIntegration = document.getElementById('btn-save-integration');

        // Preenche os títulos e as instruções
        setupTitleEl.textContent = `Configurar Integração com ${platform.name}`;
        platformInstructionsEl.innerHTML = instructions[platform.id] || instructions.default;

        // Limpa os campos e desativa o botão de salvar enquanto a URL é gerada
        integrationNameInput.value = '';
        webhookUrlDisplayEl.textContent = 'A gerar URL...';
        btnSaveIntegration.disabled = true;

        try {
            // ==================================================================
            // ESTE É O BLOCO DE CÓDIGO CRÍTICO QUE PRECISA DE SER IMPLEMENTADO
            // ==================================================================

            // 1. Faz uma chamada à API para criar uma nova integração "rascunho"
            const response = await authFetch('/api/integrations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    platform: platform.id,
                    name: `Nova Integração ${platform.name}` // Nome temporário
                })
            });

            const newIntegration = await response.json();
            if (!response.ok) {
                throw new Error(newIntegration.error || 'Não foi possível gerar a URL de integração.');
            }

            // 2. Exibe a URL real recebida do backend
            webhookUrlDisplayEl.textContent = newIntegration.webhook_url;
            btnSaveIntegration.disabled = false; // Ativa o botão de salvar

            // Armazena o ID para ser utilizado no salvamento
            integrationSetupView.dataset.editingId = newIntegration.id;

        } catch (error) {
            showNotification(error.message, 'error');
            webhookUrlDisplayEl.textContent = 'Erro ao gerar URL.';
            btnSaveIntegration.disabled = true;
        }
    }

    function showIntegrationsList() {
        integrationSetupView.classList.add('hidden');
        integrationsListView.classList.remove('hidden');
    }

    function openPlatformModal() {
        platformGrid.innerHTML = '';
        supportedPlatforms.forEach(platform => {
            const platformTile = document.createElement('div');
            platformTile.className = 'platform-tile';
            platformTile.dataset.platformId = platform.id;
            platformTile.innerHTML = `<img src="${platform.logo}" alt="${platform.name}"><span>${platform.name}</span>`;
            platformTile.addEventListener('click', () => {
                closePlatformModal();
                showIntegrationSetup(platform);
            });
            platformGrid.appendChild(platformTile);
        });
        modalPlatformSelect.classList.add('active');
    }

    function closePlatformModal() {
        modalPlatformSelect.classList.remove('active');
    }

    const integrationsListEl = document.getElementById('integrations-list');
    if (integrationsListEl) {
        integrationsListEl.addEventListener('click', (e) => {
            const editButton = e.target.closest('.btn-edit-integration');
            const deleteButton = e.target.closest('.btn-delete-integration');

            if (editButton) {
                const card = editButton.closest('.integration-card-item');
                const integrationId = card.dataset.integrationId;
                const integrationData = integrationsCache.find(i => String(i.id) === integrationId);
                if (integrationData) {
                    showIntegrationSetup(integrationData);
                }
            }

            if (deleteButton) {
                const card = deleteButton.closest('.integration-card-item');
                const integrationId = card.dataset.integrationId;

                showConfirmationModal('Tem a certeza que deseja excluir esta integração? Esta ação não pode ser desfeita.', async () => {
                    try {
                        const response = await authFetch(`/api/integrations/${integrationId}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.error);

                        showNotification('Integração excluída com sucesso!', 'success');
                        loadAndRenderIntegrations();
                    } catch (err) {
                        showNotification(`Erro ao excluir: ${err.message}`, 'error');
                    }
                });
            }
        });
    }

    if (btnAddIntegration) btnAddIntegration.addEventListener('click', openPlatformModal);
    if (btnClosePlatformModal) btnClosePlatformModal.addEventListener('click', closePlatformModal);
    if (modalPlatformSelect) modalPlatformSelect.addEventListener('click', (e) => {
        if (e.target === modalPlatformSelect) closePlatformModal();
    });
    if (btnCancelSetup) btnCancelSetup.addEventListener('click', showIntegrationsList);

    // --- 7. Inicialização ---
    fetchErenderizarTudo();
    loadSubscriptionStatus();
    connectWebSocket();
    showView('chat-view');
});
