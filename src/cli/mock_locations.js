var fs = require('fs');
var levenshtein = require('levenshtein');

var nopt = require("nopt"),
    path = require("path"),
    knownOpts = {
        "source": path,
        "target": path,
        "output": path,
        "type": String,
        "match-threshold": Number,
        "help": Boolean
    },
    shortHands = {
        "s": ["--source"],
        "t": ["--target"],
        "o": ["--output"],
        "h": ["--help"],
        "m": ["--match-threshold"]
    },
    parsed = nopt(knownOpts, shortHands, process.argv, 2);

function showHelp() {
    console.log(`
Usage: node mock_locations.js [options]

Mock location data by copying from a source year to a target year based on name matching.

Options:
  -s, --source PATH         Source JSON file with location data (e.g., 2024 camp.json)
  -t, --target PATH         Target JSON file without location data (e.g., 2025 camp.json)
  -o, --output PATH         Output file path for enhanced data
  -m, --match-threshold NUM Minimum similarity score for fuzzy matching (0-1, default: 0.8)
  --type STRING            Data type (currently supports: camp, art, event)
  -h, --help               Show this help message

Examples:
  # Mock 2025 camp locations from 2024 data
  node mock_locations.js \\
    --source ../../data/2024/APIData/camp.json \\
    --target ../../data/2025/APIData/APIData.bundle/camp.json \\
    --output ../../data/2025/APIData/APIData.bundle/camp-mocked.json \\
    --type camp

  # Use more permissive matching threshold
  node mock_locations.js -s 2024/camp.json -t 2025/camp.json -o 2025/camp-mocked.json --match-threshold 0.7
`);
}

if (parsed.help || !parsed.source || !parsed.target) {
    showHelp();
    process.exit(parsed.help ? 0 : 1);
}

// Default values
var matchThreshold = parsed['match-threshold'] || 0.8;
var dataType = parsed.type || 'camp';

// Read source and target data
var sourceData, targetData;
try {
    sourceData = JSON.parse(fs.readFileSync(parsed.source, 'utf8'));
    targetData = JSON.parse(fs.readFileSync(parsed.target, 'utf8'));
} catch (error) {
    console.error('Error reading input files:', error.message);
    process.exit(1);
}

console.log(`Processing ${dataType} data...`);
console.log(`Source: ${sourceData.length} items with location data`);
console.log(`Target: ${targetData.length} items without location data`);
console.log(`Match threshold: ${matchThreshold}`);

/**
 * Calculate similarity score between two strings using Levenshtein distance
 * Returns a score from 0 (no match) to 1 (exact match)
 */
function calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    var s1 = str1.toLowerCase().trim();
    var s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 1;
    
    var distance = levenshtein(s1, s2);
    var maxLength = Math.max(s1.length, s2.length);
    
    return maxLength === 0 ? 0 : 1 - (distance / maxLength);
}

/**
 * Find the best match for a target item in the source data
 */
function findBestMatch(targetItem, sourceData) {
    var bestMatch = null;
    var bestScore = 0;
    
    for (var i = 0; i < sourceData.length; i++) {
        var sourceItem = sourceData[i];
        
        // Skip if source item doesn't have location data
        if (!sourceItem.location || !sourceItem.location_string) {
            continue;
        }
        
        var score = calculateSimilarity(targetItem.name, sourceItem.name);
        
        if (score > bestScore && score >= matchThreshold) {
            bestScore = score;
            bestMatch = {
                item: sourceItem,
                score: score
            };
        }
    }
    
    return bestMatch;
}

/**
 * Copy location data from source to target item
 */
function copyLocationData(targetItem, sourceItem) {
    // Deep copy the location object
    targetItem.location = JSON.parse(JSON.stringify(sourceItem.location));
    targetItem.location_string = sourceItem.location_string;
    
    // Add mock flag to indicate this is simulated data
    targetItem.location_mock = true;
    targetItem.location_mock_source = sourceItem.name;
    
    return targetItem;
}

// Process matching
var results = [];
var matchStats = {
    exactMatches: 0,
    fuzzyMatches: 0,
    noMatches: 0,
    totalProcessed: 0
};

targetData.forEach(function(targetItem) {
    matchStats.totalProcessed++;
    
    // Clean up any null/undefined fields
    for (var key in targetItem) {
        if (targetItem[key] === null || targetItem[key] === undefined) {
            delete targetItem[key];
        }
    }
    
    var match = findBestMatch(targetItem, sourceData);
    
    if (match) {
        if (match.score === 1) {
            matchStats.exactMatches++;
            console.log(`Exact match: "${targetItem.name}" -> "${match.item.name}"`);
        } else {
            matchStats.fuzzyMatches++;
            console.log(`Fuzzy match: "${targetItem.name}" -> "${match.item.name}" (score: ${match.score.toFixed(3)})`);
        }
        
        copyLocationData(targetItem, match.item);
    } else {
        matchStats.noMatches++;
        console.log(`No match found for: "${targetItem.name}"`);
    }
    
    results.push(targetItem);
});

// Print statistics
console.log('\n=== Matching Statistics ===');
console.log(`Total processed: ${matchStats.totalProcessed}`);
console.log(`Exact matches: ${matchStats.exactMatches}`);
console.log(`Fuzzy matches: ${matchStats.fuzzyMatches}`);
console.log(`No matches: ${matchStats.noMatches}`);
console.log(`Success rate: ${((matchStats.exactMatches + matchStats.fuzzyMatches) / matchStats.totalProcessed * 100).toFixed(1)}%`);

// Write output
var outputPath = parsed.output || parsed.target.replace('.json', '-mocked.json');

try {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nOutput written to: ${outputPath}`);
} catch (error) {
    console.error('Error writing output file:', error.message);
    process.exit(1);
}