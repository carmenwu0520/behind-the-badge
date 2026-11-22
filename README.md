# Behind the Badge: Exploring NYPD Civilian Complaint Outcomes

DSC 209R Final Project (Fall 2026) by Jiamin Wu, Justin Chanthabandith, Matthew Takeuchi, and Kristen Oleson.

An explorable explanation of what happens after New Yorkers file complaints against NYPD officers. Readers build a hypothetical complaint (misconduct type, reason for contact, complainant and officer demographics) and see how similar past allegations were decided.

## Files
- `index.html`, `style.css`, `main.js`: the page (D3 v7)
- `allegations.csv`: cleaned version of ProPublica's CCRB allegations data (33,358 rows). Columns:
  - `type`: FADO type (Force, Abuse of Authority, Discourtesy, Offensive Language)
  - `contact`: reason for contact, grouped from 53 original categories into 7
  - `c_eth`, `c_gender`: complainant ethnicity and gender
  - `o_eth`, `o_gender`: officer ethnicity and gender
  - `outcome`: S = substantiated (any penalty), E = exonerated, U = unsubstantiated
  - `months`: months from complaint received to closed
  - `year`: year the complaint was received

## Data
[ProPublica: Civilian Complaints Against New York City Police Officers](https://www.propublica.org/datastore/dataset/civilian-complaints-against-new-york-city-police-officers)
