import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Moon, Sun } from 'lucide-react';
import SearchBar from './components/SearchBar';
import MovieCard from './components/MovieCard';
import UploadModal from './components/UploadModal';
import VideoPlayer from './components/VideoPlayer';
import ManualAddModal from './components/ManualAddModal';
import ShowDetails from './components/ShowDetails';
import { API_URL } from './config';

function App() {
  const [library, setLibrary] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);
  const [playingMedia, setPlayingMedia] = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [viewingShow, setViewingShow] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      return savedTheme === 'dark';
    }
    return true;
  });

  useEffect(() => {
    fetchLibrary();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const fetchLibrary = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/media`);
      setLibrary(res.data);
    } catch (err) {
      console.error('Failed to fetch library', err);
    }
  };

  const handleSearch = async (query) => {
    setIsSearching(true);
    try {
      const res = await axios.get(`${API_URL}/api/search?q=${query}`);
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error('Search failed', err);
    }
  };

  const handleCardClick = async (media) => {
    // If it's a TV show, open details
    if (media.media_type === 'tv' || media.type === 'tv') {
      // Fetch full details including episodes if it's in library
      if (media.id && !media.media_type) { // It's from our DB
        try {
          const res = await axios.get(`${API_URL}/api/media/${media.id}`);
          setViewingShow(res.data);
        } catch (e) {
          // Fallback to basic info if fetch fails
          setViewingShow(media);
        }
      } else {
        // It's a search result, just show basic info + upload option
        setViewingShow(media);
      }
    } else {
      // It's a movie
      if (media.file_path) {
        setPlayingMedia(media);
      } else {
        setSelectedMedia(media);
        setShowUploadModal(true);
      }
    }
  };

  const handleUploadClick = (media) => {
    setSelectedMedia(media);
    setShowUploadModal(true);
  };

  const handlePlayEpisode = (media, episode) => {
    setPlayingMedia(media);
    setPlayingEpisode(episode);
  };

  const handleUploadComplete = async () => {
    await fetchLibrary();
    setSearchResults([]);
    setIsSearching(false);
    // Refresh show details if open
    if (viewingShow && viewingShow.id) {
      try {
        const res = await axios.get(`${API_URL}/api/media/${viewingShow.id}`);
        setViewingShow(res.data);
      } catch (e) { console.error(e); }
    }
  };

  const clearSearch = () => {
    setIsSearching(false);
    setSearchResults([]);
  };

  const handleDelete = async (media) => {
    if (!window.confirm(`Are you sure you want to delete "${media.title || media.name}"?`)) return;

    try {
      await axios.delete(`${API_URL}/api/media/${media.id}`);
      await fetchLibrary();
      if (viewingShow && viewingShow.id === media.id) {
        setViewingShow(null);
      }
    } catch (err) {
      console.error('Failed to delete media', err);
      alert('Failed to delete media');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-30 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1
              className="text-2xl font-bold text-blue-600 dark:text-blue-400 cursor-pointer"
              onClick={clearSearch}
            >
              MovieServer
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                title="Toggle Dark Mode"
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setShowManualAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Add Manually
              </button>
            </div>
          </div>
          <SearchBar onSearch={handleSearch} />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isSearching ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Search Results</h2>
              <button
                onClick={clearSearch}
                className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                Back to Library
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <p className="text-xl">No results found.</p>
                <p>Try searching for something else.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {searchResults.map((media) => {
                  const existing = library.find(m => m.tmdb_id === media.id);
                  return (
                    <MovieCard
                      key={media.id}
                      media={existing || media}
                      onPlay={() => handleCardClick(existing || media)}
                      onUpload={() => handleCardClick(existing || media)}
                      onDelete={existing ? () => handleDelete(existing) : null}
                    />
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h2 className="text-2xl font-bold mb-6">My Library</h2>
            {library.length === 0 ? (
              <div className="text-center py-20 text-gray-500 dark:text-gray-400">
                <p className="text-xl">Your library is empty.</p>
                <p>Search for movies to add them.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {library.map((media) => (
                  <MovieCard
                    key={media.id}
                    media={media}
                    onPlay={() => handleCardClick(media)}
                    onUpload={() => handleCardClick(media)}
                    onDelete={() => handleDelete(media)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </main>

      <UploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        media={selectedMedia}
        onUploadComplete={handleUploadComplete}
      />

      <ManualAddModal
        isOpen={showManualAddModal}
        onClose={() => setShowManualAddModal(false)}
        onUploadComplete={handleUploadComplete}
      />

      {viewingShow && (
        <ShowDetails
          media={viewingShow}
          onClose={() => setViewingShow(null)}
          onPlayEpisode={handlePlayEpisode}
          onUploadEpisode={handleUploadClick}
        />
      )}

      {playingMedia && (
        <VideoPlayer
          media={playingMedia}
          episode={playingEpisode}
          onClose={() => { setPlayingMedia(null); setPlayingEpisode(null); }}
        />
      )}
    </div>
  );
}

export default App;
