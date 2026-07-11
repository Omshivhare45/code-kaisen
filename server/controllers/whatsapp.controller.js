const whatsappService = require("../services/whatsapp.service");

const verifyWebhook = (req, res) => {

    const mode = req.query["hub.mode"];

    const token = req.query["hub.verify_token"];

    const challenge = req.query["hub.challenge"];

    if (
        mode === "subscribe" &&
        token === process.env.VERIFY_TOKEN
    ) {
        console.log("Webhook Verified");

        return res.status(200).send(challenge);
    }

    return res.sendStatus(403);
};

const receiveWebhook = async (req, res) => {
    
    console.log("Incoming Webhook");

    console.log(
        JSON.stringify(req.body, null, 2)
    );

    await whatsappService.processMessage(req.body);

    res.sendStatus(200);
};

module.exports = {
    verifyWebhook,
    receiveWebhook
};