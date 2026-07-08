// Secciones habilitadas por rubro.
// BASE está disponible para todos. Cada rubro puede agregar extras.

type NavKey =
  | "dashboard" | "ventas" | "presupuestos" | "caja" | "inventario" | "clientes" | "proveedores"
  | "margenes" | "costos" | "flujo" | "proyecciones"
  | "ads" | "impuestos" | "ia";

const BASE: NavKey[] = [
  "dashboard", "ventas", "inventario", "clientes", "proveedores",
  "margenes", "costos", "flujo", "proyecciones",
  "ads", "impuestos", "ia",
];

// Rubros con POS / caja física
const CON_CAJA: NavKey[] = [...BASE, "caja"];

// Rubros con presupuestos (B2B / por proyecto)
const CON_PRESUPUESTOS: NavKey[] = [...BASE, "presupuestos"];

// Rubros con ambos (ej: ferretería puede tener caja Y presupuestos)
const CON_AMBOS: NavKey[] = [...BASE, "caja", "presupuestos"];

const RUBRO_NAV: Record<string, NavKey[]> = {
  // POS puros
  kiosco:                 CON_CAJA,
  cafeteria:              CON_CAJA,
  bar:                    CON_CAJA,
  barberia_salon:         CON_CAJA,
  farmacia_drogueria:     CON_CAJA,
  carniceria:             CON_CAJA,
  fiambreria:             CON_CAJA,
  panaderia_reposteria:   CON_CAJA,
  naturista_suplementos:  CON_CAJA,
  licoreria:              CON_CAJA,
  articulos_belleza:      CON_CAJA,
  mascotas_veterinaria:   CON_CAJA,
  gimnasio:               CON_CAJA,
  estetica_salud:         CON_CAJA,
  tatuajes_piercings:     CON_CAJA,

  // Presupuestos (B2B)
  aberturas:                  CON_PRESUPUESTOS,
  industria_manufactura:      CON_PRESUPUESTOS,
  distribuidora_mayorista:    CON_PRESUPUESTOS,
  reparaciones_mantenimiento: CON_PRESUPUESTOS,
  marketing_publicidad:       CON_PRESUPUESTOS,
  organizacion_eventos:       CON_PRESUPUESTOS,
  servicios_educativos:       CON_PRESUPUESTOS,

  // Ambos
  ferreteria_construccion:    CON_AMBOS,
  taller_automotriz:          CON_AMBOS,
  articulos_hogar:            CON_AMBOS,
  articulos_deportivos:       CON_AMBOS,
};

export function getNavKeys(industry: string | null | undefined): NavKey[] {
  return RUBRO_NAV[industry ?? ""] ?? BASE;
}
