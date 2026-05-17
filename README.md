# Arr Stack Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![version](https://img.shields.io/github/v/release/martinargalas/ha-arr-stack-card)](https://github.com/martinargalas/ha-arr-stack-card/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-brightgreen.svg)](https://www.home-assistant.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1503764189057908798?logo=discord&label=chat&color=5865F2&logoColor=white)](https://discord.gg/SUfDr52G)

<a href="https://buymeacoffee.com/argii" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

<a href="https://discord.gg/SUfDr52G" target="_blank"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord" height="50"></a>

<video src="https://github.com/user-attachments/assets/c53692f1-fd07-4c59-b7e3-d4bbf5d1c4c6" controls width="376" title="Mobile"></video>
<video src="https://github.com/user-attachments/assets/5505e08f-b85e-4ef5-be4a-e5b13b60166a" controls width="800" title="Tablet"></video>

A Home Assistant Lovelace card for managing your media server stack. Integrates Radarr, Sonarr, qBittorrent, SABnzbd, Overseerr/Jellyseerr, and Bazarr into a single unified dashboard.

> **Requires:** [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) — the companion HA proxy integration.

---

## Features

Library cards (Movies, TV Shows, Recently Added/Requested) display an **IMDB rating pill**, **audio language tags** (`CS | EN`), and a **Bazarr subtitle status badge**. Services not configured in the integration are hidden automatically — no YAML needed to disable them.

### Library

- **Recently Added** — mixed movies + TV shows with files, sorted by download date. TV shows show the most recently downloaded episode badge (e.g. `S04E04`).
- **Recently Requested** — monitored movies and shows not yet downloaded, with download status (downloading / missing / failed). Auto-refreshes when a download completes.
- **Movies (Radarr)** — full library with download status badges. Popup detail with poster, overview, ratings, and trailer link. **Interactive Search** — live indexer results with one-click grab. Request movies via Overseerr with quality profile selection.
- **TV Shows (Sonarr)** — library with per-season episode counts and progress bars. **Upcoming episodes calendar** with `S01E01` badges and air dates. Interactive Search per season or episode. Request shows via Overseerr with season selection.

### Downloads

- **qBittorrent** — active torrents with progress, speed, seeder/leecher counts. Pause, resume, stop seeding, delete (with or without files), global pause/resume, sort by progress or speed. Shows free disk space.
- **SABnzbd** — NZB queue with progress and speed, completed downloads inline, failed history with retry/delete, global pause/resume. Shows free/total disk space with usage bar (takes priority over qBittorrent disk data). **VPN shield indicator** on the SABnzbd header — green when VPN tunnel is active, red when off.

### Discovery (Overseerr / Jellyseerr)

- Trending, popular, and upcoming movies and TV shows
- One-click or profile-based media requests
- **Admin:** approve and decline pending requests with poster-style cards
- **Family accounts:** view and withdraw own requests

### Appearance & UX

- Day / night theming based on `sun.sun`
- Responsive layout — mobile, tablet, desktop
- Sticky bottom navigation bar on mobile
- Pagination for all sections; configurable columns per category
- **See More overlay** — full-screen grid for any section
- Visual card editor in HA (no YAML required for basic setup)
- Performance mode — disables backdrop blur; configurable card background colour and opacity

---

## Requirements

1. Home Assistant with HACS installed
2. [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) configured
3. At minimum: **Radarr**, **Sonarr**, and **Overseerr** (or Jellyseerr)

---

## Installation

### Via HACS (recommended)

1. Open HACS → **Frontend**
2. Click the **⋮** menu (top right) → **Custom repositories**
3. Add `https://github.com/martinargalas/ha-arr-stack-card` — category **Dashboard**
4. Click **+ Explore & Download Repositories**, search for **Arr Stack Card** and install
5. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)

### Manual

1. Download `arr-stack-card.js` from the latest release
2. Copy to `/config/www/arr-stack-card.js`
3. Add to Lovelace resources:
   ```yaml
   url: /local/arr-stack-card.js
   type: module
   ```

---

## Basic Configuration

The card works out of the box with zero configuration. It auto-detects all services configured via the integration and applies sensible defaults.

```yaml
type: custom:arr-stack-card
```

> **Visual editor** — most settings are available via the HA dashboard editor (click the pencil icon). Only `styles.*` keys require manual YAML editing.

---

## Full Configuration

