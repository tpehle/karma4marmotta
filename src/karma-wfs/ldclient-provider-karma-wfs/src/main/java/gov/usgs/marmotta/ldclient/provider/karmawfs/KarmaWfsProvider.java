package gov.usgs.marmotta.ldclient.provider.karmawfs;

import org.apache.http.Header;
import org.apache.http.HttpEntity;
import org.apache.http.HttpResponse;
import org.apache.http.client.ClientProtocolException;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.client.utils.DateUtils;
import org.apache.http.util.EntityUtils;
import org.apache.http.entity.StringEntity;

//import org.apache.commons.io.IOUtils;

import org.apache.marmotta.commons.http.UriUtil;
import org.apache.marmotta.ldclient.api.endpoint.Endpoint;
import org.apache.marmotta.ldclient.api.ldclient.LDClientService;
import org.apache.marmotta.ldclient.api.provider.DataProvider;
import org.apache.marmotta.ldclient.exception.DataRetrievalException;
import org.apache.marmotta.ldclient.model.ClientResponse;

import org.openrdf.rio.*;
import org.openrdf.model.Model;
import org.openrdf.model.impl.TreeModel;
import org.openrdf.repository.RepositoryException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.io.FileNotFoundException;
import java.io.InputStream;
import java.io.FileInputStream;
import java.util.*;
import java.util.Properties;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import static com.google.common.net.HttpHeaders.ACCEPT;
import static com.google.common.net.HttpHeaders.ACCEPT_LANGUAGE;

/**
 * A Marmotta Provider that accesses a Karma RDF service that translates ANY OGC-compliant WFS data to RDF.
 * It is, in essence, a GML-to-RDF translation service. 
 *
 * Basic Steps:
 *
 * 1. The Provider calls a Karma RDF service via HTTP POST request containing:
 * 
 *      The URI of the WFS feature to be transformed.
 *      This can be done by performing a WFS 'GetFeature' operation that requests a feature by its ID:
 *          ex: featureID=geonames_feature.1
 *
 * 2. Karma dereferences the feature's URI via the OGC WFS service.
 *    The WFS returns GML data and is then mapped by Karma to RDF according to a specified R2RML file.
 * 
 *      The URI of the R2RML mapping file that Karma applies to  
 *      the dereferenced data is found in a lookup file.
 *
 * 3. The Marmotta WFS Provider returns the "mapped" RDF to Marmotta as an OpenRDF Repository.
 *
 */
public class KarmaWfsProvider implements DataProvider {

    public static final String PROVIDER_NAME = "Karma RDF Service";
    public static final int RETRY_AFTER = 60;
    private static final String MIME_NT = "application/n-triples";

    private static Logger log = LoggerFactory.getLogger(KarmaWfsProvider.class);

    // get MARMOTTA_HOME path from env var
    private static final String MARMOTTA_HOME = System.getenv("MARMOTTA_HOME") +
						System.getProperty("file.separator");

    // load KarmaWFS config Java Properties file
    private static String SPLIT_TOKEN = "/";
    private static String BASE_URI;
    private static String KARMA_URL;
    private static Properties karmaWfsProps;
    static {
	try {
	    // load karma wfs config props file
	    karmaWfsProps = new Properties();
            karmaWfsProps.load(new FileInputStream(MARMOTTA_HOME+"config/karma_wfs_config.properties"));

	    // set karma wfs config params
	    BASE_URI = karmaWfsProps.getProperty("base.uri");
	    KARMA_URL = karmaWfsProps.getProperty("karma.url");

	} catch(FileNotFoundException e) {
	    log.error("ERROR: karma_wfs_config.properties file not found!");
	} catch(IOException e) {
	    log.error("IO error loading karma_wfs_config.properties file!");
  	}
    }

    // load R2RML URLs Java Properties file
    private static Properties r2rmlProps;
    static {
	try {
	    System.out.println("marmotta home = " + MARMOTTA_HOME);
	    r2rmlProps = new Properties();
            r2rmlProps.load(new FileInputStream(MARMOTTA_HOME+"config/karma_wfs_mappings.properties"));
	} catch(FileNotFoundException e) {
	    log.error("ERROR: mappings.properties file not found!");
	} catch(IOException e) {
	    log.error("IO error loading mappings.properties file!");
  	}
    }

