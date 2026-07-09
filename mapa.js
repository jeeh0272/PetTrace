// mapa.js
import { supabase } from './supabase-config.js';

// 1. Inicializa o mapa Leaflet apontando para o elemento #map
const map = L.map('map', { 
    zoomControl: false 
}).setView([-23.5505, -46.6333], 14);

// 2. Adiciona os blocos de imagens do mapa (OpenStreetMap Voyager)
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '©OpenStreetMap',
    maxZoom: 19
}).addTo(map);

// Força o Leaflet a recalcular o tamanho e corrigir o bug da tela branca
setTimeout(() => {
    map.invalidateSize();
}, 200);

let todosOsMarcadores = [];
let todosOsPets = [];
let localizacaoPadrao = [-23.5505, -46.6333];

let usuarioLatitude = null;
let usuarioLongitude = null;

// Tenta capturar a localização real do usuário
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(position => {

    usuarioLatitude = position.coords.latitude;
    usuarioLongitude = position.coords.longitude;


    localizacaoPadrao = [
        usuarioLatitude,
        usuarioLongitude
    ];


    map.setView(localizacaoPadrao, 14);

});
}

// Funções globais para os botões do HTML funcionarem
window.centerMap = function() {
    map.flyTo(localizacaoPadrao, 16);
};

window.closePetCard = function() {
    document.getElementById('petCard').classList.remove('show');
};

function calcularDistancia(lat1, lon1, lat2, lon2){

    const R = 6371;


    const dLat = 
    (lat2-lat1) * Math.PI / 180;


    const dLon =
    (lon2-lon1) * Math.PI / 180;


    const a =
    Math.sin(dLat/2) *
    Math.sin(dLat/2)
    +
    Math.cos(lat1*Math.PI/180) *
    Math.cos(lat2*Math.PI/180) *
    Math.sin(dLon/2) *
    Math.sin(dLon/2);


    const c =
    2 *
    Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1-a)
    );


    return R*c;

}

// 3. Busca os animais do Supabase e joga no mapa
async function carregarAnimaisNoMapa() {
    try {
        // Puxa a tabela de pets
        const { data: pets, error } = await supabase.from('pets').select('*');
        if (error) throw error;
        
        todosOsPets = pets;

        pets.forEach(pet => {
            const lat = parseFloat(pet.latitude);
const lng = parseFloat(pet.longitude);

if (isNaN(lat) || isNaN(lng)) {
    console.log("Pet sem coordenadas:", pet);
    return;
}
            
            if (todosOsMarcadores.length > 0) {
    const grupo = L.featureGroup(todosOsMarcadores);
    map.fitBounds(grupo.getBounds(), {
        padding: [40, 40]
    });
}
            
            

            // Cria o marcador simples no mapa
            const marker = L.marker([lat, lng]).addTo(map);
            
            // Guarda a espécie dentro do marcador para usar nos filtros de Cães/Gatos
            marker.especie = pet.especie ? pet.especie.toLowerCase() : 'outro';

            // Evento ao clicar no pino do mapa
            marker.on('click', () => {
                const card = document.getElementById('petCard');
                
                // Altera dinamicamente a foto e os textos do card que você já criou!
                card.querySelector('.pet-thumb').style.backgroundImage = `url('${pet.foto || 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=200'}')`;
                card.querySelector('.pet-desc h4').innerText = pet.nome;
                let distanciaTexto = "";


if(usuarioLatitude && usuarioLongitude){

    const distancia = calcularDistancia(
        usuarioLatitude,
        usuarioLongitude,
        pet.latitude,
        pet.longitude
    );


    if(distancia < 1){

        distanciaTexto =
        `${Math.round(distancia*1000)} metros de você`;

    } else {

        distanciaTexto =
        `${distancia.toFixed(1)} km de você`;

    }

}


card.querySelector('.pet-desc p').innerText =
`${pet.localizacao || 'Região Central'} • ${distanciaTexto}`;
                
                // Configura o botão "Como chegar" para simular a rota salvando no localStorage
                const btnIr = card.querySelector('.btn-ir');

btnIr.onclick = () => {

    const latitude = pet.latitude;
    const longitude = pet.longitude;


    const rota = 
    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;


    window.open(rota, "_blank");

};

                // Sobe o card da parte inferior da tela
                card.classList.add('show');
            });

            todosOsMarcadores.push(marker);
        });

    } catch (err) {
        console.error("Erro ao conectar com o Supabase:", err.message);
    }
}

