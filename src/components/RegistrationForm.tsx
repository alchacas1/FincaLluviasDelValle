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
  firstName: string
  firstLastName: string
  secondLastName: string
  identification: string
  visitDate: string
  nationality: string
  visitorType: VisitorType
  entryMode: EntryMode
  groupMembersText: string
}

type ErrorField =
  | 'firstName'
  | 'firstLastName'
  | 'secondLastName'
  | 'identification'
  | 'visitDate'
  | 'nationality'
  | 'groupMembers'

type FormErrors = Partial<Record<ErrorField, string>>

const requiredMessages = {
  firstName: 'Ingresa el nombre.',
  firstLastName: 'Ingresa el primer apellido.',
  secondLastName: 'Ingresa el segundo apellido.',
  identification: 'Ingresa la identificación.',
  visitDate: 'Selecciona la fecha.',
  nationality: 'Selecciona la nacionalidad.',
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

const errorIds: Record<ErrorField, string> = {
  firstName: 'first-name-error',
  firstLastName: 'first-last-name-error',
  secondLastName: 'second-last-name-error',
  identification: 'identification-error',
  visitDate: 'visitDate-error',
  nationality: 'nationality-error',
  groupMembers: 'group-members-error',
}

const memberNumberPattern = /^\s*\d+\.\s*/

function createInitialValues(): FormValues {
  return {
    firstName: '',
    firstLastName: '',
    secondLastName: '',
    identification: '',
    visitDate: getLocalDateInputValue(),
    nationality: '',
    visitorType: 'adult',
    entryMode: 'individual',
    groupMembersText: '',
  }
}

function getErrorId(field: ErrorField): string {
  return errorIds[field]
}

function getFieldDescribedBy(error: string | undefined, field: ErrorField): string | undefined {
  return error ? getErrorId(field) : undefined
}

function stripMemberNumber(member: string): string {
  return member.replace(memberNumberPattern, '').trim()
}

function parseGroupMembers(groupMembersText: string): string[] {
  return groupMembersText
    .split(/\r?\n/)
    .map(stripMemberNumber)
    .filter(Boolean)
}

function formatGroupMembersText(groupMembersText: string): string {
  const normalizedText = groupMembersText.replace(/\r\n/g, '\n')

  if (!normalizedText.includes('\n')) {
    return groupMembersText
  }

  const completedMembers = normalizedText
    .split('\n')
    .map(stripMemberNumber)
    .filter(Boolean)
  const shouldAddNextLine = normalizedText.endsWith('\n')
  const numberedMembers = shouldAddNextLine ? [...completedMembers, ''] : completedMembers

  return numberedMembers
    .map((member, index) => `${index + 1}. ${member}`)
    .join('\n')
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

    const firstName = values.firstName.trim()
    const firstLastName = values.firstLastName.trim()
    const secondLastName = values.secondLastName.trim()
    const identification = values.identification.trim()
    const visitDate = values.visitDate.trim()
    const nationality = values.nationality.trim()
    const groupMembers = parseGroupMembers(values.groupMembersText)

    const nextErrors: FormErrors = {}

    if (!firstName) nextErrors.firstName = requiredMessages.firstName
    if (!firstLastName) nextErrors.firstLastName = requiredMessages.firstLastName
    if (!secondLastName) nextErrors.secondLastName = requiredMessages.secondLastName
    if (!identification) nextErrors.identification = requiredMessages.identification
    if (!visitDate) nextErrors.visitDate = requiredMessages.visitDate
    if (!nationality) nextErrors.nationality = requiredMessages.nationality
    if (values.entryMode === 'group' && groupMembers.length === 0) {
      nextErrors.groupMembers = requiredMessages.groupMembers
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const wasSaved = await onSubmit({
      firstName,
      firstLastName,
      secondLastName,
      identification,
      visitDate,
      nationality,
      visitorType: values.visitorType,
      entryMode: values.entryMode,
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
              <li key={field} id={getErrorId(field as ErrorField)}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-field">
        <label htmlFor="first-name">Nombre</label>
        <input
          id="first-name"
          value={values.firstName}
          onChange={(event) => updateValue('firstName', event.target.value)}
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby={getFieldDescribedBy(errors.firstName, 'firstName')}
        />
      </div>

      <div className="form-field">
        <label htmlFor="first-last-name">Primer apellido</label>
        <input
          id="first-last-name"
          value={values.firstLastName}
          onChange={(event) => updateValue('firstLastName', event.target.value)}
          aria-invalid={Boolean(errors.firstLastName)}
          aria-describedby={getFieldDescribedBy(errors.firstLastName, 'firstLastName')}
        />
      </div>

      <div className="form-field">
        <label htmlFor="second-last-name">Segundo apellido</label>
        <input
          id="second-last-name"
          value={values.secondLastName}
          onChange={(event) => updateValue('secondLastName', event.target.value)}
          aria-invalid={Boolean(errors.secondLastName)}
          aria-describedby={getFieldDescribedBy(errors.secondLastName, 'secondLastName')}
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
            <label htmlFor="group-members">Nombres del grupo</label>
            <p className="field-help" id="group-members-help">
              Agrega cada integrante en una línea distinta. Presiona Enter después de cada nombre para verlo en la lista.
            </p>
            <p className="field-help" id="group-members-format-help">
              Formato recomendado: nombre apellido1 apellido2 - cédula.
            </p>
            <textarea
              id="group-members"
              value={values.groupMembersText}
              maxLength={500}
              placeholder={'alvaro chaves cascante - 117910947\njosue jauna pere - 12513615'}
              onChange={(event) => updateValue('groupMembersText', formatGroupMembersText(event.target.value))}
              aria-invalid={Boolean(errors.groupMembers)}
              aria-describedby={[
                'group-members-help',
                'group-members-format-help',
                getFieldDescribedBy(errors.groupMembers, 'groupMembers'),
              ].filter(Boolean).join(' ')}
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
