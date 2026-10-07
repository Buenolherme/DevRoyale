import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, getButtonClassName } from '@/components/ui'
import { lessonChecks, lessonPractice } from '@/data/trainingCatalog'

export function LessonPractice({ lessonId }: { lessonId: string }) {
  const check = lessonChecks[lessonId]
  const practice = lessonPractice[lessonId]
  const [choice, setChoice] = useState<number | null>(null)
  const [checked, setChecked] = useState(false)
  return <>
    {check && <section className="study-content-block training-concept">
      <h3>Verifique o conceito</h3><p>Atividade local de compreensão. Não executa código nem concede XP extra.</p>
      <fieldset><legend>{check.question}</legend>{check.options.map((option, index) => <label key={option} className="training-check"><input type="radio" name={`check-${lessonId}`} checked={choice === index} onChange={() => { setChoice(index); setChecked(false) }} /><span>{option}</span></label>)}</fieldset>
      <Button variant="secondary" disabled={choice === null} onClick={() => setChecked(true)}>Verificar resposta</Button>
      {checked && <p role="status"><strong>{choice === check.answer ? 'Correto. ' : 'Revise este ponto. '}</strong>{check.explanation}</p>}
    </section>}
    {practice && <section className="study-content-block"><h3>Leve este conceito à Arena</h3><p>{practice.concept}</p><div className="training-dimensions">
      {practice.bugId && <Link to={`/bug-arena?bug=${encodeURIComponent(practice.bugId)}`} className={getButtonClassName({ variant: 'secondary' })}>Praticar na Bug Arena</Link>}
      {practice.battleId && <Link to={`/batalha-devs?challenge=${encodeURIComponent(practice.battleId)}`} className={getButtonClassName({ variant: 'gold' })}>Treinar em batalha</Link>}
    </div></section>}
  </>
}
