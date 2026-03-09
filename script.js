// ============================================
// VALOBOOST - SISTEMA FRONTEND (MOCKUP)
// ============================================

// CONFIGURAÇÃO DA API
// IMPORTANTE: Como você publicou o site, "localhost" não vai funcionar em outros celulares/PCs, 
// pois "localhost" significa "na própria máquina da pessoa".
// Você precisa alterar o link abaixo para o IP ou a URL onde o seu `server.js` está rodando online!
const API_BASE_URL = 'https://valoboost-backend-1.onrender.com'; // Backend hospedado no Render!

// --- ESTADOS E BD SIMULADO (localStorage) ---
let usuarios = JSON.parse(localStorage.getItem('vb_users')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('vb_logged')) || null;
let carrinho = JSON.parse(localStorage.getItem('vb_cart')) || [];
let codigoVerificacaoAtual = null;
let usuarioPendente = null;

// URLs das Imagens dos Elos (Wikia Valorant)
const nomesElos = ["FERRO", "BRONZE", "PRATA", "OURO", "PLATINA", "DIAMANTE"];

// Inicializar a Página
window.onload = () => {
    atualizarCalculo();
    verificarSessao();
    atualizarUI();

    // Setup inputs de código
    setupCodeInputs();
};

// ============================================
// NAVEGAÇÃO E UI
// ============================================
function mostrarAba(idAba) {
    if (idAba === 'dashboard' && !usuarioLogado) {
        showToast('Você precisa estar logado para acessar.', 'error');
        abrirAuth();
        return;
    }
    document.querySelectorAll('.aba').forEach(aba => aba.classList.remove('active'));
    document.getElementById(idAba).classList.add('active');

    if (idAba === 'dashboard') renderDashboard();

    setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 10);
}

function showToast(mensagem, tipo = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.innerHTML = `<i class="fa-solid ${tipo === 'success' ? 'fa-check-circle' : 'fa-triangle-exclamation'}"></i> ${mensagem}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// SISTEMA DE AUTENTICAÇÃO
// ============================================
function verificarSessao() {
    if (usuarioLogado) {
        document.getElementById('btn-auth-header').style.display = 'none';
        document.getElementById('btn-user-header').style.display = 'inline-flex';
        document.getElementById('user-name-display').innerText = usuarioLogado.nome.split(' ')[0];
    } else {
        document.getElementById('btn-auth-header').style.display = 'inline-block';
        document.getElementById('btn-user-header').style.display = 'none';
    }
}

function abrirAuth() { document.getElementById('modal-auth').style.display = 'block'; trocarFormAuth('login'); }
function fecharAuth() { document.getElementById('modal-auth').style.display = 'none'; }
function trocarFormAuth(form) {
    document.getElementById('form-login').style.display = form === 'login' ? 'block' : 'none';
    document.getElementById('form-register').style.display = form === 'register' ? 'block' : 'none';
    document.getElementById('form-verify').style.display = form === 'verify' ? 'block' : 'none';
}

async function iniciarCadastro(e) {
    e.preventDefault();
    const nome = document.getElementById('reg-nome').value;
    const email = document.getElementById('reg-email').value;
    const senha = document.getElementById('reg-senha').value;

    try {
        const res = await fetch(`${API_BASE_URL}/api/users/check`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (data.exists) {
            showToast('Este E-mail já está sendo usado.', 'error');
            return;
        }
    } catch (err) {
        showToast('Erro de conexão com o Banco de Dados.', 'error');
        return;
    }

    // Pendurar os dados reais (senha pura, encriptada no backend)
    usuarioPendente = { nome, email, senha };

    // Gerar Código Aleatório
    codigoVerificacaoAtual = Math.floor(1000 + Math.random() * 9000).toString();

    // Trocar a UI para Tela de Verificar antes do e-mail chegar para dar feedback rápido
    trocarFormAuth('verify');
    showToast('Enviando código para seu e-mail...', 'success');

    // Integração Real EmailJS
    emailjs.send('service_5kfy5t9', 'template_i1tl9nc', {
        nome_usuario: nome,
        email_destino: email,
        codigo_verificacao: codigoVerificacaoAtual
    })
        .then(function (response) {
            console.log('E-mail enviado com sucesso!', response.status, response.text);
            showToast('Código de 4 dígitos enviado! Verifique sua caixa de entrada e spam.', 'success');
        }, function (error) {
            console.log('Falha ao enviar e-mail...', error);
            alert("Ocorreu um erro ao enviar o E-mail. Por favor, me tire um print ou escreva esse erro:\n" + JSON.stringify(error));
            showToast('Falha ao enviar o código de e-mail. Tente novamente mais tarde.', 'error');
        });
}

async function verificarCodigo(e) {
    e.preventDefault();
    const c1 = document.getElementById('code-1').value;
    const c2 = document.getElementById('code-2').value;
    const c3 = document.getElementById('code-3').value;
    const c4 = document.getElementById('code-4').value;
    const codigoDigitado = `${c1}${c2}${c3}${c4}`;

    if (codigoDigitado === codigoVerificacaoAtual) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(usuarioPendente)
            });
            const data = await res.json();

            if (data.success) {
                showToast('Conta criada com sucesso!', 'success');
                // Inicializa a var pedidos vazia no Frontend
                logar({ ...data.user, pedidos: [] });
                fecharAuth();
            } else {
                showToast(data.error || 'Erro ao registrar.', 'error');
            }
        } catch (err) {
            showToast('Erro no servidor.', 'error');
        }
    } else {
        showToast('Código inválido.', 'error');
    }
}

async function realizarLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const senha = document.getElementById('login-senha').value;

    try {
        const res = await fetch(`${API_BASE_URL}/api/users/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();

        if (data.success) {
            // Puxar pedidos logo do banco de dados na hora do login pra sessão local
            const resOrders = await fetch(`${API_BASE_URL}/api/orders/${email}`);
            const orders = await resOrders.json();

            const userData = { ...data.user, pedidos: orders };
            logar(userData);
            showToast(`Bem-vindo, ${data.user.nome}!`, 'success');
            fecharAuth();
        } else {
            showToast(data.error || 'Credenciais inválidas.', 'error');
        }
    } catch (err) {
        showToast('Erro no servidor ao tentar logar.', 'error');
    }
}

