import type { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status:  'ok',
    version: '1.0.0',
    webhook: process.env.N8N_WEBHOOK ? 'configured' : 'missing',
    time:    new Date().toISOString(),
  })
}
