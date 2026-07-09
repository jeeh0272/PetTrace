const SUPABASE_URL = "https://urysciyjkceriadtjomn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_yIipuUTmBx_GRUP9YUy8Vg_YHw3T7Qw";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Script perfil.js carregado com sucesso!");

    let userId = null;
    const modal = document.getElementById("editModal");
    const inputUsername = document.getElementById("editUsername");
    const inputLocation = document.getElementById("editLocation");

    try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            userId = "usuario-teste-123";
        } else {
            userId = user.id;
        }
    } catch (e) {
        userId = "usuario-teste-123";
    }

    await carregarPerfil(userId);
    await carregarMeusPets(userId);

    // --- ABRIR MODAL ---
    const editProfileBtn = document.getElementById("btnEditarPerfil") || document.querySelector(".btn-edit-profile");
    if (editProfileBtn && modal && inputUsername && inputLocation) {
        editProfileBtn.addEventListener("click", () => {
            const nomeElemento = document.querySelector(".user-details h2");
            const nomeAtual = nomeElemento ? nomeElemento.innerText : "";
            inputUsername.value = nomeAtual;

            const localElemento = document.querySelector(".user-details p");
            const localAtual = localElemento ? localElemento.innerText.replace(/📍/g, '').trim() : "";
            inputLocation.value = localAtual;

            modal.style.display = "flex";
        });
    }

    // --- FECHAR MODAL (CANCELAR) ---
    const btnCancelar = document.getElementById("btnCancelarModal");
    if (btnCancelar && modal) {
        btnCancelar.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    // --- SALVAR ALTERAÇÕES ---
    const btnSalvar = document.getElementById("btnSalvarModal");
    if (btnSalvar && modal && inputUsername && inputLocation) {
        btnSalvar.addEventListener("click", async () => {
            const novoNome = inputUsername.value.trim();
            const novaLocalizacao = inputLocation.value.trim();

            if (!novoNome && !novaLocalizacao) {
                alert("Por favor, preencha pelo menos um dos campos.");
                return;
            }

            if (novoNome) {
                const nomeElemento = document.querySelector(".user-details h2");
                if (nomeElemento) nomeElemento.innerText = novoNome;
            }

            if (novaLocalizacao) {
                const localElemento = document.querySelector(".user-details p");
                if (localElemento) {
                    localElemento.innerHTML = `<i class="ph ph-map-pin"></i> ${novaLocalizacao}`;
                }
            }

            if (userId === "usuario-teste-123") {
                alert("Perfil alterado com sucesso!");
                modal.style.display = "none";
            } else {
                btnSalvar.innerText = "Salvando...";
                modal.style.display = "none";
            }
        });
    }

    // --- CLIQUE NA FOTO ---
    const avatarImg = document.querySelector(".user-avatar");
    if (avatarImg) {
        avatarImg.style.cursor = "pointer";
        avatarImg.addEventListener("click", () => {
            const fileInput = document.createElement("input");
            fileInput.type = "file";
            fileInput.accept = "image/*";
            
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                if (userId === "usuario-teste-123") {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        avatarImg.src = event.target.result;
                    };
                    reader.readAsDataURL(file);
                    alert("Foto alterada localmente!");
                } else {
                    await uploadAvatar(userId, file);
                }
            };
            fileInput.click();
        });
    }
});

// --- FUNÇÕES AUXILIARES ---
async function carregarPerfil(userId) {
    if (userId === "usuario-teste-123") return;

    const { data, error } = await supabaseClient
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

    if (error && error.code !== 'PGRST116') return;

    if (data) {
        const nomeElemento = document.querySelector(".user-details h2");
        if (data.username && nomeElemento) nomeElemento.innerText = data.username;
        
        if (data.avatar_url) {
            if (data.avatar_url.startsWith('data:') || data.avatar_url.startsWith('http')) {
                const avatarImg = document.querySelector(".user-avatar");
                if (avatarImg) avatarImg.src = data.avatar_url;
            } else {
                const { data: urlData } = supabaseClient.storage.from('avatars').getPublicUrl(data.avatar_url);
                const avatarImg = document.querySelector(".user-avatar");
                if (avatarImg && urlData) avatarImg.src = urlData.publicUrl;
            }
        }
    }
}

async function uploadAvatar(userId, file) {
    try {
        const converterParaBase64 = (fileBlob) => {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(fileBlob);
                reader.onload = () => resolve(reader.result);
                reader.onerror = (error) => reject(error);
            });
        };

        const base64String = await converterParaBase64(file);

        const { error: updateError } = await supabaseClient
            .from('profiles')
            .upsert({ id: userId, avatar_url: base64String, updated_at: new Date() });

        if (updateError) {
            alert("Erro ao salvar foto de perfil: " + updateError.message);
        } else {
            alert("Foto de perfil atualizada!");
            window.location.reload();
        }
    } catch (err) {
        console.error("Erro no processamento da imagem: ", err);
    }
}

async function carregarMeusPets() {
    const container = document.getElementById("meus-pets-container");
    if (!container) return;

    try {
        const { data: pets, error } = await supabaseClient.from('pets').select('*'); 

        if (error) throw error;

        if (!pets || pets.length === 0) {
            container.innerHTML = `<span style="color: #888; font-size: 0.85rem; padding: 10px;">A tabela 'pets' está vazia.</span>`;
            return;
        }

        container.innerHTML = "";

        pets.forEach(pet => {
            const petCard = document.createElement("div");
            petCard.className = "pet-card-item";
            petCard.dataset.id = pet.id; 

            petCard.innerHTML = `
                <img src="${pet.foto || 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=150'}" alt="${pet.nome}">
                <div>
                    <h4>${pet.nome}</h4>
                    <p class="pet-situacao">● ${pet.situacao}</p>
                    <span class="pet-localizacao">${pet.localizacao || 'Sem localidade'}</span>
                </div>
            `;

            petCard.addEventListener("click", () => {
                window.location.href = `detalhes.html?id=${pet.id}`;
            });

            container.appendChild(petCard);
        });

    } catch (err) {
        console.error("Erro ao carregar pets:", err.message);
        container.innerHTML = `<span style="color: #ff4d4d; font-size: 0.85rem; padding: 10px;">Não foi possível acessar o banco de dados.</span>`;
    }
}

const btnLogout = document.querySelector('.logout');
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        const confirmar = confirm("Deseja realmente sair da sua conta?");
        if (confirmar) {
            // CORRIGIDO: Usando supabaseClient em vez de supabase
            await supabaseClient.auth.signOut(); 
            window.location.href = 'petrace.html'; // Redireciona para a sua página inicial
        }
    });
}
