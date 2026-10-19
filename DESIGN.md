---
name: MANDATE
description: Agent behaviour recorder. Gridded chart paper mounted in a hammertone instrument housing; one ink per detection lens, red reserved for risk.
colors:
  lamp-amber: "#ffb547"
  lamp-amber-bright: "#ffc266"
  ink-red: "#c42318"
  lamp-red: "#ff5b4a"
  alarm-well: "#3a1d1a"
  alarm-glow: "#ff8a7d"
  lamp-green: "#86dba0"
  ink-black: "#15181b"
  ink-amber: "#985806"
  ink-blue: "#1d4fb8"
  ink-violet: "#6b3aa6"
  ink-green: "#17704a"
  ink-graphite: "#4f5a54"
  housing-950: "#0e1412"
  housing-900: "#141b18"
  housing-850: "#19211d"
  housing-800: "#1e2723"
  housing-700: "#29332e"
  housing-600: "#37443e"
  seam: "#0a0f0d"
  engrave: "#d2dbd5"
  engrave-2: "#9eaba3"
  engrave-3: "#85938b"
  paper: "#f3f6f1"
  paper-2: "#e8ede6"
  paper-edge: "#d3dbd1"
  grid-minor: "#d6e6da"
  grid-major: "#a7ccb3"
  grid-ink: "#3c6a50"
typography:
  display:
    fontFamily: "Sofia Sans Extra Condensed Variable, Sofia Sans Condensed Variable, sans-serif"
    fontSize: "clamp(3.1rem, 7.4vw, 6rem)"
    fontWeight: 800
    lineHeight: 0.88
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Sofia Sans Extra Condensed Variable, Sofia Sans Condensed Variable, sans-serif"
    fontSize: "clamp(2.6rem, 5vw, 4.25rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Sofia Sans Extra Condensed Variable, Sofia Sans Condensed Variable, sans-serif"
    fontSize: "clamp(1.9rem, 3vw, 2.6rem)"
    fontWeight: 800
    lineHeight: 0.95
  subhead:
    fontFamily: "Sofia Sans Condensed Variable, Sofia Sans Variable, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: 1.25
  body:
    fontFamily: "Sofia Sans Variable, system-ui, sans-serif"
    fontSize: "17.5px"
    fontWeight: 400
    lineHeight: 1.65
  body-small:
    fontFamily: "Sofia Sans Variable, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label-engraved:
    fontFamily: "Sofia Sans Condensed Variable, Sofia Sans Variable, sans-serif"
    fontSize: "10px"
    fontWeight: 620
    lineHeight: 1.2
    letterSpacing: "0.14em"
  label-printed:
    fontFamily: "Sofia Sans Condensed Variable, Sofia Sans Variable, sans-serif"
    fontSize: "10.5px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.1em"
  key:
    fontFamily: "Sofia Sans Condensed Variable, Sofia Sans Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.12em"
  data:
    fontFamily: "Martian Mono Variable, ui-monospace, monospace"
    fontSize: "10.5px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: '"tnum" 1'
  readout:
    fontFamily: "Martian Mono Variable, ui-monospace, monospace"
    fontSize: "38px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: '"tnum" 1'
  stamp:
    fontFamily: "Sofia Sans Extra Condensed Variable, Sofia Sans Condensed Variable, sans-serif"
    fontSize: "14.5px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
  wordmark:
    fontFamily: "Sofia Sans Extra Condensed Variable, Sofia Sans Condensed Variable, sans-serif"
    fontSize: "21px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.2em"
rounded:
  hairline: "2px"
  sheet: "3px"
  row: "4px"
  key: "5px"
  panel: "6px"
  round: "9999px"
spacing:
  seam: "1px"
  key-gap: "6px"
  grid-minor: "8px"
  stack: "12px"
  gutter: "16px"
  panel: "20px"
  panel-wide: "28px"
  gutter-wide: "32px"
  grid-major: "40px"
  block: "56px"
  section: "96px"
  section-wide: "128px"
