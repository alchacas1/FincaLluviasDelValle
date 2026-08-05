import type { VisitorEntry } from '../types/visitor'
import { formatGroupMember, getGroupMemberKey } from '../utils/groupMembers'

interface RecentEntriesProps {
  entries: VisitorEntry[]
}

const dateFormatter = new Intl.DateTimeFormat('es-CR')

function getVisitorFullName(entry: VisitorEntry): string {
  const separatedName = [entry.firstName, entry.firstLastName, entry.secondLastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')

  return separatedName || entry.name || 'Visitante sin nombre'
}

export function RecentEntries({ entries }: RecentEntriesProps) {
  const recentEntries = entries.slice(0, 5)

  return (
    <section className="bg-white/90 rounded-xl p-6 shadow-md" aria-labelledby="recent-entries-heading">
      <div className="flex items-center justify-between mb-4">
        <h2 id="recent-entries-heading" className="text-xl font-serif text-[var(--forest-950)]">Ingresos recientes</h2>
      </div>
      {recentEntries.length === 0 ? (
        <p className="text-muted">Aún no hay ingresos registrados.</p>
      ) : (
        <ul className="space-y-4">
          {recentEntries.map((entry) => {
            const visitorName = getVisitorFullName(entry)

            return (
              <li className="p-4 border rounded-lg bg-white" key={entry.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">{visitorName}</h3>
                  <span className="text-xs font-bold text-[var(--forest-800)]">{entry.entryMode === 'group' ? 'Grupo' : 'Individual'}</span>
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted">
                  <div>
                    <dt className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)]">Fecha</dt>
                    <dd>{dateFormatter.format(new Date(entry.createdAt))}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)]">Modalidad</dt>
                    <dd>{entry.entryMode === 'group' ? 'Grupo' : 'Individual'}</dd>
                  </div>
                  {entry.entryMode === 'group' && (
                    <div>
                      <dt className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)]">Encargado</dt>
                      <dd>{visitorName}</dd>
                    </div>
                  )}
                  {entry.entryMode === 'group' && entry.groupMembers.length > 0 && (
                    <div className="md:col-span-3">
                      <dt className="font-semibold text-xs uppercase tracking-wider text-[var(--muted)]">Integrantes</dt>
                      <dd>
                        <ul className="list-disc ml-4">
                          {entry.groupMembers.map((member, index) => (
                            <li key={getGroupMemberKey(member, index)}>{formatGroupMember(member)}</li>
                          ))}
                        </ul>
                      </dd>
                    </div>
                  )}
                </dl>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
