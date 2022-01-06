const EXTENT = [-Math.PI * 6378137, Math.PI * 6378137];
const maxZoom = 16;

function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: { lat: 50.4535886, lng: 30.6015252 },
        mapTypeControlOptions: {
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        mapTypeId: 'satellite'
    });
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude})
        });
    }
    createOverlay(map)
    createSearch(map)
}


function xyzToBounds(x, y, z) {
    const zoom = z <= maxZoom ? z : maxZoom; 
    const tileSize = (EXTENT[1] * 2) / Math.pow(2, zoom);
    // const tilesSkip = z <= maxZoom ? 0 : (Math.pow(2, z - maxZoom) - 1);
    const coordsDiv = z <= maxZoom ? 1 : Math.pow(2, z - maxZoom)

    const minx = EXTENT[0] + Math.floor(x / coordsDiv) * tileSize;
    const maxx = EXTENT[0] + Math.floor((x) / coordsDiv + 1) * tileSize;
    // remember y origin starts at top
    const miny = EXTENT[1] - Math.floor((y) / coordsDiv + 1) * tileSize;
    const maxy = EXTENT[1] - Math.floor(y / coordsDiv) * tileSize;

    return {
        bounds: [minx, miny, maxx, maxy], 
        offset: [x % coordsDiv / coordsDiv * -100 + '%', y % coordsDiv / coordsDiv * -100 + '%']
    };
}

function getTileUrl(coordinates, zoom) {
    return (
        "https://m2.land.gov.ua/geowebcache/service/wms?tiled=true&SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&FORMAT=image%2Fpng&TRANSPARENT=true&LAYERS=kadastr&TILED=true&STYLES=&SRS=EPSG%3A900913&WIDTH=256&HEIGHT=256&CRS=EPSG%3A900913" +
        "&BBOX=" +
        xyzToBounds(coordinates.x, coordinates.y, zoom).bounds.join(",")
    );
};

function getOffset(coordinates, zoom) {
    return xyzToBounds(coordinates.x, coordinates.y, zoom).offset
}

function createOverlay(map) {
    const landcover = new google.maps.ImageMapType({
        getTileUrl: getTileUrl,
        name: "Kadastr",
        alt: "Kadastr layer",
        minZoom: 0,
        // maxZoom: 16,
        opacity: 1.0
    });

    // transform for unnsuppoorted zooms
    landcover.baseGetTile = landcover.getTile;
    landcover.getTile = function(c, z, doc) {
        const node = this.baseGetTile(c, z, doc)
        node.style.overflow = 'hidden'
        node.style.width = '256px'
        node.style.height = '256px'
        if (z > maxZoom) {
            const observer = new MutationObserver((mutationsList, observer)=>{
                const offset = getOffset(c, z, doc)
                node.children[0].style.width = parseInt(node.children[0].style.width) * Math.pow(2, z - maxZoom) + 'px';
                node.children[0].style.height = parseInt(node.children[0].style.height) * Math.pow(2, z - maxZoom) + 'px';
                node.children[0].style.transform = `translate(${offset[0]}, ${offset[1]})`
                observer.disconnect();
            });
            observer.observe(node, {childList: true})
        }
        return node
    }

    map.overlayMapTypes.push(landcover);

    return map;
} 

function createSearch(map) {
    const input = document.getElementById("pac-input");
    const searchBox = new google.maps.places.SearchBox(input);

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
    // Bias the SearchBox results towards current map's viewport.
    map.addListener("bounds_changed", () => {
        searchBox.setBounds(map.getBounds());
    });

    let markers = [];

    // Listen for the event fired when the user selects a prediction and retrieve
    // more details for that place.
    searchBox.addListener("places_changed", () => {
        const places = searchBox.getPlaces();

        if (places.length == 0) {
            return;
        }

        // Clear out the old markers.
        markers.forEach((marker) => {
            marker.setMap(null);
        });
        markers = [];

        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();

        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                console.log("Returned place contains no geometry");
                return;
            }

            const icon = {
                url: place.icon,
                size: new google.maps.Size(71, 71),
                origin: new google.maps.Point(0, 0),
                anchor: new google.maps.Point(17, 34),
                scaledSize: new google.maps.Size(25, 25),
            };

            // Create a marker for each place.
            markers.push(
                new google.maps.Marker({
                    map,
                    icon,
                    title: place.name,
                    position: place.geometry.location,
                })
            );
            if (place.geometry.viewport) {
                // Only geocodes have viewport.
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        map.fitBounds(bounds);
    });
}

