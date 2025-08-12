#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');
const nopt = require('nopt');
const Geocoder = require('../geocoder/geocoder.js');

// Parse command line arguments
const knownOpts = {
    "year": String,
    "layout": path,
    "output": path
};
const shortHands = {
    "y": ["--year"],
    "l": ["--layout"],
    "o": ["--output"]
};
const parsed = nopt(knownOpts, shortHands, process.argv, 2);

// Validate required arguments
if (!parsed.year || !parsed.layout || !parsed.output) {
    console.error('Usage: fetch_and_geocode.js --year <year> --layout <layout.json> --output <output-dir>');
    console.error('Example: BMORG_API_KEY=your-key node fetch_and_geocode.js -y 2025 -l ../../data/2025/layouts/layout.json -o ../../data/2025/APIData/APIData.bundle');
    process.exit(1);
}

// Check for API key
const apiKey = process.env.BMORG_API_KEY;
if (!apiKey) {
    console.error('Error: BMORG_API_KEY environment variable not set');
    console.error('Usage: BMORG_API_KEY=your-api-key node fetch_and_geocode.js ...');
    process.exit(1);
}

// API endpoints
const endpoints = {
    camp: `https://api.burningman.org/api/camp?year=${parsed.year}`,
    art: `https://api.burningman.org/api/art?year=${parsed.year}`,
    event: `https://api.burningman.org/api/event?year=${parsed.year}`
};

/**
 * Fetch data from Burning Man API
 */
