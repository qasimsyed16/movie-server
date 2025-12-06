import React, { useState } from 'react';
import { X, Upload, Film, FileText } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const UploadModal = ({ isOpen, onClose, media, onUploadComplete, initialSeason = 1, initialEpisode = 1, initialEpisodeTitle = '' }) => {
    const [file, setFile] = useState(null);
    const [subtitleFile, setSubtitleFile] = useState(null);
    const [season, setSeason] = useState(initialSeason);
    const [episode, setEpisode] = useState(initialEpisode);
    const [episodeTitle, setEpisodeTitle] = useState(initialEpisodeTitle);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setSeason(initialSeason);
            setEpisode(initialEpisode);
            setEpisodeTitle(initialEpisodeTitle);
        }
    }, [isOpen, initialSeason, initialEpisode, initialEpisodeTitle]);

    if (!isOpen || !media) return null;

    const isTV = media.media_type === 'tv' || media.type === 'tv';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
        }
    };

    const handleSubtitleChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setSubtitleFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('video', file);
        if (subtitleFile) {
            formData.append('subtitle', subtitleFile);
        }

        try {
            // 1. Upload file
            const uploadRes = await axios.post(`${API_URL}/api/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });

            // 2. Save metadata
            const payload = {
                tmdb_id: media.tmdb_id || media.id,
                title: media.title || media.name,
                type: isTV ? 'tv' : 'movie',
                poster_path: media.poster_path,
                overview: media.overview,
                release_date: media.release_date || media.first_air_date,
                file_path: uploadRes.data.file_path,
                subtitle_path: uploadRes.data.subtitle_path
            };

            if (isTV) {
                payload.season_number = season;
                payload.episode_number = episode;
                payload.episode_title = episodeTitle || `Episode ${episode}`;
            }

            await axios.post(`${API_URL}/api/media`, payload);

            onUploadComplete();
            onClose();
            // Reset
            setFile(null);
            setSubtitleFile(null);
            setSeason(initialSeason);
            setEpisode(initialEpisode);
            setEpisodeTitle('');
            setProgress(0);
        } catch (err) {
            setError('Upload failed. Please try again.');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md p-6 m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        Upload {isTV ? 'Episode' : 'Movie'}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="mb-6 space-y-4">
                    <div className="flex items-center gap-4">
                        <img
                            src={media.poster_path ? `https://image.tmdb.org/t/p/w92${media.poster_path}` : 'https://via.placeholder.com/92x138'}
                            alt={media.title}
                            className="w-16 h-24 object-cover rounded-md shadow-sm"
                        />
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{media.title || media.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(media.release_date || media.first_air_date).getFullYear()}</p>
                        </div>
                    </div>

                    {isTV && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Season</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={season}
                                    onChange={(e) => setSeason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Episode</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={episode}
                                    onChange={(e) => setEpisode(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Video File</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                accept="video/*,.mkv"
                                onChange={handleFileChange}
                                className="hidden"
                                id="video-upload"
                                disabled={uploading}
                            />
                            <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Film className="h-8 w-8 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {file ? file.name : 'Select Video (.mp4, .mkv)'}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle File (Optional)</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                accept=".vtt,.srt"
                                onChange={handleSubtitleChange}
                                className="hidden"
                                id="subtitle-upload"
                                disabled={uploading}
                            />
                            <label htmlFor="subtitle-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <FileText className="h-8 w-8 text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {subtitleFile ? subtitleFile.name : 'Select Subtitle (.vtt, .srt)'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>

                {uploading && (
                    <div className="mb-4">
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                            <div
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">{progress}% Uploaded</p>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        disabled={uploading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Upload className="h-4 w-4" />
                        {uploading ? 'Uploading...' : 'Start Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadModal;
