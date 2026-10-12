# Basemap licenses

The files in this folder are third-party content under their own licenses.
They apply in addition to the MIT license of this repository, which only covers the source code.

| File                      | Origin                                                                                                                                                                                  | License                                                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `muenchen-*.pmtiles`      | Extract of the [Protomaps basemap](https://github.com/protomaps/basemaps), generated from OpenStreetMap; source build and checksum in `basemap.json`                                    | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/), © OpenStreetMap contributors |
| `muenchen-grenze.geojson` | City boundary of Munich, OpenStreetMap relation 62428, retrieved via Nominatim on 2026-10-06                                                                                            | [ODbL 1.0](https://opendatacommons.org/licenses/odbl/), © OpenStreetMap contributors |
| `sprites/`                | Icons from [protomaps/basemaps-assets](https://github.com/protomaps/basemaps-assets) `sprites/v4` at commit `028c18f`, derived from [tangrams/icons](https://github.com/tangrams/icons) | MIT, see below                                                                       |

The map labels use Roboto from the `@fontsource/roboto` npm package (SIL Open Font License 1.1), which the app uses as well.

The map credits the data with "© OpenStreetMap", linked to https://www.openstreetmap.org/copyright.

## City boundary

`muenchen-grenze.geojson` was retrieved once from the Nominatim API on 2026-10-06. The city boundary of Munich rarely changes, so there is no script for it. To update it, repeat this request:

```text
https://nominatim.openstreetmap.org/lookup?osm_ids=R62428&format=geojson&polygon_geojson=1&polygon_threshold=0.0003
```

`polygon_threshold=0.0003` simplifies the outline to about 370 points, which deviates from the full boundary by a few tens of meters at most.
From the response, only the geometry of the first feature was kept. The properties were replaced by `name`, `source` and `license`.
Follow the [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/) (single manual requests, a meaningful User-Agent).

## MIT license of the icons

```text
The MIT License (MIT)

Copyright (c) 2017 Mapzen, Linux Foundation

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```
