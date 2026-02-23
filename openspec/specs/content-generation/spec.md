## MODIFIED Requirements

### Requirement: ContentSettings priority over behavior-based depth
When `contentSettings` is provided, the system SHALL use the user's explicit settings (tone, style, depth, length, topic, freshness) as the authoritative source for prompt instructions. The behavior-based depth module from `selectModules()` SHALL NOT override the user's settings.

#### Scenario: User sets depth to brief via Settings drawer
- **WHEN** a user selects "brief" depth in Settings drawer and new content is generated
- **THEN** the generated prompt SHALL include the brief depth instruction ("200-300 words") from `contentSettings`, and SHALL NOT include a conflicting depth instruction from the behavior-based module

#### Scenario: User sets length to short via Settings drawer
- **WHEN** a user selects "short" length in Settings drawer and new content is generated
- **THEN** the generated prompt SHALL instruct the LLM to produce short-form content ("2-3 minutes reading"), matching the user's setting

#### Scenario: All six settings fields are reflected in prompt
- **WHEN** a user has configured all six contentSettings fields (tone, style, depth, length, topic, freshness) and new content is generated
- **THEN** the system prompt SHALL contain instructions corresponding to all six settings, and none SHALL be overridden by behavior-based modules

#### Scenario: Default settings for new user
- **WHEN** a user has not configured contentSettings (defaults are used)
- **THEN** the system SHALL use `DEFAULT_CONTENT_SETTINGS` values, and the behavior-based depth module SHALL still be suppressed in favor of the default settings' depth value

#### Scenario: Content generated in browser locale language
- **WHEN** the browser locale is `'en-US'` and content generation is triggered
- **THEN** the system prompt SHALL contain an English language instruction instead of a Traditional Chinese instruction, and the LLM SHALL be directed to write in English

#### Scenario: Content generated with default locale
- **WHEN** the browser locale is `'zh-TW'` or not provided
- **THEN** the system prompt SHALL contain the Traditional Chinese language instruction, maintaining backward compatibility
