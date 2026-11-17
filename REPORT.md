# Remake report

**Verdict: REMAKE COMPLETE** — for the scope and criteria below.

- **Reference:** <https://lironmoran-interiors.com/> (home page, viewed 16 November 2026)
- **Remake:** this repository (`index.html`, `styles.css`, `main.js`), branded **HCDESIGN**, set in Canada, in English and French
- **Checked:** 16 November 2026, in headless Google Chrome via `tools/check.mjs`

## Whose criteria these are

The HCDESIGN repository was empty apart from a one-line README, so it defined
no criteria. The criteria below were written by Claude from the reference site
and from the owner's instructions during the build (name it HCDESIGN, make it
for Canada, add French). The repository's issues, projects and wiki were
also empty. On 16 November 2026 the owner accepted these criteria as the
definition of REMAKE COMPLETE for this remake.

## Scope

A structural and visual remake of the reference **home experience**: loader,
full-screen slide stage, and overlay menu. The reference's inner pages
(projects, about, contact, gallery, project details) are not remade page for
page; short stand-in views for projects, about and contact exist so that no
link is dead.

The remake does **not** copy the reference's name, text, logo, fonts or
photographs. Copy is original, project names are invented, and the three
"photos" are flat SVG illustrations.

## Results

Every check passed on the final run. Raw output is in `report/result.json`.

### 1. Parts of the reference home, in the remake

| Reference | Remake | Result |
| --- | --- | --- |
| Black loader: ring with "Loading", large percent counter, progress line, caption | Same parts; counter runs 0 to 100, then the loader fades out | Pass |
| Header: logo left, "Gallery" link and round menu button right | Same, plus an EN / FR switch | Pass |
| Giant two-line serif title across the screen | Two lines, serif, fits the screen in both languages | Pass |
| Portrait image centred on top of the title | Centred portrait card, in front of the title, both title lines visible either side | Pass |
| "Scroll" label left, "1 – 3" counter right | Same | Pass |
| Three projects; scrolling swaps image and background colour, and loops | 3 slides, 3 background colours, loops forward and backward | Pass |
| Footer: tagline, "View all projects", year | Same | Pass |
| Small ring cursor that grows over the image | Follows the pointer, grows with a "View" label over the image | Pass |
| Single screen, no page scroll | No vertical or sideways scroll at 1280, 768 and 375 px | Pass |
| Overlay menu: black, four huge links with arrow, short blurb, large index number, footer row, colour toggle | All present; number follows the hovered link; toggle changes the colour | Pass |

### 2. Owner's instructions

| Instruction | Check | Result |
| --- | --- | --- |
| Name is HCDESIGN | Logo and page title read HCDESIGN; the reference's name appears nowhere in the page | Pass |
| For Canada | Tagline names Canada; all 6 projects are in Canadian cities with province codes; Canadian spelling ("colour"); language codes `en-CA` and `fr-CA` | Pass |
| French | FR switch translates every labelled string (visible text, page title, screen-reader labels); English and French have the same set of keys; choice is remembered after reload; switching back works | Pass |

### 3. Behaviour and quality

| Check | Result |
| --- | --- |
| Slides change by mouse wheel, arrow keys, and touch swipe | Pass |
| Slides do not change while the menu is open | Pass |
| Menu: `aria-expanded` set, closes on Escape, not focusable while closed | Pass |
| Projects, About and Contact open from the menu, move focus to their heading, and "Back" returns home | Pass |
| Every in-page link points at something that exists; no external links | Pass |
| Title, image and menu fit at 768 and 375 px wide, in both languages | Pass |
| Reduced-motion setting: loader is skipped, title shown at once, slides still change | Pass |
| Console errors and failed requests | None |

Screenshots from the final run: `report/01-loader.png`, `02-home.png`,
`03-slide-2.png`, `04-slide-3.png`, `05-menu.png`, `06-projects.png`,
`07-french.png`, `08-tablet.png`, `08-tablet-menu.png`, `08-phone.png`,
`08-phone-menu.png`.

## Known differences from the reference

These are outside the criteria above, and are listed so the verdict is not read
as more than it is.

- **Content is placeholder.** Copy, project names, cities and dates are
  invented, and `hello@hcdesign.example` is not a real address. The French was
  written by Claude and has not been reviewed by a native speaker.
- **Illustrations, not photographs.** The slides are simple SVG drawings.
  Real project photos need to come from the owner.
- **Inner pages are stand-ins.** Projects, About and Contact are short
  full-screen views inside the same page, not remakes of the reference's
  pages. "Gallery" opens the projects list. There are no project detail pages.
- **Typeface.** The reference uses licensed web fonts. The remake uses system
  fonts (Didot or Bodoni for the title, Helvetica for the rest), so the title
  is wider and looks different on devices without those fonts.
- **Slide transition.** The reference draws its images on a canvas with its
  own transition effect. The remake uses a CSS wipe with a slow zoom.
- **Left out on purpose.** The reference's WhatsApp button and social links
  are not included, because HCDESIGN's accounts are not known.
- **Not compared pixel by pixel.** Checks are structural and behavioural. No
  visual-diff against the reference was run.
- **Run history.** Three runs were made. The first passed, but its
  screenshots showed the title hidden behind the image on phones and the large
  cursor staying on screen when the menu opened; both were fixed and checks
  for them were added. The second run then failed the new title check at
  768 px; the layout was adjusted and the third run passed everything.
- **Check script is macOS-specific** unless the `CHROME` environment variable
  points at a Chrome binary.

## Re-running the checks

Serve the folder, then run the script with Node 22 or later and Google Chrome
installed:

```bash
python3 -m http.server 4174
```

```bash
node tools/check.mjs http://localhost:4174/ report
```
