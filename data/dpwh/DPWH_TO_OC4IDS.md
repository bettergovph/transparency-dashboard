# DPWH to OC4IDS Mapping

This document describes the mapping between the DPWH infrastructure project data model and the Open Contracting for Infrastructure Data Standard (OC4IDS) v0.9.5.

## Overview

OC4IDS is an open data standard for disclosing data on infrastructure projects and their contracting processes. This mapping enables DPWH project data to be published in a standardized format that is internationally recognized and interoperable with other infrastructure transparency initiatives.

## Project-Level Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `contractId` | `id` | Used as the primary project identifier with prefix `ph-dpwh-` |
| `contractId` | `identifiers[].id` | Also included in identifiers array with scheme `PH-DPWH` |
| `description` | `title` | Project description used as title |
| `description` | `description` | Full description |
| `category` | `sector` | Mapped to OC4IDS sector codes (see sector mapping below) |
| `category` | `additionalClassifications[].description` | Original category preserved |
| `status` | `status` | Mapped to OC4IDS status codes (see status mapping below) |
| `infraType` | `type` | Mapped to OC4IDS project type (construction/rehabilitation) |
| `infraYear` | `period.startDate` | Year converted to estimated start date (YYYY-01-01) |
| `startDate` | `period.startDate` | Actual start date |
| `completionDate` | `period.endDate` | Planned/actual completion date |
| `completionDate` | `completion.endDate` | For completed projects |
| `programName` | `purpose` | Program name used as project purpose |

## Budget and Financial Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `budget` | `budget.amount.amount` | Total project budget |
| - | `budget.amount.currency` | Fixed value: `PHP` |
| `amountPaid` | `metrics[].value.amount` | Added as actual expenditure metric |
| `progress` | `metrics[].value` | Progress percentage as observation metric |
| `sourceOfFunds` | `budget.description` | Source of funds description |
| `procurementAbc` | `budget.amount.amount` | Approved Budget for Contract (if different from budget) |

## Location Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `region` | `locations[].region` | Philippine region name |
| `province` | `locations[].locality` | Province or district |
| `latitude` | `locations[].geometry.coordinates[1]` | GeoJSON Point latitude |
| `longitude` | `locations[].geometry.coordinates[0]` | GeoJSON Point longitude |
| `coordinatesVerified` | `locations[].description` | Verification status noted in description |

## Parties (Organizations) Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `contractor` | `parties[].name` | Contractor organization |
| `contractor` | `parties[].roles[]` | Role: `supplier` or `constructionCompany` |
| - | `publicAuthority.name` | Fixed value: `Department of Public Works and Highways` |
| - | `publicAuthority.id` | Fixed value: `PH-DPWH` |

## Bidders and Procurement Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `bidders[].name` | `parties[].name` | Bidder organizations |
| `bidders[].isWinner` | `parties[].roles[]` | Winners have role `supplier`, others `tenderer` |
| `procurementContractName` | `contractingProcesses[].summary.title` | Contract name |
| `procurementStatus` | `contractingProcesses[].summary.status` | Procurement status |
| `procurementAdvertisementDate` | `contractingProcesses[].summary.tender.tenderPeriod.startDate` | Bid opening date |
| `procurementBidSubmissionDeadline` | `contractingProcesses[].summary.tender.tenderPeriod.endDate` | Bid deadline |
| `procurementDateOfAward` | `contractingProcesses[].summary.contracts[].dateSigned` | Award date |
| `procurementAwardAmount` | `contractingProcesses[].summary.contracts[].value.amount` | Contract award amount |

## Documents and Links Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `linkAdvertisement` | `documents[].url` | documentType: `tenderNotice` |
| `linkContractAgreement` | `documents[].url` | documentType: `contractSigned` |
| `linkNoticeOfAward` | `documents[].url` | documentType: `awardNotice` |
| `linkNoticeToProceed` | `documents[].url` | documentType: `noticeToProceed` |
| `linkProgramOfWork` | `documents[].url` | documentType: `programOfWork` |
| `linkEngineeringDesign` | `documents[].url` | documentType: `technicalSpecifications` |

## Verification and Quality Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `isVerifiedByDpwh` | `modifications[].description` | Noted in project modifications |
| `isVerifiedByPublic` | `modifications[].description` | Public verification status |
| `isLive` | `documents[].url` | Livestream as document with documentType: `videoMedia` |
| `livestreamUrl` | `documents[].url` | URL to live stream |
| `hasImages` | `documents[]` | Images as documents with documentType: `projectPhoto` |
| `totalImages` | - | Count of photo documents |

## Components Mapping

| DPWH Field | OC4IDS Field | Notes |
|------------|--------------|-------|
| `components[]` | `relatedProjects[]` | Each component as a related sub-project |
| `components[].componentId` | `relatedProjects[].id` | Component identifier |
| `components[].description` | `relatedProjects[].title` | Component description |
| `components[].infraType` | `relatedProjects[].relationship` | Relationship type based on infra type |
| `components[].latitude` | `relatedProjects[].uri` | Link to component project record |
| `components[].longitude` | `relatedProjects[].uri` | Link to component project record |

## Sector Mapping

DPWH categories are mapped to OC4IDS sector codes:

