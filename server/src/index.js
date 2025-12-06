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
        media.episodes = episodes;
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
            } else {
                await db.run(
                    `INSERT INTO episodes (media_id, season_number, episode_number, title, file_path, subtitle_path)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [media.id, season_number, episode_number, episode_title, file_path, subtitle_path]
                );
            }

            res.json({ id: media.id });

        } else {
            // Movie logic (existing)
            const result = await db.run(
                `INSERT INTO media (tmdb_id, title, type, poster_path, file_path, overview, release_date) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [tmdb_id, title, type, poster_path, file_path, overview, release_date]
            );
            res.json({ id: result.lastID });
        }
    } catch (error) {
        console.error('Save media error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload video file
app.post('/api/upload', upload.fields([{ name: 'video', maxCount: 1 }, { name: 'subtitle', maxCount: 1 }]), (req, res) => {
    if (!req.files || !req.files['video']) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }

    const response = {
        file_path: req.files['video'][0].filename
    };

    if (req.files['subtitle']) {
        response.subtitle_path = req.files['subtitle'][0].filename;
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
