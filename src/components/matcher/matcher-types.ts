import type { FileAnalysis } from "../../types";

export interface MatcherFileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

export type MappingTarget = { type: 'master' | 'target'; index: number };
