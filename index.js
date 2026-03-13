const express = require('express');
const { render } = require('rendervid');
const app = express();

app.use(express.json());

app.post('/make-video', async (req, res) => {
    try {
        const data = req.body;
        console.log("n8n Data Received:", data);

        // This is a basic response to confirm API is working
        res.json({
            status: "success",
            message: "Rendervid is triggered!",
            received_data: data
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
