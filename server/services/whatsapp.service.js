const processMessage = async (body) => {

    try {

        const entry = body.entry?.[0];

        const changes = entry?.changes?.[0];

        const value = changes?.value;

        const message = value?.messages?.[0];

        if (!message) {

            console.log("No Message");

            return;
        }

        console.log("Sender");

        console.log(message.from);

        console.log("Type");

        console.log(message.type);

        if (message.type === "text") {

            console.log("Text");

            console.log(message.text.body);

        }

        if (message.type === "image") {

            console.log("Image Id");

            console.log(message.image.id);

        }

    }

    catch (err) {

        console.log(err);

    }

};

module.exports = {
    processMessage
};