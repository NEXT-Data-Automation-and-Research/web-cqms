/**
 * Authentication Check Module
 * Protects all pages from unauthorized access
 * Ensures users must be logged in to access the system
 * Enhanced with Supabase integration
 */

// Legacy CQMS: show warning and redirect all visitors to the new version
(function () {
  var REDIRECT_URL = "https://cqms-v2.vercel.app/settings/scorecards";
  var DELAY_MS = 2500;
  function showWarningAndRedirect() {
    var root = document.body || document.documentElement;
    var overlay = document.createElement("div");
    overlay.id = "legacy-cqms-warning";
    overlay.setAttribute("role", "alert");
    overlay.innerHTML =
      '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;box-sizing:border-box;">' +
      '<p style="font-size:1.5rem;margin-bottom:0.75rem;font-weight:600;">You are viewing the older version of CQMS</p>' +
      '<p style="margin-bottom:1.5rem;opacity:0.9;">Redirecting you to the new version...</p>' +
      '<p style="font-size:0.9rem;opacity:0.8;"><a href="' + REDIRECT_URL + '" style="color:#4ade80;">Click here if you are not redirected</a></p>' +
      "</div>";
    root.appendChild(overlay);
    if (document.body) document.body.style.overflow = "hidden";
    setTimeout(function () {
      window.location.replace(REDIRECT_URL);
    }, DELAY_MS);
  }
  if (document.body) {
    showWarningAndRedirect();
  } else {
    document.addEventListener("DOMContentLoaded", showWarningAndRedirect);
  }
})();

class AuthChecker {
  constructor() {
    this.STORAGE_KEY = "userInfo"
    this.LOGIN_PAGE = "login.html"
    this.INDEX_PAGE = "index.html"
    this.isRedirecting = false
    this.supabaseClient = null
  }

  /**
   * Initialize Supabase client
   */
  initSupabase() {
    if (window.supabaseClient) {
      this.supabaseClient = window.supabaseClient
      return true
    }
    return false
  }

