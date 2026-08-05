import { useState } from 'react'
import type { FormEvent } from 'react'
import { Baby, Plus, ShieldCheck, Trash2, UserRound, UserRoundPlus, UsersRound } from 'lucide-react'

import type { EntryMode, GroupMember, VisitorDraft, VisitorType } from '../types/visitor'
import { getGroupMemberInitials } from '../utils/groupMembers'
import { getLocalDateInputValue } from '../utils/date'

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
  memberFullName: string
  memberIdentification: string
  memberVisitorType: VisitorType
  groupMembers: GroupMember[]
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
    memberFullName: '',
    memberIdentification: '',
    memberVisitorType: 'adult',
    groupMembers: [],
  }
}

function getErrorId(field: ErrorField): string {
  return errorIds[field]
}

function getFieldDescribedBy(error: string | undefined, field: ErrorField): string | undefined {
  return error ? getErrorId(field) : undefined
}

export function RegistrationForm({ onSubmit, isSaving }: RegistrationFormProps) {
  const [values, setValues] = useState<FormValues>(createInitialValues)
  const [errors, setErrors] = useState<FormErrors>({})
  const [memberError, setMemberError] = useState('')

  const updateValue = <Key extends keyof FormValues>(key: Key, value: FormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const handleReset = () => {
    setValues(createInitialValues())
    setErrors({})
    setMemberError('')
  }

  const handleAddGroupMember = () => {
    const fullName = values.memberFullName.trim()
    const identification = values.memberIdentification.trim()

    if (!fullName || !identification) {
      setMemberError('Ingresa el nombre completo y la cédula del integrante.')
      return
    }

    const nextMember: GroupMember = {
      id: crypto.randomUUID(),
      fullName,
      identification,
      visitorType: values.memberVisitorType,
    }

    setValues((current) => ({
      ...current,
      memberFullName: '',
      memberIdentification: '',
      memberVisitorType: 'adult',
      groupMembers: [...current.groupMembers, nextMember],
    }))
    setErrors((current) => {
      const { groupMembers, ...nextErrors } = current
      void groupMembers
      return nextErrors
    })
    setMemberError('')
  }

  const handleRemoveGroupMember = (memberId: string) => {
    setValues((current) => ({
      ...current,
      groupMembers: current.groupMembers.filter((member) => member.id !== memberId),
    }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const firstName = values.firstName.trim()
    const firstLastName = values.firstLastName.trim()
    const secondLastName = values.secondLastName.trim()
    const identification = values.identification.trim()
    const visitDate = values.visitDate.trim()
    const nationality = values.nationality.trim()

    const nextErrors: FormErrors = {}

    if (!firstName) nextErrors.firstName = requiredMessages.firstName
    if (!firstLastName) nextErrors.firstLastName = requiredMessages.firstLastName
    if (!secondLastName) nextErrors.secondLastName = requiredMessages.secondLastName
    if (!identification) nextErrors.identification = requiredMessages.identification
    if (!visitDate) nextErrors.visitDate = requiredMessages.visitDate
    if (!nationality) nextErrors.nationality = requiredMessages.nationality
    if (values.entryMode === 'group' && values.groupMembers.length === 0) {
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
      groupMembers: values.entryMode === 'group' ? values.groupMembers : [],
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
        <section className="group-member-section" aria-labelledby="group-members-heading">
          <div className="group-member-intro">
            <h2 id="group-members-heading">Integrantes del grupo</h2>
            <p>Agrega cada integrante en una línea. Presiona “Agregar” para incluirlo en la lista.</p>
            <p>Formato recomendado: nombre completo – cédula.</p>
          </div>

          <div className="group-member-add-card">
            <div className="group-member-card-heading">
              <UserRoundPlus aria-hidden="true" />
              <h3>Agregar integrante</h3>
            </div>

            {memberError && <p className="error-message member-error" role="alert">{memberError}</p>}

            <div className="group-member-add-grid">
              <div className="form-field">
                <label htmlFor="member-full-name">Nombre completo</label>
                <input
                  id="member-full-name"
                  value={values.memberFullName}
                  onChange={(event) => updateValue('memberFullName', event.target.value)}
                  placeholder="Ej: María Fernanda López Pérez"
                />
              </div>

              <div className="form-field">
                <label htmlFor="member-identification">Cédula</label>
                <input
                  id="member-identification"
                  aria-label="Cédula del integrante"
                  value={values.memberIdentification}
                  onChange={(event) => updateValue('memberIdentification', event.target.value)}
                  placeholder="Ej: 1234567890"
                />
              </div>

              <fieldset className="member-type-control">
                <legend>Adulto / Niño</legend>
                <div className="member-type-options">
                  <label>
                    <input
                      type="radio"
                      name="member-visitor-type"
                      checked={values.memberVisitorType === 'adult'}
                      onChange={() => updateValue('memberVisitorType', 'adult')}
                    />
                    Adulto
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="member-visitor-type"
                      checked={values.memberVisitorType === 'child'}
                      onChange={() => updateValue('memberVisitorType', 'child')}
                    />
                    Niño
                  </label>
                </div>
              </fieldset>

              <button
                className="add-member-button"
                type="button"
                onClick={handleAddGroupMember}
                aria-label="Agregar integrante"
              >
                <Plus aria-hidden="true" />
                Agregar
              </button>
            </div>
          </div>

          <div className="group-members-panel">
            <div className="group-member-card-heading">
              <UsersRound aria-hidden="true" />
              <h3>{`Integrantes agregados (${values.groupMembers.length})`}</h3>
            </div>

            {errors.groupMembers && <p className="error-message member-error" id={getErrorId('groupMembers')}>{errors.groupMembers}</p>}

            {values.groupMembers.length === 0 ? (
              <p className="group-members-empty">Aún no hay integrantes agregados.</p>
            ) : (
              <table className="group-members-table">
                <thead>
                  <tr>
                    <th>Nombre completo</th>
                    <th>Cédula</th>
                    <th>Tipo</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {values.groupMembers.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <span className="group-member-avatar" aria-hidden="true">{getGroupMemberInitials(member)}</span>
                        {member.fullName}
                      </td>
                      <td>{member.identification}</td>
                      <td>
                        <span className="member-type-badge" data-type={member.visitorType}>
                          <UserRound aria-hidden="true" />
                          {member.visitorType === 'child' ? 'Niño' : 'Adulto'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="delete-member-button"
                          type="button"
                          onClick={() => handleRemoveGroupMember(member.id)}
                          aria-label={`Eliminar integrante ${member.fullName}`}
                        >
                          <Trash2 aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="group-members-note">
              <ShieldCheck aria-hidden="true" />
              Puedes eliminar cualquier integrante usando la acción correspondiente.
            </p>
          </div>
        </section>
      )}

      <div className="form-actions">
        <button className="secondary-button" type="button" onClick={handleReset} disabled={isSaving}>Limpiar formulario</button>
        <button className="primary-button" type="submit" disabled={isSaving}>Registrar ingreso</button>
      </div>
    </form>
  )
}
