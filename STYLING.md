# Styling the card

Every colour, surface and corner of the card can be changed — from the visual editor, from the card's YAML, from a Home Assistant theme, or with card-mod. All four set the same **design tokens**, so you can mix them: a theme for the colours, the editor for the corners of one panel.

Back to the [README](README.md) · [Configuration reference](CONFIGURATION.md)

---

## The quick way: a preset

In the editor, open the **Appearance** tab and pick a preset — or in YAML:

```yaml
styles:
  preset: ha        # glass (default) | ha | solid | nord | catppuccin | cinema
```

| Preset | What it does |
|---|---|
| `glass` | The card as it has always looked: frosted glass over your dashboard. |
| `ha` | Takes everything from your Home Assistant theme: the background, border, corners and shadow of a regular card (`ha-card`), the theme's text colour, its primary colour as the accent, and its success, warning, error and info colours. Modals follow it too, by day and by night. Use this one to make the card match the rest of your dashboard. |
| `solid` | Opaque and flat — no blur and no glass shine. |
| `nord` | Arctic frost, after the [Nord](https://www.nordtheme.com) palette: slate glass lit from the top, frost-blue headings and icons in soft capsules, aurora colours for status — and the modals to match. |
| `catppuccin` | Soothing pastels, after [Catppuccin](https://catppuccin.com) Mocha: a mauve glow on a deep base, pink headings, rounder corners, pastel quality and status colours. |
| `cinema` | The dark of a theatre: a velvet-red glow from below, gold for headings, buttons and everything that matters, sharper corners. |

Anything you set yourself wins over the preset.

## The Appearance tab

The editor groups every setting into folding categories — **Panels**, **Text**, **Controls**, **Icons**, **Posters and shadows**, **Transparency**, **Status colours**, **Spacing** and **Modals**. Panels, Text, Controls, Icons, Posters and Transparency each open into **Whole card**, **Left panel** and **Right panel**: set a colour for the whole card, then override it for one side only.

Each colour has a spectrum picker and a field that takes a hex value (`#e6e6e6`), `rgb(230, 230, 230)` or `230, 230, 230`. The **×** next to it puts the colour back to what it inherits. A number on a group's title shows how many of its settings you have changed.

## In YAML

Every setting is a key under `styles:`. At the top level it applies to the whole card; under `left:` or `right:` to one panel.

```yaml
styles:
  preset: solid
  text: '#e6e6e6'
  heading: '#ffffff'
  accent: 'rgb(255, 45, 120)'
  radius: 16                       # numbers are pixels
  gap: 8
  left:
    background: 'rgba(20, 10, 30, 0.85)'
  right:
    textSecondary: '#9aa0b4'
  modal:                           # modals at night
    background: 'rgba(12, 12, 20, 0.95)'
    radius: 18
  modalDay:                        # modals by day
    text: '#1c1c1e'
```

### Panels — `styles`, `styles.left`, `styles.right`

| Key | What it changes | Takes |
|---|---|---|
| `background` | The panel's background | any CSS colour, `rgba()` for transparency, or a gradient |
| `border` | The panel's border | full CSS, e.g. `1px solid #333`, or `none` |
| `radius` | Corner radius | number (px) |
| `padding` | Space inside the panel | number (px) or CSS like `8px 14px` |
| `blur` | The glass blur behind the panel | number (px); `0` turns it off |
| `shine` | The glass highlight | `0`–`1` |
| `panelShadow` | The panel's shadow | full CSS `box-shadow`, or `none` |
| `iconBackground` | A capsule behind each app icon (none by default) | any CSS colour or gradient |
| `iconRadius` · `iconPadding` | Its corners · the room around the icon | number (px) |

### Colours — `styles`, `styles.left`, `styles.right`

A colour left unset follows the one it is drawn from, at its own strength: set only `text` and secondary and muted text follow it.

| Key | What it colours | Follows |
|---|---|---|
| `text` | Text | — |
| `textSecondary` | Sizes, dates, metadata | `text` |
| `textMuted` | Labels, empty states | `textSecondary` |
| `heading` | Column and section titles | `text` |
| `headingLine` | The bar beside a column title | `heading` |
| `fill` | Rows, chips, progress tracks (drawn faintly) | — |
| `line` | Lines and borders | — |
| `button` | Buttons | `fill` |
| `buttonText` | Text on buttons | `text` |
| `pillText` | The count beside a section title | `text` |
| `dot` / `dotActive` | Paging dots | — / `dot` |
| `icon` | MDI icons, and the app logos with `iconStyle: mono` | `heading` |
| `posterText` | Titles drawn over posters and covers | — (stays light) |
| `shade` | The darkening laid over posters and covers | — |
| `shadow` | Shadows | — |

### Transparency — `styles`, `styles.left`, `styles.right`

Percentages, where 100 is the card as designed. Each element keeps the transparency it was drawn with — a row at 8 %, its border at 25 % — and these scale it, so everything stays in proportion: at 50 the boxes are half as strong, rows inside them still fainter than the box.

| Key | What it scales | Range |
|---|---|---|
| `boxOpacity` | VPN bar, disks, download lists, statistics tiles, paging capsules | 0–300 |
| `controlOpacity` | Buttons, sorting, the search field, request controls | 0–300 |
| `lineOpacity` | Every border and divider, and the line beside a column title | 0–300 |
| `trackOpacity` | Progress and slider tracks | 0–300 |
| `posterOpacity` | The ground behind a poster | 0–300 |
| `tagOpacity` | Dark labels over posters and Now Playing | 0–300 |
| `tintOpacity` | The glow in each app's colours behind a section | 0–100 |

A surface's own colour — `background`, `iconBackground` and the modals' `background`, `overlay`, `header`, `menu` — takes its transparency in the colour: `rgba(18, 18, 22, 0.6)`. The editor gives each of them an **Opacity** slider under the colour.

### Whole card only — `styles`

| Key | What it changes |
|---|---|
| `iconStyle` | `brand` (default) draws the apps' real logos in their own colours; `mono` draws them in the `icon` colour. With `applicationIcons: mdi` the icons are plain glyphs, always in the `icon` colour. The editor sets both from one picker, **App icons** under Icons. |
| `accent` | Selected controls, links, progress |
| `success` · `warning` · `error` · `info` | Status colours, in the panels and the modals |
| `gap` | Space between the two panels (px) |
| `cardPadding` | Space around the panels (px or CSS) |

### Modals — `styles.modal` (night) and `styles.modalDay` (day)

In the editor, Night and Day each open into **All modals** — what every modal shares — and **Release search**: Interactive Search and the automatic search, wherever they appear — a film's or series' detail, an album, Activity's season search.

Day colours apply while the sun is up, when **Day / night modal colours** is on under General in the Appearance tab. The two are kept apart on purpose: a light text colour set for the night would vanish on the day's pale glass.

| Key | What it changes |
|---|---|
| `text` · `textSecondary` · `textMuted` | Text, in three strengths |
| `fill` · `line` | Buttons and rows; dividers and borders |
| `background` | The window |
| `overlay` | The backdrop behind the window |
| `header` · `menu` | The header bar; drop-down menus |
| `blur` · `shine` | As for the panels |
| `radius` | The window's corners (`modal` only) |
| `navBackground` · `navBorder` | The menu across the top of a modal (Tracearr's bar at the bottom on a phone): its background and border line |
| `navText` · `navActive` · `navActiveText` | A menu item; the fill that slides to the chosen one, and its text |
| `subText` · `subActive` · `subActiveText` | The same for the items nested under a tab, e.g. in Tracearr or a title's detail |

| `toolbar` · `toolbarBorder` · `toolbarText` | The bar of search, filters and toggles under a modal's header: background, border and separators, text and icons |
| `toolbarActive` · `toolbarActiveText` · `filter` | A toggle that is on, its text; the value of a filter that narrows the list |
| `button` · `buttonBorder` · `buttonText` · `buttonHover` | Buttons in a modal |
| `buttonActive` · `buttonActiveText` | A button that is on |
| `switchOn` · `switchOff` · `switchKnob` | Switches and checkboxes |
| `progressTrack` · `progressFill` | Progress bars — playback position, season progress, a download in a title's detail |
| `grab` · `grabDone` · `grabFailed` | Interactive Search: the grab button, a release grabbed, a grab that failed |
| `quality4k` · `quality1080` · `quality720` · `torrent` · `usenet` | Quality and source chips — fill, rim and label all from the one colour |
| `scorePositive` · `scoreNegative` · `rejected` · `seeds` · `leechers` | Release score, rejected releases, peers |
| `searchDone` · `searchDownloading` | The automatic search's badges and its progress |

The search-result keys take a colour the way the panels' colours do (hex, rgb() or "r, g, b"); the rest, but the text, fill and line keys, take any CSS colour, `rgba()` included. Tables have no keys of their own: their headers are the muted text, their cells the secondary text, their rules the lines, and a row under the pointer the fill. The segmented pickers — the Library's Movies / TV / Music among them — take the top menu's colours.

## From a Home Assistant theme

Every key above is a CSS variable the card reads, so a theme can set it for every card on your dashboards at once. Colours that the card draws at its own transparency take three numbers, the way Home Assistant's own `rgb-primary-color` does; everything else takes a normal CSS value. The variable is `arr-` + the key in kebab-case, `-rgb` for a colour, and `left-`/`right-`/`modal-`/`modal-day-` in front for one place:

```yaml
# themes.yaml
my-theme:
  arr-text-rgb: "230, 230, 230"
  arr-accent-rgb: "255, 45, 120"
  arr-background: "rgba(20, 20, 28, 0.9)"
  arr-radius: "14px"
  arr-left-heading-rgb: "255, 214, 10"
  arr-modal-background: "rgba(12, 12, 20, 0.95)"
  arr-modal-day-text-rgb: "28, 28, 30"
```

What you set in the card's YAML or the editor wins over the theme.

## With card-mod

card-mod styles a card through its `ha-card`, and this card draws its own panels instead, so wrap it in card-mod's `custom:mod-card`. The variables are inherited from the wrapper:

```yaml
type: custom:mod-card
card_mod:
  style: |
    ha-card {
      --arr-text-rgb: 230, 230, 230;
      --arr-right-background: rgba(30, 10, 40, 0.8);
    }
card:
  type: custom:arr-stack-card
  # … your card config
```

Each modal carries an attribute of its own — `data-modal="detail"` (a title's detail), `data-modal="stream"` (Now Playing), `data-lib-modal`, `data-tra-modal`, `data-tl-modal`, `data-js-modal`, `data-act-modal`, `data-pw-modal`, `data-mt-modal`, `data-music-modal`, `data-album-modal`, `data-sim-modal` — for styling one modal with card-mod's `$` selectors.

## The older keys

Configs written before the tokens keep working. Each older key now sets the token that took over its job:

| Older key | Now sets |
|---|---|
| `headingTextColor` · `headingColor` | `heading` · `headingLine` |
| `primaryTextColor` | `text` and `posterText` |
| `secondaryTextColor` | `textSecondary` |
| `pagingButtonTextColor` · `downloadButtonTextColor` | `buttonText` of the right · left panel |
| `pagingButtonBackgroundColor` | `button` |
| `tagPillTextColor` · `pagingDotColor` · `pagingDotActiveColor` | `pillText` · `dot` · `dotActive` |
| `modalHeadingTextColor` · `modalPrimaryTextColor` · `modalSecondaryTextColor` | `modal.text` · `modal.textSecondary` · `modal.textMuted`, by day and by night |
| `modalBackgroundColor` · `modalOverlayColor` | `modal.background` · `modal.overlay`, by day and by night |

They reach further than they used to — `primaryTextColor` coloured a handful of titles before and now colours all of the text — so if something changes colour after updating, that is why. Where an older key and its new one are both set, the new one wins.
