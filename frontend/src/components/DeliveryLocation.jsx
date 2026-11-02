import { lazy, Suspense, useState } from "react";

const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const GoogleMapReact = lazy(() => import("google-map-react"));

function LocationMarker() {
    return <span className="delivery-location-marker" aria-label="Selected location">●</span>;
}

export default function DeliveryLocation({
    location,
    onLocationChange,
    shareLocation,
    onShareLocationChange
}) {
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function requestLocation() {
        setError("");

        if (!navigator.geolocation) {
            setError("Location is not available in this browser.");
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                onLocationChange({
                    lat: coords.latitude,
                    lng: coords.longitude,
                });
                onShareLocationChange(false);
                setLoading(false);
            },
            (locationError) => {
                setError(
                    locationError.code === locationError.PERMISSION_DENIED
                        ? "Location permission was denied. You can continue checkout without sharing your location."
                        : locationError.code === locationError.POSITION_UNAVAILABLE
                            ? "Your location is currently unavailable. Please try again or continue checkout."
                            : "Location could not be determined. Please try again or continue checkout."
                );
                setLoading(false);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
        );
    }

    return (
        <section className="delivery-location" aria-labelledby="delivery-location-title">
            <h3 id="delivery-location-title">Delivery location (optional)</h3>
            <p>Your location is optional. It is not sent with your order unless you explicitly agree below.</p>
            <button type="button" className="admin-secondary" onClick={requestLocation} disabled={loading}>
                {loading ? "Finding location…" : location ? "Update my location" : "Use my current location"}
            </button>
            {error && <p className="delivery-location-error" role="alert">{error}</p>}
            {location && (
                <>
                    {mapsApiKey ? (
                        <div className="delivery-map" aria-label="Map showing your selected location">
                            <Suspense fallback={<p>Loading map…</p>}>
                                <GoogleMapReact
                                    bootstrapURLKeys={{ key: mapsApiKey }}
                                    center={location}
                                    zoom={14}
                                >
                                    <LocationMarker lat={location.lat} lng={location.lng} />
                                </GoogleMapReact>
                            </Suspense>
                        </div>
                    ) : (
                        <p>
                            Map display is not configured.{" "}
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`}
                                target="_blank"
                                rel="noreferrer"
                            >
                                View this location in Google Maps
                            </a>
                        </p>
                    )}
                    <label className="delivery-location-consent">
                        <input
                            type="checkbox"
                            checked={shareLocation}
                            onChange={(event) => onShareLocationChange(event.target.checked)}
                        />
                        <span>
                            I agree to include these exact coordinates with my order for delivery.
                            Authorized store administrators can view them.
                        </span>
                    </label>
                    <button
                        type="button"
                        className="delivery-location-clear"
                        onClick={() => {
                            onLocationChange(null);
                            onShareLocationChange(false);
                        }}
                    >
                        Clear location
                    </button>
                </>
            )}
        </section>
    );
}
