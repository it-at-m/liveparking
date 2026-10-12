<!-- add Project Logo, if existing -->

# Parkhausradar, Munich's parking guidance system online

[![Made with love by it@M][made-with-love-shield]][itm-opensource]
<!-- feel free to add more shields, style 'for-the-badge' -> see https://shields.io/badges -->

Live occupancy of the parking garages in Munich's city center on an interactive map - mobile first, with traffic-light markers, a detail panel and direct route planning via common map providers.

> **Note:** This project is currently being rebuilt. The previous prototype is archived in the [`archive-prototype`](https://github.com/it-at-m/parkhausradar/tree/archive-prototype) branch.

### Built With

TBD

## Roadmap

TBD

See the [open issues](https://github.com/it-at-m/parkhausradar/issues) for a full list of proposed features (and known issues).

## Set up

TBD

## Documentation

### Architecture

TBD

### Deployment

TBD

### Data Sources

TBD

### Basemap

The map is served entirely from our own server, so no request of a citizen reaches a third party. It is a [PMTiles](https://docs.protomaps.com/pmtiles/) extract of the [Protomaps basemap](https://github.com/protomaps/basemaps) for the city of Munich, generated from OpenStreetMap.

The tileset (~36 MB) is too large for Git. It is published as an asset of a GitHub release and referenced in [`frontend/basemap.json`](frontend/basemap.json) by URL and SHA-256 checksum. `npm run build` and `npm run dev` download it into `frontend/public/map/` and abort if the checksum does not match.

To update the basemap:

1. Run `scripts/build-basemap.sh <YYYYMMDD>` in `frontend/` with a build date from [maps.protomaps.com/builds](https://maps.protomaps.com/builds). It requires the [pmtiles CLI](https://github.com/protomaps/go-pmtiles) and updates `basemap.json`.
2. Create the release `basemap-<YYYYMMDD>` with the generated file as asset. Do not mark it as latest release, and state the license in the release notes (ODbL, © OpenStreetMap contributors, source build).
3. Open a pull request with the updated `basemap.json` and check the map visually before merging.

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please open an issue with the tag "enhancement", fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Open an issue with the tag "enhancement"
2. Fork the Project
3. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
4. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
5. Push to the Branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

More about this in the [CODE_OF_CONDUCT](/CODE_OF_CONDUCT.md) file.


## License

Distributed under the MIT License. See [LICENSE](LICENSE) file for more information.

The basemap data and icons in `frontend/public/map/` are third-party content under their own licenses (ODbL, MIT). See [`frontend/public/map/LICENSE.md`](frontend/public/map/LICENSE.md).


## Contact

it@M - opensource@muenchen.de

<!-- project shields / links -->
[made-with-love-shield]: https://img.shields.io/badge/made%20with%20%E2%9D%A4%20by-it%40M-yellow?style=for-the-badge
[itm-opensource]: https://opensource.muenchen.de/
