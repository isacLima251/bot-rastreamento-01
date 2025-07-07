document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Seleção dos novos elementos do formulário
    const form = document.getElementById('change-form');
    const newPasswordInput = document.getElementById('new-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const submitButton = document.getElementById('submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const loader = submitButton.querySelector('.loader');
    const passwordError = document.getElementById('password-error');

    // Ícones e lógica para "Mostrar/Ocultar Senha"
    const eyeIcon = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8M1.173 8a13 13 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5s3.879 1.168 5.168 2.457A13 13 0 0 1 14.828 8q-.086.13-.195.288c-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5s-3.879-1.168-5.168-2.457A13 13 0 0 1 1.172 8z"/><path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0"/></svg>`;
    const eyeSlashIcon = `<svg width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="m10.79 12.912-1.614-1.615a3.5 3.5 0 0 1-4.474-4.474l-2.06-2.06C.938 6.278 0 8 0 8s3 5.5 8 5.5a7.06 7.06 0 0 0 2.79-.588M5.21 3.088A7.06 7.06 0 0 1 8 3.5c5 0 8 5.5 8 5.5s-.939 1.721-2.641 3.238l-2.062-2.062a3.5 3.5 0 0 0-4.474-4.474z"/><path d="M5.525 7.646a2.5 2.5 0 0 0 2.829 2.829l-2.83-2.829zm4.95.708-2.829-2.83a2.5 2.5 0 0 1 2.829 2.829zm3.171 6-12-12 .708-.708 12 12z"/></svg>`;

    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.innerHTML = eyeSlashIcon;
        toggle.addEventListener('click', () => {
            const input = toggle.closest('.input-wrapper').querySelector('input');
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.innerHTML = isPassword ? eyeIcon : eyeSlashIcon;
        });
    });

    function displayError(message) {
        passwordError.textContent = message;
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
        displayError('');

        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Validações
        if (newPassword.length < 8) {
            displayError('A senha deve ter no mínimo 8 caracteres.');
            return;
        }
        if (newPassword !== confirmPassword) {
            displayError('As senhas não coincidem.');
            return;
        }

        setLoading(true);

        try {
            const resp = await fetch('/api/users/me/password', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ password: newPassword })
            });

            if (!resp.ok) {
                const dataError = await resp.json().catch(() => ({ error: 'Falha ao atualizar a senha' }));
                throw new Error(dataError.error);
            }

            localStorage.removeItem('token');
            alert('Senha atualizada com sucesso! Por favor, faça o login novamente.');
            window.location.href = '/login.html';
        } catch (err) {
            displayError(err.message || 'Falha ao atualizar a senha.');
        } finally {
            setLoading(false);
        }
    });
});
