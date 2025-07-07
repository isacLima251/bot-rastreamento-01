document.addEventListener('DOMContentLoaded', () => {
    // Seleção dos elementos do formulário
    const form = document.getElementById('register-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = document.getElementById('submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const loader = submitButton.querySelector('.loader');

    // Seleção dos elementos de erro e força da senha
    const emailError = document.getElementById('email-error');
    const confirmPasswordError = document.getElementById('confirm-password-error');
    const strengthBar = document.querySelector('.strength-bar');
    const strengthText = document.querySelector('.strength-text');

    // Ícones de "Mostrar/Ocultar Senha"
    const eyeIcon = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>`;
    const eyeSlashIcon = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.06 7.06 0 0 0 2.79-.588M5.21 3.088A7.06 7.06 0 0 1 8 3.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/><path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/></svg>`;
    
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.innerHTML = eyeSlashIcon;
        toggle.addEventListener('click', () => {
            const input = toggle.previousElementSibling;
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.innerHTML = isPassword ? eyeIcon : eyeSlashIcon;
        });
    });

    // Função para verificar a força da senha
    function checkPasswordStrength(password) {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;

        const strengthMap = {
            0: { text: '', color: '#e5e7eb', width: '0%' },
            1: { text: 'Muito Fraca', color: '#ef4444', width: '20%' },
            2: { text: 'Fraca', color: '#f97316', width: '40%' },
            3: { text: 'Razoável', color: '#facc15', width: '60%' },
            4: { text: 'Boa', color: '#84cc16', width: '80%' },
            5: { text: 'Forte', color: '#22c55e', width: '100%' }
        };
        const { text, color, width } = strengthMap[score] || strengthMap[0];
        strengthBar.style.width = width;
        strengthBar.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    }
    
    passwordInput.addEventListener('input', () => checkPasswordStrength(passwordInput.value));

    // Função para mostrar e esconder erros
    function displayError(element, message) {
        element.textContent = message;
    }

    // Função para controlar o estado do botão de submit
    function setLoading(isLoading) {
        if (isLoading) {
            submitButton.disabled = true;
            buttonText.classList.add('hidden');
            loader.classList.remove('hidden');
        } else {
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    }

    // Validação e submissão do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpa erros antigos
        displayError(emailError, '');
        displayError(confirmPasswordError, '');
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validações client-side
        let isValid = true;
        if (password.length < 8) {
            displayError(confirmPasswordError, 'A senha deve ter no mínimo 8 caracteres.');
            isValid = false;
        }
        if (password !== confirmPassword) {
            displayError(confirmPasswordError, 'As senhas não coincidem.');
            isValid = false;
        }
        if (!isValid) return;

        setLoading(true);

        try {
            const resp = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await resp.json();

            if (!resp.ok) {
                // Exibe o erro da API no campo de email
                displayError(emailError, result.error || 'Falha ao registar. Tente novamente.');
                throw new Error('API Error');
            }
            
            // Sucesso!
            buttonText.textContent = 'Sucesso!';
            submitButton.style.backgroundColor = 'var(--success-color)';
            
            // Redireciona para o login após um breve momento
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);

        } catch (err) {
            // Se não for um erro de API, não faz nada (o erro já foi mostrado)
             if (err.message !== 'API Error') {
                displayError(emailError, 'Ocorreu um erro de rede. Verifique sua conexão.');
             }
        } finally {
            // Só reativa o botão se não houver sucesso
            if (buttonText.textContent !== 'Sucesso!') {
                setLoading(false);
            }
        }
    });
});