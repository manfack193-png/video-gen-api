const express = require('express');
const app = express();

app.use(express.json());

app.post('/make-video', (req, res) => {
    const data = req.body;
    console.log("n8n থেকে পাওয়া তথ্য:", JSON.stringify(data, null, 2));

    res.json({
        status: "success",
        message: "আপনার পাঠানো তথ্য Render সার্ভারে পৌঁছেছে!",
        received_variables: data.variables || "No variables found"
    });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`সার্ভার চলছে পোর্ট ${PORT}-এ`));
