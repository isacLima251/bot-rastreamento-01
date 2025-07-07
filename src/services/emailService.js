const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY || '');

async function sendWelcomeEmail(to, password) {
    if (!process.env.RESEND_API_KEY) {
        console.warn('RESEND_API_KEY não configurada. O e-mail de boas-vindas não será enviado.');
        return;
    }
    const loginUrl = (process.env.APP_URL || 'http://localhost:3000') + '/login.html';

    const html = `
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb; overflow: hidden; }
        .header { background-color: #1f2937; padding: 20px 30px; text-align: center; }
        .header h1 { color: #3b82f6; font-family: 'Poppins', sans-serif; margin: 0; font-size: 24px; }
        .content { padding: 30px 40px; color: #1f2937; line-height: 1.6; }
        .content h2 { font-size: 20px; color: #1f2937; margin-top: 0; }
        .credentials { background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; }
        .credentials p { margin: 5px 0; }
        .cta-button { display: block; width: fit-content; margin: 30px auto; padding: 12px 25px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>WhatsShip</h1>
        </div>
        <div class="content">
            <h2>Bem-vindo(a) à nossa plataforma!</h2>
            <p>Olá,</p>
            <p>Sua conta foi criada com sucesso. Abaixo estão as suas credenciais de acesso temporárias. Recomendamos que você altere sua senha no primeiro login.</p>
            <div class="credentials">
                <p><strong>Email de Acesso:</strong> ${to}</p>
                <p><strong>Senha Provisória:</strong> <strong>${password}</strong></p>
            </div>
            <a href="${loginUrl}" class="cta-button">Aceder à sua Conta</a>
            <p>Se tiver alguma dúvida, basta responder a este e-mail.</p>
            <p>Atenciosamente,<br>Equipa WhatsShip</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} WhatsShip. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>
`;

    try {
        await resend.emails.send({
            from: 'Boas-Vindas WhatsShip <nao-responda@whatsship.com.br>',
            to: to,
            subject: 'Bem-vindo(a) ao WhatsShip! Suas credenciais de acesso.',
            html: html
        });
    } catch (err) {
        console.error('Erro ao enviar email de boas-vindas:', err);
    }
}

module.exports = { sendWelcomeEmail };
