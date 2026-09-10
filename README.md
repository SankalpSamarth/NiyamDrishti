# NiyamDrishti POC

An evidence-first compliance intelligence system for screening packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011.

This repository contains the internal-hackathon vertical slice. It is designed to demonstrate a complete officer workflow without claiming production-grade statutory adjudication.

## Round two update — 10 September 2026

Next round: **30 September 2026**. The current SIH slide template stays in use.

[Open the live app](https://niyamdrishti.vercel.app) · [Download the latest SIH presentation](outputs/SIH2026_dotcom_Round2_September30_Ready.pptx)

- A focused home screen, larger readable type, responsive layouts and a queue based on saved inspections.
- Live Compliance DNA comparisons between saved scans, with explicit sample provenance, conflicting-barcode rejection, and equivalent price/quantity normalization.
- Correction Lab: edit proposed declarations and compare rule outcomes without changing original evidence or officer decisions.
- IndexedDB stores photos, OCR boxes, findings and local officer activity across reloads. Data stays in this browser profile and origin; clearing site data removes it. Previous compact records cannot recover previously discarded images.
- An imported-product warning stops a Domestic scan from skipping importer checks when the text says “Imported by”.
- Real OCR line boxes, actual OCR confidence and low-confidence manual review. Edited text drops stale OCR overlays.
- A generated Nova Bite test-label shortcut runs actual OCR without relying on the pre-filled sample.

Read [the round two plan and demo](docs/ROUND_TWO.md) for the rehearsal sequence, current scope and remaining milestones.

## Fastest way to open it on macOS

Double-click **Start NiyamDrishti.command** in Finder. Keep the Terminal window open while using the application.

Do not open `index.html` directly. This is a React/TypeScript application and must be served by its local development server so its JavaScript modules, OCR worker and language weights load correctly.

## What works

- Responsive enforcement dashboard and searchable inspection register
- Guided product scoping before rule applicability is evaluated
- Multi-surface image upload with an offline English OCR engine
- Editable OCR text for human correction
- Twelve deterministic, explainable compliance checks
- Compliance DNA fingerprinting using barcode or product-identity similarity
- Cross-channel comparison of package, e-commerce and historical declarations
- Compliance-drift and repeated-violation detection across linked sightings
- Imported-product and package-type applicability logic
- Approximate calibrated font-height screening with a manual-review fallback
- Image-linked evidence overlays for the seeded demonstration
- Officer confirmation and override of machine suggestions
- Persistent local inspection history and product repository
- Print/save-to-PDF and editable `.doc` report exports
- Fully offline seeded demonstration case

## Run locally

Requirements: Node.js 20.19+ or Node.js 22.12+.

```bash
npm install
npm run dev
```

Open [http://localhost:4173](http://localhost:4173).

For a production-style build:

```bash
npm run build
npm run preview
```

## Reliable demo path

For the complete speaking script, team roles, judge questions and fallback plan, read [the team demo playbook](docs/TEAM_DEMO_PLAYBOOK.md).

1. On **Home**, select **Explore the guided demo**.
2. Review the individual inspection and select **Reveal product network**.
3. Show the same barcode linked across a retail package, marketplace listing and previous label.
4. Explain the MRP, unit-price and consumer-email drift.
5. Point to the repeated-violation enforcement signal.
6. Select a failed finding to jump to its image evidence.
7. Change the officer verification decision or export the combined report.

The included Aurelia shampoo case demonstrates:

- Imported-product applicability
- Missing consumer email
- Incorrect unit-sale-price calculation
- Estimated character height below the POC threshold
- Evidence overlays and human verification
- A 98% exact-barcode identity match across three seeded sightings
- Cross-channel MRP drift and historical label comparison
- Repeat detection for missing consumer email and incorrect unit price

## Architecture

```text
React capture and enforcement UI
              │
       Tesseract OCR adapter
              │
    Declaration extraction layer
              │
 Versioned deterministic rule engine
              │
 Evidence findings + officer override
              │
 Compliance DNA + declaration diff engine
              │
 Product network + enforcement report
```

The OCR boundary is isolated in `src/lib/ocr.ts`, so PaddleOCR or a government-hosted vision service can replace it after selection. The compliance logic lives in `src/lib/compliance.ts`; it intentionally does not rely on an LLM for pass/fail decisions.

## Offline OCR

English Tesseract language weights are vendored in `public/tessdata`. The application does not need to retrieve model weights from a CDN during the demo.

`predev` and `prebuild` copy the installed Tesseract worker and both LSTM recognition cores into `public/ocr-runtime`. The OCR adapter loads these local assets rather than a third-party CDN. This directory is generated and ignored by Git. A full offline PWA cache is not implemented; keep the local server running for offline rehearsals.

Hindi and additional Indian-language OCR are a post-selection task. PaddleOCR's Devanagari recognizer is the intended next adapter.

## Validation

```bash
npm test
npm run build
```

The current 20 automated tests cover complete imported packages, missing declarations, domestic/imported applicability, uncalibrated font review, currency substitutions, saved-record DNA matching, conflicting barcodes, equivalent declarations, repeat flags after officer overrides, low OCR confidence, correction simulation and escaped report exports.

## POC boundaries

- Authentication and roles are represented in the UI but are not backed by an identity provider.
- Font height is a screening estimate. Prescribed physical measurement remains an officer task.
- The included rules are a demonstrative subset and require validation by an authorized Legal Metrology expert before operational use.
- Product matching compares saved scans on the same device plus labelled seeded sightings. Marketplace crawling, government registry synchronization and cloud collaboration remain planned.
- IndexedDB stores original evidence and records. A compact localStorage fallback preserves searchable metadata. Neither provides multi-user sync or tamper-proof custody.

## Source references

- [Department of Consumer Affairs — Legal Metrology rules](https://consumeraffairs.gov.in/pages/legal-metrology-act)
- [Legal Metrology Packaged Commodities registration portal](https://lm.doca.gov.in/pcr/certificates)

## Important notice

NiyamDrishti is decision-support software. A machine finding is a potential compliance issue, not a legal determination. Final interpretation, measurement, evidence acceptance, and enforcement remain with authorized officers.
