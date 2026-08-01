const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../lib/api.ts');
const content = `
// ─── Vendor Registrations ──────────────────────────────────────────────────
export const getVendorRegistrations = (status?: string) => {
    let url = \`\${API_URL}/api/vendors\`;
    if (status) url += \`?status=\${status}\`;
    return authFetch(url);
};

export const getVendorRegistrationDetails = (id: string) => {
    return authFetch(\`\${API_URL}/api/vendors/\${id}\`);
};

export const updateVendorRegistrationStatus = (id: string, status: string) => {
    return authFetch(\`\${API_URL}/api/vendors/\${id}/status\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    });
};
`;

fs.appendFileSync(filePath, content, 'utf8');
