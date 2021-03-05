from datetime import datetime

from django.shortcuts import render
from .fonctions import *  # py file containing all functions on file processing
import pandas as pd
import io
import urllib
import base64
import win32com.client as win32
from pathlib import Path
from .forms import AbForm, CompareForm
import json

# Global variables to save some values
path_rapport = ""
tab_col = []
info = []
path = ''
uri = ''
str_empty_cells = ''
str_double = []
str_special = []
ext = ''
bool_double = False
str_ab = []
df_file = pd.DataFrame({})
copy_df = pd.DataFrame({})
tab_double = {}
bool_spe_char = False
tab_special = []
tab_info_col = []
path1 = ''
path2 = ''
df_file1 = pd.DataFrame({})
df_file2 = pd.DataFrame({})
ext1 = ''
ext2 = ''


# Changing pages
def garde(request):
    return render(request, 'page_garde.html')


def analyse(request):
    return render(request, 'analyse.html')


def versioning(request):
    global path1
    global path2
    path1 = ''
    path2 = ''
    return render(request, 'versioning.html')


def coordinate_lyon(request):
    global path1
    global path2
    path1 = ''
    path2 = ''
    return render(request, 'coordonnees_lyon.html')


def index(request):
    global str_ab
    global ext
    global df_file
    global path
    global copy_df
    global str_empty_cells
    global uri
    global tab_double
    global tab_special
    global str_double
    global bool_double
    global str_special
    global bool_spe_char
    global info
    global tab_col
    global tab_info_col
    global path_rapport
    str_double = []
    str_ab = []
    window = open_window()
    path = window[0]
    df_file = window[1]
    ext = window[2]
    copy_df = df_file.copy()  # Creating a copy for future modifications

    # Empty cells detection
    empty = empty_cells(df_file)
    fig = empty[0]
    tab = empty[1]

    if len(tab) == 0:
        str_empty_cells = "Il n'y à aucune cellules vides"
    else:
        str_empty_cells = "Cellules vides: " + str(tab)
    # Converting graph into a buffer coded in 64bit then into an image
    buf = io.BytesIO()
    fig.savefig(buf, format='png')
    buf.seek(0)
    string = base64.b64encode(buf.read())

    uri = urllib.parse.quote(string)

    # Duplicate tows detection
    tab_double = duplicate_rows(df_file)

    if len(tab_double) == 0:
        str_double = ["Il n'y a aucun doublons"]
        bool_double = False
    else:
        bool_double = True
        for key in tab_double:
            double = ''
            for i in tab_double[key]:
                double += ' ' + str(i)
            str_double.append("La ligne " + str(key) + " est la même que la/les ligne.s " + double + '.')
    path = Path(str(path))
    name_rapport = path.stem + '_rapport' + '(' + str(os.path.splitext(path)[1]) + ')'
    path_rapport = str(path).strip(path.name) + name_rapport + '.txt'
    now = datetime.now()
    dt_string = now.strftime("%d/%m/%Y %H:%M:%S")
    write_file(path_rapport, '\nNouveau rapport pour le fichier ' + str(path.stem) + str(
        os.path.splitext(path)[1]) + ' fait le ' + dt_string)
    write_file(path_rapport, str_empty_cells)
    for i in str_double:
        write_file(path_rapport, i)

    # Special char detection
    tab_special = spe_char(df_file)

    if len(tab_special) == 0:
        str_special = ["Il n'y a aucun caractère spécial"]
        bool_spe_char = False
    else:
        bool_spe_char = True
        for i in tab_special:
            str_special.append('La case ' + str(i) + ' contient un caractère spécial.')

    for i in str_special:
        write_file(path_rapport, i)

    # Collecting information on the file
    info = id_card(path, df_file)
    # Detecting columns
    tab_info = []
    for i in df_file:
        if type(df_file[i]) != pd.core.frame.DataFrame:
            if df_file[i].dtype == 'int64' or df_file[i].dtype == 'float64':
                tab_info.append(i)
                # Replacing spaces because we have trouble collecting strings after a space with our form
                a = i.replace(" ", "§")
                tab_col.append(a)
    tab_info_col = info_df_col(df_file, tab_info)
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def open_excel(request):
    global path
    excel = win32.gencache.EnsureDispatch('Excel.Application')
    wb = excel.Workbooks.Open(path)
    excel.Visible = True
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def duplicates_suppression(request):
    global tab_double
    global tab_special
    global copy_df
    global str_double
    global bool_double
    bool_double = False
    for key in tab_double:
        for i in tab_double[key]:
            copy_df.drop(i, 0, inplace=True)
    tab_special = spe_char(copy_df)
    str_double = ["Il n'y a aucun doublons dans la copie du fichier."]
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def replace_spe_char(request):
    global copy_df
    global tab_special
    global bool_spe_char
    global str_special

    bool_spe_char = False
    str_special = ["Il n'y a plus de caractères spéciaux dans la copie."]
    corresponding_table = {'a': 'àáâãäåæ', 'c': 'ç', 'e': 'èéêë', 'i': 'ìíîï', 'n': 'ñ', 'o': 'ø', 's': 'š', 'p': 'Þ',
                           'u': 'ùúûü', 'y': 'ýÿ', 'ae': 'æ', 'oe': 'œ'}
    for i in tab_special:
        spe_chars = copy_df.iloc[i[0]][i[1]]
        for char in spe_chars:
            for key in corresponding_table:
                if char.lower() in corresponding_table[key]:
                    new_spe_char = spe_chars.replace(char, key)
                    copy_df = copy_df.replace(spe_chars, new_spe_char)
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def gen_copy(request):
    global copy_df
    global path

    name_copy = path.stem + '_copy'
    copy_path = str(path).strip(path.name) + name_copy + path.suffix
    copy_df.to_excel(copy_path, index=False, engine='openpyxl')
    excel = win32.gencache.EnsureDispatch('Excel.Application')
    wb = excel.Workbooks.Open(copy_path)
    excel.Visible = True
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def gen_copy_json(request):
    global copy_df
    global path
    name_copy = path.stem + '_copy'
    copy_path = str(path).strip(path.name) + name_copy + path.suffix
    json_file = df_json(copy_df)
    with open(copy_path, "w") as file:
        json.dump(json_file, file)
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def get_form(request):
    global df_file
    global str_ab

    form = AbForm(request.POST)
    val_max = form["val_max"].value()
    val_min = form["val_min"].value()
    col = form.data["column_select"].replace('§', ' ')

    tab = info_value(df_file, col, float(val_min), float(val_max))
    str_ab.append(' Les cases ' + str(
        tab) + ' de la colonne ' + col + ' sont en dehors des bornes ' + val_min + ' et ' + val_max + '.')
    for i in str_ab:
        write_file(path_rapport, i)
    return render(request, 'analyse.html', {'data': uri, 'cellules_vides': str_empty_cells, 'name': path,
                                           'doublons': str_double, 'specar': str_special,
                                           'bool_double': bool_double, 'ab': str_ab,
                                           'bool_spe_char': bool_spe_char, 'ext': ext, 'date_creation': info[0],
                                           'date_modif': info[1], 'taille': info[2], 'list_col': tab_col,
                                           'list_info': tab_info_col})


