declare module "leaflet" {
  export type LatLngTuple = [number, number, number?];
  export type LatLngExpression =
    | LatLngTuple
    | { lat: number; lng: number; alt?: number };
  export type LatLngBoundsExpression = [LatLngExpression, LatLngExpression];

  export type FitBoundsOptions = Record<string, unknown>;

  export type MapOptions = {
    center?: LatLngExpression;
    zoom?: number;
    scrollWheelZoom?: boolean;
  };

  export type TileLayerOptions = {
    attribution?: string;
  };

  export type MarkerOptions = {
    icon?: DivIcon;
  };

  export type PopupOptions = Record<string, unknown>;

  export type DivIconOptions = {
    className?: string;
    html?: string | HTMLElement;
    iconSize?: [number, number];
    iconAnchor?: [number, number];
    popupAnchor?: [number, number];
  };

  export class DivIcon {
    constructor(options?: DivIconOptions);
  }

  export class Map {}

  export class TileLayer {}

  export class Marker<T = unknown> {
    readonly markerType?: T;
  }

  export class Popup {}
}
