import type { VisitorEntry } from '../types/visitor'

interface RecentEntriesProps {
  entries: VisitorEntry[]
}

const dateFormatter = new Intl.DateTimeFormat('es-CR')

export function RecentEntries({ entries }: RecentEntriesProps) {
  const recentEntries = entries.slice(0, 5)

  return (
    <section aria-labelledby="recent-entries-heading">
      <h2 id="recent-entries-heading">Ingresos recientes</h2>
      {recentEntries.length === 0 ? (
        <p>Aún no hay ingresos registrados.</p>
      ) : (
        <ul>
          {recentEntries.map((entry) => (
            <li key={entry.id}>
              <h3>{entry.name}</h3>
              <dl>
                <div>
                  <dt>Fecha</dt>
                  <dd>{dateFormatter.format(new Date(entry.createdAt))}</dd>
                </div>
                <div>
                  <dt>Modalidad</dt>
                  <dd>{entry.entryMode === 'group' ? 'Grupo' : 'Individual'}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>{entry.responsibleName || '—'}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
