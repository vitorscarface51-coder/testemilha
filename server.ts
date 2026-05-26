import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { Conversation, Message, CompanySetting, QuickReply } from "./src/types";

dotenv.config();

const app = express();
const PORT = 3000;
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

const DATABASE_PATH = path.join(process.cwd(), "database.json");

// --- Persistent Server Memory States ---
let companySettings: CompanySetting = {
  name: "Moda & Estilo Store",
  businessType: "Comércio varejista de roupas e calçados premium",
  welcomeMessage: "Olá! Seja muito bem-vindo ao atendimento oficial da Moda & Estilo Store. Como podemos ajudar você hoje? 😊"
};

let quickReplies: QuickReply[] = [
  {
    id: 'qr1',
    shortcut: '/boasvindas',
    text: "Olá! Seja muito bem-vindo ao nosso atendimento oficial. Como podemos te ajudar hoje? 😊"
  },
  {
    id: 'qr2',
    shortcut: '/pix',
    text: "Claro! Para facilitar, você pode efetuar o pagamento via PIX através de nossa chave CNPJ comercial: 12.345.678/0001-90 (Moda e Estilo LTDA). Favor enviar o comprovante após realizar."
  },
  {
    id: 'qr3',
    shortcut: '/endereco',
    text: "Nossa loja física fica instalada na Avenida Paulista, nº 1500, Bloco B, São Paulo - SP. Atendemos de segunda a sexta, das 09:00 às 20:00, e aos sábados, das 09:00 às 16:00!"
  },
  {
    id: 'qr4',
    shortcut: '/atraso',
    text: "Peço imensas desculpas pela demora no envio! Estamos com uma alta demanda de logística esta semana devido ao feriado, mas já priorizei seu pedido junto ao nosso galpão para postagem imediata hoje!"
  }
];

