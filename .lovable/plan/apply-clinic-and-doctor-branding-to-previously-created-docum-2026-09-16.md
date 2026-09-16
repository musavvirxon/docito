# Apply clinic and doctor branding to previously created documents

## What is actually stored today

Checked the database and the document code: no finished PDF files are kept anywhere. Every document — treatment plan, referral, 043/u card, prescription, superbill, appointment summary, patient summary, receipt — is rebuilt at the moment someone presses download. The only stored rows are download audit records (2 rows, all with no saved file).

That means older visits, plans and receipts already come out with the new clinic and doctor branding when they are downloaded again. Nothing needs to be rewritten in storage.

Two places, however, still build documents without asking for branding at all, so old and new records alike come out plain:

- The receipt/invoice on the visit billing panel passes no clinic logo, name, address, phone or brand colour.
- The visit page patient summary passes only a plain clinic name, no logo or doctor details.

## Plan

1. **Receipt / invoice**
   - Load the shared branding for the visit's doctor and clinic branch before building the receipt.
   - Pass clinic logo, clinic name, branch address and phone, brand colour, and the doctor's name, specialty and licence into the receipt layout.
   - Keep the independent-doctor and Docito fallbacks when a clinic isn't involved.

2. **Visit page patient summary**
   - Replace the plain clinic-name-only call with the same shared branding lookup used by the other summaries, so logo, branch contact details and doctor identity appear.

3. **Historical accuracy**
   - When a record stores its own location (appointment or visit branch), use that branch for the header rather than the clinic's default branch, so a document reprinted today shows the branch where the care actually happened.
   - Where a record has no stored branch, keep the current deterministic fallback: doctor's assigned branch, then the clinic's primary branch.

4. **Check with real records**
   - Re-download an older appointment summary, treatment plan, 043/u card, prescription, superbill and receipt for the existing clinic and its joined doctor.
   - Confirm clinic logo, clinic name, brand colour, correct branch address and phone, plus doctor name, specialty and photo, in English, Russian and Uzbek.

## Notes

- No database migration is needed; the branding function and secure lookup added previously already return everything required.
- No change to who can see what: branding stays behind the same access checks, and no patient or facility data is exposed more widely.
- Documents someone already downloaded and saved to their own computer cannot be changed retroactively — they need to be downloaded again.
