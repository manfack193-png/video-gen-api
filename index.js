const express = require('express');
const cloudinary = require('cloudinary').v2;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

// --- আপনার Cloudinary সেটিংস ---
cloudinary.config({ 
  cloud_name: 'video-gen', 
  api_key: '974899749497919', 
  api_secret: 'zMa96i-ABKmtEv24iwvS17OUseY' 
});

let jobs = {};

// ১. Home Route (Cron-job এর জন্য)
app.get('/', (req, res) => {
    res.send("<h1>Video Engine is Active!</h1>");
});

// ২. POST Method: এয়ারটেবিল থেকে সব ডাটা রিসিভ করা
app.post('/make-video', async (req, res) => {
    const projectId = "vid_" + Date.now();
    const vars = req.body.variables || {};
    
    // এয়ারটেবিলের কলামগুলো থেকে ডাটা ধরা
    const topic = vars.topic || "AI Automation";
    const language = vars.language || "English";
    const voiceName = vars.voice_name || "Standard";
    const subtitlesFont = vars.subtitles_font || "Arial";
    
    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    console.log(`Starting Project for: ${topic}`);

    // ভিডিও জেনারেশন লজিক
    // আমরা এখানে ১০ সেকেন্ডের একটি ভিডিও বানাচ্ছি যেখানে টপিক এবং ভয়েস নাম লেখা থাকবে
    ffmpeg()
        .input('color=c=navy:s=720x1280:d=10') // পোর্ট্রেট মোড (Shorts Style)
        .inputFormat('lavfi')
        .complexFilter([
            {
                filter: 'drawtext',
                options: {
                    text: `${topic}\n(${language})`,
                    fontsize: 45,
                    fontcolor: 'white',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2 - 50',
                    box: 1, boxcolor: 'black@0.5', boxborderw: 15
                }
            },
            {
                filter: 'drawtext',
                options: {
                    text: `Voice: ${voiceName}`,
                    fontsize: 30,
                    fontcolor: 'yellow',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2 + 100'
                }
            }
        ])
        .outputOptions(['-pix_fmt yuv420p'])
        .on('end', async () => {
            try {
                // Cloudinary-তে আপলোড করা
                const result = await cloudinary.uploader.upload(outputPath, { 
                    resource_type: "video",
                    public_id: projectId 
                });
                
                jobs[projectId] = { status: "completed", link: result.secure_url };
                
                // লোকাল ফাইল ডিলিট
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                console.log("Success: " + result.secure_url);
            } catch (err) {
                jobs[projectId].status = "failed";
                console.error("Upload failed", err);
            }
        })
        .save(outputPath);

    res.json({ project: projectId, status: "success" });
});

// ৩. GET Method: n8n স্ট্যাটাস চেক করবে
app.get('/make-video', (req, res) => {
    const projectId = req.query.project;
    res.json(jobs[projectId] || { error: "Not found" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server running...'));
