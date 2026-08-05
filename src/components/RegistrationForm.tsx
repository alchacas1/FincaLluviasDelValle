import { useState } from 'react'
import type { FormEvent } from 'react'
import { Baby, UserRound, UsersRound } from 'lucide-react'

import { getLocalDateInputValue } from '../utils/date'
import type { EntryMode, VisitorDraft, VisitorType } from '../types/visitor'

interface RegistrationFormProps {
  onSubmit: (draft: VisitorDraft) => Promise<boolean>
  isSaving: boolean
}

interface FormValues {
  name: string
  identification: string
  visitDate: string
  nationality: string
  visitorType: VisitorType
  entryMode: EntryMode
  responsibleName: string
  groupMembersText: string
}

type FormErrors = Partial<Record<'name' | 'identification' | 'visitDate' | 'nationality' | 'responsibleName' | 'groupMembers', string>>

const requiredMessages = {
  name: 'Ingresa el nombre completo.',
  identification: 'Ingresa la identificación.',
  visitDate: 'Selecciona la fecha.',
  nationality: 'Selecciona la nacionalidad.',
  responsibleName: 'Ingresa la persona encargada.',
  groupMembers: 'Agrega al menos un integrante del grupo.',
} as const

const nationalities = [
  'Costa Rica',
  'Nicaragua',
  'Panamá',
  'Colombia',
  'Estados Unidos',
  'Canadá',
  'México',
  'España',
  'Otra',
]

function createInitialValues(): FormValues {
  return {
    name: '',
    identification: '',
    visitDate: getLocalDateInputValue(),
    nationality: '',
    visitorType: 'adult',
    entryMode: 'individual',
    responsibleName: '',
    groupMembersText: '',
  }
}

function getErrorId(field: keyof FormErrors): string {
  return field === 'responsibleName'
    ? 'responsible-name-error'
    : field === 'groupMembers'
      ? 'group-members-error'
      : `${field}-error`
}

function getFieldDescribedBy(error: string | undefined, field: keyof FormErrors): string | undefined {
  return error ? getErrorId(field) : undefined
}

