import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeft, ArrowRight, BarChart3, BookOpen, Box, Camera, Check, CheckCircle2,
  ChevronDown, ClipboardCheck, Clock3, Download, Eye, FileDown, FileText, Filter, Gauge,
  Fingerprint, GitCompareArrows, Globe2, History, Home, ImagePlus, LayoutDashboard, LoaderCircle,
  LogOut, MapPin, Menu, Package, PanelLeftClose, Plus, Radio, RotateCcw, ScanLine, Search,
  ShieldAlert, ShieldCheck, ShoppingCart, Sparkles, Store, Upload, UserRound, X, XCircle,
} from 'lucide-react'
import { productSightings } from './data/dna'
import { demoBlocks, demoDetails, demoText, seedInspections } from './data/seed'
import { calculateScore, calculateStatus, effectiveStatus, getRuleCatalog, runCompliance } from './lib/compliance'
import { analyzeComplianceDna, buildDnaRepository } from './lib/complianceDna'
import { recognizeImage } from './lib/ocr'
import { persistInspection, readRepository } from './lib/repository'
import { CommandHome, CorrectionLab } from './RoundTwo'
import { escapeReportText as escapeHtml } from './lib/report'
import type { ComplianceDnaResult, EvidenceImage, Finding, FindingStatus, Inspection, ProductDetails, ProductSighting, ViewName } from './types'

const STORAGE_KEY = 'niyamdrishti-inspections-v2'
const today = new Date().toISOString().slice(0, 10)

const emptyDetails: ProductDetails = {
  name: '', brand: '', barcode: '', category: 'Personal care', packageType: 'Retail', origin: 'Domestic',
  channel: 'Physical retail', inspectionDate: today, location: 'Chandigarh', calibrationDetected: false,
}

const navItems: Array<{ id: ViewName; label: string; icon: typeof Home }> = [
  { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
  { id: 'new', label: 'Scan a product', icon: ScanLine },
  { id: 'inspections', label: 'Past scans', icon: ClipboardCheck },
  { id: 'products', label: 'Product DNA', icon: Fingerprint },
  { id: 'rules', label: 'Rules we check', icon: BookOpen },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(date))
}

function statusTone(status: Inspection['status'] | FindingStatus) {
  if (status === 'Compliant' || status === 'pass') return 'success'
  if (status === 'Potential violation' || status === 'violation') return 'danger'
  return 'warning'
}

function StatusBadge({ status }: { status: Inspection['status'] | FindingStatus }) {
  const label = status === 'pass' ? 'Passed' : status === 'violation' ? 'Potential violation' : status === 'review' ? 'Manual review' : status
  return <span className={`status-badge ${statusTone(status)}`}><span className="status-dot" />{label}</span>
}

function App() {
  const [view, setView] = useState<ViewName>('dashboard')
  const [inspections, setInspections] = useState<Inspection[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? [...JSON.parse(saved), ...seedInspections.filter((seed) => !JSON.parse(saved).some((item: Inspection) => item.id === seed.id))] : seedInspections
    } catch { return seedInspections }
  })
  const [selectedId, setSelectedId] = useState(seedInspections[0].id)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [repositoryReady, setRepositoryReady] = useState(false)
  const [storageMessage, setStorageMessage] = useState('')

  useEffect(() => {
    readRepository().then((records) => {
      setInspections((current) => [...records, ...current.filter((record) => !records.some((saved) => saved.id === record.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
    }).catch(() => setStorageMessage('Photo storage is unavailable. New scans remain in this session; export reports before closing.'))
      .finally(() => setRepositoryReady(true))
  }, [])

  useEffect(() => {
    // Keep reports searchable across refreshes without putting multi-megabyte image
    // data URLs into localStorage. Evidence stays available for the active session;
    // a production build would store the original files in object storage.
    const compactRecords = inspections
      .filter((inspection) => inspection.source === 'created')
      .map((inspection) => ({ ...inspection, images: [], ocrBlocks: [] }))
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactRecords))
    } catch (error) {
      console.warn('Could not persist the local inspection repository.', error)
    }
  }, [inspections])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [view, selectedId])

  const selected = inspections.find((inspection) => inspection.id === selectedId) ?? inspections[0]

  const openInspection = (id: string) => {
    setSelectedId(id)
    setView('result')
    setSidebarOpen(false)
  }

  const saveInspection = async (inspection: Inspection) => {
    try { await persistInspection(inspection) } catch { setStorageMessage('This scan could not be saved on this device. Keep this tab open and export the report.') }
    setInspections((current) => [inspection, ...current])
    setSelectedId(inspection.id)
    setView('result')
  }

  const updateInspection = (inspection: Inspection) => {
    setInspections((current) => current.map((item) => item.id === inspection.id ? inspection : item))
    persistInspection(inspection).catch(() => setStorageMessage('The latest officer decision could not be saved. Export the report before closing.'))
  }

  const pageTitle = view === 'result' ? `Inspection ${selected?.id ?? ''}` : navItems.find((item) => item.id === view)?.label ?? 'NiyamDrishti'

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><ScanLine size={23} /></div>
          <div><strong>NiyamDrishti</strong><span>Compliance Copilot</span></div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Close navigation"><PanelLeftClose size={20} /></button>
        </div>
        <div className="workspace-chip"><div className="emblem">dc</div><div><strong>dotcom workspace</strong><span>SIH 2026 · Round two</span></div></div>
        <nav>
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => {
            const Icon = item.icon
            const active = view === item.id || (view === 'result' && item.id === 'inspections')
            return <button key={item.id} className={active ? 'active' : ''} onClick={() => { setView(item.id); setSidebarOpen(false) }}><Icon size={19} /><span>{item.label}</span>{item.id === 'inspections' && <small>{inspections.length}</small>}</button>
          })}
        </nav>
        <div className="sidebar-callout">
          <div className="callout-icon"><ShieldCheck size={19} /></div>
          <strong>POC rule subset</strong>
          <span>12 law-backed checks · not the whole Act</span>
          <button onClick={() => setView('rules')}>See sources and limits <ArrowRight size={14} /></button>
        </div>
        <div className="profile-row">
          <div className="avatar">SS</div><div><strong>Sankalp Samarth</strong><span>Inspector · dotcom</span></div><LogOut size={17} />
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div><span className="eyebrow">LEGAL METROLOGY · PACKAGED COMMODITIES</span><h1>{pageTitle}</h1></div>
          <div className="topbar-actions">
            <div className="sync-pill"><span />On-device workspace</div>
            <button className="primary-button" onClick={() => setView('new')}><Plus size={18} /> New scan</button>
          </div>
        </header>

        <div className="page-wrap">
          {storageMessage && <div className="inline-alert" role="alert"><AlertTriangle size={18} />{storageMessage}</div>}
          {!repositoryReady && <p role="status">Opening your evidence repository…</p>}
          {view === 'dashboard' && <CommandHome inspections={inspections} openInspection={openInspection} startInspection={() => setView('new')} openDemo={() => openInspection(seedInspections[0].id)} />}
          {view === 'new' && repositoryReady && <NewInspection onSave={saveInspection} onCancel={() => setView('dashboard')} />}
          {view === 'inspections' && <InspectionsPage inspections={inspections} openInspection={openInspection} />}
          {view === 'products' && <ProductsPage inspections={inspections} openInspection={openInspection} />}
          {view === 'rules' && <RulesPage />}
          {view === 'result' && selected && <InspectionResult key={selected.id} inspection={selected} inspections={inspections} onBack={() => setView('inspections')} onUpdate={updateInspection} />}
        </div>
      </main>
    </div>
  )
}

