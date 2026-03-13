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
    
    // টেক্সট থেকে সব ধরণের ঝামেলাপূর্ণ ক্যারেক্টার এবং নতুন লাইন মুছে ফেলা
    let topic = (vars.topic || "Success").replace(/[:'"]/g, "").replace(/\n/g, " ");
    
    // টেক্সট র‍্যাপিং লজিক
    const words = topic.split(' ');
    let finalTopic = '';
    for (let i = 0; i < words.length; i++) {
        finalTopic += words[i] + ' ';
        if ((i + 1) % 4 === 0) finalTopic += '\n';
    }

    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    console.log(`Working on job: ${projectId}`);

    // আমরা complexFilter এর বদলে সহজ ভিডিও ফিল্টার ব্যবহার করছি
    ffmpeg()
        .input('color=c=navy:s=720x1280:d=5')
        .inputFormat('lavfi')
        .videoFilters([
            {
                filter: 'drawtext',
                options: {
                    text: finalTopic.trim(),
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
