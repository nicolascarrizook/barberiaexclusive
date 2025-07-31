import { supabase } from '@/lib/supabase';

/**
 * Authentication debugging utilities
 * Only available in development mode
 */
export class AuthDebugger {
  private isDevelopment = import.meta.env.DEV;

  /**
   * Log current authentication state
   */
  async logAuthState() {
    if (!this.isDevelopment) return;

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.group('🔐 Authentication State');
      
      if (error) {
        console.error('Session Error:', error);
      }
      
      if (session) {
        console.log('Session:', {
          user_id: session.user.id,
          email: session.user.email,
          expires_at: new Date(session.expires_at! * 1000).toLocaleString(),
          expires_in: Math.floor((session.expires_at! * 1000 - Date.now()) / 1000 / 60) + ' minutes',
        });
        
        console.log('User Metadata:', {
          user_metadata: session.user.user_metadata,
          app_metadata: session.user.app_metadata,
          role: session.user.role,
        });
        
        console.log('Token Info:', {
          access_token: session.access_token ? `${session.access_token.substring(0, 20)}...` : 'None',
          refresh_token: session.refresh_token ? `${session.refresh_token.substring(0, 20)}...` : 'None',
        });
      } else {
        console.log('No active session');
      }
      
      // Check localStorage
      console.log('LocalStorage Keys:', this.getAuthStorageKeys());
      
      // Check cached profile
      const profileKeys = Object.keys(localStorage).filter(key => key.startsWith('barber_profile_'));
      if (profileKeys.length > 0) {
        console.log('Cached Profiles:');
        profileKeys.forEach(key => {
          try {
            const cached = JSON.parse(localStorage.getItem(key) || '{}');
            console.log(`  ${key}:`, {
              role: cached.profile?.role,
              cached_at: cached.timestamp ? new Date(cached.timestamp).toLocaleString() : 'Unknown',
              age_minutes: cached.timestamp ? Math.floor((Date.now() - cached.timestamp) / 1000 / 60) : 'Unknown'
            });
          } catch (e) {
            console.error(`  Error parsing ${key}:`, e);
          }
        });
      }
      
      console.groupEnd();
    } catch (error) {
      console.error('Error in authDebugger:', error);
    }
  }

  /**
   * Get all auth-related localStorage keys
   */
  private getAuthStorageKeys() {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('barber_profile')
    );
    
    return authKeys.map(key => {
      const value = localStorage.getItem(key);
      let preview = value ? value.substring(0, 50) : 'null';
      if (value && value.length > 50) preview += '...';
      
      return {
        key,
        size: value ? value.length : 0,
        preview
      };
    });
  }

  /**
   * Clear all auth-related storage
   */
  async clearAuthStorage() {
    if (!this.isDevelopment) return;
    
    console.warn('🧹 Clearing all auth storage...');
    
    // Clear Supabase session
    await supabase.auth.signOut();
    
    // Clear localStorage auth keys
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') || 
      key.includes('barber_profile')
    );
    
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`  Removed: ${key}`);
    });
    
    console.log('✅ Auth storage cleared. Reload the page to restart.');
  }

  /**
   * Attempt to recover from broken auth state
   */
  async recoverAuthState() {
    if (!this.isDevelopment) return;
    
    console.log('🔧 Attempting auth recovery...');
    
    try {
      // First, refresh the session
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Failed to refresh session:', error);
        console.log('Try clearing auth storage and logging in again.');
        return false;
      }
      
      if (data.session) {
        console.log('✅ Session refreshed successfully');
        
        // Try to reload profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .maybeSingle();
          
        if (profile) {
          console.log('✅ Profile reloaded:', {
            id: profile.id,
            role: profile.role,
            email: profile.email
          });
          
          // Cache the profile
          const cacheKey = `barber_profile_${profile.id}`;
          localStorage.setItem(cacheKey, JSON.stringify({
            profile,
            timestamp: Date.now()
          }));
          
          console.log('✅ Profile cached');
        }
        
        console.log('🎉 Auth recovery complete. Reload the page.');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Recovery failed:', error);
      return false;
    }
  }

  /**
   * Force refresh the current session
   */
  async forceRefreshSession() {
    if (!this.isDevelopment) return;
    
    console.log('🔄 Force refreshing session...');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Refresh failed:', error);
        return null;
      }
      
      console.log('✅ Session refreshed');
      return data.session;
    } catch (error) {
      console.error('Refresh error:', error);
      return null;
    }
  }

  /**
   * Get detailed debug info as an object
   */
  async getDebugInfo() {
    if (!this.isDevelopment) return null;
    
    const { data: { session } } = await supabase.auth.getSession();
    const storageKeys = this.getAuthStorageKeys();
    const profileKeys = Object.keys(localStorage).filter(key => key.startsWith('barber_profile_'));
    
    return {
      timestamp: new Date().toISOString(),
      session: session ? {
        userId: session.user.id,
        email: session.user.email,
        expiresAt: new Date(session.expires_at! * 1000).toISOString(),
        role: session.user.role,
        userMetadataRole: session.user.user_metadata?.role,
        appMetadataRole: session.user.app_metadata?.role,
      } : null,
      localStorage: {
        authKeys: storageKeys,
        profileCacheCount: profileKeys.length,
      },
      browser: {
        userAgent: navigator.userAgent,
        cookiesEnabled: navigator.cookieEnabled,
        localStorageAvailable: typeof Storage !== 'undefined',
      }
    };
  }
}

// Export singleton instance
export const authDebugger = new AuthDebugger();

// In development, expose to window for easy console access
if (import.meta.env.DEV) {
  (window as any).authDebugger = authDebugger;
  console.log('🔐 Auth debugger available at window.authDebugger');
}