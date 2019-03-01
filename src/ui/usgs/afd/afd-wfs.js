/* Advanced Feature Descriptions Functions for OGC WFS operations.
 *
 * Dependencies:
 *
 * Leaflet
 * Leaflet-WFST
 */

// default geometry column name, base wfs url, feature type namespace & crs
var GEOM_FLD = 'the_geom';
var WFS_BASE_URL = 'http://localhost:8080/geoserver/wfs';
var TYPE_NS = 'usgsns';
var DEFAULT_CRS = L.CRS.EPSG4326;

// default line values
var LINE_COLOR = 'blue';
var LINE_WEIGHT = 3;

// default polygon values
var POLY_COLOR = 'blue';
var POLY_WEIGHT = 2;

/*
 * Load an OGC-compliant WFS point layer onto the map.
 */
function loadWfsPtLayer(ftypeName, ftypeNS, wfsBaseUrl, lyrCrs, geomFld) {
	
	// use default values if not specified
	if(!ftypeNS)
	    ftypeNS = TYPE_NS;
	if(!wfsBaseUrl)
	    wfsBaseUrl = WFS_BASE_URL;
	if(!lyrCrs)
	    lyrCrs = DEFAULT_CRS;
	if(!geomFld)
	    geomFld = GEOM_FLD;

	// set up leaflet-wfst options for POINT geometry
	const wfstPointOptions = {
	  crs: lyrCrs,
	  showExisting: true,
	  geometryField: geomFld,
	  url: wfsBaseUrl,
	  typeNS: ftypeNS,
	  typeName: ftypeName,
	  maxFeatures: 90,
	  opacity: 1,
	  style: function(layer) {
	    return {
	      color: 'black',
	      weight: 1
	    }
	  }
          
	};

	// create the leaflet-wfst POINT layer and add it to the map
	const wfstPoint = new L.WFST(wfstPointOptions, new L.Format.GeoJSON({
	  crs: lyrCrs,
	  pointToLayer(geoJsonPoint, latlng) {
	    const layer = new L.Marker(latlng);
	    return layer;
	  }
	})
	);

	// display wfs attributes in popup on click event
	wfstPoint.on('click', function (event) {
	    var props = event.layer.feature.properties;
	    var fid = event.layer.feature.id;
	    html = buildPopupHtml(props, ftypeName, fid);
	    event.layer.bindPopup(html).openPopup();
	});

	// add pt layer to map
	wfstPoint.addTo(map);

}

/*
 * Load an OGC-compliant WFS line layer onto the map.
 */
function loadWfsLineLayer(ftypeName, ftypeNS, wfsBaseUrl, lyrCrs, geomFld, color, weight) {

	// use default values if not specified
	if(!ftypeNS)
	    ftypeNS = TYPE_NS;
	if(!wfsBaseUrl)
	    wfsBaseUrl = WFS_BASE_URL;
	if(!lyrCrs)
	    lyrCrs = DEFAULT_CRS;
	if(!geomFld)
	    geomFld = GEOM_FLD;
	if(!color) 
	    color = LINE_COLOR;
	if(!weight)
	    weight = LINE_WEIGHT;	

	// create line layer
	var wfstLine = new L.WFS({
	    url: wfsBaseUrl,
	    typeNS: ftypeNS,
	    typeName: ftypeName,
	    geometryField: geomFld,
	    crs: lyrCrs,
	    style: {
		color: color,
		weight: weight
	    }
	});

	// display wfs attributes in popup on click event
	wfstLine.on('click', function (event) {
	    var props = event.layer.feature.properties;
	    var fid = event.layer.feature.id;
	    html = buildPopupHtml(props, ftypeName, fid);
	    event.layer.bindPopup(html).openPopup();
	});

	// add line layer to the map
	wfstLine.addTo(map);

}

/*
 * Load an OGC-compliant WFS polygon layer onto the map.
 */
function loadWfsPolyLayer(ftypeName, ftypeNS, wfsBaseUrl, lyrCrs, geomFld, color, weight) {

	// use default values if not specified
	if(!ftypeNS)
	    ftypeNS = TYPE_NS;
	if(!wfsBaseUrl)
	    wfsBaseUrl = WFS_BASE_URL;
	if(!lyrCrs)
	    lyrCrs = DEFAULT_CRS;
	if(!geomFld)
	    geomFld = GEOM_FLD;
	if(!color) 
	    color = POLY_COLOR;
	if(!weight)
	    weight = POLY_WEIGHT;	

	// create polygon layer
	var wfstPolygon = new L.WFS({
	    url: wfsBaseUrl,
	    typeNS: ftypeNS,
	    typeName: ftypeName,
	    geometryField: geomFld,
	    crs: lyrCrs,
	    style: {
		color: color,
		weight: weight
	    }
	});

	// display wfs attributes in popup on click event
	wfstPolygon.on('click', function (event) {
	    var props = event.layer.feature.properties;
	    var fid = event.layer.feature.id;
	    html = buildPopupHtml(props, ftypeName, fid);
	    event.layer.bindPopup(html).openPopup();
	});

	// add polygon layer to the map
	wfstPolygon.addTo(map);

}

/*
 * Loop through attributes and build html for popup.
 */
function buildPopupHtml(props, ftypeName, fid) {

    var html = '';
    for (var key in props)
      html += '<b>' + key + ': &nbsp; </b>' + props[key] + '<br>'; 

    // add a button to obtain advanced (aggregated) feature description
    html += "<p><a href='#' onClick=\"getAdvFtrDesc('"+ftypeName+"', '"+fid+"');\">Advanced Feature Description</a></p>";

    return html;

}