function logar(user) {
    usuarioLogado = user;
    localStorage.setItem('vb_logged', JSON.stringify(usuarioLogado));
    verificarSessao();
}

function deslogar() {
    usuarioLogado = null;
    localStorage.removeItem('vb_logged');
    verificarSessao();
    mostrarAba('inicio');
    showToast('Você saiu da conta.');
}

function setupCodeInputs() {
    const inputs = document.querySelectorAll('.code-input');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            if (e.target.value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                inputs[index - 1].focus();
            }
        });
    });
}

// ============================================
// CALCULADORA ELO BOOST
// ============================================
const imgElos = [
    "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/3.png",   // Ferro
    "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/6.png",   // Bronze
    "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/9.png",   // Prata
    "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/12.png",  // Ouro
    "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/15.png",  // Platina
    "https://trackercdn.com/cdn/tracker.gg/valorant/icons/tiers/24.png"   // Diamante
];
let precoTotalAtual = 0;
let resumoAtual = "";

function atualizarCalculo() {
    const eloAtu = parseInt(document.getElementById('elo-atual').value);
    const divAtu = parseInt(document.getElementById('div-atual').value);
    const eloDes = parseInt(document.getElementById('elo-desejado').value);
    const divDes = parseInt(document.getElementById('div-desejado').value);

    // Trocar Imagens
    document.getElementById('img-atual').src = imgElos[eloAtu];
    document.getElementById('img-desejado').src = imgElos[eloDes];

    let totalDivAtu = (eloAtu * 3) + (divAtu - 1);
    let totalDivDes = (eloDes * 3) + (divDes - 1);

    const btn = document.getElementById('btn-comprar');
    const resumo = document.getElementById('resumo-texto');
    const valorH2 = document.getElementById('valor-total');

    if (totalDivDes <= totalDivAtu) {
        resumo.innerText = "ESCOLHA UM ELO MAIOR!";
        resumo.style.color = "var(--primary-red)";
        valorH2.innerText = "R$ 0,00";
        precoTotalAtual = 0;
        btn.disabled = true;
    } else {
        let diferenca = totalDivDes - totalDivAtu;
        precoTotalAtual = diferenca * 15; // R$ 15,00 por divisão
        resumoAtual = `${nomesElos[eloAtu]} ${divAtu} ➔ ${nomesElos[eloDes]} ${divDes}`;

        resumo.innerText = resumoAtual;
        resumo.style.color = "white";
        valorH2.innerText = `R$ ${precoTotalAtual.toFixed(2).replace('.', ',')}`;
        btn.disabled = false;
    }
}

