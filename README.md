# Arr Stack Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![version](https://img.shields.io/github/v/release/martinargalas/ha-arr-stack-card)](https://github.com/martinargalas/ha-arr-stack-card/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-brightgreen.svg)](https://www.home-assistant.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1503764189057908798?logo=discord&label=chat&color=5865F2&logoColor=white)](https://discord.gg/SUfDr52G)

<a href="https://buymeacoffee.com/argii" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

<a href="https://discord.gg/SUfDr52G" target="_blank"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord" height="50"></a>

<img width="376" height="746" alt="ScreenRecording2026-05-08at11 52 14-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/80a9ec5a-8556-4ccb-b7d6-d21761cbce55" />
<img width="800" height="366" alt="ScreenRecording2026-05-07at12 40 00-ezgif com-video-to-gif-converter" src="https://github.com/user-attachments/assets/dacd65e8-a41d-4e92-8749-8b963c5a7525" />

A feature-rich Home Assistant Lovelace card for managing your media server stack. Integrates Radarr, Sonarr, qBittorrent, SABnzbd, Overseerr/Jellyseerr, and Bazarr into a single unified dashboard.

> **Requires:** [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) — the companion HA proxy integration.

---

## Features

### Movies (Radarr)
- Library overview with download status badges (downloading, missing, available)
- **IMDB rating pill** on each movie card
- Audio language tags (`CS | EN`) and Bazarr subtitle status badges, shown below the rating
- Popup detail with poster, overview, ratings, and trailer link
- Interactive Search — live indexer search with grab support directly from the card
- Movie requests via Overseerr with quality profile selection

### TV Shows (Sonarr)
- Library overview with per-season episode counts and progress bars
- **IMDB rating pill** on each show card
- **Upcoming episodes calendar** — shows airing date and `S01E01` badge per episode
- Interactive Search per season (season pack) or per episode
- TV show requests via Overseerr with season selection

### Downloads (qBittorrent)
- Active torrent list with progress, speed, and seeder/leecher counts
- Pause, resume, stop seeding, and delete (with or without files)
- Global pause/resume all
- Sort by progress or speed
- **Disk usage** — free space read from qBittorrent (shown only when qBittorrent is configured)

### Downloads (SABnzbd)
- Active NZB queue with progress and speed
- Failed downloads history with retry and delete actions
- Global pause/resume
- **Disk usage** — free/total space with usage bar (priority over qBittorrent disk data)
- Section hidden automatically when SABnzbd is not configured

### Discover (Overseerr / Jellyseerr)
- Trending, popular, and upcoming movies
- New and upcoming TV shows — shows airing date on New Shows cards
- Trending TV shows display rating
- One-click or profile-based media requests
- Admin: approve and decline pending requests
- Family account: view and withdraw own requests

### Appearance & UX
- Day / night theming (based on `sun.sun` entity)
- Responsive layout — mobile, tablet, desktop
- Sticky bottom navigation bar on mobile
- Pagination for all sections with `itemsPerCategory` columns control
- **Section overlay** — full-screen browsing grid via "See More" card (configurable page)
- Visual card editor in HA (no YAML required for basic setup)
- Performance mode — disables backdrop blur; card background colour and transparency configurable

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

The card works out of the box with zero configuration. It auto-detects all services configured via the integration (Radarr, Sonarr, qBittorrent, SABnzbd, Overseerr/Jellyseerr, Bazarr) and applies sensible defaults.

```yaml
type: custom:arr-stack-card
```

That's it. The card will show all available panels, use English UI, display 3 categories per page with 4 items each, and support one-click requesting if Overseerr is configured.

> **Visual editor** — most settings can be configured via the HA dashboard editor (click the pencil icon). Only `searchBarIconColor` and `styles.*` require manual YAML editing.

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
  oneClickDefaultMovieProfile: ""  # quality profile name for one-click movie requests  (default: first profile)
  oneClickDefaultShowProfile: ""   # quality profile name for one-click TV requests  (default: first profile)

