import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  ScrollView, KeyboardAvoidingView, Platform, Alert, Share 
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import SignatureScreen from 'react-native-signature-canvas';
import { WebView } from 'react-native-webview';

export default function App() {
  const [activeTab, setActiveTab] = useState('Parent'); 
  const [activeDeskView, setActiveDeskView] = useState('desk'); 
  
  // Data States
  const [dictations, setDictations] = useState([]);
  const [profiles, setProfiles] = useState([{ id: '1', name: 'Student' }]);
  const [activeProfileId, setActiveProfileId] = useState('1');

  // Input States
  const [sentence, setSentence] = useState('');
  const [focusWordsInput, setFocusWordsInput] = useState('');
  const [language, setLanguage] = useState('en-GB'); 
  const [deskLanguage, setDeskLanguage] = useState('en-GB');
  const [parentListLanguage, setParentListLanguage] = useState('en-GB');
  const [newProfileName, setNewProfileName] = useState('');
  const [importCode, setImportCode] = useState('');
  const [showFormatGuide, setShowFormatGuide] = useState(false); 

  // Parent Lock States
  const [parentUnlocked, setParentUnlocked] = useState(false);
  const [mathQ, setMathQ] = useState({ a: 6, b: 7 });
  const [mathAns, setMathAns] = useState('');

  // Editing States
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [editProfileNameInput, setEditProfileNameInput] = useState('');
  
  const [editingDictId, setEditingDictId] = useState(null);
  const [editDictSentence, setEditDictSentence] = useState('');
  const [editDictFocus, setEditDictFocus] = useState('');

  // Practice States
  const [selectedDictation, setSelectedDictation] = useState(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isCorrect, setIsCorrect] = useState(null);

  // Focus Word Warmup State
  const [focusList, setFocusList] = useState([]);
  const [focusIndex, setFocusIndex] = useState(0);

  const [level1Options, setLevel1Options] = useState([]);
  const [l2Sentence, setL2Sentence] = useState([]);
  const [l2MissingIndices, setL2MissingIndices] = useState([]);
  const [l2CurrentBlankStep, setL2CurrentBlankStep] = useState(0);
  const [l2Options, setL2Options] = useState([]);
  
  const [placedTiles, setPlacedTiles] = useState([]);
  const [remainingTiles, setRemainingTiles] = useState([]);
  
  const [l3Grid, setL3Grid] = useState([]);
  const [l3GridSize, setL3GridSize] = useState(6);
  const [l3SelectedIndices, setL3SelectedIndices] = useState([]);

  const [l4TypedAnswer, setL4TypedAnswer] = useState('');
  const [cnWritingIndex, setCnWritingIndex] = useState(0);
  const [cnShowAnswer, setCnShowAnswer] = useState(false);
  
  const canvasRef = useRef(null);
  const webCanvasRef = useRef(null);
  const scrollViewRef = useRef(null);

  const [memoryCards, setMemoryCards] = useState([]);
  const [flippedCards, setFlippedCards] = useState([]);
  const [matchedCards, setMatchedCards] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-scroll to top when level changes
  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: false });
    }
  }, [currentLevel, cnWritingIndex, cnShowAnswer]);

  // Pure Web Canvas Logic
  useEffect(() => {
    if (Platform.OS === 'web' && webCanvasRef.current) {
      const canvas = webCanvasRef.current;
      const ctx = canvas.getContext('2d');
      
      const resize = () => {
        const rect = canvas.getBoundingClientRect();
        const ratio = window.devicePixelRatio || 1;
        canvas.width = rect.width * ratio;
        canvas.height = rect.height * ratio;
        ctx.scale(ratio, ratio);
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#1E293B';
      };
      
      setTimeout(resize, 50); 
      
      let isDrawing = false;
      
      const start = (e) => {
        e.preventDefault();
        isDrawing = true;
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        const rect = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.moveTo(clientX - rect.left, clientY - rect.top);
      };
      
      const move = (e) => {
        e.preventDefault();
        if (!isDrawing) return;
        const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
        const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
        const rect = canvas.getBoundingClientRect();
        ctx.lineTo(clientX - rect.left, clientY - rect.top);
        ctx.stroke();
      };
      
      const stop = (e) => {
        e.preventDefault();
        isDrawing = false;
      };

      canvas.addEventListener('touchstart', start, { passive: false });
      canvas.addEventListener('touchmove', move, { passive: false });
      canvas.addEventListener('touchend', stop, { passive: false });
      
      canvas.addEventListener('mousedown', start, { passive: false });
      canvas.addEventListener('mousemove', move, { passive: false });
      canvas.addEventListener('mouseup', stop, { passive: false });
      canvas.addEventListener('mouseout', stop, { passive: false });

      return () => {
        canvas.removeEventListener('touchstart', start);
        canvas.removeEventListener('touchmove', move);
        canvas.removeEventListener('touchend', stop);
        canvas.removeEventListener('mousedown', start);
        canvas.removeEventListener('mousemove', move);
        canvas.removeEventListener('mouseup', stop);
        canvas.removeEventListener('mouseout', stop);
      };
    }
  }, [currentLevel, cnWritingIndex]);

  const loadData = async () => {
    try {
      const storedDicts = await AsyncStorage.getItem('gwen_dictations');
      const storedProfiles = await AsyncStorage.getItem('gwen_profiles');
      const storedActive = await AsyncStorage.getItem('gwen_active_profile');

      if (storedProfiles) setProfiles(JSON.parse(storedProfiles));
      if (storedActive) setActiveProfileId(storedActive);

      let parsed = [];
      if (storedDicts !== null) {
        parsed = JSON.parse(storedDicts);
      }

      if (parsed.length === 0) {
        const demos = [
          { id: 'en1', sentence: 'The dinosaur plays guitar', focusWords: 'dinosaur, guitar', language: 'en-GB', mastered: false, profileId: '1' },
          { id: 'en2', sentence: 'elephant', focusWords: '', language: 'en-GB', mastered: false, profileId: '1' },
          { id: 'en3', sentence: 'She went to the library today', focusWords: 'library', language: 'en-GB', mastered: false, profileId: '1' },
          { id: 'hk1', sentence: '我們去公園玩', focusWords: '我們, 公園', language: 'zh-HK', mastered: false, profileId: '1' },
          { id: 'hk2', sentence: '巴士', focusWords: '', language: 'zh-HK', mastered: false, profileId: '1' },
          { id: 'hk3', sentence: '我喜歡食士多啤梨', focusWords: '喜歡, 士多啤梨', language: 'zh-HK', mastered: false, profileId: '1' },
          { id: 'cn1', sentence: '很高興認識你', focusWords: '高興, 認識', language: 'zh-CN', mastered: false, profileId: '1' },
          { id: 'cn2', sentence: '熊猫', focusWords: '', language: 'zh-CN', mastered: false, profileId: '1' },
          { id: 'cn3', sentence: '今天天气很好', focusWords: '今天, 天气', language: 'zh-CN', mastered: false, profileId: '1' }
        ];
        setDictations(demos);
        await AsyncStorage.setItem('gwen_dictations', JSON.stringify(demos));
      } else {
        setDictations(parsed.map(d => ({ ...d, profileId: d.profileId || '1' })));
      }
    } catch (e) {
      console.log('Failed to load data.');
    }
  };

  const saveData = async (updatedList) => {
    setDictations(updatedList);
    await AsyncStorage.setItem('gwen_dictations', JSON.stringify(updatedList));
  };

  const saveProfiles = async (newProfiles, newActiveId) => {
    setProfiles(newProfiles);
    setActiveProfileId(newActiveId);
    await AsyncStorage.setItem('gwen_profiles', JSON.stringify(newProfiles));
    await AsyncStorage.setItem('gwen_active_profile', newActiveId);
  };

  const addProfile = () => {
    if (!newProfileName.trim()) {
      Alert.alert('Oops', 'Enter a name!');
      return;
    }
    const newId = Date.now().toString();
    saveProfiles([...profiles, { id: newId, name: newProfileName.trim() }], newId);
    setNewProfileName('');
  };

  const saveEditedProfileName = () => {
    if (!editProfileNameInput.trim()) return;
    const updatedProfiles = profiles.map(p => p.id === editingProfileId ? { ...p, name: editProfileNameInput.trim() } : p);
    saveProfiles(updatedProfiles, activeProfileId);
    setEditingProfileId(null);
  };

  const deleteProfile = (profileId) => {
    if (profiles.length === 1) {
      if (Platform.OS === 'web') alert('Hold on! You must have at least one child profile active.');
      else Alert.alert('Hold on!', 'You must have at least one child profile active.');
      return;
    }

    const performDelete = () => {
      const updatedProfiles = profiles.filter(p => p.id !== profileId);
      const newActiveId = activeProfileId === profileId ? updatedProfiles[0].id : activeProfileId;
      const updatedDictations = dictations.filter(d => d.profileId !== profileId);
      saveProfiles(updatedProfiles, newActiveId);
      saveData(updatedDictations);
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this profile? All saved words and stars will be permanently deleted.")) {
        performDelete();
      }
    } else {
      Alert.alert(
        "Remove Profile",
        "Are you sure you want to delete this profile? All saved words and stars will be permanently deleted.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Delete", onPress: performDelete }
        ]
      );
    }
  };

  const saveNewDictation = () => {
    if (sentence.trim() === '') {
      Alert.alert('Oops!', 'Please enter a sentence or word.');
      return;
    }
    const newItem = { 
      id: Date.now().toString(), 
      sentence: sentence.trim(), 
      focusWords: focusWordsInput.trim(),
      language, 
      mastered: false,
      profileId: activeProfileId
    };
    saveData([newItem, ...dictations]);
    setSentence('');
    setFocusWordsInput('');
    setParentListLanguage(language); 
    Alert.alert('Saved!', 'Dictation added successfully.');
  };

  const saveEditedDictation = (id) => {
    if (!editDictSentence.trim()) return;
    const updated = dictations.map(d => 
      d.id === id ? { ...d, sentence: editDictSentence.trim(), focusWords: editDictFocus.trim() } : d
    );
    saveData(updated);
    setEditingDictId(null);
  };

  const deleteDictation = (id) => {
    saveData(dictations.filter(item => item.id !== id));
  };

  const resetStars = () => {
    const performReset = () => {
      const updated = dictations.map(d => 
        (d.language === parentListLanguage && d.profileId === activeProfileId) 
          ? { ...d, mastered: false } 
          : d
      );
      saveData(updated);
      
      if (Platform.OS === 'web') alert('Success! All stars have been reset for this list.');
      else Alert.alert('Success', 'All stars have been reset for this list.');
    };

    if (Platform.OS === 'web') {
      if (window.confirm("Remove all stars from this list so they can practice them again?")) performReset();
    } else {
      Alert.alert(
        "Reset Stars",
        "Remove all stars from this list so they can practice them again?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Yes, Reset", onPress: performReset }
        ]
      );
    }
  };

  const exportList = async () => {
    const list = dictations.filter(d => d.language === parentListLanguage && d.profileId === activeProfileId);
    if (list.length === 0) {
      if (Platform.OS === 'web') alert('Add some words to this language first!');
      else Alert.alert('Empty List', 'Add some words to this language first!');
      return;
    }
    
    const formattedItems = list.map(d => d.focusWords ? `${d.sentence}~${d.focusWords}` : d.sentence);
    const code = `${parentListLanguage}|${formattedItems.join('|')}`;
    
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(code);
        alert('Success! List code copied to your clipboard:\n\n' + code);
      } catch (e) {
        alert('Could not copy to clipboard automatically. Please copy this code:\n\n' + code);
      }
    } else {
      try {
        await Share.share({ 
          message: `Paste this code in the dictation app to load the list:\n\n${code}` 
        });
      } catch (e) { 
        Alert.alert('Error', 'Could not share list.'); 
      }
    }
  };

  const importList = () => {
    if (!importCode.trim()) {
      Alert.alert('Oops', 'Paste a code first.');
      return;
    }
    const parts = importCode.trim().split('|');
    const lang = parts[0];
    const items = parts.slice(1);

    if (!['en-GB', 'zh-HK', 'zh-CN'].includes(lang) || items.length === 0) {
      Alert.alert('Invalid Code', 'This code format is incorrect. Tap the Format Guide button for help.');
      return;
    }

    const newItems = items.map((rawItem, i) => {
      const [sText, fText] = rawItem.split('~');
      return {
        id: Date.now().toString() + i, 
        sentence: sText.trim(), 
        focusWords: fText ? fText.trim() : '',
        language: lang, 
        mastered: false, 
        profileId: activeProfileId
      };
    });
    
    saveData([...newItems, ...dictations]);
    setImportCode(''); 
    setParentListLanguage(lang);
    Alert.alert('Success!', `Imported ${items.length} dictation items to ${profiles.find(p=>p.id === activeProfileId)?.name}'s desk.`);
  };

  const playAudio = async (text, lang) => {
    Speech.stop();
    try {
      let targetLang = lang;
      if (lang === 'en-GB') targetLang = 'en-US';

      const isChinese = targetLang.includes('zh');

      Speech.speak(text, { 
        language: targetLang, 
        rate: isChinese ? 1.0 : 0.85, 
        pitch: 1.0 
      });
    } catch (e) {
      console.log("Audio error: ", e);
    }
  };

  const playSuccessSound = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        const now = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; 
        
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const startTime = now + (index * 0.09);
          const duration = 0.3;
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        return;
      }
    } catch (e) {}
    Speech.speak('Good Job.', { language: 'en-US', pitch: 1.6, rate: 1.1 });
  };

  const startMemoryMatch = () => {
    const validDictations = dictations.filter(d => d.language === deskLanguage && d.profileId === activeProfileId);
    
    const shuffledDicts = [...validDictations].sort(() => Math.random() - 0.5).slice(0, 3);
    let cards = [];
    shuffledDicts.forEach((dict, idx) => {
      cards.push({ id: `text-${idx}`, dictId: dict.id, type: 'text', data: dict.sentence, lang: dict.language });
      cards.push({ id: `audio-${idx}`, dictId: dict.id, type: 'audio', data: dict.sentence, lang: dict.language });
    });
    setMemoryCards(cards.sort(() => Math.random() - 0.5));
    setFlippedCards([]);
    setMatchedCards([]);
    setActiveDeskView('memory');
  };

  const handleCardTap = (index) => {
    if (flippedCards.includes(index) || matchedCards.includes(index) || flippedCards.length === 2) return;
    const card = memoryCards[index];
    if (card.type === 'audio') playAudio(card.data, card.lang);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      const card1 = memoryCards[newFlipped[0]];
      const card2 = memoryCards[newFlipped[1]];
      if (card1.dictId === card2.dictId) {
        playSuccessSound();
        setMatchedCards([...matchedCards, newFlipped[0], newFlipped[1]]);
        setFlippedCards([]);
      } else {
        setTimeout(() => setFlippedCards([]), 1500);
      }
    }
  };

  const startPractice = (item) => {
    setSelectedDictation(item);
    setActiveDeskView('gauntlet');

    const parsedFocus = item.focusWords ? item.focusWords.split(',').map(w => w.trim()).filter(Boolean) : [];
    setFocusList(parsedFocus);
    setFocusIndex(0);

    if (parsedFocus.length > 0) {
      loadLevel(0, item, 0, parsedFocus);
    } else {
      loadLevel(1, item);
    }
  };

  const setupWordSearchGrid = (targetWord, isEng) => {
    let target = isEng ? targetWord.toUpperCase() : targetWord;
    let cleanTarget = isEng ? target.replace(/[^A-Z]/g, '') : target.replace(/[^\u4e00-\u9fa5]/g, '');
    if (cleanTarget.length === 0) cleanTarget = target; 
    
    const targetChars = cleanTarget.split('');
    const size = Math.max(6, targetChars.length); 
    let newGrid = Array(size * size).fill('');
    
    const row = Math.floor(Math.random() * size);
    const col = Math.floor(Math.random() * (size - targetChars.length + 1));
    const startIdx = row * size + col;
    
    for (let i = 0; i < targetChars.length; i++) {
      newGrid[startIdx + i] = targetChars[i];
    }
    
    const engLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const cnChars = "的一是在我有和就人不都合這著看好自你會到說要去麼學子們來過心生能";
    const pool = isEng ? engLetters : cnChars;
    
    for (let i = 0; i < newGrid.length; i++) {
      if (newGrid[i] === '') {
        newGrid[i] = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    setL3Grid(newGrid);
    setL3GridSize(size);
    setL3SelectedIndices([]);
  };

  const loadLevel = (levelNum, item, currentFocusIdx = 0, focusArr = focusList) => {
    setCurrentLevel(levelNum);
    setIsCorrect(null);

    const isEng = item.language === 'en-GB';
    const tokens = isEng ? item.sentence.trim().split(/\s+/) : item.sentence.trim().split('');
    const isSingleWord = item.sentence.trim().indexOf(' ') === -1; 

    if (levelNum === 0) {
      const activeFocusWord = focusArr[currentFocusIdx];
      setupWordSearchGrid(activeFocusWord, isEng);
      playAudio(activeFocusWord, item.language);
      return;
    }

    if (levelNum === 1) {
      const otherItems = dictations
        .filter(d => d.language === item.language && d.profileId === item.profileId && d.sentence !== item.sentence)
        .map(d => d.sentence);
      
      let d1, d2;
      if (otherItems.length >= 2) {
        const shuffled = [...otherItems].sort(() => Math.random() - 0.5);
        d1 = shuffled[0];
        d2 = shuffled[1];
      } else if (otherItems.length === 1) {
        d1 = otherItems[0];
        d2 = isEng ? item.sentence + ' today' : item.sentence + '嗎';
      } else {
        d1 = isEng ? item.sentence + ' today' : item.sentence + '嗎';
        d2 = isEng ? 'Yes, ' + item.sentence : '好 ' + item.sentence;
      }
      setLevel1Options([item.sentence, d1, d2].sort(() => Math.random() - 0.5));
    } else if (levelNum === 2) {
      setL2Sentence(tokens);
      setL2CurrentBlankStep(0);

      let missingIndices = [];
      if (focusArr.length > 0) {
        tokens.forEach((token, idx) => {
          const cleanToken = token.toLowerCase().replace(/[^a-z\u4e00-\u9fa5]/g, '');
          if (focusArr.some(fw => fw.toLowerCase().includes(cleanToken) || cleanToken.includes(fw.toLowerCase()))) {
            missingIndices.push(idx);
          }
        });
      }

      if (missingIndices.length === 0) {
        missingIndices = [Math.floor(Math.random() * tokens.length)];
      }

      setL2MissingIndices(missingIndices);
      loadL2OptionsForStep(0, tokens, missingIndices, isEng);
    } else if (levelNum === 3) {
      if (isSingleWord) {
        setupWordSearchGrid(item.sentence.trim(), isEng);
      } else {
        setPlacedTiles([]);
        const tileObjects = tokens.map((text, index) => ({ id: `${index}-${text}`, text }));
        setRemainingTiles([...tileObjects].sort(() => Math.random() - 0.5));
      }
    } else if (levelNum >= 4) {
      setL4TypedAnswer('');
      setCnWritingIndex(0);
      setCnShowAnswer(false);
    }
    
    playAudio(item.sentence, item.language);
  };

  const loadL2OptionsForStep = (stepIdx, tokens, missingIndices, isEng) => {
    const activeMissingIdx = missingIndices[stepIdx];
    const correctToken = tokens[activeMissingIdx];
    
    const engPool = ['a','the','is','are','do','does','he','she','it','to'];
    const cnPool = ['的','了','是','在','我','有','和','就','不','人','都','一','個','上','也','很','到','說','要','去','你','會','著','看','好','生','自','這'];
      
    let pool = isEng ? engPool : cnPool;
    pool = pool.filter(w => w !== correctToken).sort(() => Math.random() - 0.5);
    if (pool.length < 2) pool = isEng ? ['dog', 'cat'] : ['好', '看']; 
    
    setL2Options([correctToken, pool[0], pool[1]].sort(() => Math.random() - 0.5));
  };

  const handleLevel1Tap = (choice) => choice === selectedDictation.sentence ? (setIsCorrect(true), playSuccessSound()) : setIsCorrect(false);
  
  const handleLevel2Tap = (choice) => {
    const activeMissingIdx = l2MissingIndices[l2CurrentBlankStep];
    const correctToken = l2Sentence[activeMissingIdx];

    if (choice === correctToken) {
      if (l2CurrentBlankStep < l2MissingIndices.length - 1) {
        const nextStep = l2CurrentBlankStep + 1;
        setL2CurrentBlankStep(nextStep);
        loadL2OptionsForStep(nextStep, l2Sentence, l2MissingIndices, selectedDictation.language === 'en-GB');
      } else {
        setIsCorrect(true);
        playSuccessSound();
      }
    } else {
      setIsCorrect(false);
    }
  };

  const handleGridTap = (index) => {
    if (l3SelectedIndices.includes(index)) {
       setL3SelectedIndices(l3SelectedIndices.filter(i => i !== index));
    } else {
       setL3SelectedIndices([...l3SelectedIndices, index]);
    }
    setIsCorrect(null);
  };

  const checkWordSearchAnswer = (targetWord) => {
    let target = selectedDictation.language === 'en-GB' ? targetWord.toUpperCase() : targetWord;
    let cleanTarget = selectedDictation.language === 'en-GB' ? target.replace(/[^A-Z]/g, '') : target.replace(/[^\u4e00-\u9fa5]/g, '');
    if (cleanTarget.length === 0) cleanTarget = target; 
    
    const selectedStr = l3SelectedIndices.map(i => l3Grid[i]).join('');
    return selectedStr === cleanTarget;
  };

  const checkLevel0Answer = () => {
    const activeFocusWord = focusList[focusIndex];
    if (checkWordSearchAnswer(activeFocusWord)) {
      playSuccessSound();
      if (focusIndex < focusList.length - 1) {
        const nextIdx = focusIndex + 1;
        setFocusIndex(nextIdx);
        loadLevel(0, selectedDictation, nextIdx, focusList);
      } else {
        setIsCorrect(true);
      }
    } else {
      setIsCorrect(false);
    }
  };

  const checkLevel3Answer = () => {
    const isSingleWord = selectedDictation.sentence.trim().indexOf(' ') === -1;
    if (isSingleWord) {
       if (checkWordSearchAnswer(selectedDictation.sentence.trim())) {
          setIsCorrect(true);
          playSuccessSound();
       } else {
          setIsCorrect(false);
       }
    } else {
       const isEng = selectedDictation.language === 'en-GB';
       const answer = placedTiles.map(t => t.text).join(isEng ? ' ' : '').trim();
       if (answer === selectedDictation.sentence.trim()) {
          setIsCorrect(true);
          playSuccessSound();
       } else {
          setIsCorrect(false);
       }
    }
  };

  const markMastered = () => {
    playSuccessSound();
    const updated = dictations.map(d => d.id === selectedDictation.id ? { ...d, mastered: true } : d);
    saveData(updated);
    setTimeout(() => { setSelectedDictation(null); setActiveDeskView('desk'); }, 1500); 
  };

  const clearCanvas = () => {
    if (Platform.OS === 'web') {
      if (webCanvasRef.current) {
        const canvas = webCanvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears native canvas
      }
    } else {
      canvasRef.current?.clearSignature(); // Keeps native iPad app working
    }
  };

  const activeProfileName = profiles.find(p => p.id === activeProfileId)?.name || 'Student';
  const profileDictations = dictations.filter(d => d.profileId === activeProfileId);
  const parentDictations = profileDictations.filter(d => d.language === parentListLanguage);
  const deskDictations = profileDictations.filter(d => d.language === deskLanguage);

  const renderProfileBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileBar} contentContainerStyle={{alignItems: 'center'}}>
      {profiles.map(p => (
        <TouchableOpacity 
          key={p.id} 
          style={[styles.profileTab, activeProfileId === p.id && styles.profileTabActive]} 
          onPress={() => { setActiveProfileId(p.id); setActiveDeskView('desk'); }}
        >
          <Text style={activeProfileId === p.id ? styles.profileTabTextActive : styles.profileTabText}>{p.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderParentLock = () => (
    <View style={styles.lockScreen}>
      <Text style={[styles.header, { fontSize: 32, textAlign: 'center' }]}>Parents Only </Text>
      <Text style={styles.subtext}>Please solve this to unlock the dashboard:</Text>
      <View style={styles.mathRow}>
        <Text style={styles.mathText}>{mathQ.a} × {mathQ.b} = </Text>
        <TextInput 
          style={styles.mathInput}
          keyboardType="numeric"
          value={mathAns}
          onChangeText={setMathAns}
          maxLength={3}
        />
      </View>
      <TouchableOpacity style={styles.unlockBtn} onPress={() => {
         if (parseInt(mathAns) === mathQ.a * mathQ.b) {
            setParentUnlocked(true);
            setMathAns('');
         } else {
            Alert.alert('Oops', 'Incorrect answer, please try again.');
            setMathAns('');
         }
      }}>
        <Text style={styles.unlockBtnText}>Unlock </Text>
      </TouchableOpacity>
    </View>
  );

  const renderParentDashboard = () => (
    <ScrollView style={styles.screen} showsVerticalScrollIndicator={false}>
      
      {/* Profile Management Section */}
      <View style={styles.addProfileRow}>
        <TextInput style={styles.addProfileInput} placeholder="Add a new child..." value={newProfileName} onChangeText={setNewProfileName} />
        <TouchableOpacity style={styles.addProfileBtn} onPress={addProfile}><Text style={styles.addProfileBtnText}>+ Add</Text></TouchableOpacity>
      </View>

      {editingProfileId === activeProfileId ? (
        <View style={styles.editProfileRow}>
          <TextInput style={styles.editProfileInput} value={editProfileNameInput} onChangeText={setEditProfileNameInput} />
          <TouchableOpacity style={styles.actionBtnShare} onPress={saveEditedProfileName}><Text style={styles.actionBtnText}>Save</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnReset, {backgroundColor: '#64748B'}]} onPress={() => setEditingProfileId(null)}><Text style={styles.actionBtnText}>Cancel</Text></TouchableOpacity>
        </View>
      ) : (
        <View style={styles.profileControlsRow}>
          <TouchableOpacity style={{marginRight: 20}} onPress={() => { setEditProfileNameInput(activeProfileName); setEditingProfileId(activeProfileId); }}>
            <Text style={styles.editText}> Edit {activeProfileName}'s Name</Text>
          </TouchableOpacity>
          {profiles.length > 1 && (
            <TouchableOpacity onPress={() => deleteProfile(activeProfileId)}>
              <Text style={styles.deleteText}> Delete Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Export & Import Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.header, {marginBottom: 0, marginTop: 0}]}>Export & Import Lists</Text>
        <TouchableOpacity onPress={() => setShowFormatGuide(!showFormatGuide)}>
          <Text style={styles.helpBtnText}>{showFormatGuide ? 'Hide Guide ' : 'Format Guide '}</Text>
        </TouchableOpacity>
      </View>

      {showFormatGuide && (
        <View style={styles.guideBox}>
          <Text style={styles.guideTitle}> How to Import Lists</Text>
          <Text style={styles.guideText}>Type lists in WhatsApp or Notes, then paste them below!</Text>
          <Text style={styles.guideText}>Use "|" to separate words, and "~" for tricky focus words.</Text>
          <View style={{marginTop: 5}}>
            <Text style={styles.guideCode}>en-GB|library|dinosaur|elephant</Text>
            <Text style={styles.guideCode}>en-GB|The dinosaur plays guitar~dinosaur,guitar</Text>
            <Text style={styles.guideCode}>zh-HK|我們去公園玩~我們,公園|巴士</Text>
            <Text style={styles.guideCode}>zh-CN|熊猫|今天天气很好~今天</Text>
          </View>
        </View>
      )}

      <View style={styles.importRow}>
        <TextInput style={styles.importInput} placeholder="Paste list code here..." value={importCode} onChangeText={setImportCode} />
        <TouchableOpacity style={styles.importBtn} onPress={importList}><Text style={styles.importBtnText}>Import</Text></TouchableOpacity>
      </View>

      {/* Add Dictation Section */}
      <Text style={styles.header}>Add New Dictation</Text>
      <TextInput style={[styles.input, styles.largeInput]} placeholder="Type sentence or vocabulary word..." value={sentence} onChangeText={setSentence} multiline />
      <TextInput style={styles.input} placeholder="Tricky words (Optional, e.g. library, elephant)..." value={focusWordsInput} onChangeText={setFocusWordsInput} />
      
      <View style={styles.languageRow}>
        {['en-GB', 'zh-HK', 'zh-CN'].map(lang => (
          <TouchableOpacity key={lang} style={[styles.langBtn, language === lang && styles.langBtnActive]} onPress={() => setLanguage(lang)}>
            <Text style={language === lang ? styles.langTextActive : styles.langText}>{lang === 'en-GB' ? 'English' : lang === 'zh-HK' ? 'Cantonese' : 'Mandarin'}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.saveBtn} onPress={saveNewDictation}><Text style={styles.saveBtnText}>Save Dictation</Text></TouchableOpacity>
      
      {/* Existing Lists Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.header, {marginTop: 0, marginBottom: 0}]}>{activeProfileName}'s Lists</Text>
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity style={styles.actionBtnShare} onPress={exportList}><Text style={styles.actionBtnText}>Export</Text></TouchableOpacity>
          <TouchableOpacity style={styles.actionBtnReset} onPress={resetStars}><Text style={styles.actionBtnText}>Reset</Text></TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.languageRow}>
        {['en-GB', 'zh-HK', 'zh-CN'].map(lang => (
          <TouchableOpacity key={lang} style={[styles.langBtn, parentListLanguage === lang && styles.langBtnActive]} onPress={() => setParentListLanguage(lang)}>
            <Text style={parentListLanguage === lang ? styles.langTextActive : styles.langText}>{lang === 'en-GB' ? 'English' : lang === 'zh-HK' ? 'Cantonese' : 'Mandarin'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {parentDictations.length === 0 ? (
         <Text style={styles.subtext}>No saved dictations in this language yet.</Text>
      ) : (
        parentDictations.map((item) => (
          editingDictId === item.id ? (
            <View key={item.id} style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
              <TextInput style={[styles.input, { marginBottom: 10 }]} value={editDictSentence} onChangeText={setEditDictSentence} multiline />
              <TextInput style={[styles.input, { marginBottom: 15 }]} value={editDictFocus} onChangeText={setEditDictFocus} placeholder="Tricky focus words (optional)..." />
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
                <TouchableOpacity style={[styles.actionBtnReset, { backgroundColor: '#64748B', marginRight: 10 }]} onPress={() => setEditingDictId(null)}>
                  <Text style={styles.actionBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtnShare, { marginRight: 0, backgroundColor: '#10B981' }]} onPress={() => saveEditedDictation(item.id)}>
                  <Text style={styles.actionBtnText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle}>{item.mastered ? '⭐ ' : ''}{item.sentence}</Text>
                {item.focusWords ? <Text style={{fontSize: 12, color: '#8B5CF6', marginTop: 4}}> Tricky: {item.focusWords}</Text> : null}
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity onPress={() => { setEditingDictId(item.id); setEditDictSentence(item.sentence); setEditDictFocus(item.focusWords || ''); }}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteDictation(item.id)}>
                  <Text style={[styles.deleteText, { marginLeft: 15 }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ))
      )}
      <View style={{height: 40}}/>
    </ScrollView>
  );

  const renderLevel0 = () => {
    const activeFocusWord = focusList[focusIndex];
    return (
      <View style={styles.levelContainer}>
        <Text style={styles.sectionLabel}> Warm-up ({focusIndex + 1}/{focusList.length}): Spell Tricky Word</Text>
        <Text style={styles.subtext}>Find and spell: <Text style={{fontWeight: 'bold', color: '#8B5CF6'}}>{activeFocusWord}</Text></Text>
        
        <View style={styles.wordGridContainer}>
          {l3Grid.map((char, index) => {
            const isSelected = l3SelectedIndices.includes(index);
            const cellStyle = { width: `${100 / l3GridSize}%`, height: `${100 / l3GridSize}%` };
            return (
              <TouchableOpacity key={index} style={[styles.gridCell, cellStyle, isSelected && styles.gridCellSelected]} onPress={() => handleGridTap(index)} activeOpacity={0.7}>
                <Text style={[styles.gridCellText, isSelected && styles.gridCellTextSelected]}>{char}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
        
        {isCorrect === false && <Text style={styles.errorText}>Not quite! Check your spelling order.</Text>}
        
        <TouchableOpacity style={styles.checkBtn} onPress={checkLevel0Answer}>
          <Text style={styles.checkBtnText}>Check Tricky Word</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLevel1 = () => (
    <View style={styles.levelContainer}>
      <Text style={styles.sectionLabel}>Level 1: Listen & Find </Text>
      {level1Options.map((opt, i) => (
        <TouchableOpacity key={i} style={styles.optionBtn} onPress={() => handleLevel1Tap(opt)}>
          <Text style={styles.optionText}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderLevel2 = () => (
    <View style={styles.levelContainer}>
      <Text style={styles.sectionLabel}>Level 2: Fill in Tricky Blanks </Text>
      <View style={styles.blankSentenceRow}>
        {l2Sentence.map((word, i) => {
          const isMissing = l2MissingIndices.includes(i);
          const isCurrentTarget = l2MissingIndices[l2CurrentBlankStep] === i;
          return (
            <Text key={i} style={isMissing ? (isCurrentTarget ? styles.blankWordActive : styles.blankWord) : styles.normalWord}>
              {isMissing ? '_____' : word}
            </Text>
          );
        })}
      </View>
      <View style={styles.l2OptionsTray}>
        {l2Options.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.l2OptionBtn} onPress={() => handleLevel2Tap(opt)}>
            <Text style={styles.l2OptionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderLevel3 = () => {
    const isSingleWord = selectedDictation.sentence.trim().indexOf(' ') === -1;
    if (isSingleWord) {
      return (
        <View style={styles.levelContainer}>
          <Text style={styles.sectionLabel}>Level 3: Word Search </Text>
          <Text style={styles.subtext}>Tap the letters in the correct order to spell the word!</Text>
          
          <View style={styles.wordGridContainer}>
            {l3Grid.map((char, index) => {
              const isSelected = l3SelectedIndices.includes(index);
              const cellStyle = { width: `${100 / l3GridSize}%`, height: `${100 / l3GridSize}%` };
              return (
                <TouchableOpacity key={index} style={[styles.gridCell, cellStyle, isSelected && styles.gridCellSelected]} onPress={() => handleGridTap(index)} activeOpacity={0.7}>
                  <Text style={[styles.gridCellText, isSelected && styles.gridCellTextSelected]}>{char}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {isCorrect === false && <Text style={styles.errorText}>Not quite! Check your spelling order.</Text>}
          
          <TouchableOpacity style={styles.checkBtn} onPress={checkLevel3Answer}>
            <Text style={styles.checkBtnText}>Check Answer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.levelContainer}>
        <Text style={styles.sectionLabel}>Level 3: Build the Sentence </Text>
        <View style={styles.dropzone}>
          {placedTiles.map(tile => (
            <TouchableOpacity key={tile.id} style={styles.placedTile} onPress={() => {
              setPlacedTiles(placedTiles.filter(t => t.id !== tile.id));
              setRemainingTiles([...remainingTiles, tile]); setIsCorrect(null);
            }}>
              <Text style={styles.placedTileText}>{tile.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.tray}>
          {remainingTiles.map(tile => (
            <TouchableOpacity key={tile.id} style={styles.trayTile} onPress={() => {
              setRemainingTiles(remainingTiles.filter(t => t.id !== tile.id));
              setPlacedTiles([...placedTiles, tile]); setIsCorrect(null);
            }}>
              <Text style={styles.trayTileText}>{tile.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.checkBtn} onPress={checkLevel3Answer}>
          <Text style={styles.checkBtnText}>Check Answer</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCanvasLevel = () => {
    const isEng = selectedDictation.language === 'en-GB';

    if (isEng) {
      return (
        <View style={styles.levelContainer}>
          <Text style={styles.sectionLabel}>Level 4: The Final Test </Text>
          <TextInput 
            style={styles.l4TypingBox}
            value={l4TypedAnswer}
            onChangeText={(text) => { setL4TypedAnswer(text); setIsCorrect(null); }}
            multiline autoCapitalize="none" autoCorrect={false}
            placeholder="Tap here to type your answer..." placeholderTextColor="#94A3B8"
          />
          {isCorrect === true && (
             <View style={styles.selfGradeRow}>
               <TouchableOpacity style={styles.masteredBtn} onPress={markMastered}>
                 <Text style={styles.masteredText}>⭐ Perfect! Mark as Mastered </Text>
               </TouchableOpacity>
             </View>
          )}
          {isCorrect === false && <Text style={styles.errorText}>Not quite! Check your spelling.</Text>}
          {isCorrect !== true && (
            <TouchableOpacity style={styles.checkBtn} onPress={() => {
              l4TypedAnswer.trim().replace(/\s+/g, ' ') === selectedDictation.sentence.trim() ? (setIsCorrect(true), playSuccessSound()) : setIsCorrect(false);
            }}><Text style={styles.checkBtnText}>Check Answer</Text></TouchableOpacity>
          )}
        </View>
      );
    }

    const isGhost = currentLevel === 4;
    const tokens = selectedDictation.sentence.trim().split('');
    const targetChar = tokens[cnWritingIndex];
    const isChineseChar = /[\u4e00-\u9fa5]/.test(targetChar);

   const hanziHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js"></script>
        <style>
          body, html { 
            margin: 0; padding: 0; width: 100%; height: 100%; 
            display: flex; justify-content: center; align-items: center; 
            background-color: #FEFDF9; overflow: hidden; 
          }
          #character-target { 
            display: flex; justify-content: center; align-items: center; 
            width: 100%; height: 100%;
          }
          svg { display: block; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div id="character-target"></div>
        <script>
          var writer = HanziWriter.create('character-target', '${targetChar}', {
            width: 110, height: 110, padding: 5, strokeAnimationSpeed: 0.5, delayBetweenStrokes: 400, strokeColor: '#3B82F6', drawingWidth: 15
          });
          writer.loopCharacterAnimation();
        </script>
      </body>
      </html>
    `;
    
    const webStyle = `.m-signature-pad { box-shadow: none; border: none; } .m-signature-pad--body { border: none; } .m-signature-pad--footer { display: none; margin: 0px; }`;

    return (
      <View style={styles.levelContainer}>
        <Text style={styles.sectionLabel}>{isGhost ? 'Level 4: Watch & Write ' : 'Level 5: Master Canvas '}</Text>
        <View style={styles.cnProgressRow}>
          {tokens.map((char, i) => {
            let displayChar = char;
            if (!isGhost) {
              if (i > cnWritingIndex) displayChar = '';
              else if (i === cnWritingIndex) displayChar = '?';
            }
            return (
              <View key={i} style={[styles.cnProgressBox, cnWritingIndex === i && styles.cnProgressBoxActive]}>
                <Text style={[styles.cnProgressText, i > cnWritingIndex && { color: '#CBD5E1' }, i === cnWritingIndex && { color: '#3B82F6' }, i < cnWritingIndex && { color: '#1E293B' }]}>
                  {displayChar}
                </Text>
              </View>
            );
          })}
        </View>

        {isGhost && isChineseChar && (
          <View style={styles.animationBox}>
            {Platform.OS === 'web' ? (
              <iframe srcDoc={hanziHtml} style={{ width: '100%', height: '100%', border: 'none' }} title="hanzi-writer" />
            ) : (
              <WebView key={`hanzi-${currentLevel}-${cnWritingIndex}`} source={{ html: hanziHtml }} style={{ backgroundColor: 'transparent' }} scrollEnabled={false} />
            )}
          </View>
        )}
        
        {isGhost && !isChineseChar && <Text style={styles.punctuationHint}>{targetChar}</Text>}
        {cnShowAnswer && <Text style={styles.modelAnswer}>{targetChar}</Text>}
        
        <View style={styles.canvasWrapperSquare}>
          {Platform.OS === 'web' ? (
            React.createElement('canvas', {
              ref: webCanvasRef,
              style: { width: '100%', height: '100%', touchAction: 'none' }
            })
          ) : (
            <SignatureScreen key={`canvas-${currentLevel}-${cnWritingIndex}`} ref={canvasRef} penColor="#1E293B" backgroundColor="#FEFDF9" webStyle={webStyle} minWidth={3} maxWidth={8} />
          )}
        </View>

        {isGhost ? (
          <View style={styles.selfGradeRow}>
             <TouchableOpacity style={styles.tryAgainBtn} onPress={clearCanvas}><Text style={styles.tryAgainText}>Clear </Text></TouchableOpacity>
             <TouchableOpacity style={styles.masteredBtn} onPress={() => {
                if (cnWritingIndex === tokens.length - 1) { playSuccessSound(); loadLevel(5, selectedDictation); } 
                else { setCnWritingIndex(prev => prev + 1); clearCanvas(); }
             }}>
               <Text style={styles.masteredText}>{cnWritingIndex === tokens.length - 1 ? 'Next Level ' : 'Next Character '}</Text>
             </TouchableOpacity>
          </View>
        ) : !cnShowAnswer ? (
          <View style={styles.canvasControls}>
             <TouchableOpacity style={styles.clearBtn} onPress={clearCanvas}><Text style={styles.clearText}>Clear</Text></TouchableOpacity>
             <TouchableOpacity style={styles.showBtn} onPress={() => setCnShowAnswer(true)}><Text style={styles.showText}>Check Character</Text></TouchableOpacity>
          </View>
        ) : (
          <View style={styles.selfGradeRow}>
             <TouchableOpacity style={styles.tryAgainBtn} onPress={() => { setCnShowAnswer(false); clearCanvas(); }}><Text style={styles.tryAgainText}>Try Again </Text></TouchableOpacity>
             <TouchableOpacity style={styles.masteredBtn} onPress={() => {
                if (cnWritingIndex === tokens.length - 1) { markMastered(); } 
                else { setCnWritingIndex(prev => prev + 1); setCnShowAnswer(false); clearCanvas(); }
             }}>
               <Text style={styles.masteredText}>{cnWritingIndex === tokens.length - 1 ? 'I Got It! ' : 'Next Character '}</Text>
             </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderProgressTracker = () => {
    if (!selectedDictation) return null;
    const isEng = selectedDictation.language === 'en-GB';
    const levels = Array.from({ length: isEng ? 4 : 5 }, (_, i) => i + 1);
    
    return (
      <View style={styles.progressTracker}>
        {focusList.length > 0 && (
          <View style={[styles.progressDot, currentLevel === 0 && styles.progressDotActive, {backgroundColor: '#8B5CF6'}]}>
            <Text style={[styles.progressDotText, {color: '#FFF'}]}></Text>
          </View>
        )}
        {levels.map(lvl => (
          <View key={lvl} style={[styles.progressDot, currentLevel >= lvl && styles.progressDotActive]}>
            <Text style={[styles.progressDotText, currentLevel >= lvl && styles.progressDotTextActive]}>{lvl}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {(activeTab === 'Parent' || activeDeskView === 'desk') && renderProfileBar()}

        {activeTab === 'Parent' ? (
          parentUnlocked ? renderParentDashboard() : renderParentLock()
        ) : activeDeskView === 'desk' ? (
          <ScrollView style={styles.screen}>
            <Text style={styles.header}>{activeProfileName}'s Desk</Text>

            <View style={styles.languageRow}>
              {['en-GB', 'zh-HK', 'zh-CN'].map(lang => (
                <TouchableOpacity key={lang} style={[styles.langBtn, deskLanguage === lang && styles.langBtnActive]} onPress={() => setDeskLanguage(lang)}>
                  <Text style={deskLanguage === lang ? styles.langTextActive : styles.langText}>{lang === 'en-GB' ? 'English' : lang === 'zh-HK' ? 'Cantonese' : 'Mandarin'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {deskDictations.length > 0 && (
              <TouchableOpacity style={styles.memoryBanner} onPress={startMemoryMatch}>
                <Text style={styles.memoryBannerTitle}> Play Memory Match!</Text>
                <Text style={styles.memoryBannerSub}>Match sounds to words for a fun review.</Text>
              </TouchableOpacity>
            )}

            {deskDictations.length === 0 ? (
                <Text style={styles.subtext}>No words saved here yet. Check the Parent Dashboard!</Text>
            ) : (
              deskDictations.map(item => (
                <TouchableOpacity key={item.id} style={styles.practiceCard} onPress={() => startPractice(item)}>
                  <Text style={styles.practiceCardTitle}>{item.mastered ? '⭐ ' : ''}{item.sentence}</Text>
                  {item.focusWords ? <Text style={{fontSize: 13, color: '#8B5CF6', marginTop: 4}}> Tricky: {item.focusWords}</Text> : null}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        ) : activeDeskView === 'memory' ? (
          <View style={styles.screen}>
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => setActiveDeskView('desk')}><Text style={styles.backBtnText}> Quit Game</Text></TouchableOpacity>
              <Text style={styles.sectionLabel}>Memory Match </Text>
              <View style={{width: 50}}/> 
            </View>
            <Text style={styles.subtext}>Find the matching sound and text!</Text>

            <View style={styles.memoryGrid}>
              {memoryCards.map((card, index) => {
                const isFlipped = flippedCards.includes(index) || matchedCards.includes(index);
                return (
                  <TouchableOpacity key={card.id} style={[styles.memoryCard, isFlipped && styles.memoryCardFlipped, matchedCards.includes(index) && styles.memoryCardMatched]} onPress={() => handleCardTap(index)} activeOpacity={0.8}>
                    {!isFlipped ? (
                      <Text style={styles.memoryCardBackText}>?</Text>
                    ) : (
                      card.type === 'audio' ? (
                        <View style={{alignItems: 'center'}}>
                          <Text style={{fontSize: 40}}></Text>
                          <Text style={{fontSize: 12, color: '#3B82F6', marginTop: 10, fontWeight: 'bold'}}>Play Audio</Text>
                        </View>
                      ) : (
                        <Text style={styles.memoryCardFrontText}>{card.data}</Text>
                      )
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {matchedCards.length === memoryCards.length && memoryCards.length > 0 && (
              <View style={styles.successOverlay}>
                <Text style={styles.successMsg}> You Found Them All! </Text>
                <TouchableOpacity style={styles.nextLevelBtn} onPress={() => setActiveDeskView('desk')}>
                  <Text style={styles.nextLevelText}>Back to Desk</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef} 
            style={styles.screen} 
            contentContainerStyle={{ paddingBottom: 60, flexGrow: 1 }} 
            showsVerticalScrollIndicator={false} 
            scrollEnabled={currentLevel < 4}
          >
            <View style={styles.topBar}>
              <TouchableOpacity onPress={() => { setSelectedDictation(null); setActiveDeskView('desk'); }}><Text style={styles.backBtnText}> Back</Text></TouchableOpacity>
              {renderProgressTracker()}
            </View>

            <TouchableOpacity style={styles.speakerBtn} onPress={() => playAudio(currentLevel === 0 ? focusList[focusIndex] : selectedDictation.sentence, selectedDictation.language)}>
              <Text style={styles.speakerIcon}></Text>
              <Text style={styles.speakerText}>Listen Again</Text>
            </TouchableOpacity>

            {currentLevel === 0 && renderLevel0()}
            {currentLevel === 1 && renderLevel1()}
            {currentLevel === 2 && renderLevel2()}
            {currentLevel === 3 && renderLevel3()}
            {currentLevel >= 4 && renderCanvasLevel()}

            {isCorrect === true && currentLevel < 4 && (
              <View style={styles.successOverlay}>
                <Text style={styles.successMsg}> Level Passed! </Text>
                <TouchableOpacity style={styles.nextLevelBtn} onPress={() => loadLevel(currentLevel === 0 ? 1 : currentLevel + 1, selectedDictation)}>
                  <Text style={styles.nextLevelText}>Next Level </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity style={[styles.navBtn, activeTab === 'Student' && styles.navBtnActive]} onPress={() => { 
           setActiveTab('Student'); 
           setActiveDeskView('desk'); 
           setParentUnlocked(false);
        }}>
          <Text style={activeTab === 'Student' ? styles.navTextActive : styles.navText}>My Desk</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navBtn, activeTab === 'Parent' && styles.navBtnActive]} onPress={() => { 
           setActiveTab('Parent'); 
           if (!parentUnlocked) {
               setMathQ({ a: Math.floor(Math.random() * 5) + 5, b: Math.floor(Math.random() * 5) + 5 });
               setMathAns('');
           }
        }}>
          <Text style={activeTab === 'Parent' ? styles.navTextActive : styles.navText}>Parent Dashboard</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4ECD8' }, 
  content: { flex: 1, paddingTop: 50, paddingHorizontal: 20 },
  screen: { flex: 1 },
  header: { fontSize: 26, fontWeight: '800', color: '#2C3E50', marginBottom: 15, marginTop: 10 },
  
  lockScreen: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mathRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  mathText: { fontSize: 32, fontWeight: 'bold', color: '#1E293B' },
  mathInput: { backgroundColor: '#FEFDF9', fontSize: 32, fontWeight: 'bold', padding: 10, borderRadius: 12, borderWidth: 2, borderColor: '#CBD5E1', width: 90, textAlign: 'center' },
  unlockBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 40, paddingVertical: 15, borderRadius: 16 },
  unlockBtnText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 15 },
  helpBtnText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 16 },
  
  input: { backgroundColor: '#FEFDF9', padding: 15, borderRadius: 12, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  largeInput: { height: 80, textAlignVertical: 'top' },

  profileBar: { flexDirection: 'row', marginBottom: 15, borderBottomWidth: 2, borderColor: '#E2E8F0', paddingBottom: 10, maxHeight: 50 },
  profileTab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#E2E8F0', marginRight: 10 },
  profileTabActive: { backgroundColor: '#8B5CF6' },
  profileTabText: { color: '#64748B', fontWeight: 'bold' },
  profileTabTextActive: { color: '#FFF', fontWeight: 'bold' },

  addProfileRow: { flexDirection: 'row', marginBottom: 20 },
  addProfileInput: { flex: 1, backgroundColor: '#FEFDF9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10 },
  addProfileBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  addProfileBtnText: { color: '#FFF', fontWeight: 'bold' },

  profileControlsRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  editProfileRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'center' },
  editProfileInput: { flex: 1, backgroundColor: '#FEFDF9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3B82F6', marginRight: 10 },

  guideBox: { backgroundColor: '#EFF6FF', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#BFDBFE' },
  guideTitle: { fontWeight: 'bold', color: '#1E3A8A', marginBottom: 6, fontSize: 15 },
  guideText: { color: '#2563EB', fontSize: 14, marginBottom: 3 },
  guideCode: { backgroundColor: '#DBEAFE', color: '#1E40AF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden', fontSize: 13, marginTop: 4 },

  importRow: { flexDirection: 'row', marginBottom: 20 },
  importInput: { flex: 1, backgroundColor: '#FEFDF9', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginRight: 10 },
  importBtn: { backgroundColor: '#3B82F6', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 12 },
  importBtnText: { color: '#FFF', fontWeight: 'bold' },

  actionBtnShare: { backgroundColor: '#3B82F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 5 },
  actionBtnReset: { backgroundColor: '#F59E0B', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  languageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  langBtn: { flex: 1, padding: 12, backgroundColor: '#FEFDF9', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', marginHorizontal: 3 },
  langBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  langText: { color: '#64748B', fontWeight: 'bold' },
  langTextActive: { color: '#FEFDF9', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 25 },
  saveBtnText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },
  
  card: { backgroundColor: '#FEFDF9', padding: 16, borderRadius: 14, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#CBD5E1' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  
  editText: { color: '#3B82F6', fontWeight: 'bold', fontSize: 15 },
  deleteText: { color: '#EF4444', fontWeight: 'bold', fontSize: 15 },
  
  practiceCard: { backgroundColor: '#FEFDF9', padding: 20, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: '#CBD5E1' },
  practiceCardTitle: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },

  memoryBanner: { backgroundColor: '#8B5CF6', padding: 20, borderRadius: 16, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  memoryBannerTitle: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  memoryBannerSub: { color: '#EDE9FE', fontSize: 15 },
  memoryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10 },
  memoryCard: { width: '48%', aspectRatio: 1, backgroundColor: '#3B82F6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: '#2563EB', padding: 10 },
  memoryCardFlipped: { backgroundColor: '#FEFDF9', borderColor: '#CBD5E1' },
  memoryCardMatched: { backgroundColor: '#ECFDF5', borderColor: '#10B981', opacity: 0.8 },
  memoryCardBackText: { fontSize: 60, color: '#EFF6FF', fontWeight: 'bold' },
  memoryCardFrontText: { fontSize: 24, fontWeight: 'bold', color: '#1E293B', textAlign: 'center' },

  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  backBtnText: { color: '#3B82F6', fontSize: 18, fontWeight: 'bold' },
  progressTracker: { flexDirection: 'row' },
  progressDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center', marginLeft: 6 },
  progressDotActive: { backgroundColor: '#10B981' },
  progressDotText: { color: '#64748B', fontWeight: 'bold', fontSize: 12 },
  progressDotTextActive: { color: '#FFF' },

  speakerBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 16, marginBottom: 20 },
  speakerIcon: { fontSize: 24, marginRight: 8 },
  speakerText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },
  sectionLabel: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 15, textAlign: 'center' },
  levelContainer: { flex: 1 },

  optionBtn: { backgroundColor: '#FEFDF9', padding: 20, borderRadius: 14, marginBottom: 12, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center' },
  optionText: { fontSize: 24, color: '#1E293B', fontWeight: '600' },

  blankSentenceRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 30 },
  normalWord: { fontSize: 32, color: '#1E293B', fontWeight: 'bold', marginHorizontal: 4 },
  blankWord: { fontSize: 32, color: '#94A3B8', fontWeight: 'bold', marginHorizontal: 4 },
  blankWordActive: { fontSize: 32, color: '#8B5CF6', fontWeight: 'bold', marginHorizontal: 4, textDecorationLine: 'underline' },
  l2OptionsTray: { flexDirection: 'row', justifyContent: 'space-evenly' },
  l2OptionBtn: { backgroundColor: '#FEFDF9', paddingHorizontal: 30, paddingVertical: 20, borderRadius: 16, borderWidth: 2, borderColor: '#CBD5E1' },
  l2OptionText: { fontSize: 30, fontWeight: 'bold', color: '#3B82F6' },

  wordGridContainer: { width: '100%', aspectRatio: 1, backgroundColor: '#FEFDF9', borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 12, flexDirection: 'row', flexWrap: 'wrap', overflow: 'hidden', marginBottom: 15 },
  gridCell: { justifyContent: 'center', alignItems: 'center', borderWidth: 0.5, borderColor: '#E2E8F0' },
  gridCellSelected: { backgroundColor: '#3B82F6' },
  gridCellText: { fontSize: 26, fontWeight: 'bold', color: '#1E293B' },
  gridCellTextSelected: { color: '#FFF' },

  dropzone: { backgroundColor: '#FEFDF9', minHeight: 120, borderRadius: 16, padding: 16, flexDirection: 'row', flexWrap: 'wrap', borderWidth: 2, borderColor: '#CBD5E1', marginBottom: 15 },
  tray: { flexDirection: 'row', flexWrap: 'wrap', minHeight: 100 },
  placedTile: { backgroundColor: '#3B82F6', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, margin: 5 },
  placedTileText: { color: '#FEFDF9', fontSize: 26, fontWeight: 'bold' },
  trayTile: { backgroundColor: '#FEFDF9', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, margin: 5, borderWidth: 2, borderColor: '#CBD5E1' },
  trayTileText: { color: '#1E293B', fontSize: 26, fontWeight: 'bold' },
  checkBtn: { backgroundColor: '#3B82F6', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10 },
  checkBtnText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },

  l4TypingBox: { backgroundColor: '#FEFDF9', minHeight: 180, borderRadius: 16, padding: 20, fontSize: 32, fontWeight: '600', color: '#1E293B', borderWidth: 2, borderColor: '#CBD5E1', textAlignVertical: 'top', marginBottom: 20 },
  
  cnProgressRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 15 },
  cnProgressBox: { width: 55, height: 55, borderWidth: 2, borderColor: '#CBD5E1', borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 4, backgroundColor: '#FFF' },
  cnProgressBoxActive: { borderColor: '#3B82F6', backgroundColor: '#EFF6FF', borderWidth: 3 },
  cnProgressText: { fontSize: 32, fontWeight: 'bold' },
  
  animationBox: { height: 120, width: 120, alignSelf: 'center', marginBottom: 10, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: '#E2E8F0', backgroundColor: '#FEFDF9' },
  punctuationHint: { fontSize: 60, fontWeight: 'bold', color: '#3B82F6', textAlign: 'center', marginBottom: 15 },
  canvasWrapperSquare: { 
    width: '100%', 
    aspectRatio: 1, 
    maxWidth: 450, 
    maxHeight: 450, 
    alignSelf: 'center',
    backgroundColor: '#FEFDF9', 
    borderWidth: 3, 
    borderColor: '#CBD5E1', 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 15 
  },

  subtext: { textAlign: 'center', color: '#64748B', marginBottom: 10, fontStyle: 'italic' },
  modelAnswer: { fontSize: 46, fontWeight: 'bold', color: '#10B981', textAlign: 'center', marginBottom: 10 },
  canvasControls: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  clearBtn: { flex: 1, backgroundColor: '#E2E8F0', padding: 15, borderRadius: 12, marginRight: 5, alignItems: 'center' },
  clearText: { color: '#64748B', fontSize: 18, fontWeight: 'bold' },
  showBtn: { flex: 2, backgroundColor: '#F59E0B', padding: 15, borderRadius: 12, marginLeft: 5, alignItems: 'center' },
  showText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },
  selfGradeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  tryAgainBtn: { flex: 1, backgroundColor: '#EF4444', padding: 15, borderRadius: 12, marginRight: 5, alignItems: 'center' },
  tryAgainText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },
  masteredBtn: { flex: 1.5, backgroundColor: '#10B981', padding: 15, borderRadius: 12, marginLeft: 5, alignItems: 'center' },
  masteredText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },

  successOverlay: { backgroundColor: '#ECFDF5', padding: 20, borderRadius: 16, borderWidth: 2, borderColor: '#10B981', alignItems: 'center', marginTop: 20 },
  successMsg: { color: '#10B981', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  nextLevelBtn: { backgroundColor: '#10B981', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12 },
  nextLevelText: { color: '#FEFDF9', fontSize: 18, fontWeight: 'bold' },
  errorText: { color: '#EF4444', fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginTop: 20 },

  bottomNav: { flexDirection: 'row', backgroundColor: '#FEFDF9', paddingBottom: 25, paddingTop: 10, borderTopWidth: 1, borderColor: '#E2E8F0' },
  navBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  navBtnActive: { borderTopWidth: 4, borderColor: '#3B82F6', marginTop: -10 },
  navText: { color: '#94A3B8', fontSize: 15, fontWeight: 'bold' },
  navTextActive: { color: '#3B82F6', fontSize: 15, fontWeight: 'bold' }
});