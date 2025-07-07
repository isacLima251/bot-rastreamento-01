# Bot de Rastreamento Automático via WhatsApp

Este é um projeto Node.js que automatiza o rastreamento de pedidos e o envio de mensagens via WhatsApp, com suporte a planilhas do Google Sheets e APIs de rastreio como o Site Rastreio.

---

## 📅 Objetivo

* Automatizar o acompanhamento de pedidos enviados via Correios.
* Notificar os clientes automaticamente pelo WhatsApp sobre o status do pedido.
* Atualizar a planilha do Google com as informações de rastreio.

---

## 🎓 Tecnologias Utilizadas

* Node.js
* Google Sheets API
* Venom Bot (WhatsApp automation)
* Site Rastreio API
* Puppeteer (para Web Scraping futuro)

---

## 🚀 Como Funciona

1. Leitura da planilha no Google Sheets com os pedidos.
2. Consulta automática dos códigos de rastreio via API.
3. Envio de mensagens automáticas via WhatsApp com as atualizações.
4. Atualização dos campos na planilha (status, localização, data, etc).

---

## 🔧 Instalação

```bash
# Clonar o repositório
git clone https://github.com/isacLima251/bot-rastreamento.git
cd bot-rastreamento

# Instalar dependências
npm install

# Copiar o arquivo de exemplo de variáveis de ambiente
cp .env.example .env
```

Edite o `.env` com suas chaves e URLs de callback. As principais variáveis são:
- `JWT_SECRET` – chave usada para assinar os tokens JWT
- `SITERASTREIO_API_KEY` – chave da API do Site Rastreio
- `TICTO_SECRET` – token para validar os webhooks da Ticto (enviado no header `X-Ticto-Token`)
- `PORT` – porta em que o servidor irá rodar (padrão 3000)
- `DB_PATH` – caminho para o arquivo SQLite (opcional)

---

## 🔹 Como Usar

### 1. Iniciar o servidor

```bash
npm start
```

Esse comando executa o `server.js`, responsável pela API, WebSocket e tarefas de rastreamento.
O acompanhamento dos pedidos é feito de forma automática enquanto o WhatsApp estiver conectado.

Após iniciar, abra [http://localhost:3000](http://localhost:3000/) no navegador para acessar a página de apresentação.
Nela há um botão que direciona para o fluxo de login e cadastro.

### 2. Criar ou promover administradores

Para gerenciar contas de administrador via terminal execute o script `criar-admin.js`:

```bash
node criar-admin.js
```

Ele irá perguntar o e-mail e, se o usuário não existir, será criado como administrador. Caso já exista, você poderá promovê-lo.

---

## 📚 Estrutura do Projeto

```
meu-bot-rastreamento/
├── server.js               # Servidor Express com API e WebSocket
├── public/                 # Páginas HTML e scripts de painel
└── src/
    ├── controllers/        # Lógica das rotas da API
    ├── services/           # Integrações (WhatsApp, rastreamento, etc.)
    ├── database/           # Inicialização do SQLite
    └── middleware/         # Autenticação e checagem de planos
```

---

## 🔒 Requisitos

* Conta Google com acesso à planilha
* API Key do Site Rastreio: [https://www.siterastreio.com.br/api-correios](https://www.siterastreio.com.br/api-correios)
* Chrome instalado (para o Puppeteer/Venom)

---

## 🔐 Autenticação

O backend agora suporta múltiplos usuários. Registre-se usando:

```bash
POST /api/register { email, password }
```

Realize login para receber um token JWT:

```bash
POST /api/login { email, password }
```

Envie o token nas próximas requisições em `Authorization: Bearer <token>`.

Cada usuário também possui uma **API Key** única, necessária para acessar a rota
`POST /api/postback`. Consulte a sua chave em `/api/integrations/info` e, caso
precise, gere uma nova em `/api/integrations/regenerate`.

As configurações de integração (como a chave de postback e a API do Site Rastreio) são armazenadas por usuário. Use `GET /api/integrations/info` para consultar e `PUT /api/integrations/settings` para atualizar seus dados.

---

## 💳 Integração com a Ticto

Configure a variável `TICTO_SECRET` no `.env`. Esse token deve coincidir com o valor enviado pela Ticto no cabeçalho `X-Ticto-Token` sempre que uma compra for aprovada.

Ao receber um webhook válido, o servidor criará a conta do usuário (caso ainda não exista), atribuirá o plano adquirido e enviará um e-mail de boas-vindas com uma senha provisória.

---

## 📡 Webhooks de Venda e Rastreio

Para receber códigos de rastreio automaticamente configure **dois webhooks** na plataforma de vendas (Hotmart, Kiwify, Braip, etc.) apontando para o endpoint abaixo:

```
POST https://seu-servidor/api/postback?key=SUA_API_KEY
```

1. **Venda Aprovada** (`purchase_approved` ou equivalente) – envia nome, telefone e produto do cliente. O pedido é criado sem código de rastreio.
2. **Código de Rastreio Adicionado** (`tracking_code_added`) – envia o telefone do cliente e o campo `tracking_code`. O pedido existente é atualizado com o código e o uso do plano é incrementado.

Nosso servidor já reconhece automaticamente webhooks da Hotmart e da Kiwify, convertendo os campos para esse formato padronizado. Em outras plataformas, mantenha os nomes o mais próximo possível do exemplo acima.

---

## ⚖️ Licença

MIT — Livre para usar e modificar.
