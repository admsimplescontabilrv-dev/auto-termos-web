# Security Policies and Analysis Notes

## Application Context

This application is designed specifically for **INTERNAL OFFICE USE ONLY** and is hosted on Vercel/Cloud Run. 

Because of this very restricted context, some architectural decisions were made that differ from a public-facing B2C SaaS platform, but are acceptable for this specific use-case:

1. **Single Admin Login**: The application utilizes a single global admin account (`admin@simples.com`) rather than requiring individual accounts for each employee in the office. Given the team's operational dynamic, maintaining an extensive RBAC (Role-Based Access Control) or complex user management system was deemed unnecessary overhead. The Firebase Authentication mechanism handles the actual token and password security securely.
2. **Error Messages**: The application may present more verbose error messages than typical public apps. Since only authorized internal operators use it, these errors aid in fast debugging and do not pose a threat to external users.
3. **Data Storage (`localStorage`)**: Transient data (like extracted PDF information) is occasionally passed between routes using `localStorage` instead of global state managers. For an internal application used on trusted devices, this is acceptable.

## Resolved Security Points

During a comprehensive security review (August 2026), the following critical points were identified and resolved to ensure the baseline security is strong:

- **[FIXED] Database Open Access**: The `firestore.rules` configuration was updated from `allow read, write: if true;` to `allow read, write: if request.auth != null;`. Even with a single admin login, this prevents unauthorized external parties from reading or writing to the database by requiring a valid Firebase Auth token.
- **[FIXED] Source Code Exposure**: The build script in `package.json` was updated to remove the `--sourcemap` flag from `esbuild`. Previously, this generated a `server.cjs.map` file inside the `dist/` directory that was served statically by Express, inadvertently exposing the entire backend source code to anyone with the URL.

## Ongoing Best Practices

- Always ensure environment variables (`.env`) contain the actual API keys (Gemini, Resend, Cron) and are NEVER committed to version control.
- Keep dependencies updated periodically to avoid known CVEs (Common Vulnerabilities and Exposures).
