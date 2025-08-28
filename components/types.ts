import Animated from 'react-native-reanimated';
import { ProcessedJobProgress } from '../services/jobProgressService';

export interface Memo {
  id: string;
  title: string;
  duration: string;
  isPlaying: boolean;
  progress: number;
}

export interface RecordDetail {
  id: string;
  title: string;
  duration: string;
  date: string;
  jobNumber: string;
  structuredSummary?: any; // Optional field for structured summary data
  laborData: {
    manager: { startTime: string; finishTime: string; hours: string; rate: string; total: string };
    foreman: { startTime: string; finishTime: string; hours: string; rate: string; total: string };
    carpenter: { startTime: string; finishTime: string; hours: string; rate: string; total: string };
    skillLaborer: { startTime: string; finishTime: string; hours: string; rate: string; total: string };
    carpenterExtra: { startTime: string; finishTime: string; hours: string; rate: string; total: string };
  };
  subcontractors: {
    superiorTeamRebar: { employees: number; hours: number };
  };
  dailyActivities: string;
  materialsDeliveries: {
    argosClass4: { qty: string; uom: string; unitRate: string; tax: string; total: string };
    expansionJoint: { qty: string; uom: string; unitRate: string; tax: string; total: string };
  };
  equipment: {
    truck: { days: number; monthlyRate: string; itemRate: string };
    equipmentTrailer: { days: number; monthlyRate: string; itemRate: string };
    fuel: { days: number; monthlyRate: string; itemRate: string };
    miniExcavator: { days: number; monthlyRate: string; itemRate: string };
    closedToolTrailer: { days: number; monthlyRate: string; itemRate: string };
    skidStir: { days: number; monthlyRate: string; itemRate: string };
  };
}

export interface RecordsListProps {
  records: any[];
  onClose: () => void;
  listScale: Animated.SharedValue<number>;
  listOpacity: Animated.SharedValue<number>;
  backdropOpacity: Animated.SharedValue<number>;
  onRecordClick: (recordId: string) => void;
}

export interface RecordDetailViewProps {
  record: RecordDetail;
  onClose: () => void;
  detailScale: Animated.SharedValue<number>;
  detailOpacity: Animated.SharedValue<number>;
  backdropOpacity: Animated.SharedValue<number>;
}

export interface CircularProgressProps {
  memo: Memo;
  index: number;
  isMain?: boolean;
  currentIndex: number;
  circlePositions: Animated.SharedValue<number>[];
  circleScales: Animated.SharedValue<number>[];
  circleOpacities: Animated.SharedValue<number>[];
  visualizerBars: Animated.SharedValue<number>[];
  isRecording: boolean;
  isSaving: boolean;
  liveTranscription: string;
  recordsButtonScale: Animated.SharedValue<number>;
  handleAccessRecords: () => void;
  handlePlayPress: (memoId: string) => void;
  handleCircleClick: (newIndex: number) => void;
  handleSearchPress?: () => void;
  onShowWorkProgressModal?: () => void;
  workProgress?: ProcessedJobProgress;
}
