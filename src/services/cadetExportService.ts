import * as XLSX from 'xlsx-js-style';
import { getCadetsByCompany } from './cadetService';
import { Cadet, Company } from '../types';

/**
 * Export all cadet data to Excel
 * Creates a master list with all cadet information in alphabetical order
 */
export async function exportCadetData(): Promise<void> {
  try {
    // Get all cadets from Master list
    const cadets = await getCadetsByCompany('Master');
    
    // Sort cadets alphabetically by last name, then first name
    const sortedCadets = [...cadets].sort((a, b) => {
      const lastNameCompare = a.lastName.localeCompare(b.lastName);
      if (lastNameCompare !== 0) return lastNameCompare;
      return a.firstName.localeCompare(b.firstName);
    });
    
    // Create header row
    const headerRow = [
      'Last Name',
      'First Name',
      'Company',
      'MS Level',
      'Age',
      'Date of Birth',
      'Shirt Size',
      'Position',
      'Phone Number',
      'Email',
      'Contracted',
    ];
    
    // Create worksheet data
    const wsData: any[][] = [];
    wsData.push(headerRow);
    
    // Add cadet rows
    for (const cadet of sortedCadets) {
      const row = [
        cadet.lastName || '',
        cadet.firstName || '',
        cadet.company || '',
        cadet.militaryScienceLevel || '',
        cadet.age ?? '',
        cadet.dateOfBirth || '',
        cadet.shirtSize || '',
        cadet.position || '',
        cadet.phoneNumber || '',
        cadet.email || '',
        cadet.contracted || '',
      ];
      wsData.push(row);
    }
    
    // Add summary row
    wsData.push([]); // Empty row
    wsData.push(['Total Cadets:', sortedCadets.length]);
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Last Name
      { wch: 15 }, // First Name
      { wch: 20 }, // Company
      { wch: 10 }, // MS Level
      { wch: 8 },  // Age
      { wch: 12 }, // Date of Birth
      { wch: 10 }, // Shirt Size
      { wch: 15 }, // Position
      { wch: 15 }, // Phone Number
      { wch: 30 }, // Email
      { wch: 12 }, // Contracted
    ];
    
    // Apply styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    
    // Style header row
    for (let C = 0; C <= range.e.c; C++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[cellAddress]) continue;
      
      ws[cellAddress].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '4472C4' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };
    }
    
    // Style data rows
    for (let R = 1; R < wsData.length - 2; R++) {
      for (let C = 0; C <= range.e.c; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
        if (!ws[cellAddress]) continue;
        
        ws[cellAddress].s = {
          alignment: { vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'D9D9D9' } },
            bottom: { style: 'thin', color: { rgb: 'D9D9D9' } },
            left: { style: 'thin', color: { rgb: 'D9D9D9' } },
            right: { style: 'thin', color: { rgb: 'D9D9D9' } },
          },
        };
      }
    }
    
    // Style summary row
    const summaryRow = wsData.length - 1;
    const summaryCell = XLSX.utils.encode_cell({ r: summaryRow, c: 0 });
    if (ws[summaryCell]) {
      ws[summaryCell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
      };
    }
    const summaryValueCell = XLSX.utils.encode_cell({ r: summaryRow, c: 1 });
    if (ws[summaryValueCell]) {
      ws[summaryValueCell].s = {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
      };
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cadet Data');
    
    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `cadet_data_export_${dateStr}.xlsx`;
    
    // Write file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting cadet data:', error);
    throw error;
  }
}

/**
 * Export company roster organized by company
 * Creates a formatted roster with company headers, leadership, and cadet lists
 */
