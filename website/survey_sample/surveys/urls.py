from django.urls import path
from . import views

urlpatterns = [
    path('', views.SurveyListView.as_view(), name='survey_list'),
    path('<int:pk>/', views.survey_detail, name='survey_detail'),
    path('<int:pk>/complete/', views.survey_complete, name='survey_complete'),
]