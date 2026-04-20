import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import mapboxgl, { LngLatLike, Map, Marker, MapMouseEvent } from 'mapbox-gl';
import { MarkerDTO } from '../model/marker-dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MapService implements OnDestroy {

  private map?: Map;
  private markers: Marker[] = [];
  private currentLocation: LngLatLike = [-75.6727, 4.53252];
  private destroy$ = new Subject<void>();

  constructor() {
    mapboxgl.accessToken = environment.mapboxToken || '';
    if (!environment.mapboxToken) {
      console.warn('[MapService] Mapbox token not configured in environment');
    }
  }

  /** Inicializa el mapa dentro del contenedor especificado */
  public create(containerId: string = 'map'): void {
    // ⬇️ Nuevo: comprobamos que el contenedor exista en el DOM
    const containerElement = document.getElementById(containerId);

    if (!containerElement) {
      console.error(`Container '${containerId}' not found in DOM`);
      return;
    }

    if (this.map) {
      this.map.remove(); // Evita fugas si se recrea el mapa
    }

    this.map = new mapboxgl.Map({
      container: containerElement, // usamos el elemento, no el string
      style: 'mapbox://styles/mapbox/streets-v11',
      center: this.currentLocation,
      zoom: 17,
      pitch: 45,
    });

    this.map.addControl(new mapboxgl.NavigationControl());
    this.map.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
      })
    );
  }

  /** Dibuja varios marcadores con popup */
  public drawMarkers(places: MarkerDTO[]): void {
    if (!this.map) return;

    places.forEach(({ id, title, photoUrl, location }) => {
      const popupHtml = `
        <strong>${title}</strong>
        <div>
          <img src="${photoUrl}" alt="Imagen" style="width: 100px; height: 100px;">
        </div>
        <a href="/place/${id}">Ver más</a>
      `;

      new mapboxgl.Marker({ color: 'red' })
        .setLngLat([location.longitude, location.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(popupHtml))
        .addTo(this.map!);
    });
  }

  /** Devuelve el mapa actual (si existe) */
  public get mapInstance(): Map | undefined {
    return this.map;
  }
  public clearMarkers(): void {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }
  /** Al hacer click en el mapa: borra previos, agrega UN marker y emite {lat,lng} */
  public addMarker(): Observable<mapboxgl.LngLat> {
    return new Observable((observer) => {
      if (!this.map) {
        observer.error('Mapa no inicializado');
        return;
      }

      // Limpia los marcadores existentes y agrega uno nuevo en la posición del click
      const onClick = (e: MapMouseEvent) => {
        this.clearMarkers();
        const marker = new mapboxgl.Marker({ color: 'red' })
          .setLngLat(e.lngLat)
          .addTo(this.map!);

        this.markers.push(marker);
        // Emite las coordenadas del marcador al observador
        observer.next(marker.getLngLat());
      };

      this.map.on('click', onClick);

      // Limpieza al desuscribirse
      return () => {
        this.map?.off('click', onClick);
      };
    });
  }
  /** Mapa solo para visualizar un alojamiento concreto */
  public createReadonlyMap(
    containerId: string,
    opts: { lat: number; lng: number; zoom?: number }
  ): void {
    // Actualizamos el centro con la ubicación del sitio
    this.currentLocation = [opts.lng, opts.lat];

    // Creamos el mapa en ese contenedor
    this.create(containerId);

    if (!this.map) return;

    // Limpiamos marcadores anteriores (por si acaso)
    this.clearMarkers();

    // Agregamos un único marcador en la ubicación del alojamiento
    const marker = new mapboxgl.Marker({ color: 'red' })
      .setLngLat([opts.lng, opts.lat])
      .addTo(this.map);

    this.markers.push(marker);

    // Ajustamos el zoom (por defecto 14)
    if (opts.zoom != null) {
      this.map.setZoom(opts.zoom);
    }
  }

  /** Limpieza al destruir el servicio */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.map) {
      this.map.remove();
      this.map = undefined;
    }
  }
}
