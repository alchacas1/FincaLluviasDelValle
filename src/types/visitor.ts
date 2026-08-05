export type VisitorType = 'child' | 'adult'
export type EntryMode = 'individual' | 'group'

export interface GroupMember {
  id: string
  fullName: string
  identification: string
  visitorType: VisitorType
}

export type GroupMemberEntry = GroupMember | string

export interface VisitorDraft {
  firstName: string
  firstLastName: string
  secondLastName: string
  identification: string
  visitDate: string
  nationality: string
  visitorType: VisitorType
  entryMode: EntryMode
  groupMembers: GroupMemberEntry[]
}

export interface VisitorEntry extends VisitorDraft {
  id: string
  createdAt: string
  name?: string
  responsibleName?: string
}
