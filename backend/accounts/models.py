from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        ADMIN = "ADMIN", "Admin"
        MANAGER = "MANAGER", "Manager"
        SALES = "SALES", "Sales"
        WAREHOUSE = "WAREHOUSE", "Warehouse"
        ACCOUNTING = "ACCOUNTING", "Accounting"

    employee_id = models.CharField(max_length=30, primary_key=True)
    phone = models.CharField(max_length=30, default="0")
    role = models.CharField(max_length=30, choices=Role.choices, default=Role.SALES)

    def save(self, *args, **kwargs):
        if not self.employee_id:
            employee_ids = type(self).objects.filter(
                employee_id__startswith="EMP-"
            ).values_list("employee_id", flat=True)
            last_number = max(
                (int(employee_id[4:]) for employee_id in employee_ids
                 if employee_id[4:].isdigit()),
                default=0,
            )
            self.employee_id = f"EMP-{last_number + 1:04d}"
        if not self.username:
            self.username = self.employee_id
        super().save(*args, **kwargs)

    def __str__(self):
        return self.employee_id or self.username
