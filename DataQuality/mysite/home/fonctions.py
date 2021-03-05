import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import time
import os
import tkinter as tk
from tkinter.filedialog import askopenfilename
from shapely.geometry import Polygon
import shapely.wkt
import requests


def aff(df, data):
    for key in data.keys():
        try:
            normalized_json = pd.json_normalize(df[key])
            df = pd.concat([df, normalized_json], axis=1)
            del df[key]
        except:
            pass
    return df


def empty_cells(df):
    empty = np.where(pd.isnull(df))  # Tuple of lines and columns corresponding to Nan values
    empty_rows = empty[0]
    empty_cols = empty[1]

    tab_empty_cells = []
    for i in range(len(empty_cols)):
        tab_empty_cells.append([empty_rows[i], empty_cols[i]])

    x = [df.shape[0] * df.shape[1] - len(tab_empty_cells), len(tab_empty_cells)]

    def make_auto_pct(values):  # Prints percentage and associated value
        def my_auto_pct(pct):
            total = sum(values)
            val = int(round(pct * total / 100.0))
            return '{p:.2f}%  ({v:d})'.format(p=pct, v=val)

        return my_auto_pct

    plt.close()
    plt.pie(x, labels=["Cellules non vides", "Cellules vides"], autopct=make_auto_pct(x), explode=(0, 0.05))
    plt.title("Part de cellules vides sur les " + str(df.shape[0] * df.shape[1]) + " cellules")
    fig = plt.gcf()
    return fig, tab_empty_cells


def replace_df(df, col, key, val):  # Replaces value in a data frame
    m = [v == key for v in df[col]]
    df.loc[m, col] = val


def duplicate_rows(df):
    copy_original = df.copy()  # Copy of the data frame to modify the type list into a str to compare correctly
    for i in copy_original:
        for j in copy_original[i]:
            if type(j) == list:
                replace_df(copy_original, i, j, str(j))
    duplicate_rows_df = copy_original[copy_original.duplicated(keep=False)]  # Search for duplicates
    copy_df = duplicate_rows_df.copy()  # Creation of a copy to manipulate the data frame
    first_occurrences = []  # List of the first occurrences
    index_first_occurrences = []  # Index of the first occurrences
    dict_occurrences = {}  # first_occurrences matching the occurrences
    for i in range(len(duplicate_rows_df)):
        if duplicate_rows_df.iloc[i].to_string(index=False) not in first_occurrences:
            first_occurrences.append(duplicate_rows_df.iloc[i].to_string(index=False))
            print(duplicate_rows_df.index[i])
            index_first_occurrences.append(duplicate_rows_df.index[i])

    copy_df.drop(index_first_occurrences, inplace=True)  # Deleting first occurrences index

    for i in index_first_occurrences:  # Initializing the dictionary
        try:
            dict_occurrences.has_key[i]
        except:
            dict_occurrences[i] = []

    for i in range(len(copy_df)):  # Filling the dictionary
        for j in range(len(first_occurrences)):
            if copy_df.iloc[i].to_string(index=False) == first_occurrences[j]:
                dict_occurrences[index_first_occurrences[j]].append(copy_df.index[i])

    return dict_occurrences


def spe_char(df):
    char_list = 'àáâãäåæçèéêëìíîïðñòóôõöøœšÞùúûüýÿ'
    list_coord = []
    for i in range(len(df)):
        for j in range(len(df.iloc[i])):
            test = str(df.iloc[i][j])
            for char in test:
                if char.lower() in char_list:
                    list_coord.append([i, j])
    return list_coord


def id_card(document, df):
    file_name, file_extension = os.path.splitext(document)
    date_modification = time.ctime(os.path.getmtime(document))
    date_creation = time.ctime(os.path.getctime(document))
    size = df.shape
    type_file = df.info()
    description = df.describe(include="all")
    return date_creation, date_modification, size, type_file, description, file_name, file_extension


def info_df_col(df, tab):
    res = []
    for i in tab:
        max_val = df[i].max()
        min_val = df[i].min()
        moy = round(df[i].mean())
        res.append('La colonne ' + i + ' à pour max ' + str(max_val) + ', pour min ' + str(min_val) + 'et pour '
                                                                                                      'moyenne ' +
                   str(moy))
    return res


