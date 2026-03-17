import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'

/* ─────────── Types ─────────── */
type Stage = 'idle' | 'uploading' | 'processing' | 'done' | 'error'

interface Stats {
  transactions: number
  total:        number
  success:      number
  failure:      number
  from:         string
  to:           string
  filename:     string
}

/* ─────────── Helpers ─────────── */
function formatBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'
  return (b / 1048576).toFixed(1) + ' MB'
}

function formatINR(n: number) {
  if (n >= 10_000_000) return '₹' + (n / 10_000_000).toFixed(2) + ' Cr'
  if (n >= 100_000)    return '₹' + (n / 100_000).toFixed(2) + ' L'
  return '₹' + n.toLocaleString('en-IN')
}

/* ─────────── Icons ─────────── */
const UploadIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/>
    <line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
)

const FileIcon = () => (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
  </svg>
)

const CheckIcon = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="11" fill="rgba(16,185,129,0.12)" stroke="#10b981" strokeWidth="1.5"/>
    <polyline points="7 12 10.5 15.5 17 8.5" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)

const MoonIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

const SunIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/>
    <line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/>
    <line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
)

/* ─────────── Step ─────────── */
function Step({ n, label, sub, state }: { n: number; label: string; sub: string; state: 'idle' | 'active' | 'done' }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className={`step-dot ${state === 'done' ? 'step-dot-done' : state === 'active' ? 'step-dot-active' : 'step-dot-idle'}`}>
        {state === 'done' ? '✓' : n}
      </div>
      <div>
        <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text)' }}>{label}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text2)' }}>{sub}</p>
      </div>
    </div>
  )
}

