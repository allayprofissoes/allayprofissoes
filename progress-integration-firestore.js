/**
 * Integração do Sistema de Progresso com Firebase Firestore para o Portal do Aluno
 * Versão 2.0 - Com tratamento robusto de dados do vídeo atual
 */

// Função para inicializar a integração do sistema de progresso
function initProgressSystem() {
    console.log('=== INICIANDO SISTEMA DE PROGRESSO V2.0 ===');
    
    // Verifica se o Firebase está disponível
    if (!firebase || !firebase.firestore) {
        console.error('Firebase ou Firestore não encontrado');
        return;
    }
    
    // Obtém a instância do Firestore
    const firestore = firebase.firestore();
    
    // Variáveis para armazenar referências aos módulos e vídeos
    let allModules = [];
    let progressSystem = null;
    
    // Objeto para armazenar dados do vídeo atual de forma mais robusta
    let currentVideoSession = {
        moduleId: null,
        videoId: null,
        moduleIndex: -1,
        videoIndex: -1,
        moduleName: null,
        videoTitle: null,
        isValid: false,
        timestamp: null
    };
    
    // Função para debug - mostra o estado atual
    function debugCurrentState() {
        console.log('=== DEBUG ESTADO ATUAL ===');
        console.log('currentVideoSession:', currentVideoSession);
        console.log('window.currentPlayingModuleIndex:', window.currentPlayingModuleIndex);
        console.log('window.currentPlayingVideoIndex:', window.currentPlayingVideoIndex);
        console.log('allModules.length:', allModules.length);
        console.log('progressSystem inicializado:', !!progressSystem);
        console.log('========================');
    }
    
    // Função para verificar se o sistema pode ser inicializado
    function canInitializeSystem() {
        const currentCourseId = window.currentCourseId;
        const currentUser = window.currentUser;
        
        if (!currentUser || !currentUser.email) {
            console.log('Usuário ainda não autenticado, aguardando...');
            return false;
        }
        
        if (!currentCourseId) {
            console.log('ID do curso ainda não definido, aguardando...');
            return false;
        }
        
        return true;
    }
    
    // Função para inicializar o sistema de progresso
    function initializeProgressSystem() {
        if (!canInitializeSystem()) {
            return null;
        }
        
        const currentCourseId = window.currentCourseId;
        const currentUser = window.currentUser;
        
        console.log('Inicializando sistema de progresso para usuário:', currentUser.email, 'e curso:', currentCourseId);
        
        // Inicializa o sistema de progresso com o Firestore
        progressSystem = window.VideoProgressSystem.init(currentUser.email, currentCourseId, firestore);
        
        if (!progressSystem) {
            console.error('Falha ao inicializar sistema de progresso');
            return null;
        }
        
        console.log('Sistema de progresso inicializado com sucesso');
        return progressSystem;
    }
    
    // Função para atualizar os dados do vídeo atual
    function updateCurrentVideoSession(moduleIndex, videoIndex) {
        console.log(`=== ATUALIZANDO SESSÃO DO VÍDEO ===`);
        console.log(`Parâmetros recebidos: moduleIndex=${moduleIndex}, videoIndex=${videoIndex}`);
        
        // Reset da sessão
        currentVideoSession = {
            moduleId: null,
            videoId: null,
            moduleIndex: -1,
            videoIndex: -1,
            moduleName: null,
            videoTitle: null,
            isValid: false,
            timestamp: new Date().toISOString()
        };
        
        // Validações básicas
        if (moduleIndex < 0 || videoIndex < 0) {
            console.error('Índices inválidos:', { moduleIndex, videoIndex });
            return false;
        }
        
        if (!allModules || allModules.length === 0) {
            console.error('Módulos não carregados');
            return false;
        }
        
        if (moduleIndex >= allModules.length) {
            console.error('Índice de módulo fora do range:', moduleIndex, 'total:', allModules.length);
            return false;
        }
        
        const module = allModules[moduleIndex];
        if (!module) {
            console.error('Módulo não encontrado no índice:', moduleIndex);
            return false;
        }
        
        if (!module.videos || !Array.isArray(module.videos)) {
            console.error('Vídeos do módulo não encontrados ou inválidos:', module);
            return false;
        }
        
        if (videoIndex >= module.videos.length) {
            console.error('Índice de vídeo fora do range:', videoIndex, 'total:', module.videos.length);
            return false;
        }
        
        const video = module.videos[videoIndex];
        if (!video) {
            console.error('Vídeo não encontrado no índice:', videoIndex);
            return false;
        }
        
        if (!module.id || !video.id) {
            console.error('IDs do módulo ou vídeo ausentes:', { moduleId: module.id, videoId: video.id });
            return false;
        }
        
        // Atualiza a sessão com dados válidos
        currentVideoSession = {
            moduleId: module.id,
            videoId: video.id,
            moduleIndex: moduleIndex,
            videoIndex: videoIndex,
            moduleName: module.name || 'Módulo sem nome',
            videoTitle: video.title || 'Vídeo sem título',
            isValid: true,
            timestamp: new Date().toISOString()
        };
        
        console.log('Sessão do vídeo atualizada com sucesso:', currentVideoSession);
        return true;
    }
    
    // Função para obter dados do vídeo atual de forma robusta
    function getCurrentVideoData() {
        console.log('=== OBTENDO DADOS DO VÍDEO ATUAL ===');
        
        // Primeiro, verifica se temos uma sessão válida
        if (currentVideoSession.isValid) {
            console.log('Usando dados da sessão válida:', currentVideoSession);
            return currentVideoSession;
        }
        
        // Se não tem sessão válida, tenta obter dos índices globais
        console.log('Sessão inválida, tentando obter dos índices globais...');
        
        const moduleIndex = window.currentPlayingModuleIndex;
        const videoIndex = window.currentPlayingVideoIndex;
        
        console.log('Índices globais:', { moduleIndex, videoIndex });
        
        if (updateCurrentVideoSession(moduleIndex, videoIndex)) {
            return currentVideoSession;
        }
        
        console.error('Não foi possível obter dados do vídeo atual');
        debugCurrentState();
        return null;
    }
    
    // Função para marcar um vídeo como assistido
    async function markCurrentVideoAsWatched() {
        console.log('=== MARCANDO VÍDEO COMO ASSISTIDO ===');
        
        if (!progressSystem || !progressSystem.isInitialized()) {
            console.error('Sistema de progresso não inicializado');
            return false;
        }
        
        const videoData = getCurrentVideoData();
        if (!videoData || !videoData.isValid) {
            console.error('Dados do módulo ou vídeo inválidos');
            debugCurrentState();
            return false;
        }
        
        console.log('Marcando vídeo como assistido:', {
            moduleId: videoData.moduleId,
            videoId: videoData.videoId,
            moduleName: videoData.moduleName,
            videoTitle: videoData.videoTitle
        });
        
        try {
            const result = await progressSystem.markVideoWatched(videoData.moduleId, videoData.videoId, true);
            
            if (result) {
                console.log('Vídeo marcado como assistido com sucesso');
                // Atualiza a interface
                updateProgressUI();
                return true;
            } else {
                console.error('Erro ao marcar vídeo como assistido');
                return false;
            }
        } catch (error) {
            console.error('Exceção ao marcar vídeo como assistido:', error);
            return false;
        }
    }
    
    // Função para marcar um vídeo específico como assistido
    async function markVideoAsWatched(moduleId, videoId) {
        console.log('=== MARCANDO VÍDEO ESPECÍFICO COMO ASSISTIDO ===');
        console.log('Parâmetros:', { moduleId, videoId });
        
        if (!progressSystem || !progressSystem.isInitialized()) {
            console.error('Sistema de progresso não inicializado');
            return false;
        }
        
        if (!moduleId || !videoId) {
            console.error('ID do módulo ou vídeo não fornecido');
            return false;
        }
        
        try {
            const result = await progressSystem.markVideoWatched(moduleId, videoId, true);
            
            if (result) {
                console.log('Vídeo específico marcado como assistido com sucesso');
                // Atualiza a interface
                updateProgressUI();
                return true;
            } else {
                console.error('Erro ao marcar vídeo específico como assistido');
                return false;
            }
        } catch (error) {
            console.error('Exceção ao marcar vídeo específico como assistido:', error);
            return false;
        }
    }
    
    // Função para atualizar a interface do usuário com o progresso
    function updateProgressUI() {
        if (!progressSystem || !progressSystem.isInitialized()) {
            console.log('Sistema de progresso não inicializado, pulando atualização da UI');
            return;
        }
        
        console.log('Atualizando interface de progresso...');
        
        // Calcula o progresso geral do curso
        const courseProgress = progressSystem.getCourseProgress(allModules);
        console.log('Progresso do curso:', courseProgress + '%');
        
        // Atualiza ou cria o resumo de progresso do curso
        let progressSummary = document.getElementById('course-progress-summary');
        if (!progressSummary) {
            // Cria o elemento de resumo de progresso
            progressSummary = document.createElement('div');
            progressSummary.id = 'course-progress-summary';
            progressSummary.className = 'progress-summary';
            
            
            
            const progressContainer = document.createElement('div');
            progressContainer.className = 'progress-container';
            
            const progressBar = document.createElement('div');
            progressBar.className = 'progress-bar';
            progressBar.style.width = courseProgress + '%';
            
            const progressText = document.createElement('div');
            progressText.className = 'progress-text';
            progressText.textContent = courseProgress + '% concluído';
            
            progressContainer.appendChild(progressBar);
            progressSummary.appendChild(progressTitle);
            progressSummary.appendChild(progressContainer);
            progressSummary.appendChild(progressText);
            
            // Insere o resumo de progresso no início dos materiais do curso
            const materialsContainer = document.querySelector('.course-materials');
            if (materialsContainer) {
                const materialsHeader = materialsContainer.querySelector('.materials-header');
                if (materialsHeader) {
                    materialsContainer.insertBefore(progressSummary, materialsHeader.nextSibling);
                    console.log('Resumo de progresso do curso criado e inserido na página');
                }
            }
        } else {
            // Atualiza a barra de progresso existente
            const progressBar = progressSummary.querySelector('.progress-bar');
            const progressText = progressSummary.querySelector('.progress-text');
            
            if (progressBar) {
                progressBar.style.width = courseProgress + '%';
            }
            
            if (progressText) {
                progressText.textContent = courseProgress + '% concluído';
            }
            
            console.log('Barra de progresso do curso atualizada');
        }
        
        // Atualiza os indicadores de vídeos assistidos
        document.querySelectorAll('.video-item').forEach(videoItem => {
            const moduleId = videoItem.dataset.moduleId;
            const videoId = videoItem.dataset.videoId;
            
            if (moduleId && videoId) {
                // Verifica se o vídeo foi assistido
                const isWatched = progressSystem.isVideoWatched(moduleId, videoId);
                
                // Remove o indicador existente, se houver
                const existingIndicator = videoItem.querySelector('.video-watched-indicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                
                // Adiciona o indicador se o vídeo foi assistido
                if (isWatched) {
                    const indicator = document.createElement('div');
                    indicator.className = 'video-watched-indicator';
                    indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                    videoItem.appendChild(indicator);
                }
            }
        });
        
        // Atualiza o progresso dos módulos
        allModules.forEach((module, index) => {
            if (!module || !module.id) {
                return;
            }
            
            const moduleId = module.id;
            const videos = module.videos || [];
            const videoIds = videos.map(video => video && video.id ? video.id : null).filter(id => id !== null);
            
            // Calcula o progresso do módulo
            const progress = progressSystem.getModuleProgress(moduleId, videoIds);
            
            console.log(`Progresso do módulo ${moduleId}: ${progress}%`);
            
            // Atualiza o indicador de progresso do módulo na interface
            const moduleElement = document.querySelector(`.module-item[data-module-id="${moduleId}"]`);
            if (moduleElement) {
                // Remove o indicador existente, se houver
                const existingIndicator = moduleElement.querySelector('.module-progress-indicator');
                if (existingIndicator) {
                    existingIndicator.remove();
                }
                
                // Adiciona o novo indicador de progresso
                const header = moduleElement.querySelector('.module-header');
                if (header) {
                    const indicator = document.createElement('div');
                    indicator.className = 'module-progress-indicator';
                    indicator.innerHTML = `<span>${progress}% concluído</span>`;
                    header.appendChild(indicator);
                }
            }
        });
    }
    
    // Função para mostrar o último vídeo assistido
    async function showLastWatchedVideo() {
        if (!progressSystem || !progressSystem.isInitialized()) {
            console.log('Sistema de progresso não inicializado, pulando último vídeo assistido');
            return;
        }
        
        // Obtém informações sobre o último vídeo assistido
        const lastWatched = progressSystem.getLastWatchedVideo();
        if (!lastWatched) {
            console.log('Nenhum vídeo assistido anteriormente');
            return;
        }
        
        console.log('Último vídeo assistido:', lastWatched);
        
        // Encontra os dados do módulo e vídeo
        let moduleData = null;
        let videoData = null;
        let moduleIndex = -1;
        let videoIndex = -1;
        
        for (let i = 0; i < allModules.length; i++) {
            const module = allModules[i];
            if (module && module.id === lastWatched.moduleId) {
                moduleData = module;
                moduleIndex = i;
                
                const videos = module.videos || [];
                for (let j = 0; j < videos.length; j++) {
                    const video = videos[j];
                    if (video && video.id === lastWatched.videoId) {
                        videoData = video;
                        videoIndex = j;
                        break;
                    }
                }
                
                break;
            }
        }
        
        if (!moduleData || !videoData) {
            console.log('Dados do último vídeo assistido não encontrados');
            return;
        }
        
        // Remove o componente existente, se houver
        const existingContainer = document.getElementById('last-watched-container');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        // Cria o componente de último vídeo assistido
        const lastWatchedContainer = document.createElement('div');
        lastWatchedContainer.id = 'last-watched-container';
        lastWatchedContainer.className = 'last-watched-container';
        
        const lastWatchedTitle = document.createElement('h3');
        lastWatchedTitle.className = 'last-watched-title';
        lastWatchedTitle.innerHTML = '<i class="fas fa-history"></i> Continue de onde parou';
        
        const lastWatchedContent = document.createElement('div');
        lastWatchedContent.className = 'last-watched-content';
        
        const lastWatchedInfo = document.createElement('div');
        lastWatchedInfo.className = 'last-watched-info';
        lastWatchedInfo.innerHTML = `
            <h4>${videoData.title || 'Vídeo sem título'}</h4>
            <p>Módulo: ${moduleData.name || 'Módulo sem nome'}</p>
        `;
        
        const lastWatchedButton = document.createElement('button');
        lastWatchedButton.className = 'last-watched-button';
        lastWatchedButton.innerHTML = '<i class="fas fa-play"></i> Continuar';
        lastWatchedButton.addEventListener('click', () => {
            // Reproduz o vídeo
            if (typeof window.playVideo === 'function') {
                window.playVideo(moduleIndex, videoIndex);
            }
        });
        
        lastWatchedContent.appendChild(lastWatchedInfo);
        lastWatchedContent.appendChild(lastWatchedButton);
        
        lastWatchedContainer.appendChild(lastWatchedTitle);
        lastWatchedContainer.appendChild(lastWatchedContent);
        
        // Insere o componente no início dos materiais do curso
        const courseHeader = document.querySelector('.course-header');
        if (courseHeader) {
            courseHeader.parentNode.insertBefore(lastWatchedContainer, courseHeader.nextSibling);
            console.log('Componente de último vídeo assistido inserido na página');
        }
    }
    
    // Função para inicializar o sistema de progresso após o carregamento dos módulos
    async function initializeProgressAfterModulesLoad() {
        console.log('=== INICIALIZANDO PROGRESSO APÓS CARREGAMENTO DOS MÓDULOS ===');
        
        // Armazena referência aos módulos
        allModules = window.currentCourseModules || [];
        console.log('Módulos carregados:', allModules.length);
        
        // Tenta inicializar o sistema de progresso
        if (!progressSystem) {
            progressSystem = initializeProgressSystem();
        }
        
        if (!progressSystem) {
            console.error('Não foi possível inicializar o sistema de progresso');
            return;
        }
        
        // Carrega os dados de progresso do Firestore
        await progressSystem.loadProgressData();
        
        // Atualiza a interface do usuário
        updateProgressUI();
        
        // Mostra o último vídeo assistido
        await showLastWatchedVideo();
        
      
        console.log('=== INICIALIZAÇÃO COMPLETA ===');
    }
    
    // Função para adicionar o botão "Marcar como assistido" ao player de vídeo
    function addMarkAsWatchedButton() {
        // Remove o botão existente, se houver
        const existingButton = document.getElementById('mark-as-watched-btn');
        if (existingButton) {
            existingButton.remove();
        }
        
        // Cria o botão
        const markAsWatchedBtn = document.createElement('button');
        markAsWatchedBtn.id = 'mark-as-watched-btn';
        markAsWatchedBtn.className = 'nav-btn mark-watched-btn';
        markAsWatchedBtn.innerHTML = '<i class="fas fa-check"></i> <span>Marcar como assistido</span>';
        
        // Adiciona o evento de clique
        markAsWatchedBtn.addEventListener('click', () => {
            console.log('Botão "Marcar como assistido" clicado');
            markCurrentVideoAsWatched();
        });
        
        // Adiciona o botão à navegação do vídeo
        const videoNavigation = document.querySelector('.video-navigation');
        if (videoNavigation) {
            videoNavigation.appendChild(markAsWatchedBtn);
            console.log('Botão "Marcar como assistido" adicionado');
        }
    }
    
    // Sobrescreve a função loadModules para incluir a inicialização do progresso
    const originalLoadModules = window.loadModules;
    window.loadModules = function(modules) {
        console.log('=== FUNÇÃO LOADMODULES SOBRESCRITA ===');
        console.log('Módulos recebidos:', modules ? modules.length : 0);
        
        // Chama a função original
        if (originalLoadModules) {
            originalLoadModules(modules);
        }
        
        // Inicializa o progresso após um pequeno delay para garantir que a DOM foi atualizada
        setTimeout(() => {
            initializeProgressAfterModulesLoad();
        }, 500);
    };
    
    // Sobrescreve a função playVideo para incluir o salvamento de progresso
    const originalPlayVideo = window.playVideo;
    window.playVideo = function(moduleIndex, videoIndex) {
        console.log('=== FUNÇÃO PLAYVIDEO SOBRESCRITA ===');
        console.log(`Parâmetros: moduleIndex=${moduleIndex}, videoIndex=${videoIndex}`);
        
        // Atualiza a sessão do vídeo atual ANTES de chamar a função original
        updateCurrentVideoSession(moduleIndex, videoIndex);
        
        // Chama a função original
        if (originalPlayVideo) {
            originalPlayVideo(moduleIndex, videoIndex);
        }
        
        // Marca o vídeo como assistido após um curto período
        setTimeout(() => {
            if (progressSystem && progressSystem.isInitialized() && currentVideoSession.isValid) {
                console.log('Marcando vídeo como assistido após início da reprodução');
                markVideoAsWatched(currentVideoSession.moduleId, currentVideoSession.videoId);
            }
        }, 3000); // 3 segundos
    };
    
    // Sobrescreve a função onPlayerStateChange para incluir o salvamento de progresso
    const originalOnPlayerStateChange = window.onPlayerStateChange;
    window.onPlayerStateChange = function(event) {
        console.log('=== ESTADO DO PLAYER MUDOU ===');
        console.log('Estado:', event.data);
        
        // Chama a função original
        if (originalOnPlayerStateChange) {
            originalOnPlayerStateChange(event);
        }
        
        // Verifica se o vídeo terminou
        if (event.data === YT.PlayerState.ENDED) {
            console.log('=== VÍDEO TERMINOU ===');
            
            // Debug do estado atual
            debugCurrentState();
            
            // Tenta marcar como assistido usando a sessão atual
            if (currentVideoSession.isValid) {
                console.log('Usando dados da sessão para marcar como assistido');
                markVideoAsWatched(currentVideoSession.moduleId, currentVideoSession.videoId);
            } else {
                console.log('Sessão inválida, tentando método alternativo');
                markCurrentVideoAsWatched();
            }
        }
    };
    
    // Função para tentar inicializar o sistema periodicamente
    function tryInitializeSystem() {
        if (!progressSystem && canInitializeSystem()) {
            progressSystem = initializeProgressSystem();
            
            if (progressSystem) {
                console.log('Sistema de progresso inicializado com sucesso');
                
                // Se os módulos já estiverem carregados, inicializa o progresso imediatamente
                if (window.currentCourseModules && window.currentCourseModules.length > 0) {
                    console.log('Módulos já carregados, inicializando progresso imediatamente');
                    initializeProgressAfterModulesLoad();
                }
            }
        }
    }
    
    // Tenta inicializar imediatamente
    tryInitializeSystem();
    
    // Se não conseguiu inicializar, tenta novamente a cada 2 segundos
    const initInterval = setInterval(() => {
        if (!progressSystem) {
            console.log('Tentando inicializar sistema de progresso...');
            tryInitializeSystem();
        } else {
            clearInterval(initInterval);
        }
    }, 2000);
    
    // Para de tentar após 30 segundos
    setTimeout(() => {
        if (initInterval) {
            clearInterval(initInterval);
            if (!progressSystem) {
                console.error('Falha ao inicializar sistema de progresso após 30 segundos');
            }
        }
    }, 30000);
    
    // Adiciona estilos CSS para os componentes de progresso
    addProgressStyles();
    
    // Expõe funções para debug
    window.debugProgressSystem = {
        getCurrentVideoData,
        debugCurrentState,
        markCurrentVideoAsWatched,
        currentVideoSession: () => currentVideoSession
    };
    
    console.log('=== SISTEMA DE PROGRESSO V2.0 INICIALIZADO ===');
}

// Função para adicionar estilos CSS para os componentes de progresso
function addProgressStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Estilos para o sistema de progresso */
        .progress-summary {
            background-color: #1e2a38;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border: 1px solid #2d3748;
        }
        
        .progress-title {
            color: #4299e1;
            font-size: 1.2em;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .progress-container {
            background-color: #2d3748;
            border-radius: 10px;
            height: 20px;
            overflow: hidden;
            margin-bottom: 10px;
        }
        
        .progress-bar {
            background: linear-gradient(90deg, #4299e1, #63b3ed);
            height: 100%;
            transition: width 0.3s ease;
            border-radius: 10px;
        }
        
        .progress-text {
            color: #a0aec0;
            font-size: 0.9em;
            text-align: center;
        }
        
        .video-watched-indicator {
            position: absolute;
            top: 5px;
            right: 5px;
            color: #48bb78;
            font-size: 1.2em;
        }
        
        .module-progress-indicator {
            color: #4299e1;
            font-size: 0.8em;
            margin-left: 10px;
        }
        
        .last-watched-container {
            background-color: #2d3748;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            border-left: 4px solid #4299e1;
        }
        
        .last-watched-title {
            color: #4299e1;
            font-size: 1.1em;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .last-watched-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
        }
        
        .last-watched-info h4 {
            color: #e2e8f0;
            margin-bottom: 5px;
        }
        
        .last-watched-info p {
            color: #a0aec0;
            font-size: 0.9em;
        }
        
        .last-watched-button {
            background-color: #4299e1;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s ease;
        }
        
        .last-watched-button:hover {
            background-color: #3182ce;
        }
        
        .mark-watched-btn {
            background-color: #48bb78;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.3s ease;
        }
        
        .mark-watched-btn:hover {
            background-color: #38a169;
        }
        
        @media (max-width: 768px) {
            .last-watched-content {
                flex-direction: column;
                align-items: flex-start;
            }
            
            .progress-summary {
                padding: 15px;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Chama a função de inicialização quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProgressSystem);
} else {
    initProgressSystem();
}

