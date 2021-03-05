from django import forms


class AbForm(forms.Form):
    column_select = forms.Field()
    val_min = forms.FloatField()
    val_max = forms.FloatField()


class CompareForm(forms.Form):
    column_select = forms.Field()
