import { Zip, ZipDeflate } from 'fflate'

/**
 * 极简流式 xlsx 写入器 (只写不读)：按行生成工作表 XML，边生成边 deflate 压缩，适合几十万到上百万行的导出。
 * 只支持数值、文本、日期时间 (Excel 序列值) 三种单元格；表头加粗、冻结首行首列。
 */

/** 单元格：数值 / 文本 / 空 */
export type Cell = number | string | null | undefined

/** 列样式：datetime 为 Excel 日期序列值 (yyyy-mm-dd hh:mm:ss)；decimals 为固定小数位数值 */
export type ColumnStyle = { kind: 'datetime' } | { kind: 'text' } | { kind: 'number'; decimals: number }

export interface XlsxColumn {
  header: string
  /** 列宽 (字符数)，不传按表头估算 */
  width?: number
  style: ColumnStyle
}

export interface XlsxSheet {
  name: string
  columns: XlsxColumn[]
  rows: Iterable<Cell[]>
  /** 冻结表头 (首行) 与首列，默认 true */
  freeze?: boolean
}

/** Excel 单个工作表最多 1,048,576 行 (含表头) */
export const EXCEL_MAX_ROWS = 1_048_576

const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

/** 样式索引 (与 STYLES_XML 中 cellXfs 顺序一致) */
const XF_HEADER = 1
const XF_DATETIME = 2
const XF_TEXT = 0
const xfNumber = (decimals: number) => 3 + Math.min(Math.max(Math.round(decimals), 0), 3)

const STYLES_XML = `${XML_HEAD}<styleSheet xmlns="${NS}">
<numFmts count="5"><numFmt numFmtId="164" formatCode="yyyy-mm-dd hh:mm:ss"/><numFmt numFmtId="165" formatCode="0"/><numFmt numFmtId="166" formatCode="0.0"/><numFmt numFmtId="167" formatCode="0.00"/><numFmt numFmtId="168" formatCode="0.000"/></numFmts>
<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF6F5"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="7">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

/** 0 → A，25 → Z，26 → AA */
export function columnLetter(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// XML 1.0 不允许的控制字符 (\t \n \r 除外)
// biome-ignore lint/suspicious/noControlCharactersInRegex: 需要剔除 XML 非法控制字符
const INVALID_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g

export const escapeXml = (s: string) =>
  s
    .replace(INVALID_XML, '')
    .replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string)

/** 工作表名：最多 31 字符，不含 [ ] : * ? / \ */
export const sheetName = (name: string) => name.replace(/[[\]:*?/\\]/g, '_').slice(0, 31) || 'Sheet'

/** 显示宽度：中日韩字符按 2 计 */
export const displayWidth = (s: string) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 0x2e80 ? 2 : 1), 0)

const styleOf = (s: ColumnStyle) =>
  s.kind === 'datetime' ? XF_DATETIME : s.kind === 'number' ? xfNumber(s.decimals) : XF_TEXT

function cellXml(ref: string, v: Cell, xf: number): string {
  if (v == null || v === '') return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    return `<c r="${ref}"${xf ? ` s="${xf}"` : ''}><v>${v}</v></c>`
  }
  return `<c r="${ref}" t="inlineStr"${xf ? ` s="${xf}"` : ''}><is><t xml:space="preserve">${escapeXml(v)}</t></is></c>`
}

const encoder = new TextEncoder()
/** 累积约 1MB 文本再压缩，减少 deflate 调用次数 */
const FLUSH_AT = 1 << 20

/** 逐段写入一个压缩文件 */
function zipFile(zip: Zip, path: string) {
  const f = new ZipDeflate(path, { level: 6 })
  zip.add(f)
  let buf = ''
  return {
    write(s: string) {
      buf += s
      if (buf.length >= FLUSH_AT) {
        f.push(encoder.encode(buf))
        buf = ''
      }
    },
    end(s = '') {
      f.push(encoder.encode(buf + s), true)
      buf = ''
    },
  }
}

function writeSheet(zip: Zip, path: string, sheet: XlsxSheet, onRow?: () => void) {
  const out = zipFile(zip, path)
  const cols = sheet.columns
  const letters = cols.map((_, i) => columnLetter(i))
  const xfs = cols.map((c) => styleOf(c.style))
  const freeze = sheet.freeze ?? true
  out.write(`${XML_HEAD}<worksheet xmlns="${NS}" xmlns:r="${REL_NS}">`)
  out.write(
    freeze && cols.length > 1
      ? '<sheetViews><sheetView workbookViewId="0"><pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>'
      : freeze
        ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
        : '<sheetViews><sheetView workbookViewId="0"/></sheetViews>',
  )
  out.write('<cols>')
  cols.forEach((c, i) => {
    const w = c.width ?? Math.min(Math.max(displayWidth(c.header) + 2, 10), 50)
    out.write(`<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
  })
  out.write('</cols><sheetData>')
  out.write(`<row r="1">${cols.map((c, i) => cellXml(`${letters[i]}1`, c.header, XF_HEADER)).join('')}</row>`)
  let r = 1
  for (const row of sheet.rows) {
    r++
    let x = `<row r="${r}">`
    for (let i = 0; i < cols.length; i++) x += cellXml(letters[i] + r, row[i], xfs[i])
    out.write(`${x}</row>`)
    onRow?.()
  }
  out.end('</sheetData></worksheet>')
}

/**
 * 生成 xlsx 文件 (Blob)。工作表依次写入，每写一行回调 onRow (用于进度)。
 * 调用方负责保证单表行数不超过 EXCEL_MAX_ROWS - 1
 */
export function buildXlsx(sheets: XlsxSheet[], onRow?: () => void): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const parts: Uint8Array<ArrayBuffer>[] = []
    const zip = new Zip((err, data, final) => {
      if (err) return reject(err)
      parts.push(data as Uint8Array<ArrayBuffer>)
      if (final) resolve(new Blob(parts, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
    })
    try {
      const names = sheets.map((s) => sheetName(s.name))
      const static_ = (path: string, xml: string) => zipFile(zip, path).end(xml)
      static_(
        '[Content_Types].xml',
        `${XML_HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names
          .map(
            (_, i) =>
              `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
          )
          .join('')}</Types>`,
      )
      static_(
        '_rels/.rels',
        `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      )
      static_(
        'xl/workbook.xml',
        `${XML_HEAD}<workbook xmlns="${NS}" xmlns:r="${REL_NS}"><sheets>${names
          .map((n, i) => `<sheet name="${escapeXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
          .join('')}</sheets></workbook>`,
      )
      static_(
        'xl/_rels/workbook.xml.rels',
        `${XML_HEAD}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
          .map(
            (_, i) =>
              `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
          )
          .join(
            '',
          )}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
      )
      static_('xl/styles.xml', STYLES_XML)
      sheets.forEach((s, i) => {
        writeSheet(zip, `xl/worksheets/sheet${i + 1}.xml`, s, onRow)
      })
      zip.end()
    } catch (e) {
      zip.terminate()
      reject(e)
    }
  })
}
