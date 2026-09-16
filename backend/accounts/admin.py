from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm

from .models import User


class AccountCreationForm(UserCreationForm):
	class Meta:
		model = User
		fields = ("username", "role")


class AccountChangeForm(UserChangeForm):
	class Meta:
		model = User
		fields = "__all__"


class AccountAdmin(UserAdmin):
	add_form = AccountCreationForm
	form = AccountChangeForm
	model = User
	readonly_fields = ("employee_id",)
	fieldsets = UserAdmin.fieldsets + (("Employee", {"fields": ("employee_id", "role")}),)
	add_fieldsets = UserAdmin.add_fieldsets + (("Employee", {"fields": ("role",)}),)


admin.site.register(User, AccountAdmin)
