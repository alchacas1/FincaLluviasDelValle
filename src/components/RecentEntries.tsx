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
    <section className="panel recent-card" aria-labelledby="recent-entries-heading">
      <div className="section-heading">
        <h2 id="recent-entries-heading">Ingresos recientes</h2>
      </div>
      {recentEntries.length === 0 ? (
        <p className="empty-state">Aún no hay ingresos registrados.</p>
      ) : (
        <ul className="entries-list">
          {recentEntries.map((entry) => {
            const visitorName = getVisitorFullName(entry)

            return (
              <li className="entry-item" key={entry.id}>
                <div className="entry-heading">
                  <h3>{visitorName}</h3>
                </div>
                <dl className="entry-details">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{dateFormatter.format(new Date(entry.createdAt))}</dd>
                  </div>
                  <div>
                    <dt>Modalidad</dt>
                    <dd className="entry-mode-badge" data-mode={entry.entryMode}>
                      {entry.entryMode === 'group' ? 'Grupo' : 'Individual'}
                    </dd>
                  </div>
                  {entry.entryMode === 'group' && (
                    <div>
                      <dt>Encargado</dt>
                      <dd>{visitorName}</dd>
                    </div>
                  )}
                  {entry.entryMode === 'group' && entry.groupMembers.length > 0 && (
                    <div className="entry-members">
                      <dt>Integrantes</dt>
                      <dd>
                        <ul>
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
