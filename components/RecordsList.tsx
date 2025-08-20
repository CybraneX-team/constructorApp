import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { RecordsListProps } from './types';
import { recordingService } from '../services/recordingService';
import { useAuth } from '../contexts/AuthContext';

// Separate component for record item to avoid hook violations
const RecordItem: React.FC<{
  item: any;
  index: number;
  onRecordClick: (id: string) => void;
  getTypeIcon: (type: string) => string;
  getTypeColor: (type: string) => string;
}> = ({ item, index, onRecordClick, getTypeIcon, getTypeColor }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: withTiming(1, { duration: 300 + index * 50 }),
    transform: [
      { translateY: withSpring(0, { damping: 15, stiffness: 120 }) },
      { scale: withTiming(1, { duration: 300 + index * 50 }) }
    ],
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<any | null>(null);
  const { token } = useAuth();

  const toggleSummary = async () => {
    if (!isOpen) {
      if (!summary && token) {
        try {
          setIsLoading(true);
          const res = await recordingService.getRecordingSummary(item.id, token);
          if (res.success) setSummary(res.summary);
        } catch (e) {
          console.error('Failed to load summary for', item.id, e);
        } finally {
          setIsLoading(false);
        }
      }
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <Animated.View style={[styles.recordItemContainer, animatedStyle]}>
      <TouchableOpacity 
        style={styles.recordItem}
        onPress={() => onRecordClick(item.id)}
        activeOpacity={0.85}
      >
        <View style={styles.recordLeftSection}>
          <View style={[styles.recordTypeIcon, { backgroundColor: getTypeColor(item.type) + '15' }]}>
            <Text style={styles.recordTypeEmoji}>{getTypeIcon(item.type)}</Text>
            <View style={[styles.typeIconGlow, { backgroundColor: getTypeColor(item.type) + '08' }]} />
          </View>
          <View style={styles.recordInfo}>
            <Text style={styles.recordTitle} numberOfLines={2}>{item.title}</Text>
            <View style={styles.recordMetaRow}>
              <View style={styles.jobBadge}>
                <Text style={styles.recordJobNumber}>Job: {item.jobNumber}</Text>
              </View>
              <Text style={styles.recordDate}>{item.date}</Text>
            </View>
          </View>
        </View>
        <View style={styles.recordRightSection}>
          <View style={styles.durationContainer}>
            <Text style={styles.recordDuration}>{item.duration}</Text>
          </View>
          {/* <TouchableOpacity onPress={toggleSummary} style={styles.summaryPill} activeOpacity={0.8}>
            <Text style={styles.summaryPillText}>{isOpen ? 'Hide' : 'Summary'}</Text>
          </TouchableOpacity> */}
        </View>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.summaryContainer}>
          {isLoading ? (
            <Text style={styles.summaryLoading}>Loading summary…</Text>
          ) : summary ? (
            <View>
              {renderSummary(summary)}
            </View>
          ) : (
            <Text style={styles.summaryEmpty}>No summary available.</Text>
          )}
        </View>
      )}
    </Animated.View>
  );
};

function renderSummary(summary: any) {
  // Expecting a JSON schema from backend; render common fields if present
  // Fallback to a pretty-printed JSON
  if (summary?.title || summary?.overview) {
    return (
      <View style={{ gap: 6 }}>
        {summary.title && <Text style={styles.summaryTitle}>{summary.title}</Text>}
        {summary.overview && <Text style={styles.summaryText}>{summary.overview}</Text>}
        {Array.isArray(summary.highlights) && summary.highlights.length > 0 && (
          <View style={{ gap: 4 }}>
            <Text style={styles.summarySectionHeader}>Highlights</Text>
            {summary.highlights.map((h: string, i: number) => (
              <Text key={i} style={styles.summaryBullet}>• {h}</Text>
            ))}
          </View>
        )}
      </View>
    );
  }
  return <Text style={styles.summaryCode}>{JSON.stringify(summary, null, 2)}</Text>;
}

const RecordsList: React.FC<RecordsListProps> = ({ 
  records, 
  onClose, 
  listScale, 
  listOpacity, 
  backdropOpacity,
  onRecordClick 
}) => {
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const listStyle = useAnimatedStyle(() => ({
    transform: [{ scale: listScale.value }],
    opacity: listOpacity.value,
  }));

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Work Summary': return '📋';
      case 'Meeting': return '👥';
      case 'Ideas': return '💡';
      case 'Personal': return '📝';
      case 'Education': return '🎓';
      default: return '🎵';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Work Summary': return '#007AFF';
      case 'Meeting': return '#34C759';
      case 'Ideas': return '#FF9500';
      case 'Personal': return '#AF52DE';
      case 'Education': return '#FF2D92';
      default: return '#8E8E93';
    }
  };

  return (
    <Animated.View style={[styles.recordsOverlay, backdropStyle]}>
      <TouchableOpacity 
        style={styles.recordsBackdrop} 
        onPress={onClose}
        activeOpacity={1}
      />
      
      <Animated.View style={[styles.recordsContainer, listStyle]}>
        <View style={styles.recordsHeader}>
          <View style={styles.headerContent}>
            <Text style={styles.recordsTitle}>All Recordings</Text>
            <Text style={styles.recordsSubtitle}>{records.length} recordings available</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <View style={styles.closeButtonInner}>
              <Text style={styles.closeButtonText}>✕</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={records}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recordsListContent}
          renderItem={({ item, index }) => (
            <RecordItem
              item={item}
              index={index}
              onRecordClick={onRecordClick}
              getTypeIcon={getTypeIcon}
              getTypeColor={getTypeColor}
            />
          )}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  recordsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  recordsBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  recordsContainer: {
    width: '100%',
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 50 : 30,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 20,
  },
  recordsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flex: 1,
  },
  recordsTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  recordsSubtitle: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  recordsListContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  recordItemContainer: {
    marginBottom: 12,
  },
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  recordLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recordTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    position: 'relative',
    display: 'none',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  typeIconGlow: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    top: -3,
    left: -3,
    zIndex: -1,
  },
  recordTypeEmoji: {
    fontSize: 22,
  },
  recordInfo: {
    flex: 1,
    marginRight: 12,
  },
  recordTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    lineHeight: 22,
  },
  recordMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jobBadge: {
    backgroundColor: '#E3F2FD',
    display: 'none',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recordJobNumber: {
    fontSize: 11,
    color: '#1976D2',
    fontWeight: '600',
  },
  recordDate: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  recordRightSection: {
    alignItems: 'flex-end',
    minWidth: 100,
  },
  durationContainer: {
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  recordDuration: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '700',
  },
  recordTypeLabel: {
    paddingHorizontal: 10,
    display: 'none',
    paddingVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  recordTypeLabelText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryPill: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  summaryPillText: { color: '#3B82F6', fontWeight: '800', fontSize: 12 },
  summaryContainer: { marginTop: 8, marginHorizontal: 12, padding: 12, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  summaryLoading: { color: '#6B7280', fontStyle: 'italic' },
  summaryEmpty: { color: '#9CA3AF' },
  summaryTitle: { fontWeight: '800', color: '#111827', marginBottom: 4 },
  summarySectionHeader: { fontWeight: '800', color: '#111827' },
  summaryText: { color: '#111827' },
  summaryBullet: { color: '#111827' },
  summaryCode: { color: '#374151', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }), fontSize: 12 },
});

export default RecordsList; 