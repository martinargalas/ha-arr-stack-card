# Arr Stack Card — settings

You don't have to write any YAML. The card works as soon as you add it, and
almost everything below can be changed in the visual editor: open your
dashboard's edit mode and click the pencil on the card.

This page explains what each setting does, in the order the editor shows them,
and gives a few ready-made setups to start from. Each setting lists its YAML
key, every value it takes and its default. A complete example is at the end.

Back to the [README](README.md) · Colours and looks: [STYLING.md](STYLING.md)

- [Ready-made setups](#ready-made-setups)
- [General](#general)
- [Left panel — downloads](#left-panel--downloads)
- [Right panel — media](#right-panel--media)
- [Users](#users)
- [Appearance](#appearance)
- [Search header — with Bubble Card or on its own](#search-header--with-bubble-card-or-on-its-own)
- [Categories you can show](#categories-you-can-show)
- [Settings only in YAML](#settings-only-in-yaml)
- [Everything at once](#everything-at-once)

---

## Ready-made setups

### A phone with Bubble Card

The card sits in a [Bubble Card](https://github.com/Clooos/Bubble-Card) pop-up
and the search moves up into the pop-up's header. Windows you open (a category,
the Library, a title's details) take over that header: their buttons go up there
and a back arrow closes them. The categories are folded into a list you tap
through. Step by step, with the dock: [Search header](#search-header--with-bubble-card-or-on-its-own).

```yaml
- type: custom:bubble-card
  card_type: pop-up
  hash: "#movies"
  show_header: false
  cards:
    - type: custom:arr-stack-search
      header: true
    - type: custom:arr-stack-card
      search_in_header: true
      discover:
        mobileLayout: list
```

### A phone without Bubble Card

The same header, kept at the top of the screen as you scroll, but provided by the
card itself. Search, the windows' tabs and switches and a back arrow, all on a
phone, with no extra cards. [More](#without-bubble-card--the-header-on-a-phone).

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

| In the editor | What it does | Key | Values | Default |
|---|---|---|---|---|
| **Language** | The card's language. | `localisation` | `en` English · `cs` Czech · `fr` French | `en` |
| **Layout** | Which panels the card shows. | `layout` | `both` Both panels · `left` Downloads only · `right` Media only | `both` |
| **Swap sides** | Puts the media on the left and the downloads on the right. On a phone the media then comes first. | `swap_sides` | `true` · `false` | `false` |
| **Sticky nav offset** | On a phone, the media's page buttons float at the bottom of the screen once you scroll down to the media. This sets how early they appear. With **Swap sides** on, about 2000 shows them straight away. Only with the **Pages** layout: Shelves and List have no pages to turn on a phone. | `sticky_nav_offset` | a number of pixels, 0 or more (the editor offers 0–500) | `100` |

---

## Left panel — downloads

### Downloads

| In the editor | What it does | Key (under `downloads:`) | Values | Default |
|---|---|---|---|---|
| **Torrent items per page** | How many torrents are shown at once (qBittorrent, Deluge, rTorrent, Transmission). | `torrentItems` | 1–20 | `3` |
| **Usenet items per page** | The same for SABnzbd and NZBGet. | `usenetItems` | 1–20 | `3` |
| **Allow download controls** | Off hides the pause, resume and delete buttons, for a dashboard others use. The category filters stay. | `allowControls` | `true` · `false` | `true` |

### Cards

The small cards above the downloads.

| In the editor | What it does | Key (under `downloads:`) | Values | Default |
|---|---|---|---|---|
| **Show storage card** | Free space on your disks. | `showStorage` | `true` · `false` | `true` |
| **Show total speed card** | Download and upload speed, all clients together. | `showTotalSpeed` | `true` · `false` | `true` |
| **Show VPN card** | Whether the VPN is up, its country and IP (needs Gluetun). | `showVpnCard` | `true` · `false` | `true` |

### Download row

What each download shows under its name. Its status (Downloading, Paused,
Stalled, an error…) is always shown.

| In the editor | What it does | Key (under `downloads:`) | Values | Default |
|---|---|---|---|---|
| **Upload speed** | Upload speed (torrents only). | `rowUpload` | `true` · `false` | `true` |
| **Time left** | Time until it finishes. | `rowEta` | `true` · `false` | `true` |
| **Size** | Downloaded and total size. | `rowSize` | `true` · `false` | `true` |
| **Peers** | Seeds and peers (torrents only). | `rowPeers` | `true` · `false` | `true` |
| **Percentage** | How far along it is. | `rowPercent` | `true` · `false` | `true` |
| **Progress bar** | The bar under the row. | `rowProgress` | `true` · `false` | `true` |
| **Instance label** | A small **1** or **2** on each row saying which qBittorrent or SABnzbd it is in, while both are shown. Listed only when a second instance is set up in the integration. | `rowInstance` | `true` · `false` | `true` |

With a second qBittorrent or SABnzbd set up in the integration, both share one
section. Its header gets a switch — **1 | 2**, **1**, **2** (on a phone one
button that steps through them) — and every action goes to the instance the
download is in; pause and resume all follow the switch.

### Download clients

Drag the clients into the order you want and switch off any you don't want to
see. Only clients set up in the integration are listed.

Client ids: `qbit` qBittorrent · `deluge` Deluge · `rtorrent` rTorrent ·
`transmission` Transmission · `sab` SABnzbd · `nzbget` NZBGet. `enabled` is
`true` or `false`; clients you leave out come after the listed ones and stay on.

```yaml
downloadClients:
  - { id: sab, enabled: true }
  - { id: qbit, enabled: true }
  - { id: deluge, enabled: false }
  # also: rtorrent, transmission, nzbget
```

### Storage

| In the editor | What it does | Key (under `styles:`) | Values | Default |
|---|---|---|---|---|
| **Disk space source** | Where the storage card gets its numbers. **Auto** usually gets it right. Pick Radarr or Sonarr if your download client reports a different drive (a cache drive instead of the array, for example). | `storageSource` | `auto` · `radarr` · `radarr2` · `sonarr` · `sonarr2` (the second instances only when you have them) | `auto` |

---

## Right panel — media

### Layout

| In the editor | What it does | Key (under `discover:`) | Values | Default |
|---|---|---|---|---|
| **Rows on a page** | How many categories are shown at once. The search field counts as one of them. On a phone set to Shelves or List the page scrolls instead, so this doesn't apply there. | `categoriesCount` | 2–10 | `3` |
| **Posters in a row** | How many posters each category shows side by side. Also used for the search results and See More. Pages layout only. | `itemsPerCategory` | 2–10 | `4` |
| **See More on page** | On this page of a category, the last poster becomes **See More**, which opens the whole category. Pages layout only. | `showMoreOnPage` | 1–50 | `3` |

### Phone and tablet

A phone and a tablet each get their own layout:

- **Pages**: a few categories at a time, turned page by page.
- **Shelves**: every category one under another, each a row of posters you swipe sideways.
- **List**: every category folded to its name with a peek at its posters. Tap one to open it.

| In the editor | What it does | Key (under `discover:`) | Values | Default |
|---|---|---|---|---|
| **Layout on a phone** | How the categories sit on a phone. | `mobileLayout` | `pages` Pages · `shelves` Shelves · `list` List | `pages` |
| **Layout on a tablet** | The same on a tablet. | `tabletLayout` | `pages` · `shelves` · `list` | `pages` |
| **Posters per row on a phone** | Posters side by side in the lists that fill the screen: a category you opened, See More, the search, Library, Maintainerr. | `mobileColumns` | `2` · `3` | `3` |
| **Posters per row on a tablet** | The same on a tablet. A slider in the window changes it too. | `tabletColumns` | `0` Auto (as many as fit) · `3` · `4` · `5` · `6` | `0` |
| **Fade under a bottom bar** | With a bar fixed along the bottom of the screen (Bubble Card's buttons), lists, covers and trailers fade out under it, and by day a light band stays there. Off for an opaque bar, which hides what runs under it anyway. | `dockFade` | `true` · `false` | `true` |

```yaml
discover:
  mobileLayout: list       # tap through the categories on a phone
  tabletLayout: shelves    # swipe through rows on a tablet
  mobileColumns: 2         # bigger posters on a phone
```

### Search

| In the editor | What it does | Key | Values | Default |
|---|---|---|---|---|
| **Show search field** | Off gives its place to one more category. Handy for a display nobody types on. | `discover:` → `showSearch` | `true` · `false` | `true` |
| **Search in a pop-up header** | Moves the search into the header of the pop-up the card is in. Add an **Arr Stack Search** card to that header (step by step in [Search header](#search-header--with-bubble-card-or-on-its-own)). Until it's there, the search stays in the card. | `search_in_header` | `true` · `false` | `false` |
| **Link name** | Only needed with two or more such cards on one page, say a Movies and a Kids pop-up. Type the same word here and in the matching Arr Stack Search card. | `search_link` | any word, e.g. `kids` | empty |
| **Header on a phone** | For a card without Bubble Card. On a phone the search becomes a header that stays at the top of the screen; windows you open put their controls in it, and a back arrow closes them. See [Search header](#search-header--with-bubble-card-or-on-its-own). | `phone_header` | `true` · `false` | `false` |

### Recommendations

Shown only when Trakt or SuggestArr is set up in the integration.

| In the editor | What it does | Key (under `discover:`) | Values | Default |
|---|---|---|---|---|
| **Trakt** | Use Trakt's suggestions in the Recommendations row. | `recTrakt` | `true` · `false` | `true` |
| **SuggestArr** | Use SuggestArr's suggestions too. With both on, they take turns. | `recSuggestarr` | `true` · `false` | `true` |

Music from Last.fm joins the row on its own when Lidarr is set up. Switch it off
with the filter in the row itself.

### Requests

| In the editor | What it does | Key (under `discover:`) | Values | Default |
|---|---|---|---|---|
| **Recently Requested shows** | **Seerr + card**: your Seerr requests, what you asked for through the card, and anything downloading now. **Seerr only**: exactly your Seerr list. **Library**: every monitored title that isn't downloaded yet. | `requestedSource` | `both` Seerr + card · `seerr` Seerr only · `library` Library | `both` |
| **One-click request** | One tap requests a movie or show, with no questions about quality or seasons. | `oneClickRequest` | `true` · `false` | `false` |
| **Only for non-admins** | Admins still get the choice; everyone else gets one tap. | `oneClickNonAdminOnly` | `true` · `false` | `false` |
| **Seasons of a show** | What one tap requests for a show. | `oneClickTvSeasonMode` | `first` First season · `latest` Latest season · `all` All seasons | `first` |
| **Movie profile** | The quality profile for movies, by its name as Radarr shows it (Settings → Profiles). | `oneClickDefaultMovieProfile` | a profile name, e.g. `HD-1080p` | empty (Radarr's default) |
| **Show profile** | The same for shows, as Sonarr names it. | `oneClickDefaultShowProfile` | a profile name | empty (Sonarr's default) |

The last four appear in the editor once **One-click request** is on.

### Posters

| In the editor | What it does | Key (under `posters:`) | Values | Default |
|---|---|---|---|---|
| **Show title** | The title under each poster. | `showTitle` | `true` · `false` | `true` |
| **Show media type tag** | A Movie or TV label in the corner. | `showMediaType` | `true` · `false` | `true` |
| **Show rating** | The rating badge. | `showRating` | `true` · `false` | `true` |
| **Rating provider** | Whose rating to show. When IMDb has none, TMDB's or TheTVDB's stands in. | `ratingProvider` | `imdb` IMDb · `tmdb` TMDB | `imdb` |
| **Show audio languages** | Flags of the audio languages (on the right). | `showAudio` | `true` · `false` | `true` |
| **Show subtitles** | Flags of the subtitle languages (on the left). | `showSubtitles` | `true` · `false` | `true` |
| **Language display** | How languages and the rating are shown. | `langDisplay` | `flags` Combined: flags and the rating in one strip · `tags` Separate tags | `flags` |
| **Status display** | How a title's status is shown. | `statusDisplay` | `tags` status badges · `stripes` a coloured bar along the bottom with the download progress · `both` | `tags` |
| **Deletion tag** | A "Gone in…" tag on titles Maintainerr is about to delete. | `goneTag` | `all` in every category · `maintainerr` only in Maintainerr · `off` never | `all` |

### Now Playing

| In the editor | What it does | Key (under `streams:`) | Values | Default |
|---|---|---|---|---|
| **Show playback details** | Adds a line to each stream: Direct Play or Transcode, the quality and the bitrate, e.g. *1080p › Transcode › 720p · 4.0 Mbps*. Plex, Jellyfin and Emby. | `showTechInfo` | `true` · `false` | `false` |

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

| In the editor | What it does | Key (under `styles:`) | Values | Default |
|---|---|---|---|---|
| **Preset** | The look of the whole card. | `preset` | `glass` Glass · `ha` Home Assistant theme · `solid` Solid · `nord` Nord · `catppuccin` Catppuccin · `cinema` Cinema · `apple-home` Apple Home | `glass` |
| *(Apple Home only)* | When the card is light and when dark. | `appearance` | `auto` with Home Assistant's dark mode · `sun` light while the sun is up · `light` always · `dark` always | `auto` |
| **Performance mode** | Turns off the blur behind the glass. Smoother on older tablets. | `performanceMode` | `true` · `false` | `false` |
| **Card background** | The card's colour in performance mode. | `cardBackground` | a colour, e.g. `"#121216"` | `#121216` |
| **Card background transparency** | How see-through that colour is, in performance mode. | `cardBackgroundOpacity` | 0–100 (%) | `90` |
| **Day / night modal colours** | Windows turn light while the sun is up and dark after sunset. Turn it off if you set your own window colours. | `dayNightMode` | `true` · `false` | `true` |
| **Category colour overlays** | A soft tint in each app's colour behind its category. | `categoryOverlays` | `true` · `false` | `true` |
| **Window colour overlays** | The same tint at the top of windows. | `modalOverlays` | `true` · `false` | `true` |
| **UI scale** | Makes everything bigger or smaller. Try 1.1–1.3 on a TV or a wall display. Not used on a phone. | `uiScale` | 0.5–3 | `1` |
| **Left panel width** | How wide the downloads panel is, as a share of the card. | `leftPanelWidth` | 10–90 (%) | `40` |
| **App icons** | What sits next to the section titles. | `applicationIcons` | `real` the apps' logos · `mdi` simple icons · `none` | `real` |

With **Apple Home**, the card is light by day and dark at night. By default it
follows Home Assistant's dark mode. To follow the sun instead, or to stay always
light or always dark:

```yaml
styles:
  preset: apple-home
  appearance: sun     # auto · sun · light · dark
```

---

## Search header — with Bubble Card or on its own

The card can put its search field in a header at the top of the screen,
instead of inside the card. On a phone that header does more than search.
Whatever you open from the card (a category, the calendar, the Library, a
service's window, a title's details) moves its controls up into the header,
such as the Movies / TV / Music switch, its tabs, or Search, Remove and
Actions. The close button turns into a back arrow, and the window gets the
whole screen below the header.

There are two ways to get this header:

| | With Bubble Card | Without Bubble Card |
|---|---|---|
| Where the card lives | In a [Bubble Card](https://github.com/Clooos/Bubble-Card) pop-up (by Clooos) | Anywhere on a dashboard |
| What you add | The **Arr Stack Search** card in the pop-up, and **Search in a pop-up header** on the main card | Only **Header on a phone** on the main card |
| On a phone | Search, the windows' controls and a back arrow in the pop-up's header | The same, in a header the card keeps at the top of the screen |
| On a tablet | The search in the pop-up's header. Windows keep their controls inside them. | Nothing changes. The search stays in the card. |
| Bubble Card's dock | The card makes room for it and fades its content out above it | — |

### With Bubble Card — step by step

[Bubble Card](https://github.com/Clooos/Bubble-Card) is a separate card by
Clooos, installed from the Marketplace (HACS before Home Assistant 2026.11). Its pop-ups slide up over the dashboard and its
dock (a row of round buttons along the bottom) opens them.

1. **Install Bubble Card** from the Marketplace (or HACS), if you haven't yet.
2. **Make a pop-up for the card.** Give it a hash, e.g. `#movies`, and turn off
   Bubble Card's own header (`show_header: false`). The Arr Stack Search card
   becomes the header instead, so there would be two.
3. **Put two cards in the pop-up, in this order:**
   1. **Arr Stack Search** with **Pop-up header** on. This is the header: an
      icon, the search field and a close button.
   2. **Arr Stack Card** with **Search in a pop-up header** on (Right panel →
      Search). Its own search field disappears; typing in the header searches
      in the card and the results appear in the card.
4. **Optional: a dock.** Add Bubble Card's *horizontal buttons stack* with a
   button that opens `#movies`. You don't need to set anything in the card:
   it notices the dock and keeps clear of it, on a phone and on a tablet.
   Lists fade out above it and windows end above it.
5. **On a phone, choose List** (Right panel → Phone and tablet → Layout on a
   phone). You tap a category, it opens under the header, and the back arrow
   returns you to where you were in the list.

```yaml
# A section or a vertical stack on your dashboard
- type: custom:bubble-card
  card_type: pop-up
  hash: "#movies"
  show_header: false          # the Arr Stack Search card is the header
  cards:
    - type: custom:arr-stack-search
      header: true
      icon: mdi:movie-play-outline
    - type: custom:arr-stack-card
      search_in_header: true
      discover:
        mobileLayout: list    # tap through the categories on a phone

# Optional: the dock that opens it
- type: custom:bubble-card
  card_type: horizontal-buttons-stack
  1_link: "#movies"
  1_name: Movies
  1_icon: mdi:movie-play-outline
```

**On a tablet** the same pop-up works as it is. The search sits in the
header and the windows keep their tabs and buttons inside them, where
there's room for them. Everything ends above the dock.

**Something not right?**

- *The search is still in the card.* The Arr Stack Search card isn't on the
  page yet, or it's in another pop-up. Until it appears, the card keeps its
  own field so search never goes missing.
- *Two headers on top of each other.* Bubble Card's own header is still on:
  set `show_header: false` on the pop-up.
- *Several Arr Stack cards on one page* (say a Movies and a Kids pop-up):
  give each pair the same **Link name**, see the example below.

### Without Bubble Card — the header on a phone

If you don't use Bubble Card, turn on **Header on a phone** (Right panel →
Search). On a phone the search field becomes a header that stays at the top
of the screen as you scroll. Windows you open take it over the same way: the
Movies / TV / Music switch, the tabs and the buttons go up into it, and a back
arrow closes the window. With no window open there's just the search. On a
tablet nothing changes.

```yaml
type: custom:arr-stack-card
phone_header: true
discover:
  mobileLayout: list
```

You don't need the Arr Stack Search card for this. **Header on a phone** is
hidden in the editor while **Search in a pop-up header** is on, because the
pop-up's header already does the job.

### What moves into the header on a phone

| You open | The header shows |
|---|---|
| A category (from the list, a shelf or See More) | Its Movies / TV / Music switch, if it has one |
| The calendar | Its Movies / TV / Music switch |
| The Library | Its type switch and filters |
| Activity, Tautulli, Jellystat, Prowlarr, Maintainerr | Their tabs: the open one with its name, the others as icons |
| A movie's or show's details | Search, Remove and Actions |
| An artist | The artist's buttons |
| Now Playing, Similar titles | Their own controls |
| A confirmation or a small dialog | Nothing. It keeps its own buttons. |

When there isn't room for every button, the extra ones fold under **…**.

### The Arr Stack Search card's settings

The card searches only together with an Arr Stack Card on the same page that
has **Search in a pop-up header** on. It takes that card's look by default; its
own **Appearance** tab changes only the header.

| In the editor | What it does | Key | Values | Default |
|---|---|---|---|---|
| **Pop-up header** | A whole header: an icon, the search field and a close button, sized like Bubble Card's. Off: just the search field, for a header that has its own buttons. On a phone only the whole header takes the windows' controls. | `header` | `true` · `false` | `false` |
| **Icon** | The icon at the left of the header. A phone leaves it out to give the field room. | `icon` | any `mdi:` icon | `mdi:movie-play-outline` |
| **Close button** | Closes the pop-up. On a phone it turns into a back arrow while a window is open. | `close` | `true` · `false` | `true` |
| **No background** | Only the field and buttons, for a header that draws its own background. | `background` | `none`, or leave it out | left out |
| **Link name** | Only with several Arr Stack cards on one page: the same word as in that card's Link name. | `link` | any word, e.g. `kids` | empty |

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
  rowInstance: true

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
  dockFade: true                # false: no fade or light band under a bottom bar
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