```yaml
type: custom:arr-stack-card

# General
localisation: en             # en | cs  (default: en)
layout: both                 # both | left | right  (default: both)
sticky_nav_offset: 100       # px — when sticky nav bar appears on mobile  (default: 100)

# Download managers (left panel)
downloads:
  torrentItems: 3            # qBittorrent items per page  (default: 3)
  usenetItems: 3             # SABnzbd items per page  (default: 3)

# Discovery (right panel)
discover:
  categoriesCount: 3         # media categories shown per right-panel page  (default: 3)
  itemsPerCategory: 4        # columns per category grid  (default: 4)
  showMoreOnPage: 3          # page on which the "See More" overlay card appears  (default: 3)
  oneClickRequest: false     # skip quality-profile dialog on movie/show request  (default: false)
  oneClickDefaultMovieProfile: ""  # quality profile name for one-click movie requests
  oneClickDefaultShowProfile: ""   # quality profile name for one-click TV requests

# Category order & visibility
categories:
  - id: recentlyAdded
    enabled: true
  - id: recentlyRequested
    enabled: true
  - id: upcoming
    enabled: true
  - id: tvUpcoming
    enabled: true
  - id: trending
    enabled: true
  - id: popular
    enabled: true
  - id: calendar
    enabled: true

# Appearance
styles:
  performanceMode: false          # disable backdrop blur (improves perf on low-end devices)
  cardBackground: "#121216"       # card background colour (performance mode only)
  cardBackgroundOpacity: 90       # card background opacity 0–100 (performance mode only, default: 90)
  dayNightMode: true              # auto switch popup colours based on sun.sun — set false to keep night colours always
  searchBarIconColor: ""          # search bar icon colour when inactive (default: heading colour)
  headingTextColor: "#ffffff"
  headingColor: "#ffffff"
  primaryTextColor: "#ffffff"
  secondaryTextColor: "#aaaaaa"
  pagingButtonTextColor: "#ffffff"
  pagingButtonBackgroundColor: "#1e1e2e"
  pagingDotColor: "#555555"
  pagingDotActiveColor: "#ffffff"
  downloadButtonTextColor: "#ffffff"
  tagPillTextColor: "#ffffff"
  modalHeadingTextColor: "#ffffff"
  modalPrimaryTextColor: "#ffffff"
  modalSecondaryTextColor: "#aaaaaa"
  modalBackgroundColor: "#121216"      # set dayNightMode: false when using a custom colour
  modalOverlayColor: "#000000"
  modalCloseButtonIconColor: "#ffffff"
  modalCloseButtonBackgroundColor: "#333344"
  modalButtonTextColor: "#ffffff"
  modalButtonBackgroundColor: "#1e1e2e"
  modalRemoveButtonBackgroundColor: "#ff6030"
```

### Category IDs

| id | Section |
|----|---------|
| `recentlyAdded` | Recently Added |
| `recentlyRequested` | Recently Requested |
| `upcoming` | Upcoming Movies |
| `tvUpcoming` | New Shows |
| `trending` | Trending |
| `popular` | Popular Movies |
| `calendar` | Sonarr episode calendar |

### Style notes

- All colour values accept `#rrggbb` hex or `rgb(r,g,b)`.
- `dayNightMode: true` (default) — popup follows `sun.sun`. Set `false` to always use dark colours, required when setting custom `modal*` colours so day mode doesn't override them.
- `performanceMode: true` — disables backdrop blur; `cardBackground` and `cardBackgroundOpacity` apply only in this mode.
- `modalRemoveButtonBackgroundColor` — affects only the **Remove ›** button, not the sub-buttons (Remove from Library / Remove from Disc).

---

## Multi-user setup (Overseerr / Jellyseerr)

| HA account | What they can do |
|------------|-----------------|
| Admin | Browse, request, **approve/decline** pending requests |
| Non-admin | Browse, request, view and withdraw own requests |

The card detects the HA user role automatically (`hass.user.is_admin`). No extra card config needed.

**Setup:**

1. **Overseerr** — create a non-admin user (Settings → Users → Add User).
2. **Home Assistant** — create a non-admin HA user for each family member (Settings → People → Add Person → uncheck Administrator).
3. **Integration** — in the Arr Stack integration config, enter the non-admin Overseerr user's email and password. The proxy forwards requests under that user's identity.

---

## License

MIT
