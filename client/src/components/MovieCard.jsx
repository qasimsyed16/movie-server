import React from 'react';
import { Play, Upload, Trash } from 'lucide-react';

const MovieCard = ({ media, onPlay, onUpload, onDelete }) => {
    const posterUrl = media.poster_path
        ? (media.poster_path.startsWith('http') ? media.poster_path : `https://image.tmdb.org/t/p/w500${media.poster_path}`)
        : 'https://via.placeholder.com/500x750?text=No+Poster';

    const isMovie = media.media_type === 'movie' || !media.media_type; // Default to movie if unknown
    const mediaTypeLabel = media.media_type === 'tv' || media.type === 'tv' ? 'TV Show' : 'Movie';

    return (
        <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl cursor-pointer">
            <div className="aspect-[2/3] relative">
                <img
                    src={posterUrl}
                    alt={media.title || media.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-md uppercase font-bold tracking-wider">
                    {mediaTypeLabel}
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    {media.file_path ? (
                        <button
                            onClick={() => onPlay(media)}
                            className="p-3 bg-white rounded-full hover:bg-gray-200 transition-colors cursor-pointer"
                            title="Play"
                        >
                            <Play className="h-6 w-6 text-black" fill="currentColor" />
                        </button>
                    ) : (
                        <button
                            onClick={() => onUpload(media)}
                            className="p-3 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors cursor-pointer"
                            title="Upload"
                        >
                            <Upload className="h-6 w-6 text-white" />
                        </button>
                    )}
                </div>
            </div>
            <div className="p-4">
                <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate text-gray-900 dark:text-gray-100" title={media.title || media.name}>
                            {media.title || media.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(media.release_date || media.first_air_date).getFullYear() || 'Unknown'}
                        </p>
                    </div>
                    {onDelete && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(media);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors cursor-pointer"
                            title="Delete"
                        >
                            <Trash className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MovieCard;
