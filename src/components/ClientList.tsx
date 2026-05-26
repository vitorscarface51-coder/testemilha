import React, { useState } from 'react';
import { Conversation, CustomerMood } from '../types';
import { Search, Plus, Filter, MessageSquare, AlertCircle, Smile, Frown, Sparkles, UserPlus } from 'lucide-react';

interface ClientListProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenCreateModal: () => void;
}

export default function ClientList({
  conversations,
  activeId,
  onSelect,
  onOpenCreateModal
}: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [onlyUnread, setOnlyUnread] = useState(false);

  // Extract all unique tags
  const allTags = Array.from(
    new Set(conversations.flatMap(c => c.customer.tags))
  );

  // Filter conversations
  const filteredConversations = conversations.filter(c => {
    const matchesSearch = 
      c.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.customer.phone.includes(searchTerm) ||
      (c.messages[c.messages.length - 1]?.text || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMood = selectedMoodFilter === 'all' || c.customer.mood === selectedMoodFilter;
    const matchesTag = selectedTagFilter === 'all' || c.customer.tags.includes(selectedTagFilter);
    const matchesUnread = !onlyUnread || c.unreadCount > 0;

    return matchesSearch && matchesMood && matchesTag && matchesUnread;
  });

  const getMoodConfig = (mood: CustomerMood) => {
    switch (mood) {
      case 'irritado':
        return { icon: <Frown className="w-3.5 h-3.5 text-rose-500" />, bg: 'bg-rose-50 text-rose-700 border-rose-150', text: 'Irritado' };
      case 'curioso':
        return { icon: <Search className="w-3.5 h-3.5 text-blue-500" />, bg: 'bg-blue-50 text-blue-700 border-blue-150', text: 'Curioso' };
      case 'satisfeito':
        return { icon: <Smile className="w-3.5 h-3.5 text-emerald-500" />, bg: 'bg-emerald-50 text-emerald-700 border-emerald-150', text: 'Satisfeito' };
      case 'indeciso':
        return { icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />, bg: 'bg-amber-50 text-amber-700 border-amber-150', text: 'Indeciso' };
      case 'com pressa':
        return { icon: <Sparkles className="w-3.5 h-3.5 text-purple-500" />, bg: 'bg-purple-50 text-purple-700 border-purple-150', text: 'Com Pressa' };
    }
  };

  return (
    <div className="w-full md:w-80 lg:w-96 flex flex-col border-r border-slate-200 bg-white h-full" id="client-sidebar">
      {/* Header */}
      <div className="p-4 bg-gray-50 flex items-center justify-between border-b border-gray-200" id="sidebar-header">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            💬
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-sm md:text-base">Meus Clientes</h1>
            <p className="text-xs text-slate-500">Atendimento WhatsApp</p>
          </div>
        </div>
        
        <button
          onClick={onOpenCreateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm cursor-pointer transition-colors"
          title="Novo Cliente Simulado"
          id="btn-new-simulated-client"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Novo</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="p-3 bg-white border-b border-slate-100 space-y-2.5" id="sidebar-search-filters">
        <div className="relative">
          <input
            type="text"
            placeholder="Pesquisar cliente ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-100 hover:bg-gray-200/50 focus:bg-white text-sm border-0 rounded-lg focus:ring-1 focus:ring-blue-500 transition-colors"
            id="search-clients-input"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>

        {/* Filter Badges & Toggle */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1 font-medium">
              <Filter className="w-3 h-3" /> Filtros Rápidos
            </span>
            <button 
              onClick={() => {
                setSelectedMoodFilter('all');
                setSelectedTagFilter('all');
                setOnlyUnread(false);
              }}
              className="text-blue-600 hover:underline hover:text-blue-700 cursor-pointer text-[10px]"
            >
              Limpar filtros
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
            {/* Unread Toggle */}
            <button
              onClick={() => setOnlyUnread(!onlyUnread)}
              className={`px-2 py-1 rounded-full text-xs font-medium border cursor-pointer transition-all ${
                onlyUnread 
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
              }`}
            >
              Não lidas ({conversations.filter(c => c.unreadCount > 0).length})
            </button>

            {/* Mood Dropdowns or Mini Filters */}
            <select
              value={selectedMoodFilter}
              onChange={(e) => setSelectedMoodFilter(e.target.value)}
              className="px-2 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">Filtro por Humor</option>
              <option value="irritado">😠 Irritado</option>
              <option value="curioso">🤔 Curioso</option>
              <option value="satisfeito">😊 Satisfeito</option>
              <option value="indeciso">🤷🏽‍♂️ Indeciso</option>
              <option value="com pressa">⚡ Com Pressa</option>
            </select>

            {/* Tag Filter */}
            {allTags.length > 0 && (
              <select
                value={selectedTagFilter}
                onChange={(e) => setSelectedTagFilter(e.target.value)}
                className="px-2 py-1 bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-full text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">Filtro por Tag</option>
                {allTags.map(tag => (
                  <option key={tag} value={tag}>🏷️ {tag}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Conversations Stream */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100" id="contacts-list-container">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto stroke-1" />
            <p className="text-sm">Nenhum cliente encontrado</p>
            <p className="text-[11px] text-slate-400">Experimente limpar filtros ou criar um novo cliente simulado para testar!</p>
          </div>
        ) : (
          filteredConversations.map(conv => {
            const lastMsg = conv.messages[conv.messages.length - 1];
            const isSelected = activeId === conv.id;
            const mood = getMoodConfig(conv.customer.mood);

            return (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                id={`client-item-${conv.id}`}
                className={`p-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-gray-50 relative ${
                  isSelected ? 'bg-gray-100 border-l-4 border-blue-500' : ''
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-slate-150 flex items-center justify-center text-2xl shadow-xs relative shrink-0">
                  {conv.customer.avatar || '👤'}
                  {/* Miniature mood badge */}
                  <div className="absolute -bottom-1 -right-1 bg-white p-0.5 rounded-full border border-slate-200 shadow-xs">
                    {mood?.icon}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-sm font-semibold text-slate-900 truncate pr-2">
                      {conv.customer.name}
                    </h3>
                    <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                      {lastMsg ? lastMsg.timestamp : ''}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 truncate">
                    {conv.customer.phone}
                  </p>

                  <p className={`text-xs truncate ${conv.unreadCount > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                    {lastMsg ? (
                      <>
                        {lastMsg.sender === 'business' ? <span className="text-[10px] text-slate-400 mr-1 font-normal">Você:</span> : null}
                        {lastMsg.text}
                      </>
                    ) : (
                      <span className="text-slate-300 italic">Nenhuma mensagem</span>
                    )}
                  </p>

                  {/* Tags */}
                  {conv.customer.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {conv.customer.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-sm font-medium border border-slate-200/50">
                          {tag}
                        </span>
                      ))}
                      {conv.customer.tags.length > 2 && (
                        <span className="text-[9px] px-1 py-0.5 text-slate-400 bg-slate-50 font-medium">
                          +{conv.customer.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Badge notifications & read status */}
                <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5" id={`status-icons-${conv.id}`}>
                  {conv.unreadCount > 0 ? (
                    <span className="w-5 h-5 rounded-full bg-blue-500 text-white font-semibold text-[10px] flex items-center justify-center animate-pulse">
                      {conv.unreadCount}
                    </span>
                  ) : lastMsg && lastMsg.sender === 'business' ? (
                    <span className="text-blue-500 text-[11px]" title="Visualizado">
                      {lastMsg.status === 'read' ? '✓✓' : '✓'}
                    </span>
                  ) : <div className="h-5"></div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