components:
  key-lit:
    backgroundColor: "{colors.lamp-amber}"
    textColor: "{colors.housing-950}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "0 20px"
    height: "48px"
  key-lit-hover:
    backgroundColor: "{colors.lamp-amber-bright}"
  key-plain:
    backgroundColor: "{colors.housing-700}"
    textColor: "{colors.engrave}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "0 16px"
    height: "40px"
  key-plain-hover:
    backgroundColor: "{colors.housing-600}"
  key-tab:
    backgroundColor: "{colors.housing-850}"
    textColor: "{colors.engrave-2}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "0 12px"
    height: "32px"
  key-tab-selected:
    backgroundColor: "{colors.housing-600}"
    textColor: "{colors.engrave}"
  key-alarm:
    backgroundColor: "{colors.alarm-well}"
    textColor: "{colors.lamp-red}"
    typography: "{typography.key}"
    rounded: "{rounded.key}"
    padding: "0 16px"
    height: "40px"
  revoke-switch-filled:
    backgroundColor: "{colors.ink-red}"
    textColor: "{colors.paper}"
    rounded: "{rounded.key}"
  panel:
    backgroundColor: "{colors.housing-850}"
    textColor: "{colors.engrave}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-black}"
    rounded: "{rounded.sheet}"
    padding: "{spacing.panel}"
  readout-well:
    backgroundColor: "{colors.housing-950}"
    textColor: "{colors.lamp-amber}"
    typography: "{typography.readout}"
    rounded: "{rounded.sheet}"
    padding: "6px 10px"
  readout-window:
    backgroundColor: "{colors.housing-900}"
    textColor: "{colors.engrave}"
    typography: "{typography.subhead}"
    padding: "6px 12px"
  ink-stamp:
    textColor: "{colors.ink-red}"
    typography: "{typography.stamp}"
    rounded: "{rounded.hairline}"
    padding: "2px 7px 1px"
  chip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-graphite}"
    typography: "{typography.data}"
    rounded: "{rounded.sheet}"
    padding: "4px 10px"
  chip-on:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
  select:
    backgroundColor: "{colors.housing-800}"
    textColor: "{colors.engrave}"
    typography: "{typography.data}"
    rounded: "{rounded.row}"
    padding: "0 8px"
    height: "36px"
  palette-input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink-black}"
    typography: "{typography.data}"
    height: "48px"
  palette-item-selected:
    backgroundColor: "{colors.ink-black}"
    textColor: "{colors.paper}"
    rounded: "{rounded.sheet}"
    padding: "8px 12px"
  case-row:
    textColor: "{colors.engrave-2}"
    rounded: "{rounded.row}"
    padding: "8px"
  case-row-active:
    backgroundColor: "{colors.housing-700}"
    textColor: "{colors.engrave}"
  nameplate:
    backgroundColor: "{colors.housing-950}"
    textColor: "{colors.engrave}"
    height: "56px"
---

# Design System: MANDATE

## Overview

**Creative North Star: "The Chart Recorder"**

MANDATE is built as a multi-pen strip-chart recorder: a polygraph for AI agents. Everything sits in one of two materials. The housing is deep green-black hammertone enamel, a procedural 512px tile, with raised plates, recessed wells, cut seams, engraved condensed caps and small lamps. The paper is cool chart white ruled in recorder green, with a millimetre grid that gets heavier every fifth line, and it carries everything the machine writes: pen traces, event marks, factor annotations and rubber stamps. The chart is the argument. A declared role is the claim, and the paper shows where behaviour stops telling the truth.

The system is dense and technical, like a lab instrument. It is not dashboard chrome. Colour is functional ink: each detection lens writes in its own ink, red ink belongs to risk and alarm, and amber is the one light that tells you where to act. Type follows the materials. The housing is engraved in extra-condensed and condensed caps, the paper is printed in condensed caps, and anything the machine produced (addresses, scores, points, units) is set in Martian Mono.

The motion grammar is mechanical and sparse. Paper advances at constant speed, pens ease to their new value, and stamps land in 120 ms. Nothing else moves. The system rejects the security-category default of dark glass panels, glowing node graphs and floating KPI tiles.

**Key Characteristics:**
- Two materials only: hammertone housing (plates, wells, seams, lamps, keys) and gridded chart paper (sheets, strips, reports, cards).
- One ink per lens on the chart; red ink reserved for risk and alarm; amber is the single lit accent.
- Engraved caps on metal, printed caps on paper, mono for machine output with tabular numerals.
- Physical depth: raised plates, recessed wells, paper lying on the housing; no decorative glow.
- Mechanical motion: constant paper advance, eased pens, 120 ms stamps; a static end state under reduced motion.

## Colors

The palette is an instrument's: an enamel housing ramp, a chart-paper set, a box of pen inks and three indicator lamps. Every hue has one job.

