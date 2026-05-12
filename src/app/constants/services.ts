/**
 * Constantes compartidas de servicios/amenidades
 */

export interface ServiceItem {
  code: string;
  label: string;
  icon?: string;
}

/** Lista completa de servicios/amenidades disponibles en alojamientos */
export const SERVICES_LIST: ServiceItem[] = [
  { code: 'WIFI',               label: 'Wi-Fi',              icon: 'wifi' },
  { code: 'BREAKFAST_INCLUDED', label: 'Desayuno incluido',  icon: 'restaurant' },
  { code: 'AIR_CONDITIONING',   label: 'Aire acondicionado', icon: 'ac_unit' },
  { code: 'POOL',               label: 'Piscina',            icon: 'pool' },
  { code: 'TELEVISION',         label: 'Televisión',         icon: 'tv' },
  { code: 'PARKING',            label: 'Parqueadero',        icon: 'local_parking' },
  { code: 'GYM',                label: 'Gimnasio',           icon: 'fitness_center' },
  { code: 'SPA',                label: 'Spa',                icon: 'spa' },
  { code: 'RESTAURANT',         label: 'Restaurante',        icon: 'restaurant_menu' },
  { code: 'BAR',                label: 'Bar',                icon: 'local_bar' }
];