/* ─────────── Main Component ─────────── */
export default function Home() {
  const [theme,    setTheme]    = useState<'dark' | 'light'>('dark')
  const [file,     setFile]     = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [stage,    setStage]    = useState<Stage>('idle')
  const [progress, setProgress] = useState(0)
  const [progMsg,  setProgMsg]  = useState('')
  const [stats,    setStats]    = useState<Stats | null>(null)
  const [dlUrl,    setDlUrl]    = useState<string | null>(null)
  const [dlName,   setDlName]   = useState('Bank_Statement.xlsx')
  const [errMsg,   setErrMsg]   = useState('')

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Theme persistence ──
  useEffect(() => {
    const saved = (localStorage.getItem('bankflow-theme') || 'dark') as 'dark' | 'light'
    setTheme(saved)
    document.documentElement.classList.toggle('light', saved === 'light')
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('bankflow-theme', next)
    document.documentElement.classList.toggle('light', next === 'light')
  }

  // ── File handling ──
  const setSelectedFile = (f: File) => {
    setFile(f)
    setStage('idle')
    setStats(null)
    setDlUrl(null)
    setErrMsg('')
    setProgress(0)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setSelectedFile(f)
  }, [])

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true) }
  const onDragLeave = () => setDragging(false)
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setSelectedFile(e.target.files[0])
  }

  // ── Animated progress ──
  const startProgressAnimation = (from: number, to: number, duration: number) => {
    const msgs = ['Uploading file…', 'OCR processing…', 'Extracting transactions…', 'Parsing data…', 'Building Excel workbook…']
    let idx = 0
    const start = Date.now()
    setProgMsg(msgs[0])
    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = from + (to - from) * Math.min(elapsed / duration, 1)
      setProgress(Math.round(pct))
      const newIdx = Math.min(Math.floor(elapsed / (duration / msgs.length)), msgs.length - 1)
      if (newIdx !== idx) { idx = newIdx; setProgMsg(msgs[idx]) }
    }, 250)
  }

  const stopProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current)
  }

  // ── Convert ──
  const handleConvert = async () => {
    if (!file) return
    setStage('uploading')
    setProgress(5)
    setErrMsg('')
    setStats(null)
    setDlUrl(null)

    startProgressAnimation(8, 85, 30000)

    try {
      const form = new FormData()
      form.append('bank_statement', file, file.name)

      setStage('processing')

      const res = await fetch('/api/convert', { method: 'POST', body: form })

      stopProgress()

      if (!res.ok) {
        let errDetail = `Error ${res.status}`
        try { const j = await res.json(); errDetail = j.error || j.detail || errDetail } catch {}
        throw new Error(errDetail)
      }

      setProgress(95)
      setProgMsg('Finalising…')

      // Parse stats header
      const statsHeader = res.headers.get('X-Stats')
      if (statsHeader) {
        try { setStats(JSON.parse(statsHeader)) } catch {}
      }

      // Get filename from header
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
      const name = match ? match[1].replace(/['"]/g, '') : 'Bank_Statement.xlsx'
      setDlName(name)

      // Blob → object URL
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      setDlUrl(url)

      setProgress(100)
      setProgMsg('Done!')
      setStage('done')

    } catch (err: any) {
      stopProgress()
      setProgress(0)
      setErrMsg(err.message || 'Conversion failed. Please try again.')
      setStage('error')
    }
  }

  // ── Reset ──
  const reset = () => {
    stopProgress()
    setFile(null)
    setStage('idle')
    setProgress(0)
    setProgMsg('')
    setStats(null)
    if (dlUrl) URL.revokeObjectURL(dlUrl)
    setDlUrl(null)
    setErrMsg('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Step state helper ──
  const stepState = (n: number): 'idle' | 'active' | 'done' => {
    if (stage === 'idle' || stage === 'error') return 'idle'
    const map: Record<Stage, number> = { idle: 0, uploading: 1, processing: 2, done: 4, error: 0 }
    const cur = map[stage]
    if (n < cur) return 'done'
    if (n === cur) return 'active'
    return 'idle'
  }

  const isConverting = stage === 'uploading' || stage === 'processing'
  const dropzoneClass = `dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`

  return (
    <>
      <Head>
        <title>BankFlow — Statement Converter</title>
        <meta name="description" content="Convert Kotak Mahindra Bank statements to Excel instantly"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <link rel="icon" href="/favicon.ico"/>
      </Head>

      {/* ── Backgrounds ── */}
      <div className="grid-bg" aria-hidden/>
      <div className="noise-overlay" aria-hidden/>
      {/* Blue orb top-left */}
      <div className="orb" style={{ width: 600, height: 600, background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)', top: -200, left: -150 }} aria-hidden/>
      {/* Green orb bottom-right */}
      <div className="orb" style={{ width: 500, height: 500, background: 'radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)', bottom: -150, right: -100 }} aria-hidden/>

      <div className="relative z-10 min-h-screen flex flex-col">

        {/* ── Header ── */}
        <header className="sticky top-0 z-50 backdrop-blur-xl" style={{ borderBottom: '1px solid var(--border)', background: 'rgba(8,15,30,0.75)' }}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-0.5 flex items-center justify-between">
            {/* Left side - Ikargos Logo */}
            <div className="flex flex-col items-start">
              <img 
                src="/ikargos-logo-dark.svg" 
                alt="Ikargos Logo" 
                className="w-40 h-40"
                style={{ filter: 'brightness(1.3) contrast(1.2)' }}
              />
            </div>

            {/* Right side - BankFlow */}
            <div className="flex flex-col items-end">
              <div className="font-bold text-lg tracking-tight leading-none" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>BankFlow</div>
              <div className="text-sm mt-1" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>Statement Converter</div>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text3)' }}>
                Kotak Mahindra Bank
              </span>
              <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme"/>
            </div>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-10">

          {/* Hero */}
          <div className="text-center mb-4 animate-fade-up">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2 leading-none" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>
              Bank Statement<br/>
              <span style={{ background: 'linear-gradient(135deg, #3b82f6, #10b981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                → Excel
              </span>
            </h1>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* ─── LEFT COLUMN (2/3) ─── */}
            <div className="lg:col-span-2 flex flex-col gap-5">

              {/* Drop zone card */}
              <div className="card animate-fade-up stagger-1" style={{ padding: 4 }}>
                <div
                  className={dropzoneClass}
                  style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg3)' }}
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onClick={() => !isConverting && fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.png,.jpg,.jpeg"
                    onChange={onFileChange}
                    disabled={isConverting}
                  />

                  {/* Idle state */}
                  {!file && (
                    <>
                      <div className="upload-icon-wrap" style={{ color: 'var(--text2)' }}>
                        <UploadIcon/>
                      </div>
                      <p className="text-base font-semibold mb-1.5" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>
                        Drop your statement here
                      </p>
                      <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>or click to browse files</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {['PDF', 'TXT', 'PNG', 'JPG'].map(ext => (
                          <span key={ext} className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: 'var(--border)', color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                            {ext}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {/* File selected */}
                  {file && (
                    <>
                      <div className="upload-icon-wrap" style={{ color: 'var(--green)' }}>
                        <FileIcon/>
                      </div>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--green)', fontFamily: 'Syne, sans-serif' }}>
                        Ready to convert
                      </p>
                      <p className="file-tag" style={{ maxWidth: 280, margin: '0 auto 4px' }}>{file.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text3)' }}>{formatBytes(file.size)}</p>
                      {!isConverting && (
                        <button
                          className="btn-ghost mt-4 mx-auto"
                          style={{ width: 'auto', padding: '6px 14px', fontSize: 12 }}
                          onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                        >
                          Change file
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Convert button */}
              <div className="animate-fade-up stagger-2">
                <button
                  className="btn-primary"
                  onClick={handleConvert}
                  disabled={!file || isConverting || stage === 'done'}
                >
                  {isConverting ? (
                    <><div className="spinner"/><span>Processing…</span></>
                  ) : stage === 'done' ? (
                    <><span>✓</span><span>Converted successfully</span></>
                  ) : (
                    <><span style={{ fontSize: 18 }}>⚡</span><span>{file ? `Convert "${file.name}"` : 'Select a file to convert'}</span></>
                  )}
                </button>
              </div>

              {/* Progress area */}
              {isConverting && (
                <div className="card p-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <span className="badge badge-loading">
                      <span className="animate-pulse-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }}/>
                      Processing
                    </span>
                    <span className="text-xs font-bold" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progress}%` }}/>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>{progMsg}</p>
                </div>
              )}

              {/* Error area */}
              {stage === 'error' && (
                <div className="rounded-2xl p-4 animate-fade-in" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)' }}>
                  <div className="flex items-start gap-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-bold" style={{ color: 'var(--red)' }}>Conversion failed</p>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text2)' }}>{errMsg}</p>
                    </div>
                  </div>
                  <button className="btn-ghost mt-3" style={{ fontSize: 12, padding: '7px 14px', width: 'auto' }} onClick={reset}>
                    <RefreshIcon/> Try again
                  </button>
                </div>
              )}

              {/* Download area */}
              {stage === 'done' && dlUrl && (
                <div className="card p-5 animate-fade-in card-glow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="animate-check-in flex-shrink-0"><CheckIcon/></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base" style={{ fontFamily: 'Syne, sans-serif', color: 'var(--text)' }}>Conversion complete!</p>
                      <p className="file-tag mt-0.5">{dlName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a href={dlUrl} download={dlName} className="btn-download">
                      <DownloadIcon/> Download Excel
                    </a>
                    <button className="btn-ghost" onClick={reset}>
                      <RefreshIcon/> Convert another
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* ─── RIGHT COLUMN (1/3) ─── */}
            <div className="flex flex-col gap-5">

              {/* Stats (shown after conversion) */}
              {stats && stage === 'done' && (
                <div className="animate-fade-up">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="divider flex-1"/>
                    <span className="text-xs font-bold tracking-widest uppercase" style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace', whiteSpace: 'nowrap' }}>Results</span>
                    <div className="divider flex-1"/>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="stat-card">
                      <div className="text-2xl font-bold" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text)' }}>
                        {stats.transactions.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text3)' }}>Transactions</div>
                    </div>
                    <div className="stat-card">
                      <div className="text-2xl font-bold" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--green)' }}>
                        {stats.success.toLocaleString('en-IN')}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text3)' }}>Successful</div>
                    </div>
                    <div className="stat-card col-span-2">
                      <div className="text-xl font-bold leading-tight" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text)' }}>
                        {formatINR(stats.total)}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text3)' }}>Total Debited</div>
                    </div>
                    {stats.from && (
                      <div className="stat-card">
                        <div className="text-sm font-bold" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{stats.from}</div>
                        <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text3)' }}>From</div>
                      </div>
                    )}
                    {stats.to && (
                      <div className="stat-card">
                        <div className="text-sm font-bold" style={{ fontFamily: 'DM Mono, monospace', color: 'var(--text2)' }}>{stats.to}</div>
                        <div className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: 'var(--text3)' }}>To</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* How it works */}
              <div className="card p-5 animate-fade-up stagger-3">
                <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                  How it works
                </p>
                <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16 }}>
                  <Step n={1} label="Upload Statement"     sub="PDF or TXT from Kotak net banking"       state={stepState(1)} />
                  <Step n={2} label="OCR & Extract"        sub="LLMWhisperer reads every transaction"    state={stepState(2)} />
                  <Step n={3} label="Parse & Analyse"      sub="Smart parser groups & calculates stats"  state={stepState(3)} />
                  <Step n={4} label="Download Excel"       sub="3-sheet workbook with full analytics"    state={stage === 'done' ? 'done' : 'idle'} />
                </div>
              </div>

              {/* Output sheets */}
              <div className="card p-5 animate-fade-up stagger-4">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
                  Excel output (3 sheets)
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    { dot: 'var(--accent)', name: 'Transactions', desc: 'Full ledger, color-coded rows' },
                    { dot: 'var(--green)',  name: 'Summary',      desc: 'Stats & top beneficiaries'     },
                    { dot: 'var(--amber)',  name: 'Monthly',      desc: 'Month-by-month breakdown'       },
                  ].map(s => (
                    <div key={s.name} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg3)' }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.dot }}/>
                      <div>
                        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.name}</p>
                        <p className="text-xs" style={{ color: 'var(--text3)' }}>{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="card p-5 animate-fade-up stagger-5">
                <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>Tips</p>
                <ul className="flex flex-col gap-2.5">
                  {[
                    'Download the statement directly from Kotak net banking',
                    'PDF and TXT formats both work perfectly',
                    'Large files (50+ pages) may take 2–3 minutes',
                    'Each upload creates a fresh Excel file',
                  ].map((tip, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs" style={{ color: 'var(--text2)' }}>
                      <span className="mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)', fontSize: 14 }}>›</span>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="max-w-5xl mx-auto w-full px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
              BankFlow · Kotak Statement Converter
            </p>
            <p className="text-xs" style={{ color: 'var(--text3)', fontFamily: 'DM Mono, monospace' }}>
              Navbharat Water Systems
            </p>
          </div>
        </footer>

      </div>
    </>
  )
}