let conversations: Conversation[] = [
  {
    id: 'c1',
    customer: {
      id: 'cust1',
      name: "Pedro Silva",
      avatar: "👨🏽‍💼",
      phone: "+55 (11) 98765-4321",
      mood: "irritado",
      businessContext: "Comprou uma bota italiana tamanho 41 no site, mas ela ficou muito apertada. Precisa trocar urgentemente pelo tamanho 42 pois tem um casamento de gala amanhã à noite.",
      tags: ["Troca Urgente", "Urgente", "Site"]
    },
    unreadCount: 1,
    lastUpdated: new Date().toISOString(),
    notes: "O cliente está impaciente. Precisamos resolver a troca com frete expresso caso ele colabore no chat.",
    messages: [
      {
        id: 'msg1_1',
        sender: 'customer',
        text: "Oi, boa tarde. Comprei uma bota modelo Classic no site de vocês, chegou hoje mas ficou incrivelmente apertada. Comprei 41 mas a fôrma de vocês deve ser pequena.",
        timestamp: "19:05",
        status: "read"
      },
      {
        id: 'msg1_2',
        sender: 'business',
        text: "Olá, Pedro! Tudo bem? Sentimos muito pelo ocorrido. Peço desculpas pela bota Classic ter ficado justa. Qual seria o tamanho ideal para você? Geralmente para esse modelo sugerimos uma numeração a mais se o pé for largo.",
        timestamp: "19:07",
        status: "read"
      },
      {
        id: 'msg1_3',
        sender: 'customer',
        text: "Preciso do tamanho 42! E preciso pra AMANHÃ! Tenho um casamento de gala como padrinho na parte da noite. Se não chegar a tempo, vou querer estorno e farei uma reclamação séria. Como fazemos?",
        timestamp: "19:10",
        status: "delivered"
      }
    ]
  },
  {
    id: 'c2',
    customer: {
      id: 'cust2',
      name: "Mariana Santos",
      avatar: "👩🏻‍⚕️",
      phone: "+55 (21) 99888-7766",
      mood: "curioso",
      businessContext: "Viu um carrossel no Instagram sobre o blazer de linho ecológico. Deseja saber se o linho amassa muito, quais cores estão disponíveis além de cru, e se há desconto acima de 3 peças.",
      tags: ["Redes Sociais", "Novo Lead"]
    },
    unreadCount: 0,
    lastUpdated: new Date().toISOString(),
    notes: "Lead muito qualificada. Parece disposta a gastar um ticket alto se tiver atendimento atencioso.",
    messages: [
      {
        id: 'msg2_1',
        sender: 'customer',
        text: "Olá! Vi as fotos do blazer de linho ecológico no Instagram. Vocês atendem por aqui?",
        timestamp: "18:40",
        status: "read"
      },
      {
        id: 'msg2_2',
        sender: 'business',
        text: "Olá, Mariana! Sim, atendemos sim! 😊 É um prazer falar com você. O nosso Blazer Linho Eco é um dos nossos maiores sucessos. Ele une a sofisticação do linho com a leveza da viscose, o que ajuda muito a amassar menos!",
        timestamp: "18:43",
        status: "read"
      },
      {
        id: 'msg2_3',
        sender: 'customer',
        text: "Ah, que bom! Eu tenho pavor de roupa que amassa só de olhar kkkk. Quais outras cores vocês têm além daquela clarinha? E se eu levar 3 blazers para minhas irmãs, consigo algum desconto diferenciado para pagamento via pix?",
        timestamp: "18:45",
        status: "read"
      }
    ]
  },
  {
    id: 'c3',
    customer: {
      id: 'cust3',
      name: "Juliana Costa",
      avatar: "🎒",
      phone: "+55 (31) 97777-6655",
      mood: "satisfeito",
      businessContext: "Cliente antiga altamente engajada. Mandou foto de um look que comprou e amou. Quer reservar a nova coleção de inverno antecipadamente.",
      tags: ["Cliente VIP", "Reserva Inverno"]
    },
    unreadCount: 0,
    lastUpdated: new Date().toISOString(),
    notes: "Cliente fiel, sempre responde aos e-mails. Fazer atendimento muito pessoal com emojis.",
    messages: [
      {
        id: 'msg3_1',
        sender: 'business',
        text: "Juliana! Seu pedido nº 8440 já foi entregue! Deu tudo certo por aí? Conta para a gente o que achou das novas malhas!",
        timestamp: "17:15",
        status: "read"
      },
      {
        id: 'msg3_2',
        sender: 'customer',
        text: "Meninas! Estou completamente APAIXONADA! A malha bege veste como uma luva, o toque é super macio. Postei até um story e marquei vocês! 😍",
        timestamp: "17:28",
        status: "read"
      },
      {
        id: 'msg3_3',
        sender: 'customer',
        text: "Já quero saber quando sai o catálogo oficial de casacos pesados. Posso deixar um reservado com vocês antes de esgotar o tamanho P?",
        timestamp: "17:30",
        status: "read"
      }
    ]
  },
  {
    id: 'c4',
    customer: {
      id: 'cust4',
      name: "Roberto Oliveira",
      avatar: "👨🏽‍🍳",
      phone: "+55 (48) 98888-0022",
      mood: "indeciso",
      businessContext: "Precisa comprar presentes corporativos de fim de ano para 15 funcionárias femininas. Está perdido entre necessaires de couro ou lenços de seda pura. Quer opinião estética.",
      tags: ["Dúvida", "Faturamento Corp"]
    },
    unreadCount: 0,
    lastUpdated: new Date().toISOString(),
    notes: "Precisa de ajuda com curadoria. Oferecer chamada de vídeo ou mandar fotos montadas das caixas de presentes.",
    messages: [
      {
        id: 'msg4_1',
        sender: 'customer',
        text: "Boa tarde, tudo bem? Estou na dúvida se para presente de fim de ano da minha equipe é melhor dar aquela necessaire de couro personalizada que vi no catálogo ou o lenço estampado de seda.",
        timestamp: "16:02",
        status: "read"
      },
      {
        id: 'msg4_2',
        sender: 'business',
        text: "Olá, Roberto! Tudo ótimo por aqui e com você? Excelente iniciativa de presentear seu time! As duas opções são maravilhosas. A necessaire de couro tem um apelo super prático para o dia a dia e viagens. Já o lenço de seda pura traz uma sofisticação incrível e é super versátil. Qual é o perfil geral das suas colaboradoras?",
        timestamp: "16:07",
        status: "read"
      },
      {
        id: 'msg4_3',
        sender: 'customer',
        text: "A maioria delas trabalha no operacional e viaja bastante a trabalho. Mas tenho receio que o couro seja muito sério. Vocês conseguem gravar as iniciais delas se eu fechar até amanhã?",
        timestamp: "16:10",
        status: "read"
      }
    ]
  }
];