function Dashboard({ inspections, openInspection, startInspection, openDemo }: { inspections: Inspection[]; openInspection: (id: string) => void; startInspection: () => void; openDemo: () => void }) {
  return <>
    <section className="hero-panel simple-hero">
      <div>
        <span className="section-kicker"><Fingerprint size={15} /> COMPLIANCE INTELLIGENCE</span>
        <h2>Scan one package. Discover a market-wide pattern.</h2>
        <p>Check the label, connect the same SKU across stores and e-commerce, then expose declaration changes and repeated violations.</p>
      </div>
    </section>

    <section className="start-choice-grid">
      <button className="start-choice demo-choice" onClick={openDemo}><div className="choice-icon"><Fingerprint size={24} /></div><span className="truth-chip demo">X-FACTOR DEMO</span><h3>Reveal Compliance DNA</h3><p>Follow one shampoo across a package, marketplace listing and previous label—then expose compliance drift.</p><strong>Open product network <ArrowRight size={17} /></strong></button>
      <button className="start-choice live-choice" onClick={startInspection}><div className="choice-icon"><ScanLine size={24} /></div><span className="truth-chip live">REAL UPLOAD · LIVE OCR</span><h3>Scan your own product</h3><p>Upload label photos, run local OCR, correct the text, then apply the rule checks.</p><strong>Start a scan <ArrowRight size={17} /></strong></button>
    </section>

    <section className="panel truth-panel">
      <div className="truth-head"><ShieldCheck size={21} /><div><h3>What is actually working?</h3><p>No mystery AI claims—these are the exact boundaries of this internal-hackathon POC.</p></div></div>
      <div className="truth-grid">
        <div><span className="truth-chip live">WORKING NOW</span><strong>OCR, 12 rule checks, product matching, compliance drift and reports</strong></div>
        <div><span className="truth-chip demo">SEEDED NETWORK</span><strong>Three cross-channel HydraGlow sightings make the X-factor reliable on stage</strong></div>
        <div><span className="truth-chip planned">NOT BUILT YET</span><strong>User login, government database, e-commerce crawling and full legal coverage</strong></div>
      </div>
    </section>

    <section className="panel table-panel">
      <PanelHeader title="Sample scan history" subtitle="Seeded records show retrieval; real scans you create appear here too" />
      <InspectionTable inspections={inspections.slice(0, 3)} openInspection={openInspection} />
    </section>
  </>
}

function MetricCard({ label, value, delta, icon: Icon, tone }: { label: string; value: string | number; delta: string; icon: typeof Home; tone: string }) {
  return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={20} /></div><span>{label}</span><strong>{value}</strong><small>{delta}</small></div>
}

function PanelHeader({ title, subtitle, action, onAction }: { title: string; subtitle: string; action?: string; onAction?: () => void }) {
  return <div className="panel-header"><div><h3>{title}</h3><p>{subtitle}</p></div>{action && <button onClick={onAction}>{action}<ChevronDown size={15} /></button>}</div>
}

function InspectionTable({ inspections, openInspection }: { inspections: Inspection[]; openInspection: (id: string) => void }) {
  return <div className="table-scroll"><table><thead><tr><th>Inspection</th><th>Product</th><th>Category</th><th>Inspected</th><th>Score</th><th>Status</th><th /></tr></thead><tbody>
    {inspections.map((item) => <tr key={item.id} onClick={() => openInspection(item.id)}>
      <td><strong className="mono">{item.id}</strong><span>{item.details.origin}</span></td>
      <td><div className="product-cell"><div className="product-thumb"><Box size={18} /></div><div><strong>{item.details.name}</strong><span>{item.details.brand}</span></div></div></td>
      <td>{item.details.category}</td><td>{formatDate(item.details.inspectionDate)}</td>
      <td><strong className={`score-text ${item.score < 80 ? 'low' : ''}`}>{item.score}</strong><span>/100</span></td>
      <td><StatusBadge status={item.status} /></td><td><ArrowRight size={17} /></td>
    </tr>)}
  </tbody></table></div>
}

