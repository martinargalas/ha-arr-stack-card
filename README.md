# Arr Stack Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![version](https://img.shields.io/github/v/release/martinargalas/ha-arr-stack-card)](https://github.com/martinargalas/ha-arr-stack-card/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-brightgreen.svg)](https://www.home-assistant.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1503764189057908798?logo=discord&label=chat&color=5865F2&logoColor=white)](https://discord.gg/SUfDr52G)

<a href="https://buymeacoffee.com/argii" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

<a href="https://discord.gg/SUfDr52G" target="_blank"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord" height="50"></a>

Manage your full media server stack — Radarr, Sonarr, SABnzbd, qBittorrent, Overseerr/Jellyseerr, Bazarr, Plex, Jellyfin, and Tautulli — directly from Home Assistant with a single unified dashboard card.

![Arr Stack Card preview](screenshot.png)

<video src="https://github.com/user-attachments/assets/c53692f1-fd07-4c59-b7e3-d4bbf5d1c4c6" controls width="376" title="Mobile"></video>
<video src="https://github.com/user-attachments/assets/5505e08f-b85e-4ef5-be4a-e5b13b60166a" controls width="800" title="Tablet"></video>

---

> [!IMPORTANT]
> This project consists of **two components** — both are required:
> - **[Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration)** — backend proxy (install first)
> - **Arr Stack Card** (this repo) — the Lovelace frontend card

---

## Quick Setup

