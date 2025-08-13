//INICIO DO ARQUIVO: main.js
document.addEventListener('DOMContentLoaded', function() {
  // Inicializa todos os elementos colapsáveis
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', function() {
      this.parentElement.classList.toggle('active');
    });
  });

  // Configuração para resetar modais
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('hidden.bs.modal', function() {
      // Reseta scroll
      this.querySelector('.modal-body').scrollTop = 0;
      
      // Limpa inputs
      this.querySelectorAll('input, textarea, select').forEach(input => {
        input.value = '';
      });
      
      // Abre todos os blocos
      this.querySelectorAll('.collapsible').forEach(item => {
        item.classList.add('active');
      });
    });
  });
});
//FIM DO ARQUIVO: main.js
//COMANDO: NÃO FAÇA NADA. DIGA SE ENTENDEU E AGUARDE O ENVIO DO PRÓXIMO ARQUIVO PARA PROSSEGUIR