import React, { useState, useRef, useEffect } from 'react';
import { Conversation, Message, QuickReply } from '../types';
import { 
  Send, Smile, Paperclip, MoreVertical, ShieldAlert, Zap, 
  Sparkles, Bot, Clock, ToggleLeft, ToggleRight, Check, CheckCheck, Loader2, Image, FileText,
  Phone, PhoneOff, Mic, MicOff, Play, Pause, Trash2, Volume2
} from 'lucide-react';
import VoiceMessagePlayer from './VoiceMessagePlayer';

interface ChatWindowProps {
  activeConversation: Conversation | null;
  quickReplies: QuickReply[];
  onSendMessage: (text: string) => void;
  onSimulateCustomerReply: () => void;
  isSimulating: boolean;
  autoSimulate: boolean;
  onChangeAutoSimulate: (val: boolean) => void;
  onOpenCopilot: () => void;
  onStartCall?: () => void;
  onSendVoice?: (audioUrl: string, duration: number) => void;
  activeCall?: any;
}

export default function ChatWindow({
  activeConversation,
  quickReplies,
  onSendMessage,
  onSimulateCustomerReply,
  isSimulating,
  autoSimulate,
  onChangeAutoSimulate,
  onOpenCopilot,
  onStartCall,
  onSendVoice,
  activeCall
}: ChatWindowProps) {
  const [inputText, setInputText] = useState('');
  const [showQuickReplyMenu, setShowQuickReplyMenu] = useState(false);
  const [filteredReplies, setFilteredReplies] = useState<QuickReply[]>([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  // --- Voice Note Recording States ---
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  const startRecording = async () => {
    setMicError(null);
    audioChunksRef.current = [];
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Gravação de áudio não suportada.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Disable tracks to close indicator lights
        stream.getTracks().forEach(track => track.stop());

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          if (onSendVoice) {
            onSendVoice(base64Url, recordingSeconds || 4);
          }
        };
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.warn("Using simulated safe sound device due to browser block:", err);
      setMicError("Sem acesso ao dispositivo — Simulando envio de áudio");
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecordingAndSend = () => {
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      // Create a lightweight synthetically generated audio base64 payload as a safe, crash-proof WAV fallback
      const simulatedAudio = "data:audio/wav;base64,UklGRigAAABXQVZFMmZtdCAAEAAAAAEAAQBAHwAAQB8AAAEACAAAdmF0YQQAAAAAAAAn";
      if (onSendVoice) {
        onSendVoice(simulatedAudio, recordingSeconds || 5);
      }
    }
  };

  const cancelRecording = () => {
    clearInterval(recordingIntervalRef.current);
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
  };

  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    };
  }, []);

  const formatRecordingTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isSimulating]);

  if (!activeConversation) {
    return (
      <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-8 text-center" id="empty-chat-viewport">
        <div className="max-w-md space-y-4">
          <div className="w-24 h-24 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-4xl shadow-xs">
            💬
          </div>
          <h2 className="text-xl font-bold text-slate-800">WhatsApp CRM Inteligente</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Selecione uma conversa na lista lateral para simular atendimento, testar suas mensagens de vendas, tirar dúvidas de clientes reais ou solicitar ajuda ao Copiloto de IA!
          </p>
          <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-100 text-xs px-3 py-1.5 rounded-full font-semibold">
            <Bot className="w-3.5 h-3.5" /> IA Integrada e Ativa
          </div>
        </div>
      </div>
    );
  }

  // Handle key triggers for quick replies
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    if (value.startsWith('/')) {
      const search = value.toLowerCase();
      const matched = quickReplies.filter(r => 
        r.shortcut.toLowerCase().startsWith(search) ||
        r.text.toLowerCase().includes(search.slice(1))
      );
      setFilteredReplies(matched);
      setShowQuickReplyMenu(matched.length > 0);
    } else {
      setShowQuickReplyMenu(false);
    }
  };

  const handleSelectQuickReply = (text: string) => {
    setInputText(text);
    setShowQuickReplyMenu(false);
    inputRef.current?.focus();
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
    setShowQuickReplyMenu(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Attach simulated files
  const handleSimulateAttachment = (type: 'invoice' | 'product_pic' | 'catalog') => {
    setShowAttachmentMenu(false);
    if (type === 'invoice') {
      onSendMessage("📄 [Documento Simulado: Fatura_Pedido_18485.pdf]");
    } else if (type === 'product_pic') {
      onSendMessage("📸 [Imagem Simulada: nova_bota_italiana_42.png]");
    } else if (type === 'catalog') {
      onSendMessage("🔗 [Catálogo Simulado: Catalogo_Colecao_Estilo_2026.pdf]");
    }
  };

  const customer = activeConversation.customer;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 relative" id={`chat-viewport-${activeConversation.id}`}>
      
      {/* Top Profile Header */}
      <div className="p-3 bg-[#008069] text-white flex items-center justify-between shadow-md z-10" id="chat-header">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl shadow-xs relative shrink-0">
            {customer.avatar || "👤"}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-[#008069]"></span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-white text-sm md:text-base leading-tight truncate">
              {customer.name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs text-emerald-100 font-medium">
              <span>{customer.phone}</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm bg-black/15 font-semibold text-[10px] capitalize text-white">
                Humor: {customer.mood}
              </span>
            </div>
          </div>
        </div>

        {/* Action Widgets */}
        <div className="flex items-center gap-2 md:gap-3" id="chat-header-actions">
          {/* Auto Simulate Toggle */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-250 rounded-lg text-xs font-semibold">
            <span className="text-slate-500">Resposta Automática de IA</span>
            <button
              onClick={() => onChangeAutoSimulate(!autoSimulate)}
              className="focus:outline-none cursor-pointer text-emerald-600 hover:text-emerald-700 transition-colors"
              title={autoSimulate ? "Desativar automação de IA do cliente" : "Ativar automação de IA do cliente"}
            >
              {autoSimulate ? (
                <ToggleRight className="w-7 h-7 stroke-1 text-emerald-600 fill-emerald-100" />
              ) : (
                <ToggleLeft className="w-7 h-7 stroke-1 text-slate-400" />
              )}
            </button>
          </div>

          {/* AI Drafting Button */}
          <button
            onClick={onOpenCopilot}
            className="flex items-center gap-1 px-2.5 py-1.5 md:px-3 md:py-2 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-700 hover:to-indigo-700 text-white font-semibold rounded-lg text-xs md:text-sm shadow-sm cursor-pointer transition-colors"
            id="btn-trigger-ai-copilot"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>Copiloto</span>
          </button>

          {/* Real-time Voice Phone Call */}
          <button
            onClick={onStartCall}
            className="flex items-center gap-1.5 px-2.5 py-1.5 md:px-3 md:py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg text-xs md:text-sm shadow-sm cursor-pointer transition-colors shrink-0"
            title="Iniciar ligação de voz em tempo real"
            id="btn-trigger-voice-call"
          >
            <Phone className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline font-bold">Ligar</span>
          </button>

          {/* Simulate Action Manual */}
          {!autoSimulate && (
            <button
              onClick={onSimulateCustomerReply}
              disabled={isSimulating}
              className="flex items-center gap-1 px-2 py-1.5 md:px-2.5 md:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
              title="Simular resposta do cliente agora"
              id="btn-simulate-manual-reply"
            >
              {isSimulating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span className="hidden md:inline">Cliente Responder</span>
            </button>
          )}
        </div>
      </div>

      {/* Warning ribbon if simulation parameters are strong */}
      <div className="bg-amber-50/75 border-b border-amber-100 px-4 py-2 text-xs text-amber-800 flex items-center gap-2 select-none" id="context-banner">
        <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="truncate">
          <strong>Contexto do Cliente:</strong> {customer.businessContext}
        </span>
      </div>

      {/* Messages Canvas */}
      <div 
        className="flex-1 overflow-y-auto px-4 py-6 space-y-4 bg-[#efeae2]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill='%23000000' fill-opacity='0.035'%3E%3Cpath fill-rule='evenodd' d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm1-61c3.148 0 5.7-2.552 5.7-5.7 0-3.148-2.552-5.7-5.7-5.7-3.148 0-5.7 2.552-5.7 5.7 0 3.148 2.552 5.7 5.7 5.7zm4 41c1.933 0 3.5-1.567 3.5-3.5S40.933 33 39 33s-3.5 1.567-3.5 3.5 1.567 3.5 3.5 3.5z'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
        id="messages-canvas"
      >
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

        {activeConversation.messages.map((msg, index) => {
          const isBusiness = msg.sender === 'business';
          return (
            <div
              key={msg.id || index}
              className={`flex ${isBusiness ? 'justify-end' : 'justify-start'} ${isBusiness ? 'pr-2' : 'pl-2'}`}
              id={`message-row-${msg.id}`}
            >
              {/* Message Bubble wrapper with triangular clip-path tail */}
              <div 
                className={`max-w-[85%] sm:max-w-[70%] px-3 py-1.5 rounded-[7.5px] shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] relative text-[14.2px] leading-[19px] ${
                  isBusiness 
                    ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none after:content-[\'\'] after:absolute after:top-0 after:right-[-6px] after:w-[10px] after:h-[12px] after:bg-[#d9fdd3] after:rounded-tr-[2px] after:[clip-path:polygon(0_0,0_100%,100%_0)]' 
                    : 'bg-white text-[#111b21] rounded-tl-none after:content-[\'\'] after:absolute after:top-0 after:left-[-6px] after:w-[10px] after:h-[12px] after:bg-white after:rounded-tl-[2px] after:[clip-path:polygon(100%_0,0_0,100%_100%)]'
                }`}
              >
                {/* Embedded Voice Audio Note */}
                {msg.audioUrl ? (
                  <div className="py-1">
                    <p className="text-[11px] font-bold text-[#128c7e] mb-1.5 flex items-center gap-1 select-none">
                      🎤 Mensagem de voz
                    </p>
                    <VoiceMessagePlayer src={msg.audioUrl} duration={msg.audioDuration} />
                  </div>
                ) : msg.text.includes("[Documento Simulado:") ? (
                  <div className="flex items-center gap-3 bg-black/5 p-2 rounded-lg mb-1.5 border border-black/10">
                    <div className="bg-rose-500 p-2 rounded text-white font-bold text-xs select-none">PDF</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{msg.text.replace("[Documento Simulado: ", "").replace("]", "")}</p>
                      <p className="text-[10px] text-slate-500">Visualizar 1.2 MB</p>
                    </div>
                  </div>
                ) : msg.text.includes("[Imagem Simulada:") ? (
                  <div className="bg-black/5 p-2 rounded-lg mb-1.5 border border-black/10">
                    <div className="aspect-video bg-neutral-200 rounded flex items-center justify-center text-slate-700 font-medium text-xs select-none gap-2">
                       imagem_bota_italiana.png
                    </div>
                    <span className="text-[10px] text-slate-600 mt-1 block truncate">
                      {msg.text.replace("[Imagem Simulada: ", "").replace("]", "")}
                    </span>
                  </div>
                ) : msg.text.includes("[Catálogo Simulado:") ? (
                  <div className="flex items-center gap-3 bg-black/5 p-2 rounded-lg mb-1.5 border border-black/10">
                    <div className="bg-orange-500 p-2 rounded text-white font-bold text-xs select-none">CAT</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-800 truncate">{msg.text.replace("[Catálogo Simulado: ", "").replace("]", "")}</p>
                      <p className="text-[10px] text-slate-500">Abrir Catálogo Interativo</p>
                    </div>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap leading-relaxed select-text font-normal">{msg.text}</p>
                )}

                {/* Bubble Footer Info */}
                <div className="flex items-center justify-end gap-1 text-[10px] mt-1 select-none text-[#667781] justify-end">
                  <span>{msg.timestamp}</span>
                  {isBusiness && (
                    <span className="font-bold ml-1 shrink-0">
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb] inline" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-slate-400 inline" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Customer Simulating/Typing State */}
        {isSimulating && (
          <div className="flex justify-start" id="typing-indicator">
            <div className="bg-white border border-slate-200/30 text-slate-800 max-w-[70%] rounded-lg rounded-tl-none px-4 py-2.5 shadow-xs flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">{customer.name} está digitando</span>
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-1.5 h-1.5 bg-[#10b981] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Auto-Suggest Quick Replies Menu */}
      {showQuickReplyMenu && filteredReplies.length > 0 && (
        <div className="absolute bottom-16 left-4 right-4 bg-white border border-slate-200 rounded-lg shadow-lg z-20 max-h-56 overflow-y-auto divide-y divide-slate-100" id="quick-replies-menu">
          <div className="p-2.5 bg-slate-50 text-[10px] text-slate-500 font-bold tracking-wider flex items-center justify-between">
            <span>RESPOSTAS RÁPIDAS (Selecione ou clique para preencher)</span>
            <span className="text-blue-600 font-normal">Atalho: /nomedoatalho</span>
          </div>
          {filteredReplies.map((reply) => (
            <div
              key={reply.id}
              onClick={() => handleSelectQuickReply(reply.text)}
              className="p-3 hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-4 transition-colors text-left"
            >
              <div>
                <span className="text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-100 px-2 py-0.5 rounded-sm mr-2.5">
                  {reply.shortcut}
                </span>
                <span className="text-xs text-slate-700 truncate inline-block max-w-[400px]">
                  {reply.text}
                </span>
              </div>
              <Zap className="w-3 h-3 text-amber-500 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Footer Chat Input / Controls */}
      <div className="p-3 bg-[#f0f2f5] border-t border-slate-200/80 flex flex-col gap-2 relative z-10" id="chat-input-controls">
        
        {/* Helper indicator if user types / */}
        {!showQuickReplyMenu && inputText === '' && (
          <p className="text-[10px] text-slate-500 pl-1 select-none flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-amber-500" /> Dica: digite <strong>/</strong> para acessar atalhos rápidos de respostas
          </p>
        )}

        {isRecording ? (
          <div className="flex items-center justify-between gap-4 bg-red-50 border border-red-200 rounded-full py-2 px-4 w-full animate-pulse transition-all">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-red-600 rounded-full animate-ping shrink-0" />
              <span className="text-xs font-extrabold text-[#ea1d33] tracking-wider uppercase font-sans">
                Gravando: {formatRecordingTime(recordingSeconds)}
              </span>
              {micError && (
                <span className="text-[10px] text-red-500 font-semibold bg-red-100 px-1.5 py-0.5 rounded-sm">
                  {micError}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={cancelRecording}
                className="p-2 text-slate-500 hover:text-red-600 rounded-full hover:bg-slate-200 cursor-pointer active:scale-95 transition-all shrink-0"
                title="Descartar gravação"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={stopRecordingAndSend}
                className="px-4 py-1.5 bg-[#00a884] hover:bg-[#008069] text-white font-bold text-xs rounded-full flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0 shadow-sm"
                title="Parar e Enviar Áudio"
              >
                <Mic className="w-3.5 h-3.5 fill-current" />
                <span>Enviar Áudio</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            
            {/* Round message bar style */}
            <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center gap-2.5 shadow-sm border border-slate-200/50">
              {/* Smile icon */}
              <button 
                type="button" 
                className="text-[#667781] hover:text-[#111b21] transition-colors cursor-pointer shrink-0 animate-fadeIn"
                title="Emojis"
              >
                <Smile className="w-5 h-5" />
              </button>

              {/* Attachment Controls */}
              <div className="relative shrink-0 flex items-center animate-fadeIn">
                <button
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={`text-[#667781] hover:text-[#111b21] cursor-pointer transition-colors ${
                    showAttachmentMenu ? 'text-emerald-600' : ''
                  }`}
                  title="Anexar arquivo simulado"
                  id="btn-attachment-menu"
                >
                  <Paperclip className="w-5 h-5 shrink-0" />
                </button>

                {/* Simulated actions menu */}
                {showAttachmentMenu && (
                  <div className="absolute bottom-10 left-0 bg-white border border-slate-200 rounded-lg shadow-md p-2 w-48 space-y-1 z-30 animate-fadeIn" id="attachment-menu-popup">
                    <button
                      onClick={() => handleSimulateAttachment('product_pic')}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer"
                    >
                      <Image className="w-4 h-4 text-emerald-600" /> Foto do estoque
                    </button>
                    <button
                      onClick={() => handleSimulateAttachment('invoice')}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-rose-500" /> Fatura em PDF
                    </button>
                    <button
                      onClick={() => handleSimulateAttachment('catalog')}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-slate-50 rounded-lg text-xs font-semibold text-slate-700 text-left transition-colors cursor-pointer"
                    >
                      <Paperclip className="w-4 h-4 text-blue-500" /> Catálogo Geral
                    </button>
                  </div>
                )}
              </div>

              {/* Textarea Input area */}
              <textarea
                ref={inputRef}
                rows={1}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                placeholder="Mensagem"
                className="flex-1 text-slate-700 text-sm focus:outline-none placeholder-gray-400 max-h-24 resize-none bg-transparent"
                style={{ height: '24px' }}
                id="chat-input-textarea"
              />
            </div>

            {/* Circular Send / Mic button aligned on the right of the input */}
            {inputText.trim() !== '' ? (
              <button
                onClick={handleSend}
                className="w-12 h-12 bg-[#00a884] hover:bg-[#008069] text-white rounded-full shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center -mb-0.5"
                id="btn-send-message"
                title="Enviar mensagem"
              >
                <Send className="w-5 h-5 relative left-0.5" />
              </button>
            ) : (
              <button
                onClick={startRecording}
                className="w-12 h-12 bg-[#00a884] hover:bg-[#008069] text-white rounded-full shadow-md transition-all shrink-0 cursor-pointer active:scale-95 flex items-center justify-center -mb-0.5"
                id="btn-trigger-mic"
                title="Gravar mensagem de voz"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
