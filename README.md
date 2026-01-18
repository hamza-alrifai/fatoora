# Fatoora

![Fatoora](./public/icon.png)

**Fatoora** is a powerful, modern desktop application designed to streamline invoice matching and data reconciliation. Built with Electron, React, and TypeScript, it allows users to effortlessly match "Master" Excel files against multiple "Target" files using intelligent fuzzy matching logic.

## 🚀 Features

-   **Intelligent Matching**: Automatically detects ID columns (like QPMC Tickets, Serial Numbers) using fuzzy logic and regex patterns.
-   **Smart Column Mapping**: Suggests appropriate result columns and row ranges for data extraction.
-   **Bulk Processing**: Match a single Master file against multiple Target files in one go.
-   **Zero-Loss Processing**: Modifies Excel files **in-place** to strictly preserve original dates, formatting, and formulas.
-   **Validation**: Built-in validation checks for duplicate tickets, empty values, and invalid formats.
-   **Detailed Statistics**: Visual breakdown of match rates per file, including exact matched row counts.
-   **Modern UI**: Sleek, responsive interface built with Tailwind CSS and Radix UI.
-   **Dark Mode**: Fully supported dark/light themes.

## 🛠️ Tech Stack

-   **Runtime**: [Electron](https://www.electronjs.org/)
-   **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
-   **Excel Processing**: [SheetJS (xlsx)](https://sheetjs.com/)

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

To build the application for production (creates a distributable `.app` or `.dmg`):

```bash
# Build for production
npm run dist
```

## 📝 License

Private / Proprietary.
