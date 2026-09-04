# Dataset starter specification

Keep development and evaluation products separate. Multiple surfaces of the same product must never be split between development and evaluation sets.

## Minimum collection

- 25 products
- 4–6 surfaces per product
- Domestic and imported retail packages
- At least three group or combination packages
- Real compliant examples plus controlled non-compliant label variants

## Product-level fields

| Field | Example |
| --- | --- |
| `product_id` | `PROD-001` |
| `brand` | `Aurelia` |
| `generic_name` | `Shampoo` |
| `category` | `Personal care` |
| `package_type` | `Retail` |
| `origin` | `Imported` |
| `barcode` | `8901234567890` |
| `expected_status` | `Potential violation` |
| `ground_truth_notes` | `Email missing; unit price incorrect` |

## Cross-channel sighting fields

| Field | Example |
| --- | --- |
| `sighting_id` | `DNA-MKT-1042` |
| `product_id` | `PROD-001` |
| `source` | `E-commerce listing` |
| `channel` | `Marketplace seller` |
| `location` | `Online · India` |
| `observed_at` | `2026-09-03` |
| `label_version` | `Marketplace listing · Sep 2026` |
| `rule_pack` | `LMPC snapshot · 13 Feb 2026` |
| `declaration_snapshot` | `{ "mrp": "₹349", "net_quantity": "500 ml" }` |

## Image-level fields

| Field | Example |
| --- | --- |
| `image_id` | `PROD-001-BACK-01` |
| `product_id` | `PROD-001` |
| `surface` | `Back` |
| `filename` | `prod-001-back.jpg` |
| `lighting` | `Indoor diffuse` |
| `has_glare` | `false` |
| `calibration_marker` | `true` |

## Declaration annotation

```json
{
  "image_id": "PROD-001-BACK-01",
  "field": "mrp",
  "transcription": "MRP ₹299 inclusive of all taxes",
  "bbox": { "x": 0.15, "y": 0.58, "width": 0.58, "height": 0.04 },
  "applicable": true,
  "compliant": true,
  "rule_id": "LMPC-6(1)(e)",
  "verified_by": "TEAM-MEMBER-01"
}
```

Store normalized bounding boxes between `0` and `1`. Have two team members independently verify every evaluation annotation.

## Metrics

- Field detection precision and recall
- Exact/normalized transcription accuracy
- Violation-detection precision and recall
- False-positive count per package
- Font-height mean absolute error in millimetres
- Median end-to-end processing time
- Percentage routed to manual review
