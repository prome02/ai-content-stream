## MODIFIED Requirements

### Requirement: Feed content ordering
The system SHALL display feed content in chronological order (oldest first, newest last), so that new articles are appended to the bottom of the feed list.

#### Scenario: New article appears at the bottom
- **WHEN** a new article is generated and saved to Firestore
- **THEN** the article SHALL appear at the end (bottom) of the feed list, after all existing articles

#### Scenario: Existing reading position is preserved
- **WHEN** a user is reading an article in the middle of the feed and new content is generated
- **THEN** the user's current scroll position SHALL NOT change, and the new content SHALL be appended below

#### Scenario: Infinite scroll sentinel is pushed out of viewport
- **WHEN** new articles are appended to the bottom of the feed
- **THEN** the sentinel element SHALL be positioned below the new articles, outside the visible viewport (beyond the 200px rootMargin), preventing the IntersectionObserver from re-triggering

### Requirement: Firestore query sort direction
The Firestore subscription query in `subscribeToUserFeed` and `getUserFeed` SHALL use `orderBy('createdAt', 'asc')` to return content in chronological order.

#### Scenario: Subscription returns chronological order
- **WHEN** the system subscribes to user feed via `subscribeToUserFeed`
- **THEN** the Firestore query SHALL use `orderBy('createdAt', 'asc')` and content SHALL be returned from oldest to newest
