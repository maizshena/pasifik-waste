import {
  TouchableOpacity, Text, ActivityIndicator,
  StyleSheet, ViewStyle, TextStyle,
} from 'react-native';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'soft';
type Size    = 'sm' | 'md' | 'lg' | 'xl';

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: '#73AF6F', text: '#fff'     },
  soft:    { bg: '#ECFDF5', text: '#059669'  },
  outline: { bg: 'transparent', text: '#1a2e1a', border: '#E4EDE3' },
  ghost:   { bg: 'transparent', text: '#4a6b49'  },
  danger:  { bg: '#FEF2F2',     text: '#DC2626', border: '#FECACA' },
};

const SIZES: Record<Size, { px: number; py: number; fontSize: number; radius: number }> = {
  sm: { px: 12, py: 8,  fontSize: 12, radius: 10 },
  md: { px: 16, py: 11, fontSize: 14, radius: 12 },
  lg: { px: 20, py: 14, fontSize: 15, radius: 14 },
  xl: { px: 20, py: 16, fontSize: 16, radius: 16 },
};

interface Props {
  onPress:   () => void;
  children:  string;
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  disabled?: boolean;
  full?:     boolean;
  style?:    ViewStyle;
}

export function Button({
  onPress, children, variant = 'primary', size = 'md',
  loading, disabled, full, style,
}: Props) {
  const v = VARIANTS[variant];
  const s = SIZES[size];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        {
          backgroundColor:  v.bg,
          borderColor:      v.border || 'transparent',
          borderWidth:      v.border ? 1 : 0,
          paddingHorizontal: s.px,
          paddingVertical:  s.py,
          borderRadius:     s.radius,
          alignItems:       'center',
          justifyContent:   'center',
          flexDirection:    'row',
          gap:              8,
          opacity:          disabled || loading ? 0.5 : 1,
          alignSelf:        full ? 'stretch' : 'auto',
        },
        style,
      ]}
    >
      {loading && (
        <ActivityIndicator size="small" color={v.text} />
      )}
      <Text style={{ color: v.text, fontSize: s.fontSize, fontWeight: '600' }}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}