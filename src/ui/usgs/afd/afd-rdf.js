/* 
 * Advanced Feature Description functions for RDF processing operations
 */

var MARMOTTA_BASE_URL = 'http://localhost:8080/marmotta';
var MARMOTTA_DEREF_URL = MARMOTTA_BASE_URL + '/meta/application/ld+json?uri=';
var MARMOTTA_SPARQL_URL = MARMOTTA_BASE_URL + '/sparql/select?output=json&query=';
var FEATURE_BASE_URL = 'http://data.usgs.gov/';

// load the namespace IDs json from URL
var nsids = {};
$.getJSON('./afd/afd-nsids.json', function(data) { nsids = data; });

/* Lookup a namespace identifier based on dataset name of the feature.
 *
 * Inputs:
 *
 *   datasetName - The name of the dataset used to create map layer. 
 *                 For example, in the AFD Prototype, the GNIS dataset name is 'GNIS_DC_Features_20180401'.
 * 
 * Outputs:
 *
 *   nsID - The portion of the URI path that will identify which namespace 
 *          to use to construct the feature's URI in the hosted Marmotta server.
 *	    For example, the nsID for the dataset 'GNIS_DC_Features_20180401' = 'gnis'.
 */
function getNsId(datasetName) {

    // find dataset name and return its namespace ID
    for (var ds in nsids)
      if (ds == datasetName)
        return nsids[ds];

    // dataset not found  
    return null;
}

/*
 * Aggregate additional attributes of given feature via Marmotta.
 */
function getAdvFtrDesc(datasetName, fid) {

   // first clear tabs/data from previous features displayed
   $('#afd-tabs ul li').remove();
   $('#afd-tabs div').remove();
   $("#afd-tabs").tabs("refresh");

   // build feature's uri in marmotta
   var uri = FEATURE_BASE_URL + getNsId(datasetName) + fid;

   // TEST URIs
   //uri = "http://data.usgs.gov/gnis/GNIS_DC_Features_20180401.1";
   //uri = "http://data.usgs.gov/structures/usgs_structures.52";

   /*
    * find corefs that link **TO** this uri
    */
   var query1 = 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
	   'SELECT DISTINCT ?coref ?dsuri ' +
	   'WHERE ' +
	   '{ ' +
  	   '  { GRAPH ?dsuri ' +
    	   '    { ?coref owl:sameAs <' + uri + '> . } ' +
  	   '  } ' +
	   '}';

   query1 = encodeURIComponent(query1);
   executeAFDQuery(uri, query1, true, datasetName);
   
   /*
    * find corefs that have links **FROM** this uri
    */
   var query2 = 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
	   'SELECT DISTINCT ?coref ?dsuri ' +
	   'WHERE ' +
	   '{ ' +
  	   '  { GRAPH ?dsuri ' +
    	   '    { <' + uri + '> owl:sameAs ?coref . }' +
    	   '  } ' +
	   '}';

   query2 = encodeURIComponent(query2);
   executeAFDQuery(uri, query2, false, datasetName);

}

function executeAFDQuery(uri, query, useSrcName, datasetName) {

   // create full HTTP GET request URL
   var httpGet = MARMOTTA_SPARQL_URL + query;
   
   // execute sparql query in marmotta
   $.get({url: httpGet, 
	   success: function(result) {
	   	// if NO RESULTS, then just dereference feature URI
		if(!result) {
		    alert('No results!');
		    // FIXME this should probably be handled as an error; query should at least return results json with 0 bindings unless error occurs
		    getFtrDescByUri(uri, datasetName, useSrcName);
		}
		// if RESULTS, then dereference each one AND follow sameAs link out 1 node
		else {
			
		    bindings = result.results.bindings;
		    if(bindings.length > 0) {
			// deref each coref and follow sameAs link
			for(var i=0; i < bindings.length; i++) {
			    coref = bindings[i].coref.value;
			    dsuri = bindings[i].dsuri.value;
				
			    // deref uri
			    getFtrDescByUri(coref,dsuri, useSrcName);
			    // see if uri has any of its own sameAs links
			    followSameAsLink(coref, uri, datasetName);
			}
		    }
		    else { // no corefs, so just deref single feature URI
			//getFtrDescByUri(uri, datasetName, useSrcName);
		    }
		}
   }});



}

