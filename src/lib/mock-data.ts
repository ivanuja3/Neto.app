export const kpis = {
  ingresos: {
    value: 2847500,
    label: "Ingresos del mes",
    change: +18.4,
    changeLabel: "+18.4%",
    unit: "ARS",
  },
  cm3: {
    value: 28.4,
    label: "CM3 (Margen neto)",
    change: +2.1,
    changeLabel: "+2.1pp",
    unit: "%",
  },
  roasReal: {
    value: 2.1,
    label: "ROAS Real",
    change: -0.3,
    changeLabel: "-0.3x",
    unit: "x",
  },
  mer: {
    value: 3.4,
    label: "MER",
    change: +0.2,
    changeLabel: "+0.2x",
    unit: "x",
  },
  ordenes: {
    value: 248,
    label: "Órdenes",
    change: +12,
    changeLabel: "+12",
    unit: "",
  },
  ticketPromedio: {
    value: 11482,
    label: "Ticket promedio",
    change: +5.7,
    changeLabel: "+5.7%",
    unit: "ARS",
  },
};

export const ingresosPorMes = [
  { mes: "Ene", ingresos: 1820000, cm3: 24.1 },
  { mes: "Feb", ingresos: 2100000, cm3: 25.8 },
  { mes: "Mar", ingresos: 1950000, cm3: 23.4 },
  { mes: "Abr", ingresos: 2380000, cm3: 27.0 },
  { mes: "May", ingresos: 2640000, cm3: 26.5 },
  { mes: "Jun", ingresos: 2847500, cm3: 28.4 },
];

export const ventasPorCanal = [
  { canal: "Tienda Nube", ingresos: 1423750, porcentaje: 50, color: "#10B981" },
  { canal: "MercadoLibre", ingresos: 854250, porcentaje: 30, color: "#3B82F6" },
  { canal: "Físico", ingresos: 427125, porcentaje: 15, color: "#F59E0B" },
  { canal: "Instagram", ingresos: 142375, porcentaje: 5, color: "#8B5CF6" },
];

export const skus = [
  {
    sku: "CAMISETA-001",
    nombre: "Remera básica blanca",
    unidades: 84,
    ingresos: 714000,
    costo: 280000,
    margen: 60.8,
    roasReal: 3.2,
    tendencia: "up" as const,
  },
  {
    sku: "JEAN-002",
    nombre: "Jean slim negro",
    unidades: 52,
    ingresos: 832000,
    costo: 468000,
    margen: 43.8,
    roasReal: 1.8,
    tendencia: "down" as const,
  },
  {
    sku: "BUZO-003",
    nombre: "Buzo oversize gris",
    unidades: 61,
    ingresos: 671000,
    costo: 244000,
    margen: 63.6,
    roasReal: 4.1,
    tendencia: "up" as const,
  },
  {
    sku: "SHORT-004",
    nombre: "Short deportivo",
    unidades: 31,
    ingresos: 248000,
    costo: 136000,
    margen: 45.2,
    roasReal: 2.3,
    tendencia: "neutral" as const,
  },
  {
    sku: "CAMPERA-005",
    nombre: "Campera de abrigo",
    unidades: 20,
    ingresos: 382500,
    costo: 230000,
    margen: 39.9,
    roasReal: 1.4,
    tendencia: "down" as const,
  },
];

export const costosPorCategoria = [
  { categoria: "COGS", valor: 1138400, porcentaje: 40 },
  { categoria: "Envíos", valor: 284750, porcentaje: 10 },
  { categoria: "Comisiones ML/TN", valor: 227800, porcentaje: 8 },
  { categoria: "Meta Ads", valor: 426000, porcentaje: 15 },
  { categoria: "Fijos", valor: 340000, porcentaje: 12 },
  { categoria: "Neto", valor: 430550, porcentaje: 15 },
];

export type StockItem = {
  id: string;
  nombre: string;
  categoria: string;
  sku: string;
  stockActual: number;
  stockMinimo: number;
  costoUnitario: number;
  precioVenta: number;
  unidadesVendidasMes: number;
};

