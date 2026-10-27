import { useEffect, useRef, useState } from "react";
import { BookOpen } from "lucide-react";

// TÍTULOS ALTERNATIVOS DE LIVROS TRADUZIDOS

const titulosAlternativos = {
  "Entendendo Algoritmos": ["Grokking Algorithms"],
  "Código Limpo": ["Clean Code"],
  "Arquitetura Limpa": ["Clean Architecture"],
  "Código Completo": ["Code Complete"],
  "Refatoração": ["Refactoring"],
  "Padrões de Projeto": ["Design Patterns"],
  "Use a Cabeça! Java": ["Head First Java"],
  "Sistemas Operacionais Modernos": [
    "Modern Operating Systems"
  ],
  "Organização Estruturada de Computadores": [
    "Structured Computer Organization"
  ],
  "Pensar com Tipos": ["Thinking with Type"],
  "Design para Quem Não é Designer": [
    "The Non-Designer's Design Book"
  ],
  "Design de Identidade da Marca": [
    "Designing Brand Identity"
  ],
  "Roube como um Artista": ["Steal Like an Artist"],
  "Mostre Seu Trabalho!": ["Show Your Work!"],
  "Siga em Frente": ["Keep Going"],
  "A Linguagem das Coisas": ["The Language of Things"],
  "O Design do Dia a Dia": [
    "The Design of Everyday Things"
  ],
  "Não Me Faça Pensar": ["Don't Make Me Think"],
  "Regras do Jogo": ["Rules of Play"],
  "A Arte de Game Design": ["The Art of Game Design"],
  "A Startup Enxuta": ["The Lean Startup"],
  "O Monge e o Executivo": ["The Servant"],
  "Pai Rico, Pai Pobre": ["Rich Dad Poor Dad"],
  "A Estratégia do Oceano Azul": [
    "Blue Ocean Strategy"
  ],
  "Empresas Feitas para Vencer": ["Good to Great"],
  "Feitas para Durar": ["Built to Last"],
  "Os 7 Hábitos das Pessoas Altamente Eficazes": [
    "The 7 Habits of Highly Effective People"
  ],
  "Rápido e Devagar": ["Thinking, Fast and Slow"],
  "Hábitos Atômicos": ["Atomic Habits"],
  "O Poder do Hábito": ["The Power of Habit"],
  "Comece pelo Porquê": ["Start with Why"],
  "A Psicologia Financeira": [
    "The Psychology of Money"
  ],
  "O Investidor Inteligente": [
    "The Intelligent Investor"
  ],
  "A Meta": ["The Goal"],
  "O Modelo Toyota": ["The Toyota Way"],
  "A Única Coisa": ["The ONE Thing"]
};

// NORMALIZAÇÃO

