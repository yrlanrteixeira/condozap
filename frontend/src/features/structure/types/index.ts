/**
 * Structure Feature - Type Definitions
 * Estrutura do condomínio (torres, andares, unidades)
 */

/**
 * Torre do condomínio
 */
export interface Tower {
  name: string;
  floors: string[];
}

/**
 * Andar de uma torre
 */
export interface Floor {
  tower: string;
  floor: string;
  units: string[];
}

/**
 * Unidade (apartamento)
 */
export interface Unit {
  tower: string;
  floor: string;
  unit: string;
  residentCount: number;
  hasOwner: boolean;
  hasTenant: boolean;
}

/**
 * Estrutura completa do condomínio
 */
export interface CondominiumStructure {
  condominiumId: string;
  condominiumName: string;
  towers: Tower[];
  totalFloors: number;
  totalUnits: number;
  totalResidents: number;
}

/**
 * Dados para criar/atualizar estrutura
 */
export interface UpdateStructureInput {
  condominiumId: string;
  towers: Array<{
    name: string;
    floors: string[];
  }>;
}

/**
 * Dados para adicionar torre
 */
export interface AddTowerInput {
  condominiumId: string;
  towerName: string;
  floors: string[];
}

/**
 * Dados para adicionar andar
 */
export interface AddFloorInput {
  condominiumId: string;
  tower: string;
  floor: string;
}

/**
 * Dados para adicionar unidade
 */
export interface AddUnitInput {
  condominiumId: string;
  tower: string;
  floor: string;
  unit: string;
}

/**
 * Dados para remover torre
 */
export interface RemoveTowerInput {
  condominiumId: string;
  tower: string;
}

/**
 * Dados para remover andar
 */
export interface RemoveFloorInput {
  condominiumId: string;
  tower: string;
  floor: string;
}

/**
 * Dados para remover unidade
 */
export interface RemoveUnitInput {
  condominiumId: string;
  tower: string;
  floor: string;
  unit: string;
}

/**
 * Resumo da estrutura
 */
export interface StructureSummary {
  totalTowers: number;
  totalFloors: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyRate: number;
}

/**
 * Navegação na estrutura
 */
export interface StructureNavigation {
  currentTower?: string;
  currentFloor?: string;
  currentUnit?: string;
}

export interface SectorMember {
  /** ID do registro em `sector_members` (necessário para permissões por membro) */
  id: string;
  userId: string;
  name?: string;
  email?: string;
  order?: number;
  workload?: number;
}

export interface Sector {
  id: string;
  condominiumId: string;
  name: string;
  categories: string[];
  members: SectorMember[];
}