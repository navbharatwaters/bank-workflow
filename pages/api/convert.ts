import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs'
import FormData from 'form-data'
// @ts-ignore
import fetch from 'node-fetch'

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
}

const N8N_WEBHOOK = process.env.N8N_WEBHOOK || 'https://n8n.navbharatwater.one/webhook/bank'
const MAX_SIZE    = parseInt(process.env.MAX_FILE_SIZE || '52428800') // 50MB

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // ── Parse multipart form ──
  const form = formidable({
    maxFileSize: MAX_SIZE,
    keepExtensions: true,
  })

  let filePath: string
  let fileName: string
  let fileMime: string

  try {
    const [, files] = await form.parse(req)
    const fileArr = files.bank_statement
    if (!fileArr || fileArr.length === 0) {
      return res.status(400).json({ error: 'No file uploaded. Field name must be "bank_statement".' })
    }
    const file = fileArr[0]
    filePath = file.filepath
    fileName = file.originalFilename || 'statement.pdf'
    fileMime = file.mimetype || 'application/octet-stream'
  } catch (err: any) {
    console.error('[convert] parse error:', err)
    return res.status(400).json({ error: 'File upload failed: ' + (err.message || 'Unknown error') })
  }

  // ── Forward to n8n ──
  try {
    const form = new FormData()
    form.append('bank_statement', fs.createReadStream(filePath), {
      filename: fileName,
      contentType: fileMime,
    })

    console.log(`[convert] → n8n: ${fileName} (${fileMime})`)

    const n8nRes = await fetch(N8N_WEBHOOK, {
      method:  'POST',
      body:    form,
      headers: form.getHeaders(),
      timeout: 360000, // 6 min
    })

    // Cleanup temp file
    try { fs.unlinkSync(filePath) } catch {}

    if (!n8nRes.ok) {
      const errText = await n8nRes.text()
      console.error('[convert] n8n error:', n8nRes.status, errText.slice(0, 300))
      return res.status(502).json({
        error:  `Workflow returned ${n8nRes.status}`,
        detail: errText.slice(0, 400),
      })
    }

    const ct = n8nRes.headers.get('content-type') || ''
    console.log('[convert] n8n content-type:', ct)

    // ── Case 1: n8n returns JSON with base64 binary ──
    if (ct.includes('application/json')) {
      const data = await n8nRes.json() as any

      // Handle both array and object responses from n8n
      const item   = Array.isArray(data) ? data[0] : data
      const jsonPart = item?.json || item

      // Extract base64 xlsx from various possible paths
      const b64 =
        item?.binary?.data?.data     ||   // {binary:{data:{data:'...'}}}
        item?.binary?.file?.data     ||   // {binary:{file:{data:'...'}}}
        item?.data?.data             ||   // {data:{data:'...'}}
        jsonPart?.fileContent        ||   // {json:{fileContent:'...'}}
        null

      if (b64) {
        const buf      = Buffer.from(b64, 'base64')
        const outName  = jsonPart?.outputFilename || `Kotak_Statement.xlsx`
        const stats = {
          transactions: jsonPart?.transactionCount ?? 0,
          total:        jsonPart?.totalAmount       ?? 0,
          success:      jsonPart?.successCount      ?? 0,
          failure:      jsonPart?.failureCount      ?? 0,
          from:         jsonPart?.periodFrom        ?? '',
          to:           jsonPart?.periodTo          ?? '',
          filename:     outName,
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        res.setHeader('Content-Disposition', `attachment; filename="${outName}"`)
        res.setHeader('X-Stats', JSON.stringify(stats))
        res.setHeader('Content-Length', buf.length)
        return res.status(200).send(buf)
      }

      // No binary found — return JSON as-is (frontend will show error)
      console.warn('[convert] n8n JSON but no binary found:', JSON.stringify(item).slice(0, 200))
      return res.status(502).json({ error: 'Workflow completed but returned no file', detail: JSON.stringify(item).slice(0, 300) })
    }

    // ── Case 2: n8n returns binary directly ──
    if (ct.includes('spreadsheetml') || ct.includes('octet-stream') || ct.includes('zip')) {
      const buf         = await n8nRes.buffer()
      const disposition = n8nRes.headers.get('content-disposition') || ''
      const match       = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      const outName     = match ? match[1].replace(/['"]/g, '') : 'Bank_Statement.xlsx'

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${outName}"`)
      res.setHeader('Content-Length', buf.length)
      return res.status(200).send(buf)
    }

    // ── Fallback: log raw response ──
    const raw = await n8nRes.text()
    console.error('[convert] unexpected response type:', ct, raw.slice(0, 300))
    return res.status(502).json({
      error:  'Unexpected response format from workflow',
      detail: raw.slice(0, 300),
    })

  } catch (err: any) {
    try { fs.unlinkSync(filePath!) } catch {}
    console.error('[convert] proxy error:', err)
    if (err.type === 'request-timeout' || err.code === 'ETIMEDOUT') {
      return res.status(504).json({ error: 'Workflow timed out. Large files can take 3–5 minutes.' })
    }
    return res.status(500).json({ error: err.message || 'Internal server error' })
  }
}