// --- Persistence Functions ---
function saveDatabase() {
  try {
    const data = {
      companySettings,
      quickReplies,
      conversations
    };
    fs.writeFileSync(DATABASE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("❌ Failed to save database:", err);
  }
}

function loadDatabase() {
  try {
    if (fs.existsSync(DATABASE_PATH)) {
      const raw = fs.readFileSync(DATABASE_PATH, "utf-8");
      const data = JSON.parse(raw);
      if (data.companySettings) companySettings = data.companySettings;
      if (data.quickReplies) {
        // Ensure no duplicates or corrupted list structure
        quickReplies = data.quickReplies;
      }
      if (data.conversations) {
        conversations = data.conversations;
      }
      console.log(`💾 Database loaded successfully from disk. Conversations: ${conversations.length}`);
    } else {
      console.log("📝 Initializing persistent database with local mock data...");
      saveDatabase();
    }
  } catch (err) {
    console.error("❌ Failed to load database:", err);
  }
}

loadDatabase();

// Lazy-initialization of Gemini
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("⚠️ GEMINI_API_KEY is not configured inside env variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST API endpoint to let external clients join the chat
app.post("/api/customer-join", (req, res) => {
  const { name, phone } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Nome completo é obrigatório." });
    return;
  }
  if (!phone || typeof phone !== "string" || !phone.trim()) {
    res.status(400).json({ error: "Número do Celular/WhatsApp é obrigatório." });
    return;
  }

  const cleanPhone = phone.replace(/\D/g, '').trim();
  const cleanName = name.toLowerCase().trim();

  // Find if customer with same name or phone already exists to allow reconnecting easily
  let match = conversations.find(c => {
    const dbPhone = c.customer.phone.replace(/\D/g, '').trim();
    const dbName = c.customer.name.toLowerCase().trim();
    return dbPhone === cleanPhone || dbName === cleanName;
  });
  
  if (match) {
    // If phone matches but name was updated, keep the user name updated
    if (name.trim() !== match.customer.name) {
      match.customer.name = name.trim();
    }
    match.customer.phone = phone.trim();
    saveDatabase();

    // Broadcast join event to automatically focus the chat on CRM Operator panels
    broadcast({ type: "customer_joined", conversationId: match.id });
    res.json({
      conversationId: match.id,
      customerId: match.customer.id,
      customer: match.customer,
      messages: match.messages
    });
    return;
  }

  const customerId = `cust_real_${Date.now()}`;
  const conversationId = `c_real_${Date.now()}`;

  const welcomeMsgText = `Olá, ${name}! Seja bem-vindo ao atendimento em tempo real da ${companySettings.name}. Nós recebemos o seu contato. Como posso te ajudar hoje?`;

  const newConv: Conversation = {
    id: conversationId,
    customer: {
      id: customerId,
      name: name.trim(),
      phone: phone.trim(),
      avatar: "👤",
      mood: "curioso",
      businessContext: "Cliente humano em tempo real.",
      tags: ["👥 Cliente Real", "Instantâneo"]
    },
    unreadCount: 0,
    lastUpdated: new Date().toISOString(),
    notes: "Acesso por dispositivo externo.",
    messages: [
      {
        id: `msg_init_${Date.now()}`,
        sender: 'customer',
        text: `Olá! Acabei de entrar no chat como ${name}.`,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      },
      {
        id: `msg_init_welcome_${Date.now()}`,
        sender: 'business',
        text: welcomeMsgText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        status: 'delivered'
      }
    ]
  };

  conversations.unshift(newConv);
  saveDatabase();

  // Broadcast the update and the join signal to all connected dashboard clients
  broadcast({ type: "conversations", conversations });
  broadcast({ type: "customer_joined", conversationId });

  res.json({
    conversationId,
    customerId,
    customer: newConv.customer,
    messages: newConv.messages
  });
});

// Simulated Client Chat Endpoint
app.post("/api/chat-customer", async (req, res) => {
  try {
    const { history, customerName, mood, context, businessType } = req.body;
    
    if (!history || !Array.isArray(history)) {
      res.status(400).json({ error: "Histórico de conversa inválido." });
      return;
    }

    const client = getGeminiClient();
    
    const systemInstruction = `
Você é um cliente real do WhatsApp falando com uma empresa do ramo: "${businessType || 'Comércio Geral'}".
Seu nome é: "${customerName || 'Cliente'}".
Seu humor atual é: "${mood || 'neutro'}".
Sua situação/contextualização de compra: "${context || 'Interessado nos produtos'}".

Instruções críticas para a sua atuação:
1. Responda em Português do Brasil com linguagem natural de conversas de WhatsApp de pessoas reais (mensagens mais curtas, pontuação casual, uso eventual de emojis normais, abreviações casuais como vc, tbm, pfv, etc., mas evite parecer um robô corporativo).
2. Mantenha totalmente a consistência com seu humor (${mood}) - se estiver irritado, seja mais direto, exija soluções rápidas ou mostre insatisfação; se estiver satisfeito ou apenas curioso, seja amigável, educado ou proativo.
3. Não fale como um assistente de IA. Você é o CLIENTE real. Nunca ofereça "ajuda" ou "suporte" para quem fala com você, afinal quem é o cliente é você!
4. Responda APENAS com a mensagem de retorno para enviar na conversa. Sem introduções ou anotações extras. Escreva em no máximo 1 ou 2 parágrafos curtos.
5. Se a última mensagem da empresa foi muito agressiva ou não respondeu sua dúvida anterior, reaja de acordo com seu humor.
`;

    const promptParts = [
      { text: `O histórico da conversa até o momento:\n` },
      ...history.map((msg: any) => ({
        text: `${msg.sender === 'business' ? 'Empresa' : 'Você (Cliente)'}: ${msg.text}`
      })),
      { text: `\nEscreva sua próxima resposta curta como o Cliente:` }
    ];

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptParts,
      config: {
        systemInstruction,
        temperature: 0.85,
      }
    });

    const reply = response.text?.trim() || "Entendi. Aguardo retorno.";
    res.json({ reply });
  } catch (error: any) {
    console.error("Error in /api/chat-customer:", error);
    res.status(500).json({ error: "Erro ao simular resposta do cliente com IA: " + error.message });
  }
});

