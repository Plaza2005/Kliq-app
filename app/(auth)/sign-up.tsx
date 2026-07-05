import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { signInWithGoogle } from '../../lib/googleAuth';
import { Colors } from '../../constants/colors';
import { glowBox, glowText, glowBorder } from '../../constants/fx';

export default function SignUp() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleGoogleSignUp = async () => {
    setError('');
    const { success: ok, error: err } = await signInWithGoogle();
    if (err) setError(err);
    else if (ok) router.replace('/(tabs)/feed');
  };

  const handleSignUp = async () => {
    if (!username.trim()) { setError('Username is required'); return; }
    if (!email.trim()) { setError('Email is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setLoading(true);
    setError('');
    const { error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });
    if (err) setError(err.message);
    else setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 24 }]}>
        <Text style={[styles.successIcon, glowText(Colors.primary)]}>✓</Text>
        <Text style={styles.successTitle}>Check your email</Text>
        <Text style={styles.successSub}>We sent a confirmation link to {email}</Text>
        <View style={{ marginTop: 32, width: '100%' }}>
          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity style={[styles.btn, glowBox(Colors.primary, 8)]}>
              <Text style={[styles.btnText, glowText(Colors.primary)]}>Back to Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.tagline}>Join Africa's everything platform</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput style={[styles.input, glowBorder(Colors.primary)]} placeholder="Username" placeholderTextColor={Colors.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={[styles.input, glowBorder(Colors.primary)]} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <TextInput style={[styles.input, glowBorder(Colors.primary)]} placeholder="Password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.6 }, glowBox(Colors.primary, 8)]} onPress={handleSignUp} disabled={loading}>
          <Text style={[styles.btnText, glowText(Colors.primary)]}>{loading ? 'Creating...' : 'Create Account'}</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.orText}>or</Text>
          <View style={styles.line} />
        </View>

        <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignUp}>
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <Link href="/(auth)/sign-in" asChild>
          <TouchableOpacity style={styles.linkBtn}>
            <Text style={styles.linkText}>Already have an account? <Text style={[styles.linkAccent, glowText(Colors.primary)]}>Sign in</Text></Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '800', marginBottom: 8, letterSpacing: -1 },
  tagline: { color: Colors.textMuted, fontSize: 14, marginBottom: 40 },
  error: { color: Colors.danger, marginBottom: 12, fontSize: 13 },
  input: {
    backgroundColor: Colors.surface, color: Colors.text, borderRadius: 14,
    padding: 16, marginBottom: 12, fontSize: 15,
    borderWidth: 1, borderColor: Colors.border,
  },
  btn: {
    backgroundColor: Colors.primaryGlow, borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: Colors.primary,
  },
  btnText: { color: Colors.primary, fontSize: 16, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  line: { flex: 1, height: 1, backgroundColor: Colors.border },
  orText: { color: Colors.textMuted, marginHorizontal: 12, fontSize: 13 },
  googleBtn: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  googleBtnText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  linkBtn: { alignItems: 'center', marginTop: 24 },
  linkText: { color: Colors.textMuted, fontSize: 14 },
  linkAccent: { color: Colors.primary, fontWeight: '700' },
  successIcon: { color: Colors.primary, fontSize: 64, marginBottom: 16 },
  successTitle: { color: Colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  successSub: { color: Colors.textMuted, textAlign: 'center', fontSize: 14 },
});
