/**
 * PDS (Planetary Data System) Label and Tabular Data Parser
 *
 * Implements standard PDS3 label parsing to read column definitions (name, start byte,
 * bytes, data type, units) dynamically instead of hardcoding column offsets.
 * Derived from NASA Planetary Data System Standards Reference.
 */

export interface PdsColumnDef {
  name: string;
  columnNumber: number;
  startByte?: number;
  bytes?: number;
  dataType: string;
  units?: string;
  description?: string;
}

export interface PdsLabelDef {
  tableName?: string;
  interchangeFormat: 'ASCII' | 'BINARY';
  delimiter?: string; // e.g. ',' for CSV
  rows?: number;
  rowBytes?: number;
  columns: PdsColumnDef[];
}

export interface ParsedRoverRecord {
  sol: number;
  site?: number;
  drive?: number;
  lat: number;
  lonE: number;
  elevationM: number | null;
  odometryM?: number;
  rmc?: string;
  raw?: Record<string, string | number | null>;
}

/**
 * Parses a PDS3 detached or inline label (.lbl) file content
 */
export function parsePdsLabel(labelContent: string): PdsLabelDef {
  const lines = labelContent.split(/\r?\n/);
  const columns: PdsColumnDef[] = [];
  let inColumnBlock = false;
  let currentColumn: Partial<PdsColumnDef> = {};
  let interchangeFormat: 'ASCII' | 'BINARY' = 'ASCII';
  let delimiter: string | undefined = undefined;
  let rows: number | undefined = undefined;
  let rowBytes: number | undefined = undefined;
  let tableName: string | undefined = undefined;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    // Strip comments
    const line = rawLine.replace(/\/\*.*?\*\//g, '').trim();
    if (!line) continue;

    if (line.startsWith('OBJECT') && line.includes('TABLE')) {
      const match = line.match(/OBJECT\s*=\s*([A-Za-z0-9_]+)/i);
      if (match) tableName = match[1];
    } else if (line.startsWith('INTERCHANGE_FORMAT')) {
      const match = line.match(/INTERCHANGE_FORMAT\s*=\s*([A-Za-z0-9_]+)/i);
      if (match && match[1].toUpperCase() === 'BINARY') {
        interchangeFormat = 'BINARY';
      }
    } else if (line.startsWith('ROW_FORMAT') || line.startsWith('DELIMITER_TYPE')) {
      if (line.includes('COMMA') || line.includes('CSV')) {
        delimiter = ',';
      } else if (line.includes('TAB')) {
        delimiter = '\t';
      }
    } else if (line.startsWith('ROWS')) {
      const match = line.match(/ROWS\s*=\s*(\d+)/i);
      if (match) rows = parseInt(match[1], 10);
    } else if (line.startsWith('ROW_BYTES')) {
      const match = line.match(/ROW_BYTES\s*=\s*(\d+)/i);
      if (match) rowBytes = parseInt(match[1], 10);
    } else if (line === 'OBJECT = COLUMN' || line.startsWith('OBJECT = COLUMN')) {
      inColumnBlock = true;
      currentColumn = {};
    } else if (inColumnBlock) {
      if (line === 'END_OBJECT = COLUMN' || line.startsWith('END_OBJECT = COLUMN')) {
        inColumnBlock = false;
        if (currentColumn.name) {
          columns.push({
            name: currentColumn.name,
            columnNumber: currentColumn.columnNumber ?? columns.length + 1,
            startByte: currentColumn.startByte,
            bytes: currentColumn.bytes,
            dataType: currentColumn.dataType || 'CHARACTER',
            units: currentColumn.units,
            description: currentColumn.description
          });
        }
      } else {
        const [key, ...valParts] = line.split('=');
        if (key && valParts.length > 0) {
          const k = key.trim().toUpperCase();
          const v = valParts.join('=').trim().replace(/^["']|["']$/g, '');
          if (k === 'NAME') currentColumn.name = v.toUpperCase();
          else if (k === 'COLUMN_NUMBER') currentColumn.columnNumber = parseInt(v, 10);
          else if (k === 'START_BYTE') currentColumn.startByte = parseInt(v, 10);
          else if (k === 'BYTES') currentColumn.bytes = parseInt(v, 10);
          else if (k === 'DATA_TYPE') currentColumn.dataType = v.toUpperCase();
          else if (k === 'UNIT' || k === 'UNITS') currentColumn.units = v;
          else if (k === 'DESCRIPTION') currentColumn.description = v;
        }
      }
    }
  }

  // Sort columns by columnNumber or startByte
  columns.sort((a, b) => {
    if (a.startByte !== undefined && b.startByte !== undefined) {
      return a.startByte - b.startByte;
    }
    return a.columnNumber - b.columnNumber;
  });

  return {
    tableName,
    interchangeFormat,
    delimiter,
    rows,
    rowBytes,
    columns
  };
}

/**
 * Parses fixed-width or delimited PDS table data according to the parsed label
 */
export function parsePdsTable(tableData: string, label: PdsLabelDef): Record<string, string | number | null>[] {
  const lines = tableData.split(/\r?\n/).filter(l => l.trim().length > 0);
  const records: Record<string, string | number | null>[] = [];

  for (const line of lines) {
    if (line.startsWith('#') || line.startsWith('/*')) continue;
    const rowRecord: Record<string, string | number | null> = {};

    if (label.delimiter) {
      // Delimited (CSV or Tab)
      const tokens = line.split(label.delimiter).map(t => t.trim().replace(/^["']|["']$/g, ''));
      label.columns.forEach((col, idx) => {
        const valStr = tokens[idx];
        rowRecord[col.name] = castPdsValue(valStr, col.dataType);
      });
    } else {
      // Fixed-width format using START_BYTE and BYTES
      for (const col of label.columns) {
        if (col.startByte !== undefined && col.bytes !== undefined) {
          const start = col.startByte - 1; // 1-indexed to 0-indexed
          const rawSlice = line.substring(start, start + col.bytes).trim();
          rowRecord[col.name] = castPdsValue(rawSlice, col.dataType);
        }
      }
    }

    if (Object.keys(rowRecord).length > 0) {
      records.push(rowRecord);
    }
  }

  return records;
}

function castPdsValue(raw: string | undefined, dataType: string): string | number | null {
  if (raw === undefined || raw === '' || raw === 'NULL' || raw === '-9999' || raw === '-9999.0') {
    return null;
  }
  const dt = dataType.toUpperCase();
  if (dt.includes('INT')) {
    const val = parseInt(raw, 10);
    return isNaN(val) ? null : val;
  }
  if (dt.includes('REAL') || dt.includes('FLOAT') || dt.includes('DOUBLE')) {
    const val = parseFloat(raw);
    return isNaN(val) ? null : val;
  }
  return raw;
}

/**
 * Extracts and normalizes rover tracking fields from parsed PDS records
 */
export function extractRoverRecords(rawRecords: Record<string, string | number | null>[]): ParsedRoverRecord[] {
  const result: ParsedRoverRecord[] = [];

  for (const rec of rawRecords) {
    // Sol extraction
    const solVal = rec['SOL'] ?? rec['MISSION_SOL'] ?? rec['PLANETARY_SOL'];
    const sol = typeof solVal === 'number' ? solVal : solVal ? parseInt(String(solVal), 10) : 0;

    // Site and drive
    const siteVal = rec['SITE'] ?? rec['SITE_ID'];
    const site = typeof siteVal === 'number' ? siteVal : siteVal ? parseInt(String(siteVal), 10) : undefined;
    const driveVal = rec['DRIVE'] ?? rec['DRIVE_ID'];
    const drive = typeof driveVal === 'number' ? driveVal : driveVal ? parseInt(String(driveVal), 10) : undefined;

    // Coordinates: LATITUDE / LONGITUDE
    const latVal = rec['LATITUDE'] ?? rec['LAT'] ?? rec['PLANETOCENTRIC_LATITUDE'];
    const lonVal = rec['LONGITUDE'] ?? rec['LON'] ?? rec['EAST_LONGITUDE'] ?? rec['PLANETOCENTRIC_LONGITUDE'];
    if (latVal === null || latVal === undefined || lonVal === null || lonVal === undefined) {
      continue;
    }
    const lat = typeof latVal === 'number' ? latVal : parseFloat(String(latVal));
    let lon = typeof lonVal === 'number' ? lonVal : parseFloat(String(lonVal));
    if (isNaN(lat) || isNaN(lon)) continue;

    // Normalize East-positive 0..360
    let lonE = lon;
    if (lonE < 0) lonE = ((lonE % 360) + 360) % 360;

    // Elevation
    const elevVal = rec['ELEVATION'] ?? rec['ELEV'] ?? rec['AREOID_ELEVATION'] ?? rec['ALTITUDE'];
    const elevationM = typeof elevVal === 'number' ? elevVal : elevVal ? parseFloat(String(elevVal)) : null;

    // Odometry
    const odomVal = rec['ODOMETRY'] ?? rec['DISTANCE'] ?? rec['TOTAL_ODOMETRY'];
    const odometryM = typeof odomVal === 'number' ? odomVal : odomVal ? parseFloat(String(odomVal)) : undefined;

    result.push({
      sol,
      site,
      drive,
      lat,
      lonE,
      elevationM: elevationM !== null && !isNaN(elevationM) ? elevationM : null,
      odometryM: odometryM !== undefined && !isNaN(odometryM) ? odometryM : undefined,
      raw: rec
    });
  }

  // Sort strictly by sol, then site, then drive
  result.sort((a, b) => {
    if (a.sol !== b.sol) return a.sol - b.sol;
    if (a.site !== undefined && b.site !== undefined && a.site !== b.site) {
      return a.site - b.site;
    }
    if (a.drive !== undefined && b.drive !== undefined) {
      return a.drive - b.drive;
    }
    return 0;
  });

  return result;
}
