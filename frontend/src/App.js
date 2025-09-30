import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Search, Download, Filter, Settings, Mail, HelpCircle, ChevronLeft, ChevronRight, HardDriveDownload } from 'lucide-react';

// Updated color scheme to match the target UI
const COLORS = {
  headerBg: '#3d4f63', // Dark blue-gray from image
  sidebarBg: '#3d4f63', // Same as header
  mainBg: '#f5f5f5', // Light gray background for the main content area
  contentPanelBg: '#ffffff', // White for table and controls panel
  activeItemBg: '#4a5a6d', // A slightly lighter shade for active/hover states
  borderColor: '#5c6a7a',
  textPrimary: '#ffffff',
  textSecondary: '#e2e8f0', // Lighter text for secondary info
  textDark: '#1e293b', // Dark text for content on white panels
  tableHeaderBg: '#f8f9fa',
  statusOrange: '#ff8c42',
  statusGray: '#6c757d',
  statusGreen: '#28a745', // Added green for 'Approved'
  statusProcessed: '#343a40', // Added dark blue/gray for 'Processed'
};

const initialJobs = {
    "job-11": {
        title: "(11)QUACK_KY1_2025_MuniData-Working-Kenton.csv", shortTitle: "QUACK, 2024, KY, Q3", details: "(2)QUACK_KY3_2024_AQA...", match: "21.43%", status: "Under Review",
        reports: {
            'Job Summary': { headers: ['Match Code', 'Match Description', '# of Records', '% of records', 'Total of Source Premiums', '% of Source Premiums'], rows: [['-1', 'Forced Allocation', '0', '-', '-', '-'], ['0', 'Good Match', '253', '96.20%', '2,196,149.19', '99.87%'], ['1', 'Fuzzy Match', '5', '1.90%', '1,500.00', '0.07%'], ['2', 'Multiple Hits', '3', '1.14%', '800.00', '0.04%'], ['3', 'No Candidates', '10', '3.80%', '2,932.95', '0.13%'], ['4', 'PO Box or Rural Route', '2', '0.76%', '1,500.00', '0.07%'], ['5', 'Address not in state', '1', '0.38%', '1,200.00', '0.05%'], ['6', 'Unverified Address', '1', '0.38%', '500.00', '0.02%'], ['7', 'Street Name Mismatch', '2', '0.76%', '750.00', '0.03%'], ['8', 'ZIP Code Mismatch', '1', '0.38%', '250.00', '0.01%'], ['9', 'Unit Number Missing', '4', '1.52%', '1,100.00', '0.05%']] },
            'Allocation Summary': { headers: ['Jurisdiction Assigned To', 'Jurisdiction Code', '# Policies', 'Total Premiums', 'Casualty', 'Fire & Allied'], rows: [['LOUISVILLE', '56-48000', '150', '1,800,000', '750,000', '450,000'], ['LEXINGTON', '34-45000', '45', '250,000', '120,000', '80,000'], ['COVINGTON', '59-18184', '32', '120,000', '60,000', '40,000'], ['KENTON COUNTY', '59-00000', '26', '85,000', '45,000', '25,000'], ['PADUCAH', '73-62000', '12', '41,000', '20,000', '15,000'], ['BOWLING GREEN', '111-08112', '10', '35,000', '18,000', '12,000'], ['OWENSBORO', '30-61000', '9', '31,000', '15,000', '10,000'], ['FRANKFORT', '37-28000', '8', '28,000', '14,000', '9,000'], ['RICHMOND', '76-66000', '7', '25,000', '12,000', '8,000'], ['FLORENCE', '08-27000', '15', '55,000', '30,000', '20,000']] },
            'Match Exceptions': { headers: ['Policy #', 'Match Code', 'Description', 'Normal Address', 'Premiums'], rows: [['POL-98765', '3', 'No Candidates', '123 BOGUS ST, NOWHERE, KY', '450.25'], ['POL-98766', '2', 'Multiple Hits', 'APT 15, FAKE RD, SOMEWHERE, KY', '199.99'], ['POL-98767', '5', 'Address not in state', '100 MAIN ST, CINCINNATI, OH', '1,200.00'], ['POL-98768', '3', 'No Candidates', 'UNKNOWN STREET, ERLANGER, KY', '305.50'], ['POL-98769', '2', 'Multiple Hits', '789 Side Ave Unit B, FT WRIGHT, KY', '88.00'], ['POL-98770', '3', 'No Candidates', '555 LOST WAY, HEBRON, KY', '67.50'], ['POL-98771', '2', 'Multiple Hits', 'BLDG C 456 OAK, COVINGTON, KY', '450.00'], ['POL-98772', '5', 'Address not in state', '200 VINE ST, LAWRENCEBURG, IN', '950.00'], ['POL-98773', '3', 'No Candidates', '999 MYSTERY LN, NEWPORT, KY', '123.45'], ['POL-98774', '2', 'Multiple Hits', 'STE 202, 111 ELM, FLORENCE, KY', '234.56']] },
            'Non-Taxable': { headers: ['Policy #', 'Address', 'Jurisdiction', 'Reason', 'Premiums'], rows: [['POL-11223', 'PO BOX 100, ERLANGER, KY', 'ERLANGER', 'PO Box', '350.75'], ['POL-11224', 'RR 2 BOX 50, INDEPENDENCE, KY', 'KENTON COUNTY', 'Rural Route', '550.00'], ['POL-11225', 'PO BOX 2345', 'FLORENCE', 'PO Box', '123.45'], ['POL-11226', 'PO BOX 789', 'COVINGTON', 'PO Box', '432.10'], ['POL-11227', 'RR 1 BOX 123', 'ALEXANDRIA', 'Rural Route', '210.90'], ['POL-11228', 'PO BOX 333', 'NEWPORT', 'PO Box', '88.88'], ['POL-11229', 'PO BOX 444', 'FT THOMAS', 'PO Box', '199.50'], ['POL-11230', 'RR 5 BOX 10', 'BURLINGTON', 'Rural Route', '330.00'], ['POL-11231', 'PO BOX 555', 'HEBRON', 'PO Box', '75.00'], ['POL-11232', 'PO BOX 666', 'UNION', 'PO Box', '150.25']] },
            'County Allocation': { headers: ['Policy #', 'Jurisdiction', 'Code', 'Match Code', 'Matched Address', 'Premiums'], rows: [['POL-55501', 'KENTON COUNTY', '59-00000', '0', '123 MAIN ST, COVINGTON, KY', '1,250.50'], ['POL-55502', 'KENTON COUNTY', '59-00000', '0', '456 OAK AVE, ERLANGER, KY', '875.00'], ['POL-55503', 'FAYETTE COUNTY', '34-00000', '0', '789 MAPLE DR, LEXINGTON, KY', '2,100.00'], ['POL-55504', 'BOONE COUNTY', '08-00000', '0', '101 FLORENCE PIKE, FLORENCE, KY', '1,500.75'], ['POL-55505', 'CAMPBELL COUNTY', '19-00000', '0', '202 ALEXANDRIA PIKE, FT THOMAS, KY', '950.00'], ['POL-55506', 'JEFFERSON COUNTY', '56-00000', '0', '303 BROADWAY, LOUISVILLE, KY', '3,200.00'], ['POL-55507', 'KENTON COUNTY', '59-00000', '3', 'UNKNOWN RD, INDEPENDENCE, KY', '450.25'], ['POL-55508', 'BOONE COUNTY', '08-00000', '0', '404 INDUSTRIAL RD, HEBRON, KY', '1,800.00'], ['POL-55509', 'FAYETTE COUNTY', '34-00000', '0', '505 N LIMESTONE, LEXINGTON, KY', '2,500.50'], ['POL-55510', 'CAMPBELL COUNTY', '19-00000', '0', '606 MONMOUTH ST, NEWPORT, KY', '1,100.00']] },
            'Allocation Detail': { headers: ['Policy #', 'Premiums', 'Jurisdiction Assigned To', 'Jurisdiction Code', 'Match Code', 'Match Description', 'Premium Type', 'Matched Street'], rows: [['126', '1527.00', 'WASHINGTON COUNTY', '964', '0', 'Good Match', 'C', '207 LINCOLN PARK RD'], ['23', '2059.00', 'WASHINGTON COUNTY', '964', '0', 'Good Match', 'C', '207 LINCOLN PARK RD'], ['250', '74.00', 'WASHINGTON COUNTY', '964', '0', 'Good Match', 'C', '207 LINCOLN PARK RD'], ['61', '237.00', 'WASHINGTON COUNTY', '964', '0', 'Good Match', 'C', '207 LINCOLN PARK RD'], ['94', '57.00', 'WASHINGTON COUNTY', '964', '0', 'Good Match', 'I', '207 LINCOLN PARK RD'], ['342', '1845.00', 'KENTON COUNTY', '512', '0', 'Good Match', 'C', '1255 MAIN ST'], ['178', '623.00', 'KENTON COUNTY', '512', '0', 'Good Match', 'C', '1255 MAIN ST'], ['455', '3210.00', 'BOONE COUNTY', '328', '0', 'Good Match', 'C', '892 ELM STREET'], ['289', '156.00', 'BOONE COUNTY', '328', '1', 'Partial Match', 'I', '892 ELM STREET'], ['512', '2456.00', 'CAMPBELL COUNTY', '445', '0', 'Good Match', 'C', '456 OAK AVE'], ['633', '892.00', 'CAMPBELL COUNTY', '445', '0', 'Good Match', 'C', '456 OAK AVE'], ['721', '445.00', 'WARREN COUNTY', '789', '2', 'No Match', 'C', '123 PINE RD'], ['834', '1123.00', 'FAYETTE COUNTY', '234', '0', 'Good Match', 'C', '789 MAPLE DR'], ['945', '678.00', 'JEFFERSON COUNTY', '156', '0', 'Good Match', 'I', '321 BIRCH LN'], ['1056', '2890.00', 'JEFFERSON COUNTY', '156', '0', 'Good Match', 'C', '321 BIRCH LN']] },
            'Source Data': { headers: ['Policy #', 'Premium Type', 'Source Address', 'Company Code', 'Premiums'], rows: [['POL-10001', 'LIFE', '101 E MAIN, LOUISVILLE, 40202', 'QUACK', '5,000.00'], ['POL-10002', 'HEALTH', '20 W PIKE, COVINGTON, KY', 'QUACK', '250.75'], ['POL-98765', 'FIRE', '123 BOGUS', 'QUACK', '450.25'], ['POL-11223', 'OTHER', 'PO BOX 100 ERLANGER', 'QUACK', '350.75'], ['POL-55503', 'AUTO', '789 MAPLE, LEXINGTON', 'QUACK', '2,100.00'], ['POL-10006', 'HOME', '123 RIVERFRONT, PADUCAH', 'QUACK', '670.00'], ['POL-10007', 'BUSINESS', '400 CAPITOL AVE, FRANKFORT', 'QUACK', '950.80'], ['POL-98766', 'RENTERS', 'APT 15 FAKE RD', 'QUACK', '199.99'], ['POL-98767', 'BOAT', '100 MAIN OH', 'QUACK', '1,200.00'], ['POL-98768', 'FLOOD', 'UNKNOWN STREET ERLANGER', 'QUACK', '305.50']] },
            'Address Corrections': { headers: ['Policy #', 'Source Address', 'Corrected Address', 'Matched Address'], rows: [['POL-98765', '123 BOGUS, NOWHERE', '123 MAIN ST, COVINGTON', '123 MAIN STREET...'], ['POL-98766', 'APT 15, FAKE RD', '15 FAKE RD, COVINGTON', '15 FAKE ROAD...'], ['POL-98768', 'UNKNOWN STREET', '555 SOMEWHERE AVE', '555 SOMEWHERE AVENUE...'], ['POL-12001', '10 Downing', '10 DOWNING ST', '10 DOWNING STREET...'], ['POL-12002', '221B Baker St', '221B BAKER ST', '221B BAKER STREET...'], ['POL-12003', 'P Sherman 42 Wallaby', '42 WALLABY WAY, SYDNEY', '42 WALLABY WAY...'], ['POL-12004', 'Hollywood Blv', 'HOLLYWOOD BLVD', 'HOLLYWOOD BOULEVARD...'], ['POL-12005', 'Fifth Av', '5TH AVE', '5TH AVENUE...'], ['POL-12006', 'Broad Way', 'BROADWAY', 'BROADWAY...'], ['POL-12007', 'Main St.', 'MAIN ST', 'MAIN STREET...']] },
            'Activity': { headers: ['Timestamp', 'User', 'Action', 'Details'], rows: [['2025-09-25 14:10', 'User1', 'Job Processed', 'File processed successfully.'], ['2025-09-25 14:15', 'User1', 'Address Corrected', 'Policy POL-98765'], ['2025-09-25 14:16', 'User1', 'Status Changed', 'To -> Processed'], ['2025-09-25 14:20', 'User1', 'Report Exported', 'Allocation Summary'], ['2025-09-25 14:25', 'Admin', 'Manual Override', 'Policy POL-98767 forced to Kenton County'], ['2025-09-25 14:30', 'User2', 'Comment Added', 'Policy POL-11224: Confirmed rural route'], ['2025-09-25 14:35', 'System', 'Auto-Flag', 'Policy POL-98768 has low confidence'], ['2025-09-25 14:40', 'User1', 'Filter Applied', 'Jurisdiction = LOUISVILLE'], ['2025-09-25 14:45', 'User1', 'Viewed Report', 'Allocation Detail'], ['2025-09-25 14:50', 'User2', 'Report Exported', 'Match Exceptions']] },
        }
    },
    "job-10": { title: "(10)QUACK_KY1_2025_max-test.csv", shortTitle: "QUACK, 2024, KY, Q3", details: "(1)QUACK_KY3_2024_AQA...", match: "21.43%", status: "Processed", reports: { "Job Summary": { headers: ["Match Code", "Description", "# Records"], rows: [["0", "Good Match", "450"], ["3", "No Candidates", "5"]] }, "Allocation Summary": { headers: ["Jurisdiction", "# Policies"], rows: [["LOUISVILLE", "300"], ["LEXINGTON", "155"]] } } },
    "job-12": { title: "(12)QUACK_FL2_2025_MuniData.csv", shortTitle: "QUACK, 2025, FL, Q2", details: "(12)QUACK_FL2_2025_AQA...", match: "98.50%", status: "Approved", reports: { "Job Summary": { headers: ["Match Code", "# Records"], rows: [["0", "750"], ["5", "12"]] } } },
};

