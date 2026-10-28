# Product Requirements Document (PRD) - Phase 2

## 1. Overview & Objective
- **Project Name:** Nyamnyambox POS
- **Version:** Phase 2 (Feature Expansion)
- **Objective:** Extending the stable MVP v1.0.0 system with 5 key features focused on visual customization, tablet responsiveness, monthly data export, hidden developer access, and secure role-restricted password management.
- **Non-Breaking Constraint:** All features must be implemented additively via database migrations and modular components without breaking existing core checkout, auth, and analytics flows from v1.0.0.

---

## 2. Detailed Feature Requirements

### 2.1. Custom Product Image Upload
- **Description:** Allows the *Owner* to upload or update product images directly when adding or editing menu items in the product management panel (`/products`).
- **Technical Implementation:**
  - Integrate **Supabase Storage** (create a dedicated public bucket, e.g., `product-images`).
  - Add file picker input component to the product CRUD form.
  - Store the returned public URL string into the `image_url` column of the `products` table.

### 2.2. iPad / Tablet Responsive Support
- **Description:** Optimize layout and UI interactions across medium to large screen devices (tablets and iPads, targeting Tailwind CSS breakpoints `md` and `lg`).
- **Technical Implementation:**
  - **POS Screen (`/pos`):** Adjust product grid layout from mobile 2-column view to a responsive 3-4 column grid (`md:grid-cols-3 lg:grid-cols-4`) for efficient catalog browsing.
  - **Checkout Panel:** Refactor the cart sidebar/bottom sheet behavior so that on tablet screens it functions as a persistent sticky right-hand side panel, while retaining the bottom drawer format on small mobile screens.

### 2.3. Monthly Excel Export for Transactions
- **Description:** Enable the *Owner* to download transaction summary records filtered by month in an Excel file format (`.xlsx`) via the Analytics or Transactions page.
- **Technical Implementation:**
  - Add Month and Year selector dropdowns in the analytics/reports view.
  - Add an **"Export Excel"** action button that triggers a database query for the selected month's transactions and items.
  - Utilize a lightweight client-side library (such as `xlsx` / SheetJS) to generate and download the spreadsheet file directly.

### 2.4. Hidden Developer Account
- **Description:** Introduce a master administrator role (`DEVELOPER`) that possesses elevated system permissions, but is **completely hidden** from any employee or owner management listings (`/employees`). The *Owner* cannot view, modify, or delete the developer account.
- **Technical Implementation:**
  - Add `'DEVELOPER'` to the `user_role` enum type.
  - Enforce filtering in database queries and API endpoints for the owner's employee list (`WHERE role != 'DEVELOPER'`).
  - Secure via **Row Level Security (RLS)** policies in Supabase and Next.js middleware to ensure unauthorized roles cannot query or interact with developer profile rows.

### 2.5. Role-Restricted Change Password Feature
- **Description:** Provide a secure password change interface that is **strictly accessible only to `DEVELOPER` and `OWNER` roles**. Employees (cashiers) are restricted from accessing this feature.
- **Technical Implementation:**
  - Create a dedicated settings/password-change route or modal (`/settings/security`).
  - Implement strict route/component-level guard logic: If the authenticated user's role is `EMPLOYEE`, render an unauthorized state or redirect.
  - Utilize Supabase Auth built-in method (`supabase.auth.updateUser({ password: newPassword })`).

---

## 3. Database Migration Schema (Supabase SQL)

Run the following SQL commands in your Supabase SQL Editor to support Phase 2:

```sql
-- 1. Add DEVELOPER role option to user_role enum if not already present
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DEVELOPER';

-- 2. Storage Bucket Setup (Execute via Supabase Dashboard or API):
-- Create a public bucket named 'product-images' for owner product image uploads.
```

---

## 4. Proposed Project File Structure (Phase 2 Additions)

```text
nyamnyambox-pos/
├── docs/
│   ├── PRD-v1-MVP.md                 # Baseline MVP documentation
│   └── PRD-Phase-2.md                # Phase 2 feature specs (this file)
├── app/
│   ├── (dashboard)/
│   │   ├── products/
│   │   │   └── page.tsx              # Updated: Added file upload input for product images
│   │   ├── employees/
│   │   │   └── page.tsx              # Updated: Query filtered to hide DEVELOPER role
│   │   └── settings/
│   │       └── page.tsx              # NEW: Secure password change page (Owner & Developer only)
│   └── api/
│       └── export-excel/
│           └── route.ts              # Optional backend handler for monthly exports
├── components/
│   ├── pos/
│   │   └── ProductGrid.tsx           # Updated: Responsive tablet grid (md/lg breakpoints)
│   └── dashboard/
│       └── ExcelExportButton.tsx     # NEW: Monthly excel export trigger component
└── utils/
    └── exportExcel.ts                # Helper utility for SheetJS excel file generation
```

---

## 5. Implementation Roadmap for OpenCode

1. **Database & Storage Setup:** Run enum updates and configure Supabase Storage bucket policies.
2. **Feature 1 & 2 (Product Image & Tablet Layout):** Update product CRUD forms with image upload and optimize Tailwind grid breakpoints for `/pos`.
3. **Feature 3 (Excel Export):** Integrate monthly filters and Excel file generation in the reports/transactions module.
4. **Feature 4 & 5 (Developer Role & Change Password):** Implement the hidden developer role query filters and secure the password change module for Owners and Developers.