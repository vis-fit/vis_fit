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
  const detailModal = getElement('food-detail-modal');
  const createModal = getElement('food-create-modal');
  const saveFoodBtn = getElement('save-food-btn');
  const cancelFoodBtn = getElement('cancel-food-btn');

  // Verificar se elementos essenciais existem
  if (!searchBar || !searchBtn || !newFoodBtn || !createModal) {
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

  if (newFoodBtn) {
    newFoodBtn.addEventListener('click', openCreateModal);
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
      
      row.addEventListener('click', () => openDetailModal(food.id));
      resultsBody.appendChild(row);
    });
    
    // Atualizar controles de paginação
    updatePaginationControls();
  }
  
  // Atualizar controles de paginação
  function updatePaginationControls() {
    const totalPages = Math.ceil(searchResults.length / itemsPerPage);
    
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
  }

  // Nova função para abrir modais
  function openModal(modalElement) {
    modalElement.classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  // Nova função para fechar modais
  function closeModal(modalElement) {
    modalElement.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
  
  // Abrir modal de detalhes
  // Atualizar openDetailModal
  async function openDetailModal(foodId) {
    try {
      const response = await fetch(`/api/foods/${foodId}`);
      const food = await response.json();
      
      if (response.ok) {
        renderDetailModal(food);
        openModal(detailModal);
      } else {
        alert('Erro ao carregar detalhes: ' + (food.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      alert('Erro ao conectar com o servidor');
    }
  }
  
  // Renderizar conteúdo do modal de detalhes
  function renderDetailModal(food) {
    const modalBody = detailModal.querySelector('.modal-body');
    modalBody.innerHTML = '';
    
    // Bloco 1 - Informações básicas
    const section1 = document.createElement('div');
    section1.className = 'food-detail-section';
    section1.innerHTML = `
      <h4>Informações Básicas</h4>
      <div class="food-image-container">
        ${food.image_url ? `<img src="${food.image_url}" alt="${food.item_name}" class="food-image">` : '<p>Sem imagem</p>'}
      </div>
      <h3 class="food-name">${food.item_name}</h3>
      <div class="food-detail-grid">
        <div class="food-detail-item">
          <label>Marca</label>
          <span>${food.brand || '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Modo de Preparo</label>
          <span>${food.preparation || '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Grupo Alimentar</label>
          <span>${food.food_group || '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Porção Base (${food.measure_type === 5 ? 'ml' : 'g'})</label>
          <span>${food.base_portion}</span>
        </div>
        <div class="food-detail-item">
          <label>Kcal.</label>
          <span>${food.calories_kcal}</span>
        </div>
        <div class="food-detail-item">
          <label>Proteínas</label>
          <span>${food.proteins_g}g</span>
        </div>
        <div class="food-detail-item">
          <label>Carboidratos</label>
          <span>${food.carbohydrates_g}g</span>
        </div>
        <div class="food-detail-item">
          <label>Gorduras Totais</label>
          <span>${food.total_fats_g}g</span>
        </div>
      </div>
    `;
    modalBody.appendChild(section1);
    
    // Bloco 2 - Informações nutricionais detalhadas
    const section2 = document.createElement('div');
    section2.className = 'food-detail-section';
    section2.innerHTML = `
      <h4>Informações Nutricionais Detalhadas</h4>
      <div class="food-detail-grid">
        <!-- Todos os campos nutricionais serão adicionados aqui -->
        ${renderNutritionalField('Fibras', food.fibers_g, 'g')}
        ${renderNutritionalField('Gorduras Saturadas', food.saturated_fats_g, 'g')}
        ${renderNutritionalField('Gorduras Monoinsaturadas', food.monounsaturated_fats_g, 'g')}
        ${renderNutritionalField('Gorduras Poliinsaturadas', food.polyunsaturated_fats_g, 'g')}
        ${renderNutritionalField('Gorduras Trans', food.trans_fats_g, 'g')}
        ${renderNutritionalField('Ômega 3', food.omega_3_g, 'g')}
        ${renderNutritionalField('Açúcares Totais', food.total_sugars_g, 'g')}
        ${renderNutritionalField('Açúcares Naturais', food.natural_sugars_g, 'g')}
        ${renderNutritionalField('Açúcares Adicionados', food.added_sugars_g, 'g')}
        ${renderNutritionalField('Índice Glicêmico', food.glycemic_index, '')}
        ${renderNutritionalField('Carga Glicêmica', food.glycemic_load, 'g')}
        ${renderNutritionalField('Sódio', food.sodium_mg, 'mg')}
        ${renderNutritionalField('Potássio', food.potassium_mg, 'mg')}
        ${renderNutritionalField('Colesterol', food.cholesterol_mg, 'mg')}
        ${renderNutritionalField('Cálcio', food.calcium_mg, 'mg')}
        ${renderNutritionalField('Ferro Total', food.total_iron_mg, 'mg')}
        ${renderNutritionalField('Ferro Tipo Heme', food.heme_iron_mg, 'mg')}
        ${renderNutritionalField('Ferro Não Heme', food.non_heme_iron_mg, 'mg')}
        ${renderNutritionalField('Vitamina A', food.vitamin_a_mcg, 'mcg')}
        ${renderNutritionalField('Vitamina C', food.vitamin_c_mg, 'mg')}
        ${renderNutritionalField('Vitamina D', food.vitamin_d_mcg, 'mcg')}
        ${renderNutritionalField('Vitamina B12', food.vitamin_b12_mcg, 'mcg')}
        ${renderNutritionalField('Vitamina E', food.vitamin_e_mg, 'mg')}
        ${renderNutritionalField('Vitamina B1', food.vitamin_b1_mg, 'mg')}
        ${renderNutritionalField('Vitamina B2', food.vitamin_b2_mg, 'mg')}
        ${renderNutritionalField('Vitamina B3', food.vitamin_b3_mg, 'mg')}
        ${renderNutritionalField('Vitamina B5', food.vitamin_b5_mg, 'mg')}
        ${renderNutritionalField('Vitamina B6', food.vitamin_b6_mg, 'mg')}
        ${renderNutritionalField('Vitamina B7', food.vitamin_b7_mcg, 'mcg')}
        ${renderNutritionalField('Vitamina K', food.vitamin_k_mcg, 'mcg')}
        ${renderNutritionalField('Cloro', food.chlorine_mg, 'mg')}
        ${renderNutritionalField('Magnésio', food.magnesium_mg, 'mg')}
        ${renderNutritionalField('Zinco', food.zinc_mg, 'mg')}
        ${renderNutritionalField('Cobre', food.copper_mg, 'mg')}
        ${renderNutritionalField('Manganês', food.manganese_mg, 'mg')}
        ${renderNutritionalField('Selênio', food.selenium_mcg, 'mcg')}
        ${renderNutritionalField('Iodo', food.iodine_mcg, 'mcg')}
        ${renderNutritionalField('Betacaroteno', food.betacarotene_mcg, 'mcg')}
        ${renderNutritionalField('Licopeno', food.lycopene_mcg, 'mcg')}
        ${renderNutritionalField('Luteína Zeaxantina', food.lutein_zeaxanthin_mcg, 'mcg')}
        ${renderNutritionalField('Ômega 6', food.omega_6_g, 'g')}
        ${renderNutritionalField('Ômega 6 x Ômega 3', food.omega6_omega3_ratio, '')}
        ${renderNutritionalField('Fitosterol', food.phytosterols_mg, 'mg')}
        ${renderNutritionalField('Carboidratos Líquidos', food.net_carbs_g, 'g')}
        ${renderNutritionalField('Polióis', food.polyols_g, 'g')}
        ${renderNutritionalField('Perfil Aminoácidos Essenciais', food.essential_amino_acids_mg, 'mg')}
        ${renderNutritionalField('Índice PDCAAS', food.pdcaas_score, '')}
        ${renderNutritionalField('PRAL', food.pral_meq, 'mEq')}
        ${renderNutritionalField('Ácido Fólico', food.folic_acid_mcg, 'mcg')}
        ${renderNutritionalField('Polifenol Total', food.total_polyphenols_mg, 'mg')}
        ${renderNutritionalField('Carga Antioxidantes', food.antioxidant_capacity_orac, 'ORAC')}
        ${renderNutritionalField('Teor Alcoólico', food.alcohol_content_percent, '%')}
        ${renderNutritionalField('Teor de Água', food.water_content_g, 'g')}
      </div>
    `;
    modalBody.appendChild(section2);
    
    // Bloco 3 - Outras informações
    const section3 = document.createElement('div');
    section3.className = 'food-detail-section';
    section3.innerHTML = `
      <h4>Outras Informações</h4>
      <div class="food-detail-grid">
        <div class="food-detail-item">
          <label>Contém Glúten?</label>
          <span>${food.contains_gluten ? 'Sim' : 'Não'}</span>
        </div>
        <div class="food-detail-item">
          <label>Intolerâncias Comuns</label>
          <span>${food.intolerances ? food.intolerances.join(', ') : '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Alérgenos Comuns</label>
          <span>${food.allergens ? food.allergens.join(', ') : '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Categoria Alimentar</label>
          <span>${food.categories ? food.categories.join(', ') : '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Origem do Alimento</label>
          <span>${food.origin || '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Nível de Processamento</label>
          <span>${food.processing_level || '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Densidade Calórica</label>
          <span>${food.caloric_density || '-'}</span>
        </div>
        <div class="food-detail-item">
          <label>Observações</label>
          <span>${food.notes || '-'}</span>
        </div>
      </div>
    `;
    modalBody.appendChild(section3);
    
    // ===== NOVO CÓDIGO PARA ADICIONAR/SUBSTITUIR =====
    // Configurar botões de fechar
    function setupModalCloseButtons() {
      // Fechar com botão X
      if (detailModal) {
        detailModal.querySelector('.btn-close')?.addEventListener('click', () => {
          closeModal(detailModal);
        });
      }

      // Fechar com botão Cancelar
      if (createModal) {
        document.getElementById('cancel-food-btn')?.addEventListener('click', () => {
          closeModal(createModal);
        });
      }

      // Fechar clicando fora
      window.addEventListener('click', (event) => {
        if (event.target === detailModal) {
          closeModal(detailModal);
        }
        if (event.target === createModal) {
          closeModal(createModal);
        }
      });
    }

    // Inicializar os listeners quando o DOM estiver pronto
    document.addEventListener('DOMContentLoaded', function() {
      // ... (mantenha todo o código existente)
      
      // Adicione esta linha no FINAL da função DOMContentLoaded
      setupModalCloseButtons();
    });

  }
  
  // Função auxiliar para renderizar campos nutricionais
  function renderNutritionalField(label, value, unit) {
    if (value === null || value === undefined || value === '') return '';
    return `
      <div class="food-detail-item">
        <label>${label}</label>
        <span>${value} ${unit}</span>
      </div>
    `;
  }
  
  // Abrir modal de cadastro
  // Atualizar openCreateModal
  function openCreateModal() {
    openModal(createModal);
    renderCreateModal();
  }
  
  // Renderizar conteúdo do modal de cadastro
  async function renderCreateModal() {
    const modalBody = createModal.querySelector('.modal-body');
    modalBody.innerHTML = '<div class="loader"></div>'; // Mostrar loader

    try {
      // Adicionar tratamento de resposta para cada requisição
      const fetchWithCheck = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }
        return response.json();
      };

      const [brands, preparations, groups, allergens, intolerances, categories, origins, processingLevels] = 
        await Promise.all([
          fetchWithCheck('/api/brands'),
          fetchWithCheck('/api/preparations'),
          fetchWithCheck('/api/food-groups'),
          fetchWithCheck('/api/allergens'),
          fetchWithCheck('/api/intolerances'),
          fetchWithCheck('/api/food-categories'),
          fetchWithCheck('/api/food-origins'),
          fetchWithCheck('/api/processing-levels')
        ]);

      // Bloco 1 - Informações básicas
      const section1 = document.createElement('div');
      section1.className = 'food-create-section';
      section1.innerHTML = `
        <h4>Informações Básicas</h4>
        <div class="food-create-grid">
          <div class="form-group">
            <label for="food-name">Nome do Alimento *</label>
            <input type="text" id="food-name" required>
          </div>
          
          <div class="form-group">
            <label for="food-brand">Marca</label>
            <select id="food-brand">
              <option value="">Selecione...</option>
              ${brands.map(brand => `<option value="${brand.id}">${brand.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="food-preparation">Modo de Preparo *</label>
            <select id="food-preparation" required>
              <option value="">Selecione...</option>
              ${preparations.map(prep => `<option value="${prep.id}">${prep.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label for="food-group">Grupo Alimentar *</label>
            <select id="food-group" required>
              <option value="">Selecione...</option>
              ${groups.map(group => `<option value="${group.id}">${group.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label id="portion-label">Porção Base (g) *</label>
            <input type="number" id="food-portion" min="0.1" step="0.1" value="100" required>
          </div>
          
          <div class="form-group">
            <label>Kcal. *</label>
            <input type="number" id="food-calories" min="0" step="0.1" required>
          </div>
          
          <div class="form-group">
            <label>Proteínas (g) *</label>
            <input type="number" id="food-proteins" min="0" step="0.1" required>
          </div>
          
          <div class="form-group">
            <label>Carboidratos (g) *</label>
            <input type="number" id="food-carbs" min="0" step="0.1" required>
          </div>
          
          <div class="form-group">
            <label>Gorduras Totais (g) *</label>
            <input type="number" id="food-fats" min="0" step="0.1" required>
          </div>
        </div>
      `;
      modalBody.appendChild(section1);
      
      // Bloco 2 - Informações nutricionais detalhadas
      const section2 = document.createElement('div');
      section2.className = 'food-create-section';
      section2.innerHTML = `
        <h4>Informações Nutricionais Detalhadas (Opcionais)</h4>
        <div class="food-create-grid">
          <div class="form-group">
            <label>Fibras (g)</label>
            <input type="number" id="food-fibers" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Gorduras Saturadas (g)</label>
            <input type="number" id="food-saturated-fats" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Gorduras Monoinsaturadas (g)</label>
            <input type="number" id="food-monounsaturated-fats" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Gorduras Poliinsaturadas (g)</label>
            <input type="number" id="food-polyunsaturated-fats" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Gorduras Trans (g)</label>
            <input type="number" id="food-trans-fats" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ômega 3 (g)</label>
            <input type="number" id="food-omega3" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Açúcares Totais (g)</label>
            <input type="number" id="food-total-sugars" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Açúcares Naturais (g)</label>
            <input type="number" id="food-natural-sugars" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Açúcares Adicionados (g)</label>
            <input type="number" id="food-added-sugars" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Índice Glicêmico</label>
            <input type="number" id="food-glycemic-index" min="0" max="100">
          </div>
          
          <div class="form-group">
            <label>Carga Glicêmica (g)</label>
            <input type="number" id="food-glycemic-load" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Sódio (mg)</label>
            <input type="number" id="food-sodium" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Potássio (mg)</label>
            <input type="number" id="food-potassium" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Colesterol (mg)</label>
            <input type="number" id="food-cholesterol" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Cálcio (mg)</label>
            <input type="number" id="food-calcium" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ferro Total (mg)</label>
            <input type="number" id="food-total-iron" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ferro Tipo Heme (mg)</label>
            <input type="number" id="food-heme-iron" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ferro Não Heme (mg)</label>
            <input type="number" id="food-non-heme-iron" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina A (mcg)</label>
            <input type="number" id="food-vitamin-a" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina C (mg)</label>
            <input type="number" id="food-vitamin-c" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina D (mcg)</label>
            <input type="number" id="food-vitamin-d" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B12 (mcg)</label>
            <input type="number" id="food-vitamin-b12" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina E (mg)</label>
            <input type="number" id="food-vitamin-e" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B1 (mg)</label>
            <input type="number" id="food-vitamin-b1" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B2 (mg)</label>
            <input type="number" id="food-vitamin-b2" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B3 (mg)</label>
            <input type="number" id="food-vitamin-b3" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B5 (mg)</label>
            <input type="number" id="food-vitamin-b5" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B6 (mg)</label>
            <input type="number" id="food-vitamin-b6" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Vitamina B7 (mcg)</label>
            <input type="number" id="food-vitamin-b7" min="0" step="0.1">
          </div>

          <div class="form-group">
            <label>Vitamina K (mcg)</label>
            <input type="number" id="food-vitamin-k" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Cloro (mg)</label>
            <input type="number" id="food-chlorine" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Magnésio (mg)</label>
            <input type="number" id="food-magnesium" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Zinco (mg)</label>
            <input type="number" id="food-zinc" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Cobre (mg)</label>
            <input type="number" id="food-copper" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Manganês (mg)</label>
            <input type="number" id="food-manganese" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Selênio (mcg)</label>
            <input type="number" id="food-selenium" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Iodo (mcg)</label>
            <input type="number" id="food-iodine" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Betacaroteno (mcg)</label>
            <input type="number" id="food-betacarotene" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Licopeno (mcg)</label>
            <input type="number" id="food-lycopene" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Luteína Zeaxantina (mcg)</label>
            <input type="number" id="food-lutein" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ômega 6 (g)</label>
            <input type="number" id="food-omega6" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ômega 6 x Ômega 3</label>
            <input type="number" id="food-omega-ratio" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Fitosterol (mg)</label>
            <input type="number" id="food-phytosterols" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Carboidratos Líquidos (g)</label>
            <input type="number" id="food-net-carbs" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Polióis (g)</label>
            <input type="number" id="food-polyols" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Perfil Aminoácidos Essenciais (mg)</label>
            <input type="number" id="food-amino-acids" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Índice PDCAAS</label>
            <input type="number" id="food-pdcaas" min="0" max="1" step="0.01">
          </div>
          
          <div class="form-group">
            <label>PRAL (mEq)</label>
            <input type="number" id="food-pral" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Ácido Fólico (mcg)</label>
            <input type="number" id="food-folic-acid" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Polifenol Total (mg)</label>
            <input type="number" id="food-polyphenols" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Carga Antioxidantes (ORAC)</label>
            <input type="number" id="food-orac" min="0" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Teor Alcoólico (%)</label>
            <input type="number" id="food-alcohol" min="0" max="100" step="0.1">
          </div>
          
          <div class="form-group">
            <label>Teor de Água (g)</label>
            <input type="number" id="food-water" min="0" step="0.1">
          </div>
        </div>
      `;
      modalBody.appendChild(section2);
      
      // Bloco 3 - Outras informações
      const section3 = document.createElement('div');
      section3.className = 'food-create-section';
      section3.innerHTML = `
        <h4>Outras Informações (Opcionais)</h4>
        <div class="food-create-grid">
          <div class="form-group">
            <label>Contém Glúten?</label>
            <select id="food-gluten">
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Alérgenos Comuns</label>
            <select id="food-allergens" multiple>
              ${allergens.map(allergen => `<option value="${allergen.id}">${allergen.name}</option>`).join('')}
            </select>
            <div id="allergens-tags" class="tags-container"></div>
          </div>
          
          <div class="form-group">
            <label>Intolerâncias Comuns</label>
            <select id="food-intolerances" multiple>
              ${intolerances.map(intol => `<option value="${intol.id}">${intol.name}</option>`).join('')}
            </select>
            <div id="intolerances-tags" class="tags-container"></div>
          </div>
          
          <div class="form-group">
            <label>Categoria Alimentar</label>
            <select id="food-categories" multiple>
              ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
            </select>
            <div id="categories-tags" class="tags-container"></div>
          </div>
          
          <div class="form-group">
            <label>Origem do Alimento</label>
            <select id="food-origin">
              <option value="">Selecione...</option>
              ${origins.map(origin => `<option value="${origin.id}">${origin.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label>Nível de Processamento</label>
            <select id="food-processing">
              <option value="">Selecione...</option>
              ${processingLevels.map(level => `<option value="${level.id}">${level.name}</option>`).join('')}
            </select>
          </div>
          
          <div class="form-group">
            <label>Observações</label>
            <textarea id="food-notes" rows="3"></textarea>
          </div>
        </div>
      `;
      modalBody.appendChild(section3);
      
      // Configurar seleção múltipla com tags
      setupMultiSelect('food-allergens', 'allergens-tags');
      setupMultiSelect('food-intolerances', 'intolerances-tags');
      setupMultiSelect('food-categories', 'categories-tags');
      
      // Configurar mudança no grupo alimentar para atualizar tipo de medida
      document.getElementById('food-group').addEventListener('change', function() {
        const groupId = parseInt(this.value);
        const portionLabel = document.getElementById('portion-label');
        
        if (groupId === 10 || groupId === 11) {
          portionLabel.textContent = 'Porção Base (ml) *';
        } else {
          portionLabel.textContent = 'Porção Base (g) *';
        }
      });
      
    } catch (error) {
      console.error('Erro ao carregar dados auxiliares:', error);
      alert('Erro ao carregar dados necessários para o cadastro');
    }
  }
  
  // Configurar seleção múltipla com tags
  function setupMultiSelect(selectId, tagsContainerId) {
    const select = document.getElementById(selectId);
    const tagsContainer = document.getElementById(tagsContainerId);
    
    select.addEventListener('change', function() {
      const selectedOptions = Array.from(this.selectedOptions);
      
      // Limitar a 6 seleções
      if (selectedOptions.length > 6) {
        this.selectedIndex = -1;
        alert('Máximo de 6 itens selecionados');
        return;
      }
      
      // Atualizar tags
      tagsContainer.innerHTML = '';
      selectedOptions.forEach(option => {
        const tag = document.createElement('div');
        tag.className = 'tag';
        tag.innerHTML = `
          ${option.text}
          <button type="button" data-value="${option.value}">&times;</button>
        `;
        tagsContainer.appendChild(tag);
      });
      
      // Configurar botões de remoção
      tagsContainer.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', function() {
          const value = this.getAttribute('data-value');
          const option = select.querySelector(`option[value="${value}"]`);
          option.selected = false;
          this.parentElement.remove();
        });
      });
    });
  }
  
  // Configurar botão de salvar
  saveFoodBtn.addEventListener('click', async function() {
    try {
      // Validar campos obrigatórios
      const foodName = document.getElementById('food-name').value.trim();
      const preparation = document.getElementById('food-preparation').value;
      const foodGroup = document.getElementById('food-group').value;
      const portion = parseFloat(document.getElementById('food-portion').value);
      const calories = parseFloat(document.getElementById('food-calories').value);
      const proteins = parseFloat(document.getElementById('food-proteins').value);
      const carbs = parseFloat(document.getElementById('food-carbs').value);
      const fats = parseFloat(document.getElementById('food-fats').value);
      
      if (!foodName || !preparation || !foodGroup || !portion || isNaN(portion) || portion <= 0 ||
          isNaN(calories) || calories < 0 || isNaN(proteins) || proteins < 0 || 
          isNaN(carbs) || carbs < 0 || isNaN(fats) || fats < 0) {
        alert('Preencha todos os campos obrigatórios corretamente');
        return;
      }
      
      // Calcular proporção para salvar sempre base 100
      const portionRatio = 100 / portion;
      
      // Preparar dados para envio
      const foodData = {
        item_name: foodName.toUpperCase(),
        id_item_brand: document.getElementById('food-brand').value || null,
        id_preparo: preparation,
        id_grupo: foodGroup,
        porcao_base: 100, // Sempre 100 no banco
        caloria_kcal: calories * portionRatio,
        proteinas_g: proteins * portionRatio,
        carboidratos_g: carbs * portionRatio,
        gorduras_totais_g: fats * portionRatio,
        gluten_sim: document.getElementById('food-gluten').value === 'true',
        id_origem: document.getElementById('food-origin').value || null,
        id_processamento: document.getElementById('food-processing').value || null,
        obs_alimento: document.getElementById('food-notes').value.trim() || null,
        // Campos opcionais nutricionais
        fibras_g: getOptionalNumberValue('food-fibers') * portionRatio,
        gorduras_saturadas_g: getOptionalNumberValue('food-saturated-fats') * portionRatio,
        gorduras_monoinsaturadas_g: getOptionalNumberValue('food-monounsaturated-fats') * portionRatio,
        gorduras_poliinsaturadas_g: getOptionalNumberValue('food-polyunsaturated-fats') * portionRatio,
        gorduras_trans_g: getOptionalNumberValue('food-trans-fats') * portionRatio,
        omega_3_g: getOptionalNumberValue('food-omega3') * portionRatio,
        acucares_totais_g: getOptionalNumberValue('food-total-sugars') * portionRatio,
        acucares_naturais_g: getOptionalNumberValue('food-natural-sugars') * portionRatio,
        acucares_adicionados_g: getOptionalNumberValue('food-added-sugars') * portionRatio,
        indice_glicemico: getOptionalNumberValue('food-glycemic-index'),
        carga_glicemica_g: getOptionalNumberValue('food-glycemic-load') * portionRatio,
        sodio_mg: getOptionalNumberValue('food-sodium') * portionRatio,
        potassio_mg: getOptionalNumberValue('food-potassium') * portionRatio,
        colesterol_mg: getOptionalNumberValue('food-cholesterol') * portionRatio,
        calcio_mg: getOptionalNumberValue('food-calcium') * portionRatio,
        ferro_total_mg: getOptionalNumberValue('food-total-iron') * portionRatio,
        ferro_heme_mg: getOptionalNumberValue('food-heme-iron') * portionRatio,
        ferro_n_heme_mg: getOptionalNumberValue('food-non-heme-iron') * portionRatio,
        vitamina_a_mcg: getOptionalNumberValue('food-vitamin-a') * portionRatio,
        vitamina_c_mg: getOptionalNumberValue('food-vitamin-c') * portionRatio,
        vitamina_d_mcg: getOptionalNumberValue('food-vitamin-d') * portionRatio,
        vitamina_b12_mcg: getOptionalNumberValue('food-vitamin-b12') * portionRatio,
        vitamina_e_mg: getOptionalNumberValue('food-vitamin-e') * portionRatio,
        vitamina_b1_mg: getOptionalNumberValue('food-vitamin-b1') * portionRatio,
        vitamina_b2_mg: getOptionalNumberValue('food-vitamin-b2') * portionRatio,
        vitamina_b3_mg: getOptionalNumberValue('food-vitamin-b3') * portionRatio,
        vitamina_b5_mg: getOptionalNumberValue('food-vitamin-b5') * portionRatio,
        vitamina_b6_mg: getOptionalNumberValue('food-vitamin-b6') * portionRatio,
        vitamina_b7_mcg: getOptionalNumberValue('food-vitamin-b7') * portionRatio,
        vitamina_k_mcg: getOptionalNumberValue('food-vitamin-k') * portionRatio,
        cloro_mg: getOptionalNumberValue('food-chlorine') * portionRatio,
        magnesio_mg: getOptionalNumberValue('food-magnesium') * portionRatio,
        zinco_mg: getOptionalNumberValue('food-zinc') * portionRatio,
        cobre_mg: getOptionalNumberValue('food-copper') * portionRatio,
        manganes_mg: getOptionalNumberValue('food-manganese') * portionRatio,
        selenio_mcg: getOptionalNumberValue('food-selenium') * portionRatio,
        iodo_mcg: getOptionalNumberValue('food-iodine') * portionRatio,
        betacaroteno_mcg: getOptionalNumberValue('food-betacarotene') * portionRatio,
        licopeno_mcg: getOptionalNumberValue('food-lycopene') * portionRatio,
        luteina_zeaxantina_mcg: getOptionalNumberValue('food-lutein') * portionRatio,
        omega_6_g: getOptionalNumberValue('food-omega6') * portionRatio,
        om6_x_om3: getOptionalNumberValue('food-omega-ratio'),
        fitosterol_mg: getOptionalNumberValue('food-phytosterols') * portionRatio,
        carboidratos_liquidos_g: getOptionalNumberValue('food-net-carbs') * portionRatio,
        poliois_g: getOptionalNumberValue('food-polyols') * portionRatio,
        perfil_aminoacidos_ess_mg: getOptionalNumberValue('food-amino-acids') * portionRatio,
        indice_quality_proteinas_pdcaas: getOptionalNumberValue('food-pdcaas'),
        pral_mEq: getOptionalNumberValue('food-pral'),
        acido_folico_mcg: getOptionalNumberValue('food-folic-acid') * portionRatio,
        polifenol_total_mg: getOptionalNumberValue('food-polyphenols') * portionRatio,
        carga_antioxidante_orac: getOptionalNumberValue('food-orac'),
        teor_alcool_prcent: getOptionalNumberValue('food-alcohol'),
        teor_agua_g: getOptionalNumberValue('food-water') * portionRatio,
        // Seleções múltiplas
        id_alergenos: getSelectedValues('food-allergens'),
        id_intolerancias: getSelectedValues('food-intolerances'),
        id_categoria: getSelectedValues('food-categories')
      };
      
      // Enviar para o backend
      const response = await fetch('/api/foods', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(foodData)
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Alimento cadastrado com sucesso!');
        createModal.classList.add('hidden');
        // Atualizar lista de alimentos
        searchFoods();
      } else {
        alert('Erro ao cadastrar alimento: ' + (result.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Erro ao cadastrar alimento:', error);
      alert('Erro ao conectar com o servidor');
    }
  });
  
  // Função auxiliar para obter valores numéricos opcionais
  function getOptionalNumberValue(id) {
    const value = parseFloat(document.getElementById(id).value);
    return isNaN(value) ? null : value;
  }
  
  // Função auxiliar para obter valores de seleção múltipla
  function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    const selected = Array.from(select.selectedOptions).map(opt => opt.value);
    return selected.length > 0 ? selected.join(';') : null;
  }
  
  // Configurar botão de cancelar
  cancelFoodBtn.addEventListener('click', function() {
    if (confirm('Deseja realmente cancelar o cadastro? Todos os dados serão perdidos.')) {
      createModal.classList.add('hidden');
    }
  });
  
  // Fechar modais ao clicar fora
  window.addEventListener('click', function(event) {
    if (event.target === detailModal) {
      detailModal.classList.add('hidden');
    }
    if (event.target === createModal) {
      if (confirm('Deseja realmente cancelar o cadastro? Todos os dados serão perdidos.')) {
        createModal.classList.add('hidden');
      }
    }
  });

  // Inicialização - Verificar se está na página de alimentos
  if (window.location.pathname.includes('mod_food')) {
    console.log('Módulo de alimentos inicializado');
  }

  setupModalCloseButtons();

});
//Fim do arquivo food.js
//Comando: Não faça nada, somente diga se recebeu e aguarde o envio do próximo arquivo para prosseguir.