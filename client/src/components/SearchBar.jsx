import React, { useState } from 'react';
import { Search } from 'lucide-react';

const SearchBar = ({ onSearch }) => {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (query.trim()) {
            onSearch(query);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto mb-8">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for movies or TV shows..."
                    className="w-full px-4 py-3 pl-12 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all shadow-sm"
                />
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
                <button
                    type="submit"
                    className="absolute right-2 top-2 px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                    Search
                </button>
            </div>
        </form>
    );
};

export default SearchBar;
