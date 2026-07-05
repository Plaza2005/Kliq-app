import { GestureHandlerRootView } from 'react-native-gesture-handler';
export default function GestureWrapper({ children, style }: { children: React.ReactNode; style?: any }) {
  return <GestureHandlerRootView style={[{ flex: 1 }, style]}>{children}</GestureHandlerRootView>;
}
