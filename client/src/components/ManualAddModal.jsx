import React, { useState } from 'react';
import { X, Upload, Film, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config';

const ManualAddModal = ({ isOpen, onClose, onUploadComplete }) => {
    const [title, setTitle] = useState('');
    const [year, setYear] = useState('');
    const [overview, setOverview] = useState('');
    const [videoFile, setVideoFile] = useState(null);
    const [posterUrl, setPosterUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type.startsWith('video/')) {
            setVideoFile(selectedFile);
            setError('');
        } else {
            setVideoFile(null);
            setError('Please select a valid video file.');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!videoFile || !title) {
            setError('Title and Video file are required.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('video', videoFile);

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
            await axios.post(`${API_URL}/api/media`, {
                tmdb_id: Date.now(), // Fake ID for manual entries
                title: title,
                type: 'movie', // Default to movie
                poster_path: posterUrl || '', // Use URL directly if provided
                overview: overview,
                release_date: year ? `${year}-01-01` : new Date().toISOString(),
                file_path: uploadRes.data.file_path
            });

            onUploadComplete();
            onClose();
            // Reset form
            setTitle('');
            setYear('');
            setOverview('');
            setVideoFile(null);
            setPosterUrl('');
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 m-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Manually Add Movie</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Movie Title"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <input
                            type="number"
                            value={year}
                            onChange={(e) => setYear(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="2023"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Poster URL (Optional)</label>
                        <div className="flex gap-2">
                            <input
                                type="url"
                                value={posterUrl}
                                onChange={(e) => setPosterUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="https://example.com/poster.jpg"
                            />
                            {posterUrl && (
                                <img src={posterUrl} alt="Preview" className="h-10 w-auto rounded border" />
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Overview</label>
                        <textarea
                            value={overview}
                            onChange={(e) => setOverview(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            rows="3"
                            placeholder="Description..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Video File</label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                className="hidden"
                                id="manual-video-upload"
                                disabled={uploading}
                            />
                            <label htmlFor="manual-video-upload" className="cursor-pointer flex flex-col items-center gap-2">
                                <Film className="h-8 w-8 text-gray-400" />
                                <span className="text-sm text-gray-600">
                                    {videoFile ? videoFile.name : 'Click to select video file'}
                                </span>
                            </label>
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-sm">{error}</p>}

                    {uploading && (
                        <div className="mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1 text-center">{progress}% Uploaded</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!videoFile || !title || uploading}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            {uploading ? 'Uploading...' : 'Add Movie'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManualAddModal;
