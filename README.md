# Allocator Dashboard with Geocoding

A React-based allocator dashboard with backend geocoding functionality using the Census Bureau API.

## Features

- **React Frontend**: Complete allocator dashboard UI with job management, reporting, and data visualization
- **Node.js Backend**: Express API with CSV file upload and geocoding capabilities
- **Census Bureau Integration**: Real-time address geocoding using the official Census Bureau API
- **CSV Processing**: Upload and process CSV files with address data
- **Match Code Analysis**: Detailed reporting on geocoding match quality
- **Jurisdiction Assignment**: Automatic jurisdiction assignment based on geocoded coordinates

## Project Structure

```
allocator-dashboard/
├── frontend/           # React application
│   ├── src/
│   │   ├── App.js     # Main React component
│   │   └── index.js   # React entry point
│   ├── public/
│   └── package.json
├── backend/            # Express API server
│   ├── index.js       # Main server file
│   ├── uploads/       # Temporary file storage
│   └── package.json
├── vercel.json        # Vercel deployment configuration
└── package.json       # Root package.json
```

## API Endpoints

### POST /api/geocode
Upload and process CSV files with address geocoding.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: CSV file with address data

**Response:**
```json
{
  "success": true,
  "totalRecords": 10,
  "matchPercentage": "80.00",
  "reports": {
    "Job Summary": { ... },
    "Allocation Detail": { ... },
    "Match Exceptions": { ... },
    "Source Data": { ... },
    "Allocation Summary": { ... }
  },
  "summary": { ... }
}
```

### GET /api/health
Health check endpoint.

## CSV File Format

The CSV file should contain address data with columns such as:
- `Address` or `Source Address`: The address to geocode
- `Policy #` or `Policy Number`: Unique identifier
- `Premiums` or `Premium Amount`: Premium values

## Match Codes

- **0**: Good Match - Address successfully geocoded
- **1**: Fuzzy Match - Partial address match
- **2**: Multiple Hits - Multiple possible matches
- **3**: No Candidates - No matching addresses found
- **4**: PO Box or Rural Route - Non-standard address format
- **5**: Address not in state - Address outside target state
- **6**: Unverified Address - Could not verify address
- **7**: Street Name Mismatch - Street name doesn't match
- **8**: ZIP Code Mismatch - ZIP code doesn't match
- **9**: Unit Number Missing - Missing unit/apartment number

## Development

### Prerequisites
- Node.js 16+ 
- npm

### Local Development

1. Install dependencies:
```bash
npm run install:all
```

2. Start development servers:
```bash
npm run dev
```

This will start:
- Frontend on http://localhost:3000
- Backend on http://localhost:3001

### Building for Production

```bash
npm run build
```

## Deployment

The application is configured for deployment on Vercel with automatic builds and serverless functions.

### Environment Variables

No environment variables are required for basic functionality. The Census Bureau API is public and doesn't require authentication.

## Rate Limiting

The backend includes a 200ms delay between Census Bureau API calls to respect rate limits and ensure reliable geocoding.

## Browser Support

- Chrome (latest)
- Firefox (latest) 
- Safari (latest)
- Edge (latest)

## License

ISC
