import { shareAsync } from 'expo-sharing';
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { RecordDetail } from '../components/types';
import { Platform, Alert } from 'react-native';

// Generate and share PDF
export const generateAndSharePDF = async (record: RecordDetail, includeRates: boolean = true): Promise<void> => {
  try {
    const htmlContent = buildDailyWorkSummaryHtml(record, includeRates);
    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (uri) {
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Daily Work Summary',
      });
    }
  } catch (error) {
    console.error('Error generating and sharing PDF:', error);
    throw error;
  }
};

// Generate and download PDF to device
export const generateAndDownloadPDF = async (record: RecordDetail, includeRates: boolean = true): Promise<void> => {
  try {
    const htmlContent = buildDailyWorkSummaryHtml(record, includeRates);
    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (!uri) {
      throw new Error('Failed to generate PDF');
    }

    // Generate a filename with date and job number
    const sanitizedJobNumber = (record.jobNumber || 'Unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedDate = (record.date || new Date().toISOString().split('T')[0]).replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `DailyWorkSummary_${sanitizedJobNumber}_${sanitizedDate}.pdf`;

    if (Platform.OS === 'android') {
      // On Android, try to save using MediaLibrary with proper error handling
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable media library access to download PDFs to your device.',
            [{ text: 'OK' }]
          );
          return;
        }

        // Save the original PDF file to the device's Downloads
        await MediaLibrary.saveToLibraryAsync(uri);
        
        Alert.alert(
          'PDF Downloaded', 
          `Daily Work Summary has been saved to your Downloads folder.\n\nFile: ${filename}`,
          [{ text: 'OK' }]
        );
      } catch (error) {
        console.error('Android MediaLibrary save failed:', error);
        // Fallback: copy to app documents directory
        await saveToAppDocuments(uri, filename);
      }
    } else {
      // On iOS, save to app documents directory and show success message
      await saveToAppDocuments(uri, filename);
    }
  } catch (error) {
    console.error('Error generating and downloading PDF:', error);
    throw error;
  }
};

// Helper function to save to app's documents directory
const saveToAppDocuments = async (sourceUri: string, filename: string): Promise<void> => {
  try {
    const documentsDirectory = FileSystem.documentDirectory;
    if (!documentsDirectory) {
      throw new Error('Documents directory not available');
    }
    
    const downloadPath = documentsDirectory + filename;
    await FileSystem.copyAsync({ from: sourceUri, to: downloadPath });
    
    Alert.alert(
      'PDF Downloaded', 
      Platform.OS === 'ios'
        ? `Daily Work Summary has been saved to the app's Documents folder.\n\nFile: ${filename}\n\nYou can access it through the Files app.`
        : `Daily Work Summary has been saved locally.\n\nFile: ${filename}`,
      [{ text: 'OK' }]
    );
  } catch (error) {
    console.error('App documents save failed:', error);
    throw new Error('Failed to save PDF to device');
  }
};

// Legacy function for backward compatibility
export const generatePDFFromRecord = generateAndSharePDF;

