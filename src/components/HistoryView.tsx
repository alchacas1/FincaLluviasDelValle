import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import type { EntryMode, VisitorEntry } from '../types/visitor'
import {
  filterHistoryEntries,
  getAvailableNationalities,
  getVisitorFullName,
  type HistoryDateRange,
  type HistoryFilters,
} from '../utils/historyFilters'

interface HistoryViewProps {
  entries: VisitorEntry[]
  now?: Date
}

const dateFormatter = new Intl.DateTimeFormat('es-CR')

const dateRangeOptions: Array<{ value: HistoryDateRange; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'day', label: 'Día' },
  { value: 'this-week', label: 'Esta semana' },
  { value: 'previous-week', label: 'Semana anterior' },
  { value: 'this-month', label: 'Mes actual' },
  { value: 'previous-month', label: 'Mes anterior' },
  { value: 'this-year', label: 'Este año' },
]

const entryModeOptions: Array<{ value: EntryMode | 'all'; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Grupo' },
]

function createInitialFilters(): HistoryFilters {
  return {
    dateRange: 'all',
    nationality: 'all',
    entryMode: 'all',
    search: '',
  }
}

export function HistoryView({ entries, now = new Date() }: HistoryViewProps) {
  const [filters, setFilters] = useState<HistoryFilters>(createInitialFilters)
  const [selectedGroupEntry, setSelectedGroupEntry] = useState<VisitorEntry | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const nationalities = useMemo(() => getAvailableNationalities(entries), [entries])
  const filteredEntries = useMemo(() => (
    filterHistoryEntries(entries, filters, now)
  ), [entries, filters, now])

  const updateFilter = <Key extends keyof HistoryFilters>(key: Key, value: HistoryFilters[Key]) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const openGroupDetail = (entry: VisitorEntry) => {
    setSelectedGroupEntry(entry)
  }

  const closeGroupDetail = () => {
    setSelectedGroupEntry(null)
  }

  const handleGroupCardKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    entry: VisitorEntry,
  ) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openGroupDetail(entry)
    }
  }

  useEffect(() => {
    if (!selectedGroupEntry) {
      return undefined
    }

    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()

    const handleDocumentKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeGroupDetail()
      }
    }

    document.addEventListener('keydown', handleDocumentKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.removeEventListener('keydown', handleDocumentKeyDown)
    }
  }, [selectedGroupEntry])

  const groupDetailModal = selectedGroupEntry ? (
    <div className="modal-backdrop" role="presentation" onClick={closeGroupDetail}>
      <div
        className="group-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-detail-heading"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-heading">
          <div>
            <p>Detalle del grupo</p>
            <h2 id="group-detail-heading">{`Detalle del grupo ${getVisitorFullName(selectedGroupEntry)}`}</h2>
          </div>
          <button
            className="modal-close-button"
            type="button"
            onClick={closeGroupDetail}
            ref={closeButtonRef}
            aria-label="Cerrar detalle del grupo"
          >
            <X aria-hidden="true" size={18} />
            <span>Cerrar</span>
          </button>
        </div>

        <dl className="modal-details">
          <div>
            <dt>Encargado</dt>
            <dd>{getVisitorFullName(selectedGroupEntry)}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{dateFormatter.format(new Date(selectedGroupEntry.createdAt))}</dd>
          </div>
          <div>
            <dt>Nacionalidad</dt>
            <dd>{selectedGroupEntry.nationality}</dd>
          </div>
          <div>
            <dt>Cédula</dt>
            <dd>{selectedGroupEntry.identification}</dd>
          </div>
        </dl>

        <section className="modal-members" aria-labelledby="modal-members-heading">
          <h3 id="modal-members-heading">Personas del grupo</h3>
          <ol aria-label="Integrantes del grupo">
            {selectedGroupEntry.groupMembers.map((member, index) => (
              <li key={`${member}-${index}`}>{member}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  ) : null

  return (
    <>
      <section className="panel history-card" aria-labelledby="history-heading">
        <div className="section-heading history-heading">
          <div>
            <h1 id="history-heading">Historial</h1>
            <p>{`Mostrando ${filteredEntries.length} de ${entries.length} registros`}</p>
          </div>
          <button className="secondary-button" type="button" onClick={() => setFilters(createInitialFilters())}>
            Limpiar filtros
          </button>
        </div>

        <div className="history-filters" aria-label="Filtros del historial">
          <div className="form-field">
            <label htmlFor="history-date-range">Fecha</label>
            <select
              id="history-date-range"
              value={filters.dateRange}
              onChange={(event) => updateFilter('dateRange', event.target.value as HistoryDateRange)}
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="history-nationality">Nacionalidad</label>
            <select
              id="history-nationality"
              value={filters.nationality}
              onChange={(event) => updateFilter('nationality', event.target.value)}
            >
              <option value="all">Todas</option>
              {nationalities.map((nationality) => (
                <option key={nationality} value={nationality}>{nationality}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="history-entry-mode">Modalidad</label>
            <select
              id="history-entry-mode"
              value={filters.entryMode}
              onChange={(event) => updateFilter('entryMode', event.target.value as EntryMode | 'all')}
            >
              {entryModeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div className="form-field history-search">
            <label htmlFor="history-search">Buscar</label>
            <input
              id="history-search"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
            <p className="field-help">Recomendado: busca por nombre, cédula o integrante del grupo.</p>
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <p className="empty-state">No hay registros que coincidan con los filtros.</p>
        ) : (
          <ul className="history-list">
            {filteredEntries.map((entry) => {
              const visitorName = getVisitorFullName(entry)
              const cardContent = (
                <>
                  <div className="history-item-heading">
                    <h2>{visitorName}</h2>
                    <span className="entry-mode-badge" data-mode={entry.entryMode}>
                      {entry.entryMode === 'group' ? 'Grupo' : 'Individual'}
                    </span>
                  </div>
                  <dl className="history-details">
                    <div>
                      <dt>Fecha</dt>
                      <dd>{dateFormatter.format(new Date(entry.createdAt))}</dd>
                    </div>
                    <div>
                      <dt>Nacionalidad</dt>
                      <dd>{entry.nationality}</dd>
                    </div>
                    <div>
                      <dt>Cédula</dt>
                      <dd>{entry.identification}</dd>
                    </div>
                    {entry.entryMode === 'group' && (
                      <div className="history-members">
                        <dt>Integrantes</dt>
                        <dd>{entry.groupMembers.join(', ')}</dd>
                      </div>
                    )}
                  </dl>
                </>
              )

              return (
                <li className="history-item" key={entry.id}>
                  {entry.entryMode === 'group' ? (
                    <div
                      className="history-item-button"
                      role="button"
                      tabIndex={0}
                      onClick={() => openGroupDetail(entry)}
                      onKeyDown={(event) => handleGroupCardKeyDown(event, entry)}
                      aria-label={`Ver detalle del grupo ${visitorName}`}
                    >
                      {cardContent}
                    </div>
                  ) : cardContent}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {groupDetailModal && createPortal(groupDetailModal, document.body)}
    </>
  )
}
