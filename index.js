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

app.get('/', (req, res) => res.send("High-Capacity Engine is Ready!"));

app.post('/make-video', (req, res) => {
    const projectId = "vid_" + Date.now();
    const vars = req.body.variables || {};
    
    // ১. বড় টেক্সটকে ক্লিন করা এবং কোলন/কোড এরর থেকে বাঁচানো
    let topic = (vars.topic || "Success").replace(/[:'"]/g, "");

    // ২. টেক্সট র‍্যাপিং (প্রতি ৩০ ক্যারেক্টার পর পর লাইন ব্রেক)
    let wrappedText = topic.match(/.{1,30}(\s|$)/g).join('\n');

    jobs[projectId] = { status: "processing", link: null };
    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    // ৩. হাই-ক্যাপাসিটি রেন্ডারিং কমান্ড
    ffmpeg()
        .input('color=c=navy:s=720x1280:d=10') // ১০ সেকেন্ডের পোর্ট্রেট ভিডিও
        .inputFormat('lavfi')
        .complexFilter([
            {
                filter: 'drawtext',
                options: {
                    text: wrappedText,
                    fontsize: 40,
                    fontcolor: 'white',
                    x: '(w-text_w)/2',
                    y: '(h-text_h)/2',
                    box: 1,
                    boxcolor: 'black@0.6',
                    boxborderw: 20,
                    line_spacing: 15
                }
            }
        ])
        .outputOptions(['-pix_fmt yuv420p', '-c:v libx264', '-preset superfast'])
        .on('error', (err) => {
            console.error("Critical Error: " + err.message);
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
