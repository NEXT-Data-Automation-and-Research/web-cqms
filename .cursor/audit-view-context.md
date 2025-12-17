# Audit View HTML - Context Documentation

## Overview
`audit-view.html` is a comprehensive single-page application (7151 lines) for viewing and managing audit details in a Quality Management System (CQMS). It integrates with Supabase for data storage and Intercom for conversation data.

## File Structure

### Head Section
- **Meta tags**: Cache control, charset, viewport
- **External dependencies**:
  - Google Fonts (Poppins)
  - Google Sign-In (GSI)
  - Supabase JS client
  - DOMPurify for HTML sanitization
- **Local scripts**:
  - `env-config.js`, `supabase-config.js`, `intercom-config.js`
  - `auth-check.js`, `access-control.js`
  - `confirmation-dialog.js`, `load-sidebar.js`
  - `dark-mode.js`, `search.js`, `audit-template.js`, `keyboard-shortcuts.js`
- **Dark mode styles**: Extensive CSS for dark theme support

### Header Information Display
- **Employee Information Boxes**: Employee name, email, type, department, country
- **Auditor Information**: Auditor name displayed in header (visible only to Quality Analysts and above, hidden from Employees)
- **Metadata Cards**: Date, Quarter, Week, Errors count, Status, Score
- **Header Actions**: Edit button, Acknowledge button, Reversal button (context-dependent)
- **Access Control**: Auditor name visibility controlled by `showAuditorName` parameter based on `isCurrentUserQualityAnalyst()` check

### Body Structure
1. **Reversal Request Form** (`#reversalFormContainer`) - Hidden by default
2. **Audit Container** (`#auditContainer`) - Main content area
3. **Image Viewer Modal** (`#imageViewerModal`) - Full-screen image viewer

## Key Features

### 1. Audit Display
- **Error Details Table**: Shows audit parameters with severity, points, feedback, and comments
- **Error Counts**: Total errors, Critical Fail, Critical, Significant, Major, Minor
- **Score Display**: Average score and passing status
- **Recommendations**: HTML-formatted recommendations section

### 2. Reversal Request System
- **Reversal Types**: Full reversal, Partial reversal
- **Reversal Reasons**: Dropdown with predefined reasons
- **Parameter Comments**: Users can add comments to specific parameters
- **Time Window**: Configurable window (48 hours default) for submitting reversals
- **Status Tracking**: Pending, Approved, Rejected states
- **Activity Logging**: All reversal requests logged to `audit_activity_log` table

### 3. Conversation Transcript View
- **Intercom Integration**: Fetches conversation data from Intercom API
- **Chat View**: Renders messages as chat bubbles (user/agent)
- **Text View**: Plain text transcript view
- **Message Types**:
  - User messages (left-aligned, white background)
  - Agent/AI messages (right-aligned, colored background)
  - System messages (centered, gray background)
  - Rating cards (special rendering)
  - Conversation summaries (AI summaries)
- **Image Support**: Inline images in messages with full-screen viewer
- **Translation**: Language detection and translation support

### 4. Rating System
- **Conversation Ratings**: Display and interaction with Intercom ratings
- **Rating Cards**: Visual cards showing rating, feedback, and remarks
- **Rating Dialog**: Modal for viewing/editing ratings

### 5. Acknowledgement Workflow
- **Acknowledge Button**: Allows audited employees to acknowledge audits
- **Prevention Logic**: Prevents leaving page if acknowledgement pending
- **Status Tracking**: Tracks acknowledgement status in database

### 6. Access Control
- **Role-based Access**:
  - Audited Employee: Can view, acknowledge, submit reversals
  - Quality Analyst: Can edit audits when reversal is pending
  - Auditor: Can view and manage audits
- **Resource-level Checks**: Validates user access to specific audit records

## Core Functions

### User & Access Functions
```javascript
getCurrentUserEmail()           // Get current user email
getCurrentUserInfo()            // Get full user info object
isCurrentUserAuditedEmployee()  // Check if user is audited employee
isCurrentUserQualityAnalyst()   // Check if user is quality analyst
isCurrentUserAuditor()          // Check if user is auditor
isAcknowledgedStatus(status)    // Check if status is acknowledged
hasPendingReversalRequest()      // Check for pending reversal
shouldShowEditButton()           // Determine if edit button should show
```

### Audit Loading & Display
```javascript
loadAuditFromURL()              // Load audit from URL parameters
renderAudit(audit, scorecard, errorFields)  // Main render function
generateErrorDetails(audit, errorFields)   // Generate error details HTML
showError(message)              // Display error message
```

