import type { Complaint, ComplaintStatus } from '@/types'
import { dataStore } from '@/data/mockData'
import { canTransitionStatus, getComplaintStatusMessage } from '@/utils/helpers'
import { generateUniqueId } from '@/utils/constants'
import { sendTextMessage } from './messageService'

// Get all complaints
export function getAllComplaints(): Complaint[] {
  return [...dataStore.complaints]
}

// Get complaint by ID
export function getComplaintById(id: number): Complaint | undefined {
  return dataStore.complaints.find((c) => c.id === id)
}

// Get complaints by status
export function getComplaintsByStatus(status: ComplaintStatus): Complaint[] {
  return dataStore.complaints.filter((c) => c.status === status)
}

// Create complaint
export function createComplaint(data: {
  residentId: string
  category: string
  content: string
}): Complaint {
  const newComplaint: Complaint = {
    id: generateUniqueId(),
    residentId: data.residentId,
    category: data.category,
    content: data.content,
    status: 'open',
    timestamp: new Date().toISOString(),
  }

  dataStore.complaints.unshift(newComplaint)

  // Send confirmation message
  const resident = dataStore.residents.find((r) => r.id === data.residentId)
  if (resident) {
    const message = `Sua denúncia sobre "${data.category}" foi registrada com sucesso.`
    sendTextMessage(resident, message)
  }

  return newComplaint
}

// Update complaint status
export function updateComplaintStatus(
  id: number,
  newStatus: ComplaintStatus
): Complaint {
  const complaint = dataStore.complaints.find((c) => c.id === id)
  if (!complaint) {
    throw new Error(`Complaint ${id} not found`)
  }

  // Validate transition
  if (!canTransitionStatus(complaint.status, newStatus)) {
    throw new Error(
      `Cannot transition from ${complaint.status} to ${newStatus}`
    )
  }

  // Update status
  complaint.status = newStatus

  // Send notification to resident
  if (newStatus === 'in_progress' || newStatus === 'resolved') {
    const resident = dataStore.residents.find((r) => r.id === complaint.residentId)
    if (resident) {
      const message = getComplaintStatusMessage(complaint, newStatus)
      if (message) {
        sendTextMessage(resident, message)
      }
    }
  }

  return complaint
}

// Delete complaint
export function deleteComplaint(id: number): void {
  const index = dataStore.complaints.findIndex((c) => c.id === id)
  if (index === -1) {
    throw new Error(`Complaint ${id} not found`)
  }
  dataStore.complaints.splice(index, 1)
}