    // load WFS Base URIs Java Properties file
    private static Properties wfsUrisProps;
    static {
	try {
	    wfsUrisProps = new Properties();
            wfsUrisProps.load(new FileInputStream(MARMOTTA_HOME+"config/karma_wfs_uris.properties"));
	} catch(FileNotFoundException e) {
	    log.error("ERROR: wfs_base_uris.properties file not found!");
	} catch(IOException e) {
	    log.error("IO error loading wfs_base_uris.properties file!");
  	}
    }

 

    /**
     * Parse the HTTP response entity returned by the web service call and return its contents in a Sesame RDF
     * repository also passed as argument. The content type returned by the web service is passed as argument to help
     * the implementation decide how to parse the data. The implementation can return a list of additional pages to
     * retrieve for completing the data of the resource
     *
     * @param resourceUri
     * @param model       an RDF model for storing an RDF representation of the dataset located at the remote resource.
     * @param in          input stream as returned by the remote webservice
     * @param language    content language as returned in the HTTP headers of the remote webservice
     * @return a possibly empty list of URLs of additional resources to retrieve to complete the content
     * @throws java.io.IOException in case an error occurs while reading the input stream
     */
    //protected List<String> parseResponse(String resourceUri, String requestUrl, Model model, InputStream in, String language) 
    protected Model parseResponse(String resourceUri, String requestUrl, Model model, InputStream in, String language) 
	throws DataRetrievalException {

	System.out.println("=====================================================================");
	//System.out.println(convertStreamToString(in));
	//System.out.println("=====================================================================");

        try {
	    //RDFParser rdfParser = Rio.createParser(RDFFormat.NTRIPLES);
	    //model = Rio.parse(InputStream in, String baseURI, RDFFormat.NTRIPLES);
	    model = Rio.parse(in, "", RDFFormat.NTRIPLES);
	    
        } catch (IOException e) {
            throw new DataRetrievalException("IO error while accessing Karma RDF service",e);
        } catch (RDFParseException e) {
	    throw new DataRetrievalException("RDF parse error while parsing RDF from Karma RDF service",e);
	} catch (UnsupportedRDFormatException e) {
	    throw new DataRetrievalException("Unsupported RDF format error while parsing RDF from Karma RDF service",e);
   	}

        //return Collections.emptyList();
	System.out.println("# of triples in parsed karma response: " + model.size());
	return model;
    }

    // TEST method to print RDF returned from karma; used in parseResponse() above
    private String convertStreamToString(java.io.InputStream is) {
    	java.util.Scanner s = new java.util.Scanner(is,"UTF-8").useDelimiter("\\A");
    	return s.hasNext() ? s.next() : "";
    }


    /**
     * Return the name of this data provider. To be used e.g. in the configuration and in log messages.
     *
     * @return
     */
    @Override
    public String getName() {
        return PROVIDER_NAME;
    }

    /**
     * Return the list of mime types accepted by this data provider.
     *
     * @return
     */
    @Override
    public String[] listMimeTypes() {
        return new String[] { MIME_NT };
    }