export const inventario: StockItem[] = [
  { id: "P001", nombre: "Remera básica blanca",  categoria: "Remeras",    sku: "CAMISETA-001", stockActual: 142, stockMinimo: 30, costoUnitario: 3500,  precioVenta: 8500,  unidadesVendidasMes: 84 },
  { id: "P002", nombre: "Jean slim negro",        categoria: "Pantalones", sku: "JEAN-002",     stockActual: 18,  stockMinimo: 20, costoUnitario: 9000,  precioVenta: 16000, unidadesVendidasMes: 52 },
  { id: "P003", nombre: "Buzo oversize gris",     categoria: "Buzos",      sku: "BUZO-003",     stockActual: 74,  stockMinimo: 25, costoUnitario: 4000,  precioVenta: 11000, unidadesVendidasMes: 61 },
  { id: "P004", nombre: "Short deportivo",        categoria: "Pantalones", sku: "SHORT-004",    stockActual: 9,   stockMinimo: 15, costoUnitario: 4400,  precioVenta: 8000,  unidadesVendidasMes: 31 },
  { id: "P005", nombre: "Campera de abrigo",      categoria: "Camperas",   sku: "CAMPERA-005",  stockActual: 33,  stockMinimo: 12, costoUnitario: 11500, precioVenta: 19125, unidadesVendidasMes: 20 },
  { id: "P006", nombre: "Musculosa deportiva",    categoria: "Remeras",    sku: "MUSC-006",     stockActual: 211, stockMinimo: 40, costoUnitario: 2200,  precioVenta: 5500,  unidadesVendidasMes: 38 },
  { id: "P007", nombre: "Jogger cargo",           categoria: "Pantalones", sku: "JOGGER-007",   stockActual: 5,   stockMinimo: 15, costoUnitario: 6800,  precioVenta: 13500, unidadesVendidasMes: 27 },
  { id: "P008", nombre: "Canguro con capucha",    categoria: "Buzos",      sku: "CANGURO-008",  stockActual: 56,  stockMinimo: 20, costoUnitario: 5500,  precioVenta: 12000, unidadesVendidasMes: 19 },
];

export const movimientosStock = [
  { fecha: "22/06", producto: "Remera básica blanca", tipo: "entrada" as const, cantidad: 60, motivo: "Reposición proveedor" },
  { fecha: "21/06", producto: "Jean slim negro",      tipo: "salida"  as const, cantidad: 12, motivo: "Venta Tienda Nube" },
  { fecha: "20/06", producto: "Buzo oversize gris",   tipo: "salida"  as const, cantidad: 8,  motivo: "Venta MercadoLibre" },
  { fecha: "19/06", producto: "Jogger cargo",         tipo: "salida"  as const, cantidad: 5,  motivo: "Venta local / físico" },
  { fecha: "18/06", producto: "Campera de abrigo",    tipo: "entrada" as const, cantidad: 20, motivo: "Reposición proveedor" },
  { fecha: "17/06", producto: "Short deportivo",      tipo: "salida"  as const, cantidad: 7,  motivo: "Venta Tienda Nube" },
];

export type Proveedor = {
  id: string;
  nombre: string;
  categoria: string;
  contacto: string;
  email: string;
  telefono: string;
  condicionPago: string;
  diasEntrega: number;
  saldoPendiente: number;
  ultimoPedido: string;
  estado: "activo" | "inactivo";
};

export type OrdenCompra = {
  id: string;
  proveedorId: string;
  proveedor: string;
  fecha: string;
  vencimiento: string;
  monto: number;
  estado: "pagado" | "pendiente" | "vencido";
  detalle: string;
};

export const proveedores: Proveedor[] = [
  {
    id: "V001",
    nombre: "Textil del Norte",
    categoria: "Indumentaria",
    contacto: "Marcelo Ríos",
    email: "marcelo@textildelnorte.com",
    telefono: "+54 351 412-8801",
    condicionPago: "30 días",
    diasEntrega: 5,
    saldoPendiente: 284600,
    ultimoPedido: "18/06/2026",
    estado: "activo",
  },
  {
    id: "V002",
    nombre: "Confecciones Córdoba",
    categoria: "Indumentaria",
    contacto: "Laura Sánchez",
    email: "ventas@confeccionescba.com",
    telefono: "+54 351 508-3342",
    condicionPago: "Contado",
    diasEntrega: 3,
    saldoPendiente: 0,
    ultimoPedido: "10/06/2026",
    estado: "activo",
  },
  {
    id: "V003",
    nombre: "Logística Express",
    categoria: "Logística",
    contacto: "Diego Ferreyra",
    email: "diego@logisticaexpress.com.ar",
    telefono: "+54 11 4822-1100",
    condicionPago: "15 días",
    diasEntrega: 1,
    saldoPendiente: 71200,
    ultimoPedido: "19/06/2026",
    estado: "activo",
  },
  {
    id: "V004",
    nombre: "Packaging Flex",
    categoria: "Embalaje",
    contacto: "Romina Torres",
    email: "romina@packagingflex.com",
    telefono: "+54 351 781-4490",
    condicionPago: "30 días",
    diasEntrega: 7,
    saldoPendiente: 18400,
    ultimoPedido: "05/06/2026",
    estado: "activo",
  },
  {
    id: "V005",
    nombre: "Importadora BsAs",
    categoria: "Indumentaria",
    contacto: "Sebastián Mora",
    email: "smora@importadorabsas.com",
    telefono: "+54 11 5263-9900",
    condicionPago: "60 días",
    diasEntrega: 14,
    saldoPendiente: 427000,
    ultimoPedido: "01/06/2026",
    estado: "activo",
  },
  {
    id: "V006",
    nombre: "Etiquetas Sur",
    categoria: "Embalaje",
    contacto: "Valeria Gómez",
    email: "info@etiquetassur.com",
    telefono: "+54 351 342-7761",
    condicionPago: "Contado",
    diasEntrega: 4,
    saldoPendiente: 0,
    ultimoPedido: "28/05/2026",
    estado: "inactivo",
  },
];

