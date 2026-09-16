from django.db import migrations


USER_M2M_COLUMNS = (
    ("accounts_user_groups", "user_id"),
    ("accounts_user_user_permissions", "user_id"),
)


def repair_user_m2m_references(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for table_name, column_name in USER_M2M_COLUMNS:
            cursor.execute(
                """
                SELECT constraint_info.conname
                FROM pg_constraint constraint_info
                JOIN pg_class child ON child.oid = constraint_info.conrelid
                JOIN pg_attribute child_column
                    ON child_column.attrelid = child.oid
                    AND child_column.attnum = constraint_info.conkey[1]
                WHERE child.relname = %s
                  AND child_column.attname = %s
                  AND constraint_info.contype = 'f'
                """,
                [table_name, column_name],
            )
            for (constraint_name,) in cursor.fetchall():
                cursor.execute(
                    f"ALTER TABLE {schema_editor.quote_name(table_name)} "
                    f"DROP CONSTRAINT {schema_editor.quote_name(constraint_name)}"
                )

            quoted_table = schema_editor.quote_name(table_name)
            quoted_column = schema_editor.quote_name(column_name)
            cursor.execute(
                f"""
                ALTER TABLE {quoted_table}
                ALTER COLUMN {quoted_column} TYPE varchar(30)
                USING 'EMP-' || LPAD({quoted_column}::text, 4, '0')
                """
            )
            constraint_name = schema_editor.quote_name(
                f"{table_name}_{column_name}_employee_fk"
            )
            cursor.execute(
                f"ALTER TABLE {quoted_table} ADD CONSTRAINT {constraint_name} "
                f"FOREIGN KEY ({quoted_column}) "
                "REFERENCES accounts_user (employee_id) ON DELETE CASCADE"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0004_repair_user_references"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(
            repair_user_m2m_references,
            migrations.RunPython.noop,
        ),
    ]