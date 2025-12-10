export interface CondominiumStructure {
  towers: Array<{
    name: string;
    floors: string[];
    unitsPerFloor: number;
  }>;
}

export interface StructureParams {
  condominiumId: string;
}

export interface UpdateStructureBody {
  structure: CondominiumStructure;
}

