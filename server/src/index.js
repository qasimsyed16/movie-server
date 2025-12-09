const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { initDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// Initialize DB
initDb().catch(err => {
    console.error('Failed to initialize database', err);
});

app.get('/', (req, res) => {
    res.send('Movie Server Backend Running');
});

// Multer setup for file uploads
const multer = require('multer');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
})
const upload = multer({ storage: storage });

const { openDb } = require('./db');
const axios = require('axios');
const { extractSubtitles } = require('./utils/subtitleExtractor');

// Search TMDB
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    const apiKey = process.env.TMDB_API_KEY;
    if (!query) return res.status(400).json({ error: 'Query required' });
    if (!apiKey) return res.status(500).json({ error: 'TMDB API Key not configured' });

    try {
        const response = await axios.get(`https://api.themoviedb.org/3/search/multi`, {
            params: {
                api_key: apiKey,
                query: query
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('TMDB Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch from TMDB' });
    }
});

// Get TV Show details from TMDB
app.get('/api/tmdb/tv/:id', async (req, res) => {
    const { id } = req.params;
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TMDB API Key not configured' });

    try {
        const response = await axios.get(`https://api.themoviedb.org/3/tv/${id}`, {
            params: { api_key: apiKey }
        });
        res.json(response.data);
    } catch (error) {
        console.error('TMDB Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch TV details' });
    }
});

// Get TV Season details from TMDB
app.get('/api/tmdb/tv/:id/season/:season', async (req, res) => {
    const { id, season } = req.params;
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'TMDB API Key not configured' });

    try {
        const response = await axios.get(`https://api.themoviedb.org/3/tv/${id}/season/${season}`, {
            params: { api_key: apiKey }
        });
        res.json(response.data);
    } catch (error) {
        console.error('TMDB Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch season details' });
    }
});

// Get single media and its episodes
app.get('/api/media/:id', async (req, res) => {
    const db = await openDb();
    const media = await db.get('SELECT * FROM media WHERE id = ?', req.params.id);

    if (!media) return res.status(404).json({ error: 'Media not found' });

    if (media.type === 'tv' || media.media_type === 'tv') {
        const episodes = await db.all('SELECT * FROM episodes WHERE media_id = ? ORDER BY season_number, episode_number', media.id);

        // Fetch subtitles for each episode
        for (const ep of episodes) {
            ep.available_subtitles = await db.all(
                'SELECT * FROM subtitles WHERE episode_id = ?',
                ep.id
            );
        }

        media.episodes = episodes;
    } else {
        // Fetch subtitles for movie
        media.available_subtitles = await db.all(
            'SELECT * FROM subtitles WHERE media_id = ?',
            media.id
        );
    }

    res.json(media);
});