function followSameAsLink(uri, filterUri, datasetName) {

    /*
     * find corefs that link **TO** this uri
     */
    var query1 = 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
	   'SELECT DISTINCT ?coref ?dsuri ' +
	   'WHERE ' +
	   '{ ' +
  	   '  { GRAPH ?dsuri ' +
    	   '    { ?coref owl:sameAs <' + uri + '> . } ' +
  	   '  } ' +
	   '  FILTER( ?coref != <' + filterUri + '> ) . ' +
	   '}';

    query1 = encodeURIComponent(query1);
    followSameAsLinkQuery(uri, query1, true, datasetName);

    /*
     * find corefs that have links **FROM** this uri
     */
     var query2 = 'PREFIX owl: <http://www.w3.org/2002/07/owl#> ' +
	   'SELECT DISTINCT ?coref ?dsuri ' +
	   'WHERE ' +
	   '{ ' +
  	   '  { GRAPH ?dsuri ' +
    	   '    { <' + uri + '> owl:sameAs ?coref . }' +
    	   '  } ' +
	   '  FILTER( ?coref != <' + filterUri + '> ) . ' +
	   '}';

    query2 = encodeURIComponent(query2);
    followSameAsLinkQuery(uri, query2, false, datasetName);
    
}

function followSameAsLinkQuery(uri, query, useSrcName, datasetName) {

    // create full HTTP GET request URL
    var httpGet = MARMOTTA_SPARQL_URL + query;

    // execute sparql query in marmotta
    $.get({url: httpGet, 
	   success: function(result, uri) {
	   	// if NO RESULTS, then just dereference feature URI
		if(!result) {
		    // FIXME this should probably be handled as an error; query should at least return results json with 0 bindings unless error occurs
		    getFtrDescByUri(uri,datasetName,useSrcName);
		}
		// if RESULTS, then dereference each one
		else {
		    bindings = result.results.bindings;
		    if(bindings.length > 0) {
			// deref each coref
			for(var i=0; i < bindings.length; i++) {
			    coref = bindings[i].coref.value;
			    dsuri = bindings[i].dsuri.value;
			    getFtrDescByUri(coref,dsuri,useSrcName);
			}
		    }
		    else { // no corefs, so just deref single feature URI
			//getFtrDescByUri(uri,datasetName,useSrcName);
		    }
		}
   }});


}

/*
 * Retrieve attributes of feature from Marmotta and display in advanced feature description div.
 */
function getFtrDescByUri(uri, dsuri, useSrcName) {

   // strip "SOURCE-TARGET" dataset name off end of uri
   var srcTgtName = dsuri.substring(dsuri.lastIndexOf("/")+1);

   // to use source name, get substring BEFORE hyphen
   // to use target name, get substring AFTER hyphen
   var hyphenPos = srcTgtName.lastIndexOf("-");
   var dsname = useSrcName ? srcTgtName.substring(0,hyphenPos) : srcTgtName.substring(hyphenPos+1);

   // url encode the uri after question mark char
   var urlEncoded = encodeURIComponent(uri);

   // make the http request to deref the data
   $.get({url: MARMOTTA_DEREF_URL + urlEncoded, success: function(result) {
	// create results html from sparql select json results and render as a new AFD tab in UI
	if(result) {
	    var attsHtml = buildFeatureHtml(result);
	    createTab(dsname, attsHtml);
	}
	else { // NO RESULTS! render as a new tab in UI and state couldn't load results
	    alert('NO results for deref URI: ' + uri);
	    createTab(dsname,'<b>Unable to retrieve attributes of feature.</b>');
	}
   }});

}

/*
 * Build html to render in AFD tab
 */
function buildFeatureHtml(resultRecs) {

    var html = '';

    /* 
     * outer loop: loop over each record in results
     */
    for(var i=0; i < resultRecs.length; i++) {

	    // get attribute/values for record
	    atts = resultRecs[i]['@graph'][0];

	    var idx = -1;

	    /*
	     * inner loop: loop over each attribute/value in record
	     */

	    // parse the json-ld to get attributes + values
	    for(var attUri in atts) {
		var att = '';
		var value = atts[attUri][0]['@value']; // get literal value
		if(!value) { // get uri vs. literal
		    value = atts[attUri][0]['@id'];
		    // val should be a uri, so strip off namespace
		    if(value) {
			idx = value.lastIndexOf('#');
			if(idx < 0)
			    idx = value.lastIndexOf('/');
			if(idx > 0)
			    value = value.substring(idx+1);
		    }
		}

		// skip over feature ID or geometry coord string
		if(attUri == '@id')
		    continue;
		if(attUri.includes('asWKT'))
		    continue;
		// @type has to be handled sep from other atts
		if(attUri == '@type') {
		    att = 'type';
		    value = atts[attUri][0];
		    // val should be a uri, so strip off namespace
		    idx = value.lastIndexOf('#');
		    if(idx < 0)
			idx = value.lastIndexOf('/');
		    if(idx > 0)
			value = value.substring(idx+1);
		}
		else { 
		    // get attribute name (right of slash or hash in uri)
		    idx = attUri.lastIndexOf('#');
		    if(idx < 0)
			idx = attUri.lastIndexOf('/');
		    att = attUri.substring(idx+1);
		}

		// clean up any null literals if present
		if(value == 'null')
		    value = '';
		// append attribute and value to the html
		html += '<b>' + att + ': &nbsp; </b>' + value + '<br>'; 
	    }
    }
    
    return html;
}

