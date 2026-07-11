import { View, Text, StyleSheet } from 'react-native';

interface Props {
  lat:     number | null;
  lng:     number | null;
  onChange:(lat: number, lng: number) => void;
}

export function MapPicker({ lat, lng }: Props) {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.text}>
        {lat && lng
          ? `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : 'Map not available on web. Use GPS detect.'
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    width: '100%', height: 80, borderRadius: 14, marginTop: 8,
    backgroundColor: '#F0F7EF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E4EDE3', borderStyle: 'dashed',
  },
  text: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', paddingHorizontal: 16 },
});