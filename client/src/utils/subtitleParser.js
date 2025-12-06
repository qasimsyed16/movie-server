// Utility to parse SRT and VTT subtitle formats

const parseTime = (timeString) => {
    if (!timeString) return 0;

    // Format: 00:00:20,000 or 00:00:20.000
    const parts = timeString.split(':');
    if (parts.length < 3) return 0;

    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const secondsParts = parts[2].split(/[,\.]/);
    const seconds = parseInt(secondsParts[0], 10);
    const ms = parseInt(secondsParts[1] || 0, 10);

    return (hours * 3600) + (minutes * 60) + seconds + (ms / 1000);
};

export const parseSubtitles = (content) => {
    if (!content) return [];

    const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const subtitles = [];
    let currentSub = {};
    let state = 'counter'; // counter, time, text

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === '') {
            if (currentSub.start !== undefined && currentSub.text) {
                subtitles.push(currentSub);
                currentSub = {};
            }
            state = 'counter';
            continue;
        }

        // Try to detect if it's a VTT header or similar
        if (line.includes('WEBVTT')) continue;

        // Pattern for timecode: 00:00:00,000 --> 00:00:00,000
        const timeMatch = line.match(/(\d{2}:\d{2}:\d{2}[,\.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,\.]\d{3})/);

        if (timeMatch) {
            currentSub.start = parseTime(timeMatch[1]);
            currentSub.end = parseTime(timeMatch[2]);
            state = 'text';
        } else if (state === 'text') {
            currentSub.text = currentSub.text ? currentSub.text + '\n' + line : line;
        } else {
            // Probably a counter line or something else, ignore for now
        }
    }

    // Push last subtitle if exists
    if (currentSub.start !== undefined && currentSub.text) {
        subtitles.push(currentSub);
    }

    return subtitles;
};