| DPWH Category | OC4IDS Sector Code |
|---------------|-------------------|
| Roads | `transport.road` |
| Bridges | `transport.road` |
| Bridges, Roads | `transport.road` |
| Buildings and Facilities | `buildings` |
| Flood Control and Drainage | `water.floodControl` |
| Flood Control Structures | `water.floodControl` |
| Water Provision and Storage | `water.waterSupply` |
| GAA * (all GAA categories) | `multiSector` |

## Status Mapping

DPWH project statuses are mapped to OC4IDS status codes:

| DPWH Status | OC4IDS Status Code |
|-------------|-------------------|
| Completed | `completed` |
| On-Going | `implementation` |
| Not Yet Started | `preparation` |
| For Procurement | `preparation` |
| Terminated | `cancelled` |

## Project Type Mapping

DPWH infrastructure types are mapped to OC4IDS project types:

| DPWH InfraType | OC4IDS Type Code |
|----------------|------------------|
| New construction | `construction` |
| Rehabilitation | `rehabilitation` |
| Expansion | `expansion` |
| Maintenance | `maintenance` |
| (Default) | `construction` |

## Metrics and Observations

DPWH projects include several quantitative measures that map to OC4IDS metrics:

| DPWH Measure | OC4IDS Metric | Notes |
|--------------|---------------|-------|
| `progress` | Physical progress | `id`: `physicalProgress`, `observations[]` with current percentage |
| `amountPaid` | Financial progress | `id`: `actualExpenditure`, `observations[]` with amounts over time |
| `budget` vs `amountPaid` | Budget variance | Calculated metric showing spending vs budget |

## Implementation Notes

### Date Handling
- DPWH stores dates as strings in `YYYY-MM-DD` format
- OC4IDS expects ISO 8601 date-time format (`YYYY-MM-DDTHH:MM:SSZ`)
- Convert DPWH dates by appending `T00:00:00Z` for midnight UTC

### Currency
- All DPWH amounts are in Philippine Pesos (PHP)
- OC4IDS requires explicit currency code in all `Value` objects
- Use `"currency": "PHP"` for all monetary amounts

### Identifiers
- DPWH `contractId` should be prefixed with `ph-dpwh-` to create globally unique identifier
- Example: `21NA0052` becomes `ph-dpwh-21NA0052`
- Register prefix with OC4IDS to ensure global uniqueness

### Coordinates
- DPWH stores `latitude` and `longitude` as separate numeric fields
- OC4IDS uses GeoJSON format with `[longitude, latitude]` order (note the reversal)
- Create location geometry as: `{"type": "Point", "coordinates": [longitude, latitude]}`

### Multiple Components
- DPWH projects may have multiple components with different locations
- Map each component to a separate `Location` object in the `locations[]` array
- Include component identifier in location `description` field

### Missing Fields
Some OC4IDS fields don't have direct DPWH equivalents:
- `updated`: Use data extraction timestamp
- `language`: Use `"en"` or `"fil"` as default
- `publicAuthority`: Always DPWH for these projects
- `assetLifetime`: Not captured in DPWH data

## Validation

OC4IDS data should be validated against the schema at:
https://standard.open-contracting.org/infrastructure/latest/en/reference/schema/

Required fields in OC4IDS that must be present:
- `id`: Project identifier
- `title`: Project title
- `description`: Project description (can reuse title if needed)

## Example Transformation

```json
{
  "id": "ph-dpwh-21NA0052",
  "title": "Construction of Bridge along National Road",
  "description": "Construction of Bridge along National Road",
  "status": "implementation",
  "type": "construction",
  "sector": ["transport", "transport.road"],
  "purpose": "Regular Infra",
  "budget": {
    "amount": {
      "amount": 15000000.00,
      "currency": "PHP"
    },
    "description": "GAA 2021"
  },
  "period": {
    "startDate": "2021-03-15T00:00:00Z",
    "endDate": "2022-03-15T00:00:00Z"
  },
  "locations": [{
    "region": "Region III",
    "locality": "Bulacan",
    "geometry": {
      "type": "Point",
      "coordinates": [120.8796, 14.7942]
    }
  }],
  "publicAuthority": {
    "name": "Department of Public Works and Highways",
    "id": "PH-DPWH"
  },
  "parties": [{
    "name": "ABC Construction Company",
    "id": "ph-contractor-abc",
    "roles": ["supplier", "constructionCompany"]
  }],
  "metrics": [{
    "id": "physicalProgress",
    "title": "Physical Progress",
    "observations": [{
      "measure": 85.5,
      "unit": {
        "name": "percent",
        "scheme": "UNCEFACT",
        "id": "P1"
      }
    }]
  }]
}
```

## Benefits of OC4IDS Compliance

1. **International Interoperability**: Data can be compared with infrastructure projects globally
2. **Standardized Analysis**: Common tools and platforms can process the data
3. **Enhanced Transparency**: Follows international best practices for infrastructure disclosure
4. **Integration Ready**: Can be integrated with Open Contracting Data Standard (OCDS) for procurement
5. **Linked Data**: Supports linking to other datasets using standard identifiers

## References

- OC4IDS Standard: https://standard.open-contracting.org/infrastructure/
- OC4IDS Schema: https://standard.open-contracting.org/infrastructure/latest/en/reference/schema/
- OCDS (for procurement): https://standard.open-contracting.org/
