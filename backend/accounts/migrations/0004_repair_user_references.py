from django.db import migrations


USER_REFERENCE_COLUMNS = (
    ("django_admin_log", "user_id"),
    ("inventory_inventorymovement", "performed_by_id"),
    ("purchasing_purchaseorder", "created_by_id"),
    ("purchasing_goodsreceipt", "received_by_id"),
    ("purchasing_purchasereturn", "created_by_id"),
    ("purchasing_supplierpayment", "recorded_by_id"),
    ("sales_sale", "sold_by_id"),
)


def repair_user_references(apps, schema_editor):
    if schema_editor.connection.vendor != "postgresql":
        return

    with schema_editor.connection.cursor() as cursor:
        for table_name, column_name in USER_REFERENCE_COLUMNS:
            cursor.execute(
                """
                SELECT data_type
                FROM information_schema.columns
                WHERE table_name = %s AND column_name = %s
                """,
                [table_name, column_name],
            )
            column = cursor.fetchone()
            if not column or column[0] == "character varying":
                continue

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
                USING CASE
                    WHEN {quoted_column} IS NULL THEN NULL
                    ELSE 'EMP-' || LPAD({quoted_column}::text, 4, '0')
                END
                """
            )

            constraint_name = schema_editor.quote_name(
                f"{table_name}_{column_name}_employee_fk"
            )
            cursor.execute(
                f"ALTER TABLE {quoted_table} ADD CONSTRAINT {constraint_name} "
                f"FOREIGN KEY ({quoted_column}) "
                "REFERENCES accounts_user (employee_id) ON DELETE SET NULL"
            )


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_remove_user_id_alter_user_employee_id"),
        ("admin", "0003_logentry_add_action_flag_choices"),
        ("inventory", "0002_warehouse_inventorymovement_warehouse_and_more"),
        ("purchasing", "0001_initial"),
        ("sales", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(repair_user_references, migrations.RunPython.noop),
    ]