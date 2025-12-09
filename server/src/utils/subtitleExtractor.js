const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const path = require('path');
const fs = require('fs');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

/**
 * Extracts subtitles from a video file.
 * @param {string} videoPath - Absolute path to the video file
 * @param {string} outputDir - Absolute path to the directory where subtitles should be saved
 * @returns {Promise<Array<{language: string, label: string, path: string}>>} - Array of extracted subtitle info
 */
const extractSubtitles = (videoPath, outputDir) => {
    return new Promise((resolve, reject) => {
        // 1. Probe the file to find subtitle streams
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) return reject(err);

            const subtitleStreams = metadata.streams.filter(s => s.codec_type === 'subtitle');

            if (subtitleStreams.length === 0) {
                return resolve([]);
            }

            // Ensure output directory exists (specifically for subtitles)
            const subtitlesDir = path.join(outputDir, 'subtitles');
            if (!fs.existsSync(subtitlesDir)) {
                fs.mkdirSync(subtitlesDir, { recursive: true });
            }

            const supportedCodecs = ['subrip', 'ass', 'ssa', 'mov_text', 'webvtt', 'text'];

            const extractionPromises = subtitleStreams.map((stream, index) => {
                return new Promise((resolveStream, rejectStream) => {
                    const lang = stream.tags?.language || 'und';
                    const label = stream.tags?.title || stream.tags?.language || `Track ${index + 1}`;
                    const codec = stream.codec_name;

                    console.log(`Found subtitle stream ${index}: codec=${codec}, lang=${lang}`);

                    if (!supportedCodecs.includes(codec.toLowerCase())) {
                        console.warn(`Skipping unsupported subtitle codec: ${codec} (Stream ${index})`);
                        return resolveStream(null);
                    }

                    const filename = `${path.basename(videoPath, path.extname(videoPath))}_${lang}_${index}.vtt`;
                    const outputPath = path.join(subtitlesDir, filename);

                    // ffmpeg often prefers forward slashes or sanitized paths on Windows to avoid escape issues
                    // We only sanitize for the ffmpeg input/output calls
                    const safeOutputPath = outputPath.split(path.sep).join('/');
                    const safeVideoPath = videoPath.split(path.sep).join('/');

                    const relativePath = path.posix.join('subtitles', filename); // relative to uploads/ for DB

                    ffmpeg(safeVideoPath)
                        .output(safeOutputPath)
                        .outputOptions(['-map', `0:${stream.index}`])
                        .format('webvtt')
                        .on('start', (cmd) => {
                            console.log(`Spawned Ffmpeg with command: ${cmd}`);
                        })
                        .on('end', () => {
                            console.log(`Extracted subtitle ${index} to ${filename}`);
                            resolveStream({
                                language: lang,
                                label: label,
                                path: relativePath
                            });
                        })
                        .on('error', (err) => {
                            console.warn(`Failed to extract subtitle stream ${index} (${lang}):`, err.message);
                            // Resolve with null to filter out later, don't fail entire process
                            resolveStream(null);
                        })
                        .run();
                });
            });

            Promise.all(extractionPromises)
                .then(results => {
                    const extracted = results.filter(r => r !== null);
                    resolve(extracted);
                })
                .catch(reject);
        });
    });
};

module.exports = { extractSubtitles };
