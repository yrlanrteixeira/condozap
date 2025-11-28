import type { Resident } from '@/types'
import { dataStore } from '@/data/mockData'
import { generateUniqueId } from '@/utils/constants'

// Get all residents
export function getAllResidents(): Resident[] {
  return [...dataStore.residents]
}

// Get resident by ID
export function getResidentById(id: string): Resident | undefined {
  return dataStore.residents.find((r) => r.id === id)
}

// Get residents by tower
export function getResidentsByTower(tower: string): Resident[] {
  return dataStore.residents.filter((r) => r.tower === tower)
}

// Create resident
export function createResident(data: {
  name: string
  phone: string
  tower: string
  floor: string
  unit: string
}): Resident {
  const newResident: Resident = {
    id: String(generateUniqueId()),
    ...data,
  }

  dataStore.residents.push(newResident)
  return newResident
}

// Update resident
export function updateResident(
  id: string,
  data: Partial<Omit<Resident, 'id'>>
): Resident {
  const resident = dataStore.residents.find((r) => r.id === id)
  if (!resident) {
    throw new Error(`Resident ${id} not found`)
  }

  Object.assign(resident, data)
  return resident
}

// Delete resident
export function deleteResident(id: string): void {
  const index = dataStore.residents.findIndex((r) => r.id === id)
  if (index === -1) {
    throw new Error(`Resident ${id} not found`)
  }
  dataStore.residents.splice(index, 1)
}
