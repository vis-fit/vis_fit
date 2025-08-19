//Inicio do arquivo: food.js
document.addEventListener('DOMContentLoaded', function() {
  // Variáveis globais
  let currentPage = 1;
  const itemsPerPage = 20;
  let searchResults = [];
  let selectedAlergenos = [];

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
      createFatFields();
      setupAlergenosField();
      const cadastroModal = document.getElementById('food-cadastro-modal');
      if (cadastroModal) {
        cadastroModal.style.display = 'block';
        setTimeout(resetModalScroll, 10);
        
        // Garantir que o dropdown seja posicionado corretamente (NOVO)
        setTimeout(() => {
          const trigger = document.querySelector('.alergenos-trigger');
          if (trigger) {
            trigger.addEventListener('click', function() {
              setTimeout(positionDropdown, 10);
            });
          }
        }, 100);
      } else {
        console.error('Modal de cadastro não encontrado');
      }
    });
  }

  //CAMPO ALERGENOS
  // Função para obter alérgenos selecionados no formato "1;3;5"
  function getSelectedAlergenos() {
    const selectedOptions = document.querySelectorAll('.alergenos-option.selected');
    return Array.from(selectedOptions)
      .map(opt => opt.dataset.id)
      .join(';');
  }
  //FIM CAMPO ALERGENOS

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

          
          //Porção Base
          // Função para formatar decimais com vírgula
          function formatDecimal(input) {
            input.value = input.value.replace('.', ',');
          }
          // Adicionar após carregar os dados do alimento
          const portionInput = document.getElementById('food-detail-portion');
          const portionLabel = document.getElementById('detalhes-portion-label');
          // Verificar tipo de medida e atualizar label
          if (foodData.id_tipo_medida === 5) {
            portionLabel.textContent = 'Porção Base (ml)';
          } else {
            portionLabel.textContent = 'Porção Base (g)';
          }
          // Resetar para 100 quando o modal for aberto
          portionInput.value = '100';

          //Calorias
          // Função para formatar número com 2 decimais e vírgula
          function formatCalories(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          // Atualizar o campo calorias com os dados do banco
          const caloriesElement = document.getElementById('food-detail-calories');
          if (foodData.caloria_kcal) {
            caloriesElement.textContent = formatCalories(foodData.caloria_kcal);
          } else {
            caloriesElement.textContent = '0,00';
          }

          //Proteinas
          // Função para formatar número com 2 decimais e vírgula
          function formatProteinas(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          // Atualizar o campo calorias com os dados do banco
          const proteinasElement = document.getElementById('food-detail-proteinas');
          if (foodData.proteinas_g) {
            proteinasElement.textContent = formatProteinas(foodData.proteinas_g);
          } else {
            proteinasElement.textContent = '0,00';
          }

          //Caboidratos
          // Função para formatar número com 2 decimais e vírgula
          function formatCarboidratos(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          // Atualizar o campo carboidratos com os dados do banco
          const carboidratosElement = document.getElementById('food-detail-carboidratos');
          if (foodData.carboidratos_g) {
            carboidratosElement.textContent = formatCarboidratos(foodData.carboidratos_g);
          } else {
            carboidratosElement.textContent = '0,00';
          }

          //Gorduras Totais
          // Função para formatar número com 2 decimais e vírgula
          function formatGordurasT(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          // Atualizar o campo gorduras totais com os dados do banco
          const gordurasTElement = document.getElementById('food-detail-gordurasT');
          if (foodData.gorduras_totais_g) {
            gordurasTElement.textContent = formatGordurasT(foodData.gorduras_totais_g);
          } else {
            gordurasTElement.textContent = '0,00';
          }

          //======PRIMEIRO PASSO BLOCO 2 - DETALHES======
          //Fibras
          function formatFibras(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const fibrasElement = document.getElementById('food-detail-fibras');
          if (foodData.fibras_g) {
            fibrasElement.textContent = formatFibras(foodData.fibras_g);
          } else {
            fibrasElement.textContent = '0,00';
          }          

          //Gorduras Saturadas
          function formatGordurasSat(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const gordurasSatElement = document.getElementById('food-detail-gSat');
          if (foodData.gorduras_totais_g) {
            gordurasSatElement.textContent = formatGordurasSat(foodData.gorduras_saturadas_g);
          } else {
            gordurasSatElement.textContent = '0,00';
          }

          //Gorduras Monosaturadas
          function formatMono(value) {
          const num = parseFloat(value || 0);
          return num.toFixed(2).replace('.', ',');
          }
          const monoElement = document.getElementById('food-detail-mono');
          if (foodData.gorduras_monoinsaturadas_g) {
          monoElement.textContent = formatMono(foodData.gorduras_monoinsaturadas_g);
          } else {
          monoElement.textContent = '0,00';
          }

          //Gorduras Poliinsaturadas
          function formatPoly(value) {
          const num = parseFloat(value || 0);
          return num.toFixed(2).replace('.', ',');
          }
          const polyElement = document.getElementById('food-detail-poly');
          if (foodData.gorduras_poliinsaturadas_g) {
          polyElement.textContent = formatPoly(foodData.gorduras_poliinsaturadas_g);
          } else {
          polyElement.textContent = '0,00';
          }

          //Gorduras Trans
          function formatTrans(value) {
          const num = parseFloat(value || 0);
          return num.toFixed(2).replace('.', ',');
          }
          const transElement = document.getElementById('food-detail-trans');
          if (foodData.gorduras_trans_g) {
          transElement.textContent = formatTrans(foodData.gorduras_trans_g);
          } else {
          transElement.textContent = '0,00';
          }

          //OmegaT
          function formatOmegaT(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const omegaTElement = document.getElementById('food-detail-omegaT');
          if (foodData.omega_3_g) {
            omegaTElement.textContent = formatOmegaT(foodData.omega_3_g);
          } else {
            omegaTElement.textContent = '0,00';
          }

          //AcucarT
          function formatAcucarT(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const acucarTElement = document.getElementById('food-detail-acucarT');
          if (foodData.acucares_totais_g) {
            acucarTElement.textContent = formatAcucarT(foodData.acucares_totais_g);
          } else {
            acucarTElement.textContent = '0,00';
          }

          //AcucarN
          function formatAcucarN(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const acucarNElement = document.getElementById('food-detail-acucarN');
          if (foodData.acucares_naturais_g) {
            acucarNElement.textContent = formatAcucarN(foodData.acucares_naturais_g);
          } else {
            acucarNElement.textContent = '0,00';
          }

          //AcucarAdd
          function formatAcucarAdd(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const acucarAddElement = document.getElementById('food-detail-acucarAdd');
          if (foodData.acucares_adicionados_g) {
            acucarAddElement.textContent = formatAcucarAdd(foodData.acucares_adicionados_g);
          } else {
            acucarAddElement.textContent = '0,00';
          }

          //IndiceG
          function formatIndiceG(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const indiceGElement = document.getElementById('food-detail-indiceG');
          if (foodData.indice_glicemico) {
            indiceGElement.textContent = formatIndiceG(foodData.indice_glicemico);
          } else {
            indiceGElement.textContent = '0,00';
          }

          //CargaG
          function formatCargaG(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const cargaGElement = document.getElementById('food-detail-cargaG');
          if (foodData.carga_glicemica_g) {
            cargaGElement.textContent = formatCargaG(foodData.carga_glicemica_g);
          } else {
            cargaGElement.textContent = '0,00';
          }

          //Sodio
          function formatSodio(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const sodioElement = document.getElementById('food-detail-sodio');
          if (foodData.sodio_mg) {
            sodioElement.textContent = formatSodio(foodData.sodio_mg);
          } else {
            sodioElement.textContent = '0,00';
          }

          //Potassio
          function formatPotassio(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const potassioElement = document.getElementById('food-detail-potassio');
          if (foodData.potassio_mg) {
            potassioElement.textContent = formatPotassio(foodData.potassio_mg);
          } else {
            potassioElement.textContent = '0,00';
          }

          //Colesterol
          function formatColesterol(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const colesterolElement = document.getElementById('food-detail-colesterol');
          if (foodData.colesterol_mg) {
            colesterolElement.textContent = formatColesterol(foodData.colesterol_mg);
          } else {
            colesterolElement.textContent = '0,00';
          }

          //Calcio
          function formatCalcio(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const calcioElement = document.getElementById('food-detail-calcio');
          if (foodData.calcio_mg) {
            calcioElement.textContent = formatCalcio(foodData.calcio_mg);
          } else {
            calcioElement.textContent = '0,00';
          }

          //FerroT
          function formatFerroT(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const ferroTElement = document.getElementById('food-detail-ferroT');
          if (foodData.ferro_total_mg) {
            ferroTElement.textContent = formatFerroT(foodData.ferro_total_mg);
          } else {
            ferroTElement.textContent = '0,00';
          }

          //FerroH
          function formatFerroH(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const ferroHElement = document.getElementById('food-detail-ferroH');
          if (foodData.ferro_heme_mg) {
            ferroHElement.textContent = formatFerroH(foodData.ferro_heme_mg);
          } else {
            ferroHElement.textContent = '0,00';
          }

          //FerroN
          function formatFerroN(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const ferroNElement = document.getElementById('food-detail-ferroN');
          if (foodData.ferro_n_heme_mg) {
            ferroNElement.textContent = formatFerroN(foodData.ferro_n_heme_mg);
          } else {
            ferroNElement.textContent = '0,00';
          }

          //VitaminaA
          function formatVitaminaA(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaAElement = document.getElementById('food-detail-vitaminaA');
          if (foodData.vitamina_a_mcg) {
            vitaminaAElement.textContent = formatVitaminaA(foodData.vitamina_a_mcg);
          } else {
            vitaminaAElement.textContent = '0,00';
          }

          //VitaminaC
          function formatVitaminaC(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaCElement = document.getElementById('food-detail-vitaminaC');
          if (foodData.vitamina_c_mg) {
            vitaminaCElement.textContent = formatVitaminaC(foodData.vitamina_c_mg);
          } else {
            vitaminaCElement.textContent = '0,00';
          }

          //VitaminaD
          function formatVitaminaD(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaDElement = document.getElementById('food-detail-vitaminaD');
          if (foodData.vitamina_d_mcg) {
            vitaminaDElement.textContent = formatVitaminaD(foodData.vitamina_d_mcg);
          } else {
            vitaminaDElement.textContent = '0,00';
          }

          //VitaminaB12
          function formatVitaminaB12(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB12Element = document.getElementById('food-detail-vitaminaB12');
          if (foodData.vitamina_b12_mcg) {
            vitaminaB12Element.textContent = formatVitaminaB12(foodData.vitamina_b12_mcg);
          } else {
            vitaminaB12Element.textContent = '0,00';
          }

          //VitaminaE
          function formatVitaminaE(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaEElement = document.getElementById('food-detail-vitaminaE');
          if (foodData.vitamina_e_mg) {
            vitaminaEElement.textContent = formatVitaminaE(foodData.vitamina_e_mg);
          } else {
            vitaminaEElement.textContent = '0,00';
          }

          //VitaminaB1
          function formatVitaminaB1(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB1Element = document.getElementById('food-detail-vitaminaB1');
          if (foodData.vitamina_b1_mg) {
            vitaminaB1Element.textContent = formatVitaminaB1(foodData.vitamina_b1_mg);
          } else {
            vitaminaB1Element.textContent = '0,00';
          }

          //VitaminaB2
          function formatVitaminaB2(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB2Element = document.getElementById('food-detail-vitaminaB2');
          if (foodData.vitamina_b2_mg) {
            vitaminaB2Element.textContent = formatVitaminaB2(foodData.vitamina_b2_mg);
          } else {
            vitaminaB2Element.textContent = '0,00';
          }

          //VitaminaB3
          function formatVitaminaB3(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB3Element = document.getElementById('food-detail-vitaminaB3');
          if (foodData.vitamina_b3_mg) {
            vitaminaB3Element.textContent = formatVitaminaB3(foodData.vitamina_b3_mg);
          } else {
            vitaminaB3Element.textContent = '0,00';
          }

          //VitaminaB5
          function formatVitaminaB5(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB5Element = document.getElementById('food-detail-vitaminaB5');
          if (foodData.vitamina_b5_mg) {
            vitaminaB5Element.textContent = formatVitaminaB5(foodData.vitamina_b5_mg);
          } else {
            vitaminaB5Element.textContent = '0,00';
          }

          //VitaminaB6
          function formatVitaminaB6(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB6Element = document.getElementById('food-detail-vitaminaB6');
          if (foodData.vitamina_b6_mg) {
            vitaminaB6Element.textContent = formatVitaminaB6(foodData.vitamina_b6_mg);
          } else {
            vitaminaB6Element.textContent = '0,00';
          }

          //VitaminaB7
          function formatVitaminaB7(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaB7Element = document.getElementById('food-detail-vitaminaB7');
          if (foodData.vitamina_b7_mcg) {
            vitaminaB7Element.textContent = formatVitaminaB7(foodData.vitamina_b7_mcg);
          } else {
            vitaminaB7Element.textContent = '0,00';
          }

          //VitaminaK
          function formatVitaminaK(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const vitaminaKElement = document.getElementById('food-detail-vitaminaK');
          if (foodData.vitamina_k_mcg) {
            vitaminaKElement.textContent = formatVitaminaK(foodData.vitamina_k_mcg);
          } else {
            vitaminaKElement.textContent = '0,00';
          }

          //Cloro
          function formatCloro(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const cloroElement = document.getElementById('food-detail-cloro');
          if (foodData.cloro_mg) {
            cloroElement.textContent = formatCloro(foodData.cloro_mg);
          } else {
            cloroElement.textContent = '0,00';
          }

          //Magnesio
          function formatMagnesio(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const magnesioElement = document.getElementById('food-detail-magnesio');
          if (foodData.magnesio_mg) {
            magnesioElement.textContent = formatMagnesio(foodData.magnesio_mg);
          } else {
            magnesioElement.textContent = '0,00';
          }

          //Zinco
          function formatZinco(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const zincoElement = document.getElementById('food-detail-zinco');
          if (foodData.zinco_mg) {
            zincoElement.textContent = formatZinco(foodData.zinco_mg);
          } else {
            zincoElement.textContent = '0,00';
          }

          //Cobre
          function formatCobre(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const cobreElement = document.getElementById('food-detail-cobre');
          if (foodData.cobre_mg) {
            cobreElement.textContent = formatCobre(foodData.cobre_mg);
          } else {
            cobreElement.textContent = '0,00';
          }

          //Manganes
          function formatManganes(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const manganesElement = document.getElementById('food-detail-manganes');
          if (foodData.manganes_mg) {
            manganesElement.textContent = formatManganes(foodData.manganes_mg);
          } else {
            manganesElement.textContent = '0,00';
          }

          //Selenio
          function formatSelenio(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const selenioElement = document.getElementById('food-detail-selenio');
          if (foodData.selenio_mcg) {
            selenioElement.textContent = formatSelenio(foodData.selenio_mcg);
          } else {
            selenioElement.textContent = '0,00';
          }

          //Iodo
          function formatIodo(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const iodoElement = document.getElementById('food-detail-iodo');
          if (foodData.iodo_mcg) {
            iodoElement.textContent = formatIodo(foodData.iodo_mcg);
          } else {
            iodoElement.textContent = '0,00';
          }

          //Betacaroteno
          function formatBetacaroteno(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const betacarotenoElement = document.getElementById('food-detail-betacaroteno');
          if (foodData.betacaroteno_mcg) {
            betacarotenoElement.textContent = formatBetacaroteno(foodData.betacaroteno_mcg);
          } else {
            betacarotenoElement.textContent = '0,00';
          }

          //Licopeno
          function formatLicopeno(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const licopenoElement = document.getElementById('food-detail-licopeno');
          if (foodData.licopeno_mcg) {
            licopenoElement.textContent = formatLicopeno(foodData.licopeno_mcg);
          } else {
            licopenoElement.textContent = '0,00';
          }

          //Luteina
          function formatLuteina(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const luteinaElement = document.getElementById('food-detail-luteina');
          if (foodData.luteina_zeaxantina_mcg) {
            luteinaElement.textContent = formatLuteina(foodData.luteina_zeaxantina_mcg);
          } else {
            luteinaElement.textContent = '0,00';
          }

          //OmegaS
          function formatOmegaS(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const omegaSElement = document.getElementById('food-detail-omegaS');
          if (foodData.omega_6_g) {
            omegaSElement.textContent = formatOmegaS(foodData.omega_6_g);
          } else {
            omegaSElement.textContent = '0,00';
          }

          //OmegaX
          function formatOmegaX(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const omegaXElement = document.getElementById('food-detail-omegaX');
          if (foodData.om6_x_om3) {
            omegaXElement.textContent = formatOmegaX(foodData.om6_x_om3);
          } else {
            omegaXElement.textContent = '0,00';
          }

          //Fitosterol
          function formatFitosterol(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const fitosterolElement = document.getElementById('food-detail-fitosterol');
          if (foodData.fitosterol_mg) {
            fitosterolElement.textContent = formatFitosterol(foodData.fitosterol_mg);
          } else {
            fitosterolElement.textContent = '0,00';
          }

          //CarboidratosL
          function formatCarboidratosL(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const carboidratosLElement = document.getElementById('food-detail-carboidratosL');
          if (foodData.carboidratos_liquidos_g) {
            carboidratosLElement.textContent = formatCarboidratosL(foodData.carboidratos_liquidos_g);
          } else {
            carboidratosLElement.textContent = '0,00';
          }

          //Poliois
          function formatPoliois(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const polioisElement = document.getElementById('food-detail-poliois');
          if (foodData.poliois_g) {
            polioisElement.textContent = formatPoliois(foodData.poliois_g);
          } else {
            polioisElement.textContent = '0,00';
          }

          //Aminoacidos
          function formatAminoacidos(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const aminoacidosElement = document.getElementById('food-detail-aminoacidos');
          if (foodData.perfil_aminoacidos_ess_mg) {
            aminoacidosElement.textContent = formatAminoacidos(foodData.perfil_aminoacidos_ess_mg);
          } else {
            aminoacidosElement.textContent = '0,00';
          }

          //IndicePDCAAS
          function formatIndicePDCAAS(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const indicePDCAASElement = document.getElementById('food-detail-indicePDCAAS');
          if (foodData.indice_quality_proteinas_pdcaas) {
            indicePDCAASElement.textContent = formatIndicePDCAAS(foodData.indice_quality_proteinas_pdcaas);
          } else {
            indicePDCAASElement.textContent = '0,00';
          }

          //Prals
          function formatPral(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const pralElement = document.getElementById('food-detail-pral');
          if (foodData.pral_meq) {
            pralElement.textContent = formatPral(foodData.pral_meq);
          } else {
            pralElement.textContent = '0,00';
          }

          //AcidoF
          function formatAcidoF(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const acidoFElement = document.getElementById('food-detail-acidoF');
          if (foodData.acido_folico_mcg) {
            acidoFElement.textContent = formatAcidoF(foodData.acido_folico_mcg);
          } else {
            acidoFElement.textContent = '0,00';
          }

          //Polifenol
          function formatPolifenol(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const polifenolElement = document.getElementById('food-detail-polifenol');
          if (foodData.polifenol_total_mg) {
            polifenolElement.textContent = formatPolifenol(foodData.polifenol_total_mg);
          } else {
            polifenolElement.textContent = '0,00';
          }

          //CargaAn
          function formatCargaAn(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const cargaAnElement = document.getElementById('food-detail-cargaAn');
          if (foodData.carga_antioxidante_orac) {
            cargaAnElement.textContent = formatCargaAn(foodData.carga_antioxidante_orac);
          } else {
            cargaAnElement.textContent = '0,00';
          }

          //TeorAl
          function formatTeorAl(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const teorAlElement = document.getElementById('food-detail-teorAl');
          if (foodData.teor_alcool_prcent) {
            teorAlElement.textContent = formatTeorAl(foodData.teor_alcool_prcent);
          } else {
            teorAlElement.textContent = '0,00';
          }

          //TeorAgua
          function formatTeorAgua(value) {
            const num = parseFloat(value || 0);
            return num.toFixed(2).replace('.', ',');
          }
          const teorAguaElement = document.getElementById('food-detail-teorAgua');
          if (foodData.teor_agua_g) {
            teorAguaElement.textContent = formatTeorAgua(foodData.teor_agua_g);
          } else {
            teorAguaElement.textContent = '0,00';
          }

          
          //======FIM PRIMEIRO PASSO BLOCO 2 - DETALHES======

          //======SEGUNDO PASSO BLOCO 2 - DETALHES======
          //Recalculo Calorias
          const baseCalories = parseFloat(foodData.caloria_kcal) || 0;
          const baseProteinas = parseFloat(foodData.proteinas_g) || 0;
          const baseCarboidratos = parseFloat(foodData.carboidratos_g) || 0;
          const baseGordurasT = parseFloat(foodData.gorduras_totais_g) || 0;
          const baseFibras = parseFloat(foodData.fibras_g) || 0;
          const baseGordurasSat = parseFloat(foodData.gorduras_saturadas_g) || 0;
          const baseMono = parseFloat(foodData.gorduras_monoinsaturadas_g) || 0;
          const basePoly = parseFloat(foodData.gorduras_poliinsaturadas_g) || 0;
          const baseTrans = parseFloat(foodData.gorduras_trans_g) || 0;
          const baseOmegaT = parseFloat(foodData.omega_3_g) || 0;
          const baseAcucarT = parseFloat(foodData.acucares_totais_g) || 0;
          const baseAcucarN = parseFloat(foodData.acucares_naturais_g) || 0;
          const baseAcucarAdd = parseFloat(foodData.acucares_adicionados_g) || 0;
          const baseIndiceG = parseFloat(foodData.indice_glicemico) || 0;
          const baseCargaG = parseFloat(foodData.carga_glicemica_g) || 0;
          const baseSodio = parseFloat(foodData.sodio_mg) || 0;
          const basePotassio = parseFloat(foodData.potassio_mg) || 0;
          const baseColesterol = parseFloat(foodData.colesterol_mg) || 0;
          const baseCalcio = parseFloat(foodData.calcio_mg) || 0;
          const baseFerroT = parseFloat(foodData.ferro_total_mg) || 0;
          const baseFerroH = parseFloat(foodData.ferro_heme_mg) || 0;
          const baseFerroN = parseFloat(foodData.ferro_n_heme_mg) || 0;
          const baseVitaminaA = parseFloat(foodData.vitamina_a_mcg) || 0;
          const baseVitaminaC = parseFloat(foodData.vitamina_c_mg) || 0;
          const baseVitaminaD = parseFloat(foodData.vitamina_d_mcg) || 0;
          const baseVitaminaB12 = parseFloat(foodData.vitamina_b12_mcg) || 0;
          const baseVitaminaE = parseFloat(foodData.vitamina_e_mg) || 0;
          const baseVitaminaB1 = parseFloat(foodData.vitamina_b1_mg) || 0;
          const baseVitaminaB2 = parseFloat(foodData.vitamina_b2_mg) || 0;
          const baseVitaminaB3 = parseFloat(foodData.vitamina_b3_mg) || 0;
          const baseVitaminaB5 = parseFloat(foodData.vitamina_b5_mg) || 0;
          const baseVitaminaB6 = parseFloat(foodData.vitamina_b6_mg) || 0;
          const baseVitaminaB7 = parseFloat(foodData.vitamina_b7_mcg) || 0;
          const baseVitaminaK = parseFloat(foodData.vitamina_k_mcg) || 0;
          const baseCloro = parseFloat(foodData.cloro_mg) || 0;
          const baseMagnesio = parseFloat(foodData.magnesio_mg) || 0;
          const baseZinco = parseFloat(foodData.zinco_mg) || 0;
          const baseCobre = parseFloat(foodData.cobre_mg) || 0;
          const baseManganes = parseFloat(foodData.manganes_mg) || 0;
          const baseSelenio = parseFloat(foodData.selenio_mcg) || 0;
          const baseIodo = parseFloat(foodData.iodo_mcg) || 0;
          const baseBetacaroteno = parseFloat(foodData.betacaroteno_mcg) || 0;
          const baseLicopeno = parseFloat(foodData.licopeno_mcg) || 0;
          const baseLuteina = parseFloat(foodData.luteina_zeaxantina_mcg) || 0;
          const baseOmegaS = parseFloat(foodData.omega_6_g) || 0;
          const baseOmegaX = parseFloat(foodData.om6_x_om3) || 0;
          const baseFitosterol = parseFloat(foodData.fitosterol_mg) || 0;
          const baseCarboidratosL = parseFloat(foodData.carboidratos_liquidos_g) || 0;
          const basePoliois = parseFloat(foodData.poliois_g) || 0;
          const baseAminoacidos = parseFloat(foodData.perfil_aminoacidos_ess_mg) || 0;
          const baseIndicePDCAAS = parseFloat(foodData.indice_quality_proteinas_pdcaas) || 0;
          const basePral = parseFloat(foodData.pral_meq) || 0;
          const baseAcidoF = parseFloat(foodData.acido_folico_mcg) || 0;
          const basePolifenol = parseFloat(foodData.polifenol_total_mg) || 0;
          const baseCargaAn = parseFloat(foodData.carga_antioxidante_orac) || 0;
          const baseTeorAl = parseFloat(foodData.teor_alcool_prcent) || 0;
          const baseTeorAgua = parseFloat(foodData.teor_agua_g) || 0;

          //======FIM SEGUNDO PASSO BLOCO 2 - DETALHES======

          //======TERCEIRO PASSO BLOCO 2 - DETALHES======
          // Função para recalcular TUDO quando a porção mudar
          function updateNutritionValues() {
            const portion = parseFloat(document.getElementById('food-detail-portion').value.replace(',', '.')) || 100;
            const factor = portion / 100;
            document.getElementById('food-detail-calories').textContent = formatCalories(baseCalories * factor);
            document.getElementById('food-detail-proteinas').textContent = formatProteinas(baseProteinas * factor);
            document.getElementById('food-detail-carboidratos').textContent = formatCarboidratos(baseCarboidratos * factor);
            document.getElementById('food-detail-gordurasT').textContent = formatGordurasT(baseGordurasT * factor);
            document.getElementById('food-detail-fibras').textContent = formatFibras(baseFibras * factor);
            document.getElementById('food-detail-gSat').textContent = formatGordurasT(baseGordurasSat * factor);
            document.getElementById('food-detail-mono').textContent = formatMono(baseMono * factor);
            document.getElementById('food-detail-poly').textContent = formatPoly(basePoly * factor);
            document.getElementById('food-detail-trans').textContent = formatTrans(baseTrans * factor);
            document.getElementById('food-detail-omegaT').textContent = formatOmegaT(baseOmegaT * factor);
            document.getElementById('food-detail-acucarT').textContent = formatAcucarT(baseAcucarT * factor);
            document.getElementById('food-detail-acucarN').textContent = formatAcucarN(baseAcucarN * factor);
            document.getElementById('food-detail-acucarAdd').textContent = formatAcucarAdd(baseAcucarAdd * factor);
            document.getElementById('food-detail-indiceG').textContent = formatIndiceG(baseIndiceG * factor);
            document.getElementById('food-detail-cargaG').textContent = formatCargaG(baseCargaG * factor);
            document.getElementById('food-detail-sodio').textContent = formatSodio(baseSodio * factor);
            document.getElementById('food-detail-potassio').textContent = formatPotassio(basePotassio * factor);
            document.getElementById('food-detail-colesterol').textContent = formatColesterol(baseColesterol * factor);
            document.getElementById('food-detail-calcio').textContent = formatCalcio(baseCalcio * factor);
            document.getElementById('food-detail-ferroT').textContent = formatFerroT(baseFerroT * factor);
            document.getElementById('food-detail-ferroH').textContent = formatFerroH(baseFerroH * factor);
            document.getElementById('food-detail-ferroN').textContent = formatFerroN(baseFerroN * factor);
            document.getElementById('food-detail-vitaminaA').textContent = formatVitaminaA(baseVitaminaA * factor);
            document.getElementById('food-detail-vitaminaC').textContent = formatVitaminaC(baseVitaminaC * factor);
            document.getElementById('food-detail-vitaminaD').textContent = formatVitaminaD(baseVitaminaD * factor);
            document.getElementById('food-detail-vitaminaB12').textContent = formatVitaminaB12(baseVitaminaB12 * factor);
            document.getElementById('food-detail-vitaminaE').textContent = formatVitaminaE(baseVitaminaE * factor);
            document.getElementById('food-detail-vitaminaB1').textContent = formatVitaminaB1(baseVitaminaB1 * factor);
            document.getElementById('food-detail-vitaminaB2').textContent = formatVitaminaB2(baseVitaminaB2 * factor);
            document.getElementById('food-detail-vitaminaB3').textContent = formatVitaminaB3(baseVitaminaB3 * factor);
            document.getElementById('food-detail-vitaminaB5').textContent = formatVitaminaB5(baseVitaminaB5 * factor);
            document.getElementById('food-detail-vitaminaB6').textContent = formatVitaminaB6(baseVitaminaB6 * factor);
            document.getElementById('food-detail-vitaminaB7').textContent = formatVitaminaB7(baseVitaminaB7 * factor);
            document.getElementById('food-detail-vitaminaK').textContent = formatVitaminaK(baseVitaminaK * factor);
            document.getElementById('food-detail-cloro').textContent = formatCloro(baseCloro * factor);
            document.getElementById('food-detail-magnesio').textContent = formatMagnesio(baseMagnesio * factor);
            document.getElementById('food-detail-zinco').textContent = formatZinco(baseZinco * factor);
            document.getElementById('food-detail-cobre').textContent = formatCobre(baseCobre * factor);
            document.getElementById('food-detail-manganes').textContent = formatManganes(baseManganes * factor);
            document.getElementById('food-detail-selenio').textContent = formatSelenio(baseSelenio * factor);
            document.getElementById('food-detail-iodo').textContent = formatIodo(baseIodo * factor);
            document.getElementById('food-detail-betacaroteno').textContent = formatBetacaroteno(baseBetacaroteno * factor);
            document.getElementById('food-detail-licopeno').textContent = formatLicopeno(baseLicopeno * factor);
            document.getElementById('food-detail-luteina').textContent = formatLuteina(baseLuteina * factor);
            document.getElementById('food-detail-omegaS').textContent = formatOmegaS(baseOmegaS * factor);
            document.getElementById('food-detail-omegaX').textContent = formatOmegaX(baseOmegaX * factor);
            document.getElementById('food-detail-fitosterol').textContent = formatFitosterol(baseFitosterol * factor);
            document.getElementById('food-detail-carboidratosL').textContent = formatCarboidratosL(baseCarboidratosL * factor);
            document.getElementById('food-detail-poliois').textContent = formatPoliois(basePoliois * factor);
            document.getElementById('food-detail-aminoacidos').textContent = formatAminoacidos(baseAminoacidos * factor);
            document.getElementById('food-detail-indicePDCAAS').textContent = formatIndicePDCAAS(baseIndicePDCAAS * factor);
            document.getElementById('food-detail-pral').textContent = formatPral(basePral * factor);
            document.getElementById('food-detail-acidoF').textContent = formatAcidoF(baseAcidoF * factor);
            document.getElementById('food-detail-polifenol').textContent = formatPolifenol(basePolifenol * factor);
            document.getElementById('food-detail-cargaAn').textContent = formatCargaAn(baseCargaAn * factor);
            document.getElementById('food-detail-teorAl').textContent = formatTeorAl(baseTeorAl * factor);
            document.getElementById('food-detail-teorAgua').textContent = formatTeorAgua(baseTeorAgua * factor);
          }
          //======FIM TERCEIRO PASSO BLOCO 2 - DETALHES======
          // Configura os eventos no campo de porção
          portionInput.addEventListener('input', function() {
            // Permite apenas números e no máximo uma vírgula
            this.value = this.value.replace(/[^0-9,]/g, '')  // Remove tudo que não for número
              .replace(/(,.*?),/g, '$1'); // Permite só uma vírgula
              
            updateNutritionValues(); // Mantém o cálculo
          });
          portionInput.addEventListener('change', updateNutritionValues);

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
  //Fim Criação dos Campos "Calorias", "Proteinas", "Carboidratos" e "Gorduras Totais"

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

  //Criação Campos Bloco 2
  function createFatFields() {
    // Validação numérica (igual aos outros campos)
    document.getElementById('food-mono-fat').addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9,]/g, '').replace(/(,.*?),/g, '$1');
    });
    document.getElementById('food-poly-fat').addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9,]/g, '').replace(/(,.*?),/g, '$1');
    });
    document.getElementById('food-sat-fat').addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9,]/g, '').replace(/(,.*?),/g, '$1');
    });
    document.getElementById('food-trans-fat').addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9,]/g, '').replace(/(,.*?),/g, '$1');
    });

    //PASSO 4 CADASTRO
    const camposParaValidar = [
      'food-fibras', 'food-sodio', 
      'food-acucarT', 'food-acucarN', 'food-acucarAdd',
      'food-indiceG', 'food-cargaG', 'food-teorAgua',
      'food-colesterol', 'food-ferrtoT', 'food-ferroH', 'food-ferroN',
      'food-omegaT', 'food-calcio', 'food-magnesio', 'food-zinco', 'food-potassio',
      'food-vitaminaA', 'food-vitaminaB12', 'food-vitaminaC', 'food-vitaminaD',
      'food-vitaminaE', 'food-vitaminaK', 'food-vitaminaB1', 'food-vitaminaB2',
      'food-vitaminaB3', 'food-vitaminaB5', 'food-vitaminaB6', 'food-vitaminaB7',
      'food-omegaS', 'food-fitosterol', 'food-cloro', 'food-pral', 'food-poliois',
      'food-carboidratosL', 'food-indicePDCAAS', 'food-aminoacidos', 'food-cobre', 'food-manganes',
      'food-selenio', 'food-iodo', 'food-betacaroteno', 'food-licopeno', 'food-luteina',
      'food-acidoF', 'food-polifenol', 'food-cargaAn', 'food-teorAl'
    ];

    camposParaValidar.forEach(id => {
      document.getElementById(id)?.addEventListener('input', function() {
        this.value = this.value.replace(/[^0-9,]/g, '').replace(/(,.*?),/g, '$1');
      });
    });
    //FIM PASSO 4 CADASTRO

  }
  //Fim Criação Campos Bloco 2

  // Função para criar e gerenciar o campo de alérgenos
  function setupAlergenosField() {
    const trigger = document.querySelector('.alergenos-trigger');
    const dropdown = document.querySelector('.alergenos-dropdown');
    const tagsContainer = document.querySelector('.alergenos-tags');

    if (!trigger || !dropdown) {
      console.error('Elementos do campo alérgenos não encontrados');
      return;
    }

    // Fecha dropdown ao clicar fora (EVENTO MODIFICADO)
    const closeDropdownOnClickOutside = (e) => {
      if (!e.target.closest('.alergenos-select')) {
        dropdown.classList.remove('visible');
      }
    };

    // Remove event listener anterior se existir
    document.removeEventListener('click', closeDropdownOnClickOutside);
    
    // Configura eventos (FUNÇÃO REVISADA)
    function setupEvents() {
      // Abre/fecha dropdown
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        positionDropdown();
        dropdown.classList.toggle('visible');
      });

      // Seleção de opção
      dropdown.addEventListener('click', (e) => {
        const option = e.target.closest('.alergenos-option');
        if (!option) return;

        const id = option.dataset.id;
        const name = option.textContent;

        if (selectedAlergenos.length >= 5 && !option.classList.contains('selected')) {
          alert('Máximo de 5 alérgenos selecionados');
          return;
        }

        option.classList.toggle('selected');
        
        if (option.classList.contains('selected')) {
          selectedAlergenos.push({ id, name });
        } else {
          selectedAlergenos = selectedAlergenos.filter(a => a.id !== id);
        }

        updateTags();
      });

      // Adiciona novo event listener para fechar ao clicar fora
      document.addEventListener('click', closeDropdownOnClickOutside);
    }

    // Atualiza tags visíveis (MESMA FUNÇÃO)
    function updateTags() {
      tagsContainer.innerHTML = selectedAlergenos.map(alergeno => `
        <div class="alergeno-tag" data-id="${alergeno.id}">
          ${alergeno.name}
          <span class="alergeno-tag-remove">&times;</span>
        </div>
      `).join('');

      // Adiciona eventos de remoção
      document.querySelectorAll('.alergeno-tag-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const tag = e.target.closest('.alergeno-tag');
          const id = tag.dataset.id;
          
          selectedAlergenos = selectedAlergenos.filter(a => a.id !== id);
          updateTags();
          
          const option = dropdown.querySelector(`[data-id="${id}"]`);
          if (option) option.classList.remove('selected');
        });
      });
    }

    // Posiciona o dropdown corretamente (MESMA FUNÇÃO)
    function positionDropdown() {
      const rect = trigger.getBoundingClientRect();
      dropdown.style.left = `${rect.left}px`;
      dropdown.style.top = `${rect.bottom}px`;
      dropdown.style.width = `${rect.width}px`;
    }

    // Inicializa (AGORA COM TRY-CATCH)
    try {
      loadOptions();
    } catch (error) {
      console.error('Erro ao inicializar campo alérgenos:', error);
    }

    // Função para carregar opções (MESMA FUNÇÃO)
    async function loadOptions() {
      try {
        const response = await fetch('/api/alergenos');
        const data = await response.json();
        
        dropdown.innerHTML = data.map(item => `
          <div class="alergenos-option" data-id="${item.id}">
            ${item.nome}
          </div>
        `).join('');
        
        setupEvents();
      } catch (error) {
        console.error('Erro ao carregar alérgenos:', error);
      }
    }
  }

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

    //CAMPO ALERGENOS
    const id_alergenos = Array.from(document.querySelectorAll('.alergenos-option.selected'))
      .map(opt => opt.dataset.id)
      .join(';');
    //FIM CAMPO ALERGENOS


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

    //======PRIMEIRO PASSO BLOCO 2======
    const nutritionValues = {
      calories: getNutritionValue('food-calories'),
      protein: getNutritionValue('food-protein'),
      carbs: getNutritionValue('food-carbs'),
      fat: getNutritionValue('food-fat'),
        // NOVOS CAMPOS (Bloco 2)
      monoFat: getNutritionValue('food-mono-fat') || 0,  // Se não preenchido, assume 0
      polyFat: getNutritionValue('food-poly-fat') || 0,   // Se não preenchido, assume 0
      satFat: getNutritionValue('food-sat-fat') || 0,  // Se não preenchido, assume 0
      transFat: getNutritionValue('food-trans-fat') || 0,   // Se não preenchido, assume 0
      fibras: getNutritionValue('food-fibras') || 0,   // Se não preenchido, assume 0
      sodio: getNutritionValue('food-sodio') || 0,   // Se não preenchido, assume 0
      acucarT: getNutritionValue('food-acucarT') || 0,
      acucarN: getNutritionValue('food-acucarN') || 0,
      acucarAdd: getNutritionValue('food-acucarAdd') || 0,
      indiceG: getNutritionValue('food-indiceG') || 0,
      cargaG: getNutritionValue('food-cargaG') || 0,
      teorAgua: getNutritionValue('food-teorAgua') || 0,
      colesterol: getNutritionValue('food-colesterol') || 0,
      ferrtoT: getNutritionValue('food-ferrtoT') || 0,
      ferroH: getNutritionValue('food-ferroH') || 0,
      ferroN: getNutritionValue('food-ferroN') || 0,
      omegaT: getNutritionValue('food-omegaT') || 0,
      calcio: getNutritionValue('food-calcio') || 0,
      magnesio: getNutritionValue('food-magnesio') || 0,
      zinco: getNutritionValue('food-zinco') || 0,
      potassio: getNutritionValue('food-potassio') || 0,
      vitaminaA: getNutritionValue('food-vitaminaA') || 0,
      vitaminaB12: getNutritionValue('food-vitaminaB12') || 0,
      vitaminaC: getNutritionValue('food-vitaminaC') || 0,
      vitaminaD: getNutritionValue('food-vitaminaD') || 0,
      vitaminaE: getNutritionValue('food-vitaminaE') || 0,
      vitaminaK: getNutritionValue('food-vitaminaK') || 0,
      vitaminaB1: getNutritionValue('food-vitaminaB1') || 0,
      vitaminaB2: getNutritionValue('food-vitaminaB2') || 0,
      vitaminaB3: getNutritionValue('food-vitaminaB3') || 0,
      vitaminaB5: getNutritionValue('food-vitaminaB5') || 0,
      vitaminaB6: getNutritionValue('food-vitaminaB6') || 0,
      vitaminaB7: getNutritionValue('food-vitaminaB7') || 0,
      omegaS: getNutritionValue('food-omegaS') || 0,
      fitosterol: getNutritionValue('food-fitosterol') || 0,
      cloro: getNutritionValue('food-cloro') || 0,
      pral: getNutritionValue('food-pral') || 0,
      poliois: getNutritionValue('food-poliois') || 0,
      carboidratosL: getNutritionValue('food-carboidratosL') || 0,
      indicePDCAAS: getNutritionValue('food-indicePDCAAS') || 0,
      aminoacidos: getNutritionValue('food-aminoacidos') || 0,
      cobre: getNutritionValue('food-cobre') || 0,
      manganes: getNutritionValue('food-manganes') || 0,
      selenio: getNutritionValue('food-selenio') || 0,
      iodo: getNutritionValue('food-iodo') || 0,
      betacaroteno: getNutritionValue('food-betacaroteno') || 0,
      licopeno: getNutritionValue('food-licopeno') || 0,
      luteina: getNutritionValue('food-luteina') || 0,
      acidoF: getNutritionValue('food-acidoF') || 0,
      polifenol: getNutritionValue('food-polifenol') || 0,
      cargaAn: getNutritionValue('food-cargaAn') || 0,
      teorAl: getNutritionValue('food-teorAl') || 0
    };
    //======FIM PRIMEIRO PASSO BLOCO 2======

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
        fat: (nutritionValues.fat * proportionFactor).toFixed(2),
        // NOVOS CAMPOS (mesmo fator de proporção)
        //======SEGUNDO PASSO BLOCO 2======
        monoFat: (nutritionValues.monoFat * proportionFactor).toFixed(2),
        polyFat: (nutritionValues.polyFat * proportionFactor).toFixed(2),
        satFat: (nutritionValues.satFat * proportionFactor).toFixed(2),
        transFat: (nutritionValues.transFat * proportionFactor).toFixed(2),
        fibras: (nutritionValues.fibras * proportionFactor).toFixed(2),
        sodio: (nutritionValues.sodio * proportionFactor).toFixed(2),
        fibras: (nutritionValues.fibras * proportionFactor).toFixed(2),
        acucarT: (nutritionValues.acucarT * proportionFactor).toFixed(2),
        acucarN: (nutritionValues.acucarN * proportionFactor).toFixed(2),
        acucarAdd: (nutritionValues.acucarAdd * proportionFactor).toFixed(2),
        indiceG: (nutritionValues.indiceG * proportionFactor).toFixed(2),
        cargaG: (nutritionValues.cargaG * proportionFactor).toFixed(2),
        teorAgua: (nutritionValues.teorAgua * proportionFactor).toFixed(2),
        colesterol: (nutritionValues.colesterol * proportionFactor).toFixed(2),
        ferrtoT: (nutritionValues.ferrtoT * proportionFactor).toFixed(2),
        ferroH: (nutritionValues.ferroH * proportionFactor).toFixed(2),
        ferroN: (nutritionValues.ferroN * proportionFactor).toFixed(2),
        omegaT: (nutritionValues.omegaT * proportionFactor).toFixed(2),
        calcio: (nutritionValues.calcio * proportionFactor).toFixed(2),
        magnesio: (nutritionValues.magnesio * proportionFactor).toFixed(2),
        zinco: (nutritionValues.zinco * proportionFactor).toFixed(2),
        potassio: (nutritionValues.potassio * proportionFactor).toFixed(2),
        vitaminaA: (nutritionValues.vitaminaA * proportionFactor).toFixed(2),
        vitaminaB12: (nutritionValues.vitaminaB12 * proportionFactor).toFixed(2),
        vitaminaC: (nutritionValues.vitaminaC * proportionFactor).toFixed(2),
        vitaminaD: (nutritionValues.vitaminaD * proportionFactor).toFixed(2),
        vitaminaE: (nutritionValues.vitaminaE * proportionFactor).toFixed(2),
        vitaminaK: (nutritionValues.vitaminaK * proportionFactor).toFixed(2),
        vitaminaB1: (nutritionValues.vitaminaB1 * proportionFactor).toFixed(2),
        vitaminaB2: (nutritionValues.vitaminaB2 * proportionFactor).toFixed(2),
        vitaminaB3: (nutritionValues.vitaminaB3 * proportionFactor).toFixed(2),
        vitaminaB5: (nutritionValues.vitaminaB5 * proportionFactor).toFixed(2),
        vitaminaB6: (nutritionValues.vitaminaB6 * proportionFactor).toFixed(2),
        vitaminaB7: (nutritionValues.vitaminaB7 * proportionFactor).toFixed(2),
        omegaS: (nutritionValues.omegaS * proportionFactor).toFixed(2),
        fitosterol: (nutritionValues.fitosterol * proportionFactor).toFixed(2),
        cloro: (nutritionValues.cloro * proportionFactor).toFixed(2),
        pral: (nutritionValues.pral * proportionFactor).toFixed(2),
        poliois: (nutritionValues.poliois * proportionFactor).toFixed(2),
        carboidratosL: (nutritionValues.carboidratosL * proportionFactor).toFixed(2),
        indicePDCAAS: (nutritionValues.indicePDCAAS * proportionFactor).toFixed(2),
        aminoacidos: (nutritionValues.aminoacidos * proportionFactor).toFixed(2),
        cobre: (nutritionValues.cobre * proportionFactor).toFixed(2),
        manganes: (nutritionValues.manganes * proportionFactor).toFixed(2),
        selenio: (nutritionValues.selenio * proportionFactor).toFixed(2),
        iodo: (nutritionValues.iodo * proportionFactor).toFixed(2),
        betacaroteno: (nutritionValues.betacaroteno * proportionFactor).toFixed(2),
        licopeno: (nutritionValues.licopeno * proportionFactor).toFixed(2),
        luteina: (nutritionValues.luteina * proportionFactor).toFixed(2),
        acidoF: (nutritionValues.acidoF * proportionFactor).toFixed(2),
        polifenol: (nutritionValues.polifenol * proportionFactor).toFixed(2),
        cargaAn: (nutritionValues.cargaAn * proportionFactor).toFixed(2),
        teorAl: (nutritionValues.teorAl * proportionFactor).toFixed(2)
      };
      //======FIM SEGUNDO PASSO BLOCO 2======

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
      // Junto com os outros campos nutricionais (linha ~600)
      //======TERCEIRO PASSO BLOCO 2======
      formData.append('gorduras_monoinsaturadas_g', calculatedValues.monoFat);
      formData.append('gorduras_poliinsaturadas_g', calculatedValues.polyFat);
      formData.append('gorduras_saturadas_g', calculatedValues.satFat);
      formData.append('gorduras_trans_g', calculatedValues.transFat);
      formData.append('fibras_g', calculatedValues.fibras);
      formData.append('sodio_mg', calculatedValues.sodio);
      formData.append('fibras_g', calculatedValues.fibras);
      formData.append('acucares_totais_g', calculatedValues.acucarT);
      formData.append('acucares_naturais_g', calculatedValues.acucarN);
      formData.append('acucares_adicionados_g', calculatedValues.acucarAdd);
      formData.append('indice_glicemico', calculatedValues.indiceG);
      formData.append('carga_glicemica_g', calculatedValues.cargaG);
      formData.append('teor_agua_g', calculatedValues.teorAgua);
      formData.append('colesterol_mg', calculatedValues.colesterol);
      formData.append('ferro_total_mg', calculatedValues.ferrtoT);
      formData.append('ferro_heme_mg', calculatedValues.ferroH);
      formData.append('ferro_n_heme_mg', calculatedValues.ferroN);
      formData.append('omega_3_g', calculatedValues.omegaT);
      formData.append('calcio_mg', calculatedValues.calcio);
      formData.append('magnesio_mg', calculatedValues.magnesio);
      formData.append('zinco_mg', calculatedValues.zinco);
      formData.append('potassio_mg', calculatedValues.potassio);
      formData.append('vitamina_a_mcg', calculatedValues.vitaminaA);
      formData.append('vitamina_b12_mcg', calculatedValues.vitaminaB12);
      formData.append('vitamina_c_mg', calculatedValues.vitaminaC);
      formData.append('vitamina_d_mcg', calculatedValues.vitaminaD);
      formData.append('vitamina_e_mg', calculatedValues.vitaminaE);
      formData.append('vitamina_k_mcg', calculatedValues.vitaminaK);
      formData.append('vitamina_b1_mg', calculatedValues.vitaminaB1);
      formData.append('vitamina_b2_mg', calculatedValues.vitaminaB2);
      formData.append('vitamina_b3_mg', calculatedValues.vitaminaB3);
      formData.append('vitamina_b5_mg', calculatedValues.vitaminaB5);
      formData.append('vitamina_b6_mg', calculatedValues.vitaminaB6);
      formData.append('vitamina_b7_mcg', calculatedValues.vitaminaB7);
      formData.append('omega_6_g', calculatedValues.omegaS);
      formData.append('fitosterol_mg', calculatedValues.fitosterol);
      formData.append('cloro_mg', calculatedValues.cloro);
      formData.append('pral_meq', calculatedValues.pral);
      formData.append('poliois_g', calculatedValues.poliois);
      formData.append('carboidratos_liquidos_g', calculatedValues.carboidratosL);
      formData.append('indice_quality_proteinas_pdcaas', calculatedValues.indicePDCAAS);
      formData.append('perfil_aminoacidos_ess_mg', calculatedValues.aminoacidos);
      formData.append('cobre_mg', calculatedValues.cobre);
      formData.append('manganes_mg', calculatedValues.manganes);
      formData.append('selenio_mcg', calculatedValues.selenio);
      formData.append('iodo_mcg', calculatedValues.iodo);
      formData.append('betacaroteno_mcg', calculatedValues.betacaroteno);
      formData.append('licopeno_mcg', calculatedValues.licopeno);
      formData.append('luteina_zeaxantina_mcg', calculatedValues.luteina);
      formData.append('acido_folico_mcg', calculatedValues.acidoF);
      formData.append('polifenol_total_mg', calculatedValues.polifenol);
      formData.append('carga_antioxidante_orac', calculatedValues.cargaAn);
      formData.append('teor_alcool_prcent', calculatedValues.teorAl);
      //======FIM TERCEIRO PASSO BLOCO 2======

      //CAMPO ALERGENO
      formData.append('id_alergenos', id_alergenos);
      //FIM CAMPO ALERGENO

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
      'food-calories', 'food-protein', 'food-carbs', 'food-fat',
      'food-mono-fat', 'food-poly-fat', 'food-sat-fat', 'food-trans-fat',
      'food-fibras', 'food-sodio', 'food-acucarT', 'food-acucarN', 'food-acucarAdd', 'food-indiceG', 'food-cargaG', 
      'food-teorAgua', 'food-colesterol', 'food-ferrtoT', 'food-ferroH', 'food-ferroN', 'food-omegaT', 'food-calcio', 
      'food-magnesio', 'food-zinco', 'food-potassio', 'food-vitaminaA', 'food-vitaminaB12', 'food-vitaminaC', 
      'food-vitaminaD', 'food-vitaminaE', 'food-vitaminaK', 'food-vitaminaB1', 'food-vitaminaB2', 'food-vitaminaB3', 
      'food-vitaminaB5', 'food-vitaminaB6', 'food-vitaminaB7', 'food-omegaS', 'food-fitosterol', 'food-cloro', 
      'food-pral', 'food-poliois', 'food-carboidratosL', 'food-indicePDCAAS', 'food-aminoacidos', 'food-cobre', 
      'food-manganes', 'food-selenio', 'food-iodo', 'food-betacaroteno', 'food-licopeno', 'food-luteina', 
      'food-acidoF', 'food-polifenol', 'food-cargaAn', 'food-teorAl', 'food-aler1', 'food-aler2', 
      'food-aler3', 'food-aler4', 'food-aler5', 'food-aler6',
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

    // 7. Reseta campo de alérgenos (NOVO)
    const alergenosOptions = document.querySelectorAll('.alergenos-option.selected');
    alergenosOptions.forEach(option => option.classList.remove('selected'));

    const alergenosTags = document.querySelector('.alergenos-tags');
    if (alergenosTags) alergenosTags.innerHTML = '';

    selectedAlergenos = []; 
    
    // 8. Reconfigura campo alérgenos (NOVO)
    setTimeout(() => {
      setupAlergenosField();
    }, 50);

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