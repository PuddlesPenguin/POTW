# POTW Design Changes

This document records the design and user-experience changes made while completing the Purdue Math Club Problem of the Week app.

## Design direction

The existing app already used dark charcoal backgrounds, warm cream cards, and muted gold accents. The completed pages keep that direction so the new work feels like part of the same site rather than a separate redesign.

The visual system intentionally stays small:

- **Page background:** charcoal (`#242424`)
- **Primary surface:** warm cream (`#f8f2e7`)
- **Borders and buttons:** muted Purdue-style gold (`#c8b48d` / `#cfb991`)
- **Primary dark text:** brown-black (`#332618`)
- **Secondary text:** muted brown or cream depending on the background
- **Shape:** small 4–6px corner radii, with no decorative gradients beyond the existing home background
- **Typography:** system fonts through Arial/Helvetica; no web-font dependency

The CSS uses normal class selectors, flexbox, and grid. No UI component library, CSS-in-JS package, animation package, or complicated design-token system was added.

## Global changes

- Added consistent `box-sizing: border-box` so widths and padding behave predictably.
- Added a system font stack and inherited form-control typography.
- Converted internal navigation from normal anchors to React Router links. This prevents full-page reloads while keeping the external Discord link in a new tab.
- Added explicit button types to prevent navigation buttons from accidentally submitting a surrounding form.
- Kept a single responsive breakpoint around 600px for page content; the existing navbar breakpoint remains in place.
- Added shared page styles in `src/pages/Page.css` for panels, cards, tables, statuses, headings, and empty states.

## Navbar

The navbar keeps the existing logo, navigation labels, login/signup controls, and mobile hamburger layout. The behavior changed in two small ways:

- Internal links now navigate client-side.
- The Discord link is clearly treated as an external destination.

The responsive menu still collapses below the existing 1010px breakpoint.

## Home page and current problem widget

The home introduction was rewritten to establish the Purdue Math Club context and tell visitors what they can do. The heading grammar was also corrected from “This weeks” to “This week’s.”

The problem widget was simplified and completed:

- Computational and Proof-based problems use two clear tabs.
- Problem metadata is shown in one compact, wrapping row.
- LaTeX remains supported through MathJax.
- Hints use the native `<details>` element, which is accessible and needs no custom JavaScript.
- Logged-out visitors see direct login and signup links instead of inactive submission controls.
- Logged-in users get one textarea, one optional file input, and one submit button.
- Text and file answers can be submitted together.
- Selected filenames, loading state, validation errors, and success messages are visible in the form.
- Uploads larger than 5 MB are blocked before the request is sent.
- The form stacks vertically on small screens.

This replaces the earlier “ready to submit” placeholder behavior with a real API request.

## Authentication pages

The existing login and signup card design was retained. The forms now include browser-level validation and autofill support:

- Required fields
- Username length limits
- Eight-character minimum password
- Correct `autocomplete` values for login, signup, email, and passwords
- Server error messages and loading button labels remain visible

The session returned by the API now includes a JWT. It is stored with the current user and attached only to protected API requests.

## Archive

The Archive placeholder is now a complete page that:

- Loads archived/non-current problems from the API
- Displays type, title, release date, difficulty, source, and LaTeX statement
- Uses a simple one-column card list so long mathematical content stays readable
- Includes loading, error, and empty states

## Leaderboard

The Leaderboard placeholder is now a responsive table with:

- Rank
- Username
- Unique problems solved
- Best-score points

The table sits inside a horizontally scrollable panel on narrow screens. Points count only the best correct score for each user/problem pair, so repeated correct submissions do not inflate totals.

## Profile and submission history

The Profile placeholder is now a protected page. Logged-out visitors are redirected to login. Logged-in users see:

- Username and email
- Total submission count
- Submission cards in newest-first order
- Problem name and type
- Submitted text or filename
- Pending, Correct, or Needs work status
- Score after grading
- Written grader feedback

Status colors are deliberately muted: green for correct, red for needs work, and gold for pending.

## Not-found page

Unknown URLs now render a styled not-found page with the normal navbar and a link back home instead of an unstyled heading.

## Responsive behavior

- Main content uses a constrained width with 16px side gutters.
- Cards and forms reduce padding on small screens.
- Submission actions stack on mobile.
- Tables can scroll horizontally rather than forcing the page wider than the viewport.
- The existing hamburger navigation handles tablet and mobile widths.

## Accessibility and interaction choices

- Page content uses semantic elements such as `main`, `header`, `section`, and `article`.
- Submission feedback uses `role="status"`.
- Form fields have visible labels.
- Native buttons, file inputs, details/summary, and tables are used instead of recreating them with generic elements.
- Active problem types retain both a color change and a bottom indicator.
- Empty, loading, and failure states are written as user-facing messages rather than leaving blank areas.

## Backend-driven design decisions

The interface reflects the PostgreSQL schema and completed API:

- Public problem responses never expose `solution_latex`.
- Problem types map to the two home tabs.
- Due dates are enforced by the API and shown in the UI.
- File storage uses PostgreSQL `bytea` for a setup with no additional storage service.
- Submission grading is reflected in profile status and leaderboard totals.
- JWT-protected routes keep profile and submission data private.

For the installation steps, database migration, environment variables, API routes, and production notes, see the main [README](README.md).
