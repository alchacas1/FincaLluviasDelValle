export type VisitorType = 'child' | 'adult'
export type EntryMode = 'individual' | 'group'

export interface VisitorDraft {
  name: string
  identification: string
  visitDate: string
  nationality: string
  visitorType: VisitorType
  entryMode: EntryMode
  responsibleName?: string
  groupMembers: string[]
}

export interface VisitorEntry extends VisitorDraft {
  id: string
  createdAt: string
}
