const express = require('express');
const cloudinary = require('cloudinary').v2;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

cloudinary.config({ 
  cloud_name: 'video-gen', 
  api_key: '974899749497919', 
  api_secret: 'zMa96i-ABKmtEv24iwvS17OUseY' 
});

let jobs = {};

app.get('/', (req, res) => res.send("Video Engine Active"));

app.post('/make-video', (req, res) => {
    const projectId = "vid_" + Date.now();
    const vars = req.body.variables || {};
    
    // টেক্সট থেকে সব ঝামেলাপূর্ণ চিহ্ন সরিয়ে ফেলা (এটাই সমাধান)
    let topic = vars.topic || "Success Mindset";
    topic = topic.replace(/[:']/g, "").replace(/[^a-zA-Z0-9\s.,!?]/g, ""); 
    
    // টেক্সটকে ছোট ছোট লাইনে ভাগ করা
    const words = topic.split(' ');
    let formattedTopic = '';
    for (let i = 0; i < words.length; i++) {
        formattedTopic += words[i] + ' ';
        if ((i + 1) % 4 === 0) formattedTopic += '\n'; // প্রতি ৪ শব্দ পর পর নতুন লাইন
    }

    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    ffmpeg()
        .input('color=c=navy:s=720x1280:d=5') // ৫ সেকেন্ডের ভিডিও
        .inputFormat('lavfi')
        .complexFilter([
            {
                filter: 'drawtext',
                options: {
                    text: formattedTopic.trim(),
                    fontsize: 40,
                    fontcolor: 'white',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2',
                    box: 1,
                    boxcolor: 'black@0.6',
                    boxborderw: 20
                }
            }
        ])
        .outputOptions(['-pix_fmt yuv420p'])
        .on('error', (err) => {
            console.log("FFmpeg Error: " + err.message);
            if(jobs[projectId]) jobs[projectId].status = "failed";
        })
        .on('end', async () => {
            try {
                const result = await cloudinary.uploader.upload(outputPath, { resource_type: "video" });
                jobs[projectId] = { status: "completed", link: result.secure_url };
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            } catch (err) {
                if(jobs[projectId]) jobs[projectId].status = "failed";
            }
        })
        .save(outputPath);

    res.json({ project: projectId, status: "success" });
});

app.get('/make-video', (req, res) => {
    res.json(jobs[req.query.project] || { error: "Not found" });
});

app.listen(process.env.PORT || 10000);
