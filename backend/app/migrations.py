"""Lightweight schema updates (PostgreSQL)."""

from sqlalchemy import text

from app.database import engine


def run_migrations() -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE employees
                ADD COLUMN IF NOT EXISTS employee_code VARCHAR(20);
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE employees
                ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS ix_employees_employee_code
                ON employees (employee_code)
                WHERE employee_code IS NOT NULL;
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE employees
                SET employee_code = LPAD(employee_id::text, 4, '0') || '-' ||
                    EXTRACT(YEAR FROM COALESCE(created_at, NOW()))::int::text
                WHERE employee_code IS NULL;
                """
            )
        )

        attendance_cols = [
            ("attendance_date", "DATE"),
            ("check_in_time", "TIMESTAMP"),
            ("lunch_out_time", "TIMESTAMP"),
            ("lunch_in_time", "TIMESTAMP"),
            ("check_out_time", "TIMESTAMP"),
            ("late_status", "BOOLEAN DEFAULT FALSE"),
            ("lunch_exceeded_status", "BOOLEAN DEFAULT FALSE"),
            ("lunch_exceeded_minutes", "FLOAT"),
            ("early_checkout_status", "BOOLEAN DEFAULT FALSE"),
            ("early_checkout_reason", "VARCHAR(255)"),
            ("working_hours", "FLOAT"),
        ]
        for col, col_type in attendance_cols:
            conn.execute(
                text(f"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS {col} {col_type};")
            )

        conn.execute(
            text(
                """
                UPDATE attendance
                SET check_in_time = check_in
                WHERE check_in_time IS NULL AND check_in IS NOT NULL;
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE attendance
                SET check_out_time = check_out
                WHERE check_out_time IS NULL AND check_out IS NOT NULL;
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE attendance
                SET attendance_date = DATE(check_in)
                WHERE attendance_date IS NULL AND check_in IS NOT NULL;
                """
            )
        )
        conn.execute(
            text(
                """
                DELETE FROM attendance a
                USING attendance b
                WHERE a.attendance_id < b.attendance_id
                  AND a.employee_id = b.employee_id
                  AND a.attendance_date IS NOT NULL
                  AND a.attendance_date = b.attendance_date;
                """
            )
        )
        extra_att_cols = [
            ("overtime_hours", "FLOAT"),
            ("attendance_status", "VARCHAR(50)"),
            ("permission_used_minutes", "INTEGER DEFAULT 0"),
        ]
        for col, col_type in extra_att_cols:
            conn.execute(
                text(f"ALTER TABLE attendance ADD COLUMN IF NOT EXISTS {col} {col_type};")
            )

        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS permissions (
                    permission_id SERIAL PRIMARY KEY,
                    employee_id INTEGER NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
                    permission_date DATE NOT NULL,
                    from_time VARCHAR(8) NOT NULL,
                    to_time VARCHAR(8) NOT NULL,
                    duration_minutes INTEGER NOT NULL,
                    reason TEXT,
                    status VARCHAR(20) DEFAULT 'pending',
                    created_at TIMESTAMP DEFAULT NOW()
                );
                """
            )
        )

        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_employee_date
                ON attendance (employee_id, attendance_date)
                WHERE attendance_date IS NOT NULL;
                """
            )
        )
