# Arr Stack Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![version](https://img.shields.io/github/v/release/martinargalas/ha-arr-stack-card)](https://github.com/martinargalas/ha-arr-stack-card/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1%2B-brightgreen.svg)](https://www.home-assistant.io)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Discord](https://img.shields.io/discord/1503764189057908798?logo=discord&label=chat&color=5865F2&logoColor=white)](https://discord.gg/CA83tqYZ)

<a href="https://buymeacoffee.com/argii" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50"></a>

<a href="https://discord.gg/CA83tqYZ" target="_blank"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Join Discord" height="50"></a>

Manage your full media server stack — Radarr, Sonarr, qBittorrent, SABnzbd, Overseerr/Jellyseerr, Bazarr, Plex, Tautulli, Jellystat, Prowlarr, and Trakt — directly from Home Assistant with a single unified dashboard card.

![Arr Stack Card preview](screenshot.png)

<table><tr>
<td><img src="trakt.gif" alt="Trakt Seen & Skip"></td>
<td><img src="mobile.gif" alt="Mobile"></td>
</tr></table>

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

The card automatically shows only the services you have configured. No YAML required to get started.

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
| Tautulli | Watch history, statistics, and usage graphs | Optional |
| Jellystat | Watch history, statistics, and usage graphs | Optional |
| Prowlarr | Indexer management and search statistics | Optional |
| Trakt | Personalised movie & show recommendations | Optional |

Services not configured in the integration are hidden automatically — no manual configuration needed.

---

## Features

### Downloads (left panel)

The left panel appears only when at least one download manager (qBittorrent or SABnzbd) is configured.

- **qBittorrent** — active torrents with download and upload speed, progress, seeder/leecher counts. Pause, resume, stop seeding, delete (with or without files), global pause/resume, sort by progress or speed. Total speed chip shows combined download and upload across all active torrents.
- **SABnzbd** — NZB queue with progress and speed, completed downloads inline, failed history with retry/delete, global pause/resume. **VPN shield indicator** — green when VPN tunnel is active, red when off.
- **Disk space** — free space with usage bar, sourced from Radarr and Sonarr root folders. Disks are deduplicated automatically. If your media is spread across multiple disks, use the chevron arrows to page through them.

### Right panel — configurable sections

The right panel is modular. You choose which sections appear and in what order via the visual editor. Each section can be enabled or disabled independently.

#### Library (Radarr / Sonarr)

- **Recently Added** — mixed movies + TV shows with files, sorted by download date.
- **Recently Requested** — monitored movies and shows not yet downloaded, with download status.
- **Movies** — full Radarr library with download status, IMDB rating, audio language tags, and Bazarr subtitle status. Popup with poster, overview, ratings, and trailer link. **Interactive Search** — live indexer results with one-click grab.
- **TV Shows** — full Sonarr library with per-season progress bars, ratings, and subtitle status. **Upcoming episodes calendar** with air dates. Interactive Search per season or episode.

#### Discovery & Recommendations

- **Trending, popular, upcoming** — movies and TV shows, always available
- **Trakt recommendations** — personalised movie and show suggestions based on your Trakt watch history. Movies and shows are mixed together for variety. Each poster has two interactive buttons on its edges:
  - **Seen** (left edge) — marks the title as watched on Trakt. This improves future recommendations by feeding your actual watch history back into the algorithm. The card immediately replaces the dismissed poster with the next recommendation.
  - **Skip** (right edge) — hides the title from your recommendations without marking it as watched. Use this for titles you're simply not interested in, without affecting your Trakt history or stats.

  For recommendations to reflect what you've actually watched, you need a scrobbler that syncs your plays to Trakt automatically. If you use Plex, [PlexTraktSync](https://github.com/Taxel/PlexTraktSync) handles this — run it as a Docker container in `watch` mode and it will mark titles as watched on Trakt in real time.
- One-click or profile-based requests directly to Radarr/Sonarr, or via Overseerr/Jellyseerr
- **With Overseerr / Jellyseerr:** approve and decline pending requests, family account support with per-user request management

#### Now Playing (Plex)

Live view of active streams — title, progress, and user. Auto-hidden when nothing is playing.