// 4. Lógica dos filtros (Todos / Cães / Gatos)
const chips = document.querySelectorAll(".quick-filters .chip");

chips.forEach(chip => {

    chip.addEventListener("click", () => {

        chips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");

        closePetCard();

        const filtro = chip.textContent.trim().toLowerCase();

        todosOsMarcadores.forEach(marker => {

            if (filtro === "todos") {

                if (!map.hasLayer(marker)) {
                    marker.addTo(map);
                }

            } else if (filtro.includes("cães")) {

                if (marker.especie === "cao") {
                    if (!map.hasLayer(marker)) marker.addTo(map);
                } else {
                    map.removeLayer(marker);
                }

            } else if (filtro.includes("gatos")) {

                if (marker.especie === "gato") {
                    if (!map.hasLayer(marker)) marker.addTo(map);
                } else {
                    map.removeLayer(marker);
                }

            }

        });

    });

});

const visiveis = todosOsMarcadores.filter(m => map.hasLayer(m));

if (visiveis.length > 0) {
    const grupo = L.featureGroup(visiveis);
    map.fitBounds(grupo.getBounds(), {
        padding: [40, 40]
    });
}

// Executa a carga ao abrir a tela
carregarAnimaisNoMapa();

async function pesquisar() {

    const input = document.getElementById("pesquisaMapa");

    const busca = input.value.trim().toLowerCase();


    if (!busca) return;



    // 1 - Procura pets

    const petsEncontrados = todosOsPets.filter(pet => {

        return (
            pet.nome?.toLowerCase().includes(busca) ||
            pet.especie?.toLowerCase().includes(busca) ||
            pet.raca?.toLowerCase().includes(busca) ||
            pet.situacao?.toLowerCase().includes(busca) ||
            pet.localizacao?.toLowerCase().includes(busca)
        );

    });



    if (petsEncontrados.length > 0) {

        const pet = petsEncontrados[0];

        map.flyTo(
            [
                pet.latitude,
                pet.longitude
            ],
            17
        );


        return;

    }



    // 2 - Se não achou pet, procura endereço

    try {

        const resposta = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busca + ", Brasil")}&limit=1`
        );


        const dados = await resposta.json();


        if(dados.length === 0){

            alert("Nada encontrado 😢");

            return;

        }


        const lat = parseFloat(dados[0].lat);
        const lng = parseFloat(dados[0].lon);


        map.flyTo(
            [
                lat,
                lng
            ],
            16
        );


    } catch(error){

        console.error(error);

    }

}



const campoPesquisa = document.getElementById("pesquisaMapa");

const caixaSugestoes = document.getElementById("sugestoesPesquisa");

campoPesquisa.addEventListener("input", ()=>{


    const valor = campoPesquisa.value
    .trim()
    .toLowerCase();


    caixaSugestoes.innerHTML = "";


    if(valor.length < 2){

        caixaSugestoes.style.display = "none";

        return;

    }



    const resultados = todosOsPets.filter(pet=>{


        return (

            pet.nome?.toLowerCase().includes(valor) ||

            pet.especie?.toLowerCase().includes(valor) ||

            pet.raca?.toLowerCase().includes(valor) ||

            pet.situacao?.toLowerCase().includes(valor)

        );


    });



    if(resultados.length === 0){

        caixaSugestoes.style.display = "none";

        return;

    }



    resultados.slice(0,5).forEach(pet=>{


        const item = document.createElement("div");


        item.className = "sugestao-item";


        item.innerHTML = `
            🐾 <strong>${pet.nome}</strong>
            <br>
            <small>${pet.especie || "Pet"} • ${pet.situacao || ""}</small>
        `;



        item.onclick = ()=>{


            campoPesquisa.value = pet.nome;


            caixaSugestoes.style.display="none";


            map.flyTo(
                [
                    pet.latitude,
                    pet.longitude
                ],
                17
            );


        };



        caixaSugestoes.appendChild(item);


    });



    caixaSugestoes.style.display="block";


});

campoPesquisa.addEventListener("keydown", (e)=>{

    if(e.key === "Enter"){

        pesquisar();

    }

});