// Delete media
app.delete('/api/media/:id', async (req, res) => {
    const db = await openDb();
    const media = await db.get('SELECT * FROM media WHERE id = ?', req.params.id);

    if (!media) return res.status(404).json({ error: 'Media not found' });

    try {
        // Delete files
        if (media.file_path) {
            const filePath = path.join(uploadsDir, media.file_path);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        // Delete episodes if TV show
        const episodes = await db.all('SELECT * FROM episodes WHERE media_id = ?', media.id);
        for (const episode of episodes) {
            if (episode.file_path) {
                const epPath = path.join(uploadsDir, episode.file_path);
                if (fs.existsSync(epPath)) fs.unlinkSync(epPath);
            }
            if (episode.subtitle_path) {
                const subPath = path.join(uploadsDir, episode.subtitle_path);
                if (fs.existsSync(subPath)) fs.unlinkSync(subPath);
            }
        }

        await db.run('DELETE FROM episodes WHERE media_id = ?', media.id);
        await db.run('DELETE FROM media WHERE id = ?', media.id);

        res.json({ message: 'Deleted successfully' });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete media' });
    }
});

// Get all media
app.get('/api/media', async (req, res) => {
    const db = await openDb();
    const media = await db.all('SELECT * FROM media ORDER BY id DESC');
    res.json(media);
});

// Add media (manual or after upload)
// Add media (manual or after upload)
app.post('/api/media', async (req, res) => {
    const { tmdb_id, title, type, poster_path, overview, release_date, file_path, subtitle_path, season_number, episode_number, episode_title } = req.body;
    const db = await openDb();

    try {
        if (type === 'tv') {
            // 1. Check if show exists
            let media = await db.get('SELECT * FROM media WHERE tmdb_id = ?', tmdb_id);

            // 2. If not, create show
            if (!media) {
                const result = await db.run(
                    `INSERT INTO media (tmdb_id, title, type, poster_path, overview, release_date) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [tmdb_id, title, type, poster_path, overview, release_date]
                );
                media = { id: result.lastID };
            }

            // 3. Insert/Update episode
            // Check if episode exists
            const existingEp = await db.get(
                'SELECT * FROM episodes WHERE media_id = ? AND season_number = ? AND episode_number = ?',
                media.id, season_number, episode_number
            );

            if (existingEp) {
                await db.run(
                    `UPDATE episodes SET file_path = ?, subtitle_path = ?, title = ? 
                     WHERE id = ?`,
                    [file_path, subtitle_path, episode_title, existingEp.id]
                );

                // Link extracted subtitles to this episode if any
                if (file_path) {
                    // We need to find if we just uploaded this file and extracted subs
                    // This is a bit tricky because the extraction happened in /api/upload
                    // But we can check if there are any orphan subtitles (or just re-run for safety/simplicity?)
                    // For now, let's assume the client passes the "extracted_subtitles" metadata if available?
                    // Actually, simpler: we know the file_path. We can check the subtitles table/folder?
                    // BETTER: The /api/upload returns the subtitles. The client *could* pass them back.
                    // BUT: The client currently just gets file_path. 

                    // LET'S IMPROVE: 
                    // We'll rely on a background process or just check if subtitles exist in DB?
                    // Since /api/upload is stateless regarding this endpoint, let's pass the extracted info 
                    // from the client if possible? No, that's complex.

                    // REVISED APPROACH IN THIS BLOCK:
                    // We will do nothing here for now. The extraction happens in /upload. 
                    // We need to link those extracted files (which are currently just files) to the DB.
                    // The BEST place is right here when we know the media/episode ID.

                    // We can re-scan the "subtitles" folder for files matching the video filename?
                    // Our extractor uses: `${basename}_${lang}_${index}.vtt`

                    const VideoPath = path.join(uploadsDir, file_path);
                    const baseName = path.basename(VideoPath, path.extname(VideoPath));

                    // Find matching subtitles in DB? No they aren't in DB yet.
                    // Find them in the FS
                    const subDir = path.join(uploadsDir, 'subtitles');
                    if (fs.existsSync(subDir)) {
                        const files = fs.readdirSync(subDir);
                        const relatedSubs = files.filter(f => f.startsWith(baseName));

                        for (const subFile of relatedSubs) {
                            // Check if already in DB
                            const subPath = path.posix.join('subtitles', subFile);
                            const exists = await db.get('SELECT id FROM subtitles WHERE file_path = ?', subPath);
                            if (!exists) {
                                // Try to parse lang from filename: name_lang_index.vtt
                                const parts = subFile.split('_');
                                const lang = parts.length >= 2 ? parts[parts.length - 2] : 'und';

                                await db.run(
                                    `INSERT INTO subtitles (episode_id, language, label, file_path)
                                     VALUES (?, ?, ?, ?)`,
                                    [existingEp.id, lang, lang, subPath]
                                );
                            }
                        }
                    }
                }

            } else {
                const result = await db.run(
                    `INSERT INTO episodes (media_id, season_number, episode_number, title, file_path, subtitle_path)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [media.id, season_number, episode_number, episode_title, file_path, subtitle_path]
                );

                // Link extracted subtitles (same logic as above)
                if (file_path) {
                    const VideoPath = path.join(uploadsDir, file_path);
                    const baseName = path.basename(VideoPath, path.extname(VideoPath));
                    const subDir = path.join(uploadsDir, 'subtitles');

                    if (fs.existsSync(subDir)) {
                        const files = fs.readdirSync(subDir);
                        const relatedSubs = files.filter(f => f.startsWith(baseName));

                        for (const subFile of relatedSubs) {
                            const subPath = path.posix.join('subtitles', subFile);
                            const exists = await db.get('SELECT id FROM subtitles WHERE file_path = ?', subPath);
                            if (!exists) {
                                const parts = subFile.split('_');
                                const lang = parts.length >= 2 ? parts[parts.length - 2] : 'und';

                                await db.run(
                                    `INSERT INTO subtitles (episode_id, language, label, file_path)
                                     VALUES (?, ?, ?, ?)`,
                                    [result.lastID, lang, lang, subPath]
                                );
                            }
                        }
                    }
                }
            }

            res.json({ id: media.id });

        } else {
            // Movie logic (existing)
            const result = await db.run(
                `INSERT INTO media (tmdb_id, title, type, poster_path, file_path, overview, release_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [tmdb_id, title, type, poster_path, file_path, overview, release_date]
            );

            // Link extracted subtitles
            if (file_path) {
                const VideoPath = path.join(uploadsDir, file_path);
                const baseName = path.basename(VideoPath, path.extname(VideoPath));
                const subDir = path.join(uploadsDir, 'subtitles');

                if (fs.existsSync(subDir)) {
                    const files = fs.readdirSync(subDir);
                    const relatedSubs = files.filter(f => f.startsWith(baseName));

                    for (const subFile of relatedSubs) {
                        const subPath = path.posix.join('subtitles', subFile);
                        const exists = await db.get('SELECT id FROM subtitles WHERE file_path = ?', subPath);
                        if (!exists) {
                            const parts = subFile.split('_');
                            const lang = parts.length >= 2 ? parts[parts.length - 2] : 'und';

                            await db.run(
                                `INSERT INTO subtitles (media_id, language, label, file_path)
                                 VALUES (?, ?, ?, ?)`,
                                [result.lastID, lang, lang, subPath]
                            );
                        }
                    }
                }
            }

            res.json({ id: result.lastID });
        }
    } catch (error) {
        console.error('Save media error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload video file
app.post('/api/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'subtitle', maxCount: 1 }]), async (req, res) => {
    if (!req.files || !req.files['video']) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoFile = req.files['video'][0];
    const response = {
        file_path: videoFile.filename
    };

    if (req.files['subtitle']) {
        response.subtitle_path = req.files['subtitle'][0].filename;
    }

    // Attempt subtitle extraction (fire and forget or wait?)
    // Waiting is safer so we don't have race conditions when saving media metadata
    try {
        console.log('Extracting subtitles for:', videoFile.filename);
        await extractSubtitles(videoFile.path, uploadsDir);
        // We do NOT save to DB here because we don't have media_id/episode_id yet.
        // We just ensure files are ready for the /api/media call to find them.
    } catch (err) {
        console.error('Subtitle extraction failed:', err);
        // Don't fail the upload just because extraction failed
    }

    res.json(response);
});

// Helper function to stream file
const streamFile = (req, res, filePath) => {
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('File not found');
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(filePath, { start, end });
        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        file.pipe(res);
    } else {
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(filePath).pipe(res);
    }
};

// Stream video (Movie)
app.get('/api/stream/:id', async (req, res) => {
    const db = await openDb();
    const media = await db.get('SELECT * FROM media WHERE id = ?', req.params.id);

    if (!media || !media.file_path) {
        return res.status(404).send('Media not found');
    }

    const filePath = path.join(uploadsDir, media.file_path);
    streamFile(req, res, filePath);
});

// Stream video (TV Episode)
app.get('/api/stream/episode/:id', async (req, res) => {
    const db = await openDb();
    const episode = await db.get('SELECT * FROM episodes WHERE id = ?', req.params.id);

    if (!episode || !episode.file_path) {
        return res.status(404).send('Episode not found');
    }

    const filePath = path.join(uploadsDir, episode.file_path);
    streamFile(req, res, filePath);
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
