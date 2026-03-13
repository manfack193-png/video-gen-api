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

app.get('/', (req, res) => res.send("System Online"));

app.post('/make-video', (req, res) => {
    const projectId = "vid_" + Date.now();
    const vars = req.body.variables || {};
    
    // টেক্সট থেকে কোলন এবং সিঙ্গেল কোট পুরোপুরি মুছে ফেলা
    let topic = vars.topic || "Success";
    topic = topic.replace(/[:']/g, "").replace(/[^\x00-\x7F]/g, ""); 

    // প্রতি ৪ শব্দ পর পর নতুন লাইন দেওয়া যেন স্ক্রিনে ধরে
    const words = topic.split(' ');
    let wrappedText = "";
    for (let i = 0; i < words.length; i++) {
        wrappedText += words[i] + " ";
        if ((i + 1) % 4 === 0) wrappedText += "\n";
    }

    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    console.log(`Processing: ${projectId}`);

    ffmpeg()
        .input('color=c=navy:s=720x1280:d=5')
        .inputFormat('lavfi')
        .complexFilter([
            {
                filter: 'drawtext',
                options: {
                    text: wrappedText.trim(),
                    fontsize: 40,
                    fontcolor: 'white',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2',
                    box: 1,
                    boxcolor: 'black@0.6',
                    boxborderw: 20,
                    // এই লাইনটি স্পেশাল ক্যারেক্টার এরর বন্ধ করবে
                    escape_mode: 'text' 
                }
            }
        ])
        .outputOptions(['-pix_fmt yuv420p'])
        .on('error', (err) => {
            console.log("FFMPEG ERROR: " + err.message);
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