def versioning_path1(request):
    global path1
    global path2
    global df_file1
    global tab_col
    tab_col = []
    window = open_window()
    path1 = window[0]
    df_file1 = window[1]
    for i in df_file1:
        tab_col.append(str(i.replace(' ', '§')))
    return render(request, 'versioning.html', {'path1': path1, 'path2': path2, 'list_col': tab_col})


def versioning_path2(request):
    global path2
    global df_file2
    global path1
    global tab_col
    window = open_window()
    path2 = window[0]
    df_file2 = window[1]
    return render(request, 'versioning.html', {'path1': path1, 'path2': path2, 'list_col': tab_col})


def get_form_compare(request):
    global path1
    global path2
    global df_file1
    global df_file2
    global tab_col
    form = CompareForm(request.POST)
    col = form.data["column_select"].replace('§', ' ')
    test = str(versioning_df(df_file1, df_file2, col))
    return render(request, 'versioning.html', {'path1': path1, 'path2': path2, 'list_col': tab_col, 'test': test})


def coordinate_lyon_analyse(request):
    global path1
    global df_file1
    global ext1
    window = open_window()
    path1 = window[0]
    df_file1 = window[1]
    ext1 = window[2]
    test = coordonnees_lyon(df_file1)
    return render(request, 'coordonnees_lyon.html', {'path1': path1, 'test': test[0], 'tab_coord': test[1]})
