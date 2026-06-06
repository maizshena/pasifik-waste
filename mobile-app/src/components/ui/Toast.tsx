import { useEffect, useRef } from 'react';
import {
  Animated, Text, StyleSheet, TouchableOpacity,
} from 'react-native';

interface Props {
  message: string;
  type:    'success' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(onClose);
  }, []);

  return (
    <Animated.View style={[
      styles.toast,
      { opacity, backgroundColor: type === 'success' ? '#ECFDF5' : '#FEF2F2' },
    ]}>
      <Text style={[
        styles.text,
        { color: type === 'success' ? '#059669' : '#DC2626' },
      ]}>
        {type === 'success' ? '✓' : '✕'}{'  '}{message}
      </Text>
      <TouchableOpacity onPress={onClose}>
        <Text style={{ color: '#9CA3AF', fontSize: 14 }}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position:      'absolute',
    top:           60,
    left:          16,
    right:         16,
    flexDirection: 'row',
    alignItems:    'center',
    justifyContent:'space-between',
    padding:       14,
    borderRadius:  14,
    zIndex:        999,
    shadowColor:   '#000',
    shadowOpacity: 0.08,
    shadowRadius:  8,
    elevation:     4,
  },
  text: { fontSize: 13, fontWeight: '600', flex: 1 },
});