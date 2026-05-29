import * as XLSX from 'xlsx';

export interface CSVData {
  [key: string]: string | number;
}

export const fetchCSVData = async (url: string, sheetName: string = 'Update MTS POK', rowOffset: number = 0): Promise<CSVData[]> => {
  try {
    // If user provides a base pub URL, ensure we fetch as XLSX to access multiple sheets
    const fetchUrl = url.replace('output=csv', 'output=xlsx');
    const response = await fetch(fetchUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse workbook
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Specifically extract requested sheet
    const targetSheetName = sheetName;
    const worksheet = workbook.Sheets[targetSheetName];
    
    if (!worksheet) {
      throw new Error(`Sheet "${targetSheetName}" not found.`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '', range: rowOffset }) as CSVData[];
    return jsonData;
  } catch (error) {
    console.error('Error fetching/parsing Data:', error);
    throw error;
  }
};