/*
 * Create a new advanced feature description tab.
 * Populate the tab with attributes of the feature (html).
 * The name of the tab is the name of the data source of the feature.
 */
function createTab(name, content) {
 
    // get tabs list and append a new line item for a new tab
    var tabsList = document.getElementById('afd-tabs-list');
    var numTabs = tabsList.children.length;
    var lineItem = document.createElement('li');
    var lineItemAnchor = document.createElement('a');

    /*
     * create attributes for line item
     */

    var role = document.createAttribute('role');
    role.value = 'tab';
    lineItem.setAttributeNode(role);

    var tabIndex = document.createAttribute('tabindex');
    tabIndex.value = '-1';
    lineItem.setAttributeNode(tabIndex);

    var cls = document.createAttribute('class');
    cls.value = 'ui-tabs-tab ui-corner-top ui-state-default ui-tab';
    lineItem.setAttributeNode(cls);

    var ariaControls = document.createAttribute('aria-controls');
    ariaControls.value = 'tabs-' + (numTabs+1);
    lineItem.setAttributeNode(ariaControls);

    var ariaLabelledBy = document.createAttribute('aria-labelledby');
    ariaLabelledBy.value = 'ui-id-' + (numTabs+1);
    lineItem.setAttributeNode(ariaLabelledBy);

    var ariaSelected = document.createAttribute('aria-selected');
    ariaSelected.value = 'false';
    lineItem.setAttributeNode(ariaSelected);

    var ariaExpanded = document.createAttribute('aria-expanded');
    ariaExpanded.value = 'false';
    lineItem.setAttributeNode(ariaExpanded);

    /*
     * create attributes for line item
     */

    lineItemAnchor.href = '#tabs-' + (numTabs+1);

    var anchorRole = document.createAttribute('role');
    anchorRole.value = 'presentation';
    lineItemAnchor.setAttributeNode(anchorRole);

    var anchorTabIndex = document.createAttribute('tabindex');
    anchorTabIndex.value = '-1';
    lineItemAnchor.setAttributeNode(anchorTabIndex);

    var anchorCls = document.createAttribute('class');
    anchorCls.value = 'ui-tabs-anchor';
    lineItemAnchor.setAttributeNode(anchorCls);

    var anchorId = document.createAttribute('id');
    anchorId.value = 'ui-id-' + (numTabs+1);
    lineItemAnchor.setAttributeNode(anchorId);

    // set the name of the tab
    lineItemAnchor.innerHTML = '<b>' + name + '</b>';

    // append elements
    lineItem.appendChild(lineItemAnchor);
    tabsList.appendChild(lineItem);
    
    /*
     * create new div to hold tab's content
     */

    var tabsList = document.getElementById('afd-tabs');
    var newTabDiv = document.createElement('div');    

    // set id and style attributes of div
    newTabDiv.id = 'tabs-' + (numTabs+1);
    newTabDiv.style.height = '100%';
    newTabDiv.style.width = '90%';
    newTabDiv.style.display = 'none';

    // set additional attributes of div
    var divAriaLabelledBy = document.createAttribute('aria-labelledby');
    divAriaLabelledBy.value = 'ui-id-' + (numTabs+1);
    newTabDiv.setAttributeNode(divAriaLabelledBy);    

    divRole = document.createAttribute('role');
    divRole.value = 'tabpanel';
    newTabDiv.setAttributeNode(divRole);    

    var divCls = document.createAttribute('class');
    divCls.value = 'ui-tabs-panel ui-corner-bottom ui-widget-content';
    newTabDiv.setAttributeNode(divCls);    

    var divAriaHidden = document.createAttribute('aria-hidden');
    divAriaHidden.value = 'true';
    newTabDiv.setAttributeNode(divAriaHidden);

    // set div content
    var paragraph = document.createElement('p');
    paragraph.innerHTML = content;
    newTabDiv.appendChild(paragraph);
    tabsList.appendChild(newTabDiv);

    $("#afd-tabs").tabs("refresh");

}

