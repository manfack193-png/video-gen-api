const express = require('express');
const cloudinary = require('cloudinary').v2;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// --- আপনার Cloudinary সেটিংস ---
cloudinary.config({ 
  cloud_name: 'video-gen', 
  api_key: '974899749497919', 
  api_secret: 'zMa96i-ABKmtEv24iwvS17OUseY' 
});

// জব স্ট্যাটাস ট্র্যাকিং
let jobs = {};

// ১. Home Route (Cron-job কে ৪MD এরর থেকে বাঁচাতে)
app.get('/', (req, res) => {
    res.send("<h1>Video Generation Server is Active!</h1><p>Cron-job is working.</p>");
});

// ২. POST Method: ভিডিও তৈরির রিকোয়েস্ট নেওয়া
app.post('/make-video', (req, res) => {
    const projectId = "vid_" + Date.now();
    const data = req.body; // n8n থেকে আসা JSON ডেটা
    
    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    console.log(`Processing project: ${projectId}`);

    // ভিডিও রেন্ডারিং (এখানে স্যাম্পল ৫ সেকেন্ডের ভিডিও)
    ffmpeg()
        .input('color=c=navy:s=1280x720:d=5') // নেভি ব্লু ব্যাকগ্রাউন্ড
        .inputFormat('lavfi')
        .outputOptions(['-pix_fmt yuv420p'])
        .on('end', async () => {
            try {
                // Cloudinary-তে আপলোড
                const result = await cloudinary.uploader.upload(outputPath, { 
                    resource_type: "video",
                    public_id: projectId 
                });
                
                jobs[projectId].status = "completed";
                jobs[projectId].link = result.secure_url;

                // লোকাল ফাইল মুছে ফেলা
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                console.log(`Video Live: ${result.secure_url}`);
            } catch (error) {
                jobs[projectId].status = "failed";
                console.error("Cloudinary Error:", error);
            }
        })
        .on('error', (err) => {
            jobs[projectId].status = "failed";
            console.error("FFmpeg Error:", err.message);
        })
        .save(outputPath);

    // সাথে সাথে প্রজেক্ট আইডি রিটার্ন করা
    res.json({ project: projectId, status: "success" });
});

// ৩. GET Method: স্ট্যাটাস এবং লিঙ্ক চেক করা
app.get('/make-video', (req, res) => {
    const projectId = req.query.project;
    if (jobs[projectId]) {
        res.json(jobs[projectId]);
    } else {
        res.status(404).json({ error: "Project not found" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