### Primary
- **Indicator Amber** (lamp-amber): the one lit colour on the housing. Used for the lit push-button ("Run the live console", "Run", "Sign as …"), the focus ring, text selection, the caret, the recording lamp, the selector's chosen detent, the declared ring, and live chart readouts. Hovering a lit key raises it to **Bright Amber** (lamp-amber-bright).

### Secondary
- **Alarm Ink Red** (ink-red): risk and alarm marks on paper. Used for the risk pen, rung threshold lines, decision stamps (SCOPED DOWN, DECOY SERVED, CAPTURED), factor points (+40), risk ≥ 45 values, and the revoke switch's fill.
- **Alarm Lamp Red** (lamp-red): the same meaning emitted on the housing. Used for breached readouts, risk ≥ 45 numerals, the red lamp, and the second line of the hero headline.
- **Alarm Well** (alarm-well) with **Alarm Glow** text (alarm-glow): the recessed oxblood ground of destructive controls (the hold-to-revoke switch and the "ignore receipts" toggle).

### Tertiary (lens inks, paper only)
- **Mandate Black** (ink-black): the Mandate lens, all body ink on paper, ALLOWED stamps, the reading crosshair.
- **Taint Amber** (ink-amber): the Taint lens.
- **Self Blue** (ink-blue): the Self lens and the rolling-baseline trace; also the owner's pen signature on a Mandate Card.
- **Herd Violet** (ink-violet): the Herd lens.
- **Chain Green** (ink-green): the Chain lens. It currently also marks receipts and waived factors.
- **Drift Graphite** (ink-graphite): the Drift lens, the drift-budget shelf, and secondary ink on paper (captions, units, "nothing new").
- **Benign Lamp Green** (lamp-green): the housing's all-clear. Used for the observe rung, IAM "Allow", benign cases, and low-risk readouts.

### Neutral
- **Housing Enamel ramp** (housing-950 → housing-600): 950 for wells, the nameplate strip and chart mounts; 900 for the page ground and readout windows; 850 for plates and table heads; 800 for hover rows and the recorder's label column; 700 for plain keys and the active row; 600 for pressed/selected keys and pen arms.
- **Seam** (seam): 1px cuts between plates, rows and readout windows.
- **Engraving** (engrave, engrave-2, engrave-3): primary text on housing, engraved labels and secondary copy, and tertiary marks (ticks, inactive detents, idle values).
- **Chart Paper** (paper, paper-2, paper-edge): sheet ground, the factor-sum strip, and paper rules and borders.
- **Recorder Grid** (grid-minor, grid-major, grid-ink): the 8px minor and 40px major rules, and printed labels on paper.

### Named Rules
**The Red Ink Rule.** Red means risk or alarm, and nothing else. It is used for the risk pen, thresholds, decision stamps, breached readouts and the revoke switch. Never use it as decoration, a brand accent, a link or emphasis.

**The One Pen, One Ink Rule.** On the chart each lens writes in exactly one ink: Mandate black, Taint amber, Self blue, Herd violet, Chain green, Drift graphite, Risk red. A new channel gets a new ink. It never borrows one.

**The Two Surfaces Rule.** Inks are for paper and lamps are for housing. Lens inks are tuned to paper (5.1:1 or better on paper). On the housing a lens appears only as a brightened swatch bar beside its engraved name, never as ink text. The one crossing is a housing-950 readout well set into a sheet, which keeps its lamp colours.

**The Lit Key Rule.** Amber is the only lit thing on the housing. Each viewport has one lit key. Everything else is unlit enamel until it is pressed or selected.

## Typography

**Display Font:** Sofia Sans Extra Condensed Variable (with Sofia Sans Condensed Variable, sans-serif)
**Body Font:** Sofia Sans Variable (with system-ui)
**Label/Mono Font:** Sofia Sans Condensed Variable for engraved and printed labels; Martian Mono Variable (standard width) for data

**Character:** A single condensed grotesque family gives the instrument faceplate one voice from 9px plate labels to 96px headlines. Martian Mono is the machine's own hand. It sets every address, score and unit, so a reader can tell at a glance what was written by the engine and what was written by a person.

