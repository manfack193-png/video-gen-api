const express = require('express');
const { FFScene, FFText, FFCreator } = require('ffcreator');
const cloudinary = require('cloudinary').v2;
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

app.get('/', (req, res) => res.send("FFCreator Engine Active!"));

app.post('/make-video', async (req, res) => {
    const projectId = "vid_" + Date.now();
    const topic = req.body.variables?.topic || "Success Story";
    
    jobs[projectId] = { status: "processing", link: null };
    const outputDir = path.join(__dirname, 'output');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
    const outputPath = path.join(outputDir, `${projectId}.mp4`);

    // ভিডিও সেটআপ (Shorts Size: 720x1280)
    const creator = new FFCreator({
        cacheDir: path.join(__dirname, 'cache'),
        output: outputPath,
        width: 720,
        height: 1280,
        fps: 24,
        parallel: 4
    });

    const scene = new FFScene();
    scene.setBackground('#001F3F'); // নেভি ব্লু
    scene.setDuration(7); 

    // বড় টেক্সট হ্যান্ডেল করার ম্যাজিক এখানে
    const text = new FFText({
        text: topic,
        x: 360,
        y: 640,
        fontSize: 35,
        color: '#ffffff'
    });
    
    text.setAnchor(0.5);
    // wordWrapWidth ব্যবহার করলে টেক্সট অটোমেটিক পরের লাইনে চলে যাবে
    text.setStyle({ 
        wordWrap: true, 
        wordWrapWidth: 600, 
        align: 'center',
        lineHeight: 45
    });
    
    scene.addChild(text);
    creator.addChild(scene);

    creator.start();

    creator.on('error', e => {
        console.log("FFCreator Error: " + e.msg);
        if(jobs[projectId]) jobs[projectId].status = "failed";
    });

    creator.on('complete', async () => {
        try {
            const result = await cloudinary.uploader.upload(outputPath, { resource_type: "video" });
            jobs[projectId] = { status: "completed", link: result.secure_url };
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            console.log("Video Success: " + result.secure_url);
        } catch (err) {
            if(jobs[projectId]) jobs[projectId].status = "failed";
        }
    });

    res.json({ project: projectId, status: "success" });
});

app.get('/make-video', (req, res) => {
    res.json(jobs[req.query.project] || { error: "Not found" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log('Server Live!'));