const newSampleFileUpload = {
    title: `(13)Sample_Upload_${new Date().getFullYear()}.csv`, 
    shortTitle: `Sample, ${new Date().getFullYear()}, KY, Q4`, 
    details: `(13)Sample_Upload_${new Date().getFullYear()}_...`, 
    match: "80.00%", 
    status: "Under Review",
    reports: {
        'Job Summary': { 
            headers: ['Match Code', 'Match Description', '# of Records', '% of records'], 
            rows: [
                ['0', 'Good Match', '8', '80.00%'],
                ['2', 'No Close Match', '1', '10.00%'],
                ['3', 'No Candidates', '1', '10.00%']
            ] 
        },
        'Allocation Detail': { 
            headers: ['Policy #', 'Premiums', 'Jurisdiction Assigned To', 'Jurisdiction Code', 'Match Code', 'Match Description', 'Premium Type', 'Matched Street'], 
            rows: [
                ['S-001', '1250.00', 'JEFFERSON COUNTY', '56-00000', '0', 'Good Match', 'C', '123 APPLE ST'],
                ['S-002', '850.50', 'JEFFERSON COUNTY', '56-00000', '0', 'Good Match', 'C', '123 APPLE ST'],
                ['S-003', '2300.00', 'FAYETTE COUNTY', '34-00000', '0', 'Good Match', 'I', '456 ORANGE AVE'],
                ['S-004', '450.75', 'FAYETTE COUNTY', '34-00000', '0', 'Good Match', 'C', '456 ORANGE AVE'],
                ['S-005', '95.00', 'BOONE COUNTY', '08-00000', '0', 'Good Match', 'C', '789 GRAPE BLVD'],
                ['S-006', '1100.00', 'BOONE COUNTY', '08-00000', '0', 'Good Match', 'I', '789 GRAPE BLVD'],
                ['S-007', '125.25', 'KENTON COUNTY', '59-00000', '0', 'Good Match', 'C', '101 PINEAPPLE WAY'],
                ['S-008', '220.00', 'KENTON COUNTY', '59-00000', '0', 'Good Match', 'C', '101 PINEAPPLE WAY'],
                ['S-009', '780.00', 'CAMPBELL COUNTY', '19-00000', '2', 'No Close Match', 'C', '210 BANANA RD'],
                ['S-010', '330.00', 'WARREN COUNTY', '111-00000', '3', 'No Candidates', 'I', '345 LEMON LN']
            ]
        },
        'Match Exceptions': { 
            headers: ['Policy #', 'Match Code', 'Description', 'Normal Address', 'Premiums'], 
            rows: [
                ['S-009', '2', 'No Close Match', '210 BANANA RD', '780.00'],
                ['S-010', '3', 'No Candidates', '345 LEMON LN', '330.00']
            ]
        },
    }
};


