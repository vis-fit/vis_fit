//Inicio do arquivo: food.js
document.addEventListener('DOMContentLoaded', function() {
  // Variáveis globais
  let currentPage = 1;
  const itemsPerPage = 20;
  let searchResults = [];
  
  // Elementos DOM - com verificações
  const getElement = (id) => {
    const el = document.getElementById(id);
    if (!el) console.error(`Elemento não encontrado: ${id}`);
    return el;
  };

  const searchBar = getElement('food-search-bar');
  const searchBtn = getElement('food-search-btn');
  const loader = getElement('search-loader');
  const resultsBody = getElement('food-results-body');
  const prevPageBtn = getElement('prev-page');
  const nextPageBtn = getElement('next-page');
  const pageInfo = getElement('page-info');
  const newFoodBtn = getElement('new-food-btn');

  // Verificar se elementos essenciais existem
  if (!searchBar || !searchBtn || !newFoodBtn) {
    console.error('Elementos essenciais não encontrados no DOM');
    return;
  }

  // Event Listeners - com verificações
  if (searchBtn) {
    searchBtn.addEventListener('click', handleSearch);
  }

  if (searchBar) {
    searchBar.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleSearch();
    });
  }

  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        displayResults();
      }
    });
  }

  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(searchResults.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        displayResults();
      }
    });
  }

  // Função unificada para pesquisa
  async function handleSearch() {
    const searchTerm = searchBar.value.trim();
    if (!searchTerm) {
      alert('Por favor, digite um termo para pesquisa');
      return;
    }

    try {
      if (loader) loader.classList.remove('hidden');
      if (resultsBody) resultsBody.innerHTML = '';

      const response = await fetch(`/api/foods/search?term=${encodeURIComponent(searchTerm)}`);
      
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const data = await response.json();
      searchResults = Array.isArray(data) ? data : [];
      currentPage = 1;
      displayResults();
    } catch (error) {
      console.error('Erro na pesquisa:', error);
      if (resultsBody) {
        resultsBody.innerHTML = `
          <tr>
            <td colspan="5" class="error-message">
              Erro na pesquisa: ${error.message}
            </td>
          </tr>
        `;
      }
    } finally {
      if (loader) loader.classList.add('hidden');
    }
  }

  // Exibir resultados na tabela
  function displayResults() {
    resultsBody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedResults = searchResults.slice(startIndex, endIndex);
    
    if (paginatedResults.length === 0) {
      resultsBody.innerHTML = '<tr><td colspan="5" class="no-results">Nenhum resultado encontrado</td></tr>';
      return;
    }
    
    paginatedResults.forEach(food => {
      const row = document.createElement('tr');
      row.dataset.id = food.id;
      
      row.innerHTML = `
        <td>${food.item_name}</td>
        <td>${food.brand || '-'}</td>
        <td>${food.preparation || '-'}</td>
        <td>${food.base_portion}${food.measure_type === 5 ? 'ml' : 'g'}</td>
        <td>${food.calories_kcal}</td>
      `;

      resultsBody.appendChild(row);
    });
    
    // Atualizar controles de paginação
    updatePaginationControls();
  }

  // Conectar linhas da tabela ao modal de detalhes
  //Abrir modal de detalhes ao clicar no registro
  if (resultsBody) {
    resultsBody.addEventListener('click', function(e) {
      const row = e.target.closest('tr');
      if (row && row.dataset.id) {
        const detalhesModal = document.getElementById('food-detalhes-modal');
        if (detalhesModal) {
          detalhesModal.style.display = 'block';
          
          // Aqui no futuro pegaremos o row.dataset.id para carregar os detalhes específicos
        }
      }
    });
  }
  
  // Atualizar controles de paginação
  function updatePaginationControls() {
    const totalPages = Math.ceil(searchResults.length / itemsPerPage);
    
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // Inicialização - Verificar se está na página de alimentos
  if (window.location.pathname.includes('mod_food')) {
    console.log('Módulo de alimentos inicializado');
  }

  // Conectar botão "Novo Alimento" ao modal de cadastro
  if (newFoodBtn) {
    newFoodBtn.addEventListener('click', function() {
      const cadastroModal = document.getElementById('food-cadastro-modal');
      if (cadastroModal) {
        cadastroModal.style.display = 'block';
      } else {
        console.error('Modal de cadastro não encontrado');
      }
    });
  }

  // Função para os blocos colapsáveis
  document.querySelectorAll('.block-header').forEach(header => {
    header.addEventListener('click', () => {
      const block = header.parentElement;
      block.classList.toggle('collapsed');
      
      // Atualiza o ícone
      const icon = header.querySelector('.block-toggle');
      if (block.classList.contains('collapsed')) {
        icon.classList.replace('fa-chevron-down', 'fa-chevron-right');
      } else {
        icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
      }
    });
  });


});
//Fim do arquivo food.js
//Comando: Não faça nada, somente diga se recebeu e aguarde o envio do próximo arquivo para prosseguir.