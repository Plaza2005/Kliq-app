import * as WebBrowser from 'expo-web-browser';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from './supabase';

const redirectTo = makeRedirectUri();

async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const { access_token, refresh_token } = params;
  if (!access_token) return false;
  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
  return true;
}

/** Signs in (or signs up, if no account exists yet) via Google OAuth. */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  const { data, error: err } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (err) return { success: false, error: err.message };
  if (!data?.url) return { success: false, error: 'No auth URL returned' };

  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return { success: false };

  try {
    const success = await createSessionFromUrl(res.url);
    return { success };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Google sign-in failed' };
  }
}
