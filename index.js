const express = require("express");
const axios = require("axios").default;
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 4400;
const CHAPA_URL = process.env.CHAPA_URL || "https://api.chapa.co/v1/transaction/initialize";
const CHAPA_AUTH = process.env.CHAPA_AUTH;

app.set("view engine", "ejs");

// Configure headers for API requests
const config = {
    headers: {
        Authorization: `Bearer ${CHAPA_AUTH}`
    }
};

// Payment configuration
const paymentConfig = {
    CALLBACK_URL: "http://localhost:4400/api/verify-payment/",
    RETURN_URL: "http://localhost:4400/api/payment-success/",
    MAX_RETRIES: 3,
    RETRY_INTERVAL: 2000
};

// Retry mechanism
async function performPaymentWithRetry(data, res) {
    const { CALLBACK_URL, MAX_RETRIES, RETRY_INTERVAL } = paymentConfig;

    let retries = 0;
    let success = false;

    while (!success && retries < MAX_RETRIES) {
        try {
            const response = await axios.post(CHAPA_URL, data, config);
            res.redirect(response.data.data.checkout_url);
            success = true;
        } catch (err) {
            console.error("Error processing payment");
            retries++;
            await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
        }
    }

    if (!success) {
        res.status(500).json({ error: "An error occurred while processing the payment." });
    }
}

// Entry for the front end
app.get('/', (req, res) => {
    res.render("index");
});
//add unique value for the user for TEXT_REF and concat it
// Initial payment endpoint
app.post("/api/pay", async (req, res) => {
    const TEXT_REF = "tx-myecommerce12345-" + Date.now();

    const data = {
        amount: '100',
        currency: 'ETB',
        email: 'ato@ekele.com',
        first_name: 'Ato',
        last_name: 'Ekele',
        tx_ref: TEXT_REF,
        callback_url: paymentConfig.CALLBACK_URL + TEXT_REF,
        return_url: paymentConfig.RETURN_URL
    };

    await performPaymentWithRetry(data, res);
});

// Verification endpoint
app.get("/api/verify-payment/:id", async (req, res) => {
    try {
        const response = await axios.get("https://api.chapa.co/v1/transaction/verify/" + req.params.id, config);
        console.log("Payment was successfully verified");
    } catch (err) {
        console.log("Payment can't be verified", err);
    }
});

// Payment success endpoint
app.get("/api/payment-success", async (req, res) => {
    res.render("success");
});

app.listen(PORT, () => console.log("Server listening on port:", PORT));
