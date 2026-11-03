# Arr Stack Card — configuration reference

Every option the card understands. Most of them are also in the visual editor —
open the dashboard editor and click the pencil on the card. Only the `security.*`
keys have to be written by hand; colours, surfaces and presets are in the
editor's Appearance tab, and every styling key is in [STYLING.md](STYLING.md).

Back to the [README](README.md).

---

## Card options

```yaml
type: custom:arr-stack-card

# General
localisation: en             # en | cs  (default: en)
layout: both                 # both | left | right  (default: both)
swap_sides: false            # swap left and right panels  (default: false)
                             # Note: on mobile, right panel moves above left. Set sticky_nav_offset ~2000 for nav to appear immediately.
sticky_nav_offset: 100       # px — when sticky nav bar appears on mobile  (default: 100)
search_in_header: false      # the search field lives in a pop-up's header — an arr-stack-search card, see below  (default: false)
search_link: ""              # only with several such cards on one page: pairs this card with the header that has the same link

# Download managers (left panel)
downloads:
  torrentItems: 3            # qBittorrent / Deluge / rTorrent / Transmission items per page  (default: 3)
  usenetItems: 3             # SABnzbd / NZBGet items per page  (default: 3)

# Download client order & visibility (left panel)
downloadClients:
  - id: qbit
    enabled: true
  - id: deluge
    enabled: true
  - id: rtorrent
    enabled: true
  - id: sab
    enabled: true
  - id: nzbget
    enabled: true

# Discovery (right panel)
discover:
  categoriesCount: 3         # media categories shown per right-panel page  (default: 3)
  itemsPerCategory: 4        # columns per category grid  (default: 4)
  showSearch: true           # search bar at the top of the right panel; false gives its slot to one more category  (default: true)
  mobileLayout: pages        # pages | shelves | list — the right panel on a phone (up to 600 px)  (default: pages)
  mobileColumns: 3           # 2 | 3 — posters a row in a phone's full-screen windows  (default: 3)
  tabletLayout: pages        # pages | shelves | list — the same on a tablet: up to 900 px, or a touch screen up to 1400 px  (default: pages)
  tabletColumns: 0           # 0 (as many as fit) | 3–6 — posters a row in a tablet's windows; the slider in a window's header overrides it  (default: 0)
  showMoreOnPage: 3          # page on which the "See More" overlay card appears  (default: 3)
  oneClickRequest: false     # skip request overlay — uses defaults below  (default: false)
  oneClickNonAdminOnly: false         # one-click only for non-admin users  (default: false)
  oneClickTvSeasonMode: first         # first | latest | all — which seasons to request  (default: first)
  oneClickDefaultMovieProfile: ""     # quality profile name for one-click movie requests
  oneClickDefaultMovieTag: ""         # Radarr tag for one-click movie requests  (optional)
  oneClickDefaultMovieRootFolder: ""  # Radarr root folder for one-click movie requests  (optional)
  oneClickDefaultShowProfile: ""      # quality profile name for one-click TV requests
  oneClickDefaultShowTag: ""          # Sonarr tag for one-click TV requests  (optional)
  oneClickDefaultShowRootFolder: ""   # Sonarr root folder for one-click TV requests  (optional)
  ratingProvider: imdb         # imdb | tmdb — rating badge shown on poster cards  (default: imdb)
  recTrakt: true               # use Trakt in the Recommendations row  (default: true)
  recSuggestarr: true          # use SuggestArr in the Recommendations row  (default: true)
                               # Last.fm joins the row whenever Lidarr and a Last.fm key are set up;
                               # the filter in the row's header is where music is switched off.

# Poster display
posters:
  showTitle: true              # show title on poster cards  (default: true)
  showAudio: true              # show audio language badges  (default: true)
  showSubtitles: true          # show subtitle badges  (default: true)
  showRating: true             # show rating badge  (default: true)
  showMediaType: true          # show Movie/TV tag  (default: true)
  ratingProvider: imdb         # imdb | tmdb  (default: imdb)
  statusDisplay: tags          # tags | stripes | both  (default: tags)
  langDisplay: flags           # flags | tags  (default: flags)
  goneTag: all                 # all | maintainerr | off  (default: all)

# Now Playing
streams:
  showTechInfo: false          # a tag under the viewer: Direct Play / Direct Stream / Transcode,
                               # then resolution (4K→720p when it changes) · bitrate
                               # (Plex, Jellyfin, Emby)  (default: false)

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
  - id: recommendations
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
  - id: library
    enabled: true
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
  categoryOverlays: true          # colour-tinted overlays on category poster grids  (default: true)
  modalOverlays: true             # the app's colours at the top of its windows and the full-screen category windows  (default: true)
  applicationIcons: real          # real | mdi | none — real app logos, MDI icons, or no icons next to the section titles  (default: real)
  uiScale: 1                      # scale all card content — use >1 on large screens/TVs  (default: 1)
  leftPanelWidth: 40              # downloads panel width as % of card width  (default: 40)
  preset: glass                   # glass | ha | solid | nord | catppuccin | cinema | apple-home — see STYLING.md
  appearance: auto                # Apple Home only: auto (with Home Assistant's dark mode) | sun | light | dark  (default: auto)
  sectionGap: 8                   # px — room between the right panel's categories  (default: 8)
  text: "#ffffff"                 # every colour, surface and opacity key, and the
  radius: 34                      #   left:/right:/modal:/modalDay: groups: STYLING.md
  iconStyle: brand                # brand | mono — real logos in their own colours or the icon colour
  modalCloseButtonIconColor: "#ffffff"
  modalCloseButtonBackgroundColor: "#333344"
  modalButtonTextColor: "#ffffff"
  modalButtonBackgroundColor: "#1e1e2e"
  modalRemoveButtonBackgroundColor: "#ff6030"
```

