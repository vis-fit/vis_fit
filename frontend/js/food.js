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

  // Função para converter array de bytes para base64
  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  //Função para resetar o scroll dos modais
  const resetModalScroll = () => {
    // Para Modal de Cadastro
    const cadastroBlocks = document.querySelector('#food-cadastro-modal .blocks-container');
    if (cadastroBlocks) {
      cadastroBlocks.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    // Para Modal de Detalhes (NOVO)
    const detalhesContent = document.querySelector('#food-detalhes-modal .blocks-container');
    if (detalhesContent) {
      detalhesContent.scrollTo({ top: 0, behavior: 'instant' });
    }
    
    // Fallback universal
    [cadastroBlocks, detalhesContent].forEach(container => {
      if (container && typeof container.scrollTo !== 'function') {
        container.scrollTop = 0;
      }
      if (container) void container.offsetHeight; // Força repaint
    });
  };

  // Conectar botão "Novo Alimento" ao modal de cadastro
  if (newFoodBtn) {
    newFoodBtn.addEventListener('click', function() {
      createFoodNameField();
      createBrandField();
      createPreparationField();
      createFoodGroupField();
      createPortionField();
      createNutritionFields();
      createImageField();
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
    resultsBody.addEventListener('click', async function(e) {
      const row = e.target.closest('tr');
      if (row && row.dataset.id) {
        const foodId = row.dataset.id;
        const detalhesModal = document.getElementById('food-detalhes-modal');
        
        try {
          resetModalScroll();
          const response = await fetch(`/api/foods/${foodId}`);
          const foodData = await response.json();
          
          const imageContainer = document.querySelector('#food-details-image-container');
          imageContainer.innerHTML = '';
          
          const img = document.createElement('img');
          img.id = 'food-details-image';
          
          // Prioridade: Imagem local > Imagem web > Default
          if (foodData.img_base64) {
            img.src = foodData.img_base64;
          } else if (foodData.img_registro_web) {
            img.src = foodData.img_registro_web;
          } else {
            img.src = '../assets/images/default-food.png';
          }

          img.onerror = () => {
            img.src = '../assets/images/default-food.png';
          };
          
          imageContainer.appendChild(img);

          //Nome do Item
          const itemNameElement = document.getElementById('food-item-name');
          if (itemNameElement) {
            itemNameElement.textContent = foodData.item_name || '';
          }

          //Demais campos
          const brandElement = document.getElementById('food-detail-brand');
          const prepElement = document.getElementById('food-detail-preparation');
          const groupElement = document.getElementById('food-detail-group');

          if (brandElement) {
            brandElement.textContent = foodData.brand_name || 'SEM MARCA';
            if (!foodData.brand_name) brandElement.classList.add('empty');
          }
          if (prepElement) {
            prepElement.textContent = foodData.preparation_name || '';
          }
          if (groupElement) {
            groupElement.textContent = foodData.group_name || '';
          }
          
          detalhesModal.style.display = 'block';
          setTimeout(resetModalScroll, 50);
          
        } catch (error) {
            console.error('Erro:', error);
            const imageContainer = document.querySelector('#food-details-image-container');
            imageContainer.innerHTML = `
              <img id="food-details-image" src="../assets/images/default-food.png">
            `;
            detalhesModal.style.display = 'block';
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
      
      // Carrega as opções e depois configura o listener
      loadFoodGroupOptions().then(() => {
        const groupSelect = document.getElementById('food-group');
        if (groupSelect) {
          // Atualiza a unidade inicial
          updatePortionUnit();
          
          // Adiciona o listener para mudanças
          groupSelect.addEventListener('change', updatePortionUnit);
        }
      });
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
        return true;
      }
    } catch (error) {
      console.error('Erro ao carregar grupos alimentares:', error);
      return false;
    }
  };
  //Fim Criação dos Campos "Modo de Preparo" e "Grupo Alimentar"

  //Inicio Criação do Campo "Porção Base"
  // Função para criar o campo Porção Base
  const createPortionField = () => {
    if (document.getElementById('food-portion')) return;
    
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    
    if (blockContent) {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field-container';
      
      fieldContainer.innerHTML = `
        <label for="food-portion" class="form-field-label" id="portion-label">
          Porção Base (g)
        </label>
        <input type="text" 
              id="food-portion" 
              class="form-field-input" 
              placeholder="Digite a porção base"
              value="100"
              pattern="[0-9]+([\.,][0-9]+)?">
        <div class="form-field-error"></div>
      `;
      
      blockContent.appendChild(fieldContainer);
      
      // Configura validação para aceitar apenas números
      const portionInput = document.getElementById('food-portion');
      portionInput.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9.,]/g, '');
      });
    }
  };

  // Função para atualizar a unidade de medida
  const updatePortionUnit = () => {
    const mlGroups = ['Bebidas', 'Bebidas Alcoólicas'];
    const groupSelect = document.getElementById('food-group');
    const label = document.getElementById('portion-label');
    
    if (!groupSelect || !label) return;
    
    const selectedText = groupSelect.options[groupSelect.selectedIndex].text;
    const unit = mlGroups.includes(selectedText) ? 'ml' : 'g';
    label.textContent = `Porção Base (${unit})`;
  };
  //Fim Criação do Campo "Porção Base"

  //Inicio Criação dos Campos "Calorias", "Proteinas", "Carboidratos" e "Gorduras Totais"
  // Função para criar os campos nutricionais
  const createNutritionFields = () => {
    // Verifica se os campos já existem
    if (document.getElementById('food-calories')) return;
    
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    if (!blockContent) return;

    // Array com a configuração dos campos
    const fieldsConfig = [
      { id: 'food-calories', label: 'Calorias (Kcal.)', placeholder: 'Digite as calorias' },
      { id: 'food-protein', label: 'Proteínas (g)', placeholder: 'Digite as proteínas' },
      { id: 'food-carbs', label: 'Carboidratos (g)', placeholder: 'Digite os carboidratos' },
      { id: 'food-fat', label: 'Gorduras Totais (g)', placeholder: 'Digite as gorduras' }
    ];

    // Cria cada campo
    fieldsConfig.forEach(field => {
      const fieldContainer = document.createElement('div');
      fieldContainer.className = 'form-field-container';
      
      fieldContainer.innerHTML = `
        <label for="${field.id}" class="form-field-label">
          ${field.label} <span class="required-asterisk">*</span>
        </label>
        <input type="text" 
              id="${field.id}" 
              class="form-field-input" 
              placeholder="${field.placeholder}"
              required
              min="0">
        <div class="form-field-error"></div>
      `;
      
      blockContent.appendChild(fieldContainer);

      // Configura validação para aceitar apenas números e decimais
      const input = document.getElementById(field.id);
      input.addEventListener('input', function(e) {
        this.value = this.value.replace(/[^0-9.,]/g, '');
      });
    });
  };
  //Inicio Criação dos Campos "Calorias", "Proteinas", "Carboidratos" e "Gorduras Totais"

  //Inicio Criação do Campo Imagem
  // Função para criar o campo de imagem
  const createImageField = () => {
    if (document.getElementById('image-options-modal')) return;
    
    const blockContent = document.querySelector('#cadastro-block1 .block-content');
    if (!blockContent) return;

    // Container principal do campo
    const fieldContainer = document.createElement('div');
    fieldContainer.className = 'form-field-container';
    
    fieldContainer.innerHTML = `
      <label class="form-field-label">Imagem</label>
      <button type="button" id="select-image-btn" class="form-field-input" style="text-align: left; cursor: pointer;">
        Selecionar imagem...
      </button>
      <div id="image-preview-container" style="margin-top: 10px; display: none;">
        <div id="image-filename" style="font-size: 0.8rem; margin-bottom: 5px;"></div>
        <img id="image-preview" style="max-width: 100px; max-height: 100px; border: 1px solid #ddd; border-radius: 4px;">
      </div>
    `;
    
    blockContent.appendChild(fieldContainer);

    // Modal de opções
    const modalHTML = `
      <div id="image-options-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 400px;">
          <h3 style="margin-bottom: 20px;">Selecionar imagem</h3>
          <button id="upload-local-btn" class="modal-btn" style="margin-bottom: 10px; width: 100%;">
            <i class="fas fa-upload"></i> Selecionar do dispositivo
          </button>
          <button id="web-url-btn" class="modal-btn" style="width: 100%;">
            <i class="fas fa-link"></i> Imagem Web
          </button>
        </div>
      </div>

      <div id="web-url-modal" class="modal" style="display: none;">
        <div class="modal-content" style="max-width: 400px;">
          <h3 style="margin-bottom: 15px;">Inserir URL da imagem</h3>
          <input type="text" id="image-url-input" class="form-field-input" placeholder="https://exemplo.com/imagem.jpg" style="width: 100%; margin-bottom: 15px;">
          <div style="display: flex; gap: 10px;">
            <button id="cancel-url-btn" class="modal-btn cancel-btn" style="flex: 1;">Cancelar</button>
            <button id="confirm-url-btn" class="modal-btn save-btn" style="flex: 1;">Confirmar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Elementos DOM
    const selectImageBtn = document.getElementById('select-image-btn');
    const imageOptionsModal = document.getElementById('image-options-modal');
    const uploadLocalBtn = document.getElementById('upload-local-btn');
    const webUrlBtn = document.getElementById('web-url-btn');
    const webUrlModal = document.getElementById('web-url-modal');
    const cancelUrlBtn = document.getElementById('cancel-url-btn');
    const confirmUrlBtn = document.getElementById('confirm-url-btn');
    const imageUrlInput = document.getElementById('image-url-input');
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const imageFilename = document.getElementById('image-filename');

    // Event Listeners
    selectImageBtn.addEventListener('click', () => {
      imageOptionsModal.style.display = 'block';
    });

    uploadLocalBtn.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            imagePreview.src = event.target.result;
            imageFilename.textContent = file.name;
            imagePreviewContainer.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
        imageOptionsModal.style.display = 'none';
      };
      fileInput.click();
    });

    webUrlBtn.addEventListener('click', () => {
      imageOptionsModal.style.display = 'none';
      webUrlModal.style.display = 'block';
      imageUrlInput.value = '';
    });

    cancelUrlBtn.addEventListener('click', () => {
      webUrlModal.style.display = 'none';
    });

    confirmUrlBtn.addEventListener('click', () => {
      const url = imageUrlInput.value.trim();
      if (url) {
        imagePreview.src = url;
        imageFilename.textContent = 'Imagem da web';
        imagePreviewContainer.style.display = 'block';
      }
      webUrlModal.style.display = 'none';
    });

    // Fechar modais ao clicar fora
    [imageOptionsModal, webUrlModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    });
  };
  //Fim Criação do Campo Imagem


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
  // Função para salvar no banco de dados (VERSÃO CORRIGIDA)
  const saveFoodItem = async () => {
    // 1. Obtenção e validação dos campos básicos
    const foodName = document.getElementById('food-name')?.value.trim().toUpperCase();
    const brandName = document.getElementById('food-brand')?.value.trim().toUpperCase();
    const preparationSelect = document.getElementById('food-preparation');
    const groupSelect = document.getElementById('food-group');
    const portionInput = document.getElementById('food-portion')?.value.replace(',', '.');

    // Validações básicas
    if (!foodName) {
      alert('Por favor, preencha o nome do alimento');
      return;
    }
    if (!preparationSelect?.value) {
      alert('Por favor, selecione o modo de preparo');
      return;
    }
    if (!groupSelect?.value) {
      alert('Por favor, selecione o grupo alimentar');
      return;
    }

    // 2. Validação da Porção Base
    const portionValue = parseFloat(portionInput);
    if (!portionInput || isNaN(portionValue) || portionValue <= 0) {
      alert('Por favor, insira uma porção base válida (maior que 0)');
      return;
    }

    // 3. Validação dos campos nutricionais
    const getNutritionValue = (id) => {
      const input = document.getElementById(id);
      if (!input || input.value.trim() === '') return null;
      const value = parseFloat(input.value.replace(',', '.'));
      return isNaN(value) ? null : value;
    };

    const nutritionValues = {
      calories: getNutritionValue('food-calories'),
      protein: getNutritionValue('food-protein'),
      carbs: getNutritionValue('food-carbs'),
      fat: getNutritionValue('food-fat')
    };

    // Verifica campos vazios
    const requiredNutritionFields = [
      { value: nutritionValues.calories, name: 'Calorias' },
      { value: nutritionValues.protein, name: 'Proteínas' },
      { value: nutritionValues.carbs, name: 'Carboidratos' },
      { value: nutritionValues.fat, name: 'Gorduras Totais' }
    ];

    for (const field of requiredNutritionFields) {
      if (field.value === null) {
        alert(`Por favor, preencha o campo ${field.name}`);
        return;
      }
      if (field.value < 0) {
        alert(`O valor de ${field.name} não pode ser negativo`);
        return;
      }
    }

    // 4. Processamento da imagem (opcional)
    let imageData = { img_registro_tipo: null, img_registro_dp: null, img_registro_web: null };
    const imagePreview = document.getElementById('image-preview');
    
    if (imagePreview?.src && imagePreview.style.display !== 'none') {
      try {
        const isWebImage = document.getElementById('image-filename').textContent === 'Imagem da web';
        
        if (isWebImage) {
          // Valida URL da imagem web
          if (!isValidUrl(imagePreview.src)) {
            alert('Por favor, insira uma URL de imagem válida');
            return;
          }
          imageData = {
            img_registro_tipo: 2,
            img_registro_web: imagePreview.src
          };
        } else {
          // Processa imagem local
          const response = await fetch(imagePreview.src);
          if (!response.ok) throw new Error('Falha ao carregar imagem');
          
          const blob = await response.blob();
          if (blob.size > 2 * 1024 * 1024) { // 2MB max
            alert('A imagem deve ter no máximo 2MB');
            return;
          }
          
          imageData = {
            img_registro_tipo: 1,
            img_registro_dp: blob
          };
        }
      } catch (error) {
        console.error('Erro ao processar imagem:', error);
        alert('Erro ao processar a imagem selecionada');
        return;
      }
    }

    try {
      toggleSaveLoader(true);
      
      // 5. Processamento da marca (se existir)
      let brandId = null;
      if (brandName) {
        const brandResponse = await fetch('/api/brands/process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome: brandName })
        });
        
        if (!brandResponse.ok) {
          throw new Error(await brandResponse.text() || 'Erro ao processar marca');
        }
        brandId = (await brandResponse.json()).id;
      }

      // 6. Cálculo proporcional para 100g/ml
      const proportionFactor = 100 / portionValue;
      const calculatedValues = {
        calories: (nutritionValues.calories * proportionFactor).toFixed(2),
        protein: (nutritionValues.protein * proportionFactor).toFixed(2),
        carbs: (nutritionValues.carbs * proportionFactor).toFixed(2),
        fat: (nutritionValues.fat * proportionFactor).toFixed(2)
      };

      // 7. Preparação dos dados para envio
      const formData = new FormData();
      formData.append('item_name', foodName);
      formData.append('id_item_brand', brandId || '');
      formData.append('id_preparo', preparationSelect.value);
      formData.append('id_grupo', groupSelect.value);
      formData.append('id_tipo_medida', (groupSelect.value === '10' || groupSelect.value === '11') ? '5' : '1');
      formData.append('caloria_kcal', calculatedValues.calories);
      formData.append('proteinas_g', calculatedValues.protein);
      formData.append('carboidratos_g', calculatedValues.carbs);
      formData.append('gorduras_totais_g', calculatedValues.fat);
      
      // Adiciona dados da imagem se existir
      if (imageData.img_registro_tipo) {
        formData.append('img_registro_tipo', imageData.img_registro_tipo.toString());
        if (imageData.img_registro_tipo === 1) {
          formData.append('img_registro_dp', imageData.img_registro_dp);
        } else {
          formData.append('img_registro_web', imageData.img_registro_web);
        }
      }

      // 8. Envio para o servidor
      const response = await fetch('/api/foods', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Erro ao salvar alimento');
      }

      alert('Alimento salvo com sucesso!');
      resetModal();
      
    } catch (error) {
      console.error('Erro:', error);
      alert(error.message.includes('Erro') ? error.message : 'Erro ao salvar alimento: ' + error.message);
    } finally {
      toggleSaveLoader(false);
    }
  };

  // Função auxiliar para validar URLs
  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  //Função para resetar o Modal de Cadastro

  const resetImageField = () => {
    const imagePreviewContainer = document.getElementById('image-preview-container');
    const imagePreview = document.getElementById('image-preview');
    const imageFilename = document.getElementById('image-filename');
    
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
    if (imagePreview) imagePreview.src = '';
    if (imageFilename) imageFilename.textContent = '';
    
    // Fechar modais se estiverem abertos
    document.getElementById('image-options-modal').style.display = 'none';
    document.getElementById('web-url-modal').style.display = 'none';
  };

  //FUNÇÃO PARA RESETAR MODAL DE CADASTRO
  const resetModal = () => {
    // Limpa todos os campos
    const fieldsToClear = [
      'food-name', 'food-brand', 'food-preparation', 'food-group',
      'food-calories', 'food-protein', 'food-carbs', 'food-fat'
    ];

    fieldsToClear.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = '';
    });

    const portionInput = document.getElementById('food-portion');
    if (portionInput) portionInput.value = '100';

    //RESETA O CAMPO DE IMAGEM (NOVO)
    resetImageField();

    // Reseta o label da porção para "g"
    const portionLabel = document.getElementById('portion-label');
    if (portionLabel) {
      portionLabel.textContent = 'Porção Base (g)';
    }

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

  //FUNÇÃO PARA RESETAR MODAL DE DETALHES
  const resetModalDetalhes = () => {
    // 1. Limpa todos os campos (ainda sem campos)
    const fieldsToClear = [];

    fieldsToClear.forEach(id => {
      const field = document.getElementById(id);
      if (field) field.value = '';
    });
    
    // 2. Reseta scroll para o topo (AGORA MAIS EFETIVO)
    resetModalScroll();

    // 3. Reabre todos os blocos
    document.querySelectorAll('#detalhes-block1, #detalhes-block2, #detalhes-block3').forEach(block => {
      block.classList.remove('collapsed');
      const icon = block.querySelector('.block-toggle');
      if (icon) icon.classList.replace('fa-chevron-right', 'fa-chevron-down');
    });
    
    // 4. Fecha o modal
    document.getElementById('food-detalhes-modal').style.display = 'none';
  };

  //Função botão "Cancelar"
  document.getElementById('food-cancel-btn').addEventListener('click', () => {
    if (confirm('Deseja realmente cancelar o cadastro? Os dados não salvos serão perdidos.')) {
      resetModal();
    }
  });
  
  //Função botão "Fechar"
  document.getElementById('food-close-btn').addEventListener('click', () => {
    resetModalScroll();
    resetModalDetalhes();
  })

  // Vincular ao botão Salvar
  document.getElementById('food-save-btn')?.addEventListener('click', saveFoodItem);

});
//Fim do arquivo food.js
//Comando: Não faça nada, somente diga se recebeu e aguarde o envio do próximo arquivo para prosseguir.