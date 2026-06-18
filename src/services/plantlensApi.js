import { defaultConfig, getActiveLayout } from '../data/defaultConfig'
import { projectStencilLibrary } from '../data/stencils'

const STORAGE_KEYS = {
  role: 'plantlens.currentRole',
  project: 'plantlens.projectDocument',
}

function clone(value) {
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value))
}

function readStoredProject() {
  if (typeof window === 'undefined') return null
  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.project)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function writeStoredProject(project) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEYS.project, JSON.stringify(project))
}

const mockDatabase = {
  currentUser: {
    id: 'usr-demo-abb',
    name: 'ABB Accelerator Demo User',
    role: typeof window === 'undefined' ? 'operator' : window.localStorage.getItem(STORAGE_KEYS.role) || 'operator',
  },
  project: readStoredProject() ?? defaultConfig,
  stencilLibrary: projectStencilLibrary,
}

export function getCurrentUserRole() {
  return mockDatabase.currentUser.role
}

export function updateUserRole(role) {
  mockDatabase.currentUser = { ...mockDatabase.currentUser, role }
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEYS.role, role)
  }
  return clone(mockDatabase.currentUser)
}

export function getStencilLibrary() {
  return clone(Object.values(mockDatabase.stencilLibrary))
}

export function getActivePlantLayout(project = mockDatabase.project) {
  return clone(getActiveLayout(project))
}

export function savePlantLayout(layout, project = mockDatabase.project) {
  const nextProject = {
    ...project,
    layouts: project.layouts.map((entry) => (entry.id === layout.id ? clone(layout) : entry)),
  }
  mockDatabase.project = nextProject
  writeStoredProject(nextProject)
  return clone(layout)
}

export function getEquipmentList(layout = getActivePlantLayout()) {
  return clone(layout.nodes ?? [])
}

export function getConnections(layout = getActivePlantLayout()) {
  return clone(layout.routes ?? [])
}

export function saveConnections(connections, layout = getActivePlantLayout(), project = mockDatabase.project) {
  const nextLayout = { ...layout, routes: clone(connections) }
  const nextProject = {
    ...project,
    layouts: project.layouts.map((entry) => (entry.id === nextLayout.id ? nextLayout : entry)),
  }
  mockDatabase.project = nextProject
  writeStoredProject(nextProject)
  return clone(connections)
}
