import React, { useState, useEffect, useRef } from 'react';
import { X, Captions, Clock, Maximize, Minimize } from 'lucide-react';
import axios from 'axios';
import { parseSubtitles } from '../utils/subtitleParser';
import { API_URL } from '../config';

const VideoPlayer = ({ media, episode, onClose }) => {
    const videoRef = useRef(null);
    const containerRef = useRef(null);
    const controlsTimeoutRef = useRef(null);

    const [subtitles, setSubtitles] = useState([]);
    const [currentText, setCurrentText] = useState('');
    const [showSubtitles, setShowSubtitles] = useState(true);
    const [subtitleOffset, setSubtitleOffset] = useState(0); // in seconds
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const subUrl = episode?.subtitle_path || media?.subtitle_path;

    const [selectedSubtitle, setSelectedSubtitle] = useState(null);
    const allSubtitles = episode?.available_subtitles || media?.available_subtitles || [];

    // Auto-select first subtitle if available and nothing selected
    useEffect(() => {
        if (allSubtitles.length > 0 && !selectedSubtitle) {
            // Find English by default if possible, otherwise first
            const defaultSub = allSubtitles.find(s => s.language === 'eng') || allSubtitles[0];
            setSelectedSubtitle(defaultSub);
        } else if (subUrl && !selectedSubtitle && allSubtitles.length === 0) {
            // Fallback for legacy
            setSelectedSubtitle({ file_path: subUrl, isLegacy: true });
        }
    }, [allSubtitles, subUrl]);

    useEffect(() => {
        const fetchSubtitles = async () => {
            if (selectedSubtitle?.file_path) {
                try {
                    const res = await axios.get(`${API_URL}/uploads/${selectedSubtitle.file_path}`, { responseType: 'text' });
                    const parsed = parseSubtitles(res.data);
                    setSubtitles(parsed);
                } catch (err) {
                    console.error('Failed to load subtitles', err);
                }
            } else {
                setSubtitles([]);
            }
        };
        fetchSubtitles();
    }, [selectedSubtitle]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-hide controls logic
    useEffect(() => {
        const handleMouseMove = () => {
            setShowControls(true);
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
            controlsTimeoutRef.current = setTimeout(() => {
                setShowControls(false);
            }, 3000); // Hide after 3 seconds
        };

        // Initialize timer on mount
        handleMouseMove();

        const container = containerRef.current;
        if (container) {
            container.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            if (container) {
                container.removeEventListener('mousemove', handleMouseMove);
            }
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    const handleTimeUpdate = () => {
        if (!videoRef.current || !subtitles.length || !showSubtitles) {
            setCurrentText('');
            return;
        }

        const currentTime = videoRef.current.currentTime;
        const sub = subtitles.find(s =>
            currentTime >= (s.start + subtitleOffset) &&
            currentTime <= (s.end + subtitleOffset)
        );

        setCurrentText(sub ? sub.text : '');
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };

    if (!media) return null;

    return (
        <div ref={containerRef} className={`fixed inset-0 z-50 bg-black flex flex-col group ${showControls ? 'cursor-default' : 'cursor-none'}`}>

            {/* Top Header: Title & Close */}
            <div className={`flex items-center justify-between p-6 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <h2 className="text-white text-xl font-bold truncate drop-shadow-md">
                    {episode ? `${media.title} - ${episode.title}` : media.title}
                </h2>
                <button
                    onClick={onClose}
                    className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors backdrop-blur-sm cursor-pointer"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Bottom Right Controls: Captions & Fullscreen */}
            <div className={`absolute bottom-20 right-6 z-20 flex items-center gap-3 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                {/* Subtitle Controls */}
                <div className="flex items-center bg-black/60 rounded-lg p-1 backdrop-blur-sm shadow-lg border border-white/10">
                    <button
                        onClick={() => setShowSubtitles(!showSubtitles)}
                        className={`p-2 rounded hover:bg-white/10 transition-colors cursor-pointer ${showSubtitles ? 'text-green-400' : 'text-gray-400'}`}
                        title={showSubtitles ? "Disable Subtitles" : "Enable Subtitles"}
                    >
                        <Captions className="h-5 w-5" />
                    </button>

                    {showSubtitles && (
                        <>
                            <div className="w-px h-4 bg-gray-500 mx-1"></div>

                            {/* Language Selector */}
                            {(allSubtitles.length > 0 || subUrl) && (
                                <select
                                    className="bg-transparent text-white text-xs font-mono outline-none border border-white/20 rounded px-1 py-0.5 mx-1 max-w-[100px]"
                                    value={selectedSubtitle?.id || (selectedSubtitle?.isLegacy ? 'legacy' : '') || ''}
                                    onChange={(e) => {
                                        if (e.target.value === 'legacy') {
                                            setSelectedSubtitle({ file_path: subUrl, isLegacy: true });
                                        } else {
                                            const found = allSubtitles.find(s => s.id === parseInt(e.target.value));
                                            setSelectedSubtitle(found);
                                        }
                                    }}
                                >
                                    {allSubtitles.map(sub => (
                                        <option key={sub.id} value={sub.id} className="bg-black text-white">
                                            {sub.label || sub.language || 'Unknown'} (Embedded)
                                        </option>
                                    ))}
                                    {/* Fallback for legacy single file */}
                                    {subUrl && (
                                        <option value="legacy" className="bg-black text-white">
                                            Default
                                        </option>
                                    )}
                                </select>
                            )}

                            <div className="flex items-center text-white text-sm gap-2 px-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <button
                                    onClick={() => setSubtitleOffset(prev => prev - 0.5)}
                                    className="px-2 hover:bg-white/20 rounded font-bold cursor-pointer"
                                    title="Delay -0.5s"
                                >-</button>
                                <span className="w-12 text-center text-xs font-mono">
                                    {subtitleOffset > 0 ? '+' : ''}{subtitleOffset}s
                                </span>
                                <button
                                    onClick={() => setSubtitleOffset(prev => prev + 0.5)}
                                    className="px-2 hover:bg-white/20 rounded font-bold cursor-pointer"
                                    title="Delay +0.5s"
                                >+</button>
                            </div>
                        </>
                    )}
                </div>

                <button
                    onClick={toggleFullscreen}
                    className="p-3 bg-black/60 rounded-full hover:bg-white/20 text-white transition-colors backdrop-blur-sm shadow-lg border border-white/10 cursor-pointer"
                    title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                    {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                </button>
            </div>

            {/* Video Container */}
            <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
                <video
                    ref={videoRef}
                    controls
                    autoPlay
                    onTimeUpdate={handleTimeUpdate}
                    className="w-full h-full max-h-screen object-contain"
                    src={episode
                        ? `${API_URL}/api/stream/episode/${episode.id}`
                        : `${API_URL}/api/stream/${media.id}`
                    }
                >
                    Your browser does not support the video tag.
                </video>

                {/* Custom Subtitle Overlay */}
                {showSubtitles && currentText && (
                    <div className={`absolute bottom-16 left-0 right-0 text-center pointer-events-none z-10 p-4 transition-all duration-300 ${showControls ? 'bottom-32' : 'bottom-16'}`}>
                        <span className="inline-block bg-black/50 text-white text-lg md:text-2xl px-4 py-2 rounded shadow-sm whitespace-pre-wrap">
                            {currentText}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPlayer;
