import { useState, useEffect } from 'react'
import { supabase, type Class, type Semester, type Subject, type PaperFormat } from '../lib/supabase'

export type DashboardSelection = {
  classId: string
  semesterId: string
  subjectId: string
  paperFormatId: string
}

type Props = {
  onProceed: (selection: DashboardSelection) => void
}

export default function Dashboard({ onProceed }: Props) {
  const [classes, setClasses] = useState<Class[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [paperFormats, setPaperFormats] = useState<PaperFormat[]>([])

  const [classId, setClassId] = useState('')
  const [semesterId, setSemesterId] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [paperFormatId, setPaperFormatId] = useState('')

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInitial() {
      const [classesRes, semestersRes, formatsRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('semesters').select('*').order('name'),
        supabase.from('paper_formats').select('*').order('name'),
      ])
      setClasses(classesRes.data || [])
      setSemesters(semestersRes.data || [])
      setPaperFormats(formatsRes.data || [])
      setLoading(false)
    }
    loadInitial()
  }, [])

  useEffect(() => {
    if (!classId || !semesterId) {
      setSubjects([])
      setSubjectId('')
      return
    }
    async function loadSubjects() {
      const { data } = await supabase
        .from('subjects')
        .select('*')
        .eq('class_id', classId)
        .eq('semester_id', semesterId)
        .order('name')
      setSubjects(data || [])
      setSubjectId('')
    }
    loadSubjects()
  }, [classId, semesterId])

  const canProceed = classId && semesterId && subjectId && paperFormatId

  const handleProceed = () => {
    onProceed({ classId, semesterId, subjectId, paperFormatId })
  }

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      <div className="welcome-section">
        <h2>Welcome, Professor</h2>
        <p>Select your class, semester, subject, and paper format to begin generating a question paper.</p>
      </div>

      <div className="selection-grid">
        <div className="selection-card">
          <div className="card-label">Step 1 — Class</div>
          <select
            className="form-select"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          >
            <option value="">Select a class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="selection-card">
          <div className="card-label">Step 2 — Semester</div>
          <select
            className="form-select"
            value={semesterId}
            onChange={(e) => setSemesterId(e.target.value)}
            disabled={!classId}
          >
            <option value="">Select a semester...</option>
            {semesters.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="selection-card">
          <div className="card-label">Step 3 — Subject</div>
          <select
            className="form-select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!classId || !semesterId}
          >
            <option value="">Select a subject...</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="selection-card">
          <div className="card-label">Step 4 — Paper Format</div>
          <select
            className="form-select"
            value={paperFormatId}
            onChange={(e) => setPaperFormatId(e.target.value)}
          >
            <option value="">Select a paper format...</option>
            {paperFormats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.total_marks} marks, {f.duration_minutes} min)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="action-bar">
        <div className="summary-box">
          {canProceed ? (
            <>All selections made. Ready to proceed to question selection.</>
          ) : (
            <>Please complete all four selections to continue.</>
          )}
        </div>
        <button
          className="btn btn-primary btn-lg"
          disabled={!canProceed}
          onClick={handleProceed}
        >
          Proceed to Question Bank
        </button>
      </div>
    </div>
  )
}
