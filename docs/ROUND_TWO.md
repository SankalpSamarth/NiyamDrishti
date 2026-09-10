# NiyamDrishti: round two

Team dotcom. Next round: 30 September 2026. Use the existing six-slide SIH template, with slide one left for the team to fill.

## The product story

An inspection should do more than produce a score. It should preserve the evidence, help the officer understand what needs attention, and connect the product to its earlier inspections. The manufacturer should also be able to test a proposed correction without rewriting that evidence.

Pitch: “NiyamDrishti reads package declarations, explains screening flags and remembers the product’s history. Compliance DNA connects inspections, while Correction Lab shows which proposed label changes resolve the detected issues.”

## Working in this revision

The home screen prioritizes a new scan and the user’s saved inspection queue. English OCR runs in the browser. The worker, recognition cores and English weights load from the app’s own server, so the recognition path does not rely on a third-party CDN. A hosted site still needs its assets available; a full offline PWA is not implemented.

The OCR adapter requests line bounding boxes. Low-confidence text matches become manual reviews. If someone edits the extracted text, the app discards the old boxes to avoid presenting stale image evidence as support for a correction.

The selected origin and package type determine the applicable POC checks. An “Imported by” declaration combined with Domestic selection triggers a confirmation prompt. The page states how many checks apply. This is still a limited applicability model, not a complete legal rules library.

IndexedDB retains photographs and original OCR alongside inspection records. LocalStorage keeps compact metadata as a fallback. Old images previously discarded by the earlier prototype cannot be recovered. Storage is per device, browser profile and URL origin. Clearing site data deletes it.

Compliance DNA now consumes newly saved scans. It rejects known conflicting barcodes, compares equivalent currency and quantity formats, excludes the current inspection, and respects officer decisions when counting repeated flags. Exact barcode and name similarities remain heuristic identity signals. Differences across dates or channels are reasons to investigate, not automatic proof of wrongdoing.

Correction Lab runs the same rule engine on proposed text. It shows before/after screening scores and only the findings that changed. It never updates original evidence or uses a simulation as a verified package correction. Local officer activity records each rule decision, but there is no authentication or tamper-proof audit log.

## Five-minute demonstration

1. **Home (20 seconds).** “One clear action starts an inspection; saved cases that need attention appear below.”
2. **New scan → Try test label with real OCR (60 seconds).** Explain that Nova Bite is a generated test image, then click Run local OCR. Show the editable text and image-derived evidence blocks.
3. **Confirm imported product (20 seconds).** Explain why an importer on the image should trigger the imported checks. Run all twelve applicable checks.
4. **Needs attention (40 seconds).** Show the missing consumer email, inconsistent unit price and font-measurement review. On the rehearsal image, MRP 240 / 200 g gives 1.20/g, whereas the label declares 1.50/g. The last live run gave 9 passes, 2 flags, 1 review, score 83. OCR results may vary with images or engine changes.
5. **Correction Lab (45 seconds).** Add a clearly fictional demonstration email and change 1.50/g to 1.20/g in the draft. Test it. Explain that the original inspection and photograph remain unchanged. For the pre-filled HydraGlow case, the equivalent correction changes two outcomes and score 79 to 93 because its font finding remains.
6. **Home → guided demo → Reveal product network (45 seconds).** Distinguish the three seeded marketplace/history sightings from saved scans. Explain changes and repeated flags without alleging that every price difference is illegal.
7. **Reopen after refresh and export (30 seconds).** Show that the evidence survives and that every individual finding remains available to the officer.

For a live DNA demonstration with your own products, create two scans of the same labelled SKU using the same barcode. Use a new photo or captured listing when declarations actually differ. The second record links to the first. Do not silently edit OCR to fabricate evidence; use Correction Lab for hypothetical changes.

## Milestones to 30 September

| Dates | Proposed work | Evidence of completion |
| --- | --- | --- |
| 10–14 Sep | Test the new workflow, assemble a consented package-photo set, define narrow supported categories | 30–50 diverse real products with manually checked declaration labels and separate held-out examples |
| 15–20 Sep | Improve extraction on the error cases, evaluate Hindi/English OCR, validate applicability with an expert | Per-field extraction precision/recall, false-flag rate, processing time and documented limits |
| 21–25 Sep | Add shared authenticated storage and structured marketplace evidence intake if the core benchmark is stable | Two team accounts can retrieve the same evidence with role checks and no public write access |
| 26–28 Sep | Test deployed build, mobile layouts, poor photos, restore/export and the actual presentation laptop | Rehearsal checklist, recorded fallback demo and repeatable test results |
| 29 Sep | Freeze features and rehearse against the panel’s time limit | Consistent deck, live demo and answers with no unsupported claims |
| 30 Sep | Present the tested workflow | Working prototype and existing SIH deck |

These dates are a proposed plan, not a claim that future work is scheduled or implemented. Shared backend, Hindi support, marketplace connectors and broader legal coverage are not part of this revision.

## What the team should prepare

Collect real package photographs covering the full declaration areas, including glare, curved bottles, small print and bilingual labels. Record the actual declarations manually and separate training/tuning examples from unseen test examples. Ask the organizer for a Legal Metrology reviewer or relevant domain mentor. Have every teammate run one scan and explain one failure case.

Our differentiator is defensible evidence and connected history. A larger feature count alone is not a validation result.

## Engineering checks

20 automated tests pass as of 10 September. The production build passes. Browser checks verified the Correction Lab result, real OCR on the synthetic label (26 text blocks, 9 passes, 2 flags, 1 manual review), the origin warning and applicable-rule transition. The photograph and OCR boxes survived a reload, and an officer confirmation appeared in local decision history. These are prototype checks, not evidence of production accuracy.

Technical reference: [Tesseract.js documentation](https://github.com/naptha/tesseract.js). In v6, non-text output including blocks requires explicit opt-in. The implementation enables this output and vendors worker assets from installed dependencies during `predev` and `prebuild`.
