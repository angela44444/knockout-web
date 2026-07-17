import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { removeBackground } from './imgly'
import { refineMask } from './maskRefine'
import { SOURCE_URL } from './config'
import './App.css'

type ModelId = 'isnet' | 'isnet_fp16' | 'isnet_quint8'

type JobStatus = 'queued' | 'processing' | 'done' | 'error'

type Job = {
  id: string
  file: File
  previewUrl: string
  status: JobStatus
  resultUrl?: string
  error?: string
}

const MODELS: { id: ModelId; label: string; hint: string }[] = [
  { id: 'isnet', label: 'Best quality', hint: 'Recommended' },
  { id: 'isnet_fp16', label: 'Balanced', hint: 'Faster' },
  { id: 'isnet_quint8', label: 'Fastest', hint: 'Smaller model' },
]

function downloadBlob(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
}

function baseName(filename: string) {
  return filename.replace(/\.[^.]+$/, '') || 'image'
}

export default function App() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [model, setModel] = useState<ModelId>('isnet')
  const [cutoff, setCutoff] = useState(0)
  const [erode, setErode] = useState(0)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipRequeueRef = useRef(true)

  const selected = jobs.find((j) => j.id === selectedId) ?? jobs[0] ?? null

  useEffect(() => {
    if (skipRequeueRef.current) {
      skipRequeueRef.current = false
      return
    }
    setJobs((prev) =>
      prev.map((j) => {
        if (j.status !== 'done') return j
        if (j.resultUrl) URL.revokeObjectURL(j.resultUrl)
        return { ...j, status: 'queued' as const, resultUrl: undefined, error: undefined }
      }),
    )
  }, [cutoff, erode])

  const addFiles = useCallback((fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!files.length) return

    const next: Job[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'queued' as const,
    }))

    setJobs((prev) => [...prev, ...next])
    setSelectedId((prev) => prev ?? next[0]?.id ?? null)
  }, [])

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const updateJob = (id: string, patch: Partial<Job>) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)))
  }

  const processOne = async (job: Job) => {
    if (job.resultUrl) URL.revokeObjectURL(job.resultUrl)
    updateJob(job.id, { status: 'processing', error: undefined, resultUrl: undefined })
    setProgressLabel('Preparing…')
    setProgressPct(null)

    try {
      const raw = await removeBackground(job.file, {
        device: 'gpu',
        model,
        output: { format: 'image/png', type: 'foreground' },
        progress: (key, current, total) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100)
            setProgressPct(pct)
            setProgressLabel(
              key.includes('fetch') || key.includes('download')
                ? 'Downloading model…'
                : 'Removing background…',
            )
          }
        },
      })
      setProgressLabel('Cleaning edges…')
      const blob = await refineMask(raw, { cutoff, erode })
      const resultUrl = URL.createObjectURL(blob)
      updateJob(job.id, { status: 'done', resultUrl })
    } finally {
      setProgressLabel(null)
      setProgressPct(null)
    }
  }

  const runAll = async () => {
    const pending = jobs.filter((j) => j.status === 'queued' || j.status === 'error')
    if (!pending.length || busy) return
    setBusy(true)
    for (const job of pending) {
      try {
        await processOne(job)
      } catch (err) {
        updateJob(job.id, {
          status: 'error',
          error: err instanceof Error ? err.message : 'Removal failed',
        })
        setProgressLabel(null)
        setProgressPct(null)
      }
    }
    setBusy(false)
  }

  const clearAll = () => {
    jobs.forEach((j) => {
      URL.revokeObjectURL(j.previewUrl)
      if (j.resultUrl) URL.revokeObjectURL(j.resultUrl)
    })
    setJobs([])
    setSelectedId(null)
  }

  const hasJobs = jobs.length > 0
  const pendingCount = jobs.filter((j) => j.status === 'queued' || j.status === 'error').length
  const doneCount = jobs.filter((j) => j.status === 'done').length

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden />

      <header className="top">
        <p className="brand">Knockout</p>
        <p className="tag">Browser AI · Transparent PNG · No upload</p>
      </header>

      <main className="hero">
        {!hasJobs ? (
          <section
            className={`dropzone ${dragOver ? 'is-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e: KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
          >
            <h1 className="headline">Drop images. Keep the subject.</h1>
            <p className="lede">
              Knockout strips backgrounds in your browser — images never leave your device.
            </p>
            <div className="cta-row">
              <span className="cta">Choose files</span>
              <span className="hint">PNG, JPG, WEBP · batch ready</span>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </section>
        ) : (
          <section className="workspace">
            <div
              className={`drop-strip ${dragOver ? 'is-over' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <button type="button" className="ghost" onClick={() => inputRef.current?.click()}>
                Add more
              </button>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
              <div className="controls">
                <label className="field">
                  <span>Quality</span>
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value as ModelId)}
                    disabled={busy}
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label} — {m.hint}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field range-field">
                  <span>Remove more background ({cutoff})</span>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={1}
                    value={cutoff}
                    onChange={(e) => setCutoff(Number(e.target.value))}
                    disabled={busy}
                  />
                </label>
                <label className="field range-field">
                  <span>Tighten edges ({erode})</span>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={erode}
                    onChange={(e) => setErode(Number(e.target.value))}
                    disabled={busy}
                  />
                </label>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="primary"
                  onClick={runAll}
                  disabled={busy || pendingCount === 0}
                >
                  {busy ? 'Working…' : `Knock out ${pendingCount || ''}`.trim()}
                </button>
                {doneCount > 0 && selected?.resultUrl && (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      downloadBlob(
                        selected.resultUrl!,
                        `${baseName(selected.file.name)}-transparent.png`,
                      )
                    }
                  >
                    Download PNG
                  </button>
                )}
                <button type="button" className="ghost danger" onClick={clearAll} disabled={busy}>
                  Clear
                </button>
              </div>
            </div>

            <p className="controls-hint">
              Glow or dark backgrounds? Try Best quality and raise Remove more background slightly.
            </p>

            {busy && progressLabel && (
              <div className="progress-bar" role="status">
                <p className="progress-label">{progressLabel}</p>
                {progressPct !== null && (
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                )}
              </div>
            )}

            {selected && (
              <div className="compare">
                <figure className="pane">
                  <figcaption>Original</figcaption>
                  <img src={selected.previewUrl} alt={selected.file.name} />
                </figure>
                <figure className="pane result">
                  <figcaption>
                    {selected.status === 'done'
                      ? 'Transparent'
                      : selected.status === 'processing'
                        ? 'Processing…'
                        : selected.status === 'error'
                          ? 'Failed'
                          : 'Waiting'}
                  </figcaption>
                  <div className="checker">
                    {selected.resultUrl ? (
                      <img src={selected.resultUrl} alt="Transparent result" />
                    ) : (
                      <div className="placeholder">
                        {selected.status === 'processing' && <span className="pulse" />}
                        {selected.status === 'error' && (
                          <p className="err">{selected.error}</p>
                        )}
                        {selected.status === 'queued' && (
                          <p>Run Knockout to see the cutout.</p>
                        )}
                      </div>
                    )}
                  </div>
                </figure>
              </div>
            )}

            <ul className="queue">
              {jobs.map((job) => (
                <li key={job.id}>
                  <button
                    type="button"
                    className={`thumb ${selected?.id === job.id ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(job.id)}
                  >
                    <img src={job.previewUrl} alt="" />
                    <span className={`badge status-${job.status}`}>{job.status}</span>
                  </button>
                  {job.resultUrl && (
                    <button
                      type="button"
                      className="dl"
                      title="Download"
                      onClick={() =>
                        downloadBlob(
                          job.resultUrl!,
                          `${baseName(job.file.name)}-transparent.png`,
                        )
                      }
                    >
                      ↓
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="foot">
        <span>Runs in your browser — images are not uploaded</span>
        <span>
          <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer">
            Source code
          </a>{' '}
          (AGPL-3.0)
        </span>
        <span>
          Powered by{' '}
          <a
            href="https://github.com/imgly/background-removal-js"
            target="_blank"
            rel="noopener noreferrer"
          >
            @imgly/background-removal
          </a>
        </span>
        <span>First visit downloads the AI model (~40–80 MB)</span>
      </footer>
    </div>
  )
}
