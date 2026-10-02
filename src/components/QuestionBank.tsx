import { useState, useEffect } from 'react'
import { supabase, type Question, type PaperSection, type Subject, type PaperFormat } from '../lib/supabase'
import type { DashboardSelection } from './Dashboard'

export type SelectedQuestions = {
  [sectionNumber: number]: Set<string>
}

type Props = {
  selection: DashboardSelection
  onBack: () => void
  onPreview: (selectedQuestions: SelectedQuestions) => void
}

type UnitGroup = {
  unit: number
  fiveMarkQuestions: Question[]
  twoMarkQuestions: Question[]
}

export default function QuestionBank({ selection, onBack, onPreview }: Props) {
  const [sections, setSections] = useState<PaperSection[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [subject, setSubject] = useState<Subject | null>(null)
  const [className, setClassName] = useState('')
  const [semesterName, setSemesterName] = useState('')
  const [format, setFormat] = useState<PaperFormat | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SelectedQuestions>({})

  useEffect(() => {
    async function loadData() {
      const [sectionsRes, questionsRes, subjectRes, classRes, semesterRes, formatRes] = await Promise.all([
        supabase.from('paper_sections').select('*').eq('paper_format_id', selection.paperFormatId).order('question_number'),
        supabase.from('questions').select('*').eq('subject_id', selection.subjectId).order('unit').order('marks', { ascending: false }).order('created_at'),
        supabase.from('subjects').select('*').eq('id', selection.subjectId).maybeSingle(),
        supabase.from('classes').select('*').eq('id', selection.classId).maybeSingle(),
        supabase.from('semesters').select('*').eq('id', selection.semesterId).maybeSingle(),
        supabase.from('paper_formats').select('*').eq('id', selection.paperFormatId).maybeSingle(),
      ])

      setSections(sectionsRes.data || [])
      setQuestions(questionsRes.data || [])
      setSubject(subjectRes.data)
      setClassName(classRes.data?.name || '')
      setSemesterName(semesterRes.data?.name || '')
      setFormat(formatRes.data)

      const initialSelected: SelectedQuestions = {}
      for (const s of (sectionsRes.data || [])) {
        initialSelected[s.question_number] = new Set<string>()
      }
      setSelected(initialSelected)
      setLoading(false)
    }
    loadData()
  }, [selection])

  const groupByUnit = (qs: Question[]): UnitGroup[] => {
    const units: { [key: number]: UnitGroup } = {}
    for (const q of qs) {
      if (!units[q.unit]) {
        units[q.unit] = { unit: q.unit, fiveMarkQuestions: [], twoMarkQuestions: [] }
      }
      if (q.marks === 5) {
        units[q.unit].fiveMarkQuestions.push(q)
      } else {
        units[q.unit].twoMarkQuestions.push(q)
      }
    }
    return Object.values(units).sort((a, b) => a.unit - b.unit)
  }

  const toggleQuestion = (sectionNumber: number, questionId: string, maxAllowed: number) => {
    setSelected((prev) => {
      const newSelected = { ...prev }
      const currentSet = new Set(prev[sectionNumber] || [])
      if (currentSet.has(questionId)) {
        currentSet.delete(questionId)
      } else {
        if (currentSet.size >= maxAllowed) {
          return prev
        }
        currentSet.add(questionId)
      }
      newSelected[sectionNumber] = currentSet
      return newSelected
    })
  }

  const allSectionsComplete = sections.every((s) => {
    const count = selected[s.question_number]?.size || 0
    return count === s.questions_to_answer
  })

  const totalSelected = sections.reduce((sum, s) => sum + (selected[s.question_number]?.size || 0), 0)
  const totalRequired = sections.reduce((sum, s) => sum + s.questions_to_answer, 0)

  const handlePreview = () => {
    onPreview(selected)
  }

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner" />
      </div>
    )
  }

  const unitGroups = groupByUnit(questions)

  return (
    <div>
      <div className="stepper">
        <div className="step done">
          <div className="step-number">1</div>
          <span className="step-label">Dashboard</span>
        </div>
        <div className="step-divider" />
        <div className="step active">
          <div className="step-number">2</div>
          <span className="step-label">Question Bank</span>
        </div>
        <div className="step-divider" />
        <div className="step">
          <div className="step-number">3</div>
          <span className="step-label">Preview</span>
        </div>
      </div>

      <div className="welcome-section">
        <h2>{subject?.name}</h2>
        <p>{className} &middot; {semesterName} &middot; {format?.name}</p>
      </div>

      <div className="question-bank">
        {sections.map((section) => {
          const sectionQuestions = section.unit !== null
            ? (section.marks_each === 5
                ? unitGroups.find((g) => g.unit === section.unit)?.fiveMarkQuestions || []
                : unitGroups.find((g) => g.unit === section.unit)?.twoMarkQuestions || [])
            : questions.filter((q) => q.marks === section.marks_each)

          const availablePool = sectionQuestions.slice(0, section.available_questions)
          const selectedCount = selected[section.question_number]?.size || 0
          const isComplete = selectedCount === section.questions_to_answer
          const unitLabel = section.unit !== null
            ? `Unit ${['I', 'II', 'III', 'IV'][section.unit - 1] || section.unit}`
            : 'Short Questions'

          return (
            <div key={section.id} className="unit-section">
              <div className="unit-header">
                <h3>
                  Q{section.question_number}. {unitLabel}
                  <span style={{ fontWeight: 400, color: 'var(--neutral-500)', fontSize: '0.8125rem', marginLeft: '8px' }}>
                    &mdash; Answer any {section.questions_to_answer} out of {section.available_questions} ({section.marks_each} marks each)
                  </span>
                </h3>
                <span className={`selection-badge ${isComplete ? 'complete' : selectedCount > 0 ? 'incomplete' : ''}`}>
                  Selected {selectedCount} / {section.questions_to_answer}
                </span>
              </div>
              <div className="question-list">
                {availablePool.map((q, idx) => {
                  const isSelected = selected[section.question_number]?.has(q.id) || false
                  return (
                    <label
                      key={q.id}
                      className={`question-item ${isSelected ? 'selected' : ''}`}
                    >
                      <span className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuestion(section.question_number, q.id, section.questions_to_answer)}
                        />
                      </span>
                      <span className="q-number">Q{idx + 1}</span>
                      <span className="q-text">{q.question_text}</span>
                      <span className="q-marks">{q.marks} marks</span>
                    </label>
                  )
                })}
                {availablePool.length === 0 && (
                  <div style={{ padding: '16px 24px', color: 'var(--neutral-400)', fontSize: '0.875rem' }}>
                    No questions available for this section.
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="action-bar">
        <div className="summary-box">
          Total selected: <strong>{totalSelected}</strong> / {totalRequired} questions required
          {!allSectionsComplete && (
            <div style={{ marginTop: '4px', color: 'var(--warning-600)' }}>
              Please select the required number of questions in each section to proceed.
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={onBack}>Back</button>
          <button
            className="btn btn-primary btn-lg"
            disabled={!allSectionsComplete}
            onClick={handlePreview}
          >
            Preview Paper
          </button>
        </div>
      </div>
    </div>
  )
}
