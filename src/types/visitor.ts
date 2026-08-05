export type VisitorType = 'child' | 'adult'
export type EntryMode = 'individual' | 'group'

export interface VisitorDraft {
  firstName: string
  firstLastName: string
  secondLastName: string
  identification: string
  visitDate: string
  nationality: string
  visitorType: VisitorType
  entryMode: EntryMode
  groupMembers: string[]
}

export interface VisitorEntry extends VisitorDraft {
  id: string
  createdAt: string
  name?: string
  responsibleName?: string
}
