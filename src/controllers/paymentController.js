const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET || '', { apiVersion: '2022-11-15' });
const subscriptionService = require('../services/subscriptionService');

exports.handleWebhook = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.PAY_WEBHOOK_SECRET || '');
    } catch (err) {
        console.error('Webhook signature verification failed.', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (userId) {
            try {
                await subscriptionService.updateSubscriptionStatus(req.db, userId, 'active');
            } catch (e) {
                console.error('Erro ao atualizar assinatura:', e);
            }
        }
    }

    res.json({ received: true });
};

