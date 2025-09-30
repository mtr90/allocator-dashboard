const formidable = require('formidable');
const fs = require('fs');

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  return lines.map(line => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

// Kentucky jurisdictions
const JURISDICTIONS = {
  'COVINGTON': { code: '5', county: 'KENTON COUNTY' },
  'VILLA HILLS': { code: '116', county: 'KENTON COUNTY' },
  'FLORENCE': { code: '16', county: 'BOONE COUNTY' },
  'LOUISVILLE': { code: '1', county: 'JEFFERSON COUNTY' },
  'OWENSBORO': { code: '8', county: 'DAVIESS COUNTY' },
  'CRITTENDEN': { code: '285', county: 'GRANT COUNTY' },
  'DEMOSSVILLE': { code: '9998', county: 'PENDLETON COUNTY' },
  'LONDON': { code: '78', county: 'LAUREL COUNTY' }
};

async function geocodeAddress(address) {
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=2020&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.result?.addressMatches?.length > 0) {
      return {
        matchCode: '0',
        matchDescription: 'Good Match',
        matchedAddress: data.result.addressMatches[0].matchedAddress
      };
    } else if (address.toLowerCase().includes('po box')) {
      return {
        matchCode: '4',
        matchDescription: 'PO Box or Rural Route',
        matchedAddress: ''
      };
    } else {
      return {
        matchCode: '3',
        matchDescription: 'No candidates',
        matchedAddress: ''
      };
    }
  } catch (error) {
    return {
      matchCode: '3',
      matchDescription: 'No candidates',
      matchedAddress: ''
    };
  }
}

