// ============================================
// src/lib/equipment-labels.ts
// Version: 20260114-224500
// Hebrew labels for equipment types and status
// ============================================

import { EquipmentStatus, EquipmentType } from '@prisma/client'

// Hebrew labels for equipment types
export const equipmentTypeLabels: Record<EquipmentType, string> = {
  LAPTOP: 'מחשב נייד',
  CHARGER: 'מטען למחשב',
  DOCKING_STATION: 'תחנת עגינה',
  MONITOR: 'מסך',
  MOUSE: 'עכבר',
  KEYBOARD: 'מקלדת',
  MONITOR_ARM: 'זרוע למסך',
  MEETING_ROOM_TV: 'מסך חדר ישיבות',
  PRINTER: 'מדפסת',
  SCANNER: 'סורק',
  OTHER: 'אחר',
}

// Hebrew labels for equipment status
export const equipmentStatusLabels: Record<EquipmentStatus, string> = {
  ACTIVE: 'פעיל',
  INACTIVE: 'מושבת',
  IN_REPAIR: 'בתיקון',
  SOLD: 'נמכר',
  LOST: 'אבד',
}
