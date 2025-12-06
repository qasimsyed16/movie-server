# Personal Movie Server

A self-hosted media server application that allows you to manage, organize, and stream your personal collection of movies and TV shows. Built with a modern React frontend and a robust Node.js/Express backend.

## Features

*   **Media Management**: Upload and organize Movies and TV Shows.
*   **Automatic Metadata**: Fetches posters, descriptions, and release dates automatically from TMDB (The Movie Database).
*   **Video Streaming**: Built-in video player with support for:
    *   Movies and TV Episodes.
    *   **Custom Subtitles**: Upload `.srt` or `.vtt` files.
    *   **Cinematic Mode**: Auto-hiding controls.
    *   **Caption Customization**: Adjust subtitle delay and toggle visibility.
*   **Search**: Instantly search your library or TMDB for new content to add.
*   **Offline Support**: Browse your library and watch downloaded content even without an internet connection (metadata text is cached locally).
*   **Dark Mode**: Sleek UI with toggleable dark/light themes.

## Tech Stack

*   **Frontend**: React, Tailwind CSS, Lucide React (Icons), Axios.
*   **Backend**: Node.js, Express, Multer (File Uploads).
*   **Database**: SQLite (Zero-config, serverless database).

## Prerequisites

*   **Node.js** (v14 or higher)
*   **NPM** (Node Package Manager)
*   **TMDB API Key** (Get one for free at [themoviedb.org](https://www.themoviedb.org/documentation/api))

## Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/qasimsyed16/movie-server.git
    cd Movie-Server
    ```

2.  **Setup Backend**
    ```bash
    cd server
    npm install
    ```
    *   Create a `.env` file in the `server` directory (or query `.env.example`):
        ```bash
        cp .env.example .env
        ```
    *   Open `.env` and add your **TMDB API Key** (get one from [themoviedb.org](https://www.themoviedb.org/documentation/api)).

3.  **Setup Frontend**
    ```bash
    cd ../client
    npm install
    ```

## Running the Application

You need to run both the server and the client.

1.  **Start the Server**
    ```bash
    cd server
    node src/index.js
    ```
    *   Server runs on `http://localhost:3000`
    *   **Changing Port**: Edit `PORT` in `server/.env` and restart.

2.  **Start the Client** (in a new terminal)
    ```bash
    cd client
    npm run dev
    ```
    *   Client runs on `http://localhost:5173`
    *   **Changing Port**: Edit `port` in `client/vite.config.js`.

## Usage

1.  Open the client URL in your browser.
2.  Use the **Search Bar** to find a movie or TV show.
3.  Click **Upload** on a result to add your local video file (and optional subtitles).
4.  Once uploaded, it appears in **My Library**.
5.  Click a card to **Play** or view **Details** (for TV shows).
6.  Use **Add Manually** for content not found on TMDB.

## Accessing from Local Network (LAN)

To watch movies on other devices (TV, Phone, Tablet) connected to the same Wi-Fi:

1.  **Find your Computer's IP Address**:
    *   Windows: Open terminal, type `ipconfig`. Look for "IPv4 Address" (e.g., `192.168.1.10`).
    *   Mac/Linux: Type `ifconfig`.

2.  **Configure the Client**:
    *   Open `client/src/config.js` in a text editor.
    *   Change `SERVER_IP` to your computer's IP (e.g., `'192.168.1.10'`).

3.  **Run**:
    *   Server: `node src/index.js`
    *   Client: `npm run dev` (It is now pre-configured to share on network!)

4.  **Watch**:
    *   Go to `http://192.168.1.10:5173` on your phone or TV browser.

