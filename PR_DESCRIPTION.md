# Pull Request: Enable Offline Playback for TV Shows

## Description
This PR addresses a critical issue where TV Show episodes were inaccessible without an internet connection. Previously, the application relied heavily on the TMDB API to fetch episode lists, causing the UI to fail when the API was unreachable, even if the content was stored locally.

## Changes
- **Client (`ShowDetails.jsx`)**:
    -   Refactored `fetchDetails` to prioritize fetching local data from the backend.
    -   Implemented a robust fallback mechanism: if the TMDB API call fails (e.g., in offline mode), the application now dynamically constructs the season and episode list using data available in the local database.
    -   Added error handling to ensure users can access and play their offline library seamlessly.

## Testing
-   **Manual Verification**:
    -   Simulated offline environment by disconnecting the network.
    -   Verified that TV Show details load correctly and episodes are listed from the local DB.
    -   Confirmed that playback works for local files without internet access.
-   **Online Mode**:
    -   Verified that rich metadata is still fetched and displayed from TMDB when an internet connection is available.

## Related Issues
-   Fixes issue where offline playback was impossible for TV Shows.
