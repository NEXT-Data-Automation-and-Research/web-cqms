/**
 * Sidebar Loader
 * Dynamically loads the sidebar from sidebar.html into all pages
 * This ensures sidebar changes only need to be made in one file
 */

class SidebarLoader {
  constructor() {
    this.sidebarContainer = null
    this.isLoaded = false
    this.notificationUpdateIntervals = {
      reversals: null,
      employeeReversals: null,
      acknowledgments: null
    }
    // Cache duration: 5 minutes (same as audit-reports.html)
    this.CACHE_DURATION_MS = 5 * 60 * 1000
    // Update interval: 5 minutes
    this.UPDATE_INTERVAL_MS = 5 * 60 * 1000
  }

  /**
   * Initialize the sidebar loader
   */
  init() {
    // Only load sidebar on pages that should have it (not login or index)
    const currentPage = window.location.pathname.split("/").pop()
    const pagesWithoutSidebar = ["login.html", "index.html"]

    if (pagesWithoutSidebar.includes(currentPage)) {
      return
    }

    this.loadSidebar()
  }

  /**
   * Load the sidebar from sidebar.html
   */
  async loadSidebar() {
    try {
      // Check if sidebar is already loaded
      if (this.isLoaded) {
        return
      }

       let sidebarHTML = ""
       let usingFallback = false

       // Check if we're running from file:// protocol (local files)
       const isFileProtocol = window.location.protocol === 'file:'
       
       if (isFileProtocol) {
         // Skip fetch for file:// protocol and use embedded fallback directly
         sidebarHTML = this.getEmbeddedSidebarHTML()
         usingFallback = true
       } else {
         try {
           // Try to fetch the sidebar HTML
           const response = await fetch("sidebar.html")
           
           if (!response.ok) {
             throw new Error(`Failed to load sidebar: ${response.status} ${response.statusText}`)
           }
           sidebarHTML = await response.text()
         } catch (fetchError) {
           // Failed to fetch sidebar.html, using embedded fallback
           sidebarHTML = this.getEmbeddedSidebarHTML()
           usingFallback = true
         }
       }

      // Create a temporary container to parse the HTML
      const tempDiv = document.createElement("div")
      tempDiv.innerHTML = sidebarHTML

      // Extract the sidebar nav element
      const sidebarNav = tempDiv.querySelector("nav.sidebar")
      if (!sidebarNav) {
        throw new Error("Sidebar nav element not found")
      }

      // Restore saved sidebar state BEFORE inserting into DOM
      const savedState = this.getSidebarState()
      const isExpanded = savedState === "expanded"

      if (isExpanded) {
        sidebarNav.classList.remove("collapsed")
      } else {
        sidebarNav.classList.add("collapsed")
      }

      // Insert the sidebar at the beginning of body
      document.body.insertBefore(sidebarNav, document.body.firstChild)

      // Add a visual indicator if using fallback
      if (usingFallback) {
        // Sidebar loaded using embedded fallback - sidebar.html may not be accessible
        // You could add a small indicator here if needed
      }

      this.isLoaded = true
      
      // Dispatch custom event when sidebar is loaded
      const sidebarLoadedEvent = new CustomEvent('sidebarLoaded', {
        detail: { usingFallback }
      })
      document.dispatchEvent(sidebarLoadedEvent)

      // Enable transitions after a brief moment to prevent flash
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          sidebarNav.classList.add("sidebar-ready")
        })
      })

      // Initialize sidebar functionality after loading
      this.initializeSidebarFunctionality()
      
      // Hide menu items for employees
      this.hideEmployeeMenuItems()
      
      // Show/hide Access Control menu item based on role
      this.updateAccessControlMenuItem()
      
      // Load notification counts from cache first (fast), then update from database
      this.loadNotificationCountsFromCache()
      
      // Load pending reversals count (for auditors) - will update cache
      this.updatePendingReversalsCount()
      
      // Load employee reversal updates count (for employees) - will update cache
      this.updateEmployeeReversalUpdatesCount()
      
      // Load pending acknowledgments count - will update cache
      this.updatePendingAcknowledgmentsCount()
      
      // Set up intervals to update counts periodically
      this.setupNotificationUpdateIntervals()
    } catch (error) {
      // Error loading sidebar
      // Fallback: show a message or use existing sidebar
      this.showSidebarError()
    }
  }

  /**
   * Get embedded sidebar HTML as fallback
   */
  getEmbeddedSidebarHTML() {
    return `<!-- Sidebar Component -->
<nav class="sidebar collapsed" role="navigation" aria-label="Main navigation">
    <!-- Sidebar Header -->
    <div class="sidebar-header">
        <div class="sidebar-header-top">
            <button class="sidebar-brand-btn" role="button" tabindex="0" aria-label="NEXT CQMS">
                <div class="brand-content-wrapper">
                    <svg class="brand-icon" viewBox="0 -960 960 960" fill="currentColor" aria-hidden="true">
                        <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm491-80h69v-69l-69 69Zm-457 0h73l120-120h85L452-200h64l120-120h85L541-200h65l120-120h34v-440H200v509l69-69h85L434-200Zm72-200-56-56 177-177 80 80 147-147 56 56-203 204-80-80-121 120Z"/>
                    </svg>
                    <div class="brand-text-row">
                        <span class="brand-text">NEXT CQMS</span>
                        <span class="beta-chip">beta</span>
                    </div>
                </div>
                <div class="brand-version-container">
                    <span class="brand-version">v1.0.0</span>
                </div>
            </button>
        </div>
    </div>
    
    <!-- Main Navigation Menu -->
    <ul class="menu-items" role="menubar">
        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Search" id="search-menu-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <span>Search</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Home">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
                </svg>
                <span>Home</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Auditor's Dashboard">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
                </svg>
                <span>Auditors' Dashboard</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Audit Distribution">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/>
                </svg>
                <span>Audit Distribution</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Create New Audit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                </svg>
                <span>Create Audit</span>
            </button>
        </li>

        <li role="none">
            <a href="audit-reports.html" class="menu-item" role="menuitem" tabindex="0" aria-label="Audit Reports">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <span>Audit Reports</span>
                <span class="notification-badge" id="acknowledgmentNotificationBadge" style="display: none;">0</span>
            </a>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Performance">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <span>Performance</span>
                <span class="coming-soon-chip">Upcoming</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Coaching & Remediation">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
                <span>Coaching & Remediation</span>
                <span class="coming-soon-chip">Upcoming</span>
            </button>
        </li>

        <li role="none">
            <button class="menu-item" role="menuitem" tabindex="0" aria-label="Reversal Management">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                <span>Reversal Management</span>
                <span class="notification-badge" id="reversalNotificationBadge" style="display: none;">0</span>
                <span class="notification-badge" id="employeeReversalNotificationBadge" style="display: none;">0</span>
            </button>
        </li>

        <li role="none">
            <a href="event-management.html" class="menu-item" role="menuitem" tabindex="0" aria-label="Event Management">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                </svg>
                <span>Event Management</span>
                <span class="new-chip">New</span>
            </a>
        </li>

        <li role="none" class="menu-item-with-submenu">
            <button class="menu-item has-submenu" role="menuitem" tabindex="0" aria-label="Improvement Corner" aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                </svg>
                <span>Improvement Corner</span>
                <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <ul class="submenu" role="menu">
                <li role="none">
                    <a class="submenu-item" href="calibration.html" role="menuitem" tabindex="-1">
                        <span>Calibration</span>
                    </a>
                </li>
                <li role="none">
                    <a class="submenu-item" href="ata.html" role="menuitem" tabindex="-1">
                        <span>ATA</span>
                    </a>
                </li>
                <li role="none">
                    <a class="submenu-item" href="grading-guide.html" role="menuitem" tabindex="-1">
                        <span>Grading Guide</span>
                    </a>
                </li>
            </ul>
        </li>

        <li role="none" class="menu-item-with-submenu">
            <button class="menu-item has-submenu" role="menuitem" tabindex="0" aria-label="Settings" aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <span>Settings</span>
                <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <ul class="submenu" role="menu">
                <li role="none">
                    <a class="submenu-item" href="scorecards.html" role="menuitem" tabindex="-1">
                        <span>Scorecards</span>
                    </a>
                </li>
                <li role="none">
                    <a class="submenu-item" href="user-management.html" role="menuitem" tabindex="-1">
                        <span>User Management</span>
                    </a>
                </li>
                <li role="none" id="accessControlMenuItem" style="display: none;">
                    <a class="submenu-item" href="access-control.html" role="menuitem" tabindex="-1">
                        <span>Access Control</span>
                    </a>
                </li>
                <li role="none">
                    <a class="submenu-item" href="profile.html" role="menuitem" tabindex="-1">
                        <span>Profile</span>
                    </a>
                </li>
            </ul>
        </li>

        <li role="none" class="menu-item-with-submenu">
            <button class="menu-item has-submenu" role="menuitem" tabindex="0" aria-label="Help" aria-expanded="false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span>Help</span>
                <svg class="submenu-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <ul class="submenu" role="menu">
                <li role="none">
                    <a class="submenu-item" href="help.html" role="menuitem" tabindex="-1">
                        <span>Help</span>
                    </a>
                </li>
                <li role="none">
                    <a class="submenu-item" href="bug-report.html" role="menuitem" tabindex="-1">
                        <span>Report a Bug</span>
                    </a>
                </li>
                <li role="none">
                    <a class="submenu-item" href="bug-reports-view.html" role="menuitem" tabindex="-1">
                        <span>View Bug Reports</span>
                    </a>
                </li>
            </ul>
        </li>
    </ul>

    <!-- User Profile Section at Bottom -->
    <div class="user-profile-section">
        <div class="user-profile" role="button" tabindex="0" aria-label="User Profile">
            <div class="user-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
            </div>
            <div class="user-info">
                <div class="user-name">Loading...</div>
                <div class="user-email">Loading...</div>
            </div>
        </div>
        
        <!-- Logout Link -->
        <div class="profile-links">
            <a href="#" class="profile-link logout-link">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" fill="currentColor">
                    <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/>
                </svg>
                <span>Logout</span>
            </a>
        </div>
    </div>
</nav>`
  }

  /**
   * Initialize sidebar functionality (toggle, user info, etc.)
   */
  initializeSidebarFunctionality() {
    // Initialize sidebar toggle functionality
    this.initSidebarToggle()

    // Initialize brand button navigation
    this.initBrandButton()

    // Initialize user profile functionality
    this.initUserProfile()

    // Initialize menu item navigation
    this.initMenuNavigation()

    // Initialize submenu toggle functionality
    this.initSubmenuToggle()

    // Set active menu item based on current page
    this.setActiveMenuItem()
  }

  /**
   * Get sidebar state from localStorage
   */
  getSidebarState() {
    try {
      return localStorage.getItem("sidebarState") || "collapsed"
    } catch (error) {
      // Error reading sidebar state
      return "collapsed"
    }
  }

  /**
   * Save sidebar state to localStorage
   */
  saveSidebarState(state) {
    try {
      localStorage.setItem("sidebarState", state)
    } catch (error) {
      // Error saving sidebar state
    }
  }

  /**
   * Initialize sidebar toggle functionality
   * Note: Sidebar now uses hover functionality, no manual toggle needed
   */
  initSidebarToggle() {
    // Sidebar expansion/collapse is now handled purely by CSS hover
    // No event listeners needed
  }

  /**
   * Initialize brand button navigation
   */
  initBrandButton() {
    const brandBtn = document.querySelector(".sidebar-brand-btn")
    if (!brandBtn) return

    brandBtn.addEventListener("click", () => {
      // Navigate to home page
      const currentPage = window.location.pathname.split("/").pop()
      if (currentPage !== "home.html") {
        window.location.href = "home.html"
      }
    })

    // Handle keyboard navigation
    brandBtn.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        const currentPage = window.location.pathname.split("/").pop()
        if (currentPage !== "home.html") {
          window.location.href = "home.html"
        }
      }
    })
  }

  /**
   * Initialize user profile functionality
   */
  initUserProfile() {
    // Load user info from localStorage if available
    const userInfo = this.getUserInfo()
    if (userInfo) {
      this.updateUserProfile(userInfo)
    }

    // Initialize user profile click handler
    this.initUserProfileClick()

    // Initialize logout functionality
    this.initLogout()
  }

  /**
   * Get user info from localStorage
   */
  getUserInfo() {
    try {
      const userInfo = localStorage.getItem("userInfo")
      if (!userInfo) return null
      
      const parsedUserInfo = JSON.parse(userInfo)
      
      // Migration: If user has 'picture' field but no 'avatar', copy it over
      if (parsedUserInfo && parsedUserInfo.picture && !parsedUserInfo.avatar) {
        parsedUserInfo.avatar = parsedUserInfo.picture
        localStorage.setItem("userInfo", JSON.stringify(parsedUserInfo))
      }
      
      return parsedUserInfo
    } catch (error) {
      // Error loading user info
      return null
    }
  }


  /**
   * Update user profile display
   */
  updateUserProfile(userInfo) {
    if (!userInfo) return

    // Update user name
    const userNameElement = document.querySelector(".user-name")
    if (userNameElement && userInfo.name) {
      userNameElement.textContent = userInfo.name
    }

    // Update user email
    const userEmailElement = document.querySelector(".user-email")
    if (userEmailElement && userInfo.email) {
      userEmailElement.textContent = userInfo.email
    }

    // Update user avatar/profile picture
    const userAvatarElement = document.querySelector(".user-avatar")
    if (userAvatarElement && (userInfo.avatar || userInfo.picture)) {
      // Use either avatar or picture field (for backward compatibility)
      const profilePicture = userInfo.avatar || userInfo.picture
      // Replace the SVG icon with the user's profile picture
      userAvatarElement.innerHTML = `<img src="${profilePicture}" alt="Profile Picture" class="profile-picture" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`
    } else if (userAvatarElement && userInfo.name) {
      // If no picture, create initials from name
      const initials = userInfo.name.split(' ').map(name => name.charAt(0)).join('').toUpperCase()
      userAvatarElement.innerHTML = `<div class="profile-initials" style="width: 100%; height: 100%; border-radius: 50%; background-color: var(--primary-color); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.875rem;">${initials}</div>`
    }

    // Add role and department info if available
    if (userInfo.role || userInfo.department) {
      const userEmailElement = document.querySelector(".user-email")
      if (userEmailElement) {
        let additionalInfo = []
        if (userInfo.role) additionalInfo.push(userInfo.role)
        if (userInfo.department) additionalInfo.push(userInfo.department)
        
        // Create a small info element below email
        let infoElement = document.querySelector(".user-info-extra")
        if (!infoElement) {
          infoElement = document.createElement("div")
          infoElement.className = "user-info-extra"
          infoElement.style.cssText = "font-size: 0.6875rem; color: rgba(255, 255, 255, 0.7); margin-top: 0.125rem;"
          userEmailElement.parentNode.insertBefore(infoElement, userEmailElement.nextSibling)
        }
        infoElement.textContent = additionalInfo.join(" • ")
      }
    }
  }

  /**
   * Initialize user profile click handler
   */
  initUserProfileClick() {
    const userProfile = document.querySelector(".user-profile")
    if (!userProfile) return

    userProfile.addEventListener("click", () => {
      window.location.href = "profile.html"
    })

    // Also handle keyboard navigation
    userProfile.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        window.location.href = "profile.html"
      }
    })
  }

  /**
   * Initialize logout functionality
   */
  initLogout() {
    // Wait for confirmation dialog to be available
    const initLogoutWithDelay = () => {
      const logoutBtn = document.querySelector(".logout-link")
      if (!logoutBtn) {
        // Logout button not found
        return
      }


      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault()
        
        // Show modern confirmation dialog
        if (window.confirmationDialog) {
          const confirmed = await window.confirmationDialog.show({
            title: "Logout Confirmation",
            message: "Are you sure you want to logout? You will need to sign in again to access your account.",
            confirmText: "Logout",
            cancelText: "Cancel",
            type: "error",
          })

          if (confirmed) {
            // Use AuthChecker for proper logout
            if (window.AuthChecker) {
              const authChecker = new window.AuthChecker()
              authChecker.logout()
            } else {
              // Fallback to manual logout
              localStorage.removeItem("userInfo")
              window.location.href = "login.html"
            }
          }
        } else {
          // Fallback to basic confirm if dialog is not available
          if (confirm("Are you sure you want to logout?")) {
            // Use AuthChecker for proper logout
            if (window.AuthChecker) {
              const authChecker = new window.AuthChecker()
              authChecker.logout()
            } else {
              // Fallback to manual logout
              localStorage.removeItem("userInfo")
              window.location.href = "login.html"
            }
          }
        }
      })
    }

    // Try immediately, then with a delay if not available
    if (document.querySelector(".logout-link")) {
      initLogoutWithDelay()
    } else {
      // Wait a bit for the DOM to be ready
      setTimeout(initLogoutWithDelay, 100)
    }
  }

  /**
   * Initialize menu navigation
   */
  initMenuNavigation() {
    const menuItems = document.querySelectorAll(".menu-item:not(.has-submenu)")

    menuItems.forEach((item) => {
      item.addEventListener("click", async () => {
        const label = item.getAttribute("aria-label")
        await this.navigateToPage(label)
      })
    })
  }

  /**
   * Initialize submenu toggle functionality
   */
  initSubmenuToggle() {
    const submenuButtons = document.querySelectorAll(".menu-item.has-submenu")

    submenuButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        const parentLi = button.closest(".menu-item-with-submenu")
        if (!parentLi) return

        const isExpanded = parentLi.classList.contains("expanded")
        const ariaExpanded = button.getAttribute("aria-expanded") === "true"

        if (isExpanded || ariaExpanded) {
          // Collapse submenu
          parentLi.classList.remove("expanded")
          button.setAttribute("aria-expanded", "false")
          // Set tabindex to -1 for submenu items when collapsed
          parentLi.querySelectorAll(".submenu-item").forEach((item) => {
            item.setAttribute("tabindex", "-1")
          })
        } else {
          // Expand submenu
          parentLi.classList.add("expanded")
          button.setAttribute("aria-expanded", "true")
          // Set tabindex to 0 for submenu items when expanded
          parentLi.querySelectorAll(".submenu-item").forEach((item) => {
            item.setAttribute("tabindex", "0")
          })
        }
      })

      // Handle keyboard navigation
      button.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          e.stopPropagation()
          button.click()
        }
      })
    })

    // Handle submenu item clicks
    const submenuItems = document.querySelectorAll(".submenu-item")
    submenuItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        // Navigation will happen via href, but we can update active state
        const currentPage = window.location.pathname.split("/").pop()
        const href = item.getAttribute("href")
        if (href && href.split("/").pop() === currentPage) {
          // Remove active from all submenu items
          document.querySelectorAll(".submenu-item").forEach((subItem) => {
            subItem.classList.remove("active")
          })
          // Add active to current item
          item.classList.add("active")
        }
      })
    })
  }

  /**
   * Navigate to appropriate page based on menu item
   */
  async navigateToPage(label) {
    // Allow navigation to Performance page - agents will see the "Coming Soon" message on the page
    const pageMap = {
      Search: "search.html",
      Home: "home.html",
      "Create New Audit": "create-audit.html",
      "Auditor's Dashboard": "auditor-dashboard.html",
      "Audit Distribution": "audit-distribution.html",
      "Audit Reports": "audit-reports.html",
      Performance: "employee-performance.html",
      "Coaching & Remediation": "coaching-remediation.html",
      "Reversal Management": "reversal.html",
      "Improvement Corner": "improvement-corner.html",
      Calibration: "calibration.html",
      ATA: "ata.html",
      "Grading Guide": "grading-guide.html",
      Help: "help.html",
      "Report a Bug": "bug-report.html",
      "View Bug Reports": "bug-reports-view.html",
      Settings: "settings.html",
      Scorecards: "scorecards.html",
      "User Management": "user-management.html",
      "Event Management": "event-management.html",
      Profile: "profile.html",
    }

    const targetPage = pageMap[label]
    if (targetPage && window.location.pathname.split("/").pop() !== targetPage) {
      window.location.href = targetPage
    }
  }

  /**
   * Set active menu item based on current page
   */
  setActiveMenuItem() {
    const currentPage = window.location.pathname.split("/").pop()
    const pageMap = {
      "home.html": "Home",
      "create-audit.html": "Create New Audit",
      "auditor-dashboard.html": "Auditor's Dashboard",
      "audit-distribution.html": "Audit Distribution",
      "audit-reports.html": "Audit Reports",
      "scorecards.html": "Scorecards",
      "employee-performance.html": "Performance",
      "coaching-remediation.html": "Coaching & Remediation",
      "reversal.html": "Reversal Management",
      "improvement-corner.html": "Improvement Corner",
      "calibration.html": "Calibration",
      "ata.html": "ATA",
      "grading-guide.html": "Grading Guide",
      "help.html": "Help",
      "bug-report.html": "Report a Bug",
      "bug-reports-view.html": "View Bug Reports",
      "settings.html": "Settings",
      "user-management.html": "User Management",
      "event-management.html": "Event Management",
      "profile.html": "Profile",
    }

    // First, collapse all submenus by default
    const allSubmenus = document.querySelectorAll(".menu-item-with-submenu")
    allSubmenus.forEach((submenu) => {
      submenu.classList.remove("expanded")
      const toggleButton = submenu.querySelector(".menu-item.has-submenu")
      if (toggleButton) {
        toggleButton.setAttribute("aria-expanded", "false")
        submenu.querySelectorAll(".submenu-item").forEach((item) => {
          item.setAttribute("tabindex", "-1")
        })
      }
    })

    // Remove active class from all menu items and submenu items
    const menuItems = document.querySelectorAll(".menu-item, .submenu-item")
    menuItems.forEach((item) => {
      item.classList.remove("active")
    })

    const currentPageLabel = pageMap[currentPage]
    if (!currentPageLabel) return

    // Check if it's a submenu item first
    const submenuItem = document.querySelector(`.submenu-item[href="${currentPage}"]`)
    if (submenuItem) {
      submenuItem.classList.add("active")
      const parentSubmenu = submenuItem.closest(".menu-item-with-submenu")
      if (parentSubmenu) {
        // Only expand if we're on a submenu page
        parentSubmenu.classList.add("expanded")
        const toggleButton = parentSubmenu.querySelector(".menu-item.has-submenu")
        if (toggleButton) {
          toggleButton.setAttribute("aria-expanded", "true")
          parentSubmenu.querySelectorAll(".submenu-item").forEach((item) => {
            item.setAttribute("tabindex", "0")
          })
        }
      }
      return
    }

    // If it's a main menu item (not a submenu item)
    const activeMenuItem = document.querySelector(`[aria-label="${currentPageLabel}"]`)
    if (activeMenuItem && !activeMenuItem.classList.contains("has-submenu")) {
      activeMenuItem.classList.add("active")
    }
  }

  /**
   * Show error message if sidebar fails to load
   */
  showSidebarError() {
    // Sidebar failed to load, using fallback
  }

  /**
   * Get cache key for notification counts (user-specific)
   */
  getNotificationCacheKey(type) {
    const userInfo = this.getUserInfo()
    const userEmail = userInfo ? (userInfo.email || 'anonymous').toLowerCase().trim() : 'anonymous'
    return `notification_count_${type}_${userEmail}`
  }

  /**
   * Get cache timestamp key for notification counts
   */
  getNotificationCacheTimestampKey(type) {
    const userInfo = this.getUserInfo()
    const userEmail = userInfo ? (userInfo.email || 'anonymous').toLowerCase().trim() : 'anonymous'
    return `notification_count_${type}_timestamp_${userEmail}`
  }

  /**
   * Get cached notification count
   */
  getCachedNotificationCount(type) {
    try {
      const cacheKey = this.getNotificationCacheKey(type)
      const timestampKey = this.getNotificationCacheTimestampKey(type)
      const cachedData = localStorage.getItem(cacheKey)
      const cachedTimestamp = localStorage.getItem(timestampKey)

      if (!cachedData || !cachedTimestamp) {
        return null
      }

      const timestamp = parseInt(cachedTimestamp, 10)
      const now = Date.now()

      // Check if cache is still valid
      if (now - timestamp > this.CACHE_DURATION_MS) {
        // Cache expired, clear it
        localStorage.removeItem(cacheKey)
        localStorage.removeItem(timestampKey)
        return null
      }

      return parseInt(cachedData, 10)
    } catch (error) {
      console.error(`Error reading notification count cache for ${type}:`, error)
      return null
    }
  }

  /**
   * Set cached notification count
   */
  setCachedNotificationCount(type, count) {
    try {
      const cacheKey = this.getNotificationCacheKey(type)
      const timestampKey = this.getNotificationCacheTimestampKey(type)
      localStorage.setItem(cacheKey, count.toString())
      localStorage.setItem(timestampKey, Date.now().toString())
    } catch (error) {
      console.error(`Error writing notification count cache for ${type}:`, error)
    }
  }

  /**
   * Load notification counts from cache and display them immediately
   */
  loadNotificationCountsFromCache() {
    // Load reversal count from cache
    const cachedReversals = this.getCachedNotificationCount('reversals')
    if (cachedReversals !== null) {
      this.setReversalBadgeCount(cachedReversals)
    }

    // Load employee reversal count from cache
    const cachedEmployeeReversals = this.getCachedNotificationCount('employeeReversals')
    if (cachedEmployeeReversals !== null) {
      this.setEmployeeReversalBadgeCount(cachedEmployeeReversals)
    }

    // Load acknowledgment count from cache
    const cachedAcknowledgments = this.getCachedNotificationCount('acknowledgments')
    if (cachedAcknowledgments !== null) {
      this.setAcknowledgmentBadgeCount(cachedAcknowledgments)
    }
  }

  /**
   * Set up intervals to update notification counts periodically
   */
  setupNotificationUpdateIntervals() {
    // Clear any existing intervals
    this.clearNotificationUpdateIntervals()

    // Set up interval for reversals (for auditors)
    this.notificationUpdateIntervals.reversals = setInterval(() => {
      this.updatePendingReversalsCount()
    }, this.UPDATE_INTERVAL_MS)

    // Set up interval for employee reversals (for employees)
    this.notificationUpdateIntervals.employeeReversals = setInterval(() => {
      this.updateEmployeeReversalUpdatesCount()
    }, this.UPDATE_INTERVAL_MS)

    // Set up interval for acknowledgments
    this.notificationUpdateIntervals.acknowledgments = setInterval(() => {
      this.updatePendingAcknowledgmentsCount()
    }, this.UPDATE_INTERVAL_MS)
  }

  /**
   * Clear notification update intervals
   */
  clearNotificationUpdateIntervals() {
    if (this.notificationUpdateIntervals.reversals) {
      clearInterval(this.notificationUpdateIntervals.reversals)
      this.notificationUpdateIntervals.reversals = null
    }
    if (this.notificationUpdateIntervals.employeeReversals) {
      clearInterval(this.notificationUpdateIntervals.employeeReversals)
      this.notificationUpdateIntervals.employeeReversals = null
    }
    if (this.notificationUpdateIntervals.acknowledgments) {
      clearInterval(this.notificationUpdateIntervals.acknowledgments)
      this.notificationUpdateIntervals.acknowledgments = null
    }
  }

  /**
   * Get reversal workflow state - matches reversal.html exactly
   */
  getReversalWorkflowState(reversal) {
    if (reversal.reversal_workflow_state) {
      const dbWorkflowState = reversal.reversal_workflow_state
      const teamLeadApproved = reversal.team_lead_approved === true || reversal.team_lead_approved === 'true' || 
                               reversal.team_lead_approved === 1 || reversal.team_lead_approved === '1' ||
                               (reversal.teamLeadApproved === true || reversal.teamLeadApproved === 'true' || 
                                reversal.teamLeadApproved === 1 || reversal.teamLeadApproved === '1')
      const teamLeadRejected = reversal.team_lead_approved === false || reversal.team_lead_approved === 'false' || 
                               reversal.team_lead_approved === 0 || reversal.team_lead_approved === '0' ||
                               (reversal.teamLeadApproved === false || reversal.teamLeadApproved === 'false' || 
                                reversal.teamLeadApproved === 0 || reversal.teamLeadApproved === '0')
      const hasTeamLeadReviewed = teamLeadApproved || teamLeadRejected || 
                                  (reversal.team_lead_reviewed_by && reversal.team_lead_reviewed_by.trim()) || 
                                  (reversal.teamLeadReviewedBy && reversal.teamLeadReviewedBy.trim())
      if ((dbWorkflowState === 'qa_review' || dbWorkflowState === 'cqc_review') && !hasTeamLeadReviewed) {
        return 'team_lead_review'
      }
      if (teamLeadRejected) {
        return 'team_lead_rejected'
      }
      return dbWorkflowState
    }
    const ackStatus = (reversal.acknowledgement_status || reversal.acknowledgementStatus || '').toLowerCase()
    if (ackStatus.includes('team_lead_review')) return 'team_lead_review'
    if (ackStatus.includes('team_lead_rejected')) return 'team_lead_rejected'
    if (ackStatus.includes('qa_review') || ackStatus.includes('auditor_review')) return 'qa_review'
    if (ackStatus.includes('cqc_review')) return 'cqc_review'
    if (ackStatus.includes('cqc_sent_back')) return 'cqc_sent_back'
    if (ackStatus.includes('agent_re_review')) return 'agent_re_review'
    if (ackStatus.includes('reversal_approved')) return 'approved'
    if (ackStatus.includes('reversal_rejected')) return 'rejected'
    if (ackStatus === 'acknowledged' || ackStatus.includes('acknowledged')) return 'acknowledged'
    const approved = reversal.reversal_approved
    if (approved === null || approved === undefined) return 'pending'
    if (approved === true || approved === 'true' || approved === 1 || approved === '1') return 'approved'
    if (approved === false || approved === 'false' || approved === 0 || approved === '0') return 'rejected'
    return 'pending'
  }

  /**
   * Check if a workflow state is considered "pending" - matches reversal.html exactly
   */
  isPendingWorkflowState(reversal) {
    const workflowState = this.getReversalWorkflowState(reversal)
    const pendingStates = [
      'pending',
      'submitted',
      'team_lead_review',
      'team_lead_approved',
      'qa_review',
      'cqc_review',
      'cqc_sent_back',
      'agent_re_review'
    ]
    if (pendingStates.includes(workflowState)) {
      return true
    }
    const teamLeadApproved = reversal.team_lead_approved === true || reversal.team_lead_approved === 'true' || 
                             reversal.team_lead_approved === 1 || reversal.team_lead_approved === '1' ||
                             (reversal.teamLeadApproved === true || reversal.teamLeadApproved === 'true' || 
                              reversal.teamLeadApproved === 1 || reversal.teamLeadApproved === '1')
    const finalDecision = reversal.reversal_approved
    const hasFinalDecision = finalDecision !== null && finalDecision !== undefined
    if (teamLeadApproved && !hasFinalDecision) {
      return true
    }
    const ackStatus = (reversal.acknowledgement_status || reversal.acknowledgementStatus || '').toLowerCase()
    if (ackStatus.includes('pending - reversal_approved') || ackStatus.includes('pending - reversal_rejected')) {
      return true
    }
    if (workflowState === 'qa_review' || workflowState === 'cqc_review') {
      return true
    }
    return false
  }

  /**
   * Update pending reversals count badge - uses EXACT same logic as reversal.html
   */
  async updatePendingReversalsCount() {
    try {
      const userInfo = this.getUserInfo()
      if (userInfo && userInfo.role === 'Employee') {
        this.setReversalBadgeCount(0)
        return
      }

      if (!window.supabaseClient) {
        setTimeout(() => this.updatePendingReversalsCount(), 1000)
        return
      }

      const { data: allScorecards, error: scorecardsError } = await window.supabaseClient
        .from('scorecards')
        .select('*')

      if (scorecardsError) {
        console.warn('Error loading scorecards:', scorecardsError)
        return
      }

      let combinedReversals = []
      const isAgent = userInfo && userInfo.role === 'Employee'

      // STEP 1: Load from new reversal_requests table
      try {
        let reversalQuery = window.supabaseClient
          .from('reversal_requests')
          .select('*')
        if (isAgent && userInfo.email) {
          reversalQuery = reversalQuery.eq('requested_by_email', userInfo.email)
        }

        reversalQuery = reversalQuery.order('requested_at', { ascending: false })

        const { data: reversalRequests, error: reversalError } = await reversalQuery

        if (!reversalError && reversalRequests && reversalRequests.length > 0) {
          const reversalIds = reversalRequests.map(rr => rr.id)
          const { data: workflowStates, error: wsError } = await window.supabaseClient
            .from('reversal_workflow_states')
            .select('*')
            .in('reversal_request_id', reversalIds)
            .eq('is_current', true)

          const workflowStateMap = new Map()
          if (!wsError && workflowStates) {
            workflowStates.forEach(ws => {
              workflowStateMap.set(ws.reversal_request_id, ws.state)
            })
          }

          const reversalsByTable = new Map()
          const reversalReqMap = new Map()

          for (const reversalReq of reversalRequests) {
            const workflowState = workflowStateMap.get(reversalReq.id) || 'submitted'
            const finalStates = ['approved', 'rejected', 'acknowledged']
            if (finalStates.includes(workflowState)) {
              continue
            }

            if (!reversalsByTable.has(reversalReq.scorecard_table_name)) {
              reversalsByTable.set(reversalReq.scorecard_table_name, [])
            }
            reversalsByTable.get(reversalReq.scorecard_table_name).push(reversalReq.audit_id)
            reversalReqMap.set(reversalReq.audit_id, { reversalReq, workflowState })
          }

          const auditDataMap = new Map()
          const BATCH_SIZE = 100

          for (const [tableName, auditIds] of reversalsByTable.entries()) {
            try {
              if (auditIds.length <= BATCH_SIZE) {
                const { data: audits, error: auditError } = await window.supabaseClient
                  .from(tableName)
                  .select('*')
                  .in('id', auditIds)

                if (!auditError && audits) {
                  audits.forEach(audit => {
                    auditDataMap.set(audit.id, audit)
                  })
                }
              } else {
                for (let i = 0; i < auditIds.length; i += BATCH_SIZE) {
                  const batch = auditIds.slice(i, i + BATCH_SIZE)
                  const { data: audits, error: auditError } = await window.supabaseClient
                    .from(tableName)
                    .select('*')
                    .in('id', batch)

                  if (!auditError && audits) {
                    audits.forEach(audit => {
                      auditDataMap.set(audit.id, audit)
                    })
                  }
                }
              }
            } catch (err) {
              console.warn(`Error loading audits from ${tableName}:`, err)
            }
          }

          for (const [auditId, { reversalReq, workflowState }] of reversalReqMap.entries()) {
            const auditData = auditDataMap.get(auditId)
            if (!auditData) continue

            const scorecard = allScorecards?.find(s => s.table_name === reversalReq.scorecard_table_name)

            const mergedReversal = {
              ...auditData,
              reversal_requested_at: reversalReq.requested_at,
              reversal_type: reversalReq.reversal_type,
              reversal_justification_from_agent: reversalReq.justification,
              reversal_metrics_parameters: reversalReq.metrics_parameters,
              reversal_attachments: reversalReq.attachments,
              score_before_appeal: reversalReq.original_score,
              score_after_appeal: reversalReq.new_score,
              reversal_approved: reversalReq.final_decision === 'approved' ? true : 
                                 reversalReq.final_decision === 'rejected' ? false : null,
              reversal_responded_at: reversalReq.final_decision_at,
              reversal_approved_by: reversalReq.final_decision_by_name,
              reversal_processed_by_email: reversalReq.final_decision_by_email,
              sla_in_hours: reversalReq.sla_hours,
              within_auditor_scope: reversalReq.within_auditor_scope,
              reversal_workflow_state: workflowState,
              _scorecard_id: scorecard?.id || null,
              _scorecard_name: scorecard?.name || reversalReq.scorecard_table_name,
              _scorecard_table: reversalReq.scorecard_table_name,
              _reversal_request_id: reversalReq.id
            }

            if (isAgent && userInfo.email) {
              const auditEmployeeEmail = (mergedReversal.employee_email || '').toLowerCase().trim()
              if (auditEmployeeEmail !== userInfo.email) {
                continue
              }
            }

            combinedReversals.push(mergedReversal)
          }
        }
      } catch (err) {
        console.warn('Error loading from reversal_requests table:', err)
      }

      // STEP 2: Load from old structure
      const existingAuditIds = new Set(combinedReversals.map(r => r.id))
      const tablesWithReversals = new Set(combinedReversals.map(r => r._scorecard_table).filter(Boolean))

      for (const scorecard of allScorecards || []) {
        if (tablesWithReversals.has(scorecard.table_name)) {
          continue
        }

        try {
          let query = window.supabaseClient
            .from(scorecard.table_name)
            .select('id,employee_email,reversal_requested_at,reversal_approved')
            .not('reversal_requested_at', 'is', null)
            .limit(1)

          const { data: quickCheck, error: checkError } = await query

          if (checkError || !quickCheck || quickCheck.length === 0) {
            continue
          }

          query = window.supabaseClient
            .from(scorecard.table_name)
            .select('*')
            .not('reversal_requested_at', 'is', null)

          const isAgent = userInfo && userInfo.role === 'Employee'
          if (isAgent && userInfo.email) {
            query = query.eq('employee_email', userInfo.email)
          }

          if (!isAgent) {
            query = query.is('reversal_approved', null)
          }

          query = query.order('reversal_requested_at', { ascending: false })

          const { data, error } = await query

          if (error) {
            console.warn(`Error loading from ${scorecard.table_name}:`, error)
            continue
          }

          if (data && data.length > 0) {
            let filteredData = data.filter(audit => !existingAuditIds.has(audit.id))

            if (isAgent && userInfo && userInfo.email) {
              filteredData = filteredData.filter(audit => {
                const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim()
                return auditEmployeeEmail === userInfo.email
              })
            }

            const reversalsWithScorecard = filteredData.map(audit => ({
              ...audit,
              _scorecard_id: scorecard.id,
              _scorecard_name: scorecard.name,
              _scorecard_table: scorecard.table_name
            }))

            combinedReversals = combinedReversals.concat(reversalsWithScorecard)
          }
        } catch (err) {
          console.warn(`Exception loading from ${scorecard.table_name}:`, err)
          continue
        }
      }

      if (isAgent && userInfo.email) {
        combinedReversals = combinedReversals.filter(reversal => {
          const auditEmployeeEmail = (reversal.employee_email || '').toLowerCase().trim()
          return auditEmployeeEmail === userInfo.email
        })
      }

      const pendingReversals = combinedReversals.filter(reversal => {
        return this.isPendingWorkflowState(reversal)
      })

      this.setCachedNotificationCount('reversals', pendingReversals.length)
      this.setReversalBadgeCount(pendingReversals.length)
    } catch (error) {
      console.error('Error updating pending reversals count:', error)
      const cachedCount = this.getCachedNotificationCount('reversals')
      if (cachedCount !== null) {
        this.setReversalBadgeCount(cachedCount)
      } else {
        this.setReversalBadgeCount(0)
      }
    }
  }

  /**
   * Set the reversal badge count
   */
  setReversalBadgeCount(count) {
    const badge = document.getElementById('reversalNotificationBadge')
    if (!badge) return

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count.toString()
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Update employee reversal updates count badge (for employees to see their approved/rejected reversals)
   */
  async updateEmployeeReversalUpdatesCount() {
    try {
      // Only show for employees
      const userInfo = this.getUserInfo()
      if (!userInfo || userInfo.role !== 'Employee') {
        return
      }

      if (!window.supabaseClient) {
        // Supabase not initialized yet, try again after a delay
        setTimeout(() => this.updateEmployeeReversalUpdatesCount(), 1000)
        return
      }

      const employeeName = userInfo.name || ''
      const employeeEmail = userInfo.email || ''

      if (!employeeName && !employeeEmail) {
        return
      }

      // Load scorecards first
      const { data: scorecards, error: scorecardsError } = await window.supabaseClient
        .from('scorecards')
        .select('table_name')

      if (scorecardsError) {
        console.warn('Error loading scorecards for employee reversal count:', scorecardsError)
        return
      }

      if (!scorecards || scorecards.length === 0) {
        this.setEmployeeReversalBadgeCount(0)
        return
      }

      // Count reversals that belong to this employee and have been responded to
      let totalResponded = 0
      for (const scorecard of scorecards) {
        try {
          // Query for reversals that have been responded to
          // We need to check both employee_name and employee_email
          let countByName = 0
          let countByEmail = 0

          // Try matching by name first
          if (employeeName) {
            const { count, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*', { count: 'exact', head: true })
              .not('reversal_requested_at', 'is', null)
              .not('reversal_approved', 'is', null)
              .ilike('employee_name', `%${employeeName}%`)

            if (!error && count !== null && count !== undefined) {
              countByName = count
            }
          }

          // Try matching by email
          if (employeeEmail) {
            const { count, error } = await window.supabaseClient
              .from(scorecard.table_name)
              .select('*', { count: 'exact', head: true })
              .not('reversal_requested_at', 'is', null)
              .not('reversal_approved', 'is', null)
              .ilike('employee_email', employeeEmail)

            if (!error && count !== null && count !== undefined) {
              countByEmail = count
            }
          }

          // Use the maximum count (to avoid double counting if both match)
          totalResponded += Math.max(countByName, countByEmail)
        } catch (err) {
          console.warn(`Exception counting employee reversals from ${scorecard.table_name}:`, err)
          continue
        }
      }

      // Update cache and badge
      this.setCachedNotificationCount('employeeReversals', totalResponded)
      this.setEmployeeReversalBadgeCount(totalResponded)
    } catch (error) {
      console.error('Error updating employee reversal updates count:', error)
      // Keep cached value if available
      const cachedCount = this.getCachedNotificationCount('employeeReversals')
      if (cachedCount !== null) {
        this.setEmployeeReversalBadgeCount(cachedCount)
      } else {
        this.setEmployeeReversalBadgeCount(0)
      }
    }
  }

  /**
   * Set the employee reversal badge count
   */
  setEmployeeReversalBadgeCount(count) {
    const badge = document.getElementById('employeeReversalNotificationBadge')
    if (!badge) return

    // Only show for employees
    const userInfo = this.getUserInfo()
    if (userInfo && userInfo.role !== 'Employee') {
      badge.style.display = 'none'
      return
    }

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count.toString()
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Update pending acknowledgments count badge
   */
  async updatePendingAcknowledgmentsCount() {
    try {
      if (!window.supabaseClient) {
        // Supabase not initialized yet, try again after a delay
        setTimeout(() => this.updatePendingAcknowledgmentsCount(), 1000)
        return
      }

      // Get user info to check if they are an employee/agent
      const userInfo = this.getUserInfo()
      const isAgent = userInfo && userInfo.role === 'Employee'
      const currentUserEmail = userInfo ? (userInfo.email || '').toLowerCase().trim() : ''

      // Load scorecards first
      const { data: scorecards, error: scorecardsError } = await window.supabaseClient
        .from('scorecards')
        .select('table_name')

      if (scorecardsError) {
        console.warn('Error loading scorecards for acknowledgment count:', scorecardsError)
        return
      }

      if (!scorecards || scorecards.length === 0) {
        this.setAcknowledgmentBadgeCount(0)
        return
      }

      // Count pending acknowledgments from all scorecard tables
      // Pending means: acknowledgement_status is null, empty, or 'Pending'
      let totalPending = 0
      for (const scorecard of scorecards) {
        try {
          // Build query - need to select employee_email as well if filtering by agent
          let query = window.supabaseClient
            .from(scorecard.table_name)
            .select('acknowledgement_status,employee_email')

          // If employee/agent, filter by their email
          if (isAgent && currentUserEmail) {
            query = query.eq('employee_email', currentUserEmail)
          }

          const { data, error } = await query

          if (error) {
            // If error is about column not existing, skip this table
            if (error.code === 'PGRST116' || error.code === '42703' || error.message?.includes('acknowledgement_status')) {
              continue
            }
            console.warn(`Error counting acknowledgments from ${scorecard.table_name}:`, error)
            continue
          }

          if (data && data.length > 0) {
            // Filter for pending acknowledgments: null, empty string, or 'Pending'
            // Also do additional client-side filtering for employees to ensure exact email match
            const pending = data.filter(audit => {
              // For employees, ensure exact email match (case-insensitive)
              if (isAgent && currentUserEmail) {
                const auditEmployeeEmail = (audit.employee_email || '').toLowerCase().trim()
                if (auditEmployeeEmail !== currentUserEmail) {
                  return false
                }
              }
              
              // Check if acknowledgment is pending
              const status = audit.acknowledgement_status
              return !status || status.trim() === '' || status === 'Pending'
            })
            totalPending += pending.length
          }
        } catch (err) {
          // If column doesn't exist, skip this table
          if (err.message?.includes('acknowledgement_status') || err.code === 'PGRST116' || err.code === '42703') {
            continue
          }
          console.warn(`Exception counting acknowledgments from ${scorecard.table_name}:`, err)
          continue
        }
      }

      // Update cache and badge
      this.setCachedNotificationCount('acknowledgments', totalPending)
      this.setAcknowledgmentBadgeCount(totalPending)
    } catch (error) {
      console.error('Error updating pending acknowledgments count:', error)
      // Keep cached value if available
      const cachedCount = this.getCachedNotificationCount('acknowledgments')
      if (cachedCount !== null) {
        this.setAcknowledgmentBadgeCount(cachedCount)
      } else {
        this.setAcknowledgmentBadgeCount(0)
      }
    }
  }

  /**
   * Set the acknowledgment badge count
   */
  setAcknowledgmentBadgeCount(count) {
    const badge = document.getElementById('acknowledgmentNotificationBadge')
    if (!badge) return

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count.toString()
      badge.style.display = 'inline-flex'
    } else {
      badge.style.display = 'none'
    }
  }

  /**
   * Hide menu items for employees based on their role
   */
  hideEmployeeMenuItems() {
    try {
      const userInfo = this.getUserInfo()
      if (!userInfo) return

      const userRole = userInfo.role || ''
      const isEmployee = userRole === 'Employee'

      if (!isEmployee) return

      // Hide Auditor's Dashboard (check both possible aria-label variations)
      let auditorsDashboard = document.querySelector('[aria-label="Auditor\'s Dashboard"]')
      if (!auditorsDashboard) {
        auditorsDashboard = document.querySelector('[aria-label="Auditors\' Dashboard"]')
      }
      if (auditorsDashboard) {
        const parentLi = auditorsDashboard.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }

      // Hide Create Audit
      const createAudit = document.querySelector('[aria-label="Create New Audit"]')
      if (createAudit) {
        const parentLi = createAudit.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }

      // Hide Audit Distribution
      const auditDistribution = document.querySelector('[aria-label="Audit Distribution"]')
      if (auditDistribution) {
        const parentLi = auditDistribution.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }

      // Hide Improvement Corner
      const improvementCorner = document.querySelector('[aria-label="Improvement Corner"]')
      if (improvementCorner) {
        const parentLi = improvementCorner.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }

      // Hide Search
      const searchBtn = document.querySelector('[aria-label="Search"]')
      if (searchBtn) {
        const parentLi = searchBtn.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }

      // Hide Scorecards and User Management from Settings submenu, but keep Profile
      const scorecardsLink = document.querySelector('.submenu-item[href="scorecards.html"]')
      if (scorecardsLink) {
        const parentLi = scorecardsLink.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }

      const userManagementLink = document.querySelector('.submenu-item[href="user-management.html"]')
      if (userManagementLink) {
        const parentLi = userManagementLink.closest('li[role="none"]')
        if (parentLi) {
          parentLi.style.display = 'none'
        }
      }
    } catch (error) {
      console.error('Error hiding employee menu items:', error)
    }

    // Show Access Control menu item only for Super Admins
    this.updateAccessControlMenuItem()
  }

  /**
   * Update Access Control menu item visibility based on user role
   */
  updateAccessControlMenuItem() {
    try {
      const accessControlMenuItem = document.getElementById('accessControlMenuItem')
      if (accessControlMenuItem) {
        const userInfo = this.getUserInfo()
        if (userInfo && userInfo.role === 'Super Admin') {
          accessControlMenuItem.style.display = 'block'
        } else {
          accessControlMenuItem.style.display = 'none'
        }
      }
    } catch (error) {
      console.error('Error updating access control menu item:', error)
    }
  }
}

// Global function to update reversal badge count (can be called from other pages)
window.updateReversalBadgeCount = async function() {
  const sidebarLoader = new SidebarLoader()
  await sidebarLoader.updatePendingReversalsCount()
  await sidebarLoader.updateEmployeeReversalUpdatesCount()
}

// Global function to update acknowledgment badge count (can be called from other pages)
window.updateAcknowledgmentBadgeCount = async function() {
  const sidebarLoader = new SidebarLoader()
  await sidebarLoader.updatePendingAcknowledgmentsCount()
}

// Global function to force refresh all notification counts (bypasses cache)
window.refreshAllNotificationCounts = async function() {
  const sidebarLoader = new SidebarLoader()
  // Clear cache to force refresh
  try {
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}')
    const userEmail = (userInfo.email || 'anonymous').toLowerCase().trim()
    localStorage.removeItem(`notification_count_reversals_${userEmail}`)
    localStorage.removeItem(`notification_count_reversals_timestamp_${userEmail}`)
    localStorage.removeItem(`notification_count_employeeReversals_${userEmail}`)
    localStorage.removeItem(`notification_count_employeeReversals_timestamp_${userEmail}`)
    localStorage.removeItem(`notification_count_acknowledgments_${userEmail}`)
    localStorage.removeItem(`notification_count_acknowledgments_timestamp_${userEmail}`)
  } catch (error) {
    console.error('Error clearing notification cache:', error)
  }
  // Update all counts
  await sidebarLoader.updatePendingReversalsCount()
  await sidebarLoader.updateEmployeeReversalUpdatesCount()
  await sidebarLoader.updatePendingAcknowledgmentsCount()
}

// Store sidebar loader instance globally for cleanup
let globalSidebarLoader = null

// Initialize the sidebar loader
function initSidebar() {
  globalSidebarLoader = new SidebarLoader()
  globalSidebarLoader.init()
}

// Clean up intervals when page unloads
window.addEventListener('beforeunload', () => {
  if (globalSidebarLoader) {
    globalSidebarLoader.clearNotificationUpdateIntervals()
  }
})

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSidebar)
} else {
  // DOM is already loaded
  initSidebar()
}
