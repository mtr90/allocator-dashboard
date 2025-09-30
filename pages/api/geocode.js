const formidable = require('formidable');
const Papa = require('papaparse');
const axios = require('axios');
const fs = require('fs');

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Geocoding function using Census Bureau API
async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodedAddress}&benchmark=2020&format=json`;
    
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
    });

    if (response.data && response.data.result && response.data.result.addressMatches) {
      const matches = response.data.result.addressMatches;
      
      if (matches.length > 0) {
        const match = matches[0];
        return {
          matchCode: '0', // Good Match
          matchDescription: 'Good Match',
          matchedAddress: match.matchedAddress,
          coordinates: match.coordinates,
          tigerLine: match.tigerLine,
          side: match.side
        };
      } else {
        return {
          matchCode: '3', // No Candidates
          matchDescription: 'No Candidates',
          matchedAddress: '',
          coordinates: null,
          tigerLine: null,
          side: null
        };
      }
    } else {
      return {
        matchCode: '3', // No Candidates
        matchDescription: 'No Candidates',
        matchedAddress: '',
        coordinates: null,
        tigerLine: null,
        side: null
      };
    }
  } catch (error) {
    console.error('Geocoding error for address:', address, error.message);
    return {
      matchCode: '6', // Unverified Address
      matchDescription: 'Unverified Address',
      matchedAddress: '',
      coordinates: null,
      tigerLine: null,
      side: null
    };
  }
}

// Helper function to add delay between API calls
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to determine jurisdiction based on coordinates
function determineJurisdiction(coordinates, address) {
  if (!coordinates) {
    // Default to county based on address parsing
    if (address.toUpperCase().includes('LOUISVILLE')) return { name: 'JEFFERSON COUNTY', code: '56-00000' };
    if (address.toUpperCase().includes('LEXINGTON')) return { name: 'FAYETTE COUNTY', code: '34-00000' };
    if (address.toUpperCase().includes('COVINGTON')) return { name: 'KENTON COUNTY', code: '59-00000' };
    if (address.toUpperCase().includes('FLORENCE')) return { name: 'BOONE COUNTY', code: '08-00000' };
    if (address.toUpperCase().includes('NEWPORT')) return { name: 'CAMPBELL COUNTY', code: '19-00000' };
    return { name: 'UNKNOWN COUNTY', code: '00-00000' };
  }

  // Simple coordinate-based assignment (Kentucky focus)
  const lat = parseFloat(coordinates.y);
  const lng = parseFloat(coordinates.x);

  // These are approximate boundaries for demonstration
  if (lat >= 38.0 && lat <= 38.5 && lng >= -85.8 && lng <= -85.4) {
    return { name: 'JEFFERSON COUNTY', code: '56-00000' };
  } else if (lat >= 37.8 && lat <= 38.2 && lng >= -84.8 && lng <= -84.2) {
    return { name: 'FAYETTE COUNTY', code: '34-00000' };
  } else if (lat >= 39.0 && lat <= 39.2 && lng >= -84.8 && lng <= -84.4) {
    return { name: 'KENTON COUNTY', code: '59-00000' };
  } else if (lat >= 38.9 && lat <= 39.1 && lng >= -85.0 && lng <= -84.6) {
    return { name: 'BOONE COUNTY', code: '08-00000' };
  } else if (lat >= 39.0 && lat <= 39.2 && lng >= -84.6 && lng <= -84.3) {
    return { name: 'CAMPBELL COUNTY', code: '19-00000' };
  }

  return { name: 'UNKNOWN COUNTY', code: '00-00000' };
}

// Function to generate reports in the expected format
function generateReports(geocodedResults, matchSummary, totalRecords) {
  const reports = {};

  // Job Summary Report
  const jobSummaryRows = [];
  const matchDescriptions = {
    '0': 'Good Match',
    '1': 'Fuzzy Match',
    '2': 'Multiple Hits',
    '3': 'No Candidates',
    '4': 'PO Box or Rural Route',
    '5': 'Address not in state',
    '6': 'Unverified Address',
    '7': 'Street Name Mismatch',
    '8': 'ZIP Code Mismatch',
    '9': 'Unit Number Missing'
  };

  for (const [code, count] of Object.entries(matchSummary)) {
    if (count > 0) {
      const percentage = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(2) + '%' : '0.00%';
      jobSummaryRows.push([
        code,
        matchDescriptions[code],
        count.toString(),
        percentage
      ]);
    }
  }

  reports['Job Summary'] = {
    headers: ['Match Code', 'Match Description', '# of Records', '% of records'],
    rows: jobSummaryRows
  };

  // Allocation Detail Report
  const allocationDetailRows = geocodedResults.map(result => [
    result.policyNumber,
    result.premiums,
    result.jurisdiction,
    result.jurisdictionCode,
    result.matchCode,
    result.matchDescription,
    'C', // Premium Type - simplified
    result.matchedAddress.split(',')[0] || result.sourceAddress.split(',')[0] // Street only
  ]);

  reports['Allocation Detail'] = {
    headers: ['Policy #', 'Premiums', 'Jurisdiction Assigned To', 'Jurisdiction Code', 'Match Code', 'Match Description', 'Premium Type', 'Matched Street'],
    rows: allocationDetailRows
  };

  // Match Exceptions Report (non-perfect matches)
  const exceptionRows = geocodedResults
    .filter(result => result.matchCode !== '0')
    .map(result => [
      result.policyNumber,
      result.matchCode,
      result.matchDescription,
      result.sourceAddress,
      result.premiums
    ]);

  if (exceptionRows.length > 0) {
    reports['Match Exceptions'] = {
      headers: ['Policy #', 'Match Code', 'Description', 'Normal Address', 'Premiums'],
      rows: exceptionRows
    };
  }

  // Source Data Report
  const sourceDataRows = geocodedResults.map(result => [
    result.policyNumber,
    'GENERAL', // Premium Type - simplified
    result.sourceAddress,
    'UPLOAD', // Company Code
    result.premiums
  ]);

  reports['Source Data'] = {
    headers: ['Policy #', 'Premium Type', 'Source Address', 'Company Code', 'Premiums'],
    rows: sourceDataRows
  };

  // Allocation Summary by Jurisdiction
  const jurisdictionSummary = {};
  geocodedResults.forEach(result => {
    if (!jurisdictionSummary[result.jurisdiction]) {
      jurisdictionSummary[result.jurisdiction] = {
        code: result.jurisdictionCode,
        count: 0,
        totalPremiums: 0
      };
    }
    jurisdictionSummary[result.jurisdiction].count++;
    jurisdictionSummary[result.jurisdiction].totalPremiums += parseFloat(result.premiums.toString().replace(/[,$]/g, '')) || 0;
  });

  const allocationSummaryRows = Object.entries(jurisdictionSummary).map(([jurisdiction, data]) => [
    jurisdiction,
    data.code,
    data.count.toString(),
    data.totalPremiums.toFixed(2),
    (data.totalPremiums * 0.6).toFixed(2), // Casualty - simplified calculation
    (data.totalPremiums * 0.4).toFixed(2)  // Fire & Allied - simplified calculation
  ]);

  reports['Allocation Summary'] = {
    headers: ['Jurisdiction Assigned To', 'Jurisdiction Code', '# Policies', 'Total Premiums', 'Casualty', 'Fire & Allied'],
    rows: allocationSummaryRows
  };

  return reports;
}

// Main handler function
module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });
    
    const [fields, files] = await form.parse(req);
    
    const file = files.file?.[0];
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check file type
    if (!file.originalFilename?.endsWith('.csv') && file.mimetype !== 'text/csv') {
      return res.status(400).json({ error: 'Only CSV files are allowed' });
    }

    // Read and parse CSV file
    const csvData = fs.readFileSync(file.filepath, 'utf8');
    const parseResult = Papa.parse(csvData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV parsing error', 
        details: parseResult.errors 
      });
    }

    const records = parseResult.data;
    const geocodedResults = [];
    const matchSummary = {
      '0': 0, '1': 0, '2': 0, '3': 0, '4': 0,
      '5': 0, '6': 0, '7': 0, '8': 0, '9': 0
    };

    console.log(`Processing ${records.length} records...`);

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Extract address from common CSV column names
      const address = record.Address || record.address || record['Source Address'] || 
                     record['Street Address'] || record.ADDRESS || '';
      
      const policyNumber = record['Policy #'] || record['Policy Number'] || record.Policy || 
                          record.POLICY || `POL-${i + 1}`;
      
      const premiums = record.Premiums || record.Premium || record.PREMIUMS || 
                      record['Premium Amount'] || '0.00';

      if (!address) {
        console.log(`Skipping record ${i + 1}: No address found`);
        continue;
      }

      console.log(`Geocoding ${i + 1}/${records.length}: ${address}`);

      // Geocode the address
      const geocodeResult = await geocodeAddress(address);
      
      // Determine jurisdiction
      const jurisdiction = determineJurisdiction(geocodeResult.coordinates, address);

      // Create result record
      const result = {
        policyNumber,
        sourceAddress: address,
        matchCode: geocodeResult.matchCode,
        matchDescription: geocodeResult.matchDescription,
        matchedAddress: geocodeResult.matchedAddress || address,
        jurisdiction: jurisdiction.name,
        jurisdictionCode: jurisdiction.code,
        premiums: premiums,
        coordinates: geocodeResult.coordinates,
        originalRecord: record
      };

      geocodedResults.push(result);
      matchSummary[geocodeResult.matchCode]++;

      // Add delay between API calls as requested
      if (i < records.length - 1) {
        await delay(200); // 200ms delay
      }
    }

    // Calculate match percentage
    const totalRecords = geocodedResults.length;
    const goodMatches = matchSummary['0'];
    const matchPercentage = totalRecords > 0 ? ((goodMatches / totalRecords) * 100).toFixed(2) : '0.00';

    // Generate reports in the format expected by the frontend
    const reports = generateReports(geocodedResults, matchSummary, totalRecords);

    // Clean up temporary file
    try {
      fs.unlinkSync(file.filepath);
    } catch (err) {
      console.warn('Could not delete temporary file:', err.message);
    }

    res.json({
      success: true,
      totalRecords,
      matchPercentage,
      reports,
      summary: matchSummary
    });

  } catch (error) {
    console.error('Geocoding process error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
