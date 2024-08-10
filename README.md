## Black Rock City Planner [![Build Status](https://travis-ci.org/Burning-Man-Earth/BlackRockCityPlanner.svg?branch=master)](https://travis-ci.org/Burning-Man-Earth/BlackRockCityPlanner)

This is a collection of command line tools and scripts that generate [GeoJSON](http://geojson.org/). The GeoJSON is then used in the [iBurn](https://iburnapp.com/) app.

### Geo Data Generator

#### What we can create:
 - The centerlines of all the streets inside the fence.
 - The trash fence pentagon.
 - All the plazas and portals.
 - An outline of all the streets at proper width combined with plazas and portals (used for good looking rendereing).
 - Toilets as points or polygons

#### What we can't create:
 - Gate Road
 - Camp polygons (can geocode addresses).
 - Art locations (can geocode addresses).
 - Locations of important POI like first-aid, ranger and ice.
 - Airport 

#### Install

`npm install` or `npm install -g`

#### Use

##### Generate all the files at once

```
$ node src/cli/generate_all.js -d ../../data/2024
$ node src/cli/api.js -l ../../data/2024/layouts/layout.json -f ../../data/2024/APIData/camp.json -k location_string -o ../../data/2024/APIData/camp-location.json
$ mv ../../data/2024/APIData/camp-location.json ../../data/2024/APIData/camp.json
```
##### Streets

`node src/cli/layout.js -f [layout file] -o [output file] -t [type]`

- layout file: path to the [layout file](https://github.com/Burning-Man-Earth/iBurn-Data/tree/master/data). Use the latest year to see the proper format.
- output file: (optional) The output GeoJSON destination. Results from [2016](https://github.com/Burning-Man-Earth/iBurn-Data/tree/master/data/2016/geo)
- type: `streets`, `polygons`, `outline`, `fence`, `dmz`

##### Toilets

`node src/cli/toilet.js -f [layout file] -t [toilet layout file] -o [output file]`

- layout file: path to the [layout file](https://github.com/Burning-Man-Earth/iBurn-Data/tree/master/data). Use the latest year to see the proper format.
- toilet layout file: path to the [toilet layout file](https://github.com/Burning-Man-Earth/iBurn-Data/blob/master/data/2016/layouts/toilet.json).
- output file: (optional) The output GeoJSON destination. Here are results for [2016](https://github.com/Burning-Man-Earth/iBurn-Data/blob/master/data/2016/geo/toilets.geojson)

#### API

This geocodes the a string in an API JSON file and outputs full API result + lat/lon.

`node src/cli/api.js -l [layout file] -f [API JSON] -k [key string to geocode] -o [output file]`
e.g.
```
node src/cli/api.js -l ../../data/2022/layouts/layout-single-letter.json -f ../../data/2022/APIData/camp.json -k location_string -o ../../data/2022/APIData/camp-location.json
```

### [Geocoder](src/geocoder/readme.md)
