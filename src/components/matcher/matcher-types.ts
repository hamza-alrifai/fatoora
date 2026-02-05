import type { FileAnalysis } from '../../types.d';

export interface MatcherFileConfig extends FileAnalysis {
    matchLabel?: string;
    overrideIdColumn?: number;
    overrideResultColumn?: number;
}

export type MappingTarget = { type: 'master' | 'target'; index: number };
