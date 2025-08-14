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

  //Função para resetar o scroll dos modais
  const resetModalScroll = () => {
    const blocksContainer = document.querySelector('.blocks-container');
    if (blocksContainer) {
      // Método 1 - Ideal para navegadores modernos
      if (typeof blocksContainer.scrollTo === 'function') {
        blocksContainer.scrollTo({ top: 0, behavior: 'instant' });
      } 
      // Método 2 - Fallback universal
      else {
        blocksContainer.scrollTop = 0;
      }
      
      // Força repaint (para navegadores problemáticos)
      void blocksContainer.offsetHeight;
    }
  };

  // Conectar botão "Novo Alimento" ao modal de cadastro
  if (newFoodBtn) {
    newFoodBtn.addEventListener('click', function() {
      createFoodNameField();
      createBrandField();
      createPreparationField();
      createFoodGroupField();
      const cadastroModal = document.getElementById('food-cadastro-modal');
      if (cadastroModal) {
        cadastroModal.style.display = 'block';
        setTimeout(resetModalScroll, 10);
      } else {
        console.error('Modal de cadastro não encontrado');
      }
    });
  }

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

  //==========CAMPOS DO MODAL DE CADASTRO==========//
  // Criação do campo Nome do Alimento
  const createFoodNameField = () => {
    if (document.getElementById('food-name')) return;
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    
    if (blockContent) {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field-container';
      
      const fieldHTML = `
        <label for="food-name" class="form-field-label">
          Nome do Alimento <span class="required-asterisk">*</span>
        </label>
        <input type="text" 
               id="food-name" 
               class="form-field-input" 
               placeholder="Digite o nome do alimento"
               required>
        <div class="form-field-error"></div>
      `;
      
      fieldContainer.innerHTML = fieldHTML;
      blockContent.appendChild(fieldContainer);
    }
  };

  //Criação do Campo Marca
  // Função para criar o campo Marca
  const createBrandField = () => {
    if (document.getElementById('food-brand')) return;
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    
    if (blockContent) {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field-container';
      
      fieldContainer.innerHTML = `
        <label for="food-brand" class="form-field-label">
          Marca
        </label>
        <div class="brand-input-wrapper">
          <input type="text" 
                id="food-brand" 
                class="form-field-input" 
                placeholder="Digite pelo menos 3 letras..."
                autocomplete="off">
          <div class="brand-suggestions"></div>
        </div>
      `;
      
      blockContent.appendChild(fieldContainer);
      setupBrandInput();
    }
  };

  // Configura o comportamento do input
  const setupBrandInput = () => {
    const brandInput = document.getElementById('food-brand');
    const suggestionsContainer = document.querySelector('.brand-suggestions');
    const modalContent = document.querySelector('.modal-content');

    if (!brandInput || !suggestionsContainer || !modalContent) return;

    const positionSuggestions = () => {
      const inputRect = brandInput.getBoundingClientRect();
      const modalRect = modalContent.getBoundingClientRect();
      
      suggestionsContainer.style.left = `${inputRect.left}px`;
      suggestionsContainer.style.top = `${inputRect.bottom + window.scrollY + 5}px`;
      suggestionsContainer.style.width = `${inputRect.width}px`;
    };

    brandInput.addEventListener('input', async (e) => {
      const searchTerm = e.target.value.trim().toUpperCase();
      
      if (searchTerm.length >= 3) {
        try {
          const response = await fetch(`/api/brands?search=${encodeURIComponent(searchTerm)}`);
          const brands = await response.json();
          
          const filteredBrands = brands.filter(brand => 
            brand.nome.includes(searchTerm)
          );
          
          if (filteredBrands.length > 0) {
            suggestionsContainer.innerHTML = filteredBrands.map(brand => `
              <div class="brand-option">${brand.nome}</div>
            `).join('');
            
            positionSuggestions();
            suggestionsContainer.classList.add('visible');
          } else {
            suggestionsContainer.classList.remove('visible');
          }
        } catch (error) {
          console.error('Erro ao buscar marcas:', error);
          suggestionsContainer.classList.remove('visible');
        }
      } else {
        suggestionsContainer.classList.remove('visible');
      }
    });

    // Redimensiona quando a janela muda de tamanho
    window.addEventListener('resize', () => {
      if (suggestionsContainer.classList.contains('visible')) {
        positionSuggestions();
      }
    });

    // Seleciona marca ao clicar
    suggestionsContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('brand-option')) {
        brandInput.value = e.target.textContent;
        suggestionsContainer.classList.remove('visible');
      }
    });

    // Fecha sugestões ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.brand-input-wrapper')) {
        suggestionsContainer.classList.remove('visible');
      }
    });
  };
  //Fim Criação do Campo Marca

  //Criação dos Campos "Modo de Preparo" e "Grupo Alimentar"
  const createPreparationField = () => {
    if (document.getElementById('food-preparation')) return;
    
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    if (blockContent) {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field-container';
      
      fieldContainer.innerHTML = `
        <label for="food-preparation" class="form-field-label">
          Modo de Preparo <span class="required-asterisk">*</span>
        </label>
        <select id="food-preparation" class="form-field-input" required>
          <option value="">Selecione...</option>
        </select>
      `;
      
      blockContent.appendChild(fieldContainer);
      loadPreparationOptions();
    }
  };

  // Função para criar o campo Grupo Alimentar
  const createFoodGroupField = () => {
    if (document.getElementById('food-group')) return;
    
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    if (blockContent) {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field-container';
      
      fieldContainer.innerHTML = `
        <label for="food-group" class="form-field-label">
          Grupo Alimentar <span class="required-asterisk">*</span>
        </label>
        <select id="food-group" class="form-field-input" required>
          <option value="">Selecione...</option>
        </select>
      `;
      
      blockContent.appendChild(fieldContainer);
      loadFoodGroupOptions();
    }
  };

  // Carrega opções de Modo de Preparo
  const loadPreparationOptions = async () => {
    try {
      const response = await fetch('/api/preparation-options');
      const options = await response.json();
      
      const select = document.getElementById('food-preparation');
      if (select) {
        select.innerHTML = `
          <option value="">Selecione...</option>
          ${options.map(opt => `<option value="${opt.id}">${opt.nome}</option>`).join('')}
        `;
      }
    } catch (error) {
      console.error('Erro ao carregar modos de preparo:', error);
    }
  };

  // Carrega opções de Grupo Alimentar
  const loadFoodGroupOptions = async () => {
    try {
      const response = await fetch('/api/foodgroup-options');
      const options = await response.json();
      
      const select = document.getElementById('food-group');
      if (select) {
        select.innerHTML = `
          <option value="">Selecione...</option>
          ${options.map(opt => `<option value="${opt.id}">${opt.nome}</option>`).join('')}
        `;
      }
    } catch (error) {
      console.error('Erro ao carregar grupos alimentares:', error);
    }
  };
  //Fim Criação dos Campos "Modo de Preparo" e "Grupo Alimentar"


  //FUNÇÕES DO SALVAMENTO DO ALIMENTO NO BANCO
  // Função para mostrar/ocultar o loader
  const toggleSaveLoader = (show) => {
    const saveBtn = document.getElementById('food-save-btn');
    const cancelBtn = document.getElementById('food-cancel-btn');
    
    if (!saveBtn || !cancelBtn) return;

    if (show) {
      saveBtn.disabled = true;
      cancelBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvando';
      const loader = document.createElement('span');
      loader.className = 'save-loader';
      loader.innerHTML = '<div class="loader"></div>';
      saveBtn.appendChild(loader);
    } else {
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
      saveBtn.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
  };
  
  // Função para salvar no banco de dados
  const saveFoodItem = async () => {
    const foodName = document.getElementById('food-name')?.value.trim().toUpperCase();
    const brandName = document.getElementById('food-brand')?.value.trim().toUpperCase();
    
    if (!foodName) {
      alert('Por favor, preencha o nome do alimento');
      return;
    }

    try {
      toggleSaveLoader(true);
      
      // 1. Processar a marca (se existir)
      let brandId = null;
      if (brandName) {
        // Verifica se a marca já existe ou cria nova
        const brandResponse = await fetch('/api/brands/process', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nome: brandName })
        });
        
        if (!brandResponse.ok) throw new Error('Erro ao processar marca');
        
        const brandData = await brandResponse.json();
        brandId = brandData.id;
      }

      // 2. Salvar o alimento
      const response = await fetch('/api/foods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          item_name: foodName,
          id_item_brand: brandId // Pode ser null
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar alimento');

      const result = await response.json();
      console.log('Alimento salvo:', result);
      alert('Alimento salvo com sucesso!');
      
      // Fecha o modal após sucesso
      resetModal();
      
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao salvar alimento: ' + error.message);
    } finally {
      toggleSaveLoader(false);
    }
  };

  //Função para resetar o Modal de Cadastro
  const resetModal = () => {
    // 1. Limpa todos os campos
    const foodNameInput = document.getElementById('food-name');
    const foodBrandInput = document.getElementById('food-brand');
    const foodPreparationInput = document.getElementById('food-preparation');
    const foodGroupInput = document.getElementById('food-group');
    if (foodNameInput) foodNameInput.value = '';
    if (foodBrandInput) foodBrandInput.value = '';
    if (foodPreparationInput) foodPreparationInput.value = '';
    if (foodGroupInput) foodGroupInput.value = '';

    // 2. Esconde sugestões de marca
    document.querySelector('.brand-suggestions').classList.remove('visible');
    
    // 3. Reseta scroll para o topo (AGORA MAIS EFETIVO)
    resetModalScroll();

    // 4. Reabre todos os blocos
    document.querySelectorAll('#cadastro-block1, #cadastro-block2, #cadastro-block3').forEach(block => {
      block.classList.remove('collapsed');
      const icon = block.querySelector('.block-toggle');
      if (icon) icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
    });
    
    // 5. Fecha o modal
    document.getElementById('food-cadastro-modal').style.display = 'none';
    
    // 6. Remove qualquer loader ativo
    toggleSaveLoader(false);
  };

  //Função botão "Cancelar"
  document.getElementById('food-cancel-btn').addEventListener('click', () => {
    if (confirm('Deseja realmente cancelar o cadastro? Os dados não salvos serão perdidos.')) {
      resetModal();
    }
  });

  // Vincular ao botão Salvar
  document.getElementById('food-save-btn')?.addEventListener('click', saveFoodItem);

});
//Fim do arquivo food.js
//Comando: Não faça nada, somente diga se recebeu e aguarde o envio do próximo arquivo para prosseguir.