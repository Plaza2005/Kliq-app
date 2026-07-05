import { View } from 'react-native';
export default function GestureWrapper({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}
