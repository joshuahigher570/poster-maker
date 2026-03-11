---
description: Export a poster to PNG or PDF
---

Export a poster from the `posters/` directory.

### Steps

1. List all HTML files in `posters/` and let the user pick one (or use the one they specified in their message: $ARGUMENTS)
2. Ask the user which format they want: **PNG** (default) or **PDF**
3. Run the export script:
   - PNG: `node scripts/export.js posters/<filename>.html`
   - PDF: `node scripts/export.js posters/<filename>.html --pdf`
4. Report the exported file path in `exports/`
5. Open the exported file with `open exports/<filename>.<ext>`
