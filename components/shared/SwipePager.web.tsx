import React from 'react';
import { View } from 'react-native';

interface Props {
  page?: number;
  initialPage?: number;
  onPageSelected?: (index: number) => void;
  children: React.ReactNode[];
  style?: any;
  pagerRef?: any;
}

// Keep all screens mounted — just hide inactive ones so state is preserved on tab switch
export default function SwipePager({ page, initialPage = 0, children, style }: Props) {
  const active = page ?? initialPage;
  return (
    <View style={[{ flex: 1 }, style]}>
      {React.Children.toArray(children).map((child, i) => (
        <View key={i} style={{ flex: 1, display: i === active ? 'flex' : 'none' }}>
          {child}
        </View>
      ))}
    </View>
  );
}

export function usePagerRef() {
  return { current: { setPage: (_: number) => {} } };
}
