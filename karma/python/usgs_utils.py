# Python functions for modeling USGS related data sources

def get_hash_uri(identifier):
    return getTextHash(identifier)

def clean_name(name):
    return name.strip().replace('.','')

def get_lat(gmlpos):
    return gmlpos.split()[0]

def get_lon(gmlpos):
    return gmlpos.split()[1]

def get_wkt_pt(gmlpos):
    y = gmlpos.split()[0]
    x = gmlpos.split()[1]
    wkt = '<http://www.opengis.net/def/crs/OGC/1.3/CRS84> POINT(' + ' '.join([x,y]) + ')'
    return wkt

# truncate wgs84 latitude or longitude value to 3 places after decimal
def get_coord3(coord):
    decpos = coord.find('.')
    return coord[:decpos+4]




