import { Memo, RecordDetail } from '../components/types';

export const initialMemos: Memo[] = [
  {
    id: '1',
    title: 'Live Recording',
    duration: '00:00',
    isPlaying: false,
    progress: 0,
  },
  {
    id: '2',
    title: 'Record\nBook',
    duration: '02:15',
    isPlaying: false,
    progress: 0,
  },
  {
    id: '3',
    title: 'Search\nRecords',
    duration: '00:28',
    isPlaying: false,
    progress: 0,
  },
];

export const initialRecordsList = [
  { 
    id: '1', 
    title: 'Meeting Notes', 
    duration: '05:42', 
    date: 'Today, 2:30 PM',
    jobNumber: 'CFX 417-151',
    type: 'Meeting'
  },
  { 
    id: '2', 
    title: 'Daily Work Summary', 
    duration: '02:18', 
    date: 'Yesterday, 4:15 PM',
    jobNumber: 'CFX 417-151',
    type: 'Work Summary'
  },
  { 
    id: '3', 
    title: 'Project Ideas', 
    duration: '08:33', 
    date: 'Dec 15, 10:20 AM',
    jobNumber: 'CFX 417-151',
    type: 'Ideas'
  },
  { 
    id: '4', 
    title: 'Shopping List', 
    duration: '01:05', 
    date: 'Dec 14, 6:45 PM',
    jobNumber: 'CFX 417-151',
    type: 'Personal'
  },
  { 
    id: '5', 
    title: 'Lecture Recording', 
    duration: '25:12', 
    date: 'Dec 13, 2:00 PM',
    jobNumber: 'CFX 417-151',
    type: 'Education'
  },
];

// Detailed record data (sample for Daily Work Summary)
export const getDetailedRecord = (id: string): RecordDetail => {
  return {
    id,
    title: 'Daily Work Summary',
    duration: '02:18',
    date: 'Tuesday, August 30, 2022',
    jobNumber: 'CFX 417-151',
    laborData: {
      manager: { startTime: '', finishTime: '', hours: '0.00', rate: '$-', total: '$-' },
      foreman: { startTime: '6:30 AM', finishTime: '3:30 PM', hours: '9.00', rate: '$-', total: '$-' },
      carpenter: { startTime: '6:30 AM', finishTime: '3:30 PM', hours: '9.00', rate: '$-', total: '$-' },
      skillLaborer: { startTime: '6:30 AM', finishTime: '3:30 PM', hours: '9.00', rate: '$-', total: '$-' },
      carpenterExtra: { startTime: '6:30 AM', finishTime: '3:30 PM', hours: '9.00', rate: '$-', total: '$-' },
    },
    subcontractors: {
      superiorTeamRebar: { employees: 0, hours: 0 }
    },
    dailyActivities: 'Poured 50 CY - 325 ft of short wall footing. Approximately 2 hours prior to the pour, Qualis Concrete was notified that the survey used to form the footing was incorrect. As a result, Qualis was only able to pour approximately 325 ft and will have to remove and reset forms for 220 ft of footing.\n\nRanger also notified Qualis that a footing block out around the drainage structures must be left in order to form the inlet tops. additional waste 2 CY due to low grade.\n\nArgos late 2 hours. pour originally scheduled for 8 AM, first truck showed up t 10:40 AM.',
    materialsDeliveries: {
      argosClass4: { qty: '50.00', uom: 'CY', unitRate: '$-', tax: '$-', total: '$-' },
      expansionJoint: { qty: '', uom: '', unitRate: '$-', tax: '$-', total: '$-' }
    },
    equipment: {
      truck: { days: 1, monthlyRate: '$-', itemRate: '$-' },
      equipmentTrailer: { days: 1, monthlyRate: '$-', itemRate: '$-' },
      fuel: { days: 1, monthlyRate: '$-', itemRate: '$-' },
      miniExcavator: { days: 0, monthlyRate: '$-', itemRate: '$-' },
      closedToolTrailer: { days: 1, monthlyRate: '$-', itemRate: '$-' },
      skidStir: { days: 0, monthlyRate: '$-', itemRate: '$-' }
    }
  };
};

// Helper functions for record type styling
export const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Work Summary': return '📋';
    case 'Meeting': return '👥';
    case 'Ideas': return '💡';
    case 'Personal': return '📝';
    case 'Education': return '🎓';
    default: return '🎵';
  }
};

export const getTypeColor = (type: string) => {
  switch (type) {
    case 'Work Summary': return '#007AFF';
    case 'Meeting': return '#34C759';
    case 'Ideas': return '#FF9500';
    case 'Personal': return '#AF52DE';
    case 'Education': return '#FF2D92';
    default: return '#8E8E93';
  }
}; 