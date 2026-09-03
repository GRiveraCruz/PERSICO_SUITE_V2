"""crear tablas iniciales para los 46 modulos migrados desde JSON

(quotes y cpos ya existian de la migracion anterior de Ventas — no se tocan aqui)
v3: incluye todas las correcciones de campo encontradas durante las pruebas
en BETA (ver conversacion completa del proyecto de migracion) — Personal,
Jobs, Work Hours con llave compuesta year_key, ProjectConfig.ptsv, etc.

Revision ID: 0001_initial
Revises: 
Create Date: 2026-09-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 'quotes' ya existe (creada por la migración anterior de Ventas) — se omite aquí

    # 'cpos' ya existe (creada por la migración anterior de Ventas) — se omite aquí

    op.create_table('jobs',
        sa.Column('job_number', sa.String(), nullable=False, unique=True),
        sa.Column('customer', sa.String()),
        sa.Column('status', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_jobs_customer', 'jobs', ['customer'])
    op.create_index('ix_jobs_status', 'jobs', ['status'])
    op.create_table('hourly_rates',
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('employee', sa.String()),
        sa.Column('year_key', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_hourly_rates_year', 'hourly_rates', ['year'])
    op.create_index('ix_hourly_rates_employee', 'hourly_rates', ['employee'])
    op.create_table('purchase_orders',
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('po_number', sa.String()),
        sa.Column('job', sa.String()),
        sa.Column('year_key', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_purchase_orders_year', 'purchase_orders', ['year'])
    op.create_index('ix_purchase_orders_po_number', 'purchase_orders', ['po_number'])
    op.create_index('ix_purchase_orders_job', 'purchase_orders', ['job'])
    op.create_table('invoiced_pos',
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('clave', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_invoiced_pos_year', 'invoiced_pos', ['year'])
    op.create_index('ix_invoiced_pos_job', 'invoiced_pos', ['job'])
    op.create_table('proveedores',
        sa.Column('clave', sa.String(), unique=True),
        sa.Column('nombre', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_proveedores_nombre', 'proveedores', ['nombre'])
    op.create_table('generated_pos',
        sa.Column('po_number', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('catalogos_compra',
        sa.Column('familia', sa.String(), nullable=False),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('content_hash', sa.String(), unique=True),
    )
    op.create_index('ix_catalogos_compra_familia', 'catalogos_compra', ['familia'])
    op.create_table('work_hours',
        sa.Column('source_id', sa.Integer()),
        sa.Column('year_key', sa.String(), unique=True),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('employee', sa.String()),
        sa.Column('job', sa.String()),
        sa.Column('date_worked', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_work_hours_source_id', 'work_hours', ['source_id'])
    op.create_index('ix_work_hours_year', 'work_hours', ['year'])
    op.create_index('ix_work_hours_employee', 'work_hours', ['employee'])
    op.create_index('ix_work_hours_job', 'work_hours', ['job'])
    op.create_index('ix_work_hours_date_worked', 'work_hours', ['date_worked'])
    op.create_table('fx_rates',
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('fecha', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_fx_rates_year', 'fx_rates', ['year'])
    op.create_table('personal',
        sa.Column('tid', sa.String(), nullable=False, unique=True),
        sa.Column('nombre', sa.String()),
        sa.Column('area', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_personal_nombre', 'personal', ['nombre'])
    op.create_index('ix_personal_area', 'personal', ['area'])
    op.create_table('areas',
        sa.Column('nombre', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('perfiles',
        sa.Column('pid', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('vacaciones',
        sa.Column('tid', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('permisos',
        sa.Column('pid', sa.String(), unique=True),
        sa.Column('tid', sa.String()),
        sa.Column('estatus', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_permisos_tid', 'permisos', ['tid'])
    op.create_index('ix_permisos_estatus', 'permisos', ['estatus'])
    op.create_table('sueldos',
        sa.Column('tid', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('isr_tablas',
        sa.Column('periodo', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('nomina_periodos',
        sa.Column('periodo_id', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('nomina_recibos',
        sa.Column('recibo_id', sa.String(), unique=True),
        sa.Column('periodo_id', sa.String()),
        sa.Column('tid', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_nomina_recibos_periodo_id', 'nomina_recibos', ['periodo_id'])
    op.create_index('ix_nomina_recibos_tid', 'nomina_recibos', ['tid'])
    op.create_table('control_horas_firmas',
        sa.Column('report_key', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_control_horas_firmas_report_key', 'control_horas_firmas', ['report_key'])
    op.create_table('control_horas_exports',
        sa.Column('report_key', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('stock',
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('content_hash', sa.String(), unique=True),
    )
    op.create_index('ix_stock_job', 'stock', ['job'])
    op.create_table('reassign_orders',
        sa.Column('order_number', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('recovery',
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('content_hash', sa.String(), unique=True),
    )
    op.create_index('ix_recovery_job', 'recovery', ['job'])
    op.create_table('movimientos_stock',
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
        sa.Column('content_hash', sa.String(), unique=True),
    )
    op.create_index('ix_movimientos_stock_job', 'movimientos_stock', ['job'])
    op.create_table('capacidad',
        sa.Column('tid', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('ops_capacidad_codigos',
        sa.Column('codigo', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('ordenes_servicio',
        sa.Column('os_id', sa.String(), nullable=False, unique=True),
        sa.Column('estatus', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_ordenes_servicio_estatus', 'ordenes_servicio', ['estatus'])
    op.create_table('tareas_asignadas',
        sa.Column('ta_id', sa.String(), nullable=False, unique=True),
        sa.Column('estatus', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_tareas_asignadas_estatus', 'tareas_asignadas', ['estatus'])
    op.create_table('esquemas_tributarios',
        sa.Column('folio', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('recepciones',
        sa.Column('rec_number', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_recepciones_job', 'recepciones', ['job'])
    op.create_table('procesar_compra',
        sa.Column('pur_number', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_procesar_compra_job', 'procesar_compra', ['job'])
    op.create_table('cpp',
        sa.Column('cpp_number', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('pagos',
        sa.Column('pago_number', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('cpc',
        sa.Column('year', sa.Integer()),
        sa.Column('cpc_id', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_cpc_year', 'cpc', ['year'])
    op.create_index('ix_cpc_job', 'cpc', ['job'])
    op.create_table('project_configs',
        sa.Column('ptsv', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('ingresos',
        sa.Column('record_id', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('apartados',
        sa.Column('part_number', sa.String(), unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('salidas',
        sa.Column('record_id', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_salidas_job', 'salidas', ['job'])
    op.create_table('viaticos',
        sa.Column('record_id', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_viaticos_job', 'viaticos', ['job'])
    op.create_table('gastos_viaje',
        sa.Column('record_id', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_gastos_viaje_job', 'gastos_viaje', ['job'])
    op.create_table('envios',
        sa.Column('record_id', sa.String(), unique=True),
        sa.Column('job', sa.String()),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_index('ix_envios_job', 'envios', ['job'])
    op.create_table('users',
        sa.Column('username', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('users_auth',
        sa.Column('username', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('doc_counters',
        sa.Column('prefix', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('pt_numbers',
        sa.Column('pt_number', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )
    op.create_table('sv_numbers',
        sa.Column('sv_number', sa.String(), nullable=False, unique=True),
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('data', postgresql.JSONB(), nullable=False),
        sa.Column('created_at', sa.DateTime()),
        sa.Column('updated_at', sa.DateTime()),
    )


def downgrade() -> None:
    op.drop_table('sv_numbers')
    op.drop_table('pt_numbers')
    op.drop_table('doc_counters')
    op.drop_table('users_auth')
    op.drop_table('users')
    op.drop_table('envios')
    op.drop_table('gastos_viaje')
    op.drop_table('viaticos')
    op.drop_table('salidas')
    op.drop_table('apartados')
    op.drop_table('ingresos')
    op.drop_table('project_configs')
    op.drop_table('cpc')
    op.drop_table('pagos')
    op.drop_table('cpp')
    op.drop_table('procesar_compra')
    op.drop_table('recepciones')
    op.drop_table('esquemas_tributarios')
    op.drop_table('tareas_asignadas')
    op.drop_table('ordenes_servicio')
    op.drop_table('ops_capacidad_codigos')
    op.drop_table('capacidad')
    op.drop_table('movimientos_stock')
    op.drop_table('recovery')
    op.drop_table('reassign_orders')
    op.drop_table('stock')
    op.drop_table('control_horas_exports')
    op.drop_table('control_horas_firmas')
    op.drop_table('nomina_recibos')
    op.drop_table('nomina_periodos')
    op.drop_table('isr_tablas')
    op.drop_table('sueldos')
    op.drop_table('permisos')
    op.drop_table('vacaciones')
    op.drop_table('perfiles')
    op.drop_table('areas')
    op.drop_table('personal')
    op.drop_table('fx_rates')
    op.drop_table('work_hours')
    op.drop_table('catalogos_compra')
    op.drop_table('generated_pos')
    op.drop_table('proveedores')
    op.drop_table('invoiced_pos')
    op.drop_table('purchase_orders')
    op.drop_table('hourly_rates')
    op.drop_table('jobs')