  /**
   * Check if user is authenticated
   * @returns {Object|null} User data if authenticated, null otherwise
   */
  async checkAuthentication() {
    try {
      // First check Supabase authentication
      if (this.initSupabase()) {
        const authUser = await window.SupabaseAuth.getCurrentUser()
        if (authUser) {
          // Get user data from our users table
          const userData = await window.SupabaseUsers.getUserByEmail(authUser.email)
          
          if (userData) {
            // Update last login
            await window.SupabaseUsers.updateLastLogin(userData.email)
            
            // Update avatar URL from Google if available and not already set
            if (authUser.user_metadata?.avatar_url && !userData.avatar_url) {
              try {
                await window.SupabaseUsers.updateUser(userData.email, {
                  avatar_url: authUser.user_metadata.avatar_url
                })
                userData.avatar_url = authUser.user_metadata.avatar_url
              } catch (error) {
                console.warn('Failed to update avatar URL:', error)
              }
            }
            
            // Store user info in localStorage for compatibility
            const userInfo = {
              id: userData.email, // Use email as ID since it's the primary key
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar_url,
              role: userData.role,
              department: userData.department,
              designation: userData.designation,
              employee_id: userData.employee_id,
              permissions: userData.permissions,
              provider: 'supabase',
              is_active: userData.is_active
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userInfo))
            return userInfo
          } else {
            // User exists in Supabase Auth but not in our users table
            console.warn('User authenticated but not found in users table:', authUser.email)
            return null
          }
        }
      }

      // Fallback to localStorage check for backward compatibility
      const userInfo = localStorage.getItem(this.STORAGE_KEY)

      if (!userInfo) {
        return null
      }

      const user = JSON.parse(userInfo)

      // Validate user data structure
      if (!user || typeof user !== "object") {
        return null
      }

      // Check if user has required fields
      if (!user.email || !user.name) {
        return null
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(user.email)) {
        return null
      }

      // Email domain check removed - all emails allowed
      return user
    } catch (error) {
      console.error('Error checking authentication:', error)
      return null
    }
  }

  /**
   * Clear invalid user data from cache
   */
  clearInvalidCache() {
    try {
      localStorage.removeItem(this.STORAGE_KEY)
    } catch (error) {
      console.error('Error clearing cache:', error)
    }
  }

  /**
   * Redirect to login page
   */
  redirectToLogin() {
    if (this.isRedirecting) return

    this.isRedirecting = true

    try {
      window.location.href = this.LOGIN_PAGE
    } catch (error) {
      console.error('Error redirecting to login:', error)
      window.location.replace(this.LOGIN_PAGE)
    }
  }

  /**
   * Check if current page should be protected
   * @returns {boolean} True if page should be protected
   */
  shouldProtectPage() {
    const currentPage = window.location.pathname.split("/").pop()
    const unprotectedPages = [this.LOGIN_PAGE, this.INDEX_PAGE]

    return !unprotectedPages.includes(currentPage)
  }

  /**
   * Initialize authentication check
   */
  async init() {
    // Only protect pages that need authentication
    if (!this.shouldProtectPage()) {
      return
    }

    const user = await this.checkAuthentication()

    if (!user) {
      // Clear any invalid cached data
      this.clearInvalidCache()
      // Redirect to login
      this.redirectToLogin()
    }
  }

  /**
   * Logout user and redirect to login
   */
  async logout() {
    try {
      // Try Supabase logout first
      if (this.initSupabase()) {
        await window.SupabaseAuth.signOut()
      } else {
        // Fallback to localStorage cleanup
        localStorage.removeItem(this.STORAGE_KEY)
      }
      
      this.redirectToLogin()
    } catch (error) {
      console.error('Error during logout:', error)
      // Fallback to localStorage cleanup
      localStorage.removeItem(this.STORAGE_KEY)
      this.redirectToLogin()
    }
  }

  /**
   * Sign in with Google using Supabase
   */
  async signInWithGoogle() {
    try {
      if (!this.initSupabase()) {
        throw new Error('Supabase client not initialized')
      }
      
      const result = await window.SupabaseAuth.signInWithGoogle()
      return result
    } catch (error) {
      console.error('Google sign-in error:', error)
      throw error
    }
  }

  /**
   * Listen to authentication state changes
   */
  setupAuthListener() {
    if (!this.initSupabase()) {
      return
    }

    window.SupabaseAuth.onAuthStateChange(async (event, session) => {
      // Only log significant auth state changes
      if (event !== 'INITIAL_SESSION') {
        console.log('Auth state changed:', event, session)
      }
      
      if (event === 'SIGNED_IN' && session) {
        // User signed in - get data from users table
        try {
          const userData = await window.SupabaseUsers.getUserByEmail(session.user.email)
          
          if (userData) {
            // Update last login
            await window.SupabaseUsers.updateLastLogin(userData.email)
            
            // Update avatar URL from Google if available and not already set
            if (session.user.user_metadata?.avatar_url && !userData.avatar_url) {
              try {
                await window.SupabaseUsers.updateUser(userData.email, {
                  avatar_url: session.user.user_metadata.avatar_url
                })
                userData.avatar_url = session.user.user_metadata.avatar_url
              } catch (error) {
                console.warn('Failed to update avatar URL:', error)
              }
            }
            
            // Store user info in localStorage
            const userInfo = {
              id: userData.email, // Use email as ID since it's the primary key
              email: userData.email,
              name: userData.name,
              avatar: userData.avatar_url,
              role: userData.role,
              department: userData.department,
              designation: userData.designation,
              employee_id: userData.employee_id,
              permissions: userData.permissions,
              provider: 'supabase',
              is_active: userData.is_active
            }
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(userInfo))
          } else {
            console.warn('User authenticated but not found in users table:', session.user.email)
            localStorage.removeItem(this.STORAGE_KEY)
          }
        } catch (error) {
          console.error('Error processing sign-in:', error)
          localStorage.removeItem(this.STORAGE_KEY)
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        localStorage.removeItem(this.STORAGE_KEY)
        if (this.shouldProtectPage()) {
          this.redirectToLogin()
        }
      }
    })
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", async () => {
    const authChecker = new AuthChecker()
    await authChecker.init()
    authChecker.setupAuthListener()
  })
} else {
  const authChecker = new AuthChecker()
  authChecker.init().then(() => {
    authChecker.setupAuthListener()
  })
}

// Make AuthChecker globally available for logout functionality
window.AuthChecker = AuthChecker
