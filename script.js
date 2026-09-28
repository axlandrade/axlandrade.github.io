/**
 * script.js - Portfolio de Axl Andrade
 * Funcionalidades modernas:
 * 1. Gerenciamento de Tema (Dark / Light) com persistência e sincronização de sistema
 * 2. Canvas Interativo de Multigrafos (Representação visual da pesquisa em redes complexas)
 * 3. Filtros interativos para projetos
 * 4. Sistema de Toast e Copiar para Área de Transferência
 * 5. Botão de Retornar ao Topo com indicador de progresso
 * 6. Suporte a acessibilidade e prefers-reduced-motion
 */

(function () {
    'use strict';

    /* ==========================================================================
       1. SISTEMA DE TEMA (DARK / LIGHT)
       ========================================================================== */
    const THEME_STORAGE_KEY = 'axl_portfolio_theme';

    function getPreferredTheme() {
        const storedTheme = localStorage.getItem(THEME_STORAGE_KEY);
        if (storedTheme) {
            return storedTheme;
        }
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', theme === 'light' ? '#f8fafc' : '#0d1016');
        }

        // Atualiza todos os botões de alternância de tema
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            const icon = btn.querySelector('i');
            const isLight = theme === 'light';
            btn.setAttribute('aria-label', isLight ? 'Ativar tema escuro' : 'Ativar tema claro');
            btn.setAttribute('title', isLight ? 'Alternar para modo escuro' : 'Alternar para modo claro');
            if (icon) {
                icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            }
        });

        // Notifica o canvas sobre a mudança de tema
        if (window.updateCanvasTheme) {
            window.updateCanvasTheme(theme);
        }
    }

    // Inicialização do tema imediatamente para evitar FOUC
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
        applyTheme(newTheme);
        showToast(newTheme === 'light' ? 'Modo claro ativado' : 'Modo escuro ativado', newTheme === 'light' ? 'fa-sun' : 'fa-moon');
    }

    // Ouve alterações de preferência do sistema operacional
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    /* ==========================================================================
       2. SISTEMA DE TOAST E CLIPBOARD
       ========================================================================== */
    let toastTimeout = null;

    function showToast(message, iconClass = 'fa-check') {
        let toast = document.getElementById('site-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'site-toast';
            toast.className = 'site-toast';
            toast.setAttribute('role', 'status');
            toast.setAttribute('aria-live', 'polite');
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i><span>${message}</span>`;
        toast.classList.add('visible');

        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }

        toastTimeout = setTimeout(() => {
            toast.classList.remove('visible');
        }, 2600);
    }
    window.showToast = showToast;

    async function copyToClipboard(text, successMessage = 'Copiado com sucesso!') {
        try {
            await navigator.clipboard.writeText(text);
            showToast(successMessage, 'fa-copy');
        } catch (err) {
            // Fallback para navegadores mais antigos
            const tempInput = document.createElement('input');
            tempInput.value = text;
            document.body.appendChild(tempInput);
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            showToast(successMessage, 'fa-copy');
        }
    }
    window.copyToClipboard = copyToClipboard;

    /* ==========================================================================
       3. CANVAS DE MULTIGRAFOS INTERATIVO (PESQUISA EM OTIMIZAÇÃO & REDES)
       ========================================================================== */
    function initMultigraphCanvas() {
        const canvas = document.getElementById('hero-multigraph-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width, height;
        let animationFrameId;
        let isVisible = true;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Paleta de cores para os nós e arestas múltiplas
        const getPalette = () => {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            return {
                nodes: isLight
                    ? ['#e04836', '#0d9488', '#0284c7', '#d97706', '#6366f1']
                    : ['#ff6b57', '#4ddfb3', '#78c7ff', '#ffd166', '#a78bfa'],
                nodeGlow: isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.15)',
                edges: isLight
                    ? ['rgba(224, 72, 54, 0.22)', 'rgba(13, 148, 136, 0.22)', 'rgba(2, 132, 199, 0.22)']
                    : ['rgba(255, 107, 87, 0.26)', 'rgba(77, 223, 179, 0.26)', 'rgba(120, 199, 255, 0.26)'],
                edgeActive: isLight ? 'rgba(2, 132, 199, 0.65)' : 'rgba(120, 199, 255, 0.75)'
            };
        };

        let palette = getPalette();
        window.updateCanvasTheme = () => {
            palette = getPalette();
        };

        function resize() {
            const rect = canvas.parentElement.getBoundingClientRect();
            width = canvas.width = rect.width;
            height = canvas.height = rect.height;
        }
        resize();
        window.addEventListener('resize', resize, { passive: true });

        // Criação dos nós da rede de multigrafo
        const nodeCount = Math.max(12, Math.min(22, Math.floor(width / 50)));
        const nodes = [];

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.45,
                vy: (Math.random() - 0.5) * 0.45,
                radius: Math.random() * 2.5 + 3.5,
                colorIndex: Math.floor(Math.random() * palette.nodes.length),
                cluster: Math.floor(Math.random() * 3)
            });
        }

        // Multiarestas entre os nós (multigrafos têm múltiplas conexões entre pares)
        const edges = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                // Probabilidade baseada em clusters
                const sameCluster = nodes[i].cluster === nodes[j].cluster;
                const chance = sameCluster ? 0.35 : 0.08;
                if (Math.random() < chance) {
                    // Número de arestas paralelas (1 a 3 arestas para demonstrar multigrafo)
                    const multiplicity = Math.random() < 0.4 ? 2 : 1;
                    edges.push({
                        source: i,
                        target: j,
                        multiplicity: multiplicity,
                        type: Math.floor(Math.random() * palette.edges.length)
                    });
                }
            }
        }

        // Rastreamento suave do mouse
        const mouse = { x: -1000, y: -1000, radius: 140 };
        canvas.parentElement.addEventListener('mousemove', e => {
            const rect = canvas.getBoundingClientRect();
            mouse.x = e.clientX - rect.left;
            mouse.y = e.clientY - rect.top;
        }, { passive: true });

        canvas.parentElement.addEventListener('mouseleave', () => {
            mouse.x = -1000;
            mouse.y = -1000;
        }, { passive: true });

        // Pausa quando o elemento estiver fora do viewport
        const observer = new IntersectionObserver((entries) => {
            isVisible = entries[0].isIntersecting;
            if (isVisible && !animationFrameId) {
                loop();
            }
        }, { threshold: 0.05 });
        observer.observe(canvas);

        function drawMultigraph() {
            ctx.clearRect(0, 0, width, height);

            // Atualiza e desenha os nós
            for (let i = 0; i < nodes.length; i++) {
                const node = nodes[i];

                if (!prefersReducedMotion) {
                    node.x += node.vx;
                    node.y += node.vy;

                    // Rebate nas bordas
                    if (node.x < 10) { node.x = 10; node.vx *= -1; }
                    if (node.x > width - 10) { node.x = width - 10; node.vx *= -1; }
                    if (node.y < 10) { node.y = 10; node.vy *= -1; }
                    if (node.y > height - 10) { node.y = height - 10; node.vy *= -1; }

                    // Interação sutil com o cursor
                    const dx = mouse.x - node.x;
                    const dy = mouse.y - node.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < mouse.radius) {
                        const force = (mouse.radius - dist) / mouse.radius;
                        node.x -= (dx / dist) * force * 1.8;
                        node.y -= (dy / dist) * force * 1.8;
                    }
                }

                // Desenho do nó
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fillStyle = palette.nodes[node.colorIndex];
                ctx.shadowColor = palette.nodeGlow;
                ctx.shadowBlur = 10;
                ctx.fill();
                ctx.shadowBlur = 0;
            }

            // Desenha as arestas múltiplas (curvatura paramétrica para multigrafos)
            for (let e = 0; e < edges.length; e++) {
                const edge = edges[e];
                const n1 = nodes[edge.source];
                const n2 = nodes[edge.target];
                const dx = n2.x - n1.x;
                const dy = n2.y - n1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Desenha apenas se a distância não for excessiva para manter leveza
                if (dist > 380) continue;

                const baseColor = palette.edges[edge.type];
                ctx.lineWidth = 1.2;

                if (edge.multiplicity === 1) {
                    // Aresta reta simples
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.lineTo(n2.x, n2.y);
                    ctx.strokeStyle = baseColor;
                    ctx.stroke();
                } else {
                    // Multiarestas: desenha arcos curvados paralelos (característica essencial de multigrafos!)
                    const midX = (n1.x + n2.x) / 2;
                    const midY = (n1.y + n2.y) / 2;
                    const normalX = -dy / dist;
                    const normalY = dx / dist;

                    // Aresta 1: curvada para a direita
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.quadraticCurveTo(midX + normalX * 18, midY + normalY * 18, n2.x, n2.y);
                    ctx.strokeStyle = palette.edges[0];
                    ctx.stroke();

                    // Aresta 2: curvada para a esquerda
                    ctx.beginPath();
                    ctx.moveTo(n1.x, n1.y);
                    ctx.quadraticCurveTo(midX - normalX * 18, midY - normalY * 18, n2.x, n2.y);
                    ctx.strokeStyle = palette.edges[1];
                    ctx.stroke();
                }
            }
        }

        function loop() {
            if (!isVisible) {
                animationFrameId = null;
                return;
            }
            drawMultigraph();
            animationFrameId = requestAnimationFrame(loop);
        }

        loop();
    }

    /* ==========================================================================
       4. FILTRO DE PROJETOS (PROJECTS.HTML)
       ========================================================================== */
    function initProjectFilters() {
        const filterButtons = document.querySelectorAll('.project-filter-btn');
        const projectCards = document.querySelectorAll('.project-card[data-category]');

        if (!filterButtons.length || !projectCards.length) return;

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-filter');

                filterButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                let matchCount = 0;
                projectCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category') || '';
                    const categories = cardCategory.split(' ').map(c => c.trim());

                    if (category === 'all' || categories.includes(category)) {
                        card.classList.remove('filter-hidden');
                        card.style.display = '';
                        matchCount++;
                    } else {
                        card.classList.add('filter-hidden');
                        card.style.display = 'none';
                    }
                });

                const countBadge = document.getElementById('project-filter-count');
                if (countBadge) {
                    const isEn = document.documentElement.getAttribute('lang')?.startsWith('en');
                    countBadge.textContent = isEn
                        ? `${matchCount} project${matchCount !== 1 ? 's' : ''}`
                        : `${matchCount} projeto${matchCount !== 1 ? 's' : ''}`;
                }
            });
        });
    }

    /* ==========================================================================
       5. BOTÃO VOLTAR AO TOPO COM INDICADOR DE PROGRESSO
       ========================================================================== */
    function initScrollToTop() {
        let btn = document.getElementById('back-to-top');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'back-to-top';
            btn.className = 'back-to-top';
            btn.setAttribute('aria-label', 'Voltar ao topo da página');
            btn.innerHTML = `
                <svg class="progress-ring" width="46" height="46" viewBox="0 0 46 46">
                    <circle class="progress-ring__circle" stroke="currentColor" stroke-width="3" fill="transparent" r="20" cx="23" cy="23"/>
                </svg>
                <i class="fa-solid fa-arrow-up"></i>
            `;
            document.body.appendChild(btn);
        }

        const circle = btn.querySelector('.progress-ring__circle');
        const radius = circle ? circle.r.baseVal.value : 20;
        const circumference = radius * 2 * Math.PI;

        if (circle) {
            circle.style.strokeDasharray = `${circumference} ${circumference}`;
            circle.style.strokeDashoffset = circumference;
        }

        function updateProgress() {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const progress = scrollHeight > 0 ? scrollTop / scrollHeight : 0;

            if (scrollTop > 260) {
                btn.classList.add('visible');
            } else {
                btn.classList.remove('visible');
            }

            if (circle) {
                const offset = circumference - progress * circumference;
                circle.style.strokeDashoffset = offset;
            }
        }

        window.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        btn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    /* ==========================================================================
       6. MODAL DE CONTATO RÁPIDO
       ========================================================================== */
    function initContactModal() {
        const modal = document.getElementById('contact-modal');
        if (!modal) return;

        function openModal() {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            const firstInput = modal.querySelector('input, textarea');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        // Delegação para botões de abertura
        document.addEventListener('click', (e) => {
            const trigger = e.target.closest('[data-open-modal="contact"]');
            if (trigger) {
                e.preventDefault();
                openModal();
            }
        });

        // Fechar ao clicar no botão de fechar ou no backdrop
        modal.addEventListener('click', (e) => {
            if (e.target === modal || e.target.closest('.modal-close')) {
                closeModal();
            }
        });

        // Fechar com tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal();
            }
        });

        // Manipulação do formulário
        const form = modal.querySelector('.contact-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = form.querySelector('[name="name"]');
                const emailInput = form.querySelector('[name="email"]');
                const msgInput = form.querySelector('[name="message"]');

                const name = nameInput ? nameInput.value.trim() : '';
                const email = emailInput ? emailInput.value.trim() : '';
                const message = msgInput ? msgInput.value.trim() : '';

                if (!name || !message) {
                    showToast('Por favor, preencha seu nome e mensagem.', 'fa-exclamation-circle');
                    return;
                }

                // Prepara e abre o cliente de e-mail padrão
                const subject = encodeURIComponent(`Contato de ${name} via Portfólio`);
                const body = encodeURIComponent(`Olá Axl,\n\n${message}\n\nAtenciosamente,\n${name}\nE-mail: ${email}`);
                const mailtoUrl = `mailto:andradesaxl@gmail.com?subject=${subject}&body=${body}`;

                window.location.href = mailtoUrl;
                showToast('Mensagem preparada no seu e-mail!', 'fa-paper-plane');
                form.reset();
                setTimeout(closeModal, 600);
            });
        }
    }

    /* ==========================================================================
       7. FILTROS DO BLOG (BLOG.HTML)
       ========================================================================== */
    function initBlogFilters() {
        const filterButtons = document.querySelectorAll('.blog-filter-btn');
        const postCards = document.querySelectorAll('.post-card[data-category]');

        if (!filterButtons.length || !postCards.length) return;

        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.getAttribute('data-filter');

                filterButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');

                let matchCount = 0;
                postCards.forEach(card => {
                    const cardCategory = card.getAttribute('data-category') || '';
                    if (category === 'all' || cardCategory === category) {
                        card.style.display = '';
                        matchCount++;
                    } else {
                        card.style.display = 'none';
                    }
                });

                const countBadge = document.getElementById('blog-filter-count');
                if (countBadge) {
                    const isEn = document.documentElement.getAttribute('lang')?.startsWith('en');
                    countBadge.textContent = isEn
                        ? `${matchCount} article${matchCount !== 1 ? 's' : ''}`
                        : `${matchCount} artigo${matchCount !== 1 ? 's' : ''}`;
                }
            });
        });
    }

    /* ==========================================================================
       8. SISTEMA DE INTERNACIONALIZAÇÃO (BILINGUE PT / EN)
       ========================================================================== */
    const LANG_STORAGE_KEY = 'axl_portfolio_lang';

    function getPreferredLanguage() {
        const storedLang = localStorage.getItem(LANG_STORAGE_KEY);
        if (storedLang && (storedLang === 'en' || storedLang === 'pt')) {
            return storedLang;
        }
        return 'pt';
    }

    const UI_TRANSLATIONS = {
        en: {
            nav: {
                'index.html': 'Home',
                'projects.html': 'Projects',
                'about.html': 'About',
                'blog.html': 'Blog'
            },
            filters: {
                'all': 'All',
                'ai': 'AI & LLMs',
                'optimization': 'Networks & Optimization',
                'audio': 'Audio & Fourier',
                'logic': 'Symbolic Logic',
                'games': 'Games & Web',
                'research': 'Scientific Research',
                'dev': 'Development',
                'math': 'Applied Math'
            },
            common: {
                rights: '© 2026 Axl Silva de Andrade. All rights reserved.'
            },
            modal: {
                eyebrow: "Let's talk?",
                title: 'Send a message',
                desc: 'Academic research proposals, teaching, project collaborations or talks.',
                nameLabel: 'Your Name',
                emailLabel: 'Your Email',
                msgLabel: 'Message',
                sendBtn: 'Send Message'
            },
            notfound: {
                eyebrow: 'Point of Discontinuity',
                title: 'Outside Function Domain',
                desc: 'The coordinate or page you tried to access diverged to infinity, was discontinued, or belongs to the empty set ∅.',
                homeBtn: 'Back to Home',
                projectsBtn: 'View Projects',
                blogBtn: 'Go to Blog'
            }
        },
        pt: {
            nav: {
                'index.html': 'Início',
                'projects.html': 'Projetos',
                'about.html': 'Sobre',
                'blog.html': 'Blog'
            },
            filters: {
                'all': 'Todos',
                'ai': 'IA & LLMs',
                'optimization': 'Redes & Otimização',
                'audio': 'Áudio & Fourier',
                'logic': 'Lógica Simbólica',
                'games': 'Jogos & Web',
                'research': 'Pesquisa Científica',
                'dev': 'Desenvolvimento',
                'math': 'Matemática Aplicada'
            },
            common: {
                rights: '© 2026 Axl Silva de Andrade. Todos os direitos reservados.'
            },
            modal: {
                eyebrow: 'Vamos conversar?',
                title: 'Envie uma mensagem',
                desc: 'Propostas de pesquisa acadêmica, docência, desenvolvimento de projetos ou palestras.',
                nameLabel: 'Seu Nome',
                emailLabel: 'Seu E-mail',
                msgLabel: 'Mensagem',
                sendBtn: 'Enviar Mensagem'
            },
            notfound: {
                eyebrow: 'Ponto de Descontinuidade',
                title: 'Fora do Domínio da Função',
                desc: 'A coordenada ou página que você tentou acessar divergiu para o infinito, foi descontinuada ou pertence ao conjunto vazio ∅.',
                homeBtn: 'Voltar ao Início',
                projectsBtn: 'Ver Projetos',
                blogBtn: 'Ir para o Blog'
            }
        }
    };

    function applyLanguage(lang) {
        document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'pt-br');

        // Atualiza textos do menu de navegação
        document.querySelectorAll('.nav-menu a').forEach(link => {
            const href = link.getAttribute('href');
            if (href && UI_TRANSLATIONS[lang].nav[href]) {
                link.textContent = UI_TRANSLATIONS[lang].nav[href];
            }
        });

        // Atualiza botões do toggle de idioma
        document.querySelectorAll('.lang-toggle').forEach(btn => {
            const span = btn.querySelector('.lang-text');
            if (span) {
                span.textContent = lang === 'en' ? 'PT' : 'EN';
            }
            btn.setAttribute('aria-label', lang === 'en' ? 'Mudar idioma para Português' : 'Switch language to English');
            btn.setAttribute('title', lang === 'en' ? 'Alternar para Português' : 'Switch to English');
        });

        // Atualiza filtros de projetos e blog preservando ícones
        document.querySelectorAll('.project-filter-btn, .blog-filter-btn').forEach(btn => {
            const filter = btn.getAttribute('data-filter');
            if (filter && UI_TRANSLATIONS[lang].filters[filter]) {
                const icon = btn.querySelector('i');
                const label = UI_TRANSLATIONS[lang].filters[filter];
                btn.innerHTML = '';
                if (icon) btn.appendChild(icon);
                btn.append(' ' + label);
            }
        });

        // Atualiza elementos específicos com atributos data-i18n-en e data-i18n-pt
        document.querySelectorAll('[data-i18n-en]').forEach(el => {
            const target = el.querySelector('.i18n-text') || el;
            if (!el.hasAttribute('data-i18n-pt')) {
                el.setAttribute('data-i18n-pt', target.textContent.trim());
            }
            target.textContent = lang === 'en' ? el.getAttribute('data-i18n-en') : el.getAttribute('data-i18n-pt');
        });

        // Atualiza modal de contato
        const modal = document.getElementById('contact-modal');
        if (modal) {
            const eyebrow = modal.querySelector('.eyebrow');
            if (eyebrow) eyebrow.textContent = UI_TRANSLATIONS[lang].modal.eyebrow;
            const title = modal.querySelector('#modal-title');
            if (title) title.textContent = UI_TRANSLATIONS[lang].modal.title;
            const desc = modal.querySelector('.modal-header p:last-child');
            if (desc) desc.textContent = UI_TRANSLATIONS[lang].modal.desc;
            const nameLabel = modal.querySelector('label[for="contact-name"]');
            if (nameLabel) nameLabel.textContent = UI_TRANSLATIONS[lang].modal.nameLabel;
            const emailLabel = modal.querySelector('label[for="contact-email"]');
            if (emailLabel) emailLabel.textContent = UI_TRANSLATIONS[lang].modal.emailLabel;
            const msgLabel = modal.querySelector('label[for="contact-msg"]');
            if (msgLabel) msgLabel.textContent = UI_TRANSLATIONS[lang].modal.msgLabel;
            const submitBtn = modal.querySelector('.form-actions button[type="submit"]');
            if (submitBtn) {
                const icon = submitBtn.querySelector('i');
                submitBtn.innerHTML = '';
                if (icon) submitBtn.appendChild(icon);
                submitBtn.append(' ' + UI_TRANSLATIONS[lang].modal.sendBtn);
            }
        }

        // Atualiza página 404 se estiver nela
        const notfound = document.querySelector('.notfound-hero');
        if (notfound) {
            const eyebrow = notfound.querySelector('.eyebrow');
            const h1 = notfound.querySelector('h1');
            const desc = notfound.querySelector('p:not(.eyebrow)');
            if (eyebrow) eyebrow.textContent = UI_TRANSLATIONS[lang].notfound.eyebrow;
            if (h1) h1.textContent = UI_TRANSLATIONS[lang].notfound.title;
            if (desc) desc.textContent = UI_TRANSLATIONS[lang].notfound.desc;
        }

        // Atualiza badges de contagem se existirem
        const projectCountBadge = document.getElementById('project-filter-count');
        if (projectCountBadge) {
            const num = parseInt(projectCountBadge.textContent, 10) || 0;
            projectCountBadge.textContent = lang === 'en'
                ? `${num} project${num !== 1 ? 's' : ''}`
                : `${num} projeto${num !== 1 ? 's' : ''}`;
        }
        const blogCountBadge = document.getElementById('blog-filter-count');
        if (blogCountBadge) {
            const num = parseInt(blogCountBadge.textContent, 10) || 0;
            blogCountBadge.textContent = lang === 'en'
                ? `${num} article${num !== 1 ? 's' : ''}`
                : `${num} artigo${num !== 1 ? 's' : ''}`;
        }

        // Atualiza rodapé
        document.querySelectorAll('footer p').forEach(p => {
            if (p.textContent.includes('Axl Silva de Andrade')) {
                p.textContent = UI_TRANSLATIONS[lang].common.rights;
            }
        });
    }

    function toggleLanguage() {
        const currentLang = document.documentElement.getAttribute('lang')?.startsWith('en') ? 'en' : 'pt';
        const newLang = currentLang === 'en' ? 'pt' : 'en';
        localStorage.setItem(LANG_STORAGE_KEY, newLang);
        applyLanguage(newLang);
        showToast(newLang === 'en' ? 'Language switched to English' : 'Idioma alterado para Português', 'fa-globe');
    }

    /* ==========================================================================
       9. INICIALIZAÇÃO GERAL NO CARREGAMENTO DO DOM
       ========================================================================== */
    document.addEventListener('DOMContentLoaded', () => {
        // Vincula botões de alternância de tema
        document.querySelectorAll('.theme-toggle').forEach(btn => {
            btn.addEventListener('click', toggleTheme);
        });

        // Vincula botões de alternância de idioma
        document.querySelectorAll('.lang-toggle').forEach(btn => {
            btn.addEventListener('click', toggleLanguage);
        });

        // Aplica o idioma salvo ou padrão
        const initialLang = getPreferredLanguage();
        if (initialLang === 'en') {
            applyLanguage('en');
        }

        // Delegação de cliques para botões com atributo data-copy
        document.addEventListener('click', (e) => {
            const copyBtn = e.target.closest('[data-copy]');
            if (copyBtn) {
                const text = copyBtn.getAttribute('data-copy');
                const label = copyBtn.getAttribute('data-copy-label') || 'Copiado!';
                if (text) {
                    copyToClipboard(text, label);
                }
            }
        });

        // Inicializa canvas se existir
        initMultigraphCanvas();

        // Inicializa filtros de projetos
        initProjectFilters();

        // Inicializa filtros do blog
        initBlogFilters();

        // Inicializa modal de contato
        initContactModal();

        // Inicializa botão voltar ao topo
        initScrollToTop();
    });

})();
