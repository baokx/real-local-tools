/**
 * Minimal JPEG EXIF parser — no dependencies.
 * Reads the APP1 Exif segment, walks IFD0 / ExifIFD / GPSIFD and returns
 * human-readable entries for the common tags. Unsupported or missing data
 * is skipped silently; non-JPEG input yields null.
 */

export interface ExifEntry {
  tag: string;
  value: string;
}

export interface ExifResult {
  entries: ExifEntry[];
  /** Decimal-degree GPS coordinate when present. */
  gps?: { lat: number; lon: number };
}

const TYPE_SIZES: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8,
};

const IFD0_TAGS: Record<number, string> = {
  0x010e: 'ImageDescription',
  0x010f: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x8298: 'Copyright',
  0x013b: 'Artist',
};

const EXIF_TAGS: Record<number, string> = {
  0x829a: 'ExposureTime',
  0x829d: 'FNumber',
  0x8822: 'ExposureProgram',
  0x8827: 'ISO',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x9204: 'ExposureBias',
  0x9207: 'MeteringMode',
  0x9209: 'Flash',
  0x920a: 'FocalLength',
  0xa002: 'PixelXDimension',
  0xa003: 'PixelYDimension',
  0xa405: 'FocalLengthIn35mm',
  0xa431: 'BodySerialNumber',
  0xa433: 'LensMake',
  0xa434: 'LensModel',
};

const ORIENTATIONS: Record<number, string> = {
  1: '1 (Normal)', 2: '2 (Mirrored)', 3: '3 (180°)', 4: '4 (Mirrored 180°)',
  5: '5 (Mirrored 90° CW)', 6: '6 (90° CW)', 7: '7 (Mirrored 90° CCW)', 8: '8 (90° CCW)',
};

const FLASH: Record<number, string> = {
  0x00: 'No flash', 0x01: 'Flash fired', 0x05: 'Flash fired, no return',
  0x07: 'Flash fired, return detected', 0x10: 'Flash did not fire (compulsory off)',
  0x18: 'Flash auto, did not fire', 0x19: 'Flash auto, fired',
};

class TiffReader {
  private view: DataView;
  private little: boolean;

  constructor(buffer: ArrayBuffer, offset: number) {
    this.view = new DataView(buffer, offset);
    const order = this.view.getUint16(0);
    this.little = order === 0x4949; // "II"
    if (!this.little && order !== 0x4d4d) throw new Error('Bad byte order');
    if (this.view.getUint16(2, this.little) !== 42) throw new Error('Bad TIFF magic');
  }

  u16(o: number) { return this.view.getUint16(o, this.little); }
  u32(o: number) { return this.view.getUint32(o, this.little); }
  i32(o: number) { return this.view.getInt32(o, this.little); }

  get firstIfdOffset(): number { return this.u32(4); }

  private ascii(o: number, count: number): string {
    let out = '';
    for (let i = 0; i < count - 1; i++) out += String.fromCharCode(this.view.getUint8(o + i));
    return out.replace(/[^\x20-\x7e]/g, '').trim();
  }

  private rational(o: number): number {
    const d = this.u32(o + 4);
    return d === 0 ? 0 : this.u32(o) / d;
  }

  readIfd(offset: number, tags: Record<number, string>, out: ExifEntry[]): { exifPtr: number; gpsPtr: number } {
    let exifPtr = 0, gpsPtr = 0;
    const count = this.u16(offset);
    for (let i = 0; i < count; i++) {
      const base = offset + 2 + i * 12;
      const tag = this.u16(base);
      const type = this.u16(base + 2);
      const num = this.u32(base + 4);
      const size = TYPE_SIZES[type];
      if (!size) continue;
      const inline = num * size <= 4;
      const valueAt = inline ? base + 8 : this.u32(base + 8);

      if (tag === 0x8769) { exifPtr = this.u32(base + 8); continue; }
      if (tag === 0x8825) { gpsPtr = this.u32(base + 8); continue; }

      const name = tags[tag];
      if (!name) continue;

      let value = '';
      if (type === 2) {
        value = this.ascii(valueAt, num);
      } else if (type === 3) {
        value = String(this.u16(valueAt));
      } else if (type === 4) {
        value = String(this.u32(valueAt));
      } else if (type === 5) {
        value = String(Math.round(this.rational(valueAt) * 1000) / 1000);
      } else if (type === 9 || type === 10) {
        const raw = type === 9 ? this.i32(valueAt) : this.rational(valueAt);
        value = String(Math.round(raw * 1000) / 1000);
      } else {
        continue;
      }

      // Pretty-print a few well-known numeric tags.
      if (tag === 0x0112) value = ORIENTATIONS[Number(value)] ?? value;
      else if (tag === 0x9209) value = FLASH[Number(value)] ?? `Code ${value}`;
      else if (tag === 0x829a && type === 5) {
        const r = this.rational(valueAt);
        value = r >= 1 ? `${r} s` : `1/${Math.round(1 / r)} s`;
      } else if (tag === 0x829d && type === 5) {
        value = `f/${Math.round(this.rational(valueAt) * 10) / 10}`;
      } else if ((tag === 0x920a || tag === 0xa405) && type === 5) {
        value = `${Math.round(this.rational(valueAt) * 10) / 10} mm`;
      } else if (tag === 0x9204 && (type === 10 || type === 5)) {
        const r = this.rational(valueAt);
        value = `${r >= 0 ? '+' : ''}${Math.round(r * 10) / 10} EV`;
      }

      if (value) out.push({ tag: name, value });
    }
    return { exifPtr, gpsPtr };
  }

