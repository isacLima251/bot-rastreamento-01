document.addEventListener('DOMContentLoaded', () => {
    // Se o utilizador já está logado, vai para o painel principal
    if (localStorage.getItem('token')) {
        window.location.href = '/index.html';
        return;
    }

    // Seleção dos elementos do formulário
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitButton = document.getElementById('submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const loader = submitButton.querySelector('.loader');
    const loginError = document.getElementById('login-error');

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

    function parseJwt(t) {
        try {
            return JSON.parse(atob(t.split('.')[1]));
        } catch (e) {
            return {};
        }
    }

    function displayError(message) {
        loginError.textContent = message;
    }

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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        displayError(''); // Limpa erros antigos
        setLoading(true);

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await resp.json();

            if (!resp.ok) {
                throw new Error(data.error || 'Credenciais incorretas');
            }
            
            localStorage.setItem('token', data.token);
            const info = parseJwt(data.token);

            if (info.precisa_trocar_senha) {
                window.location.href = '/change-password.html';
            } else {
                window.location.href = '/index.html';
            }
        } catch (err) {
            displayError(err.message);
        } finally {
            setLoading(false);
        }
    });
});