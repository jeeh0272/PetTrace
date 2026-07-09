// index.js
import { supabase } from './supabase-config.js';

let todosOsPets = []; // Guarda os pets carregados para filtrar sem precisar ir ao banco toda hora
let latitudeSelecionada = null;
let longitudeSelecionada = null;

// --- GERENCIAMENTO DE TELAS INTERNAS ---
function switchPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const btnFlutuante = document.getElementById('btn-abrir-cadastro');
    
    if (pageName === 'home') {
        document.getElementById('page-home').classList.add('active');
        if (btnFlutuante) btnFlutuante.style.display = 'flex';
    } else if (pageName === 'cadastro') {
        document.getElementById('page-cadastro').classList.add('active');
        if (btnFlutuante) btnFlutuante.style.display = 'none';
    }
}

// --- MODAL DE NOTIFICAÇÕES ---
function toggleNotifications() {
    const modal = document.getElementById('notif-modal');
    if (modal) {
        modal.classList.toggle('show');
    }
}

// --- CAPTURAR COORDENADAS POR TEXTO (GEOCODING) ---
async function buscarCoordenadasPorTexto(endereco) {
    try {
        const buscaTermo = `${endereco}, Brasil`;
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(buscaTermo)}&limit=1`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': 'PetTraceApp/1.0' }
        });
        const dados = await response.json();

        if (dados && dados.length > 0) {
            latitudeSelecionada = parseFloat(dados[0].lat);
            longitudeSelecionada = parseFloat(dados[0].lon);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Erro ao converter endereço:", error);
        return false;
    }
}

// --- BUSCAR E RENDERIZAR FEED ---
async function carregarFeed() {
    const feedContainer = document.getElementById('feed-pets');
    if (!feedContainer) return;

    feedContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #757575;">Carregando pets...</p>';

    try {
        const { data: pets, error } = await supabase
            .from('pets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        todosOsPets = pets; // Salva globalmente na sessão
        renderizarCards(todosOsPets);

    } catch (error) {
        console.error('Erro ao carregar o feed do Supabase:', error);
        feedContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #EC407A;">Não foi possível carregar os dados. Verifique a conexão.</p>';
    }
}

function renderizarCards(listaDePets) {
    const feedContainer = document.getElementById('feed-pets');
    if (!feedContainer) return;

    if (listaDePets.length === 0) {
        feedContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: #757575;">Nenhum pet encontrado nesta categoria.</p>';
        return;
    }

    feedContainer.innerHTML = '';

    listaDePets.forEach(pet => {
        const card = document.createElement('div');
        card.className = 'pet-card';
        
        let badgeClass = 'badge-adocao';
        if (pet.situacao === 'perdido') badgeClass = 'badge-perdido';
        if (pet.situacao === 'encontrado') badgeClass = 'badge-encontrado';

        card.innerHTML = `
            <div class="card-image" style="background-image: url('${pet.foto}')">
                <span class="badge ${badgeClass}">${pet.situacao}</span>
            </div>
            <div class="card-body">
                <h3>${pet.nome}</h3>
                <p><i class="ph ph-map-pin"></i> ${pet.localizacao}</p>
                <span class="time-tag">${pet.idade}</span>
            </div>
        `;

        card.addEventListener('click', () => {
            const petSelecionado = {
                nome: pet.nome,
                situacao: pet.situacao,
                localizacao: pet.localizacao,
                descricao: pet.descricao,
                foto: pet.foto,
                idade: pet.idade
            };
            localStorage.setItem('petSelecionado', JSON.stringify(petSelecionado));
            window.location.href = 'animal.html';
        });

        feedContainer.appendChild(card);
    });
}

// --- FILTRAR PETS PELAS ABAS ---
function configurarFiltros() {
    const abas = document.querySelectorAll('#filtros-feed .tab-item');
    abas.forEach(aba => {
        aba.addEventListener('click', () => {
            abas.forEach(a => a.classList.remove('active'));
            aba.classList.add('active');

            const categoria = aba.getAttribute('data-filter');
            if (categoria === 'todos') {
                renderizarCards(todosOsPets);
            } else {
                const petsFiltrados = todosOsPets.filter(p => p.situacao === categoria);
                renderizarCards(petsFiltrados);
            }
        });
    });
}

// --- FUNÇÃO ATUALIZADA DE CADASTRAR PET ---
async function cadastrarPet(event) {
    event.preventDefault();

    const btnSubmit = event.target.querySelector('.btn-submit');
    if (btnSubmit) {
        btnSubmit.innerText = "PUBLICANDO...";
        btnSubmit.disabled = true;
    }

    const nome = document.getElementById('petNome').value;
    const especie = document.getElementById('petEspecie').value; // Captura a espécie do HTML atualizado
    const situacao = document.getElementById('petSituacao').value;
    const idade = document.getElementById('petIdade').value;
    const localizacao = document.getElementById('petLocalizacao').value;
    const descricao = document.getElementById('petDescricao').value;
    const arquivoFoto = document.getElementById('petFotoArquivo').files[0]; 

    if (!arquivoFoto) {
        alert("Por favor, selecione uma foto do pet!");
        if (btnSubmit) { btnSubmit.innerText = "PUBLICAR PET"; btnSubmit.disabled = false; }
        return;
    }

    // Processa o texto da localização para buscar as coordenadas antes do insert
    if (localizacao.trim() !== "") {
        const encontrou = await buscarCoordenadasPorTexto(localizacao);
        if (!encontrou) {
            alert("Não conseguimos localizar as coordenadas desse endereço. Tente digitar de forma mais simples (Ex: Rua Augusta, São Paulo).");
            if (btnSubmit) { btnSubmit.innerText = "PUBLICAR PET"; btnSubmit.disabled = false; }
            return;
        }
    }

    try {
        const nomeArquivo = `${Date.now()}_${arquivoFoto.name}`;

        // Upload da imagem para o bucket do Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('fotos-pets')
            .upload(nomeArquivo, arquivoFoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase
            .storage
            .from('fotos-pets')
            .getPublicUrl(nomeArquivo);

        const fotoPublicUrl = urlData.publicUrl;

        // Insere todas as colunas novas alinhadas com seu banco de dados
        const { error: insertError } = await supabase
            .from('pets')
            .insert([{
                nome,
                especie, // 'cao' ou 'gato'
                situacao,
                idade,
                localizacao,
                descricao,
                foto: fotoPublicUrl,
                latitude: latitudeSelecionada,
                longitude: longitudeSelecionada
            }]);

        if (insertError) throw insertError;

        alert("Sucesso! O pet foi cadastrado e mapeado com sucesso.");
        document.getElementById('petForm').reset();
        document.getElementById('photo-preview').style.display = 'none'; 
        
        // Reseta as coordenadas salvas na memória para o próximo cadastro
        latitudeSelecionada = null;
        longitudeSelecionada = null;

        switchPage('home');
        carregarFeed(); 

    } catch (e) {
        console.error("Erro no processo:", e);
        alert("Erro ao salvar: " + (e.message || e));
    } finally {
        if (btnSubmit) {
            btnSubmit.innerText = "PUBLICAR PET";
            btnSubmit.disabled = false;
        }
    }
}

// --- INICIALIZAÇÃO DE EVENTOS SEGUROS ---
document.addEventListener('DOMContentLoaded', () => {
    carregarFeed();
    configurarFiltros();

    // Listener para o Preview da Imagem selecionada da Galeria
    document.getElementById('petFotoArquivo')?.addEventListener('change', function() {
        const preview = document.getElementById('photo-preview');
        const arquivo = this.files[0];
        
        if (arquivo) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.src = e.target.result;
                preview.style.display = 'block'; 
            }
            reader.readAsDataURL(arquivo);
        }
    });

    // Ouvintes de clique dos botões e navegação interna
    document.getElementById('btn-abrir-cadastro')?.addEventListener('click', () => switchPage('cadastro'));
    document.getElementById('btn-abrir-cadastro-nav')?.addEventListener('click', (e) => {
        e.preventDefault();
        switchPage('cadastro');
    });
    document.querySelector('.btn-voltar-home')?.addEventListener('click', () => switchPage('home'));
    document.getElementById('btn-notif')?.addEventListener('click', toggleNotifications);
    document.getElementById('btn-fechar-notif')?.addEventListener('click', toggleNotifications);
    
    // Envio do formulário
    document.getElementById('petForm')?.addEventListener('submit', cadastrarPet);
});
