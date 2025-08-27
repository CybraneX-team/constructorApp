import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { ProcessedJobProgress, JobTask } from '../services/jobProgressService';
import { Colors } from '../constants/Colors';
import { useAuth } from '../contexts/AuthContext';
import API_CONFIG from '../config/api';

interface WorkProgressModalProps {
  visible: boolean;
  workProgress: ProcessedJobProgress;
  onClose: () => void;
  onRefresh?: () => void;
  loading?: boolean;
  jobNumber?: string;
}

const WorkProgressModal: React.FC<WorkProgressModalProps> = ({
  visible,
  workProgress,
  onClose,
  onRefresh,
  loading = false,
  jobNumber = 'CFX 417-151', // Default job number
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'categories'>('overview');
  const [localLoading, setLocalLoading] = useState(false);
  const [localProgress, setLocalProgress] = useState<ProcessedJobProgress | null>(null);
  const { token } = useAuth();

  // Handle back button for Android
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (visible) {
        onClose();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [visible, onClose]);

  // Fetch progress data when modal becomes visible
  useEffect(() => {
    if (visible && jobNumber) {
      // Reset local progress to force refresh
      setLocalProgress(null);
      fetchProgressData();
    }
  }, [visible, jobNumber]);

  const fetchProgressData = async () => {
    setLocalLoading(true);
    try {
      // Resolve base URL from centralized config
      const baseUrl = (API_CONFIG?.BASE_URL || '').replace(/\/$/, '') || 'http://13.203.216.38:3000';
      const url = `${baseUrl}/job/${encodeURIComponent(jobNumber)}/progress`;
      
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Transform the API response to match our ProcessedJobProgress interface
          const transformedData: ProcessedJobProgress = {
            overallProgress: data.overallProgress || 0,
            tasksCompleted: data.summary?.completedTasks || 0,
            totalTasks: data.summary?.totalTasks || 0,
            inProgressTasks: data.summary?.inProgressTasks || 0,
            remainingTasks: [],
            allTasks: [],
            lastUpdated: data.lastUpdated || new Date().toISOString(),
            categories: data.categories || {},
          };

          // Transform tasks
          if (data.tasks) {
            const allTasks: JobTask[] = [];
            if (data.tasks.completed) {
              allTasks.push(...data.tasks.completed.map((task: any) => ({ ...task, status: 'completed' as const })));
            }
            if (data.tasks.inProgress) {
              allTasks.push(...data.tasks.inProgress.map((task: any) => ({ ...task, status: 'in_progress' as const })));
            }
            if (data.tasks.notStarted) {
              allTasks.push(...data.tasks.notStarted.map((task: any) => ({ ...task, status: 'not_started' as const })));
            }

            transformedData.allTasks = allTasks;
            transformedData.remainingTasks = allTasks.filter(task => task.status !== 'completed');
          }

          setLocalProgress(transformedData);
        } else {
          console.error('Progress API returned success:false', data);
        }
      } else {
        const text = await response.text();
        console.error('Progress API HTTP error', response.status, text);
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error);
    } finally {
      setLocalLoading(false);
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'in_progress': return '#FF9500';
      case 'not_started': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string, completionPercentage?: number) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'in_progress': return `${completionPercentage || 0}% Complete`;
      case 'not_started': return 'Not Started';
      default: return 'Unknown';
    }
  };

  const renderTaskItem = (task: JobTask, index: number) => (
    <View key={index} style={styles.taskItem}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(task.status) }]} />
      <View style={styles.taskContent}>
        <Text style={styles.taskTitle}>{task.task}</Text>
        <Text style={[styles.taskStatus, { color: getStatusColor(task.status) }]}>
          {getStatusText(task.status, task.completionPercentage)}
        </Text>
        <Text style={styles.taskCategory}>Category: {task.category}</Text>
        {task.evidence && task.evidence.length > 0 && (
          <Text style={styles.taskEvidence} numberOfLines={1}>
            Evidence: {task.evidence[0]}
          </Text>
        )}
      </View>
    </View>
  );

  const renderCategoryItem = (name: string, data: any) => (
    <View key={name} style={styles.categoryItem}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryName}>{name}</Text>
        <Text style={styles.categoryPercentage}>{data.progressPercentage}%</Text>
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${data.progressPercentage}%` }]} />
      </View>
      <Text style={styles.categoryStats}>
        {data.completedTasks}/{data.totalTasks} tasks completed
      </Text>
    </View>
  );

  // Use local progress data if available, otherwise fall back to props
  const currentProgress = localProgress || workProgress;
  const isLoading = localLoading || loading;

  if (!visible) return null;

  // Android: inline overlay instead of RN Modal to avoid glitches
  if (Platform.OS === 'android') {
    return (
      <View style={styles.inlineOverlay} pointerEvents="box-none">
        <TouchableOpacity style={styles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        <View style={[styles.container, styles.androidContainer]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.title}>Work Progress</Text>
              <Text style={styles.subtitle}>
                Job: {jobNumber} • Last updated: {formatLastUpdated(currentProgress.lastUpdated)}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            {['overview', 'tasks', 'categories'].map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.activeTab]}
                onPress={() => setActiveTab(tab as any)}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#000000" />
                <Text style={styles.loadingText}>Loading progress...</Text>
              </View>
            ) : (
              <>
                {activeTab === 'overview' && (
                  <View>
                    {/* Progress Stats */}
                    <View style={styles.statsContainer}>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{currentProgress.overallProgress}%</Text>
                        <Text style={styles.statLabel}>Complete</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{currentProgress.tasksCompleted}</Text>
                        <Text style={styles.statLabel}>Completed</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{currentProgress.inProgressTasks}</Text>
                        <Text style={styles.statLabel}>In Progress</Text>
                      </View>
                    </View>

                    <Text style={styles.overviewText}>
                      {currentProgress.tasksCompleted} of {currentProgress.totalTasks} tasks completed
                    </Text>
                    
                    {currentProgress.inProgressTasks > 0 && (
                      <Text style={styles.inProgressText}>
                        {currentProgress.inProgressTasks} tasks currently in progress
                      </Text>
                    )}
                  </View>
                )}

                {activeTab === 'tasks' && (
                  <View>
                    <Text style={styles.sectionTitle}>
                      All Tasks ({(currentProgress.allTasks?.length || currentProgress.remainingTasks?.length || 0)})
                    </Text>
                    
                    <View style={styles.tasksList}>
                      {(() => {
                        const tasksToRender = currentProgress.allTasks?.length 
                          ? currentProgress.allTasks 
                          : currentProgress.remainingTasks || [];
                        
                        if (tasksToRender.length === 0) {
                          return (
                            <View style={styles.emptyContainer}>
                              <Text style={styles.emptyText}>No tasks available</Text>
                            </View>
                          );
                        }
                        
                        return tasksToRender.map((task, index) => renderTaskItem(task, index));
                      })()}
                    </View>
                  </View>
                )}

                {activeTab === 'categories' && (
                  <View>
                    <Text style={styles.sectionTitle}>Progress by Category</Text>
                    <View style={styles.categoriesList}>
                      {Object.entries(currentProgress.categories || {}).map(([name, data]) => 
                        renderCategoryItem(name, data)
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    );
  }

  // iOS: use absolute positioned overlay
  return (
    <View style={styles.overlay} pointerEvents="box-none">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Work Progress</Text>
            <Text style={styles.subtitle}>
              Job: {jobNumber} • Last updated: {formatLastUpdated(currentProgress.lastUpdated)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {['overview', 'tasks', 'categories'].map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#000000" />
              <Text style={styles.loadingText}>Loading progress...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'overview' && (
                <View>
                  {/* Progress Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{currentProgress.overallProgress}%</Text>
                      <Text style={styles.statLabel}>Complete</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{currentProgress.tasksCompleted}</Text>
                      <Text style={styles.statLabel}>Completed</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{currentProgress.inProgressTasks}</Text>
                      <Text style={styles.statLabel}>In Progress</Text>
                    </View>
                  </View>

                  <Text style={styles.overviewText}>
                    {currentProgress.tasksCompleted} of {currentProgress.totalTasks} tasks completed
                  </Text>
                  
                  {currentProgress.inProgressTasks > 0 && (
                    <Text style={styles.inProgressText}>
                      {currentProgress.inProgressTasks} tasks currently in progress
                    </Text>
                  )}
                </View>
              )}

              {activeTab === 'tasks' && (
                <View>
                  <Text style={styles.sectionTitle}>
                    All Tasks ({(currentProgress.allTasks?.length || currentProgress.remainingTasks?.length || 0)})
                  </Text>
                  
                  <View style={styles.tasksList}>
                    {(() => {
                      const tasksToRender = currentProgress.allTasks?.length 
                        ? currentProgress.allTasks 
                        : currentProgress.remainingTasks || [];
                      
                      if (tasksToRender.length === 0) {
                        return (
                          <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No tasks available</Text>
                          </View>
                        );
                      }
                      
                      return tasksToRender.map((task, index) => renderTaskItem(task, index));
                    })()}
                  </View>
                </View>
              )}

              {activeTab === 'categories' && (
                <View>
                  <Text style={styles.sectionTitle}>Progress by Category</Text>
                  <View style={styles.categoriesList}>
                    {Object.entries(currentProgress.categories || {}).map(([name, data]) => 
                      renderCategoryItem(name, data)
                    )}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  inlineOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    position: 'absolute',
    left: '5%',
    right: '5%',
    top: '10%',
    bottom: '10%',
    backgroundColor: '#F2F2F7',
    borderRadius: Platform.OS === 'ios' ? 30 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  androidContainer: {
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: Platform.OS === 'ios' ? 30 : 20,
    borderTopRightRadius: Platform.OS === 'ios' ? 30 : 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#11181C',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: '#666666',
    marginTop: 16,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#11181C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewText: {
    fontSize: 16,
    color: '#11181C',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '500',
  },
  inProgressText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '500',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#11181C',
    marginBottom: 16,
  },
  tasksList: {
    gap: 12,
  },
  taskItem: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  statusIndicator: {
    width: 4,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  taskContent: {
    flex: 1,
    padding: 16,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
    marginBottom: 4,
  },
  taskStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  taskCategory: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 4,
  },
  taskEvidence: {
    fontSize: 12,
    color: '#8E8E93',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    fontWeight: '500',
  },
  categoriesList: {
    paddingBottom: 20,
  },
  categoryItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#11181C',
  },
  categoryPercentage: {
    fontSize: 16,
    fontWeight: '700',
    color: '#34C759',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34C759',
    borderRadius: 3,
  },
  categoryStats: {
    fontSize: 13,
    color: '#666666',
  },
});

export default WorkProgressModal;
