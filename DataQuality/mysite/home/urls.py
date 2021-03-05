from django.contrib import admin
from django.urls import path

from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.garde),
    path('analyse', views.analyse),
    path('versioning', views.versioning),
    path('script', views.index),
    path('excel', views.open_excel),
    path('suppr_doublons', views.duplicates_suppression),
    path('suppr_spe_char', views.replace_spe_char),
    path('copy', views.gen_copy),
    path('copy_json', views.gen_copy_json),
    path('val_ab', views.get_form),
    path('path1', views.versioning_path1),
    path('path2', views.versioning_path2),
    path('compare', views.get_form_compare),
    path('coordonnees_lyon', views.coordinate_lyon),
    path('coordonnees_lyon_analyse', views.coordinate_lyon_analyse),
]