  readGps(offset: number): { lat: number; lon: number } | undefined {
    const count = this.u16(offset);
    let latRef = 'N', lonRef = 'E';
    let lat: number[] = [], lon: number[] = [];
    for (let i = 0; i < count; i++) {
      const base = offset + 2 + i * 12;
      const tag = this.u16(base);
      const type = this.u16(base + 2);
      const num = this.u32(base + 4);
      const valueAt = num * (TYPE_SIZES[type] ?? 1) <= 4 ? base + 8 : this.u32(base + 8);
      if (tag === 0x0001) latRef = this.ascii(valueAt, num);
      else if (tag === 0x0003) lonRef = this.ascii(valueAt, num);
      else if (tag === 0x0002 && type === 5) {
        lat = [0, 1, 2].map((k) => this.rational(valueAt + k * 8));
      } else if (tag === 0x0004 && type === 5) {
        lon = [0, 1, 2].map((k) => this.rational(valueAt + k * 8));
      }
    }
    if (lat.length !== 3 || lon.length !== 3) return undefined;
    const toDeg = (dms: number[]) => dms[0] + dms[1] / 60 + dms[2] / 3600;
    return {
      lat: (latRef === 'S' ? -1 : 1) * toDeg(lat),
      lon: (lonRef === 'W' ? -1 : 1) * toDeg(lon),
    };
  }
}

/** Parse EXIF data from a JPEG/TIFF file buffer. Returns null when absent. */
export function parseExif(buffer: ArrayBuffer): ExifResult | null {
  const view = new DataView(buffer);

  // JPEG: walk segments looking for APP1 "Exif\0\0".
  let tiffOffset = -1;
  if (view.getUint16(0) === 0xffd8) {
    let pos = 2;
    while (pos + 4 <= view.byteLength) {
      if (view.getUint8(pos) !== 0xff) break;
      const marker = view.getUint8(pos + 1);
      const size = view.getUint16(pos + 2);
      if (marker === 0xe1) {
        const headerOk =
          view.getUint8(pos + 4) === 0x45 && // E
          view.getUint8(pos + 5) === 0x78 && // x
          view.getUint8(pos + 6) === 0x69 && // i
          view.getUint8(pos + 7) === 0x66; // f
        if (headerOk) tiffOffset = pos + 10;
        break;
      }
      if (marker === 0xda) break; // start of scan
      pos += 2 + size;
    }
  } else if (view.getUint16(0) === 0x4949 || view.getUint16(0) === 0x4d4d) {
    tiffOffset = 0; // TIFF file starts directly with the header.
  }
  if (tiffOffset < 0) return null;

  try {
    const reader = new TiffReader(buffer, tiffOffset);
    const entries: ExifEntry[] = [];
    const { exifPtr, gpsPtr } = reader.readIfd(reader.firstIfdOffset, IFD0_TAGS, entries);
    if (exifPtr) reader.readIfd(exifPtr, EXIF_TAGS, entries);
    const gps = gpsPtr ? reader.readGps(gpsPtr) : undefined;
    if (gps) {
      entries.push({
        tag: 'GPS',
        value: `${gps.lat.toFixed(5)}, ${gps.lon.toFixed(5)}`,
      });
    }
    if (entries.length === 0 && !gps) return null;
    return { entries, gps };
  } catch {
    return null;
  }
}