// Co-pilot response drafter
app.post("/api/copilot", async (req, res) => {
  try {
    const { history, customerName, businessType, tone, objective } = req.body;
    
    if (!history || !Array.isArray(history)) {
      res.status(400).json({ error: "Histórico de conversa inválido." });
      return;
    }

    const client = getGeminiClient();

    const systemInstruction = `
Você é um copiloto especialista em atendimento ao cliente por WhatsApp para uma empresa de: "${businessType || 'Comércio Geral'}".
Sua tarefa é redigir um rascunho de resposta ideal e muito bem formatado para enviar ao cliente "${customerName || 'Cliente'}".
O tom desejado da resposta é: "${tone || 'profissional'}" (ex: profissional e educado, empático e amigável, direto e objetivo, descontraído).
O objetivo principal desta mensagem é: "${objective || 'Ajudar o cliente da melhor forma'}".

Instruções críticas:
1. Escreva em Português do Brasil de forma ideal para o WhatsApp (uso de espaçamentos limpos, listas com marcadores se necessário, tom direto ao ponto, emojis moderados se adequado ao tom).
2. Foque em resolver a questão ou dar andamento produtivo com base no histórico da conversa fornecida.
3. Não invente dados falsos como códigos de rastreio ou links específicos que você não possui, use placeholders estruturados (ex: [Código de Rastreio], [Link do Catálogo], [Valor]).
4. Retorne APENAS o rascunho sugerido da mensagem, pronto para que o atendente copie e cole. Não inclua observações, preâmbulos, cumprimentos a mim ou rodapés explicativos.
`;

    const promptParts = [
      { text: `Histórico da conversa atual:\n` },
      ...history.map((msg: any) => ({
        text: `${msg.sender === 'business' ? 'Nossa Empresa' : `Cliente (${customerName})`}: ${msg.text}`
      })),
      { text: `${objective ? `\nObjetivo adicional: ${objective}` : ''}\nEscreva o rascunho sugerido de resposta da nossa empresa:` }
    ];

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptParts,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const suggestion = response.text?.trim() || "";
    res.json({ suggestion });
  } catch (error: any) {
    console.error("Error in /api/copilot:", error);
    res.status(500).json({ error: "Erro ao gerar sugestão de resposta: " + error.message });
  }
});

// --- WebSocket Support Setup ---
const clients = new Set<WebSocket>();