export const ordenesCompra: OrdenCompra[] = [
  { id: "OC-0041", proveedorId: "V005", proveedor: "Importadora BsAs",   fecha: "01/06/2026", vencimiento: "01/08/2026", monto: 427000, estado: "pendiente", detalle: "Camperas abrigo — 40 u." },
  { id: "OC-0040", proveedorId: "V003", proveedor: "Logística Express",   fecha: "19/06/2026", vencimiento: "04/07/2026", monto: 71200,  estado: "pendiente", detalle: "Servicio logística semana 3-4" },
  { id: "OC-0039", proveedorId: "V001", proveedor: "Textil del Norte",    fecha: "18/06/2026", vencimiento: "18/07/2026", monto: 284600, estado: "pendiente", detalle: "Remeras básicas x60 + joggers x20" },
  { id: "OC-0038", proveedorId: "V004", proveedor: "Packaging Flex",      fecha: "05/06/2026", vencimiento: "05/07/2026", monto: 18400,  estado: "pendiente", detalle: "Bolsas y cajas — lote mensual" },
  { id: "OC-0037", proveedorId: "V002", proveedor: "Confecciones Córdoba",fecha: "10/06/2026", vencimiento: "10/06/2026", monto: 156000, estado: "pagado",    detalle: "Buzos oversize x30" },
  { id: "OC-0036", proveedorId: "V001", proveedor: "Textil del Norte",    fecha: "20/05/2026", vencimiento: "20/06/2026", monto: 198000, estado: "vencido",   detalle: "Shorts y musculosas — reposición" },
  { id: "OC-0035", proveedorId: "V002", proveedor: "Confecciones Córdoba",fecha: "02/05/2026", vencimiento: "02/05/2026", monto: 89500,  estado: "pagado",    detalle: "Jeans slim x20" },
];

export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-AR").format(value);
}

// ─── Proyecciones ───────────────────────────────────────────────────────────

export const ESCENARIOS_CONFIG = {
  conservador: { tasa: 0.03, label: "Conservador", color: "#F59E0B", desc: "+3%/mes — crecimiento estable" },
  base:         { tasa: 0.06, label: "Base",         color: "#10B981", desc: "+6%/mes — tendencia actual" },
  optimista:    { tasa: 0.15, label: "Optimista",    color: "#8B5CF6", desc: "+15%/mes — escalado con ads" },
} as const;

export type EscenarioKey = keyof typeof ESCENARIOS_CONFIG;

export const MESES_FUTUROS = ["Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export const CM3_ACTUAL       = 28.4;
export const ROAS_ACTUAL      = 2.1;
export const ULTIMO_INGRESO   = 2_847_500;
export const COSTOS_TOTALES   = 2_417_650; // de mock costos

export function calcProyeccion(escenario: EscenarioKey) {
  const { tasa } = ESCENARIOS_CONFIG[escenario];
  return MESES_FUTUROS.map((mes, i) => {
    const ingresos  = Math.round(ULTIMO_INGRESO * Math.pow(1 + tasa, i + 1));
    const cm3       = parseFloat(Math.min(CM3_ACTUAL + 0.4 * (i + 1), 40).toFixed(1));
    const ganancia  = Math.round(ingresos * cm3 / 100);
    const adsSuger  = Math.round(ingresos * 0.15);
    return { mes, ingresos, cm3, ganancia, adsSuger };
  });
}

export function calcChartCombinado(escenario: EscenarioKey) {
  const proyeccion = calcProyeccion(escenario);
  return [
    ...ingresosPorMes.map((m, i) => ({
      mes: m.mes,
      real: m.ingresos,
      cm3Real: m.cm3,
      proyectado: i === ingresosPorMes.length - 1 ? m.ingresos : null,
      cm3Proy: i === ingresosPorMes.length - 1 ? m.cm3 : null,
    })),
    ...proyeccion.map((m) => ({
      mes: m.mes,
      real: null,
      cm3Real: null,
      proyectado: m.ingresos,
      cm3Proy: m.cm3,
    })),
  ];
}
