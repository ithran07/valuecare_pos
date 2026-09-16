# medical-supplier-pos-part-3/backend/accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    ChangePasswordView,
    EmployeeDetailView,
    EmployeeListCreateView,
    LoginView,
    MeView,
)

urlpatterns = [
    path("login/", LoginView.as_view()),
    path("me/", MeView.as_view()),
    path("change-password/", ChangePasswordView.as_view()),
    path("users/", EmployeeListCreateView.as_view()),
    path("users/<str:employee_id>/", EmployeeDetailView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
]
