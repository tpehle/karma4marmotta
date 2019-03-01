/*
 * Endpoint class for the Karma WFS Provider.
 */

package gov.usgs.marmotta.ldclient.endpoint;

import org.apache.marmotta.commons.http.ContentType;
import org.apache.marmotta.ldclient.api.endpoint.Endpoint;
import gov.usgs.marmotta.ldclient.provider.karmawfs.KarmaWfsProvider;

/**
 * An endpoint that registers the KarmaWfsProvider for all OGC-compliant WFS URLs.
 */
public class KarmaWfsEndpoint extends Endpoint {

    public KarmaWfsEndpoint() {

        super("Karma WFS Provider", KarmaWfsProvider.PROVIDER_NAME, "^http(s?)://([^.]+)/geoserver/.*", null, 86400L);
        setPriority(PRIORITY_HIGH);
        addContentType(new ContentType("text", "turtle"));

    }
}
