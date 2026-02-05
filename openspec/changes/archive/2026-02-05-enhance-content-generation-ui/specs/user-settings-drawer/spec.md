# Spec: User Settings Drawer

## ADDED Requirements

### Requirement: User can access settings drawer
The system SHALL provide a settings button in the main interface that opens a drawer containing user preference options.

#### Scenario: Open settings drawer
- **WHEN** user clicks the settings button in the main interface
- **THEN** a drawer slides in from the right side of the screen with user preference options

### Requirement: Settings drawer contains tone options
The system SHALL provide tone selection options including casual, professional, friendly, and academic styles with non-technical descriptions.

#### Scenario: Select tone preference
- **WHEN** user views the tone options in the settings drawer
- **THEN** user sees clear, non-technical descriptions for each tone option (e.g., "輕鬆聊天" for casual, "正式專業" for professional)

### Requirement: Settings drawer contains style options
The system SHALL provide style selection options including narrative, analytical, conversational, and technical writing styles with user-friendly descriptions.

#### Scenario: Choose writing style
- **WHEN** user browses the style options
- **THEN** user sees intuitive descriptions for each style (e.g., "說故事的方式" for narrative, "分析討論" for analytical)

### Requirement: Settings drawer contains depth options
The system SHALL provide depth selection options for brief, moderate, deep, and comprehensive content with clear explanations.

#### Scenario: Set content depth
- **WHEN** user selects a depth option
- **THEN** user sees descriptive text explaining the depth level (e.g., "快速瀏覽" for brief, "深入探討" for deep)

### Requirement: Settings drawer contains length options
The system SHALL provide length selection options for short, medium, long, and detailed content with time-based descriptions.

#### Scenario: Choose content length
- **WHEN** user selects a length preference
- **THEN** user sees time-based descriptions (e.g., "2-3分鐘閱讀" for short, "10分鐘以上" for detailed)

### Requirement: Settings drawer contains topic options
The system SHALL provide topic selection options for trending, educational, news, opinion, and tutorial content types.

#### Scenario: Select topic focus
- **WHEN** user chooses a topic type
- **THEN** user sees clear descriptions of content focus (e.g., "最新趨勢" for trending, "學習知識" for educational)

### Requirement: Settings drawer contains freshness options
The system SHALL provide freshness selection options for latest, recent, timeless, and classic content with temporal descriptions.

#### Scenario: Set content freshness
- **WHEN** user selects a freshness level
- **THEN** user sees temporal descriptions (e.g., "今天的新鮮事" for latest, "經典永恆" for classic)

### Requirement: Settings drawer includes real-time tuning
The system SHALL provide real-time content direction tuning options within the settings drawer for immediate content generation adjustments.

#### Scenario: Access real-time tuning
- **WHEN** user opens settings drawer
- **THEN** user sees both preset preferences and real-time tuning options for immediate content adjustments

### Requirement: Real-time tuning affects future content
The system SHALL apply real-time tuning adjustments to subsequent content generation while preserving existing content.

#### Scenario: Apply tuning to new content
- **WHEN** user makes real-time tuning adjustments
- **THEN** the tuning preferences are applied to future content generation immediately

### Requirement: Settings are saved automatically
The system SHALL save user settings immediately when changed without requiring a separate save action.

#### Scenario: Auto-save settings
- **WHEN** user changes any setting in the drawer
- **THEN** the setting is saved automatically and a brief confirmation indicator is shown

### Requirement: Settings drawer can be closed
The system SHALL allow users to close the settings drawer by clicking outside it, using a close button, or pressing escape key.

#### Scenario: Close settings drawer
- **WHEN** user clicks outside the drawer, clicks close button, or presses escape
- **THEN** the drawer slides out and closes smoothly

### Requirement: Settings drawer is responsive
The system SHALL adapt the settings drawer layout for different screen sizes while maintaining usability.

#### Scenario: Responsive drawer layout
- **WHEN** user opens settings drawer on mobile device
- **THEN** drawer takes full screen width and maintains all functionality in a mobile-friendly layout