import { shareAsync } from 'expo-sharing';
import * as Print from 'expo-print';
import { RecordDetail } from '../components/types';
import { Platform } from 'react-native';

export const generatePDFFromRecord = async (record: RecordDetail): Promise<void> => {
  try {
    const htmlContent = buildDailyWorkSummaryHtml(record);

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (uri) {
      await shareAsync(uri);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};

function buildDailyWorkSummaryHtml(record: RecordDetail): string {
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
          ${renderLaborTable(record)}

          <div class="section-header">Subcontractors</div>
          ${renderSubcontractorTable(record)}

          <div class="section-header">Daily Activities</div>
          <div class="activities">${escapeHtml(record.dailyActivities || '')}</div>

          <div class="section-header">Materials Deliveries</div>
          ${renderMaterialsTable(record)}

          <div class="section-header">Equipment</div>
          ${renderEquipmentTable(record)}
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
function renderLaborTable(record: RecordDetail): string {
  const rows: Array<{ title: string; data: any }> = [
    { title: 'Manager', data: record.laborData.manager },
    { title: 'Foreman', data: record.laborData.foreman },
    { title: 'Carpenter', data: record.laborData.carpenter },
    { title: 'Skill Laborer', data: record.laborData.skillLaborer },
    { title: 'Carpenter', data: record.laborData.carpenterExtra },
  ];

  const body = rows
    .map(({ title, data }) => `
      <tr>
        <td>${escapeHtml(title)}</td>
        <td class="num">${escapeHtml(data.startTime || '')}</td>
        <td class="num">${escapeHtml(data.finishTime || '')}</td>
        <td class="num">${escapeHtml(data.hours ?? '')}</td>
        <td class="num">${escapeHtml(data.rate ?? '')}</td>
        <td class="num">${escapeHtml(data.total ?? '')}</td>
      </tr>
    `)
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
          <td class="num">${computeColumnTotal(rows.map(r => r.data.total))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// SUBCONTRACTORS TABLE
function renderSubcontractorTable(record: RecordDetail): string {
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
          <td class="num">${escapeHtml(String(record.subcontractors.superiorTeamRebar.employees))}</td>
          <td class="num">${escapeHtml(String(record.subcontractors.superiorTeamRebar.hours))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// MATERIALS TABLE
function renderMaterialsTable(record: RecordDetail): string {
  const items = [
    { name: 'Argos Class 4 4500 PSI concrete', data: record.materialsDeliveries.argosClass4 },
    { name: 'Expansion Joint material', data: record.materialsDeliveries.expansionJoint },
  ];

  const body = items
    .map(({ name, data }) => `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td class="num">${escapeHtml(data.qty || '')}</td>
        <td>${escapeHtml(data.uom || '')}</td>
        <td class="num">${escapeHtml(data.unitRate ?? '')}</td>
        <td class="num">${escapeHtml(data.tax ?? '')}</td>
        <td class="num">${escapeHtml(data.total ?? '')}</td>
      </tr>
    `)
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
          <td class="num">${computeColumnTotal(items.map(i => i.data.total))}</td>
        </tr>
      </tbody>
    </table>
  `;
}

// EQUIPMENT TABLE
function renderEquipmentTable(record: RecordDetail): string {
  const items = [
    { name: 'Truck', data: record.equipment.truck },
    { name: '14k EQUIPMENT TRAILER', data: record.equipment.equipmentTrailer },
    { name: 'Fuel', data: record.equipment.fuel },
    { name: 'Mini Excavator with Basket', data: record.equipment.miniExcavator },
    { name: '12 ft closed tool trailer', data: record.equipment.closedToolTrailer },
    { name: 'Skid Stir', data: record.equipment.skidStir },
  ];

  const body = items
    .map(({ name, data }) => `
      <tr>
        <td>${escapeHtml(name)}</td>
        <td class="num">${escapeHtml(String(data.days ?? ''))}</td>
        <td class="num">${escapeHtml(data.monthlyRate ?? '')}</td>
        <td class="num">${escapeHtml(data.itemRate ?? '')}</td>
      </tr>
    `)
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
          <td class="num">${computeColumnTotal(items.map(i => i.data.itemRate))}</td>
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
