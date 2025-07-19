import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  StyleSheet,
  Platform,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  Extrapolate,
  useSharedValue,
} from 'react-native-reanimated';

const screenHeight = Dimensions.get('window').height;
const screenWidth = Dimensions.get('window').width;
const overlayHeight = screenHeight * 0.85; // Reduced from full screen height

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  type?: 'text' | 'recording' | 'suggestion';
  recordingData?: any;
}

interface SearchOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  searchOverlayTranslateY: Animated.SharedValue<number>;
  searchOverlayOpacity: Animated.SharedValue<number>;
  records: any[];
  onRecordClick: (record: any) => void;
}

interface ChatBubbleProps {
  message: Message;
  onRecordClick?: (record: any) => void;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onRecordClick }) => {
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0.8);

  useEffect(() => {
    bubbleOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
    bubbleScale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ scale: bubbleScale.value }],
  }));

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (message.type === 'recording' && message.recordingData) {
    return (
      <Animated.View style={[
        styles.messageContainer,
        message.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        animatedStyle
      ]}>
        <TouchableOpacity
          onPress={() => onRecordClick?.(message.recordingData)}
          style={[styles.recordingBubble, message.isUser ? styles.userBubble : styles.aiBubble]}
          activeOpacity={0.7}
        >
          <View style={styles.recordingContent}>
            <View style={[
              styles.recordingTypeIndicator,
              { backgroundColor: getTypeColor(message.recordingData.type) }
            ]}>
              <Text style={styles.recordingTypeIcon}>
                {getTypeIcon(message.recordingData.type)}
              </Text>
            </View>
            <View style={styles.recordingInfo}>
              <Text style={[
                styles.recordingTitle,
                message.isUser ? styles.userText : styles.aiText
              ]}>
                {message.recordingData.title}
              </Text>
              <Text style={styles.recordingMeta}>
                {message.recordingData.type} • {message.recordingData.duration}
              </Text>
            </View>
            <Text style={styles.playIconSmall}>▶</Text>
          </View>
        </TouchableOpacity>
        <Text style={[
          styles.timestamp,
          message.isUser ? styles.userTimestamp : styles.aiTimestamp
        ]}>
          {formatTime(message.timestamp)}
        </Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.messageContainer,
      message.isUser ? styles.userMessageContainer : styles.aiMessageContainer,
      animatedStyle
    ]}>
      <View style={[
        styles.messageBubble,
        message.isUser ? styles.userBubble : styles.aiBubble
      ]}>
        <Text style={[
          styles.messageText,
          message.isUser ? styles.userText : styles.aiText
        ]}>
          {message.text}
        </Text>
      </View>
      <Text style={[
        styles.timestamp,
        message.isUser ? styles.userTimestamp : styles.aiTimestamp
      ]}>
        {formatTime(message.timestamp)}
      </Text>
    </Animated.View>
  );
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'Meeting': return '👥';
    case 'Work Summary': return '📋';
    case 'Ideas': return '💡';
    case 'Interview': return '🎤';
    case 'Personal': return '📝';
    default: return '🎵';
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Meeting': return '#007AFF';
    case 'Work Summary': return '#34C759';
    case 'Ideas': return '#FF9500';
    case 'Interview': return '#AF52DE';
    case 'Personal': return '#FF3B30';
    default: return '#8E8E93';
  }
};