function buildDailyWorkSummaryHtml(record: RecordDetail, includeRates: boolean = true): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Daily Work Summary</title>
        <style>
          @page { size: A4; margin: 24mm 18mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #000;
            margin: 0;
          }
          .page { width: 100%; }

          /* Header */
          .header {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 16px;
            align-items: stretch;
            margin-bottom: 18px;
          }
          .brand {
            display: grid;
            grid-template-columns: 56px 1fr;
            align-items: center;
            gap: 10px;
            border: 1px solid #c9ccd1;
            padding: 10px 12px;
          }
          .brand-logo {
            width: 56px; height: 56px;
            border-radius: 4px;
            background: linear-gradient(135deg, #5f666f, #b5b8bd);
          }
          .brand-name {
            display: grid;
            gap: 6px;
          }
          .brand-line-1 { font-weight: 700; letter-spacing: 2px; font-size: 14px; text-transform: uppercase; }
          .brand-line-2 { font-weight: 700; letter-spacing: 2px; font-size: 18px; text-transform: uppercase; }

          .title-block {
            border: 1px solid #c9ccd1;
            padding: 10px 12px 6px 12px;
          }
          .doc-title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 10px 0; }
          .meta-grid { display: grid; grid-template-columns: 120px 1fr; row-gap: 6px; column-gap: 12px; }
          .meta-label { font-weight: 700; text-transform: uppercase; font-size: 12px; color: #111; }
          .meta-value { font-weight: 600; font-size: 12px; color: #000; }

          /* Section header */
          .section-header {
            background: #e6e7ea;
            color: #000;
            font-weight: 800;
            text-transform: uppercase;
            padding: 8px 10px;
            border: 1px solid #c9ccd1;
            margin-top: 16px;
          }

          /* Table base */
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #c9ccd1; padding: 8px 10px; font-size: 12px; }
          th { background: #e6e7ea; text-transform: uppercase; font-weight: 800; color: #000; }
          td { font-weight: 600; color: #000; }
          td.num, th.num { text-align: right; }

          /* Totals rows */
          .totals-row td { font-weight: 800; }

          /* Activities */
          .activities {
            border: 1px solid #c9ccd1;
            border-top: none;
            padding: 12px;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre-wrap;
          }

          /* Footer spacing for last table */
          .mb-16 { margin-bottom: 16px; }

          /* Images section */
          .images-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .image-container {
            border: 1px solid #c9ccd1;
            padding: 8px;
            text-align: center;
          }
          .site-image {
            width: 100%;
            max-width: 200px;
            height: auto;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .image-caption {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            line-height: 1.2;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <div class="brand-logo"></div>
              <div class="brand-name">
                <div class="brand-line-1">Qualis</div>
                <div class="brand-line-2">Concrete</div>
              </div>
            </div>
            <div class="title-block">
              <div class="doc-title">Daily Work Summary</div>
              <div class="meta-grid">
                <div class="meta-label">Date:</div>
                <div class="meta-value">${escapeHtml(record.date || '')}</div>
                <div class="meta-label">Job</div>
                <div class="meta-value">${escapeHtml(record.jobNumber || '')}</div>
              </div>
            </div>
          </div>

          <div class="section-header">Labor</div>
          ${renderLaborTable(record, includeRates)}

          <div class="section-header">Subcontractors</div>
          ${renderSubcontractorTable(record)}

          <div class="section-header">Daily Activities</div>
          <div class="activities">${escapeHtml(record.dailyActivities || 'No activities recorded')}</div>

          <div class="section-header">Materials Deliveries</div>
          ${renderMaterialsTable(record, includeRates)}

          <div class="section-header">Equipment</div>
          ${renderEquipmentTable(record, includeRates)}

          ${record.images && record.images.length > 0 ? `
            <div class="section-header">Site Photos</div>
            <div class="images-grid">
              ${record.images.map((image, index) => `
                <div class="image-container">
                  <img src="${image.url || image.presignedUrl || ''}" alt="Site Photo ${index + 1}" class="site-image" />
                  <div class="image-caption">
                    ${image.original_name || image.originalName || `Photo ${index + 1}`}
                    ${image.customMetadata?.caption ? ` - ${escapeHtml(image.customMetadata.caption)}` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// LABOR TABLE
function renderLaborTable(record: RecordDetail, includeRates: boolean = true): string {
  const rows: Array<{ title: string; data: any }> = [
    { title: 'Manager', data: record.laborData?.manager },
    { title: 'Foreman', data: record.laborData?.foreman },
    { title: 'Carpenter', data: record.laborData?.carpenter },
    { title: 'Skill Laborer', data: record.laborData?.skillLaborer },
    { title: 'Carpenter Extra', data: record.laborData?.carpenterExtra },
  ];

  const body = rows
    .map(({ title, data }) => {
      // Add null/undefined checks for data object
      const safeData = data || {};
      return `
        <tr>
          <td>${escapeHtml(title)}</td>
          <td class="num">${escapeHtml(safeData.startTime || '')}</td>
          <td class="num">${escapeHtml(safeData.finishTime || '')}</td>
          <td class="num">${escapeHtml(safeData.hours ?? '')}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.rate ?? '') : '-')}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.total ?? '') : '-')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="mb-16">
      <thead>
        <tr>
          <th>Labor</th>
          <th class="num">Start Time</th>
          <th class="num">Finish Time</th>
          <th class="num">Hrs</th>
          <th class="num">Rate</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr class="totals-row">
          <td colspan="5">Total</td>
          <td class="num">${includeRates ? computeColumnTotal(rows.map(r => r.data?.total || '')) : '-'}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// SUBCONTRACTORS TABLE
function renderSubcontractorTable(record: RecordDetail): string {
  const subcontractor = record.subcontractors?.superiorTeamRebar || {};
  return `
    <table class="mb-16">
      <thead>
        <tr>
          <th>Subcontractors</th>
          <th class="num">No of Employees</th>
          <th class="num">Hours</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Superior Team Rebar</td>
          <td class="num">${escapeHtml(String(subcontractor.employees || 0))}</td>
          <td class="num">${escapeHtml(String(subcontractor.hours || 0))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// MATERIALS TABLE
function renderMaterialsTable(record: RecordDetail, includeRates: boolean = true): string {
  const items = [
    { name: 'Argos Class 4 4500 PSI concrete', data: record.materialsDeliveries?.argosClass4 },
    { name: 'Expansion Joint material', data: record.materialsDeliveries?.expansionJoint },
  ];

  const body = items
    .map(({ name, data }) => {
      const safeData = data || {};
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td class="num">${escapeHtml(safeData.qty || '')}</td>
          <td>${escapeHtml(safeData.uom || '')}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.unitRate ?? '') : '-')}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.tax ?? '') : '-')}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.total ?? '') : '-')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table class="mb-16">
      <thead>
        <tr>
          <th>Materials Deliveries</th>
          <th class="num">Qty</th>
          <th>UoM</th>
          <th class="num">Unit Rate</th>
          <th class="num">Tax</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr class="totals-row">
          <td colspan="5">Totals</td>
          <td class="num">${includeRates ? computeColumnTotal(items.map(i => i.data?.total || '')) : '-'}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// EQUIPMENT TABLE
function renderEquipmentTable(record: RecordDetail, includeRates: boolean = true): string {
  const items = [
    { name: 'Truck', data: record.equipment?.truck },
    { name: '14k EQUIPMENT TRAILER', data: record.equipment?.equipmentTrailer },
    { name: 'Fuel', data: record.equipment?.fuel },
    { name: 'Mini Excavator with Basket', data: record.equipment?.miniExcavator },
    { name: '12 ft closed tool trailer', data: record.equipment?.closedToolTrailer },
    { name: 'Skid Stir', data: record.equipment?.skidStir },
  ];

  const body = items
    .map(({ name, data }) => {
      const safeData = data || {};
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td class="num">${escapeHtml(String(safeData.days ?? ''))}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.monthlyRate ?? '') : '-')}</td>
          <td class="num">${escapeHtml(includeRates ? (safeData.itemRate ?? '') : '-')}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <table>
      <thead>
        <tr>
          <th>Equipment</th>
          <th class="num">No.of Days</th>
          <th class="num">Monthly Rate</th>
          <th class="num">Item rate</th>
        </tr>
      </thead>
      <tbody>
        ${body}
        <tr class="totals-row">
          <td colspan="3">Totals</td>
          <td class="num">${includeRates ? computeColumnTotal(items.map(i => i.data?.itemRate || '')) : '-'}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// UTIL
function computeColumnTotal(values: Array<string | number | undefined | null>): string {
  let sum = 0;
  let hasNumeric = false;
  for (const v of values) {
    const n = toNumber(v);
    if (!Number.isNaN(n)) {
      sum += n;
      hasNumeric = true;
    }
  }
  return hasNumeric ? formatCurrency(sum) : '-';
}

function toNumber(value: any): number {
  if (value === undefined || value === null) return NaN;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // strip non-numeric (keep dots and minus)
    const cleaned = value.replace(/[^0-9.-]/g, '');
    return cleaned ? Number(cleaned) : NaN;
  }
  return NaN;
}

function formatCurrency(n: number): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}