function normalizar(texto = "") {
  return String(texto)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// IDENTIFICA O AUTOR PRINCIPAL

function primeiroAutor(livro) {
  return livro.autor
    .split(/\s+e\s+|,|\s+and\s+/i)[0]
    .trim();
}

// CONFERE SE O AUTOR CORRESPONDE

function autorConfere(autores, livro) {
  if (!Array.isArray(autores) || !autores.length) {
    return false;
  }

  const partes = normalizar(
    primeiroAutor(livro)
  ).split(" ");

  const sobrenome = partes.at(-1);

  if (!sobrenome || sobrenome.length <= 2) {
    return false;
  }

  return autores.some((autor) =>
    normalizar(autor)
      .split(" ")
      .includes(sobrenome)
  );
}

// CONFERE O TÍTULO DO LIVRO

function tituloConfere(tituloEncontrado, livro) {
  const encontrado = normalizar(tituloEncontrado);

  const possibilidades = [
    livro.titulo,
    ...(titulosAlternativos[livro.titulo] || [])
  ];

  return possibilidades.some((opcao) => {
    const esperado = normalizar(opcao);

    return (
      encontrado === esperado ||
      (
        esperado.length >= 12 &&
        encontrado.startsWith(`${esperado} `)
      )
    );
  });
}

// BUSCA DADOS EM SERVIÇOS PÚBLICOS

async function obterJson(url) {
  try {
    const resposta = await fetch(url, {
      signal: AbortSignal.timeout(8500)
    });

    if (!resposta.ok) {
      return null;
    }

    return await resposta.json();
  } catch {
    return null;
  }
}

// FONTE 1 — OPEN LIBRARY

async function buscarOpenLibrary(livro, titulo) {
  const parametros = new URLSearchParams({
    title: titulo,
    author: primeiroAutor(livro),
    fields: "title,author_name,cover_i",
    limit: "10"
  });

  const url =
    `https://openlibrary.org/search.json?${parametros}`;

  const dados = await obterJson(url);

  const encontrado = dados?.docs?.find((item) =>
    item.cover_i &&
    tituloConfere(item.title, livro) &&
    autorConfere(item.author_name, livro)
  );

  if (!encontrado) {
    return null;
  }

  return (
    "https://covers.openlibrary.org/b/id/" +
    `${encontrado.cover_i}-M.jpg`
  );
}

// FONTE 2 — GOOGLE BOOKS

async function buscarGoogleBooks(livro) {
  const titulo =
    titulosAlternativos[livro.titulo]?.[0] ||
    livro.titulo;

  const parametros = new URLSearchParams({
    q: `intitle:${titulo} inauthor:${primeiroAutor(livro)}`,
    maxResults: "15",
    printType: "books"
  });

  const url =
    `https://www.googleapis.com/books/v1/volumes?${parametros}`;

  const dados = await obterJson(url);

  const encontrado = dados?.items?.find((item) => {
    const informacoes = item.volumeInfo;

    return (
      informacoes?.imageLinks?.thumbnail &&
      tituloConfere(informacoes.title, livro) &&
      autorConfere(informacoes.authors, livro)
    );
  });

  const imagem =
    encontrado?.volumeInfo?.imageLinks?.thumbnail;

  return imagem
    ? imagem.replace(/^http:/, "https:")
    : null;
}

// LIMITA REQUISIÇÕES SIMULTÂNEAS

const promessas = new Map();
const fila = [];

let chamadasAtivas = 0;

function processarFila() {
  while (chamadasAtivas < 3 && fila.length) {
    const tarefa = fila.shift();

    chamadasAtivas++;

    tarefa.executar()
      .then(tarefa.resolver)
      .catch(() => tarefa.resolver(null))
      .finally(() => {
        chamadasAtivas--;
        processarFila();
      });
  }
}

function agendar(executar) {
  return new Promise((resolver) => {
    fila.push({
      executar,
      resolver
    });

    processarFila();
  });
}

// LOCALIZA E SALVA A CAPA

function capaDoLivro(livro) {
  if (promessas.has(livro.id)) {
    return promessas.get(livro.id);
  }

  const promessa = agendar(async () => {
    const chave = `bibliotech-capa-v1-${livro.id}`;

    const salva = localStorage.getItem(chave);

    if (salva) {
      return salva;
    }

    // Busca pelo título cadastrado

    let url = await buscarOpenLibrary(
      livro,
      livro.titulo
    );

    // Busca pelo título original, se conhecido

    if (
      !url &&
      titulosAlternativos[livro.titulo]?.length
    ) {
      url = await buscarOpenLibrary(
        livro,
        titulosAlternativos[livro.titulo][0]
      );
    }

    // Tenta Google Books

    if (!url) {
      url = await buscarGoogleBooks(livro);
    }

    // Guarda capas encontradas no navegador

    if (url) {
      try {
        localStorage.setItem(chave, url);
      } catch {
        // Continua funcionando sem cache.
      }
    }

    return url;
  });

  promessas.set(livro.id, promessa);

  return promessa;
}

// COMPONENTE DA CAPA

export default function CapaLivro({ livro }) {
  const referencia = useRef(null);

  const [visivel, setVisivel] = useState(false);
  const [capa, setCapa] = useState(null);
  const [falhou, setFalhou] = useState(false);

  // Carregamento conforme o usuário percorre a página

  useEffect(() => {
    const elemento = referencia.current;

    if (
      !elemento ||
      !("IntersectionObserver" in window)
    ) {
      setVisivel(true);
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        if (
          entradas.some(
            (entrada) => entrada.isIntersecting
          )
        ) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      {
        rootMargin: "250px"
      }
    );

    observador.observe(elemento);

    return () => observador.disconnect();
  }, []);

  // CARREGA A IMAGEM

  useEffect(() => {
    if (!visivel) {
      return;
    }

    let cancelado = false;

    setFalhou(false);

    capaDoLivro(livro).then((url) => {
      if (!cancelado) {
        setCapa(url);
      }
    });

    return () => {
      cancelado = true;
    };
  }, [livro.id, visivel]);

  // EXIBE CAPA OU ÍCONE LUCIDE

  return (
    <div
      className="book-cover"
      ref={referencia}
    >
      {capa && !falhou ? (
        <img
          src={capa}
          alt={`Capa de ${livro.titulo}`}
          loading="lazy"
          onError={() => setFalhou(true)}
        />
      ) : (
        <BookOpen
          size={52}
          strokeWidth={1.5}
          aria-label="Capa não disponível"
        />
      )}
    </div>
  );
}