def info_value(df, col, min_val, max_val):
    tab_out_of_range = []
    for i in range(len(df[col])):
        if (df[col].iloc[i] < min_val) or (df[col].iloc[i] > max_val):
            tab_out_of_range.append(i)
    return tab_out_of_range


def versioning(df1, df2):
    try:
        df_diff = df1.compare(df2)
        return df_diff
    except:
        df_diff = pd.concat([df1, df2]).drop_duplicates(keep=False)
        return df_diff


def open_window():
    list_ext_excel = [".xls", ".xlt", ".xlsx", ".xlsm", ".xltx", ".xltm", ".xla", ".xlma"]
    # Selecting a file
    root = tk.Tk()
    root.withdraw()  # Used to remove the Tk window
    ''
    path = askopenfilename()  # Opens the window and get the file's path
    extension = os.path.splitext(path)  # We get the files extension to know how to parse it
    if extension[1] in list_ext_excel:
        df = pd.read_excel(path, engine='openpyxl')
        type_file = 'ex'
    if extension[1] == ".json":
        data_json = pd.read_json(path)
        df_json_file = pd.DataFrame(data_json)
        df = aff(df_json_file, data_json)
        type_file = 'json'
    return path, df, type_file


# Pour les coordonnées:
def colonnes_coordonnees(df):
    coordonnees = ""
    type = ""
    code = ""
    for c in list(df):
        if "geometry.coordinates" in c:
            coordonnees = c
        if "geometry.type" in c:
            type = c
        if "insee" in c:
            code = c
    return coordonnees, type, code


# Vérification des coordonnées:
def verification(df1, df2):  # df1 contient la base de données et df2 contient les coordonnees et les codes insee
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


def df_json(df):
    df = df.fillna(np.nan).replace([np.nan], [None])
    result = []
    for id, row in df.iterrows():
        parsed_row = {}
        for col_label, v in row.items():
            keys = col_label.split(".")
            current = parsed_row
            for i, k in enumerate(keys):
                if i == len(keys) - 1:
                    try:
                        current[k] = v
                    except:
                        pass
                else:
                    if k not in current.keys():
                        print(k)
                        current[k] = {}
                    current = current[k]
        result.append(parsed_row)
    k = []
    for i in result:
        z = cleanNullTerms(i)
        k.append(z)
    return k


# Supprimer les valeurs None
def cleanNullTerms(d):
    clean = {}
    for k, v in d.items():
        if isinstance(v, dict):
            nested = cleanNullTerms(v)
            if len(nested.keys()) > 0:
                clean[k] = nested
        elif v is not None:
            clean[k] = v
    return clean


def versioning_df(df1,df2,key=""):
    df1=df1.fillna('-')
    df2=df2.fillna('-')
    if key!="":
        df3  = pd.merge(df1, df2, on=key, how='outer', suffixes=("_doc1","_doc_2") ,indicator='Exist')
        df3  = df3.loc[df3['Exist'] != 'both']
        if df3.empty and df1.shape==df2.shape:
            return ("Il n y a aucune différence entre vos deux fichiers")
        elif df3.empty and df1.shape != df2.shape:
            return ("La seule différence entre vos deux fichiers est la taille (donc des lignes répétées):", df1.shape,df2.shape )
        else:
            return("La taille du premier document: ", df1.shape,"La taille du deuxième document: ", df2.shape, "Les différences entre les deux documents (hors les lignes répétées): ", df3)
    else:
        if df1.shape==df2.shape:
            df_diff = pd.concat([df1, df2]).drop_duplicates(keep=False)
            return df_diff
        else:
            return(df1.compare(df2))


def write_file(path, text):
    with open(path, "a") as file:
        file.write(text + "\n")


def coordonnees_lyon(df1):
    response=requests.get("https://download.data.grandlyon.com/wfs/grandlyon?SERVICE=WFS&VERSION=2.0.0&request=GetFeature&typename=adr_voie_lieu.adrcommune&outputFormat=application/json; subtype=geojson&SRSNAME=EPSG:4171&startIndex=0")
    df = response.json()
    df2_data = pd.DataFrame(df)
    df2 = aff(df2_data, df)
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