### Hierarchy
- **Display** (800, clamp(3.1rem, 7.4vw, 6rem), 0.88): the landing headline only, in engrave with an alarm line in lamp-red.
- **Headline** (800, clamp(2.6rem, 5vw, 4.25rem), 0.92, max 18ch): section headlines. They stand alone, with no label above them.
- **Title** (800, clamp(1.9rem, 3vw, 2.6rem), 0.95): the console case title, the Mandate Card role (34–40px), lens names (30px), certificate titles.
- **Subhead** (Condensed 600, 17–26px, ~1.25): event summaries, rung names, list headings, readout values.
- **Body** (400, 16–17.5px, 1.6–1.65, 62–64ch): leads and explanations. **Body-small** (13–15px) is for panel copy and captions.
- **Label, engraved** (Condensed 620, 8.5–11px, 0.14em, uppercase, engrave-2): plate names, channel names, readout captions and nav, on the housing only.
- **Label, printed** (Condensed 600, 9.5–11px, 0.1em, uppercase, grid-ink): column heads, field names and form legends, on paper only.
- **Key** (Condensed 700, 10–14px, 0.12em, uppercase): push-button legends.
- **Data** (Martian Mono 400–600, 9–13px, tabular): step addresses (T4, PRC-01, SCN-01), points, units, fingerprints, IAM/gateway verdicts.
- **Readout** (Martian Mono 600, 30–38px, tabular, zero-padded to three digits): the risk counter.
- **Stamp** (Extra Condensed 800, 11–15px, 0.07–0.08em, uppercase): rubber stamps on paper.

### Named Rules
**The Material Voice Rule.** A label takes its material's voice. On the housing it is engraved (0.14em, engrave-2). On paper it is printed (0.1em, grid-ink). Never mix them on one surface.

**The Mono Is Machine Rule.** Martian Mono is only for what the engine produced: addresses, scores, points, units, hashes. Any number that updates uses tabular figures.

**The Weighted Annotation Rule.** Chart annotations scale with their contribution. A factor note is sized 9.5 + 0.24 × points (10.5–16.5px), so the largest contributor is the loudest note on the paper.

## Layout

The spatial model is a rack of instruments on a hammertone wall. On the landing page, sections run full-bleed on the housing with a 1360px max content width. Side gutters are 16px at phone width and 32px from 640px up. Vertical rhythm is 96px per section (128px from 1024px), with 56px between a section's lead and its instrument. Leads cap at 62ch. The console is a three-column rack: a 264px case rack, a fluid chart column, and a 372px report column from 1280px (two columns from 1024px, stacked below). Plates are separated by a 12px gap. Plate padding is 20px (28px from 1024px). Readout windows tile edge to edge with 1px seams between them. Key groups space at 6px.

Paper follows its own grid: 8px minor rules and 40px major rules (every fifth line). The recorder computes its lane heights from its container. The risk lane is 2.7 units tall and each lens lane is 1 unit, with IAM and Mandate stamp rows beneath. When the chart is under 640–760px wide it switches to a compact layout (narrower label column, smaller stamps, one annotation per step). Breakpoints are Tailwind's defaults: 640, 768, 1024 and 1280px.

## Elevation & Depth

Depth is physical and every shadow describes a real relation. Plates are raised: an inset top highlight, an inset bottom shade and a short drop. Wells are recessed: a heavy inset shadow. Seams are cut lines. Paper lies on the housing with a long soft drop. Keys are bevelled: an inset top highlight, an inset bottom lip and a 1px black ring. The only emitted light belongs to a lit lamp and the lit key's amber halo. Backdrop blur is used only on the sticky nameplate (6px) and the palette scrim (2px).

### Shadow Vocabulary
- **Raised plate** (`inset 0 1px 0 rgb(255 255 255 / 0.06), inset 0 -1px 0 rgb(0 0 0 / 0.5), 0 1px 0 rgb(255 255 255 / 0.03), 0 10px 24px -12px rgb(0 0 0 / 0.7)`): every housing panel.
- **Recessed well** (`inset 0 2px 6px rgb(0 0 0 / 0.75)`): chart mounts and the strip-chart bay.
- **Seam** (`inset 0 1px 0 rgb(0 0 0 / 0.65), inset 0 -1px 0 rgb(255 255 255 / 0.05)`): nameplate badges, readout wells, readout windows.
- **Paper on housing** (`0 24px 48px -24px rgb(0 0 0 / 0.85), 0 2px 0 rgb(0 0 0 / 0.35)` for sheets; `0 18px 36px -20px rgb(0 0 0 / 0.9)` for the report and card): any paper laid on the housing.
- **Key bevel** (`inset 0 1px 0 rgb(255 255 255 / 0.08), inset 0 -2px 0 rgb(0 0 0 / 0.35), 0 0 0 1px rgb(0 0 0 / 0.7)`): plain keys. The lit key adds `0 6px 18px -6px rgb(255 181 71 / 0.55)`.
- **Lamp emission** (`0 0 0 1px rgb(0 0 0 / 0.6), 0 0 10px 1px <lamp 55%>, inset 0 -1px 1px rgb(0 0 0 / 0.35)`): lit lamps only.

