# NiyamDrishti POC

An evidence-first compliance copilot for screening packaged commodities under the Legal Metrology (Packaged Commodities) Rules, 2011.

This repository contains the internal-hackathon vertical slice. It is designed to demonstrate a complete officer workflow without claiming production-grade statutory adjudication.

## Fastest way to open it on macOS

Double-click **Start NiyamDrishti.command** in Finder. Keep the Terminal window open while using the application.

Do not open `index.html` directly. This is a React/TypeScript application and must be served by its local development server so its JavaScript modules, OCR worker and language weights load correctly.

## What works

- Responsive enforcement dashboard and searchable inspection register
- Guided product scoping before rule applicability is evaluated
- Multi-surface image upload with an offline English OCR engine
- Editable OCR text for human correction
- Twelve deterministic, explainable compliance checks
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

1. Open **New inspection**.
2. Select **Load demo evidence**.
3. Review the extracted declarations.
4. Select **Analyze 12 compliance checks**.
5. Select a failed finding to jump to its evidence.
6. Change the officer verification decision and observe the score update.
7. Export an editable report or use **Print / save PDF**.

The included Aurelia shampoo case demonstrates:

- Imported-product applicability
- Missing consumer email
- Incorrect unit-sale-price calculation
- Estimated character height below the POC threshold
- Evidence overlays and human verification

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
 Local repository + report generation
```

The OCR boundary is isolated in `src/lib/ocr.ts`, so PaddleOCR or a government-hosted vision service can replace it after selection. The compliance logic lives in `src/lib/compliance.ts`; it intentionally does not rely on an LLM for pass/fail decisions.

## Offline OCR

English Tesseract language weights are vendored in `public/tessdata`. The application does not need to retrieve model weights from a CDN during the demo.

Hindi and additional Indian-language OCR are a post-selection task. PaddleOCR's Devanagari recognizer is the intended next adapter.

## Validation

```bash
npm test
npm run build
```

The current tests cover complete imported packages, missing declarations, domestic/imported applicability, uncalibrated font review, and common OCR currency-symbol substitutions.

## POC boundaries

- Authentication and roles are represented in the UI but are not backed by an identity provider.
- Font height is a screening estimate. Prescribed physical measurement remains an officer task.
- The included rules are a demonstrative subset and require validation by an authorized Legal Metrology expert before operational use.
- E-commerce reconciliation, government registry synchronization, automated gazette ingestion, and cloud collaboration are planned extensions.
- Browser local storage is used for created inspections; PostgreSQL and object storage are the intended production targets.

## Source references

- [Department of Consumer Affairs — Legal Metrology rules](https://consumeraffairs.gov.in/pages/legal-metrology-act)
- [Legal Metrology Packaged Commodities registration portal](https://lm.doca.gov.in/pcr/certificates)

## Important notice

NiyamDrishti is decision-support software. A machine finding is a potential compliance issue, not a legal determination. Final interpretation, measurement, evidence acceptance, and enforcement remain with authorized officers.