    /**
     * Retrieve the data for an OGC WFS resource mapped via Karma using the given http client and endpoint definition.
     *
     * @param resourceUri the resource to be retrieved
     * @param endpoint the endpoint definition
     * @return a completely specified client response, including expiry information and the set of triples
     */
    @Override
    public ClientResponse retrieveResource(String resourceUri, LDClientService client, Endpoint endpoint) 
	throws DataRetrievalException {

	System.out.println("MADE IT INTO retrieveResponse!!!");	

        try {

            long defaultExpires = client.getClientConfiguration().getDefaultExpiry();
            if(endpoint != null && endpoint.getDefaultExpiry() != null) {
                defaultExpires = endpoint.getDefaultExpiry();
            }

            final ResponseHandler handler = new ResponseHandler(resourceUri, endpoint);

            log.info("retrieving RDF from Karma for WFS resource: {}",resourceUri);
	    System.out.println("retrieving RDF from Karma for WFS resource: " + resourceUri);

	    // lookup required R2RML file for karma to process
    	    List<String> lookupInfo = lookupR2RML(resourceUri);   
	    if (lookupInfo.size() < 3)
		throw new FileNotFoundException();
	    String r2rmlUri = lookupInfo.get(2);
	    System.out.println("r2rml URI = " + r2rmlUri);

	    // build WFS URI for Karma to dereference
	    String dataUrl = buildWfsUri(resourceUri, lookupInfo);
	    System.out.println("dataUrl = " + dataUrl);
	
	    // set the karma URL; prepare body for http post
            String requestUri = KARMA_URL;
	    String r2rmlUrlEncoded = URLEncoder.encode(r2rmlUri);
	    String contentTypeParam = "&ContentType=XML";
	    String dataUrlEncoded = URLEncoder.encode(dataUrl);
	    String bodyText = "R2rmlURI="+r2rmlUrlEncoded+contentTypeParam+"&DataURL="+dataUrlEncoded;

	    StringEntity entity = new StringEntity(bodyText);

	    System.out.println("ABOUT TO EXECUTE POST!!!");

	    // execute HTTP POST to Karma to map WFS data and return as RDF
	    HttpPost post = new HttpPost(requestUri);
	    try {
		post.setEntity(entity);
		post.setHeader("Accept", MIME_NT);
		post.setHeader("Content-type", "application/x-www-form-urlencoded");
	  	System.out.println("retrieving resource data from endpoint...");
		log.info("retrieving resource data for {} from '{}' endpoint, request URI is <{}>", 
		    new Object[]  {resourceUri, getName(), post.getURI().toASCIIString()});
		handler.requestUrl = requestUri;
		client.getClient().execute(post, handler);
	    } finally {
	      	post.releaseConnection();
	    }

	    System.out.println("MADE IT PAST POST!!!");

            Date expiresDate = handler.expiresDate;
            if (expiresDate == null) {
                expiresDate = new Date(System.currentTimeMillis() + defaultExpires * 1000);
            }

            long min_expires = System.currentTimeMillis() + client.getClientConfiguration().getMinimumExpiry() * 1000;
            if (expiresDate.getTime() < min_expires) {
                log.info("expiry time returned by request lower than minimum expiration time; using minimum time instead");
                expiresDate = new Date(min_expires);
            }

            if(log.isInfoEnabled()) {
                log.info("retrieved {} triples for resource {}; expiry date: {}", 
			new Object[]{handler.triples.size(), resourceUri, expiresDate});
            }

	    System.out.println("CREATING CLIENT RESPONSE!!!");
	    System.out.println("retrieved # of triples: " + handler.triples.size());
	    System.out.println("retrieved resource URI: " + resourceUri);
	    System.out.println("expiresData: " + expiresDate);


            ClientResponse result = new ClientResponse(200, handler.triples);
            result.setExpires(expiresDate);

            return result;
        } catch (RepositoryException e) {
            log.error("error while initialising Sesame repository; classpath problem?",e);
            throw new DataRetrievalException("error while initialising Sesame repository; classpath problem?",e);
        } catch (ClientProtocolException e) {
            log.error("HTTP client error while trying to retrieve resource {}: {}", resourceUri, e.getMessage());
            throw new DataRetrievalException("I/O error while trying to retrieve resource "+resourceUri,e);
        } catch(FileNotFoundException e) {
	    log.error("Unable to find R2RML file for resource: " + resourceUri);
            throw new DataRetrievalException("Unable to find R2RML file for resource: " + resourceUri,e);
	} catch (IOException e) {
            log.error("I/O error while trying to retrieve resource {}: {}", resourceUri, e.getMessage());
            throw new DataRetrievalException("I/O error while trying to retrieve resource "+resourceUri,e);
        } catch(RuntimeException e) {
            log.error("Unknown error while trying to retrieve resource {}: {}", resourceUri, e.getMessage());
            throw new DataRetrievalException("Unknown error while trying to retrieve resource "+resourceUri,e);
        } 
    }