export function RegistrationForm({ onSubmit, isSaving }: RegistrationFormProps) {
  const [values, setValues] = useState<FormValues>(createInitialValues)
  const [errors, setErrors] = useState<FormErrors>({})

  const updateValue = <Key extends keyof FormValues>(key: Key, value: FormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleReset = () => {
    setValues(createInitialValues())
    setErrors({})
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const name = values.name.trim()
    const identification = values.identification.trim()
    const visitDate = values.visitDate.trim()
    const nationality = values.nationality.trim()
    const responsibleName = values.responsibleName.trim()
    const groupMembers = values.groupMembersText
      .split(/\r?\n/)
      .map((member) => member.trim())
      .filter(Boolean)

    const nextErrors: FormErrors = {}

    if (!name) nextErrors.name = requiredMessages.name
    if (!identification) nextErrors.identification = requiredMessages.identification
    if (!visitDate) nextErrors.visitDate = requiredMessages.visitDate
    if (!nationality) nextErrors.nationality = requiredMessages.nationality
    if (values.entryMode === 'group' && !responsibleName) {
      nextErrors.responsibleName = requiredMessages.responsibleName
    }
    if (values.entryMode === 'group' && groupMembers.length === 0) {
      nextErrors.groupMembers = requiredMessages.groupMembers
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const wasSaved = await onSubmit({
      name,
      identification,
      visitDate,
      nationality,
      visitorType: values.visitorType,
      entryMode: values.entryMode,
      ...(values.entryMode === 'group' ? { responsibleName } : {}),
      groupMembers: values.entryMode === 'group' ? groupMembers : [],
    })

    if (wasSaved) handleReset()
  }

  return (
    <form className="registration-form" onSubmit={handleSubmit} noValidate>
      {Object.keys(errors).length > 0 && (
        <div className="form-errors" role="alert">
          <ul>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field} id={getErrorId(field as keyof FormErrors)}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-field">
        <label htmlFor="name">Nombre</label>
        <input
          id="name"
          value={values.name}
          onChange={(event) => updateValue('name', event.target.value)}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={getFieldDescribedBy(errors.name, 'name')}
        />
      </div>

      <div className="form-field">
        <label htmlFor="identification">Identificación</label>
        <input
          id="identification"
          value={values.identification}
          onChange={(event) => updateValue('identification', event.target.value)}
          aria-invalid={Boolean(errors.identification)}
          aria-describedby={getFieldDescribedBy(errors.identification, 'identification')}
        />
      </div>

      <div className="form-field">
        <label htmlFor="visit-date">Fecha</label>
        <input
          id="visit-date"
          type="date"
          value={values.visitDate}
          onChange={(event) => updateValue('visitDate', event.target.value)}
          aria-invalid={Boolean(errors.visitDate)}
          aria-describedby={getFieldDescribedBy(errors.visitDate, 'visitDate')}
        />
      </div>

      <div className="form-field">
        <label htmlFor="nationality">Nacionalidad</label>
        <select
          id="nationality"
          value={values.nationality}
          onChange={(event) => updateValue('nationality', event.target.value)}
          aria-invalid={Boolean(errors.nationality)}
          aria-describedby={getFieldDescribedBy(errors.nationality, 'nationality')}
        >
          <option value="">Selecciona una nacionalidad</option>
          {nationalities.map((nationality) => <option key={nationality} value={nationality}>{nationality}</option>)}
        </select>
      </div>

      <fieldset className="segmented-control">
        <legend>Tipo de visitante</legend>
        <div className="segmented-options">
          <label className="segmented-option">
            <input
              type="radio"
              name="visitor-type"
              checked={values.visitorType === 'adult'}
              onChange={() => updateValue('visitorType', 'adult')}
            />
            <UserRound aria-hidden="true" />
            Adulto
          </label>
          <label className="segmented-option">
            <input
              type="radio"
              name="visitor-type"
              checked={values.visitorType === 'child'}
              onChange={() => updateValue('visitorType', 'child')}
            />
            <Baby aria-hidden="true" />
            Niño
          </label>
        </div>
      </fieldset>

      <fieldset className="segmented-control">
        <legend>Modalidad de ingreso</legend>
        <div className="segmented-options">
          <label className="segmented-option">
            <input
              type="radio"
              name="entry-mode"
              checked={values.entryMode === 'individual'}
              onChange={() => updateValue('entryMode', 'individual')}
            />
            <UserRound aria-hidden="true" />
            Individual
          </label>
          <label className="segmented-option">
            <input
              type="radio"
              name="entry-mode"
              checked={values.entryMode === 'group'}
              onChange={() => updateValue('entryMode', 'group')}
            />
            <UsersRound aria-hidden="true" />
            Grupo
          </label>
        </div>
      </fieldset>

      {values.entryMode === 'group' && (
        <div className="group-fields">
          <div className="form-field">
            <label htmlFor="responsible-name">Persona encargada</label>
            <input
              id="responsible-name"
              value={values.responsibleName}
              onChange={(event) => updateValue('responsibleName', event.target.value)}
              aria-invalid={Boolean(errors.responsibleName)}
              aria-describedby={getFieldDescribedBy(errors.responsibleName, 'responsibleName')}
            />
          </div>

          <div className="form-field">
            <label htmlFor="group-members">Nombres del grupo</label>
            <textarea
              id="group-members"
              value={values.groupMembersText}
              maxLength={500}
              onChange={(event) => updateValue('groupMembersText', event.target.value)}
              aria-invalid={Boolean(errors.groupMembers)}
              aria-describedby={getFieldDescribedBy(errors.groupMembers, 'groupMembers')}
            />
          </div>
        </div>
      )}

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={handleReset} disabled={isSaving}>Limpiar formulario</button>
        <button className="primary-button" type="submit" disabled={isSaving}>Registrar ingreso</button>
      </div>
    </form>
  )
}
