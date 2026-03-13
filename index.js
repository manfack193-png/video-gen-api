const express = require('express');
const cloudinary = require('cloudinary').v2;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// Cloudinary কনফিগারেশন
cloudinary.config({ 
  cloud_name: 'video-gen', 
  api_key: '974899749497919', 
  api_secret: 'zMa96i-ABKmtEv24iwvS17OUseY' 
});

let jobs = {};

// ১. Home Route
app.get('/', (req, res) => {
    res.status(200).send("Video Engine is Active!");
});

// ২. ভিডিও তৈরির রিকোয়েস্ট
app.post('/make-video', (req, res) => {
    const projectId = "vid_" + Date.now();
    const vars = req.body.variables || {};
    
    const topic = vars.topic || "Default Topic";
    const language = vars.language || "English";
    
    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    console.log(`Working on: ${topic}`);

    ffmpeg()
        .input('color=c=navy:s=720x1280:d=5') // সময় কমিয়ে ৫ সেকেন্ড করলাম দ্রুত রেন্ডারের জন্য
        .inputFormat('lavfi')
        .complexFilter([
            `drawtext=text='${topic}':fontsize=40:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2`
        ])
        .outputOptions(['-pix_fmt yuv420p'])
        .on('error', (err) => {
            console.error("FFmpeg error: " + err.message);
            if (jobs[projectId]) jobs[projectId].status = "failed";
        })
        .on('end', async () => {
            try {
                const result = await cloudinary.uploader.upload(outputPath, { 
                    resource_type: "video" 
                });
                jobs[projectId] = { status: "completed", link: result.secure_url };
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (err) {
                console.error("Cloudinary error: ", err);
                if (jobs[projectId]) jobs[projectId].status = "failed";
            }
        })
        .save(outputPath);

    // সাথে সাথে রেসপন্স পাঠানো যেন n8n টাইমআউট না হয়
    res.json({ project: projectId, status: "success" });
});

// ৩. স্ট্যাটাস চেক
app.get('/make-video', (req, res) => {
    const projectId = req.query.project;
    if (jobs[projectId]) {
        res.json(jobs[projectId]);
    } else {
        res.status(404).json({ error: "Job not found" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
