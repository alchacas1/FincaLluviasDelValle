import type { GroupMember, GroupMemberEntry } from '../types/visitor'

export function isStructuredGroupMember(member: GroupMemberEntry): member is GroupMember {
  return typeof member === 'object' && member !== null && 'fullName' in member
}

export function getGroupMemberName(member: GroupMemberEntry): string {
  if (isStructuredGroupMember(member)) {
    return member.fullName
  }

  return member
}

export function getGroupMemberIdentification(member: GroupMemberEntry): string {
  if (isStructuredGroupMember(member)) {
    return member.identification
  }

  const [, identification = ''] = member.split(/\s+-\s+/, 2)
  return identification.trim()
}

export function getGroupMemberTypeLabel(member: GroupMemberEntry): string {
  if (!isStructuredGroupMember(member)) {
    return 'Adulto'
  }

  return member.visitorType === 'child' ? 'Niño' : 'Adulto'
}

export function getGroupMemberKey(member: GroupMemberEntry, index: number): string {
  if (isStructuredGroupMember(member)) {
    return member.id
  }

  return `${member}-${index}`
}

export function formatGroupMember(member: GroupMemberEntry): string {
  if (!isStructuredGroupMember(member)) {
    return member
  }

  return `${member.fullName} - ${member.identification}`
}

export function getGroupMemberInitials(member: GroupMemberEntry): string {
  const initials = getGroupMemberName(member)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('es-CR'))
    .join('')

  return initials || 'IN'
}