### Reversal Functions
```javascript
toggleReversalForm()            // Show/hide reversal form
populateParametersWithComments() // Populate form with parameter comments
selectAllParameters()           // Select all parameters
clearAllParameters()            // Clear all parameter selections
saveParameterComment(paramKey, feedbackIndex, commentText)  // Save comment
showParameterCommentModal()     // Show comment input modal
checkIfReversalButtonShouldShow(auditSubmissionTime)  // Check time window
getTimeRemainingUntil48Hours(auditSubmissionTime)     // Get remaining time
startReversalTimer(auditSubmissionTime)               // Start countdown timer
```

### Conversation Functions
```javascript
loadConversationFromIntercom(conversationId)  // Fetch from Intercom API
displayConversationMessages(conversation)    // Render chat bubbles
parseTranscriptToChat(transcriptText, date)  // Parse plain text transcript
extractConversationAttributes(conversation)  // Extract metadata
displayConversationAttributes(conversation)   // Display metadata grid
formatMessageBody(body)                      // Format message HTML
renderRatingCards(rating, conversation, timestamp, isDarkMode)  // Render ratings
```

### UI Functions
```javascript
toggleConversationInfoGrid()    // Toggle conversation info display
initializeSplitter()             // Initialize resizable splitter
closeImageViewer()               // Close image viewer modal
navigateImage(direction)         // Navigate between images
handleCloseAuditView()           // Handle page close/navigation
editCurrentAudit()               // Navigate to edit page
acknowledgeAudit()               // Submit acknowledgement
```

### Translation Functions
```javascript
detectLanguage(text)             // Detect text language
translateText(text, targetLang) // Translate text
translateChatMessages()          // Translate all chat messages
```

## Data Models

### Audit Object
```javascript
{
  id: string,
  conversation_id: string,
  interactionId: string,
  employeeName: string,
  employee_name: string,  // snake_case variant
  employeeEmail: string,
  employee_email: string,  // snake_case variant
  auditorName: string,
  auditor_name: string,  // snake_case variant
  auditorEmail: string,
  auditor_email: string,  // snake_case variant
  audited_employee_email: string,
  averageScore: number,
  passingStatus: string,
  totalErrorsCount: number,
  acknowledgement_status: string,
  reversal_requested_at: string,
  reversal_type: string,
  reversal_justification_from_agent: string,
  reversal_approved: boolean,
  reversal_responded_at: string,
  response_from_auditor: string,  // Auditor's feedback/response regarding reversal
  reasonForReversalResponseDelay: string,  // camelCase mapping of response_from_auditor
  parameter_comments: object,  // { paramKey: { comment: string } or { comments: string[] } }
  recommendations: string,
  // ... parameter fields (dynamic based on scorecard)
}
```

### Error Field Object
```javascript
{
  key: string,              // Parameter key (e.g., 'greeting')
  label: string,            // Display label
  parameter_type: string,   // 'error', 'achievement', 'bonus'
  field_type: string,       // 'radio', 'checkbox', etc.
  severity: string,        // 'Critical Fail', 'Critical', 'Significant', 'Major', 'Minor'
  points: number,
  feedback: string | string[],
  status: string            // 'Reversed', 'Not Reversed', etc.
}
```

### Conversation Object (Intercom)
```javascript
{
  id: string,
  type: string,
  state: string,
  created_at: number,
  source: {
    type: string,
    author: { name, email, type },
    owner: { name, email, type },
    subject: string,
    body: string
  },
  conversation_parts: {
    conversation_parts: Array<{
      id: string,
      part_type: string,
      body: string,
      created_at: number,
      author: { name, email, type }
    }>
  },
  conversation_rating: {
    rating: number,
    remark: string,
    created_at: number
  },
  statistics: object,
  tags: object,
  contacts: object
}
```

## UI Components

### Reversal Form
- **Location**: `#reversalFormContainer`
- **Fields**:
  - Reversal Type (dropdown)
  - Reversal Reason (dropdown)
  - Parameter checkboxes with comment inputs
  - "Within Auditor Scope" checkbox
- **Submission**: Saves to database and logs to activity log
- **Auditor Response**: Displays `response_from_auditor` field when reversal has been responded to
  - Visible to: Agents (audited employees), Auditors, Quality Analysts
  - Shown in: Status banner (approved/rejected) and submitted reversal form section

### Error Details Table
- **Columns**: Error Type, Points, Severity, Status, Feedback, Comments
- **Styling**: Color-coded by severity
- **Comments Column**: Only visible for audited employees, shows comment inputs

