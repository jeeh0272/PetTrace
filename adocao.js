// adocao.js
import { supabase } from './supabase-config.js';

// Declaração correta da variável global no topo do arquivo
let petsFavoritadosIds = [];

// 1. FUNÇÃO PRINCIPAL PARA CARREGAR OS ANIMAIS
async function carregarAnimaisParaAdocao(especieSelecionada = null, apenasFavoritos = false) {
    const gridContainer = document.getElementById('feed-adocao');
    if (!gridContainer) return;

    gridContainer.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 20px; color: #757575;">Carregando...</p>';

    try {
        // Tenta pegar o usuário logado com segurança
        let user = null;
        try {
            const { data } = await supabase.auth.getUser();
            user = data?.user || null;
        } catch (authError) {
            console.log('Usuário não autenticado ou sistema de login não configurado:', authError);
        }

        // Se o usuário estiver logado, busca os favoritos dele
        petsFavoritadosIds = [];
        if (user) {
            const { data: favs } = await supabase
                .from('favoritos')
                .select('pet_id')
                .eq('user_id', user.id);
            
            if (favs) {
                petsFavoritadosIds = favs.map(f => f.pet_id);
            }
        }

        let pets = [];

        // CASO A: Filtrar apenas os favoritados do usuário
        if (apenasFavoritos) {
            if (!user) {
                gridContainer.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 20px; color: #757575;">Faça login para ver seus favoritos.</p>';
                return;
            }
            if (petsFavoritadosIds.length === 0) {
                gridContainer.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 20px; color: #757575;">Você ainda não tem nenhum pet favoritado.</p>';
                return;
            }

            const { data, error } = await supabase
                .from('pets')
                .select('*')
                .eq('situacao', 'adocao')
                .in('id', petsFavoritadosIds)
                .order('created_at', { ascending: false });

            if (error) throw error;
            pets = data;

        // CASO B: Busca normal (por espécie ou todos)
        } else {
            let query = supabase.from('pets').select('*').eq('situacao', 'adocao');
            
            if (especieSelecionada) {
                query = query.eq('especie', especieSelecionada);
            }
            
            const { data, error } = await query.order('created_at', { ascending: false });
            if (error) throw error;
            pets = data;
        }

        if (pets.length === 0) {
            gridContainer.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 20px; color: #757575;">Nenhum pet encontrado.</p>';
            return;
        }

        gridContainer.innerHTML = '';

        // RENDERIZAR OS CARDS
        pets.forEach(pet => {
            const card = document.createElement('div');
            card.className = 'adoption-card';

            const jaFavoritado = petsFavoritadosIds.includes(pet.id);

            card.innerHTML = `
                <div class="pet-photo" style="background-image: url('${pet.foto}')">
                    <button class="fav-btn ${jaFavoritado ? 'favoritado' : ''}">
                        <i class="ph ${jaFavoritado ? 'ph-heart-fill' : 'ph-heart'}"></i>
                    </button>
                </div>
                <div class="pet-details">
                    <div class="name-age">
                        <h3>${pet.nome}</h3>
                        <span class="age">${pet.idade}</span>
                    </div>
                    <p class="location"><i class="ph ph-map-pin"></i> ${pet.localizacao}</p>
                    <div class="tags">
                        <span class="tag">Para Adoção</span>
                        <span class="tag">Dócil</span>
                    </div>
                    <button class="btn-adopt">Quero Conhecer</button>
                </div>
            `;

            // Clique no botão de favoritar
            const btnFav = card.querySelector('.fav-btn');
            btnFav.addEventListener('click', async (event) => {
                event.stopPropagation();
                
                if (!user) {
                    alert('Você precisa estar logado para favoritar um pet!');
                    return;
                }

                const icone = btnFav.querySelector('i');
                const estaFavoritado = btnFav.classList.contains('favoritado');

                try {
                    if (estaFavoritado) {
                        const { error } = await supabase
                            .from('favoritos')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('pet_id', pet.id);

                        if (error) throw error;

                        icone.className = 'ph ph-heart';
                        btnFav.classList.remove('favoritado');
                        
                        if (apenasFavoritos) card.remove();
                    } else {
                        const { error } = await supabase
                            .from('favoritos')
                            .insert([{ user_id: user.id, pet_id: pet.id }]);

                        if (error) throw error;

                        icone.className = 'ph ph-heart-fill';
                        btnFav.classList.add('favoritado');
                    }
                } catch (err) {
                    console.error('Erro ao atualizar favorito:', err);
                }
            });

            card.querySelector('.btn-adopt').addEventListener('click', () => {
                localStorage.setItem('petSelecionado', JSON.stringify(pet));
                window.location.href = 'animal.html';
            });

            gridContainer.appendChild(card);
        });

    } catch (error) {
        console.error('Erro geral ao carregar pets:', error);
        gridContainer.innerHTML = '<p style="text-align: center; grid-column: 1/-1; padding: 20px; color: #F06292;">Erro ao carregar os pets.</p>';
    }
}

// 2. CONFIGURAÇÃO DOS CLIQUES NOS FILTROS (Corrigido)
function inicializarFiltros() {
    const filtrosEspecies = document.querySelectorAll('.specie-item:not(#btn-filtro-favoritos)');
    const btnFavoritos = document.getElementById('btn-filtro-favoritos');

    // Cliques nas espécies normais
    filtrosEspecies.forEach(botao => {
        botao.addEventListener('click', () => {
            document.querySelectorAll('.specie-item').forEach(b => b.classList.remove('active'));
            botao.classList.add('active');
            
            const especie = botao.dataset.especie; // Lógica limpa e corrigida aqui
            carregarAnimaisParaAdocao(especie, false);
        });
    });

    // Clique no botão de Favoritos
    if (btnFavoritos) {
        btnFavoritos.addEventListener('click', () => {
            document.querySelectorAll('.specie-item').forEach(b => b.classList.remove('active'));
            btnFavoritos.classList.add('active');
            
            carregarAnimaisParaAdocao(null, true);
        });
    }
}

// 3. INICIALIZAÇÃO DA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa carregando a categoria "cachorro" por padrão
    carregarAnimaisParaAdocao('cachorro', false); 
    inicializarFiltros();
});
