document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('flow-name');
    const triggerInput = document.getElementById('flow-trigger');
    const nodesContainer = document.getElementById('nodes-container');
    const btnAddNode = document.getElementById('btn-add-node');
    const btnSave = document.getElementById('btn-save-flow');
    const btnBack = document.getElementById('btn-back');

    const params = new URLSearchParams(window.location.search);
    const flowId = params.get('id');

    function createOption(stepEl, data = {}) {
        const div = document.createElement('div');
        div.className = 'option-item';
        div.innerHTML = `
            <input type="text" class="option-text" placeholder="Texto do botão">
            <select class="option-next"></select>
            <button type="button" class="btn-icon btn-remove-option">&times;</button>
        `;
        div.querySelector('.option-text').value = data.option_text || '';
        div.querySelector('.option-next').value = data.next_node_id || '';
        div.querySelector('.btn-remove-option').addEventListener('click', () => {
            div.remove();
            updateOptionTargets();
        });
        stepEl.querySelector('.options-container').appendChild(div);
    }

    function createStep(data = {}) {
        const step = document.createElement('div');
        step.className = 'flow-step';
        step.innerHTML = `
            <div class="step-header">
                <h5>Passo <span class="step-number"></span></h5>
                <button type="button" class="btn-icon btn-remove-step">&times;</button>
            </div>
            <select class="step-type">
                <option value="message">Enviar Mensagem</option>
                <option value="question">Pergunta com Opções</option>
            </select>
            <textarea class="step-message" rows="3" placeholder="Texto da mensagem"></textarea>
            <div class="options-section" style="display:none">
                <h6>Opções de Resposta</h6>
                <div class="options-container"></div>
                <button type="button" class="btn-secondary btn-add-option">+ Adicionar Opção</button>
            </div>
        `;
        step.querySelector('.step-type').value = data.node_type || 'message';
        step.querySelector('.step-message').value = data.message_text || '';
        step.querySelector('.btn-remove-step').addEventListener('click', () => {
            step.remove();
            updateAll();
        });
        const typeSelect = step.querySelector('.step-type');
        const optionsSection = step.querySelector('.options-section');
        const addOpt = step.querySelector('.btn-add-option');
        function toggle() {
            optionsSection.style.display = typeSelect.value === 'question' ? 'block' : 'none';
        }
        typeSelect.addEventListener('change', toggle);
        addOpt.addEventListener('click', () => { createOption(step); updateOptionTargets(); });
        toggle();
        (data.options || []).forEach(o => createOption(step, o));
        nodesContainer.appendChild(step);
    }

    function updateStepNumbers() {
        nodesContainer.querySelectorAll('.flow-step').forEach((el, idx) => {
            const numEl = el.querySelector('.step-number');
            if (numEl) numEl.textContent = idx + 1;
        });
    }

    function updateOptionTargets() {
        const steps = Array.from(nodesContainer.querySelectorAll('.flow-step'));
        steps.forEach((stepEl) => {
            const opts = ['<option value="">Fim do Fluxo</option>'];
            steps.forEach((other, idx) => {
                if (other !== stepEl) opts.push(`<option value="${idx + 1}">Passo ${idx + 1}</option>`);
            });
            stepEl.querySelectorAll('.option-next').forEach(sel => {
                const current = sel.value;
                sel.innerHTML = opts.join('');
                if ([...sel.options].some(o => o.value === current)) sel.value = current;
            });
        });
    }

    function updateAll() {
        updateStepNumbers();
        updateOptionTargets();
    }

    function collectData() {
        const nodes = [];
        nodesContainer.querySelectorAll('.flow-step').forEach((el, idx) => {
            const type = el.querySelector('.step-type').value;
            const node = {
                node_type: type,
                message_text: el.querySelector('.step-message').value,
                is_start_node: idx === 0
            };
            if (type === 'question') {
                node.options = [];
                el.querySelectorAll('.option-item').forEach(optEl => {
                    node.options.push({
                        option_text: optEl.querySelector('.option-text').value,
                        next_node_id: optEl.querySelector('.option-next').value || null
                    });
                });
            }
            nodes.push(node);
        });
        return {
            name: nameInput.value.trim(),
            trigger_keyword: triggerInput.value.trim(),
            nodes
        };
    }

    async function loadFlow(id) {
        try {
            const resp = await fetch(`/api/flows/${id}`);
            if (!resp.ok) throw new Error('Erro ao carregar fluxo');
            const flow = await resp.json();
            nameInput.value = flow.name || '';
            triggerInput.value = flow.trigger_keyword || '';
            nodesContainer.innerHTML = '';
            const nodes = Array.isArray(flow.FlowNodes) ? flow.FlowNodes : [];
            nodes.forEach(n => createStep({
                node_type: n.node_type,
                message_text: n.message_text,
                options: Array.isArray(n.NodeOptions) ? n.NodeOptions : []
            }));
            if (!nodes.length) createStep();
            updateAll();
        } catch (err) {
            console.error(err);
        }
    }

    async function saveFlow() {
        const data = collectData();
        if (!data.name || !data.trigger_keyword) {
            alert('Preencha nome e gatilho');
            return;
        }
        btnSave.disabled = true;
        try {
            const resp = await fetch(flowId ? `/api/flows/${flowId}` : '/api/flows', {
                method: flowId ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!resp.ok) throw new Error('Falha ao salvar fluxo');
            window.location.href = 'flows/flows.html';
        } catch (err) {
            alert(err.message);
        } finally {
            btnSave.disabled = false;
        }
    }

    btnAddNode.addEventListener('click', () => { createStep(); updateAll(); });
    btnSave.addEventListener('click', saveFlow);
    btnBack.addEventListener('click', () => { window.location.href = 'flows/flows.html'; });

    if (flowId) loadFlow(flowId); else { createStep(); updateAll(); }
});