### Conversation View
- **Split View**: Resizable splitter between chat and text views
- **Chat View** (`#transcriptChatView`): Chat bubble interface
- **Text View** (`#transcriptTextView`): Plain text transcript
- **Info Grid**: Toggleable conversation metadata

### Action Buttons
- **Acknowledge Button**: Green, only for audited employees
- **Reversal Button**: Red, only when conditions met
- **Edit Button**: Orange, only for quality analysts when reversal pending

## Integration Points

### Supabase Tables
- **Audit Tables**: Dynamic table names (e.g., `fnchat_cfd`, `fnchat_other`)
- **audit_activity_log**: Logs all audit changes
- **audit_scorecards**: Scorecard definitions

### Intercom API
- **Proxy Endpoint**: `/supabase/functions/intercom-proxy`
- **Conversation Fetch**: Full conversation with parts, ratings, statistics
- **Authentication**: Uses Intercom access token from config

### URL Parameters
- `table`: Table name (e.g., `fnchat_cfd`)
- `id`: Audit record ID
- Example: `audit-view.html?table=fnchat_cfd&id=123`

## Key Patterns

### Dark Mode Support
- Uses `data-theme="dark"` attribute on document
- CSS variables for colors: `--background-white`, `--text-color`, `--border-light`
- Inline style updates via `themeChange` event listener

### Error Handling
- Retry logic for schema cache errors (`retryOnSchemaCacheError`)
- Graceful fallbacks for missing columns
- User-friendly error messages

### State Management
- Global variables: `currentAudit`, `currentTableName`, `currentErrorFields`
- Parameter comments stored in `currentAudit.parameterComments`
- Comments only saved when reversal is submitted

### Message Rendering
- **Format Detection**: HTML vs plain text
- **Image Extraction**: Inline images extracted and displayed separately
- **Sanitization**: DOMPurify for safe HTML rendering
- **Avatar Generation**: Generated based on name/type

### Time Windows
- `ENABLE_REVERSAL_WINDOW`: Config flag
- `REVERSAL_WINDOW_HOURS`: Default 48 hours
- Timer updates every second showing countdown

## Important Constants

```javascript
ENABLE_REVERSAL_WINDOW = true/false  // Enable/disable time window
REVERSAL_WINDOW_HOURS = 48           // Hours for reversal window
```

## Event Handlers

### Page Events
- `DOMContentLoaded`: Initialize page, load audit
- `beforeunload`: Warn if unsaved comments
- `keydown`: Escape key handling

### Form Events
- Reversal form submission
- Parameter comment changes
- Acknowledge button click

### UI Events
- Image viewer navigation (keyboard/mouse)
- Splitter drag
- Conversation info toggle

## Styling Approach

- **Inline Styles**: Heavy use of inline styles for dynamic content
- **CSS Variables**: For dark mode theming
- **Responsive**: Grid layouts with `auto-fit` and `minmax`
- **Font**: Poppins throughout
- **Colors**: 
  - Green: `#1A733E` (passing)
  - Red: `#dc2626` (errors, reversal)
  - Orange: `#f59e0b` (edit)
  - Gray: Various shades for backgrounds/borders

## Security Considerations

- **HTML Sanitization**: DOMPurify for user-generated content
- **Access Control**: Role-based checks before actions
- **SQL Injection**: Supabase client handles parameterization
- **XSS Prevention**: Escape HTML in user inputs

## Performance Optimizations

- **Lazy Loading**: Conversation data loaded on demand
- **Image Optimization**: Placeholder system for images
- **Debouncing**: Comment saves (on blur/change)
- **Caching**: Browser cache disabled for fresh data

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features used
- CSS Grid and Flexbox
- Fetch API for HTTP requests

## Dependencies

### External
- Supabase JS Client v2
- DOMPurify v3.0.6
- Google Sign-In (GSI)

### Internal
- All scripts in `<head>` section
- Shared utilities in separate JS files

## Common Issues & Solutions

1. **Schema Cache Errors**: Retry logic implemented
2. **Missing Columns**: Graceful fallback (e.g., `parameter_comments`)
3. **Large Conversations**: Pagination not implemented (loads all at once)
4. **Image Loading**: Error handling with fallback to initials
5. **Dark Mode**: Inline styles need manual updates via event listener
6. **Auditor Response Visibility**: Fixed to show `response_from_auditor` field to agents, auditors, and quality analysts
7. **Data Mapping**: `currentAudit` is updated with mapped camelCase fields after loading from database

## Future Enhancements (Noted Patterns)

- Pagination for large conversations
- Real-time updates (WebSocket)
- Export functionality (PDF/CSV)
- Advanced filtering/search
- Bulk operations