The older colour keys (`headingTextColor`, `primaryTextColor`, `modalBackgroundColor` …) keep working — [STYLING.md](STYLING.md#the-older-keys) lists what each one sets now.

## Search header — `arr-stack-search`

A second card that holds the Arr Stack Card's search field, for the header of a pop-up. Pair it with a card that has `search_in_header: true`.

```yaml
type: custom:arr-stack-search
header: true                 # a whole pop-up header: an icon, the search field and a close button  (default: false)
icon: mdi:movie-play-outline # with header; left out on a phone, where the field needs the room
close: true                  # with header: the close button, which closes the pop-up  (default: true)
background: none             # optional: no surface of its own, for a header that draws one
link: ""                     # only with several search headers on one page: the card with the same search_link
styles: {}                   # optional: the card's style keys, over the look it takes from the card
```

## Category IDs

| id | Section |
|----|---------|
| `recentlyAdded` | Recently Added |
| `recentlyRequested` | Recently Requested |
| `upcoming` | Upcoming Movies |
| `tvUpcoming` | New Shows |
| `trending` | Trending |
| `popular` | Popular Movies |
| `recommendations` | Recommendations — Trakt, SuggestArr and Last.fm in one row |
| `calendar` | Calendar — upcoming movies, episodes and albums (Radarr + Sonarr + Lidarr), week and month views |
| `streams` | Now Playing (Plex / Jellyfin / Emby / Kodi) — auto-hidden when nothing plays |
| `tautulli` | Statistics (Tautulli) |
| `jellystat` | Statistics (Jellystat) |
| `tracearr` | Statistics (Tracearr) *(beta)* |
| `library` | Library browser (Radarr / Sonarr / Lidarr — bulk edit, sort, filter) |
| `activity` | Activity Queue (admin only) |
| `prowlarr` | Indexers (Prowlarr) |
| `maintainerr` | Maintainerr — rules, collections, deletion calendar, storage |
