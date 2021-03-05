#Liste des imports
import matplotlib.pyplot as plt
import numpy as np
from pandas.io.json import json_normalize
import pandas as pd
import json
from IPython.display import display
from shapely.geometry import Polygon
import shapely.wkt
pd.options.display.max_columns = None
import requests

def coordonnees_lyon(df1):
    response=requests.get("https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=adr_voie_lieu.adrcommune&SRSNAME=EPSG:4171&outputFormat=application/json; subtype=geojson&count=100&startIndex=0")
    df2=response.json()
    # On prend les paramètres nécessaires pour le jeu de données:
    k = colonnes_coordonnees(df1)
    coordonnees = k[0]
    type = k[1]
    code = k[2]
    # On prend les paramètres nécessaires pour les coordonnées:
    l = colonnes_coordonnees(df2)
    coordonnees_co = l[0]
    type_co = l[1]
    code_co = l[2]
    # Mise en forme des colonnes:
    a = df1[type].astype(str) + " (" + df1[coordonnees].astype(str) + ")"
    a.drop(columns=["Name"])
    b = df2[type_co].astype(str) + " (" + df2[coordonnees_co].astype(str) + ")"
    b.drop(columns=["Name"])
    com = df1[code].astype(str)
    com_co = df2[code_co].astype(str)
    # le dataframe a contient les coordonnées du document initial en format exploitable
    # le dataframe com: contient les codes insee repérés dans le document initial en format exploitable
    # Il en est de même pour le document contenant les coordonnées des communes dans les df (b et com_co)
    df_co = pd.concat([a, com], axis=1)
    df_com = pd.concat([b, com_co], axis=1)
    df_all = pd.merge(df_co, df_com, left_on=code, right_on=code_co, how='left').drop(code, axis=1)
    # Nous faisons une fusion entre deux dataframes: df_co contenant les coordonnées et les codes insee déclarés comme étant juste
    # Et le dataframe comportant les codes insee des communes avec leurs coordonnées
    # Cette fusion se fait sur la base du code insee commun: ainsi pour chaque code insee nous verrons ses coordonnées, ainsi que les coordonnées des points qui lui sont attribués dans le document initial (jeu de données)

    # NB: Pour quelques documents et fichiers: les coordonnées récupérées sont difficilement utilisables pour python, on remédie à ça alors:
    compteur = 0
    tab_fin = []
    for i in range(len(df_all)):
        z = str(df_all['0_x'][i])
        z = z.replace("[", "")
        z = z.replace("]", "")
        z = z.replace(",", "")
        z = shapely.wkt.loads(z)  # Premier Polygone

        y = str(df_all['0_y'][i])
        y = y.replace("[", "")
        y = y.replace("]", "")
        y = y.replace(",", "")
        d = y.split(" ")
        w = ""
        for nbre in range(0, len(d)):
            if nbre % 2 == 0 and nbre != 0 and nbre != len(d) - 1:
                w += d[nbre] + ","
            elif nbre == 0:
                w = w + d[nbre] + " ("
            elif nbre == len(d) - 1:
                w = w + d[nbre] + ")"
            else:
                w = w + d[nbre] + " "
        w = shapely.wkt.loads(w)
        if w.contains(z) == False:
            compteur += 1
            tab_fin.append("Il y a une erreur au niveau de la donnée :" + str(i))
    return "Le nombre estimé des codes insee ou de coordonnées faux est: " + str(compteur), tab_fin
