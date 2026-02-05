# Test Data Structure

This directory contains test files for automated matching workflows.

## Structure:
```
test-data/
├── master-file/          # Master data files (reference data)
│   └── (place your master Excel files here)
└── customer-files/       # Customer/target files to be matched
    └── (place your customer Excel files here)
```

## File Requirements:

### Master Files:
- Excel files (.xlsx, .xls)
- Contains reference data for matching
- Should have consistent column structure
- Examples: customer lists, product catalogs, etc.

### Customer Files:
- Excel files (.xlsx, .xls) 
- Contains data to be matched against master
- Can be multiple files for batch testing
- Examples: daily orders, delivery data, etc.

## Usage:
The automated test (`matching-automation.spec.ts`) will:
1. Upload files from `master-file/` directory
2. Upload files from `customer-files/` directory  
3. Run the matching process automatically
4. Verify results

## Tips:
- Use small test files for faster execution
- Include various data scenarios (perfect matches, partial matches, no matches)
- Keep file names simple and descriptive
- Test with different Excel formats if applicable
