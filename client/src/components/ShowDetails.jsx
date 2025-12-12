import React, { useState, useEffect } from 'react';
import { X, Play, Upload } from 'lucide-react';
import axios from 'axios';
import UploadModal from './UploadModal';
import { API_URL } from '../config';

const ShowDetails = ({ media, onClose, onPlayEpisode, onUploadEpisode }) => {
    const [tmdbDetails, setTmdbDetails] = useState(null);
    const [localDetails, setLocalDetails] = useState(null);
    const [seasons, setSeasons] = useState({});
    const [loading, setLoading] = useState(true);
    const [uploadModalState, setUploadModalState] = useState({ isOpen: false, season: 1, episode: 1, episodeTitle: '' });

    useEffect(() => {
        fetchDetails();
    }, [media]);

    const fetchDetails = async () => {
        setLoading(true);
        try {
            // 1. Fetch TMDB details for seasons info
            const tmdbRes = await axios.get(`${API_URL}/api/tmdb/tv/${media.tmdb_id || media.id}`);
            setTmdbDetails(tmdbRes.data);

            // 2. Fetch local details for uploaded episodes
            let localData = null;
            if (media.id && !media.media_type) { // It's from our DB
                try {
                    const localRes = await axios.get(`${API_URL}/api/media/${media.id}`);
                    localData = localRes.data;
                } catch (e) { console.log('Not in local DB yet'); }
            } else {
                // Check if it exists in DB by TMDB ID (search result case)
                const allMediaRes = await axios.get(`${API_URL}/api/media`);
                localData = allMediaRes.data.find(m => m.tmdb_id === (media.id));
                if (localData) {
                    const fullLocalRes = await axios.get(`${API_URL}/api/media/${localData.id}`);
                    localData = fullLocalRes.data;
                }
            }
            setLocalDetails(localData);

            // 3. Fetch all seasons details from TMDB
            if (tmdbRes.data && tmdbRes.data.seasons) {
                const seasonsData = {};
                for (const season of tmdbRes.data.seasons) {
                    if (season.season_number > 0) { // Skip specials for now
                        const seasonRes = await axios.get(`${API_URL}/api/tmdb/tv/${media.tmdb_id || media.id}/season/${season.season_number}`);
                        seasonsData[season.season_number] = seasonRes.data.episodes;
                    }
                }
                setSeasons(seasonsData);
            }

        } catch (error) {
            console.error('Failed to fetch show details', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUploadClick = (seasonNum, episodeNum, epTitle) => {
        setUploadModalState({ isOpen: true, season: seasonNum, episode: episodeNum, episodeTitle: epTitle });
    };

    const handleUploadComplete = async () => {
        await fetchDetails();
    };

    if (!media) return null;

    const getEpisodeStatus = (seasonNum, episodeNum) => {
        if (!localDetails || !localDetails.episodes) return null;
        return localDetails.episodes.find(e => e.season_number === seasonNum && e.episode_number === episodeNum);
    };

    return (
        <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 overflow-y-auto">
            <div className="relative h-96">
                <img
                    src={media.poster_path ? `https://image.tmdb.org/t/p/original${media.poster_path}` : 'https://via.placeholder.com/1920x1080'}
                    alt={media.title || media.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors cursor-pointer"
                >
                    <X className="h-6 w-6" />
                </button>
                <div className="absolute bottom-0 left-0 p-8">
                    <h1 className="text-4xl font-bold mb-2 text-gray-900 dark:text-white">{media.title || media.name}</h1>
                    <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl">{media.overview}</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="text-center py-12">Loading episodes...</div>
                ) : (
                    <div className="space-y-8">
                        {Object.entries(seasons).map(([seasonNum, episodes]) => (
                            <div key={seasonNum}>
                                <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Season {seasonNum}</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {episodes.map(episode => {
                                        const uploadedEpisode = getEpisodeStatus(parseInt(seasonNum), episode.episode_number);
                                        return (
                                            <div
                                                key={episode.id}
                                                className={`p-4 rounded-lg flex items-center justify-between transition-colors group ${uploadedEpisode
                                                    ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                                                    : 'bg-gray-100 dark:bg-gray-800'
                                                    }`}
                                                onClick={() => uploadedEpisode && onPlayEpisode(localDetails, uploadedEpisode)}
                                            >
                                                <div className="flex-1 min-w-0 mr-4">
                                                    <h4 className="font-medium text-gray-900 dark:text-white truncate" title={episode.name}>
                                                        {episode.episode_number}. {episode.name}
                                                    </h4>
                                                    {uploadedEpisode && (uploadedEpisode.subtitle_path || (uploadedEpisode.available_subtitles && uploadedEpisode.available_subtitles.length > 0)) && (
                                                        <span className="text-xs text-green-600 dark:text-green-400">Subtitles available</span>
                                                    )}
                                                </div>
                                                {uploadedEpisode ? (
                                                    <Play className="h-5 w-5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleUploadClick(parseInt(seasonNum), episode.episode_number, episode.name);
                                                        }}
                                                        className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                                                        title="Upload Episode"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <UploadModal
                isOpen={uploadModalState.isOpen}
                onClose={() => setUploadModalState({ ...uploadModalState, isOpen: false })}
                media={localDetails || media}
                initialSeason={uploadModalState.season}
                initialEpisode={uploadModalState.episode}
                initialEpisodeTitle={uploadModalState.episodeTitle}
                onUploadComplete={handleUploadComplete}
            />
        </div>
    );
};

export default ShowDetails;