### Named Rules
**The Machined Depth Rule.** Use a shadow only if a machinist could name it: raised, recessed, cut, laid on or emitting. No ambient glows, no frosted-glass panels, no decorative drop shadows.

## Shapes

Corners are tight and machined: 2px for paper strips and chart insets, 3px for sheets, stamps, wells and chips, 4px for rows and selects, 5px for keys, and 6px for plates. Only things that are round on a real instrument are round: lamps, screw heads, knobs, pen nibs, pivot points and the paper's feed holes (5px recessed dots along a sheet's top and bottom edge). Rubber stamps are set at a slight angle (-3° to -6°), with a 1.6–2.5px border and a fractal-noise ink mask so they read as pressed, not printed. A Mandate Card sheet sits at -0.6° on the housing. Inferred evidence is drawn as a hairline or dash, and observed evidence as a solid stroke.

## Components

### Buttons (push-buttons / keys)
Engraved push-buttons with a 1px travel, set in condensed caps (Key typography).
- **Shape:** gently machined corners (5px).
- **Lit:** lamp-amber with housing-950 text, 48px tall (56px on the closing call), 20px side padding, with the amber halo. Use it for the one primary action per viewport.
- **Plain:** housing-700 with engrave text, 40px tall (36px in headers, 32px for tabs, 28px for speed chips).
- **Hover / Active / Focus:** hover lifts one housing step (700 → 600; amber → bright amber). Active presses down 1px (120 ms, ease-out-expo). Focus shows a 2px amber outline at a 3px offset. Disabled drops to 40–45% opacity with a not-allowed cursor.
- **Selected (tabs, speed radios):** housing-600 with engrave text. Unselected is housing-850 with engrave-3 text. Tabs carry their mono keyboard number.
- **Alarm toggle:** the alarm well with lamp-red text marks the dangerous position of a two-way switch.

### Hold-to-revoke switch
The only destructive control. It sits on the alarm well with alarm-glow condensed caps. Holding it (1.4–1.6 s) sweeps an ink-red fill across, and the label then swaps to a confirmation ("PRC-01 token revoked"). It is never a single click and never automatic.

### Detent selector
A rotary knob over a 220° sweep, with one engraved tick and caption per rung. The active tick lights amber, or lamp-red for the revoke detent. An amber dot marks the engine's recommendation. The knob turns in 260 ms (ease-out-expo). It is operated with the arrow keys and Home/End, and exposed as a slider with a text value. Every response is its own detent, so no containment action hides in a menu.

### Lamps
10px indicator lamps: amber for attention or recording, red for alarm, green for benign. Unlit lamps are housing-600. A lamp is always paired with an engraved label or an accessible name.

### Cards / Containers
- **Plate:** hammertone texture over housing-850, 6px corners, raised-plate shadow, 20–28px padding. An engraved label names the plate.
- **Sheet:** paper with a 3px corner, the paper-on-housing shadow, and feed-hole edges on long sheets. A 2px ink-black rule separates the title block from the body. Its printed legend carries identifiers (case, agent, seed), not a topic.
- **Readout window:** housing-900 cells divided by 1px seams, an engraved caption over a condensed value. Breached values turn lamp-red and change their word ("Breached", "Yes").
- **Readout well:** a housing-950 seam-cut well holding the mono risk counter, zero-padded to three digits. It is amber or green below threshold and lamp-red from 45.

### Chips
Mandate Card data-class toggles. They are mono, 3px corners, paper-edge border and graphite text. When on, they fill ink-black with paper text. A class outside the role template fills ink-red. Each chip carries its sensitivity tier (s1–s4).

