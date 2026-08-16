alter table public.gastos_operativos
  drop constraint gastos_operativos_categoria_check;

alter table public.gastos_operativos
  add constraint gastos_operativos_categoria_check
  check (categoria = any (array[
    'papeleria',
    'limpieza',
    'internet',
    'mantenimiento',
    'renta_equipo',
    'servicios_basicos',
    'honorarios',
    'publicidad',
    'seguros',
    'equipo_menor',
    'combustibles',
    'capacitacion',
    'software',
    'otros'
  ]::text[]));
