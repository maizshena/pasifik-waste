import MapView, { Marker } from 'react-native-maps';
import { StyleSheet }       from 'react-native';

interface Props {
  lat:     number | null;
  lng:     number | null;
  onChange:(lat: number, lng: number) => void;
}

export function MapPicker({ lat, lng, onChange }: Props) {
  return (
    <MapView
      style={styles.map}
      initialRegion={{
        latitude:       lat ?? -6.2088,
        longitude:      lng ?? 106.8456,
        latitudeDelta:  0.01,
        longitudeDelta: 0.01,
      }}
      region={lat && lng ? {
        latitude:       lat,
        longitude:      lng,
        latitudeDelta:  0.01,
        longitudeDelta: 0.01,
      } : undefined}
      onPress={(e) => {
        const { latitude, longitude } = e.nativeEvent.coordinate;
        onChange(latitude, longitude);
      }}
      showsUserLocation
    >
      {lat && lng && (
        <Marker
          coordinate={{ latitude: lat, longitude: lng }}
          draggable
          onDragEnd={(e) => {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            onChange(latitude, longitude);
          }}
        />
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', height: 200, borderRadius: 14, marginTop: 8 },
});