Requires the official [Plex](https://www.home-assistant.io/integrations/plex/) HA integration. Configuring Plex in the Arr Stack Integration additionally enables:
- Active user shown on the stream card
- Remote stream termination (stop with a message) — works for all clients
- Full playback controls (play, pause, next, previous) — Plexamp only

> **Plex Server URL** — the integration auto-detects your server address during setup. If Home Assistant runs on a different machine or VLAN than Plex, you can override it with the address HA can reach (e.g. `http://192.168.1.10:32400`).

#### Activity Queue

Four-tab panel covering everything happening across your Radarr and Sonarr instances. Admin-only.

- **Queue** — what's downloading right now with progress, quality, and ETA. Manual Import or one-click remove with blocklist option.
- **History** — recent grabs and imports, filterable by event type, source, or quality.
- **Blocklist** — manage blocked releases.
- **Missing** — everything without a file. Filter, adjust monitoring, and trigger Interactive or Auto Search without leaving the panel.

The panel fits exactly as many items as your screen allows — no overflow, no scrollbar, clean layout from the first load.

#### Statistics (Tautulli / Jellystat)

Playback statistics from Tautulli or Jellystat (configure either or both). Admin-only.

- Watch history with search and filters
- Play count and duration charts by day, day of week, hour, and media type
- Per-user and per-library statistics
- **Account sharing detection** — flags when the same account streams from multiple IPs simultaneously

#### Indexers (Prowlarr)

Indexer overview and search statistics from Prowlarr.

- Indexer health and status at a glance
- Per-indexer search success rate and response time
- User-agent breakdown — which apps hit your indexers and how often

### Appearance & UX

- Day / night theming based on `sun.sun`
- Responsive layout — mobile, tablet, desktop
- Sticky navigation bar on mobile
- Pagination for all sections; configurable columns per category
- **See More overlay** — full-screen grid for any section
- Visual card editor in HA (no YAML required for basic setup)
- Performance mode — disables backdrop blur

---

## Requirements

1. Home Assistant 2024.1+ with HACS installed
2. [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) configured with at least Radarr and Sonarr
3. Everything else is optional — unconfigured services are hidden automatically

### Self-signed certificates / reverse proxies

If any of your services uses a self-signed or untrusted certificate, enable **Skip SSL certificate verification** in the integration's Global Settings. This covers all services at once.

---

## Installation

### Via HACS (recommended)

1. Open HACS → **Frontend**
2. Click the **⋮** menu (top right) → **Custom repositories**
3. Add `https://github.com/martinargalas/ha-arr-stack-card` — category **Dashboard**
4. Search for **Arr Stack Card** and install
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

> **Visual editor** — most settings are available via the HA dashboard editor (click the pencil icon). Only `styles.*` and `security.*` keys require manual YAML editing.

```yaml
type: custom:arr-stack-card

# General
localisation: en             # en | cs  (default: en)
layout: both                 # both | left | right  (default: both)
swap_sides: false            # swap left and right panels  (default: false)
                             # Note: on mobile, right panel moves above left. Set sticky_nav_offset ~2000 for nav to appear immediately.
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
  oneClickRequest: false     # skip request overlay — uses defaults below  (default: false)
  oneClickDefaultMovieProfile: ""     # quality profile name for one-click movie requests
  oneClickDefaultMovieTag: ""         # Radarr tag for one-click movie requests  (optional)
  oneClickDefaultMovieRootFolder: ""  # Radarr root folder for one-click movie requests  (optional)
  oneClickDefaultShowProfile: ""      # quality profile name for one-click TV requests
  oneClickDefaultShowTag: ""          # Sonarr tag for one-click TV requests  (optional)
  oneClickDefaultShowRootFolder: ""   # Sonarr root folder for one-click TV requests  (optional)

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
  - id: trakt
    enabled: false
  - id: calendar
    enabled: true
  - id: streams
    enabled: false
  - id: tautulli
    enabled: false
  - id: jellystat
    enabled: false
  - id: activity
    enabled: false
  - id: prowlarr
    enabled: false

# Security
security:
  ip_sharing_threshold: 2    # unique IPs per user before sharing warning appears  (default: 2)
  ip_history_depth: 200      # history records scanned for IP detection  (default: 200)

# Appearance
styles:
  performanceMode: false          # disable backdrop blur
  cardBackground: "#121216"       # card background colour (performance mode only)
  cardBackgroundOpacity: 90       # card background opacity 0–100 (performance mode only)
  dayNightMode: true              # auto switch popup colours based on sun.sun
  searchBarIconColor: ""
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
| `trakt` | Trakt Recommendations |
| `calendar` | Episode Calendar (Sonarr) |
| `streams` | Now Playing (Plex) — auto-hidden when nothing plays |
| `tautulli` | Statistics (Tautulli) |
| `jellystat` | Statistics (Jellystat) |
| `activity` | Activity Queue (admin only) |
| `prowlarr` | Indexers (Prowlarr) |

---

## Multi-user setup (Overseerr / Jellyseerr — optional)

> Without Overseerr/Jellyseerr, all HA users can add media directly to Radarr/Sonarr.

| HA account | What they can do |
|------------|-----------------|
| Admin | Browse, request, **approve/decline** pending requests |
| Non-admin | Browse, request, view and withdraw own requests |

**Setup:**

1. In Overseerr/Jellyseerr — create a non-admin user (Settings → Users → Add User).
2. In Home Assistant — create a non-admin HA user for each family member (Settings → People → Add Person → uncheck Administrator).
3. In the Arr Stack integration settings — enter the non-admin Overseerr user's email and password.

---

## License

MIT