function InspectionsPage({ inspections, openInspection }: { inspections: Inspection[]; openInspection: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'All' | Inspection['status']>('All')
  const filtered = inspections.filter((item) => (filter === 'All' || item.status === filter) && `${item.id} ${item.details.name} ${item.details.brand}`.toLowerCase().includes(query.toLowerCase()))
  return <section className="panel page-panel">
    <div className="list-toolbar"><div><h2>Inspection register</h2><p>Search, review and retrieve every product assessment.</p></div><div className="toolbar-controls"><label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search product or ID" /></label><select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option>All</option><option>Compliant</option><option>Potential violation</option><option>Needs review</option></select></div></div>
    <div className="register-summary"><span><strong>{filtered.length}</strong> records</span><span><Filter size={15} /> Updated just now</span></div>
    <InspectionTable inspections={filtered} openInspection={openInspection} />
  </section>
}

function ProductsPage({ inspections, openInspection }: { inspections: Inspection[]; openInspection: (id: string) => void }) {
  const featured = inspections.find((item) => item.details.barcode === demoDetails.barcode) ?? inspections[0]
  const dna = featured ? analyzeComplianceDna(featured, buildDnaRepository(inspections, productSightings, featured.id)) : null
  return <>
    <section className="repo-hero"><div><span className="section-kicker"><Fingerprint size={15} /> PRODUCT DNA</span><h2>One product. Every label version.</h2><p>Barcode, product identity and declarations connect shelf scans, seller listings and previous labels into one compliance history.</p></div><div className="repo-stat"><strong>{dna?.sightings.length ?? 0}</strong><span>linked HydraGlow sightings</span></div></section>
    {featured && dna && dna.sightings.length > 0 && <button className="dna-cluster-card" onClick={() => openInspection(featured.id)}>
      <div className="cluster-symbol"><Fingerprint size={27} /></div>
      <div className="cluster-main"><span className="truth-chip demo">FEATURED SAMPLE CLUSTER</span><h3>{featured.details.name}</h3><p>{dna.fingerprint} · {Math.round(dna.confidence * 100)}% match heuristic</p></div>
      <div className="cluster-signal"><strong>{dna.repeatedViolations.length}</strong><span>repeated violation patterns</span></div>
      <div className="cluster-signal"><strong>{dna.affectedLocations}</strong><span>channels / locations</span></div>
      <span className="cluster-open">Open intelligence <ArrowRight size={17} /></span>
    </button>}
    <section className="product-grid">{inspections.map((item, index) => <button className="product-card" key={item.id} onClick={() => openInspection(item.id)}><div className={`product-art art-${index % 4}`}><Package size={33} /></div><div className="product-card-body"><div><span>{item.details.category}</span><StatusBadge status={item.status} /></div><h3>{item.details.name}</h3><p>{item.details.brand} · {item.details.origin}</p><hr /><div><span>Last inspected</span><strong>{formatDate(item.details.inspectionDate)}</strong></div><div><span>Compliance score</span><strong>{item.score}/100</strong></div></div></button>)}</section>
  </>
}

function RulesPage() {
  const catalog = getRuleCatalog()
  return <>
    <section className="rule-hero"><div><span className="section-kicker"><ShieldCheck size={15} /> POC RULE CHECKLIST</span><h2>Yes—the requirements are from the real Rules.</h2><p>The cited provisions are real. The software detection is a limited POC: it searches OCR text using patterns, applies basic applicability, and sends uncertain physical measurements to manual review.</p></div><div className="rule-version"><CheckCircle2 size={21} /><div><strong>12 checks</strong><span>subset, not full coverage</span></div></div></section>
    <section className="panel rule-panel"><div className="rule-table-head"><span>Rule</span><span>Compliance check</span><span>Severity</span><span>Source</span></div>{catalog.map((rule) => <div className="rule-row" key={rule.id}><strong className="mono">{rule.id}</strong><div><strong>{rule.title}</strong><span>{rule.requirement}</span></div><span className={`severity ${rule.severity}`}>{rule.severity}</span><span>{rule.citation}</span></div>)}</section>
    <div className="legal-note"><BookOpen size={19} /><div><strong>Important distinction</strong><p>The legal requirement and citation are genuine; “pass” or “potential violation” is only the prototype's screening suggestion. Exceptions, category-specific laws and final measurement still require an authorized officer.</p><a href="https://consumeraffairs.gov.in/public/upload/admin/cmsfiles/whatsnews/Book_on_Legal_Metrology_Packaged_Commodities_Rules%2C2011_with_all_amendments_whatsnews.pdf" target="_blank" rel="noreferrer">Open the official consolidated Rules ↗</a></div></div>
  </>
}

function NewInspection({ onSave, onCancel }: { onSave: (inspection: Inspection) => void; onCancel: () => void }) {
  const [step, setStep] = useState(1)
  const [details, setDetails] = useState<ProductDetails>(emptyDetails)
  const [images, setImages] = useState<EvidenceImage[]>([])
  const [text, setText] = useState('')
  const [blocks, setBlocks] = useState<typeof demoBlocks>([])
  const [ocrProgress, setOcrProgress] = useState<number | null>(null)
  const [ocrError, setOcrError] = useState('')
  const [saving, setSaving] = useState(false)
  const originMismatch = details.origin === 'Domestic' && /imported\s+by/i.test(text)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadTestLabel = async () => {
    try {
      const response = await fetch('/test-labels/nova-bite-mixed-compliance.png')
      if (!response.ok) throw new Error('Test image could not load')
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('Test image could not be read'))
        reader.readAsDataURL(blob)
      })
      setDetails({ ...emptyDetails, name: 'Nova Bite Dark Chocolate (test label)', brand: 'Nova Bite', barcode: 'TEST-NOVA-BITE', category: 'Packaged food' })
      setImages([{ id: crypto.randomUUID(), surface: 'Back', name: 'Generated Nova Bite test label', dataUrl, source: 'test' }])
      setText(''); setBlocks([]); setOcrError(''); setStep(3)
    } catch (error) { setOcrError(error instanceof Error ? error.message : 'Test label unavailable') }
  }

  const loadDemo = () => {
    setDetails(demoDetails)
    setImages([
      { id: 'demo-front-copy', surface: 'Front', name: 'aurelia-front.svg', dataUrl: '/demo-aurelia-front.svg', source: 'demo' },
      { id: 'demo-back-copy', surface: 'Back', name: 'aurelia-back.svg', dataUrl: '/demo-aurelia-back.svg', source: 'demo' },
    ])
    setText(demoText)
    setBlocks(demoBlocks)
    setStep(3)
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files) return
    setOcrError('')
    const selectedFiles = Array.from(files).slice(0, Math.max(0, 6 - images.length))
    if (selectedFiles.some((file) => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024)) {
      setOcrError('Choose PNG, JPG or WEBP photographs up to 12 MB each.')
      return
    }
    const surfaces = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom']
    try {
    const next = await Promise.all(selectedFiles.map((file, index) => new Promise<EvidenceImage>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve({ id: crypto.randomUUID(), surface: surfaces[images.length + index] ?? `Surface ${index + 1}`, name: file.name, dataUrl: String(reader.result), source: 'upload' })
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
      reader.readAsDataURL(file)
    })))
    setImages((current) => [...current, ...next].slice(0, 6))
    } catch { setOcrError('One of the photographs could not be read. Please select it again.') }
  }

  const runOcr = async () => {
    if (!images.length) return
    setOcrError('')
    setOcrProgress(0)
    try {
      let combined = ''
      const allBlocks = [] as typeof demoBlocks
      for (let index = 0; index < images.length; index++) {
        const image = images[index]
        const result = await recognizeImage(image.dataUrl, image.surface, (progress) => setOcrProgress((index + progress) / images.length))
        combined += `\n[${image.surface}]\n${result.text}`
        allBlocks.push(...result.blocks)
      }
      setText(combined.trim())
      setBlocks(allBlocks)
    } catch (error) {
      setOcrError(`OCR could not complete: ${error instanceof Error ? error.message : 'unknown error'}. You can paste or correct the extracted text below.`)
    } finally { setOcrProgress(null) }
  }

  const analyze = async () => {
    if (saving || originMismatch) return
    setSaving(true)
    const findings = runCompliance(details, text, blocks)
    const inspection: Inspection = {
      id: `ND-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      details, inspector: 'Sankalp Samarth · Inspector', createdAt: new Date().toISOString(), findings,
      score: calculateScore(findings), status: calculateStatus(findings), images, ocrText: text, ocrBlocks: blocks, source: 'created',
    }
    try { await onSave(inspection) } finally { setSaving(false) }
  }

  return <section className="inspection-builder">
    <div className="builder-head"><button className="back-link" onClick={onCancel}><ArrowLeft size={17} /> Exit scan</button><div className="builder-demo"><button disabled={ocrProgress !== null || saving} onClick={loadTestLabel}><ScanLine size={16} /> Try test label with real OCR</button><button disabled={ocrProgress !== null || saving} onClick={loadDemo}><Sparkles size={16} /> Pre-filled demo</button></div></div>
    {ocrError && step !== 3 && <div className="inline-alert" role="alert">{ocrError}</div>}
    <div className="stepper">{['Describe product', 'Upload photos', 'Read & check'].map((label, index) => <div className={step >= index + 1 ? 'active' : ''} key={label}><span>{step > index + 1 ? <Check size={15} /> : index + 1}</span><strong>{label}</strong>{index < 2 && <i />}</div>)}</div>

    {step === 1 && <div className="builder-grid"><div className="panel form-panel"><div className="form-heading"><div className="step-icon"><Package size={20} /></div><div><h2>Scope the product</h2><p>Confirm the product identity and origin before checking its declarations.</p></div></div><div className="form-grid">
      <Field label="Product name" wide><input value={details.name} onChange={(event) => setDetails({ ...details, name: event.target.value })} placeholder="e.g. HydraGlow Shampoo" /></Field>
      <Field label="Brand"><input value={details.brand} onChange={(event) => setDetails({ ...details, brand: event.target.value })} placeholder="Brand name" /></Field>
      <Field label="Barcode / GTIN"><input value={details.barcode} onChange={(event) => setDetails({ ...details, barcode: event.target.value })} placeholder="Optional" /></Field>
      <Field label="Category"><select value={details.category} onChange={(event) => setDetails({ ...details, category: event.target.value })}><option>Personal care</option><option>Packaged food</option><option>Household</option><option>Electronics</option><option>Other</option></select></Field>
      <Field label="Package type"><select value={details.packageType} onChange={(event) => setDetails({ ...details, packageType: event.target.value as ProductDetails['packageType'] })}><option>Retail</option><option>Wholesale</option><option>Group / combination</option></select></Field>
      <Field label="Product origin"><div className="segmented"><button className={details.origin === 'Domestic' ? 'active' : ''} onClick={() => setDetails({ ...details, origin: 'Domestic' })}>Domestic</button><button className={details.origin === 'Imported' ? 'active' : ''} onClick={() => setDetails({ ...details, origin: 'Imported' })}>Imported</button></div></Field>
      <Field label="Sales channel"><select value={details.channel} onChange={(event) => setDetails({ ...details, channel: event.target.value as ProductDetails['channel'] })}><option>Physical retail</option><option>E-commerce</option><option>Both</option></select></Field>
      <Field label="Inspection date"><input type="date" value={details.inspectionDate} onChange={(event) => setDetails({ ...details, inspectionDate: event.target.value })} /></Field>
      <Field label="Location"><input value={details.location} onChange={(event) => setDetails({ ...details, location: event.target.value })} /></Field>
    </div><div className="form-actions"><button className="secondary-button" onClick={onCancel}>Cancel</button><button className="primary-button" disabled={!details.name.trim() || !details.brand.trim() || !details.inspectionDate} onClick={() => setStep(2)}>Continue to evidence <ArrowRight size={17} /></button></div></div><aside className="scope-aside"><ShieldCheck size={24} /><h3>Why this matters</h3><p>Origin and package type select applicable POC checks. The barcode connects later scans of the same product. Category exceptions still need officer review.</p><ul><li><Check size={15} /> Confirm imported products</li><li><Check size={15} /> Connect product history</li><li><Check size={15} /> Retain inspection context</li></ul></aside></div>}

    {step === 2 && <div className="panel capture-panel"><div className="form-heading"><div className="step-icon"><Camera size={20} /></div><div><h2>Capture every declaration surface</h2><p>Add clear, close photographs. Absence from one image does not prove absence from the package.</p></div></div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={(event) => handleFiles(event.target.files)} />
      <button className="upload-zone" onClick={() => fileRef.current?.click()}><div><ImagePlus size={27} /></div><strong>Upload package photographs</strong><span>PNG, JPG or WEBP · up to six surfaces</span><small><Upload size={14} /> Choose files</small></button>
      {images.length > 0 && <div className="capture-grid">{images.map((image) => <div className="capture-item" key={image.id}><img src={image.dataUrl} alt={`${image.surface} package surface`} /><div><select value={image.surface} onChange={(event) => setImages((current) => current.map((item) => item.id === image.id ? { ...item, surface: event.target.value } : item))}>{['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'].map((surface) => <option key={surface}>{surface}</option>)}</select><button onClick={() => setImages((current) => current.filter((item) => item.id !== image.id))}><X size={15} /></button></div></div>)}</div>}
      <div className="calibration-card"><div className="marker-mini"><span /><span /><span /><span /></div><div><strong>Optional Rule 7 font-size check</strong><p>It needs both a scale-assisted character height and principal display panel area. Otherwise the app correctly says “manual review”.</p></div><label className="switch"><input type="checkbox" checked={details.calibrationDetected} onChange={(event) => setDetails({ ...details, calibrationDetected: event.target.checked, estimatedFontMm: event.target.checked ? 1.8 : undefined, principalDisplayAreaCm2: event.target.checked ? 80 : undefined, moldedDeclaration: false })} /><span /></label>{details.calibrationDetected && <div className="measurement-inputs"><label className="mm-input"><input type="number" step="0.1" value={details.estimatedFontMm} onChange={(event) => setDetails({ ...details, estimatedFontMm: Number(event.target.value) })} /> mm text</label><label className="mm-input"><input type="number" step="1" value={details.principalDisplayAreaCm2} onChange={(event) => setDetails({ ...details, principalDisplayAreaCm2: Number(event.target.value) })} /> cm² panel</label><label className="moulded-check"><input type="checkbox" checked={details.moldedDeclaration ?? false} onChange={(event) => setDetails({ ...details, moldedDeclaration: event.target.checked })} /> moulded</label></div>}</div>
      <div className="form-actions"><button className="secondary-button" onClick={() => setStep(1)}><ArrowLeft size={17} /> Back</button><button className="primary-button" disabled={!images.length} onClick={() => setStep(3)}>Continue to extraction <ArrowRight size={17} /></button></div>
    </div>}

    {step === 3 && <div className="review-grid"><div className="panel extraction-panel"><div className="form-heading"><div className="step-icon"><FileText size={20} /></div><div><h2>Review the label text</h2><p>OCR only means converting a photo into editable text. Correct any obvious reading mistakes before checking rules.</p></div></div>
      {images.some((image) => image.source === 'test') && <p className="test-label-note">Generated test package: the image is synthetic, but text recognition and rule checks run live. This sample includes an importer declaration.</p>}
      {images.every((image) => image.source === 'demo') ? <div className="mode-notice demo"><Sparkles size={18} /><div><strong>Pre-filled demonstration</strong><span>The product name and text below are hardcoded sample data. OCR is intentionally not running here.</span></div></div> : <div className="mode-notice live"><ScanLine size={18} /><div><strong>Live OCR mode</strong><span>Click “Run local OCR” to read the photos you uploaded. The text remains editable.</span></div></div>}
      <div className="ocr-toolbar"><button className="secondary-button" disabled={ocrProgress !== null || images.every((image) => image.source === 'demo')} onClick={runOcr}>{ocrProgress !== null ? <LoaderCircle className="spin" size={17} /> : <ScanLine size={17} />}{ocrProgress !== null ? `Reading ${Math.round(ocrProgress * 100)}%` : 'Run local OCR'}</button><span>{blocks.length} evidence blocks</span></div>
      {ocrError && <div className="inline-alert"><AlertTriangle size={17} />{ocrError}</div>}
      <textarea aria-label="Extracted label text" className="ocr-textarea" value={text} onChange={(event) => { setText(event.target.value); setBlocks([]) }} placeholder="Run OCR or paste the label declarations here…" />
      {originMismatch && <div className="origin-warning" role="alert"><AlertTriangle size={21} /><div><strong>This label mentions an importer</strong><p>You selected Domestic. Confirm the product origin so importer checks are included, or correct an OCR reading error.</p><button className="secondary-button" onClick={() => setDetails({ ...details, origin: 'Imported' })}>Confirm imported product</button></div></div>}
      <div className="form-actions"><button className="secondary-button" onClick={() => setStep(2)}><ArrowLeft size={17} /> Back</button><button className="primary-button analyze-button" disabled={!text.trim() || saving || ocrProgress !== null || originMismatch} onClick={analyze}><Sparkles size={17} />{saving ? 'Saving evidence…' : `Run ${runCompliance(details, '').length} applicable checks`}</button></div></div>
      <aside className="evidence-summary"><h3>Captured evidence</h3><div className="evidence-ring"><strong>{new Set(images.map((image) => image.surface)).size}</strong><span>distinct surfaces</span></div><ul>{['Front', 'Back', 'Left', 'Right'].map((surface) => <li key={surface} className={images.some((image) => image.surface === surface) ? 'done' : ''}>{images.some((image) => image.surface === surface) ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}{surface}</li>)}</ul><p>A surface count cannot prove complete coverage. Check that every declaration area is visible.</p></aside>
    </div>}
  </section>
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={wide ? 'wide' : ''}><span>{label}</span>{children}</label>
}

function InspectionResult({ inspection, inspections, onBack, onUpdate }: { inspection: Inspection; inspections: Inspection[]; onBack: () => void; onUpdate: (inspection: Inspection) => void }) {
  const [activeFindingId, setActiveFindingId] = useState(inspection.findings.find((item) => item.status !== 'pass')?.id ?? inspection.findings[0]?.id)
  const [activeSurface, setActiveSurface] = useState(inspection.images[0]?.surface ?? '')
  const [onlyAttention, setOnlyAttention] = useState(false)
  const activeFinding = inspection.findings.find((item) => item.id === activeFindingId)
  const activeImage = inspection.images.find((image) => image.surface === activeSurface) ?? inspection.images[0]
  const counts = inspection.findings.reduce((acc, item) => { acc[effectiveStatus(item)]++; return acc }, { pass: 0, violation: 0, review: 0 })
  const demoMode = inspection.images.length > 0 && inspection.images.every((image) => image.source === 'demo')
  const testMode = inspection.images.some((image) => image.source === 'test')
  const dna = useMemo(() => analyzeComplianceDna(inspection, buildDnaRepository(inspections, productSightings, inspection.id)), [inspection, inspections])

  useEffect(() => {
    if (activeFinding?.surface && inspection.images.some((image) => image.surface === activeFinding.surface)) setActiveSurface(activeFinding.surface)
  }, [activeFindingId])

  const setDecision = (finding: Finding, decision: FindingStatus) => {
    const findings = inspection.findings.map((item) => item.id === finding.id ? { ...item, officerDecision: decision } : item)
    if (effectiveStatus(finding) === decision && finding.officerDecision === decision) return
    onUpdate({ ...inspection, findings, score: calculateScore(findings), status: calculateStatus(findings), audit: [...(inspection.audit ?? []), { at: new Date().toISOString(), ruleId: finding.ruleId, before: effectiveStatus(finding), after: decision, actor: inspection.inspector }] })
  }

  const exportEditable = () => {
    const rows = inspection.findings.map((finding) => `<tr>${[finding.ruleId, finding.title, effectiveStatus(finding), finding.observed, finding.explanation].map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')
    const dnaRows = dna.repeatedViolations.map((item) => `<li>${escapeHtml(item.label)}: ${item.occurrences} linked occurrences (${escapeHtml(item.ruleId)})</li>`).join('')
    const activity = (inspection.audit ?? []).map((entry) => `<li>${escapeHtml(entry.at)}: ${escapeHtml(entry.ruleId)} ${escapeHtml(entry.before)} to ${escapeHtml(entry.after)} by ${escapeHtml(entry.actor)}</li>`).join('')
    const html = `<html><head><meta charset="utf-8" /></head><body><h1>NiyamDrishti Compliance Report</h1><p>${escapeHtml(inspection.id)} · ${escapeHtml(inspection.details.name)}</p><h2>Compliance DNA</h2><p>${escapeHtml(dna.fingerprint)} · ${dna.sightings.length} linked sightings · ${dna.risk} cluster risk</p><p>${dna.sightings.filter((sighting) => sighting.provenance === 'local').length} saved scans. Remaining sightings are sample data. Declaration differences require verification.</p><ul>${dnaRows || '<li>No repeated pattern detected</li>'}</ul><h2>Inspection findings</h2><table border="1" cellpadding="8"><tr><th>Rule</th><th>Check</th><th>Decision</th><th>Observed</th><th>Reason</th></tr>${rows}</table><h2>Local officer activity</h2><ul>${activity || '<li>No recorded overrides</li>'}</ul><p>Officer-verifiable screening output; not an adjudication.</p></body></html>`
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([html], { type: 'application/msword' })); link.download = `${inspection.id}-report.doc`; link.click(); URL.revokeObjectURL(link.href)
  }

  return <div className="result-page">
    <div className="result-toolbar no-print"><button className="back-link" onClick={onBack}><ArrowLeft size={17} /> Inspection register</button><div><button className="secondary-button" onClick={exportEditable}><FileDown size={17} /> Editable report</button><button className="primary-button" onClick={() => window.print()}><Download size={17} /> Print / save PDF</button></div></div>
    <div className={`mode-banner ${demoMode ? 'demo' : 'live'}`}>{demoMode ? <Sparkles size={19} /> : <ScanLine size={19} />}<div><strong>{demoMode ? 'GUIDED DEMO · PRE-FILLED DATA' : testMode ? 'GENERATED TEST LABEL · LIVE EXTRACTION WORKFLOW' : 'LIVE SCAN · USER-SUPPLIED EVIDENCE'}</strong><span>{demoMode ? 'The product name, text and evidence boxes are prepared for presentation; they are not OCR output.' : 'Text from image recognition or your edits. Findings come from the POC rule engine and require verification.'}</span></div></div>
    <section className="result-hero">
      <div className={`score-orb ${inspection.score < 80 ? 'low' : ''}`}><strong>{inspection.score}</strong><span>POC score</span></div>
      <div className="result-identity"><div><StatusBadge status={inspection.status} /><span className="inspection-id mono">{inspection.id}</span></div><h2>{inspection.details.name}</h2><p>{inspection.details.brand} · {inspection.details.category} · {inspection.details.origin}</p><div className="meta-row"><span><MapPin size={15} />{inspection.details.location}</span><span><Clock3 size={15} />{formatDate(inspection.details.inspectionDate)}</span><span><UserRound size={15} />{inspection.inspector}</span></div></div>
      <div className="decision-cards"><div className="decision-card success"><CheckCircle2 size={19} /><div><strong>{counts.pass}</strong><span>Passed</span></div></div><div className="decision-card danger"><XCircle size={19} /><div><strong>{counts.violation}</strong><span>Potential violations</span></div></div><div className="decision-card warning"><AlertTriangle size={19} /><div><strong>{counts.review}</strong><span>Manual reviews</span></div></div></div>
    </section>

    <ComplianceDnaPanel dna={dna} inspection={inspection} />
    <div className="result-context"><span>{inspection.findings.length} applicable checks from the 12-check POC</span><span>Flags describe captured evidence; verify the whole package.</span></div>
    <CorrectionLab inspection={inspection} />

    <div className="result-grid">
      <section className="panel evidence-viewer">
        <div className="viewer-head"><div><h3>Visual evidence</h3><p>Select a finding to locate its source declaration.</p></div><span><Eye size={15} /> Evidence overlay</span></div>
        {activeImage ? <><div className="image-stage"><img src={activeImage.dataUrl} alt={`${activeImage.surface} evidence`} />{activeFinding?.box && activeFinding.surface === activeImage.surface && <div className={`evidence-box ${statusTone(effectiveStatus(activeFinding))}`} style={{ left: `${activeFinding.box.x}%`, top: `${activeFinding.box.y}%`, width: `${activeFinding.box.width}%`, height: `${activeFinding.box.height}%` }}><span>{activeFinding.ruleId}</span></div>}</div><div className="surface-tabs">{inspection.images.map((image) => <button className={image.surface === activeSurface ? 'active' : ''} key={image.id} onClick={() => setActiveSurface(image.surface)}>{image.surface}<Check size={13} /></button>)}</div></> : <div className="no-evidence"><ImagePlus size={30} /><strong>No retained image</strong><span>This older or summary record has no saved photograph. New scans retain images on this device.</span></div>}
        <div className="evidence-chain"><ShieldCheck size={18} /><div><strong>Evidence attached to this local POC record</strong><span>{inspection.images.length} image(s) · No production chain-of-custody claim</span></div><small>{demoMode ? 'DEMO ASSET' : 'LOCAL RECORD'}</small></div>
      </section>

      <section className="panel findings-panel">
        <div className="viewer-head"><div><h3>Explainable findings</h3><p>Screening suggestions remain subject to officer verification.</p></div></div>
        <div className="finding-filters no-print"><button aria-pressed={!onlyAttention} onClick={() => setOnlyAttention(false)}>All checks ({inspection.findings.length})</button><button aria-pressed={onlyAttention} onClick={() => setOnlyAttention(true)}>Needs attention ({counts.violation + counts.review})</button></div>
        <div className="findings-list">{onlyAttention && counts.violation + counts.review === 0 && <p className="filter-empty">No findings require attention.</p>}{inspection.findings.length ? inspection.findings.map((finding) => {
          const status = effectiveStatus(finding)
          return <button key={finding.id} className={`finding-item ${onlyAttention && status === 'pass' ? 'filtered-finding' : ''} ${activeFindingId === finding.id ? 'active' : ''}`} onClick={() => setActiveFindingId(finding.id)}><div className={`finding-icon ${statusTone(status)}`}>{status === 'pass' ? <Check size={16} /> : status === 'violation' ? <X size={16} /> : <AlertTriangle size={16} />}</div><div><div className="finding-title"><strong>{finding.title}</strong><span className={`severity ${finding.severity}`}>{finding.severity}</span></div><p>{finding.observed}</p><span className="finding-rule">{finding.ruleId} · {demoMode ? 'Sample evidence' : finding.box && finding.confidence !== undefined ? `${Math.round(finding.confidence * 100)}% OCR confidence` : 'Officer verification'}</span></div><ArrowRight size={16} /></button>
        }) : <div className="no-findings"><CheckCircle2 size={30} /><strong>Summary-only historical record</strong><p>Open the featured HydraGlow inspection for the complete evidence demonstration.</p></div>}</div>
      </section>
    </div>

    {activeFinding && <section className="panel finding-detail">
      <div className="detail-header"><div className={`finding-icon large ${statusTone(effectiveStatus(activeFinding))}`}>{effectiveStatus(activeFinding) === 'pass' ? <Check size={20} /> : effectiveStatus(activeFinding) === 'violation' ? <X size={20} /> : <AlertTriangle size={20} />}</div><div><span className="eyebrow">SELECTED FINDING</span><h3>{activeFinding.title}</h3></div><StatusBadge status={effectiveStatus(activeFinding)} /></div>
      <div className="detail-columns"><div><span>Observed evidence</span><strong>{activeFinding.observed}</strong></div><div><span>Requirement</span><strong>{activeFinding.requirement}</strong></div><div><span>Why it was flagged</span><strong>{activeFinding.explanation}</strong></div><div><span>Applicable provision</span><strong>{activeFinding.citation} · POC subset</strong></div></div>
      <div className="officer-decision no-print"><div><ShieldCheck size={19} /><div><strong>Officer verification</strong><span>Confirm or override the suggestion. The choice is saved in this local POC record.</span></div></div><div>{(['pass', 'violation', 'review'] as FindingStatus[]).map((decision) => <button key={decision} className={effectiveStatus(activeFinding) === decision ? `active ${statusTone(decision)}` : ''} onClick={() => setDecision(activeFinding, decision)}>{decision === 'pass' ? 'Confirm pass' : decision === 'violation' ? 'Confirm violation' : 'Send to review'}</button>)}</div></div>
    </section>}
    {!!inspection.audit?.length && <section className="panel audit-panel"><h3>Officer decision history</h3><p>Local activity record for this inspection. Not a tamper-proof or authenticated audit trail.</p>{inspection.audit.map((entry, index) => <div key={index}><time>{new Date(entry.at).toLocaleString()}</time><strong>{entry.ruleId}</strong><span>{entry.before} → {entry.after}</span><small>{entry.actor}</small></div>)}</section>}
    <footer className="report-footer"><ShieldCheck size={17} /><span>NiyamDrishti POC · Decision-support output · Final determination requires authorized officer verification.</span></footer>
  </div>
}

