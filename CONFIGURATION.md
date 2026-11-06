# Arr Stack Card — settings

You don't have to write any YAML. The card works as soon as you add it, and
almost everything below can be changed in the visual editor: open your
dashboard's edit mode and click the pencil on the card.

This page explains what each setting does, in the order the editor shows them,
and gives a few ready-made setups to start from. If you prefer YAML, each
setting also shows the line to write. A complete example is at the end.

Back to the [README](README.md) · Colours and looks: [STYLING.md](STYLING.md)

- [Ready-made setups](#ready-made-setups)
- [General](#general)
- [Left panel — downloads](#left-panel--downloads)
- [Right panel — media](#right-panel--media)
- [Users](#users)
- [Appearance](#appearance)
- [The search header card](#the-search-header-card--arr-stack-search)
- [Categories you can show](#categories-you-can-show)
- [Settings only in YAML](#settings-only-in-yaml)
- [Everything at once](#everything-at-once)

---

## Ready-made setups

### A phone with Bubble Card

The card sits in a Bubble Card pop-up and the search moves up into the
pop-up's header. Windows you open (a category, the Library, a title's details)
take over that header: their buttons go up there and a back arrow closes them.
The categories are folded into a list you tap through.

```yaml
# In the pop-up, with Bubble Card's own header hidden (show_header: false)
- type: custom:arr-stack-search
  header: true
- type: custom:arr-stack-card
  search_in_header: true
  discover:
    mobileLayout: list
```

### A phone without Bubble Card

The same header, kept at the top of the screen as you scroll, but provided by the
card itself.

```yaml
type: custom:arr-stack-card
phone_header: true
discover:
  mobileLayout: list
```

### A wall tablet or a Nest Hub

Downloads on the left, a few categories at a time on the right, slightly larger
so it reads from across the room.

```yaml
type: custom:arr-stack-card
discover:
  tabletLayout: pages
  categoriesCount: 3
styles:
  preset: apple-home
  uiScale: 1.1
```

### Only the media, or only the downloads

```yaml
type: custom:arr-stack-card
layout: right      # media only; "left" shows only the downloads
```

### Requests for the family in one tap

Everyone except admins requests with a single tap, no questions asked. Admins
still pick the quality.

```yaml
type: custom:arr-stack-card
discover:
  oneClickRequest: true
  oneClickNonAdminOnly: true
  oneClickTvSeasonMode: first
  oneClickDefaultMovieProfile: HD-1080p
  oneClickDefaultShowProfile: HD-1080p
```

---

## General

| In the editor | What it does | YAML |
|---|---|---|
| **Language** | English, Czech or French. | `localisation: en` · `cs` · `fr` |
| **Layout** | **Both panels**, **Downloads only** or **Media only**. | `layout: both` · `left` · `right` |
| **Swap sides** | Puts the media on the left and the downloads on the right. On a phone the media then comes first. | `swap_sides: true` |
| **Sticky nav offset** | On a phone, the media's page buttons float at the bottom of the screen once you scroll down to the media. This sets how early they appear, in pixels. With **Swap sides** on, about 2000 shows them straight away. | `sticky_nav_offset: 100` |

---

## Left panel — downloads

### Downloads

| In the editor | What it does | YAML (under `downloads:`) |
|---|---|---|
| **Torrent items per page** | How many torrents are shown at once (qBittorrent, Deluge, rTorrent, Transmission). | `torrentItems: 3` |
| **Usenet items per page** | The same for SABnzbd and NZBGet. | `usenetItems: 3` |
| **Allow download controls** | Off hides the pause, resume and delete buttons, for a dashboard others use. The category filters stay. | `allowControls: true` |

### Cards

The small cards above the downloads.

| In the editor | What it does | YAML (under `downloads:`) |
|---|---|---|
| **Show storage card** | Free space on your disks. | `showStorage: true` |
| **Show total speed card** | Download and upload speed, all clients together. | `showTotalSpeed: true` |
| **Show VPN card** | Whether the VPN is up, its country and IP (needs Gluetun). | `showVpnCard: true` |

### Download row

What each download shows under its name. Its status (Downloading, Paused,
Stalled, an error…) is always shown.

| In the editor | YAML (under `downloads:`) |
|---|---|
| **Upload speed** (torrents only) | `rowUpload: true` |
| **Time left** | `rowEta: true` |
| **Size** | `rowSize: true` |
| **Peers** (torrents only) | `rowPeers: true` |
| **Percentage** | `rowPercent: true` |
| **Progress bar** | `rowProgress: true` |

### Download clients

Drag the clients into the order you want and switch off any you don't want to
see. Only clients set up in the integration are listed.

```yaml
downloadClients:
  - { id: sab, enabled: true }
  - { id: qbit, enabled: true }
  - { id: deluge, enabled: false }
  # also: rtorrent, transmission, nzbget
```

### Storage

| In the editor | What it does | YAML (under `styles:`) |
|---|---|---|
| **Disk space source** | Where the storage card gets its numbers. **Auto** usually gets it right. Pick Radarr or Sonarr if your download client reports a different drive (a cache drive instead of the array, for example). | `storageSource: auto` · `radarr` · `radarr2` · `sonarr` · `sonarr2` |

---

## Right panel — media

### Layout

| In the editor | What it does | YAML (under `discover:`) |
|---|---|---|
| **Rows on a page** | How many categories are shown at once. The search field counts as one of them. On a phone set to Shelves or List the page scrolls instead, so this doesn't apply there. | `categoriesCount: 3` |
| **Posters in a row** | How many posters each category shows side by side. Also used for the search results and See More. Pages layout only. | `itemsPerCategory: 4` |
| **See More on page** | On this page of a category, the last poster becomes **See More**, which opens the whole category. Pages layout only. | `showMoreOnPage: 3` |

### Phone and tablet

A phone and a tablet each get their own layout:

- **Pages**: a few categories at a time, turned page by page.
- **Shelves**: every category one under another, each a row of posters you swipe sideways.
- **List**: every category folded to its name with a peek at its posters. Tap one to open it.

| In the editor | YAML (under `discover:`) |
|---|---|
| **Layout on a phone** | `mobileLayout: pages` · `shelves` · `list` |
| **Layout on a tablet** | `tabletLayout: pages` · `shelves` · `list` |
| **Posters per row on a phone**: 2 or 3, for the lists that fill the screen (a category you opened, See More, the search, Library, Maintainerr) | `mobileColumns: 3` |
| **Posters per row on a tablet**: Auto fits as many as the screen takes; a slider in the window changes it too | `tabletColumns: 0` (Auto) · `3`–`6` |

```yaml
discover:
  mobileLayout: list       # tap through the categories on a phone
  tabletLayout: shelves    # swipe through rows on a tablet
  mobileColumns: 2         # bigger posters on a phone
```

### Search

| In the editor | What it does | YAML |
|---|---|---|
| **Show search field** | Off gives its place to one more category. Handy for a display nobody types on. | `discover:` → `showSearch: true` |
| **Search in a pop-up header** | Moves the search into the header of the pop-up the card is in. Add an **Arr Stack Search** card to that header (see [below](#the-search-header-card--arr-stack-search)). Until it's there, the search stays in the card. | `search_in_header: true` |
| **Link name** | Only needed with two or more such cards on one page, say a Movies and a Kids pop-up. Type the same word here and in the matching Arr Stack Search card, e.g. `kids`. | `search_link: kids` |
| **Header on a phone** | For a card without a pop-up. On a phone the search becomes a header that stays at the top of the screen. Windows you open take it over, and a back arrow closes them. | `phone_header: true` |

### Recommendations

Shown only when Trakt or SuggestArr is set up in the integration.

| In the editor | What it does | YAML (under `discover:`) |
|---|---|---|
| **Trakt** | Use Trakt's suggestions in the Recommendations row. | `recTrakt: true` |
| **SuggestArr** | Use SuggestArr's suggestions too. With both on, they take turns. | `recSuggestarr: true` |

Music from Last.fm joins the row on its own when Lidarr is set up. Switch it off
with the filter in the row itself.

### Requests

| In the editor | What it does | YAML (under `discover:`) |
|---|---|---|
| **Recently Requested shows** | **Seerr + card**: your Seerr requests, what you asked for through the card, and anything downloading now. **Seerr only**: exactly your Seerr list. **Library**: every monitored title that isn't downloaded yet. | `requestedSource: both` · `seerr` · `library` |
| **One-click request** | One tap requests a movie or show, with no questions about quality or seasons. | `oneClickRequest: true` |
| **Only for non-admins** | Admins still get the choice; everyone else gets one tap. | `oneClickNonAdminOnly: true` |
| **Seasons of a show** | What one tap requests for a show: the first season, the latest, or all of them. | `oneClickTvSeasonMode: first` · `latest` · `all` |
| **Movie profile** / **Show profile** | The quality profile to use, by its name as Radarr and Sonarr show it (Settings → Profiles). Leave empty for their default. | `oneClickDefaultMovieProfile: HD-1080p`<br>`oneClickDefaultShowProfile: HD-1080p` |

The last four appear in the editor once **One-click request** is on.

### Posters

| In the editor | What it does | YAML (under `posters:`) |
|---|---|---|
| **Show title** | The title under each poster. | `showTitle: true` |
| **Show media type tag** | A Movie or TV label in the corner. | `showMediaType: true` |
| **Show rating** | The rating badge. | `showRating: true` |
| **Rating provider** | Whose rating to show. When IMDb has none, TMDB's or TheTVDB's stands in. | `ratingProvider: imdb` · `tmdb` |
| **Show audio languages** | Flags of the audio languages (on the right). | `showAudio: true` |
| **Show subtitles** | Flags of the subtitle languages (on the left). | `showSubtitles: true` |
| **Language display** | **Combined**: flags and the rating in one strip. **Separate tags**: rating, audio and subtitles as their own tags. | `langDisplay: flags` · `tags` |
| **Status display** | **Tags**: status badges. **Stripes**: a coloured bar along the bottom with the download progress. **Both**. | `statusDisplay: tags` · `stripes` · `both` |
| **Deletion tag** | A "Gone in…" tag on titles Maintainerr is about to delete: everywhere, only in Maintainerr, or never. | `goneTag: all` · `maintainerr` · `off` |

### Now Playing

| In the editor | What it does | YAML (under `streams:`) |
|---|---|---|
| **Show playback details** | Adds a line to each stream: Direct Play or Transcode, the quality and the bitrate, e.g. *1080p › Transcode › 720p · 4.0 Mbps*. Plex, Jellyfin and Emby. | `showTechInfo: true` |

### Categories

Drag the categories into the order you want and switch off the ones you don't
need. The ids for YAML are in [Categories you can show](#categories-you-can-show).

```yaml
categories:
  - { id: streams, enabled: true }
  - { id: calendar, enabled: true }
  - { id: recentlyAdded, enabled: true }
  - { id: trending, enabled: false }
```

---

## Users

Shown when you have more than one Seerr account set up in the integration.
Choose which Home Assistant user requests under which Seerr account. See
[Multi-user setup](README.md#multi-user-setup-seerr--optional) in the README.

---

## Appearance

A preset gives the whole card a look in one click: **Glass** (the default),
**Home Assistant theme**, **Solid**, **Nord**, **Catppuccin**, **Cinema** or
**Apple Home**. Below it you can change any colour, panel by panel. Every one of
those settings is described in [STYLING.md](STYLING.md).

| In the editor | What it does | YAML (under `styles:`) |
|---|---|---|
| **Preset** | The look of the whole card. | `preset: apple-home` |
| **Performance mode** | Turns off the blur behind the glass. Smoother on older tablets. You then choose a plain background colour and how see-through it is. | `performanceMode: true`<br>`cardBackground: "#121216"`<br>`cardBackgroundOpacity: 90` |
| **Day / night modal colours** | Windows turn light while the sun is up and dark after sunset. Turn it off if you set your own window colours. | `dayNightMode: true` |
| **Category colour overlays** | A soft tint in each app's colour behind its category. | `categoryOverlays: true` |
| **Window colour overlays** | The same tint at the top of windows. | `modalOverlays: true` |
| **UI scale** | Makes everything bigger or smaller. Try 1.1–1.3 on a TV or a wall display. | `uiScale: 1` |
| **Left panel width** | How wide the downloads panel is, as a share of the card. | `leftPanelWidth: 40` |
| **App icons** | Real app logos, simple icons, or none, next to the section titles. | `applicationIcons: real` · `mdi` · `none` |

With **Apple Home**, the card is light by day and dark at night. By default it
follows Home Assistant's dark mode. To follow the sun instead, or to stay always
light or always dark:

```yaml
styles:
  preset: apple-home
  appearance: sun     # auto · sun · light · dark
```

---

## The search header card — `arr-stack-search`

A small extra card that holds the search field, for the header of a pop-up
(Bubble Card, for example). Turn on **Search in a pop-up header** on the main
card, then add this card above it in the same pop-up.

| In the editor | What it does | YAML |
|---|---|---|
| **Pop-up header** | A whole header: an icon, the search field and a close button, sized like Bubble Card's. Off: just the field, for a header that has its own. | `header: true` |
| **Icon** | The icon at the left of the header. A phone leaves it out to give the field room. | `icon: mdi:movie-play-outline` |
| **Close button** | Closes the pop-up. | `close: true` |
| **No background** | Only the field and buttons, for a header that draws its own background. | `background: none` |
| **Link name** | Only with several such cards on one page: the same word as in the main card's Link name. | `link: kids` |

It takes the main card's look by default. Its **Appearance** tab changes only
the header.

On a phone, windows you open take over this header: their buttons go up
into it and the close button turns into a back arrow. A title's details put
their Search, Remove and Actions buttons there.

```yaml
- type: custom:arr-stack-search
  header: true
  icon: mdi:movie-play-outline
- type: custom:arr-stack-card
  search_in_header: true
```

Two pop-ups on one page, each with its own card:

```yaml
# Movies pop-up
- type: custom:arr-stack-search
  header: true
  link: movies
- type: custom:arr-stack-card
  search_in_header: true
  search_link: movies

# Kids pop-up
- type: custom:arr-stack-search
  header: true
  link: kids
- type: custom:arr-stack-card
  search_in_header: true
  search_link: kids
```

---

## Categories you can show

| id | Category |
|----|---------|
| `streams` | Now Playing (Plex, Jellyfin, Emby, Kodi). Hidden while nothing plays. |
| `calendar` | Calendar: upcoming movies, episodes and albums |
| `recentlyAdded` | Recently Added |
| `music` | Recently Added Music (Lidarr) |
| `recentlyRequested` | Recently Requested |
| `upcoming` | Upcoming Movies |
| `tvUpcoming` | New Shows |
| `trending` | Trending |
| `popular` | Popular Movies |
| `recommendations` | Recommendations: Trakt, SuggestArr and Last.fm in one row |
| `library` | Library: browse, sort, filter and edit your movies, shows and music |
| `activity` | Activity: queue, history, blocklist, missing (admins only) |
| `tautulli` | Statistics from Tautulli (Plex) |
| `jellystat` | Statistics from Jellystat (Jellyfin) |
| `tracearr` | Streaming statistics from Tracearr *(beta)* |
| `prowlarr` | Indexers (Prowlarr) |
| `maintainerr` | Maintainerr: rules, collections, deletion calendar |

The statistics, Activity, Prowlarr and Maintainerr are shown to admins only.

---

## Settings only in YAML

When several people share one Plex or Jellyfin account, the Tautulli user window
warns about one account seen from many places. Two settings tune the warning:

```yaml
security:
  ip_sharing_threshold: 2    # how many different places before the warning shows
  ip_history_depth: 200      # how much play history to look through
```

---

## Everything at once

Every setting with its default value. You never need all of this: write only
what you want to change.

```yaml
type: custom:arr-stack-card

localisation: en                # en | cs | fr
layout: both                    # both | left | right
swap_sides: false
sticky_nav_offset: 100
search_in_header: false
search_link: ""
phone_header: false

downloads:
  torrentItems: 3
  usenetItems: 3
  allowControls: true
  showStorage: true
  showTotalSpeed: true
  showVpnCard: true
  rowUpload: true
  rowEta: true
  rowSize: true
  rowPeers: true
  rowPercent: true
  rowProgress: true

downloadClients:                # order and visibility
  - { id: qbit, enabled: true }
  - { id: deluge, enabled: true }
  - { id: rtorrent, enabled: true }
  - { id: transmission, enabled: true }
  - { id: sab, enabled: true }
  - { id: nzbget, enabled: true }

discover:
  categoriesCount: 3
  itemsPerCategory: 4
  showMoreOnPage: 3
  showSearch: true
  mobileLayout: pages           # pages | shelves | list
  mobileColumns: 3              # 2 | 3
  tabletLayout: pages           # pages | shelves | list
  tabletColumns: 0              # 0 = Auto, or 3–6
  recTrakt: true
  recSuggestarr: true
  requestedSource: both         # both | seerr | library
  oneClickRequest: false
  oneClickNonAdminOnly: false
  oneClickTvSeasonMode: first   # first | latest | all
  oneClickDefaultMovieProfile: ""
  oneClickDefaultShowProfile: ""
  oneClickDefaultMovieTag: ""         # a Radarr tag for one-click requests
  oneClickDefaultMovieRootFolder: ""  # a Radarr root folder
  oneClickDefaultShowTag: ""          # a Sonarr tag
  oneClickDefaultShowRootFolder: ""   # a Sonarr root folder

posters:
  showTitle: true
  showMediaType: true
  showRating: true
  ratingProvider: imdb          # imdb | tmdb
  showAudio: true
  showSubtitles: true
  langDisplay: flags            # flags | tags
  statusDisplay: tags           # tags | stripes | both
  goneTag: all                  # all | maintainerr | off

streams:
  showTechInfo: false

categories:                     # order and visibility, ids above
  - { id: streams, enabled: true }
  - { id: calendar, enabled: true }
  - { id: recentlyAdded, enabled: true }

security:
  ip_sharing_threshold: 2
  ip_history_depth: 200

styles:
  preset: glass                 # glass | ha | solid | nord | catppuccin | cinema | apple-home
  appearance: auto              # Apple Home only: auto | sun | light | dark
  performanceMode: false
  cardBackground: "#121216"     # with performanceMode
  cardBackgroundOpacity: 90     # with performanceMode
  dayNightMode: true
  categoryOverlays: true
  modalOverlays: true
  uiScale: 1
  leftPanelWidth: 40
  applicationIcons: real        # real | mdi | none
  storageSource: auto           # auto | radarr | radarr2 | sonarr | sonarr2
  # every colour and surface: STYLING.md
```

Older colour names (`headingTextColor`, `primaryTextColor`, `modalBackgroundColor` …)
still work. [STYLING.md](STYLING.md#the-older-keys) says what each one sets now.
