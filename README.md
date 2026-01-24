# Fatoora

![Fatoora](./public/icon.png)

**Fatoora** is a comprehensive desktop application for invoice management, data reconciliation, and business administration. Built with **Electron**, **React**, and **TypeScript**, it combines intelligent file matching with robust invoicing tools in a sleek, modern interface.

## 🚀 Features

### 📊 Excel Matcher
-   **Intelligent Matching**: Automatically detects ID columns (like QPMC Tickets, Serial Numbers) using fuzzy logic and regex patterns.
-   **Bulk Processing**: Match a single Master file against multiple Target files in one go.
-   **Zero-Loss Processing**: Modifies Excel files **in-place** to strictly preserve original dates, formatting, and formulas.
-   **Detailed Statistics**: Visual breakdown of match rates per file and row-level accuracy.

### 💰 Invoicing
-   **Full Management**: Create, edit, and manage invoices with a professional dashboard.
-   **Auto-Calculations**: Automatically calculates totals, balances, and tracks quantities in tons.
-   **PDF Generation**: Instantly generate professional, secure PDF invoices.
-   **Status Tracking**: Track invoice status (Paid, Issued, Overdue) with visual indicators.

### 👥 Customer Management
-   **Customer Database**: Manage customer details, addresses, and contact info.
-   **Custom Pricing**: Set specific rates (e.g., Rate 10mm, Rate 20mm) per customer for automated calculations.
-   **Financial History**: Track total business volume per customer.

### 📦 Product Management
-   **Service Catalog**: predefined list of products and services for quick invoice creation.

### ⚙️ Settings & Data
-   **Banking Details**: multiple banking profiles for invoice headers.
-   **Backup & Restore**: Export full database backups to JSON and restore securely.
-   **Danger Zone**: Protected controls for clearing data or factory resets.

## 🛠️ Tech Stack

-   **Runtime**: [Electron](https://www.electronjs.org/)
-   **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
-   **Database**: LowDB (Local JSON Database)
-   **Excel**: SheetJS

## 📦 Installation

This project uses `npm` for dependency management.

```bash
# Install dependencies
npm install
```

## 💻 Development

You can run the application in development mode with live reloading:

```bash
# Run both React and Electron dev servers
npm run dev
```

## 🏗️ Building

To build the application for production (creates a distributable `.app`, `.dmg` for macOS, or `.exe` for Windows):

```bash
# Build for production
npm run dist
```

## 📝 License

Private / Proprietary.