// ============================================
// SISTEMA DE CARRINHO
// ============================================
function abrirCarrinho() {
    document.getElementById('carrinho-sidebar').classList.add('open');
    document.getElementById('carrinho-overlay').classList.add('open');
    renderCarrinho();
}

function fecharCarrinho() {
    document.getElementById('carrinho-sidebar').classList.remove('open');
    document.getElementById('carrinho-overlay').classList.remove('open');
}

function adicionarAoCarrinho() {
    if (precoTotalAtual <= 0) return;

    const novoItem = {
        id: Date.now(),
        tipo: 'Elo Boost',
        resumo: resumoAtual,
        preco: precoTotalAtual
    };

    carrinho.push(novoItem);
    localStorage.setItem('vb_cart', JSON.stringify(carrinho));

    atualizarUI();
    abrirCarrinho();
    showToast('Adicionado ao carrinho!', 'success');
}

function removerRemCarrinho(id) {
    carrinho = carrinho.filter(i => i.id !== id);
    localStorage.setItem('vb_cart', JSON.stringify(carrinho));
    renderCarrinho();
    atualizarUI();
}

function atualizarUI() {
    document.getElementById('cart-count').innerText = carrinho.length;
}

function renderCarrinho() {
    const list = document.getElementById('carrinho-items');
    if (carrinho.length === 0) {
        list.innerHTML = `<div class="empty-cart"><i class="fa-solid fa-ghost"></i><br>Seu carrinho está vazio</div>`;
        document.getElementById('cart-total-value').innerText = "R$ 0,00";
        return;
    }

    let total = 0;
    list.innerHTML = carrinho.map(item => {
        total += item.preco;
        return `
        <div class="cart-item">
            <div class="cart-item-info">
                <h4>${item.tipo}</h4>
                <p>${item.resumo}</p>
            </div>
            <div style="text-align: right;">
                <p style="color:white; font-weight:bold; margin-bottom:5px;">R$ ${item.preco.toFixed(2).replace('.', ',')}</p>
                <button class="cart-item-remove" onclick="removerRemCarrinho(${item.id})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');

    document.getElementById('cart-total-value').innerText = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

// ============================================
// CHECKOUT E PAGAMENTO SIMULADO
// ============================================
function iniciarCheckout() {
    if (carrinho.length === 0) {
        showToast('O carrinho está vazio', 'error');
        return;
    }
    if (!usuarioLogado) {
        fecharCarrinho();
        showToast('Faça login para finalizar a compra.', 'error');
        abrirAuth();
        return;
    }

    fecharCarrinho();
    document.getElementById('modal-checkout').style.display = 'block';

    // Resumo
    let total = carrinho.reduce((acc, curr) => acc + curr.preco, 0);
    document.getElementById('checkout-resumo').innerHTML = `
        <h3 style="margin-bottom:10px;">Total a pagar: <span style="color:var(--accent-yellow)">R$ ${total.toFixed(2).replace('.', ',')}</span></h3>
        <p style="color:var(--text-muted)">Serviços: ${carrinho.map(c => c.resumo).join(' e ')}</p>
    `;
}

function fecharCheckout() { document.getElementById('modal-checkout').style.display = 'none'; }

function copiarPix() {
    navigator.clipboard.writeText("46645769865");
    showToast('Chave PIX Copiada!', 'success');
}

async function confirmarPagamentoMock() {
    showToast('Processando pedido...', 'success');

    // Criar os pedidos
    let total = carrinho.reduce((acc, curr) => acc + curr.preco, 0);
    const novoPedido = {
        id: 'VB' + Date.now().toString().slice(-6),
        data: new Date().toLocaleDateString(),
        clienteNome: usuarioLogado.nome,
        clienteEmail: usuarioLogado.email,
        itens: [...carrinho],
        total: total,
        status: 'Em Progresso'
    };

    try {
        const res = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoPedido)
        });
        const data = await res.json();

        if (data.success) {
            // Atualizar Sessão Local
            usuarioLogado.pedidos.push(novoPedido);
            localStorage.setItem('vb_logged', JSON.stringify(usuarioLogado));

            // Limpar Carrinho
            carrinho = [];
            localStorage.setItem('vb_cart', JSON.stringify([]));

            fecharCheckout();
            atualizarUI();
            mostrarAba('dashboard');
            showToast('Pedido Gerado com Sucesso!', 'success');
        } else {
            showToast('Erro ao processar pedido.', 'error');
        }
    } catch (err) {
        showToast('Erro no servidor ao processar pedido.', 'error');
    }
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
    if (!usuarioLogado) return;
    document.getElementById('dashboard-username').innerText = usuarioLogado.nome;
    document.getElementById('dashboard-email').innerText = usuarioLogado.email;

    const list = document.getElementById('lista-pedidos');
    if (!usuarioLogado.pedidos || usuarioLogado.pedidos.length === 0) {
        list.innerHTML = `<p style="color:var(--text-muted)">Você ainda não tem nenhum pedido de boost ativo.</p>`;
        return;
    }

    list.innerHTML = usuarioLogado.pedidos.reverse().map(p => `
        <div class="order-card">
            <div>
                <p class="order-title">Pedido #${p.id}</p>
                <p class="order-date">${p.data} - ${p.itens.map(i => i.resumo).join(' + ')}</p>
            </div>
            <div style="text-align:right">
                <p class="order-price">R$ ${p.total.toFixed(2).replace('.', ',')}</p>
                <span class="order-status">${p.status}</span>
            </div>
        </div>
    `).join('');
}

// ============================================
// PAINEL ADMIN (ALT + M)
// ============================================
window.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'm') {
        document.getElementById('modal-admin').style.display = 'block';
    }
});

function fecharAdmin() { document.getElementById('modal-admin').style.display = 'none'; }

function logarAdmin() {
    const user = document.getElementById('admin-user').value;
    const pass = document.getElementById('admin-senha').value;

    if (user === "davi321" && pass === "729adm") {
        document.getElementById('admin-login-area').style.display = 'none';
        document.getElementById('admin-panel-area').style.display = 'block';
        carregarDadosAdmin();
        showToast('Login Admin efetuado.', 'success');
    } else {
        showToast('Credenciais de Admin incorretas.', 'error');
    }
}

function mostrarAbaAdmin(aba) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');

    document.getElementById('admin-aba-pedidos').style.display = aba === 'pedidos' ? 'block' : 'none';
}

async function carregarDadosAdmin() {
    try {
        const res = await fetch(`${API_BASE_URL}/api/admin/orders`);
        const todosPedidos = await res.json();

        const listPedidos = document.getElementById('admin-lista-pedidos');
        if (!todosPedidos || todosPedidos.length === 0) {
            listPedidos.innerHTML = `<p style="color:var(--text-muted)">Nenhum pedido no sistema.</p>`;
        } else {
            listPedidos.innerHTML = todosPedidos.map(p => `
                <div class="order-card" style="flex-direction: column; align-items: flex-start; gap: 10px;">
                    <div style="display:flex; justify-content:space-between; width:100%">
                        <p class="order-title">#${p.id} - ${p.clienteNome || 'Desconhecido'} (${p.clienteEmail || 'N/A'})</p>
                        <span class="order-status">${p.status}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; width:100%">
                        <p class="order-date">${p.data} - ${p.itens.map(i => i.resumo).join(' + ')}</p>
                        <p class="order-price">R$ ${p.total.toFixed(2).replace('.', ',')}</p>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) {
        showToast('Erro ao carregar dados do admin.', 'error');
    }
}

async function resetarSistema() {
    if (confirm("ATENÇÃO: Isso vai apagar todas as contas e pedidos do Banco de Dados real. Deseja continuar?")) {
        try {
            await fetch(`${API_BASE_URL}/api/admin/reset`, { method: 'POST' });
            localStorage.clear();
            location.reload();
        } catch (err) {
            showToast('Erro de conexão com o Banco de Dados ao resetar.', 'error');
        }
    }
}