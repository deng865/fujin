import { useLoadScript } from "@react-google-maps/api";

const libraries: ("places" | "geometry")[] = ["places", "geometry"];

export function useGoogleMaps() {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  return { isLoaded, loadError };
}

export async function calculateDistance(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<{ distance: number; duration: number } | null> {
  if (!window.google?.maps) return null;

  const service = new google.maps.DistanceMatrixService();
  
  try {
    const response = await service.getDistanceMatrix({
      origins: [new google.maps.LatLng(origin.lat, origin.lng)],
      destinations: [new google.maps.LatLng(destination.lat, destination.lng)],
      travelMode: google.maps.TravelMode.DRIVING,
    });

    const result = response.rows[0]?.elements[0];
    if (result?.status === "OK") {
      return {
        distance: result.distance?.value || 0, // meters
        duration: result.duration?.value || 0, // seconds
      };
    }
  } catch (error) {
    console.error("Distance calculation error:", error);
  }
  
  return null;
}
