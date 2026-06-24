# Ride Data Acquisition & Classification Notes

This document captures our workflow, constraints, and methodologies for finding, classifying, and structuring ride metadata for the mobile queue time application.

---

## 1. Core Objective
To generate a static local database (`rideDetails.json`) mapping theme park rides (linked by `parkId` keys from queue-times.com) to high-quality, structured metadata. This dictionary is packaged directly into the mobile app's bundle to enable rich ride detail views, metric/imperial unit formatting, and rider height filters.

*   **Current Progress:** All 2,756 target rides across all non-blacklisted parks have been fully verified using search grounding and merged. The alignment of `rideDetails.json` to cover all rides in `verifiedRides.json` is now 100% complete, featuring 0 format errors and fully verified metadata.

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

---

## 6. Batch 33 ID Mapping Corrections (Kings Dominion)

Direct numerical ID mapping was implemented to prevent character-encoding corruptions caused by terminal redirects (handling registered trademark symbols, curly smart quotes, etc.). Additionally, several live queue-times ID discrepancies and closures were resolved for Kings Dominion:

- **Anaconda (Closed):** The ride was permanently removed prior to 2025. It was excluded from the final import database as it is no longer listed in active queue times.
- **Appalachian Outpost Bumper Cars (Error):** Conflated with Planet Snoopy's Aviator ride. Resolved by mapping **ID 7766** to its actual name and specs: **Flying Ace**.
- **Pantherian:** The giga coaster (formerly Intimidator 305 / Project 305) was mapped to active **ID 12642**.
- **Grizzly:** Mapped to active **ID 7830** (corrected from old reference ID 5937).
- **Racer 75 - North / South:** Mapped to **ID 7834** and **ID 11897** respectively.
- **Tumbili:** Mapped to active **ID 10759** (corrected from old reference ID 10860).
- **Arachnidia:** Mapped to active **ID 7755**.
- **Bad Apple:** Mapped to active **ID 7723**.
- **Blue Ridge Tollway:** Mapped to active **ID 7711**.
- **Boo Blasters on Boo Hill:** Mapped to active **ID 7707**.
- **Carousel (Grand Carousel):** Added historic PTC carousel under active **ID 7718**.
- **Dodgem:** Mapped to active **ID 7727**.
- **Americana:** Mapped to active **ID 7700** (corrected from old reference ID 7725).
- **Flight of Fear:** Mapped to active **ID 5938** (corrected from old reference ID 5932).
- **Dominator:** Mapped to active **ID 5932** (corrected from old reference ID 5935).
- **Twisted Timbers:** Mapped to active **ID 5937** (corrected from old reference ID 5940).
- **Apple Zapple:** Mapped to active **ID 5941** (corrected from old reference ID 5933).

---

## 7. Park Selection & Blacklist Constraints

To keep the mobile application targeted and efficient, only specific parks are loaded based on targeting rules:

### Allowed Target Companies
Only parks belonging to the following company IDs are targeted:
- **1, 2, 3, 6, 11, 12, 17** (e.g. Cedar Fair, Six Flags, Disney, Merlin)

### Allowed Independent Parks (Whitelisted)
Individual whitelisted independent parks outside targeted companies:
- **IDs:** 314, 15, 55, 10, 312, 273, 9, 14, 53, 160, 317, 286, 49, 56, 313, 310, 277, 19, 11, 125, 123, 319, 324, 298
- **Exceptions (Whitelisted):** 335, 67

### Blacklisted Exclusions (Excluded Keywords)
Any park containing the following keywords in its name is excluded:
- `aquatica`
- `adventure island`
- `hurricane harbor`
- `water country usa`
- `qiddiya` (except whitelisted exception ID 335: Six Flags Qiddiya City)
- `six flags america`
- `white water`
- `rulantica`

*Note: Volcano Bay is explicitly removed from the blacklist and is now allowed.*
