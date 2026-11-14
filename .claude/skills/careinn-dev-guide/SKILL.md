---
name: careinn-dev-guide
description: Write or update a CareInn developer guide for the Android team (native Java + XML) as a published HTML artifact, in the house style of the Build Guide and Revision 1. Use whenever Sara asks for a guide, spec, revision, review of a build, or "tell the dev team how to build X" for any CareInn bedside screen or hospital.
---

# CareInn developer guide (for the Android team)

The readers are the Android developers. They build the bedside app **fully native** (Java + XML layouts, no WebView). This repo's React demo is the design reference: every value in a guide is measured from it.

Existing guides (match their look; read them if you have access):
- Build guide: https://claude.ai/artifact/2d1HuwKq18gHWYrkiJ8B4z
- Revision 1: https://claude.ai/artifact/HS2BMzYnU8ANYo93GaFfyn
- Feedback (Burjeel): https://claude.ai/artifact/YRizVruNqrS5PcCKWKYyyr

You don't need access to them to build a page: the template and a full example are bundled here.

## Page structure

Build the page from the bundled files:
- [template/page-start.html](template/page-start.html): `<title>`, fonts, the full CSS (light + dark tokens, contents sidebar, tables, code blocks, tags, chips, zones). Replace `__TITLE__` with a 2–4 word name. Add page-specific CSS in your own `<style>` block after it.
- Your body: `<div class="wrap">` → `<nav class="toc">` + `<main>`.
- [template/page-end.html](template/page-end.html): the script for the active sidebar link and the Copy buttons.
- [examples/feedback-burjeel.html](examples/feedback-burjeel.html): a complete guide. Copy its markup patterns. Its images aren't bundled, so read it for structure only.

Order inside `<main>`:
1. `header.doc`: eyebrow "For the Android team · Java + XML layouts", H1, a lede that links the Build guide, and a `dl.facts` strip (Device AiMedik MT15 · 15.6″ IPS · Panel 1920 × 1080 · 141 ppi · Design canvas 1920 × 1080 dp · date · Build guide link).
2. A summary card (`section.card.rev-top`): one-line summary, the main screenshot, an optional `finger-note` box, the tag legend (New / Still open / Changed / Issue), then a `table.revlist` (# · Tag · Item · Do this · →), grouped with `grp-row` rows.
3. One `section.card.rev-item` per item: a sec-head with number, title and tag, then a `p.sum` line. After that, screenshots with `want-chip` "Design" or `now-chip` "Build (now)" captions, **Part | Light | Dark** value tables, XML/Java code blocks (`.code` with a Copy button), and a strings table (key | English | Arabic | Urdu). It ends with `nav.rev-nav`: ← Previous · ↑ All · Next →.
4. A footer that links the Build guide.

The sidebar's group names and entries must match the cards. Readers find things as "Group → entry → heading".

## Getting the numbers and pictures

Use the **careinn-shoot** skill. Open the screen at 1920 × 1080 as the right hospital, measure the real boxes and styles, and take shots in English, Arabic and dark mode. Never guess a value.

- Crop and compress images (JPEG q86, ≤1600 px wide). Publish them as `files` next to the page (`img/…`).
- When you replace images on a published guide, use **new file names** (for example `img2/…`) and remove the old paths. Browsers cache by name and keep showing the old picture.
- Label mock-ups (for example "if there were 4 cards") as mock-ups on the page.

## Content rules (binding)

- Units are dp / sp. Use the Build guide's token names with their hex values: `brand_primary`, `brand_text`, `brand_subtle`, `card_surface`, `card_border`, `text_heading`, `text_muted`, `inset_fill`. Fills use brand_primary; text and icons use brand_text.
- Always give the dark-mode values in the Dark column. Never write that dark mode is "later", or that it can be skipped.
- **Landscape 1920 × 1080 only.** Don't mention or show portrait, phone or tablet layouts until Sara approves them.
- **One system.** One spec per component, never a special size or variant for one card or one count. If something doesn't fit, change the rule for everyone and say so.
- Elements that match each other stay matched. Shrink them together, never one alone.
- No hover or "it's a touch screen" lines. Give press feedback in a "Pressed" row (for example scale 0.96).
- Keep other lines that explain how to build something.
- Leave out hospital switching and the configurator: they exist only in the demo.
- Leave out Fakeeh's Person-Centred Care / Care Partner: it's not final. A "remove it for now" note is the only allowed mention.
- Dialog Cancel buttons keep grey text with a grey outline.
- XML must compile when copied: put comments outside tags, never inside the attribute list. Declare `xmlns:app` when a snippet uses `app:`.
- Strings go in `values/`, `values-ar/` and `values-ur/strings.xml`, with all three languages filled in.
- Plain, short sentences. One idea per sentence.

## Before publishing

1. Render the page with careinn-shoot's Chrome (or any headless browser) at 1440 px and 390 px wide. Check there's no horizontal overflow, and that the sidebar links and Copy buttons work.
2. Search the text for "portrait", "tablet", "mobile", "hover" and "later". None should be about this guide's layout.
3. Publish with the Artifact tool as a private artifact, with the images in `files`. Give Sara the link and tell her to share it with the team from the page's Share menu.
4. When you point her to a spot in the guide, write the path the way the sidebar shows it: "Group → entry → heading".
