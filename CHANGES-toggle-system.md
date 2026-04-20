# Toggle system initiative — Landing scope

**Initiative**: `feat/login-redesign-toggle-system` (runs across `4everacy-platform`, `4everacy-admin`, and this repo).

## Landing-repo changes

The landing page is a **static marketing site** with no preference toggles,
login form, or privacy settings — the initiative does not introduce a
React `<Toggle4E/>` component here. Only the following minor polish was
applied for consistency with the new OmniDare cyan-accent design system:

- `.nav-toggle` (mobile hamburger): bumped tap target to 44×44 px
  (WCAG 2.5.5), switched focus-ring colour from `#a78bfa` to
  `#22d3ee` (cyan-400), added subtle hover styling.

## Out of scope for landing

- Login redesign — lives on `4everacy-platform` (`client/src/pages/auth-page.tsx`).
- Admin login redesign — lives on `4everacy-admin` (`client/src/pages/admin-login.tsx`).
- Professional `<Toggle4E/>` component + unit tests — lives on platform + admin.
- Privacy-settings toggle fixes — lives on platform (`privacy-center.tsx`, `advanced-privacy-controls.tsx`).

See the paired PRs on the platform and admin repos for the full scope.
