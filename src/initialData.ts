import { Conversation, QuickReply, CompanySetting } from './types';

export const INITIAL_COMPANY_SETTING: CompanySetting = {
  name: "Moda & Estilo Store",
  businessType: "Comércio varejista de roupas e calçados premium",
  welcomeMessage: "Olá! Seja muito bem-vindo ao atendimento oficial da Moda & Estilo Store. Como podemos ajudar você hoje? 😊"
};

export const INITIAL_QUICK_REPLIES: QuickReply[] = [
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

export const INITIAL_CONVERSATIONS: Conversation[] = [
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
    lastUpdated: "2026-05-26T19:10:00Z",
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
    lastUpdated: "2026-05-26T18:45:00Z",
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
    lastUpdated: "2026-05-26T17:30:00Z",
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
    lastUpdated: "2026-05-26T16:10:00Z",
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