function fetchFromAPI(url) {
    return new Promise((resolve, reject) => {
        const options = {
            headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json',
                'User-Agent': 'iBurn-Data-Sync/1.0'
            }
        };

        https.get(url, options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON: ${e.message}`));
                    }
                } else {
                    reject(new Error(`API returned status ${res.statusCode}: ${data}`));
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Geocode camps using the layout file
 */
function geocodeCamps(camps, layoutData) {
    const geocoder = new Geocoder(layoutData);
    let geocodedCount = 0;
    let failedCount = 0;
    const failedCamps = [];

    console.log(`\nGeocoding ${camps.length} camps...`);

    const geocodedCamps = camps.map(camp => {
        // Clean up null/undefined values
        for (let key in camp) {
            if (camp[key] === null || camp[key] === undefined) {
                delete camp[key];
            }
        }

        // Check if camp has location_string to geocode
        if (camp.location_string && camp.location) {
            const cleanedLocation = camp.location_string.replace(" None None", "");
            
            try {
                const point = geocoder.forward(cleanedLocation);
                
                if (point && point.geometry && point.geometry.coordinates) {
                    const lat = point.geometry.coordinates[1];
                    const lon = point.geometry.coordinates[0];
                    
                    if (typeof lat === "number" && typeof lon === "number") {
                        camp.location.gps_latitude = lat;
                        camp.location.gps_longitude = lon;
                        geocodedCount++;
                    } else {
                        console.warn(`Non-numeric result for ${camp.name} @ ${camp.location_string}`);
                        failedCount++;
                        failedCamps.push({ name: camp.name, location: camp.location_string });
                    }
                } else {
                    console.warn(`Could not geocode ${camp.name}: ${camp.location_string}`);
                    failedCount++;
                    failedCamps.push({ name: camp.name, location: camp.location_string });
                }
            } catch (error) {
                console.warn(`Error geocoding ${camp.name}: ${error.message}`);
                failedCount++;
                failedCamps.push({ name: camp.name, location: camp.location_string, error: error.message });
            }
        } else if (!camp.location_string) {
            // No location string to geocode
            if (!camp.location) {
                delete camp.location;
            }
        }

        return camp;
    });

    console.log(`✓ Geocoded ${geocodedCount} camps successfully`);
    if (failedCount > 0) {
        console.log(`✗ Failed to geocode ${failedCount} camps`);
        if (failedCamps.length <= 10) {
            failedCamps.forEach(camp => {
                console.log(`  - ${camp.name}: ${camp.location}`);
            });
        } else {
            console.log(`  (showing first 10 of ${failedCamps.length} failures)`);
            failedCamps.slice(0, 10).forEach(camp => {
                console.log(`  - ${camp.name}: ${camp.location}`);
            });
        }
    }

    return geocodedCamps;
}

/**
 * Save data to file
 */
function saveToFile(filepath, data) {
    const tempFile = filepath + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
    fs.renameSync(tempFile, filepath);
}

/**
 * Main execution
 */
async function main() {
    console.log(`Fetching Burning Man ${parsed.year} data...`);
    console.log(`API Key: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Create output directory if it doesn't exist
    if (!fs.existsSync(parsed.output)) {
        fs.mkdirSync(parsed.output, { recursive: true });
        console.log(`Created output directory: ${parsed.output}`);
    }

    // Load layout file for geocoding
    let layoutData;
    try {
        layoutData = JSON.parse(fs.readFileSync(parsed.layout, 'utf8'));
        console.log(`✓ Loaded layout file: ${parsed.layout}`);
    } catch (error) {
        console.error(`Failed to load layout file: ${error.message}`);
        process.exit(1);
    }

    // Track results
    const results = {};
    const timestamps = {};

    // Fetch camps and geocode them
    try {
        console.log('\nFetching camps...');
        const camps = await fetchFromAPI(endpoints.camp);
        console.log(`✓ Fetched ${camps.length} camps`);
        
        // Geocode camps
        const geocodedCamps = geocodeCamps(camps, layoutData);
        
        // Save camps
        const campFile = path.join(parsed.output, 'camp.json');
        saveToFile(campFile, geocodedCamps);
        console.log(`✓ Saved geocoded camps to ${campFile}`);
        
        results.camps = geocodedCamps.length;
        timestamps.camps = new Date().toISOString();
    } catch (error) {
        console.error(`✗ Failed to fetch/process camps: ${error.message}`);
        results.camps = 'failed';
    }

    // Fetch art (already geocoded)
    try {
        console.log('\nFetching art...');
        const art = await fetchFromAPI(endpoints.art);
        console.log(`✓ Fetched ${art.length} art installations`);
        
        // Save art as-is
        const artFile = path.join(parsed.output, 'art.json');
        saveToFile(artFile, art);
        console.log(`✓ Saved art to ${artFile}`);
        
        results.art = art.length;
        timestamps.art = new Date().toISOString();
    } catch (error) {
        console.error(`✗ Failed to fetch art: ${error.message}`);
        results.art = 'failed';
    }

    // Fetch events
    try {
        console.log('\nFetching events...');
        const events = await fetchFromAPI(endpoints.event);
        console.log(`✓ Fetched ${events.length} events`);
        
        // Save events as-is
        const eventFile = path.join(parsed.output, 'event.json');
        saveToFile(eventFile, events);
        console.log(`✓ Saved events to ${eventFile}`);
        
        results.events = events.length;
        timestamps.events = new Date().toISOString();
    } catch (error) {
        console.error(`✗ Failed to fetch events: ${error.message}`);
        results.events = 'failed';
    }

    // Format timestamp for Pacific Time with proper timezone offset
    function formatTimestamp(isoString) {
        const date = isoString ? new Date(isoString) : new Date();
        
        // Use Intl.DateTimeFormat to get the correct time in Pacific timezone
        const parts = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(date);
        
        // Extract parts
        const get = (type) => parts.find(p => p.type === type)?.value;
        
        const year = get('year');
        const month = get('month');
        const day = get('day');
        const hour = get('hour');
        const minute = get('minute');
        const second = get('second');
        
        // Burning Man is always in late August/early September (PDT = UTC-7)
        // We could calculate dynamically but for Burning Man it's always -07:00
        const offset = '-07:00';
        
        return `${year}-${month}-${day}T${hour}:${minute}:${second}${offset}`;
    }
    
    const updateData = {
        art: {
            file: "art.json",
            updated: formatTimestamp(timestamps.art)
        },
        camps: {
            file: "camp.json",
            updated: formatTimestamp(timestamps.camps)
        },
        events: {
            file: "event.json",
            updated: formatTimestamp(timestamps.events)
        }
    };

    const updateFile = path.join(parsed.output, 'update.json');
    saveToFile(updateFile, updateData);
    console.log(`✓ Saved update.json to ${updateFile}`);

    // Summary
    console.log('\n=== Summary ===');
    console.log(`Camps: ${results.camps === 'failed' ? 'Failed' : results.camps + ' (geocoded)'}`);
    console.log(`Art: ${results.art === 'failed' ? 'Failed' : results.art}`);
    console.log(`Events: ${results.events === 'failed' ? 'Failed' : results.events}`);
    console.log(`\nAll data saved to: ${parsed.output}`);
}

// Run the script
main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});