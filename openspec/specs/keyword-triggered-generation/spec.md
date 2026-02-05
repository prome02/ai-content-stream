## ADDED Requirements

### Requirement: Keyword click triggers related content generation
When a user clicks a keyword link (`{{keyword:...}}`) inside an article, the system SHALL automatically generate one new article related to that keyword and append it to the bottom of the feed.

#### Scenario: User clicks a keyword in an article
- **WHEN** a user clicks a keyword link (e.g., "AI") inside an article's content
- **THEN** the system SHALL:
  1. Scroll the page to the bottom of the feed
  2. Generate exactly 1 new article related to the clicked keyword
  3. The new article SHALL appear at the bottom of the feed once generated

#### Scenario: Keyword is passed as prompt context
- **WHEN** keyword-triggered generation is initiated
- **THEN** the keyword SHALL be passed as `userFeedback` in the prompt context, so the LLM receives an instruction like "user expressed interest in: [keyword], please write content in this direction"

#### Scenario: Generation in progress prevents duplicate trigger
- **WHEN** content generation is already in progress and a user clicks another keyword
- **THEN** the system SHALL NOT trigger an additional generation (the click SHALL be ignored or queued)

### Requirement: ContentCard keyword click callback
The `ContentCard` component SHALL expose an `onKeywordClick` callback prop that passes the clicked keyword string to the parent component.

#### Scenario: ContentCard emits keyword click event
- **WHEN** a user clicks a keyword link inside a ContentCard
- **THEN** the `onKeywordClick` callback SHALL be called with the keyword string as argument
- **AND** the existing keyword click tracking (localStorage, event-track API) SHALL still execute
