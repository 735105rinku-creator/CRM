console.log("");
console.log("=====================================================");
console.log("  This script is deprecated.");
console.log("  The CRM now uses a multi-tenant SaaS architecture.");
console.log("");
console.log("  To create the platform super admin, run:");
console.log("    npm run create-super-admin");
console.log("");
console.log("  To create a company and its admin, use the API:");
console.log("    POST /companies         (super admin)");
console.log("    POST /companies/:id/company-admin  (super admin)");
console.log("=====================================================");
console.log("");
 
process.exit(0);