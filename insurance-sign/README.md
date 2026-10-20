# Sign Once — PDF signature workspace

A self-contained static app hosted in this GitHub Pages repository under `/insurance-sign/`. **Not hosted by Lovable.** Runs on mobile and desktop without an account or an application server.

## Live URL
https://harelos.github.io/insurance-sign/

## Use
1. Open the page and choose multiple local PDF files (up to 10).
2. Draw one signature, or intentionally select a typed signature.
3. For each included PDF, review the application content and signature placement. Known insurer templates offer suggested **applicant** placement boxes; all suggestions still require user confirmation.
4. Explicitly approve the reuse of that signature across only the selected files.
5. Download separate visibly signed PDFs. Files are **never automatically emailed, submitted, paid, purchased or uploaded**.

## Insurer-specific precautions
- Allianz Care, VUMI, Foyer Basic/Extensive, and IMG/LUMA: applicant-signature placements are suggested for versions of the PDF templates reviewed in October 2026. For changed forms or shifted page layouts, choose placement manually after checking the full PDF.
- AXA Global: **payment direct-debit mandate page 8 is explicitly blocked**. No automatic applicant placement on AXA; user must locate an appropriate declaration signing area.
- Cigna: official Adobe Sign may be required; visually stamping a PDF does not replace verified electronic signature.
- Optimum Global: automatic signing **blocked**, because the acceptance letter would request activation of coverage.
- Unknown PDF: no guessed signature position.

## Data handling and limitations
- All selected PDFs and signature data are processed locally in the browser and held in temporary memory only. Neither `app.js` nor this repository includes patient identities, medical documents, or signed applications.
- On reset or page close, document/signature state is lost. There is no database, external upload endpoint, telemetry, or localStorage.
- Two pinned JavaScript libraries are loaded from third-party CDNs: pdf-lib 1.17.1 and pdf.js 3.11.174. Only library code is fetched; application code never sends the user's PDF data to a server. Review the libraries' trust implications before using with highly sensitive documents.
- Visible image stamps are **not cryptographic digital signatures** and may not satisfy an insurer's exact e-sign workflow or legal requirements.
- The interface does not answer or change medical declarations. User must verify form accuracy, including any recent medical changes, before choosing to sign.
- PDF field behavior can vary across viewers; inspect downloaded outputs visually and confirm each signature is visible.

## Local files
- `index.html` — UI and security policy
- `style.css` — responsive Hebrew RTL design
- `app.js` — local PDF loading, signature collection, review, stamping and download

## Verification
The app's JavaScript passes `node --check`, and a headless Chromium simulation exercised: PDF selection, insurer preset, one typed signature, consent gating, output generation and individual download UI, plus the AXA no-auto-placement safeguard. The simulation uses mocked PDF libraries; it is **not** a guarantee of real-world acceptance of signed PDFs or a production-browser test of the external library delivery.
