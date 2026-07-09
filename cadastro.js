import { supabase } from './supabase-config.js';

let latitudeSelecionada = null;
let longitudeSelecionada = null;

// Tenta obter coordenadas aproximadas automáticas via GPS para ajudar no preenchimento
function capturarLocalizacaoGPS() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latitudeSelecionada = position.coords.latitude;
                longitudeSelecionada = position.coords.longitude;
                
                const inputLocal = document.getElementById('petLocalizacao');
                if (inputLocal) {
                    inputLocal.placeholder = "📍 GPS ativo! Ou digite outro endereço...";
                }
            },
            (error) => {
                console.log("GPS recusado. Confiaremos apenas no endereço digitado.");
            }
        );
    }
}

// Faz a mágica de transformar texto em Latitude/Longitude reais (Geocoding)
async function buscarCoordenadasPorTexto(endereco) {
    try {
        // Adicionamos ", Brasil" no final da busca para restringir resultados ao país
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

document.getElementById('petForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const btnSubmit = event.target.querySelector('.btn-submit');
    if (btnSubmit) {
        btnSubmit.innerText = "PUBLICANDO...";
        btnSubmit.disabled = true;
    }

    const fotoFile = document.getElementById('fotoFile').files[0];
    let fotoUrl = 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=500';

    const converterParaBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = (error) => reject(error);
        });
    };

    if (fotoFile) {
        try {
            fotoUrl = await converterParaBase64(fotoFile);
        } catch (error) {
            console.error("Erro ao processar imagem:", error);
        }
    }

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            alert("Você precisa estar logado na sua conta para cadastrar um pet!");
            window.location.href = "index.html";
            return;
        }

        const localizacaoTexto = document.getElementById('petLocalizacao').value;
        const especieSelecionada = document.getElementById('petEspecie').value;

        // Executa a conversão do endereço de texto para números antes de mandar ao Supabase
        if (localizacaoTexto.trim() !== "") {
            const encontrou = await buscarCoordenadasPorTexto(localizacaoTexto);
            if (!encontrou && !latitudeSelecionada) {
                alert("Não conseguimos localizar este endereço. Tente digitar de forma mais simples (Ex: Nome da Rua, Número, Bairro).");
                if (btnSubmit) {
                    btnSubmit.innerText = "PUBLICAR PET";
                    btnSubmit.disabled = false;
                }
                return;
            }
        }

        const petData = {
            nome: document.getElementById('petNome').value,
            situacao: document.getElementById('petSituacao').value,
            idade: document.getElementById('petIdade').value,
            localizacao: localizacaoTexto,
            descricao: document.getElementById('petDescricao').value,
            foto: fotoUrl,
            user_id: user.id,
            especie: especieSelecionada, // Captura 'cao' ou 'gato' direto do select do HTML
            latitude: latitudeSelecionada,
            longitude: longitudeSelecionada
        };

        const { data, error } = await supabase
            .from('pets')
            .insert([petData])
            .select();

        if (error) throw error;

        alert("Sucesso! Pet publicado no PetTrace.");
        document.getElementById('petForm').reset();
        window.location.href = "mapa.html";
        
    } catch (e) {
        console.error("Erro ao salvar no Supabase: ", e);
        alert("Ops, algo deu errado ao salvar os dados. Verifique a conexão.");
    } finally {
        if (btnSubmit) {
            btnSubmit.innerText = "PUBLICAR PET";
            btnSubmit.disabled = false;
        }
    }
});

// Inicializa a escuta de geolocalização do aparelho em background
capturarLocalizacaoGPS();
