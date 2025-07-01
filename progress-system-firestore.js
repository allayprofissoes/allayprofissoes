/**
 * Sistema de Progresso de Vídeos com Firebase Firestore
 * 
 * Este módulo implementa um sistema de rastreamento de progresso para vídeos educacionais,
 * salvando o progresso do aluno no Firebase Firestore.
 */

// Namespace para o sistema de progresso
const VideoProgressSystem = {
    // Referência para o Firestore
    firestore: null,
    userId: null,
    courseId: null,
    progressData: null,
    
    /**
     * Inicializa o sistema de progresso para um usuário específico
     * @param {string} userId - ID único do usuário/aluno (email)
     * @param {string} courseId - ID do curso atual
     * @param {Object} firestoreInstance - Instância do Firestore
     */
    init: function(userId, courseId, firestoreInstance) {
        if (!userId || !courseId || !firestoreInstance) {
            console.error('Parâmetros obrigatórios não fornecidos para inicialização do sistema de progresso');
            return null;
        }
        
        this.userId = userId;
        this.courseId = courseId;
        this.firestore = firestoreInstance;
        
        // Também mantém uma cópia local para acesso rápido
        this.progressData = {
            lastAccess: new Date().toISOString(),
            courses: {}
        };
        
        console.log('Sistema de progresso inicializado para usuário:', userId, 'curso:', courseId);
        return this;
    },
    
    /**
     * Carrega os dados de progresso do Firestore
     * @returns {Promise} Promessa que resolve quando os dados são carregados
     */
    loadProgressData: async function() {
        if (!this.firestore || !this.userId) {
            console.error('Sistema de progresso não inicializado corretamente');
            return this.progressData;
        }
        
        try {
            // Referência para o documento do aluno na coleção video_progress
            const progressRef = this.firestore.collection('video_progress').doc(this.userId);
            
            // Obtém o documento
            const doc = await progressRef.get();
            
            if (doc.exists) {
                // Se o documento existe, carrega os dados
                const data = doc.data();
                this.progressData = data || {
                    lastAccess: new Date().toISOString(),
                    courses: {}
                };
                console.log('Dados de progresso carregados do Firestore:', this.progressData);
            } else {
                // Se o documento não existe, cria um novo
                this.progressData = {
                    lastAccess: new Date().toISOString(),
                    courses: {}
                };
                
                // Salva o novo documento no Firestore
                await progressRef.set(this.progressData);
                console.log('Novo documento de progresso criado no Firestore');
            }
            
            return this.progressData;
        } catch (error) {
            console.error('Erro ao carregar dados de progresso do Firestore:', error);
            
            // Em caso de erro, usa dados locais vazios
            this.progressData = {
                lastAccess: new Date().toISOString(),
                courses: {}
            };
            
            return this.progressData;
        }
    },
    
    /**
     * Salva os dados de progresso no Firestore
     * @returns {Promise} Promessa que resolve quando os dados são salvos
     */
    saveProgressData: async function() {
        if (!this.firestore || !this.userId || !this.progressData) {
            console.error('Sistema de progresso não inicializado corretamente ou dados ausentes');
            return false;
        }
        
        try {
            // Atualiza a data de último acesso
            this.progressData.lastAccess = new Date().toISOString();
            
            // Referência para o documento do aluno na coleção video_progress
            const progressRef = this.firestore.collection('video_progress').doc(this.userId);
            
            // Salva os dados no Firestore
            await progressRef.set(this.progressData);
            
            console.log('Progresso salvo com sucesso no Firestore');
            return true;
        } catch (error) {
            console.error('Erro ao salvar progresso no Firestore:', error);
            return false;
        }
    },
    
    /**
     * Marca um vídeo como assistido
     * @param {string} moduleId - ID do módulo
     * @param {string} videoId - ID do vídeo
     * @param {boolean} watched - Status de visualização (true = assistido)
     * @returns {Promise} Promessa que resolve quando o vídeo é marcado como assistido
     */
    markVideoWatched: async function(moduleId, videoId, watched = true) {
        if (!moduleId || !videoId || !this.courseId) {
            console.error('Parâmetros obrigatórios ausentes para marcar vídeo como assistido');
            return false;
        }
        
        console.log(`Marcando vídeo como assistido: módulo=${moduleId}, vídeo=${videoId}, curso=${this.courseId}`);
        
        // Garante que a estrutura de dados existe
        if (!this.progressData.courses) {
            this.progressData.courses = {};
        }
        
        if (!this.progressData.courses[this.courseId]) {
            this.progressData.courses[this.courseId] = {
                modules: {},
                lastVideoId: null,
                lastModuleId: null
            };
        }
        
        if (!this.progressData.courses[this.courseId].modules) {
            this.progressData.courses[this.courseId].modules = {};
        }
        
        if (!this.progressData.courses[this.courseId].modules[moduleId]) {
            this.progressData.courses[this.courseId].modules[moduleId] = {
                videos: {}
            };
        }
        
        if (!this.progressData.courses[this.courseId].modules[moduleId].videos) {
            this.progressData.courses[this.courseId].modules[moduleId].videos = {};
        }
        
        // Marca o vídeo como assistido
        this.progressData.courses[this.courseId].modules[moduleId].videos[videoId] = {
            watched: watched,
            timestamp: new Date().toISOString()
        };
        
        // Atualiza o último vídeo assistido apenas se foi marcado como assistido
        if (watched) {
            this.progressData.courses[this.courseId].lastVideoId = videoId;
            this.progressData.courses[this.courseId].lastModuleId = moduleId;
        }
        
        // Salva os dados atualizados no Firestore
        const saveResult = await this.saveProgressData();
        
        if (saveResult) {
            console.log('Vídeo marcado como assistido com sucesso');
        } else {
            console.error('Erro ao salvar progresso após marcar vídeo como assistido');
        }
        
        return saveResult;
    },
    
    /**
     * Verifica se um vídeo foi assistido
     * @param {string} moduleId - ID do módulo
     * @param {string} videoId - ID do vídeo
     * @returns {boolean} true se o vídeo foi assistido, false caso contrário
     */
    isVideoWatched: function(moduleId, videoId) {
        if (!moduleId || !videoId || !this.courseId || !this.progressData) {
            return false;
        }
        
        try {
            return !!(
                this.progressData.courses &&
                this.progressData.courses[this.courseId] &&
                this.progressData.courses[this.courseId].modules &&
                this.progressData.courses[this.courseId].modules[moduleId] &&
                this.progressData.courses[this.courseId].modules[moduleId].videos &&
                this.progressData.courses[this.courseId].modules[moduleId].videos[videoId] &&
                this.progressData.courses[this.courseId].modules[moduleId].videos[videoId].watched
            );
        } catch (e) {
            console.error('Erro ao verificar se vídeo foi assistido:', e);
            return false;
        }
    },
    
    /**
     * Obtém o último vídeo assistido em um curso
     * @returns {Object|null} Objeto com moduleId e videoId do último vídeo, ou null se não houver
     */
    getLastWatchedVideo: function() {
        if (!this.courseId || !this.progressData) {
            return null;
        }
        
        try {
            const courseData = this.progressData.courses && this.progressData.courses[this.courseId];
            if (courseData && courseData.lastVideoId && courseData.lastModuleId) {
                return {
                    moduleId: courseData.lastModuleId,
                    videoId: courseData.lastVideoId
                };
            }
        } catch (e) {
            console.error('Erro ao obter último vídeo assistido:', e);
        }
        return null;
    },
    
    /**
     * Calcula a porcentagem de conclusão de um módulo baseada em vídeos concluídos
     * @param {string} moduleId - ID do módulo
     * @param {Array} videosList - Lista de IDs de vídeos no módulo
     * @returns {number} Porcentagem de conclusão (0-100)
     */
    getModuleProgress: function(moduleId, videosList) {
        if (!moduleId || !videosList || !Array.isArray(videosList) || videosList.length === 0) {
            return 0;
        }
        
        try {
            let watchedCount = 0;
            
            videosList.forEach(videoId => {
                if (this.isVideoWatched(moduleId, videoId)) {
                    watchedCount++;
                }
            });
            
            const progress = Math.round((watchedCount / videosList.length) * 100);
            console.log(`Módulo ${moduleId}: ${watchedCount}/${videosList.length} vídeos assistidos = ${progress}%`);
            
            return progress;
        } catch (e) {
            console.error('Erro ao calcular progresso do módulo:', e);
            return 0;
        }
    },
    
    /**
     * Calcula a porcentagem de conclusão total do curso baseada em vídeos concluídos
     * @param {Array} modules - Lista de módulos com seus vídeos
     * @returns {number} Porcentagem de conclusão (0-100)
     */
    getCourseProgress: function(modules) {
        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return 0;
        }
        
        try {
            let totalVideos = 0;
            let watchedVideos = 0;
            
            modules.forEach(module => {
                if (!module || !module.id) {
                    return;
                }
                
                const moduleId = module.id;
                const videos = module.videos || [];
                
                videos.forEach(video => {
                    if (video && video.id) {
                        totalVideos++;
                        if (this.isVideoWatched(moduleId, video.id)) {
                            watchedVideos++;
                        }
                    }
                });
            });
            
            if (totalVideos === 0) {
                return 0;
            }
            
            const progress = Math.round((watchedVideos / totalVideos) * 100);
            console.log(`Curso: ${watchedVideos}/${totalVideos} vídeos assistidos = ${progress}%`);
            
            return progress;
        } catch (e) {
            console.error('Erro ao calcular progresso do curso:', e);
            return 0;
        }
    },
    
    /**
     * Obtém estatísticas detalhadas do progresso
     * @param {Array} modules - Lista de módulos com seus vídeos
     * @returns {Object} Objeto com estatísticas detalhadas
     */
    getProgressStats: function(modules) {
        if (!modules || !Array.isArray(modules) || modules.length === 0) {
            return {
                totalModules: 0,
                completedModules: 0,
                totalVideos: 0,
                watchedVideos: 0,
                courseProgress: 0
            };
        }
        
        try {
            let totalModules = modules.length;
            let completedModules = 0;
            let totalVideos = 0;
            let watchedVideos = 0;
            
            modules.forEach(module => {
                if (!module || !module.id) {
                    return;
                }
                
                const moduleId = module.id;
                const videos = module.videos || [];
                const videoIds = videos.map(video => video.id).filter(id => id);
                
                totalVideos += videoIds.length;
                
                let moduleWatchedVideos = 0;
                videoIds.forEach(videoId => {
                    if (this.isVideoWatched(moduleId, videoId)) {
                        watchedVideos++;
                        moduleWatchedVideos++;
                    }
                });
                
                // Considera módulo completo se todos os vídeos foram assistidos
                if (videoIds.length > 0 && moduleWatchedVideos === videoIds.length) {
                    completedModules++;
                }
            });
            
            const courseProgress = totalVideos > 0 ? Math.round((watchedVideos / totalVideos) * 100) : 0;
            
            return {
                totalModules,
                completedModules,
                totalVideos,
                watchedVideos,
                courseProgress
            };
        } catch (e) {
            console.error('Erro ao calcular estatísticas de progresso:', e);
            return {
                totalModules: 0,
                completedModules: 0,
                totalVideos: 0,
                watchedVideos: 0,
                courseProgress: 0
            };
        }
    },
    
    /**
     * Limpa todos os dados de progresso do usuário
     * @returns {Promise} Promessa que resolve quando os dados são limpos
     */
    clearAllProgress: async function() {
        if (!this.firestore || !this.userId) {
            console.error('Sistema de progresso não inicializado corretamente');
            return false;
        }
        
        try {
            // Referência para o documento do aluno na coleção video_progress
            const progressRef = this.firestore.collection('video_progress').doc(this.userId);
            
            // Cria um novo objeto de progresso vazio
            this.progressData = {
                lastAccess: new Date().toISOString(),
                courses: {}
            };
            
            // Salva o objeto vazio no Firestore
            await progressRef.set(this.progressData);
            
            console.log('Dados de progresso limpos');
            return true;
        } catch (error) {
            console.error('Erro ao limpar dados de progresso:', error);
            return false;
        }
    },
    
    /**
     * Método de depuração para mostrar todos os dados de progresso no console
     */
    debugShowAllData: function() {
        console.log('=== DADOS DE PROGRESSO ===');
        console.log('User ID:', this.userId);
        console.log('Course ID:', this.courseId);
        console.log('Progress Data:', JSON.stringify(this.progressData, null, 2));
        console.log('=========================');
    },
    
    /**
     * Verifica se o sistema está inicializado corretamente
     * @returns {boolean} true se inicializado, false caso contrário
     */
    isInitialized: function() {
        return !!(this.firestore && this.userId && this.courseId && this.progressData);
    }
};

// Exporta o sistema de progresso
window.VideoProgressSystem = VideoProgressSystem;