function getJurisdiction(city) {
  const normalizedCity = city.toUpperCase().trim();
  return JURISDICTIONS[normalizedCity] || { code: '9998', county: `${normalizedCity} COUNTY` };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024,
    });

    const [fields, files] = await form.parse(req);
    const file = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const csvContent = fs.readFileSync(file.filepath, 'utf8');
    const records = parseCSV(csvContent).filter(record => record.length >= 7);
    
    const geocodedResults = [];
    const matchSummary = { '0': 0, '3': 0, '4': 0 };
    
    // Process up to 20 records to avoid timeout
    const maxRecords = Math.min(records.length, 20);
    
    for (let i = 0; i < maxRecords; i++) {
      const record = records[i];
      const address = `${record[2]}, ${record[3]}, ${record[4]} ${record[5]}`;
      
      const geocodeResult = await geocodeAddress(address);
      const jurisdiction = getJurisdiction(record[3]);
      
      geocodedResults.push({
        policyNumber: record[0],
        premiums: parseFloat(record[6]) || 0,
        matchCode: geocodeResult.matchCode,
        matchDescription: geocodeResult.matchDescription,
        matchedAddress: geocodeResult.matchedAddress,
        jurisdiction: jurisdiction,
        city: record[3],
        originalRecord: record
      });
      
      matchSummary[geocodeResult.matchCode]++;
      
      // Small delay
      if (i < maxRecords - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Calculate totals
    const totalRecords = geocodedResults.length;
    const totalPremiums = geocodedResults.reduce((sum, r) => sum + r.premiums, 0);
    const goodMatches = matchSummary['0'] || 0;
    const matchPercentage = totalRecords > 0 ? ((goodMatches / totalRecords) * 100).toFixed(2) : '0.00';
    
    // Generate Job Summary
    const jobSummaryRows = [
      ['-1', 'Forced Allocation', '0', '-', '-', '-'],
      ['0', 'Good Match', matchSummary['0'].toString(), 
       totalRecords > 0 ? ((matchSummary['0'] / totalRecords) * 100).toFixed(2) + '%' : '-',
       totalPremiums.toFixed(2), '100.00%'],
      ['3', 'No candidates', (matchSummary['3'] || 0).toString(),
       totalRecords > 0 ? (((matchSummary['3'] || 0) / totalRecords) * 100).toFixed(2) + '%' : '-',
       '0.00', '0.00%'],
      ['4', 'PO Box or Rural Route', (matchSummary['4'] || 0).toString(),
       totalRecords > 0 ? (((matchSummary['4'] || 0) / totalRecords) * 100).toFixed(2) + '%' : '-',
       '0.00', '0.00%']
    ];
    
    // Generate Allocation Detail
    const allocationDetailRows = [
      ['Total of Detail Report', totalPremiums.toFixed(2), totalPremiums.toFixed(2), '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']
    ];
    
    geocodedResults.forEach(result => {
      allocationDetailRows.push([
        result.policyNumber,
        result.premiums.toFixed(2),
        result.premiums.toFixed(2),
        result.jurisdiction.county.replace(' COUNTY', ''),
        result.jurisdiction.code,
        result.jurisdiction.county,
        result.city,
        result.matchCode,
        result.matchDescription,
        'L',
        result.originalRecord[2],
        result.originalRecord[3],
        result.originalRecord[4],
        result.originalRecord[5],
        result.matchedAddress ? result.matchedAddress.split(',')[0] : '',
        result.matchedAddress ? result.matchedAddress.split(',')[1]?.trim() : '',
        result.matchedAddress ? 'KY' : '',
        result.matchedAddress ? result.originalRecord[5] : '',
        result.matchCode === '0' ? 'S8HPNTSCZA' : '-',
        result.originalRecord[7] || result.policyNumber.split('-')[0],
        '-', '-', '-', 'Muni'
      ]);
    });
    
    // Generate Allocation Summary
    const jurisdictionSummary = {};
    geocodedResults.forEach(result => {
      const key = result.jurisdiction.county.replace(' COUNTY', '');
      if (!jurisdictionSummary[key]) {
        jurisdictionSummary[key] = {
          code: result.jurisdiction.code,
          count: 0,
          totalPremiums: 0
        };
      }
      jurisdictionSummary[key].count++;
      jurisdictionSummary[key].totalPremiums += result.premiums;
    });
    
    const allocationSummaryRows = [
      ['Total of Detail Report', '', totalRecords.toString(), totalPremiums.toFixed(2), '0.00', '0.00', '0.00', '0.00', totalPremiums.toFixed(2), '0.00', '0.00']
    ];
    
    Object.entries(jurisdictionSummary).forEach(([jurisdiction, data]) => {
      allocationSummaryRows.push([
        jurisdiction,
        data.code,
        data.count.toString(),
        data.totalPremiums.toFixed(2),
        '0.00', '0.00', '0.00', '0.00',
        data.totalPremiums.toFixed(2),
        '0.00', '0.00'
      ]);
    });
    
    const reports = {
      'Job Summary': {
        headers: ['Match Code', 'Match Description', '# of Records', '% of records', 'Total of Source Premiums', '% of Source Premiums'],
        rows: jobSummaryRows
      },
      'Allocation Detail': {
        headers: ['Policy #', 'Source Premiums', 'Premiums', 'Jurisdiction Assigned To', 'Jurisdiction Code', 'County', 'City', 'Match Code', 'Match Description', 'Premium Type', 'Normal Street', 'Normal City', 'Normal State', 'Normal Zip', 'Matched Street', 'Matched City', 'Matched State', 'Matched Zip', 'Matched Identifier', 'Company Code', 'Miscellaneous 1', 'Miscellaneous 2', 'Miscellaneous 3', 'Miscellaneous 4'],
        rows: allocationDetailRows
      },
      'Allocation Summary': {
        headers: ['Jurisdiction Assigned To', 'Jurisdiction Code', '# of Records', 'Total Premiums', 'Casualty', 'Fire & Allied', 'Health', 'Inland Marine', 'Life', 'Motor Vehicle', 'Other Premiums'],
        rows: allocationSummaryRows
      }
    };
    
    // Clean up
    try {
      fs.unlinkSync(file.filepath);
    } catch (err) {
      // Ignore cleanup errors
    }
    
    res.json({
      success: true,
      totalRecords,
      matchPercentage,
      reports,
      summary: matchSummary
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
};