### Inputs / Fields
- **Select (housing):** housing-800 with a 1px black ring, mono 11.5px, 4px corners, 36px tall, focus via the amber outline.
- **Palette input (paper):** the "Go to" command field is a paper sheet with a mono 14px input under a printed "Go to" label and a 2px ink-black rule. The selected item inverts to ink-black with paper text. Group headings are printed labels.

### Navigation
A 56px sticky nameplate on housing-950 (92–95% opacity with 6px blur) and a seam on its bottom edge. It holds the MANDATE wordmark in a seam-cut housing-800 badge (Extra Condensed 800, 0.2em tracking), an engraved model line, engraved section links that brighten to engrave on hover, and a plain key with an amber lamp ("Open console"). On the console, the right of the nameplate carries the recording lamp and the palette key with its `/` keycap. Section links hide below 1024px.

### Strip-chart recorder (signature)
The system's centre. Lanes stack top to bottom: risk (2.7 units, with dotted red rung thresholds at 25 / 45 / 65 / 85), then Mandate, Taint, Self, Herd, Chain and Drift (with its dashed graphite budget shelf). Below them sit two stamp rows, "IAM says" and "Mandate". Each trace has a slight tremor and an ink-noise filter. Each pen has a nib with a faint ring and, in scroll mode, a pivoted arm. The label column is housing-800 with brightened ink swatches and engraved names. Event marks print T-numbers in mono above the paper. Factor notes print in the margin with a "+points" lead in red mono and a leader line to the risk pen (solid for observed, dashed hairline for inferred). Hovering draws a crosshair and opens a paper reading card with the time, risk and every lens value. The recorder has two modes: scroll (paper advances right to left past a fixed pen line) and fit (a whole case on one sheet, with a carriage line).

### Ink stamp
Rotated rubber stamps in Extra Condensed 800 caps. They are outlined for verdicts that passed (ALLOWED in ink-black), outlined red for interventions on the risk lane, and filled red with paper text for a blocked gateway decision. The CSS `.stamp` variant adds a 2.5px border, a multiply blend and a noise mask for stamps on sheets ("Enforced", "No receipt"). Stamps land in 120 ms: scale 1.18 → 1 with opacity 0 → 1, ease-out-expo.

### Motion
- Paper advances at a constant 62px/s (labelled 6.2 mm/s), or 44px/s when compact.
- Pens ease to each new value over 520 ms (cubic in-out, computed in the recorder; there is no CSS token for it).
- Stamps land in 120 ms. Keys press in 120 ms. The detent turns in 260 ms. Row and colour changes take 160 ms.
- Under reduced motion the chart renders its end state statically and every animation drops to 0.01 ms.

## Do's and Don'ts

### Do:
- **Do** mount every block on one of the two materials: a hammertone plate on the housing or a paper sheet. Nothing floats on bare background colour.
- **Do** say every risk state in words or a stamp as well as colour: lamps with engraved labels, ALLOWED/DENIED stamps, "Breached" next to a red value.
- **Do** draw observed facts solid and inferred attributions as a hairline or dash, with "(inferred)" set in italic.
- **Do** set every updating number in tabular Martian Mono and zero-pad the risk readout to three digits.
- **Do** print "synthetic telemetry" on any chart or certificate that shows engine output.
- **Do** land stamps in 120 ms with ease-out-expo, and let only paper, pens, stamps, keys and knobs move.
- **Do** keep a 2px amber outline at a 3px offset as the focus state on every interactive part, the detent knob included.

### Don't:
- **Don't** use red for anything that is not risk or alarm: no red links, red emphasis or red brand accents.
- **Don't** let two lenses share an ink on the chart, or give a lens an ink that is not its own.
- **Don't** set lens-ink text on the housing or lamp colours on paper (except a housing-950 readout well set into a sheet).
- **Don't** build dark glass panels, glowing node graphs or floating KPI tiles. Numbers live in seam-cut readout windows, in wells or on the paper.
- **Don't** round anything beyond 6px unless it is round on a real instrument (lamp, screw, knob, nib, feed hole).
- **Don't** put a kicker or eyebrow label above a section headline. A printed legend on paper must carry an identifier (case, agent, seed), not restate the topic.
- **Don't** set engrave-3 text on housing-700 (4.1:1). Active and current rows switch their meta text to engrave-2; engrave-3 clears 4.5:1 on housing-800, 850 and 900.
- **Don't** animate panels, scroll reveals or hovers beyond a one-step colour change. A destructive action must never be a single click.