const CustomSelect = ({ label, value, onChange, children }) => (
    <div style={{ position: 'relative', backgroundColor: 'transparent', border: `1px solid ${COLORS.borderColor}`, borderRadius: '4px' }}>
        <label style={{ position: 'absolute', top: '4px', left: '12px', fontSize: '10px', color: '#9ca3af' }}>{label}</label>
        <select
            value={value}
            onChange={onChange}
            style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                paddingTop: '18px',
                paddingBottom: '4px',
                paddingLeft: '10px',
                paddingRight: '32px',
                color: 'white',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23a0aec0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundSize: '0.8em',
                backgroundPosition: 'right 12px center',
                backgroundRepeat: 'no-repeat',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none'
            }}
        >
            {children}
        </select>
    </div>
);

// Updated JobCard to match the image
const JobCard = ({ job, jobId, isActive, onSelect, onStatusChange, onContextMenu }) => {
    const statusOptions = ["Under Review", "Processed", "Approved"];
    const statusColors = {
        'Under Review': COLORS.statusOrange,
        'Processed': COLORS.statusProcessed,
        'Approved': COLORS.statusGreen,
    };
    
    const ChevronDownIcon = ({size=12}) => (
         <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <polyline points="6 9 12 15 18 9" />
        </svg>
    );

    const handleLocalStatusChange = (e) => {
        e.stopPropagation();
        onStatusChange(jobId, e.target.value);
    };

    const handleContextMenu = (e) => {
        e.preventDefault();
        onContextMenu(e.clientX, e.clientY, jobId);
    };

    return (
        <div 
            onClick={() => onSelect(jobId)}
            onContextMenu={handleContextMenu}
            style={{
                backgroundColor: COLORS.activeItemBg,
                padding: '12px',
                borderRadius: '6px',
                border: `1px solid ${isActive ? '#9ca3af' : COLORS.borderColor}`,
                cursor: 'pointer',
                marginBottom: '12px'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                     <select
                        value={job.status}
                        onChange={handleLocalStatusChange}
                        style={{
                            backgroundColor: statusColors[job.status] || COLORS.statusGray,
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '4px 24px 4px 10px',
                            borderRadius: '12px',
                            border: 'none',
                            outline: 'none',
                            cursor: 'pointer',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none',
                            backgroundImage: 'none'
                        }}
                    >
                        {statusOptions.map(status => (
                            <option key={status} value={status} style={{ backgroundColor: '#333', color: 'white' }}>
                                {status}
                            </option>
                        ))}
                    </select>
                    <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <ChevronDownIcon size={10} />
                    </div>
                </div>
                <span style={{ fontSize: '12px', color: COLORS.textSecondary, fontWeight: '600' }}>
                    {job.match}
                </span>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.textPrimary, marginBottom: '4px', lineHeight: '1.2' }}>
                {job.shortTitle}
            </h3>
            <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0, opacity: 0.8 }}>
                {job.details}
            </p>
        </div>
    );
};