export async function exportCompanyRoster(): Promise<void> {
  try {
    // Get all cadets from Master list
    const allCadets = await getCadetsByCompany('Master');
    
    // Companies to include in the roster
    const companies: Company[] = ['Alpha', 'Bravo', 'Charlie', 'Ranger', 'Headquarters Company'];
    
    // Helper function to find leadership by position
    function findLeadership(cadets: Cadet[], positionKeywords: string[]): Cadet | null {
      return cadets.find(cadet => {
        const position = (cadet.position || '').toLowerCase().trim();
        return positionKeywords.some(keyword => {
          const keywordLower = keyword.toLowerCase();
          
          // For short codes like "1sg", "co", "csm", "bc", "xo", "s3", match as whole words only
          if (['1sg', 'co', 'csm', 'bc', 'xo', 's3'].includes(keywordLower)) {
            // Split position by common delimiters and check each word
            const words = position.split(/[\s,;|/]+/).map(w => w.trim()).filter(w => w);
            return words.includes(keywordLower);
          }
          
          // For longer phrases like "first sergeant" or "commanding officer", use includes
          return position.includes(keywordLower);
        });
      }) || null;
    }
    
    // Prepare worksheet data
    const wsData: any[][] = [];
    
    // Process each company
    for (const company of companies) {
      // Filter cadets for this company
      const companyCadets = allCadets
        .filter(c => c.company === company)
        .sort((a, b) => {
          const lastNameCompare = a.lastName.localeCompare(b.lastName);
          if (lastNameCompare !== 0) return lastNameCompare;
          return a.firstName.localeCompare(b.firstName);
        });
      
      if (companyCadets.length === 0) continue;
      
      // Handle Headquarters Company differently
      if (company === 'Headquarters Company') {
        // Add table header (bold)
        wsData.push(['Company', 'CSM', 'BC']);
        
        // Find CSM and BC
        const csm = findLeadership(companyCadets, ['csm', 'command sergeant major']);
        const bc = findLeadership(companyCadets, ['bc', 'battalion commander']);
        const xo = findLeadership(companyCadets, ['xo', 'executive officer']);
        const s3 = findLeadership(companyCadets, ['s3', 'operations officer']);
        
        // Add CSM/BC row (bold)
        wsData.push([
          'Headquarters',
          csm ? `${csm.lastName}` : '',
          bc ? `${bc.lastName}` : ''
        ]);
        
        // Add XO row (bold)
        wsData.push([
          'XO:',
          xo ? `${xo.lastName}` : '',
          ''
        ]);
        
        // Add S3 row (bold)
        wsData.push([
          'S3:',
          s3 ? `${s3.lastName}` : '',
          ''
        ]);
        
        // Get cadets excluding leadership
        const regularCadets = companyCadets.filter(c => 
          c.id !== csm?.id && 
          c.id !== bc?.id && 
          c.id !== xo?.id && 
          c.id !== s3?.id
        );
        
        // Distribute cadets across rows (3 columns) - not bold
        for (let i = 0; i < regularCadets.length; i += 3) {
          const row = [
            regularCadets[i]?.lastName || '',
            regularCadets[i + 1]?.lastName || '',
            regularCadets[i + 2]?.lastName || ''
          ];
          wsData.push(row);
        }
      } else {
        // Regular companies (Alpha, Bravo, Charlie, Ranger)
        // Add table header (bold)
        wsData.push(['Company', '1SG', 'CO:']);
        
        // Find 1SG and CO
        const firstSergeant = findLeadership(companyCadets, ['1sg', 'first sergeant', '1st sergeant']);
        const commandingOfficer = findLeadership(companyCadets, ['co', 'commanding officer', 'company commander']);
        
        // Add leadership row (bold)
        const companyLetter = company === 'Ranger' ? 'Ranger' : company.charAt(0);
        wsData.push([
          companyLetter,
          firstSergeant ? `${firstSergeant.lastName}` : '',
          commandingOfficer ? `${commandingOfficer.lastName}` : ''
        ]);
        
        // Get cadets excluding leadership
        const regularCadets = companyCadets.filter(c => 
          c.id !== firstSergeant?.id && c.id !== commandingOfficer?.id
        );
        
        // Distribute cadets across rows (3 columns) - not bold
        for (let i = 0; i < regularCadets.length; i += 3) {
          const row = [
            regularCadets[i]?.lastName || '',
            regularCadets[i + 1]?.lastName || '',
            regularCadets[i + 2]?.lastName || ''
          ];
          wsData.push(row);
        }
      }
      
      // Add spacing between companies
      wsData.push([]);
      wsData.push([]);
    }
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Company column
      { wch: 20 }, // 1SG column
      { wch: 20 }, // CO column
    ];
    
    // Apply styling
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    let currentRow = 0;
    
    for (const company of companies) {
      const companyCadets = allCadets.filter(c => c.company === company);
      if (companyCadets.length === 0) continue;
      
      // Style table header row (bold)
      for (let C = 0; C < 3; C++) {
        const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: C });
        if (ws[cellAddress]) {
          ws[cellAddress].s = {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
              top: { style: 'thin', color: { rgb: '000000' } },
              bottom: { style: 'thin', color: { rgb: '000000' } },
              left: { style: 'thin', color: { rgb: '000000' } },
              right: { style: 'thin', color: { rgb: '000000' } },
            },
          };
        }
      }
      currentRow++;
      
      if (company === 'Headquarters Company') {
        // Headquarters Company: CSM/BC row, XO row, S3 row (all bold)
        const csm = findLeadership(companyCadets, ['csm', 'command sergeant major']);
        const bc = findLeadership(companyCadets, ['bc', 'battalion commander']);
        const xo = findLeadership(companyCadets, ['xo', 'executive officer']);
        const s3 = findLeadership(companyCadets, ['s3', 'operations officer']);
        const regularCadets = companyCadets.filter(c => 
          c.id !== csm?.id && 
          c.id !== bc?.id && 
          c.id !== xo?.id && 
          c.id !== s3?.id
        );
        
        // Style CSM/BC row (bold)
        for (let C = 0; C < 3; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true },
              alignment: { vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            };
          }
        }
        currentRow++;
        
        // Style XO row (bold)
        for (let C = 0; C < 3; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true },
              alignment: { vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            };
          }
        }
        currentRow++;
        
        // Style S3 row (bold)
        for (let C = 0; C < 3; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true },
              alignment: { vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            };
          }
        }
        currentRow++;
        
        // Style regular cadet rows (not bold)
        const cadetRows = Math.ceil(regularCadets.length / 3);
        for (let R = 0; R < cadetRows; R++) {
          for (let C = 0; C < 3; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow + R, c: C });
            if (ws[cellAddress]) {
              ws[cellAddress].s = {
                alignment: { vertical: 'center' },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } },
                },
              };
            }
          }
        }
        
        currentRow += cadetRows + 2; // Move past cadet rows and spacing rows
      } else {
        // Regular companies
        const firstSergeant = findLeadership(companyCadets, ['1sg', 'first sergeant', '1st sergeant']);
        const commandingOfficer = findLeadership(companyCadets, ['co', 'commanding officer', 'company commander']);
        const regularCadets = companyCadets.filter(c => 
          c.id !== firstSergeant?.id && c.id !== commandingOfficer?.id
        );
        
        // Style leadership row (bold)
        for (let C = 0; C < 3; C++) {
          const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: C });
          if (ws[cellAddress]) {
            ws[cellAddress].s = {
              font: { bold: true },
              alignment: { vertical: 'center' },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            };
          }
        }
        currentRow++;
        
        // Style regular cadet rows (not bold)
        const cadetRows = Math.ceil(regularCadets.length / 3);
        for (let R = 0; R < cadetRows; R++) {
          for (let C = 0; C < 3; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: currentRow + R, c: C });
            if (ws[cellAddress]) {
              ws[cellAddress].s = {
                alignment: { vertical: 'center' },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } },
                },
              };
            }
          }
        }
        
        currentRow += cadetRows + 2; // Move past cadet rows and spacing rows
      }
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Company Roster');
    
    // Generate filename with current date
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const filename = `company_roster_${dateStr}.xlsx`;
    
    // Write file
    XLSX.writeFile(wb, filename);
  } catch (error) {
    console.error('Error exporting company roster:', error);
    throw error;
  }
}
