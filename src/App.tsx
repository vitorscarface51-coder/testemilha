import React, { useState, useEffect, useRef } from 'react';
import { Conversation, Message, CustomerMood, CompanySetting, QuickReply } from './types';
import ClientList from './components/ClientList';
import ChatWindow from './components/ChatWindow';
import VoiceMessagePlayer from './components/VoiceMessagePlayer';
import { 
  Plus, Settings, Sparkles, X, LayoutGrid, Check, 
  HelpCircle, Trash, RefreshCw, AlertCircle, Phone, 
  Bot, CheckCheck, Send, ArrowLeft, Copy, ExternalLink, Globe,
  Mic, Play, Pause, Trash2, PhoneOff, Volume2, Smile
} from 'lucide-react';

export default function App() {
  // --- Check Role Mode (?customer=true) ---
  const [isCustomerRole] = useState(() => {
    return window.location.search.includes('customer=true');
  });

  // --- Common Base States (Synchronized via WebSocket) ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySetting>({
    name: "Moda & Estilo Store",
    businessType: "Comércio varejista de roupas e calçados premium",
    welcomeMessage: "Olá! Seja muito bem-vindo ao atendimento oficial da Moda & Estilo Store. Como podemos ajudar você hoje? 😊"
  });
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

  // --- CRM Operator Specific States ---
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autoSimulate, setAutoSimulate] = useState(true);
  const [isSimulatingCustomer, setIsSimulatingCustomer] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [showRightDrawer, setShowRightDrawer] = useState(true);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'copilot' | 'settings' | 'quick_replies'>('copilot');

  // --- Operator Copilot States ---
  const [copilotTone, setCopilotTone] = useState<string>('profissional e educado');
  const [copilotObjective, setCopilotObjective] = useState<string>('');
  const [copilotDraft, setCopilotDraft] = useState<string>('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // --- Operator Inputs (New client modal) ---
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+55 (11) 9');
  const [newClientMood, setNewClientMood] = useState<CustomerMood>('curioso');
  const [newClientAvatar, setNewClientAvatar] = useState('🙋🏽‍♂️');
  const [newClientContext, setNewClientContext] = useState('');
  const [newClientTags, setNewClientTags] = useState('Novo Lead');

  // --- Operator Inputs (New Quick Reply) ---
  const [newShortcut, setNewShortcut] = useState('');
  const [newReplyText, setNewReplyText] = useState('');

  // --- Customer/End-User Specific States ---
  const [joinedData, setJoinedData] = useState<{
    conversationId: string;
    customerId: string;
    name: string;
    phone: string;
  } | null>(() => {
    const saved = localStorage.getItem('crm_customer_joined');
    return saved ? JSON.parse(saved) : null;
  });
  const [customerJoinName, setCustomerJoinName] = useState('');
  const [customerJoinPhone, setCustomerJoinPhone] = useState('');
  const [customerInputText, setCustomerInputText] = useState('');
  const [isOperatorTyping, setIsOperatorTyping] = useState(false);

  // --- Customer Voice Recording Panel States ---
  const [isCustomerRecording, setIsCustomerRecording] = useState(false);
  const [customerRecordingSeconds, setCustomerRecordingSeconds] = useState(0);
  const [customerMicError, setCustomerMicError] = useState<string | null>(null);

  const customerMediaRecorderRef = useRef<any>(null);
  const customerAudioChunksRef = useRef<Blob[]>([]);
  const customerRecordingIntervalRef = useRef<any>(null);

  const startCustomerRecording = async () => {
    setCustomerMicError(null);
    customerAudioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Gravação de áudio não suportada.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      customerMediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          customerAudioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(customerAudioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          if (joinedData && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({
              type: "sendMessage",
              conversationId: joinedData.conversationId,
              sender: "customer",
              text: "🎤 Mensagem de voz",
              audioUrl: base64Url,
              audioDuration: customerRecordingSeconds || 4,
              autoSimulate: false
            }));
          }
        };
      };

      recorder.start();
      setIsCustomerRecording(true);
      setCustomerRecordingSeconds(0);
      customerRecordingIntervalRef.current = setInterval(() => {
        setCustomerRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.warn("Using simulated sound on client:", err);
      setCustomerMicError("Simulando envio de áudio");
      setIsCustomerRecording(true);
      setCustomerRecordingSeconds(0);
      customerRecordingIntervalRef.current = setInterval(() => {
        setCustomerRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const stopCustomerRecordingAndSend = () => {
    clearInterval(customerRecordingIntervalRef.current);
    setIsCustomerRecording(false);
    if (customerMediaRecorderRef.current && customerMediaRecorderRef.current.state !== 'inactive') {
      customerMediaRecorderRef.current.stop();
    } else {
      const simulatedAudio = "data:audio/wav;base64,UklGRigAAABXQVZFMmZtdCAAEAAAAAEAAQBAHwAAQB8AAAEACAAAdmF0YQQAAAAAAAAn";
      if (joinedData && socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "sendMessage",
          conversationId: joinedData.conversationId,
          sender: "customer",
          text: "🎤 Mensagem de voz",
          audioUrl: simulatedAudio,
          audioDuration: customerRecordingSeconds || 5,
          autoSimulate: false
        }));
      }
    }
  };

  const cancelCustomerRecording = () => {
    clearInterval(customerRecordingIntervalRef.current);
    setIsCustomerRecording(false);
    if (customerMediaRecorderRef.current && customerMediaRecorderRef.current.state !== 'inactive') {
      customerMediaRecorderRef.current.stop();
    }
    customerMediaRecorderRef.current = null;
    customerAudioChunksRef.current = [];
  };

  const formatCustomerRecordingTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // --- Voice Call Active States ---
  const [activeCall, setActiveCall] = useState<{
    conversationId: string;
    status: 'ringing_outgoing' | 'ringing_incoming' | 'connected' | 'idle';
    caller: 'business' | 'customer';
    callerName: string;
    startedAt?: number;
    duration: number; // in seconds
    isMuted?: boolean;
  } | null>(null);

  // Ringing Sound Effect Generator (Native Web Audio API Oscillators)
  useEffect(() => {
    if (!activeCall || activeCall.status === 'idle' || activeCall.status === 'connected') return;

    // Grab or initialize a native AudioContext
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    let ctx: AudioContext | null = null;
    let intervalId: any = null;

    const playTone = (freq1: number, freq2: number, duration: number) => {
      try {
        if (!ctx) ctx = new AudioContextClass();
        if (ctx.state === 'suspended') ctx.resume();

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.value = freq1;
        osc2.frequency.value = freq2;

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.1);
        gainNode.gain.linearRampToValueAtTime(0.06, ctx.currentTime + duration - 0.1);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start();
        osc2.start();

        setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
            osc1.disconnect();
            osc2.disconnect();
            gainNode.disconnect();
          } catch(e) {}
        }, duration * 1000 + 100);
      } catch (err) {}
    };

    const triggerRing = () => {
      if (!activeCall) return;
      if (activeCall.status === 'ringing_outgoing') {
        // Continuous telephone ringback tone: 425Hz on for 1.2s
        playTone(425, 425, 1.2);
      } else if (activeCall.status === 'ringing_incoming') {
        // Dual-frequency ringback sound: 440Hz + 480Hz
        playTone(440, 480, 0.9);
      }
    };

    triggerRing();
    intervalId = setInterval(triggerRing, 3000);

    return () => {
      clearInterval(intervalId);
      if (ctx) {
        ctx.close().catch(() => {});
      }
    };
  }, [activeCall?.status]);

  // Call Stopwatch Ticker
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'connected') return;

    const interval = setInterval(() => {
      setActiveCall(prev => {
        if (!prev || prev.status !== 'connected') return prev;
        return { ...prev, duration: prev.duration + 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCall?.status]);

  // --- Voice Call Controller Methods ---
  const startCall = (conversationId: string, caller: 'business' | 'customer', callerName: string) => {
    setActiveCall({
      conversationId,
      status: 'ringing_outgoing',
      caller,
      callerName,
      duration: 0
    });
    
    socketRef.current?.send(JSON.stringify({
      type: 'call_dial',
      conversationId,
      caller,
      callerName
    }));

    // Missed call timeout (30 seconds)
    setTimeout(() => {
      setActiveCall(prev => {
        if (prev && prev.conversationId === conversationId && prev.status === 'ringing_outgoing') {
          socketRef.current?.send(JSON.stringify({
            type: 'call_missed',
            conversationId,
            caller
          }));
          return null;
        }
        return prev;
      });
    }, 30000);
  };

  const acceptCall = () => {
    if (!activeCall) return;
    setActiveCall(prev => prev ? { ...prev, status: 'connected', startedAt: Date.now() } : null);
    socketRef.current?.send(JSON.stringify({
      type: 'call_accept',
      conversationId: activeCall.conversationId
    }));
  };

  const declineCall = (reason: string = 'declined') => {
    if (!activeCall) return;
    socketRef.current?.send(JSON.stringify({
      type: 'call_decline',
      conversationId: activeCall.conversationId,
      reason,
      caller: activeCall.caller
    }));
    setActiveCall(null);
  };

  const hangupCall = (finalDuration: number) => {
    if (!activeCall) return;
    socketRef.current?.send(JSON.stringify({
      type: 'call_hangup',
      conversationId: activeCall.conversationId,
      duration: finalDuration,
      caller: activeCall.caller
    }));
    setActiveCall(null);
  };

  // --- WebSocket Refs & Status ---
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const activeIdRef = useRef<string | null>(null);
  const joinedDataRef = useRef<any>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    joinedDataRef.current = joinedData;
  }, [joinedData]);

  // --- Establish WebSocket Connection & Event Routing ---
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimeout: any = null;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}`;
      socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        console.log("WebSocket connected successfully.");
        // Request deep sync
        socket?.send(JSON.stringify({ type: 'init' }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "init_state") {
            setConversations(data.conversations);
            setCompanySettings(data.companySettings);
            setQuickReplies(data.quickReplies);
            
            // Set first conversation active if none loaded yet
            if (!activeIdRef.current && data.conversations.length > 0 && !isCustomerRole) {
              setActiveId(data.conversations[0].id);
            }
          }
          else if (data.type === "conversations") {
            setConversations(data.conversations);
          }
          else if (data.type === "company_settings") {
            setCompanySettings(data.companySettings);
          }
          else if (data.type === "quick_replies") {
            setQuickReplies(data.quickReplies);
          }
          else if (data.type === "customer_joined") {
            if (!isCustomerRole && data.conversationId) {
              // Automatically switch focused chat in real-time to the customer who just joined
              setActiveId(data.conversationId);
              
              // Trigger read confirmation
              if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: "markAsRead",
                  conversationId: data.conversationId
                }));
              }
            }
          }
          else if (data.type === "typing_state") {
            const currentActiveId = isCustomerRole ? joinedDataRef.current?.conversationId : activeIdRef.current;
            if (data.conversationId === currentActiveId) {
              if (isCustomerRole) {
                if (data.sender === "business") {
                  setIsOperatorTyping(data.isTyping);
                }
              } else {
                if (data.sender === "customer") {
                  setIsSimulatingCustomer(data.isTyping);
                }
              }
            }
          }
          else if (data.type === "call_dial") {
            const currentConvId = isCustomerRole ? joinedDataRef.current?.conversationId : activeIdRef.current;
            if (data.conversationId === currentConvId) {
              const isMeCaller = isCustomerRole ? data.caller === 'customer' : data.caller === 'business';
              if (!isMeCaller) {
                const otherPartyName = isCustomerRole ? `Atendente (${companySettings.name})` : data.callerName || "Cliente";
                setActiveCall({
                  conversationId: data.conversationId,
                  status: 'ringing_incoming',
                  callerName: otherPartyName,
                  caller: data.caller,
                  duration: 0
                });
              }
            }
          }
          else if (data.type === "call_accept") {
            setActiveCall(prev => {
              if (prev && prev.conversationId === data.conversationId) {
                return { ...prev, status: 'connected' };
              }
              return prev;
            });
          }
          else if (data.type === "call_decline") {
            setActiveCall(null);
          }
          else if (data.type === "call_hangup") {
            setActiveCall(null);
          }
          else if (data.type === "call_missed") {
            setActiveCall(null);
          }
        } catch (err) {
          console.error("Failed to digest incoming socket message:", err);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        console.warn("WebSocket severed. Reconnecting in 3s...");
        reconnectTimeout = setTimeout(connect, 3000);
      };

      socket.onerror = (err) => {
        console.error("Socket error encountered:", err);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (socket) socket.close();
    };
  }, [isCustomerRole]);

  // Handle marking conversation as read when active contact shifts
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "markAsRead",
        conversationId: id
      }));
    }
    // Clean draft suggests
    setCopilotDraft('');
    setCopilotObjective('');
    setCopilotError(null);
  };

  // --- Real-time Interactions via Socket ---
  const handleSendMessage = (text: string) => {
    if (!activeId || !socketRef.current) return;
    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "sendMessage",
        conversationId: activeId,
        sender: "business",
        text,
        autoSimulate
      }));
    }
  };

  // Trigger simulated client response manually
  const handleManualSimulateReply = () => {
    if (!activeId || !socketRef.current) return;
    const activeConv = conversations.find(c => c.id === activeId);
    if (!activeConv) return;

    if (activeConv.customer.tags.includes("👥 Cliente Real")) {
      alert("Este é um cliente real que está conectado ao celular dele! Aguarde que ele envie sua própria resposta.");
      return;
    }

    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "sendMessage",
        conversationId: activeId,
        sender: "business",
        text: "Poderia nos detalhar um pouco mais?",
        autoSimulate: true
      }));
    }
  };

  // Copilot suggestions call (REST POST triggers Gemini client-side fallback fallback)
  const handleGenerateCopilotDraft = async () => {
    const activeConv = conversations.find(c => c.id === activeId);
    if (!activeConv) return;

    setIsGeneratingDraft(true);
    setCopilotError(null);
    setCopilotDraft('');

    try {
      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: activeConv.messages.slice(-8),
          customerName: activeConv.customer.name,
          businessType: companySettings.businessType,
          tone: copilotTone,
          objective: copilotObjective
        })
      });

      if (!response.ok) throw new Error('Falha no copiloto.');
      const data = await response.json();
      if (data.suggestion) {
        setCopilotDraft(data.suggestion);
      } else {
        throw new Error('Retorno vazio.');
      }
    } catch (err: any) {
      console.error(err);
      setCopilotError('Suporte offline. Carregando rascunho rápido inteligente...');
      // Static fallback copy
      setCopilotDraft(`Prezado(a) ${activeConv.customer.name},\n\nRecebemos sua mensagem em nosso canal de suporte em tempo real. Entendo seu caso de humor "${activeConv.customer.mood}" e já estamos alinhando as melhores condições comerciais e de logística para solucionar isso agora mesmo.\n\nComo gostaria de prosseguir?`);
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleApplyCopilotDraft = () => {
    if (!copilotDraft) return;
    handleSendMessage(copilotDraft);
    setCopilotDraft('');
    setCopilotObjective('');
  };

  // Add simulated lead profile card
  const handleCreateSimulatedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;

    const newId = `c_custom_${Date.now()}`;
    const cleanTags = newClientTags.split(',').map(t => t.trim()).filter(Boolean);

    const newConv: Conversation = {
      id: newId,
      customer: {
        id: `cust_custom_${Date.now()}`,
        name: newClientName,
        phone: newClientPhone,
        mood: newClientMood,
        avatar: newClientAvatar,
        businessContext: newClientContext || "Interessado nos lançamentos mais recentes para compra.",
        tags: cleanTags.length > 0 ? cleanTags : ['Lead Manual']
      },
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          sender: 'customer',
          text: `Olá! Falei com vocês anteriormente e queria retomar contato sobre minha dúvida.`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          status: 'delivered'
        }
      ],
      unreadCount: 1,
      lastUpdated: new Date().toISOString(),
      notes: "Cliente simulado adicionado via prompt de simulação rápida."
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "createConversation",
        conversation: newConv
      }));
    }

    setActiveId(newId);
    setShowCreateClientModal(false);

    // reset fields
    setNewClientName('');
    setNewClientPhone('+55 (11) 9');
    setNewClientMood('curioso');
    setNewClientAvatar('🙋🏽‍♂️');
    setNewClientContext('');
    setNewClientTags('Novo Lead');
  };

  const handleSaveCompanySettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "updateCompanySettings",
        companySettings
      }));
      alert("Configurações atualizadas! Todos os painéis ativos e as simulações do Gemini foram sincronizados.");
    }
  };

  const handleDeleteContact = (id: string) => {
    if (confirm("Deseja realmente arquivar esta simulação ou contato de cliente?")) {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          type: "deleteConversation",
          id
        }));
      }
      if (activeId === id) setActiveId(null);
    }
  };

  const handleAddQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShortcut.trim() || !newReplyText.trim()) return;

    const formattedShortcut = newShortcut.startsWith('/') ? newShortcut : `/${newShortcut}`;
    const newReply: QuickReply = {
      id: `qr_${Date.now()}`,
      shortcut: formattedShortcut,
      text: newReplyText
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "createQuickReply",
        quickReply: newReply
      }));
    }

    setNewShortcut('');
    setNewReplyText('');
  };

  const handleDeleteQuickReply = (id: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "deleteQuickReply",
        id
      }));
    }
  };

  // --- End-User/Customer Join Action ---
  const handleCustomerJoinChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerJoinName.trim() || !customerJoinPhone.trim()) {
      setJoinError("Por favor, preencha o seu nome completo e seu celular/WhatsApp.");
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      const res = await fetch("/api/customer-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerJoinName,
          phone: customerJoinPhone
        })
      });

      if (!res.ok) throw new Error("Falha ao registrar seu atendimento.");
      const data = await res.json();

      const joinModel = {
        conversationId: data.conversationId,
        customerId: data.customerId,
        name: customerJoinName,
        phone: data.customer.phone
      };

      localStorage.setItem('crm_customer_joined', JSON.stringify(joinModel));
      setJoinedData(joinModel);

      // Force reconnect websocket to bind state smoothly
      if (socketRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'init' }));
      }
    } catch (err: any) {
      console.error(err);
      setJoinError("Não foi possível iniciar o chat. Tente novamente em instantes.");
    } finally {
      setIsJoining(false);
    }
  };

  // Send message on customer client
  const handleCustomerSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customerInputText.trim() || !joinedData || !socketRef.current) return;

    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "sendMessage",
        conversationId: joinedData.conversationId,
        sender: "customer",
        text: customerInputText
      }));

      // Stop typing status
      socketRef.current.send(JSON.stringify({
        type: "typing",
        conversationId: joinedData.conversationId,
        sender: "customer",
        isTyping: false
      }));
    }

    setCustomerInputText('');
  };

  // Trigger typing notification for operator
  const handleCustomerTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerInputText(e.target.value);
    if (!joinedData || !socketRef.current) return;

    const hasText = e.target.value.length > 0;
    if (socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: "typing",
        conversationId: joinedData.conversationId,
        sender: "customer",
        isTyping: hasText
      }));
    }
  };

  const handleCopyCustomerLink = () => {
    const link = `${window.location.origin}?customer=true`;
    navigator.clipboard.writeText(link);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  // Resolve active conversation object
  const activeConversation = conversations.find(c => c.id === activeId) || null;

  // Resolve current logged customer's conversation for Client View
  const customerConversation = joinedData 
    ? conversations.find(c => c.id === joinedData.conversationId) 
    : null;

  // --- RENDERING ROUTE: CLIENT/CUSTOMER REALTIME ATTACHMENT VIEW ---
  if (isCustomerRole) {
    if (!joinedData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 font-sans select-none" id="customer-join-view">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-6 py-5 bg-blue-600 text-white flex flex-col items-center text-center gap-1.5">
              <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center text-3xl shadow-xs">
                💬
              </div>
              <div>
                <h1 className="text-lg font-bold">{companySettings.name}</h1>
                <p className="text-xs text-blue-100 uppercase tracking-widest font-semibold">Suporte ao Cliente Real-time</p>
              </div>
            </div>

            {/* Entry Form */}
            <form onSubmit={handleCustomerJoinChat} className="p-6 space-y-4">
              <div className="space-y-1">
                <p className="text-xs text-slate-500 leading-relaxed text-center font-medium mb-3">
                  Para iniciar seu atendimento em tempo real, digite seu nome e número de celular para contato:
                </p>
                <label className="text-xs font-bold text-slate-700 block">Seu Nome Completo</label>
                <input
                  type="text"
                  placeholder="Vitor de Souza"
                  value={customerJoinName}
                  onChange={(e) => setCustomerJoinName(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none focus:border-transparent font-medium text-slate-800"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Seu Celular / WhatsApp</label>
                <input
                  type="text"
                  placeholder="+55 (11) 99999-8888"
                  value={customerJoinPhone}
                  onChange={(e) => setCustomerJoinPhone(e.target.value)}
                  className="w-full text-sm p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none focus:border-transparent font-medium text-slate-800"
                  required
                />
              </div>

              {joinError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>{joinError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isJoining || !customerJoinName.trim()}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold rounded-lg transition-colors cursor-pointer shadow-md flex items-center justify-center gap-1.5"
              >
                {isJoining ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <span>Entrar no Chat</span>
                  </>
                )}
              </button>
            </form>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <Globe className="w-3.5 h-3.5 text-blue-400" />
              <span>Conexão direta e instantânea via Websockets</span>
            </div>
          </div>
        </div>
      );
    }

    // Customer Side Active Conversation UI
    const displayedMessages = customerConversation ? customerConversation.messages : [];

    return (
      <div className="flex flex-col h-screen bg-[#efeae2]" id="customer-active-chat-view">
        
        {/* Customer Header */}
        <header className="bg-[#008069] text-white px-4 py-3.5 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if(confirm("Deseja sair deste atendimento e fechar a sessão?")) {
                  localStorage.removeItem('crm_customer_joined');
                  setJoinedData(null);
                }
              }}
              className="p-1 hover:bg-white/10 rounded-full cursor-pointer transition-colors text-white"
              title="Trocar de nome / Sair"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="font-bold text-sm md:text-base">{companySettings.name}</h2>
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span className="text-[10px] text-emerald-100 font-semibold uppercase">Atendimento Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (!joinedData) return;
                startCall(joinedData.conversationId, 'customer', joinedData.name);
              }}
              className="p-2 bg-[#00a884] hover:bg-[#008069] active:scale-95 text-white rounded-lg flex items-center gap-1.5 transition-all shadow-sm cursor-pointer shrink-0"
              title="Iniciar ligação de voz com o Atendente"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span className="text-xs font-bold hidden sm:inline">Chamar Atendente</span>
            </button>

            <div className="text-right hidden xs:block">
              <p className="text-[10px] text-emerald-100 font-bold">Logado como</p>
              <p className="text-xs font-semibold truncate max-w-[120px] text-white">{joinedData.name}</p>
            </div>
          </div>
        </header>

        {/* Sync connection loss visual warning */}
        {!isConnected && (
          <div className="bg-amber-500 text-white text-center py-1.5 text-xs font-bold animate-pulse flex items-center justify-center gap-1 z-50 shrink-0">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            <span>Reconectando ao servidor de mensagens em tempo real...</span>
          </div>
        )}

        {/* Message canvas for customer */}
        <main className="flex-1 overflow-y-auto px-4 py-6 space-y-4" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23000000' fill-opacity='0.035'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.148 0 5.7-2.552 5.7-5.7 0-3.148-2.552-5.7-5.7-5.7-3.148 0-5.7 2.552-5.7 5.7 0 3.148 2.552 5.7 5.7 5.7zm4 41c1.933 0 3.5-1.567 3.5-3.5S40.933 33 39 33s-3.5 1.567-3.5 3.5 1.567 3.5 3.5 3.5z'/%3E%3C/g%3E%3C/svg%3E")`
        }}>
          {/* End-to-end simulated encryption banner */}
          <div className="mx-auto max-w-sm text-center my-2 bg-[#ffeecd] border border-[#f5e3bc] px-3.5 py-2 rounded-[7.5px] text-[11px] text-[#544c3d] flex items-start gap-2 shadow-xs select-none">
            <span className="text-xs mt-0.5">🔒</span>
            <p className="leading-tight text-left">
              As mensagens e chamadas são protegidas com a criptografia de ponta a ponta simulada do CRM. Ninguém sob esta simulação pode ler ou ouvir as mensagens.
            </p>
          </div>

          {/* Gray capsule style date header */}
          <div className="flex justify-center my-3 select-none">
            <span className="px-3 py-1 bg-white/95 text-[#667781] text-[11px] font-semibold uppercase tracking-wider rounded-[7.5px] shadow-[0_1px_1px_rgba(0,0,0,0.08)]">
              Hoje
            </span>
          </div>

          {displayedMessages.map((msg) => {
            const isMe = msg.sender === "customer";
            return (
              <div 
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isMe ? 'pr-2' : 'pl-2'} animate-fadeIn`}
              >
                {/* Bubble with custom speech triangular tail */}
                <div 
                  className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative text-[14.2px] leading-[19px] ${
                    isMe
                      ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none after:content-[\'\'] after:absolute after:top-0 after:right-[-6px] after:w-[10px] after:h-[12px] after:bg-[#d9fdd3] after:rounded-tr-[2px] after:[clip-path:polygon(0_0,0_100%,100%_0)]'
                      : 'bg-white text-[#111b21] rounded-tl-none after:content-[\'\'] after:absolute after:top-0 after:left-[-6px] after:w-[10px] after:h-[12px] after:bg-white after:rounded-tl-[2px] after:[clip-path:polygon(100%_0,0_0,100%_100%)]'
                  }`}
                >
                  {msg.audioUrl ? (
                    <div className="py-1">
                      <p className="text-[11px] font-bold text-[#128c7e] mb-1.5 flex items-center gap-1 select-none">
                        🎤 Mensagem de voz
                      </p>
                      <VoiceMessagePlayer src={msg.audioUrl} duration={msg.audioDuration} />
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap select-text leading-relaxed font-normal">
                      {msg.text}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-end gap-1 text-[10px] mt-1 select-none text-[#667781]">
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span className="text-[#53bdeb] font-semibold ml-1">
                        ✓✓
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator for client side */}
          {isOperatorTyping && (
            <div className="flex justify-start animate-pulse">
              <div className="bg-white border border-slate-200/50 px-4 py-2 rounded-lg rounded-tl-none text-xs flex items-center gap-2 shadow-xs">
                <span className="text-[#667781] font-medium">Atendente está digitando</span>
                <div className="flex gap-1 shrink-0">
                  <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Customer Input box footer */}
        <footer className="bg-[#f0f2f5] p-3 border-t border-slate-200/80 shrink-0">
          <div className="max-w-4xl mx-auto">
            {isCustomerRecording ? (
              <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-full py-2 px-4 w-full animate-pulse transition-all">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping shrink-0" />
                  <span className="text-xs font-extrabold text-[#ea1d33] tracking-wide uppercase font-sans">
                    Gravando: {formatCustomerRecordingTime(customerRecordingSeconds)}
                  </span>
                  {customerMicError && (
                    <span className="text-[10px] text-red-500 font-semibold bg-red-100 px-1.5 py-0.5 rounded-sm animate-pulse">
                      {customerMicError}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={cancelCustomerRecording}
                    className="p-2 text-slate-500 hover:text-red-900 rounded-full hover:bg-slate-200 cursor-pointer active:scale-95 transition-all shrink-0"
                    title="Descartar gravação"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={stopCustomerRecordingAndSend}
                    className="px-4 py-1.5 bg-[#00a884] hover:bg-[#008069] text-white font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 shadow-sm"
                    title="Enviar Áudio de voz"
                  >
                    <Mic className="w-3.5 h-3.5 fill-current" />
                    <span>Enviar Áudio</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCustomerSendMessage} className="flex items-center gap-2">
                
                {/* Round message box style */}
                <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2.5 shadow-sm border border-slate-200/50">
                  {/* Smile icon */}
                  <button 
                    type="button" 
                    className="text-[#667781] hover:text-[#111b21] transition-colors cursor-pointer shrink-0"
                    title="Emojis"
                  >
                    <Smile className="w-5 h-5" />
                  </button>

                  <input
                    type="text"
                    placeholder="Mensagem"
                    value={customerInputText}
                    onChange={handleCustomerTypingChange}
                    className="flex-1 text-sm text-slate-700 placeholder-gray-400 focus:outline-none bg-transparent"
                  />
                </div>

                {customerInputText.trim() !== '' ? (
                  <button
                    type="submit"
                    className="w-12 h-12 bg-[#00a884] hover:bg-[#008069] text-white rounded-full shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center -mb-0.5"
                    title="Enviar mensagem"
                  >
                    <Send className="w-5 h-5 relative left-0.5" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startCustomerRecording}
                    className="w-12 h-12 bg-[#00a884] hover:bg-[#008069] text-white rounded-full shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center -mb-0.5"
                    title="Gravar de voz"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </form>
            )}
          </div>
        </footer>

        {/* Real-time Voice Calling Panel Overlay (Customer Side) */}
        {activeCall && (
          <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-8 text-white select-none animate-fadeIn font-sans">
            <div className="flex flex-col items-center gap-1.5 mt-12 text-center text-white">
              <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-4xl shadow-lg relative animate-pulse">
                <span className="absolute -inset-2 bg-emerald-500/5 rounded-full animate-ping"></span>
                <span className="relative z-10">📞</span>
              </div>
              <h3 className="text-xl font-bold mt-4 tracking-tight text-white">
                {activeCall.callerName}
              </h3>
              <p className="text-xs uppercase tracking-widest text-emerald-400 font-extrabold animate-pulse">
                {activeCall.status === 'ringing_outgoing' && "Chamando..."}
                {activeCall.status === 'ringing_incoming' && "Chamada de Voz recebida..."}
                {activeCall.status === 'connected' && "Chamada em Andamento"}
              </p>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 my-6 text-white">
              {activeCall.status === 'connected' ? (
                <div className="flex flex-col items-center gap-4 text-white">
                  <span className="text-4xl font-mono tracking-wider font-extrabold bg-white/10 px-6 py-2 rounded-xl border border-white/10 shadow-inner">
                    {(() => {
                      const minutes = Math.floor(activeCall.duration / 60);
                      const seconds = activeCall.duration % 60;
                      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                    })()}
                  </span>
                  <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-500 animate-bounce" /> transmissão de áudio bidirecional ativa
                  </p>
                  
                  {/* Visual wave equalizer bars */}
                  <div className="flex items-end justify-center gap-1 h-12 mt-4 select-none pointer-events-none">
                    {[1, 2.5, 4, 5, 3.5, 2, 4.5, 5, 3, 1.5, 3.5, 5, 2].map((v, i) => (
                      <span
                        key={i}
                        className="w-1 bg-emerald-500 rounded-sm transition-all duration-150 animate-bounce"
                        style={{
                          height: `${v * 20}%`,
                          animationDelay: `${i * 80}ms`
                        }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-white">
                  <div className="flex items-center gap-1.5 h-8 select-none pointer-events-none animate-pulse">
                    {[15, 30, 45, 30, 15].map((h, i) => (
                      <span key={i} className="w-1 bg-slate-400 rounded-sm" style={{ height: `${h}px` }} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 font-bold">Iniciando codec de áudio de alta fidelidade...</p>
                </div>
              )}
            </div>

            <div className="mb-12 flex items-center justify-center gap-6">
              {activeCall.status === 'ringing_incoming' ? (
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => declineCall('rejected')}
                    className="w-16 h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all"
                    title="Recusar chamada de voz"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <button
                    onClick={acceptCall}
                    className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all animate-bounce"
                    title="Atender chamada de voz"
                  >
                    <Phone className="w-7 h-7 fill-white stroke-white" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => {
                      if (activeCall.status === 'connected') {
                        hangupCall(activeCall.duration);
                      } else {
                        declineCall('cancelled');
                      }
                    }}
                    className="w-16 h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all"
                    title="Finalizar chamada"
                  >
                    <PhoneOff className="w-7 h-7" />
                  </button>
                  <span className="text-xs text-slate-400 font-extrabold">Desligar</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    );
  }

  // --- RENDERING ROUTE: OPERATOR/CRM DASHBOARD PANELS ---
  return (
    <div className="flex w-full h-screen bg-[#f0f2f5] font-sans text-slate-800 overflow-hidden relative" id="sleek-app">
      
      {/* Sidebar Area (Left) */}
      <ClientList 
        conversations={conversations}
        activeId={activeId}
        onSelect={handleSelectConversation}
        onOpenCreateModal={() => setShowCreateClientModal(true)}
      />

      {/* Main View Area (Center) */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        
        {/* CRM Superior Control Bar */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shadow-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-xl">💼</span>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">{companySettings.name}</h2>
              <p className="text-[10px] text-slate-400 capitalize truncate max-w-[240px] md:max-w-xs">{companySettings.businessType}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Client Link Generator & Opener */}
            <div className="flex items-center gap-1">
              <button
                onClick={handleCopyCustomerLink}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border cursor-pointer transition-all text-xs font-semibold ${
                  linkCopied 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
                title="Copiar link do chat do cliente para abrir em outro dispositivo ou aba"
              >
                {linkCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Link Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>🔗 Link do Cliente</span>
                  </>
                )}
              </button>
              
              <a
                href={`${window.location.origin}?customer=true`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 hover:bg-slate-50 border border-slate-200 bg-white text-slate-600 rounded-lg flex items-center justify-center cursor-pointer hover:text-blue-600 transition-colors"
                title="Abrir o Chat do Cliente em uma nova aba em tempo real"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Offline/Online System connection status badge */}
            <span className={`px-2 py-0.5 border text-[9px] rounded font-bold uppercase tracking-wider flex items-center gap-1 ${
              isConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-rose-500 animate-ping'}`} />
              {isConnected ? 'Online' : 'Desconectado'}
            </span>

            {/* Config panel button */}
            <button
              onClick={() => setShowRightDrawer(!showRightDrawer)}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                showRightDrawer 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-2xs' 
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
              title="Copiloto & Ferramentas CRM"
              id="btn-toggle-drawer"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Live Interactive ChatGPT Component */}
        <ChatWindow 
          activeConversation={activeConversation}
          quickReplies={quickReplies}
          onSendMessage={handleSendMessage}
          onSimulateCustomerReply={handleManualSimulateReply}
          isSimulating={isSimulatingCustomer}
          autoSimulate={autoSimulate}
          onChangeAutoSimulate={setAutoSimulate}
          onOpenCopilot={() => {
            setShowRightDrawer(true);
            setDrawerActiveTab('copilot');
          }}
          onStartCall={() => {
            if (!activeConversation) return;
            startCall(activeConversation.id, 'business', "Atendimento Oficial");
          }}
          onSendVoice={(base64Url, duration) => {
            if (!activeConversation || !socketRef.current) return;
            socketRef.current.send(JSON.stringify({
              type: "sendMessage",
              conversationId: activeConversation.id,
              sender: "business",
              text: "🎤 Mensagem de voz",
              audioUrl: base64Url,
              audioDuration: duration,
              autoSimulate: autoSimulate
            }));
          }}
          activeCall={activeCall}
        />
      </div>

      {/* Right Drawer Panel (Co-pilot & Customizations) */}
      {showRightDrawer && (
        <aside className="w-[340px] md:w-[380px] h-full bg-white border-l border-gray-200 flex flex-col shadow-lg z-25 relative shrink-0" id="crm-right-panel">
          
          {/* Drawer tabs selector */}
          <div className="flex bg-gray-50 border-b border-gray-250 select-none">
            <button
              onClick={() => setDrawerActiveTab('copilot')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                drawerActiveTab === 'copilot' 
                  ? 'border-blue-500 text-blue-600 bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Copiloto AI</span>
            </button>

            <button
              onClick={() => setDrawerActiveTab('settings')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                drawerActiveTab === 'settings' 
                  ? 'border-blue-500 text-blue-600 bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Dados CRM</span>
            </button>

            <button
              onClick={() => setDrawerActiveTab('quick_replies')}
              className={`flex-1 py-3 text-center text-xs font-bold transition-all border-b-2 flex items-center justify-center gap-1 cursor-pointer ${
                drawerActiveTab === 'quick_replies' 
                  ? 'border-blue-500 text-blue-600 bg-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Atalhos (/)</span>
            </button>

            <button 
              onClick={() => setShowRightDrawer(false)}
              className="px-3.5 text-slate-400 hover:text-slate-600 transition-colors"
              title="Fechar painel auxiliar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5" id="drawer-content-container">

            {/* TAB 1: COPILOT RESPONSE ASSISTANT */}
            {drawerActiveTab === 'copilot' && (
              <div className="space-y-4" id="copilot-tab-panel">
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 text-xs text-blue-800 space-y-1">
                  <span className="font-bold flex items-center gap-1">
                    <Bot className="w-4 h-4" /> Rascunhos Inteligentes
                  </span>
                  <p className="leading-relaxed">
                    Com base no humor do cliente selecionado, histórico da conversa e objetivos de vendas, o Gemini redige a resposta ideal pronta para enviar.
                  </p>
                </div>

                {!activeConversation ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs">Selecione cliente ativo para rascunhar respostas com IA</p>
                  </div>
                ) : (
                  <div className="space-y-4.5">
                    {/* Customer Status Summary */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">Cliente em Foco</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{activeConversation.customer.avatar}</span>
                        <div>
                          <p className="text-xs font-bold text-slate-800">{activeConversation.customer.name}</p>
                          <p className="text-[10px] capitalize text-slate-500">Humor: <strong className="text-blue-600">{activeConversation.customer.mood}</strong></p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200/50">
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Notas Privadas do CRM</p>
                        <p className="text-xs text-slate-600 italic bg-white p-1.5 rounded mt-1 border border-slate-100">
                          {activeConversation.notes || 'Sem anotações internas adicionadas.'}
                        </p>
                      </div>
                    </div>

                    {/* Tone configuration */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Tom do Atendimento</label>
                      <select
                        value={copilotTone}
                        onChange={(e) => setCopilotTone(e.target.value)}
                        className="w-full text-xs p-2 bg-slate-55 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="profissional e educado">💼 Profissional e Educado</option>
                        <option value="empático e super acolhedor">❤️ Empático e Super Acolhedor</option>
                        <option value="direto, formal e conciso">⚡ Direto e Formal (Sem Rodeios)</option>
                        <option value="descontraído, jovial e amigável">🎉 Descontraído e Jovial</option>
                        <option value="persuasivo e focado em fechar venda">💰 Persuasivo (Foco em Vendas)</option>
                      </select>
                    </div>

                    {/* Objective formulation */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700 block">Instrução / Meta Especial (Opcional)</label>
                      <textarea
                        rows={2}
                        value={copilotObjective}
                        onChange={(e) => setCopilotObjective(e.target.value)}
                        placeholder="Ex: Oferecer frete grátis via motoboy se ele confirmar tamanho; pedir desculpas e acalmar o cliente."
                        className="w-full text-xs p-2.5 bg-slate-55 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                      />
                    </div>

                    {/* Trigger button */}
                    <button
                      onClick={handleGenerateCopilotDraft}
                      disabled={isGeneratingDraft}
                      className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingDraft ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Escrevendo Rascunho Perfeito...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Gerar Sugestão Copiloto</span>
                        </>
                      )}
                    </button>

                    {/* Shows error feedback */}
                    {copilotError && (
                      <div className="p-2 bg-rose-50 border border-rose-100 text-rose-800 text-[11px] rounded flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>Aviso: Rodando rascunho de emergência padrão de contingência. Configure a chave para resposta real do modelo.</span>
                      </div>
                    )}

                    {/* Draft Suggestion Container Output */}
                    {copilotDraft && (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2 animate-fadeIn relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Rascunho Sugerido</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(copilotDraft);
                              alert("Mensagem copiada para a área de transferência!");
                            }}
                            className="text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer underline"
                          >
                            Copiar texto
                          </button>
                        </div>
                        <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed select-text bg-white p-2.5 rounded border border-slate-100">
                          {copilotDraft}
                        </p>
                        
                        <div className="flex gap-2 pt-1.5">
                          <button
                            onClick={handleApplyCopilotDraft}
                            className="flex-1 py-1.5 bg-blue-600 text-white rounded text-xs font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" /> Enviar Mensagem
                          </button>
                          <button
                            onClick={() => {
                              const inputArea = document.getElementById('chat-input-textarea') as HTMLTextAreaElement;
                              if (inputArea) {
                                inputArea.value = copilotDraft;
                                inputArea.focus();
                                const event = new Event('input', { bubbles: true });
                                inputArea.dispatchEvent(event);
                              }
                              setCopilotDraft('');
                            }}
                            className="px-2.5 py-1.5 bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors text-xs font-bold rounded cursor-pointer"
                            title="Despejar no campo de entrada para ajuste manual antes de enviar"
                          >
                            Editar no Chat
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: COMPANY CRM SETTINGS */}
            {drawerActiveTab === 'settings' && (
              <div className="space-y-4" id="settings-tab-panel">
                <form onSubmit={handleSaveCompanySettings} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Nome Comercial da Empresa</label>
                    <input
                      type="text"
                      value={companySettings.name}
                      onChange={(e) => setCompanySettings({...companySettings, name: e.target.value})}
                      className="w-full text-xs p-2.5 bg-slate-55 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Ramo de Atuação / Atividades</label>
                    <textarea
                      rows={2}
                      value={companySettings.businessType}
                      onChange={(e) => setCompanySettings({...companySettings, businessType: e.target.value})}
                      placeholder="Ex: Loja de roupas e calçados premium, Petshop, Imobiliária de imóveis corporativos"
                      className="w-full text-xs p-2.5 bg-slate-55 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                      required
                    />
                    <p className="text-[10px] text-slate-400">
                      Isto molda o vocabulário e o entendimento das simulações de IA e rascunhos de vendas.
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">Mensagem Padrão de Boas-Vindas</label>
                    <textarea
                      rows={2}
                      value={companySettings.welcomeMessage}
                      onChange={(e) => setCompanySettings({...companySettings, welcomeMessage: e.target.value})}
                      className="w-full text-xs p-2.5 bg-slate-55 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    Salvar e Enviar a Todos
                  </button>
                </form>

                {/* Simulated/Connected Clients Management */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Base de Contatos Ativa ({conversations.length})</h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 select-none">
                    {conversations.map(c => {
                      const isReal = c.customer.tags.includes("👥 Cliente Real");
                      return (
                        <div 
                          key={c.id} 
                          className="p-2 hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span>{c.customer.avatar}</span>
                            <span className="truncate font-semibold text-slate-700">{c.customer.name}</span>
                            {isReal ? (
                              <span className="px-1 text-[8px] bg-emerald-50 text-emerald-600 font-bold uppercase shrink-0">Real</span>
                            ) : (
                              <span className="px-1 text-[8px] bg-blue-50 text-blue-500 font-bold uppercase shrink-0">{c.customer.mood}</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleDeleteContact(c.id)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors rounded cursor-pointer"
                            title="Remover ou arquivar contato permanentemente"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: QUICK REPLIES MANAGER */}
            {drawerActiveTab === 'quick_replies' && (
              <div className="space-y-4" id="quickreplies-tab-panel">
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-800">
                  <span className="font-bold flex items-center gap-1">
                    <Bot className="w-4 h-4" /> Respostas Rápidas (Atalhos)
                  </span>
                  <p className="leading-relaxed mt-0.5">
                    Digite o atalho configurado no chat (exemplo: <strong>/boasvindas</strong>) para carregar o parágrafo de resposta instantaneamente.
                  </p>
                </div>

                {/* Creation Form */}
                <form onSubmit={handleAddQuickReply} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                  <p className="text-[10px] font-bold text-slate-600 uppercase">Novo Atalho</p>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">Atalho (ex: /cupom)</label>
                    <input
                      type="text"
                      placeholder="/cupom"
                      value={newShortcut}
                      onChange={(e) => setNewShortcut(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block font-normal">Texto de Envio</label>
                    <textarea
                      rows={3}
                      placeholder="Use nosso cupom ECO15 e garanta 15% de desconto em todo o site hoje mesmo!"
                      value={newReplyText}
                      onChange={(e) => setNewReplyText(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 placeholder-slate-400 text-slate-800"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Criar Atalho Rápido
                  </button>
                </form>

                {/* List of shortcuts */}
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase font-medium">Atalhos Disponíveis ({quickReplies.length})</p>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {quickReplies.map(qr => (
                      <div key={qr.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col gap-1 relative group">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {qr.shortcut}
                          </span>
                          <button
                            onClick={() => handleDeleteQuickReply(qr.id)}
                            className="p-1 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-sm transition-colors cursor-pointer"
                            title="Remover atalho"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-100">
                          {qr.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      )}

      {/* MODAL: ADD CLIENT GENERATION CARDS */}
      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="modal-backdrop">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-scaleUp" id="modal-container">
            
            {/* Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👤</span>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm md:text-base">Adicionar Novo Lead Simulado</h3>
                  <p className="text-xs text-slate-500 font-medium">Crie um persona personalizada para conversar com sua IA</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCreateClientModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateSimulatedClient} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                
                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Nome do Cliente</label>
                  <input
                    type="text"
                    placeholder="Luana Nogueira"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Telefone */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Número do WhatsApp</label>
                  <input
                    type="text"
                    placeholder="+55 (11) 97766-5544"
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                    required
                  />
                </div>

                {/* Mood Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Humor Inicial</label>
                  <select
                    value={newClientMood}
                    onChange={(e) => setNewClientMood(e.target.value as CustomerMood)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                  >
                    <option value="curioso">🤔 Curioso / Interessado</option>
                    <option value="irritado">😠 Irritado / Impaciente</option>
                    <option value="satisfeito">😊 Satisfeito / Amigável</option>
                    <option value="indeciso">🤷🏽‍♂️ Indeciso / Desconfiado</option>
                    <option value="com pressa">⚡ Com Pressa / Rápido</option>
                  </select>
                </div>

                {/* Persona Avatar Emoji Select */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block font-normal">Avatar (Emoji)</label>
                  <select
                    value={newClientAvatar}
                    onChange={(e) => setNewClientAvatar(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-semibold text-slate-800"
                  >
                    <option value="🙋🏽‍♂️">🙋🏽‍♂️ Rapaz</option>
                    <option value="💁🏼‍♀️">💁🏼‍♀️ Moça Loira</option>
                    <option value="🙋🏾‍♀️">🙋🏾‍♀️ Moça Negra</option>
                    <option value="👩🏻‍💼">👩🏻‍💼 Executiva</option>
                    <option value="👨🏻‍🎨">👨🏻‍🎨 Artista</option>
                    <option value="👨🏽‍💼">👨🏽‍💼 Executivo</option>
                    <option value="👴🏼">👴🏼 Senhor</option>
                    <option value="🎒">🎒 Estudante</option>
                  </select>
                </div>

                {/* Tags Separated */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700 block font-medium">Marcadores / Tags (separados por vírgulas)</label>
                  <input
                    type="text"
                    placeholder="Troca Urgente, Novo Lead, Indicado, Whitelabel"
                    value={newClientTags}
                    onChange={(e) => setNewClientTags(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium text-slate-800"
                  />
                </div>

                {/* Context scenario detail */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-bold block text-blue-600 font-semibold">Contexto e Intenção do Cliente (Instruções detalhadas de IA)</label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Quer negociar o valor de lote corporativo de 15 necessaires e exige pagar em boleto faturado sob pena de fechar com o concorrente..."
                    value={newClientContext}
                    onChange={(e) => setNewClientContext(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-55 border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 placeholder-slate-400 text-slate-800"
                    required
                  />
                  <p className="text-[10px] text-slate-400">
                    O simulador do cliente interpretará este enredo minuciosamente para reagir a suas mensagens e propostas comerciais exatamente de acordo!
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-100 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateClientModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  Salvar e Iniciar Conversa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Real-time Voice Calling Panel Overlay (Operator Side) */}
      {activeCall && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-between p-8 text-white select-none animate-fadeIn font-sans">
          <div className="flex flex-col items-center gap-1.5 mt-12 text-center text-white">
            <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center text-4xl shadow-lg relative animate-pulse">
              <span className="absolute -inset-2 bg-emerald-500/5 rounded-full animate-ping"></span>
              <span className="relative z-10">📞</span>
            </div>
            <h3 className="text-xl font-bold mt-4 tracking-tight text-white">
              {activeCall.callerName}
            </h3>
            <p className="text-xs uppercase tracking-widest text-emerald-400 font-extrabold animate-pulse">
              {activeCall.status === 'ringing_outgoing' && "Chamando..."}
              {activeCall.status === 'ringing_incoming' && "Chamada de Voz recebida..."}
              {activeCall.status === 'connected' && "Chamada em Andamento"}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 my-6 text-white">
            {activeCall.status === 'connected' ? (
              <div className="flex flex-col items-center gap-4 text-white">
                <span className="text-4xl font-mono tracking-wider font-extrabold bg-white/10 px-6 py-2 rounded-xl border border-white/10 shadow-inner w-full text-center">
                  {(() => {
                    const minutes = Math.floor(activeCall.duration / 60);
                    const seconds = activeCall.duration % 60;
                    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                  })()}
                </span>
                <p className="text-xs text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                  <Volume2 className="w-4 h-4 text-emerald-500 animate-bounce" /> transmissão de áudio bidirecional ativa
                </p>
                
                {/* Visual wave equalizer bars */}
                <div className="flex items-end justify-center gap-1 h-12 mt-4 select-none pointer-events-none">
                  {[1, 2.5, 4, 5, 3.5, 2, 4.5, 5, 3, 1.5, 3.5, 5, 2].map((v, i) => (
                    <span
                      key={i}
                      className="w-1 bg-emerald-500 rounded-sm transition-all duration-150 animate-bounce"
                      style={{
                        height: `${v * 20}%`,
                        animationDelay: `${i * 80}ms`
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 text-white">
                <div className="flex items-center gap-1.5 h-8 select-none pointer-events-none animate-pulse">
                  {[15, 30, 45, 30, 15].map((h, i) => (
                    <span key={i} className="w-1 bg-slate-400 rounded-sm" style={{ height: `${h}px` }} />
                  ))}
                </div>
                <p className="text-xs text-slate-400 font-bold">Iniciando codec de áudio de alta fidelidade...</p>
              </div>
            )}
          </div>

          <div className="mb-12 flex items-center justify-center gap-6">
            {activeCall.status === 'ringing_incoming' ? (
              <div className="flex items-center gap-6">
                <button
                  onClick={() => declineCall('rejected')}
                  className="w-16 h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all"
                  title="Recusar chamada de voz"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <button
                  onClick={acceptCall}
                  className="w-16 h-16 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all animate-bounce"
                  title="Atender chamada de voz"
                >
                  <Phone className="w-7 h-7 fill-white stroke-white" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => {
                    if (activeCall.status === 'connected') {
                      hangupCall(activeCall.duration);
                    } else {
                      declineCall('cancelled');
                    }
                  }}
                  className="w-16 h-16 bg-red-600 hover:bg-red-700 active:scale-95 text-white rounded-full flex items-center justify-center shadow-lg cursor-pointer transition-all"
                  title="Finalizar chamada"
                >
                  <PhoneOff className="w-7 h-7" />
                </button>
                <span className="text-xs text-slate-400 font-extrabold">Desligar</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