function testAddTab() {

    // get tabs list and append a new line item for a new tab
    var tabsList = document.getElementById('afd-tabs-list');
    var numTabs = tabsList.children.length;
    var lineItem = document.createElement('li');
    var lineItemAnchor = document.createElement('a');

    /*
     * create attributes for line item
     */

    var role = document.createAttribute('role');
    role.value = 'tab';
    lineItem.setAttributeNode(role);

    var tabIndex = document.createAttribute('tabindex');
    tabIndex.value = '-1';
    lineItem.setAttributeNode(tabIndex);

    var cls = document.createAttribute('class');
    //cls.value = 'ui-tabs-tab ui-corner-top ui-state-default ui-tab ui-tabs-active ui-state-active';
    cls.value = 'ui-tabs-tab ui-corner-top ui-state-default ui-tab';
    lineItem.setAttributeNode(cls);

    var ariaControls = document.createAttribute('aria-controls');
    ariaControls.value = 'tabs-' + (numTabs+1);
    lineItem.setAttributeNode(ariaControls);

    var ariaLabelledBy = document.createAttribute('aria-labelledby');
    ariaLabelledBy.value = 'ui-id-' + (numTabs+1);
    lineItem.setAttributeNode(ariaLabelledBy);

    var ariaSelected = document.createAttribute('aria-selected');
    ariaSelected.value = 'false';
    lineItem.setAttributeNode(ariaSelected);

    var ariaExpanded = document.createAttribute('aria-expanded');
    ariaExpanded.value = 'false';
    lineItem.setAttributeNode(ariaExpanded);

    /*
     * create attributes for line item
     */

    lineItemAnchor.href = '#tabs-' + (numTabs+1);

    var anchorRole = document.createAttribute('role');
    anchorRole.value = 'presentation';
    lineItemAnchor.setAttributeNode(anchorRole);

    var anchorTabIndex = document.createAttribute('tabindex');
    anchorTabIndex.value = '-1';
    lineItemAnchor.setAttributeNode(anchorTabIndex);

    var anchorCls = document.createAttribute('class');
    anchorCls.value = 'ui-tabs-anchor';
    lineItemAnchor.setAttributeNode(anchorCls);

    var anchorId = document.createAttribute('id');
    anchorId.value = 'ui-id-' + (numTabs+1);
    lineItemAnchor.setAttributeNode(anchorId);

    // set the name of the tab
    lineItemAnchor.innerHTML = 'Tab ' + (numTabs+1);

    // append elements
    lineItem.appendChild(lineItemAnchor);
    tabsList.appendChild(lineItem);
    
    /*
     * create new div to hold tab's content
     */

    var tabsList = document.getElementById('afd-tabs');
    var newTabDiv = document.createElement('div');    

    // set id and style attributes of div
    newTabDiv.id = 'tabs-' + (numTabs+1);
    newTabDiv.style.height = '100%';
    newTabDiv.style.width = '90%';
    newTabDiv.style.display = 'none';

    // set additional attributes of div
    var divAriaLabelledBy = document.createAttribute('aria-labelledby');
    divAriaLabelledBy.value = 'ui-id-' + (numTabs+1);
    newTabDiv.setAttributeNode(divAriaLabelledBy);    

    divRole = document.createAttribute('role');
    divRole.value = 'tabpanel';
    newTabDiv.setAttributeNode(divRole);    

    var divCls = document.createAttribute('class');
    divCls.value = 'ui-tabs-panel ui-corner-bottom ui-widget-content';
    newTabDiv.setAttributeNode(divCls);    

    var divAriaHidden = document.createAttribute('aria-hidden');
    divAriaHidden.value = 'true';
    newTabDiv.setAttributeNode(divAriaHidden);

    // set div content
    var paragraph = document.createElement('p');
    paragraph.innerHTML = 'This is content for tab #' + (numTabs+1);
    newTabDiv.appendChild(paragraph);
    tabsList.appendChild(newTabDiv);

    $("#afd-tabs").tabs("refresh");

}












