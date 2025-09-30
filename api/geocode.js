const formidable = require('formidable');
const fs = require('fs');
const Papa = require('papaparse');

// Kentucky jurisdiction mapping based on the reference data
const KENTUCKY_JURISDICTIONS = {
  'ALEXANDRIA': { code: '123', county: 'CAMPBELL COUNTY' },
  'BELLEVUE': { code: '34', county: 'CAMPBELL COUNTY' },
  'COLD SPRING': { code: '148', county: 'CAMPBELL COUNTY' },
  'COVINGTON': { code: '5', county: 'KENTON COUNTY' },
  'VILLA HILLS': { code: '116', county: 'KENTON COUNTY' },
  'CRITTENDEN': { code: '285', county: 'GRANT COUNTY' },
  'OWENSBORO': { code: '8', county: 'DAVIESS COUNTY' },
  'DEMOSSVILLE': { code: '9998', county: 'PENDLETON COUNTY' },
  'LOUISVILLE': { code: '1', county: 'JEFFERSON COUNTY' },
  'JEFFERSONTOWN': { code: '72', county: 'JEFFERSON COUNTY' },
  'LONDON': { code: '78', county: 'LAUREL COUNTY' },
  'FLORENCE': { code: '16', county: 'BOONE COUNTY' },
  'RICHMOND': { code: '1039', county: 'MADISON COUNTY' },
  'DIXON': { code: '9998', county: 'WEBSTER COUNTY' },
  'DAYTON': { code: '46', county: 'CAMPBELL COUNTY' },
  'EDGEWOOD': { code: '9998', county: 'KENTON COUNTY' },
  'ERLANGER': { code: '14', county: 'KENTON COUNTY' },
  'FORT MITCHELL': { code: '57', county: 'KENTON COUNTY' },
  'FORT THOMAS': { code: '58', county: 'CAMPBELL COUNTY' },
  'INDEPENDENCE': { code: '9998', county: 'KENTON COUNTY' },
  'MADISONVILLE': { code: '9998', county: 'HOPKINS COUNTY' },
  'TAYLOR MILL': { code: '9998', county: 'KENTON COUNTY' },
  'UNION': { code: '9998', county: 'BOONE COUNTY' },
  'WILLIAMSTOWN': { code: '9998', county: 'GRANT COUNTY' },
  'PRINCETON': { code: '9998', county: 'CALDWELL COUNTY' },
  'ADAIRVILLE': { code: '9998', county: 'LOGAN COUNTY' },
  'BUTLER': { code: '9998', county: 'PENDLETON COUNTY' }
};

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address) {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodedAddress}&benchmark=2020&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.result && data.result.addressMatches && data.result.addressMatches.length > 0) {
      const match = data.result.addressMatches[0];
      return {
        matchCode: '0', // Good Match
        matchDescription: 'Good Match',
        matchedAddress: match.matchedAddress,
        coordinates: match.coordinates,
        tigerLine: match.tigerLine
      };
    } else {
      // Determine specific match code based on address characteristics
      if (address.toLowerCase().includes('po box') || address.toLowerCase().includes('p.o. box')) {
        return {
          matchCode: '4',
          matchDescription: 'PO Box or Rural Route',
          matchedAddress: '',
          coordinates: null,
          tigerLine: null
        };
      } else {
        return {
          matchCode: '3',
          matchDescription: 'No candidates',
          matchedAddress: '',
          coordinates: null,
          tigerLine: null
        };
      }
    }
  } catch (error) {
    console.error('Geocoding error:', error);
    return {
      matchCode: '3',
      matchDescription: 'No candidates',
      matchedAddress: '',
      coordinates: null,
      tigerLine: null
    };
  }
}

function determineJurisdiction(city, state, zipCode) {
  const normalizedCity = city.toUpperCase().trim();
  
  if (KENTUCKY_JURISDICTIONS[normalizedCity]) {
    return {
      name: normalizedCity,
      code: KENTUCKY_JURISDICTIONS[normalizedCity].code,
      county: KENTUCKY_JURISDICTIONS[normalizedCity].county
    };
  }
  
  // Default to county-level assignment for unrecognized cities
  return {
    name: `${normalizedCity} COUNTY`,
    code: '9998',
    county: `${normalizedCity} COUNTY`
  };
}

