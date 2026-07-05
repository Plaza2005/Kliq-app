import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { Colors } from '../../constants/colors';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGoogleSignIn = async () => {
    setError('');
    const { success, error: err } = await signInWithGoogle();
    if (err) setError(err);
    else if (success) router.replace('/(tabs)/feed');
  };

  const handleSignIn = async () => {
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (err) setError(err.message);
    else router.replace('/(tabs)/feed');
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.appName}>SuperApp</Text>
          <Text style={styles.tagline}>Africa's everything platform</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.btn, loading && { opacity: 0.6 }]}
          onPress={handleSignIn}
          disabled={loading}
        >
          <Text style={styles.btnText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn}>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <Link href="/(auth)/sign-up" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>No account? <Text style={styles.linkAccent}>Sign up</Text></Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flex: 1, justifyContent: 'center', padding: 32 },

  logoWrap: { marginBottom: 48 },
  appName: { color: Colors.text, fontSize: 36, fontFamily: 'PlusJakartaSans_800ExtraBold', letterSpacing: -1, marginBottom: 4 },
  tagline: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },

  error: { color: Colors.danger, marginBottom: 12, fontSize: 13, fontFamily: 'Inter_400Regular' },

  input: {
    backgroundColor: Colors.surfaceAlt, color: Colors.text,
    borderRadius: 12, padding: 16, marginBottom: 10, fontSize: 15,
    borderWidth: 1, borderColor: Colors.border,
    fontFamily: 'Inter_400Regular',
  },

  btn: {
    backgroundColor: Colors.primary, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 6,
    borderWidth: 0,
  },
  btnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'PlusJakartaSans_700Bold' },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { color: Colors.textMuted, marginHorizontal: 12, fontSize: 13, fontFamily: 'SpaceGrotesk_500Medium' },

  googleBtn: {
    backgroundColor: Colors.surfaceElevated, borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  googleBtnText: { color: Colors.text, fontSize: 15, fontFamily: 'PlusJakartaSans_700Bold' },

  linkBtn: { alignItems: 'center', marginTop: 24 },
  linkText: { color: Colors.textMuted, fontSize: 14, fontFamily: 'Inter_400Regular' },
  linkAccent: { color: Colors.primary, fontFamily: 'PlusJakartaSans_700Bold' },
});