// Context Menu Component
const ContextMenu = ({ x, y, visible, onDownloadAll, onDeleteJob }) => {
    if (!visible) return null;

    return (
        <div
            style={{
                position: 'fixed',
                top: y,
                left: x,
                backgroundColor: 'white',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                zIndex: 1000,
                minWidth: '150px'
            }}
        >
            <button
                onClick={onDownloadAll}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
                Download All Reports
            </button>
            <button
                onClick={onDeleteJob}
                style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: '#dc3545'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            >
                Delete Job
            </button>
        </div>
    );
};

const App = () => {
    const [jobs, setJobs] = useState(initialJobs);
    const [activeJobId, setActiveJobId] = useState("job-11");
    const [activeTab, setActiveTab] = useState("Job Summary");
    const [searchQuery, setSearchQuery] = useState("");
    const [sortColumn, setSortColumn] = useState("");
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [selectedRow, setSelectedRow] = useState(null);
    const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, jobId: null });
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const activeJob = jobs[activeJobId];
    const tabs = activeJob ? Object.keys(activeJob.reports) : [];
    const currentReportData = activeJob?.reports[activeTab] || { headers: [], rows: [] };

    const handleStatusChange = (jobId, newStatus) => {
        setJobs(prev => ({
            ...prev,
            [jobId]: { ...prev[jobId], status: newStatus }
        }));
    };

    const handleContextMenu = (x, y, jobId) => {
        setContextMenu({ visible: true, x, y, jobId });
    };

    const handleCloseContextMenu = () => {
        setContextMenu({ visible: false, x: 0, y: 0, jobId: null });
    };

    useEffect(() => {
        const handleClick = () => handleCloseContextMenu();
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    const handleDownloadAllReports = (jobId) => {
        const job = jobs[jobId];
        if (!job) return;

        Object.keys(job.reports).forEach(reportName => {
            const reportData = job.reports[reportName];
            const csvContent = [
                reportData.headers.join(','),
                ...reportData.rows.map(row => row.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${job.shortTitle}_${reportName}.csv`;
            a.click();
            URL.revokeObjectURL(url);
        });
        handleCloseContextMenu();
    };

    const handleDeleteJob = (jobId) => {
        if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
            setJobs(prev => {
                const newJobs = { ...prev };
                delete newJobs[jobId];
                return newJobs;
            });
            
            // If the deleted job was active, select another job
            if (activeJobId === jobId) {
                const remainingJobIds = Object.keys(jobs).filter(id => id !== jobId);
                if (remainingJobIds.length > 0) {
                    // Select the most recent job (first in the reversed list)
                    const sortedJobIds = remainingJobIds.sort((a, b) => {
                        const aNum = parseInt(a.split('-')[1]);
                        const bNum = parseInt(b.split('-')[1]);
                        return bNum - aNum; // Descending order (newest first)
                    });
                    setActiveJobId(sortedJobIds[0]);
                } else {
                    setActiveJobId(null);
                }
            }
        }
        handleCloseContextMenu();
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append('file', file);

            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress(prev => Math.min(prev + 10, 90));
            }, 200);

            const apiUrl = process.env.NODE_ENV === 'production' 
                ? '/api/geocode' 
                : 'http://localhost:3001/api/geocode';
                
            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);
            setUploadProgress(100);

            if (response.ok) {
                const result = await response.json();
                
                // Create new job with geocoded results
                const newJobId = `job-${Date.now()}`;
                const newJob = {
                    title: `(${Object.keys(jobs).length + 1})${file.name}`,
                    shortTitle: `${file.name.split('.')[0]}, ${new Date().getFullYear()}, KY, Q4`,
                    details: `(${Object.keys(jobs).length + 1})${file.name.substring(0, 20)}...`,
                    match: `${result.matchPercentage}%`,
                    status: "Under Review",
                    reports: result.reports
                };

                setJobs(prev => ({ ...prev, [newJobId]: newJob }));
                setActiveJobId(newJobId);
                setActiveTab("Job Summary");
            } else {
                console.error('Upload failed:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Error response:', errorText);
                alert(`Upload failed: ${response.status} ${response.statusText}`);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert(`Upload error: ${error.message}`);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            event.target.value = '';
        }
    };

    const filteredData = useMemo(() => {
        if (!searchQuery) return currentReportData.rows;
        return currentReportData.rows.filter(row =>
            row.some(cell => cell.toString().toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }, [currentReportData.rows, searchQuery]);

    const sortedData = useMemo(() => {
        if (!sortColumn) return filteredData;
        const columnIndex = currentReportData.headers.indexOf(sortColumn);
        if (columnIndex === -1) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aVal = a[columnIndex];
            const bVal = b[columnIndex];
            
            const aNum = parseFloat(aVal.toString().replace(/[,$%]/g, ''));
            const bNum = parseFloat(bVal.toString().replace(/[,$%]/g, ''));
            
            if (!isNaN(aNum) && !isNaN(bNum)) {
                return sortDirection === 'asc' ? aNum - bNum : bNum - aNum;
            }
            
            const aStr = aVal.toString().toLowerCase();
            const bStr = bVal.toString().toLowerCase();
            if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
            if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredData, sortColumn, sortDirection, currentReportData.headers]);

    const totalPages = Math.ceil(sortedData.length / rowsPerPage);
    const paginatedData = sortedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const premiumsTotal = useMemo(() => {
        const premiumsIndex = currentReportData.headers.indexOf('Premiums');
        if (premiumsIndex === -1) return null;
        
        const total = sortedData.reduce((sum, row) => {
            const value = parseFloat(row[premiumsIndex].toString().replace(/[,$]/g, ''));
            return sum + (isNaN(value) ? 0 : value);
        }, 0);
        
        return total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }, [sortedData, currentReportData.headers]);

    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const handleDownloadCSV = () => {
        const csvContent = [
            currentReportData.headers.join(','),
            ...sortedData.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeJob?.shortTitle || 'report'}_${activeTab}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
        <div style={{ display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: COLORS.mainBg }}>
            {/* Sidebar */}
            <div style={{ width: '320px', backgroundColor: COLORS.sidebarBg, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.borderColor}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                        <div style={{ width: '32px', height: '32px', backgroundColor: '#ff6b35', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                            T
                        </div>
                        <div>
                            <h1 style={{ fontSize: '16px', fontWeight: '600', color: COLORS.textPrimary, margin: 0 }}>
                                Allocator
                            </h1>
                            <p style={{ fontSize: '12px', color: COLORS.textSecondary, margin: 0 }}>
                                TriTech Software
                            </p>
                        </div>
                    </div>
                    
                    {/* Upload Section */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            style={{ display: 'none' }}
                            id="file-upload"
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="file-upload"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 12px',
                                backgroundColor: isUploading ? '#6c757d' : '#28a745',
                                color: 'white',
                                borderRadius: '4px',
                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: '500',
                                border: 'none',
                                width: '100%',
                                justifyContent: 'center'
                            }}
                        >
                            <Upload size={16} />
                            {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload CSV'}
                        </label>
                        {isUploading && (
                            <div style={{
                                position: 'absolute',
                                bottom: '-8px',
                                left: 0,
                                right: 0,
                                height: '2px',
                                backgroundColor: '#e9ecef',
                                borderRadius: '1px',
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    backgroundColor: '#28a745',
                                    width: `${uploadProgress}%`,
                                    transition: 'width 0.3s ease'
                                }} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.borderColor}` }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                        <CustomSelect label="Company" value="QUACK" onChange={() => {}}>
                            <option value="QUACK">QUACK</option>
                        </CustomSelect>
                        <CustomSelect label="State" value="KY" onChange={() => {}}>
                            <option value="KY">KY</option>
                        </CustomSelect>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <CustomSelect label="Year" value="2024" onChange={() => {}}>
                            <option value="2024">2024</option>
                        </CustomSelect>
                        <CustomSelect label="Quarter" value="Q3" onChange={() => {}}>
                            <option value="Q3">Q3</option>
                        </CustomSelect>
                    </div>
                </div>

                {/* Job List */}
                <div style={{ flex: 1, padding: '16px 20px', overflow: 'auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h2 style={{ fontSize: '14px', fontWeight: '600', color: COLORS.textSecondary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Jobs ({Object.keys(jobs).length})
                        </h2>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <Settings size={16} color={COLORS.textSecondary} cursor="pointer" />
                            <Filter size={16} color={COLORS.textSecondary} cursor="pointer" />
                        </div>
                    </div>
                    
                    {Object.entries(jobs)
                        .sort(([a], [b]) => {
                            // Sort by job ID number in descending order (newest first)
                            const aNum = parseInt(a.split('-')[1]);
                            const bNum = parseInt(b.split('-')[1]);
                            return bNum - aNum;
                        })
                        .map(([jobId, job]) => (
                        <JobCard
                            key={jobId}
                            job={job}
                            jobId={jobId}
                            isActive={activeJobId === jobId}
                            onSelect={setActiveJobId}
                            onStatusChange={handleStatusChange}
                            onContextMenu={handleContextMenu}
                        />
                    ))}
                </div>

                {/* Footer Icons */}
                <div style={{ padding: '16px 20px', borderTop: `1px solid ${COLORS.borderColor}`, display: 'flex', justifyContent: 'center', gap: '16px' }}>
                    <Mail size={20} color={COLORS.textSecondary} cursor="pointer" />
                    <HelpCircle size={20} color={COLORS.textSecondary} cursor="pointer" />
                </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Header */}
                <div style={{ backgroundColor: COLORS.headerBg, padding: '16px 24px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: COLORS.textSecondary }}>
                      {activeJob ? activeJob.title : 'Select a job to begin'}
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                        {tabs.map(tab => (
                        <button
                            key={tab}
                            onClick={() => { setActiveTab(tab); }}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: '500',
                                whiteSpace: 'nowrap',
                                border: activeTab === tab ? `1px solid ${COLORS.textSecondary}` : `1px solid ${COLORS.borderColor}`,
                                backgroundColor: activeTab === tab ? COLORS.activeItemBg : 'transparent',
                                color: activeTab === tab ? COLORS.textPrimary : COLORS.textSecondary,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease-in-out'
                            }}
                        >{tab}</button>
                        ))}
                    </div>
                </div>
                
                <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
                    { activeJob ? (
                    <div style={{ backgroundColor: COLORS.contentPanelBg, borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Controls */}
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${COLORS.mainBg}`}}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <button style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4b5563', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
                                    <Filter size={18} />
                                    <span>FILTERS</span>
                                </button>
                                <div style={{ position: 'relative' }}>
                                    <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} size={16} />
                                    <input type="text" placeholder="Search..." value={searchQuery}
                                        onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                        style={{ padding: '6px 10px 6px 32px', border: '1px solid #d1d5db', borderRadius: '4px', outline: 'none', fontSize: '14px' }}
                                    />
                                </div>
                            </div>
                            <Download onClick={handleDownloadCSV} size={20} color="#6b7280" cursor="pointer"/>
                        </div>

                        {/* Table */}
                        <div style={{ overflow: 'auto', flexGrow: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: COLORS.textDark }}>
                                <thead style={{ backgroundColor: COLORS.tableHeaderBg, position: 'sticky', top: 0, zIndex: 1 }}>
                                    <tr>
                                        {currentReportData.headers.map((header, idx) => (
                                        <th key={idx} onClick={() => handleSort(header)} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#495057', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none', borderBottom: '2px solid #dee2e6' }}>
                                            {header} {sortColumn === header && (sortDirection === 'asc' ? '↑' : '↓')}
                                        </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {premiumsTotal && (
                                         <tr style={{backgroundColor: COLORS.tableHeaderBg}}>
                                            <td style={{ padding: '10px 16px', fontWeight: '600'}}>Total of Detail Report</td>
                                            <td style={{ padding: '10px 16px', fontWeight: '600'}}>{premiumsTotal}</td>
                                            <td colSpan={currentReportData.headers.length - 2}></td>
                                        </tr>
                                    )}
                                    {paginatedData.map((row, rowIdx) => (
                                    <tr key={rowIdx} onClick={() => setSelectedRow(rowIdx)} style={{ borderBottom: `1px solid ${COLORS.mainBg}`, backgroundColor: selectedRow === rowIdx ? '#e9ecef' : 'transparent', cursor: 'pointer' }}>
                                        {row.map((cell, cellIdx) => (
                                        <td key={cellIdx} style={{ padding: '10px 16px', fontSize: '14px', whiteSpace: 'nowrap' }}>
                                            {cell}
                                        </td>
                                        ))}
                                    </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'end', borderTop: `1px solid ${COLORS.mainBg}`, color: '#495057', flexShrink: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                                    <span>Rows per page:</span>
                                    <select value={rowsPerPage} onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }} style={{ border: '1px solid #d1d5db', borderRadius: '4px', padding: '4px', backgroundColor: 'white' }}>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                    </select>
                                </div>
                                <span style={{ fontSize: '14px' }}>
                                {sortedData.length === 0 ? '0-0 of 0' : `${((currentPage - 1) * rowsPerPage) + 1}-${Math.min(currentPage * rowsPerPage, sortedData.length)} of ${sortedData.length}`}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}>
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} style={{ padding: '4px', border: 'none', backgroundColor: 'transparent', cursor: (currentPage === totalPages || totalPages === 0) ? 'not-allowed' : 'pointer', opacity: (currentPage === totalPages || totalPages === 0) ? 0.5 : 1 }}>
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ) : (
                        <div style={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d'}}>
                            <p>Select a job from the list on the left to view reports.</p>
                        </div>
                    )}
                </div>
                 {/* Footer */}
                <footer style={{ backgroundColor: COLORS.mainBg, textAlign: 'center', padding: '8px', flexShrink: 0, borderTop: `1px solid #e0e0e0` }}>
                    <p style={{ fontSize: '11px', color: '#6c757d' }}>Copyright © 2023 TriTech Software. All rights reserved. This firm is not a CPA firm.</p>
                </footer>
            </div>
          </div>
           <ContextMenu
            visible={contextMenu.visible}
            x={contextMenu.x}
            y={contextMenu.y}
            onDownloadAll={() => {
                if (contextMenu.jobId) {
                    handleDownloadAllReports(contextMenu.jobId);
                }
                handleCloseContextMenu();
            }}
            onDeleteJob={() => {
                if (contextMenu.jobId) {
                    handleDeleteJob(contextMenu.jobId);
                }
            }}
           />
        </>
      );
};

export default App;
