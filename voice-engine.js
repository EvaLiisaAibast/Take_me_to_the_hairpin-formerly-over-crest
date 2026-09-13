// Voice Engine - Vosk-browser integration with grammar-constrained recognition
// Falls back to Web Speech API if Vosk fails to load

class VoiceEngine {
  constructor() {
    this.recognizer = null;
    this.model = null;
    this.isVoskAvailable = false;
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;
    
    // Pacenote vocabulary - closed set of ~60 words for grammar constraint
    this.vocabulary = [
      // Directions
      'left', 'right', 'straight', 'square', 'hairpin', 'flat', 'crest',
      // Modifiers
      'tight', 'very', 'medium', 'long', 'short', 'slight', 'opens',
      // Junctions
      'into', 'over', 'keep', 'dont', 'cut', 'caution', 'jump', 'bump',
      // Numbers
      'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
      'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'hundred',
      // Distances
      'meters', 'metres', 'yards', 'meters', 'before', 'after',
      // Other
      'and', 'then', 'minus', 'plus', 'fast', 'sweep', 'water', 'mud', 'ice', 'snow',
      'bridge', 'narrow', 'wide', 'chicane', 's', 'section'
    ];
    
    // Web Speech API fallback
    this.webSpeechRecognition = null;
  }

  async initialize() {
    try {
      // Try to load Vosk from CDN
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/vosk-browser@0.0.5/dist/vosk.min.js';
      script.onload = () => this.initVosk();
      script.onerror = () => {
        console.warn('Vosk failed to load, falling back to Web Speech API');
        this.initWebSpeech();
      };
      document.head.appendChild(script);
    } catch (e) {
      console.warn('Vosk initialization failed, falling back to Web Speech API:', e);
      this.initWebSpeech();
    }
  }

  async initVosk() {
    try {
      if (typeof Vosk === 'undefined') {
        throw new Error('Vosk not loaded');
      }

      // Create grammar from vocabulary
      const grammar = this.buildGrammar();
      
      // Load model - NOTE: This URL points to third-party demo hosting
      // Self-host this model before shipping to production
      const modelUrl = 'https://alphacephei.com/vosk/models/small-en-us-0.15';
      
      this.model = await new Vosk.Model(modelUrl);
      this.recognizer = new Vosk.Recognizer(this.model, 16000);
      
      // Apply grammar constraint if supported
      if (this.recognizer.setGrammar) {
        this.recognizer.setGrammar(grammar);
      }
      
      this.isVoskAvailable = true;
      console.log('[VoiceEngine] Vosk initialized with grammar constraint');
    } catch (e) {
      console.warn('[VoiceEngine] Vosk initialization failed:', e);
      this.initWebSpeech();
    }
  }

  buildGrammar() {
    // Build a simple grammar from the vocabulary
    // This constrains the recognizer to only recognize words in the pacenote set
    return this.vocabulary.join(' | ');
  }

  initWebSpeech() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.webSpeechRecognition = new SpeechRecognition();
      this.webSpeechRecognition.continuous = false;
      this.webSpeechRecognition.interimResults = false;
      this.webSpeechRecognition.lang = 'en-US';
      
      this.webSpeechRecognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (this.onResult) this.onResult(transcript);
      };
      
      this.webSpeechRecognition.onerror = (event) => {
        if (this.onError) this.onError(event.error);
      };
      
      this.webSpeechRecognition.onend = () => {
        this.isListening = false;
        if (this.onEnd) this.onEnd();
      };
      
      console.log('[VoiceEngine] Web Speech API initialized as fallback');
    } else {
      console.error('[VoiceEngine] No speech recognition available');
    }
  }

  start() {
    if (this.isListening) return;
    
    if (this.isVoskAvailable && this.recognizer) {
      this.startVosk();
    } else if (this.webSpeechRecognition) {
      this.startWebSpeech();
    } else {
      console.error('[VoiceEngine] No speech recognition engine available');
    }
  }

  async startVosk() {
    try {
      this.isListening = true;
      
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioContext = new AudioContext({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      processor.onaudioprocess = (e) => {
        if (this.isListening && this.recognizer) {
          const buffer = e.inputBuffer.getChannelData(0);
          this.recognizer.acceptWaveform(buffer);
          
          if (this.recognizer.result) {
            const result = this.recognizer.result.text;
            if (result && this.onResult) {
              this.onResult(result);
              this.stop();
            }
          }
        }
      };
      
      this.audioContext = audioContext;
      this.processor = processor;
      this.stream = stream;
      
    } catch (e) {
      console.error('[VoiceEngine] Vosk audio error:', e);
      this.isListening = false;
      if (this.onError) this.onError(e);
    }
  }

  startWebSpeech() {
    if (!this.webSpeechRecognition) return;
    
    this.isListening = true;
    try {
      this.webSpeechRecognition.start();
    } catch (e) {
      console.error('[VoiceEngine] Web Speech start error:', e);
      this.isListening = false;
      if (this.onError) this.onError(e);
    }
  }

  stop() {
    if (!this.isListening) return;
    
    this.isListening = false;
    
    if (this.isVoskAvailable) {
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      if (this.recognizer) {
        this.recognizer.reset();
      }
    } else if (this.webSpeechRecognition) {
      try {
        this.webSpeechRecognition.stop();
      } catch (e) {
        console.warn('[VoiceEngine] Web Speech stop error:', e);
      }
    }
    
    if (this.onEnd) this.onEnd();
  }

  setResultCallback(callback) {
    this.onResult = callback;
  }

  setErrorCallback(callback) {
    this.onError = callback;
  }

  setEndCallback(callback) {
    this.onEnd = callback;
  }

  isAvailable() {
    return this.isVoskAvailable || this.webSpeechRecognition !== null;
  }

  getEngineName() {
    if (this.isVoskAvailable) return 'Vosk (grammar-constrained)';
    if (this.webSpeechRecognition) return 'Web Speech API';
    return 'None';
  }
}

// Global voice engine instance
const voiceEngine = new VoiceEngine();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    voiceEngine.initialize();
  });
}