function broadcast(data: any) {
  const payload = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

async function triggerServerSimulatedCustomerReply(conversationId: string) {
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return;

  // Broadcast typing state
  broadcast({ type: "typing_state", conversationId, sender: "customer", isTyping: true });

  try {
    const client = getGeminiClient();
    const systemInstruction = `
Você é um cliente real do WhatsApp falando com uma empresa do ramo: "${companySettings.businessType || 'Comércio Geral'}".
Seu nome é: "${conv.customer.name || 'Cliente'}".
Seu humor atual é: "${conv.customer.mood || 'neutro'}".
Sua situação/contextualização de compra: "${conv.customer.businessContext || 'Interessado nos produtos'}".

Instruções críticas para a sua atuação:
1. Responda em Português do Brasil com linguagem natural de conversas de WhatsApp de pessoas reais (mensagens mais curtas, pontuação casual, uso eventual de emojis normais, abreviações casuais como vc, tbm, pfv, etc., mas evite parecer um robô corporativo).
2. Mantenha totalmente a consistência com seu humor (${conv.customer.mood}) - se estiver irritado, seja mais direto, exija soluções rápidas ou mostre insatisfação; se estiver satisfeito ou apenas curioso, seja amigável, educado ou proativo.
3. Não fale como um assistente de IA. Você é o CLIENTE real. Nunca ofereça "ajuda" ou "suporte" para quem fala com você, afinal quem é o cliente é você!
4. Responda APENAS com a mensagem de retorno para enviar na conversa. Sem introduções ou anotações extras. Escreva em no máximo 1 ou 2 parágrafos curtos.
5. Se a última mensagem da empresa foi muito agressiva ou não respondeu sua dúvida anterior, reaja de acordo com seu humor.
`;

    const promptParts = [
      { text: `O histórico da conversa até o momento:\n` },
      ...conv.messages.slice(-8).map((msg: any) => ({
        text: `${msg.sender === 'business' ? 'Empresa' : 'Você (Cliente)'}: ${msg.text}`
      })),
      { text: `\nEscreva sua próxima resposta curta como o Cliente:` }
    ];

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptParts,
      config: {
        systemInstruction,
        temperature: 0.85,
      }
    });

    const reply = response.text?.trim() || "Entendi. Aguardo resposta.";
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMsg: Message = {
      id: `msg_auto_${Date.now()}`,
      sender: 'customer',
      text: reply,
      timestamp: timeNow,
      status: 'delivered'
    };

    conv.messages.push(newMsg);
    conv.lastUpdated = new Date().toISOString();
    conv.unreadCount += 1;

    // Broadcast update
    broadcast({ type: "conversations", conversations });

  } catch (error) {
    console.error("Auto AI Simulation backend error:", error);
    // fallback
    const fallbacks: Record<string, string[]> = {
      irritado: ["Estou no aguardo.", "Gostaria de resolver isso brevemente."],
      curioso: ["Interessante, gostei. Quais as opções?", "Ótimo. Mas tem desconto?"],
      satisfeito: ["Ah sim! Muito obrigado! Adorei.", "Obrigado de verdade pelo retorno."],
      indeciso: ["Ainda estou pensando se vale a pena.", "Certo, vou pesquisar mais um pouco."],
      'com pressa': ["Consigo fechar agora se for rápido.", "Ok, me avisa se puder postar logo."]
    };
    const moodPool = fallbacks[conv.customer.mood] || ["Entendi. Aguardo confirmação."];
    const randomFallback = moodPool[Math.floor(Math.random() * moodPool.length)];

    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const newMsg: Message = {
      id: `msg_auto_fallback_${Date.now()}`,
      sender: 'customer',
      text: randomFallback + " (Simulação local)",
      timestamp: timeNow,
      status: 'delivered'
    };

    conv.messages.push(newMsg);
    conv.lastUpdated = new Date().toISOString();
    conv.unreadCount += 1;

    broadcast({ type: "conversations", conversations });
  } finally {
    saveDatabase();
    broadcast({ type: "typing_state", conversationId, sender: "customer", isTyping: false });
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);

  // Send initial data to newly connected client
  ws.send(JSON.stringify({
    type: "init_state",
    conversations,
    companySettings,
    quickReplies
  }));

  ws.on("message", (messageData) => {
    try {
      const data = JSON.parse(messageData.toString());

      if (data.type === "sendMessage") {
        const { conversationId, sender, text, autoSimulate, audioUrl, audioDuration } = data;
        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const newMsg: Message = {
            id: `msg_real_${Date.now()}`,
            sender,
            text,
            timestamp: timeNow,
            status: 'delivered',
            audioUrl,
            audioDuration
          };

          conv.messages.push(newMsg);
          conv.lastUpdated = new Date().toISOString();

          // Reset or increment ununread count
          if (sender === "customer") {
            conv.unreadCount += 1;
          } else {
            conv.unreadCount = 0; // reset
          }

          saveDatabase();

          // Broadcast conversations update to all peers
          broadcast({ type: "conversations", conversations });

          // Trigger AI simulation only if target client is simulated (not marked real human) and autoSimulate flag is on
          const isRealHuman = conv.customer.tags.includes("👥 Cliente Real");
          if (sender === "business" && autoSimulate && !isRealHuman) {
            setTimeout(() => {
              triggerServerSimulatedCustomerReply(conversationId);
            }, 1500);
          }
        }
      }

      if (data.type === "typing") {
        const { conversationId, sender, isTyping } = data;
        broadcast({ type: "typing_state", conversationId, sender, isTyping });
      }

      if (data.type === "updateCompanySettings") {
        companySettings = data.companySettings;
        saveDatabase();
        broadcast({ type: "company_settings", companySettings });
      }

      if (data.type === "createQuickReply") {
        quickReplies.push(data.quickReply);
        saveDatabase();
        broadcast({ type: "quick_replies", quickReplies });
      }

      if (data.type === "deleteQuickReply") {
        quickReplies = quickReplies.filter(q => q.id !== data.id);
        saveDatabase();
        broadcast({ type: "quick_replies", quickReplies });
      }

      if (data.type === "deleteConversation") {
        conversations = conversations.filter(c => c.id !== data.id);
        saveDatabase();
        broadcast({ type: "conversations", conversations });
      }

      if (data.type === "createConversation") {
        conversations.unshift(data.conversation);
        saveDatabase();
        broadcast({ type: "conversations", conversations });
      }

      if (data.type === "markAsRead") {
        const { conversationId } = data;
        const conv = conversations.find(c => c.id === conversationId);
        if (conv && conv.unreadCount > 0) {
          conv.unreadCount = 0;
          saveDatabase();
          broadcast({ type: "conversations", conversations });
        }
      }

      // --- Call Signaling Integrations ---
      if (data.type === "call_dial") {
        const { conversationId, caller, callerName } = data;
        broadcast({ type: "call_dial", conversationId, caller, callerName });
      }

      if (data.type === "call_accept") {
        const { conversationId } = data;
        broadcast({ type: "call_accept", conversationId });
      }

      if (data.type === "call_decline") {
        const { conversationId, reason, caller } = data;
        broadcast({ type: "call_decline", conversationId, reason });

        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          const sender = caller === 'business' ? 'business' : 'customer';
          conv.messages.push({
            id: `msg_call_rec_${Date.now()}`,
            sender: sender,
            text: `📞 Chamada perdida ou recusada`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            callLog: { type: 'rejected', duration: 0 }
          });
          conv.lastUpdated = new Date().toISOString();
          saveDatabase();
          broadcast({ type: "conversations", conversations });
        }
      }

      if (data.type === "call_hangup") {
        const { conversationId, duration, caller } = data;
        broadcast({ type: "call_hangup", conversationId, duration, caller });

        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          const minutes = Math.floor(duration / 60);
          const seconds = duration % 60;
          const formattedDuration = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
          
          const sender = caller === 'business' ? 'business' : 'customer';
          conv.messages.push({
            id: `msg_call_comp_${Date.now()}`,
            sender: sender,
            text: `📞 Chamada de voz de ${formattedDuration} finalizada`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            callLog: { type: 'completed', duration }
          });
          conv.lastUpdated = new Date().toISOString();
          saveDatabase();
          broadcast({ type: "conversations", conversations });
        }
      }

      if (data.type === "call_missed") {
        const { conversationId, caller } = data;
        broadcast({ type: "call_missed", conversationId, caller });

        const conv = conversations.find(c => c.id === conversationId);
        if (conv) {
          const sender = caller === 'business' ? 'business' : 'customer';
          conv.messages.push({
            id: `msg_call_miss_${Date.now()}`,
            sender: sender,
            text: `📞 Chamada de voz não atendida`,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            status: 'delivered',
            callLog: { type: 'missed', duration: 0 }
          });
          conv.lastUpdated = new Date().toISOString();
          saveDatabase();
          broadcast({ type: "conversations", conversations });
        }
      }

    } catch (error) {
      console.error("WebSocket message processing failed:", error);
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
  });
});

// Vite Middleware & static assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server and WebSocket running on http://localhost:${PORT}`);
  });
}

startServer();