# Category order & visibility
categories:
  - id: radarr
    enabled: true
  - id: sonarr
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
  searchBarIconColor: ""          # search bar icon colour when search is inactive (default: heading colour)
  headingTextColor: "#ffffff"     # section header text
  headingColor: "#ffffff"         # section header icon
  primaryTextColor: "#ffffff"     # main text (titles)
  secondaryTextColor: "#aaaaaa"   # subtitles, metadata
  pagingButtonTextColor: "#ffffff"
  pagingButtonBackgroundColor: "#1e1e2e"
  pagingDotColor: "#555555"
  pagingDotActiveColor: "#ffffff"
  downloadButtonTextColor: "#ffffff"
  tagPillTextColor: "#ffffff"
  modalHeadingTextColor: "#ffffff"
  modalPrimaryTextColor: "#ffffff"
  modalBackgroundColor: "#121216"
  modalCloseButtonIconColor: "#ffffff"
  modalCloseButtonBackgroundColor: "#333344"
  modalButtonTextColor: "#cccccc"
  modalButtonBackgroundColor: "#1e1e2e"
```

---

## Configuration Reference

### Top-level

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `localisation` | `cs` \| `en` | `en` | UI language |
| `layout` | `both` \| `left` \| `right` | `both` | Which panels to show |
| `sticky_nav_offset` | number | `100` | px from top where the floating nav bar appears (mobile/tablet) |

### `downloads`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `torrentItems` | number | `3` | qBittorrent rows per page |
| `usenetItems` | number | `3` | SABnzbd rows per page |

### `discover`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `categoriesCount` | number | `3` | Media sections visible per right-panel page |
| `itemsPerCategory` | number | `4` | Number of columns per category grid. Increase for wide screens. |
| `showMoreOnPage` | number | `3` | Page number on which the "See More" card appears as the last slot. Clicking it opens a full-screen overlay. |
| `oneClickRequest` | boolean | `false` | Skip quality-profile dialog — request movie/show instantly |
| `oneClickDefaultMovieProfile` | string | `""` | Quality profile name for one-click movie requests (uses first profile if empty) |
| `oneClickDefaultShowProfile` | string | `""` | Quality profile name for one-click TV show requests (uses first profile if empty) |

### `categories`

Array of `{ id, enabled }` objects controlling visibility and order of right-panel sections.

| id | Section |
|----|---------|
| `radarr` | Recent movies from Radarr |
| `sonarr` | Recent TV shows from Sonarr |
| `upcoming` | Upcoming movie releases (Overseerr) |
| `tvUpcoming` | New TV show releases (Overseerr) |
| `trending` | Trending movies & shows (Overseerr) |
| `popular` | Popular movies (Overseerr) |
| `calendar` | Upcoming Sonarr episode air dates |

### `styles`

All colour values accept `#rrggbb` hex or `rgb(r,g,b)` strings.

| Option | Affects |
|--------|---------|
| `performanceMode` | Disables backdrop blur on the card — recommended on low-end devices |
| `cardBackground` | Card background colour (applied only in performance mode) |
| `cardBackgroundOpacity` | Card background opacity 0–100 (performance mode only, default `90`) |
| `searchBarIconColor` | Search bar icon colour when search field is inactive. Defaults to heading colour on focus/type. |
| `headingTextColor` | Section header text colour |
| `headingColor` | Section header icon colour |
| `primaryTextColor` | Primary text (movie/show titles on poster cards) |
| `secondaryTextColor` | Secondary text (year, quality, metadata) |
| `pagingButtonTextColor` | Prev/Next paging button text |
| `pagingButtonBackgroundColor` | Prev/Next paging button background |
| `pagingDotColor` | Inactive pagination dot |
| `pagingDotActiveColor` | Active pagination dot |
| `downloadButtonTextColor` | Download action button text |
| `tagPillTextColor` | Media type tag pill text (Movie / TV) |
| `modalHeadingTextColor` | Popup title text |
| `modalPrimaryTextColor` | Popup body text (overview, metadata) |
| `modalBackgroundColor` | Popup glass background |
| `modalCloseButtonIconColor` | Popup close button icon |
| `modalCloseButtonBackgroundColor` | Popup close button background |
| `modalButtonTextColor` | Popup action button text (IS, Remove…) |
| `modalButtonBackgroundColor` | Popup action button background |

---

## SABnzbd disk info

SABnzbd reports disk space based on the **Temporary Download Folder** path configured in SABnzbd → Settings → Folders. Make sure:

- You use the **API Key** (not the NZB Key) — found in SABnzbd → Config → General → **API Key**
- The Temporary Download Folder path is valid and accessible

---

## Related

- [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) — required companion proxy integration

---

## License

MIT
