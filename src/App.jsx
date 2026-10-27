import { useEffect, useMemo, useState } from "react";

import {
  BookOpen,
  Search,
  Home,
  LibraryBig,
  Heart,
  Code2,
  Palette,
  Gamepad2,
  BriefcaseBusiness,
  ArrowLeft,
  X,
  SlidersHorizontal,
  Clock3,
  Info,
  ChevronRight
} from "lucide-react";

import { livros } from "./livros";
import CapaLivro from "./CapaLivro.jsx";
import "./App.css";

// CURSOS

const cursos = [
  {
    nome: "ADM",
    rotulo: "Administração",
    descricao: "Gestão e negócios",
    Icone: BriefcaseBusiness
  },
  {
    nome: "Design Gráfico",
    rotulo: "Design Gráfico",
    descricao: "Arte e criatividade",
    Icone: Palette
  },
  {
    nome: "TI",
    rotulo: "Tecnologia da Informação",
    descricao: "Programação e tecnologia",
    Icone: Code2
  },
  {
    nome: "Games",
    rotulo: "Desenvolvimento de Games",
    descricao: "Criação de jogos",
    Icone: Gamepad2
  }
];

// NORMALIZAÇÃO DA PESQUISA

function normalizar(texto = "") {
  return String(texto)
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const ignorar = new Set([
  "a", "o", "as", "os",
  "de", "da", "do", "das", "dos",
  "e", "em", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas",
  "que", "qual", "quais",
  "quero", "preciso", "tenho",
  "como", "posso", "sobre", "para",
  "por", "me", "meu", "minha",
  "aprender", "estudar", "livro",
  "livros", "ajuda", "dificuldade",
  "gostaria", "saber", "encontrar",
  "estou", "voce", "eu", "com"
]);

function separarPalavras(texto) {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter(
      (palavra) =>
        palavra.length > 1 &&
        !ignorar.has(palavra)
    );
}

// PESQUISA POR TÍTULO, AUTOR, ASSUNTO E DESCRIÇÃO

function buscarLivros(lista, consulta) {
  const pesquisa = normalizar(consulta).trim();

  if (!pesquisa) {
    return lista;
  }

  const palavras = separarPalavras(pesquisa);

  if (!palavras.length) {
    return [];
  }

  return lista
    .map((livro) => {
      const titulo = normalizar(livro.titulo);
      const autor = normalizar(livro.autor);
      const assunto = normalizar(livro.assunto);
      const descricao = normalizar(livro.descricao);

      const campos = [
        titulo,
        autor,
        assunto,
        descricao
      ];

      const correspondencias = palavras.filter(
        (palavra) =>
          campos.some((campo) =>
            campo.includes(palavra)
          )
      );

      if (!correspondencias.length) {
        return null;
      }

      let pontos = 0;

      if (titulo.includes(pesquisa)) {
        pontos += 100;
      }

      if (descricao.includes(pesquisa)) {
        pontos += 60;
      }

      for (const palavra of correspondencias) {
        if (titulo.includes(palavra)) pontos += 12;
        if (descricao.includes(palavra)) pontos += 8;
        if (autor.includes(palavra)) pontos += 5;
        if (assunto.includes(palavra)) pontos += 6;
      }

      return {
        ...livro,
        pontos
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.pontos - a.pontos ||
        a.titulo.localeCompare(b.titulo, "pt-BR")
    );
}

// FAVORITOS SALVOS

function lerFavoritos() {
  try {
    const salvos = JSON.parse(
      localStorage.getItem("bibliotech-favoritos") || "[]"
    );

    return Array.isArray(salvos)
      ? salvos.filter(Number.isInteger)
      : [];
  } catch {
    return [];
  }
}

// COMPONENTE PRINCIPAL

function App() {
  const [pagina, setPagina] = useState("inicio");
  const [texto, setTexto] = useState("");
  const [consulta, setConsulta] = useState("");
  const [curso, setCurso] = useState("Todos");

  const [favoritos, setFavoritos] = useState(lerFavoritos);
  const [historico, setHistorico] = useState([]);
  const [detalhe, setDetalhe] = useState(null);

  // SALVAR FAVORITOS

  useEffect(() => {
    localStorage.setItem(
      "bibliotech-favoritos",
      JSON.stringify(favoritos)
    );
  }, [favoritos]);

  // FILTRAR RESULTADOS

  const resultados = useMemo(() => {
    let lista = livros;

    if (pagina === "favoritos") {
      lista = lista.filter((livro) =>
        favoritos.includes(livro.id)
      );
    }

    if (curso !== "Todos") {
      lista = lista.filter(
        (livro) => livro.curso === curso
      );
    }

    return buscarLivros(lista, consulta);
  }, [pagina, favoritos, curso, consulta]);

  // ROLAR ATÉ OS RESULTADOS

  function irParaResultados() {
    setTimeout(() => {
      document
        .getElementById("resultados")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
    }, 100);
  }

  // PESQUISAR

  function pesquisar(event) {
    event.preventDefault();

    setConsulta(texto.trim());
    setPagina("catalogo");
    setDetalhe(null);

    if (texto.trim()) {
      setHistorico((anterior) =>
        [
          texto.trim(),
          ...anterior.filter(
            (item) => item !== texto.trim()
          )
        ].slice(0, 5)
      );
    }

    irParaResultados();
  }

  // NAVEGAÇÃO

  function navegar(destino) {
    setPagina(destino);
    setDetalhe(null);
    setCurso("Todos");
    setConsulta("");
    setTexto("");

    if (destino === "inicio") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });
    } else {
      irParaResultados();
    }
  }

  // FILTRAR CURSO

  function selecionarCurso(nome) {
    setPagina("catalogo");
    setCurso(nome);
    setConsulta("");
    setTexto("");
    setDetalhe(null);

    irParaResultados();
  }

  // FAVORITAR LIVRO

  function favoritar(id) {
    setFavoritos((anterior) =>
      anterior.includes(id)
        ? anterior.filter((item) => item !== id)
        : [...anterior, id]
    );
  }

  const mostrarResultados = pagina !== "inicio";

  return (
    <div className="app">

      {/* MENU LATERAL */}

      <aside className="sidebar">
        <div className="brand">
          <BookOpen size={29} />

          <div>
            <strong>BiblioTech</strong>
            <small>Biblioteca Inteligente</small>
          </div>
        </div>

        <nav aria-label="Menu principal">
          <button
            className={pagina === "inicio" ? "ativo" : ""}
            onClick={() => navegar("inicio")}
          >
            <Home size={19} />
            Início
          </button>

          <button
            className={pagina === "catalogo" ? "ativo" : ""}
            onClick={() => navegar("catalogo")}
          >
            <LibraryBig size={19} />
            Catálogo
          </button>

          <button
            className={pagina === "favoritos" ? "ativo" : ""}
            onClick={() => navegar("favoritos")}
          >
            <Heart size={19} />
            Favoritos

            <span className="contagem">
              {favoritos.length}
            </span>
          </button>
        </nav>

        <p className="sidebar-bottom">
          Conhecimento para o seu futuro.
        </p>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}

      <main className="main-content">

        <header className="topbar">
          <span>Biblioteca escolar</span>

          <span className="status">
            Sistema demonstrativo
          </span>
        </header>

        {/* ÁREA DE PESQUISA */}

        <section className="hero">
          <div className="hero-content">
            <p className="eyebrow">
              BIBLIOTECA INTELIGENTE
            </p>

            <h1>O que você quer aprender?</h1>

            <p>
              Pesquise pelo título, autor, descrição
              ou assunto. Encontre todos os livros
              relacionados aos seus estudos.
            </p>

            <form
              className="search-box"
              onSubmit={pesquisar}
            >
              <Search
                size={21}
                className="search-icon"
              />

              <input
                type="text"
                value={texto}
                onChange={(event) =>
                  setTexto(event.target.value)
                }
                placeholder="Ex.: redes, marketing, programação..."
                aria-label="Pesquisar livros"
              />

              <button type="submit">
                Pesquisar
                <ChevronRight size={17} />
              </button>
            </form>

            <p className="search-hint">
              Pesquise sem se preocupar com
              acentos ou letras maiúsculas.
            </p>
          </div>
        </section>

        {/* CURSOS */}

        <section className="courses-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                ÁREAS DE CONHECIMENTO
              </p>

              <h2>Explore por curso</h2>
            </div>

            <span className="total">
              {livros.length} livros no catálogo
            </span>
          </div>

          <div className="courses-grid">
            {cursos.map(
              ({
                nome,
                rotulo,
                descricao,
                Icone
              }) => (
                <button
                  className="course-card"
                  key={nome}
                  onClick={() =>
                    selecionarCurso(nome)
                  }
                >
                  <span className="course-icon">
                    <Icone size={27} />
                  </span>

                  <strong>{rotulo}</strong>

                  <span>{descricao}</span>

                  <small>
                    {
                      livros.filter(
                        (livro) =>
                          livro.curso === nome
                      ).length
                    } livros

                    <ChevronRight size={14} />
                  </small>
                </button>
              )
            )}
          </div>
        </section>

        {/* PESQUISAS RECENTES */}

        {historico.length > 0 && (
          <section className="history-section">
            <h3>
              <Clock3 size={18} />
              Pesquisas recentes
            </h3>

            <div className="history-list">
              {historico.map((item) => (
                <button
                  key={item}
                  onClick={() => {
                    setTexto(item);
                    setConsulta(item);
                    setCurso("Todos");
                    setPagina("catalogo");
                    setDetalhe(null);

                    irParaResultados();
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* CATÁLOGO E RESULTADOS */}

        {mostrarResultados && (
          <section
            className="results-section"
            id="resultados"
          >
            <div className="section-heading">
              <div>
                <p className="eyebrow">
                  EXPLORE O ACERVO
                </p>

                <h2>
                  {pagina === "favoritos"
                    ? "Meus favoritos"
                    : consulta
                    ? "Resultados da pesquisa"
                    : curso !== "Todos"
                    ? `Livros de ${curso}`
                    : "Catálogo completo"}
                </h2>
              </div>

              <span className="total">
                {resultados.length}{" "}
                {resultados.length === 1
                  ? "livro encontrado"
                  : "livros encontrados"}
              </span>
            </div>

            {/* FILTROS */}

            <div className="filters">
              <SlidersHorizontal size={18} />

              <label htmlFor="filtro-curso">
                Curso
              </label>

              <select
                id="filtro-curso"
                value={curso}
                onChange={(event) => {
                  setCurso(event.target.value);
                  setDetalhe(null);
                }}
              >
                <option value="Todos">
                  Todos os cursos
                </option>

                {cursos.map((item) => (
                  <option
                    key={item.nome}
                    value={item.nome}
                  >
                    {item.rotulo}
                  </option>
                ))}
              </select>

              {consulta && (
                <button
                  className="limpar"
                  onClick={() => {
                    setConsulta("");
                    setTexto("");
                    setDetalhe(null);
                  }}
                >
                  <X size={16} />
                  Limpar pesquisa
                </button>
              )}
            </div>

            {/* DETALHES DO LIVRO */}

            {detalhe ? (
              <article className="book-details">

                <button
                  className="voltar"
                  onClick={() =>
                    setDetalhe(null)
                  }
                >
                  <ArrowLeft size={17} />
                  Voltar aos resultados
                </button>

                {/* CAPA REAL DO LIVRO */}

                <div className="capa-detalhe">
                  <CapaLivro livro={detalhe} />
                </div>

                <span className="book-category">
                  {detalhe.curso}
                </span>

                <h3>{detalhe.titulo}</h3>

                <p>
                  <strong>Autor:</strong>{" "}
                  {detalhe.autor}
                </p>

                <p>
                  <strong>Assuntos:</strong>{" "}
                  {detalhe.assunto}
                </p>

                <p>{detalhe.descricao}</p>

                <p className="nota">
                  <Info size={17} />

                  A edição e a disponibilidade devem
                  ser confirmadas com a biblioteca.
                </p>
              </article>
            ) : resultados.length > 0 ? (

              /* CARTÕES DOS LIVROS */

              <div className="books-grid">
                {resultados.map((livro) => (
                  <article
                    className="book-card"
                    key={livro.id}
                  >

                    {/* CAPA REAL AUTOMÁTICA */}

                    <CapaLivro livro={livro} />

                    <div className="book-info">
                      <span className="book-category">
                        {livro.curso}
                      </span>

                      <h3>{livro.titulo}</h3>

                      <p className="book-author">
                        {livro.autor}
                      </p>

                      <p>{livro.descricao}</p>

                      <div className="book-actions">
                        <button
                          onClick={() => {
                            setDetalhe(livro);
                            irParaResultados();
                          }}
                        >
                          Ver detalhes
                          <ChevronRight size={16} />
                        </button>

                        <button
                          className={
                            favoritos.includes(livro.id)
                              ? "favorite-button favoritado"
                              : "favorite-button"
                          }
                          onClick={() =>
                            favoritar(livro.id)
                          }
                          aria-label={
                            favoritos.includes(livro.id)
                              ? `Remover ${livro.titulo} dos favoritos`
                              : `Favoritar ${livro.titulo}`
                          }
                          aria-pressed={
                            favoritos.includes(livro.id)
                          }
                        >
                          <Heart
                            size={20}
                            fill={
                              favoritos.includes(livro.id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (

              /* NENHUM RESULTADO */

              <div className="empty-state">
                <Search size={36} />

                <h3>Nenhum livro encontrado</h3>

                <p>
                  Tente outro termo, remova o filtro
                  de curso ou pesquise pelo autor.
                </p>
              </div>
            )}
          </section>
        )}

        <footer className="footer">
          BiblioTech — Catálogo demonstrativo.
          Consulte a biblioteca para confirmar o acervo.
        </footer>

      </main>
    </div>
  );
}

export default App;