const express = require('express');
const cloudinary = require('cloudinary').v2;
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

// --- আপনার Cloudinary সেটিংস এখানে দিন ---
cloudinary.config({ 
  cloud_name: 'video-gen', 
  api_key: '974899749497919', 
  api_secret: 'zMa96i-ABKmtEv24iwvS17OUseY' 
});

let jobs = {};

app.post('/make-video', (req, res) => {
    const projectId = "vid_" + Date.now();
    jobs[projectId] = { status: "processing", link: null };

    const outputPath = path.join(__dirname, `${projectId}.mp4`);

    // ১. ভিডিও তৈরির কাজ শুরু (উদাহরণ হিসেবে ৫ সেকেন্ডের ভিডিও)
    ffmpeg()
        .input('color=c=navy:s=1280x720:d=5')
        .inputFormat('lavfi')
        .on('end', async () => {
            try {
                // ২. ভিডিও তৈরি হলে Cloudinary-তে আপলোড করা
                const result = await cloudinary.uploader.upload(outputPath, { 
                    resource_type: "video",
                    public_id: projectId 
                });
                
                jobs[projectId].status = "completed";
                jobs[projectId].link = result.secure_url; // Cloudinary লিঙ্ক

                // ৩. লোকাল ফাইল ডিলিট করা
                if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
                console.log("Video Uploaded:", result.secure_url);
            } catch (error) {
                jobs[projectId].status = "failed";
                console.error("Upload Error:", error);
            }
        })
        .save(outputPath);

    res.json({ project: projectId, status: "success" });
});

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
