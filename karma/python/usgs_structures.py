# Python functions for modeling USGS Structures dataset

import json
import os

def get_hash_uri(identifier):
    return getTextHash(identifier)

def clean_name(name):
    return name.strip().replace('.','')

# get value of admin type from ADMINTYPE field
def get_admin_type(admin_type):
    type_num = int(admin_type)
    if type_num == 0:
        return 'Unknown'
    elif type_num == 1:
	return 'Federal'
    elif type_num == 2:
	return 'Tribal'
    elif type_num == 3:
	return 'State'
    elif type_num == 4:
	return 'Regional'
    elif type_num == 5:
	return 'County'
    elif type_num == 6:
	return 'Municipal'
    elif type_num == 7:
	return 'Private'
    else:
	return 'INVALID CODE'

# get name of feature type from FTYPE field
def get_ftype(ftype):
    
    if ftype.startswith('700'):
	return 'Agriculture, Food, and Livestock'
    elif ftype.startswith('710'):
	return 'Industry'
    elif ftype.startswith('720'):
	return 'Commercial and Retail'
    elif ftype.startswith('730'):
	return 'Education'
    elif ftype.startswith('740'):
	return 'Emergency Response and Law Enforcement'
    elif ftype.startswith('750'):
	return 'Energy'
    elif ftype.startswith('760'):
	return 'Banking and Finance'
    elif ftype.startswith('780'):
	return 'Mail and Shipping'
    elif ftype.startswith('790'):
	return 'Building General'
    elif ftype.startswith('800'):
	return 'Health and Medical'
    elif ftype.startswith('810'):
	return 'Transportation Facility'
    elif ftype.startswith('820'):
	return 'Public Attractions and Landmark Structures'
    elif ftype.startswith('830'):
	return 'Government and Military'
    elif ftype.startswith('840'):
	return 'Weather'
    elif ftype.startswith('850'):
	return 'Water Supply and Treatment'
    elif ftype.startswith('880'):
	return 'Information and Communication'
    else:
	return 'UNK'

# get name of feature code from FCODE field
def get_fcode(f_code):

    file_path = os.getenv('HOME') + '/karma/python'
    with open(os.path.join(file_path, 'structures_fcodes.json')) as f:
        data = json.loads(f.read())
    
    # find desired fcode and return its name
    for fcode in data:
        if int(f_code) == fcode['code']:
    	    return fcode['name']
    # unknown fcode if here...
    return 'UNK'

# get URI of USGS feature class based on feature code
def get_feature_class(f_type):

    ftype = int(f_type)
    if ftype in (73002, 73007, 73006):
	return 'http://data.usgs.gov/lod/gnis/ontology/School'
    elif ftype == 80012:
	return 'http://data.usgs.gov/lod/gnis/ontology/Hospital'
    elif ftype == 82010:
	return 'http://data.usgs.gov/lod/gnis/ontology/Cemetery'
    elif ftype == 78006:
	return 'http://data.usgs.gov/lod/gnis/ontology/PostOffice'
    elif ftype == 82008:
	return 'http://data.usgs.gov/lod/gnis/ontology/Park'
    elif ftype == 82047:
	return 'http://data.usgs.gov/lod/gnis/ontology/Trail'




