function sourceIcon(source: ProductSighting['source']) {
  if (source === 'E-commerce listing') return ShoppingCart
  if (source === 'Previous label') return History
  return Store
}

function ComplianceDnaPanel({ dna, inspection }: { dna: ComplianceDnaResult; inspection: Inspection }) {
  const [expanded, setExpanded] = useState(false)
  const uniqueDrifts = dna.drifts.filter((drift, index, all) => all.findIndex((item) => item.field === drift.field && item.observedValue === drift.observedValue) === index)

  if (!dna.sightings.length) {
    return <section className="dna-panel dna-empty">
      <div className="dna-mark"><Fingerprint size={24} /></div>
      <div><span className="eyebrow">COMPLIANCE DNA · {dna.fingerprint}</span><h3>No known product twins yet</h3><p>This scan becomes the first identity record. Future scans can be linked by barcode or product-name similarity.</p></div>
      <span className="dna-confidence">REPOSITORY READY</span>
    </section>
  }

  return <section className={`dna-panel ${expanded ? 'expanded' : ''}`}>
    <div className="dna-summary">
      <div className="dna-mark"><Fingerprint size={25} /></div>
      <div className="dna-heading"><div><span className="truth-chip demo">COMPLIANCE DNA</span><span className="dna-code mono">{dna.fingerprint}</span></div><h2>{uniqueDrifts.length ? 'Product matched. Declarations differ.' : 'Product matched. Declarations agree.'}</h2><p>{dna.sightings.filter((item) => item.provenance === 'local').length} saved scans and {dna.sightings.filter((item) => item.provenance !== 'local').length} sample sightings linked. A difference is a verification signal, not proof of a violation.</p></div>
      <div className="dna-quick-stats"><div><strong>{Math.round(dna.confidence * 100)}%</strong><span>match heuristic</span></div><div><strong>{dna.sightings.length}</strong><span>linked sightings</span></div><div><strong>{uniqueDrifts.length}</strong><span>declaration changes</span></div></div>
      <button className="dna-reveal" onClick={() => setExpanded((current) => !current)}>{expanded ? 'Hide network' : 'Reveal product network'} <ArrowRight size={16} /></button>
    </div>

    {expanded && <div className="dna-details">
      <div className="dna-network">
        <div className="dna-section-head"><div><Radio size={17} /><span><strong>Linked product sightings</strong><small>{dna.matchBasis}</small></span></div><span className="network-live"><i /> IDENTITY GRAPH</span></div>
        <div className="sighting-timeline">
          <div className="sighting-card current"><div className="sighting-icon"><ScanLine size={17} /></div><div><span>CURRENT INSPECTION</span><strong>{inspection.details.location}</strong><small>{formatDate(inspection.details.inspectionDate)} · Package evidence</small></div><em>Anchor</em></div>
          {dna.sightings.map((sighting) => {
            const Icon = sourceIcon(sighting.source)
            return <div className="sighting-card" key={sighting.id}><div className="sighting-icon"><Icon size={17} /></div><div><span>{sighting.provenance === 'local' ? 'YOUR SAVED SCAN' : 'SAMPLE RECORD'} · {sighting.source.toUpperCase()}</span><strong>{sighting.channel}</strong><small>{formatDate(sighting.observedAt)} · {sighting.location}</small></div><em>{Math.round((sighting.matchScore ?? dna.confidence) * 100)}%</em></div>
          })}
        </div>
      </div>

      <div className="dna-drift-board">
        <div className="dna-section-head"><div><GitCompareArrows size={17} /><span><strong>Declaration drift</strong><small>What changed across matching records</small></span></div><span className={`cluster-risk ${dna.risk.toLowerCase()}`}>{dna.risk} cluster risk</span></div>
        <div className="drift-list">{uniqueDrifts.slice(0, 4).map((drift) => <div className="drift-row" key={`${drift.field}-${drift.observedValue}`}>
          <div><span>{drift.label}</span><small>{drift.source}</small></div><strong>{drift.currentValue}</strong><ArrowRight size={14} /><strong>{drift.observedValue}</strong><span className={`severity ${drift.severity}`}>{drift.severity}</span>
        </div>)}</div>
      </div>

      <div className="dna-enforcement">
        <div className="enforcement-icon"><ShieldAlert size={21} /></div>
        <div className="enforcement-copy"><span className="eyebrow">ENFORCEMENT SIGNAL</span><h3>{dna.repeatedViolations.length} repeated violation patterns across {dna.affectedLocations} locations</h3><p>{dna.recommendation}</p></div>
        <div className="repeat-list">{dna.repeatedViolations.map((item) => <div key={item.field}><strong>{item.occurrences}×</strong><span>{item.label}<small>{item.ruleId}</small></span></div>)}</div>
      </div>
      <div className="dna-disclaimer"><Globe2 size={14} /><span>DNA compares saved scans on this device and explicitly labelled sample records. Match percentages are heuristic scores, not calibrated probabilities. Marketplace crawling is not connected.</span></div>
    </div>}
  </section>
}

export default App
