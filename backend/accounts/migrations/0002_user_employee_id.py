from django.db import migrations, models


def assign_employee_ids(apps, schema_editor):
    User = apps.get_model("accounts", "User")
    for user in User.objects.filter(employee_id__isnull=True).order_by("id"):
        user.employee_id = f"EMP-{user.id:04d}"
        if not user.username:
            user.username = user.employee_id
        user.save(update_fields=["employee_id", "username"])


class Migration(migrations.Migration):
    dependencies = [("accounts", "0001_initial")]

    operations = [
        migrations.AddField(
            model_name="user",
            name="employee_id",
            field=models.CharField(blank=True, max_length=30, null=True, unique=True),
        ),
        migrations.RunPython(assign_employee_ids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="employee_id",
            field=models.CharField(max_length=30, unique=True),
        ),
    ]
