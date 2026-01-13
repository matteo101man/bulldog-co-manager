import * as XLSX from 'xlsx-js-style';
import { getCadetsByCompany } from './cadetService';
import { Cadet } from '../types';

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
