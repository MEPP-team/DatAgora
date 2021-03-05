#Liste des imports
import matplotlib.pyplot as plt
import numpy as np
from pandas.io.json import json_normalize
import pandas as pd
import json
import time
import os
from IPython.display import display
from shapely.geometry import Polygon
import shapely.wkt
pd.options.display.max_columns = None

def id_card (document,df):
    file_name,file_extension=os.path.splitext(document)
    date_modification=time.ctime(os.path.getmtime(document))
    date_creation=time.ctime(os.path.getctime(document))
    taille=df.shape
    type=df.info()
    description=df.describe(include="all")
    return("Le nom du fichier est: ",file_name \n, "L'extension du fichier est: ", file_extension \n, "La date de création du fichier est: ", date_creation \n, "La date de dernière modification du fichier est: ", date_modification \n , "Le format de votre base de données est: ", taille \n , "Les informations concernant votre base de données: ", type \n, "Plus de détails concernant votre base de données: ", description)