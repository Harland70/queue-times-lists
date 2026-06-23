# Ride Data Acquisition & Classification Notes

This document captures our workflow, constraints, and methodologies for finding, classifying, and structuring ride metadata for the mobile queue time application.

---

## 1. Core Objective
To generate a static local database (`rideDetails.json`) mapping theme park rides (linked by `parkId` keys from queue-times.com) to high-quality, structured metadata. This dictionary is packaged directly into the mobile app's bundle to enable rich ride detail views, metric/imperial unit formatting, and rider height filters.

*   **Current Progress:** 332 unique rides have been fully verified using search grounding and merged. We have rolled back all bulk batches (Batches 14–17) to restore 100% database accuracy, and are preparing to verify the remaining rides incrementally.

---

## 2. Process for Data Finding & Grounding
Because automated web scraping from Wikipedia/Coasterpedia proved highly unreliable for extracting specific rider height requirements and often returned incorrect page matches (disambiguation failures), we transitioned to a manual search grounding approach.

### Workflow steps:
1. **Scope Selection:** Select a batch of rides from target parks.
2. **Grounding Search:** Use search grounding to find official ride name, land, type, manufacturer, year, height requirement, and operational details.
3. **Drafting & Review:** Draft descriptions and constraints, presenting them to the user in batches for validation.
4. **Incremental Merging:** Upon user approval, programmatically merge the batch into the master JSON database.
5. **ID Reconciliation:** Automatically query the live queue-times.com API for each park to fetch and append the unique numeric `"id"` field for every ride.

---

## 3. Data Classification Guidelines (Options 1, 2, and 4)
Based on the selected technical constraints, all ride data must conform to the following schema rules:

### Rule A: Numeric Heights (Options 1 & 2)
To allow the mobile app to easily filter rides by user height and automatically localize between Imperial (inches) and Metric (centimeters) units:
- Do **not** use raw strings (e.g., `"40 inches (102 cm)"`).
- Store two distinct numeric fields:
  - `"height_min_inches"`: integer value in inches (or `null` if no requirement).
  - `"height_min_cm"`: integer value in centimeters (or `null` if no requirement).

### Rule B: Concise Descriptions (Option 4)
To ensure the compiled mobile app bundle size remains small and startup times are not affected on older devices:
- Every description must be strictly **under 250 characters**.
- Focus on capturing the core theme, ride system, and thrill level in 1–2 sentences.

### Rule C: Universal Orlando Park ID Alignment
During verification, a mismatch was corrected where Universal Studios Florida (USF) and Islands of Adventure (IOA) keys were swapped:
- **Islands of Adventure** is correctly mapped to parent key **`"64"`**.
- **Universal Studios Florida** is correctly mapped to parent key **`"65"`**.

---

## 4. Master JSON Schema Structure

```json
{
  "parkId": {
    "Ride Name": {
      "id": 12345,
      "description": "Concise text summary (< 250 characters).",
      "height_min_inches": 40,
      "height_min_cm": 102,
      "manufacturer": "Company Name",
      "year_manufactured": "YYYY",
      "type": "Ride Classification Type",
      "land": "Park Area Name",
      "express_pass_supported": true,
      "single_rider": false,
      "closable_weather": true,
      "duration": "M:SS"
    }
  }
}
```
*Note: Parent `parkId` keys map directly to the API IDs on queue-times.com, preventing name collisions for identical rides in different parks (e.g., Space Mountain at Magic Kingdom vs. Disneyland Park).*

---

## 5. Strict Verification & Batch Increments Workflow

To maintain absolute 100% real-world accuracy for all future database additions, the following workflow and rules are strictly enforced:

### Heuristic Ban & verifiedRides.json Filter
- Only add attractions that exist in `verifiedRides.json`. If an attraction does not exist in `verifiedRides.json`, it is omitted to avoid wasting compute since the mobile app will not display it.
- No rule-based heuristics or default fallback values are allowed for new database entries.
- Every single field (minimum height limits, manufacturer, year of manufacture, type, land, and description) must represent verified, real-world data obtained via search grounding (official park websites, Coasterpedia, or Wikipedia).

### Batch Scale Limits
- Future batches must be limited to **one specific park at a time** (or a small set of related parks) with a **maximum batch size of 20–50 rides**.
- Larger bulk batches are banned to ensure every single entry can be manually verified and audited.

### Verification and Approval Cycle
1. **Target Identification:** Select the target park(s) for the next batch.
2. **Search Grounding & Draft Generation:** Retrieve and write the grounded, 100% accurate metadata to a draft file.
3. **User Inspection:** Present the draft data to the user for explicit auditing and approval.
4. **Merge & Push:** Only merge the approved draft into `rideDetails.json` after explicit user sign-off, then commit and push to GitHub.

### Data Structure Consistency
- All additions must strictly match the established schema:
  - Numeric `"height_min_inches"` and `"height_min_cm"` (or `null` if no requirement).
  - `"description"` strictly under 250 characters.
  - Active queue-times.com `"id"`.
  - Numeric string keys for parent `parkId` mapping.