function generateReports(geocodedResults, matchSummary, totalRecords) {
  const reports = {};
  
  // Calculate total premiums
  const totalPremiums = geocodedResults.reduce((sum, result) => {
    return sum + (parseFloat(result.premiums.toString().replace(/[,$]/g, '')) || 0);
  }, 0);

  // Job Summary Report (Match Code Analysis)
  const jobSummaryRows = [];
  const matchDescriptions = {
    '-1': 'Forced Allocation',
    '0': 'Good Match',
    '1': 'Fuzzy Match',
    '2': 'Multiple Hits',
    '3': 'No candidates',
    '4': 'PO Box or Rural Route',
    '5': 'Address not in state',
    '6': 'Unverified Address',
    '7': 'Street Name Mismatch',
    '8': 'ZIP Code Mismatch',
    '9': 'Unit Number Missing'
  };

  Object.entries(matchSummary).forEach(([code, count]) => {
    const percentage = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(2) + '%' : '-';
    const premiumsForCode = geocodedResults
      .filter(result => result.matchCode === code)
      .reduce((sum, result) => sum + (parseFloat(result.premiums.toString().replace(/[,$]/g, '')) || 0), 0);
    const premiumPercentage = totalPremiums > 0 ? ((premiumsForCode / totalPremiums) * 100).toFixed(2) + '%' : '-';
    
    jobSummaryRows.push([
      code,
      matchDescriptions[code] || 'Unknown',
      count.toString(),
      count > 0 ? percentage : '-',
      count > 0 ? premiumsForCode.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-',
      count > 0 ? premiumPercentage : '-'
    ]);
  });

  reports['Job Summary'] = {
    headers: ['Match Code', 'Match Description', '# of Records', '% of records', 'Total of Source Premiums', '% of Source Premiums'],
    rows: jobSummaryRows
  };

  // Allocation Detail Report
  const allocationDetailRows = [];
  
  // Add total row first
  allocationDetailRows.push([
    'Total of Detail Report',
    totalPremiums.toFixed(2),
    totalPremiums.toFixed(2),
    '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''
  ]);

  geocodedResults.forEach(result => {
    const jurisdiction = determineJurisdiction(result.originalRecord[3], result.originalRecord[4], result.originalRecord[5]);
    
    allocationDetailRows.push([
      result.policyNumber,                    // Policy #
      result.premiums,                        // Source Premiums
      result.premiums,                        // Premiums
      jurisdiction.name,                      // Jurisdiction Assigned To
      jurisdiction.code,                      // Jurisdiction Code
      jurisdiction.county,                    // County
      result.originalRecord[3],               // City
      result.matchCode,                       // Match Code
      result.matchDescription,                // Match Description
      result.originalRecord[1] || 'L',        // Premium Type
      result.originalRecord[2],               // Normal Street
      result.originalRecord[3],               // Normal City
      result.originalRecord[4],               // Normal State
      result.originalRecord[5],               // Normal Zip
      result.matchedAddress ? result.matchedAddress.split(',')[0] : '', // Matched Street
      result.matchedAddress ? result.matchedAddress.split(',')[1]?.trim() : '', // Matched City
      result.matchedAddress ? result.matchedAddress.split(',')[2]?.trim().split(' ')[0] : '', // Matched State
      result.matchedAddress ? result.matchedAddress.split(',')[2]?.trim().split(' ')[1] : '', // Matched Zip
      result.matchCode === '0' ? 'S8HPNTSCZA' : '-', // Matched Identifier
      result.originalRecord[7] || result.policyNumber.split('-')[0], // Company Code
      '-',                                    // Miscellaneous 1
      '-',                                    // Miscellaneous 2
      '-',                                    // Miscellaneous 3
      result.originalRecord[11] || 'Muni'     // Miscellaneous 4
    ]);
  });

  reports['Allocation Detail'] = {
    headers: ['Policy #', 'Source Premiums', 'Premiums', 'Jurisdiction Assigned To', 'Jurisdiction Code', 'County', 'City', 'Match Code', 'Match Description', 'Premium Type', 'Normal Street', 'Normal City', 'Normal State', 'Normal Zip', 'Matched Street', 'Matched City', 'Matched State', 'Matched Zip', 'Matched Identifier', 'Company Code', 'Miscellaneous 1', 'Miscellaneous 2', 'Miscellaneous 3', 'Miscellaneous 4'],
    rows: allocationDetailRows
  };

  // Allocation Summary Report
  const jurisdictionSummary = {};
  
  geocodedResults.forEach(result => {
    const jurisdiction = determineJurisdiction(result.originalRecord[3], result.originalRecord[4], result.originalRecord[5]);
    const premiumAmount = parseFloat(result.premiums.toString().replace(/[,$]/g, '')) || 0;
    
    if (!jurisdictionSummary[jurisdiction.name]) {
      jurisdictionSummary[jurisdiction.name] = {
        code: jurisdiction.code,
        count: 0,
        totalPremiums: 0
      };
    }
    
    jurisdictionSummary[jurisdiction.name].count++;
    jurisdictionSummary[jurisdiction.name].totalPremiums += premiumAmount;
  });

  const allocationSummaryRows = [];
  
  // Add summary rows
  allocationSummaryRows.push([
    'Total of Detail Report', '', totalRecords.toString(), 
    totalPremiums.toFixed(2), '0.00', '0.00', '0.00', '0.00', totalPremiums.toFixed(2), '0.00', '0.00'
  ]);
  allocationSummaryRows.push([
    'Total of County Allocation Report', '', '0', 
    '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'
  ]);
  allocationSummaryRows.push([
    'Total of All Premiums', '', totalRecords.toString(), 
    totalPremiums.toFixed(2), '0.00', '0.00', '0.00', '0.00', totalPremiums.toFixed(2), '0.00', '0.00'
  ]);

  // Add jurisdiction details
  Object.entries(jurisdictionSummary)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([jurisdiction, data]) => {
      allocationSummaryRows.push([
        jurisdiction,
        data.code,
        data.count.toString(),
        data.totalPremiums.toFixed(2),
        '0.00', // Casualty
        '0.00', // Fire & Allied
        '0.00', // Health
        '0.00', // Inland Marine
        data.totalPremiums.toFixed(2), // Life (using total for now)
        '0.00', // Motor Vehicle
        '0.00'  // Other Premiums
      ]);
    });

  reports['Allocation Summary'] = {
    headers: ['Jurisdiction Assigned To', 'Jurisdiction Code', '# of Records', 'Total Premiums', 'Casualty', 'Fire & Allied', 'Health', 'Inland Marine', 'Life', 'Motor Vehicle', 'Other Premiums'],
    rows: allocationSummaryRows
  };

  // Match Exceptions Report
  const exceptionRows = geocodedResults
    .filter(result => result.matchCode !== '0')
    .map(result => [
      result.policyNumber,
      result.matchCode,
      result.matchDescription,
      `${result.originalRecord[2]}, ${result.originalRecord[3]}, ${result.originalRecord[4]} ${result.originalRecord[5]}`,
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
    'GENERAL',
    `${result.originalRecord[2]}, ${result.originalRecord[3]}, ${result.originalRecord[4]} ${result.originalRecord[5]}`,
    'UPLOAD',
    result.premiums
  ]);

  reports['Source Data'] = {
    headers: ['Policy #', 'Premium Type', 'Source Address', 'Company Code', 'Premiums'],
    rows: sourceDataRows
  };

  return reports;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = fs.readFileSync(file.filepath, 'utf8');
    
    const parseResult = Papa.parse(csvContent, {
      header: false,
      skipEmptyLines: true
    });

    if (parseResult.errors.length > 0) {
      return res.status(400).json({ 
        error: 'CSV parsing error', 
        details: parseResult.errors 
      });
    }

    const records = parseResult.data.filter(record => record.length >= 7);
    const geocodedResults = [];
    const matchSummary = {
      '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0,
      '5': 0, '6': 0, '7': 0, '8': 0, '9': 0
    };

    console.log(`Processing ${records.length} records...`);

    // Limit processing for large files to avoid timeout
    const maxRecords = Math.min(records.length, 50);
    const processedRecords = records.slice(0, maxRecords);
    
    if (records.length > maxRecords) {
      console.log(`Large file detected. Processing first ${maxRecords} records of ${records.length} total.`);
    }

    // Process each record
    for (let i = 0; i < processedRecords.length; i++) {
      const record = processedRecords[i];
      
      if (record.length < 7) continue; // Skip invalid records
      
      const policyNumber = record[0];
      const address = `${record[2]}, ${record[3]}, ${record[4]} ${record[5]}`;
      const premiums = record[6];

      console.log(`Geocoding ${i + 1}/${records.length}: ${address}`);

      // Geocode the address
      const geocodeResult = await geocodeAddress(address);

      // Create result record
      const result = {
        policyNumber,
        premiums: premiums,
        matchCode: geocodeResult.matchCode,
        matchDescription: geocodeResult.matchDescription,
        matchedAddress: geocodeResult.matchedAddress || '',
        coordinates: geocodeResult.coordinates,
        originalRecord: record
      };

      geocodedResults.push(result);
      matchSummary[geocodeResult.matchCode]++;

      // Add delay between API calls
      if (i < processedRecords.length - 1) {
        await delay(100);
      }
    }

    // Calculate match percentage
    const totalRecords = geocodedResults.length;
    const goodMatches = matchSummary['0'];
    const matchPercentage = totalRecords > 0 ? ((goodMatches / totalRecords) * 100).toFixed(2) : '0.00';

    // Generate reports
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
}
