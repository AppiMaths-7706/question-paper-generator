import { useState, useEffect, useRef } from 'react'
import { supabase, type Question, type PaperSection, type Subject, type PaperFormat } from '../lib/supabase'
import type { DashboardSelection } from './Dashboard'
import type { SelectedQuestions } from './QuestionBank'

type Props = {
  selection: DashboardSelection
  selectedQuestions: SelectedQuestions
  onBack: () => void
  onSaved: () => void
}

type SectionData = {
  section: PaperSection
  questions: Question[]
}

export default function PaperPreview({ selection, selectedQuestions, onBack, onSaved }: Props) {
  const [sections, setSections] = useState<SectionData[]>([])
  const [subject, setSubject] = useState<Subject | null>(null)
  const [className, setClassName] = useState('')
  const [semesterName, setSemesterName] = useState('')
  const [format, setFormat] = useState<PaperFormat | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedPaperId, setSavedPaperId] = useState<string | null>(null)
  const [academicYear, setAcademicYear] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      const [sectionsRes, subjectRes, classRes, semesterRes, formatRes] = await Promise.all([
        supabase.from('paper_sections').select('*').eq('paper_format_id', selection.paperFormatId).order('question_number'),
        supabase.from('subjects').select('*').eq('id', selection.subjectId).maybeSingle(),
        supabase.from('classes').select('*').eq('id', selection.classId).maybeSingle(),
        supabase.from('semesters').select('*').eq('id', selection.semesterId).maybeSingle(),
        supabase.from('paper_formats').select('*').eq('id', selection.paperFormatId).maybeSingle(),
      ])

      const allQuestionIds: string[] = []
      for (const s of (sectionsRes.data || [])) {
        const ids = Array.from(selectedQuestions[s.question_number] || [])
        allQuestionIds.push(...ids)
      }

      let questionsMap: { [id: string]: Question } = {}
      if (allQuestionIds.length > 0) {
        const { data: qs } = await supabase
          .from('questions')
          .select('*')
          .in('id', allQuestionIds)
        questionsMap = {}
        for (const q of (qs || [])) {
          questionsMap[q.id] = q
        }
      }

      const sectionData: SectionData[] = (sectionsRes.data || []).map((s) => ({
        section: s,
        questions: Array.from(selectedQuestions[s.question_number] || [])
          .map((id) => questionsMap[id])
          .filter((q) => q !== undefined),
      }))

      setSections(sectionData)
      setSubject(subjectRes.data)
      setClassName(classRes.data?.name || '')
      setSemesterName(semesterRes.data?.name || '')
      setFormat(formatRes.data)

      const now = new Date()
      setAcademicYear(`${now.getFullYear()}-${now.getFullYear() + 1}`)
      setLoading(false)
    }
    loadData()
  }, [selection, selectedQuestions])

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)

    try {
      const { data: paperData, error: paperError } = await supabase
        .from('papers')
        .insert({
          subject_id: selection.subjectId,
          paper_format_id: selection.paperFormatId,
          academic_year: academicYear,
        })
        .select()
        .single()

      if (paperError) throw paperError

      const paperId = paperData.id
      const paperQuestions: { paper_id: string; question_id: string; question_number: number; section: number }[] = []

      for (const sd of sections) {
        sd.questions.forEach((q, idx) => {
          paperQuestions.push({
            paper_id: paperId,
            question_id: q.id,
            question_number: idx + 1,
            section: sd.section.question_number,
          })
        })
      }

      const { error: pqError } = await supabase
        .from('paper_questions')
        .insert(paperQuestions)

      if (pqError) throw pqError

      setSavedPaperId(paperId)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save paper')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (!previewRef.current) return
    const html2canvas = (await import('html2canvas')).default
    const jsPDF = (await import('jspdf')).default

    const canvas = await html2canvas(previewRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pdfWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pdfHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight
    }

    pdf.save(`question-paper-${subject?.name || 'paper'}.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    )
  }

  const unitRoman = (unit: number | null) => {
    if (unit === null) return null
    return ['I', 'II', 'III', 'IV', 'V'][unit - 1] || String(unit)
  }

  return (
    <div>
      <div className="stepper no-print">
        <div className="step done">
          <div className="step-number">1</div>
          <span className="step-label">Dashboard</span>
        </div>
        <div className="step-divider" />
        <div className="step done">
          <div className="step-number">2</div>
          <span className="step-label">Question Bank</span>
        </div>
        <div className="step-divider" />
        <div className="step active">
          <div className="step-number">3</div>
          <span className="step-label">Preview</span>
        </div>
      </div>

      {saveError && <div className="alert alert-error no-print" style={{ marginBottom: '16px' }}>{saveError}</div>}
      {savedPaperId && <div className="alert alert-success no-print" style={{ marginBottom: '16px' }}>Paper saved successfully!</div>}

      <div className="paper-preview-container">
        <div className="paper-preview" ref={previewRef}>
          <div className="paper-header">
            <h1>{className} (NEP-2020 Pattern)</h1>
            <h2>{semesterName}</h2>
            <h3>Mathematics-DSE: {subject?.name}</h3>
            <div className="paper-meta">
              <span>Time: {format ? `${Math.floor(format.duration_minutes / 60)} Hours` : ''}</span>
              <span>Max Marks: {format?.total_marks}</span>
            </div>
          </div>

          <div className="paper-instructions">
            <strong>Instructions:</strong> All questions are compulsory. The question paper consists of {sections.length} sections.
            Answer the required number of questions from each section as indicated.
          </div>

          {sections.map((sd) => (
            <div key={sd.section.id} className="paper-section-block">
              <div className="section-title">
                Q{sd.section.question_number}. {sd.section.unit !== null ? `From Unit ${unitRoman(sd.section.unit)}` : 'Short Answer Questions'}
              </div>
              <div className="section-instruction">
                Answer any {sd.section.questions_to_answer} out of {sd.section.available_questions}. ({sd.section.marks_each} marks each = {sd.section.questions_to_answer * sd.section.marks_each} marks)
              </div>
              <ol>
                {sd.questions.map((q) => (
                  <li key={q.id}>{q.question_text}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>

        <div className="paper-actions no-print">
          <button className="btn btn-outline" onClick={onBack}>Back to Question Bank</button>
          <button className="btn btn-secondary" onClick={handlePrint}>Print</button>
          <button className="btn btn-secondary" onClick={handleDownloadPDF}>Download PDF</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving || !!savedPaperId}
          >
            {saving ? 'Saving...' : savedPaperId ? 'Saved' : 'Save Paper'}
          </button>
          {savedPaperId && (
            <button className="btn btn-primary" onClick={onSaved}>Done — New Paper</button>
          )}
        </div>
      </div>
    </div>
  )
}
