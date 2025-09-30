// Real geocoding API with Census Bureau integration
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  try {
    // Get the raw body
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    
    // Parse multipart form data manually
    const boundary = req.headers['content-type']?.split('boundary=')[1];
    if (!boundary) {
      return res.status(400).json({ error: 'No boundary found' });
    }
    
    const parts = buffer.toString().split(`--${boundary}`);
    let csvContent = '';
    
    for (const part of parts) {
      if (part.includes('filename=') && part.includes('.csv')) {
        const lines = part.split('\r\n');
        const dataStartIndex = lines.findIndex(line => line === '') + 1;
        csvContent = lines.slice(dataStartIndex, -1).join('\n');
        break;
      }
    }
    
    if (!csvContent) {
      return res.status(400).json({ error: 'No CSV content found' });
    }
    
    // Parse CSV manually
    const lines = csvContent.trim().split('\n');
    const records = lines.map(line => {
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
    }).filter(record => record.length >= 7);
    
    console.log(`Processing ${records.length} records with real geocoding...`);
    
    // Kentucky jurisdictions
    const JURISDICTIONS = {
      'COVINGTON': { code: '5', county: 'KENTON COUNTY' },
      'VILLA HILLS': { code: '116', county: 'KENTON COUNTY' },
      'FLORENCE': { code: '16', county: 'BOONE COUNTY' },
      'LOUISVILLE': { code: '1', county: 'JEFFERSON COUNTY' },
      'OWENSBORO': { code: '8', county: 'DAVIESS COUNTY' },
      'CRITTENDEN': { code: '285', county: 'GRANT COUNTY' },
      'DEMOSSVILLE': { code: '9998', county: 'PENDLETON COUNTY' },
      'LONDON': { code: '78', county: 'LAUREL COUNTY' },
      'ALEXANDRIA': { code: '123', county: 'CAMPBELL COUNTY' },
      'BELLEVUE': { code: '34', county: 'CAMPBELL COUNTY' },
      'COLD SPRING': { code: '148', county: 'CAMPBELL COUNTY' },
      'DAYTON': { code: '46', county: 'CAMPBELL COUNTY' },
      'EDGEWOOD': { code: '9998', county: 'KENTON COUNTY' },
      'ERLANGER': { code: '14', county: 'KENTON COUNTY' },
      'FORT MITCHELL': { code: '57', county: 'KENTON COUNTY' },
      'FORT THOMAS': { code: '58', county: 'CAMPBELL COUNTY' },
      'INDEPENDENCE': { code: '9998', county: 'KENTON COUNTY' },
      'NEWPORT': { code: '9998', county: 'CAMPBELL COUNTY' },
      'TAYLOR MILL': { code: '9998', county: 'KENTON COUNTY' }
    };
    
    // Real geocoding function
    async function geocodeAddress(address) {
      try {
        const encodedAddress = encodeURIComponent(address);
        const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodedAddress}&benchmark=2020&format=json`;
        
        console.log(`Geocoding: ${address}`);
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.result && data.result.addressMatches && data.result.addressMatches.length > 0) {
          const match = data.result.addressMatches[0];
          console.log(`✓ Good match for: ${address}`);
          return {
            matchCode: '0',
            matchDescription: 'Good Match',
            matchedAddress: match.matchedAddress,
            coordinates: match.coordinates,
            tigerLine: match.tigerLine
          };
        } else {
          console.log(`✗ No match for: ${address}`);
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
        console.error(`Geocoding error for ${address}:`, error);
        return {
          matchCode: '3',
          matchDescription: 'No candidates',
          matchedAddress: '',
          coordinates: null,
          tigerLine: null
        };
      }
    }
    
    // Process records with real geocoding (limit to 20 for timeout safety)
    const maxRecords = Math.min(records.length, 20);
    const geocodedResults = [];
    const matchSummary = { '-1': 0, '0': 0, '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0, '7': 0, '8': 0, '9': 0 };
    
    for (let i = 0; i < maxRecords; i++) {
      const record = records[i];
      const address = `${record[2]}, ${record[3]}, ${record[4]} ${record[5]}`;
      
      // Call real Census Bureau API
      const geocodeResult = await geocodeAddress(address);
      
      // Get jurisdiction
      const city = record[3].toUpperCase().trim();
      const jurisdiction = JURISDICTIONS[city] || { code: '9998', county: `${city} COUNTY` };
      
      geocodedResults.push({
        policyNumber: record[0],
        premiums: parseFloat(record[6]) || 0,
        matchCode: geocodeResult.matchCode,
        matchDescription: geocodeResult.matchDescription,
        matchedAddress: geocodeResult.matchedAddress || '',
        coordinates: geocodeResult.coordinates,
        jurisdiction,
        city: record[3],
        originalRecord: record
      });
      
      matchSummary[geocodeResult.matchCode]++;
      
      // Add delay between API calls to respect rate limits
      if (i < maxRecords - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Geocoding complete. Results:`, matchSummary);
    
    // Calculate totals
    const totalRecords = geocodedResults.length;
    const totalPremiums = geocodedResults.reduce((sum, r) => sum + r.premiums, 0);
    const goodMatches = matchSummary['0'] || 0;
    const matchPercentage = totalRecords > 0 ? ((goodMatches / totalRecords) * 100).toFixed(2) : '0.00';
    
    // Generate Job Summary Report
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
      if (count > 0) {
        const percentage = totalRecords > 0 ? ((count / totalRecords) * 100).toFixed(2) + '%' : '-';
        const premiumsForCode = geocodedResults
          .filter(result => result.matchCode === code)
          .reduce((sum, result) => sum + result.premiums, 0);
        const premiumPercentage = totalPremiums > 0 ? ((premiumsForCode / totalPremiums) * 100).toFixed(2) + '%' : '-';
        
        jobSummaryRows.push([
          code,
          matchDescriptions[code] || 'Unknown',
          count.toString(),
          percentage,
          premiumsForCode.toFixed(2),
          premiumPercentage
        ]);
      }
    });

    // Add zero rows for completeness
    Object.entries(matchDescriptions).forEach(([code, description]) => {
      if (!matchSummary[code] || matchSummary[code] === 0) {
        jobSummaryRows.push([code, description, '0', '-', '-', '-']);
      }
    });

    // Sort by match code
    jobSummaryRows.sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    // Generate Allocation Detail Report
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
    
    // Generate Allocation Summary Report
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
      ['Total of Detail Report', '', totalRecords.toString(), totalPremiums.toFixed(2), '0.00', '0.00', '0.00', '0.00', totalPremiums.toFixed(2), '0.00', '0.00'],
      ['Total of County Allocation Report', '', '0', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00', '0.00'],
      ['Total of All Premiums', '', totalRecords.toString(), totalPremiums.toFixed(2), '0.00', '0.00', '0.00', '0.00', totalPremiums.toFixed(2), '0.00', '0.00']
    ];
    
    Object.entries(jurisdictionSummary)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([jurisdiction, data]) => {
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
    
    // Generate reports object
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
      },
      'Source Data': {
        headers: ['Policy #', 'Premium Type', 'Source Address', 'Company Code', 'Premiums'],
        rows: geocodedResults.map(result => [
          result.policyNumber,
          'GENERAL',
          `${result.originalRecord[2]}, ${result.originalRecord[3]}, ${result.originalRecord[4]} ${result.originalRecord[5]}`,
          'UPLOAD',
          result.premiums.toFixed(2)
        ])
      }
    };
    
    // Add Match Exceptions if any
    const exceptions = geocodedResults.filter(r => r.matchCode !== '0');
    if (exceptions.length > 0) {
      reports['Match Exceptions'] = {
        headers: ['Policy #', 'Match Code', 'Description', 'Normal Address', 'Premiums'],
        rows: exceptions.map(result => [
          result.policyNumber,
          result.matchCode,
          result.matchDescription,
          `${result.originalRecord[2]}, ${result.originalRecord[3]}, ${result.originalRecord[4]} ${result.originalRecord[5]}`,
          result.premiums.toFixed(2)
        ])
      };
    }
    
    return res.json({
      success: true,
      totalRecords,
      matchPercentage,
      reports,
      summary: matchSummary,
      message: records.length > maxRecords ? `Large file detected. Processed first ${maxRecords} records of ${records.length} total.` : undefined
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}
