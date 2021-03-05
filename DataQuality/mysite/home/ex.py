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

#Lecture du fichier et génération du Dataframe
data=pd.read_json("C:\\Users\\CDL\\Downloads\\abr_arbres_alignementabrarbre.json")
df=pd.DataFrame(data)

#Affichage du Dataframe complète
for key in data.keys():
    try:
        A=pd.json_normalize(df[key])
        df=pd.concat([df,A],axis=1)
        del df[key]
    except:
        pass

#Calcul des cellules vides par colonne
for key in df.keys():
    count=0
    count=df[key].isna().sum()
    print("le nombre de cellules vides pour l'attribut "+str(key)+" est: "+str(count))

    #Vérification des géométries et des coordonnées

#Trouver les colonnes (s'adapte selon les données)
coordonnees=""
type=""
code=""
for c in list(df):
    if "geometry.coordinates" in c:
        coordonnees=c
    if "geometry.type" in c:
        type=c
    if "codeinsee" in c:
        code=c

#Vérification qu'il n'y a pas de multipolygones
mp=0
for pol in df[type]:
    if pol=="MultiPolygon": mp+=1
print("Le nombre de multipolygon est: ", mp)
print(df)

    #Vérification si un point/polygone est à l'intérieur d'un polygone (quartier)
#Lecture du fichier et génération du Dataframe
data_co=pd.read_json("C:\\Users\\CDL\\OneDrive\\Bureau\\lyon\\adr_voie_lieu.adrcommune.json")
df_co=pd.DataFrame(data_co)

#Affichage du Dataframe complète
for key in data.keys():
    try:
        A=pd.json_normalize(df_co[key])
        df_co=pd.concat([df_co,A],axis=1)
        del df_co[key]
    except:
        pass

    #Vérification des géométries et des coordonnées
#Trouver les colonnes (s'adapte selon les données)
coordonnees_co=""
type_co=""
code_co=""
for c in list(df_co):
    if "geometry.coordinates" in c:
        coordonnees_co=c
    if "geometry.type" in c:
        type_co=c
    if "insee" in c:
        code_co=c

#Mise en forme des coordonnées
a=df[type].astype(str)+" ("+df[coordonnees].astype(str)+")"
a.drop(columns=["Name"])
b=df_co[type_co].astype(str)+" ("+df_co[coordonnees_co].astype(str)+")"
b.drop(columns=["Name"])
com=df[code].astype(str)
com_co=df_co[code_co].astype(str)

for i in range (len(a)):
    z=str(a[i])
    z=z.replace("[","")
    z=z.replace("]","")
    z=z.replace(",","")
    z=shapely.wkt.loads(z)
    for j in range (len(b)):
        y=str(b[j])
        y=y.replace("[","")
        y=y.replace("]","")
        y=y.replace(",","")
        d=y.split(" ")
        #nom de la commune
        m=str(com[i])
        n=str(com_co[j])
        w=""
        for nbre in range (0,len(d)):
            if nbre%2==0 and nbre!=0 and nbre!=len(d)-1:
                w+=d[nbre]+","
            elif nbre==0:
                w=w+d[nbre]+" ("
            elif nbre==len(d)-1:
                w=w+d[nbre]+")"
            else:
                w=w+d[nbre]+" "
        w=shapely.wkt.loads(w)
        if w.contains(z):
            if m!=n and n!="69123":
                print("la donnée ", i, " est dans la commune ", m, " au lieu de ", n)
                break
            elif m==n:
                print(i, "est dans le quartier", j)
                break