const EXTENT = [-Math.PI * 6378137, Math.PI * 6378137];
const maxZoom = 16;

let positionMarker;
let trackPosition = false;

function initMap() {
    const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: { lat: 50.4535886, lng: 30.6015252 },
        mapTypeControlOptions: {
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain']
        },
        mapTypeId: 'satellite'
    });

    const centerControlDiv = document.createElement("div");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(centerControlDiv);

    const headingIcon = "M511.107,499.463L263.64,4.53c-2.893-5.786-12.382-5.786-15.275,0L0.899,499.463c-1.724,3.448-0.913,7.629,1.963,10.189 c2.884,2.568,7.142,2.884,10.351,0.759l242.79-159.07l242.79,159.07c1.425,0.939,3.055,1.399,4.676,1.399 c2.039,0,4.07-0.725,5.675-2.159C512.02,507.092,512.83,502.911,511.107,499.463z";
    const locationIcon = "M12,2 C12.5128358,2 12.9355072,2.38604019 12.9932723,2.88337887 L13,3 L13.0003445,4.31396524 C16.4808766,4.76250386 19.238071,7.51999063 19.6861644,11.0006622 L21,11 C21.5522847,11 22,11.4477153 22,12 C22,12.5128358 21.6139598,12.9355072 21.1166211,12.9932723 L21,13 L19.6860348,13.0003445 C19.2375394,16.480541 16.480541,19.2375394 13.0003445,19.6860348 L13,21 C13,21.5522847 12.5522847,22 12,22 C11.4871642,22 11.0644928,21.6139598 11.0067277,21.1166211 L11,21 L11.0006622,19.6861644 C7.51999063,19.238071 4.76250386,16.4808766 4.31396524,13.0003445 L3,13 C2.44771525,13 2,12.5522847 2,12 C2,11.4871642 2.38604019,11.0644928 2.88337887,11.0067277 L3,11 L4.31383558,11.0006622 C4.7619722,7.51965508 7.51965508,4.7619722 11.0006622,4.31383558 L11,3 C11,2.44771525 11.4477153,2 12,2 Z M12,6.25 C8.82436269,6.25 6.25,8.82436269 6.25,12 C6.25,15.1756373 8.82436269,17.75 12,17.75 C15.1756373,17.75 17.75,15.1756373 17.75,12 C17.75,8.82436269 15.1756373,6.25 12,6.25 Z M12,8 C14.209139,8 16,9.790861 16,12 C16,14.209139 14.209139,16 12,16 C9.790861,16 8,14.209139 8,12 C8,9.790861 9.790861,8 12,8 Z";

    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const icon = {
                path: position.heading ? headingIcon : locationIcon,
                fillColor: "#4a83f8",
                fillOpacity: 1,
                strokeWeight: 1,
                strokeColor: "white",
                rotation: position.heading || 0,
                scale: position.heading  ? 0.05 : 2,
                anchor: position.heading ? new google.maps.Point(256, 256) : new google.maps.Point(12, 12),
              }
            positionMarker = new google.maps.Marker({
                map,
                icon,
                position: {lat: position.coords.latitude, lng: position.coords.longitude},
            })
            map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude})

            navigator.geolocation.watchPosition((position) => {
                positionMarker.setPosition({lat: position.coords.latitude, lng: position.coords.longitude});
                if (position.heading) {
                    positionMarker.setIcon(Object.assign(icon, {rotation: position.heading}));
                }
                if (trackPosition) {
                    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude})
                }
            }, null, {enableHighAccuracy: true})
            // for safari
            window.addEventListener('deviceorientation', function(e) {
                if (e.webkitCompassHeading) {
                    // e.webkitCompassHeading
                    // e.webkitCompassAccuracy
                    positionMarker.setIcon(Object.assign(icon, {path: headingIcon, rotation: e.webkitCompassHeading}));
                }
           }, false);

            const controlUI = document.createElement("div");
            controlUI.className = 'control-ui'
            const controlText = document.createElement("div");
            controlText.className = 'control-text'
            controlText.innerHTML = trackPosition ? "Вимкнути трекінг" : "Увімкнути трекінг";
            controlUI.appendChild(controlText);
            controlUI.addEventListener("click", () => {
                trackPosition = !trackPosition;
                controlText.innerHTML = trackPosition ? "Вимкнути трекінг" : "Увімкнути трекінг";
                if (trackPosition) {
                    map.setCenter({lat: position.coords.latitude, lng: position.coords.longitude})
                }
              });
            centerControlDiv.appendChild(controlUI);
            

        }, null, {enableHighAccuracy: true});
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

