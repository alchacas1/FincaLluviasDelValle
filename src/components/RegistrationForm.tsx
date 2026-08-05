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
    <form className="grid grid-cols-1 md:grid-cols-2 gap-5" onSubmit={handleSubmit} noValidate>
      {Object.keys(errors).length > 0 && (
        <div className="col-span-1 md:col-span-2 p-3 rounded-md border bg-[rgba(167,77,58,0.08)]" role="alert">
          <ul>
            {Object.entries(errors).map(([field, message]) => (
              <li key={field} id={getErrorId(field as ErrorField)} className="text-sm font-semibold text-[var(--terracotta-600)]">{message}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor="first-name" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Nombre</label>
        <input
          id="first-name"
          className="min-h-[44px] rounded-md border px-3"
          value={values.firstName}
          onChange={(event) => updateValue('firstName', event.target.value)}
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby={getFieldDescribedBy(errors.firstName, 'firstName')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="first-last-name" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Primer apellido</label>
        <input
          id="first-last-name"
          className="min-h-[44px] rounded-md border px-3"
          value={values.firstLastName}
          onChange={(event) => updateValue('firstLastName', event.target.value)}
          aria-invalid={Boolean(errors.firstLastName)}
          aria-describedby={getFieldDescribedBy(errors.firstLastName, 'firstLastName')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="second-last-name" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Segundo apellido</label>
        <input
          id="second-last-name"
          className="min-h-[44px] rounded-md border px-3"
          value={values.secondLastName}
          onChange={(event) => updateValue('secondLastName', event.target.value)}
          aria-invalid={Boolean(errors.secondLastName)}
          aria-describedby={getFieldDescribedBy(errors.secondLastName, 'secondLastName')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="identification" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Identificación</label>
        <input
          id="identification"
          className="min-h-[44px] rounded-md border px-3"
          value={values.identification}
          onChange={(event) => updateValue('identification', event.target.value)}
          aria-invalid={Boolean(errors.identification)}
          aria-describedby={getFieldDescribedBy(errors.identification, 'identification')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="visit-date" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Fecha</label>
        <input
          id="visit-date"
          type="date"
          className="min-h-[44px] rounded-md border px-3"
          value={values.visitDate}
          onChange={(event) => updateValue('visitDate', event.target.value)}
          aria-invalid={Boolean(errors.visitDate)}
          aria-describedby={getFieldDescribedBy(errors.visitDate, 'visitDate')}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="nationality" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Nacionalidad</label>
        <select
          id="nationality"
          className="min-h-[44px] rounded-md border px-3"
          value={values.nationality}
          onChange={(event) => updateValue('nationality', event.target.value)}
          aria-invalid={Boolean(errors.nationality)}
          aria-describedby={getFieldDescribedBy(errors.nationality, 'nationality')}
        >
          <option value="">Selecciona una nacionalidad</option>
          {nationalities.map((nationality) => <option key={nationality} value={nationality}>{nationality}</option>)}
        </select>
      </div>

      <fieldset className="col-span-1 md:col-span-2">
        <legend className="text-xs font-bold uppercase text-[var(--coffee-700)] mb-2">Tipo de visitante</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex items-center justify-center gap-2 rounded-md p-2 cursor-pointer ${values.visitorType === 'adult' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-[rgba(248,241,228,0.72)]'}`}>
            <input
              type="radio"
              name="visitor-type"
              className="sr-only"
              checked={values.visitorType === 'adult'}
              onChange={() => updateValue('visitorType', 'adult')}
            />
            <UserRound aria-hidden="true" />
            Adulto
          </label>
          <label className={`flex items-center justify-center gap-2 rounded-md p-2 cursor-pointer ${values.visitorType === 'child' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-[rgba(248,241,228,0.72)]'}`}>
            <input
              type="radio"
              name="visitor-type"
              className="sr-only"
              checked={values.visitorType === 'child'}
              onChange={() => updateValue('visitorType', 'child')}
            />
            <Baby aria-hidden="true" />
            Niño
          </label>
        </div>
      </fieldset>

      <fieldset className="col-span-1 md:col-span-2">
        <legend className="text-xs font-bold uppercase text-[var(--coffee-700)] mb-2">Modalidad de ingreso</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={`flex items-center justify-center gap-2 rounded-md p-2 cursor-pointer ${values.entryMode === 'individual' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-[rgba(248,241,228,0.72)]'}`}>
            <input
              type="radio"
              name="entry-mode"
              className="sr-only"
              checked={values.entryMode === 'individual'}
              onChange={() => updateValue('entryMode', 'individual')}
            />
            <UserRound aria-hidden="true" />
            Individual
          </label>
          <label className={`flex items-center justify-center gap-2 rounded-md p-2 cursor-pointer ${values.entryMode === 'group' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-[rgba(248,241,228,0.72)]'}`}>
            <input
              type="radio"
              name="entry-mode"
              className="sr-only"
              checked={values.entryMode === 'group'}
              onChange={() => updateValue('entryMode', 'group')}
            />
            <UsersRound aria-hidden="true" />
            Grupo
          </label>
        </div>
      </fieldset>

      {values.entryMode === 'group' && (
        <section className="col-span-1 md:col-span-2 grid gap-4" aria-labelledby="group-members-heading">
          <div>
            <h2 id="group-members-heading" className="text-lg font-serif text-[var(--coffee-700)] uppercase tracking-wider">Integrantes del grupo</h2>
            <p className="text-sm text-[var(--muted)]">Agrega cada integrante en una línea. Presiona “Agregar” para incluirlo en la lista.</p>
            <p className="text-sm text-[var(--muted)]">Formato recomendado: nombre completo – cédula.</p>
          </div>

          <div className="bg-white/90 rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <UserRoundPlus aria-hidden="true" />
              <h3 className="text-base font-semibold">Agregar integrante</h3>
            </div>

            {memberError && <p className="text-sm font-semibold text-[var(--terracotta-600)]" role="alert">{memberError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2 flex flex-col gap-2">
                <label htmlFor="member-full-name" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Nombre completo</label>
                <input
                  id="member-full-name"
                  className="min-h-[44px] rounded-md border px-3"
                  value={values.memberFullName}
                  onChange={(event) => updateValue('memberFullName', event.target.value)}
                  placeholder="Ej: María Fernanda López Pérez"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="member-identification" className="text-xs font-bold uppercase text-[var(--coffee-700)]">Cédula</label>
                <input
                  id="member-identification"
                  aria-label="Cédula del integrante"
                  className="min-h-[44px] rounded-md border px-3"
                  value={values.memberIdentification}
                  onChange={(event) => updateValue('memberIdentification', event.target.value)}
                  placeholder="Ej: 1234567890"
                />
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-xs font-bold">Adulto / Niño</legend>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center justify-center gap-2 rounded-md p-2 cursor-pointer ${values.memberVisitorType === 'adult' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-[rgba(248,241,228,0.66)]'}`}>
                    <input
                      type="radio"
                      name="member-visitor-type"
                      className="sr-only"
                      checked={values.memberVisitorType === 'adult'}
                      onChange={() => updateValue('memberVisitorType', 'adult')}
                    />
                    Adulto
                  </label>
                  <label className={`flex items-center justify-center gap-2 rounded-md p-2 cursor-pointer ${values.memberVisitorType === 'child' ? 'bg-[var(--cream-50)] text-[var(--forest-950)]' : 'bg-[rgba(248,241,228,0.66)]'}`}>
                    <input
                      type="radio"
                      name="member-visitor-type"
                      className="sr-only"
                      checked={values.memberVisitorType === 'child'}
                      onChange={() => updateValue('memberVisitorType', 'child')}
                    />
                    Niño
                  </label>
                </div>
              </fieldset>

              <div className="flex items-end">
                <button
                  className="inline-flex items-center gap-2 bg-[var(--forest-800)] text-[var(--cream-50)] px-4 py-2 rounded-md font-bold shadow-md"
                  type="button"
                  onClick={handleAddGroupMember}
                  aria-label="Agregar integrante"
                >
                  <Plus aria-hidden="true" />
                  Agregar
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white/90 rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-3 mb-3">
              <UsersRound aria-hidden="true" />
              <h3 className="text-base font-semibold">{`Integrantes agregados (${values.groupMembers.length})`}</h3>
            </div>

            {errors.groupMembers && <p className="text-sm font-semibold text-[var(--terracotta-600)]" id={getErrorId('groupMembers')}>{errors.groupMembers}</p>}

            {values.groupMembers.length === 0 ? (
              <p className="p-4 border-dashed rounded-md text-[var(--muted)]">Aún no hay integrantes agregados.</p>
            ) : (
              <table className="w-full table-auto border-separate border-spacing-0 rounded-md bg-white">
                <thead>
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-bold text-[var(--muted)] uppercase">Nombre completo</th>
                    <th className="text-left px-4 py-2 text-xs font-bold text-[var(--muted)] uppercase">Cédula</th>
                    <th className="text-left px-4 py-2 text-xs font-bold text-[var(--muted)] uppercase">Tipo</th>
                    <th className="text-left px-4 py-2 text-xs font-bold text-[var(--muted)] uppercase">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {values.groupMembers.map((member) => (
                    <tr key={member.id} className="border-t">
                      <td className="px-4 py-3 font-semibold flex items-center gap-3">
                        <span className="inline-grid w-9 h-9 place-items-center rounded-full bg-[rgba(232,218,195,0.76)] text-[var(--coffee-700)] font-bold">{getGroupMemberInitials(member)}</span>
                        {member.fullName}
                      </td>
                      <td className="px-4 py-3">{member.identification}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-bold ${member.visitorType === 'child' ? 'bg-[rgba(190,126,37,0.16)] text-[#8c5412]' : 'bg-[rgba(40,96,68,0.11)] text-[var(--forest-800)]'}`}>
                          <UserRound aria-hidden="true" />
                          {member.visitorType === 'child' ? 'Niño' : 'Adulto'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="w-9 h-9 rounded-md text-[var(--coffee-700)] border-transparent"
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

            <p className="mt-3 text-sm text-[var(--muted)] flex items-center gap-2">
              <ShieldCheck aria-hidden="true" />
              Puedes eliminar cualquier integrante usando la acción correspondiente.
            </p>
          </div>
        </section>
      )}

      <div className="flex justify-end md:col-span-2 gap-3 pt-1">
        <button
          className="min-h-[48px] px-4 py-2 rounded-md border border-[var(--line)] text-[var(--coffee-700)]"
          type="button"
          onClick={handleReset}
          disabled={isSaving}
        >
          Limpiar formulario
        </button>
        <button
          className="min-h-[48px] px-4 py-2 rounded-md bg-[var(--forest-800)] text-[var(--cream-50)] font-bold"
          type="submit"
          disabled={isSaving}
        >
          Registrar ingreso
        </button>
      </div>
    </form>
  )
}