    /**
     * Based on feature type in resource URI find its R2RML URL.
     * Return feature type and R2RML URL.
     */ 
    private List<String> lookupR2RML(String resourceUri) {

	    List<String> output = new Vector<String>();

    	    System.out.println("MADE IT INTO lookupR2RML!!!");

	    // parse feature type from uri to determine which R2RML map to load
	    String stripBase = resourceUri.replace(BASE_URI,"");
	    String ftype = stripBase.split(SPLIT_TOKEN)[0];
	    output.add(ftype);
	    String fid = stripBase.substring(stripBase.lastIndexOf("/")+1);
	    output.add(fid);
	    
	    System.out.println("FTYPE = " + ftype);
	    System.out.println("FID = " + fid);

	    // find feature type in lookup file and return its R2RML URL
	    for(String key : r2rmlProps.stringPropertyNames()) {
		if(ftype.startsWith(key)) {
		    System.out.println("FOUND KEY = " + key);
		    output.add(r2rmlProps.getProperty(key)); 
		    return output;
		}
	    }

	    // if here, didn't find R2RML file
	    return output;

    }

    /**
     * Based on feature type build WFS URI of feature.
     */
    private String buildWfsUri(String resourceUri, List<String> lookupInfo) {

    	    System.out.println("MADE IT INTO buildWfsUri!!!");

	    // find wfs base URI in lookup file based on feature type
	    String ftype = lookupInfo.get(0);
	    String wfsUri = "";
	    for(String key : wfsUrisProps.stringPropertyNames()) {
		if(ftype.equals(key)) {
		    System.out.println("FOUND karmaWfs KEY = " + key);
		    wfsUri = wfsUrisProps.getProperty(key); 
		}
	    }

	    if("".equals(wfsUri))
		return null; // if here, didn't find WFS URL

	    // append the fid to wfs url and return
	    return wfsUri + lookupInfo.get(1);

    }

    protected class ResponseHandler implements org.apache.http.client.ResponseHandler<List<String>> {

        private Date             expiresDate;

        private String                requestUrl;

        // the repository where the triples will be stored in case the data providers return them
        private Model triples;

        private final Endpoint   endpoint;

        private final String resource;

        private int httpStatus;

        // language tag to use for literals
        public String language;

        public ResponseHandler(String resource, Endpoint endpoint) throws RepositoryException {
            this.resource = resource;
            this.endpoint = endpoint;

            triples = new TreeModel();
        }

        @Override
        public List<String> handleResponse(HttpResponse response) throws IOException {

	    System.out.println("MADE IT INTO handleResponse!!!");

            ArrayList<String> requestUrls = new ArrayList<String>();

            if (response.getStatusLine().getStatusCode() >= 200 && response.getStatusLine().getStatusCode() < 400) {
                final HttpEntity entity = response.getEntity();
                if (entity == null)
                    throw new IOException("no content returned by Linked Data resource " + resource);

                this.httpStatus = response.getStatusLine().getStatusCode();

                if (entity != null) {
                    InputStream in = entity.getContent();
                    try {

                        triples = parseResponse(resource, requestUrl, triples, in, language);
			List<String> urls = Collections.emptyList();
                        requestUrls.addAll(urls);

			System.out.println("# of triples after parseResponse(): " + triples.size());

                        if (expiresDate == null) {
                            Header expires = response.getFirstHeader("Expires");
                            if (expires != null) {
                                expiresDate = DateUtils.parseDate(expires.getValue());
                            }
                        }

                    } catch (DataRetrievalException e) {
                        // FIXME: get.abort();
                        throw new IOException(e);
                    } finally {
                        in.close();
                    }
                }
                EntityUtils.consume(entity);
            } else if(response.getStatusLine().getStatusCode() == 500 || response.getStatusLine().getStatusCode() == 503  || response.getStatusLine().getStatusCode() == 504) {
                this.httpStatus = response.getStatusLine().getStatusCode();

                Header retry = response.getFirstHeader("Retry-After");
                if(retry != null) {
                    try {
                        int duration = Integer.parseInt(retry.getValue());
                        expiresDate = new Date(System.currentTimeMillis() + duration*1000);
                    } catch(NumberFormatException ex) {
                        log.debug("error parsing Retry-After: header");
                    }
                } else {
                    expiresDate = new Date(System.currentTimeMillis() + RETRY_AFTER *1000);
                }

            } else {
                log.error("the HTTP request failed (status: {})", response.getStatusLine());
                throw new ClientProtocolException("the HTTP request failed (status: " + response.getStatusLine() + ")");
            }

            return requestUrls;
        }

        public Endpoint getEndpoint() {
            return endpoint;
        }

        public int getHttpStatus() {
            return httpStatus;
        }

    }

}