const SearchOverlay: React.FC<SearchOverlayProps> = ({
  isVisible,
  onClose,
  searchOverlayTranslateY,
  searchOverlayOpacity,
  records,
  onRecordClick,
}) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI assistant. I can help you find recordings, summarize content, or answer questions about your voice memos. What would you like to know?",
      isUser: false,
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isInputMode, setIsInputMode] = useState(false); // New state for input/recording mode
  const [isEmailerMode, setIsEmailerMode] = useState(false); // New state for emailer mode toggle
  const [isRecording, setIsRecording] = useState(false); // New state for recording
  const flatListRef = useRef<FlatList>(null);

  // Animated values for input
  const inputScale = useSharedValue(1);
  const sendButtonScale = useSharedValue(1);
  const recordButtonScale = useSharedValue(1); // New animated value for record button

  // Handle keyboard events
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener?.remove();
      keyboardWillHideListener?.remove();
    };
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateAIResponse = (userMessage: string): Message[] => {
    const lowerMessage = userMessage.toLowerCase();
    const responses: Message[] = [];

    // Search for recordings
    if (lowerMessage.includes('find') || lowerMessage.includes('search') || lowerMessage.includes('show')) {
      const searchTerms = lowerMessage.split(' ').filter(word => 
        !['find', 'search', 'show', 'me', 'my', 'a', 'an', 'the', 'for'].includes(word)
      );
      
      let foundRecordings = records;
      if (searchTerms.length > 0) {
        foundRecordings = records.filter(record =>
          searchTerms.some(term =>
            record.title.toLowerCase().includes(term) ||
            record.type.toLowerCase().includes(term)
          )
        );
      }

      if (foundRecordings.length > 0) {
        responses.push({
          id: Date.now().toString(),
          text: `I found ${foundRecordings.length} recording${foundRecordings.length > 1 ? 's' : ''} that match your request:`,
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        });

        foundRecordings.slice(0, 3).forEach((recording, index) => {
          responses.push({
            id: `${Date.now()}_${index}`,
            text: '',
            isUser: false,
            timestamp: new Date(),
            type: 'recording',
            recordingData: recording
          });
        });

        if (foundRecordings.length > 3) {
          responses.push({
            id: `${Date.now()}_more`,
            text: `And ${foundRecordings.length - 3} more recordings. Would you like me to show them all?`,
            isUser: false,
            timestamp: new Date(),
            type: 'text'
          });
        }
      } else {
        responses.push({
          id: Date.now().toString(),
          text: "I couldn't find any recordings matching your request. Try using different keywords or ask me to show all recordings.",
          isUser: false,
          timestamp: new Date(),
          type: 'text'
        });
      }
    }
    // General help or greeting
    else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
      responses.push({
        id: Date.now().toString(),
        text: "Hello! Here are some things I can help you with:\n\n• Find specific recordings\n• Show recent recordings\n• Search by type (meetings, ideas, etc.)\n• Summarize content\n\nWhat would you like to explore?",
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      });
    }
    // Show all recordings
    else if (lowerMessage.includes('all') || lowerMessage.includes('everything')) {
      responses.push({
        id: Date.now().toString(),
        text: `Here are all your recordings (${records.length} total):`,
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      });

      records.slice(0, 5).forEach((recording, index) => {
        responses.push({
          id: `${Date.now()}_all_${index}`,
          text: '',
          isUser: false,
          timestamp: new Date(),
          type: 'recording',
          recordingData: recording
        });
      });
    }
    // Default response
    else {
      responses.push({
        id: Date.now().toString(),
        text: "I'm here to help you with your voice recordings. You can ask me to:\n\n• 'Find my meeting recordings'\n• 'Show recent ideas'\n• 'Search for work summaries'\n• 'Show all recordings'\n\nWhat would you like to find?",
        isUser: false,
        timestamp: new Date(),
        type: 'text'
      });
    }

    return responses;
  };

  const sendMessage = () => {
    if (inputText.trim() === '') return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Simulate AI typing delay
    setTimeout(() => {
      const aiResponses = generateAIResponse(inputText.trim());
      setMessages(prev => [...prev, ...aiResponses]);
      setIsTyping(false);
      scrollToBottom();
    }, 1000 + Math.random() * 1000);

    scrollToBottom();
  };

  const handleInputFocus = () => {
    inputScale.value = withSpring(1.02, { damping: 20, stiffness: 300 });
    // Scroll to bottom when input is focused
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleInputBlur = () => {
    inputScale.value = withSpring(1, { damping: 20, stiffness: 300 });
  };

  const handleSendPress = () => {
    sendButtonScale.value = withSpring(0.9, { damping: 20, stiffness: 400 });
    setTimeout(() => {
      sendButtonScale.value = withSpring(1, { damping: 20, stiffness: 400 });
    }, 150);
    sendMessage();
  };

  // New toggle functions
  const toggleInputMode = () => {
    setIsInputMode(!isInputMode);
    if (!isInputMode) {
      // Switching to input mode - stop recording if active
      if (isRecording) {
        handleRecordStop();
      }
    }
  };

  const toggleEmailerMode = () => {
    setIsEmailerMode(!isEmailerMode);
  };

  const handleRecordStart = () => {
    setIsRecording(true);
    recordButtonScale.value = withSpring(1.1, { damping: 15, stiffness: 300 });
    // Add your recording logic here
  };

  const handleRecordStop = () => {
    setIsRecording(false);
    recordButtonScale.value = withSpring(1, { damping: 15, stiffness: 300 });
    // Add your recording stop logic here
  };

  const handleRecordPress = () => {
    if (isRecording) {
      handleRecordStop();
    } else {
      handleRecordStart();
    }
  };

  // Animated styles
  const inputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const sendButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendButtonScale.value }],
  }));

  const recordButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: recordButtonScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: searchOverlayTranslateY.value },
      { 
        scale: interpolate(
          searchOverlayTranslateY.value,
          [screenHeight, 0],
          [0.95, 1],
          Extrapolate.CLAMP
        )
      }
    ],
    opacity: searchOverlayOpacity.value,
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      searchOverlayTranslateY.value,
      [screenHeight, 0],
      [0, 0.8],
      Extrapolate.CLAMP
    ),
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      searchOverlayTranslateY.value,
      [screenHeight * 0.8, 0],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      searchOverlayTranslateY.value,
      [screenHeight * 0.6, 0],
      [0, 1],
      Extrapolate.CLAMP
    ),
  }));

  useEffect(() => {
    if (isVisible) {
      scrollToBottom();
    }
  }, [isVisible, messages]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={onClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Chat Overlay */}
      <Animated.View style={[styles.chatOverlay, overlayStyle]}>
        <KeyboardAvoidingView 
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 120}
        >
          {/* Header */}
          <Animated.View style={[styles.chatHeader, headerStyle]}>
            <View style={styles.headerContent}>
              {isEmailerMode && (
                <Text style={styles.emailerModeText}>Emailer Mode</Text>
              )}
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.handle} />
          </Animated.View>

          {/* Messages */}
          <Animated.View style={[styles.messagesContainer, contentStyle]}>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.messagesList,
                { paddingBottom: keyboardHeight > 0 ? 20 : 20 }
              ]}
              renderItem={({ item }) => (
                <ChatBubble message={item} onRecordClick={onRecordClick} />
              )}
              onContentSizeChange={() => {
                if (keyboardHeight > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: true });
                  }, 100);
                }
              }}
            />
            {isTyping && (
              <View style={[styles.messageContainer, styles.aiMessageContainer]}>
                <View style={[styles.messageBubble, styles.aiBubble, styles.typingBubble]}>
                  <View style={styles.typingIndicator}>
                    <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
                    <View style={[styles.typingDot, { animationDelay: '150ms' }]} />
                    <View style={[styles.typingDot, { animationDelay: '300ms' }]} />
                  </View>
                </View>
              </View>
            )}
          </Animated.View>

          {/* Input Area */}
          <View style={[
            styles.inputContainer,
            { marginBottom: Platform.OS === 'ios' ? 0 : keyboardHeight > 0 ? 10 : 20 }
          ]}>
            {isInputMode ? (
              // Input mode - show text input and send button
              <View style={styles.inputModeContainer}>
                <Animated.View style={[styles.inputWrapper, inputStyle]}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ask me about your recordings..."
                    placeholderTextColor="#8E8E93"
                    value={inputText}
                    onChangeText={setInputText}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    multiline
                    maxLength={500}
                    onSubmitEditing={sendMessage}
                    blurOnSubmit={false}
                    returnKeyType="send"
                  />
                </Animated.View>
                <Animated.View style={sendButtonStyle}>
                  <TouchableOpacity
                    onPress={handleSendPress}
                    style={[
                      styles.sendButton,
                      inputText.trim() ? styles.sendButtonActive : styles.sendButtonInactive
                    ]}
                    disabled={!inputText.trim()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendButtonText}>➤</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            ) : (
              // Recording mode - show keyboard icon, record button, and email toggle
              <View style={styles.recordingModeContainer}>
                {/* Left side - Keyboard toggle button */}
                <TouchableOpacity
                  onPress={toggleInputMode}
                  style={styles.keyboardButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.keyboardIcon}>⌨️</Text>
                </TouchableOpacity>

                {/* Center - Recording button */}
                <Animated.View style={[styles.recordButtonContainer, recordButtonStyle]}>
                  <TouchableOpacity
                    onPress={handleRecordPress}
                    style={[
                      styles.recordButton,
                      isRecording ? styles.recordButtonActive : styles.recordButtonInactive
                    ]}
                    activeOpacity={0.8}
                  >
                    <View style={[
                      styles.recordButtonInner,
                      isRecording ? styles.recordButtonInnerActive : {}
                    ]} />
                  </TouchableOpacity>
                </Animated.View>

                {/* Right side - Email toggle button */}
                <TouchableOpacity
                  onPress={toggleEmailerMode}
                  style={[
                    styles.emailButton,
                    isEmailerMode ? styles.emailButtonActive : styles.emailButtonInactive
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.emailIcon,
                    isEmailerMode ? styles.emailIconActive : styles.emailIconInactive
                  ]}>✉️</Text>
                  {isEmailerMode && <View style={styles.emailActiveIndicator} />}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
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
    zIndex: 3000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  backdropTouchable: {
    flex: 1,
  },
  chatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: overlayHeight,
    backgroundColor: '#000000',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -12,
    },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    paddingTop: 20,
    paddingHorizontal: 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  aiAvatarText: {
    fontSize: 20,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#34C759',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  handle: {
    width: 50,
    height: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    alignSelf: 'center',
    shadowColor: '#FFF',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  messagesList: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: 20,
    maxWidth: screenWidth * 0.8,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 25,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  aiBubble: {
    backgroundColor: 'rgba(44, 44, 46, 0.95)',
    borderBottomLeftRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  userText: {
    color: '#FFFFFF',
  },
  aiText: {
    color: '#FFFFFF',
  },
  timestamp: {
    fontSize: 11,
    marginHorizontal: 20,
    fontWeight: '500',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'right',
  },
  aiTimestamp: {
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'left',
  },
  recordingBubble: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 20,
    marginBottom: 6,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  recordingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingTypeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  recordingTypeIcon: {
    fontSize: 18,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  recordingMeta: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  playIconSmall: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  typingBubble: {
    paddingVertical: 18,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    marginHorizontal: 3,
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 45 : 25,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  inputModeContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    flex: 1,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 30, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginRight: 15,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    fontSize: 16,
    color: '#FFFFFF',
    minHeight: 22,
    fontWeight: '400',
    lineHeight: 22,
  },
  sendButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#007AFF',
  },
  sendButtonInactive: {
    backgroundColor: 'rgba(44, 44, 46, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sendButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: 2,
  },
  emailerModeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginRight: 10,
  },
  keyboardButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  keyboardIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  recordButtonContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  recordButton: {
    width: 90,
    height: 90,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    shadowColor: '#FF3B30',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  recordButtonActive: {
    borderColor: '#FF3B30',
    backgroundColor: '#FF3B30',
    shadowColor: '#FF3B30',
  },
  recordButtonInactive: {
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: '#FF3B30',
  },
  recordButtonInnerActive: {
    backgroundColor: '#FFFFFF',
  },
  emailButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emailButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  emailButtonInactive: {
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  emailIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  emailIconActive: {
    color: '#007AFF',
  },
  emailIconInactive: {
    color: 'rgba(255, 255, 255, 0.6)',
  },
  emailActiveIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  recordingModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
});

export default SearchOverlay; 