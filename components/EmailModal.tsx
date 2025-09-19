import { MaterialIcons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    BackHandler,
    Dimensions,
    FlatList,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import API_CONFIG from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { useSite } from '../contexts/SiteContext';
import { customAlert } from '../services/customAlertService';
import { recordingService } from '../services/recordingService';

import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

// Helper function for cross-platform back navigation haptic feedback
const triggerBackHaptic = () => {
  if (Platform.OS === 'ios') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } else if (Platform.OS === 'android') {
    Vibration.vibrate(30); // Short vibration for back navigation
  }
};

// HTML generation function for PDF
function buildDailyWorkSummaryHtml(record: any): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Daily Work Summary</title>
        <style>
          @page { size: A4; margin: 24mm 18mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #000;
            margin: 0;
          }
          .page { width: 100%; }
          .header {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 16px;
            align-items: stretch;
            margin-bottom: 18px;
          }
          .brand {
            display: grid;
            grid-template-columns: 56px 1fr;
            align-items: center;
            gap: 10px;
            border: 1px solid #c9ccd1;
            padding: 10px 12px;
          }
          .brand-logo {
            width: 56px; height: 56px;
            border-radius: 4px;
            background: linear-gradient(135deg, #5f666f, #b5b8bd);
          }
          .brand-name {
            display: grid;
            gap: 6px;
          }
          .brand-line-1 { font-weight: 700; letter-spacing: 2px; font-size: 14px; text-transform: uppercase; }
          .brand-line-2 { font-weight: 700; letter-spacing: 2px; font-size: 18px; text-transform: uppercase; }
          .title-block {
            border: 1px solid #c9ccd1;
            padding: 10px 12px 6px 12px;
          }
          .doc-title { font-size: 20px; font-weight: 800; text-transform: uppercase; margin: 0 0 10px 0; }
          .meta-grid { display: grid; grid-template-columns: 120px 1fr; row-gap: 6px; column-gap: 12px; }
          .meta-label { font-weight: 700; text-transform: uppercase; font-size: 12px; color: #111; }
          .meta-value { font-weight: 600; font-size: 12px; color: #000; }
          .section-header {
            background: #e6e7ea;
            color: #000;
            font-weight: 800;
            text-transform: uppercase;
            padding: 8px 10px;
            border: 1px solid #c9ccd1;
            margin-top: 16px;
          }
          .activities {
            border: 1px solid #c9ccd1;
            border-top: none;
            padding: 12px;
            font-size: 12px;
            line-height: 1.5;
            white-space: pre-wrap;
          }
          /* Images section */
          .images-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .image-container {
            border: 1px solid #c9ccd1;
            padding: 8px;
            text-align: center;
          }
          .site-image {
            width: 100%;
            max-width: 200px;
            height: auto;
            border-radius: 4px;
            margin-bottom: 8px;
          }
          .image-caption {
            font-size: 10px;
            font-weight: 600;
            color: #666;
            line-height: 1.2;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="header">
            <div class="brand">
              <div class="brand-logo"></div>
              <div class="brand-name">
                <div class="brand-line-1">Qualis</div>
                <div class="brand-line-2">Concrete</div>
              </div>
            </div>
            <div class="title-block">
              <div class="doc-title">Daily Work Summary</div>
              <div class="meta-grid">
                <div class="meta-label">Date:</div>
                <div class="meta-value">${escapeHtml(record.local_date || '')}</div>
                <div class="meta-label">Job</div>
                <div class="meta-value">${escapeHtml(record.jobNumber || '')}</div>
              </div>
            </div>
          </div>

          <div class="section-header">Daily Activities</div>
          <div class="activities">${escapeHtml(record.structuredSummary?.dailyActivities || record.consolidatedSummary || '')}</div>

          ${record.images && record.images.length > 0 ? `
            <div class="section-header">Site Photos</div>
            <div class="images-grid">
              ${record.images.map((image: any, index: number) => `
                <div class="image-container">
                  <img src="${image.url || image.presignedUrl}" alt="Site Photo ${index + 1}" class="site-image" />
                  <div class="image-caption">
                    ${image.original_name || image.originalName || `Photo ${index + 1}`}
                    ${image.customMetadata?.caption ? ` - ${escapeHtml(image.customMetadata.caption)}` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

interface EmailModalProps {
  isVisible: boolean;
  onClose: () => void;
  records?: any[]; // Make optional since we'll fetch them
}

interface EmailPreviewProps {
  selectedRecord: any;
  onSend: () => void;
  onBack: () => void;
  isSending: boolean;
}

const EmailPreview: React.FC<EmailPreviewProps> = ({
  selectedRecord,
  onSend,
  onBack,
  isSending,
}) => {
  const { token } = useAuth();
  const { selectedSite } = useSite();
  const [previewData, setPreviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedRecord) {
      generatePreview();
    }
  }, [selectedRecord]);

  const generatePreview = async () => {
    try {
      setLoading(true);
      
      if (!token || !selectedSite) {
        throw new Error('Missing authentication or site data');
      }
      
      // Get the structured summary from the backend
      const summaryResponse = await recordingService.getRecordingSummary(selectedRecord.id, token);
      
      if (summaryResponse.success && summaryResponse.summary) {
        const summary = summaryResponse.summary || {};

        // Helpers to normalize new summary arrays into the object-based structure
        const toCamelKey = (name: string | undefined): string => {
          if (!name || typeof name !== 'string') return '';
          const parts = name.trim().replace(/[^a-zA-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
          if (!parts.length) return '';
          const [first, ...rest] = parts;
          return first.toLowerCase() + rest.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
        };

        // Labor
        let laborData: Record<string, any> = {};
        if (Array.isArray(summary.labor)) {
          for (const item of summary.labor) {
            const key = toCamelKey(item?.role);
            if (!key) continue;
            laborData[key] = {
              hours: item?.hours ?? '',
              rate: '$-',
              startTime: item?.startTime ?? '',
              finishTime: item?.finishTime ?? '',
              total: '$-',
            };
          }
        } else if (summary.laborData) {
          laborData = { ...summary.laborData };
        }
        // Filter labor with hours > 0
        laborData = Object.fromEntries(
          Object.entries(laborData).filter(([_, data]: [string, any]) => {
            const h = (data?.hours ?? '').toString();
            return h && h !== '0' && h !== '0.00' && h.trim() !== '';
          })
        );

        // Subcontractors
        let subcontractors: Record<string, any> = {};
        if (Array.isArray(summary.subcontractors)) {
          for (const sc of summary.subcontractors) {
            const key = toCamelKey(sc?.name);
            if (!key) continue;
            subcontractors[key] = {
              employees: sc?.numberOfEmployees ?? sc?.employees ?? 0,
              hours: sc?.hours ?? 0,
            };
          }
        } else if (summary.subcontractors) {
          subcontractors = { ...summary.subcontractors };
        }
        subcontractors = Object.fromEntries(
          Object.entries(subcontractors).filter(([_, data]: [string, any]) => (Number(data?.employees) > 0) || (Number(data?.hours) > 0))
        );

        // Materials
        let materialsDeliveries: Record<string, any> = {};
        if (Array.isArray(summary.materials)) {
          for (const m of summary.materials) {
            const key = toCamelKey(m?.name);
            if (!key) continue;
            const qty = m?.quantity;
            const uom = m?.unitOfMeasure;
            materialsDeliveries[key] = {
              qty: qty === undefined || qty === null ? '' : Number(qty).toFixed(2),
              uom: uom ?? '',
              unitRate: '$-',
              tax: '$-',
              total: '$-',
            };
          }
        } else if (summary.materialsDeliveries) {
          materialsDeliveries = { ...summary.materialsDeliveries };
        }
        materialsDeliveries = Object.fromEntries(
          Object.entries(materialsDeliveries).filter(([_, data]: [string, any]) => {
            const q = (data?.qty ?? '').toString();
            return q && q !== '0' && q !== '0.00' && q.trim() !== '';
          })
        );

        // Equipment
        let equipment: Record<string, any> = {};
        if (Array.isArray(summary.equipment)) {
          for (const eq of summary.equipment) {
            const key = toCamelKey(eq?.name);
            if (!key) continue;
            equipment[key] = {
              days: eq?.daysUsed ?? eq?.days ?? 0,
              monthlyRate: '$-',
              itemRate: '$-',
            };
          }
        } else if (summary.equipment) {
          equipment = { ...summary.equipment };
        }
        equipment = Object.fromEntries(
          Object.entries(equipment).filter(([_, data]: [string, any]) => Number(data?.days) > 0)
        );

        const filteredSummary = {
          date: summary?.date || selectedRecord.local_date,
          jobNumber: selectedSite.site_id,
          dailyActivities: summary?.dailyActivities && summary.dailyActivities.trim() !== '' ? summary.dailyActivities : null,
          laborData,
          subcontractors,
          materialsDeliveries,
          equipment,
        };

        setPreviewData(filteredSummary);
      } else {
        // Fallback to basic info from day log
        setPreviewData({
          title: `Daily Report - ${selectedRecord.local_date}`,
          jobNumber: selectedSite.site_id, // Use site_id as job number
          date: selectedRecord.local_date,
          duration: selectedRecord.total_duration,
          recordingCount: selectedRecord.recording_count,
          dailyActivities: null,
        });
      }
      
    } catch (error) {
      console.error('Error generating preview:', error);
      setPreviewData({
        title: `Daily Report - ${selectedRecord.local_date}`,
        jobNumber: selectedSite?.site_id || 'Unknown',
        date: selectedRecord.local_date,
        duration: selectedRecord.total_duration,
        recordingCount: selectedRecord.recording_count,
        dailyActivities: null,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Generating email preview...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.previewContainer}>
      <View style={styles.previewHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.previewTitle}>Email Preview</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.previewContent} showsVerticalScrollIndicator={false}>
        <View style={styles.emailCard}>
          <Text style={styles.emailSubject}>Subject: Daily Construction Report - {previewData.date}</Text>
          
          <View style={styles.emailBody}>
            <Text style={styles.emailGreeting}>Dear Stakeholders,</Text>
            
            <Text style={styles.emailParagraph}>
              Please find attached the daily construction report for {previewData.date} for project {previewData.jobNumber}.
            </Text>

            {previewData.dailyActivities && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Daily Summary</Text>
                <Text style={styles.summaryText}>{previewData.dailyActivities}</Text>
              </View>
            )}

            {previewData.laborData && Object.keys(previewData.laborData).length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Labor Summary</Text>
                {Object.entries(previewData.laborData).map(([role, data]: [string, any]) => (
                  <Text key={role} style={styles.laborItem}>
                    • {role.charAt(0).toUpperCase() + role.slice(1)}: {data.hours} hours @ ${data.rate}/hr
                  </Text>
                ))}
              </View>
            )}

            {previewData.subcontractors && Object.keys(previewData.subcontractors).length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Subcontractors</Text>
                {Object.entries(previewData.subcontractors).map(([company, data]: [string, any]) => (
                  <Text key={company} style={styles.subcontractorItem}>
                    • {company}: {data.employees} employees, {data.hours} hours
                  </Text>
                ))}
              </View>
            )}

            {previewData.materialsDeliveries && Object.keys(previewData.materialsDeliveries).length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Materials Delivered</Text>
                {Object.entries(previewData.materialsDeliveries).map(([material, data]: [string, any]) => (
                  <Text key={material} style={styles.materialItem}>
                    • {material}: {data.qty} {data.uom} @ ${data.unitRate}
                  </Text>
                ))}
              </View>
            )}

            {previewData.equipment && Object.keys(previewData.equipment).length > 0 && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Equipment Used</Text>
                {Object.entries(previewData.equipment).map(([equipment, data]: [string, any]) => (
                  <Text key={equipment} style={styles.equipmentItem}>
                    • {equipment}: {data.days} days @ ${data.itemRate}/day
                  </Text>
                ))}
              </View>
            )}

            {/* Show message if no meaningful data is available */}
            {!previewData.dailyActivities && 
             (!previewData.laborData || Object.keys(previewData.laborData).length === 0) &&
             (!previewData.subcontractors || Object.keys(previewData.subcontractors).length === 0) &&
             (!previewData.materialsDeliveries || Object.keys(previewData.materialsDeliveries).length === 0) &&
             (!previewData.equipment || Object.keys(previewData.equipment).length === 0) && (
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Summary</Text>
                <Text style={styles.summaryText}>No detailed activity data available for this recording.</Text>
              </View>
            )}

            <Text style={styles.emailParagraph}>
              Total recording duration: {previewData.duration || selectedRecord.totalDuration}
            </Text>

            <Text style={styles.emailClosing}>
              Best regards,{'\n'}Construction Team
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.previewFooter}>
        <TouchableOpacity
          onPress={onSend}
          disabled={isSending}
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.sendButtonText}>Send Email</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmailModal: React.FC<EmailModalProps> = ({
  isVisible,
  onClose,
  records: initialRecords,
}) => {
  const { token } = useAuth();
  const { selectedSite } = useSite();
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [records, setRecords] = useState<any[]>(initialRecords || []);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // Animation values
  const modalTranslateY = useSharedValue(height);
  const modalOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const modalScale = useSharedValue(0.8);

  // Fetch recordings function
  const fetchRecordings = useCallback(async () => {
    if (!token || !selectedSite?.id) {
      console.log('📧 Cannot fetch recordings: missing token or site');
      return;
    }

    try {
      setIsLoadingRecords(true);
      console.log('📧 Fetching recordings for site:', selectedSite.id);
      
      const response = await recordingService.getAllRecordings(token, selectedSite.id);
      console.log('📧 Recordings API response:', response);
      
      if (response.success && response.dayRecordings) {
        // No need to filter since backend already filters by job_id
        console.log('📧 Recordings for site:', selectedSite.id, 'Count:', response.dayRecordings.length);
        setRecords(response.dayRecordings);
      } else {
        console.log('📧 No recordings found or API error');
        setRecords([]);
      }
    } catch (error) {
      console.error('📧 Error fetching recordings:', error);
      customAlert.error('Error', 'Failed to load recordings. Please try again.');
      setRecords([]);
    } finally {
      setIsLoadingRecords(false);
    }
  }, [token, selectedSite?.id]);

  // Animation effects
  useEffect(() => {
    if (isVisible) {
      // Animate modal in with bounce effect
      backdropOpacity.value = withTiming(1, { duration: 300 });
      modalTranslateY.value = withSpring(0, {
        damping: 15,
        stiffness: 300,
        mass: 0.9,
        overshootClamping: false,
      });
      modalOpacity.value = withTiming(1, { duration: 400 });
      modalScale.value = withSpring(1, {
        damping: 12,
        stiffness: 300,
        overshootClamping: false,
      });
      
      // Fetch recordings when modal opens
      fetchRecordings();
    } else {
      // Animate modal out
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalTranslateY.value = withTiming(height, { duration: 300 });
      modalOpacity.value = withTiming(0, { duration: 200 });
      modalScale.value = withTiming(0.8, { duration: 200 });
      
      // Reset state when modal closes
      setSelectedRecord(null);
      setShowPreview(false);
      setRecords([]);
    }
  }, [isVisible, fetchRecordings]);

  // Back button handler
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isVisible) {
        if (showPreview && selectedRecord) {
          // If preview is open, close preview first
          triggerBackHaptic();
          handleBack();
          return true; // Prevent default back behavior
        } else {
          // If main modal is open, close the modal
          triggerBackHaptic();
          onClose();
          return true; // Prevent default back behavior
        }
      }
      return false; // Allow default back behavior
    });

    return () => backHandler.remove();
  }, [isVisible, showPreview, selectedRecord, onClose]);

  const handleRecordSelect = (record: any) => {
    setSelectedRecord(record);
    // Add a small delay for smooth transition
    setTimeout(() => {
      setShowPreview(true);
    }, 100);
  };

  const handleBack = useCallback(() => {
    setShowPreview(false);
    // Add a small delay for smooth transition
    setTimeout(() => {
      setSelectedRecord(null);
    }, 100);
  }, []);

  // Animated styles
  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: modalTranslateY.value },
      { scale: modalScale.value },
    ],
    opacity: modalOpacity.value,
  }));

  const generateEmailContent = (record: any, filteredData: any) => {
    let content = `Daily Construction Report
Date: ${record.local_date}
Job Number: ${selectedSite?.site_id || 'Unknown'}
Duration: ${record.total_duration}
Recording Count: ${record.recording_count}

`;

    if (filteredData.dailyActivities) {
      content += `Daily Summary: ${filteredData.dailyActivities}\n\n`;
    }

    if (filteredData.laborData && Object.keys(filteredData.laborData).length > 0) {
      content += `Labor Summary:\n`;
      Object.entries(filteredData.laborData).forEach(([role, data]: [string, any]) => {
        content += `• ${role.charAt(0).toUpperCase() + role.slice(1)}: ${data.hours} hours @ $${data.rate}/hr\n`;
      });
      content += '\n';
    }

    if (filteredData.subcontractors && Object.keys(filteredData.subcontractors).length > 0) {
      content += `Subcontractors:\n`;
      Object.entries(filteredData.subcontractors).forEach(([company, data]: [string, any]) => {
        content += `• ${company}: ${data.employees} employees, ${data.hours} hours\n`;
      });
      content += '\n';
    }

    if (filteredData.materialsDeliveries && Object.keys(filteredData.materialsDeliveries).length > 0) {
      content += `Materials Delivered:\n`;
      Object.entries(filteredData.materialsDeliveries).forEach(([material, data]: [string, any]) => {
        content += `• ${material}: ${data.qty} ${data.uom} @ $${data.unitRate}\n`;
      });
      content += '\n';
    }

    if (filteredData.equipment && Object.keys(filteredData.equipment).length > 0) {
      content += `Equipment Used:\n`;
      Object.entries(filteredData.equipment).forEach(([equipment, data]: [string, any]) => {
        content += `• ${equipment}: ${data.days} days @ $${data.itemRate}/day\n`;
      });
      content += '\n';
    }

    if (!filteredData.dailyActivities && 
        (!filteredData.laborData || Object.keys(filteredData.laborData).length === 0) &&
        (!filteredData.subcontractors || Object.keys(filteredData.subcontractors).length === 0) &&
        (!filteredData.materialsDeliveries || Object.keys(filteredData.materialsDeliveries).length === 0) &&
        (!filteredData.equipment || Object.keys(filteredData.equipment).length === 0)) {
      content += `Summary: No detailed activity data available for this recording.\n\n`;
    }

    return content;
  };

  const handleSendEmail = async () => {
    if (!selectedRecord || !token) {
      customAlert.error('Error', 'Unable to send email. Please try again.');
      return;
    }

    let uri: string | undefined;
    try {
      setIsSending(true);

      // Check if there are stakeholders configured for the selected site
      console.log('📧 Checking stakeholders for selected site:', selectedSite?.name);
      
      if (!selectedSite) {
        customAlert.error(
          'No Site Selected',
          'Please select a site first to send emails. Go to Site Management to select or create a site.'
        );
        return;
      }

      if (!selectedSite.stakeholders || selectedSite.stakeholders.length === 0) {
        customAlert.confirm(
          'No Email Recipients',
          `Site "${selectedSite.name}" has no email recipients configured. Would you like to add stakeholders now?`,
          () => {
            customAlert.alert(
              'Add Email Recipients',
              'Please go to Site Management to add email recipients for this site.'
            );
          },
          undefined,
          'Add Recipients',
          'Cancel'
        );
        return;
      }
      
      console.log('📧 Found stakeholders:', selectedSite.stakeholders.length, selectedSite.stakeholders);

      // Test network connectivity first
      console.log('📧 Testing network connectivity...');
      let baseUrl: string = API_CONFIG.BASE_URL || 'http://98.80.71.172:3000';
      
      // Simple timeout function
      const timeout = (ms: number) => new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), ms)
      );
      
      try {
        const testResponse = await Promise.race([
          fetch(`${baseUrl}/health`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }),
          timeout(10000) // 10 second timeout
        ]) as Response;
        
        console.log('📧 Network test response:', testResponse.status, testResponse.statusText);
        
        if (!testResponse.ok) {
          throw new Error(`Health check failed: ${testResponse.status}`);
        }
      } catch (testError) {
        console.log('📧 Network test failed with HTTP, trying HTTPS...');
        
        // Try HTTPS if HTTP fails
        const httpsUrl = baseUrl.replace('http://', 'https://');
        try {
          const httpsTestResponse = await Promise.race([
            fetch(`${httpsUrl}/health`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${token}`,
              },
            }),
            timeout(10000) // 10 second timeout
          ]) as Response;
          
          console.log('📧 HTTPS Network test response:', httpsTestResponse.status, httpsTestResponse.statusText);
          
          if (!httpsTestResponse.ok) {
            throw new Error(`HTTPS health check failed: ${httpsTestResponse.status}`);
          }
          
          baseUrl = httpsUrl; // Use HTTPS URL
        } catch (httpsTestError) {
          console.log('📧 Both HTTP and HTTPS failed:', httpsTestError);
          customAlert.error(
            'Network Error',
            'Cannot connect to the server. Please check your internet connection and try again.'
          );
          return;
        }
      }

      console.log('📧 Generating PDF for email...');

      // Generate PDF using the same method as RecordDetailView
      const htmlContent = buildDailyWorkSummaryHtml(selectedRecord);
      const pdfResult = await Print.printToFileAsync({ html: htmlContent });
      uri = pdfResult.uri;

      if (!uri) {
        throw new Error('Failed to generate PDF');
      }

      console.log('📧 PDF generated successfully:', uri);

      // Create FormData with the PDF file and stakeholders
      const formData = new FormData();
      formData.append('day_id', selectedRecord.id); // Changed from dayRecordingId to day_id
      formData.append('stakeholders', JSON.stringify(selectedSite.stakeholders));
      
      // Add the PDF file to FormData
      formData.append('pdf', {
        uri: uri,
        type: 'application/pdf',
        name: `daily-report-${selectedRecord.local_date || selectedRecord.date}.pdf`
      } as any);

      console.log('📧 Sending email request to:', `${baseUrl}/recording/email-day-recording`);
      console.log('📧 Form data contains day_id, stakeholders, and PDF file');
      console.log('📧 Stakeholders being sent:', selectedSite.stakeholders);
      console.log('📧 Token:', token ? `${token.substring(0, 20)}...` : 'No token');
      console.log('📧 Using baseUrl:', baseUrl);
      console.log('📧 Full URL:', `${baseUrl}/recording/email-day-recording`);

      const response = await fetch(`${baseUrl}/recording/email-day-recording`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type for FormData, let React Native set it with boundary
        },
        body: formData,
      });

      console.log('📧 Response status:', response.status, response.statusText);
      console.log('📧 Response headers:', Object.fromEntries(response.headers.entries()));

      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // Try to get error details from response
        try {
          const errorText = await response.text();
          console.log('📧 Error response body:', errorText.substring(0, 200) + (errorText.length > 200 ? '...' : ''));
          
          if (errorText && errorText.trim()) {
            // If it's JSON, try to parse it
            if (errorText.trim().startsWith('{')) {
              const errorJson = JSON.parse(errorText);
              errorMessage = errorJson.error || errorJson.message || errorMessage;
            } else if (errorText.trim().startsWith('<')) {
              // HTML response, likely a server error page
              errorMessage = `Server error (${response.status}). Please try again later.`;
            } else {
              // Plain text error
              errorMessage = errorText.trim();
            }
          }
        } catch (parseError) {
          console.log('Could not parse error response:', parseError);
        }
        
        throw new Error(errorMessage);
      }

      // Try to parse JSON response
      let result;
      try {
        const responseText = await response.text();
        console.log('📧 Success response body:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
        
        if (!responseText || responseText.trim() === '') {
          throw new Error('Empty response from server');
        }
        result = JSON.parse(responseText);
        console.log('📧 Parsed result:', result);
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (result.ok || result.success) {
        const stakeholderCount = result.stakeholderCount || result.recipients?.length || 'all';
        customAlert.success(
          'Success',
          `Email sent successfully to ${stakeholderCount} stakeholders!`,
          onClose
        );
      } else {
        throw new Error(result.error || result.message || 'Failed to send email');
      }

      // Clean up the temporary PDF file
      try {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        console.log('📧 Temporary PDF file cleaned up');
      } catch (cleanupError) {
        console.log('📧 Could not clean up temporary PDF file:', cleanupError);
      }

    } catch (error) {
      console.error('Email send error:', error);
      
      // Clean up the temporary PDF file in case of error
      if (typeof uri !== 'undefined') {
        try {
          await FileSystem.deleteAsync(uri, { idempotent: true });
          console.log('📧 Temporary PDF file cleaned up after error');
        } catch (cleanupError) {
          console.log('📧 Could not clean up temporary PDF file after error:', cleanupError);
        }
      }
      
      // Check if it's a specific backend compatibility issue
      let errorMessage = 'Failed to send email. Please check your connection and try again.';
      
      if (error instanceof Error) {
        if (error.message.includes('No stakeholders found for this job')) {
          errorMessage = 'No email recipients configured for this job. Please contact your administrator to add stakeholders.';
        } else if (error.message.includes('400') || error.message.includes('415')) {
          errorMessage = 'Email feature requires backend update. Please contact support.';
              } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        errorMessage = 'Network connection failed. Please check your internet connection and try again.';
      } else if (error.message.includes('Server error')) {
          errorMessage = 'Server is temporarily unavailable. Please try again later.';
        } else if (error.message.includes('404')) {
          errorMessage = 'Email service not available for this job. Please contact support.';
        }
      }
      
      customAlert.error('Error', errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  const renderRecordItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.recordItem}
      onPress={() => handleRecordSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.recordInfo}>
        <Text style={styles.recordDate}>{item.local_date}</Text>
        <Text style={styles.recordJobNumber}>Job: {selectedSite?.site_id || 'Unknown'}</Text>
        <Text style={styles.recordDuration}>
          {item.total_duration} • {item.recording_count} recording{item.recording_count > 1 ? 's' : ''}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#8E8E93" />
    </TouchableOpacity>
  );

  if (!isVisible) return null;

  if (showPreview && selectedRecord) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            onPress={handleBack}
            activeOpacity={1}
          />
        </Animated.View>
        <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
          <EmailPreview
            selectedRecord={selectedRecord}
            onSend={handleSendEmail}
            onBack={handleBack}
            isSending={isSending}
          />
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, backdropAnimatedStyle]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>
      <Animated.View style={[styles.modalContainer, modalAnimatedStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Recording to Email</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoadingRecords ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading....</Text>
          </View>
        ) : (
          <FlatList
            data={records}
            keyExtractor={(item) => item.id}
            renderItem={renderRecordItem}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MaterialIcons name="mail-outline" size={48} color="#8E8E93" />
                <Text style={styles.emptyText}>No recordings available</Text>
              </View>
            }
          />
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 4000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 60,
    backgroundColor: '#1C1C1E',
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingVertical: 10,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  recordInfo: {
    flex: 1,
  },
  recordDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recordJobNumber: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  recordDuration: {
    fontSize: 12,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
    fontWeight: '500',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
  // Preview styles
  previewContainer: {
    flex: 1,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholder: {
    width: 40,
  },
  previewContent: {
    flex: 1,
    padding: 20,
  },
  emailCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  emailSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  emailBody: {
    gap: 16,
  },
  emailGreeting: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emailParagraph: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  summarySection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  laborItem: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  materialItem: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  subcontractorItem: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  equipmentItem: {
    fontSize: 14,
    color: '#FFFFFF',
    marginBottom: 4,
    lineHeight: 20,
  },
  emailClosing: {
    fontSize: 14,
    color: '#FFFFFF',
    marginTop: 20,
    lineHeight: 20,
  },
  previewFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#8E8E93',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 16,
  },
});

export default EmailModal;
