ALTER TABLE gastos_operativos DROP CONSTRAINT gastos_operativos_categoria_check;
ALTER TABLE gastos_operativos ADD CONSTRAINT gastos_operativos_categoria_check
  CHECK (categoria = ANY (ARRAY['papeleria'::text, 'limpieza'::text, 'insumos'::text, 'internet'::text, 'mantenimiento'::text, 'renta_equipo'::text, 'servicios_basicos'::text, 'honorarios'::text, 'publicidad'::text, 'seguros'::text, 'equipo_menor'::text, 'combustibles'::text, 'capacitacion'::text, 'software'::text, 'otros'::text]));