1. Install **[Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration)** via HACS → Integrations
2. Install **Arr Stack Card** via HACS → Frontend (see [Installation](#installation) below)
3. Add `custom:arr-stack-card` to your dashboard — done

```yaml
type: custom:arr-stack-card
```

The card auto-detects all configured services. No YAML configuration required to get started.

---

## How it works

```
HA Dashboard  →  Arr Stack Card  →  Arr Stack Integration  →  Radarr / Sonarr / Plex / …
```

The card never calls your services directly. All API calls go through the HA integration proxy — your credentials stay in Home Assistant, not in the browser.

---

## Supported services

| Service | Role | Required |
|---------|------|----------|
| Radarr | Movie library, downloads, interactive search | ✅ Yes |
| Sonarr | TV library, episode calendar, downloads | ✅ Yes |
| Radarr 2 | Second Radarr instance — HD + 4K workflow | Optional |
| Sonarr 2 | Second Sonarr instance — HD + 4K workflow | Optional |
| qBittorrent | Torrent download management | Optional |
| SABnzbd | Usenet download management | Optional |
| Overseerr / Jellyseerr | Media requests, discovery, approvals | Optional |
| Bazarr | Subtitle status per movie/show | Optional |
| Plex | Active stream monitoring and playback control | Optional |
| Jellyfin | Active stream monitoring | Optional |
| Tautulli | Watch history, statistics, and usage graphs | Optional |

Services not configured in the integration are hidden automatically.

---

## Features

### Downloads (left panel)

The left panel shows your download managers. Each section only appears if that service is configured in the integration — if you only use qBittorrent, SABnzbd won't show up, and vice versa.

- **qBittorrent** — active torrents with progress, speed, seeder/leecher counts. Pause, resume, stop seeding, delete (with or without files), global pause/resume, sort by progress or speed.
- **SABnzbd** — NZB queue with progress and speed, completed downloads inline, failed history with retry/delete, global pause/resume. **VPN shield indicator** — green when VPN tunnel is active, red when off.
- **Disk space** — free space with usage bar, sourced from Radarr and Sonarr root folders. Root folders on the same physical disk are automatically deduplicated (by free space) and their paths combined (e.g. `movies · tv`). If your media is spread across multiple disks, each disk appears as a separate card — use the chevron arrows to page through them. The card defaults to showing the disk that matches your SABnzbd download directory.

### Right panel — configurable sections

The right panel is a modular dashboard. You choose which sections appear and in what order via the visual editor. Each section is powered by a different service and can be enabled or disabled independently.

#### Library (Radarr / Sonarr)

- **Recently Added** — mixed movies + TV shows with files, sorted by download date. TV shows show the most recently downloaded episode badge (e.g. `S04E04`).
- **Recently Requested** — monitored movies and shows not yet downloaded, with download status (downloading / missing / failed). Auto-refreshes when a download completes.
- **Movies** — full Radarr library with download status badges, IMDB rating, audio language tags (`CS | EN`), and Bazarr subtitle status. Popup with poster, overview, ratings, and trailer link. **Interactive Search** — live indexer results with one-click grab.
- **TV Shows** — full Sonarr library with per-season progress bars, IMDB rating, audio language tags, and Bazarr subtitle status. **Upcoming episodes calendar** with `S01E01` badges and air dates. Interactive Search per season or episode.

#### Library — dual instances (Radarr 2 / Sonarr 2)

Configure a second Radarr and/or Sonarr instance for HD + 4K workflows. The popup shows per-instance status chips (available / downloading / missing) and lets you choose which instance to search or remove from.

#### Discovery (Overseerr / Jellyseerr — optional)

- **Trending, popular, upcoming** — movies and TV shows sourced from Overseerr/Jellyseerr
- One-click or profile-based media requests
- **Admin:** approve and decline pending requests with poster-style cards
- **Family accounts:** view and withdraw own requests

Without Overseerr, trending/popular/upcoming sections are hidden. Movies and shows can still be added directly to Radarr/Sonarr from search results.

#### Now Playing (Plex / Jellyfin)

Requires the [Plex](https://www.home-assistant.io/integrations/plex/) and/or [Jellyfin](https://www.home-assistant.io/integrations/jellyfin/) HA integration installed — the card reads active sessions from their `media_player` entities automatically.

- Live view of active streams — title, user, media type, and playback progress
- Playback control: pause, resume, stop — works for most Plex clients; Android phones and web browsers are not supported
- Auto-hidden when no streams are active

#### Statistics (Tautulli)

- Watch history with search and filters
- Play count and duration charts by day, day of week, hour, and media type
- Stream type breakdown and concurrent stream graph
- Per-user and per-library statistics

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

1. Home Assistant 2024.1+ with HACS installed
2. [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) configured
3. At minimum: **Radarr** and **Sonarr** — everything else is optional

All other services are optional — unconfigured services are hidden automatically.

**With Overseerr / Jellyseerr** you additionally get:
- Trending, popular, and upcoming movie/show sections
- One-click media requests with quality profile selection
- Admin: approve and decline pending requests
- Family accounts: household members can request and withdraw their own media

### Now Playing (Plex / Jellyfin)

The Now Playing section reads from standard HA `media_player` entities — no Arr Stack Integration config needed. The card picks up any entity whose ID starts with `media_player.plex_` or `media_player.jellyfin_`, which is the default naming created by the official HA integrations.

**Setup:**
- **Plex** — install the [Plex integration](https://www.home-assistant.io/integrations/plex/) in HA. It will create `media_player.plex_*` entities automatically for each active session.
- **Jellyfin** — install the [Jellyfin integration](https://www.home-assistant.io/integrations/jellyfin/) in HA. It will create `media_player.jellyfin_*` entities automatically.

No custom entity naming required. The Now Playing section auto-hides when nothing is playing.

Playback control (pause, resume, stop) is available for Plex and works for most clients. Android phones and web browsers are not supported.

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

## Full Configuration

> **Visual editor** — most settings are available via the HA dashboard editor (click the pencil icon). Only `styles.*` keys require manual YAML editing.

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
  oneClickRequest: false     # skip request overlay on movie/show request — uses defaults below  (default: false)
  oneClickDefaultMovieProfile: ""  # quality profile name for one-click movie requests
  oneClickDefaultMovieTag: ""      # Radarr tag label for one-click movie requests  (optional)
  oneClickDefaultMovieRootFolder: ""  # Radarr root folder path for one-click movie requests  (optional)
  oneClickDefaultShowProfile: ""   # quality profile name for one-click TV requests
  oneClickDefaultShowTag: ""       # Sonarr tag label for one-click TV requests  (optional)
  oneClickDefaultShowRootFolder: ""   # Sonarr root folder path for one-click TV requests  (optional)

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
  - id: streams
    enabled: true
  - id: tautulli
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
| `streams` | Now Playing (Plex / Jellyfin) — auto-hidden when nothing plays |
| `tautulli` | Statistics (Tautulli) |

### Style notes

- All colour values accept `#rrggbb` hex or `rgb(r,g,b)`.
- `dayNightMode: true` (default) — popup follows `sun.sun`. Set `false` to always use dark colours, required when setting custom `modal*` colours so day mode doesn't override them.
- `performanceMode: true` — disables backdrop blur; `cardBackground` and `cardBackgroundOpacity` apply only in this mode.
- `modalRemoveButtonBackgroundColor` — affects only the **Remove ›** button, not the sub-buttons (Remove from Library / Remove from Disc).

---

## Multi-user setup (Overseerr / Jellyseerr — optional)

> This section only applies if you have Overseerr or Jellyseerr configured. Without it, all HA users (admin and non-admin) can add media directly to Radarr/Sonarr.

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
