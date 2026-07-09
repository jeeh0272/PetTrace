// petrace.js
import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    const btnEntrar = document.getElementById('btn-entrar');
    const btnGoogle = document.getElementById('btn-google');

    if (formLogin) {
        formLogin.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('login-email').value.trim();
            const senha = document.getElementById('login-senha').value;

            if (btnEntrar) {
                btnEntrar.innerText = 'Autenticando...';
                btnEntrar.disabled = true;
            }

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: email,
                    password: senha
                });

                if (error) throw error;

                alert('Bem-vindo ao PetRace!');
                window.location.href = 'index.html';

            } catch (error) {
                console.error('Erro ao fazer login:', error.message);
                
                if (error.message.includes('Invalid login credentials')) {
                    alert('E-mail ou senha incorretos. Tente novamente.');
                } else {
                    alert(`Erro na autenticação: ${error.message}`);
                }

                if (btnEntrar) {
                    btnEntrar.innerText = 'ENTRAR';
                    btnEntrar.disabled = false;
                }
            }
        });
    }

    if (btnGoogle) {
        btnGoogle.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Botão do Google clicado com sucesso!");
            
            try {
                const { data, error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo: window.location.origin + '/index.html' 
                    }
                });

                if (error) throw error;
            } catch (error) {
                console.error('Erro ao autenticar com o Google:', error.message);
                alert(`Erro no login com Google: ${error.message}`);
            }
        });
    }
});
