# Arr Stack Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hacs/integration)
[![version](https://img.shields.io/github/v/release/martinargalas/ha-arr-stack-card)](https://github.com/martinargalas/ha-arr-stack-card/releases)
[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2023.x%2B-brightgreen.svg)](https://www.home-assistant.io)
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
- Subtitle status from Bazarr (missing / available languages)
- Popup detail with poster, overview, ratings, and trailer link
- Interactive Search — live indexer search with grab support directly from the card
- Movie requests via Overseerr with quality profile selection

### TV Shows (Sonarr)
- Library overview with per-season episode counts and progress bars
- Upcoming episodes calendar
- Interactive Search per season (season pack) or per episode
- TV show requests via Overseerr with season selection

### Downloads (qBittorrent)
- Active torrent list with progress, speed, and seeder/leecher counts
- Pause, resume, stop seeding, and delete (with or without files)
- Global pause/resume all
- Sort by progress or speed

### Downloads (SABnzbd)
- Active NZB queue with progress and speed
- Failed downloads history with retry and delete actions
- Global pause/resume

### Discover (Overseerr / Jellyseerr)
- Trending, popular, and upcoming movies
- New and upcoming TV shows
- One-click or profile-based media requests
- Admin: approve and decline pending requests
- Family account: view and withdraw own requests

### Appearance & UX
- Day / night theming (based on `sun.sun` entity)
- Responsive layout — mobile, tablet, desktop
- Sticky bottom navigation bar on mobile
- Pagination for all sections
- Visual card editor in HA (no YAML required for basic setup)
- Performance mode — disables backdrop blur for low-end devices

---

## Requirements

1. Home Assistant with HACS installed
2. [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) configured
3. At minimum: **Radarr**, **Sonarr**, and **Overseerr** (or Jellyseerr)

---

## Installation

### Via HACS (recommended)

1. Open HACS → Frontend
2. Click **+ Explore & Download Repositories**
3. Search for **Arr Stack Card** and install
4. Hard refresh your browser (Cmd+Shift+R / Ctrl+Shift+R)

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

```yaml
type: custom:arr-stack-card
```

The card can be fully configured via the visual editor in HA. Click the pencil icon when editing your dashboard.

---

## Full Configuration

```yaml
type: custom:arr-stack-card

# General
localisation: en          # en | cs
layout: both              # both | left | right

# Download managers (left panel)
downloads:
  torrentItems: 3         # qBittorrent items per page
  usenetItems: 3          # SABnzbd items per page

# Discovery (right panel)
discover:
  categoriesCount: 3      # rows per discover category (trending, popular, etc.)
  oneClickMovieRequest: false  # skip profile dialog, use default profile

# Appearance
styles:
  performanceMode: false         # disable backdrop blur

# Advanced
sticky_nav_offset: 100    # px before sticky nav appears on mobile scroll
```

---

## Configuration Reference

| Key | Default | Description |
|-----|---------|-------------|
| `localisation` | `cs` | UI language: `en` or `cs` |
| `layout` | `both` | `both` — both panels, `left` — downloads only, `right` — media only |
| `downloads.torrentItems` | `3` | qBittorrent rows per page |
| `downloads.usenetItems` | `3` | SABnzbd rows per page |
| `discover.categoriesCount` | `3` | Items per discover category row |
| `discover.oneClickMovieRequest` | `false` | Request movies without profile dialog |
| `styles.performanceMode` | `false` | Disables `backdrop-filter: blur()` |
| `sticky_nav_offset` | `100` | Scroll offset (px) before mobile nav appears |

---

## Related

- [Arr Stack Integration](https://github.com/martinargalas/arr-stack-integration) — required companion proxy integration
