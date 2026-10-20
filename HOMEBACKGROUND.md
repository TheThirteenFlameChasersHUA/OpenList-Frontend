# Home background (fork extension)

This frontend fork adds an optional, admin-managed background for the home page.
It requires the matching OpenList backend fork because the settings live in a
fork-specific settings group (`100`).

## Files

- `src/components/home-background/` — rendering, value parsing, image upload
  compression and scoped CSS
- `src/pages/manage/settings/Background.tsx` — admin page (presets, URL/CSS
  input, local upload, preview, save)
- `src/pages/home/Layout.tsx` — one wrapper around the existing home content
- `src/pages/manage/sidemenu_items.tsx` — one settings submenu entry
- `src/lang/en/*.json` — English strings; other locales come from Crowdin

## Backend settings

| key                    | default                  |
| ---------------------- | ------------------------ |
| `home_background`      | empty (feature disabled) |
| `home_background_blur` | `0`                      |
| `home_background_mask` | `50`                     |

The settings are public, so `/api/public/settings` exposes them to the home
page. The admin page reads and writes group `100` through the existing
`/api/admin/setting/list` and `/api/admin/setting/save` endpoints.

## Upstream update notes

- Keep the feature isolated in `src/components/home-background/` and
  `Background.tsx`.
- The home integration is deliberately one wrapper; if upstream rewrites
  `Layout.tsx`, re-apply that wrapper (or mount `HomeBackground` from the new
  layout root).
- Do not extend the upstream `Group` enum; use `BACKGROUND_GROUP` from
  `src/components/home-background/group.ts`.
- If upstream changes the settings page API, only `Background.tsx` needs to be
  adapted.
- If upstream adds its own background feature, keep the namespaced settings and
  decide whether to migrate or remove this extension.
